/**
 * @fileoverview Tests for no-debugger rule.
 * @author Nicholas C. Zakas
 */

"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const rule = __filename,
    RuleTester = require("../flat-rule-tester");

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester = new RuleTester();

ruleTester.run("no-debugger", rule, {
    valid: [
        "var test = { debugger: 1 }; test.debugger;"
    ],
    invalid: [
        {
            code: "if (foo) debugger",
            output: null,
            errors: [{ messageId: "unexpected", type: "DebuggerStatement" }]
        }
    ]
});
