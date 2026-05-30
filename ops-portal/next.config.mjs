/** @type {import('next').NextConfig} */
const nextConfig = {
  // No `output: 'standalone'` — this app runs via a custom Node server
  // (server.js) that boots Next programmatically and reverse-proxies all
  // non-portal traffic to the paperclip backend over the Railway private
  // network. Standalone output is incompatible with a custom server.
  //
  // The portal shares one public origin (ops.torinagi.com) with the proxied
  // paperclip app, so every portal route is namespaced under `/_ops` to avoid
  // colliding with the backend's own `/`, `/api/*`, and asset paths. This
  // MUST stay in sync with PORTAL_BASE in server.js and the Zitadel callback
  // redirect URI (`/_ops/api/auth/callback/zitadel`).
  basePath: '/_ops',
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
