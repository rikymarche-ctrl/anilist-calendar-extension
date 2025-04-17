/**
 * Anilist Weekly Schedule - Calendar
 * Creates and manages the weekly calendar view
 */

/**
 * Configures an image element applying common attributes, styles and events
 * @param {string} src - The image source URL
 * @param {Object} anime - The anime data object
 * @param {HTMLElement} imageContainer - The container to append the image to
 * @param {Object} options - Optional configuration parameters
 * @return {HTMLElement} The configured image element
 */
function createConfiguredImage(src, anime, imageContainer, options = {}) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = anime.cleanTitle;
    img.className = 'anime-cover-image';

    if (options.loading) {
        img.setAttribute('loading', options.loading);
    }
    if (options.decoding) {
        img.setAttribute('decoding', options.decoding);
    }
    if (options.crossorigin) {
        img.setAttribute('crossorigin', options.crossorigin);
    }

    img.onload = () => {
        imageContainer.classList.remove('loading');
        imageContainer.classList.remove('loading-background');
    };

    img.onerror = () => {
        img.remove();
        if (typeof options.onError === 'function') {
            options.onError();
        }
    };

    return img;
}

/**
 * Forcefully applies title alignment to all anime titles
 * @param {string} alignment - The alignment type ('left' or 'center')
 */
window.AnilistCalendar.calendar.forceTitleAlignment = function(alignment) {
    if (!window.AnilistCalendar.state.calendarContainer) return;

    window.AnilistCalendar.utils.log(`Forcing title alignment: ${alignment}`);

    // Get current layout mode to adapt the styling
    const currentLayoutMode = window.AnilistCalendar.userPreferences.layoutMode || 'standard';
    window.AnilistCalendar.utils.log(`Current layout mode for title alignment: ${currentLayoutMode}`);

    // Remove any previous styles
    const oldStyle = document.getElementById('force-title-alignment-style');
    if (oldStyle) oldStyle.remove();

    // Create a style element
    const titleStyle = document.createElement('style');
    titleStyle.id = 'force-title-alignment-style';
    document.head.appendChild(titleStyle);

    // Get the stylesheet from the style element
    const styleSheet = titleStyle.sheet;

    // Define CSS selectors and their properties
    const cssRules = [
        {
            selector: `.anilist-weekly-calendar .anime-title.text-${alignment}`,
            properties: { 'text-align': `${alignment} !important` }
        },
        {
            selector: `.anilist-weekly-calendar.standard-mode .anime-title`,
            properties: { 'text-align': `${alignment} !important` }
        },
        {
            selector: `.anilist-weekly-calendar.compact-mode .anime-title`,
            properties: { 'text-align': `${alignment} !important` }
        },
        {
            selector: `.anilist-weekly-calendar.extended-mode .anime-title`,
            properties: { 'text-align': 'center !important' }
        },
        {
            selector: `.anilist-weekly-calendar .anilist-calendar-grid .anilist-calendar-day .anime-entry .anime-title`,
            properties: { 'text-align': `${alignment} !important` }
        },
        {
            selector: `.anilist-weekly-calendar.extended-mode .anilist-calendar-grid .anilist-calendar-day .anime-entry .anime-title`,
            properties: { 'text-align': 'center !important' }
        }
    ];

    // Convert rules to CSS text and add to stylesheet
    cssRules.forEach((rule, index) => {
        const propsText = Object.entries(rule.properties)
            .map(([prop, value]) => `${prop}: ${value};`)
            .join(' ');

        styleSheet.insertRule(`${rule.selector} { ${propsText} }`, index);
    });

    window.AnilistCalendar.utils.log("Title alignment forced application complete");
};

/**
 * Extracts anime data from the DOM
 * @param {HTMLElement} container - The container element with anime cards
 * @return {Array} Array of anime data objects
 */
window.AnilistCalendar.calendar.extractAnimeDataFromDOM = function(container) {
    try {
        window.AnilistCalendar.utils.log("Extracting anime data from DOM", container);
        const animeData = [];

        // Find all anime cards with various possible selectors
        const animeCards = container.querySelectorAll('.media-preview-card, .airing-anime, .countdown-card, .media-card');

        if (animeCards.length === 0) {
            window.AnilistCalendar.utils.log("No anime cards found in container");
            return [];
        }

        window.AnilistCalendar.utils.log(`Found ${animeCards.length} anime cards`);

        // Process each card to extract data
        animeCards.forEach((card, index) => {
            try {
                // Extract basic info
                const titleElement = card.querySelector('.title, .anime-title, .content .title');
                const titleText = titleElement ? titleElement.textContent.trim() : `Unknown Anime ${index}`;

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
                    animeId = card.dataset.mediaId || card.dataset.id || `unknown-${index}`;
                }

                // Extract episode info and clean title
                const episodeInfo = window.AnilistCalendar.calendar.parseEpisodeInfo(titleText, card);

                // Store original buttons for later use
                const plusButton = card.querySelector('.plus-button, .plus-progress, button[data-test="plusButton"]');
                if (plusButton) {
                    window.AnilistCalendar.state.originalPlusButtons[animeId] = plusButton;
                }

                // Extract cover image - AniList uses background-image on <a> tags with class "cover"
                let coverImageUrl = '';

                // Look for link with cover class
                const coverLink = card.querySelector('a.cover');

                if (coverLink) {
                    // Check for data-src first (contains original URL)
                    if (coverLink.dataset.src) {
                        coverImageUrl = coverLink.dataset.src;
                    }
                    // Otherwise get the background set via CSS
                    else if (coverLink.style.backgroundImage) {
                        // Extract URL from background-image: url('...')
                        const bgImgMatch = coverLink.style.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
                        if (bgImgMatch && bgImgMatch[1]) {
                            coverImageUrl = bgImgMatch[1];
                        }
                    }

                    // Store original element and URL for reference
                    window.AnilistCalendar.state.originalCoverImages[animeId] = {
                        element: coverLink,
                        url: coverImageUrl
                    };
                }

                // Fallback for alternative structures
                if (!coverImageUrl) {
                    const coverImg = card.querySelector('.cover img, .image img, img.cover, img.image');
                    if (coverImg && coverImg.src) {
                        coverImageUrl = coverImg.src;
                        window.AnilistCalendar.state.originalCoverImages[animeId] = {
                            element: coverImg,
                            url: coverImg.src
                        };
                    }
                }

                // Extract airing time information
                const timeElement = card.querySelector('.countdown, .airing-countdown, .airing-time, .time');
                let countdownText = timeElement ? timeElement.textContent.trim() : '';

                // Parse countdown text to get days, hours, minutes
                let days = 0, hours = 0, minutes = 0;
                let airingDate;

                if (countdownText) {
                    const dayMatch = countdownText.match(/(\d+)d/);
                    const hourMatch = countdownText.match(/(\d+)h/);
                    const minuteMatch = countdownText.match(/(\d+)m/);
                    const timeMatch = countdownText.match(/(\d+):(\d+)/);

                    if (dayMatch) days = parseInt(dayMatch[1]);
                    if (hourMatch) hours = parseInt(hourMatch[1]);
                    if (minuteMatch) minutes = parseInt(minuteMatch[1]);

                    if (timeMatch && !hourMatch) {
                        hours = parseInt(timeMatch[1]);
                        minutes = parseInt(timeMatch[2]);
                    }

                    airingDate = new Date();
                    airingDate.setDate(airingDate.getDate() + days);
                    airingDate.setHours(airingDate.getHours() + hours);
                    airingDate.setMinutes(airingDate.getMinutes() + minutes);
                    airingDate.setSeconds(0);
                } else {
                    const now = new Date();
                    airingDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0);
                }

                // Get the day of the week
                const day = window.AnilistCalendar.DAYS_OF_WEEK[airingDate.getDay()];

                // Create the anime data object
                const anime = {
                    id: animeId,
                    title: titleText,
                    cleanTitle: episodeInfo.cleanTitle || titleText,
                    episodeInfo: episodeInfo.formatted || '1',
                    coverImage: coverImageUrl,
                    airingDate: airingDate,
                    formattedTime: window.AnilistCalendar.utils.formatTime(airingDate),
                    day: day,
                    days: days,
                    hours: hours,
                    minutes: minutes,
                    watched: episodeInfo.watched || 0,
                    available: episodeInfo.available || 0,
                    total: episodeInfo.total || 0,
                    episodesBehind: episodeInfo.episodesBehind || 0,
                    episodeProgressString: episodeInfo.formatted || '',
                    episodeBehindHeader: episodeInfo.episodesBehind > 0
                };

                animeData.push(anime);
                window.AnilistCalendar.utils.log(`Processed anime: ${anime.cleanTitle}`, anime);

            } catch (cardErr) {
                window.AnilistCalendar.utils.log(`Error processing anime card ${index}:`, cardErr);
            }
        });

        window.AnilistCalendar.utils.log(`Extracted ${animeData.length} anime entries`, animeData);
        return animeData;

    } catch (err) {
        window.AnilistCalendar.utils.log("Error extracting anime data:", err);
        return [];
    }
};

