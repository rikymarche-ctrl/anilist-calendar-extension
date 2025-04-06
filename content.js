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
const CONFIG = {
    debug: false,
    daysOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    abbreviatedDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    storageKeyPrefix: 'anilist_calendar_',
    apiUrl: 'https://graphql.anilist.co',
    japanOffset: 9, // UTC+9 for Japan timezone
};

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

// Default user preferences
let userPreferences = {
    startDay: 'today',                 // 'today' or index 0-6 (Sunday-Saturday)
    hideEmptyDays: false,              // Hide days without episodes
    compactMode: false,                // Use compact layout
    gridMode: false,                   // Use grid layout (images only with hover info)
    timezone: 'jst',                   // Timezone preference
    showCountdown: false,              // Show countdown instead of time
    showEpisodeNumbers: true           // Show episode numbers
};

// Global variables
let weeklySchedule = {};
let isCalendarInitialized = false;
let calendarContainer = null;
let countdownInterval = null;

/**
 * Logs debug messages to console when debug mode is enabled
 */
function log(message, data = null) {
    if (!CONFIG.debug) return;
    if (data) {
        console.log(`[Anilist Calendar] ${message}`, data);
    } else {
        console.log(`[Anilist Calendar] ${message}`);
    }
}

/**
 * Loads Font Awesome for icons if not already loaded
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
 * Preloads FontAwesome icons to ensure they're available
 */
function preloadFontAwesomeIcons() {
    const preloadDiv = document.createElement('div');
    preloadDiv.style.position = 'absolute';
    preloadDiv.style.top = '-9999px';
    preloadDiv.style.left = '-9999px';
    preloadDiv.style.visibility = 'hidden';
    preloadDiv.innerHTML = `
    <i class="fa fa-plus"></i>
    <i class="fa fa-check"></i>
    <i class="fa fa-cog"></i>
    <i class="fa fa-spinner fa-spin"></i>
  `;
    document.body.appendChild(preloadDiv);

    setTimeout(() => document.body.removeChild(preloadDiv), 2000);
}

/**
 * Creates and preloads a default image for error states
 */
function createDefaultImage() {
    const defaultImageData = `
    <svg xmlns="http://www.w3.org/2000/svg" width="100" height="150" viewBox="0 0 100 150">
      <rect width="100" height="150" fill="#1A1A2E"/>
      <text x="50" y="75" font-family="Arial" font-size="16" fill="#9CA3AF" text-anchor="middle">No Image</text>
    </svg>
  `;
    const defaultImageUrl = 'data:image/svg+xml;base64,' + btoa(defaultImageData);

    const defaultImage = new Image();
    defaultImage.src = defaultImageUrl;

    try {
        chrome.storage.local.set({ 'default_cover_image': defaultImageUrl });
    } catch (e) {
        window.defaultCoverImage = defaultImageUrl;
    }

    return defaultImageUrl;
}

/**
 * Applies extension enhancements
 */
