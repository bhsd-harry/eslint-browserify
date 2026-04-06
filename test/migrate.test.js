/* global eslint */
'use strict';

const fs = require('fs'),
	path = require('path'),
	assert = require('assert');
const {migrateConfig} = eslint;

const tests = fs.readdirSync('test/migrate', {withFileTypes: true}).filter(dirent => dirent.isDirectory());

describe.only('Migration tests', () => {
	for (const dirent of tests) {
		it(dirent.name, () => {
			const dir = path.resolve(dirent.parentPath, dirent.name),
				file = path.join(dir, 'expected.json');
			const eslintrc = require(path.join(dir, 'eslintrc')),
				expected = require(file);
			const migrated = migrateConfig(eslintrc);
			fs.writeFileSync(file, `${JSON.stringify(migrated, null, '\t')}\n`);
			assert.deepStrictEqual(migrated, expected);
		});
	}
});
