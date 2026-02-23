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
			'es-x/no-iterator-prototype-drop': 0,
			'es-x/no-iterator-prototype-take': 0,
		},
	},
];
