const { ipcRenderer } = require('electron');

// DOM elements
const historyList = document.getElementById('historyList');
const pinnedList = document.getElementById('pinnedList');
const emptyStateHistory = document.getElementById('emptyStateHistory');
const emptyStatePinned = document.getElementById('emptyStatePinned');
const searchInput = document.querySelector('.search-input');
const btnClear = document.querySelector('.btn-clear');
const btnSettings = document.querySelector('.btn-settings');
const pasteMenuOverlay = document.getElementById('pasteMenuOverlay');
const pasteMenuList = document.getElementById('pasteMenuList');
const pasteMenuClose = document.getElementById('pasteMenuClose');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

// Pin Modal elements
const pinModalOverlay = document.getElementById('pinModalOverlay');
const pinModalClose = document.getElementById('pinModalClose');
const pinModalCancel = document.getElementById('pinModalCancel');
const pinForm = document.getElementById('pinForm');
const pinItemIndex = document.getElementById('pinItemIndex');
const pinTitle = document.getElementById('pinTitle');
const pinDescription = document.getElementById('pinDescription');


// State
let clipboardHistory = [];
let pinnedHistory = [];
let filteredHistory = [];
let selectedIndex = -1;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Apply Saved Theme
    await applyTheme();

    // Load initial clipboard history
    const { clipboardHistory: initialClipboardHistory, pinnedHistory: initialPinnedHistory } = await ipcRenderer.invoke('get-clipboard-history');
    clipboardHistory = initialClipboardHistory;
    pinnedHistory = initialPinnedHistory;
    
    filterHistory();
    renderPinnedHistory();
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
        filterHistory();
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

    // Pin Modal Listeners
    pinModalClose.addEventListener('click', closePinModal);
    pinModalCancel.addEventListener('click', closePinModal);
    pinForm.addEventListener('submit', handlePinFormSubmit);
    
    // Click outside modal to close
    pinModalOverlay.addEventListener('click', (e) => {
        if (e.target === pinModalOverlay) {
            closePinModal();
        }
    });

    // Tab navigation
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.dataset.tab;
            switchTab(tab);
        });
    });
}

