const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const config = require('./config');

let mainWindow;
let serverProcess;

function startServer() {
  const isDev = !app.isPackaged;
  const serverPath = isDev
    ? path.join(__dirname, '..', '.next', 'standalone', 'server.js')
    : path.join(process.resourcesPath, 'server', 'server.js');
  const serverDir = path.dirname(serverPath);

  console.log('Starting server from:', serverPath);

  serverProcess = spawn('node', [serverPath], {
    cwd: serverDir,
    stdio: 'inherit'
  });

  serverProcess.on('error', (err) => {
    console.error('Failed to start server:', err);
  });

  serverProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: config.window.width,
    height: config.window.height,
    title: config.window.title,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Wait a moment for server to start, then load the app
  setTimeout(() => {
    console.log('Connecting to:', config.server.host);
    mainWindow.loadURL(config.server.host);
  }, config.server.startupDelay);

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Determine if we should start the bundled server
  let shouldStartServer = config.server.startBundledServer;

  // Auto-detect if not explicitly set
  if (shouldStartServer === null || shouldStartServer === undefined) {
    const url = new URL(config.server.host);
    shouldStartServer = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  }

  if (shouldStartServer) {
    console.log('Starting bundled server...');
    startServer();
  } else {
    console.log('Connecting to remote server at:', config.server.host);
  }

  createWindow();
});

app.on('window-all-closed', function () {
  // Kill the server process
  if (serverProcess) {
    serverProcess.kill();
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});
