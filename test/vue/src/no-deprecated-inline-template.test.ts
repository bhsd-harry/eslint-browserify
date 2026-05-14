/**
 * @author Yosuke Ota
 * See LICENSE file in root directory for full license.
 */
const rule = 'eslint-plugin-vue';
import { RuleTester } from '../../rule-tester.js';
import vueEslintParser from 'vue-eslint-parser';

const ruleTester = new RuleTester({
  languageOptions: { parser: vueEslintParser, ecmaVersion: 2019 },
});

ruleTester.run('no-deprecated-inline-template', rule, {
  valid: [
    {
      filename: 'test.vue',
      code: '<template><my-component><div /></my-component></template>',
    },
    {
      filename: 'test.vue',
      code: '<template><div /></template>',
    },
    {
      filename: 'test.vue',
      code: '<template><my-component :inline-template="foo"><div /></my-component></template>',
    },
    {
      filename: 'test.vue',
      code: '<template><my-component Inline-Template="foo"><div /></my-component></template>',
    },
  ],

  invalid: [
    {
      filename: 'test.vue',
      code: '<template><my-component inline-template><div /></my-component></template>',
      errors: [
        {
          messageId: 'unexpected',
          line: 1,
          column: 25,
          endLine: 1,
          endColumn: 40,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: '<template><my-component inline-template=""><div /></my-component></template>',
      errors: [
        {
          messageId: 'unexpected',
          line: 1,
          column: 25,
          endLine: 1,
          endColumn: 40,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: '<template><my-component inline-template="foo"><div /></my-component></template>',
      errors: [
        {
          messageId: 'unexpected',
          line: 1,
          column: 25,
          endLine: 1,
          endColumn: 40,
        },
      ],
    },
  ],
});
