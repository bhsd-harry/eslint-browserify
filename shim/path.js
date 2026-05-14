exports.sep = '/';

exports.basename = (path, ext) => {
	const lastSlash = path.lastIndexOf('/'),
		base = lastSlash === -1 ? path : path.slice(lastSlash + 1);
	return ext && base.endsWith(ext) ? base.slice(0, -ext.length) : base;
};

exports.extname = path => {
	const base = exports.basename(path),
		lastDot = base.lastIndexOf('.');
	return lastDot <= 0 ? '' : base.slice(lastDot);
};

exports.join = (...parts) => parts.join('/')
	.replaceAll(/\/\.(?=$|\/)/gu, '')
	.replaceAll(/\/{2,}/gu, '/');

exports.isAbsolute = path => path.startsWith('/');

exports.dirname = path => {
	const lastSlash = path.lastIndexOf('/');
	return lastSlash === -1 ? '' : path.slice(0, lastSlash);
};
