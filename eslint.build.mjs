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
			'es-x/no-regexp-lookbehind-assertions': 0,
			'es-x/no-string-prototype-at': 0,
		},
	},
	{
		files: ['build/*.js'],
		rules: {
			'es-x/no-class-instance-fields': 0,
			'es-x/no-class-private-fields': 0,
			'es-x/no-class-private-methods': 0,
			'es-x/no-class-static-fields': 0,
			'es-x/no-logical-assignment-operators': 0,
		},
	},
];
