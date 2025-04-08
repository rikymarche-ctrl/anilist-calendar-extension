/**
 * Anilist Weekly Schedule Extension
 *
 * This extension replaces the Airing section with a weekly calendar view
 * to provide a clearer visualization of anime episode release schedules.
 *
 * Author: ExAstra
 * GitHub: https://github.com/rikymarche/anilist-weekly-schedule
 */

// Configuration
const CONFIG = {
    debug: true, // Enable debug logging to better diagnose issues
    daysOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    abbreviatedDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    storageKeyPrefix: 'anilist_calendar_',
    apiUrl: 'https://graphql.anilist.co',
    japanOffset: 9, // UTC+9 for Japan timezone
};

// Common timezone options with UTC offsets - listed by popularity in anime community
const TIMEZONE_OPTIONS = [
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
];

// Default user preferences
let userPreferences = {
    startDay: 'today',                 // 'today' or index 0-6 (Sunday-Saturday)
    hideEmptyDays: false,              // Hide days without episodes
    layoutMode: 'standard',            // Layout mode: 'compact', 'standard', 'extended'
    timezone: 'jst',                   // Timezone preference
    timeFormat: 'release',             // Time format: 'release' or 'countdown'
    showTime: true,                    // Show time information
    showEpisodeNumbers: true,          // Show episode numbers
    titleAlignment: 'center'           // Title alignment: 'left' or 'center'
};

