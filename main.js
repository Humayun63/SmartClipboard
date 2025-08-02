const { app, BrowserWindow, globalShortcut, clipboard, ipcMain, screen, Menu, Tray, nativeImage } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Initialize persistent storage
const store = new Store({
  name: 'clipboard-history',
  defaults: {
    clipboardHistory: [],
    maxHistorySize: 50,
    settings: {
      autoStart: true,
      showTrayIcon: true,
      pasteMenuTimeout: 3000
    }
  }
});

let mainWindow;
let settingsWindow;
let tray;
let isPasteMenuVisible = false;
let clipboardHistory = store.get('clipboardHistory', []);
let lastClipboardContent = '';

// Create the main window
function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    x: width - 420,
    y: height - 620,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    transparent: true,
    hasShadow: false
  });

  mainWindow.loadFile('index.html');

  // Hide window on blur
  mainWindow.on('blur', () => {
    if (!isPasteMenuVisible) {
      mainWindow.hide();
    }
  });

  // Prevent window from being closed
  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

// Create settings window
function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }
  
  settingsWindow = new BrowserWindow({
    width: 500,
    height: 600,
    resizable: false,
    minimizable: false,
    maximizable: false,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    titleBarStyle: 'hidden',
    title: 'Smart Clipboard - Settings'
  });

  settingsWindow.loadFile('settings.html');

  settingsWindow.once('ready-to-show', () => {
    settingsWindow.show();
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

// Open settings window
function openSettingsWindow() {
  createSettingsWindow();
}

// Create system tray
function createTray() {
  const iconPath = path.join(__dirname, 'icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Clipboard History',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      }
    },
    {
      label: 'Clear History',
      click: () => {
        clipboardHistory = [];
        store.set('clipboardHistory', clipboardHistory);
        mainWindow.webContents.send('update-history', clipboardHistory);
      }
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        openSettingsWindow();
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuiting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setContextMenu(contextMenu);
  tray.setToolTip('Smart Clipboard');
  
  tray.on('click', () => {
    mainWindow.show();
    mainWindow.focus();
  });
}

// Monitor clipboard changes
function startClipboardMonitoring() {
  setInterval(() => {
    const currentContent = clipboard.readText();
    
    if (currentContent && currentContent !== lastClipboardContent && currentContent.trim() !== '') {
      // Add to history if it's new content
      if (!clipboardHistory.includes(currentContent)) {
        clipboardHistory.unshift(currentContent);
        
        // Limit history size
        const maxSize = store.get('settings.maxHistorySize', 50);
        if (clipboardHistory.length > maxSize) {
          clipboardHistory = clipboardHistory.slice(0, maxSize);
        }
        
        store.set('clipboardHistory', clipboardHistory);
        lastClipboardContent = currentContent;
        
        // Update renderer if window is open
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('update-history', clipboardHistory);
        }
      }
    }
  }, 500); // Check every 500ms
}

// Register global shortcuts
function registerGlobalShortcuts() {
  // Cmd+Shift+V for showing clipboard history
  globalShortcut.register('CommandOrControl+Shift+V', () => {
    mainWindow.show();
    mainWindow.focus();
  });
  
  // Cmd+Option+V for paste menu (alternative to not interfere with normal Cmd+V)
  globalShortcut.register('CommandOrControl+Alt+V', () => {
    showPasteMenu();
  });
  
  // Cmd+V+1 through Cmd+V+9 for quick paste
  for (let i = 1; i <= 9; i++) {
    globalShortcut.register(`CommandOrControl+V+${i}`, () => {
      quickPaste(i);
    });
  }
}

// Show paste menu
function showPasteMenu() {
  if (clipboardHistory.length === 0) return;
  
  isPasteMenuVisible = true;
  mainWindow.show();
  mainWindow.focus();
  mainWindow.webContents.send('show-paste-menu', clipboardHistory);
  
  // Auto-hide after timeout
  setTimeout(() => {
    if (isPasteMenuVisible) {
      isPasteMenuVisible = false;
      mainWindow.hide();
    }
  }, store.get('settings.pasteMenuTimeout', 3000));
}

// Quick paste by index
function quickPaste(index) {
  if (clipboardHistory.length >= index) {
    const content = clipboardHistory[index - 1];
    clipboard.writeText(content);
    
    // Simulate paste using a more reliable method
    try {
      const robot = require('robotjs');
      robot.keyTap('v', ['command']);
    } catch (error) {
      console.log('RobotJS not available, using clipboard only');
      // Fallback: just copy to clipboard, user can paste manually
    }
  }
}

// IPC handlers
ipcMain.handle('get-clipboard-history', () => {
  return clipboardHistory;
});

ipcMain.handle('clear-history', () => {
  clipboardHistory = [];
  store.set('clipboardHistory', clipboardHistory);
  return clipboardHistory;
});

ipcMain.handle('remove-item', (event, index) => {
  clipboardHistory.splice(index, 1);
  store.set('clipboardHistory', clipboardHistory);
  return clipboardHistory;
});

ipcMain.handle('paste-item', (event, index) => {
  if (clipboardHistory[index]) {
    const content = clipboardHistory[index];
    clipboard.writeText(content);
    
    // Simulate paste using a more reliable method
    try {
      const robot = require('robotjs');
      robot.keyTap('v', ['command']);
    } catch (error) {
      console.log('RobotJS not available, using clipboard only');
      // Fallback: just copy to clipboard, user can paste manually
    }
    
    // Hide window after paste
    isPasteMenuVisible = false;
    mainWindow.hide();
  }
});

ipcMain.handle('hide-paste-menu', () => {
  isPasteMenuVisible = false;
  mainWindow.hide();
});

// Settings IPC handlers
ipcMain.handle('get-settings', () => {
  return store.get('settings', {
    maxHistorySize: 50,
    pasteMenuTimeout: 3,
    autoStart: false,
    showTrayIcon: true
  });
});

ipcMain.handle('save-settings', (event, settings) => {
  store.set('settings', settings);
  return true;
});

ipcMain.handle('clear-all-data', () => {
  store.clear();
  clipboardHistory = [];
  return true;
});

ipcMain.handle('open-settings', () => {
  openSettingsWindow();
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();
  createTray();
  startClipboardMonitoring();
  registerGlobalShortcuts();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
} 