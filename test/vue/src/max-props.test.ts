/**
 * @author kevsommer Kevin Sommer
 * See LICENSE file in root directory for full license.
 */
import { RuleTester } from '../../rule-tester.js';
const rule = 'eslint-plugin-vue';
import vueEslintParser from 'vue-eslint-parser';

const tester = new RuleTester({
  languageOptions: {
    parser: vueEslintParser,
    ecmaVersion: 2020,
    sourceType: 'module',
  },
});

tester.run('max-props', rule, {
  valid: [
    {
      filename: 'test.vue',
      code: `
      <script setup>
      defineProps({ prop1: '', prop2: '' })
      </script>
      `,
      options: [{ maxProps: 5 }],
    },
    {
      filename: 'test.vue',
      code: `
      <script setup>
      defineProps(['prop1', 'prop2'])
      </script>
      `,
      options: [{ maxProps: 5 }],
    },
    {
      filename: 'test.vue',
      code: `
      <script>
      export default {
        props: {
          prop1: String,
          prop2: String
        }
      }
      </script>
      `,
      options: [{ maxProps: 5 }],
    },
    {
      filename: 'test.vue',
      code: `
      <script>
      export default {
        props: {
          prop1: String,
          prop2: String,
          prop3: String,
          prop4: String,
          prop5: String
        }
      }
      </script>
      `,
      options: [{ maxProps: 5 }],
    },
    {
      filename: 'test.vue',
      code: `
      <script>
      export default {
        props: {}
      }
      </script>
      `,
      options: [{ maxProps: 5 }],
    },
    {
      filename: 'test.vue',
      code: `
      <script setup>
      defineProps({})
      </script>
      `,
      options: [{ maxProps: 5 }],
    },
    {
      filename: 'test.vue',
      code: `
      <script>
      </script>
      `,
      options: [{ maxProps: 5 }],
    },
  ],
  invalid: [
    {
      filename: 'test.vue',
      code: `
      <script setup>
      defineProps({ prop1: '', prop2: '' })
      </script>
      `,
      options: [{ maxProps: 1 }],
      errors: [
        {
          message: 'Component has too many props (2). Maximum allowed is 1.',
          line: 3,
          column: 7,
          endLine: 3,
          endColumn: 44,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `
      <script>
      export default {
        props: {
          prop1: String,
          prop2: String
        }
      }
      </script>
      `,
      options: [{ maxProps: 1 }],
      errors: [
        {
          message: 'Component has too many props (2). Maximum allowed is 1.',
          line: 4,
          column: 9,
          endLine: 7,
          endColumn: 10,
        },
      ],
    },
  ],
});
