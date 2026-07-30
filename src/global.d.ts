declare interface Environment {
	globals: Record<string, boolean>;
	parserOptions?: {
		ecmaVersion?: number;
		ecmaFeatures?: Record<string, boolean>;
	};
}

declare module '../vendor/*' {
	declare const environments: Map<string, Environment>;
	export default environments;
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
