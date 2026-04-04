const curry$ = function(f, bound) {
	let context;
	const curry = function(args) {
		return f.length > 1
			? function() {
				const params = args ? [...args] : [];
				context = bound ? context || this : this;
				// eslint-disable-next-line prefer-spread, prefer-rest-params
				return params.push.apply(params, arguments) < f.length && arguments.length > 0
					? curry.call(context, params)
					: f.apply(context, params);
			}
			: f;
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
