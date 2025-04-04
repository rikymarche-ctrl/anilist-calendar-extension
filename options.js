/**
 * Anilist Weekly Schedule - Options Page
 * Handles saving and loading user preferences
 */

// Constants
const STORAGE_KEY_PREFIX = 'anilist_calendar_';
const DEFAULT_SETTINGS = {
  startDay: 'today',
  hideEmptyDays: false,
  compactMode: false,
  gridMode: false,
  timezone: 'jst'  // Default timezone is Japan Standard Time
};

// Common timezone options with UTC offsets
const TIMEZONE_OPTIONS = [
  { value: 'jst', text: 'Japan Standard Time (UTC+9)', offset: 9 },
  { value: 'pst', text: 'Pacific Standard Time (UTC-8)', offset: -8 },
  { value: 'pdt', text: 'Pacific Daylight Time (UTC-7)', offset: -7 },
  { value: 'est', text: 'Eastern Standard Time (UTC-5)', offset: -5 },
  { value: 'edt', text: 'Eastern Daylight Time (UTC-4)', offset: -4 },
  { value: 'bst', text: 'British Summer Time (UTC+1)', offset: 1 },
  { value: 'cet', text: 'Central European Time (UTC+1)', offset: 1 },
  { value: 'cest', text: 'Central European Summer Time (UTC+2)', offset: 2 },
  { value: 'ist', text: 'Indian Standard Time (UTC+5:30)', offset: 5.5 },
  { value: 'aest', text: 'Australian Eastern Standard Time (UTC+10)', offset: 10 },
  { value: 'nzst', text: 'New Zealand Standard Time (UTC+12)', offset: 12 },
  { value: 'auto', text: 'Auto-detect from browser', offset: null }
];

// DOM Elements
const startDaySelect = document.getElementById('start-day');
const hideEmptyDaysCheckbox = document.getElementById('hide-empty-days');
const compactModeCheckbox = document.getElementById('compact-mode');
const gridModeCheckbox = document.getElementById('grid-mode');
const timezoneSelect = document.getElementById('timezone');
const themeToggleButton = document.getElementById('theme-toggle');

// Load settings when the page opens
document.addEventListener('DOMContentLoaded', function() {
  // Initialize timezone select if it exists
  if (timezoneSelect) {
    populateTimezoneSelect();
  }

  loadSettings();
});

/**
 * Populates the timezone dropdown with options
 */
function populateTimezoneSelect() {
  // Clear existing options
  timezoneSelect.innerHTML = '';

  // Add options from timezone list
  TIMEZONE_OPTIONS.forEach(tz => {
    const option = document.createElement('option');
    option.value = tz.value;
    option.textContent = tz.text;
    timezoneSelect.appendChild(option);
  });
}

// Set up event listeners for all settings
startDaySelect.addEventListener('change', saveSettings);
hideEmptyDaysCheckbox.addEventListener('change', saveSettings);
compactModeCheckbox.addEventListener('change', saveSettings);
if (document.getElementById('grid-mode')) {
  document.getElementById('grid-mode').addEventListener('change', saveSettings);
}
if (timezoneSelect) {
  timezoneSelect.addEventListener('change', saveSettings);
}
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

    // Grid mode setting
    if (document.getElementById('grid-mode')) {
      const gridMode = items[`${STORAGE_KEY_PREFIX}grid_mode`] !== undefined
          ? items[`${STORAGE_KEY_PREFIX}grid_mode`]
          : DEFAULT_SETTINGS.gridMode;
      document.getElementById('grid-mode').checked = gridMode;
    }

    // Timezone setting
    if (timezoneSelect) {
      const timezone = items[`${STORAGE_KEY_PREFIX}timezone`] || DEFAULT_SETTINGS.timezone;
      timezoneSelect.value = timezone;
    }
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

  // Add grid mode if it exists
  if (document.getElementById('grid-mode')) {
    settings[`${STORAGE_KEY_PREFIX}grid_mode`] = document.getElementById('grid-mode').checked;
  }

  // Add timezone if it exists
  if (timezoneSelect) {
    settings[`${STORAGE_KEY_PREFIX}timezone`] = timezoneSelect.value;
  }

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