function applyExtensionEnhancements() {
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
 * Main initialization function
 */
function initialize() {
    log("Initializing extension");

    try {
        // Apply custom enhancements
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
        initSettingsButtonEvents();

    } catch (err) {
        log("Error during initialization", err);
    }
}

/**
 * Initialize settings button event handlers
 */
function initSettingsButtonEvents() {
    document.addEventListener('mouseover', function(e) {
        // Find if we're hovering any calendar element or header
        let element = e.target;
        let isRelevantElement = false;

        while (element && element !== document.body) {
            // Only respond to hovering over the calendar container or its direct section header
            if (element.classList && (
                element.classList.contains('anilist-weekly-calendar') ||
                (element.classList.contains('section-header') && element.querySelector('.airing-replaced-header'))
            )) {
                isRelevantElement = true;
                break;
            }
            element = element.parentElement;
        }

        if (isRelevantElement) {
            const settingsBtn = document.querySelector('.header-settings-btn');
            if (settingsBtn) {
                // Use setTimeout to delay the animation by 0ms (eliminates 50ms delay)
                setTimeout(() => {
                    settingsBtn.style.opacity = '1';
                }, 0);
            }
        }
    });

    document.addEventListener('mouseout', function(e) {
        // Only handle mouseout for relevant elements
        let isRelevantElement = false;
        let fromElement = e.target;

        while (fromElement && fromElement !== document.body) {
            if (fromElement.classList && (
                fromElement.classList.contains('anilist-weekly-calendar') ||
                (fromElement.classList.contains('section-header') && fromElement.querySelector('.airing-replaced-header'))
            )) {
                isRelevantElement = true;
                break;
            }
            fromElement = fromElement.parentElement;
        }

        // Check that we're not moving to another relevant element
        if (isRelevantElement) {
            let toElement = e.relatedTarget;
            let isMovingToRelevantElement = false;

            while (toElement && toElement !== document.body) {
                if (toElement.classList && (
                    toElement.classList.contains('anilist-weekly-calendar') ||
                    (toElement.classList.contains('section-header') && toElement.querySelector('.airing-replaced-header')) ||
                    toElement.classList.contains('header-settings-btn')
                )) {
                    isMovingToRelevantElement = true;
                    break;
                }
                toElement = toElement.parentElement;
            }

            if (!isMovingToRelevantElement) {
                const settingsBtn = document.querySelector('.header-settings-btn');
                if (settingsBtn) {
                    // Use setTimeout to delay the animation by 0ms (eliminates 50ms delay)
                    setTimeout(() => {
                        settingsBtn.style.opacity = '0';
                    }, 0);
                }
            }
        }
    });
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
            const settingsButton = createSettingsButton();

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

                replaceAiringSection(container, element, true);
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

                // Add settings button
                const settingsButton = createSettingsButton();
                header.appendChild(settingsButton);

                // Remove any margin or padding that might create unwanted space
                header.style.marginBottom = "0";
                header.style.paddingBottom = "6px";

                const container = findAiringContainer(header);
                if (container) {
                    // Remove any margin that might create space
                    container.style.marginTop = "0";

                    replaceAiringSection(container, header, true);
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
 * Creates settings button with fixed z-index
 */
function createSettingsButton() {
    const settingsButton = document.createElement('button');
    settingsButton.className = 'calendar-settings-btn header-settings-btn';
    settingsButton.innerHTML = '<i class="fa fa-cog"></i>';
    settingsButton.title = 'Open settings';
    settingsButton.style.position = 'absolute';
    settingsButton.style.right = '0';
    settingsButton.style.width = '28px';
    settingsButton.style.height = '28px';
    settingsButton.style.marginTop = '-6px';
    settingsButton.style.display = 'flex';
    settingsButton.style.alignItems = 'center';
    settingsButton.style.justifyContent = 'center';
    settingsButton.style.zIndex = '1000';
    settingsButton.innerHTML = '<i class="fa fa-cog" style="font-size: 14px;"></i>';

    // Fixed: Open options page when settings button is clicked
    settingsButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        try {
            // Instead of trying to use chrome.runtime API, just show the overlay
            createSettingsOverlay();
        } catch (err) {
            // Fallback
            createSettingsOverlay();
        }
    });

    return settingsButton;
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

        // Apply mode classes if needed
        if (userPreferences.compactMode) calendarContainer.classList.add('compact-mode');
        if (userPreferences.gridMode) calendarContainer.classList.add('grid-mode');

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
 * Extracts anime data from the DOM
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
                if (CONFIG.debug) {
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

                if (CONFIG.debug) {
                    console.log("Processing:", {
                        id: animeId,
                        title: rawTitle,
                        infoHeader: infoHeaderText
                    });

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
 * Parses episode info from anime title and card
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
        if (CONFIG.debug) {
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
 * Gets the episode number from the card
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
 */
function formatTime(date) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

/**
 * Gets the timezone offset for the selected timezone
 */
function getSelectedTimezoneOffset() {
    if (userPreferences.timezone === 'auto') {
        return getBrowserTimezoneOffset();
    }

    // Find the selected timezone in options
    const timezone = TIMEZONE_OPTIONS.find(tz => tz.value === userPreferences.timezone);
    return timezone ? timezone.offset : CONFIG.japanOffset; // Default to Japan if not found
}

/**
 * Gets the current browser timezone offset in hours
 */
function getBrowserTimezoneOffset() {
    // Get minutes and convert to hours
    const offsetMinutes = new Date().getTimezoneOffset();
    // Convert to hours (note: getTimezoneOffset returns the opposite of what we need)
    return -(offsetMinutes / 60);
}

/**
 * Gets a clean timezone name format for display
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
    const originalDay = CONFIG.daysOfWeek[originalDate.getDay()];

    // Convert countdown-based time to Japan time (assumed origin timezone)
    const userOffset = getBrowserTimezoneOffset();
    const japanOffset = CONFIG.japanOffset;
    const diffHours = japanOffset - userOffset;

    // Original Japan time
    airingDate.setHours(airingDate.getHours() + diffHours);

    // Now convert from Japan time to user's selected timezone
    const selectedOffset = getSelectedTimezoneOffset();
    const tzDiffHours = selectedOffset - japanOffset;

    // Apply timezone difference
    airingDate.setHours(airingDate.getHours() + tzDiffHours);

    // Check if the day changed
    const newDay = CONFIG.daysOfWeek[airingDate.getDay()];
    const dayChanged = newDay !== originalDay;

    return {
        date: airingDate,
        originalDay: originalDay,
        dayChanged: dayChanged
    };
}

/**
 * Processes anime data into a weekly schedule
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
        const adjustedDay = CONFIG.daysOfWeek[anime.airingDate.getDay()];

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
 */
function renderCalendar(schedule, skipHeader = false) {
    if (!calendarContainer) return;

    log("Rendering calendar");

    // Clear previous content
    calendarContainer.innerHTML = '';

    const today = new Date();
    const currentDayIndex = today.getDay();
    const currentDayName = CONFIG.daysOfWeek[currentDayIndex];

    // Determine the order of days to display
    let orderedDays = [...CONFIG.daysOfWeek];

    if (userPreferences.startDay === 'today') {
        orderedDays = [
            ...CONFIG.daysOfWeek.slice(currentDayIndex),
            ...CONFIG.daysOfWeek.slice(0, currentDayIndex)
        ];
    } else if (!isNaN(userPreferences.startDay)) {
        const startDayIndex = parseInt(userPreferences.startDay);
        orderedDays = [
            ...CONFIG.daysOfWeek.slice(startDayIndex),
            ...CONFIG.daysOfWeek.slice(0, startDayIndex)
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
    calendarGrid.style.width = '100%';
    calendarGrid.style.maxWidth = '100%';

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
        const todayIndex = currentDate.getDay();
        const dayIndex = CONFIG.daysOfWeek.indexOf(day);
        const daysToAdd = (dayIndex - todayIndex + 7) % 7;

        const targetDate = new Date(currentDate);
        targetDate.setDate(currentDate.getDate() + daysToAdd);
        const dayNumber = targetDate.getDate();

        // Get abbreviated month name
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthName = months[targetDate.getMonth()];

        dayHeader.innerHTML = `
      <span class="day-name">${day}</span>
      <span class="separator">|</span>
      <span class="day-number">${dayNumber} ${monthName}</span>
      <span class="abbreviated-day" style="display:none">${CONFIG.abbreviatedDays[CONFIG.daysOfWeek.indexOf(day)]}</span>
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
 * Creates an anime entry element with proper image handling
 */
function createAnimeEntry(container, anime) {
    // Create the entry container
    const entry = document.createElement('div');
    entry.className = 'anime-entry';
    entry.dataset.animeId = anime.id;
    entry.dataset.animeData = JSON.stringify(anime);
    entry.style.backgroundColor = 'rgba(21, 31, 46, 0.95)';
    entry.style.padding = '0';
    entry.style.alignItems = 'stretch';
    entry.style.height = '65px';
    entry.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';

    // Make the entry clickable to go to the anime page
    entry.addEventListener('click', () => {
        window.location.href = `/anime/${anime.id}`;
    });

    // Create image container
    const imageContainer = document.createElement('div');
    imageContainer.className = 'anime-image';
    imageContainer.style.width = '45px';
    imageContainer.style.height = '100%';
    imageContainer.style.marginRight = '6px';
    imageContainer.style.borderRadius = '0';
    imageContainer.style.display = 'flex';
    imageContainer.style.alignItems = 'center';
    imageContainer.style.padding = '0';
    imageContainer.style.border = 'none';
    imageContainer.style.position = 'relative';
    imageContainer.style.overflow = 'hidden';

    // Create actual image element
    if (anime.coverImage) {
        const img = document.createElement('img');
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.position = 'absolute';
        img.style.top = '0';
        img.style.left = '0';
        img.style.zIndex = '1';

        // Set a loading animation background
        imageContainer.style.background = 'linear-gradient(90deg, #152232 25%, #1A2C3D 50%, #152232 75%)';
        imageContainer.style.backgroundSize = '200% 100%';
        imageContainer.style.animation = 'shimmer 1.5s infinite';

        // Add error handling
        img.onerror = () => {
            // Display fallback on error
            img.style.display = 'none';
            imageContainer.classList.add('error');

            // Show first letter of title
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
        };

        img.onload = () => {
            // Remove loading animation
            imageContainer.style.background = 'none';
            imageContainer.style.animation = 'none';
        };

        // Set source after defining handlers
        img.src = anime.coverImage;
        imageContainer.appendChild(img);
    } else {
        // No image URL - show first letter of title
        imageContainer.classList.add('error');
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
    }

    // Create the + button - fixed dark background even on hover
    const plusButton = document.createElement('div');
    plusButton.className = 'plus-button';

    // Plus icon as a separate element
    const plusIcon = document.createElement('i');
    plusIcon.className = 'fa fa-plus';
    plusIcon.style.fontSize = '24px';
    plusIcon.style.color = 'white';
    plusButton.appendChild(plusIcon);

    // Handle click event
    plusButton.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();

        // Minimal animation
        plusButton.style.transform = 'scale(0.9)';
        setTimeout(() => {
            plusButton.style.transform = 'scale(1)';
        }, 150);

        // Increment episode count
        handlePlusButtonClick(e, anime);
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
                // Non mostriamo i secondi
                timeDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
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

            // Update the text
            if (days > 0) {
                element.textContent = `${days}:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            } else {
                // Non mostriamo i secondi, solo ore e minuti
                element.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            }
        });
    }, 1000);
}

/**
 * Creates a settings overlay
 */
function createSettingsOverlay() {
    // Remove any existing overlay
    const existingOverlay = document.querySelector('.settings-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }

    // Create overlay container
    const overlayContainer = document.createElement('div');
    overlayContainer.className = 'settings-overlay';
    overlayContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';

    // Create settings panel
    const settingsPanel = document.createElement('div');
    settingsPanel.className = 'settings-panel';
    settingsPanel.style.backgroundColor = '#0B1622';
    settingsPanel.style.border = '1px solid rgba(100, 100, 100, 0.4)';
    settingsPanel.style.boxShadow = '0 5px 20px rgba(0, 0, 0, 0.5)';

    // Add header
    const header = document.createElement('div');
    header.className = 'settings-header';

    const title = document.createElement('h3');
    title.className = 'settings-title';
    title.textContent = 'Calendar Settings';

    const closeButton = document.createElement('button');
    closeButton.className = 'settings-close-btn';
    closeButton.innerHTML = '<i class="fa fa-times"></i>';
    closeButton.addEventListener('click', () => {
        overlayContainer.classList.remove('active');
        setTimeout(() => {
            overlayContainer.remove();
        }, 300);
    });

    header.appendChild(title);
    header.appendChild(closeButton);
    settingsPanel.appendChild(header);

    // Add settings sections
    const displaySection = document.createElement('div');
    displaySection.className = 'settings-section';
    displaySection.style.backgroundColor = '#152232';
    displaySection.style.border = '1px solid rgba(70, 70, 80, 0.3)';

    const displayTitle = document.createElement('h4');
    displayTitle.className = 'settings-section-title';
    displayTitle.textContent = 'Display Settings';
    displaySection.appendChild(displayTitle);

    // Start day setting
    const startDayRow = createSettingRow(
        'First day of the week',
        'Choose which day to display first in the calendar',
        createSelect('start-day', [
            { value: 'today', text: 'Today' },
            { value: '0', text: 'Sunday' },
            { value: '1', text: 'Monday' },
            { value: '2', text: 'Tuesday' },
            { value: '3', text: 'Wednesday' },
            { value: '4', text: 'Thursday' },
            { value: '5', text: 'Friday' },
            { value: '6', text: 'Saturday' }
        ], userPreferences.startDay)
    );
    displaySection.appendChild(startDayRow);

    // Hide empty days setting
    const hideEmptyDaysRow = createSettingRow(
        'Hide empty days',
        'Only show days with scheduled episodes',
        createToggle('hide-empty-days', userPreferences.hideEmptyDays)
    );
    displaySection.appendChild(hideEmptyDaysRow);

    // Compact mode setting
    const compactModeRow = createSettingRow(
        'Compact mode',
        'Use a more compact layout to save space',
        createToggle('compact-mode', userPreferences.compactMode)
    );
    displaySection.appendChild(compactModeRow);

    // Grid mode setting
    const gridModeRow = createSettingRow(
        'Grid view',
        'Display anime as a grid of images (hover for details)',
        createToggle('grid-mode', userPreferences.gridMode)
    );
    displaySection.appendChild(gridModeRow);

    // Show countdown setting
    const showCountdownRow = createSettingRow(
        'Show countdown',
        'Display remaining time instead of airing time',
        createToggle('show-countdown', userPreferences.showCountdown)
    );
    displaySection.appendChild(showCountdownRow);

    // Show episode numbers setting
    const showEpisodeNumbersRow = createSettingRow(
        'Show episode numbers',
        'Display episode numbers in the calendar',
        createToggle('show-episode-numbers', userPreferences.showEpisodeNumbers)
    );
    displaySection.appendChild(showEpisodeNumbersRow);

    // Timezone setting
    const timezoneSelect = document.createElement('select');
    timezoneSelect.id = 'timezone';
    timezoneSelect.className = 'settings-select';

    TIMEZONE_OPTIONS.forEach(tz => {
        const option = document.createElement('option');
        option.value = tz.value;
        option.textContent = tz.text;
        timezoneSelect.appendChild(option);
    });

    timezoneSelect.value = userPreferences.timezone;

    const timezoneRow = createSettingRow(
        'Timezone',
        'Adjust anime airing times to your timezone',
        timezoneSelect
    );
    displaySection.appendChild(timezoneRow);

    settingsPanel.appendChild(displaySection);

    // Save button
    const saveContainer = document.createElement('div');
    saveContainer.className = 'settings-save-container';

    const saveButton = document.createElement('button');
    saveButton.className = 'settings-save-btn';
    saveButton.innerHTML = '<i class="fa fa-save"></i> Save Changes';
    saveButton.addEventListener('click', () => {
        // Update preferences from form values
        userPreferences.startDay = document.getElementById('start-day').value;
        userPreferences.hideEmptyDays = document.getElementById('hide-empty-days').checked;
        userPreferences.compactMode = document.getElementById('compact-mode').checked;
        userPreferences.gridMode = document.getElementById('grid-mode').checked;
        userPreferences.showCountdown = document.getElementById('show-countdown').checked;
        userPreferences.showEpisodeNumbers = document.getElementById('show-episode-numbers').checked;
        userPreferences.timezone = document.getElementById('timezone').value;

        // Save to storage
        saveUserPreferences();

        // Show notification
        showNotification('Settings saved! Refreshing page...');

        // Close overlay
        overlayContainer.classList.remove('active');

        // Reload the page after a short delay
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    });

    saveContainer.appendChild(saveButton);
    settingsPanel.appendChild(saveContainer);

    // Add panel to overlay
    overlayContainer.appendChild(settingsPanel);

    // Add overlay to page
    document.body.appendChild(overlayContainer);

    // Activate overlay with animation
    setTimeout(() => {
        overlayContainer.classList.add('active');
    }, 10);

    // Close when clicking outside the panel
    overlayContainer.addEventListener('click', (e) => {
        if (e.target === overlayContainer) {
            overlayContainer.classList.remove('active');
            setTimeout(() => {
                overlayContainer.remove();
            }, 300);
        }
    });
}

/**
 * Creates a settings row with label and control
 */
function createSettingRow(label, description, control) {
    const row = document.createElement('div');
    row.className = 'settings-row';
    row.style.backgroundColor = '#0B1622';
    row.style.borderBottom = '1px solid rgba(70, 70, 80, 0.3)';

    const labelContainer = document.createElement('div');

    const labelText = document.createElement('div');
    labelText.className = 'settings-label';
    labelText.textContent = label;

    const descText = document.createElement('div');
    descText.className = 'settings-description';
    descText.textContent = description;

    labelContainer.appendChild(labelText);
    labelContainer.appendChild(descText);

    row.appendChild(labelContainer);
    row.appendChild(control);

    return row;
}

/**
 * Creates a select element with options
 */
function createSelect(id, options, selectedValue) {
    const select = document.createElement('select');
    select.id = id;
    select.className = 'settings-select';

    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.text;
        select.appendChild(optionElement);
    });

    select.value = selectedValue;
    return select;
}

/**
 * Creates a toggle switch
 */
function createToggle(id, checked) {
    const toggle = document.createElement('label');
    toggle.className = 'toggle-switch';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = id;
    input.checked = checked;

    const slider = document.createElement('span');
    slider.className = 'slider';

    toggle.appendChild(input);
    toggle.appendChild(slider);

    return toggle;
}

/**
 * Show a notification
 */
function showNotification(message, type = 'success') {
    // Remove any existing notifications
    const existingNotifications = document.querySelectorAll('.settings-notification');
    existingNotifications.forEach(notification => notification.remove());

    // Create new notification with top positioning
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

    // Show with animation without delay
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

    return notification;
}

/**
 * Handle the plus button click event - versione con controllo sul limite massimo
 */
function handlePlusButtonClick(e, animeData) {
    e.stopPropagation(); // Prevent the click from bubbling to the entry
    e.preventDefault(); // Previene comportamenti di default

    if (!animeData || !animeData.id) {
        console.error('No anime data available for this entry');
        return;
    }

    // Ottieni i dati più aggiornati dall'elemento DOM
    const entry = e.target.closest('.anime-entry');
    if (entry && entry.dataset.animeData) {
        try {
            // Usa i dati più recenti dall'elemento DOM
            const updatedData = JSON.parse(entry.dataset.animeData);
            if (updatedData && updatedData.watched !== undefined) {
                animeData = updatedData;
            }
        } catch (err) {
            console.warn('Errore nel parsing dei dati anime:', err);
        }
    }

    // Calculate the new progress value (current + 1)
    const newProgress = (animeData.watched || 0) + 1;

    // Verifica se superiamo il numero totale di episodi disponibili
    if (animeData.total > 0 && newProgress > animeData.total) {
        console.log(`Non posso incrementare oltre il totale di ${animeData.total} episodi`);
        showNotification(`Hai già completato tutti gli episodi disponibili (${animeData.total})`, 'error');
        return;
    }

    console.log(`Incrementing episode for ${animeData.id} from ${animeData.watched} to ${newProgress}`);

    // Update the progress via API
    updateAnimeProgress(animeData.id, newProgress)
        .then(result => {
            console.log('API call completed:', result);
        })
        .catch(err => {
            console.warn('API call failed but UI was already updated:', err);
        });
}

/**
 * Get the authentication token from localStorage with debug
 */
function getAuthToken() {
    try {
        let token = null;

        // Check if localStorage is available
        if (!localStorage) {
            console.warn('localStorage not available');
            return null;
        }

        // Search localStorage with error handling
        const tokenKeys = ['auth', 'token', 'access_token', 'accessToken'];

        for (let i = 0; i < localStorage.length; i++) {
            try {
                const key = localStorage.key(i);
                if (!key) continue;

                // Check if key is related to authentication
                if (tokenKeys.some(tokenKey => key.toLowerCase().includes(tokenKey.toLowerCase()))) {
                    const item = localStorage.getItem(key);
                    if (!item) continue;

                    // Try to parse as JSON
                    try {
                        const parsed = JSON.parse(item);
                        if (parsed && parsed.accessToken) {
                            token = parsed.accessToken;
                            break;
                        } else if (parsed && parsed.token) {
                            token = parsed.token;
                            break;
                        }
                    } catch (e) {
                        // Not JSON, check if it's a direct token
                        if (typeof item === 'string' &&
                            item.length > 20 &&
                            (item.startsWith('ey') || item.includes('anilist'))) {
                            token = item;
                            break;
                        }
                    }
                }
            } catch (e) {
                console.warn('Error checking a localStorage key');
            }
        }

        if (token) {
            return token;
        }

        // Fallback: check cookies
        const allCookies = document.cookie.split(';');
        for (const cookie of allCookies) {
            const [name, value] = cookie.trim().split('=');
            if (name && (name.includes('auth') || name.includes('token'))) {
                return value;
            }
        }

        // Final attempt: look for user ID in the page
        const userIdElement = document.querySelector('[data-user-id]');
        if (userIdElement) {
            const userId = userIdElement.dataset.userId;
            return `demo_token_${userId}_${Date.now()}`;
        }

        return null;
    } catch (err) {
        console.error('Error retrieving auth token:', err);
        return null;
    }
}

/**
 * Update progress (increment episode count) via Anilist API
 */
async function updateAnimeProgress(mediaId, progress) {
    // Update UI immediately for instant feedback
    updateAnimeEntryInUI(mediaId, progress);

    // Show success notification
    showNotification(`Episode ${progress} marked as watched!`, 'success');

    // Continue with the API call in background
    const token = getAuthToken();
    if (!token) {
        if (CONFIG.debug) {
            console.log('No auth token found, but UI already updated');
        }
        return { progress: progress, id: mediaId, status: 'CURRENT' };
    }

    // GraphQL mutation to update progress
    const mutation = `
    mutation ($mediaId: Int, $progress: Int) {
      SaveMediaListEntry (mediaId: $mediaId, progress: $progress) {
        id
        progress
        status
      }
    }
  `;

    // Variables for the mutation
    const variables = {
        mediaId: parseInt(mediaId),
        progress: progress
    };

    try {
        const response = await fetch(CONFIG.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                query: mutation,
                variables: variables
            })
        });

        const result = await response.json();

        if (result.errors) {
            console.warn('API error:', result.errors[0].message);
        } else {
            console.log('API success:', result.data);
        }

        return result.data?.SaveMediaListEntry || { progress: progress, id: mediaId, status: 'CURRENT' };
    } catch (error) {
        console.warn('Error updating progress via API:', error.message);
        return { progress: progress, id: mediaId, status: 'CURRENT' };
    }
}

