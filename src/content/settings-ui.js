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
 * Creates a settings overlay with organized sections and tabs.
 */
window.AnilistCalendar.settingsUI.createSettingsOverlay = function() {
    // Remove any existing overlay
    const existingOverlay = document.querySelector('.settings-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }

    // Theme detection using multiple methods for maximum compatibility
    const siteThemeFromBody = document.body.classList.contains('site-theme-light');
    const dataThemeFromBody = document.body.getAttribute('data-theme') === 'light';
    const dataThemeFromHtml = document.documentElement.getAttribute('data-theme') === 'light';
    const htmlClass = document.documentElement.classList.contains('site-theme-light');

    const isLightTheme = siteThemeFromBody || dataThemeFromBody || dataThemeFromHtml || htmlClass;
    const isHighContrast = document.body.classList.contains('high-contrast') ||
        document.documentElement.classList.contains('high-contrast');

    // Log for theme detection
    window.AnilistCalendar.utils.log(`Theme detection: Light theme: ${isLightTheme} (body class: ${siteThemeFromBody}, data-theme: ${dataThemeFromBody}, html data-theme: ${dataThemeFromHtml}, html class: ${htmlClass}), High contrast: ${isHighContrast}`);

    // Create the overlay container
    const overlayContainer = document.createElement('div');
    overlayContainer.className = 'settings-overlay';

    if (isLightTheme) {
        overlayContainer.classList.add('site-theme-light');
    }
    if (isHighContrast) {
        overlayContainer.classList.add('high-contrast');
    }

    // Create the settings panel with theme-specific styling
    const settingsPanel = document.createElement('div');
    settingsPanel.className = 'settings-panel';

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

    // Create tab buttons
    const layoutTab = createTabButton('Layout', 'layout-tab', true);
    const calendarTab = createTabButton('Calendar', 'calendar-tab');
    const timeTab = createTabButton('Time', 'time-tab');

    if (isLightTheme) {
        [layoutTab, calendarTab, timeTab].forEach(tab => {
            tab.classList.add('theme-light');
            if (tab.classList.contains('active')) {
                tab.classList.add('active-light');
            }
        });
    }

    tabsContainer.appendChild(layoutTab);
    tabsContainer.appendChild(calendarTab);
    tabsContainer.appendChild(timeTab);

    settingsPanel.appendChild(tabsContainer);

    // Create containers for tab contents
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
    const layoutModeWrapper = createFixedSelect('layout-mode', [
        { value: 'standard', text: 'Standard' },
        { value: 'compact', text: 'Compact' },
        { value: 'extended', text: 'Gallery' },
    ], currentLayoutMode);

    const layoutModeSelect = layoutModeWrapper.querySelector('select');

    const layoutModeRow = createSettingRow(
        'Layout style',
        'Choose how anime entries are displayed',
        layoutModeWrapper
    );
    layoutContent.appendChild(layoutModeRow);

    // Max cards per day setting (visible only in Gallery layout)
    const maxCardsPerDayRow = createSettingRow(
        'Max cards per day',
        'Maximum number of cards to show per day (0 = unlimited)',
        createCustomNumberInput('max-cards-per-day', window.AnilistCalendar.userPreferences.maxCardsPerDay || 0, 0, 30, 1)
    );

    // Hide by default, will show based on layout
    maxCardsPerDayRow.classList.add('setting-row-hidden');
    if (currentLayoutMode === 'extended') {
        maxCardsPerDayRow.classList.remove('setting-row-hidden');
    }

    layoutContent.appendChild(maxCardsPerDayRow);

    // Full width images setting (only for standard mode)
    const fullWidthImagesRow = createSettingRow(
        'Full width images',
        'Expand images to fill the entire card (standard mode only)',
        createToggle('full-width-images', window.AnilistCalendar.userPreferences.fullWidthImages)
    );

    // Hide by default, will show based on layout
    fullWidthImagesRow.classList.add('setting-row-hidden');
    if (currentLayoutMode === 'standard') {
        fullWidthImagesRow.classList.remove('setting-row-hidden');
    }

    layoutContent.appendChild(fullWidthImagesRow);

    // Title alignment setting
    const titleAlignmentRow = createSettingRow(
        'Title alignment',
        'Choose how anime titles are aligned',
        createFixedSelect('title-alignment', [
            { value: 'left', text: 'Left aligned' },
            { value: 'center', text: 'Center aligned' }
        ], window.AnilistCalendar.userPreferences.titleAlignment)
    );

    // Hide title alignment if in gallery mode
    if (currentLayoutMode === 'extended') {
        titleAlignmentRow.classList.add('setting-row-hidden');
    }

    layoutContent.appendChild(titleAlignmentRow);

    // Column justify setting
    const columnJustifyRow = createSettingRow(
        'Column justify',
        'Choose how columns are justified in the calendar',
        createFixedSelect('column-justify', [
            { value: 'top', text: 'Top aligned' },
            { value: 'center', text: 'Center aligned' }
        ], window.AnilistCalendar.userPreferences.columnJustify || 'top')
    );

    // Column justify è sempre visibile in tutti i layout
    layoutContent.appendChild(columnJustifyRow);

    // Hide empty days setting
    const hideEmptyDaysRow = createSettingRow(
        'Hide empty days',
        'Only show days with scheduled episodes',
        createToggle('hide-empty-days', window.AnilistCalendar.userPreferences.hideEmptyDays)
    );
    layoutContent.appendChild(hideEmptyDaysRow);

    // Layout mode change event handler
    if (layoutModeSelect) {
        layoutModeSelect.addEventListener('change', function() {
            const isGalleryMode = this.value === 'extended';
            const isStandardMode = this.value === 'standard';

            // Toggle visibility of settings based on layout mode
            if (isGalleryMode) {
                maxCardsPerDayRow.classList.remove('setting-row-hidden');
                fullWidthImagesRow.classList.add('setting-row-hidden');
                titleAlignmentRow.classList.add('setting-row-hidden'); // Hide title alignment in gallery mode
            } else {
                maxCardsPerDayRow.classList.add('setting-row-hidden');
                titleAlignmentRow.classList.remove('setting-row-hidden'); // Show title alignment in non-gallery modes

                // Show fullWidthImages setting only for standard mode
                if (isStandardMode) {
                    fullWidthImagesRow.classList.remove('setting-row-hidden');
                } else {
                    fullWidthImagesRow.classList.add('setting-row-hidden');
                }
            }

            // Column justify è sempre visibile in tutti i layout
            columnJustifyRow.classList.remove('setting-row-hidden');

            // Ripristina valori di default specifici per modalità
            if (isGalleryMode) {
                // In modalità gallery, il titolo è sempre centrato
                const titleAlignmentSelect = document.getElementById('title-alignment');
                if (titleAlignmentSelect) {
                    // Fully replace the select to update the selection
                    const titleAlignmentWrapper = titleAlignmentSelect.closest('.select-wrapper');
                    if (titleAlignmentWrapper) {
                        const newWrapper = createFixedSelect('title-alignment', [
                            { value: 'left', text: 'Left aligned' },
                            { value: 'center', text: 'Center aligned' }
                        ], 'center');

                        titleAlignmentWrapper.parentNode.replaceChild(newWrapper, titleAlignmentWrapper);
                    }
                }
            }
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

    const startDaySelect = createFixedSelect('start-day', startDayOptions, window.AnilistCalendar.userPreferences.startDay, true);

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
    // TIME TAB CONTENT
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
        createFixedSelect('time-format', [
            { value: 'release', text: 'Release Time' },
            { value: 'countdown', text: 'Countdown' }
        ], window.AnilistCalendar.userPreferences.timeFormat)
    );
    timeContent.appendChild(timeFormatRow);

    // Add all tab contents to the panel
    settingsPanel.appendChild(layoutContent);
    settingsPanel.appendChild(calendarContent);
    settingsPanel.appendChild(timeContent);

    // Add tab switching functionality
    layoutTab.addEventListener('click', () => switchTab('layout-tab'));
    calendarTab.addEventListener('click', () => switchTab('calendar-tab'));
    timeTab.addEventListener('click', () => switchTab('time-tab'));

    // Save button
    const saveContainer = document.createElement('div');
    saveContainer.className = 'settings-save-container';
    if (isLightTheme) {
        saveContainer.classList.add('theme-light');
    }

    const saveButton = document.createElement('button');
    saveButton.className = 'settings-save-btn';
    if (isLightTheme) {
        saveButton.classList.add('theme-light');
    }
    saveButton.innerHTML = '<i class="fa fa-save"></i> Save Changes';

    // SAVE BUTTON LOGIC
    saveButton.addEventListener('click', () => {
        // Save previous values for comparison
        const prevStartDay = window.AnilistCalendar.userPreferences.startDay;
        const prevHideEmptyDays = window.AnilistCalendar.userPreferences.hideEmptyDays;
        const prevLayoutMode = window.AnilistCalendar.userPreferences.layoutMode;
        const prevTimeFormat = window.AnilistCalendar.userPreferences.timeFormat;
        const prevShowTime = window.AnilistCalendar.userPreferences.showTime;
        const prevShowEpisodeNumbers = window.AnilistCalendar.userPreferences.showEpisodeNumbers;
        const prevTitleAlignment = window.AnilistCalendar.userPreferences.titleAlignment || 'left';
        const prevColumnJustify = window.AnilistCalendar.userPreferences.columnJustify || 'top';
        const prevMaxCardsPerDay = window.AnilistCalendar.userPreferences.maxCardsPerDay || 0;
        const prevFullWidthImages = window.AnilistCalendar.userPreferences.fullWidthImages;

        // Get new values from the form
        const startDay = document.getElementById('start-day').value;
        const hideEmptyDays = document.getElementById('hide-empty-days').checked;
        const layoutMode = document.getElementById('layout-mode').value;
        const timeFormat = document.getElementById('time-format').value;
        const showTime = document.getElementById('show-time').checked;
        const showEpisodeNumbers = document.getElementById('show-episode-numbers').checked;

        // Get title alignment only if not in gallery mode
        let titleAlignment = 'left'; // Default value
        if (layoutMode !== 'extended') {
            titleAlignment = document.getElementById('title-alignment').value;
        }

        // Get column justification (valid for all layouts)
        const columnJustify = document.getElementById('column-justify').value;
        const maxCardsPerDay = parseInt(document.getElementById('max-cards-per-day').value) || 0;
        const fullWidthImages = document.getElementById('full-width-images').checked;

        // Count the changes made
        const changes = [];
        if (prevLayoutMode !== layoutMode) changes.push('layout mode');
        if (prevColumnJustify !== columnJustify) changes.push('column justification');
        if (prevStartDay !== startDay) changes.push('start day');
        if (prevTimeFormat !== timeFormat) changes.push('time format');
        if (prevTitleAlignment !== titleAlignment) changes.push('title alignment');
        if (prevHideEmptyDays !== hideEmptyDays) changes.push('empty days visibility');
        if (prevShowTime !== showTime) changes.push('time display');
        if (prevShowEpisodeNumbers !== showEpisodeNumbers) changes.push('episode numbers');
        if (prevMaxCardsPerDay !== maxCardsPerDay) changes.push('max cards per day');
        if (prevFullWidthImages !== fullWidthImages) changes.push('image layout');

        // Update the preferences object
        window.AnilistCalendar.userPreferences.startDay = startDay;
        window.AnilistCalendar.userPreferences.hideEmptyDays = hideEmptyDays;
        window.AnilistCalendar.userPreferences.layoutMode = layoutMode;
        window.AnilistCalendar.userPreferences.timeFormat = timeFormat;
        window.AnilistCalendar.userPreferences.showTime = showTime;
        window.AnilistCalendar.userPreferences.showEpisodeNumbers = showEpisodeNumbers;
        window.AnilistCalendar.userPreferences.titleAlignment = titleAlignment;
        window.AnilistCalendar.userPreferences.columnJustify = columnJustify;
        window.AnilistCalendar.userPreferences.maxCardsPerDay = maxCardsPerDay;
        window.AnilistCalendar.userPreferences.fullWidthImages = fullWidthImages;

        // Save to local storage
        window.AnilistCalendar.settings.saveUserPreferences();

        // Determine the message based on the changes
        let notificationMessage;
        if (changes.length === 0) {
            notificationMessage = 'No changes detected';
        } else if (changes.length === 1) {
            const capitalized = changes[0].charAt(0).toUpperCase() + changes[0].slice(1);
            notificationMessage = `${capitalized} updated!`;
        } else if (changes.length > 1 && changes.length <= 3) {
            notificationMessage = `Updated: ${changes.join(', ')}`;
        } else {
            notificationMessage = `Multiple settings updated (${changes.length})`;
        }

        // Show notification
        window.AnilistCalendar.utils.showNotification(notificationMessage, 'success');

        // Close overlay
        overlayContainer.classList.remove('active');
        setTimeout(() => {
            overlayContainer.remove();
        }, 300);

        // Always force complete re-rendering of the calendar for all settings
        if (window.AnilistCalendar.state.calendarContainer) {
            // First remove all potentially problematic classes
            window.AnilistCalendar.state.calendarContainer.classList.remove(
                'standard-mode', 'compact-mode', 'extended-mode', 'gallery-with-slider',
                'title-left', 'title-center',
                'column-justify-top', 'column-justify-center',
                'full-width-images'
            );

            // Then update the UI with the new settings
            window.AnilistCalendar.calendar.updateUIWithSettings(
                prevTimeFormat,
                prevTitleAlignment,
                prevColumnJustify,
                prevFullWidthImages,
                prevLayoutMode
            );

            // Always force a complete re-rendering of the calendar
            window.AnilistCalendar.calendar.renderCalendar(
                window.AnilistCalendar.state.weeklySchedule,
                true
            );

            // Force the application of column justification
            window.AnilistCalendar.calendar.forceColumnJustification(columnJustify);
        }
    });

    saveContainer.appendChild(saveButton);
    settingsPanel.appendChild(saveContainer);

    // Add panel to overlay container
    overlayContainer.appendChild(settingsPanel);
    document.body.appendChild(overlayContainer);

    // Activate overlay with animation
    setTimeout(() => {
        overlayContainer.classList.add('active');
    }, 10);

    // Close overlay by clicking outside
    overlayContainer.addEventListener('click', (e) => {
        if (e.target === overlayContainer) {
            overlayContainer.classList.remove('active');
            setTimeout(() => {
                overlayContainer.remove();
            }, 300);
        }
    });

    // Function to handle tab switching
    function switchTab(tabId) {
        const tabs = document.querySelectorAll('.settings-tab');
        tabs.forEach(tab => {
            tab.classList.remove('active');
            if (isLightTheme) {
                tab.classList.remove('active-light');
            }
        });

        const contents = document.querySelectorAll('.tab-content');
        contents.forEach(content => content.classList.remove('active'));

        const activeTab = document.getElementById(tabId);
        activeTab.classList.add('active');
        if (isLightTheme) {
            activeTab.classList.add('active-light');
        }
        document.getElementById(tabId + '-content').classList.add('active');
    }
};

/**
 * Creates a tab button.
 * @param {string} text - The tab text.
 * @param {string} id - The tab ID.
 * @param {boolean} isActive - Whether the tab is initially active.
 * @return {HTMLElement} The created tab button.
 */
function createTabButton(text, id, isActive = false) {
    const button = document.createElement('button');
    button.textContent = text;
    button.id = id;
    button.className = 'settings-tab';
    if (isActive) {
        button.classList.add('active');
    }
    return button;
}

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
 * Crea un elemento select “fissata” in cui la voce selezionata viene mostrata come valore visibile,
 * ma non compare più tra le opzioni del dropdown.
 * Per il caso speciale 'start-day', se 'today' è selezionato, il divisore viene escluso.
 *
 * @param {string} id - L'ID della select.
 * @param {Array} options - Array di opzioni. Ogni opzione può avere:
 *     - value: stringa (ad esempio, "today", "1", "2", …)
 *     - text: stringa da visualizzare
 *     - disabled: (opzionale) se true, indica un divisore o voce non selezionabile
 *     - group: (opzionale) ad esempio "special" o "weekday"
 * @param {string} selectedValue - Il valore inizialmente selezionato.
 * @param {boolean} isSpecial - Indica se questa select necessita della logica speciale (es. start-day).
 * @return {HTMLElement} L'elemento wrapper contenente la select.
 */
function createFixedSelect(id, options, selectedValue, isSpecial = false) {
    const wrapper = document.createElement('div');
    wrapper.className = 'select-wrapper';

    // Funzione per aggiungere un'opzione alla select
    function addOption(selectEl, optionData) {
        const optEl = document.createElement('option');
        optEl.value = optionData.value;
        optEl.textContent = optionData.text;
        if (optionData.className) optEl.className = optionData.className;
        if (optionData.disabled) optEl.disabled = true;
        if (optionData.group) optEl.dataset.group = optionData.group;
        selectEl.appendChild(optEl);
    }

    // Normalizza le opzioni eliminando spazi superflui
    const trimmedOptions = options.map(opt => ({
        ...opt,
        text: opt.text ? opt.text.trim() : ''
    }));

    // Funzione che costruisce il contenuto della select in base al valore selezionato
    function buildSelectContent(currentValue) {
        const newSelect = document.createElement('select');
        newSelect.id = id;
        newSelect.className = 'settings-select';

        // Trova l'opzione selezionata (escludendo eventuali disabled)
        const selectedOpt = trimmedOptions.find(opt => opt.value === currentValue && !opt.disabled) ||
            trimmedOptions.find(opt => !opt.disabled);
        // Aggiunge in cima la voce selezionata
        if (selectedOpt) {
            const selEl = document.createElement('option');
            selEl.value = selectedOpt.value;
            selEl.textContent = selectedOpt.text;
            selEl.selected = true;
            selEl.hidden = true;  // Nasconde l'opzione selezionata dal dropdown
            newSelect.appendChild(selEl);
        }

        // Gestione per il caso speciale (ad esempio 'start-day')
        if (isSpecial && id === 'start-day') {
            if (currentValue === 'today') {
                // Se 'today' è selezionato, non aggiungiamo né 'today' né il divisore;
                // visualizziamo soltanto le opzioni del gruppo 'weekday'
                trimmedOptions.forEach(option => {
                    if (!option.disabled && option.value !== 'today' && option.group === 'weekday') {
                        addOption(newSelect, option);
                    }
                });
            } else {
                // Per valori diversi da 'today':
                // 1. Aggiunge l'opzione 'today'
                const todayOption = trimmedOptions.find(opt => opt.value === 'today');
                if (todayOption) addOption(newSelect, todayOption);
                // 2. Aggiunge il divisore (se presente)
                const divider = trimmedOptions.find(opt => opt.disabled);
                if (divider) {
                    const dividerEl = document.createElement('option');
                    dividerEl.disabled = true;
                    dividerEl.className = divider.className || 'day-separator';
                    dividerEl.textContent = divider.text || '─────────────';
                    newSelect.appendChild(dividerEl);
                }
                // 3. Aggiunge le opzioni del gruppo 'weekday', escludendo quella attualmente selezionata
                trimmedOptions.forEach(option => {
                    if (!option.disabled && option.value !== currentValue && option.group === 'weekday') {
                        addOption(newSelect, option);
                    }
                });
            }
        } else {
            // Caso standard: aggiunge tutte le opzioni non disabilitate tranne quella selezionata
            trimmedOptions.forEach(option => {
                if (!option.disabled && option.value !== currentValue) {
                    addOption(newSelect, option);
                }
            });
        }
        return newSelect;
    }

    // Funzione che gestisce l'evento di cambio e ricostruisce la select
    function updateSelect() {
        const newValue = this.value;
        const newSelect = buildSelectContent(newValue);
        // Riapplica lo stesso gestore alla nuova select
        newSelect.addEventListener('change', updateSelect);
        this.parentNode.replaceChild(newSelect, this);
    }

    // Crea la select iniziale e registrane l'evento di change
    const initialSelect = buildSelectContent(selectedValue);
    initialSelect.addEventListener('change', updateSelect);
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