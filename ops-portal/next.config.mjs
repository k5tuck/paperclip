/** @type {import('next').NextConfig} */
const nextConfig = {
  // No `output: 'standalone'` — this app runs via a custom Node server
  // (server.js) that boots Next programmatically and reverse-proxies all
  // non-portal traffic to the paperclip backend over the Railway private
  // network. Standalone output is incompatible with a custom server.
  //
  // The portal shares one public origin (ops.torinagi.com) with the proxied
  // paperclip app. Rather than Next's `basePath` (which strips the prefix
  // before route handlers run, breaking Auth.js's action parsing), the portal
  // lives under a real `/ops` route segment (see src/app/ops/**). server.js
  // routes `/ops` + `/_next` to Next and everything else to the backend, so
  // the portal never collides with the backend's `/`, `/api/auth` (better-auth),
  // and `/assets/*` (Vite) paths.
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
