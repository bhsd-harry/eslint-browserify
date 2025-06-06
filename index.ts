import {Linter} from './bundle/eslint.js'; // eslint-disable-line n/no-missing-import

Object.assign(globalThis, {
	eslint: {Linter},
});
