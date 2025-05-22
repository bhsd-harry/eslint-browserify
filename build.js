'use strict';

const path = require('path'),
	fs = require('fs'),
	esbuild = require('esbuild');

const shim = [
		'GraphemerIterator',
		'Func',
		'Num',
		'Obj',
		'Str',
		'flat-config-array',
		'flat-config-helpers',
		'flat-config-schema',
		'rule-validator',
		'timing',
	],
	shimSet = new Set(shim);

const plugin = {
	name: 'alias',
	setup(build) {
		build.onResolve(
			// eslint-disable-next-line require-unicode-regexp
			{filter: new RegExp(String.raw`/(?:${shim.join('|')})(?:\.js)?$`)},
			({path: p}) => {
				const {name, ext} = path.parse(p);
				shimSet.delete(name);
				return {
					path: path.resolve('shim', name + (ext || '.js')),
				};
			},
		);
		build.onLoad(
			{
				filter:
					// eslint-disable-next-line require-unicode-regexp, @stylistic/max-len
					/\/(?:(?:rules\/index|linter|eslintrc-universal|no-magic-numbers|estraverse|Graphemer|ast|List)\.c?js|package\.json)$/,
			},
			({path: p}) => {
				const contents = fs.readFileSync(p, 'utf8'),
					base = path.basename(p);
				switch (base) {
					case 'ast.js':
						return {
							contents: contents.replace(
								// eslint-disable-next-line @stylistic/max-len
								/^([ \t]+)function (isExpression|isStatement|isIterationStatement|isSourceElement|isProblematicIfStatement)\(.+?^\1\}$/gmsu,
								'$1function $2() {}',
							),
						};
					case 'eslintrc-universal.cjs':
						return {
							contents: contents.replace(
								/^([ \t]+)(\w+Schema)\(.+?^\1\}$/gmsu,
								'$1$2() {}',
							).replace(
								/^var ajvOrig = .+?^\};$/msu,
								'var ajvOrig = () => {};',
							).replace(
								/^const \w+(?:Schema|Properties) = \{$.+?^\};$/gmsu,
								'',
							),
						};
					case 'estraverse.js':
						return {
							contents: contents.replace(
								/^([ \t]+)(function \w+)\(.+?^\1\}$/gmsu,
								'$1$2() {}',
							).replace(
								/^([ \t]+)\w+\.prototype\.\w+ = .+?^\1\};$/gmsu,
								'',
							),
						};
					case 'Graphemer.js':
						return {
							contents: contents.replace(
								/^([ \t]+)(?:iterate|split)Graphemes\(.+?^\1\}$/gmsu,
								'',
							),
						};
					case 'index.js':
						return {
							contents: contents.replace(/"valid-jsdoc": .+$/mu, ''),
						};
					case 'linter.js':
						return {
							contents: contents.replace(
								/^([ \t]+)(?:_verifyWith(?:\w*ConfigArray\w*|Processor)|define\w+)\(.+?^\1\}$/gmsu,
								'',
							).replace(
								/^([ \t]+)if \(config\) \{$.+?^\1\}$/msu,
								'',
							),
						};
					case 'List.js':
						return {
							contents: contents.replace(
								/^(\w+) = .+?^\}\)?;$/gmsu,
								(p0, p1) => ['reject', 'any', 'all'].includes(p1) ? p0 : '',
							),
						};
					case 'no-magic-numbers.js':
						return {
							contents: contents.replace(
								'BigInt(',
								'(typeof BigInt === "function" ? BigInt : Number)(',
							),
						};
					case 'package.json':
						return {
							contents: `{version: "${JSON.parse(contents).version}"}`,
						};
					default:
						throw new Error(`Unexpected file: ${p}`);
				}
			},
		);
	},
};

const config = {
	entryPoints: ['./node_modules/eslint/lib/linter/linter.js'],
	charset: 'utf8',
	bundle: true,
	format: 'cjs',
	logLevel: 'info',
	alias: {
		'acorn-jsx': './shim/acorn-jsx.js',
		ajv: './shim/ajv.js',
		assert: './shim/assert.js',
		debug: './shim/debug.js',
		'eslint-visitor-keys': './node_modules/eslint/node_modules/eslint-visitor-keys/dist/eslint-visitor-keys.cjs',
		path: './shim/path.js',
		util: './shim/util.js',
	},
};

(async () => {
	await esbuild.build({
		...config,
		target: 'es2019',
		outfile: 'bundle/eslint.js',
		legalComments: 'external',
		plugins: [plugin],
	});
	if (shimSet.size > 0) {
		console.error(
			`The following shims were not used in the bundle: ${[...shimSet].join(', ')}`,
		);
	}
})();
