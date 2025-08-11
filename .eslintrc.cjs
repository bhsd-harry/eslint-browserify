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
		{
			files: ['test/tests/*.js'],
			rules: {
				'func-style': 0,
				'logical-assignment-operators': 0,
				'no-template-curly-in-string': 0,
				'no-unused-vars': 0,
				'no-void': 0,
				'prefer-destructuring': 0,
				'prefer-object-spread': 0,
				'@stylistic/array-bracket-newline': 0,
				'@stylistic/array-element-newline': 0,
				'@stylistic/comma-dangle': 0,
				'@stylistic/eol-last': 0,
				'@stylistic/indent': 0,
				'@stylistic/indent-binary-ops': 0,
				'@stylistic/max-len': 0,
				'@stylistic/multiline-comment-style': 0,
				'@stylistic/multiline-ternary': 0,
				'@stylistic/no-multiple-empty-lines': 0,
				'@stylistic/object-curly-spacing': 0,
				'@stylistic/operator-linebreak': 0,
				'@stylistic/padded-blocks': 0,
				'@stylistic/quotes': 0,
				'@stylistic/spaced-comment': 0,
				'n/no-mixed-requires': 0,
				'unicorn/empty-brace-spaces': 0,
				'unicorn/new-for-builtins': 0,
				'unicorn/no-array-for-each': 0,
				'unicorn/no-array-reduce': 0,
				'unicorn/prefer-string-raw': 0,
				'jsdoc/check-indentation': 0,
				'jsdoc/check-tag-names': 0,
				'jsdoc/check-types': 0,
			},
		},
	],
};
