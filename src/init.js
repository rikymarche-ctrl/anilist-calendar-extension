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
        maxCardsPerDay: 0                  // Maximum cards per day in gallery mode (0 = unlimited)
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

    // Enhanced theme detection system
    enhancedThemeDetection: {
        /**
         * Determina il tema attivo usando vari metodi di rilevazione
         * @return {string} 'light' o 'dark' in base al tema rilevato
         */
        getCurrentTheme: function() {
            // 1. Controlla il selettore UI del tema (verificato nel DOM)
            const themeFromUI = this.getThemeFromUI();
            if (themeFromUI) {
                return themeFromUI;
            }

            // 2. Controlla l'attributo data-theme sull'elemento HTML
            const htmlTheme = document.documentElement.getAttribute('data-theme');
            if (htmlTheme === 'light' || htmlTheme === 'dark') {
                return htmlTheme;
            }

            // 3. Controlla l'attributo data-theme sul body
            const bodyTheme = document.body.getAttribute('data-theme');
            if (bodyTheme === 'light' || bodyTheme === 'dark') {
                return bodyTheme;
            }

            // 4. Controlla le classi sul documento HTML
            if (document.documentElement.classList.contains('light-mode') ||
                document.documentElement.classList.contains('site-theme-light')) {
                return 'light';
            }
            if (document.documentElement.classList.contains('dark-mode') ||
                document.documentElement.classList.contains('site-theme-dark')) {
                return 'dark';
            }

            // 5. Controlla le classi sul body
            if (document.body.classList.contains('light-mode') ||
                document.body.classList.contains('site-theme-light')) {
                return 'light';
            }
            if (document.body.classList.contains('dark-mode') ||
                document.body.classList.contains('site-theme-dark')) {
                return 'dark';
            }

            // 6. Controlla localStorage (Anilist salva questa preferenza)
            if (localStorage.getItem('theme')) {
                return localStorage.getItem('theme');
            }

            // 7. Controlla la preferenza del sistema se supportata
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
                return 'light';
            }

            // Default: torna a dark theme
            return 'dark';
        },

        /**
         * Ottiene il tema dal selettore UI visibile nel DOM
         * @return {string|null} 'light' o 'dark' se rilevato, altrimenti null
         */
        getThemeFromUI: function() {
            try {
                // Cerca il selettore di tema di Anilist
                const themeSelector = document.querySelector('.theme-selector');
                if (themeSelector) {
                    const lightPreview = themeSelector.querySelector('.theme-preview.default');
                    const darkPreview = themeSelector.querySelector('.theme-preview.dark');

                    // Controlla quale tema è selezionato basandosi sull'attributo tabindex
                    if (lightPreview && lightPreview.getAttribute('tabindex') === "0") {
                        return 'light';
                    } else if (darkPreview && darkPreview.getAttribute('tabindex') === "0") {
                        return 'dark';
                    }

                    // Controlla anche gli attributi aria-selected
                    if (lightPreview && lightPreview.getAttribute('aria-selected') === 'true') {
                        return 'light';
                    } else if (darkPreview && darkPreview.getAttribute('aria-selected') === 'true') {
                        return 'dark';
                    }
                }
            } catch (e) {
                console.error('[Anilist Calendar] Error checking theme UI:', e);
            }
            return null;
        },

        /**
         * Configura l'osservatore per rilevare cambiamenti di tema
         * @param {Function} onThemeChanged - Callback da eseguire quando cambia il tema
         */
        setupThemeObserver: function(onThemeChanged) {
            // Monitora i cambiamenti ai data-theme attributes
            const attrObserver = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.attributeName === 'data-theme' || mutation.attributeName === 'class') {
                        onThemeChanged();
                    }
                }
            });

            // Osserva sia il document che il body per cambiamenti
            attrObserver.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ['data-theme', 'class']
            });
            attrObserver.observe(document.body, {
                attributes: true,
                attributeFilter: ['data-theme', 'class']
            });

            // Cerca bottoni di theme toggle esistenti
            const themeToggles = document.querySelectorAll(
                '.theme-toggle, .theme-toggle-button, [data-action="toggle-theme"]'
            );

            themeToggles.forEach(button => {
                button.addEventListener('click', () => {
                    // Ritardo piccolo per permettere al DOM di aggiornarsi
                    setTimeout(onThemeChanged, 50);
                });
            });

            // Osserva aggiunzioni di bottoni theme toggle
            const bodyObserver = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.type === 'childList' && mutation.addedNodes.length) {
                        for (const node of mutation.addedNodes) {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                const toggles = node.querySelectorAll(
                                    '.theme-toggle, .theme-toggle-button, [data-action="toggle-theme"]'
                                );

                                toggles.forEach(button => {
                                    button.addEventListener('click', () => {
                                        setTimeout(onThemeChanged, 50);
                                    });
                                });
                            }
                        }
                    }
                }
            });

            bodyObserver.observe(document.body, { childList: true, subtree: true });

            // Controlla anche localStorage changes
            const originalSetItem = localStorage.setItem;
            localStorage.setItem = function(key, value) {
                originalSetItem.call(this, key, value);
                if (key === 'theme') {
                    setTimeout(onThemeChanged, 50);
                }
            };
        }
    },

    /**
     * Detect the site theme using enhanced detection
     * @return {string} 'light' or 'dark' based on detected theme
     */
    detectTheme: function() {
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

        // Utilizza la funzione migliorata per la rilevazione del tema
        const theme = this.enhancedThemeDetection.getCurrentTheme();

        // Log dei risultati per debugging
        this.utils.log('Enhanced theme detection result:', theme);

        return theme;
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

        // Utilizza l'osservatore migliorato
        this.enhancedThemeDetection.setupThemeObserver(() => {
            // Quando viene rilevato un cambio di tema
            const newTheme = this.detectTheme();
            if (newTheme !== this.state.currentTheme) {
                this.utils.log(`Theme changed from ${this.state.currentTheme} to ${newTheme}`);
                this.state.currentTheme = newTheme;
                this.applyTheme();
            }
        });

        this.utils.log('Enhanced theme observer set up');
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