/**
 * TabBrain — Settings Page Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
    const apiKeyInput = document.getElementById('apiKey');
    const providerSelect = document.getElementById('provider');
    const aiEnabledCheckbox = document.getElementById('aiEnabled');
    const testBtn = document.getElementById('testBtn');
    const testResult = document.getElementById('testResult');
    const toggleVis = document.getElementById('toggleVis');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const saveStatus = document.getElementById('saveStatus');
    const clearBtn = document.getElementById('clearBtn');

    // Load current settings
    const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    const settings = response?.data || {};

    if (settings.apiKey) apiKeyInput.value = settings.apiKey;
    if (settings.provider) providerSelect.value = settings.provider;
    aiEnabledCheckbox.checked = settings.aiEnabled !== false;

    // Toggle visibility
    toggleVis.addEventListener('click', () => {
        apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
        toggleVis.textContent = apiKeyInput.type === 'password' ? '👁' : '🙈';
    });

    // Test API key
    testBtn.addEventListener('click', async () => {
        testBtn.disabled = true;
        testBtn.textContent = 'Testing...';
        testResult.textContent = '';
        testResult.className = 'test-result';

        const result = await chrome.runtime.sendMessage({
            type: 'TEST_API_KEY',
            apiKey: apiKeyInput.value,
            provider: providerSelect.value
        });

        if (result?.data?.valid) {
            testResult.textContent = '✓ API key is valid!';
            testResult.classList.add('success');
        } else {
            testResult.textContent = `✗ Invalid: ${result?.data?.error || 'Unknown error'}`;
            testResult.classList.add('error');
        }

        testBtn.disabled = false;
        testBtn.textContent = 'Test API Key';
    });

    // Save settings
    saveSettingsBtn.addEventListener('click', async () => {
        await chrome.runtime.sendMessage({
            type: 'SAVE_SETTINGS',
            settings: {
                apiKey: apiKeyInput.value,
                provider: providerSelect.value,
                aiEnabled: aiEnabledCheckbox.checked
            }
        });
        saveStatus.textContent = 'Saved!';
        saveStatus.classList.add('show');
        setTimeout(() => saveStatus.classList.remove('show'), 2000);
    });

    // Clear sessions
    clearBtn.addEventListener('click', async () => {
        if (confirm('Are you sure? This will delete all saved sessions.')) {
            await chrome.storage.local.set({ sessions: [] });
            clearBtn.textContent = 'Cleared!';
            setTimeout(() => { clearBtn.textContent = 'Clear All Saved Sessions'; }, 2000);
        }
    });
});
