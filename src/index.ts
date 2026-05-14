/* eslint-disable @typescript-eslint/no-require-imports */
import eslint from 'eslint';
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
