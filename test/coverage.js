'use strict';

const fs = require('fs'),
	path = require('path'),
	coverageData = require('../coverage/coverage-final.json');

const filePath = fs.realpathSync(path.join('build', 'eslint.js')),
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
const uncoveredLines = [...fileUncoveredLines].sort((a, b) => a - b),
	uncoveredLineSummary = [];
for (let i = 0; i < uncoveredLines.length;) {
	const start = uncoveredLines[i];
	let j = 1;
	for (; uncoveredLines[i + j] === start + j; j++) {
		//
	}
	if (j > 10) {
		uncoveredLineSummary.push({start, end: start + j - 1});
	}
	i += j;
}
fs.writeFileSync(
	path.join('coverage', 'uncovered-lines.txt'),
	uncoveredLineSummary.map(({start, end}) => `${start}-${end}`).join('\n'),
);
