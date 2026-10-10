const curry$ = function(f) {
	const curry = function(args) {
		return function() {
			const params = args ? [...args] : [];
			// eslint-disable-next-line prefer-spread, prefer-rest-params
			return params.push.apply(params, arguments) < 2 && arguments.length > 0
				? curry.call(this, params)
				: f.apply(this, params);
		};
	};
	return curry();
};
exports.reject = curry$((f, xs) => {
	let i$, len$, x;
	const results$ = [];
	for (i$ = 0, len$ = xs.length; i$ < len$; ++i$) {
		x = xs[i$];
		if (!f(x)) {
			results$.push(x);
		}
	}
	return results$;
});
exports.any = curry$((f, xs) => {
	let i$, len$, x;
	for (i$ = 0, len$ = xs.length; i$ < len$; ++i$) {
		x = xs[i$];
		if (f(x)) {
			return true;
		}
	}
	return false;
});
exports.all = curry$((f, xs) => {
	let i$, len$, x;
	for (i$ = 0, len$ = xs.length; i$ < len$; ++i$) {
		x = xs[i$];
		if (!f(x)) {
			return false;
		}
	}
	return true;
});
