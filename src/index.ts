import {Linter} from 'eslint/universal';
import {environments, migrateConfig} from './migrate';

class LegacyLinter extends Linter {
	// @ts-expect-error Override to accept both legacy and flat config formats
	override verify(code: string, config: Linter.LegacyConfig | Linter.Config[]): Linter.LintMessage[] {
		return super.verify(code, migrateConfig(config));
	}

	// @ts-expect-error Override to accept both legacy and flat config formats
	override verifyAndFix(code: string, config: Linter.LegacyConfig | Linter.Config[]): Linter.FixReport {
		return super.verifyAndFix(code, migrateConfig(config));
	}
}

export const eslint = {
	environments,
	Linter,
	LegacyLinter,
	migrateConfig,
};
