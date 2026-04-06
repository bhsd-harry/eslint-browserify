import {builtinRules} from 'eslint/use-at-your-own-risk';
import {Legacy} from '@eslint/eslintrc/universal';
import type {Linter} from 'eslint';

export const {environments} = Legacy;

const createExtends = (configExtends: Linter.LegacyConfig['extends']): Linter.Config[] => {
	if (
		Array.isArray(configExtends)
			? !configExtends.includes('eslint:recommended')
			: configExtends !== 'eslint:recommended'
	) {
		return [];
	}
	const recommendedRules: Linter.RulesRecord = {};
	for (const [rule, {meta}] of builtinRules) {
		if (meta?.docs?.recommended) {
			recommendedRules[rule] = 2;
		}
	}
	return [{rules: recommendedRules}];
};

const createLinterOptions = (config: Linter.LegacyConfig): Linter.LinterOptions | undefined => {
	if (!config.noInlineConfig && !config.reportUnusedDisableDirectives) {
		return undefined;
	}
	const linterOptions: Linter.LinterOptions = {};
	if (config.noInlineConfig) {
		linterOptions.noInlineConfig = true;
	}
	if (config.reportUnusedDisableDirectives) {
		linterOptions.reportUnusedDisableDirectives = config.reportUnusedDisableDirectives;
	}
	return linterOptions;
};

const createGlobals = ({globals, env}: Linter.LegacyConfig): Linter.LanguageOptions => {
	const properties: Linter.Globals = {},
		options: Linter.LanguageOptions = {};
	for (const e in env) {
		const environment = environments.get(e);
		if (environment) {
			Object.assign(properties, environment.globals);
			const {ecmaFeatures, ecmaVersion} = environment.parserOptions ?? {};
			if (ecmaVersion) {
				options.ecmaVersion = ecmaVersion as Linter.EcmaVersion;
			}
			if (ecmaFeatures) {
				options.parserOptions ??= {ecmaFeatures: {}};
				Object.assign(options.parserOptions.ecmaFeatures!, ecmaFeatures);
			}
		}
	}
	Object.assign(properties, globals);
	if (Object.keys(properties).length > 0) {
		options.globals = properties;
	}
	return options;
};

const createLanguageOptions = (config: Linter.LegacyConfig): Linter.LanguageOptions | undefined => {
	const properties: Linter.LanguageOptions = {},
		{globals, ecmaVersion: version, parserOptions} = createGlobals(config);
	if (globals) {
		properties.globals = globals;
	}
	if (version) {
		properties.ecmaVersion = version;
	}
	if (config.parserOptions) {
		const {
			ecmaVersion = 5,
			sourceType = 'script',
			...otherParserOptions
		} = config.parserOptions;
		properties.ecmaVersion = ecmaVersion;
		properties.sourceType = config.env?.['node'] && sourceType !== 'module' ? 'commonjs' : sourceType;
		if (Object.keys(otherParserOptions).length > 0) {
			properties.parserOptions = otherParserOptions;
		}
	}
	if (parserOptions?.ecmaFeatures) {
		properties.parserOptions ??= {};
		properties.parserOptions.ecmaFeatures ??= {};
		Object.assign(properties.parserOptions.ecmaFeatures, parserOptions.ecmaFeatures);
	}
	return Object.keys(properties).length === 0 ? undefined : properties;
};

const migrateConfigObject = (config: Linter.LegacyConfig, base?: boolean): Linter.Config[] => {
	const configArrayElements: Linter.Config[] = [];
	if (config.extends) {
		configArrayElements.push(...createExtends(config.extends));
	}
	const properties: Linter.Config = {};
	let linterOptions = createLinterOptions(config);
	if (base) {
		linterOptions ??= {};
		linterOptions.reportUnusedDisableDirectives ??= false;
	}
	if (linterOptions) {
		properties.linterOptions = linterOptions;
	}
	const languageOptions = createLanguageOptions(config);
	if (languageOptions) {
		properties.languageOptions = languageOptions;
	}
	if (config.settings) {
		properties.settings = config.settings;
	}
	if (config.rules) {
		properties.rules = config.rules;
	}
	if (Object.keys(properties).length > 0) {
		configArrayElements.push(properties);
	}
	return configArrayElements;
};

export const migrateConfig = (config: Linter.LegacyConfig | Linter.Config[] = []): Linter.Config[] => {
	if (Array.isArray(config)) {
		return config;
	}
	const configArrayElements = migrateConfigObject(config, true);
	if (config.overrides) {
		for (const override of config.overrides) {
			configArrayElements.push(...migrateConfigObject(override));
		}
	}
	return configArrayElements;
};
