import {node, extend} from '@bhsd/code-standard';
import globals from 'globals';

export default extend(
	...node,
	{
		ignores: [
			'bundle/',
			'coverage/',
			'fixtures/',
		],
	},
	{
		files: ['test/**/*.js'],
		languageOptions: {
			globals: globals.mocha,
		},
		rules: {
			'func-name-matching': 0,
			'func-names': 0,
			'func-style': 0,
			'logical-assignment-operators': 0,
			'no-empty-function': 0,
			'no-shadow': 0,
			'no-template-curly-in-string': 0,
			'no-underscore-dangle': 0,
			'no-unused-vars': 0,
			'no-useless-concat': 0,
			'no-void': 0,
			'prefer-destructuring': 0,
			'prefer-object-spread': 0,
			radix: 0,
			'@stylistic/array-bracket-newline': 0,
			'@stylistic/function-paren-newline': 0,
			'@stylistic/indent': 0,
			'@stylistic/indent-binary-ops': 0,
			'@stylistic/lines-around-comment': 0,
			'@stylistic/max-len': 0,
			'@stylistic/multiline-comment-style': 0,
			'@stylistic/no-extra-parens': 0,
			'@stylistic/object-curly-spacing': 0,
			'@stylistic/operator-linebreak': 0,
			'@stylistic/quotes': 0,
			'@stylistic/spaced-comment': 0,
			'n/no-mixed-requires': 0,
			'unicorn/consistent-function-scoping': 0,
			'unicorn/explicit-length-check': 0,
			'unicorn/new-for-builtins': 0,
			'unicorn/no-array-for-each': 0,
			'unicorn/no-array-reduce': 0,
			'unicorn/number-literal-case': 0,
			'unicorn/prefer-spread': 0,
			'unicorn/prefer-string-raw': 0,
			'regexp/no-super-linear-move': 0,
		},
	},
	{
		files: ['shim/*.js'],
		rules: {
			'class-methods-use-this': 0,
			strict: [
				2,
				'never',
			],
		},
	},
);
