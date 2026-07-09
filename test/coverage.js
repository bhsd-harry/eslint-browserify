'use strict';

const fs = require('fs'),
	path = require('path'),
	{updateBadge} = require('@bhsd/test-util'),
	coverageData = require('../coverage/coverage.json');

for (const file of ['eslint', 'eslint-plugin-vue']) {
	const filePath = fs.realpathSync(path.join('build', `${file}.js`)),
		fileCoverage = coverageData.files.find(({path}) => path === filePath),
		uncoveredLines = fileCoverage.lines.filter(({count}) => count === 0).map(({line}) => line),
		uncoveredLineSummary = [];
	for (let i = 0; i < uncoveredLines.length;) {
		const start = uncoveredLines[i];
		let j = 1;
		for (; uncoveredLines[i + j] === start + j; j++) {
			//
		}
		if (j > 20) {
			uncoveredLineSummary.push({start, end: start + j - 1});
		}
		i += j;
	}
	fs.writeFileSync(
		path.join('coverage', file === 'eslint' ? 'uncovered-lines.txt' : 'uncovered-lines-vue.txt'),
		uncoveredLineSummary.map(({start, end}) => `${start}-${end}`).join('\n'),
	);
}
updateBadge();