/**
 * Parses episode information from raw title and alternative elements in the card
 * @param {string} rawTitle - The raw title text
 * @param {HTMLElement} card - The card (DOM) element to extract additional info from
 * @return {Object} Object with details: watched, available, total, episodesBehind and formatted
 */
window.AnilistCalendar.calendar.parseEpisodeInfo = function(rawTitle, card) {
    let episodeInfo = {
        cleanTitle: '',
        watched: 0,
        available: 0,
        total: 0,
        episodesBehind: 0,
        formatted: '',
        isUpcoming: false,
        countdownText: '',
        hasProgressInfo: false
    };

    try {
        let title = rawTitle;
        const behindMatch = title.match(/(\d+)\s+episodes?\s+behind\s+/i);
        if (behindMatch) {
            episodeInfo.episodesBehind = parseInt(behindMatch[1]);
            title = title.replace(/\d+\s+episodes?\s+behind\s+/i, '');
        }
        const progressMatch = title.match(/Progress:\s*(\d+)\s*\/\s*(\d+)/i);
        if (progressMatch) {
            episodeInfo.watched = parseInt(progressMatch[1]);
            episodeInfo.total = parseInt(progressMatch[2]);
            episodeInfo.hasProgressInfo = true;
            title = title.replace(/Progress:\s*\d+\s*\/\s*\d+/i, '');
        }
        const singleProgressMatch = title.match(/Progress:\s*(\d+)\s*(?!\/)/) ||
            title.match(/Progress:\s*(\d+)\s*$/) ||
            title.match(/Progress:\s*(\d+)\b/);
        if (singleProgressMatch) {
            episodeInfo.watched = parseInt(singleProgressMatch[1]);
            episodeInfo.hasProgressInfo = true;
            title = title.replace(/Progress:\s*\d+\s*(?!\/)/, '').trim();
        }
        const fallbackEl = card.querySelector('.info') || card.querySelector('.plus-progress.mobile');
        if (fallbackEl) {
            const text = fallbackEl.textContent.trim();
            const matchWithTotal = text.match(/Progress:\s*(\d+)\/(\d+)/i);
            if (matchWithTotal) {
                episodeInfo.watched = parseInt(matchWithTotal[1]);
                episodeInfo.total = parseInt(matchWithTotal[2]);
                episodeInfo.hasProgressInfo = true;
            } else {
                const matchSingle = text.match(/Progress:\s*(\d+)\s*(?!\/)/) || text.match(/Progress:\s*(\d+)\s*$/);
                if (matchSingle) {
                    episodeInfo.watched = parseInt(matchSingle[1]);
                    episodeInfo.hasProgressInfo = true;
                    episodeInfo.total = 0;
                }
            }
        }
        const infoHeader = card.querySelector('.info-header');
        if (infoHeader && !episodeInfo.episodesBehind) {
            const behindText = infoHeader.textContent.trim();
            const behindMatchAlt = behindText.match(/(\d+)\s+episodes?\s+behind/i);
            if (behindMatchAlt) {
                episodeInfo.episodesBehind = parseInt(behindMatchAlt[1]);
            }
        }
        episodeInfo.available = episodeInfo.episodesBehind > 0 ?
            episodeInfo.watched + episodeInfo.episodesBehind :
            episodeInfo.watched;
        const countdownEl = card.querySelector('.countdown');
        if (countdownEl) {
            episodeInfo.isUpcoming = true;
            if (episodeInfo.episodesBehind === 0) {
                episodeInfo.available = episodeInfo.watched + 1;
            }
            episodeInfo.countdownText = `Ep ${episodeInfo.available}`;
        }
        title = title.replace(/^\s*Ep\s+\d+\+?\s*/i, '')
            .replace(/^\s*Episode\s+\d+\+?\s*/i, '')
            .replace(/\s+\+\s*$/, '')
            .trim();
        episodeInfo.cleanTitle = title;
        if (episodeInfo.total > 0) {
            episodeInfo.formatted = (episodeInfo.available > episodeInfo.watched && episodeInfo.episodesBehind > 0) ?
                `${episodeInfo.watched}/${episodeInfo.available}/${episodeInfo.total}` :
                `${episodeInfo.watched}/${episodeInfo.total}`;
        } else {
            episodeInfo.formatted = `${episodeInfo.watched}`;
        }
    } catch (err) {
        window.AnilistCalendar.utils.log('Error in parseEpisodeInfo:', err);
    }
    return episodeInfo;
};

/**
 * Handles plus button click to update progress
 * @param {Event} e - The click event
 * @param {Object} animeData - The anime data object
 */
window.AnilistCalendar.calendar.handlePlusButtonClick = function(e, animeData) {
    e.stopPropagation();
    e.preventDefault();
    if (!animeData || !animeData.id) {
        console.error('Anime data not available for this element');
        return;
    }
    const originalButton = window.AnilistCalendar.state.originalPlusButtons[animeData.id];
    if (originalButton) {
        window.AnilistCalendar.utils.log(`Simulating click on original button for anime ID: ${animeData.id}`);
        window.AnilistCalendar.utils.showNotification('Updating episode progress...', 'loading');
        originalButton.click();
        setTimeout(() => {
            window.AnilistCalendar.calendar.updateAnimeEntryInUI(animeData.id, (animeData.watched || 0) + 1);
            window.AnilistCalendar.utils.showNotification('Episode marked as watched!', 'success');
        }, 800);
        return;
    }
    window.AnilistCalendar.utils.showNotification('Unable to update progress (original button not found)', 'error');
};

