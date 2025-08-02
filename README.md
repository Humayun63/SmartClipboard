# Smart Clipboard

A powerful, responsive clipboard manager desktop app built with Electron that enhances your copy-paste workflow with intelligent features.

## Features

### 📋 Clipboard History
- Automatically captures and stores any text you copy (Cmd+C / Ctrl+C)
- Persistent storage with configurable history size
- Real-time clipboard monitoring

### 🎯 Smart Paste Menu
- Press **Cmd+Option+V** to show a dropdown with all recent clipboard entries
- Click or use arrow keys to select an item
- Automatically pastes the selected content

### ⚡ Quick Paste Shortcuts
- **Cmd+V+1** → Paste most recent item
- **Cmd+V+2** → Paste second most recent item
- **Cmd+V+3** → Paste third most recent item
- And so on up to **Cmd+V+9**

### 🔍 Search & Navigation
- Real-time search through clipboard history
- Keyboard navigation (Arrow keys, Enter, Escape)
- Click to paste or remove items

### 🎨 Modern UI
- Clean, responsive design with blur effects
- System tray integration
- Non-intrusive overlay windows
- Smooth animations and transitions

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Setup
1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development version:
   ```bash
   npm start
   ```

### Building for Distribution
```bash
# Build for current platform
npm run build

# Build for all platforms
npm run dist
```

## Usage

### Basic Operations
1. **Copy text** - Any text you copy is automatically saved to history
2. **Show paste menu** - Press `Cmd+Option+V` to see all recent clipboard items
3. **Quick paste** - Use `Cmd+V+1` through `Cmd+V+9` for instant pasting
4. **Show history** - Press `Cmd+Shift+V` to open the full history window

### System Tray
- Click the tray icon to show clipboard history
- Right-click for options: Show History, Clear History, Settings, Quit

### Keyboard Shortcuts
- `Cmd+Option+V` - Show paste menu
- `Cmd+V+1-9` - Quick paste by index
- `Cmd+Shift+V` - Show clipboard history window
- `Escape` - Close windows/menus
- `Arrow keys` - Navigate through items
- `Enter` - Paste selected item

## Configuration

The app stores settings in your system's application data folder. You can modify:
- Maximum history size (default: 50 items)
- Paste menu timeout (default: 3 seconds)
- Auto-start with system
- Tray icon visibility

## Technical Details

### Architecture
- **Main Process**: Handles clipboard monitoring, global shortcuts, and window management
- **Renderer Process**: Manages UI interactions and displays
- **IPC Communication**: Secure communication between processes
- **Persistent Storage**: Uses electron-store for data persistence

### Key Technologies
- **Electron**: Cross-platform desktop app framework
- **electron-store**: Persistent data storage
- **robotjs**: Global keyboard/mouse automation
- **Native APIs**: System clipboard and global shortcuts

### Security
- Runs with minimal permissions
- No network communication
- Local data storage only
- Secure IPC communication

## Development

### Project Structure
```
SmartClipboard/
├── main.js          # Main Electron process
├── renderer.js      # Renderer process logic
├── index.html       # Main UI
├── styles.css       # Styling
├── package.json     # Dependencies and scripts
└── README.md        # This file
```

### Adding Features
1. **New shortcuts**: Add to `registerGlobalShortcuts()` in `main.js`
2. **UI changes**: Modify `index.html` and `styles.css`
3. **New functionality**: Extend IPC handlers in both processes

## Troubleshooting

### Common Issues
1. **Shortcuts not working**: Ensure the app has accessibility permissions
2. **Clipboard not updating**: Check if another app is interfering
3. **App not starting**: Verify Node.js and dependencies are installed

### Permissions Required
- **macOS**: Accessibility permissions for global shortcuts
- **Windows**: No additional permissions needed
- **Linux**: May need additional packages for global shortcuts

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues, feature requests, or questions:
1. Check the troubleshooting section
2. Search existing issues
3. Create a new issue with detailed information

---

**Note**: This app enhances your system's clipboard functionality. Use responsibly and be aware of what you copy, as it's stored locally on your device. 