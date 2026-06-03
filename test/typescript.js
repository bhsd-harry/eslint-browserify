'use strict';

const path = require('node:path');
const tsParser = require('@typescript-eslint/parser');
const vueEslintParser = require('vue-eslint-parser');

const FIXTURES_ROOT = path.resolve(__dirname, '../fixtures/typescript');
const TSCONFIG_PATH = path.resolve(FIXTURES_ROOT, './tsconfig.json');
const SRC_VUE_TEST_PATH = path.join(FIXTURES_ROOT, './src/test.vue');

function getTypeScriptFixtureTestOptions() {
  return {
    languageOptions: {
      parser: vueEslintParser,
      ecmaVersion: 2020,
      sourceType: 'module',
      parserOptions: {
        parser: { ts: tsParser },
        project: [TSCONFIG_PATH],
        extraFileExtensions: ['.vue'],
      },
    },
    filename: SRC_VUE_TEST_PATH,
  };
}

module.exports = {getTypeScriptFixtureTestOptions};
