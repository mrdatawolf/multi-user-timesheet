const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let mainWindow;
let serverProcess;

// Demo mode is enabled by default for Electron app (standalone client)
// This ensures a fresh database on each launch for demos
// Set DEMO_MODE=false environment variable to disable
const DEMO_MODE = process.env.DEMO_MODE !== 'false'; // Default to true unless explicitly disabled

function startServer() {
  const isDev = !app.isPackaged;
  const serverPath = isDev
    ? path.join(__dirname, '.next', 'standalone', 'server.js')
    : path.join(process.resourcesPath, 'server', 'server.js');
  const serverDir = path.dirname(serverPath);

  console.log('Starting server from:', serverPath);
  console.log('Demo mode:', DEMO_MODE ? 'ENABLED' : 'disabled');

  // Pass environment variables to the server process
  const serverEnv = {
    ...process.env,
    DEMO_MODE: DEMO_MODE ? 'true' : 'false',
    PORT: '6029',
  };

  serverProcess = spawn('node', [serverPath], {
    cwd: serverDir,
    stdio: 'inherit',
    env: serverEnv,
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
    width: 1400,
    height: 900,
    title: 'Attendance Management',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Wait a moment for server to start, then load the app
  setTimeout(() => {
    mainWindow.loadURL('http://localhost:6029');
  }, 2000);

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startServer();
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