/**
 * Updates anime entry in the UI after progress update
 * @param {string} animeId - The anime ID
 * @param {number} newProgress - The new progress value
 */
window.AnilistCalendar.calendar.updateAnimeEntryInUI = function(animeId, newProgress) {
    const entries = document.querySelectorAll(`.anime-entry[data-anime-id="${animeId}"]`);
    entries.forEach(entry => {
        const episodeNumber = entry.querySelector('.episode-number');
        if (episodeNumber) {
            const text = episodeNumber.textContent;
            const matches = text.match(/Ep\s+(\d+)(?:\/(\d+)(?:\/(\d+))?)?/);
            if (matches) {
                // Get anime data first to properly evaluate if we're still behind
                let animeData = window.AnilistCalendar.calendar.getAnimeDataFromEntry(entry);
                if (animeData) {
                    // Update watched count in data
                    animeData.watched = newProgress;

                    // Only update episodesBehind to 0 if we've caught up
                    if (animeData.episodesBehind > 0 && animeData.watched >= animeData.available) {
                        animeData.episodesBehind = 0;
                    }

                    // If we've somehow watched more than what's available, update available
                    if (animeData.available < newProgress) {
                        animeData.available = newProgress;
                    }

                    // Save the updated data back to the entry
                    entry.dataset.animeData = JSON.stringify(animeData);

                    // Format the new episode text
                    let newText = `Ep ${newProgress}`;
                    if (matches[3] && newProgress === parseInt(matches[2])) {
                        newText = `Ep ${newProgress}/${matches[3]}`;
                    } else if (matches[2] && matches[3]) {
                        newText = `Ep ${newProgress}/${matches[2]}/${matches[3]}`;
                    } else if (matches[2]) {
                        newText = `Ep ${newProgress}/${matches[2]}`;
                    }

                    // Instead of setting textContent which removes all child elements,
                    // we'll clear the element and rebuild it properly
                    episodeNumber.querySelector('.behind-indicator');
                    episodeNumber.textContent = ''; // Clear but keep the element

                    // Only add behind indicator if we're still behind after the update
                    if (animeData.episodesBehind > 0) {
                        const newBehindIndicator = document.createElement('span');
                        newBehindIndicator.className = 'behind-indicator';
                        newBehindIndicator.title = `${animeData.episodesBehind} episode(s) behind`;
                        episodeNumber.appendChild(newBehindIndicator);
                    }

                    // Append the text node for the episode number
                    episodeNumber.appendChild(document.createTextNode(newText));
                }
            }
        }
    });

    // Update weekly schedule data
    if (window.AnilistCalendar.state.weeklySchedule) {
        for (const day in window.AnilistCalendar.state.weeklySchedule) {
            const animeIndex = window.AnilistCalendar.state.weeklySchedule[day].findIndex(anime => anime.id === animeId);
            if (animeIndex !== -1) {
                window.AnilistCalendar.state.weeklySchedule[day][animeIndex].watched = newProgress;
                if (window.AnilistCalendar.state.weeklySchedule[day][animeIndex].available < newProgress) {
                    window.AnilistCalendar.state.weeklySchedule[day][animeIndex].available = newProgress;
                }
                if (window.AnilistCalendar.state.weeklySchedule[day][animeIndex].episodesBehind > 0 &&
                    newProgress >= window.AnilistCalendar.state.weeklySchedule[day][animeIndex].available) {
                    window.AnilistCalendar.state.weeklySchedule[day][animeIndex].episodesBehind = 0;
                }
            }
        }
    }
};

/**
 * Gets anime data from an entry in the DOM
 * @param {HTMLElement} entry - The anime entry
 * @return {Object|null} The anime data object or null if not found
 */
