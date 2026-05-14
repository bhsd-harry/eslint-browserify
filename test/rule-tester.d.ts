export class RuleTester {
	constructor(config?: unknown);
	run(rule: string, _: unknown, testCases: {valid: unknown[]; invalid: unknown[]}): void;
}

export const ESLint: {version: string};
export type Linter = unknown;

declare global {
	type RuleModule = unknown;
}
