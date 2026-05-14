/**
 * @author Yosuke Ota
 */
import { RuleTester } from '../../rule-tester.js';
const rule = 'eslint-plugin-vue';
import vueEslintParser from 'vue-eslint-parser';

const tester = new RuleTester({
  languageOptions: { parser: vueEslintParser, ecmaVersion: 2020 },
});

function getErrorPosition(
  line: number,
  column: number,
  errorType: 'unexpected' | 'missing',
) {
  return {
    line,
    column: errorType === 'unexpected' ? column : column - 1,
    endLine: line,
    endColumn: column,
  };
}

tester.run('func-call-spacing', rule, {
  valid: [
    `
    <template>
      <div :foo="foo()" />
    </template>
    `,
    {
      code: `
      <template>
        <div :foo="foo ()" />
      </template>
      `,
      options: ['always'],
    },
    `
    <template>
      <div :[foo()]="value" />
    </template>
    `,
    {
      code: `
      <template>
        <div :[foo()]="value" />
      </template>
      `,
      options: ['always'],
    },
    // CSS vars injection
    `
    <style>
    .text {
      color: v-bind('foo()')
    }
    </style>`,
  ],
  invalid: [
    {
      code: `
      <template>
        <div :foo="foo ()" />
      </template>
      `,
      output: `
      <template>
        <div :foo="foo()" />
      </template>
      `,
      errors: [
        {
          message: 'Unexpected whitespace between function name and paren.',
          ...getErrorPosition(3, 23, 'unexpected'),
        },
      ],
    },
    {
      code: `
      <template>
        <div :foo="foo()" />
      </template>
      `,
      output: `
      <template>
        <div :foo="foo ()" />
      </template>
      `,
      options: ['always'],
      errors: [
        {
          message: 'Missing space between function name and paren.',
          ...getErrorPosition(3, 23, 'missing'),
        },
      ],
    },

    // CSS vars injection
    {
      code: `
      <style>
      .text {
        color: v-bind('foo ()')
      }
      </style>`,
      output: `
      <style>
      .text {
        color: v-bind('foo()')
      }
      </style>`,
      errors: [
        {
          message: 'Unexpected whitespace between function name and paren.',
          ...getErrorPosition(4, 27, 'unexpected'),
        },
      ],
    },
  ],
});
