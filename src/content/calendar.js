/**
 * Anilist Weekly Schedule - Calendar
 * Creates and manages the weekly calendar view
 */

// Access directly the global namespace
// (no need to create a local variable)

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
        // Get the timezone-adjusted day
        const adjustedDay = window.AnilistCalendar.DAYS_OF_WEEK[anime.airingDate.getDay()];

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
            originalDay: anime.originalDay,
            dayChanged: anime.dayChanged,
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

        // Process each card to extract data - NO TIMEOUT HERE
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

                // Extract cover image - AniList usa background-image su tag <a> con classe "cover"
                let coverImageUrl = '';

                // Cerchiamo direttamente il link con classe cover
                const coverLink = card.querySelector('a.cover');

                if (coverLink) {
                    // Controlliamo prima data-src (contiene l'URL originale)
                    if (coverLink.dataset.src) {
                        coverImageUrl = coverLink.dataset.src;
                    }
                    // Altrimenti prendiamo lo sfondo impostato via CSS
                    else if (coverLink.style.backgroundImage) {
                        // Estraiamo l'URL dal background-image: url('...')
                        const bgImgMatch = coverLink.style.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
                        if (bgImgMatch && bgImgMatch[1]) {
                            coverImageUrl = bgImgMatch[1];
                        }
                    }

                    // Store original element for reference
                    window.AnilistCalendar.state.originalCoverImages[animeId] = coverLink;
                }

                // Fallback per strutture alternative
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
                    // Format could be "1d 4h 23m" or "4:23" or similar
                    const dayMatch = countdownText.match(/(\d+)d/);
                    const hourMatch = countdownText.match(/(\d+)h/);
                    const minuteMatch = countdownText.match(/(\d+)m/);

                    // Alternative format "4:23" (hours:minutes)
                    const timeMatch = countdownText.match(/(\d+):(\d+)/);

                    if (dayMatch) days = parseInt(dayMatch[1]);
                    if (hourMatch) hours = parseInt(hourMatch[1]);
                    if (minuteMatch) minutes = parseInt(minuteMatch[1]);

                    // Alternative format handling
                    if (timeMatch && !hourMatch) {
                        hours = parseInt(timeMatch[1]);
                        minutes = parseInt(timeMatch[2]);
                    }

                    // Calculate airing date
                    airingDate = new Date();
                    airingDate.setDate(airingDate.getDate() + days);
                    airingDate.setHours(airingDate.getHours() + hours);
                    airingDate.setMinutes(airingDate.getMinutes() + minutes);
                    airingDate.setSeconds(0);
                } else {
                    // If no countdown, assume it's airing now
                    const now = new Date();
                    airingDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0);
                }

                // Adjust time to selected timezone
                const userTimezoneOffset = window.AnilistCalendar.settings.getSelectedTimezoneOffset();
                const japanOffset = window.AnilistCalendar.JAPAN_TIMEZONE_OFFSET; // UTC+9
                const offsetDiff = userTimezoneOffset - japanOffset;

                // Apply timezone adjustment
                const adjustedAiringDate = new Date(airingDate.getTime() + (offsetDiff * 60 * 60 * 1000));

                // Check if day changed due to timezone
                const originalDay = window.AnilistCalendar.DAYS_OF_WEEK[airingDate.getDay()];
                const adjustedDay = window.AnilistCalendar.DAYS_OF_WEEK[adjustedAiringDate.getDay()];
                const dayChanged = originalDay !== adjustedDay;

                // Format the time for display
                const formattedTime = window.AnilistCalendar.utils.formatTime(adjustedAiringDate);

                // Create the anime data object
                const anime = {
                    id: animeId,
                    title: titleText,
                    cleanTitle: episodeInfo.cleanTitle || titleText,
                    episodeInfo: episodeInfo.formatted || '1',
                    coverImage: coverImageUrl,
                    airingDate: adjustedAiringDate,
                    formattedTime: formattedTime,
                    originalDay: originalDay,
                    dayChanged: dayChanged,
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
 * Creates an anime entry element with thumbnail and episode progress
 * @param {HTMLElement} container - The container to append the entry to
 * @param {Object} anime - The anime data object
 */
window.AnilistCalendar.calendar.createAnimeEntry = function(container, anime) {
    // Create the entry container
    const entry = document.createElement('div');
    entry.className = 'anime-entry';
    entry.dataset.animeId = anime.id;
    entry.dataset.animeData = JSON.stringify(anime);

    // Navigation: clicking the entry opens the anime page
    entry.addEventListener('click', () => {
        window.location.href = `/anime/${anime.id}`;
    });

    // Check what layout mode we're using
    const isCompactMode = window.AnilistCalendar.userPreferences.layoutMode === 'compact';
    const isGalleryMode = window.AnilistCalendar.userPreferences.layoutMode === 'extended' ||
        window.AnilistCalendar.userPreferences.layoutMode === 'grid';

    // Add compact mode plus button if in compact mode
    if (isCompactMode) {
        const compactPlusContainer = document.createElement('div');
        compactPlusContainer.className = 'compact-plus-container';

        const compactPlusButton = document.createElement('div');
        compactPlusButton.className = 'compact-plus-button';
        compactPlusButton.setAttribute('title', 'Mark as watched');

        // Create plus icon
        const iconElement = document.createElement('i');
        iconElement.className = 'fa fa-plus';

        // Add click handler
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
        // Create image container for non-compact modes
        const imageContainer = document.createElement('div');
        imageContainer.className = 'anime-image';
        imageContainer.style.position = 'relative';
        imageContainer.style.overflow = 'hidden';
        imageContainer.style.backgroundColor = '#1A1A2E';

        // Add the dedicated overlay element
        const overlay = document.createElement('div');
        overlay.className = 'anime-image-overlay';
        imageContainer.appendChild(overlay);

        // IMPROVED THUMBNAIL HANDLING FOR ANILIST STRUCTURE
        const loadThumbnail = () => {
            // Priority 1: Use original cover element if available
            if (window.AnilistCalendar.state.originalCoverImages[anime.id]) {
                window.AnilistCalendar.utils.log(`Using original cover for anime ID: ${anime.id}`);
                const originalElement = window.AnilistCalendar.state.originalCoverImages[anime.id];

                // Check if this is a link with background-image (AniList struttura)
                if (originalElement.tagName.toLowerCase() === 'a' && originalElement.classList.contains('cover')) {
                    // Get URL from either data-src or background-image
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
                        // Creiamo elemento img con URL trovato
                        const img = document.createElement('img');
                        img.src = imageUrl;
                        img.alt = anime.cleanTitle;
                        img.style.width = '100%';
                        img.style.height = '100%';
                        img.style.objectFit = 'cover';
                        img.style.position = 'absolute';
                        img.style.top = '0';
                        img.style.left = '0';
                        img.style.zIndex = '1';

                        // Add load and error handlers
                        img.onload = () => {
                            imageContainer.classList.remove('loading');
                            imageContainer.style.backgroundColor = 'transparent';
                        };

                        img.onerror = () => {
                            img.remove();
                            loadDirectImageUrl();
                        };

                        imageContainer.appendChild(img);
                        return;
                    }
                }
                // Se è un elemento img standard
                else if (originalElement.tagName.toLowerCase() === 'img') {
                    const img = document.createElement('img');
                    img.src = originalElement.src;
                    img.alt = anime.cleanTitle;
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.objectFit = 'cover';
                    img.style.position = 'absolute';
                    img.style.top = '0';
                    img.style.left = '0';
                    img.style.zIndex = '1';

                    img.onload = () => {
                        imageContainer.classList.remove('loading');
                        imageContainer.style.backgroundColor = 'transparent';
                    };

                    img.onerror = () => {
                        img.remove();
                        loadDirectImageUrl();
                    };

                    imageContainer.appendChild(img);
                    return;
                }
            }

            // Priority 2: Try direct URL loading as fallback
            loadDirectImageUrl();
        };

        // Function to load image from direct URL
        const loadDirectImageUrl = () => {
            if (!anime.coverImage || anime.coverImage.length < 10) {
                showFallbackImage();
                return;
            }

            imageContainer.classList.add('loading');

            // Try to clean up the URL first
            let imageUrl = anime.coverImage;

            // Remove any quotes and escape characters
            imageUrl = imageUrl.replace(/["'\\]/g, '');

            // Fix potential protocol issues
            if (imageUrl.startsWith('//')) {
                imageUrl = 'https:' + imageUrl;
            } else if (!imageUrl.startsWith('http')) {
                imageUrl = 'https://' + imageUrl;
            }

            // Create image element
            const img = document.createElement('img');
            img.alt = anime.cleanTitle;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            img.style.position = 'absolute';
            img.style.top = '0';
            img.style.left = '0';
            img.style.zIndex = '1';
            img.setAttribute('loading', 'eager');
            img.setAttribute('decoding', 'async');
            img.setAttribute('crossorigin', 'anonymous');

            // Handle successful load
            img.onload = () => {
                imageContainer.classList.remove('loading');
                imageContainer.style.backgroundColor = 'transparent';
            };

            // Handle error with direct fallback - no retry delay
            img.onerror = () => {
                window.AnilistCalendar.utils.log(`Error loading image for ${anime.cleanTitle}`);
                img.remove();
                showFallbackImage();
            };

            // Set source and append to container
            img.src = imageUrl;
            imageContainer.appendChild(img);
        };

        // Function to show fallback image
        const showFallbackImage = () => {
            imageContainer.classList.remove('loading');
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
        };

        // Start the thumbnail loading process
        loadThumbnail();

        // Create plus button with dedicated function for better isolation
        // Create container with correct pointer-events handling
        const plusButtonContainer = document.createElement('div');
        plusButtonContainer.className = 'plus-button-container';
        plusButtonContainer.style.pointerEvents = 'none'; // Allow clicks to pass through

        // Create the button itself with correct pointer-events
        const plusButton = document.createElement('div');
        plusButton.className = 'plus-button';
        plusButton.style.cursor = 'pointer';
        plusButton.style.zIndex = '20';
        plusButton.style.pointerEvents = 'auto'; // Explicitly capture clicks

        // Create plus icon container
        const plusIcon = document.createElement('div');
        plusIcon.className = 'plus-icon';

        // Create the Font Awesome icon
        const iconElement = document.createElement('i');
        iconElement.className = 'fa fa-plus';
        iconElement.style.fontSize = '14px';
        iconElement.style.color = 'white';

        // Build the DOM structure
        plusIcon.appendChild(iconElement);
        plusButton.appendChild(plusIcon);
        plusButtonContainer.appendChild(plusButton);

        // Position the plus button based on layout mode
        if (isGalleryMode) {
            // For gallery mode, center the plus button
            plusButton.style.top = '50%';
            plusButton.style.left = '50%';
            plusButton.style.transform = 'translate(-50%, -50%)';
        } else {
            // Standard layout - default position
            plusButton.style.top = '50%';
            plusButton.style.left = '50%';
            plusButton.style.transform = 'translate(-50%, -50%)';
        }

        // Add click event listener with explicit propagation stopping
        plusButton.addEventListener('click', function(e) {
            // These two lines are crucial for stopping the event from reaching the parent
            e.stopPropagation();
            e.preventDefault();

            // Visual feedback - only transform the icon, not the background
            const iconEl = plusIcon.querySelector('i');
            if (iconEl) {
                iconEl.style.transform = 'scale(0.85)';
                setTimeout(() => {
                    iconEl.style.transform = 'scale(1)';
                }, 300);
            }

            // Handle the actual functionality
            window.AnilistCalendar.calendar.handlePlusButtonClick(e, anime);
            return false; // Ensure no default behavior
        });

        // Add this container to the image container
        imageContainer.appendChild(plusButtonContainer);
        entry.appendChild(imageContainer);
    }

    // Create information panels - different approach for gallery mode vs standard
    if (isGalleryMode) {
        // NEW APPROACH: Create separate top and bottom panels for gallery mode

        // TOP PANEL FOR TITLE
        const titlePanel = document.createElement('div');
        titlePanel.className = 'title-panel';

        const titleEl = document.createElement('div');
        titleEl.className = 'anime-title';
        titleEl.textContent = anime.cleanTitle;
        titleEl.style.textAlign = 'center';

        titlePanel.appendChild(titleEl);
        entry.appendChild(titlePanel);

        // BOTTOM PANEL FOR INFO ROW
        if (window.AnilistCalendar.userPreferences.showEpisodeNumbers || window.AnilistCalendar.userPreferences.showTime) {
            const infoPanel = document.createElement('div');
            infoPanel.className = 'info-panel';

            const infoRow = document.createElement('div');
            infoRow.className = 'anime-info-row';

            // Add episode number if enabled
            if (window.AnilistCalendar.userPreferences.showEpisodeNumbers) {
                const episodeNumber = document.createElement('div');
                episodeNumber.className = 'episode-number';

                // Display progress string if available, otherwise use standard format
                if (anime.episodeProgressString && anime.episodeProgressString.trim().length > 0) {
                    episodeNumber.textContent = 'Ep ' + anime.episodeProgressString;
                } else {
                    episodeNumber.textContent = 'Ep ' + anime.episodeInfo;
                }

                // If episodes behind indicator is present, show it BEFORE episode text
                if (anime.episodesBehind > 0) {
                    const behindIndicator = document.createElement('span');
                    behindIndicator.className = 'behind-indicator';
                    behindIndicator.title = `${anime.episodesBehind} episode(s) behind`;
                    episodeNumber.prepend(behindIndicator); // Place at the beginning
                }

                infoRow.appendChild(episodeNumber);
            }

            // Add time display if enabled
            if (window.AnilistCalendar.userPreferences.showTime) {
                const timeDisplay = document.createElement('div');
                timeDisplay.className = 'anime-time';

                if (window.AnilistCalendar.userPreferences.timeFormat === 'countdown') {
                    timeDisplay.classList.add('countdown-mode');
                    const now = new Date();

                    // Correggi il problema del timezone per il countdown
                    // Invece di usare direttamente airingDate, calcoliamo se l'episodio è effettivamente uscito
                    // basandoci sull'orario originale giapponese

                    // Converti l'orario attuale nel fuso orario giapponese (UTC+9)
                    const currentTimeInJapan = new Date();
                    // Calcola la differenza tra il fuso locale e UTC
                    const localUTCOffset = currentTimeInJapan.getTimezoneOffset() * -1 / 60;
                    // Calcola la differenza in ore tra il fuso locale e il Giappone (UTC+9)
                    const offsetFromJapan = localUTCOffset - 9;
                    // Aggiungi l'offset per ottenere l'ora giapponese
                    currentTimeInJapan.setHours(currentTimeInJapan.getHours() - offsetFromJapan);

                    // Usa l'airingTime originale (prima dell'aggiustamento timezone)
                    const originalAiringTime = new Date(anime.airingDate.getTime());
                    // Rimuovi l'aggiustamento del timezone applicato in precedenza
                    const userTimezoneOffset = window.AnilistCalendar.settings.getSelectedTimezoneOffset();
                    const japanOffset = window.AnilistCalendar.JAPAN_TIMEZONE_OFFSET;
                    const offsetDiff = userTimezoneOffset - japanOffset;
                    const japaneseAiringTime = new Date(originalAiringTime.getTime() - (offsetDiff * 60 * 60 * 1000));

                    // Controlla se l'episodio è realmente uscito in Giappone
                    const hasAiredInJapan = japaneseAiringTime < currentTimeInJapan;

                    // Visualizza correttamente "Aired" solo se è effettivamente uscito in Giappone
                    if (hasAiredInJapan) {
                        timeDisplay.textContent = "Aired";
                    } else {
                        // Calcola countdown corretto
                        const targetTime = new Date(anime.airingDate);
                        const diff = targetTime - now;

                        const { days, hours, minutes } = window.AnilistCalendar.utils.calculateTimeComponents(diff);
                        timeDisplay.textContent = days > 0 ?
                            `${days}:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}` :
                            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                    }
                } else {
                    timeDisplay.textContent = anime.formattedTime;
                }

                // Removed day changed indicator as requested by user

                infoRow.appendChild(timeDisplay);
            }

            infoPanel.appendChild(infoRow);
            entry.appendChild(infoPanel);
        }
    } else {
        // STANDARD APPROACH: Use the normal info container for standard/compact mode
        const infoContainer = document.createElement('div');
        infoContainer.className = 'anime-info';

        const titleEl = document.createElement('div');
        titleEl.className = 'anime-title';
        titleEl.textContent = anime.cleanTitle;
        titleEl.style.textAlign = window.AnilistCalendar.userPreferences.titleAlignment || 'left';
        infoContainer.appendChild(titleEl);

        const infoRow = document.createElement('div');
        infoRow.className = 'anime-info-row';

        if (window.AnilistCalendar.userPreferences.showEpisodeNumbers) {
            const episodeNumber = document.createElement('div');
            episodeNumber.className = 'episode-number';

            // Display progress string if available, otherwise use standard format
            if (anime.episodeProgressString && anime.episodeProgressString.trim().length > 0) {
                episodeNumber.textContent = 'Ep ' + anime.episodeProgressString;
            } else {
                episodeNumber.textContent = 'Ep ' + anime.episodeInfo;
            }

            // If episodes behind indicator is present, show it BEFORE episode text
            if (anime.episodesBehind > 0) {
                const behindIndicator = document.createElement('span');
                behindIndicator.className = 'behind-indicator';
                behindIndicator.title = `${anime.episodesBehind} episode(s) behind`;
                episodeNumber.prepend(behindIndicator); // Place at the beginning
            }

            infoRow.appendChild(episodeNumber);
        }

        if (window.AnilistCalendar.userPreferences.showTime) {
            const timeDisplay = document.createElement('div');
            timeDisplay.className = 'anime-time';

            if (window.AnilistCalendar.userPreferences.timeFormat === 'countdown') {
                timeDisplay.classList.add('countdown-mode');
                const now = new Date();

                // Correggi il problema del timezone per il countdown
                // Invece di usare direttamente airingDate, calcoliamo se l'episodio è effettivamente uscito
                // basandoci sull'orario originale giapponese

                // Converti l'orario attuale nel fuso orario giapponese (UTC+9)
                const currentTimeInJapan = new Date();
                // Calcola la differenza tra il fuso locale e UTC
                const localUTCOffset = currentTimeInJapan.getTimezoneOffset() * -1 / 60;
                // Calcola la differenza in ore tra il fuso locale e il Giappone (UTC+9)
                const offsetFromJapan = localUTCOffset - 9;
                // Aggiungi l'offset per ottenere l'ora giapponese
                currentTimeInJapan.setHours(currentTimeInJapan.getHours() - offsetFromJapan);

                // Usa l'airingTime originale (prima dell'aggiustamento timezone)
                const originalAiringTime = new Date(anime.airingDate.getTime());
                // Rimuovi l'aggiustamento del timezone applicato in precedenza
                const userTimezoneOffset = window.AnilistCalendar.settings.getSelectedTimezoneOffset();
                const japanOffset = window.AnilistCalendar.JAPAN_TIMEZONE_OFFSET;
                const offsetDiff = userTimezoneOffset - japanOffset;
                const japaneseAiringTime = new Date(originalAiringTime.getTime() - (offsetDiff * 60 * 60 * 1000));

                // Controlla se l'episodio è realmente uscito in Giappone
                const hasAiredInJapan = japaneseAiringTime < currentTimeInJapan;

                // Visualizza correttamente "Aired" solo se è effettivamente uscito in Giappone
                if (hasAiredInJapan) {
                    timeDisplay.textContent = "Aired";
                } else {
                    // Calcola countdown corretto
                    const targetTime = new Date(anime.airingDate);
                    const diff = targetTime - now;

                    const { days, hours, minutes } = window.AnilistCalendar.utils.calculateTimeComponents(diff);
                    timeDisplay.textContent = days > 0 ?
                        `${days}:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}` :
                        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                }
            } else {
                timeDisplay.textContent = anime.formattedTime;
            }

            // Removed day changed indicator as requested by user

            infoRow.appendChild(timeDisplay);
        }

        infoContainer.appendChild(infoRow);
        entry.appendChild(infoContainer);
    }

    container.appendChild(entry);
};

/**
 * Parses episode information from raw title
 * and alternative elements in the card.
 *
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
        // Extract "episodes behind"
        const behindMatch = title.match(/(\d+)\s+episodes?\s+behind\s+/i);
        if (behindMatch) {
            episodeInfo.episodesBehind = parseInt(behindMatch[1]);
            title = title.replace(/\d+\s+episodes?\s+behind\s+/i, '');
        }
        // Parse in "Progress: x/y" format
        const progressMatch = title.match(/Progress:\s*(\d+)\s*\/\s*(\d+)/i);
        if (progressMatch) {
            episodeInfo.watched = parseInt(progressMatch[1]);
            episodeInfo.total = parseInt(progressMatch[2]);
            episodeInfo.hasProgressInfo = true;
            title = title.replace(/Progress:\s*\d+\s*\/\s*\d+/i, '');
        }
        // Alternatively, just "Progress: x"
        const singleProgressMatch = title.match(/Progress:\s*(\d+)\s*(?!\/)/) ||
            title.match(/Progress:\s*(\d+)\s*$/) ||
            title.match(/Progress:\s*(\d+)\b/);
        if (singleProgressMatch) {
            episodeInfo.watched = parseInt(singleProgressMatch[1]);
            episodeInfo.hasProgressInfo = true;
            title = title.replace(/Progress:\s*\d+\s*(?!\/)/, '').trim();
        }
        // Check alternative elements in the card (priority: .info or .plus-progress.mobile)
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
        // If present, extract "episodes behind" from header
        const infoHeader = card.querySelector('.info-header');
        if (infoHeader && !episodeInfo.episodesBehind) {
            const behindText = infoHeader.textContent.trim();
            const behindMatchAlt = behindText.match(/(\d+)\s+episodes?\s+behind/i);
            if (behindMatchAlt) {
                episodeInfo.episodesBehind = parseInt(behindMatchAlt[1]);
            }
        }
        // Calculate available episodes
        episodeInfo.available = episodeInfo.episodesBehind > 0 ?
            episodeInfo.watched + episodeInfo.episodesBehind :
            episodeInfo.watched;
        // Handle countdown (if present)
        const countdownEl = card.querySelector('.countdown');
        if (countdownEl) {
            episodeInfo.isUpcoming = true;
            if (episodeInfo.episodesBehind === 0) {
                episodeInfo.available = episodeInfo.watched + 1;
            }
            episodeInfo.countdownText = `Ep ${episodeInfo.available}`;
        }
        // Clean title: remove episode-related prefixes
        title = title.replace(/^\s*Ep\s+\d+\+?\s*/i, '')
            .replace(/^\s*Episode\s+\d+\+?\s*/i, '')
            .replace(/\s+\+\s*$/, '')
            .trim();
        episodeInfo.cleanTitle = title;
        // Format string for display: e.g. "x/y" or "x/y/z"
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
    // Get the original plus button if saved previously
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
                // If present, remove any "behind" indicators
                const behindIndicator = episodeNumber.querySelector('.behind-indicator');
                if (behindIndicator) {
                    behindIndicator.remove();
                }
                episodeNumber.textContent = newText;
            }
        }
        // Update data stored in the dataset attribute
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
    // If internal data structure exists, update it accordingly
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
 * Renders the calendar with the schedule data
 * @param {Object} schedule - The processed weekly schedule
 * @param {boolean} skipHeader - Whether to skip rendering the header
 */
