/**
 * Anilist Weekly Schedule Extension
 *
 * This extension replaces the Airing section with a weekly calendar view
 * to provide a clearer visualization of anime episode release schedules.
 *
 * Author: ExAstra
 * GitHub: https://github.com/rikymarche-ctrl/anilist-weekly-schedule
 */

// Configuration
const DEBUG = true; // Set to true for debugging
const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ABBREVIATED_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const STORAGE_KEY_PREFIX = 'anilist_calendar_';

// Global variables
let weeklySchedule = {};
let isCalendarInitialized = false;
let calendarContainer = null;

/**
 * Logs debug messages to console
 */
function log(message, data = null) {
    if (!DEBUG) return;

    if (data) {
        console.log(`[Anilist Calendar] ${message}`, data);
    } else {
        console.log(`[Anilist Calendar] ${message}`);
    }
}

/**
 * Main initialization function
 */
function initialize() {
    log("Initializing extension");

    try {
        // Load user preferences
        loadUserPreferences()
            .then(() => {
                // Look for the Airing section
                findAndReplaceAiringSection();

                // Set up observer for future DOM changes
                setupObserver();
            });

        // Set up error handler
        window.addEventListener('error', (event) => {
            log("Global error caught", event.error);
        });

    } catch (err) {
        log("Error during initialization", err);
    }
}

/**
 * Sets up a mutation observer to watch for DOM changes
 */
