/**
 * Anilist Weekly Schedule - Main Script
 * This is the main entry point for the extension that initializes
 * the calendar and replaces the Airing section
 */

// Use the global namespace
const AniCal = window.AnilistCalendar;

/**
 * Main initialization function
 */
AniCal.main.initialize = function() {
    AniCal.utils.log("Initializing extension");

    try {
        // Clear any existing countdown interval to prevent multiple timers
        if (AniCal.state.countdownInterval) {
            clearInterval(AniCal.state.countdownInterval);
            AniCal.state.countdownInterval = null;
        }

        // Initialize global state objects if they don't exist
        if (!AniCal.state.originalPlusButtons) {
            AniCal.state.originalPlusButtons = {};
        }

        if (!AniCal.state.originalCoverImages) {
            AniCal.state.originalCoverImages = {};
        }

        // Initialize startup attempts counter if it doesn't exist
        if (typeof AniCal.state.startupAttempts !== 'number') {
            AniCal.state.startupAttempts = 0;
        }

        // Only reset initialization flag - preserve button and image references
        AniCal.state.isCalendarInitialized = false;

        // Detect and apply current theme
        AniCal.detectTheme();
        AniCal.applyTheme();
        AniCal.setupThemeObserver();

        // Preload FontAwesome icons
        AniCal.utils.preloadFontAwesomeIcons();

        // Load user preferences
        AniCal.settings.loadUserPreferences()
            .then(() => {
                // Look for the Airing section
                const isFound = AniCal.main.findAndReplaceAiringSection();
                AniCal.utils.log(`Initial calendar initialization ${isFound ? 'successful' : 'not successful'}`);

                // Record attempt result
                AniCal.state.startupAttempts++;
                AniCal.state.lastAttemptTime = Date.now();

                // Set up observer for future DOM changes
                AniCal.main.setupObserver();

                // Start countdown timer if enabled
                if (AniCal.userPreferences.timeFormat === 'countdown') {
                    AniCal.calendar.startCountdownTimer();
                }

                // Set up safety initialization check
                AniCal.main.setupSafetyInitialization();
            })
            .catch(err => {
                AniCal.utils.log("Error loading preferences", err);
                // Still try to initialize even if preferences fail
                AniCal.main.findAndReplaceAiringSection();

                // Set up safety initialization as well
                AniCal.main.setupSafetyInitialization();
            });

        // Set up error handler - use once to avoid duplicates
        window.removeEventListener('error', handleGlobalError);
        window.addEventListener('error', handleGlobalError);

        // Initialize settings button events globally
        AniCal.settingsUI.initSettingsButtonEvents();

    } catch (err) {
        AniCal.utils.log("Error during initialization", err);
        console.error("Anilist Weekly Calendar: Error during initialization", err);

        // Even if we have an error, set up safety initialization
        AniCal.main.setupSafetyInitialization();
    }
};

/**
 * Sets up a safety initialization mechanism that performs additional
 * initialization attempts if the calendar hasn't loaded properly
 */
AniCal.main.setupSafetyInitialization = function() {
    // Clear any existing safety timers
    if (AniCal.state.safetyTimer) {
        clearTimeout(AniCal.state.safetyTimer);
        AniCal.state.safetyTimer = null;
    }

    // Schedule staggered safety initialization attempts
    const safetyChecks = [
        { delay: 1000, reason: "Quick safety check" },
        { delay: 3000, reason: "Medium delay safety check" },
        { delay: 6000, reason: "Long delay safety check" },
        { delay: 12000, reason: "Final safety check" }
    ];

    safetyChecks.forEach(check => {
        setTimeout(() => {
            // Only proceed if calendar is not already initialized
            if (!AniCal.state.isCalendarInitialized) {
                AniCal.utils.log(`Safety initialization attempt (${check.reason})`);
                AniCal.state.startupAttempts++;

                // Try to find the Airing section again
                const isFound = AniCal.main.findAndReplaceAiringSection();
                AniCal.utils.log(`Safety initialization ${isFound ? 'successful' : 'still not successful'}`);

                // If still not initialized and this is the final check, try a more aggressive approach
                if (!AniCal.state.isCalendarInitialized && check.delay === 12000) {
                    AniCal.utils.log("Final safety check - performing aggressive initialization");
                    AniCal.main.performAggressiveInitialization();
                }
            }
        }, check.delay);
    });
};

