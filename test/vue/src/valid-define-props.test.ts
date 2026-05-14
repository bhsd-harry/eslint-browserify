/**
 * @author Yosuke Ota <https://github.com/ota-meshi>
 * See LICENSE file in root directory for full license.
 */
import { RuleTester } from '../../rule-tester.js';
const rule = 'eslint-plugin-vue';
import vueEslintParser from 'vue-eslint-parser';

const tester = new RuleTester({
  languageOptions: {
    parser: vueEslintParser,
    ecmaVersion: 2015,
    sourceType: 'module',
  },
});

tester.run('valid-define-props', rule, {
  valid: [
    {
      filename: 'test.vue',
      code: `
      <script setup>
        /* ✓ GOOD */
        defineProps({ msg: String })
      </script>
      `,
    },
    {
      filename: 'test.vue',
      code: `
      <script setup>
        /* ✓ GOOD */
        defineProps(['msg'])
      </script>
      `,
    },
    {
      filename: 'test.vue',
      code: `
      <script>
        const def = { msg: String }
      </script>
      <script setup>
        /* ✓ GOOD */
        defineProps(def)
      </script>
      `,
    },
    {
      filename: 'test.vue',
      code: `
      <script setup>
        defineProps({
          addFunction: {
            type: Function,
            default (a, b) {
              return a + b
            }
          }
        })
      </script>
      `,
    },
    {
      filename: 'test.vue',
      code: `
      <script setup>
      import { propsDef, emitsDef } from './defs';

      defineProps(propsDef);
      defineEmits(emitsDef);
      </script>`,
    },
  ],
  invalid: [
    {
      filename: 'test.vue',
      code: `
      <script setup>
        /* ✗ BAD */
        const def = { msg: String }
        defineProps(def)
      </script>
      `,
      errors: [
        {
          message: '`defineProps` is referencing locally declared variables.',
          line: 5,
          column: 21,
          endLine: 5,
          endColumn: 24,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `
      <script setup>
        /* ✗ BAD */
        defineProps({ msg: String })
        defineProps({ count: Number })
      </script>
      `,
      errors: [
        {
          message: '`defineProps` has been called multiple times.',
          line: 4,
          column: 9,
          endLine: 4,
          endColumn: 37,
        },
        {
          message: '`defineProps` has been called multiple times.',
          line: 5,
          column: 9,
          endLine: 5,
          endColumn: 39,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `
      <script>
      export default {
        props: { msg: String }
      }
      </script>
      <script setup>
        /* ✗ BAD */
        defineProps({ count: Number })
      </script>
      `,
      errors: [
        {
          message:
            'Props are defined in both `defineProps` and `export default {}`.',
          line: 9,
          column: 9,
          endLine: 9,
          endColumn: 39,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `
      <script setup>
        /* ✗ BAD */
        defineProps()
      </script>
      `,
      errors: [
        {
          message: 'Props are not defined.',
          line: 4,
          column: 9,
          endLine: 4,
          endColumn: 22,
        },
      ],
    },
  ],
});
