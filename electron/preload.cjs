const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,

  // ── Network ────────────────────────────────────────────────────
  getOnlineStatus: () => ipcRenderer.invoke('get-online-status'),
  discoverBackend: () => ipcRenderer.invoke('discover-backend'),
  getLocalIPs: () => ipcRenderer.invoke('get-local-ips'),
  /** Manually set the server URL (validates reachability first) */
  setServerUrl: (url) => ipcRenderer.invoke('set-server-url', url),
  /** Get the currently saved server URL */
  getServerUrl: () => ipcRenderer.invoke('get-server-url'),
  /** Get the configured auto-update feed URL */
  getUpdateUrl: () => ipcRenderer.invoke('get-update-url'),
  /** Set the auto-update feed URL */
  setUpdateUrl: (url) => ipcRenderer.invoke('set-update-url', url),
  /** Manually trigger update check (packaged builds only) */
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  /** Install a downloaded update immediately */
  installUpdateNow: () => ipcRenderer.invoke('install-update-now'),
  /** Subscribe to updater status events */
  onUpdateStatus: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('update-status', handler);
    return () => ipcRenderer.removeListener('update-status', handler);
  },

  // ── Printing ───────────────────────────────────────────────────
  /** Silent print (no dialog) — uses the system default printer */
  printSilent: (options) => ipcRenderer.invoke('print-silent', options),
  /** Print with system print dialog */
  printWithDialog: () => ipcRenderer.invoke('print-with-dialog'),
  /** Print arbitrary HTML content silently in a hidden window */
  printHTML: (html, options) => ipcRenderer.invoke('print-html', { html, options }),
  /** Export current page to PDF with a save dialog */
  printToPDF: (options) => ipcRenderer.invoke('print-to-pdf', options),
  /** List all available printers on this machine */
  getPrinters: () => ipcRenderer.invoke('get-printers'),
});
