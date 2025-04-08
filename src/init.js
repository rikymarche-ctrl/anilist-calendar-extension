/**
 * Anilist Weekly Schedule - Initialization
 * Creates a global namespace for the extension
 */

// Create a global namespace for the extension
window.AnilistCalendar = {
    // Constants
    DEBUG_MODE: true,
    STORAGE_KEY_PREFIX: 'anilist_calendar_',
    DAYS_OF_WEEK: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    ABBREVIATED_DAYS: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    JAPAN_TIMEZONE_OFFSET: 9, // UTC+9 for Japan

    // Timezone options with UTC offsets - listed by popularity in anime community
    TIMEZONE_OPTIONS: [
        { value: 'jst', text: 'UTC+9 | Japan Standard Time', shortText: 'UTC+9', offset: 9 },
        { value: 'pst', text: 'UTC-8 | Pacific Standard Time', shortText: 'UTC-8', offset: -8 },
        { value: 'pdt', text: 'UTC-7 | Pacific Daylight Time', shortText: 'UTC-7', offset: -7 },
        { value: 'est', text: 'UTC-5 | Eastern Standard Time', shortText: 'UTC-5', offset: -5 },
        { value: 'edt', text: 'UTC-4 | Eastern Daylight Time', shortText: 'UTC-4', offset: -4 },
        { value: 'bst', text: 'UTC+1 | British Summer Time', shortText: 'UTC+1', offset: 1 },
        { value: 'cet', text: 'UTC+1 | Central European Time', shortText: 'UTC+1', offset: 1 },
        { value: 'cest', text: 'UTC+2 | Central European Summer Time', shortText: 'UTC+2', offset: 2 },
        { value: 'ist', text: 'UTC+5:30 | Indian Standard Time', shortText: 'UTC+5:30', offset: 5.5 },
        { value: 'aest', text: 'UTC+10 | Australian Eastern Standard Time', shortText: 'UTC+10', offset: 10 },
        { value: 'nzst', text: 'UTC+12 | New Zealand Standard Time', shortText: 'UTC+12', offset: 12 },
        { value: 'auto', text: 'Auto-detect from browser', shortText: 'Auto', offset: null }
    ],

    // Default user preferences
    userPreferences: {
        startDay: 'today',                 // 'today' or index 0-6 (Sunday-Saturday)
        hideEmptyDays: false,              // Hide days without episodes
        layoutMode: 'standard',            // Layout mode: 'compact', 'standard', 'extended'
        timezone: 'jst',                   // Timezone preference
        timeFormat: 'release',             // Time format: 'release' or 'countdown'
        showTime: true,                    // Show time information
        showEpisodeNumbers: true,          // Show episode numbers
        titleAlignment: 'center'           // Title alignment: 'left' or 'center'
    },

    // Global state
    state: {
        weeklySchedule: {},
        calendarContainer: null,
        countdownInterval: null,
        originalPlusButtons: {},
        originalCoverImages: {},
        isCalendarInitialized: false,
        domObserver: null,
        lastUrl: location.href
    },

    // Module buckets (to be filled by other files)
    utils: {},
    settings: {},
    settingsUI: {},
    calendar: {},
    main: {}
};