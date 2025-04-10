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
        titleAlignment: 'center',          // Title alignment: 'left' or 'center'
        columnJustify: 'top',              // Column justification: 'top' or 'center'
        maxCardsPerDay: 0,                 // Maximum cards per day in gallery mode (0 = unlimited)
        fullWidthImages: false             // NEW: Whether to expand images to full width in standard mode
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
        lastUrl: location.href,
        currentTheme: 'dark' // Default theme
    },

    // Module buckets (to be filled by other files)
    utils: {},
    settings: {},
    settingsUI: {},
    calendar: {},
    main: {},

    /**
     * Detect the site theme by directly examining DOM elements
     * @return {string} 'light' or 'dark' based on detected theme
     */
    detectTheme: function() {
        if (!this.utils.log) {
            this.utils.log = function(message, data) {
                if (window.AnilistCalendar.DEBUG_MODE) {
                    if (data) {
                        console.log(`[Anilist Calendar] ${message}`, data);
                    } else {
                        console.log(`[Anilist Calendar] ${message}`);
                    }
                }
            };
        }

        try {
            // Direct check of body class - most reliable
            if (document.body.classList.contains('site-theme-light')) {
                this.utils.log('Theme detected from body class: light');
                return 'light';
            }

            if (document.body.classList.contains('site-theme-dark')) {
                this.utils.log('Theme detected from body class: dark');
                return 'dark';
            }

            // Check data-theme attribute
            const bodyTheme = document.body.getAttribute('data-theme');
            if (bodyTheme === 'light') {
                this.utils.log('Theme detected from data-theme attribute: light');
                return 'light';
            }

            // Check for specific AniList elements with known styles
            const siteContent = document.querySelector('.site-content');
            if (siteContent) {
                const bgColor = window.getComputedStyle(siteContent).backgroundColor;
                // Parse the RGB values
                const rgbMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                if (rgbMatch) {
                    const brightness = (parseInt(rgbMatch[1]) + parseInt(rgbMatch[2]) + parseInt(rgbMatch[3])) / 3;
                    if (brightness > 100) {
                        this.utils.log('Theme inferred from site-content background: light');
                        return 'light';
                    }
                }
            }

            // Check for light theme elements
            const lightElements = document.querySelectorAll('.theme-light, [data-theme="light"]');
            if (lightElements.length > 0) {
                this.utils.log('Theme detected from light theme elements');
                return 'light';
            }

            // Fallback to dark theme as default
            this.utils.log('No light theme detected, using dark as default');
            return 'dark';
        } catch (err) {
            this.utils.log('Error in theme detection, falling back to dark:', err);
            return 'dark';
        }
    },

    /**
     * Apply the current theme to our elements
     */
    applyTheme: function() {
        // Ensure utils.log exists
        if (!this.utils.log) {
            this.utils.log = function(message, data) {
                if (window.AnilistCalendar.DEBUG_MODE) {
                    if (data) {
                        console.log(`[Anilist Calendar] ${message}`, data);
                    } else {
                        console.log(`[Anilist Calendar] ${message}`);
                    }
                }
            };
        }

        // Detect the current theme
        const theme = this.detectTheme();
        this.state.currentTheme = theme;

        // Determine if high contrast is enabled
        const isHighContrast = document.body.classList.contains('high-contrast') ||
            document.documentElement.classList.contains('high-contrast');

        // Target our container
        const container = this.state.calendarContainer;
        if (!container) return;

        // Remove all theme classes
        container.classList.remove('site-theme-light', 'site-theme-dark', 'high-contrast');

        // Apply the current theme
        if (theme === 'light') {
            container.classList.add('site-theme-light');
        } else {
            container.classList.add('site-theme-dark');
        }

        // Apply high contrast if needed
        if (isHighContrast) {
            container.classList.add('high-contrast');
        }

        this.utils.log(`Theme applied: ${theme}${isHighContrast ? ' (high contrast)' : ''}`);
    },

    /**
     * Set up a mutation observer to watch for theme changes
     */
    setupThemeObserver: function() {
        // Ensure utils.log exists
        if (!this.utils.log) {
            this.utils.log = function(message, data) {
                if (window.AnilistCalendar.DEBUG_MODE) {
                    if (data) {
                        console.log(`[Anilist Calendar] ${message}`, data);
                    } else {
                        console.log(`[Anilist Calendar] ${message}`);
                    }
                }
            };
        }

        // Setup mutation observer for theme changes
        const themeObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.attributeName === 'class' || mutation.attributeName === 'data-theme') {
                    const newTheme = this.detectTheme();
                    if (newTheme !== this.state.currentTheme) {
                        this.utils.log(`Theme changed from ${this.state.currentTheme} to ${newTheme}`);
                        this.state.currentTheme = newTheme;
                        this.applyTheme();
                    }
                }
            }
        });

        // Observe both document.body and document.documentElement for changes
        themeObserver.observe(document.body, {
            attributes: true,
            attributeFilter: ['class', 'data-theme']
        });

        themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class', 'data-theme']
        });

        // Also observe the main content area for theme changes
        const siteContent = document.querySelector('.site-content');
        if (siteContent) {
            themeObserver.observe(siteContent, {
                attributes: true,
                attributeFilter: ['class', 'data-theme']
            });
        }

        // Look for theme toggle buttons and add click listeners
        const setupThemeToggleListeners = () => {
            const themeToggles = document.querySelectorAll('[data-icon="moon"], [data-icon="sun"], .theme-toggle');
            themeToggles.forEach(toggle => {
                if (!toggle.hasAttribute('data-theme-listener')) {
                    toggle.setAttribute('data-theme-listener', 'true');
                    toggle.addEventListener('click', () => {
                        setTimeout(() => {
                            const newTheme = this.detectTheme();
                            if (newTheme !== this.state.currentTheme) {
                                this.utils.log(`Theme changed via toggle from ${this.state.currentTheme} to ${newTheme}`);
                                this.state.currentTheme = newTheme;
                                this.applyTheme();
                            }
                        }, 100);
                    });
                }
            });
        };

        // Initial setup
        setupThemeToggleListeners();

        // And watch for new toggle buttons being added
        const bodyObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    setupThemeToggleListeners();
                }
            }
        });

        bodyObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        this.utils.log('Theme observer set up');
    }
};

// Define the log function immediately to avoid "not a function" errors
window.AnilistCalendar.utils.log = function(message, data = null) {
    if (window.AnilistCalendar.DEBUG_MODE) {
        if (data) {
            console.log(`[Anilist Calendar] ${message}`, data);
        } else {
            console.log(`[Anilist Calendar] ${message}`);
        }
    }
};

// Initialize theme detection as soon as possible
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.AnilistCalendar.applyTheme();
        window.AnilistCalendar.setupThemeObserver();
    });
} else {
    window.AnilistCalendar.applyTheme();
    window.AnilistCalendar.setupThemeObserver();
}