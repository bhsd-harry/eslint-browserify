# ESLint-browserify

[![npm version](https://badge.fury.io/js/@bhsd%2Feslint-browserify.svg)](https://www.npmjs.com/package/@bhsd/eslint-browserify)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/f8d073568955481f9aa7acbc9484c8a6)](https://app.codacy.com/gh/bhsd-harry/eslint-browserify/dashboard)
![Coverage](./coverage/badge.svg)

## API

The `eslint` global variable has two constructors: [`Linter`](#linter) and
[`LegacyLinter`](#legacylinter).

```js
const linter = new eslint.Linter(); // Use this for flat config
const legacyLinter = new eslint.LegacyLinter(); // Use this for legacy eslintrc config
```

The `eslint` global variable also has an async `loadPlugin()` method that can be
used to load plugins lazily. Currently, [eslint-plugin-vue](#vue-support) is supported.

## Vue support

For Vue code linting, [eslint-plugin-vue](https://eslint.vuejs.org/) can be lazy-loaded:

```js
await eslint.loadPlugin('vue');
// or:
await eslint.loadPlugin('eslint-plugin-vue');
```

After loading, you can use [Vue preset configurations](https://eslint.vuejs.org/user-guide/#bundle-configurations-eslint-config-js)
via legacy eslintrc [`extends`](https://eslint.org/docs/v9.x/use/configure/configuration-files-deprecated#extending-configuration-files),
and use [Vue rules](https://eslint.vuejs.org/rules/) directly.

For [flat config](https://eslint.org/docs/latest/use/configure/configuration-files#configuration-objects),
this bundle currently exposes only `*.configs.base`.

```js
// Legacy eslintrc preset configuration
const eslintrc = {
	extends: ['plugin:vue/essential'],
};

// Flat config (base + explicit rules)
const {vue} = eslint.plugins;
const flatConfig = [
	...vue.configs.base,
	{
		rules: {
			'vue/valid-v-if': 2,
		},
	},
];
```

## Linter

The `Linter` instance does the actual evaluation of the JavaScript code. It
parses and reports on the code.

### Linter#verify

The most important method on `Linter` is `verify()`, which initiates linting of
the given text. This method accepts two arguments:

- `code` - the source code to lint (a string).
- `config` - flat config: a [configuration object](https://eslint.org/docs/latest/use/configure/configuration-files#configuration-objects)
  or an array of configuration objects.

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

The `verify()` method returns an array of objects containing information about
the linting warnings and errors. Here's an example:

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
- `fatal` - usually omitted, but will be set to true if there's a parsing error
  (not related to a rule).
- `line` - the line on which the error occurred.
- `message` - the message that should be output.
- `messageId` - the ID of the message used to generate the message (this
  property is omitted if the rule does not use message IDs).
- `ruleId` - the ID of the rule that triggered the messages (or null if `fatal`
  is true).
- `severity` - either 1 or 2, depending on your configuration.
- `endColumn` - the end column of the range on which the error occurred (this
  property is omitted if it's not range).
- `endLine` - the end line of the range on which the error occurred (this
  property is omitted if it's not range).
- `fix` - an object describing the fix for the problem (this property is omitted
  if no fix is available).
- `suggestions` - an array of objects describing possible lint fixes for editors
  to programmatically enable.

### Linter#verifyAndFix

This method is similar to [`verify`](#linterverify) except that it also runs
autofixing logic, similar to the `--fix` flag on the command line. The result
object will contain the autofixed code, along with any remaining linting
messages for the code that were not autofixed.

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

- `fixed` - true, if the code was fixed.
- `output` - fixed code text (might be the same as input if no fixes were applied).
- `messages` - collection of all messages for the given code (It has the same
  information as explained above under [`verify`](#linterverify) block).

## LegacyLinter

Similar to [`Linter`](#linter), the `LegacyLinter` instance reports on the code
with a `verify()` method and a `verifyAndFix()` method. The difference is that
it uses the legacy [eslintrc](https://eslint.org/docs/v9.x/use/configure/configuration-files-deprecated)
configuration format instead of the flat config format, and a preset
configuration [`eslint:recommended`](https://eslint.org/docs/v9.x/use/configure/configuration-files-deprecated#using-eslintrecommended)
can be used directly with [`extends`](https://eslint.org/docs/v9.x/use/configure/configuration-files-deprecated#extending-configuration-files).

```js
const linter = new eslint.LegacyLinter();

const messages = linter.verify(
	"var foo",
	{
		extends: ['eslint:recommended'],
	},
);

await eslint.loadPlugin('vue');
const vueMessages = linter.verify(
	"<template><div v-if /></template>",
	{
		extends: ['plugin:vue/essential'],
	},
);
```
