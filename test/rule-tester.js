'use strict';

const assert = require('assert'),
	{prepare} = require('@bhsd/test-util/mocha');
let vue;
if (globalThis.eslint) {
	vue = require('../bundle/eslint-plugin-vue.min.js').default;
} else {
	globalThis.eslint = require('../build/eslint.js').eslint;
	vue = require('../build/eslint-plugin-vue.js').default;
}
eslint.plugins.vue = vue;
eslint.MAX_AUTOFIX_PASSES = 1;
const linter = new eslint.Linter(),
	isSkip = process.argv[2] === 'skip',
	reduce = ({line, column, endLine, endColumn, message, messageId}) =>
		// eslint-disable-next-line unicorn/prefer-structured-clone
		JSON.parse(JSON.stringify({line, column, endLine, endColumn, message, messageId})),
	isKnownParser = ({languageOptions: {parser}}) => !parser // default parser
		|| parser.meta?.name === 'typescript-eslint/parser' // TypeScript ESLint parser
		|| typeof parser.parse === 'function', // fixture parser
	shouldSkip = ({languageOptions: {parserOptions, parser}}, code) => parserOptions?.ecmaFeatures?.jsx
		|| parser?.meta?.name === 'vue-eslint-parser' && code.includes('lang="ts"'),
	getConfig = ({languageOptions = {}, plugins, ...cfg}, extraLanguageOptions, options, rule) => {
		for (let i = options.length - 1; i >= 0; i--) {
			if (typeof options[i] === 'object' && JSON.stringify(options[i]) === '{}') {
				options.splice(i, 1);
			}
		}
		const {parser, ...other} = languageOptions,
			config = {
				...structuredClone(cfg),
				languageOptions: {...structuredClone(other), parser},
				plugins,
				rules: {[rule]: [2, ...options]},
			};
		if (extraLanguageOptions) {
			Object.assign(config.languageOptions, extraLanguageOptions);
		}
		config.languageOptions.sourceType ??= 'module';
		const printConfig = {...config};
		if (printConfig.plugins) {
			printConfig.plugins = {...printConfig.plugins};
			for (const key in printConfig.plugins) {
				printConfig.plugins[key] = printConfig.plugins[key]?.meta?.name;
			}
		}
		if (printConfig.languageOptions) {
			printConfig.languageOptions = {...printConfig.languageOptions};
			printConfig.languageOptions.parser &&= printConfig.languageOptions.parser.meta?.name;
		}
		return [config, JSON.stringify(printConfig, null, 2)];
	};

class RuleTester {
	constructor(config = {}) {
		config.languageOptions ??= {};
		config.linterOptions ??= {};
		config.linterOptions.reportUnusedDisableDirectives = 0;
		if (config.languageOptions.parserOptions?.ecmaFeatures?.jsx) {
			throw new Error('JSX tests are not supported');
		}
		this.config = config;
	}

	run(rule, plugin, {valid, invalid}) {
		if (plugin === 'eslint-plugin-vue') {
			this.config.plugins ??= {};
			this.config.plugins.vue = vue;
			rule = `vue/${rule}`; // eslint-disable-line no-param-reassign
		}
		if (this.config.languageOptions?.parser?.meta?.name === 'vue-eslint-parser') {
			this.config.languageOptions.parser = vue.configs.base[1].languageOptions.parser;
		}
		describe(rule, () => {
			assert.ok(isKnownParser(this.config));
			for (const {code, options = [], languageOptions, errors, output, filename} of invalid) {
				const [config, printConfig] = getConfig(this.config, languageOptions, options, rule);
				assert.ok(isKnownParser(config), code);
				if (shouldSkip(config, code)) {
					it.skip(`invalid: ${code}`);
					continue;
				}
				it(`invalid: ${code}`, () => {
					const results = linter.verify(code, config, filename);
					if (Array.isArray(errors)) {
						assert.partialDeepStrictEqual(results, errors.map(reduce), printConfig);
					} else {
						assert.strictEqual(results.length > 0, Boolean(errors), printConfig);
					}
					if (output) {
						assert.strictEqual(linter.verifyAndFix(code, config, filename).output, output, printConfig);
					}
				});
			}
			if (isSkip) {
				prepare(valid.length);
			} else {
				for (let code of valid) {
					let options = [],
						languageOptions,
						filename;
					if (typeof code === 'object') {
						({code, options = [], languageOptions, filename} = code);
					}
					const [config, printConfig] = getConfig(this.config, languageOptions, options, rule);
					if (filename && /\.d\.[cm]?ts$/u.test(filename) || shouldSkip(config, code)) {
						it.skip(`valid: ${code}`);
						continue;
					}
					it(`valid: ${code}`, () => {
						assert.deepStrictEqual(linter.verify(code, config, filename), [], printConfig);
					});
				}
			}
		});
	}
}

module.exports = RuleTester;
module.exports.RuleTester = RuleTester;
module.exports.ESLint = eslint;
