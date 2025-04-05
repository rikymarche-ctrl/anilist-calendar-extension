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
 * Updates the progress on AniList via API
 * @param {string} animeId - The anime ID
 * @param {number} progress - The new progress (episodes watched)
 * @returns {Promise} A promise that resolves when the update is complete
 */
async function updateAniListProgress(animeId, progress) {
    try {
        // Check if we have an access token
        const token = await getAniListToken();

        if (!token) {
            throw new Error('Not logged in to AniList');
        }

        // GraphQL mutation to update progress
        const query = `
            mutation ($mediaId: Int, $progress: Int) {
                SaveMediaListEntry (mediaId: $mediaId, progress: $progress) {
                    id
                    progress
                }
            }
        `;

        const variables = {
            mediaId: parseInt(animeId),
            progress: progress
        };

        // Make the API request
        const response = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                query: query,
                variables: variables
            })
        });

        const data = await response.json();

        if (data.errors) {
            throw new Error(data.errors[0].message);
        }

        return data.data.SaveMediaListEntry;
    } catch (error) {
        log('Error updating AniList progress', error);
        throw error;
    }
}

/**
 * Gets the AniList access token from cookies or localStorage
 * @returns {Promise<string|null>} The access token or null if not found
 */
async function getAniListToken() {
    try {
        // Try to get token from cookies first
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'access_token') {
                return decodeURIComponent(value);
            }
        }

        // If not in cookies, try localStorage
        const token = localStorage.getItem('auth') || localStorage.getItem('access_token');
        if (token) {
            // If stored as JSON, parse it
            try {
                const parsed = JSON.parse(token);
                return parsed.access_token || parsed.token || null;
            } catch (e) {
                // Not JSON, return as is
                return token;
            }
        }

        // Not found
        return null;
    } catch (error) {
        log('Error getting AniList token', error);
        return null;
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

                // Start countdown timer if enabled
                if (userPreferences.showCountdown) {
                    startCountdownTimer();
                }
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
            settingsButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                createSettingsOverlay();
            });

            // Add the settings button after the title
            const parentHeader = element.closest('.section-header') || element.parentNode;
            parentHeader.appendChild(settingsButton);

            // Find the container
            const container = findAiringContainer(element);
            if (container) {
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

                    // Add settings button with improved positioning
                    const settingsButton = document.createElement('button');
                    settingsButton.className = 'calendar-settings-btn header-settings-btn';
                    settingsButton.innerHTML = '<i class="fa fa-cog"></i>';
                    settingsButton.title = 'Open settings';
                    settingsButton.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        createSettingsOverlay();
                    });

                    // Add the settings button after the title
                    header.appendChild(settingsButton);
                }

                const container = findAiringContainer(header);
                if (container) {
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

        // Add our calendar after the header
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
 * Parses episode information from the anime title and content
 * @param {string} title - The anime title that might contain episode information
 * @param {Element} card - The anime card element that contains additional information
 * @returns {Object} Parsed episode information
 */
function parseEpisodeInfo(title, card) {
    // Initialize episode info
    let episodeInfo = {
        cleanTitle: title,
        watched: 0,
        available: 0,
        total: 0,
        episodesBehind: 0,
        formatted: ''
    };

    try {
        // Extract "episodes behind" information
        const behindMatch = title.match(/(\d+)\s+episode(?:s)?\s+behind\s+(.+?)(?:\s+Progress:|$)/i);
        if (behindMatch) {
            episodeInfo.episodesBehind = parseInt(behindMatch[1]);
            // Update clean title by removing the "episodes behind" part
            episodeInfo.cleanTitle = episodeInfo.cleanTitle.replace(/\d+\s+episode(?:s)?\s+behind\s+/i, '');
        }

        // Extract progress information (x/y)
        const progressMatch = title.match(/Progress:\s*(\d+)\/(\d+)/i);
        if (progressMatch) {
            episodeInfo.watched = parseInt(progressMatch[1]);
            episodeInfo.total = parseInt(progressMatch[2]);

            // Clean up title by removing the progress part
            episodeInfo.cleanTitle = episodeInfo.cleanTitle
                .replace(/Progress:\s*\d+\/\d+/i, '')
                .replace(/\s+$/, ''); // Trim trailing spaces
        }

        // If we have a progress element in the card, use it (it's more reliable)
        const progressElement = card.querySelector('.info');
        if (progressElement) {
            const progressText = progressElement.textContent.trim();
            const progressCardMatch = progressText.match(/Progress:\s*(\d+)\/(\d+)/i);
            if (progressCardMatch) {
                episodeInfo.watched = parseInt(progressCardMatch[1]);
                episodeInfo.total = parseInt(progressCardMatch[2]);
            }
        }

        // Calculate available episodes
        if (episodeInfo.episodesBehind > 0) {
            episodeInfo.available = episodeInfo.watched + episodeInfo.episodesBehind;
        } else {
            episodeInfo.available = episodeInfo.watched;
        }

        // Clean title further - remove various patterns from title
        episodeInfo.cleanTitle = episodeInfo.cleanTitle
            .replace(/\s+Ep\s+\d+(?:\+)?/i, '') // Remove "Ep X" or "Ep X+"
            .replace(/\s+Episode\s+\d+(?:\+)?/i, '') // Remove "Episode X" or "Episode X+"
            .replace(/\s+\+\s*$/, '') // Remove "+" at the end of title
            .replace(/\s+\+$/, '') // Remove trailing "+" without space
            .trim();

        // Format episode information
        if (episodeInfo.total > 0) {
            if (episodeInfo.available > episodeInfo.watched) {
                // We have unwatched episodes
                episodeInfo.formatted = `Ep ${episodeInfo.watched}/${episodeInfo.available}/${episodeInfo.total}`;
            } else {
                // We're caught up
                episodeInfo.formatted = `Ep ${episodeInfo.watched}/${episodeInfo.total}`;
            }
        } else if (episodeInfo.watched > 0) {
            // We only know how many episodes we've watched
            episodeInfo.formatted = `Ep ${episodeInfo.watched}`;
        }
    } catch (err) {
        log("Error parsing episode info", err);
    }

    return episodeInfo;
}

/**
 * Renders the calendar with the schedule data
 * @param {Object} schedule - The schedule data
 * @param {boolean} skipHeader - Whether to skip header creation (use external header)
 */
function renderCalendar(schedule, skipHeader = false) {
    if (!calendarContainer) return;

    log("Rendering calendar");

    // Clear the container
    calendarContainer.innerHTML = '';

    // Get current day
    const today = new Date();
    const currentDayIndex = today.getDay();
    const currentDayName = DAYS_OF_WEEK[currentDayIndex];

    // Determine the order of days to display based on user preferences
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

    // If hideEmptyDays is enabled, filter out days with no episodes
    if (userPreferences.hideEmptyDays) {
        orderedDays = orderedDays.filter(day => {
            return schedule[day] && schedule[day].length > 0;
        });

        if (orderedDays.length === 0) {
            orderedDays = [currentDayName];
        }

        for (let i = 1; i <= 7; i++) {
            calendarContainer.classList.remove(`days-count-${i}`);
        }

        calendarContainer.classList.add(`days-count-${orderedDays.length}`);
    } else {
        calendarContainer.classList.remove(
            'days-count-1', 'days-count-2', 'days-count-3',
            'days-count-4', 'days-count-5', 'days-count-6'
        );
        calendarContainer.classList.add('days-count-7');
    }

    // Create header if needed
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

    // Create calendar grid
    const calendarGrid = document.createElement('div');
    calendarGrid.className = `anilist-calendar-grid ${userPreferences.compactMode ? 'compact-mode' : ''}`;

    orderedDays.forEach(day => {
        const dayCol = document.createElement('div');
        dayCol.className = `anilist-calendar-day ${day === currentDayName ? 'current-day' : ''}`;

        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.innerHTML = `
            <span class="day-name">${day}</span>
            <span class="abbreviated-day">${ABBREVIATED_DAYS[DAYS_OF_WEEK.indexOf(day)]}</span>
        `;
        dayCol.appendChild(dayHeader);

        const animeList = document.createElement('div');
        animeList.className = 'day-anime-list';

        if (schedule[day] && schedule[day].length > 0) {
            schedule[day].forEach(anime => {
                const animeEntry = document.createElement('div');
                animeEntry.className = 'anime-entry';
                animeEntry.style.borderLeftColor = anime.color;
                animeEntry.dataset.animeId = anime.id;

                if (userPreferences.gridMode) {
                    animeEntry.style.borderBottomColor = anime.color;
                }

                const animeImageDiv = document.createElement('div');
                animeImageDiv.className = 'anime-image';

                const imageOverlay = document.createElement('div');
                imageOverlay.className = 'anime-image-overlay';

                const plusButton = document.createElement('button');
                plusButton.className = 'anime-increment-button';
                plusButton.innerHTML = '<i class="fa fa-plus"></i>';
                plusButton.title = 'Mark next episode as watched';
                plusButton.setAttribute('aria-label', 'Mark next episode as watched');

                plusButton.addEventListener('click', async function (e) {
                    e.preventDefault();
                    e.stopPropagation();

                    const animeId = animeEntry.dataset.animeId;
                    if (!animeId) {
                        showNotification('Error: Cannot find anime ID', 'error');
                        return;
                    }

                    // Get current watched episode count
                    const episodeElement = animeEntry.querySelector('.episode-number');
                    if (!episodeElement) {
                        showNotification('Error: Cannot find episode information', 'error');
                        return;
                    }

                    // Parse current progress
                    const text = episodeElement.textContent;
                    const match = text.match(/Ep\s+(\d+)(?:\/(\d+))?(?:\/(\d+))?/i);

                    if (!match) {
                        showNotification('Error: Cannot parse episode information', 'error');
                        return;
                    }

                    const currentProgress = parseInt(match[1]);
                    const newProgress = currentProgress + 1;

                    try {
                        // Show loading indicator
                        showNotification('Updating...', 'loading');

                        // Call the AniList API to update progress
                        const result = await updateAniListProgress(animeId, newProgress);

                        if (result) {
                            // Update all instances of this anime in the UI
                            updateEpisodeCountInUI(animeId, newProgress);

                            // Show success notification
                            const titleElement = animeEntry.querySelector('.anime-title');
                            const title = titleElement ? titleElement.textContent.trim() : 'this anime';
                            showNotification(`Updated "${title}" to episode ${newProgress}`, 'success');
                        }
                    } catch (error) {
                        // Show error notification
                        showNotification(`Error: ${error.message}`, 'error');
                        console.error('Error updating progress:', error);
                    }
                });

                imageOverlay.appendChild(plusButton);
                animeImageDiv.appendChild(imageOverlay);

                const animeImg = document.createElement('img');
                animeImg.src = anime.coverImage;
                animeImg.alt = anime.title;
                animeImg.loading = 'lazy';
                animeImg.addEventListener('error', () => {
                    animeImageDiv.classList.add('error');

                    // Retry loading the image after a short delay
                    setTimeout(() => {
                        if (animeImg.src) {
                            const originalSrc = animeImg.src;
                            animeImg.src = '';
                            animeImg.src = originalSrc + '?retry=' + new Date().getTime();
                        }
                    }, 1000);
                });

                animeImageDiv.appendChild(animeImg);

                const animeTimeDiv = document.createElement('div');
                animeTimeDiv.className = 'anime-time inline-time';

                if (userPreferences.showCountdown) {
                    animeTimeDiv.textContent = formatCountdown(anime.days, anime.hours, anime.minutes);
                    animeTimeDiv.classList.add('countdown-mode');
                } else {
                    animeTimeDiv.textContent = anime.formattedTime;
                }

                if (anime.dayChanged) {
                    animeTimeDiv.title = `Originally aired on ${anime.originalDay}`;
                    animeTimeDiv.classList.add('day-adjusted');
                }

                const animeInfoDiv = document.createElement('div');
                animeInfoDiv.className = 'anime-info';

                const titleDiv = document.createElement('div');
                titleDiv.className = 'anime-title';
                titleDiv.textContent = anime.cleanTitle || anime.title;
                animeInfoDiv.appendChild(titleDiv);

                const episodeTimeContainer = document.createElement('div');
                episodeTimeContainer.className = 'anime-info-row';

                if (userPreferences.showEpisodeNumbers && anime.episodeInfo) {
                    const episodeText = document.createElement('span');
                    episodeText.className = 'episode-number';
                    episodeText.dataset.watched = anime.watched || 0;
                    episodeText.dataset.available = anime.available || 0;
                    episodeText.dataset.total = anime.total || 0;

                    // Add a red indicator if behind on episodes
                    if (anime.available > anime.watched) {
                        const indicator = document.createElement('span');
                        indicator.className = 'behind-indicator';
                        indicator.title = `${anime.available - anime.watched} episode(s) behind`;
                        episodeText.appendChild(indicator);
                    }

                    episodeText.appendChild(document.createTextNode(anime.episodeInfo));
                    episodeTimeContainer.appendChild(episodeText);
                } else if (userPreferences.showEpisodeNumbers && anime.episode) {
                    const episodeText = document.createElement('span');
                    episodeText.className = 'episode-number';
                    episodeText.textContent = `Ep ${anime.episode}`;
                    episodeTimeContainer.appendChild(episodeText);
                }

                episodeTimeContainer.appendChild(animeTimeDiv);
                animeInfoDiv.appendChild(episodeTimeContainer);

                if (userPreferences.gridMode) {
                    animeEntry.appendChild(animeImageDiv);
                    animeEntry.appendChild(animeInfoDiv);
                } else {
                    if (!userPreferences.compactMode) {
                        animeEntry.appendChild(animeImageDiv);
                    }
                    animeEntry.appendChild(animeInfoDiv);
                }

                animeEntry.addEventListener('click', () => {
                    window.location.href = `https://anilist.co/anime/${anime.id}`;
                });

                animeList.appendChild(animeEntry);
            });
        } else {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'empty-day';
            emptyDay.textContent = 'No episodes';
            animeList.appendChild(emptyDay);
        }

        dayCol.appendChild(animeList);
        calendarGrid.appendChild(dayCol);
    });

    calendarContainer.appendChild(calendarGrid);
}

/**
 * Updates episode counts in the UI for a specific anime
 * @param {string} animeId - The anime ID
 * @param {number} newProgress - The new progress count
 */
function updateEpisodeCountInUI(animeId, newProgress) {
    // Find all episode number elements for this anime
    const progressElements = document.querySelectorAll(`[data-anime-id="${animeId}"] .episode-number`);

    progressElements.forEach(element => {
        const text = element.textContent;
        const match = text.match(/Ep\s+(\d+)(?:\/(\d+))?(?:\/(\d+))?/i);

        if (match) {
            let watched = newProgress;
            let available = match[2] ? parseInt(match[2]) : null;
            let total = match[3] ? parseInt(match[3]) : (match[2] ? parseInt(match[2]) : null);

            // If new progress is greater than available, update available
            if (available && watched > available) {
                available = watched;
            }

            // Update displayed text
            if (total) {
                element.textContent = available
                    ? `Ep ${watched}/${available}/${total}`
                    : `Ep ${watched}/${total}`;
            } else {
                element.textContent = `Ep ${watched}`;
            }

            // Update data attributes
            element.dataset.watched = watched;
            if (available) element.dataset.available = available;
            if (total) element.dataset.total = total;

            // Remove behind indicator if caught up
            if (available && watched >= available) {
                const indicator = element.querySelector('.behind-indicator');
                if (indicator) indicator.remove();
            }
        }
    });
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
 * @param {string} message - The message to show
 * @param {string} type - The type of notification (success, error, loading)
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
 * Hide an existing notification
 * @param {HTMLElement} notification - The notification element to hide
 */
function hideNotification(notification) {
    if (!notification) return;

    notification.classList.remove('active');

    // Remove from DOM after transition
    setTimeout(() => {
        notification.remove();
    }, 300);
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

/**
 * Creates and opens the settings overlay with new options
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

    // First day of the week
    const startDayRow = document.createElement('div');
    startDayRow.className = 'settings-row';

    const startDayLabel = document.createElement('div');
    startDayLabel.innerHTML = `
    <div class="settings-label">First day of the week</div>
    <div class="settings-description">Choose which day to display first in the calendar</div>
  `;
    // Create select element
    const startDaySelect = document.createElement('select');
    startDaySelect.className = 'settings-select';
    startDaySelect.id = 'start-day-select';

    // Populate with options including separator
    createStartDaySelector(startDaySelect, userPreferences.startDay);

    startDayRow.appendChild(startDayLabel);
    startDayRow.appendChild(startDaySelect);

    // Hide empty days
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

    // Compact mode
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

    // Grid view
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

    // Show countdown instead of time
    const countdownRow = document.createElement('div');
    countdownRow.className = 'settings-row';

    const countdownLabel = document.createElement('div');
    countdownLabel.innerHTML = `
    <div class="settings-label">Show countdown</div>
    <div class="settings-description">Display remaining time instead of airing time</div>
  `;

    const countdownToggle = document.createElement('label');
    countdownToggle.className = 'toggle-switch';
    countdownToggle.innerHTML = `
    <input type="checkbox" id="countdown-toggle" ${userPreferences.showCountdown ? 'checked' : ''}>
    <span class="slider"></span>
  `;

    countdownRow.appendChild(countdownLabel);
    countdownRow.appendChild(countdownToggle);

    // Show episode numbers
    const episodeNumbersRow = document.createElement('div');
    episodeNumbersRow.className = 'settings-row';

    const episodeNumbersLabel = document.createElement('div');
    episodeNumbersLabel.innerHTML = `
    <div class="settings-label">Show episode numbers</div>
    <div class="settings-description">Display episode numbers in the calendar</div>
  `;

    const episodeNumbersToggle = document.createElement('label');
    episodeNumbersToggle.className = 'toggle-switch';
    episodeNumbersToggle.innerHTML = `
    <input type="checkbox" id="episode-numbers-toggle" ${userPreferences.showEpisodeNumbers ? 'checked' : ''}>
    <span class="slider"></span>
  `;

    episodeNumbersRow.appendChild(episodeNumbersLabel);
    episodeNumbersRow.appendChild(episodeNumbersToggle);

    // Timezone section
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

        // Wait a moment to show loading effect before refreshing the page
        setTimeout(() => {
            // Show notification
            showNotification('Settings applied! Refreshing page...');

            // Hide loading indicator
            loadingSection.classList.remove('active');

            // Hide overlay
            settingsOverlay.classList.remove('active');

            // Force a complete page refresh after a short delay to allow the notification to be shown
            setTimeout(() => {
                window.location.reload(true); // true forces reload from server, not cache
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

    // Close overlay when clicking outside the panel
    settingsOverlay.addEventListener('click', (e) => {
        if (e.target === settingsOverlay) {
            settingsOverlay.classList.remove('active');
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
 * Formats a countdown as a string
 * @param {number} days - Days
 * @param {number} hours - Hours
 * @param {number} minutes - Minutes
 * @returns {string} Formatted countdown
 */
function formatCountdown(days, hours, minutes) {
    // Format as d:hh:mm or hh:mm
    const formattedHours = hours.toString().padStart(2, '0');
    const formattedMinutes = minutes.toString().padStart(2, '0');

    if (days > 0) {
        return `${days}:${formattedHours}:${formattedMinutes}`;
    } else {
        return `${formattedHours}:${formattedMinutes}`;
    }
}

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
 * Extracts anime data from the DOM
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
                // Get anime ID from URL
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

                // Look for episode progress info directly in DOM
                // Try to find the progress element with better accuracy
                const progressElement = card.querySelector('.plus-progress.mobile');
                let epString = "";

                if (progressElement) {
                    const progressText = progressElement.textContent.trim();
                    // Parse out the episode info (Progress: x/y)
                    epString = progressText.replace("Progress:", "").trim();
                }

                // Parse episode information from title and content
                const episodeInfo = parseEpisodeInfo(title, card);

                // Calculate airing time based on countdown with day tracking
                const airingInfo = calculateAiringDateWithDayTracking(days, hours, minutes);
                const airingDate = airingInfo.date;

                animeData.push({
                    id: animeId,
                    title: title,
                    cleanTitle: episodeInfo.cleanTitle,
                    episodeInfo: episodeInfo.formatted,
                    episodeProgressString: epString, // Add direct progress string
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

        log("Extracted anime data with timezone handling", animeData);
        return animeData;

    } catch (err) {
        log("Error extracting anime data from DOM", err);
        return [];
    }
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

    log("Processed schedule data with timezone adjustments", schedule);
    return schedule;
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