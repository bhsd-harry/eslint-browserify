'use strict';

module.exports = codePoint => {
	let re;
	try {
		// eslint-disable-next-line prefer-regex-literals
		re = new RegExp(String.raw`^[\p{Mc}\p{Me}\p{Mn}]$`, 'u');
	} catch {
		// eslint-disable-next-line no-misleading-character-class
		re = /^[\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\u2DE0-\u2DFF\uFE20-\uFE2F]$/u;
	}
	return re.test(String.fromCodePoint(codePoint));
};
