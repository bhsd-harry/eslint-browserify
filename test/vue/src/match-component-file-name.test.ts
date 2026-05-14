/**
 * @fileoverview Require component name property to match its file name
 * @author Rodrigo Pedra Brum <rodrigo.pedra@gmail.com>
 */
import type { Linter } from 'eslint';
const rule = 'eslint-plugin-vue';
import { RuleTester } from '../../rule-tester.js';
import vueEslintParser from 'vue-eslint-parser';

const languageOptions: Linter.LanguageOptions = {
  ecmaVersion: 2018,
  sourceType: 'module',
};

const ruleTester = new RuleTester();

ruleTester.run('match-component-file-name', rule, {
  valid: [
    // .vue
    {
      filename: 'MyComponent.vue',
      code: `
        <script>
          export default {
            name: 'MComponent',
            template: '<div />'
          }
        </script>
      `,
      languageOptions: {
        parser: vueEslintParser,
        ...languageOptions,
      },
    },
    {
      filename: 'MyComponent.vue',
      code: `
        <script>
          export default {
            name: 'MComponent',
            template: '<div />'
          }
        </script>
      `,
      options: [{ extensions: ['jsx'] }], // missing jsx in options
      languageOptions: {
        parser: vueEslintParser,
        ...languageOptions,
      },
    },
    {
      filename: 'MyComponent.vue',
      code: `
        <script>
          export default {
            template: '<div />'
          }
        </script>
      `,
      options: [{ extensions: ['vue'] }],
      languageOptions: {
        parser: vueEslintParser,
        ...languageOptions,
      },
    },
    {
      filename: 'MyComponent.vue',
      code: `
        <template>
          <div />
        </template>
      `,
      options: [{ extensions: ['vue'] }],
      languageOptions: {
        parser: vueEslintParser,
        ...languageOptions,
      },
    },
    {
      filename: 'MyComponent.vue',
      code: `
        <script>
          export default {
            name: 'MyComponent',
            template: '<div />'
          }
        </script>
      `,
      options: [{ extensions: ['vue'] }],
      languageOptions: {
        parser: vueEslintParser,
        ...languageOptions,
      },
    },
    {
      filename: 'MyComponent.vue',
      code: `
        <script>
          export default {
            name: myComponent,
            template: '<div />'
          }
        </script>
      `,
      options: [{ extensions: ['vue'] }],
      languageOptions: {
        parser: vueEslintParser,
        ...languageOptions,
      },
    },
    {
      filename: 'MyComponent.vue',
      code: `
        <script>
          export default {
            name,
            template: '<div />'
          }
        </script>
      `,
      options: [{ extensions: ['vue'] }],
      languageOptions: {
        parser: vueEslintParser,
        ...languageOptions,
      },
    },
    {
      filename: 'MyComponent.vue',
      code: `
        <script>
          export default {
            name: \`MyComponent\`,
            template: '<div />'
          }
        </script>
      `,
      options: [{ extensions: ['vue'] }],
      languageOptions: {
        parser: vueEslintParser,
        ...languageOptions,
      },
    },
    {
      filename: 'MyComponent.vue',
      code: `
        <script>
          export default {
            name: \`My\${foo}\`,
            template: '<div />'
          }
        </script>
      `,
      options: [{ extensions: ['vue'] }],
      languageOptions: {
        parser: vueEslintParser,
        ...languageOptions,
      },
    },

    // .js
    {
      filename: 'MyComponent.js',
      code: `
        new Vue({
          name: 'MComponent',
          template: '<div />'
        })
      `,
      languageOptions, // options default to [['jsx']]
    },
    {
      filename: 'MyComponent.js',
      code: `
        Vue.mixin({})
      `,
      languageOptions, // options default to [['jsx']]
    },
    {
      filename: 'MyComponent.js',
      code: `
        Vue.component('MComponent', {
          template: '<div />'
        })
      `,
      languageOptions, // options default to [['jsx']]
    },
    {
      filename: 'MyComponent.js',
      code: `
        new Vue({
          name: 'MComponent',
          template: '<div />'
        })
      `,
      options: [{ extensions: ['vue'] }], // missing 'js' in options
      languageOptions,
    },
    {
      filename: 'MyComponent.js',
      code: `
        Vue.mixin({})
      `,
      options: [{ extensions: ['vue'] }], // missing 'js' in options
      languageOptions,
    },
    {
      filename: 'MyComponent.js',
      code: `
        Vue.component('MComponent', {
          template: '<div />'
        })
      `,
      options: [{ extensions: ['vue'] }], // missing 'js' in options
      languageOptions,
    },
    {
      filename: 'MyComponent.js',
      code: `
        new Vue({
          template: '<div />'
        })
      `,
      options: [{ extensions: ['js'] }],
      languageOptions,
    },
    {
      filename: 'MyComponent.js',
      code: `
        new Vue({
          name: 'MyComponent',
          template: '<div />'
        })
      `,
      options: [{ extensions: ['js'] }],
      languageOptions,
    },
    {
      filename: 'MyComponent.js',
      code: `
        new Vue({
          name: myComponent,
          template: '<div />'
        })
      `,
      options: [{ extensions: ['js'] }],
      languageOptions,
    },
    {
      filename: 'MyComponent.js',
      code: `
        new Vue({
          name,
          template: '<div />'
        })
      `,
      options: [{ extensions: ['js'] }],
      languageOptions,
    },
    {
      filename: 'MyComponent.js',
      code: `
        new Vue({
          name: \`MyComponent\`,
          template: '<div />'
        })
      `,
      options: [{ extensions: ['js'] }],
      languageOptions,
    },
    {
      filename: 'MyComponent.js',
      code: `
        new Vue({
          name: \`My\${foo}\`,
          template: '<div />'
        })
      `,
      options: [{ extensions: ['js'] }],
      languageOptions,
    },
    {
      filename: 'MyComponent.js',
      code: `
        Vue.mixin({})
      `,
      options: [{ extensions: ['js'] }],
      languageOptions,
    },
    {
      filename: 'MyComponent.js',
      code: `
        new Vue.mixin({
          name: 'MyComponent',
        })
      `,
      options: [{ extensions: ['js'] }],
      languageOptions,
    },
    {
      filename: 'MyComponent.js',
      code: `
        new Vue.mixin({
          name: myComponent,
        })
      `,
      options: [{ extensions: ['js'] }],
      languageOptions,
    },
    {
      filename: 'MyComponent.js',
      code: `
        new Vue.mixin({
          name
        })
      `,
      options: [{ extensions: ['js'] }],
      languageOptions,
    },
    {
      filename: 'MyComponent.js',
      code: `
        new Vue.mixin({
          name: \`MyComponent\`,
        })
      `,
      options: [{ extensions: ['js'] }],
      languageOptions,
    },
    {
      filename: 'MyComponent.js',
      code: `
        new Vue.mixin({
          name: \`My\${foo}\`,
        })
      `,
      options: [{ extensions: ['js'] }],
      languageOptions,
    },
    {
      filename: 'MyComponent.js',
      code: `
        Vue.component('MyComponent', {
          template: '<div />'
        })
      `,
      options: [{ extensions: ['js'] }],
      languageOptions,
    },
    {
      filename: 'MyComponent.js',
      code: `
        app.component('MyComponent', {
          template: '<div />'
        })
      `,
      options: [{ extensions: ['js'] }],
      languageOptions,
    },
    {
      filename: 'MyComponent.js',
      code: `
        Vue.component(myComponent, {
          template: '<div />'
        })
      `,
      options: [{ extensions: ['js'] }],
      languageOptions,
    },
    {
      filename: 'MyComponent.js',
      code: `
        Vue.component(\`MyComponent\`, {
          template: '<div />'
        })
      `,
      options: [{ extensions: ['js'] }],
      languageOptions,
    },
    {
      filename: 'MyComponent.js',
      code: `
        Vue.component(\`My\${foo}\`, {
          template: '<div />'
        })
      `,
      options: [{ extensions: ['js'] }],
      languageOptions,
    },
    {
      filename: 'index.js',
      code: `
        Vue.component('MyComponent', {
          template: '<div />'
        })

        Vue.component('OtherComponent', {
          template: '<div />'
        })

        new Vue('OtherComponent', {
          name: 'ThirdComponent',
          template: '<div />'
        })
      `,
      options: [{ extensions: ['js'] }],
      languageOptions,
    },

    // casing
    // https://github.com/vuejs/eslint-plugin-vue/issues/1018
    {
      filename: 'test.jsx',
      code: `fn1(component.data)`,
      languageOptions,
    },
    {
      filename: 'MyComponent.vue',
      code: `<script setup> defineOptions({name: 'MyComponent'}) </script>`,
      options: [{ extensions: ['vue'] }],
      languageOptions: {
        parser: vueEslintParser,
        ...languageOptions,
      },
    },
  ],

  invalid: [
    // .vue
    {
      filename: 'MyComponent.vue',
      code: `
        <script>
          export default {
            name: 'MComponent',
            template: '<div />'
          }
        </script>
      `,
      options: [{ extensions: ['vue'] }],
      languageOptions: {
        parser: vueEslintParser,
        ...languageOptions,
      },
      errors: [
        {
          message:
            'Component name `MComponent` should match file name `MyComponent`.',
          line: 4,
          column: 19,
          endLine: 4,
          endColumn: 31,
          suggestions: [
            {
              desc: 'Rename component to match file name.',
              output: `
        <script>
          export default {
            name: 'MyComponent',
            template: '<div />'
          }
        </script>
      `,
            },
          ],
        },
      ],
    },
    {
      filename: 'MyComponent.vue',
      code: `
        <script>
          export default {
            name: "MComponent",
            template: '<div />'
          }
        </script>
      `,
      options: [{ extensions: ['vue'] }],
      languageOptions: {
        parser: vueEslintParser,
        ...languageOptions,
      },
      errors: [
        {
          message:
            'Component name `MComponent` should match file name `MyComponent`.',
          line: 4,
          column: 19,
          endLine: 4,
          endColumn: 31,
          suggestions: [
            {
              desc: 'Rename component to match file name.',
              output: `
        <script>
          export default {
            name: "MyComponent",
            template: '<div />'
          }
        </script>
      `,
            },
          ],
        },
      ],
    },
    {
      filename: 'MyComponent.vue',
      code: `
        <script>
          export default {
            name: \`MComponent\`,
            template: '<div />'
          }
        </script>
      `,
      options: [{ extensions: ['vue'] }],
      languageOptions: {
        parser: vueEslintParser,
        ...languageOptions,
      },
      errors: [
        {
          message:
            'Component name `MComponent` should match file name `MyComponent`.',
          line: 4,
          column: 19,
          endLine: 4,
          endColumn: 31,
          suggestions: [
            {
              desc: 'Rename component to match file name.',
              output: `
        <script>
          export default {
            name: \`MyComponent\`,
            template: '<div />'
          }
        </script>
      `,
            },
          ],
        },
      ],
    },

    // .js
    {
      filename: 'MyComponent.js',
      code: `
        new Vue({
          name: 'MComponent',
          template: '<div />'
        })
      `,
      options: [{ extensions: ['js'] }],
      languageOptions,
      errors: [
        {
          message:
            'Component name `MComponent` should match file name `MyComponent`.',
          line: 3,
          column: 17,
          endLine: 3,
          endColumn: 29,
          suggestions: [
            {
              desc: 'Rename component to match file name.',
              output: `
        new Vue({
          name: 'MyComponent',
          template: '<div />'
        })
      `,
            },
          ],
        },
      ],
    },
    {
      filename: 'MyComponent.js',
      code: `
        new Vue({
          name: "MComponent",
          template: '<div />'
        })
      `,
      options: [{ extensions: ['js'] }],
      languageOptions,
      errors: [
        {
          message:
            'Component name `MComponent` should match file name `MyComponent`.',
          line: 3,
          column: 17,
          endLine: 3,
          endColumn: 29,
          suggestions: [
            {
              desc: 'Rename component to match file name.',
              output: `
        new Vue({
          name: "MyComponent",
          template: '<div />'
        })
      `,
            },
          ],
        },
      ],
    },
    {
      filename: 'MyComponent.js',
      code: `
        new Vue({
          name: \`MComponent\`,
          template: '<div />'
        })
      `,
      options: [{ extensions: ['js'] }],
      languageOptions,
      errors: [
        {
          message:
            'Component name `MComponent` should match file name `MyComponent`.',
          line: 3,
          column: 17,
          endLine: 3,
          endColumn: 29,
          suggestions: [
            {
              desc: 'Rename component to match file name.',
              output: `
        new Vue({
          name: \`MyComponent\`,
          template: '<div />'
        })
      `,
            },
          ],
        },
      ],
    },
    {
      filename: 'MyComponent.js',
      code: `
        Vue.mixin({
          name: 'MComponent',
        })
      `,
      options: [{ extensions: ['js'] }],
      languageOptions,
      errors: [
        {
          message:
            'Component name `MComponent` should match file name `MyComponent`.',
          line: 3,
          column: 17,
          endLine: 3,
          endColumn: 29,
          suggestions: [
            {
              desc: 'Rename component to match file name.',
              output: `
        Vue.mixin({
          name: 'MyComponent',
        })
      `,
            },
          ],
        },
      ],
    },
    {
      filename: 'MyComponent.js',
      code: `
        Vue.mixin({
          name: "MComponent",
        })
      `,
      options: [{ extensions: ['js'] }],
      languageOptions,
      errors: [
        {
          message:
            'Component name `MComponent` should match file name `MyComponent`.',
          line: 3,
          column: 17,
          endLine: 3,
          endColumn: 29,
          suggestions: [
            {
              desc: 'Rename component to match file name.',
              output: `
        Vue.mixin({
          name: "MyComponent",
        })
      `,
            },
          ],
        },
      ],
    },
    {
      filename: 'MyComponent.js',
      code: `
        Vue.mixin({
          name: \`MComponent\`,
        })
      `,
      options: [{ extensions: ['js'] }],
      languageOptions,
      errors: [
        {
          message:
            'Component name `MComponent` should match file name `MyComponent`.',
          line: 3,
          column: 17,
          endLine: 3,
          endColumn: 29,
          suggestions: [
            {
              desc: 'Rename component to match file name.',
              output: `
        Vue.mixin({
          name: \`MyComponent\`,
        })
      `,
            },
          ],
        },
      ],
    },
    {
      filename: 'MyComponent.js',
      code: `
        Vue.component('MComponent', {
          template: '<div />'
        })
      `,
      options: [{ extensions: ['js'] }],
      languageOptions,
      errors: [
        {
          message:
            'Component name `MComponent` should match file name `MyComponent`.',
          line: 2,
          column: 23,
          endLine: 2,
          endColumn: 35,
          suggestions: [
            {
              desc: 'Rename component to match file name.',
              output: `
        Vue.component('MyComponent', {
          template: '<div />'
        })
      `,
            },
          ],
        },
      ],
    },
    {
      filename: 'MyComponent.js',
      code: `
        Vue.component("MComponent", {
          template: '<div />'
        })
      `,
      options: [{ extensions: ['js'] }],
      languageOptions,
      errors: [
        {
          message:
            'Component name `MComponent` should match file name `MyComponent`.',
          line: 2,
          column: 23,
          endLine: 2,
          endColumn: 35,
          suggestions: [
            {
              desc: 'Rename component to match file name.',
              output: `
        Vue.component("MyComponent", {
          template: '<div />'
        })
      `,
            },
          ],
        },
      ],
    },
    {
      filename: 'MyComponent.js',
      code: `
        Vue.component(\`MComponent\`, {
          template: '<div />'
        })
      `,
      options: [{ extensions: ['js'] }],
      languageOptions,
      errors: [
        {
          message:
            'Component name `MComponent` should match file name `MyComponent`.',
          line: 2,
          column: 23,
          endLine: 2,
          endColumn: 35,
          suggestions: [
            {
              desc: 'Rename component to match file name.',
              output: `
        Vue.component(\`MyComponent\`, {
          template: '<div />'
        })
      `,
            },
          ],
        },
      ],
    },
    {
      filename: 'MyComponent.js',
      code: `
        app.component(\`MComponent\`, {
          template: '<div />'
        })
      `,
      options: [{ extensions: ['js'] }],
      languageOptions,
      errors: [
        {
          message:
            'Component name `MComponent` should match file name `MyComponent`.',
          line: 2,
          column: 23,
          endLine: 2,
          endColumn: 35,
          suggestions: [
            {
              desc: 'Rename component to match file name.',
              output: `
        app.component(\`MyComponent\`, {
          template: '<div />'
        })
      `,
            },
          ],
        },
      ],
    },

    // casing
    {
      filename: 'MyComponent.vue',
      code: `<script setup> defineOptions({name: 'CoolComponent'}) </script>`,
      options: [{ extensions: ['vue'] }],
      languageOptions: {
        parser: vueEslintParser,
        ...languageOptions,
      },
      errors: [
        {
          message:
            'Component name `CoolComponent` should match file name `MyComponent`.',
          line: 1,
          column: 37,
          endLine: 1,
          endColumn: 52,
          suggestions: [
            {
              desc: 'Rename component to match file name.',
              output: `<script setup> defineOptions({name: 'MyComponent'}) </script>`,
            },
          ],
        },
      ],
    },
  ],
});
