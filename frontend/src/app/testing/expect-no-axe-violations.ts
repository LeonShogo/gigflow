import axe from 'axe-core';
import { expect } from 'vitest';

/**
 * Runs axe-core against a rendered DOM fragment and fails the test on any violation.
 *
 * Two rules are disabled because they cannot be evaluated meaningfully in jsdom:
 * - `color-contrast`: needs a real layout/paint engine
 * - `region`: page-level rule that demands landmarks; mounted components are
 *   fragments of a page, not full pages
 */
export async function expectNoA11yViolations(container: HTMLElement): Promise<void> {
  const results = await axe.run(container, {
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
    },
  });
  const violations = results.violations.map(
    (v) => `${v.id} (${v.nodes.length}x): ${v.help} -> ${v.nodes[0]?.target.join(' ')}`,
  );
  expect(violations).toEqual([]);
}
