/**
 * Anilist Weekly Schedule - Options Page
 * Handles saving and loading user preferences
 */

// Constants
const STORAGE_KEY_PREFIX = 'anilist_calendar_';
const DEFAULT_SETTINGS = {
  startDay: 'today',
  hideEmptyDays: false,
  compactMode: false
};

// DOM Elements
const startDaySelect = document.getElementById('start-day');
const hideEmptyDaysCheckbox = document.getElementById('hide-empty-days');
const compactModeCheckbox = document.getElementById('compact-mode');
const themeToggleButton = document.getElementById('theme-toggle');

// Load settings when the page opens
document.addEventListener('DOMContentLoaded', loadSettings);

// Set up event listeners for all settings
startDaySelect.addEventListener('change', saveSettings);
hideEmptyDaysCheckbox.addEventListener('change', saveSettings);
compactModeCheckbox.addEventListener('change', saveSettings);
themeToggleButton.addEventListener('click', toggleTheme);

/**
 * Loads user settings from storage
 */
function loadSettings() {
  chrome.storage.sync.get(null, function(items) {
    // Set the theme based on user preference or system preference
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const currentTheme = items[`${STORAGE_KEY_PREFIX}theme`] || (prefersDarkMode ? 'dark' : 'light');
    setTheme(currentTheme);

    // Start day setting
    const startDay = items[`${STORAGE_KEY_PREFIX}start_day`] || DEFAULT_SETTINGS.startDay;
    startDaySelect.value = startDay;

    // Hide empty days setting
    const hideEmptyDays = items[`${STORAGE_KEY_PREFIX}hide_empty_days`] !== undefined
        ? items[`${STORAGE_KEY_PREFIX}hide_empty_days`]
        : DEFAULT_SETTINGS.hideEmptyDays;
    hideEmptyDaysCheckbox.checked = hideEmptyDays;

    // Compact mode setting
    const compactMode = items[`${STORAGE_KEY_PREFIX}compact_mode`] !== undefined
        ? items[`${STORAGE_KEY_PREFIX}compact_mode`]
        : DEFAULT_SETTINGS.compactMode;
    compactModeCheckbox.checked = compactMode;
  });
}

/**
 * Saves settings to storage
 */
function saveSettings() {
  const settings = {
    [`${STORAGE_KEY_PREFIX}start_day`]: startDaySelect.value,
    [`${STORAGE_KEY_PREFIX}hide_empty_days`]: hideEmptyDaysCheckbox.checked,
    [`${STORAGE_KEY_PREFIX}compact_mode`]: compactModeCheckbox.checked
  };

  chrome.storage.sync.set(settings, function() {
    // Show a brief "Saved" indicator
    const saveNotice = document.querySelector('.save-notice');
    if (saveNotice) {
      const originalText = saveNotice.textContent;
      saveNotice.textContent = 'Settings saved!';
      saveNotice.style.color = '#3db4f2';

      setTimeout(() => {
        saveNotice.textContent = originalText;
        saveNotice.style.color = '';
      }, 2000);
    }
  });
}

/**
 * Toggles between light and dark theme
 */
function toggleTheme() {
  const isDarkTheme = document.body.classList.contains('dark-theme');
  const newTheme = isDarkTheme ? 'light' : 'dark';

  setTheme(newTheme);

  // Save theme preference
  chrome.storage.sync.set({
    [`${STORAGE_KEY_PREFIX}theme`]: newTheme
  });
}

/**
 * Sets the theme
 */
function setTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark-theme');
    themeToggleButton.innerHTML = '<i class="fa fa-sun"></i> Light Mode';
  } else {
    document.body.classList.remove('dark-theme');
    themeToggleButton.innerHTML = '<i class="fa fa-moon"></i> Dark Mode';
  }
}