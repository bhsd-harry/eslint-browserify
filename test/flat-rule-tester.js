/* eslint-env mocha */
/* eslint-disable jsdoc/require-jsdoc */
/* global eslint */
'use strict';

const assert = require('assert'),
	merge = require('lodash.merge');
const linter = new eslint.Linter(),
	reduce = ({line, column, endLine, endColumn, message, messageId}) =>
		JSON.parse(JSON.stringify({line, column, endLine, endColumn, message, messageId})),
	getOption = (languageOptions = {}) => {
		if (languageOptions.parserOptions) {
			languageOptions.skip = true;
			delete languageOptions.parserOptions;
		}
		const {globals, ...parserOptions} = languageOptions;
		return {globals, parserOptions};
	},
	getConfig = (cfg, languageOptions, options, rule) => {
		for (let i = options.length - 1; i >= 0; i--) {
			if (typeof options[i] === 'object' && JSON.stringify(options[i]) === '{}') {
				options.splice(i, 1);
			}
		}
		const config = merge(merge({}, cfg), {...getOption(languageOptions), rules: {[rule]: [2, ...options]}}),
			{parserOptions = {}} = config;
		if (parserOptions.ecmaVersion) {
			config.env ??= {};
			config.env[`es${parserOptions.ecmaVersion}`] = true;
		}
		if (parserOptions.sourceType === 'commonjs') {
			config.env.commonjs = true;
		}
		const {globals, ...other} = parserOptions,
			printConfig = {...config, parserOptions: other};
		return [config, JSON.stringify(printConfig, null, '\t')];
	};

class RuleTester {
	constructor(config = {}) {
		Object.assign(config, getOption(config.languageOptions));
		delete config.languageOptions;
		config.parserOptions.ecmaVersion ??= 2024;
		this.config = config;
	}

	skip(languageOptions) {
		return languageOptions?.parser || languageOptions?.parserOptions || this.config.parserOptions?.skip;
	}

	run(rule, _, {valid, invalid}) { // eslint-disable-line class-methods-use-this
		if (this.config.plugins) {
			describe.skip(rule, () => {
				for (const {code} of invalid) {
					it.skip(`invalid: ${code}`);
				}
				for (const code of valid) {
					it.skip(`valid: ${code}`);
				}
			});
		}
		describe(rule, () => {
			for (const {code, options = [], languageOptions, errors, output} of invalid) {
				if (this.skip(languageOptions)) {
					it.skip(`invalid: ${code}`);
					continue;
				}
				const [config, printConfig] = getConfig(this.config, languageOptions, options, rule);
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
					languageOptions;
				if (typeof code === 'object') {
					({code, options = [], languageOptions} = code);
				}
				if (this.skip(languageOptions)) {
					it.skip(`valid: ${code}`);
					continue;
				}
				const [config, printConfig] = getConfig(this.config, languageOptions, options, rule);
				it(`valid: ${code}`, () => {
					assert.deepStrictEqual(linter.verify(code, config), [], printConfig);
				});
			}
		});
	}
}

module.exports = RuleTester;
