declare module '@eslint/eslintrc/universal' {
	export const Legacy: {environments: Map<string, unknown>};
}

declare module '../bundle/*' {
	import type {environments, migrateConfig} from '@bhsd/eslint-util';
	import type {Linter} from 'eslint';

	export const eslint: {
		environments: typeof environments;
		Linter: typeof Linter;
		migrateConfig: typeof migrateConfig;
	};
}
