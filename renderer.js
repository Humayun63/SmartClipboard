// Remove item from history
async function removeItem(index) {
    if (index >= 0 && index < filteredHistory.length) {
        // Find the actual index in clipboardHistory
        const actualIndex = getActualIndex(index);
        if (actualIndex !== -1) {
            clipboardHistory = await ipcRenderer.invoke('remove-item', actualIndex);
            filterHistory();
            lastRenderedHistoryLength = -1;
            renderHistory(true);
        }
    }
}
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
    

    ipcRenderer.on('update-pinned', (event, pinned) => {
        pinnedHistory = pinned;
        filteredPinnedHistory = [...pinned];
        lastRenderedPinnedLength = -1;
        if (currentActiveTab === 'pinned') {
            renderPinnedHistory(true);
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
        } else if (tab === 'shortcuts') {
            // No special rendering needed for shortcuts tab
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
    
    // Get pinned contents for filtering (handle both string and object formats)
    const pinnedContents = pinnedHistory.map(p => typeof p === 'string' ? p : p.content);
    
    if (searchTerm === '') {
        // Filter out pinned items from history (handle both string and object formats)
        filteredHistory = clipboardHistory.filter(item => {
            const content = typeof item === 'string' ? item : item.content;
            return !pinnedContents.includes(content);
        });
        filteredPinnedHistory = [...pinnedHistory]; // Show all pinned items when no search
    } else {
        // Filter history items (handle both string and object formats)
        filteredHistory = clipboardHistory.filter(item => {
            const content = typeof item === 'string' ? item : item.content;
            const type = typeof item === 'string' ? 'text' : (item.type || 'text');
            
            // Don't include pinned items
            if (pinnedContents.includes(content)) return false;
            
            // For text items, search in content
            if (type === 'text') {
                return content.toLowerCase().includes(searchTerm);
            }
            // For image items, search in type
            else if (type === 'image') {
                return 'image'.includes(searchTerm) || 'picture'.includes(searchTerm) || 'photo'.includes(searchTerm);
            }
            
            return false;
        });
        
        // Filter pinned items based on search term
        filteredPinnedHistory = pinnedHistory.filter(item => {
            const content = typeof item === 'string' ? item : item.content;
            const type = typeof item === 'string' ? 'text' : (item.type || 'text');
            const title = typeof item === 'string' ? '' : (item.title || '');
            const description = typeof item === 'string' ? item : (item.description || item.content);
            const mergeTagSlug = typeof item === 'string' ? '' : (item.mergeTagSlug || '');
            
            // For text items, search in content, title, description, and merge tag
            if (type === 'text') {
                return content.toLowerCase().includes(searchTerm) ||
                       title.toLowerCase().includes(searchTerm) ||
                       description.toLowerCase().includes(searchTerm) ||
                       mergeTagSlug.toLowerCase().includes(searchTerm);
            }
            // For image items, search in title, description, merge tag, and type keywords
            else if (type === 'image') {
                return title.toLowerCase().includes(searchTerm) ||
                       description.toLowerCase().includes(searchTerm) ||
                       mergeTagSlug.toLowerCase().includes(searchTerm) ||
                       'image'.includes(searchTerm) || 
                       'picture'.includes(searchTerm) || 
                       'photo'.includes(searchTerm);
            }
            
            return false;
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
        const type = typeof item === 'string' ? 'text' : (item.type || 'text');
        const title = typeof item === 'string' ? 'Pinned Item' : (item.title || 'Pinned Item');
        const description = typeof item === 'string' ? item : (item.description || item.content);
        const mergeTagSlug = typeof item === 'string' ? null : item.mergeTagSlug;
        
        const mergeTagDisplay = mergeTagSlug ? 
            `<div class="merge-tag-badge">🏷️ ${escapeHtml(mergeTagSlug)}</div>` : '';
        
        const pinnedItem = document.createElement('div');
        pinnedItem.className = 'pinned-item';
        pinnedItem.dataset.index = index;
        
        let contentHTML;
        if (type === 'text') {
            contentHTML = `
                <div class="pinned-item-content">
                    <div class="pinned-item-title">${escapeHtml(title)}</div>
                    ${mergeTagDisplay}
                    <div class="pinned-item-description">${escapeHtml(description)}</div>
                </div>
            `;
        } else if (type === 'image') {
            const sizeText = item.size ? `${item.size.width}x${item.size.height}` : 'Unknown size';
            contentHTML = `
                <div class="pinned-item-content image-content">
                    <div class="pinned-item-title">${escapeHtml(title)}</div>
                    ${mergeTagDisplay}
                    <div class="pinned-item-image">
                        <img src="${content}" alt="Pinned image" class="clipboard-image" />
                    </div>
                    <div class="pinned-item-meta">
                        <span class="item-type">📷 Image</span>
                        <span class="item-size">${sizeText}</span>
                    </div>
                    ${item.description ? `<div class="pinned-item-description">${escapeHtml(item.description)}</div>` : ''}
                </div>
            `;
        }
        
        pinnedItem.innerHTML = `
            ${contentHTML}
            <div class="pinned-item-actions">
                <button class="btn-unpin" title="Unpin">📌</button>
                <button class="btn-edit-pin" title="Edit">✏️</button>
                <button class="btn-copy" title="Copy">📋</button>
            </div>
        `;
        
        // Add event listeners
        pinnedItem.addEventListener('click', () => copyPinnedItem(item));

        const btnUnpin = pinnedItem.querySelector('.btn-unpin');
        const btnEdit = pinnedItem.querySelector('.btn-edit-pin');
        const btnCopy = pinnedItem.querySelector('.btn-copy');
        
        // Find the original index in pinnedHistory for unpin and edit operations
        const originalIndex = pinnedHistory.findIndex(originalItem => {
            if (typeof originalItem === 'string' && typeof item === 'string') {
                return originalItem === item;
            }
            if (typeof originalItem === 'object' && typeof item === 'object') {
                return originalItem.id === item.id;
            }
            return false;
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
            copyPinnedItem(item);
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
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.dataset.index = index;
        
        // Handle different item structures (legacy string vs new object)
        let content, type, itemData;
        if (typeof item === 'string') {
            content = item;
            type = 'text';
            itemData = { content, type };
        } else {
            content = item.content;
            type = item.type || 'text';
            itemData = item;
        }
        
        let itemContentHTML;
        if (type === 'text') {
            const preview = content.length > 100 ? content.substring(0, 100) + '...' : content;
            itemContentHTML = `
                <div class="history-item-content">
                    <div class="history-item-text">${escapeHtml(content)}</div>
                    <div class="history-item-preview">${escapeHtml(preview)}</div>
                </div>
            `;
        } else if (type === 'image') {
            const sizeText = itemData.size ? `${itemData.size.width}x${itemData.size.height}` : 'Unknown size';
            itemContentHTML = `
                <div class="history-item-content image-content">
                    <div class="history-item-image">
                        <img src="${content}" alt="Clipboard image" class="clipboard-image" />
                    </div>
                    <div class="history-item-meta">
                        <span class="item-type">📷 Image</span>
                        <span class="item-size">${sizeText}</span>
                    </div>
                </div>
            `;
        }
        
        historyItem.innerHTML = `
            ${itemContentHTML}
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
        const success = await ipcRenderer.invoke('copy-item', getActualIndex(index));
        if (success) {
            await ipcRenderer.invoke('show-notification', 'Copied to clipboard!');
            window.close();
        }
    }
}

// Helper function to get actual index in clipboardHistory from filtered index
function getActualIndex(filteredIndex) {
    const item = filteredHistory[filteredIndex];
    return clipboardHistory.findIndex(historyItem => {
        if (typeof item === 'string' && typeof historyItem === 'string') {
            return item === historyItem;
        }
        if (typeof item === 'object' && typeof historyItem === 'object') {
            return item.id === historyItem.id;
        }
        return false;
    });
}

async function copyContent(content) {
    // This function is kept for backward compatibility but may need updates
    await navigator.clipboard.writeText(content);
    await ipcRenderer.invoke('show-notification', 'Copied to clipboard!');
    window.close();
}

// Copy pinned item (handles both text and images)
async function copyPinnedItem(item) {
    // Find the index of this item in pinnedHistory
    const index = pinnedHistory.findIndex(pinnedItem => {
        if (typeof pinnedItem === 'string' && typeof item === 'string') {
            return pinnedItem === item;
        }
        if (typeof pinnedItem === 'object' && typeof item === 'object') {
            return pinnedItem.id === item.id;
        }
        return false;
    });
    
    if (index !== -1) {
        const success = await ipcRenderer.invoke('copy-pinned-item', index);
        if (success) {
            await ipcRenderer.invoke('show-notification', 'Copied to clipboard!');
            window.close();
        } else {
            await ipcRenderer.invoke('show-notification', 'Error copying item!');
        }
    }
}


// Show paste menu
function showPasteMenu(history) {
    pasteMenuList.innerHTML = history.map((item, index) => {
        // Handle different item structures (legacy string vs new object)
        let content, type, itemData;
        if (typeof item === 'string') {
            content = item;
            type = 'text';
            itemData = { content, type };
        } else {
            content = item.content;
            type = item.type || 'text';
            itemData = item;
        }
        
        let itemContentHTML;
        if (type === 'text') {
            const preview = content.length > 100 ? content.substring(0, 100) + '...' : content;
            itemContentHTML = `
                <div class="paste-menu-item-content">
                    <div class="paste-menu-item-text">${escapeHtml(content)}</div>
                    <div class="paste-menu-item-preview">${escapeHtml(preview)}</div>
                </div>
            `;
        } else if (type === 'image') {
            const sizeText = itemData.size ? `${itemData.size.width}x${itemData.size.height}` : 'Unknown size';
            itemContentHTML = `
                <div class="paste-menu-item-content image-content">
                    <div class="paste-menu-item-image">
                        <img src="${content}" alt="Clipboard image" class="clipboard-image-small" />
                    </div>
                    <div class="paste-menu-item-meta">
                        <span class="item-type">📷 Image</span>
                        <span class="item-size">${sizeText}</span>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="paste-menu-item" data-index="${index}">
                <div class="paste-menu-item-number">${index + 1}</div>
                ${itemContentHTML}
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
    
    // Get references to preview elements
    const pinContentPreview = document.getElementById('pinContentPreview');
    const pinPreviewImage = document.getElementById('pinPreviewImage');
    const pinPreviewText = document.getElementById('pinPreviewText');
    const pinPreviewImg = document.getElementById('pinPreviewImg');
    const pinItemType = document.getElementById('pinItemType');
    const pinContentGroup = document.getElementById('pinContentGroup');
    
    if (item) { // Editing a pinned item
        pinModalTitle.textContent = 'Edit Pinned Item';
        pinItemIndex.value = index;
        pinTitle.value = item.title || '';
        pinMergeTag.value = item.mergeTagSlug || '';
        pinDescription.value = item.description || '';
        
        const content = typeof item === 'string' ? item : item.content;
        const type = typeof item === 'string' ? 'text' : (item.type || 'text');
        
        pinItemType.value = type;
        
        // Show preview only for images
        if (type === 'image') {
            pinContentPreview.style.display = 'block';
            pinPreviewImage.style.display = 'block';
            pinPreviewText.style.display = 'none';
            pinPreviewImg.src = content;
            pinContentGroup.style.display = 'none';
            pinContent.value = content; // Still store the base64 data
        } else {
            // For text, hide preview and show content textarea
            pinContentPreview.style.display = 'none';
            pinPreviewImage.style.display = 'none';
            pinPreviewText.style.display = 'none';
            pinContentGroup.style.display = 'block';
            pinContent.value = content;
        }
        
        // Add a flag to indicate we're editing
        pinForm.dataset.editing = 'true';
    } else { // Pinning a new item from history
        pinModalTitle.textContent = 'Pin Item';
        pinItemIndex.value = index;
        
        const historyItem = filteredHistory[index];
        const content = typeof historyItem === 'string' ? historyItem : historyItem.content;
        const type = typeof historyItem === 'string' ? 'text' : (historyItem.type || 'text');
        
        pinItemType.value = type;
        
        // Show preview only for images
        if (type === 'image') {
            pinContentPreview.style.display = 'block';
            pinPreviewImage.style.display = 'block';
            pinPreviewText.style.display = 'none';
            pinPreviewImg.src = content;
            pinContentGroup.style.display = 'none';
            pinContent.value = content; // Store the base64 data
        } else {
            // For text, hide preview and show content textarea
            pinContentPreview.style.display = 'none';
            pinPreviewImage.style.display = 'none';
            pinPreviewText.style.display = 'none';
            pinContentGroup.style.display = 'block';
            pinContent.value = content;
        }
        
        // Keep description empty by default for new pins
        pinDescription.value = '';
        
        // Remove the editing flag
        delete pinForm.dataset.editing;
    }
    
    pinModalOverlay.classList.add('visible');
    
    // Focus on the appropriate field after a short delay
    setTimeout(() => {
        if (item) {
            pinTitle.focus();
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
    const type = document.getElementById('pinItemType').value;
    const mergeTagSlug = pinMergeTag.value.trim().toLowerCase();
    const description = pinDescription.value.trim();
    const isEditing = pinForm.dataset.editing === 'true';

    // Validate that content is not empty
    if (!content) {
        alert('Content cannot be empty');
        return;
    }

    // Merge tags are supported for both text and images

    try {
        if (isEditing) { // Editing existing pin
            const originalItem = pinnedHistory[index];
            const updatedItem = { 
                ...originalItem,
                title: title || 'Pinned Item', 
                content: content,
                type: type,
                mergeTagSlug: mergeTagSlug || null,
                description: description || '',
                timestamp: originalItem.timestamp || Date.now(),
                id: originalItem.id || Date.now() + Math.random(),
                size: originalItem.size || null
            };
            const result = await ipcRenderer.invoke('update-pinned-item', index, updatedItem);
            pinnedHistory = result.pinnedHistory;
            mergeTags = result.mergeTags;
        } else { // Adding new pin
            const historyItem = filteredHistory[index];
            const itemToPin = typeof historyItem === 'string' 
                ? { content: historyItem, type: 'text' }
                : historyItem;
                
            const result = await ipcRenderer.invoke('pin-item-with-merge-tag', {
                item: itemToPin,
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
                    `${type === 'image' ? 'Image' : 'Item'} pinned with merge tag "${mergeTagSlug}"` : 
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