window.AnilistCalendar.calendar.getAnimeDataFromEntry = function(entry) {
    try {
        if (entry.dataset.animeData) {
            return JSON.parse(entry.dataset.animeData);
        }
        const animeId = entry.dataset.animeId;
        if (!animeId) return null;
        const title = entry.querySelector('.anime-title')?.textContent || '';
        const episodeText = entry.querySelector('.episode-number')?.textContent || '';
        const matches = episodeText.match(/Ep\s+(\d+)(?:\/(\d+)(?:\/(\d+))?)?/);
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
};

/**
 * Forcefully applies column justification to all calendar elements
 * @param {string} justification - The justification type ('top' or 'center')
 */
window.AnilistCalendar.calendar.forceColumnJustification = function(justification) {
    if (!window.AnilistCalendar.state.calendarContainer) return;

    // Log for debugging
    window.AnilistCalendar.utils.log(`Forcing column justification: ${justification}`);

    // Get current layout mode to adapt the styling
    const currentLayoutMode = window.AnilistCalendar.userPreferences.layoutMode || 'standard';
    window.AnilistCalendar.utils.log(`Current layout mode: ${currentLayoutMode}`);

    // Remove any previous styles
    const oldStyle = document.getElementById('force-column-justify-style');
    if (oldStyle) oldStyle.remove();

    // Create a style element with CSS rules rather than applying inline styles
    const columnStyle = document.createElement('style');
    columnStyle.id = 'force-column-justify-style';
    document.head.appendChild(columnStyle);

    // Get the stylesheet from the style element
    const styleSheet = columnStyle.sheet;

    // Define CSS rules as objects with selectors and properties
    const cssRules = [
        {
            selector: '.anilist-weekly-calendar .anilist-calendar-day',
            properties: {
                'display': 'flex !important',
                'flex-direction': 'column !important',
                'justify-content': justification === 'center' ? 'center !important' : 'flex-start !important',
                'align-items': 'stretch !important'
            }
        },
        {
            selector: '.anilist-weekly-calendar .day-anime-list',
            properties: {
                'display': 'flex !important',
                'flex-direction': 'column !important',
                'justify-content': justification === 'center' ? 'center !important' : 'flex-start !important',
                'align-items': 'stretch !important',
                'flex': '1 !important'
            }
        },
        {
            selector: '.anilist-weekly-calendar .empty-day',
            properties: {
                'margin': justification === 'center' ? 'auto !important' : '0 !important'
            }
        }
    ];

    // Add specific rules for gallery/extended mode
    if (currentLayoutMode === 'extended') {
        cssRules.push(
            {
                selector: '.anilist-weekly-calendar.extended-mode .anilist-calendar-day',
                properties: {
                    'display': 'flex !important',
                    'flex-direction': 'column !important',
                    'justify-content': justification === 'center' ? 'center !important' : 'flex-start !important',
                    'align-items': 'center !important'
                }
            },
            {
                selector: '.anilist-weekly-calendar.extended-mode .day-anime-list',
                properties: {
                    'display': 'flex !important',
                    'flex-direction': 'row !important',
                    'flex-wrap': 'wrap !important',
                    'justify-content': 'center !important',
                    'align-content': justification === 'center' ? 'center !important' : 'flex-start !important',
                    'align-items': justification === 'center' ? 'center !important' : 'flex-start !important'
                }
            }
        );
    }

    // Add each rule to the stylesheet
    cssRules.forEach((rule, index) => {
        // Convert properties object to CSS text
        const propsText = Object.entries(rule.properties)
            .map(([prop, value]) => `${prop}: ${value};`)
            .join(' ');

        // Insert the rule into the stylesheet
        styleSheet.insertRule(`${rule.selector} { ${propsText} }`, index);
    });

    // Get all day columns to apply classes directly
    const dayColumns = window.AnilistCalendar.state.calendarContainer.querySelectorAll('.anilist-calendar-day');

    // Apply the class directly to all day columns for extra reliability
    dayColumns.forEach(dayColumn => {
        dayColumn.classList.remove('force-center', 'force-top');
        dayColumn.classList.add(justification === 'center' ? 'force-center' : 'force-top');

        const animeList = dayColumn.querySelector('.day-anime-list');
        if (animeList) {
            animeList.classList.remove('justify-center', 'justify-top');
            animeList.classList.add(`justify-${justification}`);
        }
    });

    // Force a layout refresh with a small delay
    setTimeout(() => {
        // Trigger a reflow using DOM API
        const container = window.AnilistCalendar.state.calendarContainer;
        if (container) {
            container.classList.remove('temp-reflow');
            void container.offsetHeight; // Force reflow
            container.classList.add('temp-reflow');
            setTimeout(() => container.classList.remove('temp-reflow'), 10);
        }

        window.AnilistCalendar.utils.log("Column justification refresh complete");
    }, 10);
};

/**
 * Creates an anime entry element with thumbnail and episode progress
 * @param {HTMLElement} container - The container to append the entry to
 * @param {Object} anime - The anime data object
 */
window.AnilistCalendar.calendar.createAnimeEntry = function(container, anime) {
    const entry = document.createElement('div');
    entry.className = 'anime-entry';
    entry.dataset.animeId = anime.id;
    entry.dataset.animeData = JSON.stringify(anime);

    entry.addEventListener('click', () => {
        window.location.href = `/anime/${anime.id}`;
    });

    const isCompactMode = window.AnilistCalendar.userPreferences.layoutMode === 'compact';
    const isGalleryMode = window.AnilistCalendar.userPreferences.layoutMode === 'extended' ||
        window.AnilistCalendar.userPreferences.layoutMode === 'grid';

    if (isCompactMode) {
        const compactPlusContainer = document.createElement('div');
        compactPlusContainer.className = 'compact-plus-container';

        const compactPlusButton = document.createElement('div');
        compactPlusButton.className = 'compact-plus-button';
        compactPlusButton.setAttribute('title', 'Mark as watched');

        const iconElement = document.createElement('i');
        iconElement.className = 'fa fa-plus';

        compactPlusButton.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            window.AnilistCalendar.calendar.handlePlusButtonClick(e, anime);
            return false;
        });

        compactPlusButton.appendChild(iconElement);
        compactPlusContainer.appendChild(compactPlusButton);
        entry.appendChild(compactPlusContainer);
    } else {
        const imageContainer = document.createElement('div');
        imageContainer.className = 'anime-image';
        imageContainer.classList.add('loading-background');

        const overlay = document.createElement('div');
        overlay.className = 'anime-image-overlay';
        imageContainer.appendChild(overlay);

        // Thumbnail loading function - UPDATED for consistency
        const loadDirectImageUrl = () => {
            if (!anime.coverImage || anime.coverImage.length < 10) {
                showFallbackImage();
                return;
            }
            imageContainer.classList.add('loading');
            let imageUrl = anime.coverImage;
            imageUrl = imageUrl.replace(/["'\\]/g, '');
            if (imageUrl.startsWith('//')) {
                imageUrl = 'https:' + imageUrl;
            } else if (!imageUrl.startsWith('http')) {
                imageUrl = 'https://' + imageUrl;
            }
            const options = {
                loading: 'eager',
                decoding: 'async',
                crossorigin: 'anonymous',
                onError: showFallbackImage
            };
            const img = createConfiguredImage(imageUrl, anime, imageContainer, options);
            imageContainer.appendChild(img);
        };

        const showFallbackImage = () => {
            imageContainer.classList.remove('loading');
            imageContainer.classList.add('error');

            const initialLetter = document.createElement('div');
            initialLetter.textContent = anime.cleanTitle.charAt(0).toUpperCase();
            initialLetter.className = 'anime-image-fallback-letter';
            imageContainer.appendChild(initialLetter);
        };

        // UPDATED: Standardized image loading function
        const loadThumbnail = () => {
            if (window.AnilistCalendar.state.originalCoverImages[anime.id]) {
                const originalImage = window.AnilistCalendar.state.originalCoverImages[anime.id];

                // First check if we have a URL directly in the object
                if (originalImage.url) {
                    const img = createConfiguredImage(originalImage.url, anime, imageContainer, { onError: loadDirectImageUrl });
                    imageContainer.appendChild(img);
                    return;
                }

                // Fallback to checking the element (for backwards compatibility)
                if (originalImage.element) {
                    const originalElement = originalImage.element;

                    if (originalElement.tagName && originalElement.tagName.toLowerCase() === 'a' && originalElement.classList.contains('cover')) {
                        let imageUrl = '';
                        if (originalElement.dataset.src) {
                            imageUrl = originalElement.dataset.src;
                        } else if (originalElement.style.backgroundImage) {
                            const bgImgMatch = originalElement.style.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
                            if (bgImgMatch && bgImgMatch[1]) {
                                imageUrl = bgImgMatch[1];
                            }
                        }
                        if (imageUrl) {
                            // Update the stored URL for future reference
                            window.AnilistCalendar.state.originalCoverImages[anime.id].url = imageUrl;

                            const img = createConfiguredImage(imageUrl, anime, imageContainer, { onError: loadDirectImageUrl });
                            imageContainer.appendChild(img);
                            return;
                        }
                    } else if (originalElement.tagName && originalElement.tagName.toLowerCase() === 'img') {
                        // Update the stored URL for future reference
                        window.AnilistCalendar.state.originalCoverImages[anime.id].url = originalElement.src;

                        const img = createConfiguredImage(originalElement.src, anime, imageContainer, { onError: loadDirectImageUrl });
                        imageContainer.appendChild(img);
                        return;
                    }
                }

                // Fallback to old format for backwards compatibility
                if (typeof originalImage === 'object' && originalImage.tagName) {
                    if (originalImage.tagName.toLowerCase() === 'a' && originalImage.classList.contains('cover')) {
                        let imageUrl = '';
                        if (originalImage.dataset.src) {
                            imageUrl = originalImage.dataset.src;
                        } else if (originalImage.style.backgroundImage) {
                            const bgImgMatch = originalImage.style.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
                            if (bgImgMatch && bgImgMatch[1]) {
                                imageUrl = bgImgMatch[1];
                            }
                        }
                        if (imageUrl) {
                            // Update to standardized format
                            window.AnilistCalendar.state.originalCoverImages[anime.id] = {
                                element: originalImage,
                                url: imageUrl
                            };

                            const img = createConfiguredImage(imageUrl, anime, imageContainer, { onError: loadDirectImageUrl });
                            imageContainer.appendChild(img);
                            return;
                        }
                    } else if (originalImage.tagName.toLowerCase() === 'img') {
                        // Update to standardized format
                        window.AnilistCalendar.state.originalCoverImages[anime.id] = {
                            element: originalImage,
                            url: originalImage.src
                        };

                        const img = createConfiguredImage(originalImage.src, anime, imageContainer, { onError: loadDirectImageUrl });
                        imageContainer.appendChild(img);
                        return;
                    }
                }
            }
            loadDirectImageUrl();
        };

        loadThumbnail();

        const plusButtonContainer = document.createElement('div');
        plusButtonContainer.className = 'plus-button-container';

        const plusButton = document.createElement('div');
        plusButton.className = 'plus-button';

        const plusIcon = document.createElement('div');
        plusIcon.className = 'plus-icon';

        const iconElement = document.createElement('i');
        iconElement.className = 'fa fa-plus';

        plusIcon.appendChild(iconElement);
        plusButton.appendChild(plusIcon);
        plusButtonContainer.appendChild(plusButton);

        plusButton.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            const iconEl = plusIcon.querySelector('i');
            if (iconEl) {
                iconEl.classList.add('plus-icon-clicked');
                setTimeout(() => {
                    iconEl.classList.remove('plus-icon-clicked');
                }, 300);
            }
            window.AnilistCalendar.calendar.handlePlusButtonClick(e, anime);
            return false;
        });

        imageContainer.appendChild(plusButtonContainer);
        entry.appendChild(imageContainer);
    }

    // Controllo se mostrare tempo ed episodi
    const showEpisodeNumbers = window.AnilistCalendar.userPreferences.showEpisodeNumbers;
    const showTime = window.AnilistCalendar.userPreferences.showTime;

    // Flag per tenere traccia se sia tempo che episodi sono nascoste
    const hideAllInfo = !showEpisodeNumbers && !showTime;

    // Create info panel based on layout mode
    if (isGalleryMode) {
        // Top panel for title
        const titlePanel = document.createElement('div');
        titlePanel.className = 'title-panel';

        const titleEl = document.createElement('div');
        titleEl.className = 'anime-title';
        titleEl.textContent = anime.cleanTitle;

        // In gallery mode, text is always centered
        titleEl.classList.add('text-center');

        titlePanel.appendChild(titleEl);
        entry.appendChild(titlePanel);

        if (showEpisodeNumbers || showTime) {
            const infoPanel = document.createElement('div');
            infoPanel.className = 'info-panel';

            const infoRow = createAnimeInfoRow(anime);
            infoPanel.appendChild(infoRow);
            entry.appendChild(infoPanel);
        }
    } else {
        const infoContainer = document.createElement('div');
        infoContainer.className = 'anime-info';

        const titleEl = document.createElement('div');
        titleEl.className = 'anime-title';
        titleEl.textContent = anime.cleanTitle;

        // Espandi il titolo quando non ci sono altre informazioni da mostrare
        if (hideAllInfo) {
            titleEl.classList.add('title-expanded');
        }

        // Apply title alignment class based on user preferences
        const titleAlignment = window.AnilistCalendar.userPreferences.titleAlignment || 'left';
        titleEl.classList.add(`text-${titleAlignment}`);

        infoContainer.appendChild(titleEl);

        // Create info row even if hidden, so we can control its display with CSS
        const infoRow = createAnimeInfoRow(anime);

        // Se entrambe le informazioni sono nascoste, nasconde la riga delle info
        if (hideAllInfo) {
            infoRow.classList.add('info-hidden');
        }

        infoContainer.appendChild(infoRow);
        entry.appendChild(infoContainer);
    }

    container.appendChild(entry);
};

