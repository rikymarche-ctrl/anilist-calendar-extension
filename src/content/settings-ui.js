/**
 * Anilist Weekly Schedule - Settings UI
 * Manages the settings overlay and UI elements in the content page
 */

// Access directly the global namespace
// (no need to create a local variable)

/**
 * Creates settings button with fixed z-index
 * @return {HTMLElement} The created settings button
 */
window.AnilistCalendar.settingsUI.createSettingsButton = function() {
    const settingsButton = document.createElement('button');
    settingsButton.className = 'calendar-settings-btn header-settings-btn';
    settingsButton.title = 'Open settings';
    settingsButton.innerHTML = '<i class="fa fa-cog" style="font-size: 14px;"></i>';

    // Open settings overlay when settings button is clicked
    settingsButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        try {
            // Show the settings overlay
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
 * Initialize settings button event handlers
 */
window.AnilistCalendar.settingsUI.initSettingsButtonEvents = function() {
    document.addEventListener('mouseover', function(e) {
        // Find if we're hovering any calendar element or header
        let element = e.target;
        let isRelevantElement = false;

        while (element && element !== document.body) {
            // Only respond to hovering over the calendar container or its direct section header
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
                    settingsBtn.style.opacity = '1';
                }, 0);
            }
        }
    });

    document.addEventListener('mouseout', function(e) {
        // Only handle mouseout for relevant elements
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

        // Check that we're not moving to another relevant element
        if (isRelevantElement) {
            let toElement = e.relatedTarget;
            let isMovingToRelevantElement = false;

            while (toElement && toElement !== document.body) {
                if (toElement.classList && (
                    toElement.classList.contains('anilist-weekly-calendar') ||
                    toElement.classList.contains('section-header') && toElement.querySelector('.airing-replaced-header') ||
                    toElement.classList.contains('header-settings-btn')
                )) {
                    isMovingToRelevantElement = true;
                    break;
                }
                toElement = toElement.parentElement;
            }

            if (!isMovingToRelevantElement) {
                const settingsBtn = document.querySelector('.header-settings-btn');
                if (settingsBtn) {
                    setTimeout(() => {
                        settingsBtn.style.opacity = '0';
                    }, 0);
                }
            }
        }
    });
};

/**
 * Creates a settings overlay with organized sections and tabs
 */
