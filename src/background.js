// Background service worker
chrome.runtime.onInstalled.addListener(() => {
    console.log("Codeforces POTD Plus Installed");
    // Initialize storage with default values if not present
    chrome.storage.local.get(['handle', 'rating', 'preferences'], (result) => {
        if (!result.preferences) {
            chrome.storage.local.set({
                preferences: {
                    theme: 'dark'
                }
            });
        }
    });
});
