# ESLint-browserify

[![npm version](https://badge.fury.io/js/@bhsd%2Feslint-browserify.svg)](https://www.npmjs.com/package/@bhsd/eslint-browserify)
[![License](https://img.shields.io/badge/License-MIT-brightgreen.svg)](LICENSE)

# API

The `eslint` global variable has a `Linter` constructor.

```js
const linter = new eslint.Linter();
```

## Linter

The `Linter` instance does the actual evaluation of the JavaScript code. It parses and reports on the code.

### Linter#verify

The most important method on `Linter` is `verify()`, which initiates linting of the given text. This method accepts three arguments:

- `code` - the source code to lint (a string).
- `config` - a [Configuration object](https://eslint.org/docs/v8.x/use/configure/) or an array of configuration objects.

You can call `verify()` like this:

```js
const linter = new eslint.Linter();

const messages = linter.verify(
	"var foo",
	{
		rules: {
			semi: 2,
		},
	},
);
```

The `verify()` method returns an array of objects containing information about the linting warnings and errors. Here's an example:

```js
[
	{
		fatal: false,
		ruleId: "semi",
		severity: 2,
		line: 1,
		column: 8,
		message: "Missing semicolon.",
		fix: {
			range: [7, 7],
			text: ";",
		},
	},
];
```

The information available for each linting message is:

- `column` - the column on which the error occurred.
- `fatal` - usually omitted, but will be set to true if there's a parsing error (not related to a rule).
- `line` - the line on which the error occurred.
- `message` - the message that should be output.
- `messageId` - the ID of the message used to generate the message (this property is omitted if the rule does not use message IDs).
- `ruleId` - the ID of the rule that triggered the messages (or null if `fatal` is true).
- `severity` - either 1 or 2, depending on your configuration.
- `endColumn` - the end column of the range on which the error occurred (this property is omitted if it's not range).
- `endLine` - the end line of the range on which the error occurred (this property is omitted if it's not range).
- `fix` - an object describing the fix for the problem (this property is omitted if no fix is available).

### Linter#verifyAndFix()

This method is similar to verify except that it also runs autofixing logic, similar to the `--fix` flag on the command line. The result object will contain the autofixed code, along with any remaining linting messages for the code that were not autofixed.

```js
const linter = new eslint.Linter();

const messages = linter.verifyAndFix("var foo", {
	rules: {
		semi: 2,
	},
});
```

Output object from this method:

```js
{
    fixed: true,
    output: "var foo;",
    messages: []
}
```

The information available is:

- `fixed` - True, if the code was fixed.
- `output` - Fixed code text (might be the same as input if no fixes were applied).
- `messages` - Collection of all messages for the given code (It has the same information as explained above under `verify` block).
