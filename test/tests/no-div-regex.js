/**
 * @fileoverview Tests for no-div-regex rule.
 * @author Matt DuVall <http://www.mattduvall.com>
 */

"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const rule = __filename,
	RuleTester = require("../rule-tester");

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester = new RuleTester();

ruleTester.run("no-div-regex", rule, {
	valid: [
		"var f = function() { return /foo/ig.test('bar'); };",
		"var f = function() { return /\\=foo/; };",
	],
	invalid: [
		{
			code: "var f = function() { return /=foo/; };",
			output: "var f = function() { return /[=]foo/; };",
			errors: [
				{
					messageId: "unexpected",
					line: 1,
					column: 29,
					endLine: 1,
					endColumn: 35,
				},
			],
		},
	],
});
