declare interface Environment {
	globals: Record<string, boolean>;
	parserOptions?: {
		ecmaVersion?: number;
		ecmaFeatures?: Record<string, boolean>;
	};
}

declare module '@eslint/eslintrc/universal' {
	export const Legacy: {environments: Map<string, Environment>};
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
