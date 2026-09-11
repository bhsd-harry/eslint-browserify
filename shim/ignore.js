const escapeRegExp = require('escape-string-regexp');

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
			ignores: name => re.test(name),
		};
	},
});