/**
 * Creates an info row for an anime entry including episode number and airing time/countdown
 * @param {Object} anime - The anime data object
 * @return {HTMLElement} The created info row element
 */
function createAnimeInfoRow(anime) {
    const infoRow = document.createElement('div');
    infoRow.className = 'anime-info-row';

    // Controlliamo se mostrare tempo ed episodi
    const showEpisodeNumbers = window.AnilistCalendar.userPreferences.showEpisodeNumbers;
    const showTime = window.AnilistCalendar.userPreferences.showTime;

    // Se entrambi sono disabilitati, restituiamo comunque la riga vuota
    // per permettere alla logica CSS di funzionare
    if (!showEpisodeNumbers && !showTime) {
        return infoRow;
    }

    if (showEpisodeNumbers) {
        const episodeNumber = document.createElement('div');
        episodeNumber.className = 'episode-number';

        // Display progress string if available, otherwise standard format
        if (anime.episodeProgressString && anime.episodeProgressString.trim().length > 0) {
            episodeNumber.textContent = 'Ep ' + anime.episodeProgressString;
        } else {
            episodeNumber.textContent = 'Ep ' + anime.episodeInfo;
        }

        // Add behind indicator if episodes are behind
        if (anime.episodesBehind > 0) {
            const behindIndicator = document.createElement('span');
            behindIndicator.className = 'behind-indicator';
            behindIndicator.title = `${anime.episodesBehind} episode(s) behind`;
            episodeNumber.prepend(behindIndicator);
        }

        infoRow.appendChild(episodeNumber);
    }

    if (showTime) {
        const timeDisplay = document.createElement('div');
        timeDisplay.className = 'anime-time';

        if (window.AnilistCalendar.userPreferences.timeFormat === 'countdown') {
            timeDisplay.classList.add('countdown-mode');
            const now = new Date();
            const airingTime = anime.airingDate;

            // Check if the episode has already aired
            if (airingTime < now) {
                timeDisplay.textContent = "Aired";
            } else {
                // Calculate time remaining
                const diff = airingTime - now;
                const { days, hours, minutes } = window.AnilistCalendar.utils.calculateTimeComponents(diff);
                timeDisplay.textContent = days > 0 ?
                    `${days}:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}` :
                    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

                // Store countdown data for updates
                timeDisplay.dataset.targetTime = airingTime.getTime();
            }
        } else {
            // Display formatted time
            timeDisplay.textContent = anime.formattedTime;
        }

        infoRow.appendChild(timeDisplay);
    }

    return infoRow;
}

/**
 * Renders the calendar interface with anime entries
 * @param {Object} schedule - Object with days as keys and arrays of anime as values
 * @param {boolean} skipHeader - Whether to skip rendering the header
 */
