const { app, BrowserWindow, globalShortcut, clipboard, ipcMain, screen, Menu, Tray, nativeImage, Notification, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { keyboard, Key } = require('@nut-tree-fork/nut-js');

// Initialize persistent storage
const store = new Store({
  name: 'clipboard-history',
  defaults: {
    clipboardHistory: [],
    pinnedHistory: [],
    mergeTags: {},
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
let pinnedHistory = store.get('pinnedHistory', []);
let mergeTags = store.get('mergeTags', {});
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
    // Check for text content
    const currentTextContent = clipboard.readText();
    
    // Check for image content
    const currentImageContent = clipboard.readImage();
    
    let clipboardItem = null;
    let currentContent = null;
    
    if (currentTextContent && currentTextContent.trim() !== '') {
      clipboardItem = {
        type: 'text',
        content: currentTextContent,
        timestamp: Date.now(),
        id: Date.now() + Math.random()
      };
      currentContent = currentTextContent;
    } else if (!currentImageContent.isEmpty()) {
      // Convert image to base64 for storage
      const imageBase64 = currentImageContent.toDataURL();
      clipboardItem = {
        type: 'image',
        content: imageBase64,
        timestamp: Date.now(),
        id: Date.now() + Math.random(),
        size: currentImageContent.getSize()
      };
      currentContent = imageBase64;
    }
    
    if (clipboardItem && currentContent !== lastClipboardContent) {
      // Add to history if it's new content
      const existingItem = clipboardHistory.find(item => 
        (item.type === clipboardItem.type && item.content === clipboardItem.content)
      );
      
      if (!existingItem) {
        clipboardHistory.unshift(clipboardItem);
        
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
  }, 200); // Check every 200ms
}

// Show notification when clipboard content is captured
function showClipboardNotification(item) {
  let body;
  if (item.type === 'text') {
    body = `Captured: ${item.content.substring(0, 50)}${item.content.length > 50 ? '...' : ''}`;
  } else if (item.type === 'image') {
    body = `Captured: Image (${item.size.width}x${item.size.height})`;
  }
  
  const notification = new Notification({
    title: 'Smart Clipboard',
    body: body,
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
  console.log('Registering global shortcuts...');
  
  // Cmd+Shift+V for showing clipboard history
  globalShortcut.register('CommandOrControl+Shift+V', () => {
    console.log('Cmd+Shift+V pressed - showing clipboard history');
    mainWindow.show();
    mainWindow.focus();
  });
  
  // Cmd+Option+V for paste menu (alternative to not interfere with normal Cmd+V)
  globalShortcut.register('CommandOrControl+Alt+V', () => {
    console.log('Cmd+Alt+V pressed - showing paste menu');
    showPasteMenu();
  });

  // Ctrl+Option+M for merge tag replacement
  globalShortcut.register('Control+Alt+M', () => {
    console.log('Ctrl+Alt+M pressed - merge tag replacement');
    handleMergeTagReplacement();
  });
  
  // Cmd+Alt+1 through Cmd+Alt+9 for quick paste from clipboard history
  for (let i = 1; i <= 9; i++) {
    const shortcut = `CommandOrControl+Alt+${i}`;
    const success = globalShortcut.register(shortcut, () => {
      console.log(`Shortcut ${shortcut} pressed - quick paste from clipboard history`);
      quickPaste(i);
    });
    console.log(`Registered ${shortcut}: ${success}`);
  }
  
  // Cmd+Shift+1 through Cmd+Shift+9 for pinned items
  for (let i = 1; i <= 9; i++) {
    const shortcut = `CommandOrControl+Shift+${i}`;
    const success = globalShortcut.register(shortcut, () => {
      console.log(`Shortcut ${shortcut} pressed - quick paste from pinned items`);
      quickPastePinned(i);
    });
    console.log(`Registered ${shortcut}: ${success}`);
  }
}

// Show paste menu
function showPasteMenu() {
  if (clipboardHistory.length === 0) return;
  
  isPasteMenuVisible = true;
  mainWindow.show();
  mainWindow.focus();
  mainWindow.webContents.send('show-paste-menu', clipboardHistory);
}

// Quick paste by index (from clipboard history)
async function quickPaste(index) {
  console.log(`Quick paste from clipboard history: index ${index}, history length: ${clipboardHistory.length}`);
  if (clipboardHistory.length >= index) {
    const item = clipboardHistory[index - 1];
    
    // Handle different item structures (legacy string vs new object)
    let content, type;
    if (typeof item === 'string') {
      content = item;
      type = 'text';
    } else {
      content = item.content;
      type = item.type;
    }
    
    console.log(`Pasting clipboard item (${type}): ${type === 'text' ? content.substring(0, 50) + '...' : 'Image'}`);
    
    // Store current clipboard content
    const originalTextClipboard = clipboard.readText();
    const originalImageClipboard = clipboard.readImage();
    
    // Set new content to clipboard based on type
    if (type === 'text') {
      clipboard.writeText(content);
    } else if (type === 'image') {
      // Convert base64 back to image
      const image = nativeImage.createFromDataURL(content);
      clipboard.writeImage(image);
    }
    
    // Simulate paste
    try {
      await keyboard.pressKey(Key.LeftSuper, Key.V);
      await keyboard.releaseKey(Key.LeftSuper, Key.V);
    } catch (error) {
      console.error('Error simulating paste:', error);
    }
    
    // Restore original clipboard after a delay
    setTimeout(() => {
      if (originalTextClipboard) {
        clipboard.writeText(originalTextClipboard);
      } else if (!originalImageClipboard.isEmpty()) {
        clipboard.writeImage(originalImageClipboard);
      }
    }, 500);
  } else {
    console.log(`No clipboard item at index ${index}`);
  }
}

// Paste pinned item by index (from pinned history only)
async function quickPastePinned(index) {
  console.log(`Quick paste from pinned items: index ${index}, pinned length: ${pinnedHistory.length}`);
  if (pinnedHistory.length >= index) {
    const pinnedItem = pinnedHistory[index - 1];
    
    // Handle different pinned item structures
    let content, type;
    if (typeof pinnedItem === 'string') {
      content = pinnedItem;
      type = 'text';
    } else {
      content = pinnedItem.content;
      type = pinnedItem.type || 'text';
    }
    
    if (!content) {
      console.log(`No content found for pinned item at index ${index}`);
      return;
    }
    
    console.log(`Pasting pinned item (${type}): ${type === 'text' ? content.substring(0, 50) + '...' : 'Image'}`);
    
    // Store current clipboard content
    const originalTextClipboard = clipboard.readText();
    const originalImageClipboard = clipboard.readImage();
    
    // Set new content to clipboard based on type
    if (type === 'text') {
      clipboard.writeText(content);
    } else if (type === 'image') {
      // Convert base64 back to image
      const image = nativeImage.createFromDataURL(content);
      clipboard.writeImage(image);
    }
    
    // Simulate paste
    try {
      await keyboard.pressKey(Key.LeftSuper, Key.V);
      await keyboard.releaseKey(Key.LeftSuper, Key.V);
    } catch (error) {
      console.error('Error simulating paste:', error);
    }
    
    // Restore original clipboard after a delay
    setTimeout(() => {
      if (originalTextClipboard) {
        clipboard.writeText(originalTextClipboard);
      } else if (!originalImageClipboard.isEmpty()) {
        clipboard.writeImage(originalImageClipboard);
      }
    }, 500);
  } else {
    console.log(`No pinned item at index ${index}`);
  }
}

// Handle merge tag replacement
async function handleMergeTagReplacement() {
  try {
    console.log('Starting merge tag replacement...');
    
    // Store original clipboard content
    const originalClipboard = clipboard.readText();
    
    // Copy the selected text by simulating Cmd+C
    await keyboard.pressKey(Key.LeftSuper, Key.C);
    await keyboard.releaseKey(Key.LeftSuper, Key.C);
    
    // Small delay to ensure clipboard is updated
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Get the selected text from clipboard
    const selectedText = clipboard.readText();
    
    if (!selectedText || selectedText.trim() === '') {
      console.log('No text selected for merge tag replacement');
      // Restore original clipboard
      clipboard.writeText(originalClipboard);
      return;
    }
    
    // Check if the selected text matches any merge tag slug
    const mergeTagValue = mergeTags[selectedText.trim()];
    
    if (mergeTagValue) {
      console.log(`Found merge tag: ${selectedText}`);
      
      // Handle different types of merge tag values
      if (typeof mergeTagValue === 'string') {
        // Text merge tag
        console.log(`Text merge tag: ${selectedText} -> ${mergeTagValue}`);
        
        // Replace selected text with merge tag value
        clipboard.writeText(mergeTagValue);
        
        // Paste the replacement text
        await keyboard.pressKey(Key.LeftSuper, Key.V);
        await keyboard.releaseKey(Key.LeftSuper, Key.V);
        
        // Show notification
        new Notification({
          title: 'Smart Clipboard',
          body: `Replaced "${selectedText}" with merge tag text`,
          icon: path.join(__dirname, 'icon.png')
        }).show();
      } else if (mergeTagValue.type === 'image') {
        // Image merge tag
        console.log(`Image merge tag: ${selectedText} -> Image (${mergeTagValue.size ? mergeTagValue.size.width + 'x' + mergeTagValue.size.height : 'unknown size'})`);
        
        // Convert base64 back to image and set to clipboard
        const image = nativeImage.createFromDataURL(mergeTagValue.content);
        clipboard.writeImage(image);
        
        // Paste the image
        await keyboard.pressKey(Key.LeftSuper, Key.V);
        await keyboard.releaseKey(Key.LeftSuper, Key.V);
        
        // Show notification
        new Notification({
          title: 'Smart Clipboard',
          body: `Replaced "${selectedText}" with merge tag image`,
          icon: path.join(__dirname, 'icon.png')
        }).show();
      }
      
      // Restore original clipboard after a delay
      setTimeout(() => {
        if (originalClipboard) {
          clipboard.writeText(originalClipboard);
        }
      }, 500);
    } else {
      console.log(`No merge tag found for: ${selectedText}`);
      // Restore original clipboard
      clipboard.writeText(originalClipboard);
      
      // Show notification that no merge tag was found
      new Notification({
        title: 'Smart Clipboard',
        body: `No merge tag found for "${selectedText}"`,
        icon: path.join(__dirname, 'icon.png')
      }).show();
    }
  } catch (error) {
    console.error('Error in merge tag replacement:', error);
  }
}

// IPC handlers
ipcMain.handle('get-clipboard-history', () => {
  return { clipboardHistory, pinnedHistory, mergeTags };
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

ipcMain.handle('pin-item', (event, item) => {
  pinnedHistory.unshift(item);
  store.set('pinnedHistory', pinnedHistory);
  return pinnedHistory;
});

ipcMain.handle('pin-item-with-merge-tag', (event, { item, title, mergeTagSlug, description }) => {
  // Validate merge tag slug
  if (mergeTagSlug && !isValidMergeTagSlug(mergeTagSlug)) {
    throw new Error('Invalid merge tag slug. Use only lowercase letters, numbers, and underscores.');
  }
  
  // Check if merge tag slug already exists
  if (mergeTagSlug && mergeTags[mergeTagSlug]) {
    throw new Error('Merge tag slug already exists. Please choose a different one.');
  }
  
  // Create pinned item with merge tag info
  const pinnedItem = {
    content: typeof item === 'string' ? item : item.content,
    type: typeof item === 'string' ? 'text' : item.type,
    title: title || '',
    mergeTagSlug: mergeTagSlug || null,
    description: description || '',
    timestamp: Date.now(),
    id: typeof item === 'string' ? Date.now() + Math.random() : item.id,
    size: item.size || null
  };
  
  pinnedHistory.unshift(pinnedItem);
  store.set('pinnedHistory', pinnedHistory);
  
  // Store merge tag if provided (for both text and images)
  if (mergeTagSlug) {
    // For images, we store the entire item object, for text we store just the content
    if (pinnedItem.type === 'image') {
      mergeTags[mergeTagSlug] = pinnedItem;
    } else {
      mergeTags[mergeTagSlug] = pinnedItem.content;
    }
    store.set('mergeTags', mergeTags);
  }
  
  return { pinnedHistory, mergeTags };
});

ipcMain.handle('unpin-item', (event, index) => {
  const item = pinnedHistory[index];
  
  // Remove merge tag if it exists
  if (item && item.mergeTagSlug && mergeTags[item.mergeTagSlug]) {
    delete mergeTags[item.mergeTagSlug];
    store.set('mergeTags', mergeTags);
  }
  
  pinnedHistory.splice(index, 1);
  store.set('pinnedHistory', pinnedHistory);
  return { pinnedHistory, mergeTags };
});

ipcMain.handle('update-pinned-item', (event, index, updatedItem) => {
  const oldItem = pinnedHistory[index];
  
  // Validate merge tag slug if provided
  if (updatedItem.mergeTagSlug && !isValidMergeTagSlug(updatedItem.mergeTagSlug)) {
    throw new Error('Invalid merge tag slug. Use only lowercase letters, numbers, and underscores.');
  }
  
  // Check if merge tag slug already exists (unless it's the same item)
  if (updatedItem.mergeTagSlug && 
      mergeTags[updatedItem.mergeTagSlug] && 
      oldItem.mergeTagSlug !== updatedItem.mergeTagSlug) {
    throw new Error('Merge tag slug already exists. Please choose a different one.');
  }
  
  // Remove old merge tag if it exists and is different
  if (oldItem.mergeTagSlug && oldItem.mergeTagSlug !== updatedItem.mergeTagSlug) {
    delete mergeTags[oldItem.mergeTagSlug];
  }
  
  // Update the pinned item
  pinnedHistory[index] = updatedItem;
  store.set('pinnedHistory', pinnedHistory);
  
  // Update merge tag if provided
  if (updatedItem.mergeTagSlug) {
    // For images, store the entire item object, for text store just the content
    if (updatedItem.type === 'image') {
      mergeTags[updatedItem.mergeTagSlug] = updatedItem;
    } else {
      mergeTags[updatedItem.mergeTagSlug] = updatedItem.content;
    }
    store.set('mergeTags', mergeTags);
  }
  
  return { pinnedHistory, mergeTags };
});

ipcMain.handle('get-merge-tags', () => {
  return mergeTags;
});

// Helper function to validate merge tag slug
function isValidMergeTagSlug(slug) {
  if (!slug || typeof slug !== 'string') return false;
  // Allow lowercase letters, numbers, and underscores only
  return /^[a-z0-9_]+$/.test(slug);
}

ipcMain.handle('paste-item', async (event, index) => {
  if (clipboardHistory[index]) {
    const item = clipboardHistory[index];
    
    // Handle different item structures (legacy string vs new object)
    let content, type;
    if (typeof item === 'string') {
      content = item;
      type = 'text';
    } else {
      content = item.content;
      type = item.type;
    }
    
    // Store current clipboard content
    const originalTextClipboard = clipboard.readText();
    const originalImageClipboard = clipboard.readImage();
    
    // Set new content to clipboard based on type
    if (type === 'text') {
      clipboard.writeText(content);
    } else if (type === 'image') {
      // Convert base64 back to image
      const image = nativeImage.createFromDataURL(content);
      clipboard.writeImage(image);
    }
    
    // Simulate paste
    try {
      await keyboard.pressKey(Key.LeftSuper, Key.V);
      await keyboard.releaseKey(Key.LeftSuper, Key.V);
    } catch (error) {
      console.error('Error simulating paste:', error);
    }
    
    // Restore original clipboard after a delay
    setTimeout(() => {
      if (originalTextClipboard) {
        clipboard.writeText(originalTextClipboard);
      } else if (!originalImageClipboard.isEmpty()) {
        clipboard.writeImage(originalImageClipboard);
      }
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

ipcMain.handle('copy-item', (event, index) => {
  if (clipboardHistory[index]) {
    const item = clipboardHistory[index];
    
    // Handle different item structures (legacy string vs new object)
    let content, type;
    if (typeof item === 'string') {
      content = item;
      type = 'text';
    } else {
      content = item.content;
      type = item.type;
    }
    
    // Set content to clipboard based on type
    if (type === 'text') {
      clipboard.writeText(content);
    } else if (type === 'image') {
      // Convert base64 back to image
      const image = nativeImage.createFromDataURL(content);
      clipboard.writeImage(image);
    }
    
    return true;
  }
  return false;
});

ipcMain.handle('copy-pinned-item', (event, index) => {
  if (pinnedHistory[index]) {
    const item = pinnedHistory[index];
    
    // Handle different item structures (legacy string vs new object)
    let content, type;
    if (typeof item === 'string') {
      content = item;
      type = 'text';
    } else {
      content = item.content;
      type = item.type || 'text';
    }
    
    // Set content to clipboard based on type
    if (type === 'text') {
      clipboard.writeText(content);
    } else if (type === 'image') {
      // Convert base64 back to image
      const image = nativeImage.createFromDataURL(content);
      clipboard.writeImage(image);
    }
    
    return true;
  }
  return false;
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
  pinnedHistory = [];
  mergeTags = {};
  store.set('clipboardHistory', clipboardHistory);
  store.set('pinnedHistory', pinnedHistory);
  store.set('mergeTags', mergeTags);
  // Optionally notify renderer processes to update UI
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('update-history', clipboardHistory);
    mainWindow.webContents.send('update-pinned', pinnedHistory);
  }
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