/**
 * ops-portal custom server.
 *
 * Architecture: the ops-portal is the single public entry point
 * (https://ops.torinagi.com). It does two jobs on one origin:
 *
 *   1. Auth portal — Next.js owns everything under the `/_ops` base path
 *      (login, the Zitadel OIDC callback, the Caddy-JWT minting endpoint).
 *      See `basePath: '/_ops'` in next.config.mjs.
 *
 *   2. Reverse proxy — every OTHER path is proxied over Railway's private
 *      network to the paperclip backend (`paperclip.railway.internal:8080`,
 *      where the backend's Caddy listens). The browser never talks to the
 *      backend directly, so the backend needs no public domain. The
 *      `jaban_session` cookie (scoped to `.torinagi.com`) is forwarded with
 *      every request, so the backend's Caddy still enforces auth; an
 *      unauthenticated request 401s and Caddy redirects to `/_ops/login`.
 *
 * Websockets are proxied too (http-proxy `ws: true` + the `upgrade` handler),
 * so paperclip's live/agent features keep working.
 */
const { createServer } = require('http');
const next = require('next');
const httpProxy = require('http-proxy');

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';

// Where the backend (paperclip) Caddy listens on the Railway private network.
const BACKEND = process.env.BACKEND_INTERNAL_URL || 'http://paperclip.railway.internal:8080';

// Everything the Next portal owns lives under this prefix (matches
// next.config.mjs `basePath`). Keep in sync.
const PORTAL_BASE = '/_ops';

function isPortalPath(url) {
  if (!url) return false;
  return url === PORTAL_BASE || url.startsWith(PORTAL_BASE + '/') || url.startsWith(PORTAL_BASE + '?');
}

const app = next({ dev: false });
const handleNext = app.getRequestHandler();

const proxy = httpProxy.createProxyServer({
  target: BACKEND,
  // Preserve the original Host (ops.torinagi.com) — the backend Caddy site
  // block has no host matcher, and the SPA expects its own origin.
  changeOrigin: false,
  ws: true,
  xfwd: true,
  proxyTimeout: 60_000,
});

proxy.on('error', (err, req, res) => {
  console.error('[ops-portal proxy] backend error:', err && err.message, 'for', req && req.url);
  // `res` is a ServerResponse for HTTP, or a Socket for WS upgrades.
  if (res && typeof res.writeHead === 'function') {
    if (!res.headersSent) {
      res.writeHead(502, { 'content-type': 'text/plain' });
    }
    res.end('Bad gateway — paperclip backend unreachable.');
  } else if (res && typeof res.destroy === 'function') {
    res.destroy();
  }
});

app.prepare().then(() => {
  const server = createServer((req, res) => {
    if (isPortalPath(req.url)) {
      handleNext(req, res);
    } else {
      proxy.web(req, res);
    }
  });

  server.on('upgrade', (req, socket, head) => {
    if (isPortalPath(req.url)) {
      // The portal has no websockets in production; refuse rather than leak.
      socket.destroy();
      return;
    }
    proxy.ws(req, socket, head);
  });

  server.listen(PORT, HOST, () => {
    console.log(
      `[ops-portal] listening on ${HOST}:${PORT} — portal base ${PORTAL_BASE}, proxy target ${BACKEND}`
    );
  });
});
