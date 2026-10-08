import * as vue from 'eslint-plugin-vue';
import type {ESLint, Linter} from 'eslint';

declare type Category = `vue${'3' | '2'}-${'essential' | `${'strongly-' | ''}recommended`}` | 'base';
declare type ConfigKey = `${'' | 'vue2-'}${'essential' | `${'strongly-' | ''}recommended${'' | '-error'}`}`;

const isEssential = (s: string): boolean => s.endsWith('essential');

const rules = vue.rules as ESLint.Plugin['rules'],
	priorities = ['essential', 'strongly-recommended', 'recommended'],
	cats = Object.fromEntries(
		priorities.flatMap(c => isEssential(c) ? c : [c, `${c}-error`])
			.flatMap(c => [c, `vue2-${c}`])
			.map((c): [string, Linter.Config] => [c, {rules: {}}]),
	) as Record<ConfigKey, Linter.Config>;
for (const rule in rules) {
	const categories = (rules[rule]!.meta?.docs as {categories?: string[]} | undefined)
		?.categories as Category[] | undefined;
	if (!categories) {
		continue;
	}
	for (const category of categories) {
		if (category === 'base') {
			continue;
		}
		const essential = isEssential(category),
			key = category.replace('vue3-', '') as ConfigKey;
		cats[key].rules![`vue/${rule}`] = essential ? 2 : 1;
		if (!essential) {
			cats[`${key}-error` as ConfigKey].rules![`vue/${rule}`] = 2;
		}
	}
}

const {configs} = vue,
	base = configs['flat/base'];
for (const prefix of ['', 'vue2-']) {
	for (const priority of priorities) {
		const key = prefix + priority as ConfigKey;
		if (isEssential(priority)) {
			configs[`flat/${key}` as 'flat/essential'] = [...base, cats[key]];
		} else {
			for (const suffix of ['', '-error']) {
				const essential = configs[
						`flat/${prefix}${
							priority === 'recommended' ? `strongly-recommended${suffix}` : 'essential'
						}` as 'flat/essential'
					],
					k = key + suffix as ConfigKey;
				configs[`flat/${k}` as 'flat/recommended'] = [...essential, cats[k]];
			}
		}
	}
}

export default vue;