/**
 * Performs a more aggressive initialization attempt as a last resort
 * This tries multiple selector approaches and DOM traversal strategies
 */
AniCal.main.performAggressiveInitialization = function() {
    AniCal.utils.log("Performing aggressive initialization");

    try {
        // Check if any anime data is visible on the page
        const animeCards = document.querySelectorAll('.media-preview-card, .airing-anime, .countdown-card, .media-card, [class*="airing" i], [data-media-id], [data-media-type="ANIME"]');

        if (animeCards.length > 0) {
            AniCal.utils.log(`Found ${animeCards.length} potential anime cards, attempting direct initialization`);

            // Scan for buttons and images
            AniCal.main.scanForAnimeButtons(true);

            // Try to extract anime data directly from the page
            const container = document.createElement('div');
            animeCards.forEach(card => container.appendChild(card.cloneNode(true)));

            // Process the extracted data
            const animeData = AniCal.calendar.extractAnimeDataFromDOM(container);

            if (animeData && animeData.length > 0) {
                AniCal.utils.log(`Successfully extracted ${animeData.length} anime entries, creating calendar`);

                // Check if we already have a calendar container
                if (!AniCal.state.calendarContainer) {
                    // Try to find a suitable container for our calendar
                    const possibleContainers = [
                        document.querySelector('.list-preview-wrap'),
                        document.querySelector('.content-wrap'),
                        document.querySelector('.list-wrap'),
                        document.querySelector('.page-content'),
                        document.querySelector('main'),
                        document.querySelector('.airing-content'),
                        // Fallback to body if nothing else works
                        document.body
                    ];

                    let targetContainer = null;
                    for (const container of possibleContainers) {
                        if (container) {
                            targetContainer = container;
                            break;
                        }
                    }

                    if (targetContainer) {
                        AniCal.utils.log(`Found target container: ${targetContainer.tagName}${targetContainer.className ? ' with class ' + targetContainer.className : ''}`);

                        // Create our calendar container
                        AniCal.state.calendarContainer = document.createElement('div');
                        AniCal.state.calendarContainer.className = 'anilist-weekly-calendar';
                        AniCal.state.calendarContainer.classList.add(`${AniCal.userPreferences.layoutMode}-mode`);
                        AniCal.state.calendarContainer.classList.add(`title-${AniCal.userPreferences.titleAlignment}`);

                        // Add our calendar to the page
                        targetContainer.prepend(AniCal.state.calendarContainer);

                        // Process data and render calendar
                        AniCal.state.weeklySchedule = AniCal.calendar.processAnimeData(animeData);
                        AniCal.calendar.renderCalendar(AniCal.state.weeklySchedule, false);

                        // Start countdown timer if needed
                        if (AniCal.userPreferences.timeFormat === 'countdown') {
                            AniCal.calendar.startCountdownTimer();
                        }

                        // Mark as initialized
                        AniCal.state.isCalendarInitialized = true;
                        AniCal.utils.log("Aggressive initialization successful");

                        return true;
                    }
                }
            }
        }

        // If we couldn't do direct initialization, try one more attempt with the standard approach
        return AniCal.main.findAndReplaceAiringSection();

    } catch (err) {
        AniCal.utils.log("Error during aggressive initialization", err);
        return false;
    }
};

/**
 * Error handler for global errors
 * @param {Event} event - The error event
 */
function handleGlobalError(event) {
    AniCal.utils.log("Global error caught", event.error);
}

/**
 * Sets up a mutation observer to watch for DOM changes
 */
AniCal.main.setupObserver = function() {
    if (AniCal.state.domObserver) {
        AniCal.state.domObserver.disconnect();
        AniCal.state.domObserver = null;
    }

    // Debounce function to limit frequent calls
    let debounceTimer = null;
    const debounce = (callback, time) => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(callback, time);
    };

    AniCal.state.domObserver = new MutationObserver((mutations) => {
        // Skip processing if calendar is already initialized or no mutations to process
        if (AniCal.state.isCalendarInitialized || mutations.length === 0) return;

        // Check if mutations are relevant
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
                AniCal.utils.log("Relevant DOM changes detected - attempting to find Airing section");
                AniCal.main.findAndReplaceAiringSection();
            }, 200);
        }
    });

    AniCal.state.domObserver.observe(document.body, {
        childList: true,
        subtree: true
    });

    AniCal.utils.log("Observer set up with improved filtering");
};

