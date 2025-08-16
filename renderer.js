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
const pinModalTitle = document.getElementById('pinModalTitle');
const pinForm = document.getElementById('pinForm');
const pinItemIndex = document.getElementById('pinItemIndex');
const pinTitle = document.getElementById('pinTitle');
const pinContent = document.getElementById('pinContent');
const pinMergeTag = document.getElementById('pinMergeTag');
const pinDescription = document.getElementById('pinDescription');


// State
let clipboardHistory = [];
let pinnedHistory = [];
let filteredPinnedHistory = []; // Add this new state variable
let mergeTags = {};
let filteredHistory = [];
let selectedIndex = -1;

// Cache state for performance optimization
let lastRenderedHistoryLength = -1;
let lastRenderedPinnedLength = -1;
let lastSearchTerm = '';
let currentActiveTab = 'history';

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Apply Saved Theme
    await applyTheme();

    // Load initial clipboard history
    const { clipboardHistory: initialClipboardHistory, pinnedHistory: initialPinnedHistory, mergeTags: initialMergeTags } = await ipcRenderer.invoke('get-clipboard-history');
    clipboardHistory = initialClipboardHistory;
    pinnedHistory = initialPinnedHistory;
    mergeTags = initialMergeTags || {};
    
    filterHistory(); // This will now also initialize filteredPinnedHistory
    // Force initial render for both tabs to populate cache
    lastRenderedHistoryLength = -1;
    lastRenderedPinnedLength = -1;
    
    // Only render the active tab initially with force flag
    if (currentActiveTab === 'history') {
        renderHistory(true);
    } else {
        renderPinnedHistory(true);
    }
    
    // Set up event listeners
    setupEventListeners();
    
    // Listen for updates from main process
    ipcRenderer.on('update-history', (event, history) => {
        clipboardHistory = history;
        filterHistory(); // This will update both filtered arrays
        
        // Invalidate cache to ensure re-render when needed
        lastRenderedHistoryLength = -1;
        
        // Always render if we're on the history tab
        if (currentActiveTab === 'history') {
            renderHistory(true);
        }
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
        // Force render for both tabs since search affects both
        lastRenderedHistoryLength = -1;
        lastRenderedPinnedLength = -1;
        
        if (currentActiveTab === 'history') {
            renderHistory(true);
        } else if (currentActiveTab === 'pinned') {
            renderPinnedHistory(true);
        }
    });
    
    // Clear history button
    btnClear.addEventListener('click', async () => {
        clipboardHistory = await ipcRenderer.invoke('clear-history');
        filterHistory();
        if (currentActiveTab === 'history') {
            renderHistory(true); // Force render after clear
        }
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

    // Pin modal event handlers
    pinModalClose.addEventListener('click', closePinModal);
    pinModalCancel.addEventListener('click', closePinModal);
    pinForm.addEventListener('submit', handlePinFormSubmit);
    
    // Merge tag input validation
    pinMergeTag.addEventListener('input', (e) => {
        let value = e.target.value;
        // Convert to lowercase and remove invalid characters
        value = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
        e.target.value = value;
    });

    // Click outside pin modal to close
    pinModalOverlay.addEventListener('click', (e) => {
        if (e.target === pinModalOverlay) {
            closePinModal();
        }
    });    // Tab navigation
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.dataset.tab;
            switchTab(tab);
        });
    });
}