window.AnilistCalendar.settingsUI.createSettingsOverlay = function() {
    // Remove any existing overlay
    const existingOverlay = document.querySelector('.settings-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }

    // Force detect theme using multiple methods for maximum compatibility
    const siteThemeFromBody = document.body.classList.contains('site-theme-light');
    const dataThemeFromBody = document.body.getAttribute('data-theme') === 'light';
    const dataThemeFromHtml = document.documentElement.getAttribute('data-theme') === 'light';
    const htmlClass = document.documentElement.classList.contains('site-theme-light');

    const isLightTheme = siteThemeFromBody || dataThemeFromBody || dataThemeFromHtml || htmlClass;
    const isHighContrast = document.body.classList.contains('high-contrast') ||
        document.documentElement.classList.contains('high-contrast');

    // Log theme detection for debugging
    window.AnilistCalendar.utils.log(`Theme detection: Light theme: ${isLightTheme} (body class: ${siteThemeFromBody}, data-theme: ${dataThemeFromBody}, html data-theme: ${dataThemeFromHtml}, html class: ${htmlClass}), High contrast: ${isHighContrast}`);

    // Create overlay container
    const overlayContainer = document.createElement('div');
    overlayContainer.className = 'settings-overlay';

    // Make sure the theme classes are applied directly
    if (isLightTheme) {
        overlayContainer.classList.add('site-theme-light');
    }
    if (isHighContrast) {
        overlayContainer.classList.add('high-contrast');
    }

    // Create settings panel with theme-specific styling
    const settingsPanel = document.createElement('div');
    settingsPanel.className = 'settings-panel';

    // Apply theme styles directly to the panel as inline styles for guaranteed application
    if (isLightTheme) {
        settingsPanel.style.backgroundColor = '#f8f9fa';
        settingsPanel.style.color = '#23252b';
        settingsPanel.style.borderColor = 'rgba(0, 0, 0, 0.1)';
    } else {
        settingsPanel.style.backgroundColor = '#121c28';
        settingsPanel.style.color = '#FFFFFF';
    }

    // Add header
    const header = document.createElement('div');
    header.className = 'settings-header';

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

    // Create tabs container
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'settings-tabs';

    // Create tab buttons with proper styling for the theme
    const layoutTab = createTabButton('Layout', 'layout-tab', true);
    const calendarTab = createTabButton('Calendar', 'calendar-tab');
    const timeTab = createTabButton('Time', 'time-tab');

    // Apply theme-specific styles to tabs
    if (isLightTheme) {
        [layoutTab, calendarTab, timeTab].forEach(tab => {
            tab.style.color = tab.classList.contains('active') ? '#3577b1' : '#5c728a';
        });
    } else {
        [layoutTab, calendarTab, timeTab].forEach(tab => {
            tab.style.color = tab.classList.contains('active') ? '#3db4f2' : '#9ca3af';
        });
    }

    tabsContainer.appendChild(layoutTab);
    tabsContainer.appendChild(calendarTab);
    tabsContainer.appendChild(timeTab);

    settingsPanel.appendChild(tabsContainer);

    // Create tab content containers
    const layoutContent = document.createElement('div');
    layoutContent.id = 'layout-tab-content';
    layoutContent.className = 'tab-content active';

    const calendarContent = document.createElement('div');
    calendarContent.id = 'calendar-tab-content';
    calendarContent.className = 'tab-content';

    const timeContent = document.createElement('div');
    timeContent.id = 'time-tab-content';
    timeContent.className = 'tab-content';

    //-----------------------------------------------------
    // LAYOUT & DISPLAY TAB CONTENT
    //-----------------------------------------------------
    // Layout mode setting
    const currentLayoutMode = window.AnilistCalendar.userPreferences.layoutMode;
    const layoutModeSelect = createFilteredSelect('layout-mode', [
        { value: 'standard', text: 'Standard' },
        { value: 'compact', text: 'Compact' },
        { value: 'extended', text: 'Gallery' }
    ], currentLayoutMode);

    const layoutModeRow = createSettingRow(
        'Layout style',
        'Choose how anime entries are displayed',
        layoutModeSelect
    );
    layoutContent.appendChild(layoutModeRow);

    // Title alignment setting
    const titleAlignmentRow = createSettingRow(
        'Title alignment',
        'Choose how anime titles are aligned',
        createSelect('title-alignment', [
            { value: 'left', text: 'Left aligned' },
            { value: 'center', text: 'Center aligned' }
        ], window.AnilistCalendar.userPreferences.titleAlignment)
    );
    layoutContent.appendChild(titleAlignmentRow);

    // Hide empty days setting
    const hideEmptyDaysRow = createSettingRow(
        'Hide empty days',
        'Only show days with scheduled episodes',
        createToggle('hide-empty-days', window.AnilistCalendar.userPreferences.hideEmptyDays)
    );
    layoutContent.appendChild(hideEmptyDaysRow);

    //-----------------------------------------------------
    // CALENDAR TAB CONTENT
    //-----------------------------------------------------
    // Start day setting with visual separator
    const startDayOptions = [
        { value: 'today', text: 'Today', group: 'special' },
        { disabled: true, text: '─────────────', className: 'day-separator' },
        { value: '0', text: 'Sunday', group: 'weekday' },
        { value: '1', text: 'Monday', group: 'weekday' },
        { value: '2', text: 'Tuesday', group: 'weekday' },
        { value: '3', text: 'Wednesday', group: 'weekday' },
        { value: '4', text: 'Thursday', group: 'weekday' },
        { value: '5', text: 'Friday', group: 'weekday' },
        { value: '6', text: 'Saturday', group: 'weekday' }
    ];

    const startDaySelect = createFilteredSelect('start-day', startDayOptions, window.AnilistCalendar.userPreferences.startDay);

    const startDayRow = createSettingRow(
        'First day of the week',
        'Choose which day to display first in the calendar',
        startDaySelect
    );
    calendarContent.appendChild(startDayRow);

    // Show episode numbers setting
    const showEpisodeNumbersRow = createSettingRow(
        'Show episode numbers',
        'Display episode numbers in the calendar',
        createToggle('show-episode-numbers', window.AnilistCalendar.userPreferences.showEpisodeNumbers)
    );
    calendarContent.appendChild(showEpisodeNumbersRow);

    //-----------------------------------------------------
    // TIME & TIMEZONE TAB CONTENT
    //-----------------------------------------------------
    // Show time setting
    const showTimeRow = createSettingRow(
        'Show time',
        'Display time information for each anime',
        createToggle('show-time', window.AnilistCalendar.userPreferences.showTime)
    );
    timeContent.appendChild(showTimeRow);

    // Time format setting
    const timeFormatRow = createSettingRow(
        'Time format',
        'Choose between countdown or release time',
        createFilteredSelect('time-format', [
            { value: 'release', text: 'Release Time' },
            { value: 'countdown', text: 'Countdown' }
        ], window.AnilistCalendar.userPreferences.timeFormat)
    );
    timeContent.appendChild(timeFormatRow);

    // Timezone select with short display names
    const timezoneSelect = document.createElement('select');
    timezoneSelect.id = 'timezone';
    timezoneSelect.className = 'settings-select';
    timezoneSelect.style.width = '180px'; // Wider for timezone options

    // Create options with full text in dropdown but display short version when selected
    for (const tz of window.AnilistCalendar.TIMEZONE_OPTIONS) {
        const option = document.createElement('option');
        option.value = tz.value;
        option.textContent = tz.text;
        option.dataset.shortText = tz.shortText; // Store short text in data attribute
        if (tz.value === window.AnilistCalendar.userPreferences.timezone) {
            option.selected = true;
            // Display short version for selected item
            option.textContent = tz.shortText;
        }
        timezoneSelect.appendChild(option);
    }

    // Handle change event to update the display of selected item to short version
    timezoneSelect.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        const shortText = selectedOption.dataset.shortText;

        // Reset all options to full text
        for (let i = 0; i < this.options.length; i++) {
            const opt = this.options[i];
            const tz = window.AnilistCalendar.TIMEZONE_OPTIONS.find(t => t.value === opt.value);
            if (tz) {
                opt.textContent = tz.text;
            }
        }

        // Set selected option to short text
        if (shortText) {
            selectedOption.textContent = shortText;
        }
    });

    const timezoneRow = createSettingRow(
        'Timezone',
        'Adjust anime airing times to your timezone',
        timezoneSelect
    );
    timeContent.appendChild(timezoneRow);

    // Add all tab contents to panel
    settingsPanel.appendChild(layoutContent);
    settingsPanel.appendChild(calendarContent);
    settingsPanel.appendChild(timeContent);

    // Add tab switching functionality
    layoutTab.addEventListener('click', () => switchTab('layout-tab'));
    calendarTab.addEventListener('click', () => switchTab('calendar-tab'));
    timeTab.addEventListener('click', () => switchTab('time-tab'));

    // Save button with direct theme styling
    const saveContainer = document.createElement('div');
    saveContainer.className = 'settings-save-container';
    if (isLightTheme) {
        saveContainer.style.backgroundColor = '#f8f9fa';
    } else {
        saveContainer.style.backgroundColor = '#121c28';
    }

    const saveButton = document.createElement('button');
    saveButton.className = 'settings-save-btn';
    saveButton.innerHTML = '<i class="fa fa-save"></i> Save Changes';

    // Apply theme-specific styling to the save button
    if (isLightTheme) {
        saveButton.style.backgroundColor = '#3577b1';
    } else {
        saveButton.style.backgroundColor = '#3db4f2';
    }
    saveButton.addEventListener('click', () => {
        // Get values directly from form elements
        const startDay = document.getElementById('start-day')?.value || window.AnilistCalendar.userPreferences.startDay;
        const hideEmptyDays = document.getElementById('hide-empty-days')?.checked ?? window.AnilistCalendar.userPreferences.hideEmptyDays;
        const layoutMode = document.getElementById('layout-mode')?.value || window.AnilistCalendar.userPreferences.layoutMode;
        const timeFormat = document.getElementById('time-format')?.value || window.AnilistCalendar.userPreferences.timeFormat;
        const showTime = document.getElementById('show-time')?.checked ?? window.AnilistCalendar.userPreferences.showTime;
        const showEpisodeNumbers = document.getElementById('show-episode-numbers')?.checked ?? window.AnilistCalendar.userPreferences.showEpisodeNumbers;
        const timezone = document.getElementById('timezone')?.value || window.AnilistCalendar.userPreferences.timezone;
        const titleAlignment = document.getElementById('title-alignment')?.value || window.AnilistCalendar.userPreferences.titleAlignment;

        // Store previous values for comparison
        const prevTimeFormat = window.AnilistCalendar.userPreferences.timeFormat;
        const prevTimezone = window.AnilistCalendar.userPreferences.timezone;
        const prevTitleAlignment = window.AnilistCalendar.userPreferences.titleAlignment;

        // Update preferences
        window.AnilistCalendar.userPreferences.startDay = startDay;
        window.AnilistCalendar.userPreferences.hideEmptyDays = hideEmptyDays;
        window.AnilistCalendar.userPreferences.layoutMode = layoutMode;
        window.AnilistCalendar.userPreferences.timeFormat = timeFormat;
        window.AnilistCalendar.userPreferences.showTime = showTime;
        window.AnilistCalendar.userPreferences.showEpisodeNumbers = showEpisodeNumbers;
        window.AnilistCalendar.userPreferences.timezone = timezone;
        window.AnilistCalendar.userPreferences.titleAlignment = titleAlignment;

        // Save to storage
        window.AnilistCalendar.settings.saveUserPreferences();

        // Show notification
        window.AnilistCalendar.utils.showNotification('Settings saved!', 'success');

        // Close overlay
        overlayContainer.classList.remove('active');
        setTimeout(() => {
            overlayContainer.remove();
        }, 300);

        // Update UI without page refresh
        window.AnilistCalendar.calendar.updateUIWithSettings(prevTimeFormat, prevTimezone, prevTitleAlignment);
    });

    saveContainer.appendChild(saveButton);
    settingsPanel.appendChild(saveContainer);

    // Add panel to overlay
    overlayContainer.appendChild(settingsPanel);

    // Add overlay to page
    document.body.appendChild(overlayContainer);

    // Activate overlay with animation
    setTimeout(() => {
        overlayContainer.classList.add('active');
    }, 10);

    // Close when clicking outside the panel
    overlayContainer.addEventListener('click', (e) => {
        if (e.target === overlayContainer) {
            overlayContainer.classList.remove('active');
            setTimeout(() => {
                overlayContainer.remove();
            }, 300);
        }
    });

    // Function to switch tabs with proper styling
    function switchTab(tabId) {
        // Remove active class from all tabs
        const tabs = document.querySelectorAll('.settings-tab');
        tabs.forEach(tab => {
            tab.classList.remove('active');
            tab.style.backgroundColor = 'transparent';

            // Apply theme-specific text color
            if (isLightTheme) {
                tab.style.color = '#5c728a';
            } else {
                tab.style.color = '#9ca3af';
            }
        });

        // Remove active class from all content
        const contents = document.querySelectorAll('.tab-content');
        contents.forEach(content => content.classList.remove('active'));

        // Add active class to selected tab
        const activeTab = document.getElementById(tabId);
        activeTab.classList.add('active');
        activeTab.style.backgroundColor = 'rgba(61, 180, 242, 0.1)';

        // Apply theme-specific active text color
        if (isLightTheme) {
            activeTab.style.color = '#3577b1';
        } else {
            activeTab.style.color = '#3db4f2';
        }

        // Add active class to selected content
        document.getElementById(tabId + '-content').classList.add('active');
    }
};