window.AnilistCalendar.calendar.renderCalendar = function(schedule, skipHeader = false) {
    if (!window.AnilistCalendar.state.calendarContainer) return;

    window.AnilistCalendar.utils.log("Rendering calendar");

    // Clear previous content
    window.AnilistCalendar.state.calendarContainer.innerHTML = '';

    const today = new Date();
    const currentDayIndex = today.getDay();
    const currentDayName = window.AnilistCalendar.DAYS_OF_WEEK[currentDayIndex];

    // Determine the order of days to display
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

    // Optionally hide empty days
    if (window.AnilistCalendar.userPreferences.hideEmptyDays) {
        orderedDays = orderedDays.filter(day => schedule[day] && schedule[day].length > 0);
        if (orderedDays.length === 0) orderedDays = [currentDayName];

        // Update day count class
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

    // Apply column justification class
    window.AnilistCalendar.state.calendarContainer.classList.remove(
        'column-justify-top', 'column-justify-center'
    );
    const columnJustify = window.AnilistCalendar.userPreferences.columnJustify || 'top';
    window.AnilistCalendar.state.calendarContainer.classList.add(`column-justify-${columnJustify}`);

    // Apply layout mode class
    window.AnilistCalendar.state.calendarContainer.classList.remove(
        'standard-mode', 'compact-mode', 'extended-mode', 'gallery-with-slider'
    );
    window.AnilistCalendar.state.calendarContainer.classList.add(`${window.AnilistCalendar.userPreferences.layoutMode}-mode`);

    // If using gallery mode with max cards limit, add the slider class
    if ((window.AnilistCalendar.userPreferences.layoutMode === 'extended' ||
            window.AnilistCalendar.userPreferences.layoutMode === 'grid') &&
        window.AnilistCalendar.userPreferences.maxCardsPerDay > 0) {
        window.AnilistCalendar.state.calendarContainer.classList.add('gallery-with-slider');
    }

    // Optional header
    if (!skipHeader) {
        const headerContainer = document.createElement('div');
        headerContainer.className = 'calendar-header';

        const calendarTitle = document.createElement('h3');
        calendarTitle.className = 'calendar-title';
        calendarTitle.innerHTML = `Weekly Schedule <span class="timezone-separator">|</span> <span class="timezone-info">${window.AnilistCalendar.settings.getTimezoneName()}</span>`;

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

    // Create grid container
    const calendarGrid = document.createElement('div');
    calendarGrid.className = 'anilist-calendar-grid';

    // Importante: SEMPRE mantenere il display grid per preservare il layout a tabella
    calendarGrid.style.display = 'grid';

    // Limit to maximum of 7 days
    const daysToShow = orderedDays.slice(0, 7);

    // Verifica se siamo in modalità gallery
    const isGalleryMode = window.AnilistCalendar.userPreferences.layoutMode === 'extended' ||
        window.AnilistCalendar.userPreferences.layoutMode === 'grid';

    // Create day columns
    daysToShow.forEach((day, index) => {
        const dayCol = document.createElement('div');
        dayCol.id = `calendar-day-${day.toLowerCase()}`;

        // Add classes to properly style current day
        const classes = ['anilist-calendar-day'];
        if (day === currentDayName) {
            classes.push('current-day');
        }

        // Add class for "Today" column when it's the first one
        if (window.AnilistCalendar.userPreferences.startDay === 'today' && index === 0) {
            classes.push('today-column');
        }

        dayCol.className = classes.join(' ');

        // Apply column justification based on user preference
        const columnJustify = window.AnilistCalendar.userPreferences.columnJustify || 'top';

        // Crea un elemento di stile per forzare la giustificazione
        const styleForce = document.createElement('style');
        styleForce.id = `force-column-justify-${dayCol.id}`;
        styleForce.innerHTML = `
            .anilist-calendar-day#${dayCol.id}.${columnJustify === 'center' ? 'force-center' : 'force-top'} {
                display: flex !important;
                flex-direction: column !important;
                justify-content: ${columnJustify === 'center' ? 'center' : 'flex-start'} !important;
            }
        `;
        document.head.appendChild(styleForce);

        // Assegna la classe forzata appropriata alla colonna
        dayCol.classList.add(columnJustify === 'center' ? 'force-center' : 'force-top');

        // Imposta gli stili inline come ultima risorsa
        dayCol.style.cssText = `
            display: flex !important;
            flex-direction: column !important;
            justify-content: ${columnJustify === 'center' ? 'center' : 'flex-start'} !important;
            align-items: stretch !important;
        `;

        // Create day header
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';

        // Calculate the current date of the weekday
        const currentDate = new Date();
        const todayIndex = currentDate.getDay();
        const dayIndex = window.AnilistCalendar.DAYS_OF_WEEK.indexOf(day);
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
      <span class="abbreviated-day" style="display:none">${window.AnilistCalendar.ABBREVIATED_DAYS[window.AnilistCalendar.DAYS_OF_WEEK.indexOf(day)]}</span>
    `;
        dayCol.appendChild(dayHeader);

        // Create anime list for this day with proper justification in gallery mode
        const animeList = document.createElement('div');
        animeList.className = 'day-anime-list';

        // Force height to 100% to ensure vertical alignment works
        animeList.style.height = '100%';

        // Apply specific styles for gallery mode days
        if (isGalleryMode) {
            animeList.style.padding = '14px';
            animeList.style.display = 'flex';
            animeList.style.flexDirection = 'column'; // Ensure column direction
            animeList.style.gap = '14px';

            // Horizontal alignment
            animeList.style.alignItems = 'center'; // Center items horizontally

            // Vertical alignment based on preference
            animeList.style.justifyContent = columnJustify === 'center' ? 'center' : 'flex-start';
        }

        if (schedule[day] && schedule[day].length > 0) {
            // Create entries for each anime
            schedule[day].forEach(anime => {
                window.AnilistCalendar.calendar.createAnimeEntry(animeList, anime);
            });

            // Setup slider for gallery mode if needed
            if (isGalleryMode && window.AnilistCalendar.userPreferences.maxCardsPerDay > 0) {
                window.AnilistCalendar.calendar.setupGallerySlider(
                    dayCol,
                    animeList,
                    window.AnilistCalendar.userPreferences.maxCardsPerDay
                );
            }
        } else {
            // Create container for "No episodes" for proper positioning
            const emptyDay = document.createElement('div');
            emptyDay.className = 'empty-day';
            emptyDay.textContent = 'No episodes';

            // Adatta lo stile per gallery mode
            if (isGalleryMode) {
                emptyDay.style.width = 'auto';
                emptyDay.style.height = 'auto';
                emptyDay.style.padding = '10px';
                emptyDay.style.margin = '0';
                emptyDay.style.textAlign = 'center';
            }

            animeList.appendChild(emptyDay);
        }

        dayCol.appendChild(animeList);
        calendarGrid.appendChild(dayCol);
    });

    window.AnilistCalendar.state.calendarContainer.appendChild(calendarGrid);
    window.AnilistCalendar.utils.log("Calendar rendered");

    // Force theme application after rendering
    if (window.AnilistCalendar.applyTheme) {
        window.AnilistCalendar.applyTheme();
    }
};

/**
 * Updates UI directly after saving settings without page refresh
 * @param {string} prevTimeFormat - Previous time format setting
 * @param {string} prevTimezone - Previous timezone setting
 * @param {string} prevTitleAlignment - Previous title alignment setting
 * @param {string} prevColumnJustify - Previous column justification setting
 */
window.AnilistCalendar.calendar.updateUIWithSettings = function(prevTimeFormat, prevTimezone, prevTitleAlignment, prevColumnJustify) {
    // Update calendar container classes
    if (window.AnilistCalendar.state.calendarContainer) {
        // Update layout mode and title alignment
        window.AnilistCalendar.state.calendarContainer.className = 'anilist-weekly-calendar';
        window.AnilistCalendar.state.calendarContainer.classList.add(`${window.AnilistCalendar.userPreferences.layoutMode}-mode`);
        window.AnilistCalendar.state.calendarContainer.classList.add(`title-${window.AnilistCalendar.userPreferences.titleAlignment}`);

        // Update column justification
        const columnJustify = window.AnilistCalendar.userPreferences.columnJustify || 'top';
        window.AnilistCalendar.state.calendarContainer.classList.add(`column-justify-${columnJustify}`);

        // Add gallery slider class if needed
        if ((window.AnilistCalendar.userPreferences.layoutMode === 'extended' ||
                window.AnilistCalendar.userPreferences.layoutMode === 'grid') &&
            window.AnilistCalendar.userPreferences.maxCardsPerDay > 0) {
            window.AnilistCalendar.state.calendarContainer.classList.add('gallery-with-slider');
        }

        // If title alignment changed, update all titles
        if (prevTitleAlignment !== window.AnilistCalendar.userPreferences.titleAlignment) {
            const titles = window.AnilistCalendar.state.calendarContainer.querySelectorAll('.anime-title');
            titles.forEach(title => {
                title.style.textAlign = window.AnilistCalendar.userPreferences.titleAlignment;
            });
        }

        // If column justification changed, update the day columns
        if (prevColumnJustify !== columnJustify) {
            const dayColumns = window.AnilistCalendar.state.calendarContainer.querySelectorAll('.anilist-calendar-day');
            dayColumns.forEach(column => {
                // Remove old classes
                column.classList.remove('force-center', 'force-top');
                // Add new class
                column.classList.add(columnJustify === 'center' ? 'force-center' : 'force-top');
                // Update inline style
                column.style.cssText = `
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: ${columnJustify === 'center' ? 'center' : 'flex-start'} !important;
                    align-items: stretch !important;
                `;
            });
        }

        // Re-render calendar with new settings
        window.AnilistCalendar.calendar.renderCalendar(window.AnilistCalendar.state.weeklySchedule, true);

        // Update timezone info displayed in header
        const timezoneInfo = document.querySelector('.timezone-info');
        if (timezoneInfo) {
            timezoneInfo.textContent = window.AnilistCalendar.settings.getTimezoneName();
        }

        // Handle countdown timer changes
        if (prevTimeFormat !== window.AnilistCalendar.userPreferences.timeFormat) {
            if (window.AnilistCalendar.userPreferences.timeFormat === 'countdown') {
                window.AnilistCalendar.calendar.startCountdownTimer();
            } else if (window.AnilistCalendar.state.countdownInterval) {
                clearInterval(window.AnilistCalendar.state.countdownInterval);
                window.AnilistCalendar.state.countdownInterval = null;
            }
        }

        // FIX: Only refresh page if absolutely necessary for timezone change
        // This now checks if the timezone change would significantly affect the day calculations
        if (prevTimezone !== window.AnilistCalendar.userPreferences.timezone) {
            const oldOffset = getTimezoneOffset(prevTimezone);
            const newOffset = getTimezoneOffset(window.AnilistCalendar.userPreferences.timezone);

            // Only refresh if crossing day boundaries
            if (Math.abs(oldOffset - newOffset) >= 12) {
                window.AnilistCalendar.utils.showNotification('Timezone changed! Refreshing page...', 'loading');
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                // Otherwise just recalculate times and re-render
                window.AnilistCalendar.utils.showNotification('Timezone updated!', 'success');
                window.AnilistCalendar.calendar.renderCalendar(window.AnilistCalendar.state.weeklySchedule, true);
            }
        }
    }

    // Helper function to get timezone offset
    function getTimezoneOffset(timezoneValue) {
        if (timezoneValue === 'auto') {
            return window.AnilistCalendar.utils.getBrowserTimezoneOffset();
        }
        const timezone = window.AnilistCalendar.TIMEZONE_OPTIONS.find(tz => tz.value === timezoneValue);
        return timezone ? timezone.offset : window.AnilistCalendar.JAPAN_TIMEZONE_OFFSET;
    }
};

/**
 * Updates the countdowns in real-time
 */
window.AnilistCalendar.calendar.startCountdownTimer = function() {
    // Clear any existing interval
    if (window.AnilistCalendar.state.countdownInterval) {
        clearInterval(window.AnilistCalendar.state.countdownInterval);
    }

    // Set up a new interval to update countdowns every second
    window.AnilistCalendar.state.countdownInterval = setInterval(() => {
        // Only update if countdown mode is enabled
        if (window.AnilistCalendar.userPreferences.timeFormat !== 'countdown') return;

        // Find all countdown elements
        const countdownElements = document.querySelectorAll('.anime-time.countdown-mode');

        if (countdownElements.length === 0) return;

        // Get current time for reference
        const now = new Date();

        // Get current time in Japan for aired check
        const currentTimeInJapan = new Date();
        // Calcola la differenza tra il fuso locale e UTC
        const localUTCOffset = currentTimeInJapan.getTimezoneOffset() * -1 / 60;
        // Calcola la differenza in ore tra il fuso locale e il Giappone (UTC+9)
        const offsetFromJapan = localUTCOffset - 9;
        // Aggiungi l'offset per ottenere l'ora giapponese
        currentTimeInJapan.setHours(currentTimeInJapan.getHours() - offsetFromJapan);

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
            for (const day in window.AnilistCalendar.state.weeklySchedule) {
                const match = window.AnilistCalendar.state.weeklySchedule[day].find(anime => anime.id === animeId);
                if (match) {
                    animeData = match;
                    break;
                }
            }

            if (!animeData) return;

            // Get the original airing time in Japan
            const originalAiringTime = new Date(animeData.airingDate.getTime());
            // Rimuovi l'aggiustamento del timezone applicato in precedenza
            const userTimezoneOffset = window.AnilistCalendar.settings.getSelectedTimezoneOffset();
            const japanOffset = window.AnilistCalendar.JAPAN_TIMEZONE_OFFSET;
            const offsetDiff = userTimezoneOffset - japanOffset;
            const japaneseAiringTime = new Date(originalAiringTime.getTime() - (offsetDiff * 60 * 60 * 1000));

            // Check if the episode has already aired in Japan
            const hasAiredInJapan = japaneseAiringTime < currentTimeInJapan;

            if (hasAiredInJapan) {
                // Episode has aired in Japan
                element.textContent = "Aired";
                return;
            }

            // Calculate remaining time
            const targetTime = new Date(animeData.airingDate);
            const diff = targetTime - now;

            // Calculate days, hours, minutes, seconds
            const {days, hours, minutes} = window.AnilistCalendar.utils.calculateTimeComponents(diff);

            // Update the text
            if (days > 0) {
                element.textContent = `${days}:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            } else {
                // Don't show seconds, only hours and minutes
                element.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            }
        });
    }, 1000);
};

