// @ts-expect-error no types available
import plugin from 'eslint-plugin-vue/dist/plugin';
// @ts-expect-error no types available
import flatBase from 'eslint-plugin-vue/dist/configs/flat/base';

export default {
	...(plugin as {default: object}).default,
	configs: {
		base: flatBase,
	},
};
