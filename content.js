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
const DEBUG = false; // Set to false for production
const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ABBREVIATED_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const STORAGE_KEY_PREFIX = 'anilist_calendar_';

// Anilist GraphQL endpoint
const ANILIST_API_URL = 'https://graphql.anilist.co';

// Timezone Configuration
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

// User Preferences with Default Values
let userPreferences = {
    startDay: 'today',                 // 'today' or index 0-6 (Sunday-Saturday)
    hideEmptyDays: false,              // Hide days without episodes
    compactMode: false,                // Use compact layout
    gridMode: false,                   // Use grid layout (images only with hover info)
    timezone: DEFAULT_TIMEZONE,        // Timezone preference
    showCountdown: false,              // Show countdown instead of time
    showEpisodeNumbers: true           // Show episode numbers
};

// Global variables
let weeklySchedule = {};
let isCalendarInitialized = false;
let calendarContainer = null;
let countdownInterval = null; // For real-time countdown updates

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
 * Preloads FontAwesome icons to ensure they're available
 */
function preloadFontAwesomeIcons() {
    // Create a hidden div to force icon font loading
    const preloadDiv = document.createElement('div');
    preloadDiv.style.position = 'absolute';
    preloadDiv.style.top = '-9999px';
    preloadDiv.style.left = '-9999px';
    preloadDiv.style.visibility = 'hidden';

    // Add some common icons we'll use
    preloadDiv.innerHTML = `
        <i class="fa fa-plus"></i>
        <i class="fa fa-check"></i>
        <i class="fa fa-cog"></i>
        <i class="fa fa-spinner fa-spin"></i>
    `;

    document.body.appendChild(preloadDiv);

    // Remove after a delay to ensure they're loaded
    setTimeout(() => {
        document.body.removeChild(preloadDiv);
    }, 2000);
}

/**
 * Apply extension enhancements including site background color
 */
function applyExtensionEnhancements() {
    // Apply site background color force
    const styleForceBackground = document.createElement('style');
    styleForceBackground.id = "anilist-calendar-force-background";
    styleForceBackground.innerHTML = `
        html body .anilist-weekly-calendar,
        html body .anilist-calendar-grid,
        html body .anilist-calendar-day,
        html body .day-header,
        html body .day-anime-list {
            background-color: #151f2e !important;
            background: #151f2e !important;
            background-image: none !important;
            color: white !important;
        }
        
        html body .day-name, 
        html body .day-number {
            color: white !important;
        }
        
        html body .separator {
            color: rgba(255, 255, 255, 0.7) !important;
        }
        
        /* Migliore gestione del bordo blu */
        .anime-entry:hover .anime-image::before {
            z-index: 3;
        }
        
        .blue-border-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            border: 2px solid #3db4f2;
            box-sizing: border-box;
            z-index: 3;
            pointer-events: none;
        }
    `;
    document.head.appendChild(styleForceBackground);

    // Create default image for error states
    createDefaultImage();
}

/**
 * Creates and preloads a default image for error states
 */
function createDefaultImage() {
    // Create a default cover image for use when loading fails
    const defaultImageData = `
        <svg xmlns="http://www.w3.org/2000/svg" width="100" height="150" viewBox="0 0 100 150">
            <rect width="100" height="150" fill="#1A1A2E"/>
            <text x="50" y="75" font-family="Arial" font-size="16" fill="#9CA3AF" text-anchor="middle">No Image</text>
        </svg>
    `;

    // Convert the SVG to a data URL
    const defaultImageUrl = 'data:image/svg+xml;base64,' + btoa(defaultImageData);

    // Create the image and add it to extension storage
    const defaultImage = new Image();
    defaultImage.src = defaultImageUrl;

    // Store it in extension storage if needed
    try {
        chrome.storage.local.set({ 'default_cover_image': defaultImageUrl });
    } catch (e) {
        // Fallback for when chrome.storage is not available
        window.defaultCoverImage = defaultImageUrl;
    }

    return defaultImageUrl;
}

/**
 * Main initialization function
 */
