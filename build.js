'use strict';

const path = require('path'),
	fs = require('fs'),
	esbuild = require('esbuild');

const reduce = '.reduce((acc, cur) => acc.concat(cur), [])';

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
	/** @type {string[]} */ fromEntries = [],
	/** @type {string[]} */ dotAll = [],
	/** @type {string[]} */ trimEnd = [],
	/** @type {string[]} */ flat = [],
	/** @type {string[]} */ flatMap = [],
	/** @type {string[]} */ namedCaptureGroup = [],
	/** @type {string[]} */ namedCaptureGroup2 = [],
	shimSet = new Set(shim);

const /** @type {esbuild.Plugin} */ plugin = {
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
				// eslint-disable-next-line require-unicode-regexp
				filter: new RegExp(
					String.raw`/(?:(?:${[
						'linter',
						'eslintrc-universal',
						'no-magic-numbers',
						'estraverse',
						'Graphemer',
						'ast',
						'List',
						...dotAll,
						...trimEnd,
						...flat,
						...flatMap,
						...namedCaptureGroup,
						...namedCaptureGroup2,
					].join('|')}|(?:${[
						'rules',
						'prelude-ls/lib',
						...fromEntries,
					].join('|')})/index)\.c?js|package\.json)$`,
				),
			},
			({path: p}) => {
				let contents = fs.readFileSync(p, 'utf8'),
					base = path.basename(p);
				base = base === 'index.js'
					? path.basename(p.slice(0, p.lastIndexOf('/')))
					: base.slice(0, base.lastIndexOf('.'));
				switch (base) {
					case 'ast':
						contents = contents.replace(
							/^([ \t]+)(function (?!trailingStatement)\w+)\(.+?^\1\}$/gmsu,
							'$1$2() {}',
						);
						break;
					case 'eslintrc-universal':
						contents = contents.replace(
							/^([ \t]+)(\w+Schema)\(.+?^\1\}$/gmsu,
							'$1$2() {}',
						).replace(
							/^var ajvOrig = .+?^\};$/msu,
							'var ajvOrig = () => {};',
						).replace(
							/^const \w+(?:Schema|Properties) = \{$.+?^\};$/gmsu,
							'',
						);
						break;
					case 'estraverse':
						contents = contents.replace(
							/^([ \t]+)(function \w+)\(.+?^\1\}$/gmsu,
							'$1$2() {}',
						).replace(
							/^([ \t]+)\w+\.prototype\.\w+ = .+?^\1\};$/gmsu,
							'',
						);
						break;
					case 'Graphemer':
						contents = contents.replace(
							/^([ \t]+)(?:iterate|split)Graphemes\(.+?^\1\}$/gmsu,
							'',
						);
						break;
					case 'lib':
						contents = contents.replace(
							/^prelude\.(?!reject|any|all|isItNaN)\w+ = \w+\.\w+;$/gmu,
							'',
						);
						break;
					case 'linter':
						contents = contents.replace(
							/^([ \t]+)(?:_verifyWith(?:\w*ConfigArray\w*|Processor)|define\w+)\(.+?^\1\}$/gmsu,
							'',
						).replace(
							/^([ \t]+)if \(config\) \{$.+?^\1\}$/msu,
							'',
						);
						break;
					case 'List':
						contents = contents.replace(
							/^(?!reject|any|all)(\w+) = .+?^\}\)?;$/gmsu,
							'',
						).replace(
							/^[ \t]+(?!reject|any|all)(\w+): \1,?$/gmu,
							'',
						);
						break;
					case 'no-magic-numbers':
						contents = contents.replace(
							'BigInt(',
							'(typeof BigInt === "function" ? BigInt : Number)(',
						);
						break;
					case 'package':
						contents = `{version: "${JSON.parse(contents).version}"}`;
						break;
					case 'rules':
						contents = contents.replace(
							/"valid-jsdoc": .+$/mu,
							'',
						);
						break;
					// no default
				}
				if (fromEntries.includes(base)) {
					contents = contents.replaceAll(
						'Object.fromEntries',
						'fromEntries',
					);
				}
				if (namedCaptureGroup.includes(base)) {
					contents = contents.replace(
						String.raw`.replace(/^(?<quote>['"]?)(?<ruleId>.*)\k<quote>$/us, "$<ruleId>")`,
						String.raw`.replace(/^(['"]?)(.*)\1$/us, "$2")`,
					);
				}
				if (namedCaptureGroup2.includes(base)) {
					contents = contents.replace(
						String.raw`regex = /(?:[^\\]|(?<previousEscape>\\.))*?(?<decimalEscape>\\[89])/suy;`,
						String.raw`regex = /(?:[^\\]|(\\.))*?(\\[89])/suy;`,
					).replace(
						'const { previousEscape, decimalEscape } = match.groups;',
						'const [, previousEscape, decimalEscape] = match;',
					);
				}
				if (dotAll.includes(base)) {
					contents = contents.replace(
						/(?<!\\)\/((?:[^/]|\\\/)+)\/([dgimuy]*s[dgimuy]*)\b/gu,
						(_, p1, p2) => String.raw`/${
							p1.replace(/(?<!(?<!\\)\\)\./gu, String.raw`[\s\S]`)
						}/${p2.replaceAll('s', '')}`,
					);
				}
				if (trimEnd.includes(base)) {
					contents = contents.replaceAll(
						'.trimEnd()',
						String.raw`.replace(/\s+$/u, '')`,
					);
				}
				if (flat.includes(base)) {
					contents = contents.replaceAll(
						'.flat()',
						reduce,
					);
				}
				if (flatMap.includes(base)) {
					contents = contents.replace(
						/\b(\w+)\.flatMap\(/gu,
						'flattenMap($1, ',
					);
				}
				return {contents};
			},
		);
	},
};

