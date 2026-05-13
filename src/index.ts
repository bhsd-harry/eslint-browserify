/* eslint-disable n/no-extraneous-import */
import eslint from 'eslint';
import * as utils from '@eslint-community/eslint-utils';
import * as keys from 'eslint-visitor-keys';
import * as scope from 'eslint-scope';
// @ts-expect-error no types available
import * as espree from 'espree';
// @ts-expect-error no types available
import * as esquery from 'esquery';
// @ts-expect-error no types available
import * as compare from 'natural-compare';
import {environments, migrateConfig} from './migrate';
import type {Linter} from 'eslint';

class LegacyLinter extends eslint.Linter {
	// @ts-expect-error Override to accept both legacy and flat config formats
	override verify(code: string, config: Linter.LegacyConfig | Linter.Config[]): Linter.LintMessage[] {
		return super.verify(code, migrateConfig(config));
	}

	// @ts-expect-error Override to accept both legacy and flat config formats
	override verifyAndFix(code: string, config: Linter.LegacyConfig | Linter.Config[]): Linter.FixReport {
		return super.verifyAndFix(code, migrateConfig(config));
	}
}

Object.assign(eslint, {
	environments,
	LegacyLinter,
	migrateConfig,
	packages: {
		'@eslint-community/eslint-utils': utils,
		'eslint-visitor-keys': keys,
		'eslint-scope': scope,
		espree,
		esquery,
		'natural-compare': compare,
	},
});

export {eslint};
