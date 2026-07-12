/**
 * @author Yosuke Ota
 */
import assert from 'node:assert';
import parserVue from 'vue-eslint-parser';
const rule = 'eslint-plugin-vue';
import { ESLint, RuleTester } from '../../rule-tester.js';

const tester = new RuleTester({
  languageOptions: {
    parser: parserVue,
  },
});

tester.run('block-order', rule, {
  valid: [
    // default
    '<script></script><template></template><style></style>',
    '<template></template><script></script><style></style>',
    '<script> /*script*/ </script><template><div id="id">text <!--comment--> </div><br></template><style>.button{ color: red; }</style>',
    '<docs></docs><script></script><template></template><style></style>',
    '<script></script><docs></docs><template></template><style></style>',
    '<docs></docs><template></template><script></script><style></style>',
    '<template></template><script></script><docs></docs><style></style>',
    '<script></script><template></template>',
    '<template></template><script></script>',
    '<script setup></script><script></script>',
    '<docs></docs><template></template><script></script><script setup></script><style></style>',
    `
      <template>
      </template>

      <script>
      </script>

      <style>
      </style>
    `,
    `
      <script>
      </script>

      <template>
      </template>

      <style>
      </style>
    `,

    // order
    {
      code: '<script></script><template></template><style></style>',
      options: [{ order: ['script', 'template', 'style'] }],
    },
    {
      code: '<template></template><script></script><style></style>',
      options: [{ order: ['template', 'script', 'style'] }],
    },
    {
      code: '<style></style><template></template><script></script>',
      options: [{ order: ['style', 'template', 'script'] }],
    },
    {
      code: '<template></template><script></script><style></style>',
      options: [{ order: ['template', 'docs', 'script', 'style'] }],
    },
    {
      code: '<template></template><docs></docs><script></script><style></style>',
      options: [{ order: ['template', 'script', 'style'] }],
    },
    {
      code: '<docs><div id="id">text <!--comment--> </div><br></docs><script></script><template></template><style></style>',
      options: [{ order: ['docs', 'script', 'template', 'style'] }],
    },
    {
      code: '<script></script><script setup></script><template></template><style></style>',
      options: [{ order: ['script', 'template', 'style'] }],
    },
    {
      code: '<template></template><script></script><script setup></script><style></style>',
      options: [{ order: [['script', 'template'], 'style'] }],
    },
    {
      code: '<template></template><docs></docs><script></script><style></style>',
      options: [{ order: [['docs', 'script', 'template'], 'style'] }],
    },

    `<script></script><style></style>`,

    // Invalid EOF
    '<template><div a=">test</div></template><style></style>',
    '<template><div><!--test</div></template><style></style>',
  ],
  invalid: [
    {
      code: '<style></style><template></template><script></script>',
      output: '<template></template><style></style><script></script>',
      errors: [
        {
          message: "'<template>' should be above '<style>' on line 1.",
          line: 1,
          column: 16,
          endLine: 1,
          endColumn: 37,
        },
        {
          message: "'<script>' should be above '<style>' on line 1.",
          line: 1,
          column: 37,
          endLine: 1,
          endColumn: 54,
        },
      ],
    },
    {
      code: '<template></template><script></script><style></style>',
      output: '<script></script><template></template><style></style>',
      options: [{ order: ['script', 'template', 'style'] }],
      errors: [
        {
          message: "'<script>' should be above '<template>' on line 1.",
          line: 1,
          column: 22,
          endLine: 1,
          endColumn: 39,
        },
      ],
    },
    {
      code: `
        <template></template>

        <style></style>

        <script></script>`,
      output:
        '\n' +
        '        <template></template>\n' +
        '\n' +
        '        <script></script>\n' +
        '\n' +
        '        <style></style>',
      errors: [
        {
          message: "'<script>' should be above '<style>' on line 4.",
          line: 6,
          column: 9,
          endLine: 6,
          endColumn: 26,
        },
      ],
    },
    {
      code: `
        <template></template>
        <script></script>
        <style></style>
      `,
      output:
        `\n` +
        `        <script></script>\n` +
        `        <template></template>\n` +
        `        <style></style>\n${
        ' '.repeat(6)}`,
      options: [{ order: ['script', 'template', 'style'] }],
      errors: [
        {
          message: "'<script>' should be above '<template>' on line 2.",
          line: 3,
          column: 9,
          endLine: 3,
          endColumn: 26,
        },
      ],
    },
    {
      code: `
        <script></script>
        <template></template>
        <style></style>
      `,
      output:
        `\n` +
        `        <template></template>\n` +
        `        <script></script>\n` +
        `        <style></style>\n${
        ' '.repeat(6)}`,
      options: [{ order: ['template', 'script', 'style'] }],
      errors: [
        {
          message: "'<template>' should be above '<script>' on line 2.",
          line: 3,
          column: 9,
          endLine: 3,
          endColumn: 30,
        },
      ],
    },
    {
      code: `
        <template></template>
        <docs></docs>
        <script></script>
        <style></style>
      `,
      output:
        `\n` +
        `        <docs></docs>\n` +
        `        <template></template>\n` +
        `        <script></script>\n` +
        `        <style></style>\n${
        ' '.repeat(6)}`,
      options: [{ order: ['docs', 'template', 'script', 'style'] }],
      errors: [
        {
          message: "'<docs>' should be above '<template>' on line 2.",
          line: 3,
          column: 9,
          endLine: 3,
          endColumn: 22,
        },
      ],
    },
    {
      code: `
        <template></template>
        <docs></docs>
        <script></script>
        <style></style>
      `,
      output:
        `\n` +
        `        <script></script>\n` +
        `        <template></template>\n` +
        `        <docs></docs>\n` +
        `        <style></style>\n${
        ' '.repeat(6)}`,
      options: [{ order: ['script', 'template', 'style'] }],
      errors: [
        {
          message: "'<script>' should be above '<template>' on line 2.",
          line: 4,
          column: 9,
          endLine: 4,
          endColumn: 26,
        },
      ],
    },
    {
      code: `
        <template></template>
        <docs>
        </docs>
        <script></script>
        <style></style>
      `,
      output:
        `\n` +
        `        <script></script>\n` +
        `        <template></template>\n` +
        `        <docs>\n` +
        `        </docs>\n` +
        `        <style></style>\n${
        ' '.repeat(6)}`,
      options: [{ order: ['script', 'template', 'style'] }],
      errors: [
        {
          message: "'<script>' should be above '<template>' on line 2.",
          line: 5,
          column: 9,
          endLine: 5,
          endColumn: 26,
        },
      ],
    },
    {
      code: `
        <script></script>
        <template></template>
      `,
      output:
        '\n        <template></template>\n        <script></script>\n      ',
      options: [{ order: ['template', 'script'] }],
      errors: [
        {
          message: "'<template>' should be above '<script>' on line 2.",
          line: 3,
          column: 9,
          endLine: 3,
          endColumn: 30,
        },
      ],
    },
    {
      code: `
        <style></style>
        <template></template>
        <script></script>
      `,
      output:
        `\n` +
        `        <template></template>\n` +
        `        <style></style>\n` +
        `        <script></script>\n${
        ' '.repeat(6)}`,
      errors: [
        {
          message: "'<template>' should be above '<style>' on line 2.",
          line: 3,
          column: 9,
          endLine: 3,
          endColumn: 30,
        },
        {
          message: "'<script>' should be above '<style>' on line 2.",
          line: 4,
          column: 9,
          endLine: 4,
          endColumn: 26,
        },
      ],
    },
    {
      code: `
        <style></style>
        <docs></docs>
        <template></template>
        <script></script>
      `,
      output:
        `\n` +
        `        <template></template>\n` +
        `        <style></style>\n` +
        `        <docs></docs>\n` +
        `        <script></script>\n${
        ' '.repeat(6)}`,
      errors: [
        {
          message: "'<template>' should be above '<style>' on line 2.",
          line: 4,
          column: 9,
          endLine: 4,
          endColumn: 30,
        },
        {
          message: "'<script>' should be above '<style>' on line 2.",
          line: 5,
          column: 9,
          endLine: 5,
          endColumn: 26,
        },
      ],
    },
    // no <template>
    {
      code: `
        <style></style>
        <script></script>
      `,
      output: '\n        <script></script>\n        <style></style>\n      ',
      errors: [
        {
          message: "'<script>' should be above '<style>' on line 2.",
          line: 3,
          column: 9,
          endLine: 3,
          endColumn: 26,
        },
      ],
    },
  ],
});
