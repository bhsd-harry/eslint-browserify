'use strict';

const fs = require('fs'),
	path = require('path'),
	{updateBadge, findUncoveredBlocks} = require('@bhsd/test-util');

for (const file of ['eslint', 'eslint-plugin-vue']) {
	findUncoveredBlocks(
		'coverage/coverage.json',
		path.join('coverage', `uncovered-lines${file === 'eslint' ? '' : '-vue'}.txt`),
		path.join('build', `${file}.js`),
	);
}
updateBadge();
