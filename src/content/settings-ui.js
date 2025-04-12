/**
 * Anilist Weekly Schedule - Settings UI
 * Manages the settings overlay and UI elements in the content page
 */

/**
 * Creates the settings button.
 * @return {HTMLElement} The created settings button.
 */
window.AnilistCalendar.settingsUI.createSettingsButton = function() {
    const settingsButton = document.createElement('button');
    settingsButton.className = 'calendar-settings-btn header-settings-btn';
    settingsButton.title = 'Open settings';
    settingsButton.innerHTML = '<i class="fa fa-cog"></i>';

    // Opens settings overlay on click
    settingsButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        try {
            // Show settings overlay
            window.AnilistCalendar.settingsUI.createSettingsOverlay();
        } catch (err) {
            window.AnilistCalendar.utils.log("Error creating settings overlay:", err);
            // Fallback
            window.AnilistCalendar.settingsUI.createSettingsOverlay();
        }
    });

    return settingsButton;
};

/**
 * Initializes event handlers for the settings button.
 */
window.AnilistCalendar.settingsUI.initSettingsButtonEvents = function() {
    document.addEventListener('mouseover', function(e) {
        // Check if hovering over a calendar element or header
        let element = e.target;
        let isRelevantElement = false;

        while (element && element !== document.body) {
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
                setTimeout(() => {
                    settingsBtn.classList.add('visible');
                }, 0);
            }
        }
    });

    document.addEventListener('mouseout', function(e) {
        // Handle mouseout for relevant elements
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

        // Verify not moving to another relevant element
        if (isRelevantElement) {
            let toElement = e.relatedTarget;
            let isMovingToRelevantElement = false;

            while (toElement && toElement !== document.body) {
                if (toElement.classList && (
                        toElement.classList.contains('anilist-weekly-calendar') ||
                        toElement.classList.contains('section-header') && toElement.querySelector('.airing-replaced-header')) ||
                    toElement.classList.contains('header-settings-btn')
                ) {
                    isMovingToRelevantElement = true;
                    break;
                }
                toElement = toElement.parentElement;
            }

            if (!isMovingToRelevantElement) {
                const settingsBtn = document.querySelector('.header-settings-btn');
                if (settingsBtn) {
                    setTimeout(() => {
                        settingsBtn.classList.remove('visible');
                    }, 0);
                }
            }
        }
    });
};

/**
 * Reads all form values from the settings overlay and updates the userPreferences object
 * This ensures settings changes are properly applied before saving
 */
window.AnilistCalendar.settingsUI.updatePreferencesFromForm = function() {
    window.AnilistCalendar.utils.log("Reading form values and updating preferences");

    try {
        // Layout preferences
        const layoutModeSelect = document.getElementById('layout-mode');
        if (layoutModeSelect) {
            window.AnilistCalendar.userPreferences.layoutMode = layoutModeSelect.value;
        }

        const fullWidthImagesCheckbox = document.getElementById('full-width-images');
        if (fullWidthImagesCheckbox) {
            window.AnilistCalendar.userPreferences.fullWidthImages = fullWidthImagesCheckbox.checked;
        }

        const maxCardsPerDayInput = document.getElementById('max-cards-per-day');
        if (maxCardsPerDayInput) {
            window.AnilistCalendar.userPreferences.maxCardsPerDay = parseInt(maxCardsPerDayInput.value) || 0;
        }

        const titleAlignmentSelect = document.getElementById('title-alignment');
        if (titleAlignmentSelect) {
            window.AnilistCalendar.userPreferences.titleAlignment = titleAlignmentSelect.value;
        }

        const columnJustifySelect = document.getElementById('column-justify');
        if (columnJustifySelect) {
            window.AnilistCalendar.userPreferences.columnJustify = columnJustifySelect.value;
        }

        const hideEmptyDaysCheckbox = document.getElementById('hide-empty-days');
        if (hideEmptyDaysCheckbox) {
            window.AnilistCalendar.userPreferences.hideEmptyDays = hideEmptyDaysCheckbox.checked;
        }

        // Calendar preferences
        const startDaySelect = document.getElementById('start-day');
        if (startDaySelect) {
            window.AnilistCalendar.userPreferences.startDay = startDaySelect.value;
        }

        const showEpisodeNumbersCheckbox = document.getElementById('show-episode-numbers');
        if (showEpisodeNumbersCheckbox) {
            window.AnilistCalendar.userPreferences.showEpisodeNumbers = showEpisodeNumbersCheckbox.checked;
        }

        // Time preferences
        const showTimeCheckbox = document.getElementById('show-time');
        if (showTimeCheckbox) {
            window.AnilistCalendar.userPreferences.showTime = showTimeCheckbox.checked;
        }

        const timeFormatSelect = document.getElementById('time-format');
        if (timeFormatSelect) {
            window.AnilistCalendar.userPreferences.timeFormat = timeFormatSelect.value;
        }

        window.AnilistCalendar.utils.log("Updated user preferences:", window.AnilistCalendar.userPreferences);
        return true;
    } catch (err) {
        window.AnilistCalendar.utils.log("Error updating preferences from form:", err);
        return false;
    }
};

