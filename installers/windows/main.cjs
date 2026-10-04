const { app, BrowserWindow, protocol, session } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');

const SCHEME = 'fumiga';
const HOST = 'app';
const START_URL = `${SCHEME}://${HOST}/game/index.html`;

protocol.registerSchemesAsPrivileged([{
  scheme: SCHEME,
  privileges: {
    standard: true,
    secure: true,
    supportFetchAPI: true,
    corsEnabled: true,
    stream: true,
  },
}]);

const MIME = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const WEB_ROOT = path.resolve(app.isPackaged
  ? path.join(process.resourcesPath, 'web')
  : path.join(__dirname, 'web'));

function response(body, status, type = 'text/plain; charset=utf-8') {
  return new Response(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': type,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

async function serveLocalFile(request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return response('Method not allowed', 405);
  let url;
  try { url = new URL(request.url); } catch { return response('Bad request', 400); }
  if (url.protocol !== `${SCHEME}:` || url.hostname !== HOST) return response('Not found', 404);

  let relative;
  try { relative = decodeURIComponent(url.pathname).replace(/^\/+/, ''); }
  catch { return response('Bad path', 400); }
  if (!relative) relative = 'game/index.html';
  let target = path.resolve(WEB_ROOT, relative);
  const inside = path.relative(WEB_ROOT, target);
  if (inside === '..' || inside.startsWith(`..${path.sep}`) || path.isAbsolute(inside)) {
    return response('Forbidden', 403);
  }

  try {
    const stat = await fs.stat(target);
    if (stat.isDirectory()) target = path.join(target, 'index.html');
    const data = await fs.readFile(target);
    const type = MIME[path.extname(target).toLowerCase()] || 'application/octet-stream';
    return response(request.method === 'HEAD' ? null : data, 200, type);
  } catch {
    return response('FUMIGA asset not found', 404);
  }
}

async function createWindow() {
  await protocol.handle(SCHEME, serveLocalFile);

  // The desktop package is intentionally network-silent. The game and its
  // runtime are shipped in resources/web; remote navigations are not allowed.
  session.defaultSession.webRequest.onBeforeRequest(
    { urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] },
    (_details, callback) => callback({ cancel: true }),
  );

  const win = new BrowserWindow({
    width: 1280,
    height: 760,
    minWidth: 800,
    minHeight: 480,
    backgroundColor: '#0a0812',
    autoHideMenuBar: true,
    show: false,
    title: 'FUMIGA — Colônia Eterna',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
    },
  });

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, targetUrl) => {
    if (!targetUrl.startsWith(`${SCHEME}://${HOST}/`)) event.preventDefault();
  });
  win.webContents.on('page-title-updated', event => {
    event.preventDefault();
    win.setTitle('FUMIGA — Colônia Eterna');
  });
  win.once('ready-to-show', () => win.show());
  await win.loadURL(START_URL);
}

app.whenReady().then(createWindow).catch(error => {
  console.error('Não foi possível abrir o FUMIGA:', error);
  app.quit();
});

app.on('window-all-closed', () => app.quit());
