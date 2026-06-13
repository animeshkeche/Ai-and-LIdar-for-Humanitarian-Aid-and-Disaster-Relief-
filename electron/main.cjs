'use strict';

const { app, BrowserWindow, Menu, shell, dialog, ipcMain, nativeTheme } = require('electron');
const path = require('path');
const http = require('http');
const { fork } = require('child_process');

// ── Config ────────────────────────────────────────────────────────────────────
const PORT = 5000;
const APP_TITLE = 'AI-LiDAR Disaster Assessment Platform';
const isDev = process.env.NODE_ENV === 'development';

let mainWindow = null;
let serverProcess = null;
let serverReady = false;

// ── Server management ─────────────────────────────────────────────────────────
function getServerScript() {
  if (isDev) return null;
  // Packaged: resources/app/dist/server.cjs
  // Unpackaged: dist/server.cjs
  return app.isPackaged
    ? path.join(process.resourcesPath, 'app', 'dist', 'server.cjs')
    : path.join(__dirname, '..', 'dist', 'server.cjs');
}

function startServer() {
  return new Promise((resolve, reject) => {
    if (isDev) {
      // Dev mode: tsx server is already running
      resolve();
      return;
    }

    const serverPath = getServerScript();
    console.log('[electron] Starting server:', serverPath);

    serverProcess = fork(serverPath, [], {
      env: { ...process.env, NODE_ENV: 'production', PORT: String(PORT) },
      silent: true,
    });

    serverProcess.stdout.on('data', (data) => {
      const msg = data.toString();
      console.log('[server]', msg.trim());
      if (msg.includes(`READY:${PORT}`) && !serverReady) {
        serverReady = true;
        resolve();
      }
    });

    serverProcess.stderr.on('data', (d) => console.error('[server-err]', d.toString()));
    serverProcess.on('error', reject);
    serverProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) console.error('[server] exited with code', code);
    });

    // Fallback: poll HTTP after 2s
    setTimeout(() => {
      if (!serverReady) pollServerReady(resolve, reject);
    }, 2000);
  });
}

function pollServerReady(resolve, reject, tries = 0) {
  if (tries > 30) { reject(new Error('Server did not start in time')); return; }
  const req = http.get(`http://127.0.0.1:${PORT}/api/stats`, () => {
    serverReady = true;
    resolve();
  });
  req.on('error', () => setTimeout(() => pollServerReady(resolve, reject, tries + 1), 400));
  req.end();
}

// ── Window creation ───────────────────────────────────────────────────────────
function createWindow() {
  nativeTheme.themeSource = 'dark';

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    title: APP_TITLE,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    backgroundColor: '#070d18',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: false, // allow localhost API calls
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
  });

  // Load the app
  const url = `http://127.0.0.1:${PORT}`;
  mainWindow.loadURL(url);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Open external links in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) { shell.openExternal(url); return { action: 'deny' }; }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── Application menu ──────────────────────────────────────────────────────────
function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{ label: app.name, submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'quit' }] }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Assessment',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.executeJavaScript(`window.location.hash='/assessment'`),
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Dashboard', accelerator: 'CmdOrCtrl+1', click: () => mainWindow?.webContents.executeJavaScript(`window.history.pushState({},'','/');window.dispatchEvent(new PopStateEvent('popstate'))`) },
        { label: 'Real-Time Monitor', accelerator: 'CmdOrCtrl+2', click: () => mainWindow?.loadURL(`http://127.0.0.1:${PORT}/realtime`) },
        { label: 'LiDAR System', accelerator: 'CmdOrCtrl+3', click: () => mainWindow?.loadURL(`http://127.0.0.1:${PORT}/lidar`) },
        { label: 'CNN Pipeline', accelerator: 'CmdOrCtrl+4', click: () => mainWindow?.loadURL(`http://127.0.0.1:${PORT}/pipeline`) },
        { label: 'Decision Support', accelerator: 'CmdOrCtrl+5', click: () => mainWindow?.loadURL(`http://127.0.0.1:${PORT}/decision`) },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Tools',
      submenu: [
        { label: 'Toggle Developer Tools', accelerator: 'F12', click: () => mainWindow?.webContents.toggleDevTools() },
        { type: 'separator' },
        {
          label: 'About Research Paper',
          click: () => dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Research Paper',
            message: 'AI And LiDAR for Humanitarian Aid and Disaster Relief',
            detail: 'Authors: Wagh et al.\nPublished in: JSPM\'s JSCE Pune\n\nThis platform implements the complete AI+LiDAR pipeline from the paper:\n• Velodyne VLP-32C sensor simulation\n• PointNet++ CNN classification\n• 3D damage severity mapping\n• Real-time decision support\n\nCNN Accuracy: 89% (vs 71% satellite, 78% UAV camera)',
          }),
        },
      ],
    },
    {
      role: 'help',
      submenu: [
        { label: 'Documentation', click: () => shell.openExternal('https://github.com') },
        { type: 'separator' },
        { label: `Version ${app.getVersion()}`, enabled: false },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── Splash screen (loading window while server boots) ─────────────────────────
function createSplash() {
  const splash = new BrowserWindow({
    width: 480,
    height: 320,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    center: true,
    backgroundColor: '#070d18',
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  splash.loadURL(`data:text/html,
    <html>
    <body style="margin:0;background:#070d18;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:monospace;color:#e2e8f0;">
      <div style="font-size:28px;font-weight:bold;color:#3b82f6;margin-bottom:8px;">AI-LiDAR</div>
      <div style="font-size:13px;color:#64748b;margin-bottom:32px;">Disaster Assessment Platform</div>
      <div style="width:200px;height:3px;background:#1e293b;border-radius:3px;overflow:hidden;">
        <div id="bar" style="height:3px;background:#3b82f6;border-radius:3px;width:0%;transition:width 0.3s;animation:load 3s ease-in-out forwards;"></div>
      </div>
      <div style="font-size:10px;color:#475569;margin-top:12px;">Starting backend server…</div>
      <style>@keyframes load{0%{width:0%}60%{width:70%}90%{width:90%}100%{width:100%}}</style>
    </body>
    </html>
  `);
  return splash;
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  buildMenu();

  let splash = null;
  if (!isDev) {
    splash = createSplash();
  }

  try {
    await startServer();
    console.log('[electron] Server is ready');
  } catch (err) {
    console.error('[electron] Server failed to start:', err);
    dialog.showErrorBox('Startup Error', `The backend server failed to start:\n\n${err.message}`);
    app.quit();
    return;
  }

  createWindow();

  if (splash) {
    mainWindow.once('ready-to-show', () => {
      splash.destroy();
    });
  }
});

app.on('window-all-closed', () => {
  if (serverProcess) { serverProcess.kill('SIGTERM'); serverProcess = null; }
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('before-quit', () => {
  if (serverProcess) { serverProcess.kill('SIGTERM'); serverProcess = null; }
});

// ── IPC handlers ──────────────────────────────────────────────────────────────
ipcMain.handle('app:version', () => app.getVersion());
ipcMain.handle('app:platform', () => process.platform);
ipcMain.handle('app:navigate', (_event, path) => {
  mainWindow?.loadURL(`http://127.0.0.1:${PORT}${path}`);
});
