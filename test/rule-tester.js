/* global eslint */
'use strict';

const assert = require('assert');
globalThis.eslint ??= require('../bundle/coverage.min.js').eslint;
eslint.MAX_AUTOFIX_PASSES = 1;
const linter = new eslint.Linter(),
	reduce = ({line, column, endLine, endColumn, message, messageId}) =>
		// eslint-disable-next-line unicorn/prefer-structured-clone
		JSON.parse(JSON.stringify({line, column, endLine, endColumn, message, messageId})),
	isKnownParser = ({languageOptions: {parser}}) => !parser // default parser
		|| parser.meta?.name === 'typescript-eslint/parser' // TypeScript ESLint parser
		|| typeof parser.parse === 'function', // fixture parser
	shouldSkip = ({languageOptions: {parserOptions}}) => parserOptions?.ecmaFeatures?.jsx,
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
		return [config, JSON.stringify(config, null, 2)];
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

	run(rule, _, {valid, invalid}) {
		describe(rule, () => {
			assert.ok(isKnownParser(this.config));
			for (const {code, options = [], languageOptions, errors, output} of invalid) {
				const [config, printConfig] = getConfig(this.config, languageOptions, options, rule);
				assert.ok(isKnownParser(config), code);
				if (shouldSkip(config)) {
					it.skip(`invalid: ${code}`);
					continue;
				}
				it(`invalid: ${code}`, () => {
					const results = linter.verify(code, config);
					if (Array.isArray(errors)) {
						assert.partialDeepStrictEqual(results, errors.map(reduce), printConfig);
					} else {
						assert.strictEqual(results.length > 0, Boolean(errors), printConfig);
					}
					if (output) {
						assert.strictEqual(linter.verifyAndFix(code, config).output, output, printConfig);
					}
				});
			}
			for (let code of valid) {
				let options = [],
					languageOptions,
					filename;
				if (typeof code === 'object') {
					({code, options = [], languageOptions, filename} = code);
				}
				const [config, printConfig] = getConfig(this.config, languageOptions, options, rule);
				if (filename && /\.d\.[cm]?ts$/u.test(filename) || shouldSkip(config)) {
					it.skip(`valid: ${code}`);
					continue;
				}
				it(`valid: ${code}`, () => {
					assert.deepStrictEqual(linter.verify(code, config), [], printConfig);
				});
			}
		});
	}
}

module.exports = RuleTester;
