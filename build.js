'use strict';

const path = require('path'),
	fs = require('fs'),
	esbuild = require('esbuild');

const shim = [
		'Func',
		'Num',
		'Obj',
		'Str',
		'config',
		'flat-config-array',
		'flat-config-schema',
		'option-utils',
		'processor-service',
		'stats',
		'timing',
		'validate-language-options',
		'warning-service',
	],
	/** @type {string[]} */ fromEntries = [],
	/** @type {string[]} */ dotAll = [],
	/** @type {string[]} */ flat = [],
	/** @type {string[]} */ flatMap = [],
	/** @type {string[]} */ namedCaptureGroup = [],
	at = [
		'apply-disable-directives',
		'ast-utils',
		'code-path',
		'eslint-scope',
		'espree',
		'file-report',
		'fork-context',
		'source-code',
	],
	objectHasOwn = [
		'eslint-scope',
		'eslintrc-universal',
		'espree',
		'file-report',
		'linter',
		'source-code-fixer',
	],
	shimSet = new Set(shim),
	reduce = '.reduce((acc, cur) => acc.concat(cur), [])',
	resolvePath = path.join('build', 'resolve'),
	loadPath = path.join('build', 'load');
let copy = true;

if (!fs.existsSync(resolvePath)) {
	fs.mkdirSync(resolvePath, {recursive: true});
}
if (!fs.existsSync(loadPath)) {
	fs.mkdirSync(loadPath, {recursive: true});
}

