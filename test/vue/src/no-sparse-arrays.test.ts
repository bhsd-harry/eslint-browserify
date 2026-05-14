/**
 * @author Yosuke Ota
 */
import { RuleTester } from '../../rule-tester.js';
const rule = 'eslint-plugin-vue';
import vueEslintParser from 'vue-eslint-parser';

const tester = new RuleTester({
  languageOptions: { parser: vueEslintParser, ecmaVersion: 2015 },
});

tester.run('no-sparse-arrays', rule, {
  valid: [
    `<template>
      <div :class="['foo', 'bar']" />
    </template>`,
    `<template>
      <div v-bind:[['foo'][0]]="bar" />
    </template>`,
  ],
  invalid: [
    {
      code: `
      <template>
        <div :class="[, 'foo', 'bar']" />
      </template>`,
      errors: [
        {
          message: 'Unexpected comma in middle of array.',
          line: 3,
          endLine: 3,
           column: 23,
endColumn: 24,
        },
      ],
    },
    {
      code: `
      <template>
        <div v-bind:[[,'foo'][1]]="bar" />
      </template>`,
      errors: [
        {
          message: 'Unexpected comma in middle of array.',
          line: 3,
          endLine: 3,
           column: 23,
endColumn: 24,
        },
      ],
    },
  ],
});
