// netlify/functions/push-env-check.js
// Endpoint de diagnóstico: mostra se as ENV vars críticas do Push (OneSignal) estão disponíveis no Netlify.

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  },
  body: JSON.stringify(body),
});

export const handler = async () => {
  const has = (k) => Boolean((process.env[k] || "").trim());

  return json(200, {
    ONESIGNAL_APP_ID: has("ONESIGNAL_APP_ID"),
    ONESIGNAL_REST_API_KEY: has("ONESIGNAL_REST_API_KEY"),
    SUPABASE_URL: has("SUPABASE_URL"),
    SUPABASE_SERVICE_ROLE_KEY: has("SUPABASE_SERVICE_ROLE_KEY"),
    NODE_VERSION: process.version,
  });
};
