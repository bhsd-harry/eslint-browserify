exports.parseSelector = selector => ({
	test: element => element.rawName === selector,
});
