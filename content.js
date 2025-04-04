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
const DEBUG = true; // Set to true for debugging
const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ABBREVIATED_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Global variables
let weeklySchedule = {};
let isCalendarInitialized = false;
let calendarContainer = null;

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
 * Main initialization function
 */
function initialize() {
  log("Initializing extension");

  try {
    // Look for the Airing section
    findAndReplaceAiringSection();

    // Set up observer for future DOM changes
    setupObserver();

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
 * Finds and replaces the Airing section
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
      // Find the container
      const container = findAiringContainer(element);
      if (container) {
        replaceAiringSection(container, element);
        return true;
      }
    }

    // Second try: look for section headers
    const sectionHeaders = document.querySelectorAll('.section-header');
    for (const header of sectionHeaders) {
      if (header.textContent.trim() === 'Airing') {
        const container = findAiringContainer(header);
        if (container) {
          replaceAiringSection(container, header);
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
function replaceAiringSection(container, headerElement) {
  try {
    log("Replacing Airing section", container);

    // First extract the data from the existing cards
    const animeData = extractAnimeDataFromDOM(container);

    if (!animeData || animeData.length === 0) {
      log("No anime data found in the Airing section");
      return false;
    }

    // Create calendar container
    calendarContainer = document.createElement('div');
    calendarContainer.className = 'anilist-weekly-calendar';

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

    // Process data and render calendar
    const schedule = processAnimeData(animeData);
    renderCalendar(schedule);

    isCalendarInitialized = true;
    return true;
  } catch (err) {
    log("Error replacing section", err);
    return false;
  }
}

/**
 * Extracts anime data directly from the DOM
 */
function extractAnimeDataFromDOM(container) {
  try {
    log("Extracting anime data from DOM");

    // Find all anime cards in the container
    const animeCards = container.querySelectorAll('.media-preview-card');

    log(`Found ${animeCards.length} anime cards`);

    const animeData = [];

    // Process each card
    animeCards.forEach(card => {
      try {
        // Get anime ID from the URL
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

        // Calculate airing time based on countdown
        const airingDate = calculateAiringDate(days, hours, minutes);

        animeData.push({
          id: animeId,
          title: title,
          coverImage: coverImage,
          airingDate: airingDate,
          formattedTime: formatTime(airingDate),
          days: days,
          hours: hours,
          minutes: minutes,
          color: color,
          episode: getEpisodeNumber(card) || "Next"
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
 * Calculates airing date based on countdown
 */
function calculateAiringDate(days, hours, minutes) {
  const now = new Date();
  const airingDate = new Date(now);

  airingDate.setDate(now.getDate() + days);
  airingDate.setHours(now.getHours() + hours);
  airingDate.setMinutes(now.getMinutes() + minutes);

  return airingDate;
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
 * Process anime data into weekly schedule
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
    const dayOfWeek = DAYS_OF_WEEK[anime.airingDate.getDay()];

    // Add to corresponding day
    schedule[dayOfWeek].push({
      id: anime.id,
      title: anime.title,
      coverImage: anime.coverImage,
      airingDate: anime.airingDate,
      formattedTime: anime.formattedTime,
      episode: anime.episode,
      color: anime.color
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
 * Renders the calendar with schedule data
 */
function renderCalendar(schedule) {
  if (!calendarContainer) return;

  log("Rendering calendar");

  // Clear container
  calendarContainer.innerHTML = '';

  // Get current day
  const today = new Date();
  const currentDayName = DAYS_OF_WEEK[today.getDay()];

  // Create calendar grid
  const calendarGrid = document.createElement('div');
  calendarGrid.className = 'anilist-calendar-grid';

  // Add days of week
  DAYS_OF_WEEK.forEach(day => {
    const dayCol = document.createElement('div');
    dayCol.className = `anilist-calendar-day ${day === currentDayName ? 'current-day' : ''}`;

    // Day header
    const dayHeader = document.createElement('div');
    dayHeader.className = 'day-header';
    dayHeader.innerHTML = `
      <span class="day-name">${day}</span>
      <span class="abbreviated-day">${ABBREVIATED_DAYS[DAYS_OF_WEEK.indexOf(day)]}</span>
    `;
    dayCol.appendChild(dayHeader);

    // Day anime list
    const animeList = document.createElement('div');
    animeList.className = 'day-anime-list';

    // Add anime entries for this day
    if (schedule[day] && schedule[day].length > 0) {
      schedule[day].forEach(anime => {
        const animeEntry = document.createElement('div');
        animeEntry.className = 'anime-entry';
        animeEntry.style.borderLeftColor = anime.color;

        animeEntry.innerHTML = `
          <div class="anime-time">${anime.formattedTime}</div>
          <div class="anime-image">
            <img src="${anime.coverImage}" alt="${anime.title}" loading="lazy" />
          </div>
          <div class="anime-info">
            <div class="anime-title">${anime.title}</div>
            <div class="anime-episode">Episode ${anime.episode}</div>
          </div>
        `;

        // Make clickable to anime page
        animeEntry.addEventListener('click', () => {
          window.location.href = `https://anilist.co/anime/${anime.id}`;
        });

        animeList.appendChild(animeEntry);
      });
    } else {
      // No anime airing on this day
      const emptyDay = document.createElement('div');
      emptyDay.className = 'empty-day';
      emptyDay.textContent = 'No episodes';
      animeList.appendChild(emptyDay);
    }

    dayCol.appendChild(animeList);
    calendarGrid.appendChild(dayCol);
  });

  // Add refresh button
  const refreshButton = document.createElement('button');
  refreshButton.className = 'calendar-refresh-btn';
  refreshButton.innerHTML = '<i class="fa fa-sync"></i> Refresh Schedule';
  refreshButton.addEventListener('click', () => {
    refreshCalendar();
  });

  // Add refresh button container
  const refreshContainer = document.createElement('div');
  refreshContainer.className = 'calendar-refresh-container';
  refreshContainer.appendChild(refreshButton);

  // Append calendar components
  calendarContainer.appendChild(calendarGrid);
  calendarContainer.appendChild(refreshContainer);
}

/**
 * Refreshes the calendar data
 */
function refreshCalendar() {
  if (!calendarContainer) return;

  // Show loading state
  const refreshButton = calendarContainer.querySelector('.calendar-refresh-btn');
  if (refreshButton) {
    refreshButton.disabled = true;
    refreshButton.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Refreshing...';
  }

  isCalendarInitialized = false;

  // Re-initialize
  setTimeout(() => {
    findAndReplaceAiringSection();

    if (refreshButton) {
      refreshButton.disabled = false;
      refreshButton.innerHTML = '<i class="fa fa-sync"></i> Refresh Schedule';
    }
  }, 500);
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