window.AnilistCalendar.calendar.renderCalendar = function(schedule, skipHeader = false) {
    if (!window.AnilistCalendar.state.calendarContainer) return;

    window.AnilistCalendar.utils.log("Rendering calendar");
    window.AnilistCalendar.state.calendarContainer.innerHTML = '';

    const today = new Date();
    const currentDayIndex = today.getDay();
    const currentDayName = window.AnilistCalendar.DAYS_OF_WEEK[currentDayIndex];

    let orderedDays = [...window.AnilistCalendar.DAYS_OF_WEEK];

    if (window.AnilistCalendar.userPreferences.startDay === 'today') {
        orderedDays = [
            ...window.AnilistCalendar.DAYS_OF_WEEK.slice(currentDayIndex),
            ...window.AnilistCalendar.DAYS_OF_WEEK.slice(0, currentDayIndex)
        ];
    } else if (!isNaN(window.AnilistCalendar.userPreferences.startDay)) {
        const startDayIndex = parseInt(window.AnilistCalendar.userPreferences.startDay);
        orderedDays = [
            ...window.AnilistCalendar.DAYS_OF_WEEK.slice(startDayIndex),
            ...window.AnilistCalendar.DAYS_OF_WEEK.slice(0, startDayIndex)
        ];
    }

    if (window.AnilistCalendar.userPreferences.hideEmptyDays) {
        orderedDays = orderedDays.filter(day => schedule[day] && schedule[day].length > 0);
        if (orderedDays.length === 0) orderedDays = [currentDayName];
        window.AnilistCalendar.state.calendarContainer.classList.remove(
            'days-count-1', 'days-count-2', 'days-count-3',
            'days-count-4', 'days-count-5', 'days-count-6', 'days-count-7'
        );
        window.AnilistCalendar.state.calendarContainer.classList.add(`days-count-${orderedDays.length}`);
    } else {
        window.AnilistCalendar.state.calendarContainer.classList.remove(
            'days-count-1', 'days-count-2', 'days-count-3',
            'days-count-4', 'days-count-5', 'days-count-6'
        );
        window.AnilistCalendar.state.calendarContainer.classList.add('days-count-7');
    }

    // Remove all alignment and justification classes before adding them again
    window.AnilistCalendar.state.calendarContainer.classList.remove(
        'column-justify-top', 'column-justify-center',
        'title-left', 'title-center'
    );

    // Apply column justification class
    const columnJustify = window.AnilistCalendar.userPreferences.columnJustify || 'top';
    window.AnilistCalendar.state.calendarContainer.classList.add(`column-justify-${columnJustify}`);

    // Apply title alignment class
    const titleAlignment = window.AnilistCalendar.userPreferences.titleAlignment || 'left';
    window.AnilistCalendar.state.calendarContainer.classList.add(`title-${titleAlignment}`);

    // Remove all layout mode classes before adding the current one
    window.AnilistCalendar.state.calendarContainer.classList.remove(
        'standard-mode', 'compact-mode', 'extended-mode', 'gallery-with-slider', 'full-width-images'
    );

    // Apply the current layout mode class
    window.AnilistCalendar.state.calendarContainer.classList.add(`${window.AnilistCalendar.userPreferences.layoutMode}-mode`);

    // Apply full-width-images class if enabled and in standard mode
    if (window.AnilistCalendar.userPreferences.layoutMode === 'standard' &&
        window.AnilistCalendar.userPreferences.fullWidthImages) {
        window.AnilistCalendar.state.calendarContainer.classList.add('full-width-images');
    }

    if (!skipHeader) {
        const headerContainer = document.createElement('div');
        headerContainer.className = 'calendar-header';

        const calendarTitle = document.createElement('h3');
        calendarTitle.className = 'calendar-title';
        calendarTitle.innerHTML = 'Weekly Schedule';

        const settingsButton = document.createElement('button');
        settingsButton.className = 'calendar-settings-btn';
        settingsButton.innerHTML = '<i class="fa fa-cog"></i>';
        settingsButton.title = 'Open settings';
        settingsButton.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            window.AnilistCalendar.settingsUI.createSettingsOverlay();
        });

        headerContainer.appendChild(calendarTitle);
        headerContainer.appendChild(settingsButton);
        window.AnilistCalendar.state.calendarContainer.appendChild(headerContainer);
    }

    const calendarGrid = document.createElement('div');
    calendarGrid.className = 'anilist-calendar-grid';

    const daysToShow = orderedDays.slice(0, 7);

    daysToShow.forEach((day, index) => {
        const dayCol = document.createElement('div');
        dayCol.id = `calendar-day-${day ? day.toLowerCase() : 'unknown'}`;

        const classes = ['anilist-calendar-day'];
        if (day === currentDayName) {
            classes.push('current-day');
        }
        if (window.AnilistCalendar.userPreferences.startDay === 'today' && index === 0) {
            classes.push('today-column');
        }
        dayCol.className = classes.join(' ');

        // Force the correct column justification class
        dayCol.classList.add(columnJustify === 'center' ? 'force-center' : 'force-top');

        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';

        const currentDate = new Date();
        const todayIndex = currentDate.getDay();
        const dayIndex = window.AnilistCalendar.DAYS_OF_WEEK.indexOf(day);
        const daysToAdd = (dayIndex - todayIndex + 7) % 7;

        const targetDate = new Date(currentDate);
        targetDate.setDate(currentDate.getDate() + daysToAdd);
        const dayNumber = targetDate.getDate();

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthName = months[targetDate.getMonth()];

        dayHeader.innerHTML = `
      <span class="day-name">${day}</span>
      <span class="separator">|</span>
      <span class="day-number">${dayNumber} ${monthName}</span>
      <span class="abbreviated-day" style="display:none">${window.AnilistCalendar.ABBREVIATED_DAYS[window.AnilistCalendar.DAYS_OF_WEEK.indexOf(day)]}</span>
    `;
        dayCol.appendChild(dayHeader);

        const animeList = document.createElement('div');
        animeList.className = 'day-anime-list';

        // Apply the justification class to the anime list
        animeList.classList.add(`justify-${columnJustify}`);

        // MODIFICATO: Aggiungiamo una classe specifica per la modalità compatta
        // per poter gestire meglio il padding in CSS
        if (window.AnilistCalendar.userPreferences.layoutMode === 'compact') {
            animeList.classList.add('compact-mode-list');

            // Aggiungiamo un attributo di data per indicare che questa è l'ultima colonna
            // utile per il CSS selettore: last-child che potrebbe non funzionare sempre correttamente
            if (index === daysToShow.length - 1) {
                animeList.setAttribute('data-last-column', 'true');
            }
        }

        if (schedule[day] && schedule[day].length > 0) {
            // Ottieni le preferenze di layout
            const isGalleryMode = window.AnilistCalendar.userPreferences.layoutMode === 'extended';
            const maxCardsPerDay = window.AnilistCalendar.userPreferences.maxCardsPerDay || 0;

            // In modalità gallery, usa sempre il contenitore di pagina per uniformità
            if (isGalleryMode) {
                if (maxCardsPerDay > 0 && schedule[day].length > maxCardsPerDay) {
                    // Implementa paginazione con pagine di card quando servono più pagine
                    setupCardPagination(dayCol, animeList, schedule[day], maxCardsPerDay, columnJustify);
                } else {
                    // Anche con poche card, usa un singolo contenitore per uniformità
                    const pageContainer = document.createElement('div');
                    pageContainer.className = `page-container page-0`;
                    pageContainer.classList.add(`justify-${columnJustify}`);

                    // Aggiungi tutte le card al contenitore
                    schedule[day].forEach((anime, animeIndex) => {
                        window.AnilistCalendar.calendar.createAnimeEntry(pageContainer, anime);

                        // Aggiungi attributo per l'ultimo elemento
                        if (animeIndex === schedule[day].length - 1) {
                            const lastEntry = pageContainer.lastChild;
                            if (lastEntry) {
                                lastEntry.setAttribute('data-last-entry', 'true');
                            }
                        }
                    });

                    // Aggiungi il contenitore alla lista
                    animeList.appendChild(pageContainer);
                }
            } else {
                // Modalità standard (non gallery) - comportamento normale
                schedule[day].forEach((anime, animeIndex) => {
                    window.AnilistCalendar.calendar.createAnimeEntry(animeList, anime);

                    // Aggiungi attributo per l'ultimo elemento
                    if (animeIndex === schedule[day].length - 1) {
                        const lastEntry = animeList.lastChild;
                        if (lastEntry) {
                            lastEntry.setAttribute('data-last-entry', 'true');
                        }
                    }
                });
            }
        } else {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'empty-day';
            emptyDay.textContent = 'No episodes';
            animeList.appendChild(emptyDay);
        }

        dayCol.appendChild(animeList);
        calendarGrid.appendChild(dayCol);
    });

    window.AnilistCalendar.state.calendarContainer.appendChild(calendarGrid);
    window.AnilistCalendar.utils.log("Calendar rendered");

    // Apply the column justification forcefully
    window.AnilistCalendar.calendar.forceColumnJustification(columnJustify);

    // Apply title alignment forcefully
    window.AnilistCalendar.calendar.forceTitleAlignment(titleAlignment);

    if (window.AnilistCalendar.applyTheme) {
        window.AnilistCalendar.applyTheme();
    }

    // MODIFICATO: Aggiungiamo padding inferiore extra ai container in modalità compact
    if (window.AnilistCalendar.userPreferences.layoutMode === 'compact') {
        // Aggiungiamo una classe speciale per applicare un padding inferiore tramite CSS
        calendarGrid.classList.add('compact-mode-grid-with-padding');
    }
};

