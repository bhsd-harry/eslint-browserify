'use strict';

const {Linter} = require('./bundle/eslint.js');

Object.assign(globalThis, {
	eslint: {Linter},
});
