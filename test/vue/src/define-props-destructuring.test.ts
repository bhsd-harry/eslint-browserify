/**
 * @author Wayne Zhang
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

tester.run('define-props-destructuring', rule, {
  valid: [
    {
      filename: 'test.vue',
      code: `
      <script setup>
      const props = defineProps()
      </script>
      `,
    },
    {
      filename: 'test.vue',
      code: `
      <script setup>
      const { foo = 'default' } = defineProps(['foo'])
      </script>
      `,
    },
    {
      filename: 'test.vue',
      code: `
      <script setup>
      const props = defineProps(['foo'])
      </script>
      `,
      options: [{ destructure: 'never' }],
    },
    {
      filename: 'test.vue',
      code: `
      <script setup>
      const props = withDefaults(defineProps(['foo']), { foo: 'default' })
      </script>
      `,
      options: [{ destructure: 'never' }],
    },
    {
      filename: 'test.vue',
      code: `
      <script setup>
      defineProps(['foo'])
      </script>
      `,
    },
  ],
  invalid: [
    {
      filename: 'test.vue',
      code: `
      <script setup>
      const props = defineProps(['foo'])
      </script>
      `,
      errors: [
        {
          messageId: 'preferDestructuring',
          line: 3,
          column: 21,
          endLine: 3,
          endColumn: 41,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `
      <script setup>
      const props = withDefaults(defineProps(['foo']), { foo: 'default' })
      </script>
      `,
      errors: [
        {
          messageId: 'preferDestructuring',
          line: 3,
          column: 34,
          endLine: 3,
          endColumn: 54,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `
      <script setup>
      const { foo } = withDefaults(defineProps(['foo']), { foo: 'default' })
      </script>
      `,
      errors: [
        {
          messageId: 'avoidWithDefaults',
          line: 3,
          column: 23,
          endLine: 3,
          endColumn: 35,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `
      <script setup>
      const { foo } = defineProps(['foo'])
      </script>
      `,
      options: [{ destructure: 'never' }],
      errors: [
        {
          messageId: 'avoidDestructuring',
          line: 3,
          column: 23,
          endLine: 3,
          endColumn: 43,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `
      <script setup>
      const { foo } = withDefaults(defineProps(['foo']), { foo: 'default' })
      </script>
      `,
      options: [{ destructure: 'never' }],
      errors: [
        {
          messageId: 'avoidDestructuring',
          line: 3,
          column: 36,
          endLine: 3,
          endColumn: 56,
        },
      ],
    },
  ],
});