window.AnilistCalendar.calendar.calculateTimeComponents = function(diff) {
    return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    };
};

/**
 * Sets up slider for gallery mode when card count exceeds limit
 * @param {HTMLElement} dayContainer - The day column container
 * @param {HTMLElement} animeList - The container with anime entries
 * @param {number} maxCards - Maximum number of cards to show
 */
window.AnilistCalendar.calendar.setupGallerySlider = function(dayContainer, animeList, maxCards) {
    // Se non è specificato un limite o è 0, non fare nulla
    if (!maxCards || maxCards <= 0 || !animeList || animeList.children.length <= maxCards) return;

    // Numero di card totali
    const totalCards = animeList.children.length;

    // Calcola il numero di pagine
    const totalPages = Math.ceil(totalCards / maxCards);

    // Salva l'allineamento originale
    const originalJustify = animeList.style.justifyContent || 'flex-start';

    // Raccogli tutte le card originali in un array
    const cards = Array.from(animeList.children);

    // Svuota l'animeList ma mantieni le proprietà di stile
    animeList.innerHTML = '';

    // Ottieni la preferenza di giustificazione dell'utente
    const columnJustify = window.AnilistCalendar.userPreferences.columnJustify || 'top';

    // Creiamo un container per le pagine che eredita l'allineamento
    const pagesContainer = document.createElement('div');
    pagesContainer.className = 'gallery-pages-container';
    pagesContainer.style.width = '100%';
    pagesContainer.style.height = '100%';
    pagesContainer.style.display = 'flex';
    pagesContainer.style.flexDirection = 'column';
    pagesContainer.style.alignItems = 'center';
    pagesContainer.style.justifyContent = originalJustify; // Mantiene l'allineamento verticale

    // Creiamo una pagina per ogni gruppo di card
    for (let i = 0; i < totalPages; i++) {
        const page = document.createElement('div');
        page.className = 'gallery-page';
        page.style.display = i === 0 ? 'flex' : 'none';
        page.style.flexDirection = 'column';
        page.style.alignItems = 'center';
        page.style.gap = '14px';
        page.style.width = '100%';
        page.style.justifyContent = originalJustify; // Stesso allineamento verticale

        // Aggiungi le card per questa pagina
        const startIdx = i * maxCards;
        const endIdx = Math.min(startIdx + maxCards, totalCards);

        for (let j = startIdx; j < endIdx; j++) {
            page.appendChild(cards[j]);
        }

        pagesContainer.appendChild(page);
    }

    animeList.appendChild(pagesContainer);

    // Aggiungi le frecce di navigazione se ci sono più pagine
    if (totalPages > 1) {
        // Stato corrente
        let currentPage = 0;

        // Crea pulsanti di navigazione
        const prevButton = document.createElement('button');
        prevButton.className = 'gallery-nav-button gallery-nav-prev';
        prevButton.innerHTML = '<i class="fa fa-chevron-up"></i>';
        prevButton.style.display = 'none';
        prevButton.style.position = 'absolute';
        prevButton.style.right = '6px';
        prevButton.style.zIndex = '100';

        const nextButton = document.createElement('button');
        nextButton.className = 'gallery-nav-button gallery-nav-next';
        nextButton.innerHTML = '<i class="fa fa-chevron-down"></i>';
        nextButton.style.position = 'absolute';
        nextButton.style.right = '6px';
        nextButton.style.zIndex = '100';

        // Funzione per aggiornare la visualizzazione
        const updateView = () => {
            const pages = pagesContainer.querySelectorAll('.gallery-page');
            pages.forEach(page => {
                page.style.display = 'none';
            });
            pages[currentPage].style.display = 'flex';
            prevButton.style.display = currentPage === 0 ? 'none' : 'flex';
            nextButton.style.display = currentPage === totalPages - 1 ? 'none' : 'flex';
        };

        // Handler per i pulsanti
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

        // Aggiungi i pulsanti all'animeList mantenendo il posizionamento relativo
        animeList.style.position = 'relative';
        animeList.appendChild(prevButton);
        animeList.appendChild(nextButton);
    }
};