function setupObserver() {
    const observer = new MutationObserver((mutations) => {
        if (isCalendarInitialized) return;

        const shouldCheck = mutations.some(mutation => {
            return mutation.addedNodes.length > 0;
        });

        if (shouldCheck) {
            findAndReplaceAiringSection();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    log("Observer set up");
}

/**
 * Renders the calendar with schedule data
 * @param {Object} schedule - The schedule data
 * @param {boolean} skipHeader - Whether to skip header creation (use external header)
 */
function renderCalendar(schedule, skipHeader = false) {
    if (!calendarContainer) return;

    log("Rendering calendar");

    // Clear container
    calendarContainer.innerHTML = '';

    // Get current day
    const today = new Date();
    const currentDayIndex = today.getDay();
    const currentDayName = DAYS_OF_WEEK[currentDayIndex];

    // Determine the order of days to display based on user preference
    let orderedDays = [...DAYS_OF_WEEK];

    if (userPreferences.startDay === 'today') {
        // Reorder days to start with today
        orderedDays = [
            ...DAYS_OF_WEEK.slice(currentDayIndex),
            ...DAYS_OF_WEEK.slice(0, currentDayIndex)
        ];
    } else if (!isNaN(userPreferences.startDay)) {
        // Reorder days to start with user-selected day
        const startDayIndex = parseInt(userPreferences.startDay);
        orderedDays = [
            ...DAYS_OF_WEEK.slice(startDayIndex),
            ...DAYS_OF_WEEK.slice(0, startDayIndex)
        ];
    }

    // If hideEmptyDays is enabled, filter out days with no episodes
    if (userPreferences.hideEmptyDays) {
        orderedDays = orderedDays.filter(day => {
            return schedule[day] && schedule[day].length > 0;
        });

        // If no days have episodes, add back current day
        if (orderedDays.length === 0) {
            orderedDays = [currentDayName];
        }

        // Add class to container based on number of visible days for dynamic sizing
        // First remove all previous day count classes
        for (let i = 1; i <= 7; i++) {
            calendarContainer.classList.remove(`days-count-${i}`);
        }

        // Then add the appropriate one
        calendarContainer.classList.add(`days-count-${orderedDays.length}`);
    } else {
        // If all days are shown, make sure we have the days-count-7 class
        calendarContainer.classList.remove('days-count-1', 'days-count-2', 'days-count-3', 'days-count-4', 'days-count-5', 'days-count-6');
        calendarContainer.classList.add('days-count-7');
    }

    // Only create header if not skipped (when using external header)
    if (!skipHeader) {
        // Create header with title and settings button
        const headerContainer = document.createElement('div');
        headerContainer.className = 'calendar-header';

        // Create title with inline timezone
        const calendarTitle = document.createElement('h3');
        calendarTitle.className = 'calendar-title';
        calendarTitle.innerHTML = `Weekly Schedule <span class="timezone-separator">|</span> <span class="timezone-info">${getTimezoneName()}</span>`;

        // Settings button
        const settingsButton = document.createElement('button');
        settingsButton.className = 'calendar-settings-btn';
        settingsButton.innerHTML = '<i class="fa fa-cog"></i>';
        settingsButton.title = 'Open settings';
        settingsButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            createSettingsOverlay();
        });

        headerContainer.appendChild(calendarTitle);
        headerContainer.appendChild(settingsButton);

        // Append header container
        calendarContainer.appendChild(headerContainer);
    }

    // Create calendar grid
    const calendarGrid = document.createElement('div');
    calendarGrid.className = `anilist-calendar-grid ${userPreferences.compactMode ? 'compact-mode' : ''}`;

    // Add days of week in the order determined above
    orderedDays.forEach(day => {
        const dayCol = document.createElement('div');
        dayCol.className = `anilist-calendar-day ${day === currentDayName ? 'current-day' : ''}`;

        // Day header
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.innerHTML = `
      <span class="day-name">${day}</span>
      <span class="abbreviated-day">${ABBREVIATED_DAYS[DAYS_OF_WEEK.indexOf(day)]}</span>
    `;
        dayCol.appendChild(dayHeader);

        // Day anime list
        const animeList = document.createElement('div');
        animeList.className = 'day-anime-list';

        // Add anime entries for this day
        if (schedule[day] && schedule[day].length > 0) {
            schedule[day].forEach(anime => {
                const animeEntry = document.createElement('div');
                animeEntry.className = 'anime-entry';
                animeEntry.style.borderLeftColor = anime.color;

                if (userPreferences.gridMode) {
                    animeEntry.style.borderBottomColor = anime.color;
                }

                // Create image element separately to handle errors
                const animeImageDiv = document.createElement('div');
                animeImageDiv.className = 'anime-image';

                const animeImg = document.createElement('img');
                animeImg.src = anime.coverImage;
                animeImg.alt = anime.title;
                animeImg.loading = 'lazy';

                // Error handling for image loading
                animeImg.addEventListener('error', () => {
                    animeImageDiv.classList.add('error');
                });

                animeImageDiv.appendChild(animeImg);

                // Create time element
                const animeTimeDiv = document.createElement('div');
                animeTimeDiv.className = 'anime-time';
                animeTimeDiv.textContent = anime.formattedTime;

                // If this time was adjusted across day boundaries, add a tooltip
                if (anime.dayChanged) {
                    animeTimeDiv.title = `Originally aired on ${anime.originalDay}`;
                    animeTimeDiv.classList.add('day-adjusted');
                }

                // Create info element
                const animeInfoDiv = document.createElement('div');
                animeInfoDiv.className = 'anime-info';

                // Add title
                const titleDiv = document.createElement('div');
                titleDiv.className = 'anime-title';
                titleDiv.textContent = anime.title;
                animeInfoDiv.appendChild(titleDiv);

                // Add episode and time - optimized for space
                const episodeDiv = document.createElement('div');
                episodeDiv.className = 'anime-episode';

                const episodeText = document.createElement('span');
                episodeText.className = 'episode-number';
                episodeText.textContent = `Episode ${anime.episode}`;
                episodeDiv.appendChild(episodeText);

                // Add time to the right side
                const timeWrapper = document.createElement('span');
                timeWrapper.className = 'time-wrapper';
                timeWrapper.appendChild(animeTimeDiv);
                episodeDiv.appendChild(timeWrapper);

                animeInfoDiv.appendChild(episodeDiv);

                // Assemble the entry based on mode
                if (userPreferences.gridMode) {
                    // For grid mode: image as background with info overlay
                    animeEntry.appendChild(animeImageDiv);
                    animeEntry.appendChild(animeInfoDiv);
                    // Time is displayed within the episode div in grid mode
                } else {
                    // For standard and compact modes
                    if (!userPreferences.compactMode) {
                        // Standard mode: show image
                        animeEntry.appendChild(animeImageDiv);
                    }
                    animeEntry.appendChild(animeInfoDiv);
                }

                // Make clickable to anime page
                animeEntry.addEventListener('click', () => {
                    window.location.href = `https://anilist.co/anime/${anime.id}`;
                });

                animeList.appendChild(animeEntry);
            });
        } else {
            // No anime airing on this day
            const emptyDay = document.createElement('div');
            emptyDay.className = 'empty-day';
            emptyDay.textContent = 'No episodes';
            animeList.appendChild(emptyDay);
        }

        dayCol.appendChild(animeList);
        calendarGrid.appendChild(dayCol);
    });

    // Append calendar grid
    calendarContainer.appendChild(calendarGrid);
}

















































/**
 * Finds the container for an Airing header element
 */
function findAiringContainer(headerElement) {
    try {
        // Try to find the appropriate container
        const sectionHeader = headerElement.closest('.section-header');
        if (!sectionHeader) return null;

        const listPreviewWrap = sectionHeader.closest('.list-preview-wrap');
        if (listPreviewWrap) {
            log("Found Airing container via list-preview-wrap", listPreviewWrap);
            return listPreviewWrap;
        }

        const listPreview = sectionHeader.closest('.list-preview');
        if (listPreview) {
            log("Found Airing container via list-preview", listPreview);
            return listPreview;
        }

        // If we can't find the usual containers, go up a few levels
        let parent = sectionHeader.parentElement;
        for (let i = 0; i < 3 && parent; i++) {
            log(`Checking parent level ${i}`, parent);
            if (parent.querySelectorAll('.media-preview-card').length > 0) {
                return parent;
            }
            parent = parent.parentElement;
        }

        return null;
    } catch (err) {
        log("Error finding container", err);
        return null;
    }
}

/**
 * Replaces the Airing section with our calendar
 * @param {HTMLElement} container - The container element
 * @param {HTMLElement} headerElement - The header element
 * @param {boolean} skipHeader - Whether to skip header creation
 */
function replaceAiringSection(container, headerElement, skipHeader = false) {
    try {
        log("Replacing Airing section", container);

        // First extract the data from the existing cards
        const animeData = extractAnimeDataFromDOM(container);

        if (!animeData || animeData.length === 0) {
            log("No anime data found in the Airing section");
            return false;
        }

        // Create calendar container
        calendarContainer = document.createElement('div');
        calendarContainer.className = 'anilist-weekly-calendar';

        // Apply compact mode class if needed
        if (userPreferences.compactMode) {
            calendarContainer.classList.add('compact-mode');
        }

        // Apply grid mode class if needed
        if (userPreferences.gridMode) {
            calendarContainer.classList.add('grid-mode');
        }

        // Find the section header
        const sectionHeader = headerElement.closest('.section-header');

        // Keep the header, remove everything else
        const children = Array.from(container.children);
        for (const child of children) {
            if (child !== sectionHeader && child.querySelector('.section-header') !== sectionHeader) {
                child.remove();
            }
        }

        // Add our calendar after the header
        if (sectionHeader && sectionHeader.parentNode === container) {
            container.insertBefore(calendarContainer, sectionHeader.nextSibling);
        } else {
            container.appendChild(calendarContainer);
        }

        // Process data and render calendar with skipHeader option
        const schedule = processAnimeData(animeData);
        renderCalendar(schedule, skipHeader);

        isCalendarInitialized = true;
        return true;
    } catch (err) {
        log("Error replacing section", err);
        return false;
    }
}



/**
 * Gets the episode number from the card
 */
function getEpisodeNumber(card) {
    try {
        // Look for episode information in the card
        const episodeText = card.textContent;
        const episodeMatch = episodeText.match(/Ep\s*(\d+)/i) ||
            episodeText.match(/Episode\s*(\d+)/i);

        if (episodeMatch && episodeMatch[1]) {
            return episodeMatch[1];
        }

        return null;
    } catch (err) {
        return null;
    }
}

/**
 * Formats time as HH:MM
 */
function formatTime(date) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

/**
 * Show a notification
 */
function showNotification(message) {
    // Remove any existing notifications
    const existingNotifications = document.querySelectorAll('.settings-notification');
    existingNotifications.forEach(notification => notification.remove());

    // Create new notification
    const notification = document.createElement('div');
    notification.className = 'settings-notification';
    notification.innerHTML = `
    <i class="fa fa-check-circle"></i>
    <span>${message}</span>
  `;

    // Add to DOM
    document.body.appendChild(notification);

    // Show with animation
    setTimeout(() => {
        notification.classList.add('active');

        // Hide after 3 seconds
        setTimeout(() => {
            notification.classList.remove('active');

            // Remove from DOM after transition
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }, 10);
}

/**
 * Load Font Awesome for icons
 */
function loadFontAwesome() {
    if (document.querySelector('link[href*="fontawesome"]')) {
        log("Font Awesome already loaded");
        return;
    }

    const fontAwesomeLink = document.createElement("link");
    fontAwesomeLink.rel = "stylesheet";
    fontAwesomeLink.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css";
    fontAwesomeLink.integrity = "sha512-z3gLpd7yknf1YoNbCzqRKc4qyor8gaKU1qmn+CShxbuBusANI9QpRohGBreCFkKxLhei6S9CQXFEbbKuqLg0DA==";
    fontAwesomeLink.crossOrigin = "anonymous";
    fontAwesomeLink.referrerPolicy = "no-referrer";

    document.head.appendChild(fontAwesomeLink);
    log("Font Awesome loaded");
}

// Initialize when the page is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        loadFontAwesome();
        initialize();
    });
} else {
    loadFontAwesome();
    initialize();
}