function switchTab(tab) {
    // Update the current active tab
    currentActiveTab = tab;
    
    // Immediately update the visual state for smooth UI
    tabButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.tab === tab);
    });
    tabPanes.forEach(pane => {
        pane.classList.toggle('active', pane.id === `${tab}Tab`);
    });
    
    // Use requestAnimationFrame to defer heavy rendering operations
    requestAnimationFrame(() => {
        // Force render the content for the active tab to ensure it's up to date
        if (tab === 'history') {
            renderHistory(true); // Force render
        } else if (tab === 'pinned') {
            renderPinnedHistory(true); // Force render
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
    const pinnedContents = pinnedHistory.map(p => p.content);
    
    if (searchTerm === '') {
        filteredHistory = clipboardHistory.filter(item => !pinnedContents.includes(item));
        filteredPinnedHistory = [...pinnedHistory]; // Show all pinned items when no search
    } else {
        filteredHistory = clipboardHistory.filter(item => 
            !pinnedContents.includes(item) && item.toLowerCase().includes(searchTerm)
        );
        
        // Filter pinned items based on search term
        filteredPinnedHistory = pinnedHistory.filter(item => {
            const content = typeof item === 'string' ? item : item.content;
            const title = typeof item === 'string' ? '' : (item.title || '');
            const description = typeof item === 'string' ? item : (item.description || item.content);
            const mergeTagSlug = typeof item === 'string' ? '' : (item.mergeTagSlug || '');
            
            // Search in content, title, description, and merge tag
            return content.toLowerCase().includes(searchTerm) ||
                   title.toLowerCase().includes(searchTerm) ||
                   description.toLowerCase().includes(searchTerm) ||
                   mergeTagSlug.toLowerCase().includes(searchTerm);
        });
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
function renderPinnedHistory(forceRender = false) {
    // Check if content has changed - now use filteredPinnedHistory instead of pinnedHistory
    const contentChanged = lastRenderedPinnedLength !== filteredPinnedHistory.length;
    
    // Only render if we're on the pinned tab AND (content changed OR forced render)
    if (!forceRender && currentActiveTab !== 'pinned') {
        return; // Skip render if we're not on this tab and not forced
    }
    
    // If content hasn't changed and we're not forcing, skip render
    if (!forceRender && !contentChanged && lastRenderedPinnedLength !== -1) {
        return;
    }
    
    lastRenderedPinnedLength = filteredPinnedHistory.length;
    
    if (filteredPinnedHistory.length === 0) {
        pinnedList.style.display = 'none';
        emptyStatePinned.style.display = 'flex';
        return;
    }

    pinnedList.style.display = 'block';
    emptyStatePinned.style.display = 'none';
    
    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    
    filteredPinnedHistory.forEach((item, index) => {
        // Handle both string and object formats
        const content = typeof item === 'string' ? item : item.content;
        const title = typeof item === 'string' ? 'Pinned Item' : (item.title || 'Pinned Item');
        const description = typeof item === 'string' ? item : (item.description || item.content);
        const mergeTagSlug = typeof item === 'string' ? null : item.mergeTagSlug;
        
        const mergeTagDisplay = mergeTagSlug ? 
            `<div class="merge-tag-badge">🏷️ ${escapeHtml(mergeTagSlug)}</div>` : '';
        
        const pinnedItem = document.createElement('div');
        pinnedItem.className = 'pinned-item';
        pinnedItem.dataset.index = index;
        
        pinnedItem.innerHTML = `
            <div class="pinned-item-content">
                <div class="pinned-item-title">${escapeHtml(title)}</div>
                ${mergeTagDisplay}
                <div class="pinned-item-description">${escapeHtml(description)}</div>
            </div>
            <div class="pinned-item-actions">
                <button class="btn-unpin" title="Unpin">📌</button>
                <button class="btn-edit-pin" title="Edit">✏️</button>
                <button class="btn-copy" title="Copy">📋</button>
            </div>
        `;
        
        // Add event listeners
        pinnedItem.addEventListener('click', () => copyContent(content));

        const btnUnpin = pinnedItem.querySelector('.btn-unpin');
        const btnEdit = pinnedItem.querySelector('.btn-edit-pin');
        const btnCopy = pinnedItem.querySelector('.btn-copy');
        
        // Find the original index in pinnedHistory for unpin and edit operations
        const originalIndex = pinnedHistory.findIndex(originalItem => {
            const originalContent = typeof originalItem === 'string' ? originalItem : originalItem.content;
            return originalContent === content;
        });
        
        btnUnpin.addEventListener('click', (e) => {
            e.stopPropagation();
            unpinItem(originalIndex);
        });

        btnEdit.addEventListener('click', (e) => {
            e.stopPropagation();
            openPinModal(originalIndex, item);
        });

        btnCopy.addEventListener('click', (e) => {
            e.stopPropagation();
            copyContent(content);
        });
        
        fragment.appendChild(pinnedItem);
    });
    
    // Replace content in one operation
    pinnedList.innerHTML = '';
    pinnedList.appendChild(fragment);
}


// Render history list
function renderHistory(forceRender = false) {
    // Check if content has changed
    const currentSearchTerm = searchInput.value.toLowerCase();
    const contentChanged = lastRenderedHistoryLength !== filteredHistory.length || 
                          lastSearchTerm !== currentSearchTerm;
    
    // Only render if we're on the history tab AND (content changed OR forced render)
    if (!forceRender && currentActiveTab !== 'history') {
        return; // Skip render if we're not on this tab and not forced
    }
    
    // If content hasn't changed and we're not forcing, skip render
    if (!forceRender && !contentChanged && lastRenderedHistoryLength !== -1) {
        return;
    }
    
    lastRenderedHistoryLength = filteredHistory.length;
    lastSearchTerm = currentSearchTerm;
    
    if (filteredHistory.length === 0) {
        historyList.style.display = 'none';
        emptyStateHistory.style.display = 'flex';
        return;
    }
    
    historyList.style.display = 'block';
    emptyStateHistory.style.display = 'none';
    
    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    
    filteredHistory.forEach((item, index) => {
        const preview = item.length > 100 ? item.substring(0, 100) + '...' : item;
        
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.dataset.index = index;
        
        historyItem.innerHTML = `
            <div class="history-item-content">
                <div class="history-item-text">${escapeHtml(item)}</div>
                <div class="history-item-preview">${escapeHtml(preview)}</div>
            </div>
            <div class="history-item-actions">
                <button class="btn-pin" title="Pin">📌</button>
                <button class="btn-copy" title="Copy">📋</button>
                <button class="btn-remove" title="Remove">❌</button>
            </div>
        `;
        
        // Add event listeners
        historyItem.addEventListener('click', () => copyItem(index));
        
        const btnPin = historyItem.querySelector('.btn-pin');
        const btnCopy = historyItem.querySelector('.btn-copy');
        const btnRemove = historyItem.querySelector('.btn-remove');
        
        btnPin.addEventListener('click', (e) => {
            e.stopPropagation();
            openPinModal(index);
        });
        
        btnCopy.addEventListener('click', (e) => {
            e.stopPropagation();
            copyItem(index);
        });
        
        btnRemove.addEventListener('click', (e) => {
            e.stopPropagation();
            removeItem(index);
        });
        
        fragment.appendChild(historyItem);
    });
    
    // Replace content in one operation
    historyList.innerHTML = '';
    historyList.appendChild(fragment);
}// Copy item from main window
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
        pinModalTitle.textContent = 'Edit Pinned Item';
        pinItemIndex.value = index;
        pinTitle.value = item.title || '';
        pinContent.value = item.content || '';
        pinMergeTag.value = item.mergeTagSlug || '';
        pinDescription.value = item.description || '';
        // Add a flag to indicate we're editing
        pinForm.dataset.editing = 'true';
    } else { // Pinning a new item from history
        pinModalTitle.textContent = 'Pin Item';
        pinItemIndex.value = index;
        // Pre-fill with the content
        const content = filteredHistory[index];
        pinContent.value = content || '';
        // Keep description empty by default
        pinDescription.value = '';
        // Remove the editing flag
        delete pinForm.dataset.editing;
    }
    pinModalOverlay.classList.add('visible');
    
    // Focus on the content field after a short delay to ensure modal is visible
    setTimeout(() => {
        if (item) {
            pinContent.focus();
        } else {
            pinTitle.focus();
        }
    }, 100);
}

function closePinModal() {
    pinModalOverlay.classList.remove('visible');
}

async function handlePinFormSubmit(e) {
    e.preventDefault();
    const index = parseInt(pinItemIndex.value);
    const title = pinTitle.value.trim();
    const content = pinContent.value.trim();
    const mergeTagSlug = pinMergeTag.value.trim().toLowerCase();
    const description = pinDescription.value.trim();
    const isEditing = pinForm.dataset.editing === 'true';

    // Validate that content is not empty
    if (!content) {
        alert('Content cannot be empty');
        return;
    }

    try {
        if (isEditing) { // Editing existing pin
            const updatedItem = { 
                ...pinnedHistory[index], 
                title: title || 'Pinned Item', 
                content: content,
                mergeTagSlug: mergeTagSlug || null,
                description: description || ''
            };
            const result = await ipcRenderer.invoke('update-pinned-item', index, updatedItem);
            pinnedHistory = result.pinnedHistory;
            mergeTags = result.mergeTags;
        } else { // Adding new pin
            const result = await ipcRenderer.invoke('pin-item-with-merge-tag', {
                item: content,
                title: title || 'Pinned Item',
                mergeTagSlug: mergeTagSlug || null,
                description: description
            });
            pinnedHistory = result.pinnedHistory;
            mergeTags = result.mergeTags;
        }

        filterHistory();
        // Update the cache flags to force re-render when needed
        lastRenderedPinnedLength = -1;
        lastRenderedHistoryLength = -1;
        
        // Only render the active tab, but ensure both will re-render when switched to
        if (currentActiveTab === 'pinned') {
            renderPinnedHistory(true);
        } else {
            renderHistory(true);
        }
        closePinModal();
        
        // Show success notification
        await ipcRenderer.invoke('show-notification', 
            isEditing ? 
                'Pinned item updated successfully' :
                (mergeTagSlug ? 
                    `Item pinned with merge tag "${mergeTagSlug}"` : 
                    'Item pinned successfully')
        );
        
    } catch (error) {
        console.error('Error saving pinned item:', error);
        await ipcRenderer.invoke('show-notification', `Error: ${error.message}`);
    }
}

async function unpinItem(index) {
    const result = await ipcRenderer.invoke('unpin-item', index);
    pinnedHistory = result.pinnedHistory;
    mergeTags = result.mergeTags;
    filterHistory();
    
    // Update the cache flags to force re-render when needed
    lastRenderedPinnedLength = -1;
    lastRenderedHistoryLength = -1;
    
    // Only render the active tab, but ensure both will re-render when switched to
    if (currentActiveTab === 'pinned') {
        renderPinnedHistory(true);
    } else {
        renderHistory(true);
    }
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
