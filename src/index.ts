import {Linter} from 'eslint/universal';
// eslint-disable-next-line @typescript-eslint/no-require-imports, n/no-extraneous-require
const {Legacy}: typeof import('@eslint/eslintrc/universal') = require('@eslint/eslintrc/universal');

Object.assign(globalThis, {
	eslint: {Linter, environments: Legacy.environments},
});
