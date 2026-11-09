// Remove web-only files from dist before `cap sync` copies it into the app.
//
// The operator console must not ship inside the iPhone binary. It would never
// be reachable (the API is token-gated and the app has no link to it), but
// shipping an admin page inside a 9+ rated children's app is the kind of thing
// a reviewer notices, and there is no reason to carry it.
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const WEB_ONLY = ['admin.html', '404.html', 'robots.txt', 'sitemap.xml', 'llms.txt'];
let removed = 0;
for (const f of WEB_ONLY) {
  const p = join('dist', f);
  if (existsSync(p)) { rmSync(p, { force: true }); removed++; }
}
console.log(`[strip-ios-extras] removed ${removed}/${WEB_ONLY.length} web-only files from dist`);
