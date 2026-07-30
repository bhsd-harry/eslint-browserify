import {builtinRules} from 'eslint/use-at-your-own-risk';
import environments from '../vendor/environments.mjs'; // eslint-disable-line n/no-missing-import
import type {Linter, ESLint} from 'eslint';

declare type Config = Linter.LegacyConfig | Linter.Config;

export {environments};
export const plugins: Record<string, ESLint.Plugin> = {};

const vueConfigs = [
	'base',
	'essential',
	'strongly-recommended',
	'strongly-recommended-error',
	'recommended',
	'recommended-error',
	'vue2-essential',
	'vue2-strongly-recommended',
	'vue2-strongly-recommended-error',
	'vue2-recommended',
	'vue2-recommended-error',
].map(c => `plugin:vue/${c}`);

const createRuleConfig = (rules: Linter.RulesRecord): Linter.Config[] =>
	Object.keys(rules).length === 0 ? [] : [{rules}];

const createExtends = (configExtends: Linter.LegacyConfig['extends']): Linter.Config[] => {
	if (!configExtends) {
		return [];
	}
	const configExtendsArray = Array.isArray(configExtends) ? configExtends : [configExtends],
		rules: Linter.RulesRecord = {};
	if (configExtendsArray.includes('eslint:recommended')) {
		for (const [rule, {meta}] of builtinRules) {
			if (meta?.docs?.recommended) {
				rules[rule] = 2;
			}
		}
	}
	if (plugins['vue']?.meta?.name === 'eslint-plugin-vue' && configExtendsArray.some(e => vueConfigs.includes(e))) {
		const plugin = plugins['vue'],
			base = plugin.configs!['base'] as Linter.Config[],
			vueExtends = configExtendsArray.filter(e => vueConfigs.includes(e)).map(e => e.slice(11)),
			active = {
				'vue3-essential': 0,
				'vue3-strongly-recommended': 0,
				'vue3-recommended': 0,
				'vue2-essential': 0,
				'vue2-strongly-recommended': 0,
				'vue2-recommended': 0,
			};
		for (const e of vueExtends) {
			switch (e) {
				case 'recommended':
				case 'recommended-error':
					active['vue3-recommended'] = e === 'recommended' ? 1 : 2;
					// falls through
				case 'strongly-recommended':
				case 'strongly-recommended-error':
					active['vue3-strongly-recommended'] = e === 'strongly-recommended' ? 1 : 2;
					// falls through
				case 'essential':
					active['vue3-essential'] = 2;
					break;
				case 'vue2-recommended':
				case 'vue2-recommended-error':
					active['vue2-recommended'] = e === 'vue2-recommended' ? 1 : 2;
					// falls through
				case 'vue2-strongly-recommended':
				case 'vue2-strongly-recommended-error':
					active['vue2-strongly-recommended'] = e === 'vue2-strongly-recommended' ? 1 : 2;
					// falls through
				case 'vue2-essential':
					active['vue2-essential'] = 2;
				// no default
			}
		}
		for (const rule in plugin.rules) {
			const category = (plugin.rules[rule]!.meta?.docs as {categories?: string[]} | undefined)?.categories
				?.find(c => active[c as keyof typeof active]) as keyof typeof active | undefined;
			if (category) {
				rules[`vue/${rule}`] = active[category] as 1 | 2;
			}
		}
		return [...base, ...createRuleConfig(rules)];
	}
	return createRuleConfig(rules);
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
		properties.sourceType = sourceType !== 'module' && config.env?.['node'] ? 'commonjs' : sourceType;
		if (Object.keys(otherParserOptions).length > 0) {
			properties.parserOptions = otherParserOptions;
		}
	}
	if (parserOptions?.ecmaFeatures) {
		delete parserOptions.ecmaFeatures.jsx;
		if (Object.keys(parserOptions.ecmaFeatures).length > 0) {
			properties.parserOptions ??= {};
			properties.parserOptions.ecmaFeatures ??= {};
			Object.assign(properties.parserOptions.ecmaFeatures, parserOptions.ecmaFeatures);
		}
	}
	return Object.keys(properties).length === 0 ? undefined : properties;
};

const eslintrcKeys = [
	'env',
	'extends',
	'globals',
	'ignorePatterns',
	'noInlineConfig',
	'overrides',
	'parser',
	'parserOptions',
	'reportUnusedDisableDirectives',
	'root',
	'excludedFiles',
];

const isEslintrcConfig = (config: Config): config is Linter.LegacyConfig =>
	eslintrcKeys.some(key => key in config) || Array.isArray(config.plugins);

const migrateConfigObject = (config: Config, base?: boolean): Linter.Config[] => {
	if (!isEslintrcConfig(config)) {
		if ((config.languageOptions as Linter.LanguageOptions | undefined)?.parserOptions?.ecmaFeatures?.jsx) {
			delete (config.languageOptions as Linter.LanguageOptions).parserOptions!.ecmaFeatures!.jsx;
		}
		if (base) {
			config.linterOptions ??= {};
			config.linterOptions.reportUnusedDisableDirectives ??= false;
		}
		return [config];
	}
	const configArrayElements: Linter.Config[] = [];
	if (base) {
		configArrayElements.push({
			linterOptions: {reportUnusedDisableDirectives: false},
		});
	}
	if (config.extends) {
		configArrayElements.push(...createExtends(config.extends));
	}
	const properties: Linter.Config = {};
	const linterOptions = createLinterOptions(config);
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
	if (base && config.overrides) {
		for (const override of config.overrides) {
			configArrayElements.push(...migrateConfigObject(override));
		}
	}
	return configArrayElements;
};

export const migrateConfig = (config: Config | Config[] = []): Linter.Config[] => Array.isArray(config)
	? [
		...(config[0] as Linter.Config | undefined)?.linterOptions?.reportUnusedDisableDirectives === undefined
		&& (config[0] as Linter.LegacyConfig | undefined)?.reportUnusedDisableDirectives === undefined
			? [
				{
					linterOptions: {reportUnusedDisableDirectives: false},
				},
			]
			: [],
		...config.flatMap(c => migrateConfigObject(c)),
	]
	: migrateConfigObject(config, true);