const /** @type {esbuild.BuildOptions} */ config = {
	entryPoints: [path.join(require.resolve('eslint'), '..', 'linter', 'linter.js')],
	charset: 'utf8',
	bundle: true,
	format: 'cjs',
	logLevel: 'info',
	alias: {
		'acorn-jsx': './shim/acorn-jsx.js',
		ajv: './shim/ajv.js',
		assert: './shim/assert.js',
		debug: './shim/debug.js',
		// eslint-disable-next-line n/no-extraneous-require
		'eslint-visitor-keys': require.resolve('eslint-visitor-keys'),
		path: './shim/path.js',
		util: './shim/util.js',
	},
};

(async () => {
	let /** @type {esbuild.BuildOptions} */ options = {
		...config,
		target: 'es2019',
		outfile: 'bundle/eslint.js',
		legalComments: 'external',
		plugins: [plugin],
	};
	await esbuild.build(options);
	if (shimSet.size > 0) {
		console.error(
			`The following shims were not used in the bundle: ${[...shimSet].join(', ')}`,
		);
	}

	shim.push('is-combining-character');
	fromEntries.push('regexpp');
	dotAll.push(
		'config-comment-parser',
		'ast-utils',
		'no-nonoctal-decimal-escape',
		'no-octal-escape',
		'linter',
	);
	trimEnd.push('apply-disable-directives');
	flat.push('node-event-generator');
	flatMap.push('apply-disable-directives', 'max-lines');
	namedCaptureGroup.push('config-comment-parser');
	namedCaptureGroup2.push('no-nonoctal-decimal-escape');
	options = {
		...config,
		target: 'es2017',
		outfile: 'bundle/eslint-es8.js',
		legalComments: 'none',
		plugins: [plugin],
		banner: {
			js: `const flattenMap = (arr, fn) => arr.map(fn)${reduce};
const fromEntries = Object.fromEntries || (iterable => {
	const obj = {};
	for (const [key, value] of iterable) {
		obj[key] = value;
	}
	return obj;
});`,
		},
	};
	await esbuild.build(options);
})();