/**
 * Finds and replaces the Airing section with unified header
 * @return {boolean} Whether the replacement was successful
 */
AniCal.main.findAndReplaceAiringSection = function() {
    try {
        AniCal.utils.log("Attempting to find Airing section...");

        // Function to find elements by text content
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
        AniCal.utils.log(`Found ${airingH2Elements.length} h2 elements containing "Airing" text`);

        if (airingH2Elements.length > 0) {
            // Filter for exact matches
            const exactAiringH2 = airingH2Elements.filter(el => el.textContent.trim() === 'Airing');

            if (exactAiringH2.length > 0) {
                airingElement = exactAiringH2[0];
                AniCal.utils.log("Found exact 'Airing' h2 element");
            } else {
                airingElement = airingH2Elements[0];
                AniCal.utils.log("Found h2 element containing 'Airing'");
            }
        }

        // Second method: Look for section headers if not found yet
        if (!airingElement) {
            const sectionHeaders = document.querySelectorAll('.section-header');
            AniCal.utils.log(`Found ${sectionHeaders.length} section headers to check`);

            for (const header of sectionHeaders) {
                if (header.textContent.includes('Airing')) {
                    airingElement = header;
                    AniCal.utils.log("Found section header containing 'Airing'");
                    break;
                }
            }
        }

        // Third method: Look in the home sections
        if (!airingElement) {
            const homeSections = document.querySelectorAll('.home section');
            AniCal.utils.log(`Found ${homeSections.length} home sections to check`);

            for (const section of homeSections) {
                if (section.textContent.includes('Airing')) {
                    // Find the header within this section
                    const headerInSection = section.querySelector('h2, h3, .section-header');
                    if (headerInSection) {
                        airingElement = headerInSection;
                        AniCal.utils.log("Found header in home section containing 'Airing'");
                        break;
                    }
                }
            }
        }

        // Fourth method: Look for any elements with class containing "airing"
        if (!airingElement) {
            const airingClassElements = document.querySelectorAll('[class*="airing" i], [class*="Airing" i]');
            AniCal.utils.log(`Found ${airingClassElements.length} elements with class containing "airing"`);

            if (airingClassElements.length > 0) {
                // Find a header near these elements
                for (const el of airingClassElements) {
                    const nearbyHeader = el.querySelector('h2, h3, .section-header') ||
                        el.closest('.section-header') ||
                        el.closest('section')?.querySelector('h2, h3, .section-header');

                    if (nearbyHeader) {
                        airingElement = nearbyHeader;
                        AniCal.utils.log("Found header near element with class containing 'airing'");
                        break;
                    }
                }

                // If still not found, use the first element itself
                if (!airingElement && airingClassElements[0].tagName.toLowerCase() === 'section') {
                    airingElement = airingClassElements[0].querySelector('h2, h3, .section-header') || airingClassElements[0];
                    AniCal.utils.log("Using element with class containing 'airing' itself");
                }
            }
        }

        // If still not found, just log and return
        if (!airingElement) {
            AniCal.utils.log("Airing section not found in this page pass - will retry on DOM changes");
            return false;
        }

        // Now that we have a potential airing element, process it
        AniCal.utils.log("Found potential Airing element:", airingElement);

        // Find the inner header element if we're dealing with a container
        const headerElement = airingElement.tagName.toLowerCase() === 'h2' || airingElement.tagName.toLowerCase() === 'h3'
            ? airingElement
            : airingElement.querySelector('h2, h3');

        // Replace the header text
        if (headerElement) {
            headerElement.innerHTML = 'Weekly Schedule';
            headerElement.className = 'airing-replaced-header';
            AniCal.utils.log("Replaced header text");
        }

        // Add settings button
        const settingsButton = AniCal.settingsUI.createSettingsButton();
        const parentHeader = airingElement.closest('.section-header') || airingElement.parentNode;
        parentHeader.appendChild(settingsButton);

        // Find the container that holds the anime cards
        const container = findAiringContainer(airingElement);

        if (container) {
            AniCal.utils.log("Found container for Airing section, replacing with calendar", container);
            replaceAiringSection(container, airingElement, true);

            // Ensure theme is applied after creating calendar
            AniCal.applyTheme();

            return true;
        } else {
            AniCal.utils.log("Container for Airing section not found");
            return false;
        }
    } catch (err) {
        AniCal.utils.log("Error finding Airing section", err);
        return false;
    }
};

