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
const autoStart = document.getElementById('autoStart');
const showTrayIcon = document.getElementById('showTrayIcon');
const themeSelect = document.getElementById('theme');

// Initialize settings
document.addEventListener('DOMContentLoaded', async () => {
    // Load current settings
    const settings = await ipcRenderer.invoke('get-settings');
    
    maxHistorySize.value = settings.maxHistorySize || 50;
    pasteMenuTimeout.value = settings.pasteMenuTimeout || 3;
    autoStart.checked = settings.autoStart || false;
    showTrayIcon.checked = settings.showTrayIcon !== false; // Default to true
    themeSelect.value = settings.theme || 'light';
    
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
            autoStart: autoStart.checked,
            showTrayIcon: showTrayIcon.checked,
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
} 