/**
 * Updates UI directly after saving settings without page refresh
 * @param {string} prevTimeFormat - Previous time format setting
 * @param {string} prevTitleAlignment - Previous title alignment setting
 * @param {string} prevColumnJustify - Previous column justification setting
 * @param {boolean} prevFullWidthImages - Previous full width images setting
 * @param {string} prevLayoutMode - Previous layout mode setting
 */
window.AnilistCalendar.calendar.updateUIWithSettings = function(prevTimeFormat, prevTitleAlignment, prevColumnJustify, prevFullWidthImages, prevLayoutMode) {
    if (window.AnilistCalendar.state.calendarContainer) {
        window.AnilistCalendar.utils.log("Updating UI with new settings");

        // UPDATED: Save a copy of the original image references to preserve them
        const originalImages = {...window.AnilistCalendar.state.originalCoverImages};

        // Remove all layout mode, alignment and justification classes
        window.AnilistCalendar.state.calendarContainer.classList.remove(
            'standard-mode', 'compact-mode', 'extended-mode', 'fan-mode',
            'gallery-with-slider', 'full-width-images',
            'title-left', 'title-center',
            'column-justify-top', 'column-justify-center'
        );

        // Add the current layout mode class
        window.AnilistCalendar.state.calendarContainer.classList.add(`${window.AnilistCalendar.userPreferences.layoutMode}-mode`);

        // Add the title alignment class
        const titleAlignment = window.AnilistCalendar.userPreferences.titleAlignment || 'left';
        window.AnilistCalendar.state.calendarContainer.classList.add(`title-${titleAlignment}`);

        // Add the column justification class
        const columnJustify = window.AnilistCalendar.userPreferences.columnJustify || 'top';
        window.AnilistCalendar.state.calendarContainer.classList.add(`column-justify-${columnJustify}`);

        // Add full-width-images class if enabled and in standard mode
        if (window.AnilistCalendar.userPreferences.layoutMode === 'standard' &&
            window.AnilistCalendar.userPreferences.fullWidthImages) {
            window.AnilistCalendar.state.calendarContainer.classList.add('full-width-images');
        }

        // Update title alignment if changed
        if (prevTitleAlignment !== titleAlignment) {
            window.AnilistCalendar.calendar.forceTitleAlignment(titleAlignment);
        }

        // Update column justification if changed
        if (prevColumnJustify !== columnJustify) {
            window.AnilistCalendar.calendar.forceColumnJustification(columnJustify);
        }

        // Always ensure column justification is applied (in case we changed layout)
        if (prevColumnJustify === columnJustify && prevLayoutMode !== window.AnilistCalendar.userPreferences.layoutMode) {
            window.AnilistCalendar.utils.log("Layout changed but column justification didn't - forcing justification anyway");
            window.AnilistCalendar.calendar.forceColumnJustification(columnJustify);
        }

        // Update header text - show "Weekly Schedule" without timezone
        const calendarTitle = document.querySelector('.calendar-title');
        if (calendarTitle) {
            calendarTitle.innerHTML = 'Weekly Schedule';
        }

        // Handle countdown timer if time format changed
        if (prevTimeFormat !== window.AnilistCalendar.userPreferences.timeFormat) {
            if (window.AnilistCalendar.userPreferences.timeFormat === 'countdown') {
                window.AnilistCalendar.calendar.startCountdownTimer();
            } else if (window.AnilistCalendar.state.countdownInterval) {
                clearInterval(window.AnilistCalendar.state.countdownInterval);
                window.AnilistCalendar.state.countdownInterval = null;
            }
        }

        // Render the calendar with updated settings
        window.AnilistCalendar.calendar.renderCalendar(window.AnilistCalendar.state.weeklySchedule, true);

        // UPDATED: Restore the original image references - merge with any new references that might have been added
        window.AnilistCalendar.state.originalCoverImages = {...originalImages, ...window.AnilistCalendar.state.originalCoverImages};

        window.AnilistCalendar.utils.log("Original image references preserved during settings update");
    }
};

/**
 * Processes anime data into a weekly schedule
 * @param {Array} animeData - Array of anime data objects
 * @return {Object} Object with days as keys and arrays of anime as values
 */