/**
 * Finds the container for an Airing header element
 * @param {HTMLElement} headerElement - The header element
 * @return {HTMLElement|null} The container element or null if not found
 */
function findAiringContainer(headerElement) {
    try {
        AniCal.utils.log("Finding container for Airing header element", headerElement);

        // Method 1: Try to find via section-header and list-preview-wrap
        const sectionHeader = headerElement.closest('.section-header');
        if (sectionHeader) {
            AniCal.utils.log("Found section header container", sectionHeader);

            const listPreviewWrap = sectionHeader.closest('.list-preview-wrap');
            if (listPreviewWrap) {
                AniCal.utils.log("Found container via list-preview-wrap", listPreviewWrap);
                return listPreviewWrap;
            }

            const listPreview = sectionHeader.closest('.list-preview');
            if (listPreview) {
                AniCal.utils.log("Found container via list-preview", listPreview);
                return listPreview;
            }

            // If the section header has a nextSibling, that might be our container
            if (sectionHeader.nextElementSibling &&
                (sectionHeader.nextElementSibling.classList.contains('list-wrap') ||
                    sectionHeader.nextElementSibling.classList.contains('content-wrap'))) {
                AniCal.utils.log("Found container via next sibling", sectionHeader.nextElementSibling);
                return sectionHeader.nextElementSibling;
            }
        }

        // Method 2: Find the section containing both the header and anime cards
        let currentElement = headerElement;
        for (let i = 0; i < 5; i++) {
            // Go up the DOM tree
            currentElement = currentElement.parentElement;
            if (!currentElement) break;

            AniCal.utils.log(`Checking container at level ${i}`, currentElement);

            // Check if this element contains media preview cards
            const mediaCards = currentElement.querySelectorAll('.media-preview-card');
            if (mediaCards.length > 0) {
                AniCal.utils.log(`Found container with ${mediaCards.length} media cards`, currentElement);
                return currentElement;
            }

            // Check for other common container classes
            if (currentElement.classList.contains('list-wrap') ||
                currentElement.classList.contains('content-wrap') ||
                currentElement.classList.contains('list-preview-wrap') ||
                currentElement.classList.contains('list-preview') ||
                currentElement.classList.contains('airing-content')) {
                AniCal.utils.log("Found container via class name", currentElement);
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
                        AniCal.utils.log(`Found container in sibling with ${mediaCards.length} media cards`, sibling);
                        return sibling;
                    }
                }
            }
        }

        // Method 4: Look for the nearest parent section
        const parentSection = headerElement.closest('section');
        if (parentSection) {
            AniCal.utils.log("Using parent section as container", parentSection);
            return parentSection;
        }

        // Method 5: Last resort - use a generic container higher up
        if (headerElement.parentElement && headerElement.parentElement.parentElement) {
            AniCal.utils.log("Using generic parent container as fallback", headerElement.parentElement.parentElement);
            return headerElement.parentElement.parentElement;
        }

        AniCal.utils.log("No suitable container found");
        return null;
    } catch (err) {
        AniCal.utils.log("Error finding container", err);
        return null;
    }
}

/**
 * Replaces the Airing section with our calendar
 * @param {HTMLElement} container - The container element
 * @param {HTMLElement} headerElement - The header element
 * @param {boolean} skipHeader - Whether to skip rendering the header
 * @return {boolean} Whether the replacement was successful
 */
