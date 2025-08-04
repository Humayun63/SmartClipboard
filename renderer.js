const { ipcRenderer } = require('electron');

// DOM elements
const historyList = document.getElementById('historyList');
const emptyState = document.getElementById('emptyState');
const searchInput = document.querySelector('.search-input');
const btnClear = document.querySelector('.btn-clear');
const btnSettings = document.querySelector('.btn-settings');
const pasteMenuOverlay = document.getElementById('pasteMenuOverlay');
const pasteMenuList = document.getElementById('pasteMenuList');
const pasteMenuClose = document.getElementById('pasteMenuClose');

// State
let clipboardHistory = [];
let filteredHistory = [];
let selectedIndex = -1;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Apply Saved Theme
    await applyTheme();

    // Load initial clipboard history
    clipboardHistory = await ipcRenderer.invoke('get-clipboard-history');
    filteredHistory = [...clipboardHistory];
    renderHistory();
    
    // Set up event listeners
    setupEventListeners();
    
    // Listen for updates from main process
    ipcRenderer.on('update-history', (event, history) => {
        clipboardHistory = history;
        filterHistory();
        renderHistory();
    });
    
    ipcRenderer.on('show-paste-menu', (event, history) => {
        showPasteMenu(history);
    });
    
    // Listen for theme changes
    ipcRenderer.on('theme-changed', (event, theme) => {
        document.documentElement.setAttribute('data-theme', theme);
    });
});

