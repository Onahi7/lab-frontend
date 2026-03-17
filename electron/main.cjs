const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const http = require('http');
const dgram = require('dgram');
const os = require('os');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

let mainWindow;
let updateCheckTimer = null;

function broadcastUpdateStatus(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', payload);
  }
}

// ── Cached server URL (persisted in userData) ────────────────────
const STORE_PATH = path.join(app.getPath('userData'), 'server-config.json');
let cachedServerUrl = null;

// ── Cached auto-update URL (persisted in userData) ───────────────
const UPDATE_STORE_PATH = path.join(app.getPath('userData'), 'update-config.json');
let cachedUpdateUrl = null;

function loadCachedServerUrl() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
      cachedServerUrl = data.serverUrl || null;
    }
  } catch { /* ignore */ }
}

function saveCachedServerUrl(url) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify({ serverUrl: url }), 'utf8');
    cachedServerUrl = url;
  } catch { /* ignore */ }
}

loadCachedServerUrl();

function loadCachedUpdateUrl() {
  try {
    if (fs.existsSync(UPDATE_STORE_PATH)) {
      const data = JSON.parse(fs.readFileSync(UPDATE_STORE_PATH, 'utf8'));
      cachedUpdateUrl = data.updateUrl || null;
    }
  } catch { /* ignore */ }
}

function saveCachedUpdateUrl(url) {
  try {
    fs.writeFileSync(UPDATE_STORE_PATH, JSON.stringify({ updateUrl: url }), 'utf8');
    cachedUpdateUrl = url;
  } catch { /* ignore */ }
}

function getEffectiveUpdateUrl() {
  return cachedUpdateUrl || process.env.ELECTRON_UPDATE_URL || null;
}

loadCachedUpdateUrl();

// ── LAN Discovery ────────────────────────────────────────────────
const DISCOVERY_PORT = 41234;
const DISCOVERY_MSG = 'HOBOUR_LIS_DISCOVER';
const DISCOVERY_REPLY = 'HOBOUR_LIS_HERE';

/**
 * Get all local IPv4 addresses on the LAN.
 */
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const iface of Object.values(interfaces)) {
    for (const addr of iface || []) {
      if (addr.family === 'IPv4' && !addr.internal) {
        ips.push(addr.address);
      }
    }
  }
  return ips;
}

/**
 * Get subnet broadcast addresses for all local interfaces.
 * E.g. 192.168.1.0/24 → 192.168.1.255
 */
function getSubnetBroadcasts() {
  const interfaces = os.networkInterfaces();
  const broadcasts = ['255.255.255.255'];
  for (const iface of Object.values(interfaces)) {
    for (const addr of iface || []) {
      if (addr.family === 'IPv4' && !addr.internal && addr.netmask) {
        // Calculate broadcast: IP | ~netmask
        const ipParts = addr.address.split('.').map(Number);
        const maskParts = addr.netmask.split('.').map(Number);
        const broadcast = ipParts
          .map((ip, i) => (ip | (~maskParts[i] & 0xff)))
          .join('.');
        if (!broadcasts.includes(broadcast)) broadcasts.push(broadcast);
      }
    }
  }
  return broadcasts;
}

/**
 * Broadcasts a UDP packet on the LAN and listens for backend replies.
 * Sends to both 255.255.255.255 and subnet-specific broadcast addresses
 * for maximum WiFi compatibility (some routers block limited broadcasts).
 * Returns the first discovered backend URL, or null.
 */
function discoverBackendOnLAN(timeoutMs = 3000) {
  return new Promise((resolve) => {
    const client = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    let resolved = false;

    client.on('message', (msg, rinfo) => {
      const text = msg.toString();
      if (text.startsWith(DISCOVERY_REPLY) && !resolved) {
        resolved = true;
        const port = text.split(':')[1] || '3000';
        const url = `http://${rinfo.address}:${port}`;
        // Cache for quick reconnection
        try { cachedServerUrl = url; } catch {}
        client.close();
        resolve(url);
      }
    });

    client.on('error', () => {
      if (!resolved) {
        resolved = true;
        try { client.close(); } catch {}
        resolve(null);
      }
    });

    client.bind(() => {
      client.setBroadcast(true);
      const message = Buffer.from(DISCOVERY_MSG);
      // Send to all broadcast addresses for WiFi compatibility
      const broadcasts = getSubnetBroadcasts();
      for (const addr of broadcasts) {
        client.send(message, 0, message.length, DISCOVERY_PORT, addr);
      }
    });

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try { client.close(); } catch {}
        resolve(null);
      }
    }, timeoutMs);
  });
}

/**
 * Scan the local subnet for the backend health endpoint.
 * Covers the full .1-.254 range in parallel batches for WiFi networks
 * where any device could be the server.
 */
