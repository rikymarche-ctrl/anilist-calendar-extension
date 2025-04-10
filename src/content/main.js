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

        // Reset global variables on each initialization
        AniCal.state.originalPlusButtons = {};
        AniCal.state.originalCoverImages = {};
        AniCal.state.isCalendarInitialized = false; // Reset initialization flag

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
                AniCal.main.findAndReplaceAiringSection();

                // Set up observer for future DOM changes
                AniCal.main.setupObserver();

                // Start countdown timer if enabled
                if (AniCal.userPreferences.timeFormat === 'countdown') {
                    AniCal.calendar.startCountdownTimer();
                }
            })
            .catch(err => {
                AniCal.utils.log("Error loading preferences", err);
                // Still try to initialize even if preferences fail
                AniCal.main.findAndReplaceAiringSection();
            });

        // Set up error handler - use once to avoid duplicates
        window.removeEventListener('error', handleGlobalError);
        window.addEventListener('error', handleGlobalError);

        // Initialize settings button events globally
        AniCal.settingsUI.initSettingsButtonEvents();

    } catch (err) {
        AniCal.utils.log("Error during initialization", err);
        console.error("Anilist Weekly Calendar: Error during initialization", err);
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
        return true;
    } catch (err) {
        AniCal.utils.log("Error replacing section", err);
        return false;
    }
}

// Initialize when the page is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log("[Anilist Calendar] DOM Content Loaded - initializing...");
        AniCal.utils.loadFontAwesome();
        AniCal.main.initialize();
    });
} else {
    console.log("[Anilist Calendar] Document already loaded - initializing immediately...");
    AniCal.utils.loadFontAwesome();
    AniCal.main.initialize();
}

// Also run when URL changes (SPA navigation)
setInterval(() => {
    const currentUrl = location.href;
    if (currentUrl !== AniCal.state.lastUrl) {
        AniCal.state.lastUrl = currentUrl;
        AniCal.utils.log("URL changed, re-initializing");
        AniCal.state.isCalendarInitialized = false;
        AniCal.main.initialize();
    }
}, 1000);