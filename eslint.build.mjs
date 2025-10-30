import {dist} from '@bhsd/code-standard';
import esX from 'eslint-plugin-es-x';

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
			'es-x/no-object-hasown': 0,
			'es-x/no-string-prototype-at': 0,
		},
	},
	{
		files: ['build/eslint-es*.js'],
		rules: {
			...esX.configs['flat/no-new-in-es2018'].rules,
			...esX.configs['flat/no-new-in-es2019'].rules,
			...esX.configs['flat/no-new-in-es2020'].rules,
			'es-x/no-array-prototype-flat': 0,
			'es-x/no-bigint': 0,
			'es-x/no-global-this': 0,
			'es-x/no-object-fromentries': 0,
			'es-x/no-regexp-unicode-property-escapes': 0,
			'es-x/no-string-prototype-trimstart-trimend': 0,
			'es-x/no-symbol-prototype-description': 0,
		},
	},
];