// Also run when URL changes (SPA navigation)
let lastUrl = location.href;
setInterval(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        log("URL changed, re-initializing");
        isCalendarInitialized = false;
        initialize();
    }
}, 1000);







































/**
 * Creates and populates the start day selector with a separator after "Today"
 */
function createStartDaySelector(startDaySelect, currentValue) {
    // Clear any existing options
    startDaySelect.innerHTML = '';

    // Add "Today" option
    const todayOption = document.createElement('option');
    todayOption.value = 'today';
    todayOption.textContent = 'Today';
    todayOption.selected = currentValue === 'today';
    startDaySelect.appendChild(todayOption);

    // Add separator after Today
    const separator = document.createElement('option');
    separator.disabled = true;
    separator.className = 'day-separator';
    separator.value = '';
    separator.innerHTML = '─────────────';
    startDaySelect.appendChild(separator);

    // Add the day options
    const dayOptions = [
        { value: '0', text: 'Sunday' },
        { value: '1', text: 'Monday' },
        { value: '2', text: 'Tuesday' },
        { value: '3', text: 'Wednesday' },
        { value: '4', text: 'Thursday' },
        { value: '5', text: 'Friday' },
        { value: '6', text: 'Saturday' }
    ];

    dayOptions.forEach(option => {
        const optElement = document.createElement('option');
        optElement.value = option.value;
        optElement.textContent = option.text;
        optElement.selected = currentValue === option.value;
        startDaySelect.appendChild(optElement);
    });
}


