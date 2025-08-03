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

// Initialize settings
document.addEventListener('DOMContentLoaded', async () => {
    // Load current settings
    const settings = await ipcRenderer.invoke('get-settings');
    
    maxHistorySize.value = settings.maxHistorySize || 50;
    pasteMenuTimeout.value = settings.pasteMenuTimeout || 3;
    themeSelect.value = settings.theme || 'light';
    
    // Apply current theme to settings window
    applyThemeToSettings(themeSelect.value);
    
    setupEventListeners();
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
        if (confirm('Are you sure you want to clear all clipboard history and settings? This action cannot be undone.')) {
            await ipcRenderer.invoke('clear-all-data');
            alert('All data has been cleared.');
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