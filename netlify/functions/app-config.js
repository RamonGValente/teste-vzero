export const handler = async () => {
  // Runtime config endpoint so the frontend doesn't depend on build-time VITE_* injection.
  // Safe to expose: OneSignal App ID is public.
  const appId = process.env.ONESIGNAL_APP_ID || process.env.VITE_ONESIGNAL_APP_ID || "";

  return {
    statusCode: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "access-control-allow-origin": "*",
    },
    body: JSON.stringify({
      onesignalAppId: appId,
      // Expose if you want to debug which env is being read.
      source: process.env.ONESIGNAL_APP_ID ? "ONESIGNAL_APP_ID" : process.env.VITE_ONESIGNAL_APP_ID ? "VITE_ONESIGNAL_APP_ID" : "missing",
    }),
  };
};
