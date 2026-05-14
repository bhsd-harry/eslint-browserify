'use strict';

const fs = require('fs'),
	path = require('path'),
	{updateBadge} = require('@bhsd/test-util'),
	coverageData = require('../coverage/coverage-final.json');

for (const file of ['eslint', 'eslint-plugin-vue']) {
	const filePath = fs.realpathSync(path.join('build', `${file}.js`)),
		fileCoverage = coverageData[filePath],
		{s, statementMap} = fileCoverage,
		fileUncoveredLines = new Set();
	for (const statementId in s) {
		if (s[statementId] === 0) {
			const {line} = statementMap[statementId].start;
			if (!fileUncoveredLines.has(line)) {
				fileUncoveredLines.add(line);
			}
		}
	}
	const uncoveredLines = [...fileUncoveredLines].toSorted((a, b) => a - b),
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
