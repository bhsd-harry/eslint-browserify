'use strict';

const path = require('path'),
	fs = require('fs'),
	esbuild = require('esbuild');

const shim = [
		'Func',
		'Num',
		'Obj',
		'Str',
		'ast',
		'config',
		'debug-helpers',
		'flags',
		'flat-config-array',
		'flat-config-schema',
		'option-utils',
		'processor-service',
		'stats',
		'timing',
		'validate-language-options',
		'warning-service',
	],
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
	hasOwn = [
		'eslintrc-universal',
		'eslint-scope',
		'espree',
		'file-report',
		'linter',
		'source-code-fixer',
	],
	shimSet = new Set(shim),
	resolvePath = path.join('build', 'resolve'),
	loadPath = path.join('build', 'load');

if (!fs.existsSync(resolvePath)) {
	fs.mkdirSync(resolvePath, {recursive: true});
}
if (!fs.existsSync(loadPath)) {
	fs.mkdirSync(loadPath, {recursive: true});
}

const polyfillAt = s => s.replace(/\.at\((-\d+)\)/gu, '.slice($1)[0]'),
	polyfillObjectHasOwn = s => s.replaceAll('Object.hasOwn(', 'Object.prototype.hasOwnProperty.call(');

const stringify = obj => {
	if (typeof obj === 'boolean') {
		return JSON.stringify(obj);
	}
	let str = '{\n';
	for (const [key, value] of Object.entries(obj)) {
		str += `\t${/^[a-z_$][\w$]*$/iu.test(key) ? key : JSON.stringify(key)}: ${stringify(value)},\n`;
	}
	str += '}';
	return str;
};

let min = false;

