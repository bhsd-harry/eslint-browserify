/**
 * @fileoverview Tests for the no-nested-ternary rule
 * @author Ian Christian Myers
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

ruleTester.run("no-nested-ternary", rule, {
	valid: ["foo ? doBar() : doBaz();", "var foo = bar === baz ? qux : quxx;"],
	invalid: [
		{
			code: "foo ? bar : baz === qux ? quxx : foobar;",
			errors: [
				{
					messageId: "noNestedTernary",
					line: 1,
					column: 1,
					endLine: 1,
					endColumn: 40,
				},
			],
		},
		{
			code: "foo ? baz === qux ? quxx : foobar : bar;",
			errors: [
				{
					messageId: "noNestedTernary",
					line: 1,
					column: 1,
					endLine: 1,
					endColumn: 40,
				},
			],
		},
	],
});