const /** @type {esbuild.Plugin} */ plugin = {
	name: 'alias',
	setup(build) {
		build.onResolve(
			// eslint-disable-next-line require-unicode-regexp
			{filter: new RegExp(String.raw`/(?:${shim.join('|')})(?:\.js)?$`)},
			({path: p, resolveDir}) => {
				const {name, ext} = path.parse(p),
					file = name + (ext || '.js');
				shimSet.delete(name);
				if (copy) {
					fs.copyFileSync(
						require.resolve(path.join(resolveDir, p)),
						path.resolve(resolvePath, file),
					);
				}
				return {
					path: path.resolve('shim', file),
				};
			},
		);
		build.onLoad(
			{
				// eslint-disable-next-line require-unicode-regexp
				filter: new RegExp(
					String.raw`/(?:(?:${[
						'ast',
						'eslintrc-universal',
						'espree',
						'estraverse',
						'linter',
						'List',
						'no-magic-numbers',
						...dotAll,
						...flat,
						...flatMap,
						...namedCaptureGroup,
						...at,
						...objectHasOwn,
					].join('|')}|(?:${[
						'cjs',
						'prelude-ls/lib',
						'rules',
						...fromEntries,
					].join('|')})/index)\.c?js|package\.json|rules/[\w-]+\.js)$`,
				),
			},
			({path: p}) => {
				let contents = fs.readFileSync(p, 'utf8'),
					isRule = false;
				if (/\/rules\/[\w-]+\.js$/u.test(p)) {
					contents = contents.replace(
						/^([ \t]+)schema: (?:\{(?:$.+?^\1|[^\n]*)\}|\[(?:$.+?^\1|[^\n]*)\]),?$/msu,
						'',
					).replace(
						/\b([\w.]+)\.at\(-([12])\)/gu,
						'$1[$1.length - $2]',
					).replaceAll(
						'Object.hasOwn(',
						'Object.prototype.hasOwnProperty.call(',
					);
					isRule = true;
				}
				const basename = path.basename(p),
					base = /^index\.c?js$/u.test(basename)
						? path.basename(p.slice(0, p.lastIndexOf('/')))
						: basename.slice(0, basename.lastIndexOf('.'));
				switch (base) {
					case 'ast':
						contents = contents.replace(
							/^([ \t]+)(function (?!trailingStatement)\w+)\(.+?^\1\}$/gmsu,
							'$1$2() {}',
						);
						break;
					case 'cjs':
						contents = contents.replace(
							/^(class TextSourceCodeBase \{)$.+?^\}$/msu,
							'$1}',
						);
						break;
					case 'eslintrc-universal':
						contents = contents.replace(
							/^([ \t]+)(\w+Schema\().+?^\1\}$/gmsu,
							'$2) {}',
						).replace(
							/^var ajvOrig = .+?^\};$/msu,
							'var ajvOrig = () => {};',
						).replace(
							/^const \w+(?:Schema|Properties) = .+?^\}\)?;$/gmsu,
							'',
						).replace(
							/^(function (?:normalizePackageName|getShorthandName|getNamespaceFromTerm)\().+?^\}$/gmsu,
							'$1) {}',
						);
						break;
					case 'espree':
						contents = contents.replace('useJsx ? this.jsx : ', '');
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
					case 'lib':
						contents = contents.replace(
							/^prelude\.(?!reject|any|all|isItNaN)\w+ = \w+\.\w+;$/gmu,
							'',
						);
						break;
					case 'linter':
						contents = contents.replace(
							/^([ \t]+)(?:(?:_verifyWith(?:\w*ConfigArray\w*|Processor)|#flatVerifyWithoutProcessors)\(|if \((?:configType !== "eslintrc"|typeof configToUse\.extractConfig === "function"|options\.preprocess \|\| options\.postprocess|(?:options\.)?stats)\) \{$).+?^\1\}$/gmsu,
							'',
						).replace('configType = "flat"', 'configType = "eslintrc"');
						break;
					case 'List':
						contents = contents.replace(
							/^(?:[ \t]+(?!reject|any|all)(\w+): \1,?|(?!reject|any|all)(\w+) = .+?^\}\)?;)$/gmsu,
							'',
						);
						break;
					case 'no-magic-numbers':
						contents = contents.replace(
							'BigInt(',
							'(typeof BigInt === "function" ? BigInt : Number)(',
						);
						isRule = false;
						break;
					case 'package':
						contents = `{version: "${JSON.parse(contents).version}"}`;
						break;
					case 'rules':
						contents = contents.replace(
							/"(?:valid-jsdoc|jsx-quotes)": .+$/mu,
							'',
						);
					// no default
				}
				if (fromEntries.includes(base)) {
					contents = contents.replaceAll(
						'Object.fromEntries',
						'fromEntries',
					);
					isRule = false;
				}
				if (namedCaptureGroup.includes(base)) {
					contents = contents.replace(
						String.raw`regex = /(?:[^\\]|(?<previousEscape>\\.))*?(?<decimalEscape>\\[89])/suy;`,
						String.raw`regex = /(?:[^\\]|(\\.))*?(\\[89])/suy;`,
					).replace(
						'const { previousEscape, decimalEscape } = match.groups;',
						'const [, previousEscape, decimalEscape] = match;',
					);
					isRule = false;
				}
				if (dotAll.includes(base)) {
					contents = contents.replace(
						/(?<!\\)\/((?:[^/]|\\\/)+)\/([dgimuy]*s[dgimuy]*)\b/gu,
						(_, p1, p2) => String.raw`/${
							p1.replace(/(?<!(?<!\\)\\)\./gu, String.raw`[\s\S]`)
						}/${p2.replaceAll('s', '')}`,
					);
					isRule = false;
				}
				if (flat.includes(base)) {
					contents = contents.replaceAll(
						'.flat()',
						reduce,
					);
					isRule = false;
				}
				if (flatMap.includes(base)) {
					contents = contents.replace(
						/\b([\w.]+\s*)\.flatMap\(/gu,
						'flattenMap($1, ',
					);
					isRule = false;
				}
				if (at.includes(base)) {
					contents = contents.replace(
						/\b([\w.]+)\.at\(-1\)/gu,
						'$1[$1.length - 1]',
					);
				}
				if (objectHasOwn.includes(base)) {
					contents = contents.replaceAll(
						'Object.hasOwn(',
						'Object.prototype.hasOwnProperty.call(',
					);
				}
				if (!copy && !isRule) {
					fs.copyFileSync(
						p,
						path.resolve(loadPath, (/^index\.c?js$/u.test(basename) ? `${base}-` : '') + basename),
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
		debug: './shim/debug.js',
		// eslint-disable-next-line n/no-extraneous-require
		'eslint-visitor-keys': require.resolve('eslint-visitor-keys'),
		'node:path': './shim/path.js',
		'node:util': './shim/util.js',
	},
};

(async () => {
	let /** @type {esbuild.BuildOptions} */ options = {
		...config,
		target: 'es2019',
		outfile: 'build/eslint.js',
		plugins: [plugin],
	};
	await esbuild.build(options);
	copy = false;
	if (shimSet.size > 0) {
		console.error(
			`The following shims were not used in the bundle: ${[...shimSet].join(', ')}`,
		);
	}

	shim.push('is-combining-character');
	fromEntries.push('regexpp');
	dotAll.push(
		'ast-utils',
		'cjs',
		'no-misleading-character-class',
		'no-nonoctal-decimal-escape',
		'no-octal-escape',
		'linter',
	);
	flat.push('esquery', 'no-useless-backreference');
	flatMap.push('apply-disable-directives', 'max-lines', 'no-useless-assignment');
	namedCaptureGroup.push('no-nonoctal-decimal-escape');
	options = {
		...config,
		target: 'es2017',
		outfile: 'build/eslint-es8.js',
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
