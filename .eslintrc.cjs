'use strict';

const config = require('@bhsd/common/eslintrc.node.cjs');

module.exports = {
	...config,
	overrides: [
		...config.overrides,
		{
			files: ['index-es7.js'],
			env: {
				worker: true,
			},
			rules: {
				'unicorn/prefer-global-this': 0,
			},
		},
	],
};