async function probeBackendHTTP(timeout = 2000) {
  const localIPs = getLocalIPs();
  const candidates = ['http://localhost:3000'];
  const seen = new Set(['localhost:3000']);

  for (const ip of localIPs) {
    const subnet = ip.split('.').slice(0, 3).join('.');
    // Full subnet scan — WiFi DHCP can assign any address
    for (let host = 1; host <= 254; host++) {
      const key = `${subnet}.${host}:3000`;
      if (!seen.has(key) && `${subnet}.${host}` !== ip) {
        seen.add(key);
        candidates.push(`http://${subnet}.${host}:3000`);
      }
    }
  }

  // Probe in parallel batches of 30 (fast enough, won't overload)
  for (let i = 0; i < candidates.length; i += 30) {
    const batch = candidates.slice(i, i + 30);
    const results = await Promise.allSettled(
      batch.map(
        (url) =>
          new Promise((resolve, reject) => {
            const req = http.get(`${url}/health`, { timeout }, (res) => {
              if (res.statusCode >= 200 && res.statusCode < 400) {
                resolve(url);
              } else {
                reject();
              }
              res.resume();
            });
            req.on('error', reject);
            req.on('timeout', () => {
              req.destroy();
              reject();
            });
          }),
      ),
    );
    const found = results.find((r) => r.status === 'fulfilled');
    if (found) {
      cachedServerUrl = found.value;
      return found.value;
    }
  }
  return null;
}

// ── Window Creation ──────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    icon: path.join(__dirname, '../public/favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // needed for native print access
    },
    autoHideMenuBar: true,
    title: 'Hobour Diagnostics LIS',
  });

  // In production, load the built files; in dev, load the Vite dev server
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Open external links in the default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function initializeAutoUpdate() {
  if (!app.isPackaged || process.env.VITE_DEV_SERVER_URL) return;

  const feedUrl = getEffectiveUpdateUrl();
  if (!feedUrl) {
    console.log('[auto-update] Skipped: update URL is not configured.');
    return;
  }

  autoUpdater.setFeedURL({
    provider: 'generic',
    url: feedUrl,
    channel: 'latest',
  });

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    console.log('[auto-update] Checking for update...');
    broadcastUpdateStatus({ type: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    console.log(`[auto-update] Update available: ${info.version}`);
    broadcastUpdateStatus({ type: 'available', version: info.version });
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[auto-update] No updates available.');
    broadcastUpdateStatus({ type: 'not-available' });
  });

  autoUpdater.on('error', (err) => {
    console.error('[auto-update] Error:', err == null ? 'unknown' : err.message);
    broadcastUpdateStatus({ type: 'error', message: err == null ? 'unknown' : err.message });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    console.log(`[auto-update] Downloaded ${Math.round(progressObj.percent)}%`);
    broadcastUpdateStatus({
      type: 'download-progress',
      percent: Math.round(progressObj.percent),
      transferred: progressObj.transferred,
      total: progressObj.total,
      bytesPerSecond: progressObj.bytesPerSecond,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    broadcastUpdateStatus({ type: 'downloaded', version: info.version });
  });

  autoUpdater.checkForUpdates().catch((err) => {
    console.error('[auto-update] Initial check failed:', err == null ? 'unknown' : err.message);
  });

  // Recheck periodically while app is open.
  updateCheckTimer = setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {
      // Ignore transient network errors.
    });
  }, 60 * 60 * 1000);
}

// ── IPC Handlers ─────────────────────────────────────────────────

// Online status
ipcMain.handle('get-online-status', () => {
  const { net } = require('electron');
  return net.isOnline();
});

// LAN discovery: find the backend server on the local network
ipcMain.handle('discover-backend', async () => {
  // 0. If we have a cached/manually-set URL, try it first (instant reconnect)
  if (cachedServerUrl) {
    try {
      const result = await new Promise((resolve, reject) => {
        const req = http.get(`${cachedServerUrl}/health`, { timeout: 2000 }, (res) => {
          if (res.statusCode >= 200 && res.statusCode < 400) resolve(true);
          else reject();
          res.resume();
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(); });
      });
      if (result) return { url: cachedServerUrl, method: 'cached' };
    } catch {
      // Cached URL no longer works, continue discovery
    }
  }

  // 1. Try UDP broadcast (works well on most WiFi)
  const udpResult = await discoverBackendOnLAN(2000);
  if (udpResult) {
    saveCachedServerUrl(udpResult);
    return { url: udpResult, method: 'udp' };
  }

  // 2. Fall back to HTTP subnet probe
  const httpResult = await probeBackendHTTP(1500);
  if (httpResult) {
    saveCachedServerUrl(httpResult);
    return { url: httpResult, method: 'http-probe' };
  }

  return null;
});