/**
 * Timezone Configuration
 *
 * This adds timezone support to adjust airing times based on user preferences.
 * The base assumption is that anime airing times are in Japan Standard Time (JST/UTC+9).
 */

// Common timezone options with UTC offsets - listed by popularity in anime community
const TIMEZONE_OPTIONS = [
    { value: 'jst', text: 'UTC+9 | Japan Standard Time', offset: 9 },
    { value: 'pst', text: 'UTC-8 | Pacific Standard Time', offset: -8 },
    { value: 'pdt', text: 'UTC-7 | Pacific Daylight Time', offset: -7 },
    { value: 'est', text: 'UTC-5 | Eastern Standard Time', offset: -5 },
    { value: 'edt', text: 'UTC-4 | Eastern Daylight Time', offset: -4 },
    { value: 'bst', text: 'UTC+1 | British Summer Time', offset: 1 },
    { value: 'cet', text: 'UTC+1 | Central European Time', offset: 1 },
    { value: 'cest', text: 'UTC+2 | Central European Summer Time', offset: 2 },
    { value: 'ist', text: 'UTC+5:30 | Indian Standard Time', offset: 5.5 },
    { value: 'aest', text: 'UTC+10 | Australian Eastern Standard Time', offset: 10 },
    { value: 'nzst', text: 'UTC+12 | New Zealand Standard Time', offset: 12 },
    { value: 'auto', text: 'Auto-detect from browser', offset: null }
];

// Default to Japan timezone (where most anime airs)
const DEFAULT_TIMEZONE = 'jst';

// Constant for Japan's offset (UTC+9), used as the base timezone for calculations
const JAPAN_OFFSET = 9;

// Update user preferences to include timezone
let userPreferences = {
    startDay: 'today', // 'today' or index 0-6 (Sunday-Saturday)
    hideEmptyDays: false, // Whether to hide days with no episodes
    compactMode: false, // Whether to use compact layout
    gridMode: false, // Whether to use grid layout (images only with hover info)
    timezone: DEFAULT_TIMEZONE, // NEW: Timezone preference
};

/**
 * Gets the current browser timezone offset in hours
 * @returns {number} Timezone offset in hours (e.g., -7 for UTC-7)
 */
function getBrowserTimezoneOffset() {
    // Get minutes and convert to hours
    const offsetMinutes = new Date().getTimezoneOffset();
    // Convert to hours (note: getTimezoneOffset returns the opposite of what we need)
    return -(offsetMinutes / 60);
}

/**
 * Gets the timezone offset in hours for the selected timezone
 * @returns {number} Timezone offset in hours
 */
function getSelectedTimezoneOffset() {
    if (userPreferences.timezone === 'auto') {
        return getBrowserTimezoneOffset();
    }

    // Find the selected timezone in options
    const timezone = TIMEZONE_OPTIONS.find(tz => tz.value === userPreferences.timezone);
    return timezone ? timezone.offset : JAPAN_OFFSET; // Default to Japan if not found
}

/**
 * Loads user preferences from storage
 */
async function loadUserPreferences() {
    return new Promise((resolve) => {
        try {
            chrome.storage.sync.get([
                `${STORAGE_KEY_PREFIX}start_day`,
                `${STORAGE_KEY_PREFIX}hide_empty_days`,
                `${STORAGE_KEY_PREFIX}compact_mode`,
                `${STORAGE_KEY_PREFIX}grid_mode`,
                `${STORAGE_KEY_PREFIX}timezone`  // NEW: Load timezone
            ], function(result) {
                if (result[`${STORAGE_KEY_PREFIX}start_day`] !== undefined) {
                    userPreferences.startDay = result[`${STORAGE_KEY_PREFIX}start_day`];
                }
                if (result[`${STORAGE_KEY_PREFIX}hide_empty_days`] !== undefined) {
                    userPreferences.hideEmptyDays = result[`${STORAGE_KEY_PREFIX}hide_empty_days`];
                }
                if (result[`${STORAGE_KEY_PREFIX}compact_mode`] !== undefined) {
                    userPreferences.compactMode = result[`${STORAGE_KEY_PREFIX}compact_mode`];
                }
                if (result[`${STORAGE_KEY_PREFIX}grid_mode`] !== undefined) {
                    userPreferences.gridMode = result[`${STORAGE_KEY_PREFIX}grid_mode`];
                }
                if (result[`${STORAGE_KEY_PREFIX}timezone`] !== undefined) {
                    userPreferences.timezone = result[`${STORAGE_KEY_PREFIX}timezone`];
                }
                log("Loaded user preferences", userPreferences);
                resolve();
            });
        } catch (e) {
            log("Error loading preferences", e);
            resolve();
        }
    });
}

