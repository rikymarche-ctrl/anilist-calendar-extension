/**
 * Anilist Weekly Schedule - Popup
 * Handles interactions in the extension popup
 */

// Initialize event listeners once the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Go to Anilist
  document.getElementById('goto-anilist').addEventListener('click', function() {
    chrome.tabs.create({ url: 'https://anilist.co' });
  });

  // Open options page
  document.getElementById('open-options').addEventListener('click', function() {
    chrome.runtime.openOptionsPage();
  });
});