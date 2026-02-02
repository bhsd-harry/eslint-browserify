/**
 * @fileoverview Tests for eslint object.
 * @author Nicholas C. Zakas
 */
/* global eslint */
"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const assert = require("assert"),
	espree = require("espree"),
	esprima = require("esprima");

const { Linter } = eslint;

//------------------------------------------------------------------------------
// Constants
//------------------------------------------------------------------------------

const TEST_CODE = "var answer = 6 * 7;",
	BROKEN_TEST_CODE = "var;";

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------

const throws = (fn, ...args) => {
	try {
		fn();
	} catch (e) {
		if (args.length === 2) {
			assert.ok(e instanceof args[0]);
		}
		const msg = args.at(-1);
		if (msg instanceof RegExp) {
			assert.ok(msg.test(e.message));
		} else {
			assert.ok(e.message.startsWith(msg));
		}
	}
};

const isObject = obj => assert.ok(typeof obj === "object" && obj);

const isArray = arr => assert.ok(Array.isArray(arr));

const isNull = obj => assert.strictEqual(obj, null);

const isNotNull = obj => assert.notStrictEqual(obj, null);

const property = (obj, key) => assert.ok(Object.hasOwn(obj, key));

const include = (str, substr) => assert.ok(
	str.includes(substr),
	`Expected ${JSON.stringify(str)} to include ${JSON.stringify(substr)}`,
);

const match = (str, regex) => assert.ok(regex.test(str), `Expected ${JSON.stringify(str)} to match ${regex}`);

/**
 * Get variables in the current scope
 * @param {Object} scope current scope
 * @param {string} name name of the variable to look for
 * @returns {ASTNode|null} The variable object
 * @private
 */
function getVariable(scope, name) {
	return scope.variables.find(v => v.name === name) || null;
}

/**
 * `eslint-env` comments are processed by doing a full source text match before parsing.
 * As a result, if this source file contains `eslint- env` followed by an environment in a string,
 * it will actually enable the given envs for this source file. This variable is used to avoid having a string
 * like that appear in the code.
 */
const ESLINT_ENV = "eslint-env";

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

