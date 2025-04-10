/**
 * Anilist Weekly Schedule - Settings Manager
 * Handles loading, saving, and accessing user preferences
 */

/**
 * Loads user preferences from storage
 * @return {Promise} Promise that resolves when preferences are loaded
 */
window.AnilistCalendar.settings.loadUserPreferences = async function() {
    return new Promise((resolve) => {
        try {
            chrome.storage.sync.get([
                `${window.AnilistCalendar.STORAGE_KEY_PREFIX}start_day`,
                `${window.AnilistCalendar.STORAGE_KEY_PREFIX}hide_empty_days`,
                `${window.AnilistCalendar.STORAGE_KEY_PREFIX}layout_mode`,
                `${window.AnilistCalendar.STORAGE_KEY_PREFIX}time_format`,
                `${window.AnilistCalendar.STORAGE_KEY_PREFIX}show_time`,
                `${window.AnilistCalendar.STORAGE_KEY_PREFIX}show_episode_numbers`,
                `${window.AnilistCalendar.STORAGE_KEY_PREFIX}title_alignment`,
                `${window.AnilistCalendar.STORAGE_KEY_PREFIX}column_justify`,
                `${window.AnilistCalendar.STORAGE_KEY_PREFIX}max_cards_per_day`,
                `${window.AnilistCalendar.STORAGE_KEY_PREFIX}full_width_images`,
                // Legacy keys for backwards compatibility
                `${window.AnilistCalendar.STORAGE_KEY_PREFIX}compact_mode`,
                `${window.AnilistCalendar.STORAGE_KEY_PREFIX}grid_mode`,
                `${window.AnilistCalendar.STORAGE_KEY_PREFIX}show_countdown`
            ], function(result) {
                // Load settings if they exist
                if (result[`${window.AnilistCalendar.STORAGE_KEY_PREFIX}start_day`] !== undefined) {
                    window.AnilistCalendar.userPreferences.startDay = result[`${window.AnilistCalendar.STORAGE_KEY_PREFIX}start_day`];
                }
                if (result[`${window.AnilistCalendar.STORAGE_KEY_PREFIX}hide_empty_days`] !== undefined) {
                    window.AnilistCalendar.userPreferences.hideEmptyDays = result[`${window.AnilistCalendar.STORAGE_KEY_PREFIX}hide_empty_days`];
                }
                if (result[`${window.AnilistCalendar.STORAGE_KEY_PREFIX}layout_mode`] !== undefined) {
                    window.AnilistCalendar.userPreferences.layoutMode = result[`${window.AnilistCalendar.STORAGE_KEY_PREFIX}layout_mode`];
                }
                if (result[`${window.AnilistCalendar.STORAGE_KEY_PREFIX}time_format`] !== undefined) {
                    window.AnilistCalendar.userPreferences.timeFormat = result[`${window.AnilistCalendar.STORAGE_KEY_PREFIX}time_format`];
                }
                if (result[`${window.AnilistCalendar.STORAGE_KEY_PREFIX}show_time`] !== undefined) {
                    window.AnilistCalendar.userPreferences.showTime = result[`${window.AnilistCalendar.STORAGE_KEY_PREFIX}show_time`];
                }
                if (result[`${window.AnilistCalendar.STORAGE_KEY_PREFIX}show_episode_numbers`] !== undefined) {
                    window.AnilistCalendar.userPreferences.showEpisodeNumbers = result[`${window.AnilistCalendar.STORAGE_KEY_PREFIX}show_episode_numbers`];
                }
                if (result[`${window.AnilistCalendar.STORAGE_KEY_PREFIX}title_alignment`] !== undefined) {
                    window.AnilistCalendar.userPreferences.titleAlignment = result[`${window.AnilistCalendar.STORAGE_KEY_PREFIX}title_alignment`];
                }
                if (result[`${window.AnilistCalendar.STORAGE_KEY_PREFIX}column_justify`] !== undefined) {
                    window.AnilistCalendar.userPreferences.columnJustify = result[`${window.AnilistCalendar.STORAGE_KEY_PREFIX}column_justify`];
                }
                if (result[`${window.AnilistCalendar.STORAGE_KEY_PREFIX}max_cards_per_day`] !== undefined) {
                    window.AnilistCalendar.userPreferences.maxCardsPerDay = result[`${window.AnilistCalendar.STORAGE_KEY_PREFIX}max_cards_per_day`];
                }
                if (result[`${window.AnilistCalendar.STORAGE_KEY_PREFIX}full_width_images`] !== undefined) {
                    window.AnilistCalendar.userPreferences.fullWidthImages = result[`${window.AnilistCalendar.STORAGE_KEY_PREFIX}full_width_images`];
                }

                // Handle backward compatibility with older settings
                // Prioritize direct layout_mode setting if it exists
                if (!result[`${window.AnilistCalendar.STORAGE_KEY_PREFIX}layout_mode`]) {
                    // Otherwise, check legacy settings
                    if (result[`${window.AnilistCalendar.STORAGE_KEY_PREFIX}compact_mode`] === true) {
                        window.AnilistCalendar.userPreferences.layoutMode = 'compact';
                    } else if (result[`${window.AnilistCalendar.STORAGE_KEY_PREFIX}grid_mode`] === true) {
                        window.AnilistCalendar.userPreferences.layoutMode = 'extended';
                    }
                }

                // For show countdown legacy setting
                if (!result[`${window.AnilistCalendar.STORAGE_KEY_PREFIX}time_format`] &&
                    result[`${window.AnilistCalendar.STORAGE_KEY_PREFIX}show_countdown`] === true) {
                    window.AnilistCalendar.userPreferences.timeFormat = 'countdown';
                }

                window.AnilistCalendar.utils.log("Loaded user preferences", window.AnilistCalendar.userPreferences);
                resolve();
            });
        } catch (e) {
            window.AnilistCalendar.utils.log("Error loading preferences", e);
            resolve();
        }
    });
};

