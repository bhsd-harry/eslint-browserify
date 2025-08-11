/**
 * @fileoverview The rule should warn against code that tries to compare against -0.
 * @author Aladdin-ADD<hh_2013@foxmail.com>
 */
"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const rule = __filename;
const RuleTester = require("../flat-rule-tester");

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester = new RuleTester();

ruleTester.run("no-compare-neg-zero", rule, {

    valid: [
        "x === 0",
        "0 === x",
        "x == 0",
        "0 == x",
        "x === '0'",
        "'0' === x",
        "x == '0'",
        "'0' == x",
        "x === '-0'",
        "'-0' === x",
        "x == '-0'",
        "'-0' == x",
        "x === -1",
        "-1 === x",
        "x < 0",
        "0 < x",
        "x <= 0",
        "0 <= x",
        "x > 0",
        "0 > x",
        "x >= 0",
        "0 >= x",
        "x != 0",
        "0 != x",
        "x !== 0",
        "0 !== x",
        "Object.is(x, -0)"
    ],

    invalid: [
        {
            code: "x === -0",
            errors: [{
                messageId: "unexpected",
                data: { operator: "===" },
                type: "BinaryExpression"
            }]
        },
        {
            code: "-0 === x",
            errors: [{
                messageId: "unexpected",
                data: { operator: "===" },
                type: "BinaryExpression"
            }]
        },
        {
            code: "x == -0",
            errors: [{
                messageId: "unexpected",
                data: { operator: "==" },
                type: "BinaryExpression"
            }]
        },
        {
            code: "-0 == x",
            errors: [{
                messageId: "unexpected",
                data: { operator: "==" },
                type: "BinaryExpression"
            }]
        },
        {
            code: "x > -0",
            errors: [{
                messageId: "unexpected",
                data: { operator: ">" },
                type: "BinaryExpression"
            }]
        },
        {
            code: "-0 > x",
            errors: [{
                messageId: "unexpected",
                data: { operator: ">" },
                type: "BinaryExpression"
            }]
        },
        {
            code: "x >= -0",
            errors: [{
                messageId: "unexpected",
                data: { operator: ">=" },
                type: "BinaryExpression"
            }]
        },
        {
            code: "-0 >= x",
            errors: [{
                messageId: "unexpected",
                data: { operator: ">=" },
                type: "BinaryExpression"
            }]
        },
        {
            code: "x < -0",
            errors: [{
                messageId: "unexpected",
                data: { operator: "<" },
                type: "BinaryExpression"
            }]
        },
        {
            code: "-0 < x",
            errors: [{
                messageId: "unexpected",
                data: { operator: "<" },
                type: "BinaryExpression"
            }]
        },
        {
            code: "x <= -0",
            errors: [{
                messageId: "unexpected",
                data: { operator: "<=" },
                type: "BinaryExpression"
            }]
        },
        {
            code: "-0 <= x",
            errors: [{
                messageId: "unexpected",
                data: { operator: "<=" },
                type: "BinaryExpression"
            }]
        }
    ]
});
