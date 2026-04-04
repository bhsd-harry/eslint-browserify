/* global eslint */
'use strict';

const assert = require('assert');
globalThis.eslint ??= require('../bundle/coverage.min.js').eslint;
eslint.MAX_AUTOFIX_PASSES = 1;
const linter = new eslint.Linter(),
	reduce = ({line, column, endLine, endColumn, message, messageId}) =>
		JSON.parse(JSON.stringify({line, column, endLine, endColumn, message, messageId})),
	isUnknownParser = parser => {
		if (!parser || parser.meta?.name === 'typescript-eslint/parser') {
			return false;
		} else if (parser.meta) {
			throw new Error(`Unknown parser: ${parser.meta.name}`);
		}
		return true;
	},
	shouldSkip = ({languageOptions: {parser, parserOptions}}) => parserOptions?.ecmaFeatures?.jsx
		|| isUnknownParser(parser),
	getConfig = ({languageOptions = {}, ...cfg}, extraLanguageOptions, options, rule) => {
		for (let i = options.length - 1; i >= 0; i--) {
			if (typeof options[i] === 'object' && JSON.stringify(options[i]) === '{}') {
				options.splice(i, 1);
			}
		}
		const {parser, ...other} = languageOptions,
			config = {
				...structuredClone(cfg),
				languageOptions: {...structuredClone(other), parser},
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
		} else if (config.plugins) {
			throw new Error('Plugin tests are not supported');
		}
		this.config = config;
	}

	run(rule, _, {valid, invalid}) {
		if (isUnknownParser(this.config.languageOptions.parser)) {
			describe.skip(rule, () => {
				for (const {code} of invalid) {
					it.skip(`invalid: ${code}`);
				}
				for (const code of valid) {
					it.skip(`valid: ${code}`);
				}
			});
			return;
		}
		describe(rule, () => {
			for (const {code, options = [], languageOptions, errors, output} of invalid) {
				const [config, printConfig] = getConfig(this.config, languageOptions, options, rule);
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