// Set up event listeners
function setupEventListeners() {
    // Search functionality
    searchInput.addEventListener('input', (e) => {
        filterHistory();
        renderHistory();
    });
    
    // Clear history button
    btnClear.addEventListener('click', async () => {
        clipboardHistory = await ipcRenderer.invoke('clear-history');
        filteredHistory = [...clipboardHistory];
        renderHistory();
    });
    
    // Settings button
    btnSettings.addEventListener('click', () => {
        ipcRenderer.invoke('open-settings');
    });
    
    // Paste menu close button
    pasteMenuClose.addEventListener('click', () => {
        hidePasteMenu();
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', handleKeydown);
    
    // Click outside paste menu to close
    pasteMenuOverlay.addEventListener('click', (e) => {
        if (e.target === pasteMenuOverlay) {
            hidePasteMenu();
        }
    });
}

// Handle keyboard navigation
function handleKeydown(e) {
    if (pasteMenuOverlay.classList.contains('visible')) {
        handlePasteMenuKeydown(e);
    } else {
        handleMainWindowKeydown(e);
    }
}

// Handle keyboard navigation in main window
function handleMainWindowKeydown(e) {
    switch (e.key) {
        case 'Escape':
            window.close();
            break;
        case 'ArrowDown':
            e.preventDefault();
            navigateHistory(1);
            break;
        case 'ArrowUp':
            e.preventDefault();
            navigateHistory(-1);
            break;
        case 'Enter':
            e.preventDefault();
            if (selectedIndex >= 0 && selectedIndex < filteredHistory.length) {
                copyItem(selectedIndex);
            }
            break;
    }
}

// Handle keyboard navigation in paste menu
function handlePasteMenuKeydown(e) {
    switch (e.key) {
        case 'Escape':
            hidePasteMenu();
            break;
        case 'ArrowDown':
            e.preventDefault();
            navigatePasteMenu(1);
            break;
        case 'ArrowUp':
            e.preventDefault();
            navigatePasteMenu(-1);
            break;
        case 'Enter':
            e.preventDefault();
            if (selectedIndex >= 0 && selectedIndex < clipboardHistory.length) {
                pasteItemFromMenu(selectedIndex);
            }
            break;
    }
}

// Navigate through history items
function navigateHistory(direction) {
    const items = document.querySelectorAll('.history-item');
    const maxIndex = items.length - 1;
    
    // Remove current selection
    if (selectedIndex >= 0 && selectedIndex < items.length) {
        items[selectedIndex].classList.remove('selected');
    }
    
    // Calculate new index
    if (selectedIndex === -1) {
        selectedIndex = direction > 0 ? 0 : maxIndex;
    } else {
        selectedIndex += direction;
        if (selectedIndex > maxIndex) selectedIndex = 0;
        if (selectedIndex < 0) selectedIndex = maxIndex;
    }
    
    // Apply new selection
    if (selectedIndex >= 0 && selectedIndex < items.length) {
        items[selectedIndex].classList.add('selected');
        items[selectedIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Navigate through paste menu items
function navigatePasteMenu(direction) {
    const items = document.querySelectorAll('.paste-menu-item');
    const maxIndex = items.length - 1;
    
    // Remove current selection
    if (selectedIndex >= 0 && selectedIndex < items.length) {
        items[selectedIndex].classList.remove('selected');
    }
    
    // Calculate new index
    if (selectedIndex === -1) {
        selectedIndex = direction > 0 ? 0 : maxIndex;
    } else {
        selectedIndex += direction;
        if (selectedIndex > maxIndex) selectedIndex = 0;
        if (selectedIndex < 0) selectedIndex = maxIndex;
    }
    
    // Apply new selection
    if (selectedIndex >= 0 && selectedIndex < items.length) {
        items[selectedIndex].classList.add('selected');
        items[selectedIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Filter history based on search input
function filterHistory() {
    const searchTerm = searchInput.value.toLowerCase();
    if (searchTerm === '') {
        filteredHistory = [...clipboardHistory];
    } else {
        filteredHistory = clipboardHistory.filter(item => 
            item.toLowerCase().includes(searchTerm)
        );
    }
}

// Apply Theme
async function applyTheme () {
    const settings = await ipcRenderer.invoke('get-clipboard-settings');
    if(settings?.theme) {
        document.documentElement.setAttribute('data-theme', settings.theme);
    }
}

// Render history list
function renderHistory() {
    if (filteredHistory.length === 0) {
        historyList.style.display = 'none';
        emptyState.style.display = 'flex';
        return;
    }
    
    historyList.style.display = 'block';
    emptyState.style.display = 'none';
    
    historyList.innerHTML = filteredHistory.map((item, index) => {
        const preview = item.length > 100 ? item.substring(0, 100) + '...' : item;
        return `
            <div class="history-item" data-index="${index}">
                <div class="history-item-content">
                    <div class="history-item-text">${escapeHtml(item)}</div>
                    <div class="history-item-preview">${escapeHtml(preview)}</div>
                </div>
                <div class="history-item-actions">
                    <button class="btn-copy" title="Copy">📋</button>
                    <button class="btn-remove" title="Remove">❌</button>
                </div>
            </div>
        `;
    }).join('');
    
    // Add click listeners to items
    const items = historyList.querySelectorAll('.history-item');
    items.forEach((item, index) => {
        item.addEventListener('click', () => {
            copyItem(index);
        });
        
        // Add action button listeners
        const btnCopy = item.querySelector('.btn-copy');
        const btnRemove = item.querySelector('.btn-remove');
        
        btnCopy.addEventListener('click', (e) => {
            e.stopPropagation();
            copyItem(index);
        });
        
        btnRemove.addEventListener('click', async (e) => {
            e.stopPropagation();
            const originalIndex = clipboardHistory.indexOf(filteredHistory[index]);
            if (originalIndex !== -1) {
                clipboardHistory = await ipcRenderer.invoke('remove-item', originalIndex);
                filterHistory();
                renderHistory();
            }
        });
    });
}

// Copy item from main window
async function copyItem(index) {
    if (index >= 0 && index < filteredHistory.length) {
        const textToCopy = filteredHistory[index];
        await navigator.clipboard.writeText(textToCopy);
        await ipcRenderer.invoke('show-notification', 'Copied to clipboard!');
        window.close();
    }
}




// Show paste menu
function showPasteMenu(history) {
    pasteMenuList.innerHTML = history.map((item, index) => {
        const preview = item.length > 100 ? item.substring(0, 100) + '...' : item;
        return `
            <div class="paste-menu-item" data-index="${index}">
                <div class="paste-menu-item-number">${index + 1}</div>
                <div class="paste-menu-item-content">
                    <div class="paste-menu-item-text">${escapeHtml(item)}</div>
                    <div class="paste-menu-item-preview">${escapeHtml(preview)}</div>
                </div>
            </div>
        `;
    }).join('');
    
    // Add click listeners to paste menu items
    const items = pasteMenuList.querySelectorAll('.paste-menu-item');
    items.forEach((item, index) => {
        item.addEventListener('click', () => {
            pasteItemFromMenu(index);
        });
    });
    
    pasteMenuOverlay.classList.add('visible');
    selectedIndex = -1;
}

// Hide paste menu
function hidePasteMenu() {
    pasteMenuOverlay.classList.remove('visible');
    selectedIndex = -1;
    ipcRenderer.invoke('hide-paste-menu');
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Utility function to truncate text
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
} 