/**
 * Saves user preferences to storage
 */
function saveUserPreferences() {
    try {
        const data = {
            [`${STORAGE_KEY_PREFIX}start_day`]: userPreferences.startDay,
            [`${STORAGE_KEY_PREFIX}hide_empty_days`]: userPreferences.hideEmptyDays,
            [`${STORAGE_KEY_PREFIX}compact_mode`]: userPreferences.compactMode,
            [`${STORAGE_KEY_PREFIX}grid_mode`]: userPreferences.gridMode,
            [`${STORAGE_KEY_PREFIX}timezone`]: userPreferences.timezone  // NEW: Save timezone
        };

        chrome.storage.sync.set(data, function() {
            log("Saved user preferences", data);
        });
    } catch (e) {
        log("Error saving preferences", e);
    }
}

/**
 * Calculates airing date based on countdown, adjusted for the user's timezone
 * @param {number} days Days until airing
 * @param {number} hours Hours until airing
 * @param {number} minutes Minutes until airing
 * @returns {Date} Adjusted airing date in user's timezone
 */
function calculateAiringDate(days, hours, minutes) {
    const now = new Date();
    const airingDate = new Date(now);

    // Calculate airing date based on countdown (this is in local time)
    airingDate.setDate(now.getDate() + days);
    airingDate.setHours(now.getHours() + hours);
    airingDate.setMinutes(now.getMinutes() + minutes);

    // Convert countdown-based time to the assumed Japan time
    // This is needed because the countdown is shown in local time on Anilist
    // But the original airing time is in Japan time
    const userOffset = getBrowserTimezoneOffset();
    const japanOffset = JAPAN_OFFSET;
    const diffHours = japanOffset - userOffset;

    // Adjust the calculated time from browser time to Japan time
    airingDate.setHours(airingDate.getHours() + diffHours);

    // Now convert from Japan time to user's selected timezone
    const selectedOffset = getSelectedTimezoneOffset();
    const tzDiffHours = selectedOffset - japanOffset;

    // Apply the timezone difference
    airingDate.setHours(airingDate.getHours() + tzDiffHours);

    return airingDate;
}

/**
 * Creates and opens the settings overlay
 */
