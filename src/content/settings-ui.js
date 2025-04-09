/**
 * Anilist Weekly Schedule - Settings UI
 * Manages the settings overlay and UI elements in the content page
 */

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
    const layoutModeWrapper = createFilteredSelect('layout-mode', [
        { value: 'standard', text: 'Standard' },
        { value: 'compact', text: 'Compact' },
        { value: 'extended', text: 'Gallery' }
    ], currentLayoutMode);

    // Get the select element directly from the wrapper
    const layoutModeSelect = layoutModeWrapper.querySelector('select');

    const layoutModeRow = createSettingRow(
        'Layout style',
        'Choose how anime entries are displayed',
        layoutModeWrapper
    );
    layoutContent.appendChild(layoutModeRow);

    // Max cards per day setting (only visible in Gallery mode)
    const maxCardsPerDayRow = createSettingRow(
        'Max cards per day',
        'Maximum number of cards to show per day in Gallery mode (0 = unlimited)',
        createNumberInput('max-cards-per-day', window.AnilistCalendar.userPreferences.maxCardsPerDay || 0, 0, 30, 1)
    );

    // Set initial visibility based on current layout mode
    maxCardsPerDayRow.style.display =
        (currentLayoutMode === 'extended' || currentLayoutMode === 'grid') ? 'flex' : 'none';

    layoutContent.appendChild(maxCardsPerDayRow);

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

    // NEW SETTING: Column justification
    const columnJustifyRow = createSettingRow(
        'Column justify',
        'Choose how columns are justified in the calendar',
        createSelect('column-justify', [
            { value: 'top', text: 'Top aligned' },
            { value: 'center', text: 'Center aligned' }
        ], window.AnilistCalendar.userPreferences.columnJustify || 'top')
    );
    layoutContent.appendChild(columnJustifyRow);

    // Hide empty days setting
    const hideEmptyDaysRow = createSettingRow(
        'Hide empty days',
        'Only show days with scheduled episodes',
        createToggle('hide-empty-days', window.AnilistCalendar.userPreferences.hideEmptyDays)
    );
    layoutContent.appendChild(hideEmptyDaysRow);

    // Add event listener directly to the select element we already have
    if (layoutModeSelect) {
        layoutModeSelect.addEventListener('change', function() {
            const isGalleryMode = this.value === 'extended' || this.value === 'grid';
            maxCardsPerDayRow.style.display = isGalleryMode ? 'flex' : 'none';
        });
    } else {
        console.error("Layout mode select element not found");
    }

    //-----------------------------------------------------
    // CALENDAR TAB CONTENT
    //-----------------------------------------------------
    // Start day setting with visual separator
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
    timezoneSelect.style.textAlign = 'center';

    // Create options with full text in dropdown but display short version when selected
    for (const tz of window.AnilistCalendar.TIMEZONE_OPTIONS) {
        const option = document.createElement('option');
        option.value = tz.value;
        option.textContent = tz.text;
        option.dataset.shortText = tz.shortText; // Store short text in data attribute
        option.style.textAlign = 'center';
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

    // Create a standard wrapper for the timezone select
    const timezoneWrapper = document.createElement('div');
    timezoneWrapper.className = 'select-wrapper';
    timezoneWrapper.appendChild(timezoneSelect);

    const timezoneRow = createSettingRow(
        'Timezone',
        'Adjust anime airing times to your timezone',
        timezoneWrapper
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

    // COMPLETELY REWRITTEN SAVE BUTTON LOGIC WITH BETTER MULTIPLE CHANGES HANDLING
    saveButton.addEventListener('click', () => {
        // Save current values for comparison
        const prevStartDay = window.AnilistCalendar.userPreferences.startDay;
        const prevHideEmptyDays = window.AnilistCalendar.userPreferences.hideEmptyDays;
        const prevLayoutMode = window.AnilistCalendar.userPreferences.layoutMode;
        const prevTimeFormat = window.AnilistCalendar.userPreferences.timeFormat;
        const prevShowTime = window.AnilistCalendar.userPreferences.showTime;
        const prevShowEpisodeNumbers = window.AnilistCalendar.userPreferences.showEpisodeNumbers;
        const prevTimezone = window.AnilistCalendar.userPreferences.timezone;
        const prevTitleAlignment = window.AnilistCalendar.userPreferences.titleAlignment;
        const prevColumnJustify = window.AnilistCalendar.userPreferences.columnJustify || 'top';
        const prevMaxCardsPerDay = window.AnilistCalendar.userPreferences.maxCardsPerDay || 0;

        // Get new values from form
        const startDay = document.getElementById('start-day').value;
        const hideEmptyDays = document.getElementById('hide-empty-days').checked;
        const layoutMode = document.getElementById('layout-mode').value;
        const timeFormat = document.getElementById('time-format').value;
        const showTime = document.getElementById('show-time').checked;
        const showEpisodeNumbers = document.getElementById('show-episode-numbers').checked;
        const timezone = document.getElementById('timezone').value;
        const titleAlignment = document.getElementById('title-alignment').value;
        const columnJustify = document.getElementById('column-justify').value;
        const maxCardsPerDay = parseInt(document.getElementById('max-cards-per-day').value) || 0;

        // Count what changed
        const changes = [];
        if (prevLayoutMode !== layoutMode) changes.push('layout');
        if (prevColumnJustify !== columnJustify) changes.push('column justification');
        if (prevStartDay !== startDay) changes.push('start day');
        if (prevTimezone !== timezone) changes.push('timezone');
        if (prevTimeFormat !== timeFormat) changes.push('time format');
        if (prevTitleAlignment !== titleAlignment) changes.push('title alignment');
        if (prevHideEmptyDays !== hideEmptyDays) changes.push('empty days visibility');
        if (prevShowTime !== showTime) changes.push('time display');
        if (prevShowEpisodeNumbers !== showEpisodeNumbers) changes.push('episode numbers');
        if (prevMaxCardsPerDay !== maxCardsPerDay) changes.push('max cards per day');

        // Update preferences object
        window.AnilistCalendar.userPreferences.startDay = startDay;
        window.AnilistCalendar.userPreferences.hideEmptyDays = hideEmptyDays;
        window.AnilistCalendar.userPreferences.layoutMode = layoutMode;
        window.AnilistCalendar.userPreferences.timeFormat = timeFormat;
        window.AnilistCalendar.userPreferences.showTime = showTime;
        window.AnilistCalendar.userPreferences.showEpisodeNumbers = showEpisodeNumbers;
        window.AnilistCalendar.userPreferences.timezone = timezone;
        window.AnilistCalendar.userPreferences.titleAlignment = titleAlignment;
        window.AnilistCalendar.userPreferences.columnJustify = columnJustify;
        window.AnilistCalendar.userPreferences.maxCardsPerDay = maxCardsPerDay;

        // Save to storage
        window.AnilistCalendar.settings.saveUserPreferences();

        // Determine message based on what changed
        let notificationMessage = '';

        if (changes.length === 0) {
            // No changes made
            notificationMessage = 'No changes detected';
        } else if (changes.length === 1) {
            // Only one setting changed
            const capitalized = changes[0].charAt(0).toUpperCase() + changes[0].slice(1);
            notificationMessage = `${capitalized} updated!`;
        } else if (changes.length > 1 && changes.length <= 3) {
            // 2-3 settings changed - list them specifically
            notificationMessage = `Updated: ${changes.join(', ')}`;
        } else {
            // More than 3 settings changed
            notificationMessage = `Multiple settings updated (${changes.length})`;
        }

        // Show notification
        window.AnilistCalendar.utils.showNotification(notificationMessage, 'success');

        // Close overlay
        overlayContainer.classList.remove('active');
        setTimeout(() => {
            overlayContainer.remove();
        }, 300);

        // Update UI without page refresh - PASSAGGIO CORRETTO DI TUTTI I PARAMETRI
        window.AnilistCalendar.calendar.updateUIWithSettings(
            prevTimeFormat,
            prevTimezone,
            prevTitleAlignment,
            prevColumnJustify
        );
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

function createSelect(id, options, selectedValue) {
    // Wrapper comune per garantire larghezza uniforme
    const wrapper = document.createElement('div');
    wrapper.className = 'select-wrapper';

    const select = document.createElement('select');
    select.id = id;
    select.className = 'settings-select';

    // Add inline styles to ensure options are centered
    select.style.textAlign = 'center';

    // Funzione per popolare il select senza mostrare l'opzione selezionata
    function populateSelect(selectedVal) {
        select.innerHTML = '';

        // Trova l'opzione corrispondente al valore selezionato
        const selectedOption = options.find(opt => opt.value === selectedVal);

        // Crea un'opzione nascosta che sarà effettivamente selezionata
        if (selectedOption) {
            const topOption = document.createElement('option');
            topOption.value = selectedVal;
            topOption.textContent = selectedOption.text;
            topOption.selected = true;
            select.appendChild(topOption);
        }

        // Se il valore selezionato è "today", omette anche il separatore
        let skipNextSeparator = selectedVal === 'today';

        // Aggiunge le altre opzioni, escludendo quella già selezionata
        options.forEach(option => {
            if (option.value === selectedVal) return; // Skip already selected option

            if (option.separator || option.disabled) {
                if (skipNextSeparator) {
                    skipNextSeparator = false;
                    return;
                }
                const separatorOption = document.createElement('option');
                separatorOption.disabled = true;
                separatorOption.className = option.className || 'day-separator';
                separatorOption.textContent = option.text || '─────────────';
                separatorOption.style.textAlign = 'center';
                select.appendChild(separatorOption);
                return;
            }

            const optElement = document.createElement('option');
            optElement.value = option.value;
            optElement.textContent = option.text;
            optElement.style.textAlign = 'center';

            if (option.shortText) {
                optElement.dataset.short = option.shortText;
            }
            select.appendChild(optElement);
        });
    }

    // Popola inizialmente il select
    populateSelect(selectedValue);

    // Aggiornamento del menu al cambio di selezione
    select.addEventListener('change', function() {
        const newValue = this.value;
        populateSelect(newValue);
    });

    // Gestione speciale per timezone
    if (id === 'timezone') {
        select.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            if (selectedOption && selectedOption.dataset.short) {
                // Imposta il testo abbreviato per la voce selezionata
                selectedOption.textContent = selectedOption.dataset.short;
            }
        });

        // Applica la versione abbreviata all'avvio, se definita
        const initialOption = select.options[select.selectedIndex];
        if (initialOption && initialOption.dataset.short) {
            initialOption.textContent = initialOption.dataset.short;
        }
    }

    wrapper.appendChild(select);
    return wrapper;
}

function createFilteredSelect(id, options, selectedValue) {
    // Wrapper per larghezza uniforme
    const wrapper = document.createElement('div');
    wrapper.className = 'select-wrapper';

    const select = document.createElement('select');
    select.id = id;
    select.className = 'settings-select';

    // Add inline styles to ensure options are centered
    select.style.textAlign = 'center';

    // Funzione interna per popolare il select con esclusione del valore selezionato
    function populateSelect(selectedVal) {
        select.innerHTML = '';

        // Cerca e inserisce l'opzione attualmente selezionata in cima
        const selectedOption = options.find(opt => opt.value === selectedVal);
        if (selectedOption) {
            const currentOption = document.createElement('option');
            currentOption.value = selectedVal;
            currentOption.textContent = selectedOption.text;
            currentOption.selected = true;
            select.appendChild(currentOption);
        }

        // Salta il separatore se "today" è selezionato
        let skipNextSeparator = selectedVal === 'today';
        options.forEach(option => {
            if (option.value === selectedVal) return;

            if (option.separator || option.disabled) {
                if (skipNextSeparator) {
                    skipNextSeparator = false;
                    return;
                }
                const separatorOption = document.createElement('option');
                separatorOption.disabled = true;
                separatorOption.className = option.className || 'day-separator';
                separatorOption.textContent = option.text || '─────────────';
                separatorOption.style.textAlign = 'center';
                select.appendChild(separatorOption);
                return;
            }

            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.text;
            optionElement.style.textAlign = 'center';

            if (option.group) {
                optionElement.dataset.group = option.group;
            }
            if (option.shortText) {
                optionElement.dataset.short = option.shortText;
            }
            select.appendChild(optionElement);
        });
    }

    // Popola il select con il valore iniziale
    populateSelect(selectedValue);

    // Aggiornamento del menu quando il valore cambia
    select.addEventListener('change', function() {
        const newValue = this.value;
        populateSelect(newValue);
    });

    wrapper.appendChild(select);
    return wrapper;
}

/**
 * Creates a number input
 * @param {string} id - The input ID
 * @param {number} value - The initial value
 * @param {number} min - The minimum value
 * @param {number} max - The maximum value
 * @param {number} step - The step value
 * @return {HTMLElement} The created number input
 */
function createNumberInput(id, value, min, max, step) {
    // Usa lo stesso wrapper degli altri controlli per mantenere uniformità
    const wrapper = document.createElement('div');
    wrapper.className = 'select-wrapper';

    // Stile inline per garantire la larghezza corretta anche se il CSS non è caricato completamente
    wrapper.style.width = '160px';
    wrapper.style.display = 'inline-block';

    const input = document.createElement('input');
    input.type = 'number';
    input.id = id;
    input.className = 'settings-number-input';
    input.min = min;
    input.max = max;
    input.step = step;
    input.value = value;

    // Stili inline per garantire coerenza con gli elementi select
    input.style.width = '100%';
    input.style.boxSizing = 'border-box';
    input.style.padding = '8px 10px';
    input.style.borderRadius = '4px';
    input.style.textAlign = 'center';

    // Applica stili specifici per tema chiaro/scuro
    const isLightTheme = document.body.classList.contains('site-theme-light') ||
        document.documentElement.classList.contains('site-theme-light') ||
        document.body.getAttribute('data-theme') === 'light' ||
        document.documentElement.getAttribute('data-theme') === 'light';

    if (isLightTheme) {
        input.style.backgroundColor = '#ffffff';
        input.style.color = '#2e3c4f';
        input.style.border = '1px solid rgba(0, 0, 0, 0.1)';
    } else {
        input.style.backgroundColor = '#151f2e';
        input.style.color = '#ffffff';
        input.style.border = '1px solid rgba(100, 100, 100, 0.4)';
    }

    wrapper.appendChild(input);
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