function replaceAiringSection(container, headerElement, skipHeader = false) {
    try {
        AniCal.utils.log("Replacing Airing section", container);

        // First extract the data from the existing cards
        const animeData = AniCal.calendar.extractAnimeDataFromDOM(container);

        if (!animeData || animeData.length === 0) {
            AniCal.utils.log("No anime data found in the Airing section");
            return false;
        }

        // Create calendar container with improved styling
        AniCal.state.calendarContainer = document.createElement('div');
        AniCal.state.calendarContainer.className = 'anilist-weekly-calendar';

        // Apply layout mode class
        AniCal.state.calendarContainer.classList.add(`${AniCal.userPreferences.layoutMode}-mode`);

        // Apply title alignment class
        AniCal.state.calendarContainer.classList.add(`title-${AniCal.userPreferences.titleAlignment}`);

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
            container.insertBefore(AniCal.state.calendarContainer, sectionHeader.nextSibling);
        } else {
            container.appendChild(AniCal.state.calendarContainer);
        }

        // Process data and render calendar with skipHeader option
        AniCal.state.weeklySchedule = AniCal.calendar.processAnimeData(animeData);
        AniCal.calendar.renderCalendar(AniCal.state.weeklySchedule, skipHeader);

        // Start the countdown timer if needed
        if (AniCal.userPreferences.timeFormat === 'countdown') {
            AniCal.calendar.startCountdownTimer();
        }

        AniCal.state.isCalendarInitialized = true;
        AniCal.utils.log("Calendar successfully initialized");
        return true;
    } catch (err) {
        AniCal.utils.log("Error replacing section", err);
        return false;
    }
}

/**
 * Check if current page is home page
 * @return {boolean} Whether the current page is the home page
 */
AniCal.main.isHomePage = function() {
    const url = window.location.href;
    return url === 'https://anilist.co/' ||
        url === 'https://anilist.co/home' ||
        url.endsWith('anilist.co/') ||
        url.endsWith('anilist.co/home') ||
        url.match(/anilist\.co\/?(\?.*)?$/);  // Matches home with query params
};

/**
 * Attempts to scan the page for anime plus buttons and store them
 * This can be called periodically to collect buttons even when not on the home page
 * @param {boolean} isFullScan - Whether this is a full scan that should look more aggressively
 */
