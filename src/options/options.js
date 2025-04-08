/**
 * Anilist Weekly Schedule - Options Page
 * Handles saving and loading user preferences
 */

// Constants
const STORAGE_KEY_PREFIX = 'anilist_calendar_';
const DEFAULT_SETTINGS = {
  startDay: 'today',
  hideEmptyDays: false,
  layoutMode: 'standard',
  showTime: true,
  timeFormat: 'release',
  showEpisodeNumbers: true,
  timezone: 'jst',
  titleAlignment: 'center'
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
const layoutModeSelect = document.getElementById('layout-mode');
const titleAlignmentSelect = document.getElementById('title-alignment');
const showEpisodeNumbersCheckbox = document.getElementById('show-episode-numbers');
const showTimeCheckbox = document.getElementById('show-time');
const timeFormatSelect = document.getElementById('time-format');
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
layoutModeSelect.addEventListener('change', saveSettings);
titleAlignmentSelect.addEventListener('change', saveSettings);
showEpisodeNumbersCheckbox.addEventListener('change', saveSettings);
showTimeCheckbox.addEventListener('change', saveSettings);
timeFormatSelect.addEventListener('change', saveSettings);
timezoneSelect.addEventListener('change', saveSettings);
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
    startDaySelect.value = items[`${STORAGE_KEY_PREFIX}start_day`] || DEFAULT_SETTINGS.startDay;

    // Hide empty days setting
    hideEmptyDaysCheckbox.checked = items[`${STORAGE_KEY_PREFIX}hide_empty_days`] !== undefined
        ? items[`${STORAGE_KEY_PREFIX}hide_empty_days`]
        : DEFAULT_SETTINGS.hideEmptyDays;

    // Layout mode setting
    layoutModeSelect.value = items[`${STORAGE_KEY_PREFIX}layout_mode`] || DEFAULT_SETTINGS.layoutMode;

    // Title alignment setting
    titleAlignmentSelect.value = items[`${STORAGE_KEY_PREFIX}title_alignment`] || DEFAULT_SETTINGS.titleAlignment;

    // Show episode numbers setting
    showEpisodeNumbersCheckbox.checked = items[`${STORAGE_KEY_PREFIX}show_episode_numbers`] !== undefined
        ? items[`${STORAGE_KEY_PREFIX}show_episode_numbers`]
        : DEFAULT_SETTINGS.showEpisodeNumbers;

    // Show time setting
    showTimeCheckbox.checked = items[`${STORAGE_KEY_PREFIX}show_time`] !== undefined
        ? items[`${STORAGE_KEY_PREFIX}show_time`]
        : DEFAULT_SETTINGS.showTime;

    // Time format setting
    timeFormatSelect.value = items[`${STORAGE_KEY_PREFIX}time_format`] || DEFAULT_SETTINGS.timeFormat;

    // Timezone setting
    timezoneSelect.value = items[`${STORAGE_KEY_PREFIX}timezone`] || DEFAULT_SETTINGS.timezone;

    // Handle backward compatibility
    // For compact mode and grid mode legacy settings
    if (items[`${STORAGE_KEY_PREFIX}compact_mode`] === true) {
      layoutModeSelect.value = 'compact';
    } else if (items[`${STORAGE_KEY_PREFIX}grid_mode`] === true) {
      layoutModeSelect.value = 'extended';
    }

    // For show countdown legacy setting
    if (items[`${STORAGE_KEY_PREFIX}show_countdown`] === true) {
      timeFormatSelect.value = 'countdown';
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
    [`${STORAGE_KEY_PREFIX}layout_mode`]: layoutModeSelect.value,
    [`${STORAGE_KEY_PREFIX}title_alignment`]: titleAlignmentSelect.value,
    [`${STORAGE_KEY_PREFIX}show_episode_numbers`]: showEpisodeNumbersCheckbox.checked,
    [`${STORAGE_KEY_PREFIX}show_time`]: showTimeCheckbox.checked,
    [`${STORAGE_KEY_PREFIX}time_format`]: timeFormatSelect.value,
    [`${STORAGE_KEY_PREFIX}timezone`]: timezoneSelect.value
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