/**
 * @author Yosuke Ota
 * See LICENSE file in root directory for full license.
 */
const rule = 'eslint-plugin-vue';
import { RuleTester } from '../../rule-tester.js';
import vueEslintParser from 'vue-eslint-parser';

const ruleTester = new RuleTester({
  languageOptions: { parser: vueEslintParser, ecmaVersion: 2020 },
});

ruleTester.run('no-deprecated-vue-config-keycodes', rule, {
  valid: [
    {
      filename: 'test.js',
      code: `Vue.config.silent = true`,
    },
    {
      filename: 'test.js',
      code: 'config.keyCodes = {}',
    },
    {
      filename: 'test.js',
      code: 'V.config.keyCodes = {}',
    },
  ],

  invalid: [
    {
      filename: 'test.js',
      code: 'Vue.config.keyCodes = {}',
      errors: [
        {
          message: '`Vue.config.keyCodes` are deprecated.',
          line: 1,
          column: 1,
          // messageId: 'unexpected',
          endLine: 1,
          endColumn: 20,
        },
      ],
    },
    {
      filename: 'test.js',
      code: 'Vue?.config?.keyCodes',
      errors: [
        {
          message: '`Vue.config.keyCodes` are deprecated.',
          line: 1,
          column: 1,
          endLine: 1,
          endColumn: 22,
        },
      ],
    },
    {
      filename: 'test.js',
      code: '(Vue?.config)?.keyCodes',
      errors: [
        {
          message: '`Vue.config.keyCodes` are deprecated.',
          line: 1,
          column: 1,
          endLine: 1,
          endColumn: 24,
        },
      ],
    },
  ],
});