function createSettingsOverlay() {
    // Check if overlay already exists
    let settingsOverlay = document.querySelector('.settings-overlay');
    if (settingsOverlay) {
        settingsOverlay.classList.add('active');
        return;
    }

    // Create overlay
    settingsOverlay = document.createElement('div');
    settingsOverlay.className = 'settings-overlay';

    // Create settings panel
    const settingsPanel = document.createElement('div');
    settingsPanel.className = 'settings-panel';

    // Panel header
    const settingsHeader = document.createElement('div');
    settingsHeader.className = 'settings-header';

    const settingsTitle = document.createElement('h3');
    settingsTitle.className = 'settings-title';
    settingsTitle.textContent = 'Anilist Weekly Schedule Settings';

    const closeButton = document.createElement('button');
    closeButton.className = 'settings-close-btn';
    closeButton.innerHTML = '<i class="fa fa-times"></i>';
    closeButton.addEventListener('click', () => {
        settingsOverlay.classList.remove('active');
    });

    settingsHeader.appendChild(settingsTitle);
    settingsHeader.appendChild(closeButton);

    // Settings content
    const settingsContent = document.createElement('div');
    settingsContent.className = 'settings-content';

    // Display section
    const displaySection = document.createElement('div');
    displaySection.className = 'settings-section';

    const displayTitle = document.createElement('h4');
    displayTitle.className = 'settings-section-title';
    displayTitle.textContent = 'Display Settings';
    displaySection.appendChild(displayTitle);

    // First day of week setting
    const startDayRow = document.createElement('div');
    startDayRow.className = 'settings-row';

    const startDayLabel = document.createElement('div');
    startDayLabel.innerHTML = `
    <div class="settings-label">First day of the week</div>
    <div class="settings-description">Choose which day to display first in the calendar</div>
  `;
    // Create the select element
    const startDaySelect = document.createElement('select');
    startDaySelect.className = 'settings-select';
    startDaySelect.id = 'start-day-select';

    // Populate with options including separator
    createStartDaySelector(startDaySelect, userPreferences.startDay);

    // Options for select
    const startDayOptions = [
        { value: 'today', text: 'Today' },
        { value: '0', text: 'Sunday' },
        { value: '1', text: 'Monday' },
        { value: '2', text: 'Tuesday' },
        { value: '3', text: 'Wednesday' },
        { value: '4', text: 'Thursday' },
        { value: '5', text: 'Friday' },
        { value: '6', text: 'Saturday' }
    ];

    startDayOptions.forEach(option => {
        const optElement = document.createElement('option');
        optElement.value = option.value;
        optElement.textContent = option.text;
        optElement.selected = userPreferences.startDay === option.value;
        startDaySelect.appendChild(optElement);
    });

    startDayRow.appendChild(startDayLabel);
    startDayRow.appendChild(startDaySelect);

    // Hide empty days setting
    const hideEmptyRow = document.createElement('div');
    hideEmptyRow.className = 'settings-row';

    const hideEmptyLabel = document.createElement('div');
    hideEmptyLabel.innerHTML = `
    <div class="settings-label">Hide empty days</div>
    <div class="settings-description">Only show days with scheduled episodes</div>
  `;

    const hideEmptyToggle = document.createElement('label');
    hideEmptyToggle.className = 'toggle-switch';
    hideEmptyToggle.innerHTML = `
    <input type="checkbox" id="hide-empty-toggle" ${userPreferences.hideEmptyDays ? 'checked' : ''}>
    <span class="slider"></span>
  `;

    hideEmptyRow.appendChild(hideEmptyLabel);
    hideEmptyRow.appendChild(hideEmptyToggle);

    // Compact mode setting
    const compactRow = document.createElement('div');
    compactRow.className = 'settings-row';

    const compactLabel = document.createElement('div');
    compactLabel.innerHTML = `
    <div class="settings-label">Compact mode</div>
    <div class="settings-description">Use a more compact layout to save space</div>
  `;

    const compactToggle = document.createElement('label');
    compactToggle.className = 'toggle-switch';
    compactToggle.innerHTML = `
    <input type="checkbox" id="compact-toggle" ${userPreferences.compactMode ? 'checked' : ''}>
    <span class="slider"></span>
  `;

    compactRow.appendChild(compactLabel);
    compactRow.appendChild(compactToggle);

    // Grid mode setting
    const gridRow = document.createElement('div');
    gridRow.className = 'settings-row';

    const gridLabel = document.createElement('div');
    gridLabel.innerHTML = `
    <div class="settings-label">Grid view</div>
    <div class="settings-description">Display anime as a grid of images (hover for details)</div>
  `;

    const gridToggle = document.createElement('label');
    gridToggle.className = 'toggle-switch';
    gridToggle.innerHTML = `
    <input type="checkbox" id="grid-toggle" ${userPreferences.gridMode ? 'checked' : ''}>
    <span class="slider"></span>
  `;

    gridRow.appendChild(gridLabel);
    gridRow.appendChild(gridToggle);

    // NEW: Timezone section
    const timezoneRow = document.createElement('div');
    timezoneRow.className = 'settings-row';

    const timezoneLabel = document.createElement('div');
    timezoneLabel.innerHTML = `
    <div class="settings-label">Timezone</div>
    <div class="settings-description">Select your timezone to adjust airing times</div>
  `;

    const timezoneSelect = document.createElement('select');
    timezoneSelect.className = 'settings-select';
    timezoneSelect.id = 'timezone-select';

    // Add timezone options
    TIMEZONE_OPTIONS.forEach(option => {
        const optElement = document.createElement('option');
        optElement.value = option.value;
        optElement.textContent = option.text;
        optElement.selected = userPreferences.timezone === option.value;
        timezoneSelect.appendChild(optElement);
    });

    timezoneRow.appendChild(timezoneLabel);
    timezoneRow.appendChild(timezoneSelect);

    // Add rows to display section
    displaySection.appendChild(startDayRow);
    displaySection.appendChild(hideEmptyRow);
    displaySection.appendChild(compactRow);
    displaySection.appendChild(gridRow);
    displaySection.appendChild(timezoneRow);  // NEW: Add timezone row

    // Add sections to panel
    settingsContent.appendChild(displaySection);

    // Loading section
    const loadingSection = document.createElement('div');
    loadingSection.className = 'settings-loading';
    loadingSection.innerHTML = `
    <span class="settings-loading-spinner"></span>
    <span>Updating calendar...</span>
  `;

    // Save button
    const saveContainer = document.createElement('div');
    saveContainer.className = 'settings-save-container';

    const saveButton = document.createElement('button');
    saveButton.className = 'settings-save-btn';
    saveButton.innerHTML = '<i class="fa fa-save"></i> Save Settings';
    saveButton.addEventListener('click', () => {
        // Collect current values
        const newStartDay = document.getElementById('start-day-select').value;
        const newHideEmpty = document.getElementById('hide-empty-toggle').checked;
        const newCompactMode = document.getElementById('compact-toggle').checked;
        const newGridMode = document.getElementById('grid-toggle').checked;
        const newTimezone = document.getElementById('timezone-select').value;  // NEW: Get timezone value

        // Update preferences
        userPreferences.startDay = newStartDay;
        userPreferences.hideEmptyDays = newHideEmpty;
        userPreferences.compactMode = newCompactMode;
        userPreferences.gridMode = newGridMode;
        userPreferences.timezone = newTimezone;  // NEW: Update timezone preference

        // Show loading indicator
        loadingSection.classList.add('active');

        // Save and update
        saveUserPreferences();

        // Wait a moment to show loading effect before refreshing the entire page
        setTimeout(() => {
            // Show notification
            showNotification('Settings applied! Refreshing page...');

            // Hide loading indicator
            loadingSection.classList.remove('active');

            // Hide overlay
            settingsOverlay.classList.remove('active');

            // Force a complete page refresh after a brief delay to allow the notification to be seen
            setTimeout(() => {
                window.location.reload(true); // true forces a reload from server, not cache
            }, 800);
        }, 500);
    });

    saveContainer.appendChild(saveButton);

    // Complete the panel
    settingsPanel.appendChild(settingsHeader);
    settingsPanel.appendChild(settingsContent);
    settingsPanel.appendChild(loadingSection);
    settingsPanel.appendChild(saveContainer);

    // Add panel to overlay
    settingsOverlay.appendChild(settingsPanel);

    // Add overlay to document
    document.body.appendChild(settingsOverlay);

    // Activate overlay
    setTimeout(() => {
        settingsOverlay.classList.add('active');
    }, 10);

    // Close overlay when clicking outside panel
    settingsOverlay.addEventListener('click', (e) => {
        if (e.target === settingsOverlay) {
            settingsOverlay.classList.remove('active');
        }
    });
}



















