/**
 * Anilist Weekly Schedule - Calendar
 * Creates and manages the weekly calendar view
 */

// Helper: configura un elemento immagine applicando attributi, stili ed eventi comuni.
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

// Helper: crea il pannello informativo per l'entry dell'anime includendo numero episodio e orario/countdown.
function createAnimeInfoRow(anime) {
    const infoRow = document.createElement('div');
    infoRow.className = 'anime-info-row';

    if (window.AnilistCalendar.userPreferences.showEpisodeNumbers) {
        const episodeNumber = document.createElement('div');
        episodeNumber.className = 'episode-number';

        // Visualizza stringa di progresso se disponibile, altrimenti il formato standard.
        if (anime.episodeProgressString && anime.episodeProgressString.trim().length > 0) {
            episodeNumber.textContent = 'Ep ' + anime.episodeProgressString;
        } else {
            episodeNumber.textContent = 'Ep ' + anime.episodeInfo;
        }

        // Se presente l'indicatore degli episodi arretrati, aggiungilo all'inizio.
        if (anime.episodesBehind > 0) {
            const behindIndicator = document.createElement('span');
            behindIndicator.className = 'behind-indicator';
            behindIndicator.title = `${anime.episodesBehind} episode(s) behind`;
            episodeNumber.prepend(behindIndicator);
        }

        infoRow.appendChild(episodeNumber);
    }

    if (window.AnilistCalendar.userPreferences.showTime) {
        const timeDisplay = document.createElement('div');
        timeDisplay.className = 'anime-time';

        if (window.AnilistCalendar.userPreferences.timeFormat === 'countdown') {
            timeDisplay.classList.add('countdown-mode');
            const now = new Date();

            // Calcolo dell'orario attuale in Giappone (UTC+9)
            const currentTimeInJapan = new Date();
            const localUTCOffset = currentTimeInJapan.getTimezoneOffset() * -1 / 60;
            const offsetFromJapan = localUTCOffset - 9;
            currentTimeInJapan.setHours(currentTimeInJapan.getHours() - offsetFromJapan);

            // Calcola l'orario originale di messa in onda e corregge il fuso orario
            const originalAiringTime = new Date(anime.airingDate.getTime());
            const userTimezoneOffset = window.AnilistCalendar.settings.getSelectedTimezoneOffset();
            const japanOffset = window.AnilistCalendar.JAPAN_TIMEZONE_OFFSET;
            const offsetDiff = userTimezoneOffset - japanOffset;
            const japaneseAiringTime = new Date(originalAiringTime.getTime() - (offsetDiff * 60 * 60 * 1000));

            const hasAiredInJapan = japaneseAiringTime < currentTimeInJapan;

            if (hasAiredInJapan) {
                timeDisplay.textContent = "Aired";
            } else {
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

        infoRow.appendChild(timeDisplay);
    }

    return infoRow;
}

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

                // Adjust time to selected timezone
                const userTimezoneOffset = window.AnilistCalendar.settings.getSelectedTimezoneOffset();
                const japanOffset = window.AnilistCalendar.JAPAN_TIMEZONE_OFFSET;
                const offsetDiff = userTimezoneOffset - japanOffset;
                const adjustedAiringDate = new Date(airingDate.getTime() + (offsetDiff * 60 * 60 * 1000));

                const originalDay = window.AnilistCalendar.DAYS_OF_WEEK[airingDate.getDay()];
                const adjustedDay = window.AnilistCalendar.DAYS_OF_WEEK[adjustedAiringDate.getDay()];
                const dayChanged = originalDay !== adjustedDay;
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

        // FUNZIONE DI CARICAMENTO THUMBNAIL RIFATTORIZZATA
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

    // Creazione pannello informativo: utilizza la funzione helper per evitare duplicazioni
    if (isGalleryMode) {
        // Pannello superiore per il titolo
        const titlePanel = document.createElement('div');
        titlePanel.className = 'title-panel';

        const titleEl = document.createElement('div');
        titleEl.className = 'anime-title';
        titleEl.textContent = anime.cleanTitle;

        // In modalità gallery, il testo è sempre centrato
        titleEl.classList.add('text-center');

        titlePanel.appendChild(titleEl);
        entry.appendChild(titlePanel);

        if (window.AnilistCalendar.userPreferences.showEpisodeNumbers || window.AnilistCalendar.userPreferences.showTime) {
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

        // Applicare la classe di allineamento del titolo in base alle preferenze
        const titleAlignment = window.AnilistCalendar.userPreferences.titleAlignment || 'left';
        titleEl.classList.add(`text-${titleAlignment}`);

        infoContainer.appendChild(titleEl);

        const infoRow = createAnimeInfoRow(anime);
        infoContainer.appendChild(infoRow);
        entry.appendChild(infoContainer);
    }

    container.appendChild(entry);
};

/**
 * Parses episode information from raw title and alternative elements in the card.
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
 * Renders the calendar with the schedule data
 * @param {Object} schedule - The processed weekly schedule
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

    // Rimuovere tutte le classi di giustificazione e allineamento prima di aggiungerle nuovamente
    window.AnilistCalendar.state.calendarContainer.classList.remove(
        'column-justify-top', 'column-justify-center',
        'title-left', 'title-center'
    );

    // Applicare la classe di giustificazione delle colonne
    const columnJustify = window.AnilistCalendar.userPreferences.columnJustify || 'top';
    window.AnilistCalendar.state.calendarContainer.classList.add(`column-justify-${columnJustify}`);

    // Applicare la classe di allineamento del titolo
    const titleAlignment = window.AnilistCalendar.userPreferences.titleAlignment || 'left';
    window.AnilistCalendar.state.calendarContainer.classList.add(`title-${titleAlignment}`);

    // Rimuovere tutte le classi di modalità prima di aggiungere quella corrente
    window.AnilistCalendar.state.calendarContainer.classList.remove(
        'standard-mode', 'compact-mode', 'extended-mode', 'gallery-with-slider', 'full-width-images'
    );

    // Applicare la classe della modalità attuale
    window.AnilistCalendar.state.calendarContainer.classList.add(`${window.AnilistCalendar.userPreferences.layoutMode}-mode`);

    // Applicare full-width-images se abilitato e in modalità standard
    if (window.AnilistCalendar.userPreferences.layoutMode === 'standard' &&
        window.AnilistCalendar.userPreferences.fullWidthImages) {
        window.AnilistCalendar.state.calendarContainer.classList.add('full-width-images');
    }

    // Imposta la modalità gallery con slider solo se è attiva la modalità gallery (extended o grid)
    // e se maxCardsPerDay è maggiore di zero
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

        // Applicare forzatamente la classe di giustificazione corretta
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

        // Applicare la classe di giustificazione alla lista degli anime
        animeList.classList.add(`justify-${columnJustify}`);

        // Per le modalità gallery, aggiungere classi specifiche
        if (isGalleryMode) {
            animeList.classList.add('gallery-anime-list');
            animeList.classList.add(`justify-${columnJustify}`);
        }

        if (schedule[day] && schedule[day].length > 0) {
            schedule[day].forEach(anime => {
                window.AnilistCalendar.calendar.createAnimeEntry(animeList, anime);
            });
            if (isGalleryMode && window.AnilistCalendar.userPreferences.maxCardsPerDay > 0) {
                window.AnilistCalendar.calendar.setupGallerySlider(
                    dayCol,
                    animeList,
                    window.AnilistCalendar.userPreferences.maxCardsPerDay
                );
            }
        } else {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'empty-day';
            emptyDay.textContent = 'No episodes';
            if (isGalleryMode) {
                emptyDay.classList.add('gallery-empty-day');
            }
            animeList.appendChild(emptyDay);
        }

        dayCol.appendChild(animeList);
        calendarGrid.appendChild(dayCol);
    });

    window.AnilistCalendar.state.calendarContainer.appendChild(calendarGrid);
    window.AnilistCalendar.utils.log("Calendar rendered");

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
 * @param {boolean} prevFullWidthImages - Previous full width images setting
 */
window.AnilistCalendar.calendar.updateUIWithSettings = function(prevTimeFormat, prevTimezone, prevTitleAlignment, prevColumnJustify, prevFullWidthImages) {
    if (window.AnilistCalendar.state.calendarContainer) {
        // Rimuovere tutte le classi di modalità, allineamento e giustificazione
        window.AnilistCalendar.state.calendarContainer.classList.remove(
            'standard-mode', 'compact-mode', 'extended-mode', 'fan-mode',
            'gallery-with-slider', 'full-width-images',
            'title-left', 'title-center',
            'column-justify-top', 'column-justify-center'
        );

        // Aggiungere la classe della modalità di layout
        window.AnilistCalendar.state.calendarContainer.classList.add(`${window.AnilistCalendar.userPreferences.layoutMode}-mode`);

        // Aggiungere la classe di allineamento del titolo
        const titleAlignment = window.AnilistCalendar.userPreferences.titleAlignment || 'left';
        window.AnilistCalendar.state.calendarContainer.classList.add(`title-${titleAlignment}`);

        // Aggiungere la classe di giustificazione delle colonne
        const columnJustify = window.AnilistCalendar.userPreferences.columnJustify || 'top';
        window.AnilistCalendar.state.calendarContainer.classList.add(`column-justify-${columnJustify}`);

        // Aggiungere classe per gallery in slider se necessario
        const isGalleryMode = window.AnilistCalendar.userPreferences.layoutMode === 'extended' ||
            window.AnilistCalendar.userPreferences.layoutMode === 'fan';

        if (isGalleryMode && window.AnilistCalendar.userPreferences.maxCardsPerDay > 0) {
            window.AnilistCalendar.state.calendarContainer.classList.add('gallery-with-slider');
        }

        // Aggiungere classe full-width-images se abilitato e in modalità standard
        if (window.AnilistCalendar.userPreferences.layoutMode === 'standard' &&
            window.AnilistCalendar.userPreferences.fullWidthImages) {
            window.AnilistCalendar.state.calendarContainer.classList.add('full-width-images');
        }

        // Aggiornare allineamento del titolo se cambiato
        if (prevTitleAlignment !== titleAlignment) {
            const titles = window.AnilistCalendar.state.calendarContainer.querySelectorAll('.anime-title');
            titles.forEach(title => {
                // Rimuovere tutte le possibili classi di allineamento per evitare conflitti
                title.classList.remove('text-left', 'text-center');
                // Aggiungere la nuova classe di allineamento
                title.classList.add(`text-${titleAlignment}`);
            });
        }

        // Aggiornare giustificazione delle colonne se cambiata
        if (prevColumnJustify !== columnJustify) {
            const dayColumns = window.AnilistCalendar.state.calendarContainer.querySelectorAll('.anilist-calendar-day');
            dayColumns.forEach(column => {
                // Rimuovere tutte le possibili classi per evitare conflitti
                column.classList.remove('force-center', 'force-top');
                // Aggiungere la nuova classe di giustificazione
                column.classList.add(columnJustify === 'center' ? 'force-center' : 'force-top');
            });

            const animeLists = window.AnilistCalendar.state.calendarContainer.querySelectorAll('.day-anime-list');
            animeLists.forEach(list => {
                // Rimuovere tutte le possibili classi per evitare conflitti
                list.classList.remove('justify-top', 'justify-center');
                // Aggiungere la nuova classe di giustificazione
                list.classList.add(`justify-${columnJustify}`);
            });
        }

        // Aggiornare full-width-images se cambiato e in modalità standard
        if (window.AnilistCalendar.userPreferences.layoutMode === 'standard' &&
            prevFullWidthImages !== window.AnilistCalendar.userPreferences.fullWidthImages) {

            if (window.AnilistCalendar.userPreferences.fullWidthImages) {
                window.AnilistCalendar.state.calendarContainer.classList.add('full-width-images');
            } else {
                window.AnilistCalendar.state.calendarContainer.classList.remove('full-width-images');
            }
        }

        // Update timezone info
        const timezoneInfo = document.querySelector('.timezone-info');
        if (timezoneInfo) {
            timezoneInfo.textContent = window.AnilistCalendar.settings.getTimezoneName();
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

        // Handle timezone changes
        if (prevTimezone !== window.AnilistCalendar.userPreferences.timezone) {
            const oldOffset = getTimezoneOffset(prevTimezone);
            const newOffset = getTimezoneOffset(window.AnilistCalendar.userPreferences.timezone);

            if (Math.abs(oldOffset - newOffset) >= 12) {
                window.AnilistCalendar.utils.showNotification('Timezone changed! Refreshing page...', 'loading');
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                window.AnilistCalendar.utils.showNotification('Timezone updated!', 'success');
                window.AnilistCalendar.calendar.renderCalendar(window.AnilistCalendar.state.weeklySchedule, true);
            }
        }
    }

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
    if (window.AnilistCalendar.state.countdownInterval) {
        clearInterval(window.AnilistCalendar.state.countdownInterval);
    }
    window.AnilistCalendar.state.countdownInterval = setInterval(() => {
        if (window.AnilistCalendar.userPreferences.timeFormat !== 'countdown') return;
        const countdownElements = document.querySelectorAll('.anime-time.countdown-mode');
        if (countdownElements.length === 0) return;
        const now = new Date();
        const currentTimeInJapan = new Date();
        const localUTCOffset = currentTimeInJapan.getTimezoneOffset() * -1 / 60;
        const offsetFromJapan = localUTCOffset - 9;
        currentTimeInJapan.setHours(currentTimeInJapan.getHours() - offsetFromJapan);

        countdownElements.forEach(element => {
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

            const originalAiringTime = new Date(animeData.airingDate.getTime());
            const userTimezoneOffset = window.AnilistCalendar.settings.getSelectedTimezoneOffset();
            const japanOffset = window.AnilistCalendar.JAPAN_TIMEZONE_OFFSET;
            const offsetDiff = userTimezoneOffset - japanOffset;
            const japaneseAiringTime = new Date(originalAiringTime.getTime() - (offsetDiff * 60 * 60 * 1000));
            const hasAiredInJapan = japaneseAiringTime < currentTimeInJapan;

            if (hasAiredInJapan) {
                element.textContent = "Aired";
                return;
            }

            const targetTime = new Date(animeData.airingDate);
            const diff = targetTime - now;
            const {days, hours, minutes} = window.AnilistCalendar.utils.calculateTimeComponents(diff);

            if (days > 0) {
                element.textContent = `${days}:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            } else {
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
    // Verifica i parametri e che ci siano abbastanza card per richiedere lo slider
    if (!maxCards || maxCards <= 0 || !animeList) return;

    // Ottieni tutte le card anime originali
    const cards = Array.from(animeList.querySelectorAll('.anime-entry'));
    const totalCards = cards.length;

    // Se non ci sono abbastanza card per richiedere paginazione, esci
    if (totalCards <= maxCards) return;

    // Salva lo stile di giustificazione originale
    const originalJustify = animeList.classList.contains('justify-center') ? 'center' : 'top';

    // Pulisci il contenitore prima di aggiungere le pagine
    animeList.innerHTML = '';

    // Crea il contenitore principale per lo slider
    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'gallery-slider-wrapper';
    sliderContainer.classList.add(`justify-${originalJustify}`);

    // Crea il contenitore per le pagine
    const pagesContainer = document.createElement('div');
    pagesContainer.className = 'gallery-pages-container';
    pagesContainer.classList.add(`justify-${originalJustify}`);

    // Calcola il numero totale di pagine necessarie
    const totalPages = Math.ceil(totalCards / maxCards);

    // Log per debug
    window.AnilistCalendar.utils.log(`Setting up gallery slider: ${totalCards} cards, ${maxCards} per page = ${totalPages} pages`);

    // Crea le pagine e distribuisci le card
    for (let i = 0; i < totalPages; i++) {
        // Crea il container della pagina
        const page = document.createElement('div');
        page.className = 'gallery-page';
        page.classList.add(`justify-${originalJustify}`);
        page.dataset.page = i.toString(); // Converti esplicitamente in stringa
        page.dataset.justification = originalJustify;

        // Mostra solo la prima pagina inizialmente
        if (i !== 0) {
            page.classList.add('hidden-page');
        }

        // Calcola gli indici delle card da inserire in questa pagina
        const startIdx = i * maxCards;
        const endIdx = Math.min(startIdx + maxCards, totalCards);

        // Aggiungi le card a questa pagina
        for (let j = startIdx; j < endIdx; j++) {
            if (cards[j]) {
                page.appendChild(cards[j]);
            }
        }

        // Aggiungi la pagina al container
        pagesContainer.appendChild(page);
    }

    // Aggiungi il container delle pagine al contenitore principale
    sliderContainer.appendChild(pagesContainer);
    animeList.appendChild(sliderContainer);

    // Se ci sono più pagine, aggiungi i controlli di navigazione
    if (totalPages > 1) {
        let currentPage = 0;

        // Crea il pulsante "precedente"
        const prevButton = document.createElement('button');
        prevButton.className = 'gallery-nav-button gallery-nav-prev';
        prevButton.innerHTML = '<i class="fa fa-chevron-up"></i>';
        prevButton.setAttribute('aria-label', 'Previous page');
        prevButton.classList.add('nav-hidden'); // Nascondi inizialmente perché siamo alla prima pagina

        // Crea il pulsante "successivo"
        const nextButton = document.createElement('button');
        nextButton.className = 'gallery-nav-button gallery-nav-next';
        nextButton.innerHTML = '<i class="fa fa-chevron-down"></i>';
        nextButton.setAttribute('aria-label', 'Next page');

        // Funzione per aggiornare la visualizzazione delle pagine
        const updateView = () => {
            // Aggiorna tutte le pagine
            const pages = pagesContainer.querySelectorAll('.gallery-page');
            pages.forEach((page, idx) => {
                if (idx === currentPage) {
                    page.classList.remove('hidden-page');
                } else {
                    page.classList.add('hidden-page');
                }
            });

            // Aggiorna i pulsanti di navigazione
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

        // Gestisci gli eventi di click per i pulsanti
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

        // Aggiungi la classe per lo styling e i pulsanti
        animeList.classList.add('gallery-with-nav');
        animeList.appendChild(prevButton);
        animeList.appendChild(nextButton);

        // Assicurati che la visualizzazione iniziale sia corretta
        updateView();

        // Riattacca event listener per i plus button nelle card
        const reattachEvents = () => {
            const allPlusButtons = animeList.querySelectorAll('.plus-button, .plus-icon');
            allPlusButtons.forEach(button => {
                const animeEntry = button.closest('.anime-entry');
                if (animeEntry && animeEntry.dataset.animeData) {
                    try {
                        const animeData = JSON.parse(animeEntry.dataset.animeData);

                        // Rimuovi gli event listener esistenti
                        const newButton = button.cloneNode(true);
                        button.parentNode.replaceChild(newButton, button);

                        // Aggiungi il nuovo event listener
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

        // Riattacca gli event listener
        reattachEvents();
    }
};