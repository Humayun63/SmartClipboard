# Smart Clipboard - Usage Guide

## 🚀 Quick Start

1. **Install dependencies**: `npm install`
2. **Start the app**: `npm start`
3. **Copy some text** - it's automatically saved to history
4. **Press Cmd+Option+V** - see the smart paste menu
5. **Use Cmd+Shift+1** through **Cmd+Shift+9** for quick pasting

## 📋 Core Features

### Clipboard History
- **Automatic Capture**: Every time you copy text (Cmd+C), it's saved to history
- **Persistent Storage**: Your clipboard history is saved between app restarts
- **Configurable Size**: Default 50 items, adjustable in settings

### Smart Paste Menu
- **Trigger**: Press `Cmd+Option+V` (or `Ctrl+Alt+V` on Windows/Linux)
- **Display**: Shows all recent clipboard items in a clean overlay
- **Selection**: Click or use arrow keys + Enter to select
- **Auto-paste**: Selected item is automatically pasted

### Quick Paste Shortcuts
- **Cmd+Shift+1** → Paste most recent item
- **Cmd+Shift+2** → Paste second most recent item
- **Cmd+Shift+3** → Paste third most recent item
- ...and so on up to **Cmd+Shift+9**

### System Tray Integration
- **Click tray icon** → Show clipboard history
- **Right-click tray icon** → Access menu options
- **Always available** → App runs in background

## 🎯 Advanced Usage

### Keyboard Navigation
- **Arrow keys**: Navigate through items
- **Enter**: Paste selected item
- **Escape**: Close windows/menus
- **Cmd+Shift+V**: Show full history window

### Search & Filter
- **Real-time search**: Type in the search box to filter history
- **Instant results**: See matching items as you type
- **Clear search**: Empty the search box to see all items

### Item Management
- **Remove items**: Click the trash icon on any item
- **Clear all**: Use the clear button in the header
- **Settings**: Configure app behavior via settings window

## ⚙️ Settings

### General Settings
- **Maximum History Size**: How many items to keep (10-200)
- **Paste Menu Timeout**: How long menu stays open (1-10 seconds)
- **Auto-start**: Start app when you log in
- **Show Tray Icon**: Display icon in system tray

### Data Management
- **Clear All Data**: Remove all history and settings
- **Persistent Storage**: Data is saved locally on your device

## 🔧 Troubleshooting

### Shortcuts Not Working
1. **Check permissions**: Ensure app has accessibility access
   - macOS: System Preferences → Security & Privacy → Accessibility
   - Windows: Usually works by default
   - Linux: May need additional packages

2. **Restart app**: Close and reopen the application
3. **Check conflicts**: Other apps might be using the same shortcuts

### Clipboard Not Updating
1. **Check if app is running**: Look for tray icon
2. **Restart clipboard monitoring**: Restart the app
3. **Check for conflicts**: Other clipboard managers might interfere

### App Not Starting
1. **Check Node.js**: Ensure Node.js v14+ is installed
2. **Reinstall dependencies**: Run `npm install`
3. **Check logs**: Look for error messages in terminal

### Performance Issues
1. **Reduce history size**: Lower the maximum history setting
2. **Clear old data**: Remove unused clipboard items
3. **Restart app**: Close and reopen to free memory

## 🎨 Customization

### Visual Preferences
- **Window position**: App remembers where you last positioned it
- **Theme**: Uses system theme (light/dark mode)
- **Animations**: Smooth transitions and effects

### Behavior Customization
- **Paste menu timeout**: How long the menu stays visible
- **History size**: Balance between convenience and performance
- **Auto-start**: Choose whether to start with system

## 🔒 Privacy & Security

### Data Storage
- **Local only**: All data stored on your device
- **No network**: App doesn't send data anywhere
- **Encrypted storage**: Uses secure local storage

### Permissions
- **Clipboard access**: Required for functionality
- **Global shortcuts**: Needed for keyboard shortcuts
- **System tray**: For background operation

## 📱 Platform Support

### macOS
- ✅ Full support
- ✅ Global shortcuts
- ✅ System tray
- ✅ Accessibility permissions required

### Windows
- ✅ Full support
- ✅ Global shortcuts
- ✅ System tray
- ✅ No additional permissions needed

### Linux
- ✅ Full support
- ✅ Global shortcuts (may need packages)
- ✅ System tray
- ✅ May need additional setup

## 🚀 Building for Distribution

### Development Build
```bash
npm start
```

### Production Build
```bash
# Build for current platform
npm run build

# Build for all platforms
npm run dist
```

### Distribution Files
- **macOS**: `.dmg` file
- **Windows**: `.exe` installer
- **Linux**: `.AppImage` file

## 💡 Tips & Tricks

### Productivity Tips
1. **Use quick shortcuts**: Cmd+V+1 is faster than browsing menu
2. **Keep history clean**: Remove items you don't need
3. **Use search**: Find items quickly with search
4. **Configure timeout**: Set paste menu timeout to your preference

### Workflow Integration
1. **Copy frequently used text**: URLs, email templates, code snippets
2. **Organize by copying in order**: Most recent = most important
3. **Use for repetitive tasks**: Copy once, paste multiple times
4. **Combine with other tools**: Works well with text expanders

### Advanced Usage
1. **Multiple items**: Copy several items in sequence for quick access
2. **Temporary storage**: Use as temporary note storage
3. **Code snippets**: Store frequently used code
4. **Contact info**: Keep email addresses, phone numbers handy

## 🆘 Support

### Getting Help
1. **Check this guide**: Look for your issue here
2. **Restart app**: Often fixes temporary issues
3. **Check permissions**: Ensure app has required access
4. **Update dependencies**: Run `npm install` to update

### Common Issues
- **App not responding**: Restart the application
- **Shortcuts not working**: Check system permissions
- **History not saving**: Check disk space and permissions
- **Performance slow**: Reduce history size or clear old data

---

**Enjoy your enhanced clipboard experience!** 🎉 