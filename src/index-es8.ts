import {Linter} from '../build/eslint-es8.js'; // eslint-disable-line n/no-missing-import

Object.assign(typeof globalThis === 'object' ? globalThis : self, { // eslint-disable-line unicorn/prefer-global-this
	eslint: {Linter},
});
