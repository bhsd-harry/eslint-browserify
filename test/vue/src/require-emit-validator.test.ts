/**
 * @fileoverview Emit definitions should be detailed
 * @author Pig Fang
 */
const rule = 'eslint-plugin-vue';
import { RuleTester } from '../../rule-tester.js';
import vueEslintParser from 'vue-eslint-parser';

const ruleTester = new RuleTester();
ruleTester.run('require-emit-validator', rule, {
  valid: [
    {
      filename: 'test.vue',
      code: `
        export default {
          ...foo,
          emits: {
            ...test(),
            foo: (payload) => typeof payload === 'object'
          }
        }
      `,
      languageOptions: { ecmaVersion: 2018, sourceType: 'module' },
    },
    {
      filename: 'test.vue',
      code: `
        export default {
          emits: {
            foo: (payload) => typeof payload === 'object'
          }
        }
      `,
      languageOptions: { ecmaVersion: 6, sourceType: 'module' },
    },
    {
      filename: 'test.vue',
      code: `
        export default {
          emits: {
            foo(payload) {
              return typeof payload === 'object'
            }
          }
        }
      `,
      languageOptions: { ecmaVersion: 6, sourceType: 'module' },
    },
    {
      filename: 'test.vue',
      code: `
        export default {
          emits: {
            foo: () => {}
          }
        }
      `,
      languageOptions: { ecmaVersion: 6, sourceType: 'module' },
    },
    {
      filename: 'test.vue',
      code: `
        export default {
          emits: {
            foo() {}
          }
        }
      `,
      languageOptions: { ecmaVersion: 6, sourceType: 'module' },
    },
    {
      filename: 'test.vue',
      code: `
        export default {
          emits
        }
      `,
      languageOptions: { ecmaVersion: 6, sourceType: 'module' },
    },
    {
      filename: 'test.vue',
      code: `
        export default {
          emits: externalEmits
        }
      `,
      languageOptions: { ecmaVersion: 6, sourceType: 'module' },
    },
    {
      filename: 'test.vue',
      code: `
        export default {
          emits: []
        }
      `,
      languageOptions: { ecmaVersion: 6, sourceType: 'module' },
    },
    {
      filename: 'test.vue',
      code: `
        export default {
          emits: {}
        }
      `,
      languageOptions: { ecmaVersion: 6, sourceType: 'module' },
    },
    {
      filename: 'test.vue',
      code: `
        function foo () {}
        export default {
          emits: {
            foo
          }
        }
      `,
      languageOptions: { ecmaVersion: 6, sourceType: 'module' },
    },
    {
      filename: 'test.vue',
      code: `
        import { isNumber } from './mod'
        export default {
          emits: {
            foo: isNumber
          }
        }
      `,
      languageOptions: { ecmaVersion: 6, sourceType: 'module' },
    },
  ],

  invalid: [
    {
      filename: 'test.vue',
      code: `
        export default {
          emits: ['foo', bar, \`baz\`, foo()]
        }
      `,
      languageOptions: { ecmaVersion: 6, sourceType: 'module' },
      errors: [
        {
          messageId: 'missing',
          data: { name: 'foo' },
          line: 3,
          column: 19,
          endLine: 3,
          endColumn: 24,
        },
        {
          messageId: 'missing',
          data: { name: 'bar' },
          line: 3,
          column: 26,
          endLine: 3,
          endColumn: 29,
        },
        {
          messageId: 'missing',
          data: { name: 'baz' },
          line: 3,
          column: 31,
          endLine: 3,
          endColumn: 36,
        },
        {
          messageId: 'missing',
          data: { name: 'Unknown emit' },
          line: 3,
          column: 38,
          endLine: 3,
          endColumn: 43,
        },
      ],
    },
    {
      filename: 'test.js',
      code: `
        new Vue({
          emits: ['foo', bar, \`baz\`, foo()]
        })
      `,
      languageOptions: { ecmaVersion: 6, sourceType: 'module' },
      errors: [
        {
          messageId: 'missing',
          data: { name: 'foo' },
          line: 3,
          column: 19,
          endLine: 3,
          endColumn: 24,
        },
        {
          messageId: 'missing',
          data: { name: 'bar' },
          line: 3,
          column: 26,
          endLine: 3,
          endColumn: 29,
        },
        {
          messageId: 'missing',
          data: { name: 'baz' },
          line: 3,
          column: 31,
          endLine: 3,
          endColumn: 36,
        },
        {
          messageId: 'missing',
          data: { name: 'Unknown emit' },
          line: 3,
          column: 38,
          endLine: 3,
          endColumn: 43,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `
        export default {
          emits: {
            foo: null
          }
        }`,
      languageOptions: { ecmaVersion: 6, sourceType: 'module' },
      errors: [
        {
          messageId: 'skipped',
          data: { name: 'foo' },
          line: 4,
          column: 13,
          endLine: 4,
          endColumn: 22,
          suggestions: [
            {
              messageId: 'emptyValidation',
              output: `
        export default {
          emits: {
            foo: () => true
          }
        }`,
            },
          ],
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `
        export default {
          emits: {
            foo: null,
            bar: (payload) => {}
          }
        }`,
      languageOptions: { ecmaVersion: 6, sourceType: 'module' },
      errors: [
        {
          messageId: 'skipped',
          data: { name: 'foo' },
          line: 4,
          column: 13,
          endLine: 4,
          endColumn: 22,
          suggestions: [
            {
              messageId: 'emptyValidation',
              output: `
        export default {
          emits: {
            foo: () => true,
            bar: (payload) => {}
          }
        }`,
            },
          ],
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `
        export default {
          emits: {
            foo: {
              type: String
            }
          }
        }
      `,
      languageOptions: { ecmaVersion: 6, sourceType: 'module' },
      errors: [
        {
          messageId: 'missing',
          data: { name: 'foo' },
          line: 4,
          column: 13,
          endLine: 6,
          endColumn: 14,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `
      <script setup>
      const emit = defineEmits(['foo'])
      </script>
      `,
      languageOptions: {
        parser: vueEslintParser,
        ecmaVersion: 6,
        sourceType: 'module',
      },
      errors: [
        {
          messageId: 'missing',
          data: { name: 'foo' },
          line: 3,
          column: 33,
          endLine: 3,
          endColumn: 38,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `
      <script setup>
      const emit = defineEmits({foo:null})
      </script>
      `,
      languageOptions: {
        parser: vueEslintParser,
        ecmaVersion: 6,
        sourceType: 'module',
      },
      errors: [
        {
          messageId: 'skipped',
          data: { name: 'foo' },
          line: 3,
          column: 33,
          endLine: 3,
          endColumn: 41,
          suggestions: [
            {
              messageId: 'emptyValidation',
              output: `
      <script setup>
      const emit = defineEmits({foo:() => true})
      </script>
      `,
            },
          ],
        },
      ],
    },
  ],
});