window.AnilistCalendar.calendar.processAnimeData = function(animeData) {
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
        // Get the day of the week directly from the airing date
        const day = window.AnilistCalendar.DAYS_OF_WEEK[anime.airingDate.getDay()];

        // Add to corresponding day
        schedule[day].push({
            id: anime.id,
            title: anime.title,
            cleanTitle: anime.cleanTitle,
            episodeInfo: anime.episodeInfo,
            coverImage: anime.coverImage,
            airingDate: anime.airingDate,
            formattedTime: window.AnilistCalendar.utils.formatTime(anime.airingDate),
            episode: anime.episode,
            day: day,
            days: anime.days,
            hours: anime.hours,
            minutes: anime.minutes,
            watched: anime.watched,
            available: anime.available,
            total: anime.total,
            episodesBehind: anime.episodesBehind,
            episodeProgressString: anime.episodeProgressString,
            episodeBehindHeader: anime.episodeBehindHeader
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

    window.AnilistCalendar.utils.log("Processed schedule data", schedule);
    return schedule;
};

/**
 * Updates the countdowns in real-time
 */
window.AnilistCalendar.calendar.startCountdownTimer = function() {
    if (window.AnilistCalendar.state.countdownInterval) {
        clearInterval(window.AnilistCalendar.state.countdownInterval);
    }
    window.AnilistCalendar.state.countdownInterval = setInterval(() => {
        if (window.AnilistCalendar.userPreferences.timeFormat !== 'countdown') return;
        const countdownElements = document.querySelectorAll('.anime-time.countdown-mode');
        if (countdownElements.length === 0) return;
        const now = new Date();

        countdownElements.forEach(element => {
            // Use target time from data attribute if available
            const targetTimeMs = element.dataset.targetTime;

            if (!targetTimeMs) {
                // Fallback for elements without data attribute
                const animeEntry = element.closest('.anime-entry');
                if (!animeEntry) return;
                const animeId = animeEntry.dataset.animeId;
                if (!animeId) return;

                let animeData = null;
                for (const day in window.AnilistCalendar.state.weeklySchedule) {
                    const match = window.AnilistCalendar.state.weeklySchedule[day].find(anime => anime.id === animeId);
                    if (match) {
                        animeData = match;
                        break;
                    }
                }
                if (!animeData) return;

                // Get airing time
                const airingTime = animeData.airingDate;

                // Check if already aired
                if (airingTime < now) {
                    element.textContent = "Aired";
                    return;
                }

                // Calculate time remaining
                const diff = airingTime - now;
                const {days, hours, minutes} = window.AnilistCalendar.utils.calculateTimeComponents(diff);

                if (days > 0) {
                    element.textContent = `${days}:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                } else {
                    element.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                }

                // Store for future updates
                element.dataset.targetTime = airingTime.getTime();
            } else {
                // Use stored target time
                const targetTime = new Date(parseInt(targetTimeMs));

                // Check if already aired
                if (targetTime < now) {
                    element.textContent = "Aired";
                    return;
                }

                // Update countdown
                const diff = targetTime - now;
                const {days, hours, minutes} = window.AnilistCalendar.utils.calculateTimeComponents(diff);

                if (days > 0) {
                    element.textContent = `${days}:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                } else {
                    element.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                }
            }
        });
    }, 1000);
};

/**
 * Configura il sistema di paginazione per la gallery mode
 * Posizionamento dei controlli dentro il contenitore delle card, a destra
 *
 * @param {HTMLElement} dayCol - La colonna del giorno
 * @param {HTMLElement} animeListContainer - Il contenitore della lista anime
 * @param {Array} animeList - Array di oggetti anime da visualizzare
 * @param {number} maxCards - Numero massimo di card per pagina
 * @param {string} justify - Tipo di giustificamento ('top' o 'center')
 */
function setupCardPagination(dayCol, animeListContainer, animeList, maxCards, justify) {
    // Log per debug
    window.AnilistCalendar.utils.log(`Setting up pagination: ${animeList.length} anime, max ${maxCards} per page`);

    // Calcola il numero totale di pagine
    const totalPages = Math.ceil(animeList.length / maxCards);
    window.AnilistCalendar.utils.log(`Total pages: ${totalPages}`);

    // Crea i contenitori per ogni pagina
    const pageContainers = [];
    for (let i = 0; i < totalPages; i++) {
        const pageContainer = document.createElement('div');
        pageContainer.className = `page-container page-${i}`;
        pageContainer.classList.add(`justify-${justify}`); // Applica allineamento in base alle preferenze

        // La prima pagina è visibile, le altre nascoste
        if (i > 0) {
            pageContainer.classList.add('hidden');
        }

        // Calcola gli indici per questa pagina
        const startIdx = i * maxCards;
        const endIdx = Math.min(startIdx + maxCards, animeList.length);

        // Aggiungi le card a questa pagina
        for (let j = startIdx; j < endIdx; j++) {
            window.AnilistCalendar.calendar.createAnimeEntry(pageContainer, animeList[j]);

            // Aggiungi attributo per l'ultimo elemento
            if (j === endIdx - 1) {
                const lastEntry = pageContainer.lastChild;
                if (lastEntry) {
                    lastEntry.setAttribute('data-last-entry', 'true');
                }
            }
        }

        // Aggiungi il contenitore alla lista
        animeListContainer.appendChild(pageContainer);
        pageContainers.push(pageContainer);
    }

    // Se c'è più di una pagina, crea i controlli di navigazione
    if (totalPages > 1) {
        let currentPage = 0;

        // IMPORTANTE: aggiungi i controlli alla COLONNA DEL GIORNO (livello superiore)
        // anziché al contenitore degli anime

        // Controlli di paginazione
        const paginationControls = document.createElement('div');
        paginationControls.className = 'pagination-controls';

        // Bottone pagina precedente
        const prevBtn = document.createElement('button');
        prevBtn.className = 'pagination-btn prev-btn';
        prevBtn.innerHTML = '<i class="fa fa-chevron-up"></i>';
        prevBtn.setAttribute('aria-label', 'Previous page');
        prevBtn.classList.add('hidden'); // Inizialmente nascosto (prima pagina)

        // Bottone pagina successiva
        const nextBtn = document.createElement('button');
        nextBtn.className = 'pagination-btn next-btn';
        nextBtn.innerHTML = '<i class="fa fa-chevron-down"></i>';
        nextBtn.setAttribute('aria-label', 'Next page');

        // Aggiungi bottoni al contenitore
        paginationControls.appendChild(prevBtn);
        paginationControls.appendChild(nextBtn);

        // IMPORTANTE: aggiungi i controlli DENTRO IL CONTENITORE ANIME
        animeListContainer.appendChild(paginationControls);

        // Funzione per aggiornare la visualizzazione delle pagine
        const updatePageView = () => {
            // Aggiorna visibilità pagine
            pageContainers.forEach((page, index) => {
                if (index === currentPage) {
                    page.classList.remove('hidden');
                } else {
                    page.classList.add('hidden');
                }
            });

            // Aggiorna stato bottoni - nascondiamo visivamente i bottoni ma manteniamo lo spazio
            // per evitare che l'interfaccia "salti" quando un bottone scompare
            if (currentPage === 0) {
                prevBtn.classList.add('hidden');
            } else {
                prevBtn.classList.remove('hidden');
            }

            if (currentPage === totalPages - 1) {
                nextBtn.classList.add('hidden');
            } else {
                nextBtn.classList.remove('hidden');
            }

            window.AnilistCalendar.utils.log(`Showing page ${currentPage + 1}/${totalPages}`);
        };

        // Event listener per i bottoni
        prevBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (currentPage > 0) {
                currentPage--;
                updatePageView();
            }

            return false;
        });

        nextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (currentPage < totalPages - 1) {
                currentPage++;
                updatePageView();
            }

            return false;
        });
    }
}