/**
 * Update anime entries in UI after successful API call
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
                if (matches[3] && newProgress === parseInt(matches[2])) {
                    // Case 1/1/12 -> simplify to 1/12
                    newText = `Ep ${newProgress}/${matches[3]}`;
                } else if (matches[2] && matches[3]) {
                    // Normal case x/y/z
                    newText = `Ep ${newProgress}/${matches[2]}/${matches[3]}`;
                } else if (matches[2]) {
                    // Case x/y (without total)
                    newText = `Ep ${newProgress}/${matches[2]}`;
                }

                // If there's a behind indicator, remove it since we've caught up
                const behindIndicator = episodeNumber.querySelector('.behind-indicator');
                if (behindIndicator) {
                    behindIndicator.remove();
                }

                episodeNumber.textContent = newText;
            }
        }

        // Update the stored data - IMPORTANTE: aggiorna i dati nell'elemento DOM
        let animeData = getAnimeDataFromEntry(entry);
        if (animeData) {
            animeData.watched = newProgress;
            // If we've caught up, zero out the behind count
            if (animeData.episodesBehind > 0 && animeData.watched >= animeData.available) {
                animeData.episodesBehind = 0;
            }

            // Aggiorna anche i dati disponibili se necessario
            if (animeData.available < newProgress) {
                animeData.available = newProgress;
            }

            // Salva i dati aggiornati nell'attributo data
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

                // Aggiorna anche i dati disponibili se necessario
                if (window.weeklySchedule[day][animeIndex].available < newProgress) {
                    window.weeklySchedule[day][animeIndex].available = newProgress;
                }

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
 * Loads user preferences from storage
 */
