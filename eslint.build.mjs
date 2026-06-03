import {dist} from '@bhsd/code-standard';

export default [
	dist,
	{
		languageOptions: {
			globals: {
				define: 'readonly',
				global: 'readonly',
				module: 'readonly',
				process: 'readonly',
				require: 'readonly',
			},
		},
		rules: {
			'no-undef': 2,
			'es-x/no-array-prototype-findlast-findlastindex': 0,
		},
	},
	{
		files: ['build/eslint-plugin-vue.js'],
		languageOptions: {
			globals: {
				eslint: 'readonly',
			},
		},
	},
];