/**
 * Creates a settings overlay with organized sections and tabs.
 */
window.AnilistCalendar.settingsUI.createSettingsOverlay = function() {
    // Remove any existing overlay
    const existingOverlay = document.querySelector('.settings-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }

    // Use the theme already detected by the calendar
    const isLightTheme = window.AnilistCalendar.state.currentTheme === 'light';
    const isHighContrast = document.body.classList.contains('site-theme-contrast') ||
        document.body.classList.contains('high-contrast');

    window.AnilistCalendar.utils.log(`Using already detected theme: ${isLightTheme ? 'light' : 'dark'}${isHighContrast ? ' (high contrast)' : ''}`);

    // Create the overlay container
    const overlayContainer = document.createElement('div');
    overlayContainer.className = 'settings-overlay';
    if (isLightTheme) overlayContainer.classList.add('site-theme-light');
    if (isHighContrast) overlayContainer.classList.add('high-contrast');

    // Create the settings panel container
    const settingsPanel = document.createElement('div');
    settingsPanel.className = 'settings-panel';
    if (isLightTheme) settingsPanel.classList.add('site-theme-light');
    if (isHighContrast) settingsPanel.classList.add('high-contrast');

    // Create the header section
    const header = document.createElement('div');
    header.className = 'settings-header';
    if (isLightTheme) header.classList.add('site-theme-light');

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

    // Create the tabs container and tab buttons
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'settings-tabs';
    if (isLightTheme) tabsContainer.classList.add('site-theme-light');

    function createTabButton(text, id, isActive) {
        const button = document.createElement('button');
        button.id = id;
        button.className = 'settings-tab';
        button.textContent = text;
        if (isActive) {
            button.classList.add('active');
            if (isLightTheme) button.classList.add('active-light');
        }
        return button;
    }

    const layoutTab = createTabButton('Layout', 'layout-tab', true);
    const calendarTab = createTabButton('Calendar', 'calendar-tab', false);
    const timeTab = createTabButton('Time', 'time-tab', false);
    if (isLightTheme) [layoutTab, calendarTab, timeTab].forEach(tab => tab.classList.add('theme-light'));

    tabsContainer.appendChild(layoutTab);
    tabsContainer.appendChild(calendarTab);
    tabsContainer.appendChild(timeTab);
    settingsPanel.appendChild(tabsContainer);

    // Create tab content containers
    const layoutContent = document.createElement('div');
    layoutContent.id = 'layout-tab-content';
    layoutContent.className = 'tab-content active';
    if (isLightTheme) layoutContent.classList.add('site-theme-light');

    const calendarContent = document.createElement('div');
    calendarContent.id = 'calendar-tab-content';
    calendarContent.className = 'tab-content';
    if (isLightTheme) calendarContent.classList.add('site-theme-light');

    const timeContent = document.createElement('div');
    timeContent.id = 'time-tab-content';
    timeContent.className = 'tab-content';
    if (isLightTheme) timeContent.classList.add('site-theme-light');

    // -----------------------------------------------------
    // Function to save preferences but without updating the calendar UI
    // -----------------------------------------------------
    function savePreferencesOnly() {
        // Save current preferences to local storage
        window.AnilistCalendar.settings.saveUserPreferences();
    }

    // Function to update only the settings overlay UI based on current preferences
    function updateSettingsOverlayUI() {
        const currentLayoutMode = window.AnilistCalendar.userPreferences.layoutMode;

        window.AnilistCalendar.utils.log(`Updating settings UI for layout mode: ${currentLayoutMode}`);

        // Get all UI elements we need to update
        const fullWidthImagesRow = document.getElementById('full-width-images-row');
        const maxCardsPerDayRow = document.getElementById('max-cards-per-day-row');
        const titleAlignmentRow = document.getElementById('title-alignment-row');
        const columnAlignmentRow = document.getElementById('column-alignment-row');

        // Update visibility based on the current layout mode
        if (fullWidthImagesRow && maxCardsPerDayRow && titleAlignmentRow && columnAlignmentRow) {
            // Standard mode: Shows full width images and title alignment
            if (currentLayoutMode === 'standard') {
                fullWidthImagesRow.style.display = 'flex';
                titleAlignmentRow.style.display = 'flex';
                maxCardsPerDayRow.style.display = 'none';
                columnAlignmentRow.style.display = 'none';
                window.AnilistCalendar.utils.log("Showing standard mode options");
            }
            // Extended/Gallery mode: Shows max cards and column alignment
            else if (currentLayoutMode === 'extended') {
                fullWidthImagesRow.style.display = 'none';
                titleAlignmentRow.style.display = 'none';
                maxCardsPerDayRow.style.display = 'flex';
                columnAlignmentRow.style.display = 'flex';
                window.AnilistCalendar.utils.log("Showing gallery mode options");
            }
            // Compact mode: Shows title alignment only
            else {
                fullWidthImagesRow.style.display = 'none';
                titleAlignmentRow.style.display = 'flex';
                maxCardsPerDayRow.style.display = 'none';
                columnAlignmentRow.style.display = 'none';
                window.AnilistCalendar.utils.log("Showing compact mode options");
            }
        } else {
            window.AnilistCalendar.utils.log("Warning: Could not find all setting rows for UI update", {
                fullWidthImagesRow, maxCardsPerDayRow, titleAlignmentRow, columnAlignmentRow
            });
        }

        // Update controls to reflect current preferences
        const controls = [
            { id: 'full-width-images', type: 'checkbox', value: window.AnilistCalendar.userPreferences.fullWidthImages || false },
            { id: 'column-justify', type: 'select', value: window.AnilistCalendar.userPreferences.columnJustify || 'top' },
            { id: 'title-alignment', type: 'select', value: window.AnilistCalendar.userPreferences.titleAlignment || 'left' },
            { id: 'max-cards-per-day', type: 'input', value: window.AnilistCalendar.userPreferences.maxCardsPerDay || 0 },
            { id: 'hide-empty-days', type: 'checkbox', value: window.AnilistCalendar.userPreferences.hideEmptyDays },
            { id: 'show-episode-numbers', type: 'checkbox', value: window.AnilistCalendar.userPreferences.showEpisodeNumbers },
            { id: 'show-time', type: 'checkbox', value: window.AnilistCalendar.userPreferences.showTime },
            { id: 'time-format', type: 'select', value: window.AnilistCalendar.userPreferences.timeFormat || 'release' },
            { id: 'start-day', type: 'select', value: window.AnilistCalendar.userPreferences.startDay }
        ];

        // Update each control
        controls.forEach(control => {
            const element = document.getElementById(control.id);
            if (!element) return;

            if (control.type === 'checkbox') {
                element.checked = control.value;
                // Also update the slider visual state
                const slider = element.nextElementSibling;
                if (slider && slider.classList.contains('slider')) {
                    if (control.value) {
                        slider.classList.add('checked');
                    } else {
                        slider.classList.remove('checked');
                    }
                }
            } else if (control.type === 'select') {
                if (element.value !== control.value) {
                    element.value = control.value;
                }
            } else if (control.type === 'input') {
                element.value = control.value.toString();
            }
        });

        window.AnilistCalendar.utils.log("All settings UI elements updated successfully");
    }

    // -----------------------------------------------------
    // Function to handle layout change without refreshing the calendar
    // -----------------------------------------------------
    function handleLayoutChange(newLayout) {
        window.AnilistCalendar.utils.log(`Layout changed to: ${newLayout}`);

        // Update the preference
        window.AnilistCalendar.userPreferences.layoutMode = newLayout;

        // Save to storage
        savePreferencesOnly();

        // Refresh all UI elements in the settings panel
        updateSettingsOverlayUI();

        window.AnilistCalendar.utils.log("Settings UI updated after layout change");
    }

    // -----------------------------------------------------
    // LAYOUT & DISPLAY TAB CONTENT
    // -----------------------------------------------------
    // Create Layout Mode select element
    const currentLayoutMode = window.AnilistCalendar.userPreferences.layoutMode;
    const layoutModeWrapper = createSelect('layout-mode', [
        { value: 'standard', text: 'Standard' },
        { value: 'compact', text: 'Compact' },
        { value: 'extended', text: 'Gallery' }
    ], currentLayoutMode, false, handleLayoutChange);
    const layoutModeSelect = layoutModeWrapper.querySelector('select');
    const layoutModeRow = createSettingRow('Layout style', 'Choose how anime entries are displayed', layoutModeWrapper);
    layoutContent.appendChild(layoutModeRow);

    // Create Full width images toggle (only for standard mode)
    const fullWidthImagesRow = createSettingRow('Full width images', 'Expand images to fill the entire card (standard mode only)',
        createToggle('full-width-images', window.AnilistCalendar.userPreferences.fullWidthImages));
    fullWidthImagesRow.id = 'full-width-images-row';
    fullWidthImagesRow.style.display = (currentLayoutMode === 'standard') ? 'flex' : 'none';
    layoutContent.appendChild(fullWidthImagesRow);

    // Create Max cards per day setting (only for Gallery mode)
    const maxCardsPerDayRow = createSettingRow('Max cards per day', 'Maximum number of cards to show per day (0 = unlimited)',
        createCustomNumberInput('max-cards-per-day', window.AnilistCalendar.userPreferences.maxCardsPerDay || 0, 0, 30, 1));
    maxCardsPerDayRow.id = 'max-cards-per-day-row';
    maxCardsPerDayRow.style.display = (currentLayoutMode === 'extended') ? 'flex' : 'none';
    layoutContent.appendChild(maxCardsPerDayRow);

    // Create Title alignment setting (hidden in Gallery mode)
    const titleAlignmentRow = createSettingRow('Title alignment', 'Choose how anime titles are aligned',
        createSelect('title-alignment', [
            { value: 'left', text: 'Left aligned' },
            { value: 'center', text: 'Center aligned' }
        ], window.AnilistCalendar.userPreferences.titleAlignment || 'left'));
    titleAlignmentRow.id = 'title-alignment-row';
    titleAlignmentRow.style.display = (currentLayoutMode === 'extended') ? 'none' : 'flex';
    layoutContent.appendChild(titleAlignmentRow);

    // Create Column alignment setting (only for Gallery mode)
    const columnAlignmentRow = createSettingRow('Column alignment', 'Choose how columns are aligned in the calendar',
        createSelect('column-justify', [
            { value: 'top', text: 'Top aligned' },
            { value: 'center', text: 'Center aligned' }
        ], window.AnilistCalendar.userPreferences.columnJustify || 'top'));
    columnAlignmentRow.id = 'column-alignment-row';
    columnAlignmentRow.style.display = (currentLayoutMode === 'extended') ? 'flex' : 'none';
    layoutContent.appendChild(columnAlignmentRow);

    // Create Hide empty days toggle
    const hideEmptyDaysRow = createSettingRow('Hide empty days', 'Only show days with scheduled episodes',
        createToggle('hide-empty-days', window.AnilistCalendar.userPreferences.hideEmptyDays));
    layoutContent.appendChild(hideEmptyDaysRow);

    // Listen for changes in layout mode and update the settings UI immediately without refreshing the calendar
    // Note: We don't need this anymore because we pass handleLayoutChange directly to createSelect
    // if (layoutModeSelect) {
    //     layoutModeSelect.addEventListener('change', function() {
    //         handleLayoutChange(this.value);
    //     });
    // } else {
    //     console.error("Layout mode select element not found");
    // }

    // -----------------------------------------------------
    // CALENDAR TAB CONTENT
    // -----------------------------------------------------
    // Create Start Day select with visual separator
    const startDayOptions = [
        { value: 'today', text: 'Today', group: 'special' },
        { disabled: true, text: '─────────────', className: 'day-separator' },
        { value: '1', text: 'Monday', group: 'weekday' },
        { value: '2', text: 'Tuesday', group: 'weekday' },
        { value: '3', text: 'Wednesday', group: 'weekday' },
        { value: '4', text: 'Thursday', group: 'weekday' },
        { value: '5', text: 'Friday', group: 'weekday' },
        { value: '6', text: 'Saturday', group: 'weekday' },
        { value: '0', text: 'Sunday', group: 'weekday' }
    ];
    const startDaySelect = createSelect('start-day', startDayOptions, window.AnilistCalendar.userPreferences.startDay, true);
    const startDayRow = createSettingRow('First day of the week', 'Choose which day to display first in the calendar', startDaySelect);
    calendarContent.appendChild(startDayRow);

    // Create Show episode numbers toggle
    const showEpisodeNumbersRow = createSettingRow('Show episode numbers', 'Display episode numbers in the calendar',
        createToggle('show-episode-numbers', window.AnilistCalendar.userPreferences.showEpisodeNumbers));
    calendarContent.appendChild(showEpisodeNumbersRow);

    // -----------------------------------------------------
    // TIME TAB CONTENT
    // -----------------------------------------------------
    // Create Show time toggle
    const showTimeRow = createSettingRow('Show time', 'Display time information for each anime',
        createToggle('show-time', window.AnilistCalendar.userPreferences.showTime));
    timeContent.appendChild(showTimeRow);

    // Create Time format select element
    const timeFormatRow = createSettingRow('Time format', 'Choose between countdown or release time',
        createSelect('time-format', [
            { value: 'release', text: 'Release Time' },
            { value: 'countdown', text: 'Countdown' }
        ], window.AnilistCalendar.userPreferences.timeFormat));
    timeContent.appendChild(timeFormatRow);

    // Append all tab contents to the settings panel
    settingsPanel.appendChild(layoutContent);
    settingsPanel.appendChild(calendarContent);
    settingsPanel.appendChild(timeContent);

    // -----------------------------------------------------
    // Tab switching functionality
    // -----------------------------------------------------
    function switchTab(tabId) {
        const tabs = document.querySelectorAll('.settings-tab');
        tabs.forEach(tab => {
            tab.classList.remove('active');
            if (isLightTheme) tab.classList.remove('active-light');
        });
        const contents = document.querySelectorAll('.tab-content');
        contents.forEach(content => content.classList.remove('active'));
        const activeTab = document.getElementById(tabId);
        activeTab.classList.add('active');
        if (isLightTheme) activeTab.classList.add('active-light');
        document.getElementById(tabId + '-content').classList.add('active');
    }
    layoutTab.addEventListener('click', () => switchTab('layout-tab'));
    calendarTab.addEventListener('click', () => switchTab('calendar-tab'));
    timeTab.addEventListener('click', () => switchTab('time-tab'));

    // -----------------------------------------------------
    // Save button
    // -----------------------------------------------------
    const saveContainer = document.createElement('div');
    saveContainer.className = 'settings-save-container';
    if (isLightTheme) saveContainer.classList.add('theme-light');

    const saveButton = document.createElement('button');
    saveButton.className = 'settings-save-btn';
    if (isLightTheme) saveButton.classList.add('theme-light');
    saveButton.innerHTML = '<i class="fa fa-save"></i> Save & Apply';

    // When Save is clicked, update the calendar and close the overlay
    saveButton.addEventListener('click', () => {
        // UPDATED: First read all form values and update the userPreferences object
        window.AnilistCalendar.settingsUI.updatePreferencesFromForm();

        // Then save preferences to storage
        window.AnilistCalendar.settings.saveUserPreferences();

        // Store the old values to pass to updateUIWithSettings for proper comparison
        const oldTimeFormat = window.AnilistCalendar.userPreferences.timeFormat;
        const oldTitleAlignment = window.AnilistCalendar.userPreferences.titleAlignment;
        const oldColumnJustify = window.AnilistCalendar.userPreferences.columnJustify;
        const oldFullWidthImages = window.AnilistCalendar.userPreferences.fullWidthImages;
        const oldLayoutMode = window.AnilistCalendar.userPreferences.layoutMode;

        // Now update and render the actual calendar with saved preferences
        if (window.AnilistCalendar.state.calendarContainer) {
            // Update the calendar UI with the new settings
            window.AnilistCalendar.calendar.updateUIWithSettings(
                oldTimeFormat,
                oldTitleAlignment,
                oldColumnJustify,
                oldFullWidthImages,
                oldLayoutMode
            );
        }

        window.AnilistCalendar.utils.showNotification('Settings updated successfully', 'success');
        overlayContainer.classList.remove('active');
        setTimeout(() => { overlayContainer.remove(); }, 300);
    });

    saveContainer.appendChild(saveButton);
    settingsPanel.appendChild(saveContainer);

    // Append the settings panel to the overlay and the overlay to the body
    overlayContainer.appendChild(settingsPanel);
    document.body.appendChild(overlayContainer);

    // Activate the overlay with an animation delay
    setTimeout(() => { overlayContainer.classList.add('active'); }, 10);

    // Close the overlay if clicking outside the panel
    overlayContainer.addEventListener('click', (e) => {
        if (e.target === overlayContainer) {
            overlayContainer.classList.remove('active');
            setTimeout(() => { overlayContainer.remove(); }, 300);
        }
    });
};

/**
 * Creates a settings row with label, description and control.
 * @param {string} label - The setting label.
 * @param {string} description - The setting description.
 * @param {HTMLElement} control - The control element (select, toggle, etc.).
 * @return {HTMLElement} The created settings row.
 */
function createSettingRow(label, description, control) {
    const row = document.createElement('div');
    row.className = 'settings-row';

    const labelContainer = document.createElement('div');
    labelContainer.className = 'settings-label-container';

    const labelText = document.createElement('div');
    labelText.className = 'settings-label';
    labelText.textContent = label;

    const descText = document.createElement('div');
    descText.className = 'settings-description';
    descText.textContent = description;

    labelContainer.appendChild(labelText);
    labelContainer.appendChild(descText);

    row.appendChild(labelContainer);
    row.appendChild(control);

    return row;
}

/**
 * Creates a "fixed" <select> element in which the selected option is shown as the visible value,
 * but no longer appears among the dropdown options.
 * For the special case 'start-day', if 'today' is selected, the divider is omitted.
 *
 * @param {string} id - The ID to assign to the select element.
 * @param {Array} options - Array of option objects. Each may contain:
 *     - value: string (e.g., "today", "1", "2", …)
 *     - text: display string
 *     - disabled: (optional) if true, marks a non-selectable divider or entry
 *     - group: (optional) e.g., "special" or "weekday"
 * @param {string} selectedValue - The initially selected value.
 * @param {boolean} isSpecial - Indicates whether special logic applies (e.g., for 'start-day').
 * @param {Function} onChange - Optional callback to run when selection changes.
 * @return {HTMLElement} The wrapper element containing the customized select.
 */
function createSelect(id, options, selectedValue, isSpecial = false, onChange = null) {
    const wrapper = document.createElement('div');
    wrapper.className = 'select-wrapper';

    // Store callback in a data attribute for access later
    if (onChange) {
        wrapper.dataset.onChangeCallback = "true";
    }

    // Helper to append a single option to the select
    function addOption(selectEl, optionData) {
        const optEl = document.createElement('option');
        optEl.value = optionData.value;
        optEl.textContent = optionData.text;
        if (optionData.className) optEl.className = optionData.className;
        if (optionData.disabled) optEl.disabled = true;
        if (optionData.group) optEl.dataset.group = optionData.group;
        selectEl.appendChild(optEl);
    }

    // Normalize options by trimming extraneous whitespace from labels
    const trimmedOptions = options.map(opt => ({
        ...opt,
        text: opt.text ? opt.text.trim() : ''
    }));

    // Constructs a new select element based on the current selected value
    function buildSelectContent(currentValue) {
        const newSelect = document.createElement('select');
        newSelect.id = id;
        newSelect.className = 'settings-select';

        // Identify the selected option (excluding disabled ones)
        const selectedOpt = trimmedOptions.find(opt => opt.value === currentValue && !opt.disabled) ||
            trimmedOptions.find(opt => !opt.disabled);

        // Add the selected option at the top, hidden from the dropdown
        if (selectedOpt) {
            const selEl = document.createElement('option');
            selEl.value = selectedOpt.value;
            selEl.textContent = selectedOpt.text;
            selEl.selected = true;
            selEl.hidden = true;
            newSelect.appendChild(selEl);
        }

        // Special case logic for 'start-day'
        if (isSpecial && id === 'start-day') {
            if (currentValue === 'today') {
                // If 'today' is selected, skip 'today' and divider; show only weekday options
                trimmedOptions.forEach(option => {
                    if (!option.disabled && option.value !== 'today' && option.group === 'weekday') {
                        addOption(newSelect, option);
                    }
                });
            } else {
                // Otherwise:
                // 1. Add the 'today' option
                const todayOption = trimmedOptions.find(opt => opt.value === 'today');
                if (todayOption) addOption(newSelect, todayOption);

                // 2. Add a visual divider if present
                const divider = trimmedOptions.find(opt => opt.disabled);
                if (divider) {
                    const dividerEl = document.createElement('option');
                    dividerEl.disabled = true;
                    dividerEl.className = divider.className || 'day-separator';
                    dividerEl.textContent = divider.text || '─────────────';
                    newSelect.appendChild(dividerEl);
                }

                // 3. Add weekday options excluding the selected one
                trimmedOptions.forEach(option => {
                    if (!option.disabled && option.value !== currentValue && option.group === 'weekday') {
                        addOption(newSelect, option);
                    }
                });
            }
        } else {
            // Standard behavior: add all non-disabled options except the selected one
            trimmedOptions.forEach(option => {
                if (!option.disabled && option.value !== currentValue) {
                    addOption(newSelect, option);
                }
            });
        }

        return newSelect;
    }

    // Event handler to rebuild the select when selection changes
    function updateSelect() {
        const newValue = this.value;
        const newSelect = buildSelectContent(newValue);

        // We need to retain both the updateSelect and the onChange handlers
        newSelect.addEventListener('change', updateSelect);

        // If onChange was provided, call it with the new value
        if (onChange) {
            onChange(newValue);

            // And make sure to add this handler to the new select as well
            newSelect.addEventListener('change', function() {
                onChange(this.value);
            });
        }

        this.parentNode.replaceChild(newSelect, this);
    }

    // Initialize the select with the provided value and bind the change handler
    const initialSelect = buildSelectContent(selectedValue);
    initialSelect.addEventListener('change', updateSelect);

    // Also attach the external change handler if provided
    if (onChange) {
        initialSelect.addEventListener('change', function() {
            onChange(this.value);
        });
    }

    wrapper.appendChild(initialSelect);

    return wrapper;
}

/**
 * Creates a custom number input with - and + buttons inside the field.
 * @param {string} id - The input ID.
 * @param {number} value - The initial value.
 * @param {number} min - The minimum value.
 * @param {number} max - The maximum value.
 * @param {number} step - The increment.
 * @return {HTMLElement} The created custom number input.
 */
function createCustomNumberInput(id, value, min, max, step) {
    const wrapper = document.createElement('div');
    wrapper.className = 'number-input-wrapper';

    // Input field first (buttons will be positioned inside it via CSS)
    const input = document.createElement('input');
    input.type = 'number';
    input.id = id;
    input.className = 'settings-number-input';
    input.value = value.toString();
    input.min = min.toString();
    input.max = max.toString();
    input.step = step.toString();

    // Add input to wrapper
    wrapper.appendChild(input);

    // Minus button
    const minusBtn = document.createElement('button');
    minusBtn.className = 'number-control-btn number-minus-btn';
    minusBtn.innerHTML = '<i class="fa fa-minus"></i>';
    minusBtn.type = 'button';
    minusBtn.tabIndex = -1; // Prevent tab focus

    // Plus button
    const plusBtn = document.createElement('button');
    plusBtn.className = 'number-control-btn number-plus-btn';
    plusBtn.innerHTML = '<i class="fa fa-plus"></i>';
    plusBtn.type = 'button';
    plusBtn.tabIndex = -1; // Prevent tab focus

    // Add event listeners
    minusBtn.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent form submission
        let currentValue = parseInt(input.value) || 0;
        currentValue = Math.max(min, currentValue - step);
        input.value = currentValue.toString();

        // Trigger visual feedback
        minusBtn.style.transform = 'scale(0.9)';
        setTimeout(() => {
            minusBtn.style.transform = '';
        }, 100);
    });

    plusBtn.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent form submission
        let currentValue = parseInt(input.value) || 0;
        currentValue = Math.min(max, currentValue + step);
        input.value = currentValue.toString();

        // Trigger visual feedback
        plusBtn.style.transform = 'scale(0.9)';
        setTimeout(() => {
            plusBtn.style.transform = '';
        }, 100);
    });

    // Validate input changes
    input.addEventListener('change', () => {
        let currentValue = parseInt(input.value) || 0;
        currentValue = Math.max(min, Math.min(max, currentValue));
        input.value = currentValue.toString();
    });

    // Prevent manual typing of non-numeric characters
    input.addEventListener('keydown', (e) => {
        // Allow navigation keys and special keys
        const allowedKeys = [
            'Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'Period', '.',
            'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
            'Home', 'End', 'NumpadDecimal', 'Decimal'
        ];

        // Allow if it's a special key or Ctrl+A/Command+A
        if (allowedKeys.includes(e.key) ||
            ((e.key === 'a' || e.key === 'A') && (e.ctrlKey || e.metaKey))) {
            return;
        }

        // Allow if it's a digit (0-9) or numpad digit
        const isDigit = /^\d$/.test(e.key) ||
            /^Numpad\d$/.test(e.key);

        if (!isDigit) {
            e.preventDefault();
        }
    });

    // Add buttons to wrapper (they'll be positioned via CSS)
    wrapper.appendChild(minusBtn);
    wrapper.appendChild(plusBtn);

    return wrapper;
}

/**
 * Creates a toggle switch.
 * @param {string} id - The toggle ID.
 * @param {boolean} checked - Whether the toggle is initially active.
 * @return {HTMLElement} The created toggle element.
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
    if (checked) {
        slider.classList.add('checked');
    }

    input.addEventListener('change', function() {
        if (this.checked) {
            slider.classList.add('checked');
        } else {
            slider.classList.remove('checked');
        }
    });

    toggle.appendChild(input);
    toggle.appendChild(slider);

    return toggle;
}