/**
 * Creates a tab button with theme-specific styling
 * @param {string} text - The tab text
 * @param {string} id - The tab ID
 * @param {boolean} isActive - Whether the tab is initially active
 * @return {HTMLElement} The created tab button
 */
function createTabButton(text, id, isActive = false) {
    const button = document.createElement('button');
    button.textContent = text;
    button.id = id;
    button.className = 'settings-tab';
    if (isActive) {
        button.classList.add('active');
        // Add active styling
        button.style.backgroundColor = 'rgba(61, 180, 242, 0.1)';
    }
    return button;
}

/**
 * Creates a settings row with label and control
 * @param {string} label - The setting label
 * @param {string} description - The setting description
 * @param {HTMLElement} control - The control element (select, toggle, etc)
 * @return {HTMLElement} The created settings row
 */
function createSettingRow(label, description, control) {
    const row = document.createElement('div');
    row.className = 'settings-row';

    const labelContainer = document.createElement('div');

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
 * Creates a select element with options
 * @param {string} id - The select ID
 * @param {Array} options - The options to add
 * @param {string} selectedValue - The initially selected value
 * @return {HTMLElement} The created select element wrapper
 */
function createSelect(id, options, selectedValue) {
    // Crea un wrapper per garantire dimensioni uniformi
    const wrapper = document.createElement('div');
    wrapper.className = 'select-wrapper';

    const select = document.createElement('select');
    select.id = id;
    select.className = 'settings-select';

    // Find the selected option for placement at the top
    const selectedOption = options.find(opt => opt.value === selectedValue);

    if (selectedOption) {
        // Place selected option at the top
        const topOption = document.createElement('option');
        topOption.value = selectedValue;
        topOption.textContent = selectedOption.text;
        topOption.selected = true;
        select.appendChild(topOption);

        // Add all other options
        options.forEach(option => {
            if (option.value !== selectedValue) {
                const optElement = document.createElement('option');
                optElement.value = option.value;
                optElement.textContent = option.text;
                select.appendChild(optElement);
            }
        });
    } else {
        // If no match found, add all options normally
        options.forEach((option) => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.text;

            // Add separator class if specified
            if (option.separator) {
                optionElement.className = 'option-separator';
            }

            // Store short text for timezone display
            if (option.shortText) {
                optionElement.dataset.short = option.shortText;
            }

            // Select if it matches
            if (option.value === selectedValue) {
                optionElement.selected = true;
            }

            select.appendChild(optionElement);
        });
    }

    // Set the selected value
    select.value = selectedValue;

    // Special handling for timezone select - display short version
    if (id === 'timezone') {
        select.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            const shortText = selectedOption.dataset.short;
            if (shortText) {
                // Store original text for reference
                if (!selectedOption.dataset.originalText) {
                    selectedOption.dataset.originalText = selectedOption.textContent;
                }
                // Display only the short version when selected
                selectedOption.textContent = shortText;
            }
        });

        // Apply short text to initial selection
        const selectedOption = select.options[select.selectedIndex];
        if (selectedOption && selectedOption.dataset.short) {
            // Store original text
            selectedOption.dataset.originalText = selectedOption.textContent;
            // Set short text
            selectedOption.textContent = selectedOption.dataset.short;
        }
    }

    wrapper.appendChild(select);
    return wrapper;
}

