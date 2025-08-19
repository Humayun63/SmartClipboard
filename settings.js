const { ipcRenderer } = require('electron');

// DOM elements
const btnClose = document.getElementById('btnClose');
const btnSave = document.getElementById('btnSave');
const btnCancel = document.getElementById('btnCancel');
const btnClearData = document.getElementById('btnClearData');
const btnQuit = document.getElementById('btnQuit');

// Settings inputs
const maxHistorySize = document.getElementById('maxHistorySize');
const pasteMenuTimeout = document.getElementById('pasteMenuTimeout');
const themeSelect = document.getElementById('theme');

// Shortcut management
let currentShortcuts = {};

// Initialize settings
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('Initializing settings...');
        
        // Load current settings
        const settings = await ipcRenderer.invoke('get-settings');
        console.log('Loaded settings:', settings);
        
        maxHistorySize.value = settings.maxHistorySize || 50;
        pasteMenuTimeout.value = settings.pasteMenuTimeout || 3;
        themeSelect.value = settings.theme || 'light';
        
        // Load current shortcuts
        currentShortcuts = await ipcRenderer.invoke('get-shortcuts');
        console.log('Loaded shortcuts:', currentShortcuts);
        loadShortcuts();
        
        // Apply current theme to settings window
        applyThemeToSettings(themeSelect.value);
        
        setupEventListeners();
        setupShortcutEventListeners();
        
        console.log('Settings initialization complete');
    } catch (error) {
        console.error('Error initializing settings:', error);
    }
});

// Set up event listeners
function setupEventListeners() {
    // Close button
    btnClose.addEventListener('click', () => {
        window.close();
    });
    
    // Save button
    btnSave.addEventListener('click', async () => {
        const settings = {
            maxHistorySize: parseInt(maxHistorySize.value),
            pasteMenuTimeout: parseInt(pasteMenuTimeout.value),
            theme: themeSelect.value
        };
        
        await ipcRenderer.invoke('save-settings', settings);
        window.close();
    });
    
    // Cancel button
    btnCancel.addEventListener('click', () => {
        window.close();
    });
    
    // Clear data button
    btnClearData.addEventListener('click', async () => {
        if (confirm('Are you sure you want to clear ALL clipboard history and pinned items? This action cannot be undone.')) {
            await ipcRenderer.invoke('clear-all-data');
            alert('All clipboard history and pinned items have been cleared.');
            window.location.reload();
        }
    });
    
    // Quit button
    btnQuit.addEventListener('click', async () => {
        if (confirm('Are you sure you want to quit Smart Clipboard?')) {
            await ipcRenderer.invoke('quit-app');
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            window.close();
        }
    });
    
    // Handle social links
    setupSocialLinks();
    
    // Theme preview functionality
    themeSelect.addEventListener('change', (e) => {
        applyThemeToSettings(e.target.value);
    });
}

// Setup social links functionality
function setupSocialLinks() {
    // Email copy functionality
    const emailLink = document.querySelector('a[href^="mailto:"]');
    if (emailLink) {
        emailLink.addEventListener('click', (e) => {
            const email = emailLink.href.replace('mailto:', '');
            navigator.clipboard.writeText(email).then(() => {
                showNotification('Email copied to clipboard!');
            });
        });
    }
    
    // External link handling
    const externalLinks = document.querySelectorAll('a[href^="http"]');
    externalLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            ipcRenderer.invoke('open-external-link', link.href);
        });
    });
}

// Apply theme to settings window
function applyThemeToSettings(theme) {
    document.documentElement.setAttribute('data-theme', theme);
}

// Show notification
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #667eea;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 1000;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
} 

// Tab functionality
document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = document.getElementById(tab.dataset.tab);

            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            tabContents.forEach(c => c.classList.remove('active'));
            target.classList.add('active');
        });
    });
});

// Shortcut management functions
function loadShortcuts() {
    console.log('Loading shortcuts into UI...');
    const shortcutInputs = document.querySelectorAll('.shortcut-input');
    console.log(`Found ${shortcutInputs.length} shortcut inputs`);
    
    shortcutInputs.forEach(input => {
        const shortcutKey = input.id;
        if (currentShortcuts[shortcutKey]) {
            input.value = currentShortcuts[shortcutKey];
            console.log(`Set ${shortcutKey} = ${currentShortcuts[shortcutKey]}`);
        } else {
            // Set placeholder as default if no value exists
            input.value = input.placeholder;
            console.log(`Set ${shortcutKey} to placeholder: ${input.placeholder}`);
        }
    });
    console.log('Shortcut loading complete');
}

function setupShortcutEventListeners() {
    const btnResetShortcuts = document.getElementById('btnResetShortcuts');
    const btnSaveShortcuts = document.getElementById('btnSaveShortcuts');
    
    if (btnResetShortcuts) {
        btnResetShortcuts.addEventListener('click', async () => {
            if (confirm('Are you sure you want to reset all shortcuts to their default values?')) {
                try {
                    const result = await ipcRenderer.invoke('reset-shortcuts');
                    if (result.success) {
                        currentShortcuts = result.shortcuts;
                        loadShortcuts();
                        showNotification('Shortcuts reset to defaults successfully!');
                    } else {
                        showNotification('Error resetting shortcuts: ' + result.error);
                    }
                } catch (error) {
                    showNotification('Error resetting shortcuts: ' + error.message);
                }
            }
        });
    }
    
    if (btnSaveShortcuts) {
        btnSaveShortcuts.addEventListener('click', async () => {
            await saveShortcuts();
        });
    }
    
    // Set up shortcut input validation and formatting
    const shortcutInputs = document.querySelectorAll('.shortcut-input');
    shortcutInputs.forEach(input => {
        input.addEventListener('keydown', handleShortcutCapture);
        input.addEventListener('blur', validateShortcutInput);
    });
}

