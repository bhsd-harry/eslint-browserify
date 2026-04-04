import {Linter} from 'eslint/universal';
import {environments, migrateConfig} from '@bhsd/eslint-util';

export const eslint = {
	environments,
	Linter,
	migrateConfig,
};