function switchTab(tab) {
    tabButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.tab === tab);
    });
    tabPanes.forEach(pane => {
        pane.classList.toggle('active', pane.id === `${tab}Tab`);
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
    const pinnedContents = pinnedHistory.map(p => p.content);
    if (searchTerm === '') {
        filteredHistory = clipboardHistory.filter(item => !pinnedContents.includes(item));
    } else {
        filteredHistory = clipboardHistory.filter(item => 
            !pinnedContents.includes(item) && item.toLowerCase().includes(searchTerm)
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

// Render Pinned History
function renderPinnedHistory() {
    if (pinnedHistory.length === 0) {
        pinnedList.style.display = 'none';
        emptyStatePinned.style.display = 'flex';
        return;
    }

    pinnedList.style.display = 'block';
    emptyStatePinned.style.display = 'none';
    pinnedList.innerHTML = pinnedHistory.map((item, index) => {
        // Handle both string and object formats
        const content = typeof item === 'string' ? item : item.content;
        const title = typeof item === 'string' ? 'Pinned Item' : (item.title || 'Pinned Item');
        const description = typeof item === 'string' ? item : (item.description || item.content);
        
        return `
            <div class="pinned-item" data-index="${index}">
                <div class="pinned-item-content">
                    <div class="pinned-item-title">${escapeHtml(title)}</div>
                    <div class="pinned-item-description">${escapeHtml(description)}</div>
                </div>
                <div class="pinned-item-actions">
                    <button class="btn-unpin" title="Unpin">📌</button>
                    <button class="btn-edit-pin" title="Edit">✏️</button>
                    <button class="btn-copy" title="Copy">📋</button>
                </div>
            </div>
        `;
    }).join('');

    // Add event listeners
    pinnedList.querySelectorAll('.pinned-item').forEach((item, index) => {
        const pinnedItem = pinnedHistory[index];
        const content = typeof pinnedItem === 'string' ? pinnedItem : pinnedItem.content;
        
        item.addEventListener('click', () => copyContent(content));

        const btnUnpin = item.querySelector('.btn-unpin');
        btnUnpin.addEventListener('click', (e) => {
            e.stopPropagation();
            unpinItem(index);
        });

        const btnEdit = item.querySelector('.btn-edit-pin');
        btnEdit.addEventListener('click', (e) => {
            e.stopPropagation();
            openPinModal(index, pinnedItem);
        });

        const btnCopy = item.querySelector('.btn-copy');
        btnCopy.addEventListener('click', (e) => {
            e.stopPropagation();
            copyContent(content);
        });
    });
}


// Render history list
function renderHistory() {
    if (filteredHistory.length === 0) {
        historyList.style.display = 'none';
        emptyStateHistory.style.display = 'flex';
        return;
    }
    
    historyList.style.display = 'block';
    emptyStateHistory.style.display = 'none';
    
    historyList.innerHTML = filteredHistory.map((item, index) => {
        const preview = item.length > 100 ? item.substring(0, 100) + '...' : item;
        return `
            <div class="history-item" data-index="${index}">
                <div class="history-item-content">
                    <div class="history-item-text">${escapeHtml(item)}</div>
                    <div class="history-item-preview">${escapeHtml(preview)}</div>
                </div>
                <div class="history-item-actions">
                    <button class="btn-pin" title="Pin">📌</button>
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
        const btnPin = item.querySelector('.btn-pin');
        const btnCopy = item.querySelector('.btn-copy');
        const btnRemove = item.querySelector('.btn-remove');
        
        btnPin.addEventListener('click', (e) => {
            e.stopPropagation();
            openPinModal(index);
        });

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
        await copyContent(textToCopy);
    }
}

async function copyContent(content) {
    await navigator.clipboard.writeText(content);
    await ipcRenderer.invoke('show-notification', 'Copied to clipboard!');
    window.close();
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
                <div class="paste-menu-item-actions">
                    <button class="btn-copy" title="Copy">📋</button>
                    <button class="btn-pin" title="Pin">📌</button>
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

        const btnCopy = item.querySelector('.btn-copy');
        btnCopy.addEventListener('click', (e) => {
            e.stopPropagation();
            copyContent(history[index]);
        });

        const btnPin = item.querySelector('.btn-pin');
        btnPin.addEventListener('click', (e) => {
            e.stopPropagation();
            openPinModal(index);
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

// Pin Modal Functions
function openPinModal(index, item = null) {
    pinForm.reset();
    if (item) { // Editing a pinned item
        pinItemIndex.value = index;
        pinTitle.value = item.title || '';
        pinDescription.value = item.description || '';
        // Add a flag to indicate we're editing
        pinForm.dataset.editing = 'true';
    } else { // Pinning a new item from history
        pinItemIndex.value = index;
        // Pre-fill with the content as description
        const content = filteredHistory[index];
        pinDescription.value = content || '';
        // Remove the editing flag
        delete pinForm.dataset.editing;
    }
    pinModalOverlay.classList.add('visible');
}

function closePinModal() {
    pinModalOverlay.classList.remove('visible');
}

async function handlePinFormSubmit(e) {
    e.preventDefault();
    const index = parseInt(pinItemIndex.value);
    const title = pinTitle.value.trim();
    const description = pinDescription.value.trim();
    const isEditing = pinForm.dataset.editing === 'true';

    if (isEditing) { // Editing existing pin
        const updatedItem = { 
            ...pinnedHistory[index], 
            title: title || 'Pinned Item', 
            description: description || pinnedHistory[index].content 
        };
        pinnedHistory = await ipcRenderer.invoke('update-pinned-item', index, updatedItem);
    } else { // Adding new pin
        const content = filteredHistory[index];
        const newItem = { 
            content, 
            title: title || 'Pinned Item', 
            description: description || content, 
            pinned: true,
            timestamp: Date.now()
        };
        pinnedHistory = await ipcRenderer.invoke('pin-item', newItem);
    }

    filterHistory();
    renderPinnedHistory();
    renderHistory();
    closePinModal();
}

async function unpinItem(index) {
    pinnedHistory = await ipcRenderer.invoke('unpin-item', index);
    filterHistory();
    renderPinnedHistory();
    renderHistory();
}


// Utility function to escape HTML
function escapeHtml(text) {
    if (text === null || text === undefined) {
        return '';
    }
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Utility function to truncate text
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}