describe("Linter", () => {
	const filename = "filename.js";

	/** @type {InstanceType<import("../../../lib/linter/linter.js").Linter>} */
	let linter;

	beforeEach(() => {
		linter = new Linter({ configType: "eslintrc" });
	});

	describe("Static Members", () => {
		describe("version", () => {
			it("should return same version as instance property", () => {
				assert.strictEqual(Linter.version, linter.version);
			});
		});
	});

	describe("when using events", () => {
		const code = TEST_CODE;

		it("an error should be thrown when an error occurs inside of an event handler", () => {
			const config = { rules: { checker: "error" } };

			linter.defineRule("checker", {
				create: () => ({
					Program() {
						throw new Error("Intentional error.");
					},
				}),
			});

			throws(() => {
				linter.verify(code, config, filename);
			}, `Intentional error.\nOccurred while linting ${filename}:1\nRule: "checker"`);
		});
	});

	describe("getSourceCode()", () => {
		const code = TEST_CODE;

		it("should retrieve SourceCode object after reset", () => {
			linter.verify(code, {}, filename);

			const sourceCode = linter.getSourceCode();

			isObject(sourceCode);
			assert.strictEqual(sourceCode.text, code);
			isObject(sourceCode.ast);
		});

		it("should retrieve SourceCode object without reset", () => {
			linter.verify(code, {}, filename);

			const sourceCode = linter.getSourceCode();

			isObject(sourceCode);
			assert.strictEqual(sourceCode.text, code);
			isObject(sourceCode.ast);
		});
	});

	describe("getSuppressedMessages()", () => {
		it("should have no suppressed messages", () => {
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should have a suppressed message", () => {
			const code =
				'/* eslint-disable no-alert -- justification */\nalert("test");';
			const config = {
				rules: { "no-alert": 1 },
			};
			const messages = linter.verify(code, config);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);

			assert.strictEqual(suppressedMessages.length, 1);
			assert.strictEqual(suppressedMessages[0].ruleId, "no-alert");
			assert.deepStrictEqual(suppressedMessages[0].suppressions, [
				{ kind: "directive", justification: "justification" },
			]);
		});

		it("should have a suppressed message", () => {
			const code = [
				"/* eslint-disable no-alert --- j1",
				" * --- j2",
				" */",
				'alert("test");',
			].join("\n");
			const config = {
				rules: { "no-alert": 1 },
			};
			const messages = linter.verify(code, config);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);

			assert.strictEqual(suppressedMessages.length, 1);
			assert.strictEqual(suppressedMessages[0].ruleId, "no-alert");
			assert.deepStrictEqual(suppressedMessages[0].suppressions, [
				{ kind: "directive", justification: "j1\n * --- j2" },
			]);
		});

		it("should not report a lint message", () => {
			const code = [
				"/* eslint-disable -- j1 */",
				"// eslint-disable-next-line -- j2",
				'alert("test");',
			].join("\n");
			const config = {
				rules: { "no-alert": 1 },
			};
			const messages = linter.verify(code, config);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);

			assert.strictEqual(suppressedMessages.length, 1);
			assert.strictEqual(suppressedMessages[0].ruleId, "no-alert");
			assert.deepStrictEqual(suppressedMessages[0].suppressions, [
				{ kind: "directive", justification: "j1" },
				{ kind: "directive", justification: "j2" },
			]);
		});

		it("should not report a lint message", () => {
			const code = [
				"/* eslint-disable -- j1 */",
				'alert("test"); // eslint-disable-line -- j2',
			].join("\n");
			const config = {
				rules: { "no-alert": 1 },
			};
			const messages = linter.verify(code, config);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);

			assert.strictEqual(suppressedMessages.length, 1);
			assert.strictEqual(suppressedMessages[0].ruleId, "no-alert");
			assert.deepStrictEqual(suppressedMessages[0].suppressions, [
				{ kind: "directive", justification: "j1" },
				{ kind: "directive", justification: "j2" },
			]);
		});

		it("should have a suppressed message with multiple suppressions", () => {
			const code = [
				"/* eslint-disable no-alert -- j1 */",
				"/* eslint-disable no-console -- unused */",
				"/* eslint-disable-next-line no-alert -- j2 */",
				'alert("test"); // eslint-disable-line no-alert -- j3',
			].join("\n");
			const config = {
				rules: { "no-alert": 1 },
			};
			const messages = linter.verify(code, config);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);

			assert.strictEqual(suppressedMessages.length, 1);
			assert.strictEqual(suppressedMessages[0].ruleId, "no-alert");
			assert.deepStrictEqual(suppressedMessages[0].suppressions, [
				{ kind: "directive", justification: "j1" },
				{ kind: "directive", justification: "j2" },
				{ kind: "directive", justification: "j3" },
			]);
		});
	});

	describe("when evaluating code", () => {
		const code = TEST_CODE;

		it("should throw an error if a rule is a function", () => {
			/**
			 * Legacy-format rule (a function instead of an object with `create` method).
			 * @param {RuleContext} context The ESLint rule context object.
			 * @returns {Object} Listeners.
			 */
			function functionStyleRule(context) {
				return {
					Program(node) {
						context.report({ node, message: "bad" });
					},
				};
			}

			linter.defineRule("function-style-rule", functionStyleRule);

			throws(
				() =>
					linter.verify("foo", {
						rules: { "function-style-rule": "error" },
					}),
				TypeError,
				"Error while loading rule 'function-style-rule': Rule must be an object with a `create` method",
			);
		});

		it("should throw an error if a rule is an object without 'create' method", () => {
			const rule = {
				create_(context) {
					return {
						Program(node) {
							context.report({ node, message: "bad" });
						},
					};
				},
			};

			linter.defineRule("object-rule-without-create", rule);

			throws(
				() =>
					linter.verify("foo", {
						rules: { "object-rule-without-create": "error" },
					}),
				TypeError,
				"Error while loading rule 'object-rule-without-create': Rule must be an object with a `create` method",
			);
		});

		it("should throw an error if a rule with invalid `meta.schema` is enabled in a configuration comment", () => {
			const rule = {
				meta: {
					schema: true,
				},
				create() {
					return {};
				},
			};

			linter.defineRule("rule-with-invalid-schema", rule);

			throws(
				() => linter.verify("/* eslint rule-with-invalid-schema: 2 */"),
				"Error while processing options validation schema of rule 'rule-with-invalid-schema': Rule's `meta.schema` must be an array or object",
			);
		});

		it("should throw an error if a rule reports a problem without a message", () => {
			linter.defineRule("invalid-report", {
				create: context => ({
					Program(node) {
						context.report({ node });
					},
				}),
			});

			throws(
				() =>
					linter.verify("foo", {
						rules: { "invalid-report": "error" },
					}),
				TypeError,
				"Missing `message` property in report() call; add a message that describes the linting problem.",
			);
		});
	});

	describe("when config has shared settings for rules", () => {
		const code = "test-rule";

		it("should pass settings to all rules", () => {
			linter.defineRule(code, {
				create: context => ({
					Literal(node) {
						context.report(node, context.settings.info);
					},
				}),
			});

			const config = { rules: {}, settings: { info: "Hello" } };

			config.rules[code] = 1;

			const messages = linter.verify("0", config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(messages[0].message, "Hello");
			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should not have any settings if they were not passed in", () => {
			linter.defineRule(code, {
				create: context => ({
					Literal(node) {
						if (
							Object.getOwnPropertyNames(context.settings)
								.length !== 0
						) {
							context.report(node, "Settings should be empty");
						}
					},
				}),
			});

			const config = { rules: {} };

			config.rules[code] = 1;

			const messages = linter.verify("0", config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 0);
		});
	});

	describe("when a custom parser is defined using defineParser", () => {
		it("should be able to define a custom parser", () => {
			const parser = {
				parseForESLint: function parse(code, options) {
					return {
						ast: esprima.parse(code, options),
						services: {
							test: {
								getMessage() {
									return "Hi!";
								},
							},
						},
					};
				},
			};

			linter.defineParser("test-parser", parser);
			const config = { rules: {}, parser: "test-parser" };
			const messages = linter.verify("0", config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 0);
		});
	});

	describe("when passing in configuration values for rules", () => {
		const code = "var answer = 6 * 7";

		it("should be configurable by only setting the integer value", () => {
			const rule = "semi",
				config = { rules: {} };

			config.rules[rule] = 1;

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(messages[0].ruleId, rule);

			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should be configurable by only setting the string value", () => {
			const rule = "semi",
				config = { rules: {} };

			config.rules[rule] = "warn";

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(messages[0].severity, 1);
			assert.strictEqual(messages[0].ruleId, rule);

			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should be configurable by passing in values as an array", () => {
			const rule = "semi",
				config = { rules: {} };

			config.rules[rule] = [1];

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(messages[0].ruleId, rule);

			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should be configurable by passing in string value as an array", () => {
			const rule = "semi",
				config = { rules: {} };

			config.rules[rule] = ["warn"];

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(messages[0].severity, 1);
			assert.strictEqual(messages[0].ruleId, rule);

			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should not be configurable by setting other value", () => {
			const rule = "semi",
				config = { rules: {} };

			config.rules[rule] = "1";

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should process empty config", () => {
			const config = {};
			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 0);
		});
	});

	describe("when evaluating code containing a /*global */ block with specific variables", () => {
		const code = "/* global toString hasOwnProperty valueOf: true */";

		it("should not throw an error if comment block has global variables which are Object.prototype contains", () => {
			const config = { rules: { checker: "error" } };

			linter.verify(code, config);
		});
	});

	describe("at any time", () => {
		const code = "new-rule";

		it("can add a rule dynamically", () => {
			linter.defineRule(code, {
				create: context => ({
					Literal(node) {
						context.report(node, "message");
					},
				}),
			});

			const config = { rules: {} };

			config.rules[code] = 1;

			const messages = linter.verify("0", config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(messages[0].ruleId, code);
			assert.strictEqual(messages[0].nodeType, "Literal");

			assert.strictEqual(suppressedMessages.length, 0);
		});
	});

	describe("at any time", () => {
		const code = ["new-rule-0", "new-rule-1"];

		it("can add multiple rules dynamically", () => {
			const config = { rules: {} };
			const newRules = {};

			code.forEach(item => {
				config.rules[item] = 1;
				newRules[item] = {
					create(context) {
						return {
							Literal(node) {
								context.report(node, "message");
							},
						};
					},
				};
			});
			linter.defineRules(newRules);

			const messages = linter.verify("0", config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, code.length);
			code.forEach(item => {
				assert.ok(messages.some(message => message.ruleId === item));
			});
			messages.forEach(message => {
				assert.strictEqual(message.nodeType, "Literal");
			});

			assert.strictEqual(suppressedMessages.length, 0);
		});
	});

	describe("at any time", () => {
		const code = "filename-rule";

		it("has access to the filename", () => {
			linter.defineRule(code, {
				create: context => ({
					Literal(node) {
						assert.strictEqual(
							context.getFilename(),
							context.filename,
						);
						context.report(node, context.filename);
					},
				}),
			});

			const config = { rules: {} };

			config.rules[code] = 1;

			const messages = linter.verify("0", config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages[0].message, filename);
			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("has access to the physicalFilename", () => {
			linter.defineRule(code, {
				create: context => ({
					Literal(node) {
						assert.strictEqual(
							context.getPhysicalFilename(),
							context.physicalFilename,
						);
						context.report(node, context.physicalFilename);
					},
				}),
			});

			const config = { rules: {} };

			config.rules[code] = 1;

			const messages = linter.verify("0", config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages[0].message, filename);
			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("defaults filename to '<input>'", () => {
			linter.defineRule(code, {
				create: context => ({
					Literal(node) {
						assert.strictEqual(
							context.getFilename(),
							context.filename,
						);
						context.report(node, context.filename);
					},
				}),
			});

			const config = { rules: {} };

			config.rules[code] = 1;

			const messages = linter.verify("0", config);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages[0].message, "<input>");
			assert.strictEqual(suppressedMessages.length, 0);
		});
	});

	describe("when evaluating code with comments to enable rules", () => {
		it("should report a violation", () => {
			const code = "/*eslint no-alert:1*/ alert('test');";
			const config = { rules: {} };

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(messages[0].ruleId, "no-alert");
			assert.strictEqual(messages[0].message, "Unexpected alert.");
			include(messages[0].nodeType, "CallExpression");

			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should enable rule configured using a string severity that contains uppercase letters", () => {
			const code = "/*eslint no-alert: \"Error\"*/ alert('test');";
			const config = { rules: {} };

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(messages[0].ruleId, "no-alert");
			assert.strictEqual(messages[0].severity, 2);
			assert.strictEqual(messages[0].message, "Unexpected alert.");
			include(messages[0].nodeType, "CallExpression");

			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("rules should not change initial config", () => {
			const config = { rules: { strict: 2 } };
			const codeA = "/*eslint strict: 0*/ function bar() { return 2; }";
			const codeB = "function foo() { return 1; }";
			let messages = linter.verify(codeA, config, filename);
			let suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 0);

			messages = linter.verify(codeB, config, filename);
			suppressedMessages = linter.getSuppressedMessages();
			assert.strictEqual(messages.length, 1);

			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("rules should not change initial config", () => {
			const config = { rules: { quotes: [2, "double"] } };
			const codeA = "/*eslint quotes: 0*/ function bar() { return '2'; }";
			const codeB = "function foo() { return '1'; }";
			let messages = linter.verify(codeA, config, filename);
			let suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 0);

			messages = linter.verify(codeB, config, filename);
			suppressedMessages = linter.getSuppressedMessages();
			assert.strictEqual(messages.length, 1);

			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("rules should not change initial config", () => {
			const config = { rules: { quotes: [2, "double"] } };
			const codeA =
				"/*eslint quotes: [0, \"single\"]*/ function bar() { return '2'; }";
			const codeB = "function foo() { return '1'; }";

			let messages = linter.verify(codeA, config, filename);
			let suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 0);

			messages = linter.verify(codeB, config, filename);
			suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("rules should not change initial config", () => {
			const config = {
				rules: { "no-unused-vars": [2, { vars: "all" }] },
			};
			const codeA =
				'/*eslint no-unused-vars: [0, {"vars": "local"}]*/ var a = 44;';
			const codeB = "var b = 55;";

			let messages = linter.verify(codeA, config, filename);
			let suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 0);

			messages = linter.verify(codeB, config, filename);
			suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("rules use the rule's config when it is present", () => {
			const config = {
				rules: {
					"no-constant-condition": ["error", { checkLoops: "all" }],
				},
			};
			const codeA =
				"/*eslint no-constant-condition: error */ while (true) {}";
			const messages = linter.verify(codeA, config, filename);

			assert.deepStrictEqual(messages, [
				{
					severity: 2,
					ruleId: "no-constant-condition",
					message: "Unexpected constant condition.",
					messageId: "unexpected",
					nodeType: "Literal",
					line: 1,
					column: 49,
					endLine: 1,
					endColumn: 53,
				},
			]);
		});

		it("rules should apply meta.defaultOptions when the rule is not configured", () => {
			const config = { rules: {} };
			const codeA =
				"/*eslint no-constant-condition: error */ while (true) {}";
			const messages = linter.verify(codeA, config, filename);

			assert.deepStrictEqual(messages, []);
		});

		describe("when the rule has default options and a schema", () => {
			beforeEach(() => {
				linter.defineRules({
					"with-default-option": {
						meta: {
							defaultOptions: ["default-rule-option"],
							schema: {
								items: [{ type: "string" }],
								maxItems: 1,
								minItems: 1,
								type: "array",
							},
						},
						create(context) {
							const message = context.options[0];

							return {
								Identifier(node) {
									context.report({ node, message });
								},
							};
						},
					},
				});
			});

			it("preserves default options when the comment only has severity", () => {
				const code = "/*eslint with-default-option: 'warn' */\nArray;";
				const messages = linter.verify(code);

				assert.strictEqual(messages.length, 1);
				assert.strictEqual(messages[0].message, "default-rule-option");
				assert.strictEqual(messages[0].ruleId, "with-default-option");
				assert.strictEqual(messages[0].severity, 1);
			});

			it("overrides default options when the comment has severity and an option", () => {
				const code =
					"/*eslint with-default-option: ['warn', 'overridden-rule-option'] */\nArray;";
				const messages = linter.verify(code);

				assert.strictEqual(messages.length, 1);
				assert.strictEqual(
					messages[0].message,
					"overridden-rule-option",
				);
				assert.strictEqual(messages[0].ruleId, "with-default-option");
				assert.strictEqual(messages[0].severity, 1);
			});

			it.skip("reports an error when the comment has an option that does not match the schema", () => {
				const code =
					"/*eslint with-default-option: ['warn', 123] */\nArray;";
				const messages = linter.verify(code);

				assert.strictEqual(messages.length, 1);
				match(
					messages[0].message,
					/Configuration for rule "with-default-option" is invalid/gu,
				);
				match(
					messages[0].message,
					/Value 123 should be string/gu,
				);
				assert.strictEqual(messages[0].ruleId, "with-default-option");
				assert.strictEqual(messages[0].severity, 2);
			});
		});

		describe("when the rule has default options and schema: false", () => {
			beforeEach(() => {
				linter.defineRules({
					"with-default-option": {
						meta: {
							defaultOptions: ["default-rule-option"],
							schema: false,
						},
						create(context) {
							const message = `${context.options[0]}`;

							return {
								Identifier(node) {
									context.report({ node, message });
								},
							};
						},
					},
				});
			});

			it("preserves default options when the comment only has severity", () => {
				const code = "/*eslint with-default-option: 'warn' */\nArray;";
				const messages = linter.verify(code);

				assert.strictEqual(messages.length, 1);
				assert.strictEqual(messages[0].message, "default-rule-option");
				assert.strictEqual(messages[0].ruleId, "with-default-option");
				assert.strictEqual(messages[0].severity, 1);
			});

			it("overrides default options when the comment has severity and an option", () => {
				const code =
					"/*eslint with-default-option: ['warn', 'overridden-rule-option'] */\nArray;";
				const messages = linter.verify(code);

				assert.strictEqual(messages.length, 1);
				assert.strictEqual(
					messages[0].message,
					"overridden-rule-option",
				);
				assert.strictEqual(messages[0].ruleId, "with-default-option");
				assert.strictEqual(messages[0].severity, 1);
			});

			it("overrides default options error when the comment has an option that does not match the default type", () => {
				const code =
					"/*eslint with-default-option: ['warn', 123] */\nArray;";
				const messages = linter.verify(code);

				assert.strictEqual(messages.length, 1);
				assert.strictEqual(messages[0].message, "123");
				assert.strictEqual(messages[0].ruleId, "with-default-option");
				assert.strictEqual(messages[0].severity, 1);
			});
		});

		describe("when the rule was already configured", () => {
			beforeEach(() => {
				linter.defineRules({
					"my-rule": {
						meta: {
							schema: [
								{
									type: "string",
								},
							],
						},
						create(context) {
							const message =
								context.options[0] ?? "option not provided";

							return {
								Program(node) {
									context.report({ node, message });
								},
							};
						},
					},
					"has-default-options": {
						meta: {
							schema: [
								{
									type: "string",
								},
							],
							defaultOptions: ["option not provided"],
						},
						create(context) {
							const message = context.options[0];

							return {
								Identifier(node) {
									context.report({ node, message });
								},
							};
						},
					},
					"requires-option": {
						meta: {
							schema: {
								type: "array",
								items: [
									{
										type: "string",
									},
								],
								minItems: 1,
							},
						},
						create(context) {
							const message = context.options[0];

							return {
								Identifier(node) {
									context.report({ node, message });
								},
							};
						},
					},
				});
			});

			[
				"off",
				"error",
				["off"],
				["warn"],
				["error"],
				["off", "bar"],
				["warn", "bar"],
				["error", "bar"],
			].forEach(ruleConfig => {
				const config = {
					rules: {
						"has-default-options": ruleConfig,
						"my-rule": ruleConfig,
					},
				};

				it(`severity from the /*eslint*/ comment and options from the config should apply when the comment has only severity (original config: ${JSON.stringify(ruleConfig)})`, () => {
					const code =
						"/*eslint my-rule: 'warn', has-default-options: 'warn' */ id";
					const messages = linter.verify(code, config);
					const suppressedMessages = linter.getSuppressedMessages();

					const expectedMessage =
						Array.isArray(ruleConfig) && ruleConfig.length > 1
							? ruleConfig[1]
							: "option not provided";

					assert.strictEqual(messages.length, 2);
					assert.strictEqual(messages[0].ruleId, "my-rule");
					assert.strictEqual(messages[0].severity, 1);
					assert.strictEqual(messages[0].message, expectedMessage);
					assert.strictEqual(
						messages[1].ruleId,
						"has-default-options",
					);
					assert.strictEqual(messages[1].severity, 1);
					assert.strictEqual(messages[1].message, expectedMessage);
					assert.strictEqual(suppressedMessages.length, 0);
				});

				it(`severity from the /*eslint*/ comment and options from the config should apply when the comment has array with only severity (original config: ${JSON.stringify(ruleConfig)})`, () => {
					const code =
						"/*eslint my-rule: ['warn'], has-default-options: ['warn'] */ id";
					const messages = linter.verify(code, config);
					const suppressedMessages = linter.getSuppressedMessages();

					const expectedMessage =
						Array.isArray(ruleConfig) && ruleConfig.length > 1
							? ruleConfig[1]
							: "option not provided";

					assert.strictEqual(messages.length, 2);
					assert.strictEqual(messages[0].ruleId, "my-rule");
					assert.strictEqual(messages[0].severity, 1);
					assert.strictEqual(messages[0].message, expectedMessage);
					assert.strictEqual(
						messages[1].ruleId,
						"has-default-options",
					);
					assert.strictEqual(messages[1].severity, 1);
					assert.strictEqual(messages[1].message, expectedMessage);
					assert.strictEqual(suppressedMessages.length, 0);
				});

				it(`severity and options from the /*eslint*/ comment should apply when the comment includes options (original config: ${JSON.stringify(ruleConfig)})`, () => {
					const code =
						"/*eslint my-rule: ['warn', 'foo'], has-default-options: ['warn', 'foo'] */ id";
					const messages = linter.verify(code, config);
					const suppressedMessages = linter.getSuppressedMessages();

					assert.strictEqual(messages.length, 2);
					assert.strictEqual(messages[0].ruleId, "my-rule");
					assert.strictEqual(messages[0].severity, 1);
					assert.strictEqual(messages[0].message, "foo");
					assert.strictEqual(
						messages[1].ruleId,
						"has-default-options",
					);
					assert.strictEqual(messages[1].severity, 1);
					assert.strictEqual(messages[1].message, "foo");
					assert.strictEqual(suppressedMessages.length, 0);
				});
			});

			it.skip("should validate and use originally configured options when /*eslint*/ comment enables rule that was set to 'off' in the configuration", () => {
				const code =
					"/*eslint my-rule: ['warn'], requires-option: 'warn' */ foo;";
				const config = {
					rules: {
						"my-rule": ["off", true], // invalid options for this rule
						"requires-option": ["off", "Don't use identifier"], // valid options for this rule
					},
				};
				const messages = linter.verify(code, config);
				const suppressedMessages = linter.getSuppressedMessages();

				assert.strictEqual(messages.length, 2);
				assert.strictEqual(messages[0].ruleId, "my-rule");
				assert.strictEqual(messages[0].severity, 2);
				assert.strictEqual(
					messages[0].message,
					'Configuration for rule "my-rule" is invalid:\n\tValue true should be string.\n',
				);
				assert.strictEqual(messages[1].ruleId, "requires-option");
				assert.strictEqual(messages[1].severity, 1);
				assert.strictEqual(messages[1].message, "Don't use identifier");
				assert.strictEqual(suppressedMessages.length, 0);
			});
		});
	});

	describe("when evaluating code with invalid comments to enable rules", () => {
		it("should report a violation when the config is not a valid rule configuration", () => {
			const messages = linter.verify(
				"/*eslint no-alert:true*/ alert('test');",
			);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.deepStrictEqual(messages, [
				{
					severity: 2,
					ruleId: "no-alert",
					message:
						"Configuration for rule \"no-alert\" is invalid:\n\tSeverity should be one of the following: 0 = off, 1 = warn, 2 = error (you passed 'true').\n",
					line: 1,
					column: 1,
					endLine: 1,
					endColumn: 25,
					nodeType: null,
				},
			]);

			assert.strictEqual(suppressedMessages.length, 0);
		});

		it.skip("should report a violation when the config violates a rule's schema", () => {
			const messages = linter.verify(
				"/* eslint no-alert: [error, {nonExistentPropertyName: true}]*/",
			);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.deepStrictEqual(messages, [
				{
					severity: 2,
					ruleId: "no-alert",
					message:
						'Configuration for rule "no-alert" is invalid:\n\tValue [{"nonExistentPropertyName":true}] should NOT have more than 0 items.\n',
					line: 1,
					column: 1,
					endLine: 1,
					endColumn: 63,
					nodeType: null,
				},
			]);

			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should apply valid configuration even if there is an invalid configuration present", () => {
			const code = [
				"/* eslint no-unused-vars: [ */ // <-- this one is invalid JSON",
				'/* eslint no-undef: ["error"] */ // <-- this one is fine, and thus should apply',
				"foo(); // <-- expected no-undef error here",
			].join("\n");

			const messages = linter.verify(code);
			const suppressedMessages = linter.getSuppressedMessages();

			// different engines have different JSON parsing error messages
			match(
				messages[0].message,
				/Failed to parse JSON from '"no-unused-vars": \['/u,
			);
			assert.strictEqual(messages[0].severity, 2);
			assert.ok(messages[0].fatal);
			isNull(messages[0].ruleId);
			assert.strictEqual(messages[0].line, 1);
			assert.strictEqual(messages[0].column, 1);
			isNull(messages[0].nodeType);

			assert.deepStrictEqual(messages[1], {
				severity: 2,
				ruleId: "no-undef",
				message: "'foo' is not defined.",
				messageId: "undef",
				line: 3,
				column: 1,
				endLine: 3,
				endColumn: 4,
				nodeType: "Identifier",
			});

			assert.strictEqual(suppressedMessages.length, 0);
		});
	});

	describe("when evaluating code with comments to disable rules", () => {
		const code = "/*eslint no-alert:0*/ alert('test');";

		it("should not report a violation", () => {
			const config = { rules: { "no-alert": 1 } };

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 0);
		});
	});

	describe("when evaluating code with comments to disable rules", () => {
		let code, messages, suppressedMessages;

		it("should report an error when disabling a non-existent rule in inline comment", () => {
			code = "/*eslint foo:0*/ ;";
			messages = linter.verify(code, {}, filename);
			suppressedMessages = linter.getSuppressedMessages();
			assert.strictEqual(messages.length, 1);
			assert.strictEqual(
				messages[0].message,
				"Definition for rule 'foo' was not found.",
			);
			assert.strictEqual(suppressedMessages.length, 0);

			code = "/*eslint-disable foo*/ ;";
			messages = linter.verify(code, {}, filename);
			suppressedMessages = linter.getSuppressedMessages();
			assert.strictEqual(messages.length, 1);
			assert.strictEqual(
				messages[0].message,
				"Definition for rule 'foo' was not found.",
			);
			assert.strictEqual(suppressedMessages.length, 0);

			code = "/*eslint-disable-line foo*/ ;";
			messages = linter.verify(code, {}, filename);
			suppressedMessages = linter.getSuppressedMessages();
			assert.strictEqual(messages.length, 1);
			assert.strictEqual(
				messages[0].message,
				"Definition for rule 'foo' was not found.",
			);
			assert.strictEqual(suppressedMessages.length, 0);

			code = "/*eslint-disable-next-line foo*/ ;";
			messages = linter.verify(code, {}, filename);
			suppressedMessages = linter.getSuppressedMessages();
			assert.strictEqual(messages.length, 1);
			assert.strictEqual(
				messages[0].message,
				"Definition for rule 'foo' was not found.",
			);
			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should not report an error, when disabling a non-existent rule in config", () => {
			messages = linter.verify("", { rules: { foo: 0 } }, filename);
			suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should report an error, when config a non-existent rule in config", () => {
			messages = linter.verify("", { rules: { foo: 1 } }, filename);
			suppressedMessages = linter.getSuppressedMessages();
			assert.strictEqual(messages.length, 1);
			assert.strictEqual(messages[0].severity, 2);
			assert.strictEqual(
				messages[0].message,
				"Definition for rule 'foo' was not found.",
			);
			assert.strictEqual(suppressedMessages.length, 0);

			messages = linter.verify("", { rules: { foo: 2 } }, filename);
			suppressedMessages = linter.getSuppressedMessages();
			assert.strictEqual(messages.length, 1);
			assert.strictEqual(messages[0].severity, 2);
			assert.strictEqual(
				messages[0].message,
				"Definition for rule 'foo' was not found.",
			);
			assert.strictEqual(suppressedMessages.length, 0);
		});
	});

	describe("when evaluating code with comments to enable multiple rules", () => {
		const code =
			"/*eslint no-alert:1 no-console:1*/ alert('test'); console.log('test');";

		it("should report a violation", () => {
			const config = { rules: {} };

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 2);
			assert.strictEqual(messages[0].ruleId, "no-alert");
			assert.strictEqual(messages[0].message, "Unexpected alert.");
			include(messages[0].nodeType, "CallExpression");
			assert.strictEqual(messages[1].ruleId, "no-console");

			assert.strictEqual(suppressedMessages.length, 0);
		});
	});

	describe("when evaluating code with comments to enable and disable multiple rules", () => {
		const code =
			"/*eslint no-alert:1 no-console:0*/ alert('test'); console.log('test');";

		it("should report a violation", () => {
			const config = { rules: { "no-console": 1, "no-alert": 0 } };

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(messages[0].ruleId, "no-alert");
			assert.strictEqual(messages[0].message, "Unexpected alert.");
			include(messages[0].nodeType, "CallExpression");

			assert.strictEqual(suppressedMessages.length, 0);
		});
	});

	describe("when evaluating code with comments to disable and enable configurable rule as part of plugin", () => {
		beforeEach(() => {
			linter.defineRule("test-plugin/test-rule", {
				create(context) {
					return {
						Literal(node) {
							if (node.value === "trigger violation") {
								context.report(node, "Reporting violation.");
							}
						},
					};
				},
			});
		});

		it("should not report a violation when inline comment enables plugin rule and there's no violation", () => {
			const config = { rules: {} };
			const code =
				'/*eslint test-plugin/test-rule: 2*/ var a = "no violation";';

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should not report a violation when inline comment disables plugin rule", () => {
			const code =
				'/*eslint test-plugin/test-rule:0*/ var a = "trigger violation"';
			const config = { rules: { "test-plugin/test-rule": 1 } };

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should report a violation when the report is right before the comment", () => {
			const code = " /* eslint-disable */ ";

			linter.defineRule("checker", {
				create: context => ({
					Program() {
						context.report({
							loc: { line: 1, column: 0 },
							message: "foo",
						});
					},
				}),
			});
			const problems = linter.verify(code, {
				rules: { checker: "error" },
			});
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(problems.length, 1);
			assert.strictEqual(problems[0].message, "foo");
			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should not report a violation when the report is right at the start of the comment", () => {
			const code = " /* eslint-disable */ ";

			linter.defineRule("checker", {
				create: context => ({
					Program() {
						context.report({
							loc: { line: 1, column: 1 },
							message: "foo",
						});
					},
				}),
			});
			const problems = linter.verify(code, {
				rules: { checker: "error" },
			});
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(problems.length, 0);

			assert.strictEqual(suppressedMessages.length, 1);
			assert.strictEqual(suppressedMessages[0].message, "foo");
			assert.strictEqual(suppressedMessages[0].suppressions.length, 1);
			assert.strictEqual(
				suppressedMessages[0].suppressions[0].justification,
				"",
			);
		});

		it("rules should not change initial config", () => {
			const config = { rules: { "test-plugin/test-rule": 2 } };
			const codeA =
				'/*eslint test-plugin/test-rule: 0*/ var a = "trigger violation";';
			const codeB = 'var a = "trigger violation";';

			let messages = linter.verify(codeA, config, filename);
			let suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 0);

			messages = linter.verify(codeB, config, filename);
			suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(suppressedMessages.length, 0);
		});
	});

	describe("when evaluating code with multiple configuration comments for same rule", () => {
		beforeEach(() => {
			linter.defineRule("no-foo", {
				meta: {
					schema: [
						{
							enum: ["bar", "baz", "qux"],
						},
					],
				},
				create(context) {
					const replacement = context.options[0] ?? "default";

					return {
						"Identifier[name='foo']"(node) {
							context.report(
								node,
								`Replace 'foo' with '${replacement}'.`,
							);
						},
					};
				},
			});
		});

		it("should apply the first and report an error for the second when there are two", () => {
			const code =
				"/*eslint no-foo: ['error', 'bar']*/ /*eslint no-foo: ['error', 'baz']*/ foo;";

			const messages = linter.verify(code);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.deepStrictEqual(messages, [
				{
					ruleId: null,
					severity: 2,
					message:
						'Rule "no-foo" is already configured by another configuration comment in the preceding code. This configuration is ignored.',
					line: 1,
					column: 37,
					endLine: 1,
					endColumn: 72,
					nodeType: null,
				},
				{
					ruleId: "no-foo",
					severity: 2,
					message: "Replace 'foo' with 'bar'.",
					line: 1,
					column: 73,
					endLine: 1,
					endColumn: 76,
					nodeType: "Identifier",
				},
			]);
			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should apply the first and report an error for each other when there are more than two", () => {
			const code =
				"/*eslint no-foo: ['error', 'bar']*/ /*eslint no-foo: ['error', 'baz']*/ /*eslint no-foo: ['error', 'qux']*/ foo;";

			const messages = linter.verify(code);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.deepStrictEqual(messages, [
				{
					ruleId: null,
					severity: 2,
					message:
						'Rule "no-foo" is already configured by another configuration comment in the preceding code. This configuration is ignored.',
					line: 1,
					column: 37,
					endLine: 1,
					endColumn: 72,
					nodeType: null,
				},
				{
					ruleId: null,
					severity: 2,
					message:
						'Rule "no-foo" is already configured by another configuration comment in the preceding code. This configuration is ignored.',
					line: 1,
					column: 73,
					endLine: 1,
					endColumn: 108,
					nodeType: null,
				},
				{
					ruleId: "no-foo",
					severity: 2,
					message: "Replace 'foo' with 'bar'.",
					line: 1,
					column: 109,
					endLine: 1,
					endColumn: 112,
					nodeType: "Identifier",
				},
			]);
			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should apply the first and report an error for the second when both just override severity", () => {
			const code =
				"/*eslint no-foo: 'warn'*/ /*eslint no-foo: 'error'*/ foo;";

			const messages = linter.verify(code, {
				rules: { "no-foo": ["error", "bar"] },
			});
			const suppressedMessages = linter.getSuppressedMessages();

			assert.deepStrictEqual(messages, [
				{
					ruleId: null,
					severity: 2,
					message:
						'Rule "no-foo" is already configured by another configuration comment in the preceding code. This configuration is ignored.',
					line: 1,
					column: 27,
					endLine: 1,
					endColumn: 53,
					nodeType: null,
				},
				{
					ruleId: "no-foo",
					severity: 1,
					message: "Replace 'foo' with 'bar'.",
					line: 1,
					column: 54,
					endLine: 1,
					endColumn: 57,
					nodeType: "Identifier",
				},
			]);
			assert.strictEqual(suppressedMessages.length, 0);
		});

		it.skip("should apply the second if the first has an invalid configuration", () => {
			const code =
				"/*eslint no-foo: ['error', 'quux']*/ /*eslint no-foo: ['error', 'bar']*/ foo;";

			const messages = linter.verify(code);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 2);
			include(
				messages[0].message,
				'Configuration for rule "no-foo" is invalid',
			);
			assert.strictEqual(
				messages[1].message,
				"Replace 'foo' with 'bar'.",
			);
			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should apply configurations for other rules that are in the same comment as the duplicate", () => {
			const code =
				"/*eslint no-foo: ['error', 'bar']*/ /*eslint no-foo: ['error', 'baz'], no-alert: ['error']*/ foo; alert();";

			const messages = linter.verify(code);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 3);
			assert.strictEqual(
				messages[0].message,
				'Rule "no-foo" is already configured by another configuration comment in the preceding code. This configuration is ignored.',
			);
			assert.strictEqual(
				messages[1].message,
				"Replace 'foo' with 'bar'.",
			);
			assert.strictEqual(messages[2].ruleId, "no-alert");
			assert.strictEqual(suppressedMessages.length, 0);
		});
	});

	describe("when evaluating code with comments to enable and disable all reporting", () => {
		it("should report a violation", () => {
			const code = [
				"/*eslint-disable */",
				"alert('test');",
				"/*eslint-enable */",
				"alert('test');",
			].join("\n");
			const config = { rules: { "no-alert": 1 } };

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(messages[0].ruleId, "no-alert");
			assert.strictEqual(messages[0].message, "Unexpected alert.");
			include(messages[0].nodeType, "CallExpression");
			assert.strictEqual(messages[0].line, 4);

			assert.strictEqual(suppressedMessages.length, 1);
			assert.strictEqual(suppressedMessages[0].ruleId, "no-alert");
			assert.strictEqual(
				suppressedMessages[0].message,
				"Unexpected alert.",
			);
			assert.strictEqual(suppressedMessages[0].line, 2);
			assert.strictEqual(suppressedMessages[0].suppressions.length, 1);
			assert.strictEqual(
				suppressedMessages[0].suppressions[0].justification,
				"",
			);
		});

		it("should not report a violation", () => {
			const code = [
				"/*eslint-disable */",
				"alert('test');",
				"alert('test');",
			].join("\n");
			const config = { rules: { "no-alert": 1 } };

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);

			assert.strictEqual(suppressedMessages.length, 2);
			assert.strictEqual(suppressedMessages[0].line, 2);
			assert.strictEqual(suppressedMessages[0].suppressions.length, 1);
			assert.strictEqual(suppressedMessages[1].line, 3);
			assert.strictEqual(suppressedMessages[1].suppressions.length, 1);
		});

		it("should not report a violation", () => {
			const code = [
				"                    alert('test1');/*eslint-disable */\n",
				"alert('test');",
				"                                         alert('test');\n",
				"/*eslint-enable */alert('test2');",
			].join("");
			const config = { rules: { "no-alert": 1 } };

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 2);
			assert.strictEqual(messages[0].column, 21);
			assert.strictEqual(messages[1].column, 19);

			assert.strictEqual(suppressedMessages.length, 2);
			assert.strictEqual(suppressedMessages[0].column, 1);
			assert.strictEqual(suppressedMessages[1].column, 56);
		});

		it("should report a violation", () => {
			const code = [
				"/*eslint-disable */",
				"alert('test');",
				"/*eslint-disable */",
				"alert('test');",
				"/*eslint-enable*/",
				"alert('test');",
				"/*eslint-enable*/",
			].join("\n");

			const config = { rules: { "no-alert": 1 } };

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(suppressedMessages.length, 2);
		});

		it("should not report a violation", () => {
			const code = [
				"/*eslint-disable */",
				"(function(){ var b = 44;})()",
				"/*eslint-enable */;any();",
			].join("\n");

			const config = { rules: { "no-unused-vars": 1 } };

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 1);
		});

		it("should not report a violation", () => {
			const code = [
				"(function(){ /*eslint-disable */ var b = 44;})()",
				"/*eslint-enable */;any();",
			].join("\n");

			const config = { rules: { "no-unused-vars": 1 } };

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 1);
		});
	});

	describe("when evaluating code with comments to ignore reporting on specific rules on a specific line", () => {
		describe("eslint-disable-line", () => {
			it("should report a violation", () => {
				const code = [
					"alert('test'); // eslint-disable-line no-alert",
					"console.log('test');", // here
				].join("\n");
				const config = {
					rules: {
						"no-alert": 1,
						"no-console": 1,
					},
				};

				const messages = linter.verify(code, config, filename);
				const suppressedMessages = linter.getSuppressedMessages();

				assert.strictEqual(messages.length, 1);
				assert.strictEqual(messages[0].ruleId, "no-console");

				assert.strictEqual(suppressedMessages.length, 1);
				assert.strictEqual(suppressedMessages[0].ruleId, "no-alert");
			});

			it("should report a violation", () => {
				const code = [
					"alert('test'); // eslint-disable-line no-alert",
					"console.log('test'); // eslint-disable-line no-console",
					"alert('test');", // here
				].join("\n");
				const config = {
					rules: {
						"no-alert": 1,
						"no-console": 1,
					},
				};

				const messages = linter.verify(code, config, filename);
				const suppressedMessages = linter.getSuppressedMessages();

				assert.strictEqual(messages.length, 1);
				assert.strictEqual(messages[0].ruleId, "no-alert");

				assert.strictEqual(suppressedMessages.length, 2);
				assert.strictEqual(suppressedMessages[0].ruleId, "no-alert");
				assert.strictEqual(suppressedMessages[1].ruleId, "no-console");
			});

			it("should report a violation if eslint-disable-line in a block comment is not on a single line", () => {
				const code = [
					"/* eslint-disable-line",
					"*",
					"*/ console.log('test');", // here
				].join("\n");
				const config = {
					rules: {
						"no-console": 1,
					},
				};

				const messages = linter.verify(code, config, filename);
				const suppressedMessages = linter.getSuppressedMessages();

				assert.strictEqual(messages.length, 2);
				assert.strictEqual(messages[1].ruleId, "no-console");
				assert.strictEqual(suppressedMessages.length, 0);
			});

			it("should not disable rule and add an extra report if eslint-disable-line in a block comment is not on a single line", () => {
				const code = [
					"alert('test'); /* eslint-disable-line ",
					"no-alert */",
				].join("\n");
				const config = {
					rules: {
						"no-alert": 1,
					},
				};

				const messages = linter.verify(code, config);
				const suppressedMessages = linter.getSuppressedMessages();

				assert.deepStrictEqual(messages, [
					{
						ruleId: "no-alert",
						severity: 1,
						line: 1,
						column: 1,
						endLine: 1,
						endColumn: 14,
						message: "Unexpected alert.",
						messageId: "unexpected",
						nodeType: "CallExpression",
					},
					{
						ruleId: null,
						severity: 2,
						message:
							"eslint-disable-line comment should not span multiple lines.",
						line: 1,
						column: 16,
						endLine: 2,
						endColumn: 12,
						nodeType: null,
					},
				]);

				assert.strictEqual(suppressedMessages.length, 0);
			});

			it("should not report a violation for eslint-disable-line in block comment", () => {
				const code = [
					"alert('test'); // eslint-disable-line no-alert",
					"alert('test'); /*eslint-disable-line no-alert*/",
				].join("\n");
				const config = {
					rules: {
						"no-alert": 1,
					},
				};

				const messages = linter.verify(code, config, filename);
				const suppressedMessages = linter.getSuppressedMessages();

				assert.strictEqual(messages.length, 0);

				assert.strictEqual(suppressedMessages.length, 2);
				assert.strictEqual(suppressedMessages[0].ruleId, "no-alert");
				assert.strictEqual(suppressedMessages[1].ruleId, "no-alert");
			});

			it("should not report a violation", () => {
				const code = [
					"alert('test'); // eslint-disable-line no-alert",
					"console.log('test'); // eslint-disable-line no-console",
				].join("\n");
				const config = {
					rules: {
						"no-alert": 1,
						"no-console": 1,
					},
				};

				const messages = linter.verify(code, config, filename);
				const suppressedMessages = linter.getSuppressedMessages();

				assert.strictEqual(messages.length, 0);

				assert.strictEqual(suppressedMessages.length, 2);
				assert.strictEqual(suppressedMessages[0].ruleId, "no-alert");
				assert.strictEqual(suppressedMessages[1].ruleId, "no-console");
			});

			it("should not report a violation", () => {
				const code = [
					"alert('test') // eslint-disable-line no-alert, quotes, semi",
					"console.log('test'); // eslint-disable-line",
				].join("\n");
				const config = {
					rules: {
						"no-alert": 1,
						quotes: [1, "double"],
						semi: [1, "always"],
						"no-console": 1,
					},
				};

				const messages = linter.verify(code, config, filename);
				const suppressedMessages = linter.getSuppressedMessages();

				assert.strictEqual(messages.length, 0);
				assert.strictEqual(suppressedMessages.length, 5);
			});

			it("should not report a violation", () => {
				const code = [
					"alert('test') /* eslint-disable-line no-alert, quotes, semi */",
					"console.log('test'); /* eslint-disable-line */",
				].join("\n");
				const config = {
					rules: {
						"no-alert": 1,
						quotes: [1, "double"],
						semi: [1, "always"],
						"no-console": 1,
					},
				};

				const messages = linter.verify(code, config, filename);
				const suppressedMessages = linter.getSuppressedMessages();

				assert.strictEqual(messages.length, 0);
				assert.strictEqual(suppressedMessages.length, 5);
			});

			it("should ignore violations of multiple rules when specified in mixed comments", () => {
				const code = [
					' alert("test"); /* eslint-disable-line no-alert */ // eslint-disable-line quotes',
				].join("\n");
				const config = {
					rules: {
						"no-alert": 1,
						quotes: [1, "single"],
					},
				};
				const messages = linter.verify(code, config, filename);
				const suppressedMessages = linter.getSuppressedMessages();

				assert.strictEqual(messages.length, 0);

				assert.strictEqual(suppressedMessages.length, 2);
				assert.strictEqual(suppressedMessages[0].ruleId, "no-alert");
			});

			it("should report a violation with quoted rule names in eslint-disable-line", () => {
				const code = [
					"alert('test'); // eslint-disable-line 'no-alert'",
					"console.log('test');", // here
					"alert('test'); // eslint-disable-line \"no-alert\"",
				].join("\n");
				const config = {
					rules: {
						"no-alert": 1,
						"no-console": 1,
					},
				};

				const messages = linter.verify(code, config, filename);
				const suppressedMessages = linter.getSuppressedMessages();

				assert.strictEqual(messages.length, 1);
				assert.strictEqual(messages[0].ruleId, "no-console");
				assert.strictEqual(messages[0].line, 2);

				assert.strictEqual(suppressedMessages.length, 2);
				assert.strictEqual(suppressedMessages[0].ruleId, "no-alert");
				assert.strictEqual(suppressedMessages[0].line, 1);
				assert.strictEqual(suppressedMessages[1].ruleId, "no-alert");
				assert.strictEqual(suppressedMessages[1].line, 3);
			});
		});

		describe("eslint-disable-next-line", () => {
			it("should ignore violation of specified rule on next line", () => {
				const code = [
					"// eslint-disable-next-line no-alert",
					"alert('test');",
					"console.log('test');",
				].join("\n");
				const config = {
					rules: {
						"no-alert": 1,
						"no-console": 1,
					},
				};
				const messages = linter.verify(code, config, filename);
				const suppressedMessages = linter.getSuppressedMessages();

				assert.strictEqual(messages.length, 1);
				assert.strictEqual(messages[0].ruleId, "no-console");

				assert.strictEqual(suppressedMessages.length, 1);
				assert.strictEqual(suppressedMessages[0].ruleId, "no-alert");
			});

			it("should ignore violation of specified rule if eslint-disable-next-line is a block comment", () => {
				const code = [
					"/* eslint-disable-next-line no-alert */",
					"alert('test');",
					"console.log('test');",
				].join("\n");
				const config = {
					rules: {
						"no-alert": 1,
						"no-console": 1,
					},
				};
				const messages = linter.verify(code, config, filename);
				const suppressedMessages = linter.getSuppressedMessages();

				assert.strictEqual(messages.length, 1);
				assert.strictEqual(messages[0].ruleId, "no-console");

				assert.strictEqual(suppressedMessages.length, 1);
				assert.strictEqual(suppressedMessages[0].ruleId, "no-alert");
			});
			it("should ignore violation of specified rule if eslint-disable-next-line is a block comment", () => {
				const code = [
					"/* eslint-disable-next-line no-alert */",
					"alert('test');",
				].join("\n");
				const config = {
					rules: {
						"no-alert": 1,
					},
				};
				const messages = linter.verify(code, config, filename);
				const suppressedMessages = linter.getSuppressedMessages();

				assert.strictEqual(messages.length, 0);

				assert.strictEqual(suppressedMessages.length, 1);
				assert.strictEqual(suppressedMessages[0].ruleId, "no-alert");
			});

			it("should not ignore violation if code is not on next line", () => {
				const code = [
					"/* eslint-disable-next-line",
					"no-alert */alert('test');",
				].join("\n");
				const config = {
					rules: {
						"no-alert": 1,
					},
				};
				const messages = linter.verify(code, config, filename);
				const suppressedMessages = linter.getSuppressedMessages();

				assert.strictEqual(messages.length, 1);
				assert.strictEqual(messages[0].ruleId, "no-alert");

				assert.strictEqual(suppressedMessages.length, 0);
			});

			it("should ignore violation if block comment span multiple lines", () => {
				const code = [
					"/* eslint-disable-next-line",
					"no-alert */",
					"alert('test');",
				].join("\n");
				const config = {
					rules: {
						"no-alert": 1,
					},
				};
				const messages = linter.verify(code, config, filename);
				const suppressedMessages = linter.getSuppressedMessages();

				assert.strictEqual(messages.length, 0);

				assert.strictEqual(suppressedMessages.length, 1);
				assert.strictEqual(suppressedMessages[0].ruleId, "no-alert");
			});

			it("should ignore violations only of specified rule", () => {
				const code = [
					"// eslint-disable-next-line no-console",
					"alert('test');",
					"console.log('test');",
				].join("\n");
				const config = {
					rules: {
						"no-alert": 1,
						"no-console": 1,
					},
				};
				const messages = linter.verify(code, config, filename);
				const suppressedMessages = linter.getSuppressedMessages();

				assert.strictEqual(messages.length, 2);
				assert.strictEqual(messages[0].ruleId, "no-alert");
				assert.strictEqual(messages[1].ruleId, "no-console");

				assert.strictEqual(suppressedMessages.length, 0);
			});

			it("should ignore violations of multiple rules when specified", () => {
				const code = [
					"// eslint-disable-next-line no-alert, quotes",
					'alert("test");',
					"console.log('test');",
				].join("\n");
				const config = {
					rules: {
						"no-alert": 1,
						quotes: [1, "single"],
						"no-console": 1,
					},
				};
				const messages = linter.verify(code, config, filename);
				const suppressedMessages = linter.getSuppressedMessages();

				assert.strictEqual(messages.length, 1);
				assert.strictEqual(messages[0].ruleId, "no-console");

				assert.strictEqual(suppressedMessages.length, 2);
				assert.strictEqual(suppressedMessages[0].ruleId, "no-alert");
				assert.strictEqual(suppressedMessages[1].ruleId, "quotes");
			});

			it("should ignore violations of multiple rules when specified in multiple lines", () => {
				const code = [
					"/* eslint-disable-next-line",
					"no-alert,",
					"quotes",
					"*/",
					'alert("test");',
					"console.log('test');",
				].join("\n");
				const config = {
					rules: {
						"no-alert": 1,
						quotes: [1, "single"],
						"no-console": 1,
					},
				};
				const messages = linter.verify(code, config, filename);

				assert.strictEqual(messages.length, 1);
				assert.strictEqual(messages[0].ruleId, "no-console");
			});

			it("should ignore violations of multiple rules when specified in mixed comments", () => {
				const code = [
					"/* eslint-disable-next-line no-alert */ // eslint-disable-next-line quotes",
					'alert("test");',
				].join("\n");
				const config = {
					rules: {
						"no-alert": 1,
						quotes: [1, "single"],
					},
				};
				const messages = linter.verify(code, config, filename);
				const suppressedMessages = linter.getSuppressedMessages();

				assert.strictEqual(messages.length, 0);

				assert.strictEqual(suppressedMessages.length, 2);
				assert.strictEqual(suppressedMessages[0].ruleId, "no-alert");
				assert.strictEqual(suppressedMessages[1].ruleId, "quotes");
			});

			it("should ignore violations of multiple rules when specified in mixed single line and multi line comments", () => {
				const code = [
					"/* eslint-disable-next-line",
					"no-alert",
					"*/ // eslint-disable-next-line quotes",
					'alert("test");',
				].join("\n");
				const config = {
					rules: {
						"no-alert": 1,
						quotes: [1, "single"],
					},
				};
				const messages = linter.verify(code, config, filename);

				assert.strictEqual(messages.length, 0);
			});

			it("should ignore violations of only the specified rule on next line", () => {
				const code = [
					"// eslint-disable-next-line quotes",
					'alert("test");',
					"console.log('test');",
				].join("\n");
				const config = {
					rules: {
						"no-alert": 1,
						quotes: [1, "single"],
						"no-console": 1,
					},
				};
				const messages = linter.verify(code, config, filename);
				const suppressedMessages = linter.getSuppressedMessages();

				assert.strictEqual(messages.length, 2);
				assert.strictEqual(messages[0].ruleId, "no-alert");
				assert.strictEqual(messages[1].ruleId, "no-console");

				assert.strictEqual(suppressedMessages.length, 1);
				assert.strictEqual(suppressedMessages[0].ruleId, "quotes");
			});

			it("should ignore violations of specified rule on next line only", () => {
				const code = [
					"alert('test');",
					"// eslint-disable-next-line no-alert",
					"alert('test');",
					"console.log('test');",
				].join("\n");
				const config = {
					rules: {
						"no-alert": 1,
						"no-console": 1,
					},
				};
				const messages = linter.verify(code, config, filename);
				const suppressedMessages = linter.getSuppressedMessages();

				assert.strictEqual(messages.length, 2);
				assert.strictEqual(messages[0].ruleId, "no-alert");
				assert.strictEqual(messages[1].ruleId, "no-console");

				assert.strictEqual(suppressedMessages.length, 1);
				assert.strictEqual(suppressedMessages[0].ruleId, "no-alert");
			});

			it("should ignore all rule violations on next line if none specified", () => {
				const code = [
					"// eslint-disable-next-line",
					'alert("test");',
					"console.log('test')",
				].join("\n");
				const config = {
					rules: {
						semi: [1, "never"],
						quotes: [1, "single"],
						"no-alert": 1,
						"no-console": 1,
					},
				};
				const messages = linter.verify(code, config, filename);
				const suppressedMessages = linter.getSuppressedMessages();

				assert.strictEqual(messages.length, 1);
				assert.strictEqual(messages[0].ruleId, "no-console");

				assert.strictEqual(suppressedMessages.length, 3);
				assert.strictEqual(suppressedMessages[0].ruleId, "no-alert");
				assert.strictEqual(suppressedMessages[1].ruleId, "quotes");
				assert.strictEqual(suppressedMessages[2].ruleId, "semi");
			});

			it("should ignore violations if eslint-disable-next-line is a block comment", () => {
				const code = [
					"alert('test');",
					"/* eslint-disable-next-line no-alert */",
					"alert('test');",
					"console.log('test');",
				].join("\n");
				const config = {
					rules: {
						"no-alert": 1,
						"no-console": 1,
					},
				};
				const messages = linter.verify(code, config, filename);
				const suppressedMessages = linter.getSuppressedMessages();

				assert.strictEqual(messages.length, 2);
				assert.strictEqual(messages[0].ruleId, "no-alert");
				assert.strictEqual(messages[1].ruleId, "no-console");

				assert.strictEqual(suppressedMessages.length, 1);
				assert.strictEqual(suppressedMessages[0].ruleId, "no-alert");
			});

			it("should report a violation", () => {
				const code = [
					"/* eslint-disable-next-line",
					"*",
					"*/",
					"console.log('test');", // here
				].join("\n");
				const config = {
					rules: {
						"no-alert": 1,
						"no-console": 1,
					},
				};

				const messages = linter.verify(code, config, filename);
				const suppressedMessages = linter.getSuppressedMessages();

				assert.strictEqual(messages.length, 2);
				assert.strictEqual(messages[1].ruleId, "no-console");

				assert.strictEqual(suppressedMessages.length, 0);
			});

			it("should not ignore violations if comment is of the type hashbang", () => {
				const code = [
					"#! eslint-disable-next-line no-alert",
					"alert('test');",
					"console.log('test');",
				].join("\n");
				const config = {
					rules: {
						"no-alert": 1,
						"no-console": 1,
					},
				};
				const messages = linter.verify(code, config, filename);
				const suppressedMessages = linter.getSuppressedMessages();

				assert.strictEqual(messages.length, 2);
				assert.strictEqual(messages[0].ruleId, "no-alert");
				assert.strictEqual(messages[1].ruleId, "no-console");

				assert.strictEqual(suppressedMessages.length, 0);
			});

			it("should ignore violation of specified rule on next line with quoted rule names", () => {
				const code = [
					"// eslint-disable-next-line 'no-alert'",
					"alert('test');",
					'// eslint-disable-next-line "no-alert"',
					"alert('test');",
					"console.log('test');",
				].join("\n");
				const config = {
					rules: {
						"no-alert": 1,
						"no-console": 1,
					},
				};
				const messages = linter.verify(code, config, filename);
				const suppressedMessages = linter.getSuppressedMessages();

				assert.strictEqual(messages.length, 1);
				assert.strictEqual(messages[0].ruleId, "no-console");

				assert.strictEqual(suppressedMessages.length, 2);
				assert.strictEqual(suppressedMessages[0].ruleId, "no-alert");
				assert.strictEqual(suppressedMessages[1].ruleId, "no-alert");
			});
		});
	});

	describe("when evaluating code with comments to enable and disable reporting of specific rules", () => {
		it("should report a violation", () => {
			const code = [
				"/*eslint-disable no-alert */",
				"alert('test');",
				"console.log('test');", // here
			].join("\n");
			const config = { rules: { "no-alert": 1, "no-console": 1 } };

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(messages[0].ruleId, "no-console");

			assert.strictEqual(suppressedMessages.length, 1);
			assert.strictEqual(suppressedMessages[0].ruleId, "no-alert");
		});

		it("should report no violation", () => {
			const code = [
				"/*eslint-disable no-unused-vars */",
				"var foo; // eslint-disable-line no-unused-vars",
				"var bar;",
				"/* eslint-enable no-unused-vars */", // here
			].join("\n");
			const config = { rules: { "no-unused-vars": 2 } };

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);

			assert.strictEqual(suppressedMessages.length, 2);
			assert.strictEqual(suppressedMessages[0].ruleId, "no-unused-vars");
			assert.strictEqual(suppressedMessages[0].line, 2);
			assert.strictEqual(suppressedMessages[1].ruleId, "no-unused-vars");
			assert.strictEqual(suppressedMessages[1].line, 3);
		});

		it("should report no violation", () => {
			const code = [
				"var foo1; // eslint-disable-line no-unused-vars",
				"var foo2; // eslint-disable-line no-unused-vars",
				"var foo3; // eslint-disable-line no-unused-vars",
				"var foo4; // eslint-disable-line no-unused-vars",
				"var foo5; // eslint-disable-line no-unused-vars",
			].join("\n");
			const config = { rules: { "no-unused-vars": 2 } };

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 5);
		});

		it("should report no violation", () => {
			const code = [
				"/* eslint-disable quotes */",
				'console.log("foo");',
				"/* eslint-enable quotes */",
			].join("\n");
			const config = { rules: { quotes: 2 } };

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should report a violation", () => {
			const code = [
				"/*eslint-disable no-alert, no-console */",
				"alert('test');",
				"console.log('test');",
				"/*eslint-enable*/",

				"alert('test');", // here
				"console.log('test');", // here
			].join("\n");
			const config = { rules: { "no-alert": 1, "no-console": 1 } };

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 2);
			assert.strictEqual(messages[0].ruleId, "no-alert");
			assert.strictEqual(messages[0].line, 5);
			assert.strictEqual(messages[1].ruleId, "no-console");
			assert.strictEqual(messages[1].line, 6);

			assert.strictEqual(suppressedMessages.length, 2);
			assert.strictEqual(suppressedMessages[0].ruleId, "no-alert");
			assert.strictEqual(suppressedMessages[0].line, 2);
			assert.strictEqual(suppressedMessages[1].ruleId, "no-console");
			assert.strictEqual(suppressedMessages[1].line, 3);
		});

		it("should report a violation", () => {
			const code = [
				"/*eslint-disable no-alert */",
				"alert('test');",
				"console.log('test');",
				"/*eslint-enable no-console */",

				"alert('test');", // here
			].join("\n");
			const config = { rules: { "no-alert": 1, "no-console": 1 } };

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(messages[0].ruleId, "no-console");

			assert.strictEqual(suppressedMessages.length, 2);
			assert.strictEqual(suppressedMessages[0].ruleId, "no-alert");
			assert.strictEqual(suppressedMessages[0].line, 2);
			assert.strictEqual(suppressedMessages[1].ruleId, "no-alert");
			assert.strictEqual(suppressedMessages[1].line, 5);
		});

		it("should report a violation", () => {
			const code = [
				"/*eslint-disable no-alert, no-console */",
				"alert('test');",
				"console.log('test');",
				"/*eslint-enable no-alert*/",

				"alert('test');", // here
				"console.log('test');",
			].join("\n");
			const config = { rules: { "no-alert": 1, "no-console": 1 } };

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(messages[0].ruleId, "no-alert");
			assert.strictEqual(messages[0].line, 5);

			assert.strictEqual(suppressedMessages.length, 3);
			assert.strictEqual(suppressedMessages[0].ruleId, "no-alert");
			assert.strictEqual(suppressedMessages[0].line, 2);
			assert.strictEqual(suppressedMessages[1].ruleId, "no-console");
			assert.strictEqual(suppressedMessages[1].line, 3);
			assert.strictEqual(suppressedMessages[2].ruleId, "no-console");
			assert.strictEqual(suppressedMessages[2].line, 6);
		});

		it("should report a violation", () => {
			const code = [
				"/*eslint-disable no-alert */",

				"/*eslint-disable no-console */",
				"alert('test');",
				"console.log('test');",
				"/*eslint-enable */",

				"alert('test');", // here
				"console.log('test');", // here

				"/*eslint-enable */",

				"alert('test');", // here
				"console.log('test');", // here

				"/*eslint-enable*/",
			].join("\n");
			const config = { rules: { "no-alert": 1, "no-console": 1 } };

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 4);
			assert.strictEqual(messages[0].ruleId, "no-alert");
			assert.strictEqual(messages[0].line, 6);
			assert.strictEqual(messages[1].ruleId, "no-console");
			assert.strictEqual(messages[1].line, 7);
			assert.strictEqual(messages[2].ruleId, "no-alert");
			assert.strictEqual(messages[2].line, 9);
			assert.strictEqual(messages[3].ruleId, "no-console");
			assert.strictEqual(messages[3].line, 10);

			assert.strictEqual(suppressedMessages.length, 2);
			assert.strictEqual(suppressedMessages[0].ruleId, "no-alert");
			assert.strictEqual(suppressedMessages[0].line, 3);
			assert.strictEqual(suppressedMessages[1].ruleId, "no-console");
			assert.strictEqual(suppressedMessages[1].line, 4);
		});

		it("should report a violation", () => {
			const code = [
				"/*eslint-disable no-alert, no-console */",
				"alert('test');",
				"console.log('test');",

				"/*eslint-enable no-alert */",

				"alert('test');", // here
				"console.log('test');",

				"/*eslint-enable no-console */",

				"alert('test');", // here
				"console.log('test');", // here
				"/*eslint-enable no-console */",
			].join("\n");
			const config = { rules: { "no-alert": 1, "no-console": 1 } };

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 3);
			assert.strictEqual(messages[0].ruleId, "no-alert");
			assert.strictEqual(messages[0].line, 5);
			assert.strictEqual(messages[1].ruleId, "no-alert");
			assert.strictEqual(messages[1].line, 8);
			assert.strictEqual(messages[2].ruleId, "no-console");
			assert.strictEqual(messages[2].line, 9);

			assert.strictEqual(suppressedMessages.length, 3);
			assert.strictEqual(suppressedMessages[0].ruleId, "no-alert");
			assert.strictEqual(suppressedMessages[0].line, 2);
			assert.strictEqual(suppressedMessages[1].ruleId, "no-console");
			assert.strictEqual(suppressedMessages[1].line, 3);
			assert.strictEqual(suppressedMessages[2].ruleId, "no-console");
			assert.strictEqual(suppressedMessages[2].line, 6);
		});

		it("should report a violation when severity is warn", () => {
			const code = [
				"/*eslint-disable no-alert, no-console */",
				"alert('test');",
				"console.log('test');",

				"/*eslint-enable no-alert */",

				"alert('test');", // here
				"console.log('test');",

				"/*eslint-enable no-console */",

				"alert('test');", // here
				"console.log('test');", // here
				"/*eslint-enable no-console */",
			].join("\n");
			const config = {
				rules: { "no-alert": "warn", "no-console": "warn" },
			};

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 3);
			assert.strictEqual(messages[0].ruleId, "no-alert");
			assert.strictEqual(messages[0].line, 5);
			assert.strictEqual(messages[1].ruleId, "no-alert");
			assert.strictEqual(messages[1].line, 8);
			assert.strictEqual(messages[2].ruleId, "no-console");
			assert.strictEqual(messages[2].line, 9);

			assert.strictEqual(suppressedMessages.length, 3);
			assert.strictEqual(suppressedMessages[0].ruleId, "no-alert");
			assert.strictEqual(suppressedMessages[0].line, 2);
			assert.strictEqual(suppressedMessages[1].ruleId, "no-console");
			assert.strictEqual(suppressedMessages[1].line, 3);
			assert.strictEqual(suppressedMessages[2].ruleId, "no-console");
			assert.strictEqual(suppressedMessages[2].line, 6);
		});

		it("should report a violation with quoted rule names in eslint-disable", () => {
			const code = [
				"/*eslint-disable 'no-alert' */",
				"alert('test');",
				"console.log('test');", // here
				"/*eslint-enable */",
				'/*eslint-disable "no-console" */',
				"alert('test');", // here
				"console.log('test');",
			].join("\n");
			const config = { rules: { "no-alert": 1, "no-console": 1 } };

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 2);
			assert.strictEqual(messages[0].ruleId, "no-console");
			assert.strictEqual(messages[1].ruleId, "no-alert");

			assert.strictEqual(suppressedMessages.length, 2);
			assert.strictEqual(suppressedMessages[0].ruleId, "no-alert");
			assert.strictEqual(suppressedMessages[1].ruleId, "no-console");
		});

		it("should report a violation with quoted rule names in eslint-enable", () => {
			const code = [
				"/*eslint-disable no-alert, no-console */",
				"alert('test');",
				"console.log('test');",
				"/*eslint-enable 'no-alert'*/",
				"alert('test');", // here
				"console.log('test');",
				'/*eslint-enable "no-console"*/',
				"console.log('test');", // here
			].join("\n");
			const config = { rules: { "no-alert": 1, "no-console": 1 } };

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 2);
			assert.strictEqual(messages[0].ruleId, "no-alert");
			assert.strictEqual(messages[0].line, 5);
			assert.strictEqual(messages[1].ruleId, "no-console");
			assert.strictEqual(messages[1].line, 8);

			assert.strictEqual(suppressedMessages.length, 3);
			assert.strictEqual(suppressedMessages[0].ruleId, "no-alert");
			assert.strictEqual(suppressedMessages[0].line, 2);
			assert.strictEqual(suppressedMessages[1].ruleId, "no-console");
			assert.strictEqual(suppressedMessages[1].line, 3);
			assert.strictEqual(suppressedMessages[2].ruleId, "no-console");
			assert.strictEqual(suppressedMessages[2].line, 6);
		});
	});

	describe("when evaluating code with comments to enable and disable multiple comma separated rules", () => {
		const code =
			"/*eslint no-alert:1, no-console:0*/ alert('test'); console.log('test');";

		it("should report a violation", () => {
			const config = { rules: { "no-console": 1, "no-alert": 0 } };

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(messages[0].ruleId, "no-alert");
			assert.strictEqual(messages[0].message, "Unexpected alert.");
			include(messages[0].nodeType, "CallExpression");

			assert.strictEqual(suppressedMessages.length, 0);
		});
	});

	describe("when evaluating code with comments to enable configurable rule", () => {
		const code = "/*eslint quotes:[2, \"double\"]*/ alert('test');";

		it("should report a violation", () => {
			const config = { rules: { quotes: [2, "single"] } };

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(messages[0].ruleId, "quotes");
			assert.strictEqual(
				messages[0].message,
				"Strings must use doublequote.",
			);
			include(messages[0].nodeType, "Literal");

			assert.strictEqual(suppressedMessages.length, 0);
		});
	});

	describe("when evaluating code with comments to enable configurable rule using string severity", () => {
		const code = '/*eslint quotes:["error", "double"]*/ alert(\'test\');';

		it("should report a violation", () => {
			const config = { rules: { quotes: [2, "single"] } };

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(messages[0].ruleId, "quotes");
			assert.strictEqual(
				messages[0].message,
				"Strings must use doublequote.",
			);
			include(messages[0].nodeType, "Literal");

			assert.strictEqual(suppressedMessages.length, 0);
		});
	});

	describe("when evaluating code with incorrectly formatted comments to disable rule", () => {
		it("should report a violation", () => {
			const code = "/*eslint no-alert:'1'*/ alert('test');";

			const config = { rules: { "no-alert": 1 } };

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 2);

			/*
			 * Incorrectly formatted comment threw error;
			 * message from caught exception
			 * may differ amongst UAs, so verifying
			 * first part only as defined in the
			 * parseJsonConfig function in lib/eslint.js
			 */
			match(
				messages[0].message,
				/^Failed to parse JSON from '"no-alert":'1'':/u,
			);
			assert.strictEqual(messages[0].line, 1);
			assert.strictEqual(messages[0].column, 1);
			assert.strictEqual(messages[0].endLine, 1);
			assert.strictEqual(messages[0].endColumn, 24);
			assert.strictEqual(messages[0].ruleId, null);
			assert.strictEqual(messages[0].fatal, true);
			assert.strictEqual(messages[0].severity, 2);
			assert.strictEqual(messages[0].nodeType, null);

			assert.strictEqual(messages[1].ruleId, "no-alert");
			assert.strictEqual(messages[1].message, "Unexpected alert.");
			include(messages[1].nodeType, "CallExpression");

			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should report a violation", () => {
			const code = "/*eslint no-alert:abc*/ alert('test');";

			const config = { rules: { "no-alert": 1 } };

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 2);

			/*
			 * Incorrectly formatted comment threw error;
			 * message from caught exception
			 * may differ amongst UAs, so verifying
			 * first part only as defined in the
			 * parseJsonConfig function in lib/eslint.js
			 */
			match(
				messages[0].message,
				/^Failed to parse JSON from '"no-alert":abc':/u,
			);
			assert.strictEqual(messages[0].line, 1);
			assert.strictEqual(messages[0].column, 1);
			assert.strictEqual(messages[0].endLine, 1);
			assert.strictEqual(messages[0].endColumn, 24);
			assert.strictEqual(messages[0].ruleId, null);
			assert.strictEqual(messages[0].fatal, true);
			assert.strictEqual(messages[0].severity, 2);
			assert.strictEqual(messages[0].nodeType, null);

			assert.strictEqual(messages[1].ruleId, "no-alert");
			assert.strictEqual(messages[1].message, "Unexpected alert.");
			include(messages[1].nodeType, "CallExpression");

			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should report a violation", () => {
			const code = "\n\n\n    /*eslint no-alert:0 2*/ alert('test');";

			const config = { rules: { "no-alert": 1 } };

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 2);

			/*
			 * Incorrectly formatted comment threw error;
			 * message from caught exception
			 * may differ amongst UAs, so verifying
			 * first part only as defined in the
			 * parseJsonConfig function in lib/eslint.js
			 */
			match(
				messages[0].message,
				/^Failed to parse JSON from '"no-alert":0 2':/u,
			);
			assert.strictEqual(messages[0].line, 4);
			assert.strictEqual(messages[0].column, 5);
			assert.strictEqual(messages[0].endLine, 4);
			assert.strictEqual(messages[0].endColumn, 28);
			assert.strictEqual(messages[0].ruleId, null);
			assert.strictEqual(messages[0].fatal, true);
			assert.strictEqual(messages[0].severity, 2);
			assert.strictEqual(messages[0].nodeType, null);

			assert.strictEqual(messages[1].ruleId, "no-alert");
			assert.strictEqual(messages[1].message, "Unexpected alert.");
			include(messages[1].nodeType, "CallExpression");

			assert.strictEqual(suppressedMessages.length, 0);
		});
	});

	describe("when evaluating code with comments which have colon in its value", () => {
		const code = String.raw`
/* eslint max-len: [2, 100, 2, {ignoreUrls: true, ignorePattern: "data:image\\/|\\s*require\\s*\\(|^\\s*loader\\.lazy|-\\*-"}] */
alert('test');
`;

		it("should not parse errors, should report a violation", () => {
			const messages = linter.verify(code, {}, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(messages[0].ruleId, "max-len");
			assert.strictEqual(
				messages[0].message,
				"This line has a length of 129. Maximum allowed is 100.",
			);
			include(messages[0].nodeType, "Program");

			assert.strictEqual(suppressedMessages.length, 0);
		});
	});

	describe("when evaluating code with comments that contain escape sequences", () => {
		const code = String.raw`
/* eslint max-len: ["error", 1, { ignoreComments: true, ignorePattern: "console\\.log\\(" }] */
console.log("test");
consolexlog("test2");
var a = "test2";
`;

		it("should validate correctly", () => {
			const config = { rules: {} };
			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();
			const [message1, message2] = messages;

			assert.strictEqual(messages.length, 2);
			assert.strictEqual(message1.ruleId, "max-len");
			assert.strictEqual(
				message1.message,
				"This line has a length of 21. Maximum allowed is 1.",
			);
			assert.strictEqual(message1.line, 4);
			assert.strictEqual(message1.column, 1);
			include(message1.nodeType, "Program");
			assert.strictEqual(message2.ruleId, "max-len");
			assert.strictEqual(
				message2.message,
				"This line has a length of 16. Maximum allowed is 1.",
			);
			assert.strictEqual(message2.line, 5);
			assert.strictEqual(message2.column, 1);
			include(message2.nodeType, "Program");

			assert.strictEqual(suppressedMessages.length, 0);
		});
	});

	describe("when evaluating a file with a hashbang", () => {
		it("should preserve line numbers", () => {
			const code = "#!bin/program\n\nvar foo;;";
			const config = { rules: { "no-extra-semi": 1 } };
			const messages = linter.verify(code, config);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(messages[0].ruleId, "no-extra-semi");
			assert.strictEqual(messages[0].nodeType, "EmptyStatement");
			assert.strictEqual(messages[0].line, 3);

			assert.strictEqual(suppressedMessages.length, 0);
		});
	});

	describe("when evaluating broken code", () => {
		const code = BROKEN_TEST_CODE;

		it("should report a violation with a useful parse error prefix", () => {
			const messages = linter.verify(code);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(messages[0].severity, 2);
			isNull(messages[0].ruleId);
			assert.strictEqual(messages[0].line, 1);
			assert.strictEqual(messages[0].column, 4);
			assert.ok(messages[0].fatal);
			match(messages[0].message, /^Parsing error:/u);

			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should report source code where the issue is present", () => {
			const inValidCode = ["var x = 20;", "if (x ==4 {", "    x++;", "}"];
			const messages = linter.verify(inValidCode.join("\n"));
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(messages[0].severity, 2);
			assert.ok(messages[0].fatal);
			match(messages[0].message, /^Parsing error:/u);

			assert.strictEqual(suppressedMessages.length, 0);
		});
	});

	describe("when using an invalid (undefined) rule", () => {
		const code = TEST_CODE;
		let results,
			result,
			warningResult,
			arrayOptionResults,
			objectOptionResults,
			resultsMultiple;

		beforeEach(() => {
			results = linter.verify(code, { rules: { foobar: 2 } });
			result = results[0];
			warningResult = linter.verify(code, { rules: { foobar: 1 } })[0];
			arrayOptionResults = linter.verify(code, {
				rules: { foobar: [2, "always"] },
			});
			objectOptionResults = linter.verify(code, {
				rules: { foobar: [1, { bar: false }] },
			});
			resultsMultiple = linter.verify(code, {
				rules: { foobar: 2, barfoo: 1 },
			});
		});

		it("should report a problem", () => {
			isNotNull(result);
			isArray(results);
			isObject(result);
			property(result, "ruleId");
			assert.strictEqual(result.ruleId, "foobar");
		});

		it("should report that the rule does not exist", () => {
			property(result, "message");
			assert.strictEqual(
				result.message,
				"Definition for rule 'foobar' was not found.",
			);
		});

		it("should report at the correct severity", () => {
			property(result, "severity");
			assert.strictEqual(result.severity, 2);
			assert.strictEqual(warningResult.severity, 2); // this is 2, since the rulename is very likely to be wrong
		});

		it("should accept any valid rule configuration", () => {
			isObject(arrayOptionResults[0]);
			isObject(objectOptionResults[0]);
		});

		it("should report multiple missing rules", () => {
			isArray(resultsMultiple);

			assert.deepStrictEqual(resultsMultiple[1], {
				ruleId: "barfoo",
				message: "Definition for rule 'barfoo' was not found.",
				line: 1,
				column: 1,
				endLine: 1,
				endColumn: 2,
				severity: 2,
				nodeType: null,
			});
		});
	});

	describe("when using a rule which has been replaced", () => {
		const code = TEST_CODE;

		it("should report the new rule", () => {
			const results = linter.verify(code, {
				rules: { "no-comma-dangle": 2 },
			});
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(results[0].ruleId, "no-comma-dangle");
			assert.strictEqual(
				results[0].message,
				"Rule 'no-comma-dangle' was removed and replaced by: comma-dangle",
			);

			assert.strictEqual(suppressedMessages.length, 0);
		});
	});

	describe("when calling getRules", () => {
		it("should return all loaded rules", () => {
			const rules = linter.getRules();

			assert.ok(rules.size > 230);
			isObject(rules.get("no-alert"));
		});
	});

	describe("when calling version", () => {
		it("should return current version number", () => {
			const version = linter.version;

			assert.ok(typeof version === 'string');
			assert.ok(parseInt(version[0], 10) >= 3);
		});
	});

	describe("when evaluating an empty string", () => {
		it("runs rules", () => {
			linter.defineRule("no-programs", {
				create: context => ({
					Program(node) {
						context.report({
							node,
							message: "No programs allowed.",
						});
					},
				}),
			});

			assert.strictEqual(
				linter.verify("", { rules: { "no-programs": "error" } }).length,
				1,
			);
		});
	});

	describe("when evaluating code without comments to environment", () => {
		it("should report a violation when using typed array", () => {
			const code = "var array = new Uint8Array();";

			const config = { rules: { "no-undef": 1 } };

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should report a violation when using Promise", () => {
			const code = "new Promise();";

			const config = { rules: { "no-undef": 1 } };

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(suppressedMessages.length, 0);
		});
	});

	describe("when evaluating code with comments to environment", () => {
		it("should not support legacy config", () => {
			const code = "/*jshint mocha:true */ describe();";

			const config = { rules: { "no-undef": 1 } };

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(messages[0].ruleId, "no-undef");
			assert.strictEqual(messages[0].nodeType, "Identifier");
			assert.strictEqual(messages[0].line, 1);

			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should not report a violation", () => {
			const code = "/*eslint-env es6 */ new Promise();";

			const config = { rules: { "no-undef": 1 } };

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 0);
		});

		// https://github.com/eslint/eslint/issues/14652
		it("should not report a violation", () => {
			const codes = [
				"/*eslint-env es6\n */ new Promise();",
				"/*eslint-env browser,\nes6 */ window;Promise;",
				"/*eslint-env\nbrowser,es6 */ window;Promise;",
			];
			const config = { rules: { "no-undef": 1 } };

			for (const code of codes) {
				const messages = linter.verify(code, config, filename);
				const suppressedMessages = linter.getSuppressedMessages();

				assert.strictEqual(messages.length, 0);
				assert.strictEqual(suppressedMessages.length, 0);
			}
		});

		it("should not report a violation", () => {
			const code = `/*${ESLINT_ENV} mocha,node */ require();describe();`;

			const config = { rules: { "no-undef": 1 } };

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should not report a violation", () => {
			const code = "/*eslint-env mocha */ suite();test();";

			const config = { rules: { "no-undef": 1 } };

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should not report a violation", () => {
			const code = `/*${ESLINT_ENV} amd */ define();require();`;

			const config = { rules: { "no-undef": 1 } };

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should not report a violation", () => {
			const code = `/*${ESLINT_ENV} jasmine */ expect();spyOn();`;

			const config = { rules: { "no-undef": 1 } };

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should not report a violation", () => {
			const code = `/*globals require: true */ /*${ESLINT_ENV} node */ require = 1;`;

			const config = { rules: { "no-undef": 1 } };

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should not report a violation", () => {
			const code = `/*${ESLINT_ENV} node */ process.exit();`;

			const config = { rules: {} };

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should not report a violation", () => {
			const code = `/*eslint no-process-exit: 0 */ /*${ESLINT_ENV} node */ process.exit();`;

			const config = { rules: { "no-undef": 1 } };

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 0);
		});
	});

	describe("when evaluating code with comments to change config when allowInlineConfig is enabled", () => {
		it("should report a violation for disabling rules", () => {
			const code = [
				"alert('test'); // eslint-disable-line no-alert",
			].join("\n");
			const config = {
				rules: {
					"no-alert": 1,
				},
			};

			const messages = linter.verify(code, config, {
				filename,
				allowInlineConfig: false,
			});
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(messages[0].ruleId, "no-alert");

			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should report a violation for global variable declarations", () => {
			const code = ["/* global foo */"].join("\n");
			const config = {
				rules: {
					test: 2,
				},
			};
			let ok = false;

			linter.defineRules({
				test: {
					create: context => ({
						Program(node) {
							const scope = context.sourceCode.getScope(node);
							const sourceCode = context.sourceCode;
							const comments = sourceCode.getAllComments();

							assert.strictEqual(
								context.getSourceCode(),
								sourceCode,
							);
							assert.strictEqual(1, comments.length);

							const foo = getVariable(scope, "foo");

							assert.ok(!foo);

							ok = true;
						},
					}),
				},
			});

			linter.verify(code, config, { allowInlineConfig: false });
			assert(ok);
		});

		it("should report a violation for eslint-disable", () => {
			const code = ["/* eslint-disable */", "alert('test');"].join("\n");
			const config = {
				rules: {
					"no-alert": 1,
				},
			};

			const messages = linter.verify(code, config, {
				filename,
				allowInlineConfig: false,
			});
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(messages[0].ruleId, "no-alert");

			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should not report a violation for rule changes", () => {
			const code = ["/*eslint no-alert:2*/", "alert('test');"].join("\n");
			const config = {
				rules: {
					"no-alert": 0,
				},
			};

			const messages = linter.verify(code, config, {
				filename,
				allowInlineConfig: false,
			});
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should report a violation for disable-line", () => {
			const code = ["alert('test'); // eslint-disable-line"].join("\n");
			const config = {
				rules: {
					"no-alert": 2,
				},
			};

			const messages = linter.verify(code, config, {
				filename,
				allowInlineConfig: false,
			});
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(messages[0].ruleId, "no-alert");

			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should report a violation for env changes", () => {
			const code = [`/*${ESLINT_ENV} browser*/ window`].join("\n");
			const config = {
				rules: {
					"no-undef": 2,
				},
			};
			const messages = linter.verify(code, config, {
				allowInlineConfig: false,
			});
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(messages[0].ruleId, "no-undef");

			assert.strictEqual(suppressedMessages.length, 0);
		});
	});

	describe("when evaluating code with 'noInlineComment'", () => {
		for (const directive of [
			"globals foo",
			"global foo",
			"exported foo",
			"eslint eqeqeq: error",
			"eslint-disable eqeqeq",
			"eslint-disable-line eqeqeq",
			"eslint-disable-next-line eqeqeq",
			"eslint-enable eqeqeq",
			"eslint-env es6",
		]) {
			// eslint-disable-next-line no-loop-func -- No closures
			it(`should warn '/* ${directive} */' if 'noInlineConfig' was given.`, () => {
				const messages = linter.verify(`/* ${directive} */`, {
					noInlineConfig: true,
				});
				const suppressedMessages = linter.getSuppressedMessages();

				assert.deepStrictEqual(messages.length, 1);
				assert.deepStrictEqual(messages[0].fatal, void 0);
				assert.deepStrictEqual(messages[0].ruleId, null);
				assert.deepStrictEqual(messages[0].severity, 1);
				assert.deepStrictEqual(
					messages[0].message,
					`'/*${directive.split(" ")[0]}*/' has no effect because you have 'noInlineConfig' setting in your config.`,
				);

				assert.strictEqual(suppressedMessages.length, 0);
			});
		}

		for (const directive of [
			"eslint-disable-line eqeqeq",
			"eslint-disable-next-line eqeqeq",
		]) {
			// eslint-disable-next-line no-loop-func -- No closures
			it(`should warn '// ${directive}' if 'noInlineConfig' was given.`, () => {
				const messages = linter.verify(`// ${directive}`, {
					noInlineConfig: true,
				});
				const suppressedMessages = linter.getSuppressedMessages();

				assert.deepStrictEqual(messages.length, 1);
				assert.deepStrictEqual(messages[0].fatal, void 0);
				assert.deepStrictEqual(messages[0].ruleId, null);
				assert.deepStrictEqual(messages[0].severity, 1);
				assert.deepStrictEqual(
					messages[0].message,
					`'//${directive.split(" ")[0]}' has no effect because you have 'noInlineConfig' setting in your config.`,
				);

				assert.strictEqual(suppressedMessages.length, 0);
			});
		}

		it("should not warn if 'noInlineConfig' and '--no-inline-config' were given.", () => {
			const messages = linter.verify(
				"/* globals foo */",
				{ noInlineConfig: true },
				{ allowInlineConfig: false },
			);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.deepStrictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 0);
		});
	});

	describe("reportUnusedDisable option", () => {
		it("reports problems for unused eslint-disable comments", () => {
			const messages = linter.verify(
				"/* eslint-disable */",
				{},
				{ reportUnusedDisableDirectives: true },
			);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.deepStrictEqual(messages, [
				{
					ruleId: null,
					message:
						"Unused eslint-disable directive (no problems were reported).",
					line: 1,
					column: 1,
					fix: {
						range: [0, 20],
						text: " ",
					},
					severity: 2,
					nodeType: null,
				},
			]);

			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("reports problems for multiple eslint-disable comments, including unused ones", () => {
			const code = [
				"/* eslint-disable no-alert -- j1 */",
				'alert("test"); //eslint-disable-line no-alert -- j2',
			].join("\n");
			const config = {
				rules: {
					"no-alert": 2,
				},
			};
			const messages = linter.verify(code, config, {
				reportUnusedDisableDirectives: true,
			});
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(suppressedMessages.length, 1);
			assert.strictEqual(suppressedMessages[0].suppressions.length, 2);
		});

		it("reports problems for eslint-disable-line and eslint-disable-next-line comments, including unused ones", () => {
			const code = [
				"// eslint-disable-next-line no-alert -- j1 */",
				'alert("test"); //eslint-disable-line no-alert -- j2',
			].join("\n");
			const config = {
				rules: {
					"no-alert": 2,
				},
			};
			const messages = linter.verify(code, config, {
				reportUnusedDisableDirectives: true,
			});
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(suppressedMessages.length, 1);
			assert.strictEqual(suppressedMessages[0].suppressions.length, 2);
		});

		it("reports problems for multiple unused eslint-disable comments with multiple ruleIds", () => {
			const code = [
				"/* eslint no-undef: 2, no-void: 2 */",
				"/* eslint-disable no-undef -- j1 */",
				"void foo; //eslint-disable-line no-undef, no-void -- j2",
			].join("\n");
			const config = {
				rules: {
					"no-undef": 2,
					"no-void": 2,
				},
			};
			const messages = linter.verify(code, config, {
				reportUnusedDisableDirectives: true,
			});
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(suppressedMessages.length, 2);
			assert.strictEqual(suppressedMessages[0].ruleId, "no-void");
			assert.strictEqual(suppressedMessages[0].suppressions.length, 1);
			assert.strictEqual(suppressedMessages[1].ruleId, "no-undef");
			assert.strictEqual(suppressedMessages[1].suppressions.length, 2);
		});

		it("reports problems for unused eslint-disable comments (error)", () => {
			const messages = linter.verify(
				"/* eslint-disable */",
				{},
				{ reportUnusedDisableDirectives: "error" },
			);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.deepStrictEqual(messages, [
				{
					ruleId: null,
					message:
						"Unused eslint-disable directive (no problems were reported).",
					line: 1,
					column: 1,
					fix: {
						range: [0, 20],
						text: " ",
					},
					severity: 2,
					nodeType: null,
				},
			]);

			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("reports problems for unused eslint-disable comments (warn)", () => {
			const messages = linter.verify(
				"/* eslint-disable */",
				{},
				{ reportUnusedDisableDirectives: "warn" },
			);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.deepStrictEqual(messages, [
				{
					ruleId: null,
					message:
						"Unused eslint-disable directive (no problems were reported).",
					line: 1,
					column: 1,
					fix: {
						range: [0, 20],
						text: " ",
					},
					severity: 1,
					nodeType: null,
				},
			]);

			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("reports problems for unused eslint-enable comments", () => {
			const messages = linter.verify(
				"/* eslint-enable */",
				{},
				{ reportUnusedDisableDirectives: true },
			);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.deepStrictEqual(messages, [
				{
					ruleId: null,
					message:
						"Unused eslint-enable directive (no matching eslint-disable directives were found).",
					line: 1,
					column: 1,
					fix: {
						range: [0, 19],
						text: " ",
					},
					severity: 2,
					nodeType: null,
				},
			]);

			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("reports problems for unused eslint-enable comments with ruleId", () => {
			const messages = linter.verify(
				"/* eslint-enable no-alert */",
				{},
				{ reportUnusedDisableDirectives: true },
			);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.deepStrictEqual(messages, [
				{
					ruleId: null,
					message:
						"Unused eslint-enable directive (no matching eslint-disable directives were found for 'no-alert').",
					line: 1,
					column: 1,
					fix: {
						range: [0, 28],
						text: " ",
					},
					severity: 2,
					nodeType: null,
				},
			]);

			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("reports problems for unused eslint-enable comments with mismatch ruleId", () => {
			const code = [
				"/* eslint-disable no-alert */",
				'alert("test");',
				"/* eslint-enable no-console */",
			].join("\n");
			const config = {
				rules: {
					"no-alert": 2,
				},
			};
			const messages = linter.verify(code, config, {
				reportUnusedDisableDirectives: true,
			});
			const suppressedMessages = linter.getSuppressedMessages();

			assert.deepStrictEqual(messages, [
				{
					ruleId: null,
					message:
						"Unused eslint-enable directive (no matching eslint-disable directives were found for 'no-console').",
					line: 3,
					column: 1,
					fix: {
						range: [45, 75],
						text: " ",
					},
					severity: 2,
					nodeType: null,
				},
			]);

			assert.strictEqual(suppressedMessages.length, 1);
		});

		it("reports problems for unused eslint-enable comments with used eslint-enable comments", () => {
			const code = [
				"/* eslint-disable no-alert -- j1 */",
				'alert("test");',
				"/* eslint-disable no-alert -- j2 */",
				'alert("test");',
				"/* eslint-enable no-alert -- j3 */",
				"/* eslint-enable -- j4 */",
			].join("\n");
			const config = {
				rules: {
					"no-alert": 2,
				},
			};
			const messages = linter.verify(code, config, {
				reportUnusedDisableDirectives: true,
			});
			const suppressedMessages = linter.getSuppressedMessages();

			assert.deepStrictEqual(messages, [
				{
					ruleId: null,
					message:
						"Unused eslint-enable directive (no matching eslint-disable directives were found).",
					line: 6,
					column: 1,
					fix: {
						range: [137, 162],
						text: " ",
					},
					severity: 2,
					nodeType: null,
				},
			]);

			assert.strictEqual(suppressedMessages.length, 2);
			assert.strictEqual(suppressedMessages[0].suppressions.length, 1);
			assert.strictEqual(suppressedMessages[1].suppressions.length, 2);
		});

		it("reports problems for unused eslint-disable comments with used eslint-enable comments", () => {
			const code = [
				"/* eslint-disable no-alert -- j1 */",
				'console.log("test"); //',
				"/* eslint-enable no-alert -- j2 */",
			].join("\n");
			const config = {
				rules: {
					"no-alert": 2,
				},
			};
			const messages = linter.verify(code, config, {
				reportUnusedDisableDirectives: true,
			});
			const suppressedMessages = linter.getSuppressedMessages();

			assert.deepStrictEqual(messages, [
				{
					ruleId: null,
					message:
						"Unused eslint-disable directive (no problems were reported from 'no-alert').",
					line: 1,
					column: 1,
					fix: {
						range: [0, 35],
						text: " ",
					},
					severity: 2,
					nodeType: null,
				},
			]);

			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("reports problems for unused eslint-disable comments (in config)", () => {
			const messages = linter.verify("/* eslint-disable */", {
				reportUnusedDisableDirectives: true,
			});
			const suppressedMessages = linter.getSuppressedMessages();

			assert.deepStrictEqual(messages, [
				{
					ruleId: null,
					message:
						"Unused eslint-disable directive (no problems were reported).",
					line: 1,
					column: 1,
					fix: {
						range: [0, 20],
						text: " ",
					},
					severity: 1,
					nodeType: null,
				},
			]);

			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("reports problems for partially unused eslint-disable comments (in config)", () => {
			const code =
				"alert('test'); // eslint-disable-line no-alert, no-redeclare";
			const config = {
				reportUnusedDisableDirectives: true,
				rules: {
					"no-alert": 1,
					"no-redeclare": 1,
				},
			};

			const messages = linter.verify(code, config, {
				filename,
				allowInlineConfig: true,
			});
			const suppressedMessages = linter.getSuppressedMessages();

			assert.deepStrictEqual(messages, [
				{
					ruleId: null,
					message:
						"Unused eslint-disable directive (no problems were reported from 'no-redeclare').",
					line: 1,
					column: 16,
					fix: {
						range: [46, 60],
						text: "",
					},
					severity: 1,
					nodeType: null,
				},
			]);

			assert.strictEqual(suppressedMessages.length, 1);
			assert.strictEqual(suppressedMessages[0].ruleId, "no-alert");
		});

		it("reports no problems for no-fallthrough despite comment pattern match", () => {
			const code =
				"switch (foo) { case 0: a(); \n// eslint-disable-next-line no-fallthrough\n case 1: }";
			const config = {
				reportUnusedDisableDirectives: true,
				rules: {
					"no-fallthrough": 2,
				},
			};

			const messages = linter.verify(code, config, {
				filename,
				allowInlineConfig: true,
			});
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);

			assert.strictEqual(suppressedMessages.length, 1);
			assert.strictEqual(suppressedMessages[0].ruleId, "no-fallthrough");
		});

		it("reports problems for multiple eslint-enable comments with same ruleId", () => {
			const code = [
				"/* eslint-disable no-alert -- j1 */",
				'alert("test"); //',
				"/* eslint-enable no-alert -- j2 */",
				"/* eslint-enable no-alert -- j3 */",
			].join("\n");
			const config = {
				rules: {
					"no-alert": 2,
				},
			};
			const messages = linter.verify(code, config, {
				reportUnusedDisableDirectives: true,
			});
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(messages[0].line, 4);
			assert.strictEqual(suppressedMessages.length, 1);
			assert.strictEqual(suppressedMessages[0].suppressions.length, 1);
		});

		it("reports problems for multiple eslint-enable comments without ruleId (Rule is already enabled)", () => {
			const code = [
				"/* eslint-disable no-alert -- j1 */",
				'alert("test"); //',
				"/* eslint-enable no-alert -- j2 */",
				"/* eslint-enable -- j3 */",
			].join("\n");
			const config = {
				rules: {
					"no-alert": 2,
				},
			};
			const messages = linter.verify(code, config, {
				reportUnusedDisableDirectives: true,
			});
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(messages[0].line, 4);
			assert.strictEqual(suppressedMessages.length, 1);
			assert.strictEqual(suppressedMessages[0].suppressions.length, 1);
		});

		it("reports problems for multiple eslint-enable comments with ruleId (Rule is already enabled by eslint-enable comments without ruleId)", () => {
			const code = [
				"/* eslint-disable no-alert -- j1 */",
				'alert("test"); //',
				"/* eslint-enable -- j3 */",
				"/* eslint-enable no-alert -- j2 */",
			].join("\n");
			const config = {
				rules: {
					"no-alert": 2,
				},
			};
			const messages = linter.verify(code, config, {
				reportUnusedDisableDirectives: true,
			});
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(messages[0].line, 4);
			assert.strictEqual(suppressedMessages.length, 1);
			assert.strictEqual(suppressedMessages[0].suppressions.length, 1);
		});

		it("reports problems for eslint-enable comments without ruleId (Two rules are already enabled)", () => {
			const code = [
				"/* eslint-disable no-alert, no-console -- j1 */",
				'alert("test"); //',
				'console.log("test"); //',
				"/* eslint-enable no-alert -- j2 */",
				"/* eslint-enable no-console -- j3 */",
				"/* eslint-enable -- j4 */",
			].join("\n");
			const config = {
				rules: {
					"no-alert": 2,
					"no-console": 2,
				},
			};
			const messages = linter.verify(code, config, {
				reportUnusedDisableDirectives: true,
			});
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(messages[0].line, 6);
			assert.strictEqual(suppressedMessages.length, 2);
			assert.strictEqual(suppressedMessages[0].suppressions.length, 1);
			assert.strictEqual(suppressedMessages[1].suppressions.length, 1);
		});

		it("reports problems for multiple eslint-enable comments with ruleId (Two rules are already enabled by eslint-enable comments without ruleId)", () => {
			const code = [
				"/* eslint-disable no-alert, no-console -- j1 */",
				'alert("test"); //',
				'console.log("test"); //',
				"/* eslint-enable -- j2 */",
				"/* eslint-enable no-console -- j3 */",
				"/* eslint-enable no-alert -- j4 */",
			].join("\n");
			const config = {
				rules: {
					"no-alert": 2,
					"no-console": 2,
				},
			};
			const messages = linter.verify(code, config, {
				reportUnusedDisableDirectives: true,
			});
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 2);
			assert.strictEqual(messages[0].line, 5);
			assert.strictEqual(messages[1].line, 6);
			assert.strictEqual(suppressedMessages.length, 2);
			assert.strictEqual(suppressedMessages[0].suppressions.length, 1);
			assert.strictEqual(suppressedMessages[1].suppressions.length, 1);
		});

		it("reports problems for multiple eslint-enable comments", () => {
			const code = [
				"/* eslint-disable no-alert, no-console -- j1 */",
				'alert("test"); //',
				'console.log("test"); //',
				"/* eslint-enable no-console -- j2 */",
				"/* eslint-enable -- j3 */",
				"/* eslint-enable no-alert -- j4 */",
				"/* eslint-enable -- j5 */",
			].join("\n");
			const config = {
				rules: {
					"no-alert": 2,
					"no-console": 2,
				},
			};
			const messages = linter.verify(code, config, {
				reportUnusedDisableDirectives: true,
			});
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 2);
			assert.strictEqual(messages[0].line, 6);
			assert.strictEqual(messages[1].line, 7);
			assert.strictEqual(suppressedMessages.length, 2);
			assert.strictEqual(suppressedMessages[0].suppressions.length, 1);
			assert.strictEqual(suppressedMessages[1].suppressions.length, 1);
		});

		describe("autofix", () => {
			const alwaysReportsRule = {
				create(context) {
					return {
						Program(node) {
							context.report({
								message: "bad code",
								loc: node.loc.end,
							});
						},
						"Identifier[name=bad]"(node) {
							context.report({
								message: "bad id",
								loc: node.loc,
							});
						},
					};
				},
			};

			const neverReportsRule = {
				create() {
					return {};
				},
			};

			const ruleCount = 3;
			const usedRules = Array.from(
				{ length: ruleCount },
				(_, index) => `used${index ? `-${index}` : ""}`, // "used", "used-1", "used-2"
			);
			const unusedRules = usedRules.map(name => `un${name}`); // "unused", "unused-1", "unused-2"

			const config = {
				reportUnusedDisableDirectives: true,
				rules: {
					...Object.fromEntries(
						usedRules.map(name => [name, "error"]),
					),
					...Object.fromEntries(
						unusedRules.map(name => [name, "error"]),
					),
				},
			};

			beforeEach(() => {
				linter.defineRules(
					Object.fromEntries(
						usedRules.map(name => [name, alwaysReportsRule]),
					),
				);
				linter.defineRules(
					Object.fromEntries(
						unusedRules.map(name => [name, neverReportsRule]),
					),
				);
			});

			const tests = [
				//-----------------------------------------------
				// Removing the entire comment
				//-----------------------------------------------

				{
					code: "// eslint-disable-line unused",
					output: " ",
				},
				{
					code: "foo// eslint-disable-line unused",
					output: "foo ",
				},
				{
					code: "// eslint-disable-line ,unused,",
					output: " ",
				},
				{
					code: "// eslint-disable-line unused-1, unused-2",
					output: " ",
				},
				{
					code: "// eslint-disable-line ,unused-1,, unused-2,, -- comment",
					output: " ",
				},
				{
					code: "// eslint-disable-next-line unused\n",
					output: " \n",
				},
				{
					code: "// eslint-disable-next-line unused\nfoo",
					output: " \nfoo",
				},
				{
					code: "/* eslint-disable \nunused\n*/",
					output: " ",
				},
				{
					code: "/* eslint-enable \nunused\n*/",
					output: " ",
				},

				//-----------------------------------------------
				// Removing only individual rules
				//-----------------------------------------------

				// content before the first rule should not be changed
				{
					code: "//eslint-disable-line unused, used",
					output: "//eslint-disable-line used",
				},
				{
					code: "// eslint-disable-line unused, used",
					output: "// eslint-disable-line used",
				},
				{
					code: "//  eslint-disable-line unused, used",
					output: "//  eslint-disable-line used",
				},
				{
					code: "/*\neslint-disable unused, used*/",
					output: "/*\neslint-disable used*/",
				},
				{
					code: "/*\n eslint-disable unused, used*/",
					output: "/*\n eslint-disable used*/",
				},
				{
					code: "/*\r\neslint-disable unused, used*/",
					output: "/*\r\neslint-disable used*/",
				},
				{
					code: "/*\u2028eslint-disable unused, used*/",
					output: "/*\u2028eslint-disable used*/",
				},
				{
					code: "/*\u00A0eslint-disable unused, used*/",
					output: "/*\u00A0eslint-disable used*/",
				},
				{
					code: "/* eslint-disable used*/ bad /*\neslint-enable unused, used*/",
					output: "/* eslint-disable used*/ bad /*\neslint-enable used*/",
				},
				{
					code: "/* eslint-disable used*/ bad /*\n eslint-enable unused, used*/",
					output: "/* eslint-disable used*/ bad /*\n eslint-enable used*/",
				},
				{
					code: "/* eslint-disable used*/ bad /*\r\neslint-enable unused, used*/",
					output: "/* eslint-disable used*/ bad /*\r\neslint-enable used*/",
				},
				{
					code: "/* eslint-disable used*/ bad /*\u2028eslint-enable unused, used*/",
					output: "/* eslint-disable used*/ bad /*\u2028eslint-enable used*/",
				},
				{
					code: "/* eslint-disable used*/ bad /*\u00A0eslint-enable unused, used*/",
					output: "/* eslint-disable used*/ bad /*\u00A0eslint-enable used*/",
				},
				{
					code: "// eslint-disable-line  unused, used",
					output: "// eslint-disable-line  used",
				},
				{
					code: "/* eslint-disable\nunused, used*/",
					output: "/* eslint-disable\nused*/",
				},
				{
					code: "/* eslint-disable\n unused, used*/",
					output: "/* eslint-disable\n used*/",
				},
				{
					code: "/* eslint-disable\r\nunused, used*/",
					output: "/* eslint-disable\r\nused*/",
				},
				{
					code: "/* eslint-disable\u2028unused, used*/",
					output: "/* eslint-disable\u2028used*/",
				},
				{
					code: "/* eslint-disable\u00A0unused, used*/",
					output: "/* eslint-disable\u00A0used*/",
				},
				{
					code: "/* eslint-disable used*/ bad /* eslint-enable\nunused, used*/",
					output: "/* eslint-disable used*/ bad /* eslint-enable\nused*/",
				},
				{
					code: "/* eslint-disable used*/ bad /* eslint-enable\n unused, used*/",
					output: "/* eslint-disable used*/ bad /* eslint-enable\n used*/",
				},
				{
					code: "/* eslint-disable used*/ bad /* eslint-enable\r\nunused, used*/",
					output: "/* eslint-disable used*/ bad /* eslint-enable\r\nused*/",
				},
				{
					code: "/* eslint-disable used*/ bad /* eslint-enable\u2028unused, used*/",
					output: "/* eslint-disable used*/ bad /* eslint-enable\u2028used*/",
				},
				{
					code: "/* eslint-disable used*/ bad /* eslint-enable\u00A0unused, used*/",
					output: "/* eslint-disable used*/ bad /* eslint-enable\u00A0used*/",
				},

				// when removing the first rule, the comma and all whitespace up to the next rule (or next lone comma) should also be removed
				{
					code: "// eslint-disable-line unused,used",
					output: "// eslint-disable-line used",
				},
				{
					code: "// eslint-disable-line unused, used",
					output: "// eslint-disable-line used",
				},
				{
					code: "// eslint-disable-line unused , used",
					output: "// eslint-disable-line used",
				},
				{
					code: "// eslint-disable-line unused,  used",
					output: "// eslint-disable-line used",
				},
				{
					code: "// eslint-disable-line unused  ,used",
					output: "// eslint-disable-line used",
				},
				{
					code: "/* eslint-disable unused\n,\nused */",
					output: "/* eslint-disable used */",
				},
				{
					code: "/* eslint-disable unused \n \n,\n\n used */",
					output: "/* eslint-disable used */",
				},
				{
					code: "/* eslint-disable unused\u2028,\u2028used */",
					output: "/* eslint-disable used */",
				},
				{
					code: "/* eslint-disable used*/ bad /* eslint-enable unused\n,\nused */",
					output: "/* eslint-disable used*/ bad /* eslint-enable used */",
				},
				{
					code: "/* eslint-disable used*/ bad /* eslint-enable unused \n \n,\n\n used */",
					output: "/* eslint-disable used*/ bad /* eslint-enable used */",
				},
				{
					code: "/* eslint-disable used*/ bad /* eslint-enable unused\u2028,\u2028used */",
					output: "/* eslint-disable used*/ bad /* eslint-enable used */",
				},
				{
					code: "// eslint-disable-line unused\u00A0,\u00A0used",
					output: "// eslint-disable-line used",
				},
				{
					code: "// eslint-disable-line unused,,used",
					output: "// eslint-disable-line ,used",
				},
				{
					code: "// eslint-disable-line unused, ,used",
					output: "// eslint-disable-line ,used",
				},
				{
					code: "// eslint-disable-line unused,, used",
					output: "// eslint-disable-line , used",
				},
				{
					code: "// eslint-disable-line unused,used ",
					output: "// eslint-disable-line used ",
				},
				{
					code: "// eslint-disable-next-line unused,used\n",
					output: "// eslint-disable-next-line used\n",
				},

				// when removing a rule in the middle, one comma and all whitespace between commas should also be removed
				{
					code: "// eslint-disable-line used-1,unused,used-2",
					output: "// eslint-disable-line used-1,used-2",
				},
				{
					code: "// eslint-disable-line used-1, unused,used-2",
					output: "// eslint-disable-line used-1,used-2",
				},
				{
					code: "// eslint-disable-line used-1,unused ,used-2",
					output: "// eslint-disable-line used-1,used-2",
				},
				{
					code: "// eslint-disable-line used-1,  unused  ,used-2",
					output: "// eslint-disable-line used-1,used-2",
				},
				{
					code: "/* eslint-disable used-1,\nunused\n,used-2 */",
					output: "/* eslint-disable used-1,used-2 */",
				},
				{
					code: "/* eslint-disable used-1,\n\n unused \n \n ,used-2 */",
					output: "/* eslint-disable used-1,used-2 */",
				},
				{
					code: "/* eslint-disable used-1,\u2028unused\u2028,used-2 */",
					output: "/* eslint-disable used-1,used-2 */",
				},
				{
					code: "/* eslint-disable used-1, used-2*/ bad /* eslint-enable used-1,\nunused\n,used-2 */",
					output: "/* eslint-disable used-1, used-2*/ bad /* eslint-enable used-1,used-2 */",
				},
				{
					code: "/* eslint-disable used-1, used-2*/ bad /* eslint-enable used-1,\n\n unused \n \n ,used-2 */",
					output: "/* eslint-disable used-1, used-2*/ bad /* eslint-enable used-1,used-2 */",
				},
				{
					code: "/* eslint-disable used-1, used-2*/ bad /* eslint-enable used-1,\u2028unused\u2028,used-2 */",
					output: "/* eslint-disable used-1, used-2*/ bad /* eslint-enable used-1,used-2 */",
				},
				{
					code: "// eslint-disable-line used-1,\u00A0unused\u00A0,used-2",
					output: "// eslint-disable-line used-1,used-2",
				},

				// when removing a rule in the middle, content around commas should not be changed
				{
					code: "// eslint-disable-line used-1, unused ,used-2",
					output: "// eslint-disable-line used-1,used-2",
				},
				{
					code: "// eslint-disable-line used-1,unused, used-2",
					output: "// eslint-disable-line used-1, used-2",
				},
				{
					code: "// eslint-disable-line used-1 ,unused,used-2",
					output: "// eslint-disable-line used-1 ,used-2",
				},
				{
					code: "// eslint-disable-line used-1 ,unused, used-2",
					output: "// eslint-disable-line used-1 , used-2",
				},
				{
					code: "// eslint-disable-line used-1  , unused ,  used-2",
					output: "// eslint-disable-line used-1  ,  used-2",
				},
				{
					code: "/* eslint-disable used-1\n,unused,\nused-2 */",
					output: "/* eslint-disable used-1\n,\nused-2 */",
				},
				{
					code: "/* eslint-disable used-1\u2028,unused,\u2028used-2 */",
					output: "/* eslint-disable used-1\u2028,\u2028used-2 */",
				},
				{
					code: "/* eslint-disable used-1, used-2 */ bad /* eslint-enable used-1\n,unused,\nused-2 */",
					output: "/* eslint-disable used-1, used-2 */ bad /* eslint-enable used-1\n,\nused-2 */",
				},
				{
					code: "/* eslint-disable used-1, used-2 */ bad /* eslint-enable used-1\u2028,unused,\u2028used-2 */",
					output: "/* eslint-disable used-1, used-2 */ bad /* eslint-enable used-1\u2028,\u2028used-2 */",
				},
				{
					code: "// eslint-disable-line used-1\u00A0,unused,\u00A0used-2",
					output: "// eslint-disable-line used-1\u00A0,\u00A0used-2",
				},
				{
					code: "// eslint-disable-line , unused ,used",
					output: "// eslint-disable-line ,used",
				},
				{
					code: "/* eslint-disable\n, unused ,used */",
					output: "/* eslint-disable\n,used */",
				},
				{
					code: "/* eslint-disable used-1,\n,unused,used-2 */",
					output: "/* eslint-disable used-1,\n,used-2 */",
				},
				{
					code: "/* eslint-disable used-1,unused,\n,used-2 */",
					output: "/* eslint-disable used-1,\n,used-2 */",
				},
				{
					code: "/* eslint-disable used-1,\n,unused,\n,used-2 */",
					output: "/* eslint-disable used-1,\n,\n,used-2 */",
				},
				{
					code: "/* eslint-disable used-1, used-2 */ bad /* eslint-enable used-1,\n,unused,used-2 */",
					output: "/* eslint-disable used-1, used-2 */ bad /* eslint-enable used-1,\n,used-2 */",
				},
				{
					code: "/* eslint-disable used-1, used-2 */ bad /* eslint-enable used-1,unused,\n,used-2 */",
					output: "/* eslint-disable used-1, used-2 */ bad /* eslint-enable used-1,\n,used-2 */",
				},
				{
					code: "/* eslint-disable used-1, used-2 */ bad /* eslint-enable used-1,\n,unused,\n,used-2 */",
					output: "/* eslint-disable used-1, used-2 */ bad /* eslint-enable used-1,\n,\n,used-2 */",
				},
				{
					code: "// eslint-disable-line used, unused,",
					output: "// eslint-disable-line used,",
				},
				{
					code: "// eslint-disable-next-line used, unused,\n",
					output: "// eslint-disable-next-line used,\n",
				},
				{
					code: "// eslint-disable-line used, unused, ",
					output: "// eslint-disable-line used, ",
				},
				{
					code: "// eslint-disable-line used, unused, -- comment",
					output: "// eslint-disable-line used, -- comment",
				},
				{
					code: "/* eslint-disable used, unused,\n*/",
					output: "/* eslint-disable used,\n*/",
				},
				{
					code: "/* eslint-disable used */ bad /* eslint-enable used, unused,\n*/",
					output: "/* eslint-disable used */ bad /* eslint-enable used,\n*/",
				},

				// when removing the last rule, the comma and all whitespace up to the previous rule (or previous lone comma) should also be removed
				{
					code: "// eslint-disable-line used,unused",
					output: "// eslint-disable-line used",
				},
				{
					code: "// eslint-disable-line used, unused",
					output: "// eslint-disable-line used",
				},
				{
					code: "// eslint-disable-line used ,unused",
					output: "// eslint-disable-line used",
				},
				{
					code: "// eslint-disable-line used , unused",
					output: "// eslint-disable-line used",
				},
				{
					code: "// eslint-disable-line used,  unused",
					output: "// eslint-disable-line used",
				},
				{
					code: "// eslint-disable-line used  ,unused",
					output: "// eslint-disable-line used",
				},
				{
					code: "/* eslint-disable used\n,\nunused */",
					output: "/* eslint-disable used */",
				},
				{
					code: "/* eslint-disable used \n \n,\n\n unused */",
					output: "/* eslint-disable used */",
				},
				{
					code: "/* eslint-disable used\u2028,\u2028unused */",
					output: "/* eslint-disable used */",
				},
				{
					code: "/* eslint-disable used*/ bad /* eslint-enable used\n,\nunused */",
					output: "/* eslint-disable used*/ bad /* eslint-enable used */",
				},
				{
					code: "/* eslint-disable used*/ bad /* eslint-enable used \n \n,\n\n unused */",
					output: "/* eslint-disable used*/ bad /* eslint-enable used */",
				},
				{
					code: "/* eslint-disable used*/ bad /* eslint-enable used\u2028,\u2028unused */",
					output: "/* eslint-disable used*/ bad /* eslint-enable used */",
				},
				{
					code: "// eslint-disable-line used\u00A0,\u00A0unused",
					output: "// eslint-disable-line used",
				},
				{
					code: "// eslint-disable-line used,,unused",
					output: "// eslint-disable-line used,",
				},
				{
					code: "// eslint-disable-line used, ,unused",
					output: "// eslint-disable-line used,",
				},
				{
					code: "/* eslint-disable used,\n,unused */",
					output: "/* eslint-disable used, */",
				},
				{
					code: "/* eslint-disable used\n, ,unused */",
					output: "/* eslint-disable used\n, */",
				},
				{
					code: "/* eslint-disable used*/ bad /* eslint-enable used,\n,unused */",
					output: "/* eslint-disable used*/ bad /* eslint-enable used, */",
				},
				{
					code: "/* eslint-disable used*/ bad /* eslint-enable used\n, ,unused */",
					output: "/* eslint-disable used*/ bad /* eslint-enable used\n, */",
				},

				// content after the last rule should not be changed
				{
					code: "// eslint-disable-line used,unused",
					output: "// eslint-disable-line used",
				},
				{
					code: "// eslint-disable-line used,unused ",
					output: "// eslint-disable-line used ",
				},
				{
					code: "// eslint-disable-line used,unused  ",
					output: "// eslint-disable-line used  ",
				},
				{
					code: "// eslint-disable-line used,unused -- comment",
					output: "// eslint-disable-line used -- comment",
				},
				{
					code: "// eslint-disable-next-line used,unused\n",
					output: "// eslint-disable-next-line used\n",
				},
				{
					code: "// eslint-disable-next-line used,unused \n",
					output: "// eslint-disable-next-line used \n",
				},
				{
					code: "/* eslint-disable used,unused\u2028*/",
					output: "/* eslint-disable used\u2028*/",
				},
				{
					code: "/* eslint-disable used*/ bad /* eslint-enable used,unused\u2028*/",
					output: "/* eslint-disable used*/ bad /* eslint-enable used\u2028*/",
				},
				{
					code: "// eslint-disable-line used,unused\u00A0",
					output: "// eslint-disable-line used\u00A0",
				},

				// multiply rules to remove
				{
					code: "// eslint-disable-line used, unused-1, unused-2",
					output: "// eslint-disable-line used",
				},
				{
					code: "// eslint-disable-line unused-1, used, unused-2",
					output: "// eslint-disable-line used",
				},
				{
					code: "// eslint-disable-line unused-1, unused-2, used",
					output: "// eslint-disable-line used",
				},
				{
					code: "// eslint-disable-line used-1, unused-1, used-2, unused-2",
					output: "// eslint-disable-line used-1, used-2",
				},
				{
					code: "// eslint-disable-line unused-1, used-1, unused-2, used-2",
					output: "// eslint-disable-line used-1, used-2",
				},
				{
					code: `
                        /* eslint-disable unused-1,
                           used-1,
                           unused-2,
                           used-2
                        */
                    `,
					output: `
                        /* eslint-disable used-1,
                           used-2
                        */
                    `,
				},
				{
					code: `
                        /* eslint-disable
                               unused-1,
                               used-1,
                               unused-2,
                               used-2
                        */
                    `,
					output: `
                        /* eslint-disable
                               used-1,
                               used-2
                        */
                    `,
				},
				{
					code: `
                        /* eslint-disable
                               used-1,
                               unused-1,
                               used-2,
                               unused-2
                        */
                    `,
					output: `
                        /* eslint-disable
                               used-1,
                               used-2
                        */
                    `,
				},
				{
					code: `
                        /* eslint-disable
                               used-1,
                               unused-1,
                               used-2,
                               unused-2,
                        */
                    `,
					output: `
                        /* eslint-disable
                               used-1,
                               used-2,
                        */
                    `,
				},
				{
					code: `
                        /* eslint-disable
                               ,unused-1
                               ,used-1
                               ,unused-2
                               ,used-2
                        */
                    `,
					output: `
                        /* eslint-disable
                               ,used-1
                               ,used-2
                        */
                    `,
				},
				{
					code: `
                        /* eslint-disable
                               ,used-1
                               ,unused-1
                               ,used-2
                               ,unused-2
                        */
                    `,
					output: `
                        /* eslint-disable
                               ,used-1
                               ,used-2
                        */
                    `,
				},
				{
					code: `
                        /* eslint-disable
                               used-1,
                               unused-1,
                               used-2,
                               unused-2

                               -- comment
                        */
                    `,
					output: `
                        /* eslint-disable
                               used-1,
                               used-2

                               -- comment
                        */
                    `,
				},
				{
					code: `
                        /* eslint-disable used-1, used-2*/
                        bad
                        /* eslint-enable unused-1,
                           used-1,
                           unused-2,
                           used-2
                        */
                    `,
					output: `
                        /* eslint-disable used-1, used-2*/
                        bad
                        /* eslint-enable used-1,
                           used-2
                        */
                    `,
				},
				{
					code: `
                        /* eslint-disable used-1, used-2*/
                        bad
                        /* eslint-enable unused-1,
                           used-1,
                           unused-2,
                           used-2
                        */
                    `,
					output: `
                        /* eslint-disable used-1, used-2*/
                        bad
                        /* eslint-enable used-1,
                           used-2
                        */
                    `,
				},
				{
					code: `
                        /* eslint-disable used-1, used-2*/
                        bad
                        /* eslint-enable
                               unused-1,
                               used-1,
                               unused-2,
                               used-2
                        */
                    `,
					output: `
                        /* eslint-disable used-1, used-2*/
                        bad
                        /* eslint-enable
                               used-1,
                               used-2
                        */
                    `,
				},
				{
					code: `
                        /* eslint-disable used-1, used-2*/
                        bad
                        /* eslint-enable
                               used-1,
                               unused-1,
                               used-2,
                               unused-2
                        */
                    `,
					output: `
                        /* eslint-disable used-1, used-2*/
                        bad
                        /* eslint-enable
                               used-1,
                               used-2
                        */
                    `,
				},
				{
					code: `
                        /* eslint-disable used-1, used-2*/
                        bad
                        /* eslint-enable
                               used-1,
                               unused-1,
                               used-2,
                               unused-2,
                        */
                    `,
					output: `
                        /* eslint-disable used-1, used-2*/
                        bad
                        /* eslint-enable
                               used-1,
                               used-2,
                        */
                    `,
				},
				{
					code: `
                        /* eslint-disable used-1, used-2*/
                        bad
                        /* eslint-enable
                               ,unused-1
                               ,used-1
                               ,unused-2
                               ,used-2
                        */
                    `,
					output: `
                        /* eslint-disable used-1, used-2*/
                        bad
                        /* eslint-enable
                               ,used-1
                               ,used-2
                        */
                    `,
				},
				{
					code: `
                        /* eslint-disable used-1, used-2*/
                        bad
                        /* eslint-enable
                               ,used-1
                               ,unused-1
                               ,used-2
                               ,unused-2
                        */
                    `,
					output: `
                        /* eslint-disable used-1, used-2*/
                        bad
                        /* eslint-enable
                               ,used-1
                               ,used-2
                        */
                    `,
				},
				{
					code: `
                        /* eslint-disable used-1, used-2*/
                        bad
                        /* eslint-enable
                               used-1,
                               unused-1,
                               used-2,
                               unused-2

                               -- comment
                        */
                    `,
					output: `
                        /* eslint-disable used-1, used-2*/
                        bad
                        /* eslint-enable
                               used-1,
                               used-2

                               -- comment
                        */
                    `,
				},

				// duplicates in the list
				{
					code: "// eslint-disable-line unused, unused, used",
					output: "// eslint-disable-line used",
				},
				{
					code: "// eslint-disable-line unused, used, unused",
					output: "// eslint-disable-line used",
				},
				{
					code: "// eslint-disable-line used, unused, unused, used",
					output: "// eslint-disable-line used, used",
				},
			];

			for (const { code, output } of tests) {
				// eslint-disable-next-line no-loop-func -- `linter` is getting updated in beforeEach()
				it(code, () => {
					assert.strictEqual(
						linter.verifyAndFix(code, config).output,
						output,
					);
				});

				// Test for quoted rule names
				for (const testcaseForLiteral of [
					{
						code: code.replace(/((?:un)?used[\w-]*)/gu, '"$1"'),
						output: output.replace(/((?:un)?used[\w-]*)/gu, '"$1"'),
					},
					{
						code: code.replace(/((?:un)?used[\w-]*)/gu, "'$1'"),
						output: output.replace(/((?:un)?used[\w-]*)/gu, "'$1'"),
					},
				]) {
					// eslint-disable-next-line no-loop-func -- `linter` is getting updated in beforeEach()
					it(testcaseForLiteral.code, () => {
						assert.strictEqual(
							linter.verifyAndFix(testcaseForLiteral.code, config)
								.output,
							testcaseForLiteral.output,
						);
					});
				}
			}
		});
	});

	describe("config.noInlineConfig + options.allowInlineConfig", () => {
		it("should report both a rule violation and a warning about inline config", () => {
			const code = [
				"/* eslint-disable */ // <-- this should be inline config warning",
				"foo(); // <-- this should be no-undef error",
			].join("\n");
			const config = {
				rules: {
					"no-undef": 2,
				},
				noInlineConfig: true,
			};

			const messages = linter.verify(code, config, {
				filename,
				allowInlineConfig: true,
			});
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 2);
			assert.deepStrictEqual(messages, [
				{
					ruleId: null,
					message:
						"'/*eslint-disable*/' has no effect because you have 'noInlineConfig' setting in your config.",
					line: 1,
					column: 1,
					endLine: 1,
					endColumn: 21,
					severity: 1,
					nodeType: null,
				},
				{
					ruleId: "no-undef",
					messageId: "undef",
					message: "'foo' is not defined.",
					line: 2,
					endLine: 2,
					column: 1,
					endColumn: 4,
					severity: 2,
					nodeType: "Identifier",
				},
			]);

			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should report both a rule violation without warning about inline config when noInlineConfig is true and allowInlineConfig is false", () => {
			const code = [
				"/* eslint-disable */ // <-- this should be inline config warning",
				"foo(); // <-- this should be no-undef error",
			].join("\n");
			const config = {
				rules: {
					"no-undef": 2,
				},
				noInlineConfig: true,
			};

			const messages = linter.verify(code, config, {
				filename,
				allowInlineConfig: false,
			});
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.deepStrictEqual(messages, [
				{
					ruleId: "no-undef",
					messageId: "undef",
					message: "'foo' is not defined.",
					line: 2,
					endLine: 2,
					column: 1,
					endColumn: 4,
					severity: 2,
					nodeType: "Identifier",
				},
			]);

			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should report both a rule violation without warning about inline config when both are false", () => {
			const code = [
				"/* eslint-disable */ // <-- this should be inline config warning",
				"foo(); // <-- this should be no-undef error",
			].join("\n");
			const config = {
				rules: {
					"no-undef": 2,
				},
				noInlineConfig: false,
			};

			const messages = linter.verify(code, config, {
				filename,
				allowInlineConfig: false,
			});
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.deepStrictEqual(messages, [
				{
					ruleId: "no-undef",
					messageId: "undef",
					message: "'foo' is not defined.",
					line: 2,
					endLine: 2,
					column: 1,
					endColumn: 4,
					severity: 2,
					nodeType: "Identifier",
				},
			]);

			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should report one suppressed problem when noInlineConfig is false and allowInlineConfig is true", () => {
			const code = [
				"/* eslint-disable */ // <-- this should be inline config warning",
				"foo(); // <-- this should be no-undef error",
			].join("\n");
			const config = {
				rules: {
					"no-undef": 2,
				},
				noInlineConfig: false,
			};

			const messages = linter.verify(code, config, {
				filename,
				allowInlineConfig: true,
			});
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 1);
			assert.deepStrictEqual(suppressedMessages, [
				{
					ruleId: "no-undef",
					messageId: "undef",
					message: "'foo' is not defined.",
					line: 2,
					endLine: 2,
					column: 1,
					endColumn: 4,
					severity: 2,
					nodeType: "Identifier",
					suppressions: [
						{
							justification: "",
							kind: "directive",
						},
					],
				},
			]);
		});
	});

	describe("when evaluating code with comments to change config when allowInlineConfig is disabled", () => {
		it("should not report a violation", () => {
			const code = [
				"alert('test'); // eslint-disable-line no-alert",
			].join("\n");
			const config = {
				rules: {
					"no-alert": 1,
				},
			};

			const messages = linter.verify(code, config, {
				filename,
				allowInlineConfig: true,
			});
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);

			assert.strictEqual(suppressedMessages.length, 1);
			assert.strictEqual(suppressedMessages[0].ruleId, "no-alert");
		});
	});

	describe("verify()", () => {
		it("should report warnings in order by line and column when called", () => {
			const code = "foo()\n    alert('test')";
			const config = {
				rules: {
					"no-mixed-spaces-and-tabs": 1,
					"eol-last": 1,
					semi: [1, "always"],
				},
			};

			const messages = linter.verify(code, config, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 3);
			assert.strictEqual(messages[0].line, 1);
			assert.strictEqual(messages[0].column, 6);
			assert.strictEqual(messages[1].line, 2);
			assert.strictEqual(messages[1].column, 18);
			assert.strictEqual(messages[2].line, 2);
			assert.strictEqual(messages[2].column, 18);

			assert.strictEqual(suppressedMessages.length, 0);
		});

		describe("ecmaVersion", () => {
			it("should not support ES6 when no ecmaVersion provided", () => {
				const messages = linter.verify("let x = 0;");
				const suppressedMessages = linter.getSuppressedMessages();

				assert.strictEqual(messages.length, 1);
				assert.strictEqual(suppressedMessages.length, 0);
			});

			it("supports ECMAScript version 'latest'", () => {
				const messages = linter.verify("{ using x = foo(); }", {
					parserOptions: { ecmaVersion: "latest" },
				});
				const suppressedMessages = linter.getSuppressedMessages();

				assert.strictEqual(messages.length, 0);
				assert.strictEqual(suppressedMessages.length, 0);
			});

			it("the 'latest' is equal to espree.latestEcmaVersion", () => {
				let ecmaVersion = null;
				const config = {
					rules: { "ecma-version": 2 },
					parserOptions: { ecmaVersion: "latest" },
				};

				linter.defineRule("ecma-version", {
					create: context => ({
						Program() {
							ecmaVersion = context.parserOptions.ecmaVersion;
						},
					}),
				});
				linter.verify("", config);
				assert.strictEqual(
					ecmaVersion,
					espree.latestEcmaVersion,
					"ecmaVersion should be 13",
				);
			});

			it("the 'latest' is equal to espree.latestEcmaVersion on languageOptions", () => {
				let ecmaVersion = null;
				const config = {
					rules: { "ecma-version": 2 },
					parserOptions: { ecmaVersion: "latest" },
				};

				linter.defineRule("ecma-version", {
					create: context => ({
						Program() {
							ecmaVersion = context.languageOptions.ecmaVersion;
						},
					}),
				});
				linter.verify("", config);
				assert.strictEqual(
					ecmaVersion,
					espree.latestEcmaVersion + 2009,
					"ecmaVersion should be 2022",
				);
			});

			it("should pass normalized ecmaVersion to eslint-scope", () => {
				let blockScope = null;

				linter.defineRule("block-scope", {
					create: context => ({
						BlockStatement(node) {
							blockScope = context.sourceCode.getScope(node);
						},
					}),
				});
				linter.defineParser("custom-parser", {
					parse: (...args) => espree.parse(...args),
				});

				// Use standard parser
				linter.verify("{}", {
					rules: { "block-scope": 2 },
					parserOptions: { ecmaVersion: "latest" },
				});

				assert.strictEqual(blockScope.type, "block");

				linter.verify("{}", {
					rules: { "block-scope": 2 },
					parserOptions: {}, // ecmaVersion defaults to 5
				});
				assert.strictEqual(blockScope.type, "global");

				// Use custom parser
				linter.verify("{}", {
					rules: { "block-scope": 2 },
					parser: "custom-parser",
					parserOptions: { ecmaVersion: "latest" },
				});

				assert.strictEqual(blockScope.type, "block");

				linter.verify("{}", {
					rules: { "block-scope": 2 },
					parser: "custom-parser",
					parserOptions: {}, // ecmaVersion defaults to 5
				});
				assert.strictEqual(blockScope.type, "global");
			});

			describe("it should properly parse let declaration when", () => {
				it("the ECMAScript version number is 6", () => {
					const messages = linter.verify("let x = 5;", {
						parserOptions: {
							ecmaVersion: 6,
						},
					});
					const suppressedMessages = linter.getSuppressedMessages();

					assert.strictEqual(messages.length, 0);
					assert.strictEqual(suppressedMessages.length, 0);
				});

				it("the ECMAScript version number is 2015", () => {
					const messages = linter.verify("let x = 5;", {
						parserOptions: {
							ecmaVersion: 2015,
						},
					});
					const suppressedMessages = linter.getSuppressedMessages();

					assert.strictEqual(messages.length, 0);
					assert.strictEqual(suppressedMessages.length, 0);
				});
			});

			it("should fail to parse exponentiation operator when the ECMAScript version number is 2015", () => {
				const messages = linter.verify("x ** y;", {
					parserOptions: {
						ecmaVersion: 2015,
					},
				});
				const suppressedMessages = linter.getSuppressedMessages();

				assert.strictEqual(messages.length, 1);
				assert.strictEqual(suppressedMessages.length, 0);
			});

			describe("should properly parse exponentiation operator when", () => {
				it("the ECMAScript version number is 7", () => {
					const messages = linter.verify("x ** y;", {
						parserOptions: {
							ecmaVersion: 7,
						},
					});
					const suppressedMessages = linter.getSuppressedMessages();

					assert.strictEqual(messages.length, 0);
					assert.strictEqual(suppressedMessages.length, 0);
				});

				it("the ECMAScript version number is 2016", () => {
					const messages = linter.verify("x ** y;", {
						parserOptions: {
							ecmaVersion: 2016,
						},
					});
					const suppressedMessages = linter.getSuppressedMessages();

					assert.strictEqual(messages.length, 0);
					assert.strictEqual(suppressedMessages.length, 0);
				});
			});
		});

		it("should properly parse object spread when ecmaVersion is 2018", () => {
			const messages = linter.verify(
				"var x = { ...y };",
				{
					parserOptions: {
						ecmaVersion: 2018,
					},
				},
				filename,
			);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should properly parse global return when passed ecmaFeatures", () => {
			const messages = linter.verify(
				"return;",
				{
					parserOptions: {
						ecmaFeatures: {
							globalReturn: true,
						},
					},
				},
				filename,
			);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should properly parse global return when in Node.js environment", () => {
			const messages = linter.verify(
				"return;",
				{
					env: {
						node: true,
					},
				},
				filename,
			);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should not parse global return when in Node.js environment with globalReturn explicitly off", () => {
			const messages = linter.verify(
				"return;",
				{
					env: {
						node: true,
					},
					parserOptions: {
						ecmaFeatures: {
							globalReturn: false,
						},
					},
				},
				filename,
			);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(
				messages[0].message,
				"Parsing error: 'return' outside of function",
			);

			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should not parse global return when Node.js environment is false", () => {
			const messages = linter.verify("return;", {}, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(
				messages[0].message,
				"Parsing error: 'return' outside of function",
			);

			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should properly parse sloppy-mode code when impliedStrict is false", () => {
			const messages = linter.verify("var private;", {}, filename);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should not parse sloppy-mode code when impliedStrict is true", () => {
			const messages = linter.verify(
				"var private;",
				{
					parserOptions: {
						ecmaFeatures: {
							impliedStrict: true,
						},
					},
				},
				filename,
			);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(
				messages[0].message,
				"Parsing error: The keyword 'private' is reserved",
			);

			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should properly parse valid code when impliedStrict is true", () => {
			const messages = linter.verify(
				"var foo;",
				{
					parserOptions: {
						ecmaFeatures: {
							impliedStrict: true,
						},
					},
				},
				filename,
			);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 0);
		});

		it.skip("should properly parse JSX when passed ecmaFeatures", () => {
			const messages = linter.verify(
				"var x = <div/>;",
				{
					parserOptions: {
						ecmaFeatures: {
							jsx: true,
						},
					},
				},
				filename,
			);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should report an error when JSX code is encountered and JSX is not enabled", () => {
			const code = 'var myDivElement = <div className="foo" />;';
			const messages = linter.verify(code, {}, "filename");
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(messages[0].line, 1);
			assert.strictEqual(messages[0].column, 20);
			assert.strictEqual(
				messages[0].message,
				"Parsing error: Unexpected token <",
			);

			assert.strictEqual(suppressedMessages.length, 0);
		});

		it.skip("should not report an error when JSX code is encountered and JSX is enabled", () => {
			const code = 'var myDivElement = <div className="foo" />;';
			const messages = linter.verify(
				code,
				{ parserOptions: { ecmaFeatures: { jsx: true } } },
				"filename",
			);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 0);
		});

		it.skip("should not report an error when JSX code contains a spread operator and JSX is enabled", () => {
			const code = "var myDivElement = <div {...this.props} />;";
			const messages = linter.verify(
				code,
				{
					parserOptions: {
						ecmaVersion: 6,
						ecmaFeatures: { jsx: true },
					},
				},
				"filename",
			);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should not allow the use of reserved words as variable names in ES3", () => {
			const code = "var char;";
			const messages = linter.verify(
				code,
				{ parserOptions: { ecmaVersion: 3 } },
				filename,
			);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(messages[0].severity, 2);
			assert.ok(messages[0].fatal);
			match(messages[0].message, /^Parsing error:.*'char'/u);

			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should not allow the use of reserved words as property names in member expressions in ES3", () => {
			const code = "obj.char;";
			const messages = linter.verify(
				code,
				{ parserOptions: { ecmaVersion: 3 } },
				filename,
			);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(messages[0].severity, 2);
			assert.ok(messages[0].fatal);
			match(messages[0].message, /^Parsing error:.*'char'/u);

			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should not allow the use of reserved words as property names in object literals in ES3", () => {
			const code = "var obj = { char: 1 };";
			const messages = linter.verify(
				code,
				{ parserOptions: { ecmaVersion: 3 } },
				filename,
			);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(messages[0].severity, 2);
			assert.ok(messages[0].fatal);
			match(messages[0].message, /^Parsing error:.*'char'/u);

			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should allow the use of reserved words as variable and property names in ES3 when allowReserved is true", () => {
			const code = "var char; obj.char; var obj = { char: 1 };";
			const messages = linter.verify(
				code,
				{ parserOptions: { ecmaVersion: 3, allowReserved: true } },
				filename,
			);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should not allow the use of reserved words as variable names in ES > 3", () => {
			const ecmaVersions = [
				void 0,
				...espree.supportedEcmaVersions.filter(
					ecmaVersion => ecmaVersion > 3,
				),
			];

			ecmaVersions.forEach(ecmaVersion => {
				const code = "var enum;";
				const messages = linter.verify(
					code,
					{ parserOptions: { ecmaVersion } },
					filename,
				);
				const suppressedMessages = linter.getSuppressedMessages();

				assert.strictEqual(messages.length, 1);
				assert.strictEqual(messages[0].severity, 2);
				assert.ok(messages[0].fatal);
				match(messages[0].message, /^Parsing error:.*'enum'/u);

				assert.strictEqual(suppressedMessages.length, 0);
			});
		});

		it("should allow the use of reserved words as property names in ES > 3", () => {
			const ecmaVersions = [
				void 0,
				...espree.supportedEcmaVersions.filter(
					ecmaVersion => ecmaVersion > 3,
				),
			];

			ecmaVersions.forEach(ecmaVersion => {
				const code =
					"obj.enum; obj.function; var obj = { enum: 1, function: 2 };";
				const messages = linter.verify(
					code,
					{ parserOptions: { ecmaVersion } },
					filename,
				);
				const suppressedMessages = linter.getSuppressedMessages();

				assert.strictEqual(messages.length, 0);
				assert.strictEqual(suppressedMessages.length, 0);
			});
		});

		it("should not allow `allowReserved: true` in ES > 3", () => {
			const ecmaVersions = [
				void 0,
				...espree.supportedEcmaVersions.filter(
					ecmaVersion => ecmaVersion > 3,
				),
			];

			ecmaVersions.forEach(ecmaVersion => {
				const code = "";
				const messages = linter.verify(
					code,
					{ parserOptions: { ecmaVersion, allowReserved: true } },
					filename,
				);
				const suppressedMessages = linter.getSuppressedMessages();

				assert.strictEqual(messages.length, 1);
				assert.strictEqual(messages[0].severity, 2);
				assert.ok(messages[0].fatal);
				match(
					messages[0].message,
					/^Parsing error:.*allowReserved/u,
				);

				assert.strictEqual(suppressedMessages.length, 0);
			});
		});

		it('should be able to use es6 features if there is a comment which has "eslint-env es6"', () => {
			const code = [
				"/* eslint-env es6 */",
				"var arrow = () => 0;",
				"var binary = 0b1010;",
				"{ let a = 0; const b = 1; }",
				"class A {}",
				"function defaultParams(a = 0) {}",
				"var {a = 1, b = 2} = {};",
				"for (var a of []) {}",
				"function* generator() { yield 0; }",
				"var computed = {[a]: 0};",
				"var duplicate = {dup: 0, dup: 1};",
				"var method = {foo() {}};",
				"var property = {a, b};",
				"var octal = 0o755;",
				"var u = /^.$/u.test('𠮷');",
				"var y = /hello/y.test('hello');",
				"function restParam(a, ...rest) {}",
				"class B { superInFunc() { super.foo(); } }",
				"var template = `hello, ${a}`;",
				"var unicode = '\\u{20BB7}';",
			].join("\n");

			const messages = linter.verify(code, null, "eslint-env es6");
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should be able to return in global if there is a comment which enables the node environment with a comment", () => {
			const messages = linter.verify(
				`/* ${ESLINT_ENV} node */ return;`,
				null,
				"node environment",
			);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 0);
		});

		it('should attach a "/*global" comment node to declared variables', () => {
			const code = "/* global foo */\n/* global bar, baz */";
			let ok = false;

			linter.defineRules({
				test: {
					create: context => ({
						Program(node) {
							const scope = context.sourceCode.getScope(node);
							const sourceCode = context.sourceCode;
							const comments = sourceCode.getAllComments();

							assert.strictEqual(
								context.getSourceCode(),
								sourceCode,
							);
							assert.strictEqual(2, comments.length);

							const foo = getVariable(scope, "foo");

							assert.strictEqual(foo.eslintExplicitGlobal, true);
							assert.strictEqual(
								foo.eslintExplicitGlobalComments[0],
								comments[0],
							);

							const bar = getVariable(scope, "bar");

							assert.strictEqual(bar.eslintExplicitGlobal, true);
							assert.strictEqual(
								bar.eslintExplicitGlobalComments[0],
								comments[1],
							);

							const baz = getVariable(scope, "baz");

							assert.strictEqual(baz.eslintExplicitGlobal, true);
							assert.strictEqual(
								baz.eslintExplicitGlobalComments[0],
								comments[1],
							);

							ok = true;
						},
					}),
				},
			});

			linter.verify(code, { rules: { test: 2 } });
			assert(ok);
		});

		it("should report a linting error when a global is set to an invalid value", () => {
			const results = linter.verify(
				"/* global foo: AAAAA, bar: readonly */\nfoo;\nbar;",
				{ rules: { "no-undef": "error" } },
			);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.deepStrictEqual(results, [
				{
					ruleId: null,
					severity: 2,
					message:
						"'AAAAA' is not a valid configuration for a global (use 'readonly', 'writable', or 'off')",
					line: 1,
					column: 1,
					endLine: 1,
					endColumn: 39,
					nodeType: null,
				},
				{
					ruleId: "no-undef",
					messageId: "undef",
					severity: 2,
					message: "'foo' is not defined.",
					line: 2,
					column: 1,
					endLine: 2,
					endColumn: 4,
					nodeType: "Identifier",
				},
			]);

			assert.strictEqual(suppressedMessages.length, 0);
		});

		it.skip("should not crash when we reuse the SourceCode object", () => {
			linter.verify(
				"function render() { return <div className='test'>{hello}</div> }",
				{
					parserOptions: {
						ecmaVersion: 6,
						ecmaFeatures: { jsx: true },
					},
				},
			);
			linter.verify(linter.getSourceCode(), {
				parserOptions: { ecmaVersion: 6, ecmaFeatures: { jsx: true } },
			});
		});

		it.skip("should reuse the SourceCode object", () => {
			let ast1 = null,
				ast2 = null;

			linter.defineRule("save-ast1", {
				create: () => ({
					Program(node) {
						ast1 = node;
					},
				}),
			});
			linter.defineRule("save-ast2", {
				create: () => ({
					Program(node) {
						ast2 = node;
					},
				}),
			});

			linter.verify(
				"function render() { return <div className='test'>{hello}</div> }",
				{
					parserOptions: {
						ecmaVersion: 6,
						ecmaFeatures: { jsx: true },
					},
					rules: { "save-ast1": 2 },
				},
			);
			linter.verify(linter.getSourceCode(), {
				parserOptions: { ecmaVersion: 6, ecmaFeatures: { jsx: true } },
				rules: { "save-ast2": 2 },
			});

			assert(ast1 !== null);
			assert(ast2 !== null);
			assert(ast1 === ast2);
		});

		it("should allow 'await' as a property name in modules", () => {
			const result = linter.verify("obj.await", {
				parserOptions: { ecmaVersion: 6, sourceType: "module" },
			});
			const suppressedMessages = linter.getSuppressedMessages();

			assert(result.length === 0);
			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should not modify config object passed as argument", () => {
			const config = {};

			Object.freeze(config);
			linter.verify("var", config);
		});

		describe("descriptions in directive comments", () => {
			it("should ignore the part preceded by '--' in '/*eslint-env*/'.", () => {
				const messages = linter.verify(
					`
                    /*eslint-env es2015 -- es2017 */
                    var Promise = {}
                    var Atomics = {}
                `,
					{ rules: { "no-redeclare": "error" } },
				);
				const suppressedMessages = linter.getSuppressedMessages();

				// Don't include `Atomics`
				assert.deepStrictEqual(messages, [
					{
						column: 25,
						endColumn: 32,
						endLine: 3,
						line: 3,
						message:
							"'Promise' is already defined as a built-in global variable.",
						messageId: "redeclaredAsBuiltin",
						nodeType: "Identifier",
						ruleId: "no-redeclare",
						severity: 2,
					},
				]);

				assert.strictEqual(suppressedMessages.length, 0);
			});

			it("should ignore the part preceded by '--' in '/*global*/'.", () => {
				const messages = linter.verify(
					`
                    /*global aaa -- bbb */
                    var aaa = {}
                    var bbb = {}
                `,
					{ rules: { "no-redeclare": "error" } },
				);
				const suppressedMessages = linter.getSuppressedMessages();

				// Don't include `bbb`
				assert.deepStrictEqual(messages, [
					{
						column: 30,
						endColumn: 33,
						line: 2,
						endLine: 2,
						message:
							"'aaa' is already defined by a variable declaration.",
						messageId: "redeclaredBySyntax",
						nodeType: "Block",
						ruleId: "no-redeclare",
						severity: 2,
					},
				]);

				assert.strictEqual(suppressedMessages.length, 0);
			});

			it("should ignore the part preceded by '--' in '/*globals*/'.", () => {
				const messages = linter.verify(
					`
                    /*globals aaa -- bbb */
                    var aaa = {}
                    var bbb = {}
                `,
					{ rules: { "no-redeclare": "error" } },
				);
				const suppressedMessages = linter.getSuppressedMessages();

				// Don't include `bbb`
				assert.deepStrictEqual(messages, [
					{
						column: 31,
						endColumn: 34,
						line: 2,
						endLine: 2,
						message:
							"'aaa' is already defined by a variable declaration.",
						messageId: "redeclaredBySyntax",
						nodeType: "Block",
						ruleId: "no-redeclare",
						severity: 2,
					},
				]);

				assert.strictEqual(suppressedMessages.length, 0);
			});

			it("should ignore the part preceded by '--' in '/*exported*/'.", () => {
				const messages = linter.verify(
					`
                    /*exported aaa -- bbb */
                    var aaa = {}
                    var bbb = {}
                `,
					{ rules: { "no-unused-vars": "error" } },
				);
				const suppressedMessages = linter.getSuppressedMessages();

				// Don't include `aaa`
				assert.deepStrictEqual(messages, [
					{
						column: 25,
						endColumn: 28,
						endLine: 4,
						line: 4,
						message: "'bbb' is assigned a value but never used.",
						messageId: "unusedVar",
						nodeType: "Identifier",
						ruleId: "no-unused-vars",
						severity: 2,
						suggestions: [
							{
								data: {
									varName: "bbb",
								},
								desc: "Remove unused variable 'bbb'.",
								fix: {
									range: [99, 111],
									text: "",
								},
								messageId: "removeVar",
							},
						],
					},
				]);

				assert.strictEqual(suppressedMessages.length, 0);
			});

			it("should ignore the part preceded by '--' in '/*eslint-disable*/'.", () => {
				const messages = linter.verify(
					`
                    /*eslint-disable no-redeclare -- no-unused-vars */
                    var aaa = {}
                    var aaa = {}
                `,
					{
						rules: {
							"no-redeclare": "error",
							"no-unused-vars": "error",
						},
					},
				);
				const suppressedMessages = linter.getSuppressedMessages();

				// Do include `no-unused-vars` but not `no-redeclare`
				assert.deepStrictEqual(messages, [
					{
						column: 25,
						endLine: 4,
						endColumn: 28,
						line: 4,
						message: "'aaa' is assigned a value but never used.",
						messageId: "unusedVar",
						nodeType: "Identifier",
						ruleId: "no-unused-vars",
						severity: 2,
					},
				]);

				assert.deepStrictEqual(suppressedMessages, [
					{
						column: 25,
						endLine: 4,
						endColumn: 28,
						line: 4,
						message: "'aaa' is already defined.",
						messageId: "redeclared",
						nodeType: "Identifier",
						ruleId: "no-redeclare",
						severity: 2,
						suppressions: [
							{
								kind: "directive",
								justification: "no-unused-vars",
							},
						],
					},
				]);
			});

			it("should ignore the part preceded by '--' in '/*eslint-enable*/'.", () => {
				const messages = linter.verify(
					`
                    /*eslint-disable no-redeclare, no-unused-vars */
                    /*eslint-enable no-redeclare -- no-unused-vars */
                    var aaa = {}
                    var aaa = {}
                `,
					{
						rules: {
							"no-redeclare": "error",
							"no-unused-vars": "error",
						},
					},
				);
				const suppressedMessages = linter.getSuppressedMessages();

				// Do include `no-redeclare` but not `no-unused-vars`
				assert.deepStrictEqual(messages, [
					{
						column: 25,
						endLine: 5,
						endColumn: 28,
						line: 5,
						message: "'aaa' is already defined.",
						messageId: "redeclared",
						nodeType: "Identifier",
						ruleId: "no-redeclare",
						severity: 2,
					},
				]);

				assert.deepStrictEqual(suppressedMessages, [
					{
						column: 25,
						endLine: 5,
						endColumn: 28,
						line: 5,
						message: "'aaa' is assigned a value but never used.",
						messageId: "unusedVar",
						nodeType: "Identifier",
						ruleId: "no-unused-vars",
						severity: 2,
						suppressions: [
							{ kind: "directive", justification: "" },
						],
					},
				]);
			});

			it("should ignore the part preceded by '--' in '//eslint-disable-line'.", () => {
				const messages = linter.verify(
					`
                    var aaa = {} //eslint-disable-line no-redeclare -- no-unused-vars
                    var aaa = {} //eslint-disable-line no-redeclare -- no-unused-vars
                `,
					{
						rules: {
							"no-redeclare": "error",
							"no-unused-vars": "error",
						},
					},
				);
				const suppressedMessages = linter.getSuppressedMessages();

				// Do include `no-unused-vars` but not `no-redeclare`
				assert.deepStrictEqual(messages, [
					{
						column: 25,
						endLine: 3,
						endColumn: 28,
						line: 3,
						message: "'aaa' is assigned a value but never used.",
						messageId: "unusedVar",
						nodeType: "Identifier",
						ruleId: "no-unused-vars",
						severity: 2,
					},
				]);

				assert.deepStrictEqual(suppressedMessages, [
					{
						column: 25,
						endLine: 3,
						endColumn: 28,
						line: 3,
						message: "'aaa' is already defined.",
						messageId: "redeclared",
						nodeType: "Identifier",
						ruleId: "no-redeclare",
						severity: 2,
						suppressions: [
							{
								kind: "directive",
								justification: "no-unused-vars",
							},
						],
					},
				]);
			});

			it("should ignore the part preceded by '--' in '/*eslint-disable-line*/'.", () => {
				const messages = linter.verify(
					`
                    var aaa = {} /*eslint-disable-line no-redeclare -- no-unused-vars */
                    var aaa = {} /*eslint-disable-line no-redeclare -- no-unused-vars */
                `,
					{
						rules: {
							"no-redeclare": "error",
							"no-unused-vars": "error",
						},
					},
				);
				const suppressedMessages = linter.getSuppressedMessages();

				// Do include `no-unused-vars` but not `no-redeclare`
				assert.deepStrictEqual(messages, [
					{
						column: 25,
						endLine: 3,
						endColumn: 28,
						line: 3,
						message: "'aaa' is assigned a value but never used.",
						messageId: "unusedVar",
						nodeType: "Identifier",
						ruleId: "no-unused-vars",
						severity: 2,
					},
				]);

				assert.deepStrictEqual(suppressedMessages, [
					{
						column: 25,
						endLine: 3,
						endColumn: 28,
						line: 3,
						message: "'aaa' is already defined.",
						messageId: "redeclared",
						nodeType: "Identifier",
						ruleId: "no-redeclare",
						severity: 2,
						suppressions: [
							{
								kind: "directive",
								justification: "no-unused-vars",
							},
						],
					},
				]);
			});

			it("should ignore the part preceded by '--' in '//eslint-disable-next-line'.", () => {
				const messages = linter.verify(
					`
                    //eslint-disable-next-line no-redeclare -- no-unused-vars
                    var aaa = {}
                    //eslint-disable-next-line no-redeclare -- no-unused-vars
                    var aaa = {}
                `,
					{
						rules: {
							"no-redeclare": "error",
							"no-unused-vars": "error",
						},
					},
				);
				const suppressedMessages = linter.getSuppressedMessages();

				// Do include `no-unused-vars` but not `no-redeclare`
				assert.deepStrictEqual(messages, [
					{
						column: 25,
						endLine: 5,
						endColumn: 28,
						line: 5,
						message: "'aaa' is assigned a value but never used.",
						messageId: "unusedVar",
						nodeType: "Identifier",
						ruleId: "no-unused-vars",
						severity: 2,
					},
				]);

				assert.deepStrictEqual(suppressedMessages, [
					{
						column: 25,
						endLine: 5,
						endColumn: 28,
						line: 5,
						message: "'aaa' is already defined.",
						messageId: "redeclared",
						nodeType: "Identifier",
						ruleId: "no-redeclare",
						severity: 2,
						suppressions: [
							{
								kind: "directive",
								justification: "no-unused-vars",
							},
						],
					},
				]);
			});

			it("should ignore the part preceded by '--' in '/*eslint-disable-next-line*/'.", () => {
				const messages = linter.verify(
					`
                    /*eslint-disable-next-line no-redeclare -- no-unused-vars */
                    var aaa = {}
                    /*eslint-disable-next-line no-redeclare -- no-unused-vars */
                    var aaa = {}
                `,
					{
						rules: {
							"no-redeclare": "error",
							"no-unused-vars": "error",
						},
					},
				);
				const suppressedMessages = linter.getSuppressedMessages();

				// Do include `no-unused-vars` but not `no-redeclare`
				assert.deepStrictEqual(messages, [
					{
						column: 25,
						endLine: 5,
						endColumn: 28,
						line: 5,
						message: "'aaa' is assigned a value but never used.",
						messageId: "unusedVar",
						nodeType: "Identifier",
						ruleId: "no-unused-vars",
						severity: 2,
					},
				]);

				assert.deepStrictEqual(suppressedMessages, [
					{
						column: 25,
						endLine: 5,
						endColumn: 28,
						line: 5,
						message: "'aaa' is already defined.",
						messageId: "redeclared",
						nodeType: "Identifier",
						ruleId: "no-redeclare",
						severity: 2,
						suppressions: [
							{
								kind: "directive",
								justification: "no-unused-vars",
							},
						],
					},
				]);
			});
		});
	});

	describe("Variables and references", () => {
		const code = [
			"a;",
			"function foo() { b; }",
			"Object;",
			"foo;",
			"var c;",
			"c;",
			"/* global d */",
			"d;",
			"e;",
			"f;",
		].join("\n");
		let scope = null;

		beforeEach(() => {
			let ok = false;

			linter.defineRules({
				test: {
					create: context => ({
						Program(node) {
							scope = context.sourceCode.getScope(node);
							ok = true;
						},
					}),
				},
			});
			linter.verify(code, {
				rules: { test: 2 },
				globals: { e: true, f: false },
			});
			assert(ok);
		});

		afterEach(() => {
			scope = null;
		});

		it("Scope#through should contain references of undefined variables", () => {
			assert.strictEqual(scope.through.length, 2);
			assert.strictEqual(scope.through[0].identifier.name, "a");
			assert.strictEqual(scope.through[0].identifier.loc.start.line, 1);
			assert.strictEqual(scope.through[0].resolved, null);
			assert.strictEqual(scope.through[1].identifier.name, "b");
			assert.strictEqual(scope.through[1].identifier.loc.start.line, 2);
			assert.strictEqual(scope.through[1].resolved, null);
		});

		it("Scope#variables should contain global variables", () => {
			assert(scope.variables.some(v => v.name === "Object"));
			assert(scope.variables.some(v => v.name === "foo"));
			assert(scope.variables.some(v => v.name === "c"));
			assert(scope.variables.some(v => v.name === "d"));
			assert(scope.variables.some(v => v.name === "e"));
			assert(scope.variables.some(v => v.name === "f"));
		});

		it("Scope#set should contain global variables", () => {
			assert(scope.set.get("Object"));
			assert(scope.set.get("foo"));
			assert(scope.set.get("c"));
			assert(scope.set.get("d"));
			assert(scope.set.get("e"));
			assert(scope.set.get("f"));
		});

		it("Variables#references should contain their references", () => {
			assert.strictEqual(scope.set.get("Object").references.length, 1);
			assert.strictEqual(
				scope.set.get("Object").references[0].identifier.name,
				"Object",
			);
			assert.strictEqual(
				scope.set.get("Object").references[0].identifier.loc.start.line,
				3,
			);
			assert.strictEqual(
				scope.set.get("Object").references[0].resolved,
				scope.set.get("Object"),
			);
			assert.strictEqual(scope.set.get("foo").references.length, 1);
			assert.strictEqual(
				scope.set.get("foo").references[0].identifier.name,
				"foo",
			);
			assert.strictEqual(
				scope.set.get("foo").references[0].identifier.loc.start.line,
				4,
			);
			assert.strictEqual(
				scope.set.get("foo").references[0].resolved,
				scope.set.get("foo"),
			);
			assert.strictEqual(scope.set.get("c").references.length, 1);
			assert.strictEqual(
				scope.set.get("c").references[0].identifier.name,
				"c",
			);
			assert.strictEqual(
				scope.set.get("c").references[0].identifier.loc.start.line,
				6,
			);
			assert.strictEqual(
				scope.set.get("c").references[0].resolved,
				scope.set.get("c"),
			);
			assert.strictEqual(scope.set.get("d").references.length, 1);
			assert.strictEqual(
				scope.set.get("d").references[0].identifier.name,
				"d",
			);
			assert.strictEqual(
				scope.set.get("d").references[0].identifier.loc.start.line,
				8,
			);
			assert.strictEqual(
				scope.set.get("d").references[0].resolved,
				scope.set.get("d"),
			);
			assert.strictEqual(scope.set.get("e").references.length, 1);
			assert.strictEqual(
				scope.set.get("e").references[0].identifier.name,
				"e",
			);
			assert.strictEqual(
				scope.set.get("e").references[0].identifier.loc.start.line,
				9,
			);
			assert.strictEqual(
				scope.set.get("e").references[0].resolved,
				scope.set.get("e"),
			);
			assert.strictEqual(scope.set.get("f").references.length, 1);
			assert.strictEqual(
				scope.set.get("f").references[0].identifier.name,
				"f",
			);
			assert.strictEqual(
				scope.set.get("f").references[0].identifier.loc.start.line,
				10,
			);
			assert.strictEqual(
				scope.set.get("f").references[0].resolved,
				scope.set.get("f"),
			);
		});

		it("Reference#resolved should be their variable", () => {
			assert.strictEqual(
				scope.set.get("Object").references[0].resolved,
				scope.set.get("Object"),
			);
			assert.strictEqual(
				scope.set.get("foo").references[0].resolved,
				scope.set.get("foo"),
			);
			assert.strictEqual(
				scope.set.get("c").references[0].resolved,
				scope.set.get("c"),
			);
			assert.strictEqual(
				scope.set.get("d").references[0].resolved,
				scope.set.get("d"),
			);
			assert.strictEqual(
				scope.set.get("e").references[0].resolved,
				scope.set.get("e"),
			);
			assert.strictEqual(
				scope.set.get("f").references[0].resolved,
				scope.set.get("f"),
			);
		});
	});

	describe("suggestions", () => {
		it("provides suggestion information for tools to use", () => {
			linter.defineRule("rule-with-suggestions", {
				meta: { hasSuggestions: true },
				create: context => ({
					Program(node) {
						context.report({
							node,
							message: "Incorrect spacing",
							suggest: [
								{
									desc: "Insert space at the beginning",
									fix: fixer =>
										fixer.insertTextBefore(node, " "),
								},
								{
									desc: "Insert space at the end",
									fix: fixer =>
										fixer.insertTextAfter(node, " "),
								},
							],
						});
					},
				}),
			});

			const messages = linter.verify("var a = 1;", {
				rules: { "rule-with-suggestions": "error" },
			});
			const suppressedMessages = linter.getSuppressedMessages();

			assert.deepStrictEqual(messages[0].suggestions, [
				{
					desc: "Insert space at the beginning",
					fix: {
						range: [0, 0],
						text: " ",
					},
				},
				{
					desc: "Insert space at the end",
					fix: {
						range: [10, 10],
						text: " ",
					},
				},
			]);

			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("supports messageIds for suggestions", () => {
			linter.defineRule("rule-with-suggestions", {
				meta: {
					messages: {
						suggestion1: "Insert space at the beginning",
						suggestion2: "Insert space at the end",
					},
					hasSuggestions: true,
				},
				create: context => ({
					Program(node) {
						context.report({
							node,
							message: "Incorrect spacing",
							suggest: [
								{
									messageId: "suggestion1",
									fix: fixer =>
										fixer.insertTextBefore(node, " "),
								},
								{
									messageId: "suggestion2",
									fix: fixer =>
										fixer.insertTextAfter(node, " "),
								},
							],
						});
					},
				}),
			});

			const messages = linter.verify("var a = 1;", {
				rules: { "rule-with-suggestions": "error" },
			});
			const suppressedMessages = linter.getSuppressedMessages();

			assert.deepStrictEqual(messages[0].suggestions, [
				{
					messageId: "suggestion1",
					desc: "Insert space at the beginning",
					fix: {
						range: [0, 0],
						text: " ",
					},
				},
				{
					messageId: "suggestion2",
					desc: "Insert space at the end",
					fix: {
						range: [10, 10],
						text: " ",
					},
				},
			]);

			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should throw an error if suggestion is passed but `meta.hasSuggestions` property is not enabled", () => {
			linter.defineRule("rule-with-suggestions", {
				meta: { docs: {}, schema: [] },
				create: context => ({
					Program(node) {
						context.report({
							node,
							message: "hello world",
							suggest: [
								{
									desc: "convert to foo",
									fix: fixer =>
										fixer.insertTextBefore(node, " "),
								},
							],
						});
					},
				}),
			});

			throws(() => {
				linter.verify("0", {
					rules: { "rule-with-suggestions": "error" },
				});
			}, "Rules with suggestions must set the `meta.hasSuggestions` property to `true`.");
		});

		it("should throw an error if suggestion is passed but `meta.hasSuggestions` property is not enabled and the rule has the obsolete `meta.docs.suggestion` property", () => {
			linter.defineRule("rule-with-meta-docs-suggestion", {
				meta: { docs: { suggestion: true }, schema: [] },
				create: context => ({
					Program(node) {
						context.report({
							node,
							message: "hello world",
							suggest: [
								{
									desc: "convert to foo",
									fix: fixer =>
										fixer.insertTextBefore(node, " "),
								},
							],
						});
					},
				}),
			});

			throws(() => {
				linter.verify("0", {
					rules: { "rule-with-meta-docs-suggestion": "error" },
				});
			}, "Rules with suggestions must set the `meta.hasSuggestions` property to `true`. `meta.docs.suggestion` is ignored by ESLint.");
		});
	});

	describe("mutability", () => {
		let linter1 = null;
		let linter2 = null;

		beforeEach(() => {
			linter1 = new Linter({ configType: "eslintrc" });
			linter2 = new Linter({ configType: "eslintrc" });
		});

		describe("rules", () => {
			it("with no changes, same rules are loaded", () => {
				assert.deepStrictEqual(
					Array.from(linter1.getRules().keys()),
					Array.from(linter2.getRules().keys()),
				);
			});

			it("loading rule in one doesn't change the other", () => {
				linter1.defineRule("mock-rule", {
					create: () => ({}),
				});

				assert.ok(
					linter1.getRules().has("mock-rule"),
					"mock rule is present",
				);
				assert.ok(
					!linter2.getRules().has("mock-rule"),
					"mock rule is not present",
				);
			});
		});
	});

	describe("options", () => {
		it("rules should apply meta.defaultOptions and ignore schema defaults", () => {
			linter.defineRule("my-rule", {
				meta: {
					defaultOptions: [
						{
							inBoth: "from-default-options",
							inDefaultOptions: "from-default-options",
						},
					],
					schema: {
						type: "object",
						properties: {
							inBoth: { default: "from-schema", type: "string" },
							inDefaultOptions: { type: "string" },
							inSchema: {
								default: "from-schema",
								type: "string",
							},
						},
						additionalProperties: false,
					},
				},
				create(context) {
					return {
						Program(node) {
							context.report({
								message: JSON.stringify(context.options[0]),
								node,
							});
						},
					};
				},
			});

			const config = {
				rules: {
					"my-rule": "error",
				},
			};

			const code = "";
			const messages = linter.verify(code, config);

			assert.deepStrictEqual(JSON.parse(messages[0].message), {
				inBoth: "from-default-options",
				inDefaultOptions: "from-default-options",
			});
		});
	});

	describe.skip("processors", () => {
		let receivedFilenames = [];
		let receivedPhysicalFilenames = [];

		beforeEach(() => {
			receivedFilenames = [];
			receivedPhysicalFilenames = [];

			// A rule that always reports the AST with a message equal to the source text
			linter.defineRule("report-original-text", {
				create: context => ({
					Program(ast) {
						assert.strictEqual(
							context.getFilename(),
							context.filename,
						);
						assert.strictEqual(
							context.getPhysicalFilename(),
							context.physicalFilename,
						);

						receivedFilenames.push(context.filename);
						receivedPhysicalFilenames.push(
							context.physicalFilename,
						);

						context.report({
							node: ast,
							message: context.sourceCode.text,
						});
					},
				}),
			});
		});

		describe("preprocessors", () => {
			it("should apply a preprocessor to the code, and lint each code sample separately", () => {
				const code = "foo bar baz";
				const problems = linter.verify(
					code,
					{ rules: { "report-original-text": "error" } },
					{
						// Apply a preprocessor that splits the source text into spaces and lints each word individually
						preprocess(input) {
							return input.split(" ");
						},
					},
				);

				assert.strictEqual(problems.length, 3);
				assert.deepStrictEqual(
					problems.map(problem => problem.message),
					["foo", "bar", "baz"],
				);
			});

			it("should apply a preprocessor to the code even if the preprocessor returned code block objects.", () => {
				const code = "foo bar baz";
				const problems = linter.verify(
					code,
					{ rules: { "report-original-text": "error" } },
					{
						filename,

						// Apply a preprocessor that splits the source text into spaces and lints each word individually
						preprocess(input) {
							return input.split(" ").map(text => ({
								filename: "block.js",
								text,
							}));
						},
					},
				);

				assert.strictEqual(problems.length, 3);
				assert.deepStrictEqual(
					problems.map(problem => problem.message),
					["foo", "bar", "baz"],
				);

				// filename
				assert.strictEqual(receivedFilenames.length, 3);
				assert(
					/^filename\.js[/\\]0_block\.js/u.test(receivedFilenames[0]),
				);
				assert(
					/^filename\.js[/\\]1_block\.js/u.test(receivedFilenames[1]),
				);
				assert(
					/^filename\.js[/\\]2_block\.js/u.test(receivedFilenames[2]),
				);

				// physical filename
				assert.strictEqual(receivedPhysicalFilenames.length, 3);
				assert.strictEqual(
					receivedPhysicalFilenames.every(name => name === filename),
					true,
				);
			});
		});

		describe("postprocessors", () => {
			it("should apply a postprocessor to the reported messages", () => {
				const code = "foo bar baz";

				const problems = linter.verify(
					code,
					{ rules: { "report-original-text": "error" } },
					{
						preprocess: input => input.split(" "),

						/*
						 * Apply a postprocessor that updates the locations of the reported problems
						 * to make sure they correspond to the locations in the original text.
						 */
						postprocess(problemLists) {
							problemLists.forEach(problemList =>
								assert.strictEqual(problemList.length, 1),
							);
							return problemLists.reduce(
								(combinedList, problemList, index) =>
									combinedList.concat(
										problemList.map(problem =>
											Object.assign({}, problem, {
												message:
													problem.message.toUpperCase(),
												column:
													problem.column + index * 4,
											}),
										),
									),
								[],
							);
						},
					},
				);

				assert.strictEqual(problems.length, 3);
				assert.deepStrictEqual(
					problems.map(problem => problem.message),
					["FOO", "BAR", "BAZ"],
				);
				assert.deepStrictEqual(
					problems.map(problem => problem.column),
					[1, 5, 9],
				);
			});

			it("should use postprocessed problem ranges when applying autofixes", () => {
				const code = "foo bar baz";

				linter.defineRule("capitalize-identifiers", {
					meta: {
						fixable: "code",
					},
					create(context) {
						return {
							Identifier(node) {
								if (node.name !== node.name.toUpperCase()) {
									context.report({
										node,
										message: "Capitalize this identifier",
										fix: fixer =>
											fixer.replaceText(
												node,
												node.name.toUpperCase(),
											),
									});
								}
							},
						};
					},
				});

				const fixResult = linter.verifyAndFix(
					code,
					{ rules: { "capitalize-identifiers": "error" } },
					{
						/*
						 * Apply a postprocessor that updates the locations of autofixes
						 * to make sure they correspond to locations in the original text.
						 */
						preprocess: input => input.split(" "),
						postprocess(problemLists) {
							return problemLists.reduce(
								(combinedProblems, problemList, blockIndex) =>
									combinedProblems.concat(
										problemList.map(problem =>
											Object.assign(problem, {
												fix: {
													text: problem.fix.text,
													range: problem.fix.range.map(
														rangeIndex =>
															rangeIndex +
															blockIndex * 4,
													),
												},
											}),
										),
									),
								[],
							);
						},
					},
				);

				assert.strictEqual(fixResult.fixed, true);
				assert.strictEqual(fixResult.messages.length, 0);
				assert.strictEqual(fixResult.output, "FOO BAR BAZ");
			});
		});
	});

	describe("verifyAndFix", () => {
		it("Fixes the code", () => {
			const messages = linter.verifyAndFix(
				"var a",
				{
					rules: {
						semi: 2,
					},
				},
				{ filename: "test.js" },
			);

			assert.strictEqual(
				messages.output,
				"var a;",
				"Fixes were applied correctly",
			);
			assert.ok(messages.fixed);
		});

		it("does not require a third argument", () => {
			const fixResult = linter.verifyAndFix("var a", {
				rules: {
					semi: 2,
				},
			});

			assert.deepStrictEqual(fixResult, {
				fixed: true,
				messages: [],
				output: "var a;",
			});
		});

		it("does not include suggestions in autofix results", () => {
			const fixResult = linter.verifyAndFix("var foo = /\\#/", {
				rules: {
					semi: 2,
					"no-useless-escape": 2,
				},
			});

			assert.strictEqual(fixResult.output, "var foo = /\\#/;");
			assert.strictEqual(fixResult.fixed, true);
			assert.strictEqual(
				fixResult.messages[0].suggestions.length > 0,
				true,
			);
		});

		it("does not apply autofixes when fix argument is `false`", () => {
			const fixResult = linter.verifyAndFix(
				"var a",
				{
					rules: {
						semi: 2,
					},
				},
				{ fix: false },
			);

			assert.strictEqual(fixResult.fixed, false);
		});

		it("stops fixing after 10 passes", () => {
			linter.defineRule("add-spaces", {
				meta: {
					fixable: "whitespace",
				},
				create(context) {
					return {
						Program(node) {
							context.report({
								node,
								message: "Add a space before this node.",
								fix: fixer => fixer.insertTextBefore(node, " "),
							});
						},
					};
				},
			});

			const fixResult = linter.verifyAndFix("a", {
				rules: { "add-spaces": "error" },
			});

			assert.strictEqual(fixResult.fixed, true);
			assert.strictEqual(fixResult.output, `${" ".repeat(10)}a`);
			assert.strictEqual(fixResult.messages.length, 1);
		});

		it("should throw an error if fix is passed but meta has no `fixable` property", () => {
			linter.defineRule("test-rule", {
				meta: {
					docs: {},
					schema: [],
				},
				create: context => ({
					Program(node) {
						context.report(node, "hello world", {}, () => ({
							range: [1, 1],
							text: "",
						}));
					},
				}),
			});

			throws(() => {
				linter.verify("0", { rules: { "test-rule": "error" } });
			}, /Fixable rules must set the `meta\.fixable` property to "code" or "whitespace".\nOccurred while linting <input>:1\nRule: "test-rule"$/u);
		});

		it("should throw an error if fix is passed and there is no metadata", () => {
			linter.defineRule("test-rule", {
				create: context => ({
					Program(node) {
						context.report(node, "hello world", {}, () => ({
							range: [1, 1],
							text: "",
						}));
					},
				}),
			});

			throws(() => {
				linter.verify("0", { rules: { "test-rule": "error" } });
			}, /Fixable rules must set the `meta\.fixable` property/u);
		});

		it("should throw an error if fix is passed from a legacy-format rule", () => {
			linter.defineRule("test-rule", {
				create: context => ({
					Program(node) {
						context.report(node, "hello world", {}, () => ({
							range: [1, 1],
							text: "",
						}));
					},
				}),
			});

			throws(() => {
				linter.verify("0", { rules: { "test-rule": "error" } });
			}, /Fixable rules must set the `meta\.fixable` property/u);
		});

		describe("Circular autofixes", () => {
			it("should stop fixing if a circular fix is detected", () => {
				linter.defineRules({
					"add-leading-hyphen": {
						meta: {
							fixable: "whitespace",
						},
						create(context) {
							return {
								Program(node) {
									const sourceCode = context.sourceCode;
									const hasLeadingHyphen = sourceCode
										.getText(node)
										.startsWith("-");

									if (!hasLeadingHyphen) {
										context.report({
											node,
											message: "Add leading hyphen.",
											fix(fixer) {
												return fixer.insertTextBefore(
													node,
													"-",
												);
											},
										});
									}
								},
							};
						},
					},
					"remove-leading-hyphen": {
						meta: {
							fixable: "whitespace",
						},
						create(context) {
							return {
								Program(node) {
									const sourceCode = context.sourceCode;
									const hasLeadingHyphen = sourceCode
										.getText(node)
										.startsWith("-");

									if (hasLeadingHyphen) {
										context.report({
											node,
											message: "Remove leading hyphen.",
											fix(fixer) {
												return fixer.removeRange([
													0, 1,
												]);
											},
										});
									}
								},
							};
						},
					},
				});

				const initialCode = "-a";
				const fixResult = linter.verifyAndFix(
					initialCode,
					{
						rules: {
							"add-leading-hyphen": "error",
							"remove-leading-hyphen": "error",
						},
					},
					{
						filename: "test.js",
					},
				);

				assert.strictEqual(
					fixResult.fixed,
					true,
					"Fixing was applied.",
				);
				assert.strictEqual(
					fixResult.output,
					"-a",
					"Output should match the original input due to circular fixes.",
				);
				assert.strictEqual(
					fixResult.messages.length,
					1,
					"There should be one remaining lint message after detecting circular fixes.",
				);
				assert.strictEqual(
					fixResult.messages[0].ruleId,
					"remove-leading-hyphen",
				);

				const suppressedMessages = linter.getSuppressedMessages();

				assert.strictEqual(
					suppressedMessages.length,
					0,
					"No suppressed messages should exist.",
				);
			});
		});
	});

	describe("Edge cases", () => {
		it("should properly parse import statements when sourceType is module", () => {
			const code = "import foo from 'foo';";
			const messages = linter.verify(code, {
				parserOptions: { ecmaVersion: 6, sourceType: "module" },
			});
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should properly parse import all statements when sourceType is module", () => {
			const code = "import * as foo from 'foo';";
			const messages = linter.verify(code, {
				parserOptions: { ecmaVersion: 6, sourceType: "module" },
			});
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should properly parse default export statements when sourceType is module", () => {
			const code = "export default function initialize() {}";
			const messages = linter.verify(code, {
				parserOptions: { ecmaVersion: 6, sourceType: "module" },
			});
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 0);
		});

		// https://github.com/eslint/eslint/issues/9687
		it("should report an error when invalid parserOptions found", () => {
			let messages = linter.verify("", {
				parserOptions: { ecmaVersion: 222 },
			});
			let suppressedMessages = linter.getSuppressedMessages();

			assert.deepStrictEqual(messages.length, 1);
			assert.ok(messages[0].message.includes("Invalid ecmaVersion"));
			assert.strictEqual(suppressedMessages.length, 0);

			messages = linter.verify("", {
				parserOptions: { sourceType: "foo" },
			});
			suppressedMessages = linter.getSuppressedMessages();

			assert.deepStrictEqual(messages.length, 1);
			assert.ok(messages[0].message.includes("Invalid sourceType"));
			assert.strictEqual(suppressedMessages.length, 0);

			messages = linter.verify("", {
				parserOptions: { ecmaVersion: 5, sourceType: "module" },
			});
			suppressedMessages = linter.getSuppressedMessages();

			assert.deepStrictEqual(messages.length, 1);
			assert.ok(
				messages[0].message.includes(
					"sourceType 'module' is not supported when ecmaVersion < 2015",
				),
			);
			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should not crash when invalid parentheses syntax is encountered", () => {
			linter.verify("left = (aSize.width/2) - ()");
		});

		it("should not crash when let is used inside of switch case", () => {
			linter.verify("switch(foo) { case 1: let bar=2; }", {
				parserOptions: { ecmaVersion: 6 },
			});
		});

		it("should not crash when parsing destructured assignment", () => {
			linter.verify("var { a='a' } = {};", {
				parserOptions: { ecmaVersion: 6 },
			});
		});

		it("should report syntax error when a keyword exists in object property shorthand", () => {
			const messages = linter.verify("let a = {this}", {
				parserOptions: { ecmaVersion: 6 },
			});
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(messages[0].fatal, true);

			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should not rewrite env setting in core (https://github.com/eslint/eslint/issues/4814)", () => {
			/*
			 * This test focuses on the instance of https://github.com/eslint/eslint/blob/v2.0.0-alpha-2/conf/environments.js#L26-L28
			 * This `verify()` takes the instance and runs https://github.com/eslint/eslint/blob/v2.0.0-alpha-2/lib/eslint.js#L416
			 */
			linter.defineRule("test", {
				create: () => ({}),
			});
			linter.verify("var a = 0;", {
				env: { node: true },
				parserOptions: { ecmaVersion: 6, sourceType: "module" },
				rules: { test: 2 },
			});

			// This `verify()` takes the instance and tests that the instance was not modified.
			let ok = false;

			linter.defineRule("test", {
				create(context) {
					assert(
						context.parserOptions.ecmaFeatures.globalReturn,
						"`ecmaFeatures.globalReturn` of the node environment should not be modified.",
					);
					ok = true;
					return {};
				},
			});
			linter.verify("var a = 0;", {
				env: { node: true },
				rules: { test: 2 },
			});

			assert(ok);
		});

		it("should throw when rule's create() function does not return an object", () => {
			const config = { rules: { checker: "error" } };

			linter.defineRule("checker", {
				create: () => null,
			}); // returns null

			throws(() => {
				linter.verify("abc", config, filename);
			}, "The create() function for rule 'checker' did not return an object.");

			linter.defineRule("checker", {
				create() {},
			}); // returns undefined

			throws(() => {
				linter.verify("abc", config, filename);
			}, "The create() function for rule 'checker' did not return an object.");
		});
	});

	describe("Custom parser", () => {
		const errorPrefix = "Parsing error: ";

		it("should not report an error when JSX code contains a spread operator and JSX is enabled", () => {
			const code = "var myDivElement = <div {...this.props} />;";

			linter.defineParser("esprima", esprima);
			const messages = linter.verify(
				code,
				{ parser: "esprima", parserOptions: { jsx: true } },
				"filename",
			);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 0);
		});

		it("should return an error when the custom parser can't be found", () => {
			const code = "var myDivElement = <div {...this.props} />;";
			const messages = linter.verify(
				code,
				{ parser: "esprima-xyz" },
				"filename",
			);
			const suppressedMessages = linter.getSuppressedMessages();

			assert.strictEqual(messages.length, 1);
			assert.strictEqual(messages[0].severity, 2);
			assert.strictEqual(
				messages[0].message,
				"Configured parser 'esprima-xyz' was not found.",
			);

			assert.strictEqual(suppressedMessages.length, 0);
		});
	});

	describe("merging 'parserOptions'", () => {
		it.skip("should deeply merge 'parserOptions' from an environment with 'parserOptions' from the provided config", () => {
			const code = "return <div/>";
			const config = {
				env: {
					node: true, // ecmaFeatures: { globalReturn: true }
				},
				parserOptions: {
					ecmaFeatures: {
						jsx: true,
					},
				},
			};

			const messages = linter.verify(code, config);
			const suppressedMessages = linter.getSuppressedMessages();

			// no parsing errors
			assert.strictEqual(messages.length, 0);
			assert.strictEqual(suppressedMessages.length, 0);
		});
	});
});
