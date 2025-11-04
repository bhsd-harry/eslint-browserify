/**
 * @fileoverview Tests for no-caller rule.
 * @author Nicholas C. Zakas
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

ruleTester.run("no-caller", rule, {
	valid: [
		"var x = arguments.length",
		"var x = arguments",
		"var x = arguments[0]",
		"var x = arguments[caller]",
	],
	invalid: [
		{
			code: "var x = arguments.callee",
			errors: [
				{
					messageId: "unexpected",
					data: { prop: "callee" },
				},
			],
		},
		{
			code: "var x = arguments.caller",
			errors: [
				{
					messageId: "unexpected",
					data: { prop: "caller" },
				},
			],
		},
	],
});
