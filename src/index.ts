/* eslint-disable @typescript-eslint/no-require-imports, unicorn/no-top-level-side-effects */
import {Linter, SourceCode} from 'eslint';
import unsupported = require('eslint/use-at-your-own-risk');
import utils = require('@eslint-community/eslint-utils');
import keys = require('eslint-visitor-keys');
import scope = require('eslint-scope');
// @ts-expect-error no types available
import espree = require('espree');
// @ts-expect-error no types available
import esquery = require('esquery');
// @ts-expect-error no types available
import compare = require('natural-compare');
import {environments, migrateConfig, plugins} from './migrate';
import type {ESLint} from 'eslint';

class LegacyLinter extends Linter {
	// @ts-expect-error Override to accept both legacy and flat config formats
	override verify(
		code: string,
		config: Linter.LegacyConfig | Linter.Config[],
		filename?: string,
	): Linter.LintMessage[] {
		return super.verify(code, migrateConfig(config), filename);
	}

	// @ts-expect-error Override to accept both legacy and flat config formats
	override verifyAndFix(
		code: string,
		config: Linter.LegacyConfig | Linter.Config[],
		filename?: string,
	): Linter.FixReport {
		return super.verifyAndFix(code, migrateConfig(config), filename);
	}
}

const packages = {
	'eslint/use-at-your-own-risk': unsupported,
	'@eslint-community/eslint-utils': utils,
	'eslint-visitor-keys': keys,
	'eslint-scope': scope,
	espree,
	esquery,
	'natural-compare': compare,
};

export const eslint = {
	version: Linter.version,
	environments,
	Linter,
	LegacyLinter,
	migrateConfig,
	plugins,
	async loadPlugin(plugin: string): Promise<void> {
		if (plugin !== 'vue' && plugin !== 'eslint-plugin-vue') {
			throw new RangeError(`Plugin ${JSON.stringify(plugin)} is not supported!`);
		} else if (plugins['vue']?.meta?.name !== 'eslint-plugin-vue') {
			// @ts-expect-error download the plugin from CDN
			// eslint-disable-next-line n/no-missing-import
			plugins['vue'] = (await import('./eslint-plugin-vue.min.js') as {default: ESLint.Plugin}).default;
		}
	},
};
Object.defineProperties(eslint, {
	SourceCode: {enumerable: false, value: SourceCode},
	packages: {enumerable: false, value: packages},
});
