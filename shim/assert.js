module.exports = (value, message = 'Assertion failed.') => { // eslint-disable-line n/exports-style
	if (!value) {
		throw new Error(message);
	}
};
