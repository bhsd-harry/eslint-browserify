declare module '@eslint/eslintrc/universal' {
	export const Legacy: {environments: Map<string, unknown>};
}

declare module '../build/*' {
	export {Linter} from 'eslint';
}
