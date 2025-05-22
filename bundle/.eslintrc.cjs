/* eslint-env node */
'use strict';

const config = require('@bhsd/common/eslintrc.dist.cjs');

module.exports = {
	...config,
	env: {
		worker: true,
		es2019: true,
	},
	globals: {
		BigInt: 'readonly',
		define: 'readonly',
		global: 'readonly',
		globalThis: 'readonly',
		process: 'readonly',
		require: 'readonly',
		window: 'readonly',
	},
	rules: {
		...config.rules,
		'no-undef': 2,
		'es-x/no-array-prototype-at': 0,
		'es-x/no-object-hasown': 0,
		'es-x/no-string-prototype-at': 0,
	},
	overrides: [
		{
			files: ['eslint.js'],
			globals: {
				module: 'readonly',
			},
		},
	],
};
