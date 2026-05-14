/**
 * @author neferqiqi
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

tester.run('no-required-prop-with-default', rule, {
  valid: [
    {
      filename: 'test.vue',
      code: `
        <script>
        export default {
          props: {
            name: {
              required: false,
              default: 'Hello'
            }
          }
        }
        </script>
      `,
    },
    // ignore array prop
    {
      filename: 'test.vue',
      code: `
        <script>
        export default {
          props: ['name']
        }
        </script>
      `,
    },
    {
      filename: 'test.vue',
      code: `
        <script setup>
          const props = defineProps({
            name: {
              required: false,
              default: 'Hello'
            }
          })
        </script>
      `,
    },
    {
      filename: 'test.vue',
      code: `
        <script setup>
          const {name='Hello'} = defineProps({
            name: {
              required: false
            }
          })
        </script>
      `,
    },
  ],
  invalid: [
    {
      filename: 'test.vue',
      code: `
        <script>
        export default {
          props: {
            name: {
              required: true,
              default: 'Hello'
            }
          }
        }
        </script>
      `,
      output: `
        <script>
        export default {
          props: {
            name: {
              required: false,
              default: 'Hello'
            }
          }
        }
        </script>
      `,
      options: [{ autofix: true }],
      errors: [
        {
          message: 'Prop "name" should be optional.',
          line: 5,
          column: 13,
          endLine: 8,
          endColumn: 14,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `
        <script>
        export default {
          props: {
            'name': {
              required: true,
              default: 'Hello'
            }
          }
        }
        </script>
      `,
      output: `
        <script>
        export default {
          props: {
            'name': {
              required: false,
              default: 'Hello'
            }
          }
        }
        </script>
      `,
      options: [{ autofix: true }],
      errors: [
        {
          message: 'Prop "name" should be optional.',
          line: 5,
          column: 13,
          endLine: 8,
          endColumn: 14,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `
        <script>
        import { defineComponent } from 'vue'
        export default defineComponent({
          props: {
            'name': {
              required: true,
              default: 'Hello'
            }
          }
        })
        </script>
      `,
      output: `
        <script>
        import { defineComponent } from 'vue'
        export default defineComponent({
          props: {
            'name': {
              required: false,
              default: 'Hello'
            }
          }
        })
        </script>
      `,
      options: [{ autofix: true }],
      errors: [
        {
          message: 'Prop "name" should be optional.',
          line: 6,
          column: 13,
          endLine: 9,
          endColumn: 14,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `
        <script>
        import { defineComponent } from 'vue'
        export default defineComponent({
          props: {
            name: {
              required: true,
              default: 'Hello'
            }
          }
        })
        </script>
      `,
      output: `
        <script>
        import { defineComponent } from 'vue'
        export default defineComponent({
          props: {
            name: {
              required: false,
              default: 'Hello'
            }
          }
        })
        </script>
      `,
      options: [{ autofix: true }],
      errors: [
        {
          message: 'Prop "name" should be optional.',
          line: 6,
          column: 13,
          endLine: 9,
          endColumn: 14,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `
        <script>
        import { defineComponent } from 'vue'
        export default defineComponent({
          props: {
            name: {
              required: true,
              default: 'Hello'
            }
          }
        })
        </script>
      `,
      output: null,
      errors: [
        {
          message: 'Prop "name" should be optional.',
          line: 6,
          column: 13,
          endLine: 9,
          endColumn: 14,
          suggestions: [
            {
              messageId: 'fixRequiredProp',
              output: `
        <script>
        import { defineComponent } from 'vue'
        export default defineComponent({
          props: {
            name: {
              required: false,
              default: 'Hello'
            }
          }
        })
        </script>
      `,
            },
          ],
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `
        <script setup>
          const props = defineProps({
            name: {
              required: true,
              default: 'Hello'
            }
          })
        </script>
      `,
      output: `
        <script setup>
          const props = defineProps({
            name: {
              required: false,
              default: 'Hello'
            }
          })
        </script>
      `,
      options: [{ autofix: true }],
      errors: [
        {
          message: 'Prop "name" should be optional.',
          line: 4,
          column: 13,
          endLine: 7,
          endColumn: 14,
        },
      ],
    },
  ],
});
