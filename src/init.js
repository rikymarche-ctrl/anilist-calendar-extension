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

    // Default user preferences
    userPreferences: {
        startDay: '1',                     // 'today' or index 0-6 (Sunday-Saturday), changed to Monday (1)
        hideEmptyDays: false,              // Hide days without episodes
        layoutMode: 'standard',            // Layout mode: 'compact', 'standard', 'extended'
        timeFormat: 'countdown',           // Time format: 'release' or 'countdown', changed to countdown
        showTime: true,                    // Show time information
        showEpisodeNumbers: true,          // Show episode numbers
        titleAlignment: 'center',          // Title alignment: 'left' or 'center', changed to center
        columnJustify: 'top',              // Column justification: 'top' or 'center'
        maxCardsPerDay: 0,                 // Maximum cards per day in gallery mode (0 = unlimited)
        fullWidthImages: false             // Whether to expand images to full width in standard mode
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
            // Create a theme detection object to log all detection methods
            const themeDetection = {
                bodyClassDark: document.body.classList.contains('site-theme-dark'),
                bodyClassContrast: document.body.classList.contains('site-theme-contrast'),
                bodyDataTheme: document.body.getAttribute('data-theme'),
                htmlDataTheme: document.documentElement.getAttribute('data-theme'),
                bodyClasses: Array.from(document.body.classList),
                htmlClasses: Array.from(document.documentElement.classList),
                computed: {}
            };

            // Log the complete theme detection object
            this.utils.log('Complete theme detection data:', themeDetection);

            // Check for high contrast mode first
            if (document.body.classList.contains('site-theme-contrast')) {
                this.utils.log('High contrast theme detected from body class');
                // We're returning 'dark' for contrast mode for backwards compatibility
                // but we'll set the high-contrast class in applyTheme
                return 'dark';
            }

            // Check for dark theme (this is explicitly set in AniList)
            if (document.body.classList.contains('site-theme-dark')) {
                this.utils.log('Dark theme detected from body class');
                return 'dark';
            }

            // Check data-theme attribute
            const bodyTheme = document.body.getAttribute('data-theme');
            if (bodyTheme === 'dark') {
                this.utils.log('Dark theme detected from data-theme attribute');
                return 'dark';
            }

            // Check HTML element's data-theme attribute
            const htmlTheme = document.documentElement.getAttribute('data-theme');
            if (htmlTheme === 'dark') {
                this.utils.log('Dark theme detected from HTML data-theme attribute');
                return 'dark';
            }

            // If no dark or contrast theme is detected, assume light theme
            // This is how AniList works - light theme is the absence of a theme class
            this.utils.log('Light theme detected (no dark or contrast theme class found)');
            return 'light';
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
        const isHighContrast = document.body.classList.contains('site-theme-contrast');

        // Target our container
        const container = this.state.calendarContainer;
        if (!container) return;

        // Apply CSS classes directly to the calendar container
        // Remove previous theme classes first
        container.classList.remove('anilist-weekly-calendar-light-theme', 'anilist-weekly-calendar-high-contrast');

        // Apply the appropriate theme class
        if (theme === 'light') {
            container.classList.add('anilist-weekly-calendar-light-theme');
        }

        if (isHighContrast) {
            container.classList.add('anilist-weekly-calendar-high-contrast');
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
                    // Collect detailed theme information to debug
                    const themeInfo = {
                        target: mutation.target.tagName,
                        attributeName: mutation.attributeName,
                        oldValue: mutation.oldValue,
                        newValue: mutation.target.getAttribute(mutation.attributeName),
                        bodyClasses: Array.from(document.body.classList),
                        htmlClasses: Array.from(document.documentElement.classList),
                        bodyDataTheme: document.body.getAttribute('data-theme'),
                        htmlDataTheme: document.documentElement.getAttribute('data-theme')
                    };

                    const newTheme = this.detectTheme();
                    if (newTheme !== this.state.currentTheme) {
                        this.utils.log(`Theme changed from ${this.state.currentTheme} to ${newTheme}. Details:`, themeInfo);
                        this.state.currentTheme = newTheme;
                        this.applyTheme();
                    }
                }
            }
        });

        // Observe both document.body and document.documentElement for changes
        themeObserver.observe(document.body, {
            attributes: true,
            attributeFilter: ['class', 'data-theme'],
            attributeOldValue: true
        });

        themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class', 'data-theme'],
            attributeOldValue: true
        });

        // Also observe the main content area for theme changes
        const siteContent = document.querySelector('.site-content');
        if (siteContent) {
            themeObserver.observe(siteContent, {
                attributes: true,
                attributeFilter: ['class', 'data-theme'],
                attributeOldValue: true
            });
        }

        // Log all existing theme-related elements for reference
        this.utils.log('Current theme elements on initialization:', {
            bodyClasses: Array.from(document.body.classList),
            htmlClasses: Array.from(document.documentElement.classList),
            bodyDataTheme: document.body.getAttribute('data-theme'),
            htmlDataTheme: document.documentElement.getAttribute('data-theme')
        });

        // Look for theme toggle buttons and add click listeners
        const setupThemeToggleListeners = () => {
            const themeToggles = document.querySelectorAll('[data-icon="moon"], [data-icon="sun"], .theme-toggle');
            themeToggles.forEach(toggle => {
                if (!toggle.hasAttribute('data-theme-listener')) {
                    toggle.setAttribute('data-theme-listener', 'true');
                    toggle.addEventListener('click', () => {
                        this.utils.log('Theme toggle clicked');

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