// Global variables
let weeklySchedule = {};
let isCalendarInitialized = false;
let calendarContainer = null;
let countdownInterval = null;
let originalPlusButtons = {};  // Store original plus buttons
let originalCoverImages = {};  // Store original cover images

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

    /* Add separator for Today option in dropdown */
    .option-separator {
      border-bottom: 1px solid #3db4f2;
      margin-bottom: 6px;
      padding-bottom: 6px;
    }
  `;
    document.head.appendChild(styleForceBackground);
}

/**
 * Main initialization function
 */
function initialize() {
    log("Initializing extension");

    try {
        // Clear any existing countdown interval to prevent multiple timers
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }

        // Reset global variables on each initialization
        originalPlusButtons = {};

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
                if (userPreferences.timeFormat === 'countdown') {
                    startCountdownTimer();
                }
            });

        // Set up error handler - use once to avoid duplicates
        window.removeEventListener('error', handleGlobalError);
        window.addEventListener('error', handleGlobalError);

        // Initialize settings button events globally
        initSettingsButtonEvents();

    } catch (err) {
        log("Error during initialization", err);
    }
}

// Separate function for error handler to allow removal
function handleGlobalError(event) {
    log("Global error caught", event.error);
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

let domObserver = null;

/**
 * Sets up a mutation observer to watch for DOM changes
 */
function setupObserver() {
    if (domObserver) {
        domObserver.disconnect();
        domObserver = null;
    }

    // Debounce function to limit frequent calls
    let debounceTimer = null;
    const debounce = (callback, time) => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(callback, time);
    };

    domObserver = new MutationObserver((mutations) => {
        // Skip processing if calendar is already initialized or no mutations to process
        if (isCalendarInitialized || mutations.length === 0) return;

        // Check if mutations are relevant (add more specific filters)
        const relevantMutation = mutations.some(mutation => {
            // Only process mutations with added nodes that might contain the airing section
            if (mutation.addedNodes.length === 0) return false;

            // Check if any of the added nodes might contain the airing section
            return Array.from(mutation.addedNodes).some(node => {
                if (node.nodeType !== Node.ELEMENT_NODE) return false;

                // Check if node or its children might contain the airing section
                return node.textContent &&
                    (node.textContent.includes('Airing') ||
                        node.classList && (
                            node.classList.contains('home') ||
                            node.classList.contains('section-header') ||
                            node.classList.contains('content-wrap')
                        )
                    );
            });
        });

        if (relevantMutation) {
            // Use debounce to avoid multiple rapid calls
            debounce(() => {
                log("Relevant DOM changes detected - attempting to find Airing section");
                findAndReplaceAiringSection();
            }, 200);
        }
    });

    domObserver.observe(document.body, {
        childList: true,
        subtree: true
    });

    log("Observer set up with improved filtering");
}

/**
 * Creates settings button with fixed z-index
 */
function createSettingsButton() {
    const settingsButton = document.createElement('button');
    settingsButton.className = 'calendar-settings-btn header-settings-btn';
    settingsButton.title = 'Open settings';
    settingsButton.innerHTML = '<i class="fa fa-cog" style="font-size: 14px;"></i>';

    // Open settings overlay when settings button is clicked
    settingsButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        try {
            // Show the settings overlay
            createSettingsOverlay();
        } catch (err) {
            // Fallback
            createSettingsOverlay();
        }
    });

    return settingsButton;
}

/**
 * Finds and replaces the Airing section with unified header
 */
function findAndReplaceAiringSection() {
    try {
        log("Attempting to find Airing section...");

        // Function to find elements by text content (jQuery-like :contains)
        function findElementsContainingText(selector, text) {
            const elements = document.querySelectorAll(selector);
            return Array.from(elements).filter(el =>
                el.textContent.trim().includes(text)
            );
        }

        // Try all potential selectors
        let airingElement = null;

        // First method: Direct approach with h2 elements
        const airingH2Elements = findElementsContainingText('h2', 'Airing');
        log(`Found ${airingH2Elements.length} h2 elements containing "Airing" text`);

        if (airingH2Elements.length > 0) {
            // Filter for exact matches
            const exactAiringH2 = airingH2Elements.filter(el => el.textContent.trim() === 'Airing');

            if (exactAiringH2.length > 0) {
                airingElement = exactAiringH2[0];
                log("Found exact 'Airing' h2 element");
            } else {
                airingElement = airingH2Elements[0];
                log("Found h2 element containing 'Airing'");
            }
        }

        // Second method: Look for section headers if not found yet
        if (!airingElement) {
            const sectionHeaders = document.querySelectorAll('.section-header');
            log(`Found ${sectionHeaders.length} section headers to check`);

            for (const header of sectionHeaders) {
                if (header.textContent.includes('Airing')) {
                    airingElement = header;
                    log("Found section header containing 'Airing'");
                    break;
                }
            }
        }

        // Third method: Look in the home sections
        if (!airingElement) {
            const homeSections = document.querySelectorAll('.home section');
            log(`Found ${homeSections.length} home sections to check`);

            for (const section of homeSections) {
                if (section.textContent.includes('Airing')) {
                    // Find the header within this section
                    const headerInSection = section.querySelector('h2, h3, .section-header');
                    if (headerInSection) {
                        airingElement = headerInSection;
                        log("Found header in home section containing 'Airing'");
                        break;
                    }
                }
            }
        }

        // Fourth method: Look for any elements with class containing "airing"
        if (!airingElement) {
            const airingClassElements = document.querySelectorAll('[class*="airing" i], [class*="Airing" i]');
            log(`Found ${airingClassElements.length} elements with class containing "airing"`);

            if (airingClassElements.length > 0) {
                // Find a header near these elements
                for (const el of airingClassElements) {
                    const nearbyHeader = el.querySelector('h2, h3, .section-header') ||
                        el.closest('.section-header') ||
                        el.closest('section')?.querySelector('h2, h3, .section-header');

                    if (nearbyHeader) {
                        airingElement = nearbyHeader;
                        log("Found header near element with class containing 'airing'");
                        break;
                    }
                }

                // If still not found, use the first element itself
                if (!airingElement && airingClassElements[0].tagName.toLowerCase() === 'section') {
                    airingElement = airingClassElements[0].querySelector('h2, h3, .section-header') || airingClassElements[0];
                    log("Using element with class containing 'airing' itself");
                }
            }
        }

        // If still not found, just log and return
        if (!airingElement) {
            log("Airing section not found in this page pass - will retry on DOM changes");
            return false;
        }

        // Now that we have a potential airing element, process it
        log("Found potential Airing element:", airingElement);

        // Find the inner header element if we're dealing with a container
        const headerElement = airingElement.tagName.toLowerCase() === 'h2' || airingElement.tagName.toLowerCase() === 'h3'
            ? airingElement
            : airingElement.querySelector('h2, h3');

        // Replace the header text
        if (headerElement) {
            headerElement.innerHTML = `Weekly Schedule <span class="timezone-separator">|</span> <span class="timezone-info">${getTimezoneName()}</span>`;
            headerElement.className = 'airing-replaced-header';
            log("Replaced header text");
        }

        // Add settings button
        const settingsButton = createSettingsButton();
        const parentHeader = airingElement.closest('.section-header') || airingElement.parentNode;
        parentHeader.appendChild(settingsButton);

        // Remove any margin or padding that might create unwanted space
        if (parentHeader) {
            parentHeader.style.marginBottom = "0";
            parentHeader.style.paddingBottom = "6px";
        }

        // Find the container that holds the anime cards
        const container = findAiringContainer(airingElement);

        if (container) {
            // Remove any margin that might create space
            container.style.marginTop = "0";

            log("Found container for Airing section, replacing with calendar", container);
            replaceAiringSection(container, airingElement, true);
            return true;
        } else {
            log("Container for Airing section not found");
            return false;
        }
    } catch (err) {
        log("Error finding Airing section", err);
        return false;
    }
}

/**
 * Finds the container for an Airing header element
 */
function findAiringContainer(headerElement) {
    try {
        log("Finding container for Airing header element", headerElement);

        // Method 1: Try to find via section-header and list-preview-wrap
        const sectionHeader = headerElement.closest('.section-header');
        if (sectionHeader) {
            log("Found section header container", sectionHeader);

            const listPreviewWrap = sectionHeader.closest('.list-preview-wrap');
            if (listPreviewWrap) {
                log("Found container via list-preview-wrap", listPreviewWrap);
                return listPreviewWrap;
            }

            const listPreview = sectionHeader.closest('.list-preview');
            if (listPreview) {
                log("Found container via list-preview", listPreview);
                return listPreview;
            }

            // If the section header has a nextSibling, that might be our container
            if (sectionHeader.nextElementSibling &&
                (sectionHeader.nextElementSibling.classList.contains('list-wrap') ||
                    sectionHeader.nextElementSibling.classList.contains('content-wrap'))) {
                log("Found container via next sibling", sectionHeader.nextElementSibling);
                return sectionHeader.nextElementSibling;
            }
        }

        // Method 2: Find the section containing both the header and anime cards
        let currentElement = headerElement;
        for (let i = 0; i < 5; i++) {
            // Go up the DOM tree
            currentElement = currentElement.parentElement;
            if (!currentElement) break;

            log(`Checking container at level ${i}`, currentElement);

            // Check if this element contains media preview cards
            const mediaCards = currentElement.querySelectorAll('.media-preview-card');
            if (mediaCards.length > 0) {
                log(`Found container with ${mediaCards.length} media cards`, currentElement);
                return currentElement;
            }

            // Check for other common container classes
            if (currentElement.classList.contains('list-wrap') ||
                currentElement.classList.contains('content-wrap') ||
                currentElement.classList.contains('list-preview-wrap') ||
                currentElement.classList.contains('list-preview') ||
                currentElement.classList.contains('airing-content')) {
                log("Found container via class name", currentElement);
                return currentElement;
            }
        }

        // Method 3: Find container by searching siblings of the header's parent
        if (headerElement.parentElement) {
            const siblings = headerElement.parentElement.parentElement?.children;
            if (siblings) {
                for (let i = 0; i < siblings.length; i++) {
                    const sibling = siblings[i];

                    // Skip the header element itself
                    if (sibling === headerElement.parentElement) continue;

                    // Check if this sibling contains media cards
                    const mediaCards = sibling.querySelectorAll('.media-preview-card');
                    if (mediaCards.length > 0) {
                        log(`Found container in sibling with ${mediaCards.length} media cards`, sibling);
                        return sibling;
                    }
                }
            }
        }

        // Method 4: Look for the nearest parent section
        const parentSection = headerElement.closest('section');
        if (parentSection) {
            log("Using parent section as container", parentSection);
            return parentSection;
        }

        // Method 5: Last resort - use a generic container higher up
        if (headerElement.parentElement && headerElement.parentElement.parentElement) {
            log("Using generic parent container as fallback", headerElement.parentElement.parentElement);
            return headerElement.parentElement.parentElement;
        }

        log("No suitable container found");
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

        // Apply layout mode class
        calendarContainer.classList.add(`${userPreferences.layoutMode}-mode`);

        // Apply title alignment class
        calendarContainer.classList.add(`title-${userPreferences.titleAlignment}`);

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

        // Start the countdown timer if needed
        if (userPreferences.timeFormat === 'countdown') {
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

                log("Processing:", {
                    id: animeId,
                    title: rawTitle,
                    infoHeader: infoHeaderText
                });

                if (CONFIG.debug) {
                    const infoEl = card.querySelector('.info');
                    const mobileEl = card.querySelector('.plus-progress.mobile');

                    console.log("Info elements:", {
                        info: infoEl ? infoEl.textContent : null,
                        mobile: mobileEl ? mobileEl.textContent : null
                    });
                }

                // IMPORTANT: Save original plus button
                const plusButton = card.querySelector('.plus-progress, .add-button');
                if (plusButton) {
                    originalPlusButtons[animeId] = plusButton;
                    log(`Saved original plus button for anime ID: ${animeId}`);
                }

                // Parse episode information
                const episodeInfo = parseEpisodeInfo(rawTitle, card);

                // Get cover image
                const coverImgElement = card.querySelector('img') || card.querySelector('.cover');
                const coverImage = getCoverImage(coverImgElement);

                // IMPORTANTE: Salva l'elemento immagine originale
                if (coverImgElement) {
                    originalCoverImages[animeId] = coverImgElement.cloneNode(true);
                    log(`Saved original cover image for anime ID: ${animeId}`);
                }

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
 * Creates an anime entry element with improved image handling
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
    entry.style.transform = 'none'; // Ensure no transform by default

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
    imageContainer.style.transform = 'none'; // Ensure no transform
    imageContainer.style.backgroundColor = '#1A1A2E'; // Ensure visible background

    // Verifica se abbiamo l'immagine originale
    if (originalCoverImages[anime.id]) {
        log(`Using original cover image for anime ID: ${anime.id}`);

        // Clona l'immagine originale per evitare conflitti DOM
        const originalImg = originalCoverImages[anime.id];
        const clonedImg = originalImg.cloneNode(true);

        // Assicurati che gli stili siano corretti per il nostro layout
        clonedImg.style.width = '100%';
        clonedImg.style.height = '100%';
        clonedImg.style.objectFit = 'cover';
        clonedImg.style.position = 'absolute';
        clonedImg.style.top = '0';
        clonedImg.style.left = '0';
        clonedImg.style.zIndex = '1';
        clonedImg.style.transform = 'none';

        imageContainer.appendChild(clonedImg);
    } else {
        // Fallback al metodo originale se l'immagine originale non è disponibile
        if (anime.coverImage && anime.coverImage.length > 10) {
            // Preload a placeholder until the actual image loads
            imageContainer.classList.add('loading');

            const img = document.createElement('img');
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            img.style.position = 'absolute';
            img.style.top = '0';
            img.style.left = '0';
            img.style.zIndex = '1';
            img.style.transform = 'none'; // Ensure no transform
            img.setAttribute('loading', 'eager');
            img.setAttribute('decoding', 'async');
            img.setAttribute('crossorigin', 'anonymous'); // Try to fix CORS issues

            // Add error handling with enhanced retry
            let retryCount = 0;
            const maxRetries = 3;

            const loadImage = (src) => {
                console.log(`Loading image for ${anime.cleanTitle}: ${src}`);
                // Clean up the URL if it contains special characters
                img.src = src.replace(/"/g, '%22').replace(/'/g, '%27');
            };

            img.onerror = () => {
                console.warn(`Image load error for ${anime.cleanTitle}`);
                if (retryCount < maxRetries) {
                    retryCount++;
                    // Try with different cache-busting strategies
                    setTimeout(() => {
                        if (retryCount === 1) {
                            // First retry - add cache buster
                            loadImage(anime.coverImage + '?retry=' + Date.now());
                        } else if (retryCount === 2) {
                            // Second retry - try to extract URL if it's complex
                            const simplifiedUrl = anime.coverImage.split('?')[0];
                            loadImage(simplifiedUrl);
                        } else {
                            // Last retry - try with a different approach
                            const baseUrl = anime.coverImage.replace(/https?:\/\//, '');
                            loadImage('https://' + baseUrl);
                        }
                    }, 800 * retryCount); // Increase delay for each retry
                } else {
                    // Display fallback after retries fail
                    console.error(`Failed to load image for ${anime.cleanTitle} after ${maxRetries} retries`);
                    img.style.display = 'none';
                    imageContainer.classList.remove('loading');
                    imageContainer.classList.add('error');
                    showFallbackImage(imageContainer, anime);
                }
            };

            img.onload = () => {
                console.log(`Image loaded successfully for ${anime.cleanTitle}`);
                // Remove loading animation
                imageContainer.classList.remove('loading');
                imageContainer.style.background = 'none';
                imageContainer.style.animation = 'none';
            };

            // Set source after defining handlers
            loadImage(anime.coverImage);
            imageContainer.appendChild(img);
        } else {
            // No valid image URL - show fallback
            imageContainer.classList.add('error');
            showFallbackImage(imageContainer, anime);
        }
    }

    function showFallbackImage(container, anime) {
        // Show first letter of title as fallback
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
        container.appendChild(initialLetter);
    }

    // Create a container for the + button with isolated animation
    const plusButtonContainer = document.createElement('div');
    plusButtonContainer.className = 'plus-button-container';
    plusButtonContainer.style.transform = 'none'; // Ensure no transform

    // Create the + button - fixed dark background even on hover
    const plusButton = document.createElement('div');
    plusButton.className = 'plus-button';
    plusButton.style.transform = 'none'; // Ensure no transform

    // Plus icon as a separate element
    const plusIcon = document.createElement('i');
    plusIcon.className = 'fa fa-plus';
    plusIcon.style.fontSize = '24px';
    plusIcon.style.color = 'white';

    // Create a clickable button element to contain the icon with proper animation
    const iconContainer = document.createElement('div');
    iconContainer.className = 'plus-icon-container';
    iconContainer.appendChild(plusIcon);
    plusButton.appendChild(iconContainer);

    // Handle click event with isolated animation only on the icon container
    plusButton.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();

        // Prevent animation propagation
        e.stopImmediatePropagation();

        // Apply animation only to the icon container
        iconContainer.classList.add('plus-icon-active');
        setTimeout(() => {
            iconContainer.classList.remove('plus-icon-active');
        }, 300);

        // Increment episode count
        handlePlusButtonClick(e, anime);

        // Return false to prevent further propagation
        return false;
    });

    plusButtonContainer.appendChild(plusButton);
    imageContainer.appendChild(plusButtonContainer);
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
    title.style.maxHeight = '2.4em';
    title.style.marginBottom = '6px';
    title.style.whiteSpace = 'normal';
    title.style.overflow = 'hidden';
    title.style.textOverflow = 'ellipsis';
    title.style.setProperty('display', '-webkit-box');
    title.style.setProperty('-webkit-line-clamp', '2');
    title.style.setProperty('-webkit-box-orient', 'vertical');
    title.style.setProperty('line-clamp', '2');

    // Apply title alignment based on user preferences
    title.style.textAlign = userPreferences.titleAlignment;

    infoContainer.appendChild(title);

    // Info row (episodes and time)
    const infoRow = document.createElement('div');
    infoRow.className = 'anime-info-row';
    infoRow.style.marginTop = '1px';
    infoRow.style.gap = '6px';

    // Only add episode info and time if they should be shown
    if (userPreferences.showEpisodeNumbers || userPreferences.showTime) {
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
        if (userPreferences.showTime) {
            const timeDisplay = document.createElement('div');
            timeDisplay.className = 'anime-time';
            timeDisplay.style.paddingRight = '10px';

            if (userPreferences.timeFormat === 'countdown') {
                timeDisplay.classList.add('countdown-mode');

                const now = new Date();
                const targetTime = new Date(anime.airingDate);
                const diff = targetTime - now;

                if (diff <= 0) {
                    timeDisplay.textContent = "Aired";
                } else {
                    const { days, hours, minutes } = calculateTimeComponents(diff);

                    if (days > 0) {
                        timeDisplay.textContent = `${days}:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                    } else {
                        // Don't show seconds
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
        }

        infoContainer.appendChild(infoRow);
    }
    entry.appendChild(infoContainer);

    container.appendChild(entry);
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
    if (timezone && timezone.shortText) {
        return timezone.shortText;
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
    daysToShow.forEach((day, index) => {
        const dayCol = document.createElement('div');

        // Add classes to properly style current day
        const classes = ['anilist-calendar-day'];
        if (day === currentDayName) {
            classes.push('current-day');
        }

        // Add class for "Today" column when it's the first one
        if (userPreferences.startDay === 'today' && index === 0) {
            classes.push('today-column');
        }

        dayCol.className = classes.join(' ');

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
        if (userPreferences.timeFormat !== 'countdown') return;

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
            const { days, hours, minutes } = calculateTimeComponents(diff);

            // Update the text
            if (days > 0) {
                element.textContent = `${days}:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            } else {
                // Don't show seconds, only hours and minutes
                element.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            }
        });
    }, 1000);
}

function calculateTimeComponents(diff) {
    return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    };
}

/**
 * Creates a settings overlay with organized sections and tabs
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

    // Create tabs container
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'settings-tabs';

    // Create tab buttons
    const layoutTab = createTabButton('Layout', 'layout-tab', true);
    const calendarTab = createTabButton('Calendar', 'calendar-tab');
    const timeTab = createTabButton('Time', 'time-tab');

    tabsContainer.appendChild(layoutTab);
    tabsContainer.appendChild(calendarTab);
    tabsContainer.appendChild(timeTab);

    settingsPanel.appendChild(tabsContainer);

    // Create tab content containers
    const layoutContent = document.createElement('div');
    layoutContent.id = 'layout-tab-content';
    layoutContent.className = 'tab-content active';

    const calendarContent = document.createElement('div');
    calendarContent.id = 'calendar-tab-content';
    calendarContent.className = 'tab-content';

    const timeContent = document.createElement('div');
    timeContent.id = 'time-tab-content';
    timeContent.className = 'tab-content';

    //-----------------------------------------------------
    // LAYOUT & DISPLAY TAB CONTENT
    //-----------------------------------------------------
    // Layout mode setting
    const layoutModeRow = createSettingRow(
        'Layout style',
        'Choose how anime entries are displayed',
        createSelect('layout-mode', [
            { value: 'standard', text: 'Standard' },
            { value: 'compact', text: 'Compact' },
            { value: 'extended', text: 'Gallery' }
        ], userPreferences.layoutMode)
    );
    layoutContent.appendChild(layoutModeRow);

    // Title alignment setting
    const titleAlignmentRow = createSettingRow(
        'Title alignment',
        'Choose how anime titles are aligned',
        createSelect('title-alignment', [
            { value: 'left', text: 'Left aligned' },
            { value: 'center', text: 'Center aligned' }
        ], userPreferences.titleAlignment)
    );
    layoutContent.appendChild(titleAlignmentRow);

    // Hide empty days setting
    const hideEmptyDaysRow = createSettingRow(
        'Hide empty days',
        'Only show days with scheduled episodes',
        createToggle('hide-empty-days', userPreferences.hideEmptyDays)
    );
    layoutContent.appendChild(hideEmptyDaysRow);

    //-----------------------------------------------------
    // CALENDAR TAB CONTENT
    //-----------------------------------------------------
    // Start day setting with visual separator
    const startDaySelect = createSelect('start-day', [
        { value: 'today', text: 'Today', separator: true },
        { value: '0', text: 'Sunday' },
        { value: '1', text: 'Monday' },
        { value: '2', text: 'Tuesday' },
        { value: '3', text: 'Wednesday' },
        { value: '4', text: 'Thursday' },
        { value: '5', text: 'Friday' },
        { value: '6', text: 'Saturday' }
    ], userPreferences.startDay);

    const startDayRow = createSettingRow(
        'First day of the week',
        'Choose which day to display first in the calendar',
        startDaySelect
    );
    calendarContent.appendChild(startDayRow);

    // Show episode numbers setting
    const showEpisodeNumbersRow = createSettingRow(
        'Show episode numbers',
        'Display episode numbers in the calendar',
        createToggle('show-episode-numbers', userPreferences.showEpisodeNumbers)
    );
    calendarContent.appendChild(showEpisodeNumbersRow);

    //-----------------------------------------------------
    // TIME & TIMEZONE TAB CONTENT
    //-----------------------------------------------------
    // Show time setting
    const showTimeRow = createSettingRow(
        'Show time',
        'Display time information for each anime',
        createToggle('show-time', userPreferences.showTime)
    );
    timeContent.appendChild(showTimeRow);

    // Time format setting
    const timeFormatRow = createSettingRow(
        'Time format',
        'Choose between countdown or release time',
        createSelect('time-format', [
            { value: 'release', text: 'Release Time' },
            { value: 'countdown', text: 'Countdown' }
        ], userPreferences.timeFormat)
    );
    timeContent.appendChild(timeFormatRow);

    // Timezone select with short display names
    const timezoneSelect = document.createElement('select');
    timezoneSelect.id = 'timezone';
    timezoneSelect.className = 'settings-select';
    timezoneSelect.style.textAlign = 'center';
    timezoneSelect.style.width = '180px'; // Wider for timezone options

    // Create options with full text in dropdown but display short version when selected
    for (const tz of TIMEZONE_OPTIONS) {
        const option = document.createElement('option');
        option.value = tz.value;
        option.textContent = tz.text;
        option.dataset.shortText = tz.shortText; // Store short text in data attribute
        if (tz.value === userPreferences.timezone) {
            option.selected = true;
            // Display short version for selected item
            option.textContent = tz.shortText;
        }
        timezoneSelect.appendChild(option);
    }

    // Handle change event to update the display of selected item to short version
    timezoneSelect.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        const shortText = selectedOption.dataset.shortText;

        // Reset all options to full text
        for (let i = 0; i < this.options.length; i++) {
            const opt = this.options[i];
            const tz = TIMEZONE_OPTIONS.find(t => t.value === opt.value);
            if (tz) {
                opt.textContent = tz.text;
            }
        }

        // Set selected option to short text
        if (shortText) {
            selectedOption.textContent = shortText;
        }
    });

    const timezoneRow = createSettingRow(
        'Timezone',
        'Adjust anime airing times to your timezone',
        timezoneSelect
    );
    timeContent.appendChild(timezoneRow);

    // Add all tab contents to panel
    settingsPanel.appendChild(layoutContent);
    settingsPanel.appendChild(calendarContent);
    settingsPanel.appendChild(timeContent);

    // Add tab switching functionality
    layoutTab.addEventListener('click', () => switchTab('layout-tab'));
    calendarTab.addEventListener('click', () => switchTab('calendar-tab'));
    timeTab.addEventListener('click', () => switchTab('time-tab'));

    // Save button
    const saveContainer = document.createElement('div');
    saveContainer.className = 'settings-save-container';

    const saveButton = document.createElement('button');
    saveButton.className = 'settings-save-btn';
    saveButton.innerHTML = '<i class="fa fa-save"></i> Save Changes';
    saveButton.style.backgroundColor = '#3db4f2';
    saveButton.style.color = 'white';
    saveButton.addEventListener('click', () => {
        // Get values directly from form elements
        const startDay = document.getElementById('start-day')?.value || userPreferences.startDay;
        const hideEmptyDays = document.getElementById('hide-empty-days')?.checked ?? userPreferences.hideEmptyDays;
        const layoutMode = document.getElementById('layout-mode')?.value || userPreferences.layoutMode;
        const timeFormat = document.getElementById('time-format')?.value || userPreferences.timeFormat;
        const showTime = document.getElementById('show-time')?.checked ?? userPreferences.showTime;
        const showEpisodeNumbers = document.getElementById('show-episode-numbers')?.checked ?? userPreferences.showEpisodeNumbers;
        const timezone = document.getElementById('timezone')?.value || userPreferences.timezone;
        const titleAlignment = document.getElementById('title-alignment')?.value || userPreferences.titleAlignment;

        // Store previous values for comparison
        const prevTimeFormat = userPreferences.timeFormat;
        const prevTimezone = userPreferences.timezone;
        const prevTitleAlignment = userPreferences.titleAlignment;

        // Update preferences
        userPreferences.startDay = startDay;
        userPreferences.hideEmptyDays = hideEmptyDays;
        userPreferences.layoutMode = layoutMode;
        userPreferences.timeFormat = timeFormat;
        userPreferences.showTime = showTime;
        userPreferences.showEpisodeNumbers = showEpisodeNumbers;
        userPreferences.timezone = timezone;
        userPreferences.titleAlignment = titleAlignment;

        // Save to storage
        saveUserPreferences();

        // Show notification
        showNotification('Settings saved!', 'success');

        // Close overlay
        overlayContainer.classList.remove('active');
        setTimeout(() => {
            overlayContainer.remove();
        }, 300);

        // Update UI without page refresh
        updateUIWithSettings(prevTimeFormat, prevTimezone, prevTitleAlignment);
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

    // Function to switch tabs
    function switchTab(tabId) {
        // Remove active class from all tabs
        const tabs = document.querySelectorAll('.settings-tab');
        tabs.forEach(tab => tab.classList.remove('active'));

        // Remove active class from all content
        const contents = document.querySelectorAll('.tab-content');
        contents.forEach(content => content.classList.remove('active'));

        // Add active class to selected tab
        document.getElementById(tabId).classList.add('active');

        // Add active class to selected content
        document.getElementById(tabId + '-content').classList.add('active');
    }
}

/**
 * Creates a tab button
 */
function createTabButton(text, id, isActive = false) {
    const button = document.createElement('button');
    button.textContent = text;
    button.id = id;
    button.className = 'settings-tab';
    if (isActive) {
        button.classList.add('active');
    }
    return button;
}

/**
 * Updates UI directly after saving settings without page refresh
 */
function updateUIWithSettings(prevTimeFormat, prevTimezone, prevTitleAlignment) {
    // Update calendar container classes
    if (calendarContainer) {
        // Update layout mode and title alignment
        calendarContainer.className = 'anilist-weekly-calendar';
        calendarContainer.classList.add(`${userPreferences.layoutMode}-mode`);
        calendarContainer.classList.add(`title-${userPreferences.titleAlignment}`);

        // If title alignment changed, update all titles
        if (prevTitleAlignment !== userPreferences.titleAlignment) {
            const titles = calendarContainer.querySelectorAll('.anime-title');
            titles.forEach(title => {
                title.style.textAlign = userPreferences.titleAlignment;
            });
        }

        // Re-render calendar with new settings
        renderCalendar(weeklySchedule, true);

        // Update timezone info displayed in header
        const timezoneInfo = document.querySelector('.timezone-info');
        if (timezoneInfo) {
            timezoneInfo.textContent = getTimezoneName();
        }

        // Handle countdown timer changes
        if (prevTimeFormat !== userPreferences.timeFormat) {
            if (userPreferences.timeFormat === 'countdown') {
                startCountdownTimer();
            } else if (countdownInterval) {
                clearInterval(countdownInterval);
                countdownInterval = null;
            }
        }

        // If timezone changed, we need to recalculate all airing dates
        if (prevTimezone !== userPreferences.timezone) {
            // This would require refreshing the page or recalculating all dates
            // For a complete solution we'd need to extract anime data again
            // Let's show a notification that a refresh is needed in this case
            showNotification('Timezone changed! Refreshing page...', 'loading');
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        }
    }
}

/**
 * Creates a settings row with label and control
 */
function createSettingRow(label, description, control) {
    const row = document.createElement('div');
    row.className = 'settings-row';
    row.style.backgroundColor = '#0B1622';
    row.style.borderBottom = '1px solid rgba(70, 70, 80, 0.3)';
    row.style.textAlign = 'left'; // Ensure left alignment for text

    const labelContainer = document.createElement('div');
    labelContainer.style.textAlign = 'left'; // Ensure left alignment

    const labelText = document.createElement('div');
    labelText.className = 'settings-label';
    labelText.textContent = label;
    labelText.style.textAlign = 'left'; // Ensure left alignment

    const descText = document.createElement('div');
    descText.className = 'settings-description';
    descText.textContent = description;
    descText.style.textAlign = 'left'; // Ensure left alignment

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
    select.style.textAlign = 'center';
    select.style.width = '150px';
    select.style.paddingLeft = '0';

    // Generate options with separators if needed
    options.forEach((option) => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.text;
        optionElement.style.textAlign = 'center';

        // Add separator class if specified
        if (option.separator) {
            optionElement.className = 'option-separator';
        }

        // Store short text for timezone display
        if (option.shortText) {
            optionElement.dataset.short = option.shortText;
        }

        select.appendChild(optionElement);
    });

    // Set the selected value
    select.value = selectedValue;

    // Special handling for timezone select - display short version
    if (id === 'timezone') {
        select.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            const shortText = selectedOption.dataset.short;
            if (shortText) {
                // Store original text for reference
                if (!selectedOption.dataset.originalText) {
                    selectedOption.dataset.originalText = selectedOption.textContent;
                }
                // Display only the short version when selected
                selectedOption.textContent = shortText;
            }
        });

        // Apply short text to initial selection
        const selectedOption = select.options[select.selectedIndex];
        if (selectedOption && selectedOption.dataset.short) {
            // Store original text
            selectedOption.dataset.originalText = selectedOption.textContent;
            // Set short text
            selectedOption.textContent = selectedOption.dataset.short;
        }
    }

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
    slider.style.backgroundColor = checked ? '#3db4f2' : '#2c3e50';

    // Update slider color when toggled
    input.addEventListener('change', function() {
        slider.style.backgroundColor = this.checked ? '#3db4f2' : '#2c3e50';
    });

    toggle.appendChild(input);
    toggle.appendChild(slider);

    return toggle;
}

/**
 * Shows a notification
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
 * Handle the plus button click event - uses original plus button
 */
function handlePlusButtonClick(e, animeData) {
    e.stopPropagation(); // Prevent the click from bubbling to the entry
    e.preventDefault(); // Prevent default behaviors

    if (!animeData || !animeData.id) {
        console.error('No anime data available for this entry');
        return;
    }

    // Retrieve the original plus button
    const originalButton = originalPlusButtons[animeData.id];

    if (originalButton) {
        log(`Clicking original plus button for anime ID: ${animeData.id}`);

        // Show loading notification
        showNotification(`Updating episode progress...`, 'loading');

        // Simulate a click on the original button
        originalButton.click();

        // Update our UI after a short delay
        setTimeout(() => {
            updateAnimeEntryInUI(animeData.id, (animeData.watched || 0) + 1);
            showNotification(`Episode marked as watched!`, 'success');
        }, 800);

        return;
    }

    // Fallback if original button not found
    showNotification('Cannot update progress (original button not found)', 'error');
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

        // Update the stored data - IMPORTANT: update the data in the DOM element
        let animeData = getAnimeDataFromEntry(entry);
        if (animeData) {
            animeData.watched = newProgress;
            // If we've caught up, zero out the behind count
            if (animeData.episodesBehind > 0 && animeData.watched >= animeData.available) {
                animeData.episodesBehind = 0;
            }

            // Update available if necessary
            if (animeData.available < newProgress) {
                animeData.available = newProgress;
            }

            // Save updated data to the data attribute
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

                // Update available if necessary
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
                `${CONFIG.storageKeyPrefix}layout_mode`,
                `${CONFIG.storageKeyPrefix}time_format`,
                `${CONFIG.storageKeyPrefix}show_time`,
                `${CONFIG.storageKeyPrefix}show_episode_numbers`,
                `${CONFIG.storageKeyPrefix}timezone`,
                `${CONFIG.storageKeyPrefix}title_alignment`
            ], function(result) {
                if (result[`${CONFIG.storageKeyPrefix}start_day`] !== undefined) {
                    userPreferences.startDay = result[`${CONFIG.storageKeyPrefix}start_day`];
                }
                if (result[`${CONFIG.storageKeyPrefix}hide_empty_days`] !== undefined) {
                    userPreferences.hideEmptyDays = result[`${CONFIG.storageKeyPrefix}hide_empty_days`];
                }
                if (result[`${CONFIG.storageKeyPrefix}layout_mode`] !== undefined) {
                    userPreferences.layoutMode = result[`${CONFIG.storageKeyPrefix}layout_mode`];
                }
                if (result[`${CONFIG.storageKeyPrefix}time_format`] !== undefined) {
                    userPreferences.timeFormat = result[`${CONFIG.storageKeyPrefix}time_format`];
                }
                if (result[`${CONFIG.storageKeyPrefix}show_time`] !== undefined) {
                    userPreferences.showTime = result[`${CONFIG.storageKeyPrefix}show_time`];
                }
                if (result[`${CONFIG.storageKeyPrefix}show_episode_numbers`] !== undefined) {
                    userPreferences.showEpisodeNumbers = result[`${CONFIG.storageKeyPrefix}show_episode_numbers`];
                }
                if (result[`${CONFIG.storageKeyPrefix}timezone`] !== undefined) {
                    userPreferences.timezone = result[`${CONFIG.storageKeyPrefix}timezone`];
                }
                if (result[`${CONFIG.storageKeyPrefix}title_alignment`] !== undefined) {
                    userPreferences.titleAlignment = result[`${CONFIG.storageKeyPrefix}title_alignment`];
                }

                // Backward compatibility
                if (result[`${CONFIG.storageKeyPrefix}compact_mode`] === true) {
                    userPreferences.layoutMode = 'compact';
                } else if (result[`${CONFIG.storageKeyPrefix}grid_mode`] === true) {
                    userPreferences.layoutMode = 'extended';
                }

                if (result[`${CONFIG.storageKeyPrefix}show_countdown`] === true) {
                    userPreferences.timeFormat = 'countdown';
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
            [`${CONFIG.storageKeyPrefix}layout_mode`]: userPreferences.layoutMode,
            [`${CONFIG.storageKeyPrefix}time_format`]: userPreferences.timeFormat,
            [`${CONFIG.storageKeyPrefix}show_time`]: userPreferences.showTime,
            [`${CONFIG.storageKeyPrefix}show_episode_numbers`]: userPreferences.showEpisodeNumbers,
            [`${CONFIG.storageKeyPrefix}timezone`]: userPreferences.timezone,
            [`${CONFIG.storageKeyPrefix}title_alignment`]: userPreferences.titleAlignment
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
        console.log("[Anilist Calendar] DOM Content Loaded - initializing...");
        loadFontAwesome();
        initialize();
    });
} else {
    console.log("[Anilist Calendar] Document already loaded - initializing immediately...");
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