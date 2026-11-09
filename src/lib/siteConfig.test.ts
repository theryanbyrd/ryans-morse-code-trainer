import { describe, it, expect } from 'vitest';
import { normalizeConfig, SAFE_DEFAULT } from './siteConfig';

describe('normalizeConfig', () => {
  it('fails open on junk, so a bad response cannot take the app down', () => {
    for (const junk of [null, undefined, 'nope', 42, []]) {
      expect(normalizeConfig(junk, false)).toEqual(SAFE_DEFAULT);
    }
  });

  it('reads maintenance mode on the web', () => {
    const c = normalizeConfig({ maintenance: { on: true, message: 'back soon' } }, false);
    expect(c.maintenance).toEqual({ on: true, message: 'back soon' });
  });

  it('NEVER puts the native app into maintenance', () => {
    // The iPhone app runs entirely offline. Server state must not be able to
    // brick an installed app that does not depend on the server at all.
    const c = normalizeConfig({ maintenance: { on: true, message: 'back soon' } }, true);
    expect(c.maintenance.on).toBe(false);
  });

  it('still applies feature flags in the native app', () => {
    const c = normalizeConfig({ flags: { newThing: true } }, true);
    expect(c.flags.newThing).toBe(true);
  });

  it('coerces flag values and truncates a runaway message', () => {
    const c = normalizeConfig(
      { maintenance: { on: 1, message: 'x'.repeat(5000) }, flags: { a: 1, b: 0, c: 'yes' } },
      false,
    );
    expect(c.flags).toEqual({ a: true, b: false, c: true });
    expect(c.maintenance.message.length).toBeLessThanOrEqual(300);
  });
});
