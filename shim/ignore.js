const escapeRegExp = require('escape-string-regexp'); // eslint-disable-line n/no-extraneous-require

module.exports = options => ({
	add(group) {
		const re = new RegExp(
			(Array.isArray(group) ? group : [group]).map(
				g => (g.startsWith('/') ? '^' : '(?:^|/)')
					+ escapeRegExp(g.replace(/^\//u, ''))
					+ (g.endsWith('/') ? '' : '(?:$|/)'),
			).join('|'),
			options?.ignorecase ? 'i' : '',
		);
		return {
			ignores(name) {
				return re.test(name);
			},
		};
	},
});
