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

ruleTester.run('no-deprecated-functional-template', rule, {
  valid: [
    {
      filename: 'test.vue',
      code: '<template></template>',
    },
    {
      filename: 'test.vue',
      code: '<template><div /></template>',
    },
    {
      filename: 'test.vue',
      code: '<template f><div /></template>',
    },
  ],

  invalid: [
    {
      filename: 'test.vue',
      code: '<template functional></template>',
      errors: [
        {
          messageId: 'unexpected',
          line: 1,
          column: 11,
          endLine: 1,
          endColumn: 21,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: '<template functional><div /></template>',
      errors: [
        {
          messageId: 'unexpected',
          line: 1,
          column: 11,
          endLine: 1,
          endColumn: 21,
        },
      ],
    },
  ],
});
