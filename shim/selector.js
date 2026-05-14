exports.parseSelector = selector => ({
	test(element) {
		return element.rawName === selector;
	},
});
