'use strict';

const path = require('path'),
	fs = require('fs'),
	{spawnSync} = require('child_process'),
	esbuild = require('esbuild');

const shim = [
		'ajv',
		'ast',
		'debug-helpers',
		'flags',
		'stats',
		'timing',
		'warning-service',
		'windows',
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

const stringify = obj => {
	if (typeof obj === 'boolean') {
		return JSON.stringify(obj);
	}
	let str = '{\n';
	for (const key in obj) {
		str += `\t${/^[a-z_$][\w$]*$/iu.test(key) ? key : JSON.stringify(key)}: ${stringify(obj[key])},\n`;
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
			{filter: new RegExp(String.raw`/(?:${shim.join('|')})(?:\.c?js)?$`)},
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
						'api',
						'code',
						'config',
						'eslint-scope',
						'esrecurse',
						'estraverse',
						'flat-config-array',
						'flat-config-schema',
						'index-universal',
						'keyword',
						'linter',
						'posix',
						'unsupported-api',
					].join('|')}|(?:${[
						'config-array/dist/cjs',
						'eslint-utils',
						'object-schema/dist/cjs',
						'plugin-kit/dist/cjs',
						'regexpp',
						'rules',
						'token-store',
						'type-check/lib',
					].join('|')})/index)\.c?js|(?:package|globals)\.json|rules/[\w-]+\.js)$`,
				),
			},
			({path: p}) => {
				let isRule = /\/rules\/[\w-]+\.js$/u.test(p);
				let contents = fs.readFileSync(p, 'utf8');
				if (isRule) {
					contents = contents
						.replaceAll(
							/^([ \t]+)(?:schema|deprecated): (?:\{(?:$.+?^\1|[^\n]*)\}|\[(?:$.+?^\1|[^\n]*)\]),?$/gmsu,
							'',
						)
						.replaceAll(
							/language: "javascript",|dialects: \["(?:java|type)script", "(?:java|type)script"\],/gu,
							'',
						)
						.replace(
							/^([ \t]+)docs: (\{.+?^\1\}),?$/msu,
							(_, __, docs) => {
								const {stdout} = spawnSync(
									process.execPath,
									[
										'--permission',
										'-e',
										`const obj = ${docs}; console.log(obj.recommended ? 1 : '');`,
									],
									{encoding: 'utf8'},
								);
								return stdout.trim() ? 'docs: {recommended: true},' : '';
							},
						);
					isRule = false;
				}
				const basename = path.basename(p);
				let base;
				if (/^index\.c?js$/u.test(basename)) {
					const i = p.lastIndexOf('/');
					if (/\/cjs\/index\.c?js$/u.test(p)) {
						const j = p.lastIndexOf('/', i - 1);
						base = path.basename(p.slice(0, p.lastIndexOf('/', j - 1)));
					} else {
						base = path.basename(p.slice(0, i));
					}
				} else {
					base = basename.slice(0, basename.lastIndexOf('.'));
				}
				switch (base) {
					case 'api':
						contents = contents
							.replace(
								/(?<=^module\.exports = \{$).+?(?=^\};$)/msu,
								'Linter, SourceCode',
							)
							.replaceAll(
								/^const \{ (?:ESLint|RuleTester) \} = require\(.+/gmu,
								'',
							);
						break;
					case 'code':
						contents = contents.replaceAll(
							/^([ \t]+)(?:function is(?!Identifier)\w+\([\s\S]+?\1\}|NON_ASCII_WHITESPACES = [\s\S]+?\1\];)$|^[ \t]+(is(?!Identifier)\w+): \2,$/gmu,
							'',
						);
						break;
					case 'config':
						contents = contents
							.replace(
								/(?<=^([ \t]+)validateRulesConfig\().+?^\1\}$/msu,
								') {}',
							)
							.replaceAll(
								/^([ \t]+)(?:toJSON|static getRuleOptionsSchema)\(.+?^\1\}$/gmsu,
								'',
							);
						break;
					case 'config-array':
						contents = contents
							.replaceAll(
								/(?<=^([ \t]+)isDirectoryIgnored\().+?^\1\}$|(?<=^function shouldIgnorePath\().+?^\}$/gmsu,
								') { return false; }',
							)
							.replaceAll(
								/^([ \t]+)(?:async normalize|is(?:File)?Ignored|getConfigStatus)\(.+?^\1\}$/gmsu,
								'',
							);
						break;
					case 'eslint-scope':
						contents = contents.replaceAll(
							/^exports\.(?!analyze )\w+ = .+$|^([ \t]+)JSX\w+\([\s\S]+?^\1\}$/gmu,
							'',
						);
						break;
					case 'eslint-utils':
						contents = contents
							.replace(
								/(?<=^class PatternMatcher \{$).+?^\}$/msu,
								'}',
							)
							.replaceAll(
								/(?<=^function (?:getFunction(?:NameWithKind|HeadLocation)|hasSideEffect|is(?!Comment|(?:Opening|Closing)Paren)\w+Token)\().+?^\}$/gmsu,
								') {}',
							)
							.replaceAll(
								/^([ \t]+)\*iteratePropertyReferences\b[\s\S]+?^\1\}$|^const (?:(?:visitor|typeConversionBinaryOps) = [\s\S]+?^\)|typeConversionUnaryOps = .+);$/gmu,
								'',
							);
						break;
					case 'esrecurse':
						contents = contents.replaceAll(
							/^([ \t]+)exports\.(?:version = .+|visit = [\s\S]+?^\1\};)$/gmu,
							'',
						);
						break;
					case 'estraverse':
						contents = contents.replaceAll(
							/^([ \t]+)function \w+\([\s\S]+?^\1\}$|^([ \t]+)\w+\.prototype(?:\.\w+|\['\w+'\]) = [\s\S]+?^\2\};$|^[ \t]+exports\.(?!Syntax |VisitorKeys )\w+ = .+$|^(?:\(function clone\(exports\) \{|\}\(exports\)\);)$/gmu,
							'',
						);
						break;
					case 'flat-config-array':
						contents = contents.replace(
							/^([ \t]+)normalize\(.+?^\1\}$/msu,
							'',
						);
						break;
					case 'flat-config-schema':
						contents = contents.replace(
							/^[ \t]+hasMethod,$/mu,
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
						contents = contents.replaceAll(
							/^([ \t]+)(?:JSX\w+|"JSX\w+\[\w+\]")\(.+?^\1\},$/gmsu,
							'',
						);
						break;
					case 'index-universal':
						contents = contents
							.replace(
								/^const Legacy = \{.+?^\};$/msu,
								'const Legacy = {environments};',
							)
							.replaceAll(
								/^import (?!environments ).+/gmu,
								'',
							);
						break;
					case 'keyword':
						contents = contents.replaceAll(
							/^[ \t]+(is(?!IdentifierES)\w+): \1,$/gmu,
							'',
						);
						break;
					case 'lib':
						contents = contents
							.replace(
								/^([ \t]+)typeCheck = .+?^\1\};$/msu,
								'',
							)
							.replaceAll(
								/^[ \t]+(VERSION|typeCheck): \1,$/gmu,
								'',
							);
						break;
					case 'linter':
						contents = contents
							.replaceAll(
								/^([ \t]+)(?:hasFlag\(|if \((?:firstCall|(?:options\.)?stats)\b).+?^\1\}$|^([ \t]+)flags\.forEach\(.+?^\2\}\);$/gmsu,
								'',
							)
							.replace(
								'< MAX_AUTOFIX_PASSES',
								'< (globalThis.eslint?.MAX_AUTOFIX_PASSES || MAX_AUTOFIX_PASSES)',
							);
						break;
					case 'no-empty-function':
						contents = contents.replace(
							/^const ALLOW_OPTIONS = .+?^\]\);$/msu,
							'',
						);
						break;
					case 'object-schema':
						contents = contents.replace(
							/(?<=^([ \t]+)validate\()object\).+?^\1\}$/msu,
							') {}',
						);
						break;
					case 'package':
						contents = `exports.version = "${JSON.parse(contents).version}";`;
						break;
					case 'plugin-kit':
						contents = contents.replace(
							/^exports\.TextSourceCodeBase = .+$/mu,
							'',
						);
						break;
					case 'posix':
						contents = contents.replaceAll(
							/^exports\.(?:(?:to|from)FileUrl|normalize(?:Glob)?|join(?:Globs)?|isGlob|globToRegExp|format|(?:base|ext)name|common|parse|SEPARATOR_PATTERN|DELIMITER) = .+$/gmu,
							'',
						);
						break;
					case 'preserve-caught-error':
						contents = contents.replace(
							/^([ \t]+)if \(errorType === "AggregateError"\) \{.+?^\1\}$/msu,
							'',
						);
						break;
					case 'regexpp':
						contents = contents.replaceAll(
							/^exports\.(?!RegExp(?:Parser|Validator)|visitRegExpAST)\w+ = .+$|^([ \t]+)(?:(?:parse|validate)Literal|eatRegExpBody)\([\s\S]+?^\1\}$/gmu,
							'',
						);
						break;
					case 'rules':
						contents = contents.replace(
							/"jsx-quotes": .+$/mu,
							'',
						);
						break;
					case 'token-store':
						contents = contents.replaceAll(
							/^([ \t]+)get(?:Token(?:ByRangeStart|sBefore)|(?:FirstTokens|LastTokens?)Between)\(.+?^\1\}$/gmsu,
							'',
						);
						break;
					case 'unsupported-api':
						contents = contents.replace(
							'require("./eslint/eslint")',
							'{}',
						);
						break;
					default:
						isRule = true;
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
	charset: 'utf8',
	bundle: true,
	format: 'esm',
	logLevel: 'info',
	plugins: [plugin],
	alias: {
		/* eslint-disable n/no-extraneous-require */
		'@eslint-community/eslint-utils': require.resolve('@eslint-community/eslint-utils'),
		'acorn-jsx': './shim/acorn-jsx.js',
		debug: './shim/debug.js',
		'escape-string-regexp': require.resolve('escape-string-regexp'),
		'eslint-scope': require.resolve('eslint-scope'),
		'eslint-visitor-keys': require.resolve('eslint-visitor-keys'),
		espree: require.resolve('espree'),
		ignore: './shim/ignore.js',
		minimatch: './shim/minimatch.js',
		'node:path': './shim/path.js',
		'prelude-ls': './shim/prelude-ls.js',
		/* eslint-enable n/no-extraneous-require */
	},
};

(async () => {
	await esbuild.build({
		...config,
		outfile: 'build/eslint.js',
		legalComments: 'none',
	});
	min = true;
	await esbuild.build({
		...config,
		minify: true,
		outfile: 'bundle/linter.min.js',
	});
	if (shimSet.size > 0) {
		console.error(
			`The following shims were not used in the bundle: ${[...shimSet].join(', ')}`,
		);
	}
})();
