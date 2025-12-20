/**
 * Returns a build/deploy identifier.
 *
 * Why a Function?
 * - It's fetched from NETWORK (Workbox won't precache it)
 * - It bypasses "stale precache" traps when a user is stuck on an old SW
 */

export const handler = async () => {
  const buildId =
    process.env.COMMIT_REF ||
    process.env.DEPLOY_ID ||
    process.env.BUILD_ID ||
    process.env.NETLIFY_BUILD_ID ||
    null;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
    body: JSON.stringify({
      buildId,
      deployId: process.env.DEPLOY_ID || null,
      context: process.env.CONTEXT || null,
      siteId: process.env.SITE_ID || null,
      timestamp: new Date().toISOString(),
    }),
  };
};
