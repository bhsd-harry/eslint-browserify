/* eslint n/exports-style: [2, 'exports'] */
'use strict';

/**
 * Prevents leading spaces in a multiline template literal from appearing in the resulting string
 * @see https://github.com/eslint/eslint/blob/v8.x/tests/_utils/index.js
 * @copyright OpenJS Foundation and other contributors, <www.openjsf.org>
 * @license MIT
 * @param {string[]} strings The strings in the template literal
 * @param {any[]} values The interpolation values in the template literal.
 * @returns {string} The template literal, with spaces removed from all lines
 */
exports.unIndent = function(strings, ...values) {
	const text = strings
		.map((s, i) => i === 0 ? s : values[i - 1] + s)
		.join('');
	// eslint-disable-next-line regexp/no-super-linear-move
	const lines = text.replace(/^\n/u, '').replace(/\n\s*$/u, '').split('\n');
	const lineIndents = lines.filter(line => line.trim()).map(line => line.match(/ */u)[0].length);
	const minLineIndent = Math.min(...lineIndents);

	return lines.map(line => line.slice(minLineIndent)).join('\n');
};
