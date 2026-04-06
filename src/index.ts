import {Linter} from 'eslint/universal';
import {environments, migrateConfig} from './migrate';

export const eslint = {
	environments,
	Linter,
	migrateConfig,
};
