/* eslint-disable no-var, no-unused-vars, no-shadow, no-undef */
var require = name => {
	if (name === 'eslint') {
		return eslint;
	} else if (name in eslint.packages) {
		return eslint.packages[name];
	}
	throw new RangeError(`Module not bundled: ${name}`);
};
