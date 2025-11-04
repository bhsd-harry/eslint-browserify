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
			'es-x/no-array-prototype-at': 0,
			'es-x/no-error-cause': 0,
			'es-x/no-iterator-prototype-drop': 0,
			'es-x/no-iterator-prototype-take': 0,
			'es-x/no-object-hasown': 0,
			'es-x/no-string-prototype-at': 0,
		},
	},
];
