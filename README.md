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
- **Cmd+Alt+1** → Paste most recent item
- **Cmd+Alt+2** → Paste second most recent item
- **Cmd+Alt+3** → Paste third most recent item
- And so on up to **Cmd+Alt+9**
- **Cmd+Shift+1-9** → Paste pinned item 1-9

### 🎨 Theme Support
- **Light Theme**: Clean, modern light interface
- **Dark Theme**: Easy on the eyes dark mode
- **Midnight Developer**: Classic terminal-style green theme

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
   ```bash
   git clone https://github.com/Humayun63/SmartClipboard.git
   ```
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
3. **Quick paste** - Use `Cmd+Alt+1` through `Cmd+Alt+9` for instant pasting
4. **Paste pinned item** - Use `Cmd+Shift+1` through `Cmd+Shift+9` to paste pinned items
5. **Show history** - Press `Cmd+Shift+V` to open the full history window

### System Tray
- Click the tray icon to show clipboard history
- Right-click for options: Show History, Clear History, Settings, Quit

### Keyboard Shortcuts
- `Cmd+Option+V` - Show paste menu
- `Cmd+Alt+1-9` - Quick paste by index
- `Cmd+Shift+1-9` - Paste pinned item 1-9
- `Cmd+Shift+V` - Show clipboard history window
- `Escape` - Close windows/menus
- `Arrow keys`