AniCal.main.scanForAnimeButtons = function(isFullScan = false) {
    try {
        // Use more extensive selectors for the home page or full scans
        const isHome = AniCal.main.isHomePage();
        const selectors = isHome || isFullScan ?
            // Extended selectors for home page
            '.media-preview-card, .airing-anime, .countdown-card, .media-card, .list-preview-wrap .cover, [data-media-type="ANIME"]' :
            // Standard selectors for other pages
            '.media-preview-card, .airing-anime, .countdown-card, .media-card';

        const animeCards = document.querySelectorAll(selectors);

        if (animeCards.length === 0) {
            AniCal.utils.log(`No anime cards found to scan ${isHome ? '(on home page)' : ''}`);
            return;
        }

        AniCal.utils.log(`Found ${animeCards.length} anime cards to scan for buttons ${isHome ? '(on home page)' : ''}`);

        // If we're on the home page, also look for anime-specific elements throughout the page
        if (isHome || isFullScan) {
            // Find all links that might point to anime pages
            const animeLinks = document.querySelectorAll('a[href*="/anime/"]');
            AniCal.utils.log(`Also found ${animeLinks.length} potential anime links`);

            // Process these links to extract IDs and find related buttons
            animeLinks.forEach(link => {
                try {
                    const hrefMatch = link.href.match(/\/anime\/(\d+)/);
                    if (hrefMatch && hrefMatch[1]) {
                        const animeId = hrefMatch[1];

                        // Look for a plus button in the same container
                        const container = link.closest('.media-preview-card, .airing-anime, .countdown-card, .media-card, .cover-wrap');
                        if (container) {
                            // Find plus button
                            const plusButton = container.querySelector('.plus-button, .plus-progress, button[data-test="plusButton"]');
                            if (plusButton && !AniCal.state.originalPlusButtons[animeId]) {
                                AniCal.state.originalPlusButtons[animeId] = plusButton;
                                AniCal.utils.log(`Found and stored plus button for anime ID: ${animeId} from link`);
                            }

                            // Look for cover images
                            const coverEl = container.querySelector('a.cover, .cover img, .image img, img.cover, img.image');
                            if (coverEl) {
                                let imageUrl = '';

                                if (coverEl.tagName.toLowerCase() === 'a' && coverEl.classList.contains('cover')) {
                                    if (coverEl.dataset.src) {
                                        imageUrl = coverEl.dataset.src;
                                    } else if (coverEl.style.backgroundImage) {
                                        const bgImgMatch = coverEl.style.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
                                        if (bgImgMatch && bgImgMatch[1]) {
                                            imageUrl = bgImgMatch[1];
                                        }
                                    }
                                } else if (coverEl.tagName.toLowerCase() === 'img') {
                                    imageUrl = coverEl.src;
                                }

                                if (imageUrl && (!AniCal.state.originalCoverImages[animeId] || !AniCal.state.originalCoverImages[animeId].url)) {
                                    // UPDATED: Always store in standardized format
                                    AniCal.state.originalCoverImages[animeId] = {
                                        element: coverEl,
                                        url: imageUrl
                                    };
                                    AniCal.utils.log(`Found and stored cover image for anime ID: ${animeId} from link`);
                                }
                            }
                        }
                    }
                } catch (linkErr) {
                    AniCal.utils.log(`Error processing anime link:`, linkErr);
                }
            });
        }

        // Process each card to extract button and ID
        animeCards.forEach(card => {
            try {
                // Extract anime ID from various possible sources
                let animeId = null;
                const linkElement = card.querySelector('a');

                if (linkElement && linkElement.href) {
                    const hrefMatch = linkElement.href.match(/\/anime\/(\d+)/);
                    if (hrefMatch && hrefMatch[1]) {
                        animeId = hrefMatch[1];
                    }
                }

                // Fallback: try to get ID from data attribute
                if (!animeId) {
                    animeId = card.dataset.mediaId || card.dataset.id || null;
                    if (!animeId) return; // Skip if no ID found
                }

                // Find and store plus button if it exists
                const plusButton = card.querySelector('.plus-button, .plus-progress, button[data-test="plusButton"]');
                if (plusButton) {
                    AniCal.state.originalPlusButtons[animeId] = plusButton;
                    AniCal.utils.log(`Stored plus button for anime ID: ${animeId}`);
                }

                // Find and store cover image if it exists - UPDATED for consistent structure
                const coverLink = card.querySelector('a.cover');
                if (coverLink) {
                    // Get URL from data-src or background-image
                    let imageUrl = '';
                    if (coverLink.dataset.src) {
                        imageUrl = coverLink.dataset.src;
                    } else if (coverLink.style.backgroundImage) {
                        const bgImgMatch = coverLink.style.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
                        if (bgImgMatch && bgImgMatch[1]) {
                            imageUrl = bgImgMatch[1];
                        }
                    }

                    if (imageUrl) {
                        AniCal.state.originalCoverImages[animeId] = {
                            element: coverLink,
                            url: imageUrl
                        };
                        AniCal.utils.log(`Stored cover image for anime ID: ${animeId}`);
                    }
                } else {
                    // Try alternative selectors for cover images
                    const coverImg = card.querySelector('.cover img, .image img, img.cover, img.image');
                    if (coverImg && coverImg.src) {
                        AniCal.state.originalCoverImages[animeId] = {
                            element: coverImg,
                            url: coverImg.src
                        };
                        AniCal.utils.log(`Stored cover image (alternative) for anime ID: ${animeId}`);
                    }
                }
            } catch (cardErr) {
                AniCal.utils.log(`Error processing anime card in scan:`, cardErr);
            }
        });

        // Log summary of what we've collected
        AniCal.utils.log(`Scan complete. We now have ${Object.keys(AniCal.state.originalPlusButtons).length} plus buttons and ${Object.keys(AniCal.state.originalCoverImages).length} cover images in our cache.`);

    } catch (err) {
        AniCal.utils.log("Error scanning for anime buttons:", err);
    }
};

