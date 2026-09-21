/**
 * Ambient test-runner globals for the FIXTURE typecheck project only
 * (tsconfig.fixtures.json — never shipped, never included by the main or
 * test tsconfigs).
 *
 * Fixtures are detection INPUT: they simulate test files from real
 * projects built on Playwright / Jest / Cypress / Vitest. Those projects
 * get these names from their own framework dependency; this repo does not
 * (and must not) depend on those frameworks. The shim declares the global
 * surface so Layer A (structural typecheck) can prove what it exists to
 * prove: that fixture modules RESOLVE (imports/exports are intact) — the
 * QA-PW-125 missing-execSync rot class — without re-typing each
 * framework.
 *
 * Deliberately minimal: signatures are permissive on purpose. Layer A
 * checks module integrity, not API correctness of the simulated
 * frameworks (that is Layer B's job, via the fixture-harness oracle).
 */

type TestFn = (context?: any) => unknown;

interface ItWithOnly {
  (name: string, fn: TestFn): void;
  only(name: string, fn: TestFn): void;
  skip(name: string, fn: TestFn): void;
  each(...args: unknown[]): (name: string, fn: TestFn) => void;
}
interface DescribeWithOnly {
  (name: string, fn: () => void): void;
  only(name: string, fn: () => void): void;
  skip(name: string, fn: () => void): void;
}

declare const it: ItWithOnly;
declare const test: ItWithOnly;
declare const describe: DescribeWithOnly;
declare const xdescribe: DescribeWithOnly;
declare const xit: ItWithOnly;
declare const xtest: ItWithOnly;
declare const fit: ItWithOnly;
declare const fdescribe: DescribeWithOnly;
declare const context: DescribeWithOnly;
declare function beforeEach(fn: (context?: any) => unknown): void;
declare function afterEach(fn: (context?: any) => unknown): void;
declare function beforeAll(fn: (context?: any) => unknown): void;
declare function afterAll(fn: (context?: any) => unknown): void;
declare function before(fn: (context?: any) => unknown): void;
declare function after(fn: (context?: any) => unknown): void;

declare const expect: ((actual: unknown) => any) & {
  extend(...args: unknown[]): any;
  poll(...args: unknown[]): any;
  soft(...args: unknown[]): any;
};

/** Cypress: the `cy` command chain and its helpers. */
declare const cy: any;
declare const Cypress: Record<string, unknown>;

/** Jest namespace (e.g. jest.retryTimes in retry-abuse fixtures). */
declare const jest: any;

/**
 * Framework-adjacent packages fixtures legitimately import while
 * simulating real projects. Declaring them ambient mirrors what the
 * simulated project's own node_modules would provide.
 */
declare module "@axe-core/playwright" {
  const AxeBuilder: any;
  export default AxeBuilder;
}
