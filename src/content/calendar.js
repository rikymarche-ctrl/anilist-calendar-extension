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

    // Create a style element with CSS rules rather than applying inline styles
    const titleStyle = document.createElement('style');
    titleStyle.id = 'force-title-alignment-style';

    // Create super-specific styles with !important for each layout type
    titleStyle.innerHTML = `
        /* Common title alignment for all layouts */
        .anilist-weekly-calendar .anime-title.text-${alignment} {
            text-align: ${alignment} !important;
        }
        
        /* Standard mode specific */
        .anilist-weekly-calendar.standard-mode .anime-title {
            text-align: ${alignment} !important;
        }
        
        /* Compact mode specific */
        .anilist-weekly-calendar.compact-mode .anime-title {
            text-align: ${alignment} !important;
        }
        
        /* Extended/Gallery mode always uses center alignment */
        .anilist-weekly-calendar.extended-mode .anime-title {
            text-align: center !important;
        }
        
        /* Add extra specificity */
        .anilist-weekly-calendar .anilist-calendar-grid .anilist-calendar-day .anime-entry .anime-title {
            text-align: ${alignment} !important;
        }
        
        /* But gallery mode is always centered regardless of setting */
        .anilist-weekly-calendar.extended-mode .anilist-calendar-grid .anilist-calendar-day .anime-entry .anime-title {
            text-align: center !important;
        }
    `;

    // Add style to document
    document.head.appendChild(titleStyle);

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

                    // Store original element for reference
                    window.AnilistCalendar.state.originalCoverImages[animeId] = coverLink;
                }

                // Fallback for alternative structures
                if (!coverImageUrl) {
                    const coverImg = card.querySelector('.cover img, .image img, img.cover, img.image');
                    if (coverImg && coverImg.src) {
                        coverImageUrl = coverImg.src;
                        window.AnilistCalendar.state.originalCoverImages[animeId] = coverImg;
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
                let newText = `Ep ${newProgress}`;
                if (matches[3] && newProgress === parseInt(matches[2])) {
                    newText = `Ep ${newProgress}/${matches[3]}`;
                } else if (matches[2] && matches[3]) {
                    newText = `Ep ${newProgress}/${matches[2]}/${matches[3]}`;
                } else if (matches[2]) {
                    newText = `Ep ${newProgress}/${matches[2]}`;
                }
                const behindIndicator = episodeNumber.querySelector('.behind-indicator');
                if (behindIndicator) {
                    behindIndicator.remove();
                }
                episodeNumber.textContent = newText;
            }
        }
        let animeData = window.AnilistCalendar.calendar.getAnimeDataFromEntry(entry);
        if (animeData) {
            animeData.watched = newProgress;
            if (animeData.episodesBehind > 0 && animeData.watched >= animeData.available) {
                animeData.episodesBehind = 0;
            }
            if (animeData.available < newProgress) {
                animeData.available = newProgress;
            }
            entry.dataset.animeData = JSON.stringify(animeData);
        }
    });
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

    // Get all day columns
    const dayColumns = window.AnilistCalendar.state.calendarContainer.querySelectorAll('.anilist-calendar-day');

    // Remove any previous styles
    const oldStyle = document.getElementById('force-column-justify-style');
    if (oldStyle) oldStyle.remove();

    // Create a style element with CSS rules rather than applying inline styles
    const columnStyle = document.createElement('style');
    columnStyle.id = 'force-column-justify-style';

    // Base styles for all modes
    let styleRules = `
        .anilist-weekly-calendar .anilist-calendar-day {
            display: flex !important;
            flex-direction: column !important;
            justify-content: ${justification === 'center' ? 'center' : 'flex-start'} !important;
            align-items: stretch !important;
        }
        
        .anilist-weekly-calendar .day-anime-list {
            display: flex !important;
            flex-direction: column !important;
            justify-content: ${justification === 'center' ? 'center' : 'flex-start'} !important;
            align-items: stretch !important;
            flex: 1 !important;
        }
        
        .anilist-weekly-calendar .empty-day {
            margin: ${justification === 'center' ? 'auto' : '0'} !important;
        }
    `;

    // Add specific styles for gallery/extended mode
    if (currentLayoutMode === 'extended') {
        styleRules += `
            .anilist-weekly-calendar.extended-mode .anilist-calendar-day {
                display: flex !important;
                flex-direction: column !important;
                justify-content: ${justification === 'center' ? 'center' : 'flex-start'} !important;
                align-items: center !important;
            }
            
            .anilist-weekly-calendar.extended-mode .day-anime-list {
                display: flex !important;
                flex-direction: row !important;
                flex-wrap: wrap !important;
                justify-content: center !important;
                align-content: ${justification === 'center' ? 'center' : 'flex-start'} !important;
                align-items: ${justification === 'center' ? 'center' : 'flex-start'} !important;
            }
            
            .gallery-slider-wrapper {
                justify-content: ${justification === 'center' ? 'center' : 'flex-start'} !important;
            }
            
            .gallery-page {
                justify-content: center !important;
                align-content: ${justification === 'center' ? 'center' : 'flex-start'} !important;
            }
        `;
    }

    columnStyle.innerHTML = styleRules;
    document.head.appendChild(columnStyle);

    // Apply the class directly to all day columns for extra reliability
    dayColumns.forEach(dayColumn => {
        dayColumn.classList.remove('force-center', 'force-top');
        dayColumn.classList.add(justification === 'center' ? 'force-center' : 'force-top');

        const animeList = dayColumn.querySelector('.day-anime-list');
        if (animeList) {
            animeList.classList.remove('justify-center', 'justify-top');
            animeList.classList.add(`justify-${justification}`);

            // For gallery mode, also update the gallery wrapper classes
            if (currentLayoutMode === 'extended') {
                const galleryWrapper = animeList.querySelector('.gallery-slider-wrapper');
                if (galleryWrapper) {
                    galleryWrapper.classList.remove('justify-center', 'justify-top');
                    galleryWrapper.classList.add(`justify-${justification}`);

                    // Update all gallery pages
                    const galleryPages = galleryWrapper.querySelectorAll('.gallery-page');
                    galleryPages.forEach(page => {
                        page.classList.remove('justify-center', 'justify-top');
                        page.classList.add(`justify-${justification}`);
                    });
                }
            }
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

        // Thumbnail loading function
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

        const loadThumbnail = () => {
            if (window.AnilistCalendar.state.originalCoverImages[anime.id]) {
                const originalElement = window.AnilistCalendar.state.originalCoverImages[anime.id];
                if (originalElement.tagName.toLowerCase() === 'a' && originalElement.classList.contains('cover')) {
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
                        const img = createConfiguredImage(imageUrl, anime, imageContainer, { onError: loadDirectImageUrl });
                        imageContainer.appendChild(img);
                        return;
                    }
                } else if (originalElement.tagName.toLowerCase() === 'img') {
                    const img = createConfiguredImage(originalElement.src, anime, imageContainer, { onError: loadDirectImageUrl });
                    imageContainer.appendChild(img);
                    return;
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
 * Versione modificata della funzione renderCalendar per mostrare correttamente
 * i giorni vuoti con frecce e formattazione uniforme.
 * Sostituisce la funzione originale in calendar.js
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

    // Set up gallery slider mode if in gallery mode and maxCardsPerDay is set
    const isGalleryMode = window.AnilistCalendar.userPreferences.layoutMode === 'extended' ||
        window.AnilistCalendar.userPreferences.layoutMode === 'grid';
    const hasMaxCards = window.AnilistCalendar.userPreferences.maxCardsPerDay > 0;

    if (isGalleryMode && hasMaxCards) {
        window.AnilistCalendar.state.calendarContainer.classList.add('gallery-with-slider');
        window.AnilistCalendar.utils.log("Gallery mode with slider enabled. Max cards per day: " +
            window.AnilistCalendar.userPreferences.maxCardsPerDay);
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
        dayCol.id = `calendar-day-${day.toLowerCase()}`;

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

        // Add specific classes for gallery mode
        if (isGalleryMode) {
            animeList.classList.add('gallery-anime-list');
        }

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

        // FIX: Gestione unificata per giorni vuoti e giorni con contenuto
        if (schedule[day] && schedule[day].length > 0) {
            // Giorni con contenuto
            schedule[day].forEach((anime, animeIndex) => {
                window.AnilistCalendar.calendar.createAnimeEntry(animeList, anime);

                // Aggiungiamo un attributo data-last-entry per l'ultimo elemento
                if (animeIndex === schedule[day].length - 1) {
                    const lastEntry = animeList.lastChild;
                    if (lastEntry) {
                        lastEntry.setAttribute('data-last-entry', 'true');
                    }
                }
            });

            // Configurazione della gallery per giorni con contenuto
            if (isGalleryMode && window.AnilistCalendar.userPreferences.maxCardsPerDay > 0) {
                window.AnilistCalendar.calendar.setupGallerySlider(
                    dayCol,
                    animeList,
                    window.AnilistCalendar.userPreferences.maxCardsPerDay
                );
            }
        } else {
            // Giorni vuoti
            // FIX: Creiamo un contenitore simile per mantenere la coerenza visiva
            if (isGalleryMode) {
                // Per la gallery mode, usiamo lo stesso sistema di visualizzazione
                const emptyDayContainer = document.createElement('div');
                emptyDayContainer.className = 'gallery-fixed-container';
                emptyDayContainer.classList.add(`justify-${columnJustify}`);

                const sliderWrapper = document.createElement('div');
                sliderWrapper.className = 'gallery-slider-wrapper';
                sliderWrapper.classList.add(`justify-${columnJustify}`);

                const pagesContainer = document.createElement('div');
                pagesContainer.className = 'gallery-pages-container';
                pagesContainer.classList.add(`justify-${columnJustify}`);

                const galleryPage = document.createElement('div');
                galleryPage.className = 'gallery-page';
                galleryPage.classList.add(`justify-${columnJustify}`);

                const emptyDay = document.createElement('div');
                emptyDay.className = 'empty-day gallery-empty-day';
                emptyDay.textContent = 'No episodes';

                galleryPage.appendChild(emptyDay);
                pagesContainer.appendChild(galleryPage);
                sliderWrapper.appendChild(pagesContainer);
                emptyDayContainer.appendChild(sliderWrapper);

                // FIX: Aggiungiamo i controlli di navigazione anche per i giorni vuoti per mantenere coerenza visiva
                const navPrev = document.createElement('button');
                navPrev.className = 'gallery-nav-button gallery-nav-prev nav-hidden';
                navPrev.innerHTML = '<i class="fa fa-chevron-up"></i>';
                navPrev.setAttribute('aria-label', 'Previous page');

                const navNext = document.createElement('button');
                navNext.className = 'gallery-nav-button gallery-nav-next nav-hidden';
                navNext.innerHTML = '<i class="fa fa-chevron-down"></i>';
                navNext.setAttribute('aria-label', 'Next page');

                emptyDayContainer.appendChild(navPrev);
                emptyDayContainer.appendChild(navNext);

                // Aggiunta della classe per la navigazione
                emptyDayContainer.classList.add('gallery-with-nav');

                animeList.appendChild(emptyDayContainer);
            } else {
                // Per le modalità standard e compact
                const emptyDay = document.createElement('div');
                emptyDay.className = 'empty-day';
                emptyDay.textContent = 'No episodes';
                animeList.appendChild(emptyDay);
            }
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

        // Add gallery slider class if needed
        const isGalleryMode = window.AnilistCalendar.userPreferences.layoutMode === 'extended' ||
            window.AnilistCalendar.userPreferences.layoutMode === 'fan';

        if (isGalleryMode && window.AnilistCalendar.userPreferences.maxCardsPerDay > 0) {
            window.AnilistCalendar.state.calendarContainer.classList.add('gallery-with-slider');
        }

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
 * Calculate time components (days, hours, minutes) from a time difference
 * @param {number} diff - Time difference in milliseconds
 * @return {Object} Object containing days, hours, and minutes
 */
window.AnilistCalendar.calendar.calculateTimeComponents = function(diff) {
    return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000)
    };
};

/**
 * Sets up slider for gallery mode when card count exceeds limit
 * @param {HTMLElement} dayContainer - The day column container
 * @param {HTMLElement} animeList - The container with anime entries
 * @param {number} maxCards - Maximum number of cards to show
 */
window.AnilistCalendar.calendar.setupGallerySlider = function(dayContainer, animeList, maxCards) {
    // Verify parameters and that there are enough cards to require a slider
    if (!maxCards || maxCards <= 0 || !animeList) return;

    // Get all original anime cards
    const cards = Array.from(animeList.querySelectorAll('.anime-entry'));
    const totalCards = cards.length;

    // If there aren't enough cards to require pagination, exit
    if (totalCards <= maxCards) return;

    // Save the original justification style and class
    const hasJustifyCenter = animeList.classList.contains('justify-center');
    const originalJustify = hasJustifyCenter ? 'center' : 'top';

    // Determine parent column justification
    const parentDayColumn = animeList.closest('.anilist-calendar-day');
    const hasColumnJustifyCenter = parentDayColumn && parentDayColumn.classList.contains('force-center');
    const columnJustify = hasColumnJustifyCenter ? 'center' : 'top';

    // Clear the container before adding pages
    animeList.innerHTML = '';

    // Create a fixed-height container to maintain consistent positioning
    const fixedContainer = document.createElement('div');
    fixedContainer.className = 'gallery-fixed-container';
    // Set a specific height based on the maximum number of cards (using the card height + gap)
    // Each card is 160px + 16px gap, calculate rows based on maxCards
    const cardsPerRow = 3; // Typical number of cards per row
    const cardHeight = 160; // Card height in gallery mode
    const cardGap = 16; // Gap between cards
    const rows = Math.ceil(maxCards / cardsPerRow);
    const containerHeight = (rows * cardHeight) + ((rows - 1) * cardGap) + 40; // Add padding
    fixedContainer.style.height = `${containerHeight}px`;
    fixedContainer.style.position = 'relative';

    // Apply justification class to fixed container
    fixedContainer.classList.add(`justify-${columnJustify}`);

    // Create the main slider container inside the fixed container
    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'gallery-slider-wrapper';

    // Apply consistent justification to slider container
    sliderContainer.classList.add(`justify-${columnJustify}`);

    // Create the pages container
    const pagesContainer = document.createElement('div');
    pagesContainer.className = 'gallery-pages-container';

    // Also apply consistent justification to pages container
    pagesContainer.classList.add(`justify-${columnJustify}`);
    // Make it take the full size of the fixed container
    pagesContainer.style.width = '100%';
    pagesContainer.style.height = '100%';
    pagesContainer.style.position = 'relative';

    // Calculate the total number of pages needed
    const totalPages = Math.ceil(totalCards / maxCards);

    // Debug log
    window.AnilistCalendar.utils.log(`Setting up gallery slider: ${totalCards} cards, ${maxCards} per page = ${totalPages} pages, container height: ${containerHeight}px`);

    // Create pages and distribute cards
    for (let i = 0; i < totalPages; i++) {
        // Create the page container
        const page = document.createElement('div');
        page.className = 'gallery-page';

        // Position each page absolutely within the container
        page.style.position = 'absolute';
        page.style.top = '0';
        page.style.left = '0';
        page.style.width = '100%';
        page.style.height = '100%';

        // IMPORTANTE: Applica la stessa giustificazione a tutte le pagine in base alla colonna principale
        page.classList.add(`justify-${columnJustify}`);

        // Assicura visivamente l'allineamento corretto
        if (columnJustify === 'center') {
            page.style.alignItems = 'center';
            page.style.alignContent = 'center';
            page.style.justifyContent = 'center';
        } else {
            page.style.alignItems = 'flex-start';
            page.style.alignContent = 'flex-start';
            page.style.justifyContent = 'center'; // Center horizontally always
        }

        page.dataset.page = i.toString();
        page.dataset.justification = columnJustify;

        // Show only the first page initially
        if (i !== 0) {
            page.classList.add('hidden-page');
        }

        // Calculate the indices of cards to include in this page
        const startIdx = i * maxCards;
        const endIdx = Math.min(startIdx + maxCards, totalCards);

        // Add cards to this page
        for (let j = startIdx; j < endIdx; j++) {
            if (cards[j]) {
                page.appendChild(cards[j]);
            }
        }

        // Add the page to the container
        pagesContainer.appendChild(page);
    }

    // Add the pages container to the slider container
    sliderContainer.appendChild(pagesContainer);
    // Add the slider container to the fixed container
    fixedContainer.appendChild(sliderContainer);
    // Add the fixed container to the anime list
    animeList.appendChild(fixedContainer);

    // If there are multiple pages, add navigation controls
    if (totalPages > 1) {
        let currentPage = 0;

        // Create "previous" button
        const prevButton = document.createElement('button');
        prevButton.className = 'gallery-nav-button gallery-nav-prev';
        prevButton.innerHTML = '<i class="fa fa-chevron-up"></i>';
        prevButton.setAttribute('aria-label', 'Previous page');
        prevButton.classList.add('nav-hidden'); // Initially hidden because we're on the first page

        // Create "next" button
        const nextButton = document.createElement('button');
        nextButton.className = 'gallery-nav-button gallery-nav-next';
        nextButton.innerHTML = '<i class="fa fa-chevron-down"></i>';
        nextButton.setAttribute('aria-label', 'Next page');

        // Function to update the page view
        const updateView = () => {
            // Update all pages
            const pages = pagesContainer.querySelectorAll('.gallery-page');
            pages.forEach((page, idx) => {
                if (idx === currentPage) {
                    page.classList.remove('hidden-page');
                } else {
                    page.classList.add('hidden-page');
                }
            });

            // Update navigation buttons
            if (currentPage === 0) {
                prevButton.classList.add('nav-hidden');
            } else {
                prevButton.classList.remove('nav-hidden');
            }

            if (currentPage === totalPages - 1) {
                nextButton.classList.add('nav-hidden');
            } else {
                nextButton.classList.remove('nav-hidden');
            }

            window.AnilistCalendar.utils.log(`Gallery page changed to ${currentPage + 1}/${totalPages}`);
        };

        // Handle click events for the buttons
        prevButton.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            if (currentPage > 0) {
                currentPage--;
                updateView();
            }
            return false;
        });

        nextButton.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            if (currentPage < totalPages - 1) {
                currentPage++;
                updateView();
            }
            return false;
        });

        // Add the styling class and buttons
        fixedContainer.classList.add('gallery-with-nav');
        fixedContainer.appendChild(prevButton);
        fixedContainer.appendChild(nextButton);

        // Ensure initial view is correct
        updateView();

        // Reattach event listeners for plus buttons in cards
        const reattachEvents = () => {
            const allPlusButtons = fixedContainer.querySelectorAll('.plus-button, .plus-icon');
            allPlusButtons.forEach(button => {
                const animeEntry = button.closest('.anime-entry');
                if (animeEntry && animeEntry.dataset.animeData) {
                    try {
                        const animeData = JSON.parse(animeEntry.dataset.animeData);

                        // Remove existing event listeners
                        const newButton = button.cloneNode(true);
                        button.parentNode.replaceChild(newButton, button);

                        // Add the new event listener
                        newButton.addEventListener('click', function(e) {
                            e.stopPropagation();
                            e.preventDefault();
                            window.AnilistCalendar.calendar.handlePlusButtonClick(e, animeData);
                            return false;
                        });
                    } catch (err) {
                        window.AnilistCalendar.utils.log('Error reattaching events:', err);
                    }
                }
            });
        };

        // Reattach the event listeners
        reattachEvents();
    }
};