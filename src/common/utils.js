/**
 * Anilist Weekly Schedule - Utilities
 * Common utility functions used throughout the extension
 */

// Ensure the namespace is initialized
if (!window.AnilistCalendar) {
    window.AnilistCalendar = {};
}

// Ensure the utils object exists
if (!window.AnilistCalendar.utils) {
    window.AnilistCalendar.utils = {};
}

/**
 * Logs debug messages to console when debug mode is enabled
 * @param {string} message - The message to log
 * @param {any} data - Optional data to log with the message
 */
window.AnilistCalendar.utils.log = function(message, data = null) {
    // Check if DEBUG_MODE exists, otherwise use a default value
    const debugMode = window.AnilistCalendar.DEBUG_MODE !== undefined ? window.AnilistCalendar.DEBUG_MODE : true;

    if (!debugMode) return;

    if (data) {
        console.log(`[Anilist Calendar] ${message}`, data);
    } else {
        console.log(`[Anilist Calendar] ${message}`);
    }
};

/**
 * Fallback logging function that uses console.log directly
 * This ensures we always have a logging function available
 */
window.AnilistCalendar.utils.safeLog = function(message, data = null) {
    if (data) {
        console.log(`[Anilist Calendar] ${message}`, data);
    } else {
        console.log(`[Anilist Calendar] ${message}`);
    }
};

/**
 * Loads Font Awesome for icons if not already loaded
 */
window.AnilistCalendar.utils.loadFontAwesome = function() {
    if (document.querySelector('link[href*="fontawesome"]')) {
        window.AnilistCalendar.utils.log("Font Awesome already loaded");
        return;
    }

    const fontAwesomeLink = document.createElement("link");
    fontAwesomeLink.rel = "stylesheet";
    fontAwesomeLink.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css";
    fontAwesomeLink.integrity = "sha512-z3gLpd7yknf1YoNbCzqRKc4qyor8gaKU1qmn+CShxbuBusANI9QpRohGBreCFkKxLhei6S9CQXFEbbKuqLg0DA==";
    fontAwesomeLink.crossOrigin = "anonymous";
    fontAwesomeLink.referrerPolicy = "no-referrer";

    document.head.appendChild(fontAwesomeLink);
    window.AnilistCalendar.utils.log("Font Awesome loaded");
};

/**
 * Preloads FontAwesome icons to ensure they're available
 */
window.AnilistCalendar.utils.preloadFontAwesomeIcons = function() {
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
    <i class="fa fa-chevron-left"></i>
    <i class="fa fa-chevron-right"></i>
  `;
    document.body.appendChild(preloadDiv);

    setTimeout(() => document.body.removeChild(preloadDiv), 2000);
};

/**
 * Formats time as HH:MM
 * @param {Date} date - The date object to format
 * @return {string} Formatted time string
 */
window.AnilistCalendar.utils.formatTime = function(date) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
};

/**
 * Gets the current browser timezone offset in hours
 * @return {number} The timezone offset in hours
 */
window.AnilistCalendar.utils.getBrowserTimezoneOffset = function() {
    // Get minutes and convert to hours
    const offsetMinutes = new Date().getTimezoneOffset();
    // Convert to hours (note: getTimezoneOffset returns the opposite of what we need)
    return -(offsetMinutes / 60);
};

/**
 * Creates a show notification
 * @param {string} message - The message to display
 * @param {string} type - The type of notification ('success', 'error', 'loading')
 * @return {HTMLElement} The notification element
 */
window.AnilistCalendar.utils.showNotification = function(message, type = 'success') {
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
    }, 10);

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
};

/**
 * Calculate time components (days, hours, minutes) from a time difference
 * @param {number} diff - Time difference in milliseconds
 * @return {Object} Object containing days, hours, and minutes
 */
window.AnilistCalendar.utils.calculateTimeComponents = function(diff) {
    return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000)
    };
};