// Manually set the server URL (from settings UI)
ipcMain.handle('set-server-url', async (_event, url) => {
  if (!url || typeof url !== 'string') return { success: false, error: 'Invalid URL' };
  // Validate it's reachable
  try {
    await new Promise((resolve, reject) => {
      const req = http.get(`${url}/health`, { timeout: 3000 }, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 400) resolve(true);
        else reject(new Error(`HTTP ${res.statusCode}`));
        res.resume();
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    });
    saveCachedServerUrl(url);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Get the currently cached server URL
ipcMain.handle('get-server-url', () => cachedServerUrl);

// Get local network IPs (so the UI can show them)
ipcMain.handle('get-local-ips', () => getLocalIPs());

// Get the currently configured auto-update URL
ipcMain.handle('get-update-url', () => getEffectiveUpdateUrl());

// Set and persist auto-update URL
ipcMain.handle('set-update-url', async (_event, url) => {
  if (!url || typeof url !== 'string') return { success: false, error: 'Invalid URL' };

  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { success: false, error: 'Update URL must use http or https' };
    }
  } catch {
    return { success: false, error: 'Invalid URL format' };
  }

  saveCachedUpdateUrl(url);

  if (app.isPackaged && !process.env.VITE_DEV_SERVER_URL) {
    autoUpdater.setFeedURL({
      provider: 'generic',
      url,
      channel: 'latest',
    });
  }

  return { success: true };
});

// Manually trigger an update check
ipcMain.handle('check-for-updates', async () => {
  if (!app.isPackaged || process.env.VITE_DEV_SERVER_URL) {
    return { success: false, error: 'Auto-update is only available in packaged builds' };
  }

  const feedUrl = getEffectiveUpdateUrl();
  if (!feedUrl) {
    return { success: false, error: 'Update URL is not configured' };
  }

  try {
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: feedUrl,
      channel: 'latest',
    });

    await autoUpdater.checkForUpdates();
    return { success: true };
  } catch (err) {
    return { success: false, error: err && err.message ? err.message : 'Failed to check updates' };
  }
});

ipcMain.handle('install-update-now', async () => {
  if (!app.isPackaged || process.env.VITE_DEV_SERVER_URL) {
    return { success: false, error: 'Auto-update is only available in packaged builds' };
  }

  try {
    autoUpdater.quitAndInstall();
    return { success: true };
  } catch (err) {
    return { success: false, error: err && err.message ? err.message : 'Failed to install update' };
  }
});

// ── Native Printing ──────────────────────────────────────────────

// Silent print the current page (no dialog)
ipcMain.handle('print-silent', async (_event, options = {}) => {
  if (!mainWindow) return { success: false, error: 'No window' };

  const printOptions = {
    silent: true,
    printBackground: true,
    copies: options.copies || 1,
    pageSize: options.pageSize || 'A4',
    landscape: options.landscape || false,
    margins: options.margins || { marginType: 'default' },
    ...options,
  };

  return new Promise((resolve) => {
    mainWindow.webContents.print(printOptions, (success, failureReason) => {
      resolve({ success, error: failureReason });
    });
  });
});

// Print with dialog
ipcMain.handle('print-with-dialog', async () => {
  if (!mainWindow) return { success: false, error: 'No window' };

  return new Promise((resolve) => {
    mainWindow.webContents.print({ silent: false, printBackground: true }, (success, failureReason) => {
      resolve({ success, error: failureReason });
    });
  });
});

// Print specific HTML content silently (for receipts, reports)
ipcMain.handle('print-html', async (_event, { html, options = {} }) => {
  if (!mainWindow) return { success: false, error: 'No window' };

  // Create a hidden window for printing
  const printWin = new BrowserWindow({
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });

  printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

  return new Promise((resolve) => {
    printWin.webContents.on('did-finish-load', () => {
      const printOptions = {
        silent: true,
        printBackground: true,
        copies: options.copies || 1,
        pageSize: options.pageSize || 'A4',
        landscape: options.landscape || false,
        margins: options.margins || { marginType: 'default' },
      };

      printWin.webContents.print(printOptions, (success, failureReason) => {
        printWin.close();
        resolve({ success, error: failureReason });
      });
    });
  });
});

// Export current page to PDF
ipcMain.handle('print-to-pdf', async (_event, options = {}) => {
  if (!mainWindow) return { success: false, error: 'No window' };

  try {
    const pdfData = await mainWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: options.pageSize || 'A4',
      landscape: options.landscape || false,
      margins: options.margins || undefined,
    });

    // Let user choose save location
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save PDF',
      defaultPath: `report-${Date.now()}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });

    if (filePath) {
      fs.writeFileSync(filePath, pdfData);
      return { success: true, filePath };
    }

    return { success: false, error: 'Cancelled' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Get available printers
ipcMain.handle('get-printers', () => {
  if (!mainWindow) return [];
  return mainWindow.webContents.getPrintersAsync();
});

// ── App Lifecycle ────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  initializeAutoUpdate();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('before-quit', () => {
  if (updateCheckTimer) {
    clearInterval(updateCheckTimer);
    updateCheckTimer = null;
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