const /** @type {esbuild.Plugin} */ plugin = {
	name: 'alias',
	setup(build) {
		build.onResolve(
			// eslint-disable-next-line require-unicode-regexp
			{filter: new RegExp(String.raw`/(?:${shim.join('|')})(?:\.js)?$`)},
			({path: p, resolveDir}) => {
				const {name, ext} = path.parse(p),
					file = name + (ext || '.js');
				if (min) {
					shimSet.delete(name);
					fs.copyFileSync(require.resolve(path.join(resolveDir, p)), path.resolve(resolvePath, file));
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
						'code',
						'eslint-visitor-keys',
						'estraverse',
						'keyword',
						'List',
						'no-magic-numbers',
						'severity',
						...at,
						...hasOwn.filter(s => !at.includes(s)),
					].join('|')}|(?:${[
						'cjs',
						'eslint-utils',
						'js',
						'prelude-ls/lib',
						'regexpp',
						'rules',
						'token-store',
					].join('|')})/index)\.c?js|(?:package|globals)\.json|rules/[\w-]+\.js)$`,
				),
			},
			({path: p}) => {
				let isRule = /\/rules\/[\w-]+\.js$/u.test(p);
				let contents = fs.readFileSync(p, 'utf8');
				if (isRule) {
					contents = polyfillAt(polyfillObjectHasOwn(contents)).replace(
						/^([ \t]+)schema: (?:\{(?:$.+?^\1|[^\n]*)\}|\[(?:$.+?^\1|[^\n]*)\]),?$/msu,
						'',
					).replace(
						/^([ \t]+)(deprecated|docs): \{.+?^\1\},?$/gmsu,
						'',
					).replace(
						'BigInt(',
						'(typeof BigInt === "function" ? BigInt : Number)(',
					);
					isRule = false;
				}
				const basename = path.basename(p),
					base = /^index\.c?js$/u.test(basename)
						? path.basename(p.slice(0, p.lastIndexOf('/')))
						: basename.slice(0, basename.lastIndexOf('.'));
				switch (base) {
					case 'cjs':
						contents = contents.replace(
							/^exports\.(?:Directive|TextSourceCodeBase) = .+$/gmu,
							'',
						);
						break;
					case 'code':
						contents = contents.replace(
							/(?<=^([ \t]+)function is(?!Identifier)\w+\().+?\1\}$/gmsu,
							') {}',
						).replace(
							/^([ \t]+)NON_ASCII_WHITESPACES = \[.+?^\1\];$/msu,
							'',
						);
						break;
					case 'eslint-scope':
						contents = contents.replace(
							/^([ \t]+)(?:JSX\w+|resolve)\(.+?^\1\}$/gmsu,
							'',
						).replace(
							/^exports\.(?!analyze|Variable)\w+ = .+$/gmu,
							'',
						);
						break;
					case 'eslintrc-universal':
						contents = contents
							.replace(
								/(?<=^([ \t]+)\w+Schema\().+?^\1\}$/gmsu,
								') {}',
							).replace(
								/^([ \t]+)(?:validate(?:ConfigArray|Processor|Globals|Rules|Environment)?|formatErrors)\(.+?^\1\}$/gmsu,
								'',
							)
							.replace(
								/^var ajvOrig = .+?^\};$/msu,
								'var ajvOrig = () => {};',
							)
							.replace(
								/^const \w+(?:Schema|Properties) = .+?^\}\)?;$/gmsu,
								'',
							)
							.replace(
								/(?<=^var naming = \{).+?(?=^\};$)/msu,
								'',
							)
							.replace(
								/(?<=^var ConfigOps = \{).+?(?=^\};$)/msu,
								'normalizeConfigGlobal',
							);
						break;
					case 'eslint-utils':
						contents = contents.replace(
							/(?<=^function (?:getFunction(?:NameWithKind|HeadLocation)|hasSideEffect)\().+?^\}$/gmsu,
							') {}',
						).replace(
							/(?<=^class PatternMatcher \{)$.+?^\}$/msu,
							'}',
						).replace(
							/^const (?:(?:visitor|typeConversionBinaryOps) = [\s\S]+?^\)|typeConversionUnaryOps = .+);$/gmu,
							'',
						).replace(
							/^([ \t]+)\*(?:iterate(?:Cjs|Esm|Property)|_iterateImport)References.+?^\1\}$/gmsu,
							'',
						);
						break;
					case 'eslint-visitor-keys':
						contents = contents.replace(
							'exports.unionWith = unionWith;',
							'',
						);
						break;
					case 'espree':
						contents = contents.replace(
							/(?<=^([ \t]+)get\().+?^\1\}$/msu,
							') { return this.regular; }',
						);
						break;
					case 'estraverse':
						contents = contents.replace(
							/^[ \t]+exports\.(?!Syntax|VisitorKeys)\w+ = .+$/gmu,
							'',
						).replace(
							/^(?:\(function clone\(exports\) \{|\}\(exports\)\);)$/gmu,
							'',
						).replace(
							/^([ \t]+)\w+\.prototype(?:\.\w+|\['\w+'\]) = .+?^\1\};$/gmsu,
							'',
						);
						break;
					case 'globals': {
						const {
							es5,
							es2015,
							browser,
							node,
							'shared-node-browser': shared,
							worker,
							serviceworker,
							commonjs,
							amd,
							mocha,
							jasmine,
							jest,
							phantomjs,
							jquery,
							qunit,
							prototypejs,
							shelljs,
							meteor,
							mongo,
							protractor,
							applescript,
							nashorn,
							atomtest,
							embertest,
							webextensions,
							greasemonkey,
						} = JSON.parse(contents);
						contents = `module.exports = ${stringify(
							{
								es5,
								es2015,
								browser,
								worker,
								node,
								commonjs,
								amd,
								mocha,
								jasmine,
								jest,
								qunit,
								phantomjs,
								nashorn,
								jquery,
								shelljs,
								prototypejs,
								meteor,
								mongo,
								applescript,
								serviceworker,
								atomtest,
								embertest,
								protractor,
								'shared-node-browser': shared,
								webextensions,
								greasemonkey,
							},
							null,
							'\t',
						)}`;
						break;
					}
					case 'indent':
						contents = contents.replace(
							/^([ \t]+)(?:JSX\w+|"JSX\w+\[\w+\]")\(.+?^\1\},$/gmsu,
							'',
						);
						break;
					case 'js':
						contents = contents.replace(
							/^([ \t]+)normalizeLanguageOptions\(.+?^\1\},$/msu,
							'',
						);
						break;
					case 'keyword':
						contents = contents.replace(
							/(?<=^([ \t]+)function isStrictModeReservedWordES6\().+?^\1\}$/gmsu,
							') {}',
						);
						break;
					case 'lib':
						contents = contents.replace(
							/^prelude\.(?!reject|any|all|isItNaN)\w+ = \w+\.\w+;$/gmu,
							'',
						);
						break;
					case 'linter':
						contents = contents
							.replace(
								/^([ \t]+)(?:_verifyWith(?!outProcessors)|#flatVerifyWithoutProcessors).+?^\1\}$/gmsu,
								'',
							)
							.replace(
								/^([ \t]+)if \((?:configType !== "eslintrc"|typeof configToUse\.extractConfig === "function"|options\.preprocess \|\| options\.postprocess|(?:options\.)?stats)\) \{$.+?^\1\}$/gmsu,
								'',
							)
							.replace(
								'configType = "flat"',
								'configType = "eslintrc"',
							)
							.replace(
								/^([ \t]+)flags\.forEach\(.+?^\1\}\);$/msu,
								'',
							)
							.replace(
								/(?<=^function assertEslintrcConfig\().+?^\}$/msu,
								') {}',
							);
						break;
					case 'List':
						contents = contents.replace(
							/^(?:[ \t]+(?!reject|any|all)(\w+): \1,?|(?!reject|any|all)(\w+) = .+?^\}\)?;)$/gmsu,
							'',
						);
						break;
					case 'no-empty-function':
						contents = contents.replace(
							/^const ALLOW_OPTIONS = .+?^\]\);$/msu,
							'',
						);
						break;
					case 'package':
						contents = `module.exports = {version: "${JSON.parse(contents).version}"};`;
						break;
					case 'preserve-caught-error':
						contents = contents.replace(
							/^([ \t]+)if \(errorType === "AggregateError"\) \{.+?^\1\}$/msu,
							'',
						);
						break;
					case 'regexpp':
						contents = contents.replace(
							/^exports\.(?!RegExp(?:Parser|Validator)|visitRegExpAST)\w+ = .+$/gmu,
							'',
						).replace(
							/^([ \t]+)(?:(?:parse|validate)Literal|eatRegExpBody)\(.+?^\1\}$/gmsu,
							'',
						);
						break;
					case 'rules':
						contents = contents.replace(
							/"jsx-quotes": .+$/mu,
							'',
						);
						break;
					case 'severity':
						contents = contents.replace(
							/^[ \t]+normalizeSeverityToNumber,$/mu,
							'',
						);
						break;
					case 'source-code':
						contents = contents.replace(
							/^([ \t]+)(?:apply(?:LanguageOptions|InlineConfig)|getDisableDirectives|markVariableAsUsed|finalize)\(.+?^\1\}$/gmsu,
							'',
						);
						break;
					case 'token-store':
						contents = contents.replace(
							/^([ \t]+)get(?:Token(?:ByRangeStart|sBefore|OrComment\w+)|(?:FirstTokens|LastTokens?)Between)\(.+?^\1\}$/gmsu,
							'',
						);
						break;
					default:
						isRule = true;
				}
				if (at.includes(base)) {
					contents = polyfillAt(contents);
				}
				if (hasOwn.includes(base)) {
					contents = polyfillObjectHasOwn(contents);
				}
				if (min && !isRule) {
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
	entryPoints: ['src/index.ts'],
	outfile: 'build/eslint.js',
	charset: 'utf8',
	bundle: true,
	format: 'cjs',
	logLevel: 'info',
	plugins: [plugin],
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
	await esbuild.build(config);
	min = true;
	await esbuild.build({
		...config,
		minify: true,
		sourcemap: true,
		target: 'es2019',
		format: 'iife',
		outfile: 'bundle/eslint.min.js',
		legalComments: 'external',
	});
	if (shimSet.size > 0) {
		console.error(
			`The following shims were not used in the bundle: ${[...shimSet].join(', ')}`,
		);
	}
})();
