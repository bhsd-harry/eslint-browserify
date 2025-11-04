'use strict';

const severities = new Map([
	[0, 0],
	[1, 1],
	[2, 2],
	['off', 0],
	['warn', 1],
	['error', 2],
]);

module.exports.Config = {
	getRuleNumericSeverity(ruleConfig) {
		const severityValue = Array.isArray(ruleConfig) ? ruleConfig[0] : ruleConfig;
		if (severities.has(severityValue)) {
			return severities.get(severityValue);
		} else if (typeof severityValue === 'string') {
			return severities.get(severityValue.toLowerCase()) ?? 0;
		}
		return 0;
	},
};
