import { createLeafletWidget } from './widget-factory.js';

let filterControlInstance = null;
let widgetHandlers = {};

function buildFilterBody(body) {
    const t = key => window.geoportalLanguage?.translate(key) || key;

    const form = L.DomUtil.create('form', 'filter-form-widget', body);
    form.id = 'filterForm';
    form.noValidate = true;
    form.addEventListener('submit', event => widgetHandlers.applyFilters(event));

    const magGroup = L.DomUtil.create('div', 'filter-group', form);
    magGroup.innerHTML = `
        <div class="filter-group-label">
            <i class="fas fa-wave-square"></i>
            <span data-i18n="filterLabelMagnitude">${t('filterLabelMagnitude')}</span>
        </div>
        <div class="filter-range-row">
            <input type="number" id="mag_min" name="mag_min" step="0.1"
                   placeholder="${t('filterPlaceholderMin')}" data-i18n-placeholder="filterPlaceholderMin">
            <span class="filter-range-sep">—</span>
            <input type="number" id="mag_max" name="mag_max" step="0.1"
                   placeholder="${t('filterPlaceholderMax')}" data-i18n-placeholder="filterPlaceholderMax">
        </div>`;

    const depthGroup = L.DomUtil.create('div', 'filter-group', form);
    depthGroup.innerHTML = `
        <div class="filter-group-label">
            <i class="fas fa-arrow-down"></i>
            <span data-i18n="filterLabelDepth">${t('filterLabelDepth')}</span>
        </div>
        <div class="filter-range-row">
            <input type="number" id="depth_min" name="depth_min" step="1"
                   placeholder="${t('filterPlaceholderMin')}" data-i18n-placeholder="filterPlaceholderMin">
            <span class="filter-range-sep">—</span>
            <input type="number" id="depth_max" name="depth_max" step="1"
                   placeholder="${t('filterPlaceholderMax')}" data-i18n-placeholder="filterPlaceholderMax">
        </div>`;

    const dateGroup = L.DomUtil.create('div', 'filter-group', form);
    dateGroup.innerHTML = `
        <div class="filter-group-label">
            <i class="fas fa-calendar-alt"></i>
            <span data-i18n="filterLabelDate">${t('filterLabelDate')}</span>
        </div>
        <div class="filter-range-row">
            <input type="date" id="date_start" name="date_start">
            <span class="filter-range-sep">—</span>
            <input type="date" id="date_end" name="date_end">
        </div>`;

    const completenessGroup = L.DomUtil.create('div', 'filter-group', form);
    completenessGroup.innerHTML = `
        <label class="filter-switch-row" id="completenessFilterRow">
            <span class="filter-switch-label">
                <i class="fas fa-check-double"></i>
                <span data-i18n="filterLabelCompleteness">${t('filterLabelCompleteness')}</span>
            </span>
            <input type="checkbox" id="filter_completeness" name="filter_completeness" disabled>
        </label>
        <p class="filter-completeness-hint is-hidden" id="completenessNoDataHint" data-i18n="filterCompletenessNoData">${t('filterCompletenessNoData')}</p>`;

    form.querySelectorAll('input').forEach(input => {
        const eventName = (input.type === 'number' || input.type === 'date') ? 'input' : 'change';
        input.addEventListener(eventName, widgetHandlers.scheduleFilterRefresh);
    });
}

export function initFilterWidget(mapInstance, handlers) {
    widgetHandlers = handlers;
    if (filterControlInstance) { mapInstance.removeControl(filterControlInstance); filterControlInstance = null; }

    filterControlInstance = createLeafletWidget({
        position:       'topleft',
        cssClass:       'filter-control-custom',
        btnClass:       'filter-btn-toggle',
        panelClass:     'filter-panel',
        icon:           '<i class="fas fa-sliders-h"></i>',
        titleKey:       'filterControlTitle',
        contentBuilder: buildFilterBody
    });

    filterControlInstance.addTo(mapInstance);
}
