const { app, BrowserWindow, globalShortcut, clipboard, ipcMain, screen, Menu, Tray, nativeImage, Notification, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Initialize persistent storage
const store = new Store({
  name: 'clipboard-history',
  defaults: {
    clipboardHistory: [],
    maxHistorySize: 50,
    settings: {
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
let settings = store.get('settings', {});

// Create the main window
function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    x: width - 420,
    y: height - 620,
    frame: true,
    resizable: true,
    minimizable: true,
    maximizable: true,
    alwaysOnTop: false,
    skipTaskbar: false,
    show: false,
    title: 'Smart Clipboard',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    titleBarStyle: 'default'
  });

  

  mainWindow.loadFile('index.html');

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Apply saved theme
    const settings = store.get('settings', {});
    if (settings.theme) {
      mainWindow.webContents.send('theme-changed', settings.theme);
    }
  });

  // Handle window close
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
  let icon;
  
  try {
    icon = nativeImage.createFromPath(iconPath);
  } catch (error) {
    // Fallback to a simple icon if file doesn't exist
    console.error('Icon file not found, using default icon');
    icon = nativeImage.createFromDataURL('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiByeD0iMiIgZmlsbD0iIzY2N2VlYSIvPgo8cGF0aCBkPSJNNCw0IEgxMiBNNCw2IEgxMiBNNCw4IEgxMCBNNCwxMCBIMTIiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMSIvPgo8L3N2Zz4K');
  }
  
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show History',
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
  
  // tray.setContextMenu(contextMenu);
  tray.setToolTip('Smart Clipboard');
  
  // Left click shows the app, right click shows context menu
  tray.on('click', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  tray.on('right-click', () => {
    tray.popUpContextMenu(contextMenu);
  })
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
  }, 200); // Check every 500ms
}

// Show notification when clipboard content is captured
function showClipboardNotification(content) {
  const notification = new Notification({
    title: 'Smart Clipboard',
    body: `Captured: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
    icon: path.join(__dirname, 'icon.png'),
    silent: false
  });
  
  // Show notification immediately
  notification.show();
  
  // Auto-dismiss after 3 seconds
  setTimeout(() => {
    notification.close();
  }, 3000);
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
  
  // Cmd+Alt+1 through Cmd+Alt+9 for quick paste
  for (let i = 1; i <= 9; i++) {
    globalShortcut.register(`CommandOrControl+Alt+${i}`, () => {
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

const { keyboard, Key } = require('@nut-tree-fork/nut-js');

// Quick paste by index
async function quickPaste(index) {
  if (clipboardHistory.length >= index) {
    const content = clipboardHistory[index - 1];
    
    // Store current clipboard content
    const originalClipboard = clipboard.readText();
    
    // Set new content to clipboard
    clipboard.writeText(content);
    
    // Simulate paste
    try {
      await keyboard.pressKey(Key.LeftSuper, Key.V);
      await keyboard.releaseKey(Key.LeftSuper, Key.V);
    } catch (error) {
      console.error('Error simulating paste:', error);
    }
    
    // Restore original clipboard after a delay
    setTimeout(() => {
      clipboard.writeText(originalClipboard);
    }, 500);
  }
}

// IPC handlers
ipcMain.handle('get-clipboard-history', () => {
  return clipboardHistory;
});

ipcMain.handle('get-clipboard-settings', () => {
  return settings;
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

ipcMain.handle('paste-item', async (event, index) => {
  if (clipboardHistory[index]) {
    const content = clipboardHistory[index];
    
    // Store current clipboard content
    const originalClipboard = clipboard.readText();
    
    // Set new content to clipboard
    clipboard.writeText(content);
    
    // Simulate paste
    try {
      await keyboard.pressKey(Key.LeftSuper, Key.V);
      await keyboard.releaseKey(Key.LeftSuper, Key.V);
    } catch (error) {
      console.error('Error simulating paste:', error);
    }
    
    // Restore original clipboard after a delay
    setTimeout(() => {
      clipboard.writeText(originalClipboard);
    }, 500);
    
    // Hide window after paste
    isPasteMenuVisible = false;
    mainWindow.hide();
  }
});

ipcMain.handle('show-notification', (event, message) => {
  new Notification({
    title: 'Smart Clipboard',
    body: message,
    icon: path.join(__dirname, 'icon.png')
  }).show();
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
    showTrayIcon: true
  });
});

ipcMain.handle('save-settings', (event, settings) => {
  store.set('settings', settings);
  
  // Apply theme if changed
  if (settings.theme) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('theme-changed', settings.theme);
    }
  }
  
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

ipcMain.handle('quit-app', () => {
  app.isQuiting = true;
  app.quit();
});

ipcMain.handle('open-external-link', (event, url) => {
  shell.openExternal(url);
});

// App lifecycle
app.whenReady().then(() => {
  // Hide from the Dock
  if (app.dock) app.dock.hide();

  // Enable auto-launch at login
  app.setLoginItemSettings({
    openAtLogin: true,
    openAsHidden: true,
    path: app.getPath('exe'),
  });
  
  createWindow();
  createTray();
  startClipboardMonitoring();
  registerGlobalShortcuts();
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