/**
 * Calendar UI Enhancements for Timezone Display
 *
 * This adds visual indicators for the current timezone setting
 * to help users understand the airing times shown in the calendar.
 */

/**
 * Gets a clean timezone name format for display
 * @returns {string} Formatted timezone name
 */
function getTimezoneName() {
    if (userPreferences.timezone === 'auto') {
        const offset = getBrowserTimezoneOffset();
        const sign = offset >= 0 ? '+' : '-';
        const absOffset = Math.abs(offset);
        const hours = Math.floor(absOffset);
        const minutes = Math.round((absOffset - hours) * 60);

        return `UTC${sign}${hours}${minutes > 0 ? `:${minutes}` : ''}`;
    }

    // Find the timezone in options and get just the UTC part
    const timezone = TIMEZONE_OPTIONS.find(tz => tz.value === userPreferences.timezone);
    if (timezone) {
        // Extract just the UTC part before the pipe symbol
        const utcPart = timezone.text.split('|')[0].trim();
        return utcPart;
    }

    return 'UTC+9'; // Default to Japan timezone
}

/**
 * Enhanced processAnimeData function that accounts for timezone differences
 * and possible day changes when converting times
 */
function processAnimeData(animeData) {
    const schedule = {
        Sunday: [],
        Monday: [],
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
        Friday: [],
        Saturday: []
    };

    // Process each anime entry
    for (const anime of animeData) {
        // Get the timezone-adjusted day and track if it changed
        const originalDay = DAYS_OF_WEEK[anime.airingDate.getDay()];

        // Store original day information in the anime object
        anime.originalDay = originalDay;
        anime.dayChanged = false;

        // Add to corresponding day
        schedule[originalDay].push({
            id: anime.id,
            title: anime.title,
            coverImage: anime.coverImage,
            airingDate: anime.airingDate,
            formattedTime: anime.formattedTime,
            episode: anime.episode,
            color: anime.color,
            originalDay: anime.originalDay,
            dayChanged: anime.dayChanged
        });
    }

    // Sort each day's anime by airing time
    for (const day in schedule) {
        schedule[day].sort((a, b) => {
            const timeA = a.formattedTime.split(':');
            const timeB = b.formattedTime.split(':');

            const hoursA = parseInt(timeA[0]);
            const hoursB = parseInt(timeB[0]);

            if (hoursA !== hoursB) {
                return hoursA - hoursB;
            }

            const minutesA = parseInt(timeA[1]);
            const minutesB = parseInt(timeB[1]);

            return minutesA - minutesB;
        });
    }

    log("Processed schedule data with timezone adjustments", schedule);
    return schedule;
}


/**
 * Enhanced Airing Date Calculation with Day Tracking
 *
 * These functions handle the conversion of airing times between timezones,
 * tracking when a date change occurs due to timezone differences.
 */