/**
 * Saves user preferences to storage
 */
window.AnilistCalendar.settings.saveUserPreferences = function() {
    try {
        const data = {
            [`${window.AnilistCalendar.STORAGE_KEY_PREFIX}start_day`]: window.AnilistCalendar.userPreferences.startDay,
            [`${window.AnilistCalendar.STORAGE_KEY_PREFIX}hide_empty_days`]: window.AnilistCalendar.userPreferences.hideEmptyDays,
            [`${window.AnilistCalendar.STORAGE_KEY_PREFIX}layout_mode`]: window.AnilistCalendar.userPreferences.layoutMode,
            [`${window.AnilistCalendar.STORAGE_KEY_PREFIX}time_format`]: window.AnilistCalendar.userPreferences.timeFormat,
            [`${window.AnilistCalendar.STORAGE_KEY_PREFIX}show_time`]: window.AnilistCalendar.userPreferences.showTime,
            [`${window.AnilistCalendar.STORAGE_KEY_PREFIX}show_episode_numbers`]: window.AnilistCalendar.userPreferences.showEpisodeNumbers,
            [`${window.AnilistCalendar.STORAGE_KEY_PREFIX}title_alignment`]: window.AnilistCalendar.userPreferences.titleAlignment,
            [`${window.AnilistCalendar.STORAGE_KEY_PREFIX}column_justify`]: window.AnilistCalendar.userPreferences.columnJustify || 'top',
            [`${window.AnilistCalendar.STORAGE_KEY_PREFIX}max_cards_per_day`]: window.AnilistCalendar.userPreferences.maxCardsPerDay || 0,
            [`${window.AnilistCalendar.STORAGE_KEY_PREFIX}full_width_images`]: window.AnilistCalendar.userPreferences.fullWidthImages || false
        };

        // Add backward compatibility entries
        data[`${window.AnilistCalendar.STORAGE_KEY_PREFIX}compact_mode`] = (window.AnilistCalendar.userPreferences.layoutMode === 'compact');
        data[`${window.AnilistCalendar.STORAGE_KEY_PREFIX}grid_mode`] = (window.AnilistCalendar.userPreferences.layoutMode === 'extended');
        data[`${window.AnilistCalendar.STORAGE_KEY_PREFIX}show_countdown`] = (window.AnilistCalendar.userPreferences.timeFormat === 'countdown');
        // Add an entry for fan layout for backward compatibility if needed in future versions
        data[`${window.AnilistCalendar.STORAGE_KEY_PREFIX}fan_mode`] = (window.AnilistCalendar.userPreferences.layoutMode === 'fan');

        chrome.storage.sync.set(data, function() {
            window.AnilistCalendar.utils.log("Saved user preferences", data);
        });
    } catch (e) {
        window.AnilistCalendar.utils.log("Error saving preferences", e);
    }
};