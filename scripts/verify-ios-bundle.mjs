// Guards the two properties the App Store submission depends on.
//
// The iOS build is guest-only. That is not enforced by any code branch: it
// works because supabase.ts sets `supabaseEnabled = Boolean(url && anonKey)`
// and Account.tsx returns null when that is false, so leaving the env vars
// unset removes the whole account layer. Which means a stray `.env.local`, or
// someone running plain `npm run build` before `cap sync`, would silently ship
// sign-in to iOS — and sign-in on iOS means Guideline 4.8 (Sign in with Apple)
// and 5.1.1(v) (in-app account deletion), i.e. a rejection.
//
// Silent is the problem. This fails the build loudly instead.

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const ASSETS = join(DIST, 'assets');

if (!existsSync(ASSETS)) {
  console.error(`[verify-ios-bundle] no ${ASSETS} directory — run the build first`);
  process.exit(1);
}

const bundles = readdirSync(ASSETS).filter((f) => f.endsWith('.js'));
if (bundles.length === 0) {
  console.error('[verify-ios-bundle] no JS bundles found');
  process.exit(1);
}

const failures = [];

for (const file of bundles) {
  const text = readFileSync(join(ASSETS, file), 'utf8');

  // A configured Supabase project means sign-in is live in the shell.
  const host = text.match(/https:\/\/[a-z0-9]{16,}\.supabase\.co/);
  if (host) failures.push(`${file}: contains a Supabase project URL (${host[0]})`);

  // The publishable key would arrive the same way.
  if (/sb_publishable_[A-Za-z0-9_-]{8,}/.test(text)) {
    failures.push(`${file}: contains a Supabase publishable key`);
  }
}

if (failures.length) {
  console.error('\n[verify-ios-bundle] FAILED — this bundle must not ship to the App Store:\n');
  for (const f of failures) console.error(`  - ${f}`);
  console.error(
    '\nBuild with `npm run build:ios`, which clears the VITE_SUPABASE_* variables.\n' +
      'See docs/IOS-PRD.md section 3.3.\n',
  );
  process.exit(1);
}

console.log(`[verify-ios-bundle] OK — ${bundles.length} bundle(s), no account layer present`);
