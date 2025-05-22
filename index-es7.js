'use strict';

const {Linter} = require('./bundle/eslint-es7.js');

Object.assign(typeof globalThis === 'object' ? globalThis : self, {
	eslint: {Linter},
});