// Initialize when the page is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log("[Anilist Calendar] DOM Content Loaded - initializing...");
        AniCal.utils.loadFontAwesome();
        AniCal.main.initialize();

        // Initial aggressive scan for buttons and images
        // Run multiple scans with increasing delays to catch everything
        const scanDelays = [500, 1000, 2000, 3500, 5000];

        scanDelays.forEach(delay => {
            setTimeout(() => {
                const isHome = AniCal.main.isHomePage();
                AniCal.utils.log(`Running scan at ${delay}ms delay${isHome ? ' (on home page)' : ''}`);
                AniCal.main.scanForAnimeButtons(true); // true = full scan
            }, delay);
        });
    });
} else {
    console.log("[Anilist Calendar] Document already loaded - initializing immediately...");
    AniCal.utils.loadFontAwesome();
    AniCal.main.initialize();

    // Initial aggressive scan for buttons and images
    // Run multiple scans with increasing delays to catch everything
    const scanDelays = [500, 1000, 2000, 3500, 5000];

    scanDelays.forEach(delay => {
        setTimeout(() => {
            const isHome = AniCal.main.isHomePage();
            AniCal.utils.log(`Running scan at ${delay}ms delay${isHome ? ' (on home page)' : ''}`);
            AniCal.main.scanForAnimeButtons(true); // true = full scan
        }, delay);
    });
}

// URL change detection with button scanning
let scanTimer = null;
setInterval(() => {
    const currentUrl = location.href;

    // If URL changed
    if (currentUrl !== AniCal.state.lastUrl) {
        const isNowHome = AniCal.main.isHomePage();

        AniCal.state.lastUrl = currentUrl;
        AniCal.utils.log(`URL changed to: ${currentUrl}`);

        // If we're going to the home page, do a complete reset
        if (isNowHome) {
            AniCal.utils.log("Home page detected, performing complete reset and scan");

            // Reset initialization flag
            AniCal.state.isCalendarInitialized = false;

            // Initialize as if starting from scratch
            AniCal.main.initialize();

            // After initialization, run a thorough scan for buttons and images
            // Do this immediately and then again after a delay to catch everything
            AniCal.main.scanForAnimeButtons();

            // Clear any existing scan timer
            if (scanTimer) {
                clearInterval(scanTimer);
            }

            // Perform multiple scans with increasing intervals to catch elements
            // as they are loaded into the page
            let scanCount = 0;
            const scanIntervals = [500, 1000, 2000, 3000, 5000]; // Increasing intervals

            scanTimer = setInterval(() => {
                AniCal.utils.log(`Running scan #${scanCount + 1} for anime buttons and images`);
                AniCal.main.scanForAnimeButtons();
                scanCount++;

                // Stop scanning after all intervals
                if (scanCount >= scanIntervals.length) {
                    AniCal.utils.log("Completed scheduled button and image scans");
                    clearInterval(scanTimer);
                    scanTimer = null;
                }
            }, 1000);
        } else {
            // For non-home pages, just re-initialize normally
            AniCal.utils.log("Non-home page, re-initializing");
            AniCal.state.isCalendarInitialized = false;
            AniCal.main.initialize();

            // Clear any existing scan timer
            if (scanTimer) {
                clearInterval(scanTimer);
            }

            // Set up periodic button scanning for the next few seconds
            let scanCount = 0;
            scanTimer = setInterval(() => {
                AniCal.main.scanForAnimeButtons();
                scanCount++;

                // Stop scanning after a few attempts
                if (scanCount >= 3) {
                    clearInterval(scanTimer);
                    scanTimer = null;
                }
            }, 1000);
        }
    }
}, 1000);

// Periodically scan for anime buttons to ensure we have the latest references
// This helps with pages that load content dynamically
setInterval(() => {
    // Only scan when not actively navigating
    if (!scanTimer) {
        // Do a more aggressive scan if we're on the home page
        const isHome = AniCal.main.isHomePage();
        AniCal.main.scanForAnimeButtons(isHome); // Full scan on home page

        // If we're on the home page, also do additional scans with slight delays
        // to catch elements that may load with animation or lazy loading
        if (isHome) {
            AniCal.utils.log("Home page detected in periodic scan, running additional scans");
            setTimeout(() => AniCal.main.scanForAnimeButtons(true), 1000);
            setTimeout(() => AniCal.main.scanForAnimeButtons(true), 2500);
        }
    }
}, 30000);

// Additional safety check that runs every page load
// This ensures that if the calendar somehow failed to initialize, we try again
window.addEventListener('load', () => {
    setTimeout(() => {
        // Only attempt if calendar is not already initialized
        if (!AniCal.state.isCalendarInitialized) {
            AniCal.utils.log("Window load event - performing safety initialization check");
            AniCal.main.setupSafetyInitialization();
        }
    }, 2000);
});