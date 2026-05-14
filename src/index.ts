/* eslint-disable @typescript-eslint/no-require-imports */
import eslint from 'eslint';
import {version} from 'eslint/package.json';
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
import type {Linter} from 'eslint';

class LegacyLinter extends eslint.Linter {
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

Object.assign(eslint, {
	version,
	environments,
	LegacyLinter,
	migrateConfig,
	plugins,
	packages: {
		'eslint/use-at-your-own-risk': unsupported,
		'@eslint-community/eslint-utils': utils,
		'eslint-visitor-keys': keys,
		'eslint-scope': scope,
		espree,
		esquery,
		'natural-compare': compare,
	},
});

export {eslint};
