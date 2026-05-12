exports.sep = '/';

exports.extname = path => {
	const lastSlash = path.lastIndexOf('/'),
		file = lastSlash === -1 ? path : path.slice(lastSlash + 1),
		lastDot = file.lastIndexOf('.');
	return lastDot <= 0 ? '' : path.slice(lastDot);
};

exports.join = (...parts) => parts.join('/')
	.replaceAll(/\/\.(?=$|\/)/gu, '')
	.replaceAll(/\/{2,}/gu, '/');
