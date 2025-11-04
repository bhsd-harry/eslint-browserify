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
	shimSet = new Set(shim),
	resolvePath = path.join('build', 'resolve'),
	loadPath = path.join('build', 'load');

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
				fs.copyFileSync(require.resolve(path.join(resolveDir, p)), path.resolve(resolvePath, file));
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
					].join('|')}|(?:${[
						'cjs',
						'prelude-ls/lib',
						'rules',
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
							'$2() {}',
						);
						break;
					case 'cjs':
						contents = contents.replace(
							/(?<=^class TextSourceCodeBase \{)$.+?^\}$/msu,
							'}',
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
							/(?<=^function (?:normalizePackageName|getShorthandName|getNamespaceFromTerm)\().+?^\}$/gmsu,
							') {}',
						);
						break;
					case 'espree':
						contents = contents.replace('useJsx ? this.jsx : ', '');
						break;
					case 'estraverse':
						contents = contents.replace(
							/^([ \t]+)(function \w+)\(.+?^\1\}$/gmsu,
							'$2() {}',
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
				if (!isRule) {
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
	await esbuild.build({
		...config,
		target: 'es2019',
		outfile: 'build/eslint.js',
		plugins: [plugin],
	});
	if (shimSet.size > 0) {
		console.error(
			`The following shims were not used in the bundle: ${[...shimSet].join(', ')}`,
		);
	}
})();
