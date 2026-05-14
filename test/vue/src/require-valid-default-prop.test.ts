/**
 * @fileoverview Enforces props default values to be valid.
 * @author Armano
 */
import type { Linter } from 'eslint';
const rule = 'eslint-plugin-vue';
import { RuleTester } from '../../rule-tester.js';
import vueEslintParser from 'vue-eslint-parser';

const languageOptions: Linter.LanguageOptions = {
  ecmaVersion: 2020,
  sourceType: 'module',
};

const ruleTester = new RuleTester();
ruleTester.run('require-valid-default-prop', rule, {
  valid: [
    {
      filename: 'test.vue',
      code: `export default {
        ...foo,
        props: { ...foo }
      }`,
      languageOptions,
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: { foo: null }
      }`,
      languageOptions,
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: ['foo']
      }`,
      languageOptions,
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: [Object, Number],
            default: 10
          }
        }
      }`,
      languageOptions,
    },
    {
      filename: 'test.vue',
      code: `Vue.component('example', {
        props: {
          foo: null,
          foo: Number,
          foo: [String, Number],
          foo: { },
          foo: { type: String },
          foo: { type: Number, default: VAR_BAR },
          foo: { type: Number, default: 100 },
          foo: { type: Number, default: Number.MAX_VALUE },
          foo: { type: Number, default: Foo.BAR },
          foo: { type: {}, default: '' },
          foo: { type: [String, Number], default: '' },
          foo: { type: [String, Number], default: 0 },
          foo: { type: String, default: '' },
          foo: { type: String, default: \`\` },
          foo: { type: Boolean, default: false },
          foo: { type: Object, default: () => { } },
          foo: { type: Array, default () { } },
          foo: { type: String, default () { } },
          foo: { type: Number, default () { } },
          foo: { type: Boolean, default () { } },
          foo: { type: Symbol, default () { } },
          foo: { type: Array, default () { } },
          foo: { type: Symbol, default: Symbol('a') },
          foo: { type: String, default: \`Foo\` },
          foo: { type: Foo, default: Foo('a') },
          foo: { type: String, default: \`Foo\` },
          foo: { type: BigInt, default: 1n },
          foo: { type: String, default: null },
          foo: { type: String, default () { return Foo } },
          foo: { type: Number, default () { return Foo } },
          foo: { type: Object, default () { return Foo } },
          foo: { type: Object, default: null },
        }
      })`,
      languageOptions,
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: [Number],
            default() {
              return 10
            }
          }
        }
      }`,
      languageOptions,
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: [Function, Number],
            default() {
              return 's'
            }
          }
        }
      }`,
      languageOptions,
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: [Number],
            default: () => 10
          }
        }
      }`,
      languageOptions,
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: [Function, Number],
            default: () => 's'
          }
        }
      }`,
      languageOptions,
    },

    // sparse array
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: [,Object, Number],
            default: 10
          }
        }
      }`,
      languageOptions,
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: Number,
            default: Number?.()
          }
        }
      }`,
      languageOptions,
    },
    {
      filename: 'test.vue',
      code: `
      <script setup>
        const { foo = 'abc' } = defineProps({
          foo: {
            type: String,
          }
        })
      </script>
      `,
      languageOptions: {
        parser: vueEslintParser,
      },
    },
  ],

  invalid: [
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: [Number, String],
            default: {}
          }
        }
      }`,
      languageOptions,
      errors: [
        {
          message: `Type of the default value for 'foo' prop must be a number or string.`,
          line: 5,
          column: 22,
          endLine: 5,
          endColumn: 24,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: [Number, Object],
            default: {}
          }
        }
      }`,
      languageOptions,
      errors: [
        {
          message: `Type of the default value for 'foo' prop must be a number or function.`,
          line: 5,
          column: 22,
          endLine: 5,
          endColumn: 24,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: Number,
            default: ''
          }
        }
      }`,
      languageOptions,
      errors: [
        {
          message: `Type of the default value for 'foo' prop must be a number.`,
          line: 5,
          column: 22,
          endLine: 5,
          endColumn: 24,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: Number,
            default: false
          }
        }
      }`,
      languageOptions,
      errors: [
        {
          message: `Type of the default value for 'foo' prop must be a number.`,
          line: 5,
          column: 22,
          endLine: 5,
          endColumn: 27,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: Number,
            default: {}
          }
        }
      }`,
      languageOptions,
      errors: [
        {
          message: `Type of the default value for 'foo' prop must be a number.`,
          line: 5,
          column: 22,
          endLine: 5,
          endColumn: 24,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: Number,
            default: []
          }
        }
      }`,
      languageOptions,
      errors: [
        {
          message: `Type of the default value for 'foo' prop must be a number.`,
          line: 5,
          column: 22,
          endLine: 5,
          endColumn: 24,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: String,
            default: 2
          }
        }
      }`,
      languageOptions,
      errors: [
        {
          message: `Type of the default value for 'foo' prop must be a string.`,
          line: 5,
          column: 22,
          endLine: 5,
          endColumn: 23,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: String,
            default: {}
          }
        }
      }`,
      languageOptions,
      errors: [
        {
          message: `Type of the default value for 'foo' prop must be a string.`,
          line: 5,
          column: 22,
          endLine: 5,
          endColumn: 24,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: String,
            default: []
          }
        }
      }`,
      languageOptions,
      errors: [
        {
          message: `Type of the default value for 'foo' prop must be a string.`,
          line: 5,
          column: 22,
          endLine: 5,
          endColumn: 24,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: Boolean,
            default: ''
          }
        }
      }`,
      languageOptions,
      errors: [
        {
          message: `Type of the default value for 'foo' prop must be a boolean.`,
          line: 5,
          column: 22,
          endLine: 5,
          endColumn: 24,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: Boolean,
            default: 5
          }
        }
      }`,
      languageOptions,
      errors: [
        {
          message: `Type of the default value for 'foo' prop must be a boolean.`,
          line: 5,
          column: 22,
          endLine: 5,
          endColumn: 23,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: Boolean,
            default: {}
          }
        }
      }`,
      languageOptions,
      errors: [
        {
          message: `Type of the default value for 'foo' prop must be a boolean.`,
          line: 5,
          column: 22,
          endLine: 5,
          endColumn: 24,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: Boolean,
            default: []
          }
        }
      }`,
      languageOptions,
      errors: [
        {
          message: `Type of the default value for 'foo' prop must be a boolean.`,
          line: 5,
          column: 22,
          endLine: 5,
          endColumn: 24,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: Object,
            default: ''
          }
        }
      }`,
      languageOptions,
      errors: [
        {
          message: `Type of the default value for 'foo' prop must be a function.`,
          line: 5,
          column: 22,
          endLine: 5,
          endColumn: 24,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: Object,
            default: 55
          }
        }
      }`,
      languageOptions,
      errors: [
        {
          message: `Type of the default value for 'foo' prop must be a function.`,
          line: 5,
          column: 22,
          endLine: 5,
          endColumn: 24,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: Object,
            default: false
          }
        }
      }`,
      languageOptions,
      errors: [
        {
          message: `Type of the default value for 'foo' prop must be a function.`,
          line: 5,
          column: 22,
          endLine: 5,
          endColumn: 27,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: Object,
            default: {}
          }
        }
      }`,
      languageOptions,
      errors: [
        {
          message: `Type of the default value for 'foo' prop must be a function.`,
          line: 5,
          column: 22,
          endLine: 5,
          endColumn: 24,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: Object,
            default: []
          }
        }
      }`,
      languageOptions,
      errors: [
        {
          message: `Type of the default value for 'foo' prop must be a function.`,
          line: 5,
          column: 22,
          endLine: 5,
          endColumn: 24,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: Array,
            default: ''
          }
        }
      }`,
      languageOptions,
      errors: [
        {
          message: `Type of the default value for 'foo' prop must be a function.`,
          line: 5,
          column: 22,
          endLine: 5,
          endColumn: 24,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: Array,
            default: 55
          }
        }
      }`,
      languageOptions,
      errors: [
        {
          message: `Type of the default value for 'foo' prop must be a function.`,
          line: 5,
          column: 22,
          endLine: 5,
          endColumn: 24,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: Array,
            default: false
          }
        }
      }`,
      languageOptions,
      errors: [
        {
          message: `Type of the default value for 'foo' prop must be a function.`,
          line: 5,
          column: 22,
          endLine: 5,
          endColumn: 27,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: Array,
            default: {}
          }
        }
      }`,
      languageOptions,
      errors: [
        {
          message: `Type of the default value for 'foo' prop must be a function.`,
          line: 5,
          column: 22,
          endLine: 5,
          endColumn: 24,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: Array,
            default: []
          }
        }
      }`,
      languageOptions,
      errors: [
        {
          message: `Type of the default value for 'foo' prop must be a function.`,
          line: 5,
          column: 22,
          endLine: 5,
          endColumn: 24,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: [Object, Number],
            default: {}
          }
        }
      }`,
      languageOptions,
      errors: [
        {
          message: `Type of the default value for 'foo' prop must be a function or number.`,
          line: 5,
          column: 22,
          endLine: 5,
          endColumn: 24,
        },
      ],
    },

    {
      filename: 'test.vue',
      code: `export default {
        props: {
          'foo': {
            type: Object,
            default: ''
          },
          ['bar']: {
            type: Object,
            default: ''
          },
          [baz]: {
            type: Object,
            default: ''
          }
        }
      }`,
      languageOptions,
      errors: [
        {
          message: `Type of the default value for 'foo' prop must be a function.`,
          line: 5,
          column: 22,
          endLine: 5,
          endColumn: 24,
        },
        {
          message: `Type of the default value for 'bar' prop must be a function.`,
          line: 9,
          column: 22,
          endLine: 9,
          endColumn: 24,
        },
        {
          message: `Type of the default value for '[baz]' prop must be a function.`,
          line: 13,
          column: 22,
          endLine: 13,
          endColumn: 24,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: String,
            default: 1n
          }
        }
      }`,
      languageOptions,
      errors: [
        {
          message: `Type of the default value for 'foo' prop must be a string.`,
          line: 5,
          column: 22,
          endLine: 5,
          endColumn: 24,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: Number,
            default() {
              return ''
            }
          }
        }
      }`,
      languageOptions,
      errors: [
        {
          message: `Type of the default value for 'foo' prop must be a number.`,
          line: 6,
          column: 22,
          endLine: 6,
          endColumn: 24,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: Object,
            default() {
              return ''
            }
          }
        }
      }`,
      languageOptions,
      errors: [
        {
          message: `Type of the default value for 'foo' prop must be a object.`,
          line: 6,
          column: 22,
          endLine: 6,
          endColumn: 24,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: String,
            default() {
              return 123
            }
          }
        }
      }`,
      languageOptions,
      errors: [
        {
          message: `Type of the default value for 'foo' prop must be a string.`,
          line: 6,
          column: 22,
          endLine: 6,
          endColumn: 25,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: Number,
            default: () => {
              return ''
            }
          }
        }
      }`,
      languageOptions,
      errors: [
        {
          message: `Type of the default value for 'foo' prop must be a number.`,
          line: 6,
          column: 22,
          endLine: 6,
          endColumn: 24,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: Object,
            default: () => {
              return ''
            }
          }
        }
      }`,
      languageOptions,
      errors: [
        {
          message: `Type of the default value for 'foo' prop must be a object.`,
          line: 6,
          column: 22,
          endLine: 6,
          endColumn: 24,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: String,
            default: () => {
              return 123
            }
          }
        }
      }`,
      languageOptions,
      errors: [
        {
          message: `Type of the default value for 'foo' prop must be a string.`,
          line: 6,
          column: 22,
          endLine: 6,
          endColumn: 25,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: Number,
            default: () => ''
          }
        }
      }`,
      languageOptions,
      errors: [
        {
          message: `Type of the default value for 'foo' prop must be a number.`,
          line: 5,
          column: 28,
          endLine: 5,
          endColumn: 30,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: Object,
            default: () => ''
          }
        }
      }`,
      languageOptions,
      errors: [
        {
          message: `Type of the default value for 'foo' prop must be a object.`,
          line: 5,
          column: 28,
          endLine: 5,
          endColumn: 30,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: String,
            default: () => 123
          }
        }
      }`,
      languageOptions,
      errors: [
        {
          message: `Type of the default value for 'foo' prop must be a string.`,
          line: 5,
          column: 28,
          endLine: 5,
          endColumn: 31,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: Function,
            default: 1
          }
        }
      }`,
      languageOptions,
      errors: [
        {
          message: `Type of the default value for 'foo' prop must be a function.`,
          line: 5,
          column: 22,
          endLine: 5,
          endColumn: 23,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: [String, Boolean],
            default() {
              switch (kind) {
                case 1: return 1
                case 2: return '' // OK
                case 3: return {}
                case 4: return Foo // ignore?
                case 5: return () => {}
                case 6: return false // OK
              }

              function foo () {
                return 1 // ignore?
              }
            }
          }
        }
      }`,
      languageOptions,
      errors: [
        {
          message:
            "Type of the default value for 'foo' prop must be a string or boolean.",
          line: 7,
          column: 32,
          endLine: 7,
          endColumn: 33,
        },
        {
          message:
            "Type of the default value for 'foo' prop must be a string or boolean.",
          line: 9,
          column: 32,
          endLine: 9,
          endColumn: 34,
        },
        {
          message:
            "Type of the default value for 'foo' prop must be a string or boolean.",
          line: 11,
          column: 32,
          endLine: 11,
          endColumn: 40,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `export default {
        props: {
          foo: {
            type: String,
            default: Number?.()
          }
        }
      }`,
      languageOptions,
      errors: [
        {
          message: `Type of the default value for 'foo' prop must be a string.`,
          line: 5,
          column: 22,
          endLine: 5,
          endColumn: 32,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `
      <script setup>
        defineProps({
          foo: {
            type: String,
            default: () => 123
          }
        })
      </script>
      `,
      languageOptions: {
        parser: vueEslintParser,
        ecmaVersion: 6,
        sourceType: 'module',
      },
      errors: [
        {
          message: "Type of the default value for 'foo' prop must be a string.",
          line: 6,
          column: 28,
          endLine: 6,
          endColumn: 31,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `
      <script setup>
        const { foo = 123 } = defineProps({
          foo: String
        })
      </script>
      `,
      languageOptions: {
        parser: vueEslintParser,
      },
      errors: [
        {
          message: "Type of the default value for 'foo' prop must be a string.",
          line: 3,
          column: 23,
          endLine: 3,
          endColumn: 26,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `
      <script setup>
        const { foo = 123 } = defineProps({
          foo: {
            type: String,
            default: 123
          }
        })
      </script>
      `,
      languageOptions: {
        parser: vueEslintParser,
      },
      errors: [
        {
          message: "Type of the default value for 'foo' prop must be a string.",
          line: 3,
          column: 23,
          endLine: 3,
          endColumn: 26,
        },
        {
          message: "Type of the default value for 'foo' prop must be a string.",
          line: 6,
          column: 22,
          endLine: 6,
          endColumn: 25,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `
      <script setup>
        const { foo = [] } = defineProps({
          foo: {
            type: Number,
          }
        })
      </script>
      `,
      languageOptions: {
        parser: vueEslintParser,
      },
      errors: [
        {
          message: "Type of the default value for 'foo' prop must be a number.",
          line: 3,
          column: 23,
          endLine: 3,
          endColumn: 25,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `
      <script setup>
        const { foo = 42 } = defineProps({
          foo: {
            type: Array,
          }
        })
      </script>
      `,
      languageOptions: {
        parser: vueEslintParser,
      },
      errors: [
        {
          message: "Type of the default value for 'foo' prop must be a array.",
          line: 3,
          column: 23,
          endLine: 3,
          endColumn: 25,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `
      <script setup>
        const { foo = [] } = defineProps({
          foo: {
            type: Array,
            default: () => {
              return 42
            }
          }
        })
      </script>
      `,
      languageOptions: {
        parser: vueEslintParser,
      },
      errors: [
        {
          message: "Type of the default value for 'foo' prop must be a array.",
          line: 7,
          column: 22,
          endLine: 7,
          endColumn: 24,
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `
      <script setup>
        const { foo = (()=>[]) } = defineProps({
          foo: {
            type: Array,
          }
        })
      </script>
      `,
      languageOptions: {
        parser: vueEslintParser,
      },
      errors: [
        {
          message: "Type of the default value for 'foo' prop must be a array.",
          line: 3,
          column: 24,
          endLine: 3,
          endColumn: 30,
        },
      ],
    },
  ],
});