async function loadUserPreferences() {
    return new Promise((resolve) => {
        try {
            chrome.storage.sync.get([
                `${CONFIG.storageKeyPrefix}start_day`,
                `${CONFIG.storageKeyPrefix}hide_empty_days`,
                `${CONFIG.storageKeyPrefix}compact_mode`,
                `${CONFIG.storageKeyPrefix}grid_mode`,
                `${CONFIG.storageKeyPrefix}show_countdown`,
                `${CONFIG.storageKeyPrefix}show_episode_numbers`,
                `${CONFIG.storageKeyPrefix}timezone`
            ], function(result) {
                if (result[`${CONFIG.storageKeyPrefix}start_day`] !== undefined) {
                    userPreferences.startDay = result[`${CONFIG.storageKeyPrefix}start_day`];
                }
                if (result[`${CONFIG.storageKeyPrefix}hide_empty_days`] !== undefined) {
                    userPreferences.hideEmptyDays = result[`${CONFIG.storageKeyPrefix}hide_empty_days`];
                }
                if (result[`${CONFIG.storageKeyPrefix}compact_mode`] !== undefined) {
                    userPreferences.compactMode = result[`${CONFIG.storageKeyPrefix}compact_mode`];
                }
                if (result[`${CONFIG.storageKeyPrefix}grid_mode`] !== undefined) {
                    userPreferences.gridMode = result[`${CONFIG.storageKeyPrefix}grid_mode`];
                }
                if (result[`${CONFIG.storageKeyPrefix}show_countdown`] !== undefined) {
                    userPreferences.showCountdown = result[`${CONFIG.storageKeyPrefix}show_countdown`];
                }
                if (result[`${CONFIG.storageKeyPrefix}show_episode_numbers`] !== undefined) {
                    userPreferences.showEpisodeNumbers = result[`${CONFIG.storageKeyPrefix}show_episode_numbers`];
                }
                if (result[`${CONFIG.storageKeyPrefix}timezone`] !== undefined) {
                    userPreferences.timezone = result[`${CONFIG.storageKeyPrefix}timezone`];
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
            [`${CONFIG.storageKeyPrefix}start_day`]: userPreferences.startDay,
            [`${CONFIG.storageKeyPrefix}hide_empty_days`]: userPreferences.hideEmptyDays,
            [`${CONFIG.storageKeyPrefix}compact_mode`]: userPreferences.compactMode,
            [`${CONFIG.storageKeyPrefix}grid_mode`]: userPreferences.gridMode,
            [`${CONFIG.storageKeyPrefix}show_countdown`]: userPreferences.showCountdown,
            [`${CONFIG.storageKeyPrefix}show_episode_numbers`]: userPreferences.showEpisodeNumbers,
            [`${CONFIG.storageKeyPrefix}timezone`]: userPreferences.timezone
        };

        chrome.storage.sync.set(data, function() {
            log("Saved user preferences", data);
        });
    } catch (e) {
        log("Error saving preferences", e);
    }
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