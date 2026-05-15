'use strict';

const path = require('path'),
	fs = require('fs'),
	{spawnSync} = require('child_process'),
	esbuild = require('esbuild'),
	{red} = require('@bhsd/nodejs');

const shim = [
		'indent-ts',
		'selector',
		'ts-utils/index',
	],
	shimSet = new Set(shim),
	resolvePath = path.join('build', 'vue-resolve'),
	loadPath = path.join('build', 'vue-load');

if (!fs.existsSync(resolvePath)) {
	fs.mkdirSync(resolvePath, {recursive: true});
}
if (!fs.existsSync(loadPath)) {
	fs.mkdirSync(loadPath, {recursive: true});
}

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
					if (name === 'index') {
						const shimName = [...shimSet].find(s => s.endsWith('/index'));
						shimSet.delete(shimName);
					} else {
						shimSet.delete(name);
					}
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
						'base',
						'plugin',
					].join('|')}|(?:${[
						'utils',
						'vue-eslint-parser/dist',
					].join('|')})/index)\.c?js|rules/[\w-]+\.js)$`,
				),
			},
			({path: p}) => {
				const original = fs.readFileSync(p, 'utf8');
				let contents = original,
					isRule = /\/rules\/[\w-]+\.js$/u.test(p);
				if (isRule) {
					contents = contents
						.replace(
							/^([ \t]+)schema: (?:\{(?:$[\s\S]+?^\1|.*)\}|\[(?:.*\]|[\s\S]+?^\1(?=\S).*\])),?$/mu,
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
											`const obj = ${docs}; console.log(obj.categories ?? '');`,
										],
										{encoding: 'utf8'},
									),
									categories = stdout.trim();
								return categories ? `docs: {categories: ${categories}},` : '';
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
					case 'base':
						contents = contents.replace(
							/"vue\/jsx-uses-vars": .+/u,
							'',
						);
						break;
					case 'dist':
						contents = contents
							.replaceAll(
								/^([ \t]*)(?:defineCustomBlocksVisitor\(.+?^\1\},|if \(generic\) \{$.+?^\1\})$/gmsu,
								'',
							)
							.replaceAll(
								/(?<=^function (?:extractGeneric|parseGenericExpression)\().+?^\}$/gmsu,
								') {}',
							)
							.replace(
								'if (parser !== "espree") return require(parser);',
								'',
							);
						break;
					case 'max-len':
						contents = contents.replaceAll(
							/^([ \t]+)const OPTIONS_.*SCHEMA = \{[\s\S]+?^\1.*\};$/gmu,
							'',
						);
						break;
					case 'plugin': {
						const rules = [
							'define-emits-declaration',
							'define-props-declaration',
							'jsx-uses-vars',
							'no-unsupported-features',
							'require-explicit-slots',
							'require-typed-object-prop',
							'require-typed-ref',
						].join('|');
						contents = contents
							.replaceAll(
								new RegExp(String.raw`^[ \t]*"(?:${rules})": .+`, 'gmu'),
								'',
							)
							.replaceAll(
								new RegExp(
									String.raw`(?<=^const .+ = )require\('\.\/rules\/(?:${rules})\.js'\);$`,
									'gmu',
								),
								'{};',
							);
						break;
					}
					case 'utils':
						contents = contents
							.replace(
								'baseRule.meta.docs.description',
								'baseRule.meta.docs?.description',
							)
							.replace(
								'createRequire(require.resolve("eslint"))("eslint-scope")',
								'require("eslint-scope")',
							)
							.replaceAll(
								/(?<=^([ \t]*)function (?:withinTypeNode|getStylisticRule)\().+?^\1\}$/gmsu,
								') {}',
							)
							.replaceAll(
								/^([ \t]+)extensionSource: \{$.+?^\1\}$/gmsu,
								'',
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
				if (!isRule && contents === original) {
					console.error(red(`No changes were made to ${p}`));
				}
				return {contents};
			},
		);
	},
};

const /** @type {esbuild.BuildOptions} */ config = {
	entryPoints: ['src/vue.ts'],
	charset: 'utf8',
	bundle: true,
	format: 'esm',
	logLevel: 'info',
	plugins: [plugin],
	alias: {
		assert: './shim/assert.js',
		debug: './shim/debug.js',
		events: './shim/events.js',
		'node:fs': './shim/fs.js',
		module: './shim/module.js',
		'node:module': './shim/module.js',
		path: './shim/path.js',
		'node:path': './shim/path.js',
		semver: './shim/semver.js',
	},
	external: [
		'@eslint-community/eslint-utils',
		'eslint',
		'eslint-scope',
		'eslint-visitor-keys',
		'espree',
		'esquery',
		'natural-compare',
	],
	banner: {
		js: fs.readFileSync('shim/require.js', 'utf8'),
	},
};

(async () => {
	await esbuild.build({
		...config,
		outfile: 'build/eslint-plugin-vue.js',
		legalComments: 'none',
	});
	min = true;
	await esbuild.build({
		...config,
		minify: true,
		outfile: 'bundle/eslint-plugin-vue.min.js',
	});
	if (shimSet.size > 0) {
		console.error(
			red('The following shims were not used in the bundle: ') + [...shimSet].join(', '),
		);
	}
})();