/**
 * Calculates airing date based on countdown, adjusted for the user's timezone
 * This enhanced version tracks if the day changes due to timezone differences
 * @param {number} days Days until airing
 * @param {number} hours Hours until airing
 * @param {number} minutes Minutes until airing
 * @returns {object} Object containing adjusted date and day change information
 */
function calculateAiringDateWithDayTracking(days, hours, minutes) {
    const now = new Date();
    const airingDate = new Date(now);

    // Calculate basic airing date based on countdown (local time)
    airingDate.setDate(now.getDate() + days);
    airingDate.setHours(now.getHours() + hours);
    airingDate.setMinutes(now.getMinutes() + minutes);

    // Get the original day before any timezone adjustments
    const originalDate = new Date(airingDate);
    const originalDay = DAYS_OF_WEEK[originalDate.getDay()];

    // Convert countdown-based time to Japan time (assumed origin timezone)
    // This is needed because the countdown is shown in local time on Anilist
    const userOffset = getBrowserTimezoneOffset();
    const japanOffset = JAPAN_OFFSET;
    const diffHours = japanOffset - userOffset;

    // Original Japan time
    airingDate.setHours(airingDate.getHours() + diffHours);
    const japanTime = new Date(airingDate);

    // Now convert from Japan time to user's selected timezone
    const selectedOffset = getSelectedTimezoneOffset();
    const tzDiffHours = selectedOffset - japanOffset;

    // Apply timezone difference
    airingDate.setHours(airingDate.getHours() + tzDiffHours);

    // Check if the day changed
    const newDay = DAYS_OF_WEEK[airingDate.getDay()];
    const dayChanged = newDay !== originalDay;

    return {
        date: airingDate,
        originalDay: originalDay,
        dayChanged: dayChanged
    };
}

/**
 * Updated extraction function that includes day tracking
 */
function extractAnimeDataFromDOM(container) {
    try {
        log("Extracting anime data from DOM with timezone handling");

        // Find all anime cards in the container
        const animeCards = container.querySelectorAll('.media-preview-card');

        log(`Found ${animeCards.length} anime cards`);

        const animeData = [];

        // Process each card
        animeCards.forEach(card => {
            try {
                // Get anime ID from the URL
                const animeLink = card.querySelector('a[href^="/anime/"]');
                if (!animeLink) return;

                const animeId = animeLink.getAttribute('href').split('/anime/')[1].split('/')[0];

                // Get anime title
                const titleElement = card.querySelector('.content');
                const title = titleElement ? titleElement.textContent.trim() : "Unknown Anime";

                // Get cover image
                const coverImg = card.querySelector('img') || card.querySelector('.cover');
                let coverImage = '';

                if (coverImg) {
                    // Try to get the actual src
                    coverImage = coverImg.getAttribute('src') ||
                        coverImg.getAttribute('data-src') ||
                        '';

                    // If the image uses background-image style
                    if (!coverImage) {
                        const style = coverImg.getAttribute('style');
                        if (style && style.includes('background-image')) {
                            const match = style.match(/url\(['"]?(.*?)['"]?\)/);
                            if (match && match[1]) {
                                coverImage = match[1];
                            }
                        }
                    }
                }

                // Get countdown info
                const countdownElement = card.querySelector('.countdown');
                let days = 0, hours = 0, minutes = 0;

                if (countdownElement) {
                    const text = countdownElement.textContent;

                    // Parse days, hours, minutes
                    const dMatch = text.match(/(\d+)d/);
                    const hMatch = text.match(/(\d+)h/);
                    const mMatch = text.match(/(\d+)m/);

                    days = dMatch ? parseInt(dMatch[1]) : 0;
                    hours = hMatch ? parseInt(hMatch[1]) : 0;
                    minutes = mMatch ? parseInt(mMatch[1]) : 0;
                }

                // Get color (if available)
                let color = '#3db4f2'; // Default blue
                if (coverImg && coverImg.getAttribute('data-src-color')) {
                    color = coverImg.getAttribute('data-src-color');
                }

                // Calculate airing time based on countdown with day tracking
                const airingInfo = calculateAiringDateWithDayTracking(days, hours, minutes);
                const airingDate = airingInfo.date;

                animeData.push({
                    id: animeId,
                    title: title,
                    coverImage: coverImage,
                    airingDate: airingDate,
                    formattedTime: formatTime(airingDate),
                    days: days,
                    hours: hours,
                    minutes: minutes,
                    color: color,
                    episode: getEpisodeNumber(card) || "Next",
                    originalDay: airingInfo.originalDay,
                    dayChanged: airingInfo.dayChanged
                });

            } catch (cardErr) {
                log("Error processing anime card", cardErr);
            }
        });

        log("Extracted anime data with timezone handling", animeData);
        return animeData;

    } catch (err) {
        log("Error extracting anime data from DOM", err);
        return [];
    }
}