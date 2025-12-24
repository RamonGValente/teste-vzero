import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve(process.cwd(), 'dist');

// Prefer Netlify build identifiers when available.
const buildId =
  process.env.VITE_BUILD_ID ||
  process.env.COMMIT_REF ||
  process.env.DEPLOY_ID ||
  process.env.BUILD_ID ||
  `local-${Date.now()}`;

const payload = {
  buildId,
  builtAt: new Date().toISOString(),
};

try {
  if (!fs.existsSync(outDir)) {
    console.warn('[build-info] dist folder not found, skipping write');
    process.exit(0);
  }

  const target = path.join(outDir, 'build.json');
  fs.writeFileSync(target, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log('[build-info] wrote', target, 'buildId=', buildId);
} catch (e) {
  console.error('[build-info] failed', e);
  process.exit(1);
}
