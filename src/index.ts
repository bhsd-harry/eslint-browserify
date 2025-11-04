import {Linter} from '../build/eslint.js'; // eslint-disable-line n/no-missing-import

Object.assign(globalThis, {
	eslint: {Linter},
});
