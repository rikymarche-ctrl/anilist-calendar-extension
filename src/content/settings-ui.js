/**
 * Anilist Weekly Schedule - Settings UI
 * Manages the settings overlay and UI elements in the content page
 */

/**
 * Crea il pulsante delle impostazioni con z-index fisso.
 * @return {HTMLElement} Il pulsante delle impostazioni creato.
 */
window.AnilistCalendar.settingsUI.createSettingsButton = function() {
    const settingsButton = document.createElement('button');
    settingsButton.className = 'calendar-settings-btn header-settings-btn';
    settingsButton.title = 'Open settings';
    settingsButton.innerHTML = '<i class="fa fa-cog" style="font-size: 14px;"></i>';

    // Apre l’overlay delle impostazioni al click
    settingsButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        try {
            // Mostra l’overlay delle impostazioni
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
 * Inizializza i gestori degli eventi per il pulsante delle impostazioni.
 */
window.AnilistCalendar.settingsUI.initSettingsButtonEvents = function() {
    document.addEventListener('mouseover', function(e) {
        // Verifica se si sta passando sopra un elemento del calendario o header
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
                    settingsBtn.style.opacity = '1';
                }, 0);
            }
        }
    });

    document.addEventListener('mouseout', function(e) {
        // Gestisce il mouseout per elementi rilevanti
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

        // Verifica che non si stia passando su un altro elemento rilevante
        if (isRelevantElement) {
            let toElement = e.relatedTarget;
            let isMovingToRelevantElement = false;

            while (toElement && toElement !== document.body) {
                if (toElement.classList && (
                    toElement.classList.contains('anilist-weekly-calendar') ||
                    (toElement.classList.contains('section-header') && toElement.querySelector('.airing-replaced-header')) ||
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
 * Crea un overlay delle impostazioni con sezioni e tab organizzati.
 */
window.AnilistCalendar.settingsUI.createSettingsOverlay = function() {
    // Rimuove eventuali overlay esistenti
    const existingOverlay = document.querySelector('.settings-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }

    // Rilevamento tema tramite più metodi per compatibilità massima
    const siteThemeFromBody = document.body.classList.contains('site-theme-light');
    const dataThemeFromBody = document.body.getAttribute('data-theme') === 'light';
    const dataThemeFromHtml = document.documentElement.getAttribute('data-theme') === 'light';
    const htmlClass = document.documentElement.classList.contains('site-theme-light');

    const isLightTheme = siteThemeFromBody || dataThemeFromBody || dataThemeFromHtml || htmlClass;
    const isHighContrast = document.body.classList.contains('high-contrast') ||
        document.documentElement.classList.contains('high-contrast');

    // Log per il rilevamento del tema
    window.AnilistCalendar.utils.log(`Theme detection: Light theme: ${isLightTheme} (body class: ${siteThemeFromBody}, data-theme: ${dataThemeFromBody}, html data-theme: ${dataThemeFromHtml}, html class: ${htmlClass}), High contrast: ${isHighContrast}`);

    // Crea il container dell'overlay
    const overlayContainer = document.createElement('div');
    overlayContainer.className = 'settings-overlay';

    if (isLightTheme) {
        overlayContainer.classList.add('site-theme-light');
    }
    if (isHighContrast) {
        overlayContainer.classList.add('high-contrast');
    }

    // Crea il pannello delle impostazioni con styling specifico del tema
    const settingsPanel = document.createElement('div');
    settingsPanel.className = 'settings-panel';

    if (isLightTheme) {
        settingsPanel.style.backgroundColor = '#f8f9fa';
        settingsPanel.style.color = '#23252b';
        settingsPanel.style.borderColor = 'rgba(0, 0, 0, 0.1)';
    } else {
        settingsPanel.style.backgroundColor = '#121c28';
        settingsPanel.style.color = '#FFFFFF';
    }

    // Aggiunge header
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

    // Crea il container dei tab
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'settings-tabs';

    // Crea i pulsanti dei tab con styling adeguato per il tema
    const layoutTab = createTabButton('Layout', 'layout-tab', true);
    const calendarTab = createTabButton('Calendar', 'calendar-tab');
    const timeTab = createTabButton('Time', 'time-tab');

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

    // Crea i container per i contenuti dei tab
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
    // CONTENUTO DEL TAB LAYOUT & DISPLAY
    //-----------------------------------------------------
    // Impostazione della modalità di layout
    const currentLayoutMode = window.AnilistCalendar.userPreferences.layoutMode;
    const layoutModeWrapper = createFilteredSelect('layout-mode', [
        { value: 'standard', text: 'Standard' },
        { value: 'compact', text: 'Compact' },
        { value: 'extended', text: 'Gallery' }
    ], currentLayoutMode);

    const layoutModeSelect = layoutModeWrapper.querySelector('select');

    const layoutModeRow = createSettingRow(
        'Layout style',
        'Choose how anime entries are displayed',
        layoutModeWrapper
    );
    layoutContent.appendChild(layoutModeRow);

    // Impostazione del numero massimo di card per giorno (visibile in Gallery mode)
    const maxCardsPerDayRow = createSettingRow(
        'Max cards per day',
        'Maximum number of cards to show per day in Gallery mode (0 = unlimited)',
        createNumberInput('max-cards-per-day', window.AnilistCalendar.userPreferences.maxCardsPerDay || 0, 0, 30, 1)
    );

    maxCardsPerDayRow.style.display =
        (currentLayoutMode === 'extended' || currentLayoutMode === 'grid') ? 'flex' : 'none';

    layoutContent.appendChild(maxCardsPerDayRow);

    // Impostazione dell’allineamento del titolo
    const titleAlignmentRow = createSettingRow(
        'Title alignment',
        'Choose how anime titles are aligned',
        createSelect('title-alignment', [
            { value: 'left', text: 'Left aligned' },
            { value: 'center', text: 'Center aligned' }
        ], window.AnilistCalendar.userPreferences.titleAlignment)
    );
    layoutContent.appendChild(titleAlignmentRow);

    // NUOVA IMPOSTAZIONE: Giustificazione delle colonne
    const columnJustifyRow = createSettingRow(
        'Column justify',
        'Choose how columns are justified in the calendar',
        createSelect('column-justify', [
            { value: 'top', text: 'Top aligned' },
            { value: 'center', text: 'Center aligned' }
        ], window.AnilistCalendar.userPreferences.columnJustify || 'top')
    );
    layoutContent.appendChild(columnJustifyRow);

    // Impostazione per nascondere i giorni vuoti
    const hideEmptyDaysRow = createSettingRow(
        'Hide empty days',
        'Only show days with scheduled episodes',
        createToggle('hide-empty-days', window.AnilistCalendar.userPreferences.hideEmptyDays)
    );
    layoutContent.appendChild(hideEmptyDaysRow);

    if (layoutModeSelect) {
        layoutModeSelect.addEventListener('change', function() {
            const isGalleryMode = this.value === 'extended' || this.value === 'grid';
            maxCardsPerDayRow.style.display = isGalleryMode ? 'flex' : 'none';
        });
    } else {
        console.error("Layout mode select element not found");
    }

    //-----------------------------------------------------
    // CONTENUTO DEL TAB CALENDAR
    //-----------------------------------------------------
    // Impostazione del giorno di inizio con separatore visivo
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

    // Impostazione per mostrare i numeri degli episodi
    const showEpisodeNumbersRow = createSettingRow(
        'Show episode numbers',
        'Display episode numbers in the calendar',
        createToggle('show-episode-numbers', window.AnilistCalendar.userPreferences.showEpisodeNumbers)
    );
    calendarContent.appendChild(showEpisodeNumbersRow);

    //-----------------------------------------------------
    // CONTENUTO DEL TAB TIME & TIMEZONE
    //-----------------------------------------------------
    // Impostazione per mostrare l’orario
    const showTimeRow = createSettingRow(
        'Show time',
        'Display time information for each anime',
        createToggle('show-time', window.AnilistCalendar.userPreferences.showTime)
    );
    timeContent.appendChild(showTimeRow);

    // Impostazione per il formato dell’orario
    const timeFormatRow = createSettingRow(
        'Time format',
        'Choose between countdown or release time',
        createFilteredSelect('time-format', [
            { value: 'release', text: 'Release Time' },
            { value: 'countdown', text: 'Countdown' }
        ], window.AnilistCalendar.userPreferences.timeFormat)
    );
    timeContent.appendChild(timeFormatRow);

    // Select per il fuso orario con nomi abbreviati in visualizzazione ridotta
    const timezoneSelect = document.createElement('select');
    timezoneSelect.id = 'timezone';
    timezoneSelect.className = 'settings-select';
    timezoneSelect.style.textAlign = 'center';

    for (const tz of window.AnilistCalendar.TIMEZONE_OPTIONS) {
        const option = document.createElement('option');
        option.value = tz.value;
        option.textContent = tz.text;
        option.dataset.shortText = tz.shortText;
        option.style.textAlign = 'center';
        if (tz.value === window.AnilistCalendar.userPreferences.timezone) {
            option.selected = true;
            option.textContent = tz.shortText;
        }
        timezoneSelect.appendChild(option);
    }

    timezoneSelect.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        // Ripristina il testo completo per tutte le opzioni
        for (let i = 0; i < this.options.length; i++) {
            const opt = this.options[i];
            const tz = window.AnilistCalendar.TIMEZONE_OPTIONS.find(t => t.value === opt.value);
            if (tz) {
                opt.textContent = tz.text;
            }
        }
        if (selectedOption.dataset.shortText) {
            selectedOption.textContent = selectedOption.dataset.shortText;
        }
    });

    const timezoneWrapper = document.createElement('div');
    timezoneWrapper.className = 'select-wrapper';
    timezoneWrapper.appendChild(timezoneSelect);

    const timezoneRow = createSettingRow(
        'Timezone',
        'Adjust anime airing times to your timezone',
        timezoneWrapper
    );
    timeContent.appendChild(timezoneRow);

    // Aggiunge tutti i contenuti dei tab al pannello
    settingsPanel.appendChild(layoutContent);
    settingsPanel.appendChild(calendarContent);
    settingsPanel.appendChild(timeContent);

    // Aggiunge la funzionalità di cambio tab
    layoutTab.addEventListener('click', () => switchTab('layout-tab'));
    calendarTab.addEventListener('click', () => switchTab('calendar-tab'));
    timeTab.addEventListener('click', () => switchTab('time-tab'));

    // Bottone di salvataggio con styling diretto in base al tema
    const saveContainer = document.createElement('div');
    saveContainer.className = 'settings-save-container';
    saveContainer.style.backgroundColor = isLightTheme ? '#f8f9fa' : '#121c28';

    const saveButton = document.createElement('button');
    saveButton.className = 'settings-save-btn';
    saveButton.innerHTML = '<i class="fa fa-save"></i> Save Changes';

    saveButton.style.backgroundColor = isLightTheme ? '#3577b1' : '#3db4f2';

    // LOGICA DEL BOTTONE SAVE RISCRITTA COMPLETAMENTE PER GESTIRE MEGLIO LE MODIFICHE MULTIPLE
    saveButton.addEventListener('click', () => {
        // Salva i valori precedenti per confronto
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

        // Recupera i nuovi valori dal form
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

        // Conta le modifiche apportate
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

        // Aggiorna l’oggetto delle preferenze
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

        // Salva nel local storage
        window.AnilistCalendar.settings.saveUserPreferences();

        // Determina il messaggio in base alle modifiche
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

        // Mostra la notifica
        window.AnilistCalendar.utils.showNotification(notificationMessage, 'success');

        // Chiude l’overlay
        overlayContainer.classList.remove('active');
        setTimeout(() => {
            overlayContainer.remove();
        }, 300);

        // Aggiorna l’UI senza ricaricare la pagina
        window.AnilistCalendar.calendar.updateUIWithSettings(
            prevTimeFormat,
            prevTimezone,
            prevTitleAlignment,
            prevColumnJustify
        );
    });

    saveContainer.appendChild(saveButton);
    settingsPanel.appendChild(saveContainer);

    // Aggiunge il pannello al container dell’overlay
    overlayContainer.appendChild(settingsPanel);
    document.body.appendChild(overlayContainer);

    // Attiva l’overlay con animazione
    setTimeout(() => {
        overlayContainer.classList.add('active');
    }, 10);

    // Chiude l’overlay cliccando fuori dal pannello
    overlayContainer.addEventListener('click', (e) => {
        if (e.target === overlayContainer) {
            overlayContainer.classList.remove('active');
            setTimeout(() => {
                overlayContainer.remove();
            }, 300);
        }
    });

    // Funzione per gestire il cambio dei tab
    function switchTab(tabId) {
        const tabs = document.querySelectorAll('.settings-tab');
        tabs.forEach(tab => {
            tab.classList.remove('active');
            tab.style.backgroundColor = 'transparent';
            if (isLightTheme) {
                tab.style.color = '#5c728a';
            } else {
                tab.style.color = '#9ca3af';
            }
        });

        const contents = document.querySelectorAll('.tab-content');
        contents.forEach(content => content.classList.remove('active'));

        const activeTab = document.getElementById(tabId);
        activeTab.classList.add('active');
        activeTab.style.backgroundColor = 'rgba(61, 180, 242, 0.1)';
        activeTab.style.color = isLightTheme ? '#3577b1' : '#3db4f2';
        document.getElementById(tabId + '-content').classList.add('active');
    }
};

/**
 * Crea un pulsante per i tab con styling specifico del tema.
 * @param {string} text - Il testo del tab.
 * @param {string} id - L’ID del tab.
 * @param {boolean} isActive - Se il tab è inizialmente attivo.
 * @return {HTMLElement} Il pulsante del tab creato.
 */
function createTabButton(text, id, isActive = false) {
    const button = document.createElement('button');
    button.textContent = text;
    button.id = id;
    button.className = 'settings-tab';
    if (isActive) {
        button.classList.add('active');
        button.style.backgroundColor = 'rgba(61, 180, 242, 0.1)';
    }
    return button;
}

/**
 * Crea una riga di impostazioni composta da etichetta, descrizione e controllo.
 * @param {string} label - L’etichetta dell’impostazione.
 * @param {string} description - La descrizione dell’impostazione.
 * @param {HTMLElement} control - L’elemento di controllo (select, toggle, ecc.).
 * @return {HTMLElement} La riga di impostazioni creata.
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
 * Helper per popolare le opzioni in un elemento select, eliminando il codice duplicato.
 * @param {HTMLSelectElement} select - L’elemento select da popolare.
 * @param {Array} options - L’array di opzioni.
 * @param {string} selectedVal - Il valore attualmente selezionato.
 * @param {Function} [extraAttrsCallback] - Funzione opzionale per impostare attributi extra sugli elementi option.
 */
function populateOptions(select, options, selectedVal, extraAttrsCallback) {
    select.innerHTML = '';
    const selectedOption = options.find(opt => opt.value === selectedVal);
    if (selectedOption) {
        const optionEl = document.createElement('option');
        optionEl.value = selectedVal;
        optionEl.textContent = selectedOption.text;
        optionEl.selected = true;
        select.appendChild(optionEl);
    }
    let skipNextSeparator = selectedVal === 'today';
    options.forEach(option => {
        if (option.value === selectedVal) return;

        if (option.disabled) {
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
        if (extraAttrsCallback && typeof extraAttrsCallback === 'function') {
            extraAttrsCallback(option, optElement);
        }
        select.appendChild(optElement);
    });
}

/**
 * Crea un elemento select generico.
 * @param {string} id - L’ID del select.
 * @param {Array} options - Le opzioni da includere.
 * @param {string} selectedValue - Il valore inizialmente selezionato.
 * @return {HTMLElement} Il wrapper contenente il select.
 */
function createSelect(id, options, selectedValue) {
    const wrapper = document.createElement('div');
    wrapper.className = 'select-wrapper';
    const select = document.createElement('select');
    select.id = id;
    select.className = 'settings-select';
    select.style.textAlign = 'center';

    function populate(selectedVal) {
        populateOptions(select, options, selectedVal, (option, elem) => {
            if (option.shortText) {
                elem.dataset.short = option.shortText;
            }
        });
    }
    populate(selectedValue);

    select.addEventListener('change', function() {
        populate(this.value);
    });

    if (id === 'timezone') {
        select.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            if (selectedOption && selectedOption.dataset.short) {
                selectedOption.textContent = selectedOption.dataset.short;
            }
        });
        const initialOption = select.options[select.selectedIndex];
        if (initialOption && initialOption.dataset.short) {
            initialOption.textContent = initialOption.dataset.short;
        }
    }

    wrapper.appendChild(select);
    return wrapper;
}

/**
 * Crea un elemento select filtrato.
 * @param {string} id - L’ID del select.
 * @param {Array} options - Le opzioni da includere.
 * @param {string} selectedValue - Il valore inizialmente selezionato.
 * @return {HTMLElement} Il wrapper contenente il select.
 */
function createFilteredSelect(id, options, selectedValue) {
    const wrapper = document.createElement('div');
    wrapper.className = 'select-wrapper';
    const select = document.createElement('select');
    select.id = id;
    select.className = 'settings-select';
    select.style.textAlign = 'center';

    function populate(selectedVal) {
        populateOptions(select, options, selectedVal, (option, elem) => {
            if (option.group) {
                elem.dataset.group = option.group;
            }
            if (option.shortText) {
                elem.dataset.short = option.shortText;
            }
        });
    }
    populate(selectedValue);

    select.addEventListener('change', function() {
        populate(this.value);
    });

    wrapper.appendChild(select);
    return wrapper;
}

/**
 * Crea un input di tipo number.
 * @param {string} id - L’ID dell’input.
 * @param {number} value - Il valore iniziale.
 * @param {number} min - Il valore minimo.
 * @param {number} max - Il valore massimo.
 * @param {number} step - L’incremento.
 * @return {HTMLElement} L’elemento input creato.
 */
function createNumberInput(id, value, min, max, step) {
    const wrapper = document.createElement('div');
    wrapper.className = 'select-wrapper';
    wrapper.style.width = '160px';
    wrapper.style.display = 'inline-block';

    const input = document.createElement('input');
    input.type = 'number';
    input.id = id;
    input.className = 'settings-number-input';
    input.min = min.toString();
    input.max = max.toString();
    input.step = step.toString();
    input.value = value.toString();

    input.style.width = '100%';
    input.style.boxSizing = 'border-box';
    input.style.padding = '8px 10px';
    input.style.borderRadius = '4px';
    input.style.textAlign = 'center';

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
 * Crea un interruttore toggle.
 * @param {string} id - L’ID del toggle.
 * @param {boolean} checked - Se il toggle è inizialmente attivo.
 * @return {HTMLElement} L’elemento toggle creato.
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

    slider.style.backgroundColor = checked ? '#3db4f2' : '#2c3e50';

    input.addEventListener('change', function() {
        slider.style.backgroundColor = this.checked ? '#3db4f2' : '#2c3e50';
    });

    toggle.appendChild(input);
    toggle.appendChild(slider);

    return toggle;
}