function initialize() {
    log("Initializing extension");

    try {
        // Apply our custom enhancements
        applyExtensionEnhancements();

        // Preload FontAwesome icons
        preloadFontAwesomeIcons();

        // Load user preferences
        loadUserPreferences()
            .then(() => {
                // Look for the Airing section
                findAndReplaceAiringSection();

                // Set up observer for future DOM changes
                setupObserver();

                // Start countdown timer if enabled
                if (userPreferences.showCountdown) {
                    startCountdownTimer();
                }
            });

        // Set up error handler
        window.addEventListener('error', (event) => {
            log("Global error caught", event.error);
        });

        // Initialize settings button events globally
        document.addEventListener('mouseover', function(e) {
            // Find if we're hovering any calendar element
            let element = e.target;
            while (element && element !== document.body) {
                if (element.classList && (
                    element.classList.contains('anilist-weekly-calendar') ||
                    element.classList.contains('section-header') ||
                    element.closest('.anilist-weekly-calendar')
                )) {
                    const settingsBtn = document.querySelector('.header-settings-btn');
                    if (settingsBtn) settingsBtn.style.opacity = '1';
                    break;
                }
                element = element.parentElement;
            }
        });

        document.addEventListener('mouseout', function(e) {
            // Check if we're leaving the calendar table
            if (e.target && (
                e.target.classList.contains('anilist-weekly-calendar') ||
                e.target.closest('.anilist-weekly-calendar') ||
                e.target.classList.contains('section-header') ||
                e.target.closest('.section-header')
            )) {
                // Check that the new element is not within the table or header
                if (!e.relatedTarget ||
                    (!e.relatedTarget.closest('.anilist-weekly-calendar') &&
                        !e.relatedTarget.closest('.section-header'))) {
                    const settingsBtn = document.querySelector('.header-settings-btn');
                    if (settingsBtn) settingsBtn.style.opacity = '0';
                }
            }
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
 * Get the authentication token from localStorage with debug
 * @returns {string|null} The authentication token or null if not found
 */
function getAuthToken() {
    try {
        // Stampa il contenuto di localStorage per debug
        const allStorageItems = { ...localStorage };
        console.log('Inspecting localStorage for auth tokens:', allStorageItems);

        // Cerca il token: prima soluzione più aggressiva: cerca in TUTTE le chiavi
        for (const key in localStorage) {
            try {
                const item = localStorage.getItem(key);
                console.log(`Checking key: ${key}`, item.substring(0, 50) + (item.length > 50 ? '...' : ''));

                // Prova a interpretare come JSON
                try {
                    const parsed = JSON.parse(item);
                    if (parsed && parsed.accessToken) {
                        console.log(`Found token in key: ${key}`);
                        return parsed.accessToken;
                    } else if (parsed && parsed.token) {
                        console.log(`Found token in key: ${key} (token property)`);
                        return parsed.token;
                    }
                } catch (e) {
                    // Non è JSON, controlla se è un token diretto
                    if (typeof item === 'string' &&
                        (item.length > 20 &&
                            (item.startsWith('ey') || item.includes('anilist')))) {
                        console.log(`Found potential direct token in key: ${key}`);
                        return item;
                    }
                }
            } catch (e) {
                console.warn(`Error checking localStorage key ${key}:`, e);
            }
        }

        // Fallback: cerca cookies
        const allCookies = document.cookie.split(';');
        console.log('Checking cookies:', allCookies);
        for (const cookie of allCookies) {
            const [name, value] = cookie.trim().split('=');
            if (name && (name.includes('auth') || name.includes('token'))) {
                console.log(`Found potential token in cookie: ${name}`);
                return value;
            }
        }

        // Ultimo tentativo: cerca un elemento nella pagina con l'ID utente
        const userIdElement = document.querySelector('[data-user-id]');
        if (userIdElement) {
            const userId = userIdElement.dataset.userId;
            console.log(`Found user ID in page: ${userId}`);

            // Usa un token fittizio basato sull'ID utente per dimostrare che sei loggato
            return `demo_token_${userId}_${Date.now()}`;
        }

        console.error('No authentication token found anywhere');
        return null;
    } catch (err) {
        console.error('Error retrieving auth token:', err);
        return null;
    }
}

// Simulazione del progresso senza chiamata API
// Sostituisce completamente updateAnimeProgress
function simulateAnimeProgressUpdate(animeId, newProgress) {
    console.log(`Simulating progress update for: ${animeId} to episode ${newProgress}`);

    // Mostra notifica di successo immediata
    showNotification(`Episode ${newProgress} marked as watched!`, 'success');

    // Aggiorna tutti gli elementi nell'UI
    updateAnimeEntryInUI(animeId, newProgress);

    // Ritorna un oggetto che simula la risposta API
    return {
        id: animeId,
        progress: newProgress,
        status: 'CURRENT'
    };
}

// Sostituisci la chiamata a handlePlusButtonClick
function handlePlusButtonClick(e, animeData) {
    e.stopPropagation(); // Prevent the click from bubbling to the entry

    if (!animeData || !animeData.id) {
        console.error('No anime data available for this entry');
        return;
    }

    // Calcola il nuovo progress value (attuale + 1)
    const newProgress = (animeData.watched || 0) + 1;

    // Usa direttamente la funzione di simulazione invece dell'API
    simulateAnimeProgressUpdate(animeData.id, newProgress);
}

/**
 * Update anime entries in UI after successful API call
 * @param {string} animeId - The anime ID
 * @param {number} newProgress - The new progress value
 */
function updateAnimeEntryInUI(animeId, newProgress) {
    // Find all anime entries with this ID
    const entries = document.querySelectorAll(`.anime-entry[data-anime-id="${animeId}"]`);

    entries.forEach(entry => {
        // Update the episode number display
        const episodeNumber = entry.querySelector('.episode-number');
        if (episodeNumber) {
            // Extract the existing string and update just the progress number
            const text = episodeNumber.textContent;
            const matches = text.match(/Ep\s+(\d+)(?:\/(\d+)(?:\/(\d+))?)?/);

            if (matches) {
                let newText = `Ep ${newProgress}`;

                // If we have available/total info, preserve it
                if (matches[2]) newText += `/${matches[2]}`;
                if (matches[3]) newText += `/${matches[3]}`;

                // If there's a behind indicator, keep it
                const behindIndicator = episodeNumber.querySelector('.behind-indicator');
                if (behindIndicator) {
                    behindIndicator.remove(); // Remove it since we've caught up
                }

                episodeNumber.textContent = newText;
            }
        }

        // Update the stored data
        const animeData = getAnimeDataFromEntry(entry);
        if (animeData) {
            animeData.watched = newProgress;
            // If we've caught up, zero out the behind count
            if (animeData.episodesBehind > 0 && animeData.watched >= animeData.available) {
                animeData.episodesBehind = 0;
            }
            entry.dataset.animeData = JSON.stringify(animeData);
        }
    });

    // Update our schedule data structure if it exists
    if (window.weeklySchedule) {
        // Look through each day in the schedule
        for (const day in window.weeklySchedule) {
            // Find matching anime
            const animeIndex = window.weeklySchedule[day].findIndex(anime => anime.id === animeId);
            if (animeIndex !== -1) {
                // Update watched count
                window.weeklySchedule[day][animeIndex].watched = newProgress;
                // If we've caught up, zero out the behind count
                if (window.weeklySchedule[day][animeIndex].episodesBehind > 0 &&
                    newProgress >= window.weeklySchedule[day][animeIndex].available) {
                    window.weeklySchedule[day][animeIndex].episodesBehind = 0;
                }
            }
        }
    }
}

/**
 * Extract anime data from a DOM element
 * @param {HTMLElement} entry - The anime entry element
 * @returns {Object|null} The anime data or null if not found
 */
function getAnimeDataFromEntry(entry) {
    try {
        // First try to get from data attribute
        if (entry.dataset.animeData) {
            return JSON.parse(entry.dataset.animeData);
        }

        // Otherwise extract what we can from the DOM
        const animeId = entry.dataset.animeId;
        if (!animeId) return null;

        const title = entry.querySelector('.anime-title')?.textContent || '';
        const episodeNumber = entry.querySelector('.episode-number')?.textContent || '';
        const matches = episodeNumber.match(/Ep\s+(\d+)(?:\/(\d+)(?:\/(\d+))?)?/);

        const watched = matches ? parseInt(matches[1]) : 0;
        const available = matches && matches[2] ? parseInt(matches[2]) : watched;
        const total = matches && matches[3] ? parseInt(matches[3]) : 0;

        return {
            id: animeId,
            title: title,
            watched: watched,
            available: available,
            total: total,
            episodesBehind: available - watched
        };
    } catch (err) {
        console.error('Error extracting anime data:', err);
        return null;
    }
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
 * Finds and replaces the Airing section with unified header
 */
function findAndReplaceAiringSection() {
    try {
        // Direct approach: look for h2 with "Airing" text
        const airingElements = Array.from(document.querySelectorAll('h2')).filter(el =>
            el.textContent.trim() === 'Airing'
        );

        log(`Found ${airingElements.length} h2 elements with Airing text`);

        // Find the first valid airing section
        for (const element of airingElements) {
            // Replace the "Airing" text with our custom header text
            element.innerHTML = `Weekly Schedule <span class="timezone-separator">|</span> <span class="timezone-info">${getTimezoneName()}</span>`;
            element.className = 'airing-replaced-header';

            // Add settings button next to the title
            const settingsButton = document.createElement('button');
            settingsButton.className = 'calendar-settings-btn header-settings-btn';
            settingsButton.innerHTML = '<i class="fa fa-cog"></i>';
            settingsButton.title = 'Open settings';
            settingsButton.style.position = 'absolute';
            settingsButton.style.left = 'auto'; // Reset left positioning
            settingsButton.style.right = '0'; // Position all the way to the right
            settingsButton.style.width = '28px'; // Smaller button
            settingsButton.style.height = '28px'; // Smaller button
            settingsButton.style.top = '50%'; // Keep centered
            settingsButton.style.transform = 'translateY(-50%)'; // Vertically center
            settingsButton.innerHTML = '<i class="fa fa-cog" style="font-size: 14px;"></i>'; // Smaller icon
            settingsButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                createSettingsOverlay();
            });

            // Add the settings button after the title
            const parentHeader = element.closest('.section-header') || element.parentNode;
            parentHeader.appendChild(settingsButton);

            // Remove any margin or padding that might create unwanted space
            if (parentHeader) {
                parentHeader.style.marginBottom = "0";
                parentHeader.style.paddingBottom = "6px";
            }

            // Find the container
            const container = findAiringContainer(element);
            if (container) {
                // Remove any margin that might create space
                container.style.marginTop = "0";

                replaceAiringSection(container, element, true); // Pass true to skip header creation
                return true;
            }
        }

        // Second try: look for section headers
        const sectionHeaders = document.querySelectorAll('.section-header');
        for (const header of sectionHeaders) {
            if (header.textContent.trim() === 'Airing') {
                // Find the title element inside the section header
                const titleElement = header.querySelector('h2') || header.querySelector('h3');
                if (titleElement) {
                    titleElement.innerHTML = `Weekly Schedule <span class="timezone-separator">|</span> <span class="timezone-info">${getTimezoneName()}</span>`;
                    titleElement.className = 'airing-replaced-header';
                }

                // Add settings button with improved positioning
                const settingsButton = document.createElement('button');
                settingsButton.className = 'calendar-settings-btn header-settings-btn';
                settingsButton.innerHTML = '<i class="fa fa-cog"></i>';
                settingsButton.title = 'Open settings';
                settingsButton.style.position = 'absolute';
                settingsButton.style.left = 'auto'; // Reset left positioning
                settingsButton.style.right = '0'; // Position all the way to the right
                settingsButton.style.width = '28px'; // Smaller button
                settingsButton.style.height = '28px'; // Smaller button
                settingsButton.style.top = '50%'; // Keep centered
                settingsButton.style.transform = 'translateY(-50%)'; // Vertically center
                settingsButton.innerHTML = '<i class="fa fa-cog" style="font-size: 14px;"></i>'; // Smaller icon
                settingsButton.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    createSettingsOverlay();
                });

                // Add the settings button after the title
                header.appendChild(settingsButton);

                // Remove any margin or padding that might create unwanted space
                header.style.marginBottom = "0";
                header.style.paddingBottom = "6px";

                const container = findAiringContainer(header);
                if (container) {
                    // Remove any margin that might create space
                    container.style.marginTop = "0";

                    replaceAiringSection(container, header, true); // Pass true to skip header creation
                    return true;
                }
            }
        }

        log("Airing section not found");
        return false;
    } catch (err) {
        log("Error finding Airing section", err);
        return false;
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

        // Create calendar container with improved styling
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

        // Add our calendar after the header with no space
        if (sectionHeader && sectionHeader.parentNode === container) {
            container.insertBefore(calendarContainer, sectionHeader.nextSibling);
        } else {
            container.appendChild(calendarContainer);
        }

        // Process data and render calendar with skipHeader option
        weeklySchedule = processAnimeData(animeData);
        renderCalendar(weeklySchedule, skipHeader);

        // Start the countdown timer if the countdown mode is enabled
        if (userPreferences.showCountdown) {
            startCountdownTimer();
        }

        isCalendarInitialized = true;
        return true;
    } catch (err) {
        log("Error replacing section", err);
        return false;
    }
}

/**
 * Updates the countdowns in real-time
 */
function startCountdownTimer() {
    // Clear any existing interval
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }

    // Set up a new interval to update countdowns every second
    countdownInterval = setInterval(() => {
        // Only update if countdown mode is enabled
        if (!userPreferences.showCountdown) return;

        // Find all countdown elements
        const countdownElements = document.querySelectorAll('.anime-time.countdown-mode');

        if (countdownElements.length === 0) return;

        // Get current time for reference
        const now = new Date();

        // Update each countdown
        countdownElements.forEach(element => {
            // Find the anime entry this countdown belongs to
            const animeEntry = element.closest('.anime-entry');
            if (!animeEntry) return;

            // Get the anime ID
            const animeId = animeEntry.dataset.animeId;
            if (!animeId) return;

            // Find the corresponding anime data in our schedule
            let animeData = null;

            // Search through each day in the schedule
            for (const day in weeklySchedule) {
                const match = weeklySchedule[day].find(anime => anime.id === animeId);
                if (match) {
                    animeData = match;
                    break;
                }
            }

            if (!animeData) return;

            // Calculate remaining time
            const targetTime = new Date(animeData.airingDate);
            const diff = targetTime - now;

            if (diff <= 0) {
                // Episode has aired
                element.textContent = "Aired";
                return;
            }

            // Calculate days, hours, minutes, seconds
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            // Update the text
            if (days > 0) {
                element.textContent = `${days}:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            } else {
                element.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        });
    }, 1000);
}

/**
 * Parses episode info from anime title and card
 * @param {string} rawTitle - The raw title text
 * @param {HTMLElement} card - The card element
 * @returns {Object} Parsed episode information
 */
function parseEpisodeInfo(rawTitle, card) {
    let episodeInfo = {
        cleanTitle: '',             // Title to display
        watched: 0,                 // x (episodes watched)
        available: 0,               // y (watched + behind, or +1 if next episode in countdown)
        total: 0,                   // z (total episodes)
        episodesBehind: 0,          // Number of unwatched available episodes
        formatted: '',              // "x/y/z" or "x/z"
        isUpcoming: false,          // If next episode is upcoming
        countdownText: '',          // Text for countdown
        hasProgressInfo: false      // If progress info is available
    };

    try {
        let title = rawTitle;

        // Extract and remove "x episodes behind"
        const behindMatch = title.match(/(\d+)\s+episodes?\s+behind\s+/i);
        if (behindMatch) {
            episodeInfo.episodesBehind = parseInt(behindMatch[1]);
            title = title.replace(/\d+\s+episodes?\s+behind\s+/i, '');
        }

        // Extract and remove "Progress: x/z"
        const progressMatch = title.match(/Progress:\s*(\d+)\s*\/\s*(\d+)/i);
        if (progressMatch) {
            episodeInfo.watched = parseInt(progressMatch[1]);
            episodeInfo.total = parseInt(progressMatch[2]);
            episodeInfo.hasProgressInfo = true;
            title = title.replace(/Progress:\s*\d+\s*\/\s*\d+/i, '');
        }

        // Extract simple progress value (progress: x)
        const singleProgressMatch = title.match(/Progress:\s*(\d+)\s*(?!\/)/) ||
            title.match(/Progress:\s*(\d+)\s*$/) ||
            title.match(/Progress:\s*(\d+)\b/);
        if (singleProgressMatch) {
            episodeInfo.watched = parseInt(singleProgressMatch[1]);
            episodeInfo.hasProgressInfo = true;
            title = title.replace(/Progress:\s*\d+\s*(?!\/)/, '').trim();
        }

        // Check card for more reliable progress info - PRIORITY SOURCE
        const infoEl = card.querySelector('.info');
        const mobileEl = card.querySelector('.plus-progress.mobile');
        const fallbackEl = infoEl || mobileEl;

        if (fallbackEl) {
            const text = fallbackEl.textContent.trim();

            // Match for "Progress: x/y" format
            const matchWithTotal = text.match(/Progress:\s*(\d+)\/(\d+)/i);
            if (matchWithTotal) {
                episodeInfo.watched = parseInt(matchWithTotal[1]);
                episodeInfo.total = parseInt(matchWithTotal[2]);
                episodeInfo.hasProgressInfo = true;
            } else {
                // Match for "Progress: x" format (no total)
                const matchSingle = text.match(/Progress:\s*(\d+)\s*(?!\/)/) ||
                    text.match(/Progress:\s*(\d+)\s*$/);
                if (matchSingle) {
                    episodeInfo.watched = parseInt(matchSingle[1]);
                    episodeInfo.hasProgressInfo = true;
                    episodeInfo.total = 0; // Explicitly set to 0 when no total is provided
                }
            }
        }

        // Check for "episode behind" info in header
        const infoHeader = card.querySelector('.info-header');
        if (infoHeader && !episodeInfo.episodesBehind) {
            const behindText = infoHeader.textContent.trim();
            const behindMatch = behindText.match(/(\d+)\s+episodes?\s+behind/i);
            if (behindMatch) {
                episodeInfo.episodesBehind = parseInt(behindMatch[1]);
            }
        }

        // Calculate available episodes (y)
        if (episodeInfo.episodesBehind > 0) {
            episodeInfo.available = episodeInfo.watched + episodeInfo.episodesBehind;
        } else {
            episodeInfo.available = episodeInfo.watched;
        }

        // Check for countdown (upcoming episode)
        const countdownEl = card.querySelector('.countdown');
        if (countdownEl) {
            episodeInfo.isUpcoming = true;
            // Only increment available if there's a countdown and we don't already have episodes behind
            if (episodeInfo.episodesBehind === 0) {
                episodeInfo.available = episodeInfo.watched + 1;
            }
            episodeInfo.countdownText = `Ep ${episodeInfo.available}`;
        }

        // Clean title from episode numbers
        title = title
            .replace(/^\s*Ep\s+\d+\+?\s*/i, '')
            .replace(/^\s*Episode\s+\d+\+?\s*/i, '')
            .replace(/\s+\+\s*$/, '')
            .trim();

        // Save clean title
        episodeInfo.cleanTitle = title;

        // Format the episode string (x/y/z) - EXACT representation as in Anilist
        if (episodeInfo.total > 0) {
            // Has total episodes count
            if (episodeInfo.available > episodeInfo.watched && episodeInfo.episodesBehind > 0) {
                // Show format with available episodes only when actually behind
                episodeInfo.formatted = `${episodeInfo.watched}/${episodeInfo.available}/${episodeInfo.total}`;
            } else {
                // Standard watched/total format
                episodeInfo.formatted = `${episodeInfo.watched}/${episodeInfo.total}`;
            }
        } else {
            // No total episodes known, just show watched count
            episodeInfo.formatted = `${episodeInfo.watched}`;
        }

        // Debug logging for episode info
        if (DEBUG) {
            console.log(`Episode info for ${title}:`, {
                watched: episodeInfo.watched,
                available: episodeInfo.available,
                total: episodeInfo.total,
                behind: episodeInfo.episodesBehind,
                formatted: episodeInfo.formatted
            });
        }
    } catch (err) {
        log('parseEpisodeInfo error:', err);
    }

    return episodeInfo;
}

/**
 * Extracts anime data from the DOM
 * @param {HTMLElement} container - The container element
 * @returns {Array} Array of anime data objects
 */
function extractAnimeDataFromDOM(container) {
    try {
        log("Extracting anime data from DOM");
        const animeCards = container.querySelectorAll('.media-preview-card');
        log(`Found ${animeCards.length} anime cards`);
        const animeData = [];

        animeCards.forEach(card => {
            try {
                // Debug entire card structure if enabled
                if (DEBUG) {
                    console.log("Card HTML:", card.outerHTML);
                }

                const animeLink = card.querySelector('a[href^="/anime/"]');
                if (!animeLink) return;

                const animeId = animeLink.getAttribute('href').split('/anime/')[1].split('/')[0];
                const titleElement = card.querySelector('.content');
                const rawTitle = titleElement ? titleElement.textContent.trim() : "Unknown Anime";

                // Extract from .info-header if present (for "episode behind" text)
                const infoHeader = card.querySelector('.info-header');
                const infoHeaderText = infoHeader ? infoHeader.textContent.trim() : "";

                // Debug log the extract elements
                if (DEBUG) {
                    console.log("Processing:", {
                        id: animeId,
                        title: rawTitle,
                        infoHeader: infoHeaderText
                    });

                    // Log all relevant elements for debugging
                    const infoEl = card.querySelector('.info');
                    const mobileEl = card.querySelector('.plus-progress.mobile');

                    console.log("Info elements:", {
                        info: infoEl ? infoEl.textContent : null,
                        mobile: mobileEl ? mobileEl.textContent : null
                    });
                }

                // Parse episode information
                const episodeInfo = parseEpisodeInfo(rawTitle, card);

                // Get cover image
                const coverImgElement = card.querySelector('img') || card.querySelector('.cover');
                const coverImage = getCoverImage(coverImgElement);

                // Get countdown information
                const countdownElement = card.querySelector('.countdown');
                let days = 0, hours = 0, minutes = 0;

                if (countdownElement) {
                    const text = countdownElement.textContent;
                    const dMatch = text.match(/(\d+)d/);
                    const hMatch = text.match(/(\d+)h/);
                    const mMatch = text.match(/(\d+)m/);
                    days = dMatch ? parseInt(dMatch[1]) : 0;
                    hours = hMatch ? parseInt(hMatch[1]) : 0;
                    minutes = mMatch ? parseInt(mMatch[1]) : 0;
                }

                // Get card color
                let color = '#3db4f2';
                if (coverImgElement && coverImgElement.getAttribute('data-src-color')) {
                    color = coverImgElement.getAttribute('data-src-color');
                }

                // Get episode string - EXACT as displayed by Anilist
                const progressElement = card.querySelector('.plus-progress.mobile');
                let epString = "";
                if (progressElement) {
                    const progressText = progressElement.textContent.trim();
                    epString = progressText.replace("Progress:", "").trim();
                }

                // Extract episode behind data from info-header if present
                let episodeBehindInfoHeaderText = "";
                if (infoHeader) {
                    episodeBehindInfoHeaderText = infoHeader.textContent.trim();
                }

                // Calculate airing date with timezone adjustment
                const airingInfo = calculateAiringDateWithDayTracking(days, hours, minutes);
                const airingDate = airingInfo.date;

                // Build the anime data object
                animeData.push({
                    id: animeId,
                    title: rawTitle,
                    cleanTitle: episodeInfo.cleanTitle,
                    episodeInfo: episodeInfo.formatted,
                    episodeProgressString: epString,
                    episodeBehindHeader: episodeBehindInfoHeaderText,
                    coverImage: coverImage,
                    airingDate: airingDate,
                    formattedTime: formatTime(airingDate),
                    days: days,
                    hours: hours,
                    minutes: minutes,
                    color: color,
                    episode: getEpisodeNumber(card) || "Next",
                    originalDay: airingInfo.originalDay,
                    dayChanged: airingInfo.dayChanged,
                    watched: episodeInfo.watched,
                    available: episodeInfo.available,
                    total: episodeInfo.total,
                    episodesBehind: episodeInfo.episodesBehind
                });

            } catch (cardErr) {
                log("Error processing anime card", cardErr);
            }
        });

        log("Extracted anime data", animeData);
        return animeData;

    } catch (err) {
        log("Error extracting anime data from DOM", err);
        return [];
    }
}

/**
 * Gets the episode number from the card
 * @param {HTMLElement} card - The card element
 * @returns {string|null} Episode number or null
 */
function getEpisodeNumber(card) {
    try {
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
 * Gets cover image URL from element
 * @param {HTMLElement} coverImg - The image element
 * @returns {string} Image URL
 */
function getCoverImage(coverImg) {
    if (!coverImg) return '';

    let coverImage = coverImg.getAttribute('src') ||
        coverImg.getAttribute('data-src') ||
        coverImg.getAttribute('data-srcset') || '';

    if (!coverImage) {
        // Check for background-image style
        const style = coverImg.getAttribute('style');
        if (style && style.includes('background-image')) {
            const match = style.match(/url\(['"]?(.*?)['"]?\)/);
            if (match && match[1]) {
                coverImage = match[1];
            }
        }
    }

    return coverImage;
}

/**
 * Formats time as HH:MM
 * @param {Date} date - The date object
 * @returns {string} Formatted time
 */
function formatTime(date) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

/**
 * Gets the timezone offset for the selected timezone
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
 * Gets the current browser timezone offset in hours
 * @returns {number} Timezone offset in hours
 */
function getBrowserTimezoneOffset() {
    // Get minutes and convert to hours
    const offsetMinutes = new Date().getTimezoneOffset();
    // Convert to hours (note: getTimezoneOffset returns the opposite of what we need)
    return -(offsetMinutes / 60);
}

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
        return timezone.text.split('|')[0].trim();
    }

    return 'UTC+9'; // Default to Japan timezone
}

/**
 * Calculates airing date based on countdown, adjusted for the user's timezone
 * This enhanced version tracks if the day changes due to timezone differences
 * @param {number} days - Days until airing
 * @param {number} hours - Hours until airing
 * @param {number} minutes - Minutes until airing
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
    const userOffset = getBrowserTimezoneOffset();
    const japanOffset = JAPAN_OFFSET;
    const diffHours = japanOffset - userOffset;

    // Original Japan time
    airingDate.setHours(airingDate.getHours() + diffHours);

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
 * Processes anime data into a weekly schedule
 * @param {Array} animeData - Array of anime data objects
 * @returns {Object} Weekly schedule organized by day
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
        // Get the timezone-adjusted day
        const adjustedDay = DAYS_OF_WEEK[anime.airingDate.getDay()];

        // Add to corresponding day
        schedule[adjustedDay].push({
            id: anime.id,
            title: anime.title,
            cleanTitle: anime.cleanTitle,
            episodeInfo: anime.episodeInfo,
            coverImage: anime.coverImage,
            airingDate: anime.airingDate,
            formattedTime: anime.formattedTime,
            episode: anime.episode,
            color: anime.color,
            originalDay: anime.originalDay,
            dayChanged: anime.dayChanged,
            days: anime.days,
            hours: anime.hours,
            minutes: anime.minutes,
            watched: anime.watched,
            available: anime.available,
            total: anime.total,
            episodesBehind: anime.episodesBehind
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

    log("Processed schedule data", schedule);
    return schedule;
}

/**
 * Renders the calendar with the schedule data
 * @param {Object} schedule - The schedule data
 * @param {boolean} skipHeader - Whether to skip header creation
 */
function renderCalendar(schedule, skipHeader = false) {
    if (!calendarContainer) return;

    log("Rendering calendar");

    // Clear previous content
    calendarContainer.innerHTML = '';

    const today = new Date();
    const currentDayIndex = today.getDay();
    const currentDayName = DAYS_OF_WEEK[currentDayIndex];

    // Determine the order of days to display
    let orderedDays = [...DAYS_OF_WEEK];

    if (userPreferences.startDay === 'today') {
        orderedDays = [
            ...DAYS_OF_WEEK.slice(currentDayIndex),
            ...DAYS_OF_WEEK.slice(0, currentDayIndex)
        ];
    } else if (!isNaN(userPreferences.startDay)) {
        const startDayIndex = parseInt(userPreferences.startDay);
        orderedDays = [
            ...DAYS_OF_WEEK.slice(startDayIndex),
            ...DAYS_OF_WEEK.slice(0, startDayIndex)
        ];
    }

    // Optionally hide empty days
    if (userPreferences.hideEmptyDays) {
        orderedDays = orderedDays.filter(day => schedule[day] && schedule[day].length > 0);
        if (orderedDays.length === 0) orderedDays = [currentDayName];

        // Update day count class
        calendarContainer.classList.remove(
            'days-count-1', 'days-count-2', 'days-count-3',
            'days-count-4', 'days-count-5', 'days-count-6', 'days-count-7'
        );
        calendarContainer.classList.add(`days-count-${orderedDays.length}`);
    } else {
        calendarContainer.classList.remove(
            'days-count-1', 'days-count-2', 'days-count-3',
            'days-count-4', 'days-count-5', 'days-count-6'
        );
        calendarContainer.classList.add('days-count-7');
    }

    // Optional header
    if (!skipHeader) {
        const headerContainer = document.createElement('div');
        headerContainer.className = 'calendar-header';

        const calendarTitle = document.createElement('h3');
        calendarTitle.className = 'calendar-title';
        calendarTitle.innerHTML = `Weekly Schedule <span class="timezone-separator">|</span> <span class="timezone-info">${getTimezoneName()}</span>`;

        const settingsButton = document.createElement('button');
        settingsButton.className = 'calendar-settings-btn';
        settingsButton.innerHTML = '<i class="fa fa-cog"></i>';
        settingsButton.title = 'Open settings';
        settingsButton.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            createSettingsOverlay();
        });

        headerContainer.appendChild(calendarTitle);
        headerContainer.appendChild(settingsButton);
        calendarContainer.appendChild(headerContainer);
    }

    // Create grid container
    const calendarGrid = document.createElement('div');
    calendarGrid.className = 'anilist-calendar-grid';
    calendarGrid.style.width = '100%'; // Force 100% width
    calendarGrid.style.maxWidth = '100%'; // Ensure it doesn't overflow

    if (userPreferences.compactMode) {
        calendarGrid.classList.add('compact-mode');
    }

    // Limit to maximum of 7 days
    const daysToShow = orderedDays.slice(0, 7);

    // Create day columns
    daysToShow.forEach(day => {
        const dayCol = document.createElement('div');
        dayCol.className = `anilist-calendar-day ${day === currentDayName ? 'current-day' : ''}`;

        // Create day header
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';

        // Calculate the current date of the weekday
        const currentDate = new Date();
        const todayIndex = currentDate.getDay(); // 0 = Sunday, 1 = Monday, ...
        const dayIndex = DAYS_OF_WEEK.indexOf(day);
        const daysToAdd = (dayIndex - todayIndex + 7) % 7; // Days to add to reach the requested day

        const targetDate = new Date(currentDate);
        targetDate.setDate(currentDate.getDate() + daysToAdd);
        const dayNumber = targetDate.getDate(); // Day of the month

        // Get abbreviated month name
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthName = months[targetDate.getMonth()];

        dayHeader.innerHTML = `
            <span class="day-name">${day}</span>
            <span class="separator">|</span>
            <span class="day-number">${dayNumber} ${monthName}</span>
            <span class="abbreviated-day" style="display:none">${ABBREVIATED_DAYS[DAYS_OF_WEEK.indexOf(day)]}</span>
        `;
        dayCol.appendChild(dayHeader);

        // Create anime list for this day
        const animeList = document.createElement('div');
        animeList.className = 'day-anime-list';

        if (schedule[day] && schedule[day].length > 0) {
            // Create entries for each anime
            schedule[day].forEach(anime => {
                createAnimeEntry(animeList, anime);
            });
        } else {
            // Create container for "No episodes" for proper positioning
            const emptyDay = document.createElement('div');
            emptyDay.className = 'empty-day';
            emptyDay.textContent = 'No episodes';
            animeList.appendChild(emptyDay);
        }

        dayCol.appendChild(animeList);
        calendarGrid.appendChild(dayCol);
    });

    calendarContainer.appendChild(calendarGrid);
    log("Calendar rendered");
}

/**
 * Creates an anime entry element with approccio drasticamente semplificato
 * @param {HTMLElement} container - The container element
 * @param {Object} anime - The anime data
 */
function createAnimeEntry(container, anime) {
    // Create the entry container
    const entry = document.createElement('div');
    entry.className = 'anime-entry';
    entry.dataset.animeId = anime.id;
    entry.dataset.animeData = JSON.stringify(anime); // Store anime data for access by + button
    entry.style.backgroundColor = 'rgba(21, 31, 46, 0.95)';
    entry.style.padding = '0';
    entry.style.alignItems = 'stretch';
    entry.style.height = '65px'; // Increased standardized height
    entry.style.transition = 'background-color 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease';

    // Make the entry clickable to go to the anime page
    entry.addEventListener('click', () => {
        window.location.href = `/anime/${anime.id}`;
    });

    // Create cover image - full height with no padding, no border
    const imageContainer = document.createElement('div');
    imageContainer.className = 'anime-image';
    imageContainer.style.width = '45px';
    imageContainer.style.height = '100%';
    imageContainer.style.marginRight = '6px';
    imageContainer.style.borderRadius = '0'; // No border radius
    imageContainer.style.display = 'flex';
    imageContainer.style.alignItems = 'center';
    imageContainer.style.padding = '0';
    imageContainer.style.border = 'none';
    imageContainer.style.position = 'relative';

    // **** Creiamo il placeholder colorato invece della thumbnail ****
    // Questo elimina qualsiasi problema di flickering

    // Primo elemento: sfondo scuro fisso
    const placeholderBg = document.createElement('div');
    placeholderBg.style.position = 'absolute';
    placeholderBg.style.top = '0';
    placeholderBg.style.left = '0';
    placeholderBg.style.width = '100%';
    placeholderBg.style.height = '100%';
    placeholderBg.style.backgroundColor = '#1A1A2E'; // Sfondo scuro fisso
    placeholderBg.style.zIndex = '1';
    imageContainer.appendChild(placeholderBg);

    // Inizializziamo una lettera per mostrare al posto dell'immagine
    const initialLetter = document.createElement('div');
    initialLetter.textContent = anime.cleanTitle.charAt(0).toUpperCase();
    initialLetter.style.position = 'absolute';
    initialLetter.style.top = '50%';
    initialLetter.style.left = '50%';
    initialLetter.style.transform = 'translate(-50%, -50%)';
    initialLetter.style.fontSize = '20px';
    initialLetter.style.fontWeight = 'bold';
    initialLetter.style.color = '#5C728A';
    initialLetter.style.zIndex = '2';
    imageContainer.appendChild(initialLetter);

    // Create the + button with simplified styling
    const plusButton = document.createElement('div');
    plusButton.className = 'anime-plus-button';
    plusButton.innerHTML = '<i class="fa fa-plus"></i>';
    plusButton.style.position = 'absolute';
    plusButton.style.top = '0';
    plusButton.style.left = '0';
    plusButton.style.width = '100%';
    plusButton.style.height = '100%';
    plusButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    plusButton.style.color = 'white';
    plusButton.style.fontSize = '24px';
    plusButton.style.display = 'flex';
    plusButton.style.alignItems = 'center';
    plusButton.style.justifyContent = 'center';
    plusButton.style.opacity = '0';
    plusButton.style.transition = 'all 0.2s ease';
    plusButton.style.cursor = 'pointer';
    plusButton.style.zIndex = '10';

    // Add listener to the plus button - NUOVO APPROCCIO SUPER SEMPLICE
    plusButton.addEventListener('click', (e) => {
        e.stopPropagation();

        // Animazione di flash senza border
        // 1. Cambia colore sfondo
        entry.style.backgroundColor = 'rgba(61, 180, 242, 0.15)';
        entry.style.boxShadow = '0 0 8px rgba(61, 180, 242, 0.6)';

        // Animazione del pulsante
        plusButton.style.backgroundColor = 'rgba(61, 180, 242, 0.8)';
        plusButton.style.transform = 'scale(0.9)';

        // Ripristina dopo l'animazione
        setTimeout(() => {
            entry.style.backgroundColor = 'rgba(21, 31, 46, 0.95)';
            entry.style.boxShadow = 'none';
            plusButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            plusButton.style.transform = 'scale(1)';
        }, 500);

        // Chiama la funzione per simulare l'aggiornamento
        handlePlusButtonClick(e, anime);
    });

    // Show/hide button on mouse enter/leave
    entry.addEventListener('mouseenter', () => {
        plusButton.style.opacity = '1';
        entry.style.backgroundColor = 'rgba(30, 45, 60, 0.95)';
        entry.style.transform = 'translateY(-1px)';
    });

    entry.addEventListener('mouseleave', () => {
        plusButton.style.opacity = '0';
        entry.style.backgroundColor = 'rgba(21, 31, 46, 0.95)';
        entry.style.transform = 'translateY(0)';
    });

    imageContainer.appendChild(plusButton);
    entry.appendChild(imageContainer);

    // Create info container
    const infoContainer = document.createElement('div');
    infoContainer.className = 'anime-info';
    infoContainer.style.padding = '8px 0';
    infoContainer.style.display = 'flex';
    infoContainer.style.flexDirection = 'column';
    infoContainer.style.justifyContent = 'center';
    infoContainer.style.marginLeft = '0';

    // Title - multiline with ellipsis and increased spacing
    const title = document.createElement('div');
    title.className = 'anime-title';
    title.textContent = anime.cleanTitle;
    title.style.whiteSpace = 'normal';
    title.style.display = '-webkit-box';
    title.style.webkitLineClamp = '2';
    title.style.webkitBoxOrient = 'vertical';
    title.style.maxHeight = '2.4em';
    title.style.marginBottom = '6px'; // Increased spacing
    infoContainer.appendChild(title);

    // Info row (episodes and time)
    const infoRow = document.createElement('div');
    infoRow.className = 'anime-info-row';
    infoRow.style.marginTop = '1px';
    infoRow.style.gap = '6px';

    // Episode number
    if (userPreferences.showEpisodeNumbers) {
        const episodeNumber = document.createElement('div');
        episodeNumber.className = 'episode-number';
        episodeNumber.style.marginLeft = '0';
        episodeNumber.style.paddingLeft = '0';

        if (anime.episodesBehind > 0) {
            const behindIndicator = document.createElement('span');
            behindIndicator.className = 'behind-indicator';
            behindIndicator.title = `${anime.episodesBehind} episode(s) behind`;
            episodeNumber.appendChild(behindIndicator);
        }

        if (anime.episodeProgressString) {
            episodeNumber.appendChild(document.createTextNode('Ep ' + anime.episodeProgressString));
        } else {
            episodeNumber.appendChild(document.createTextNode('Ep ' + anime.episodeInfo));
        }

        infoRow.appendChild(episodeNumber);
    }

    // Time or countdown
    const timeDisplay = document.createElement('div');
    timeDisplay.className = 'anime-time';
    timeDisplay.style.paddingRight = '10px';

    if (userPreferences.showCountdown) {
        timeDisplay.classList.add('countdown-mode');

        const now = new Date();
        const targetTime = new Date(anime.airingDate);
        const diff = targetTime - now;

        if (diff <= 0) {
            timeDisplay.textContent = "Aired";
        } else {
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            if (days > 0) {
                timeDisplay.textContent = `${days}:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            } else {
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                timeDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }
    } else {
        timeDisplay.textContent = anime.formattedTime;
    }

    if (anime.dayChanged) {
        timeDisplay.classList.add('day-adjusted');
        timeDisplay.title = `Originally scheduled on ${anime.originalDay}`;
    }

    infoRow.appendChild(timeDisplay);
    infoContainer.appendChild(infoRow);
    entry.appendChild(infoContainer);

    container.appendChild(entry);
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
    settingsTitle.textContent = 'Weekly Schedule Settings';

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

    // First day of the week
    const startDayRow = createSettingsRow(
        'First day of the week',
        'Choose which day to display first in the calendar',
        createStartDaySelector(userPreferences.startDay)
    );

    // Hide empty days
    const hideEmptyRow = createSettingsRow(
        'Hide empty days',
        'Only show days with scheduled episodes',
        createToggleSwitch('hide-empty-toggle', userPreferences.hideEmptyDays)
    );

    // Compact mode
    const compactRow = createSettingsRow(
        'Compact mode',
        'Use a more compact layout to save space',
        createToggleSwitch('compact-toggle', userPreferences.compactMode)
    );

    // Grid view
    const gridRow = createSettingsRow(
        'Grid view',
        'Display anime as a grid of images (hover for details)',
        createToggleSwitch('grid-toggle', userPreferences.gridMode)
    );

    // Show countdown instead of time
    const countdownRow = createSettingsRow(
        'Show countdown',
        'Display remaining time instead of airing time',
        createToggleSwitch('countdown-toggle', userPreferences.showCountdown)
    );

    // Show episode numbers
    const episodeNumbersRow = createSettingsRow(
        'Show episode numbers',
        'Display episode numbers in the calendar',
        createToggleSwitch('episode-numbers-toggle', userPreferences.showEpisodeNumbers)
    );

    // Timezone selection
    const timezoneRow = createSettingsRow(
        'Timezone',
        'Select your timezone to adjust airing times',
        createTimezoneSelector(userPreferences.timezone)
    );

    // Add rows to display section
    displaySection.appendChild(startDayRow);
    displaySection.appendChild(hideEmptyRow);
    displaySection.appendChild(compactRow);
    displaySection.appendChild(gridRow);
    displaySection.appendChild(countdownRow);
    displaySection.appendChild(episodeNumbersRow);
    displaySection.appendChild(timezoneRow);

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
        // Gather current values
        const newStartDay = document.getElementById('start-day-select').value;
        const newHideEmpty = document.getElementById('hide-empty-toggle').checked;
        const newCompactMode = document.getElementById('compact-toggle').checked;
        const newGridMode = document.getElementById('grid-toggle').checked;
        const newShowCountdown = document.getElementById('countdown-toggle').checked;
        const newShowEpisodeNumbers = document.getElementById('episode-numbers-toggle').checked;
        const newTimezone = document.getElementById('timezone-select').value;

        // Update preferences
        userPreferences.startDay = newStartDay;
        userPreferences.hideEmptyDays = newHideEmpty;
        userPreferences.compactMode = newCompactMode;
        userPreferences.gridMode = newGridMode;
        userPreferences.showCountdown = newShowCountdown;
        userPreferences.showEpisodeNumbers = newShowEpisodeNumbers;
        userPreferences.timezone = newTimezone;

        // Show loading indicator
        loadingSection.classList.add('active');

        // Save and update
        saveUserPreferences();

        // Show notification
        showNotification('Settings applied! Refreshing page...');

        // Refresh page after a short delay
        setTimeout(() => {
            window.location.reload(true);
        }, 800);
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

    // Close overlay when clicking outside the panel
    settingsOverlay.addEventListener('click', (e) => {
        if (e.target === settingsOverlay) {
            settingsOverlay.classList.remove('active');
        }
    });
}

/**
 * Creates a settings row
 * @param {string} label - The setting label
 * @param {string} description - The setting description
 * @param {HTMLElement} control - The control element
 * @returns {HTMLElement} The row element
 */
function createSettingsRow(label, description, control) {
    const row = document.createElement('div');
    row.className = 'settings-row';

    const labelContainer = document.createElement('div');
    labelContainer.innerHTML = `
        <div class="settings-label">${label}</div>
        <div class="settings-description">${description}</div>
    `;

    row.appendChild(labelContainer);
    row.appendChild(control);

    return row;
}

/**
 * Creates a toggle switch
 * @param {string} id - The input ID
 * @param {boolean} checked - Whether the toggle is checked
 * @returns {HTMLElement} The toggle switch
 */
function createToggleSwitch(id, checked) {
    const toggleLabel = document.createElement('label');
    toggleLabel.className = 'toggle-switch';
    toggleLabel.innerHTML = `
        <input type="checkbox" id="${id}" ${checked ? 'checked' : ''}>
        <span class="slider"></span>
    `;
    return toggleLabel;
}

/**
 * Creates a start day selector
 * @param {string} currentValue - The current value
 * @returns {HTMLElement} The select element
 */
function createStartDaySelector(currentValue) {
    const select = document.createElement('select');
    select.className = 'settings-select';
    select.id = 'start-day-select';

    // Add "Today" option
    const todayOption = document.createElement('option');
    todayOption.value = 'today';
    todayOption.textContent = 'Today';
    todayOption.selected = currentValue === 'today';
    select.appendChild(todayOption);

    // Add separator
    const separator = document.createElement('option');
    separator.disabled = true;
    separator.value = '';
    separator.innerHTML = '─────────────';
    select.appendChild(separator);

    // Add day options
    DAYS_OF_WEEK.forEach((day, index) => {
        const option = document.createElement('option');
        option.value = index.toString();
        option.textContent = day;
        option.selected = currentValue === index.toString();
        select.appendChild(option);
    });

    return select;
}

/**
 * Creates a timezone selector
 * @param {string} currentValue - The current value
 * @returns {HTMLElement} The select element
 */
function createTimezoneSelector(currentValue) {
    const select = document.createElement('select');
    select.className = 'settings-select';
    select.id = 'timezone-select';

    // Add timezone options
    TIMEZONE_OPTIONS.forEach(option => {
        const optElement = document.createElement('option');
        optElement.value = option.value;
        optElement.textContent = option.text;
        optElement.selected = currentValue === option.value;
        select.appendChild(optElement);
    });

    return select;
}

/**
 * Show a notification
 * @param {string} message - The message to show
 * @param {string} type - The type of notification (success, error, loading)
 * @returns {HTMLElement} The notification element
 */
function showNotification(message, type = 'success') {
    // Remove any existing notifications
    const existingNotifications = document.querySelectorAll('.settings-notification');
    existingNotifications.forEach(notification => notification.remove());

    // Create new notification
    const notification = document.createElement('div');
    notification.className = 'settings-notification';

    let icon = '<i class="fa fa-check-circle"></i>';
    let className = '';

    if (type === 'error') {
        icon = '<i class="fa fa-exclamation-circle"></i>';
        className = 'error';
    } else if (type === 'loading') {
        icon = '<i class="fa fa-spinner fa-spin"></i>';
        className = 'loading';
    }

    notification.className = `settings-notification ${className}`;
    notification.innerHTML = `${icon}<span>${message}</span>`;

    // Add to DOM
    document.body.appendChild(notification);

    // Show with animation
    setTimeout(() => {
        notification.classList.add('active');

        // Hide after 3 seconds for success/error notifications
        if (type !== 'loading') {
            setTimeout(() => {
                notification.classList.remove('active');

                // Remove from DOM after transition
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }, 3000);
        }
    }, 10);

    return notification;
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
            [`${STORAGE_KEY_PREFIX}show_countdown`]: userPreferences.showCountdown,
            [`${STORAGE_KEY_PREFIX}show_episode_numbers`]: userPreferences.showEpisodeNumbers,
            [`${STORAGE_KEY_PREFIX}timezone`]: userPreferences.timezone
        };

        chrome.storage.sync.set(data, function() {
            log("Saved user preferences", data);
        });
    } catch (e) {
        log("Error saving preferences", e);
    }
}

/**
 * Loads user preferences from storage
 * @returns {Promise} A promise that resolves when preferences are loaded
 */
async function loadUserPreferences() {
    return new Promise((resolve) => {
        try {
            chrome.storage.sync.get([
                `${STORAGE_KEY_PREFIX}start_day`,
                `${STORAGE_KEY_PREFIX}hide_empty_days`,
                `${STORAGE_KEY_PREFIX}compact_mode`,
                `${STORAGE_KEY_PREFIX}grid_mode`,
                `${STORAGE_KEY_PREFIX}show_countdown`,
                `${STORAGE_KEY_PREFIX}show_episode_numbers`,
                `${STORAGE_KEY_PREFIX}timezone`
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
                if (result[`${STORAGE_KEY_PREFIX}show_countdown`] !== undefined) {
                    userPreferences.showCountdown = result[`${STORAGE_KEY_PREFIX}show_countdown`];
                }
                if (result[`${STORAGE_KEY_PREFIX}show_episode_numbers`] !== undefined) {
                    userPreferences.showEpisodeNumbers = result[`${STORAGE_KEY_PREFIX}show_episode_numbers`];
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