function handleShortcutCapture(event) {
    event.preventDefault();
    
    const modifiers = [];
    const specialKeys = [];
    
    // Capture modifier keys with proper macOS distinction
    if (event.metaKey) {
        modifiers.push('Command');
    }
    if (event.ctrlKey) {
        modifiers.push('Control');
    }
    if (event.altKey) {
        modifiers.push('Alt');
    }
    if (event.shiftKey) {
        modifiers.push('Shift');
    }
    
    // Capture main key
    let mainKey = '';
    if (event.key.length === 1 && event.key.match(/[a-zA-Z0-9]/)) {
        mainKey = event.key.toUpperCase();
    } else {
        // Handle special keys
        switch (event.key) {
            case 'Escape':
                mainKey = 'Escape';
                break;
            case 'Enter':
                mainKey = 'Return';
                break;
            case 'Space':
                mainKey = 'Space';
                break;
            case 'ArrowUp':
                mainKey = 'Up';
                break;
            case 'ArrowDown':
                mainKey = 'Down';
                break;
            case 'ArrowLeft':
                mainKey = 'Left';
                break;
            case 'ArrowRight':
                mainKey = 'Right';
                break;
            case 'Tab':
                mainKey = 'Tab';
                break;
            case 'Delete':
                mainKey = 'Delete';
                break;
            case 'Backspace':
                mainKey = 'Backspace';
                break;
            default:
                if (event.key.startsWith('F') && event.key.length <= 3) {
                    mainKey = event.key;
                }
                break;
        }
    }
    
    // Allow shortcuts without modifiers for F-keys and some special combinations
    const allowedWithoutModifiers = mainKey.startsWith('F') || mainKey === 'Escape';
    
    // Build shortcut string
    let shortcut = '';
    if (modifiers.length > 0) {
        shortcut = modifiers.join('+');
        if (mainKey) {
            shortcut += '+' + mainKey;
        }
    } else if (mainKey && allowedWithoutModifiers) {
        shortcut = mainKey;
    }
    
    if (shortcut) {
        event.target.value = shortcut;
        event.target.classList.remove('error');
        console.log('Captured shortcut:', shortcut);
    }
}

function validateShortcutInput(event) {
    const input = event.target;
    const shortcut = input.value.trim();
    
    if (!shortcut) {
        input.classList.remove('error');
        return;
    }
    
    // More flexible validation - allow F-keys, simple letters with any modifier, or special keys
    const hasModifiers = /Command|Control|Alt|Shift/.test(shortcut);
    const isFunctionKey = shortcut.startsWith('F');
    const isSpecialKey = /Escape|Return|Space|Tab|Delete|Backspace|Up|Down|Left|Right/.test(shortcut);
    const hasValidPattern = hasModifiers || isFunctionKey || isSpecialKey;
    
    if (!hasValidPattern && shortcut.length === 1) {
        // Allow single letters, numbers if that's what user wants
        input.classList.remove('error');
        return;
    }
    
    if (!hasValidPattern) {
        input.classList.add('error');
        showNotification('Invalid shortcut: Use modifier keys (Command, Control, Alt, Shift) or function keys');
        return;
    }
    
    // Check for duplicates
    const allInputs = document.querySelectorAll('.shortcut-input');
    let hasDuplicate = false;
    
    allInputs.forEach(otherInput => {
        if (otherInput !== input && otherInput.value.trim() === shortcut) {
            hasDuplicate = true;
        }
    });
    
    if (hasDuplicate) {
        input.classList.add('error');
        showNotification('Duplicate shortcut: This combination is already used');
    } else {
        input.classList.remove('error');
    }
}

async function saveShortcuts() {
    try {
        console.log('Saving shortcuts...');
        const shortcutInputs = document.querySelectorAll('.shortcut-input');
        const newShortcuts = {};
        
        // Check for errors first
        const hasErrors = Array.from(shortcutInputs).some(input => 
            input.classList.contains('error'));
        
        if (hasErrors) {
            const errorMessage = 'Please fix shortcut errors before saving';
            console.error(errorMessage);
            showNotification(errorMessage);
            return;
        }
        
        // Collect all shortcuts
        shortcutInputs.forEach(input => {
            const shortcutKey = input.id;
            const shortcutValue = input.value.trim();
            if (shortcutValue) {
                newShortcuts[shortcutKey] = shortcutValue;
                console.log(`Collected ${shortcutKey} = ${shortcutValue}`);
            }
        });
        
        console.log('Sending shortcuts to main process:', newShortcuts);
        const result = await ipcRenderer.invoke('save-shortcuts', newShortcuts);
        console.log('Save result:', result);
        
        if (result.success) {
            currentShortcuts = newShortcuts;
            const successMessage = 'Shortcuts saved successfully!';
            console.log(successMessage);
            showNotification(successMessage);
        } else {
            const errorMessage = 'Error saving shortcuts: ' + result.error;
            console.error(errorMessage);
            showNotification(errorMessage);
        }
    } catch (error) {
        const errorMessage = 'Error saving shortcuts: ' + error.message;
        console.error(errorMessage);
        showNotification(errorMessage);
    }
} 