/**
 * Crea un elemento select che filtra correttamente le opzioni, escludendo quella selezionata
 * @param {string} id - L'ID del select
 * @param {Array} options - Le opzioni da aggiungere
 * @param {string} selectedValue - Il valore inizialmente selezionato
 * @return {HTMLElement} Il wrapper contenente l'elemento select creato
 */
function createFilteredSelect(id, options, selectedValue) {
    // Creo un wrapper per garantire dimensioni uniformi
    const wrapper = document.createElement('div');
    wrapper.className = 'select-wrapper';

    const select = document.createElement('select');
    select.id = id;
    select.className = 'settings-select';

    // Funzione per popolare il select escludendo il valore selezionato
    function populateSelect(selectedVal) {
        // Svuota il select
        select.innerHTML = '';

        // Trova l'opzione selezionata
        const selectedOption = options.find(opt => opt.value === selectedVal);
        if (!selectedOption) return;

        // Crea l'opzione selezionata
        const currentOption = document.createElement('option');
        currentOption.value = selectedVal;
        currentOption.textContent = selectedOption.text;
        currentOption.selected = true;
        select.appendChild(currentOption);

        // Aggiungi le altre opzioni, escludendo quella selezionata
        // e gestendo i separatori in modo speciale
        let isAfterSeparator = false;
        let skipNextSeparator = selectedVal === 'today'; // Skip separator if 'today' is selected

        options.forEach((option) => {
            // Skip l'opzione selezionata
            if (option.value === selectedVal) {
                return;
            }

            // Se questo è un separatore
            if (option.separator || option.disabled) {
                // Se stiamo già skippando i separatori, salta questo
                if (skipNextSeparator) {
                    skipNextSeparator = false;
                    return;
                }

                const separatorOption = document.createElement('option');
                separatorOption.disabled = true;
                separatorOption.className = option.className || 'day-separator';
                separatorOption.textContent = option.text || '─────────────';
                select.appendChild(separatorOption);
                isAfterSeparator = true;
                return;
            }

            // Aggiungi le opzioni normali
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.text;

            // Se è un gruppo speciale (come weekday o special) aggiungi data-attribute
            if (option.group) {
                optionElement.dataset.group = option.group;
            }

            select.appendChild(optionElement);
        });
    }

    // Popola inizialmente il select
    populateSelect(selectedValue);

    // Gestisci il cambio di selezione
    select.addEventListener('change', function() {
        const newValue = this.value;
        populateSelect(newValue);
    });

    wrapper.appendChild(select);
    return wrapper;
}

/**
 * Creates a toggle switch
 * @param {string} id - The toggle ID
 * @param {boolean} checked - Whether the toggle is initially checked
 * @return {HTMLElement} The created toggle element
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

    // Set inline styles to ensure the background color is visible regardless of CSS loading
    if (checked) {
        slider.style.backgroundColor = '#3db4f2';
    } else {
        slider.style.backgroundColor = '#2c3e50';
    }

    // Update slider color when toggled
    input.addEventListener('change', function() {
        slider.style.backgroundColor = this.checked ? '#3db4f2' : '#2c3e50';
    });

    toggle.appendChild(input);
    toggle.appendChild(slider);

    return toggle;
}