'use strict';

const config = require('@bhsd/code-standard/eslintrc.node.cjs');

module.exports = {
	...config,
	ignorePatterns: [
		'build/',
		'bundle/',
	],
	overrides: [
		...config.overrides,
		{
			files: ['index-*.js'],
			env: {
				worker: true,
			},
			rules: {
				'unicorn/prefer-global-this': 0,
			},
		},
	],
};
