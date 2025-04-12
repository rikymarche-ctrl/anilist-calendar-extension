/**
 * Anilist Weekly Schedule - Popup Script
 * Handles navigation and button interactions in the popup
 */

// Handle navigation to AniList
document.getElementById('goToAnilist').addEventListener('click', function() {
  chrome.tabs.create({ url: 'https://anilist.co/' });
});

// Listen for keydown events to handle keyboard navigation
document.addEventListener('keydown', function(e) {
  // Allow Enter key to activate focused elements
  if (e.key === 'Enter') {
    if (document.activeElement.tagName === 'BUTTON') {
      document.activeElement.click();
    }
  }
});