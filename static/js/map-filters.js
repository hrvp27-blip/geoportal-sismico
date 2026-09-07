import { pointInPolygon, getDistanceToPolygon } from './map-utils.js';
import { renderInChunks, updateLegend } from './map-render.js';
import { calculateGutenbergRichter, renderRichterFromCache } from './map-analysis.js';

// ─── Helpers de fecha ────────────────────────────────────────────────────────

function parseFlexibleDate(rawValue) {
    if (!rawValue) return null;
    if (rawValue instanceof Date) return Number.isNaN(rawValue.getTime()) ? null : rawValue;

    const text = `${rawValue}`.trim();
    if (!text) return null;

    const nativeParsed = new Date(text);
    if (!Number.isNaN(nativeParsed.getTime())) return nativeParsed;

    const normalized = text.replace(/\./g, '/').replace(/-/g, '/');
    const match = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(.*))?$/);
    if (!match) return null;

    const [, day, month, yearRaw, timeRaw = '00:00:00'] = match;
    const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
    const parsed = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timeRaw}`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDateBoundary(value, isEnd = false) {
    if (!value) return null;
    return parseFlexibleDate(`${value}T${isEnd ? '23:59:59.999' : '00:00:00.000'}`);
}

function isDateInRange(rawDate, startDate, endDate) {
    if (!startDate && !endDate) return true;
    const parsed = parseFlexibleDate(rawDate);
    if (!parsed) return false;
    if (startDate && parsed < startDate) return false;
    if (endDate && parsed > endDate) return false;
    return true;
}

function getNumericInputValue(id, fallback) {
    const rawValue = document.getElementById(id)?.value;
    if (rawValue === undefined || rawValue === null || `${rawValue}`.trim() === '') return fallback;
    const parsed = Number.parseFloat(`${rawValue}`.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : fallback;
}

// ─── Utilidades de catálogo ──────────────────────────────────────────────────

function getVisibleCatalogFeatures(appState) {
    const catalogs = appState.catalogLayers || [];
    if (!catalogs.length) return appState.allCurrentGeoJSON?.features || [];
    return catalogs.filter(c => c.visible !== false).flatMap(c => c.features || []);
}

// ─── Exportadas ──────────────────────────────────────────────────────────────

export function updateFilterRanges(features) {
    if (!features?.length) return;

    let minMag = Infinity, maxMag = -Infinity;
    let minDepth = Infinity, maxDepth = -Infinity;
    let minDate = null, maxDate = null;

    features.forEach(f => {
        const mag = Number(f.properties?.magnitude);
        if (Number.isFinite(mag)) {
            if (mag < minMag) minMag = mag;
            if (mag > maxMag) maxMag = mag;
        }
        const depth = Number(f.properties?.depth);
        if (Number.isFinite(depth)) {
            if (depth < minDepth) minDepth = depth;
            if (depth > maxDepth) maxDepth = depth;
        }
        const dateStr = f.properties?.date || f.properties?.fecha;
        if (dateStr) {
            const d = parseFlexibleDate(dateStr);
            if (d && !Number.isNaN(d.getTime())) {
                if (!minDate || d < minDate) minDate = d;
                if (!maxDate || d > maxDate) maxDate = d;
            }
        }
    });

    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    const fmt    = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];

    if (minMag !== Infinity)   setVal('mag_min',    Math.floor(minMag * 10) / 10);
    if (maxMag !== -Infinity)  setVal('mag_max',    Math.ceil(maxMag * 10) / 10);
    if (minDepth !== Infinity) setVal('depth_min',  Math.floor(minDepth));
    if (maxDepth !== -Infinity) setVal('depth_max', Math.ceil(maxDepth));
    if (minDate) setVal('date_start', fmt(minDate));
    if (maxDate) setVal('date_end',   fmt(maxDate));
}

export function updateDashboardBadges(visibleCount, zoneCount, hasZone) {
    const t = (key, params) => window.geoportalLanguage?.translate(key, params) || key;
    const eventsBadge  = document.getElementById('eventsCountBadge');
    const zoneBadge    = document.getElementById('zoneCountBadge');
    const summaryBadge = document.getElementById('filterSummaryBadge');
    if (eventsBadge)  eventsBadge.innerText  = window.geoportalLanguage?.translate('visibleEarthquakesCount', { count: visibleCount }) || `${visibleCount}`;
    if (zoneBadge)    zoneBadge.innerText    = hasZone ? window.geoportalLanguage?.translate('zoneCountActive', { count: zoneCount }) || `${zoneCount}` : t('noZoneSelected');
    if (summaryBadge) summaryBadge.innerText = hasZone ? t('zonalAnalysisActive') : t('globalFilterActive');
}

export function applyCompletenessFilter(features, criteria) {
    if (!criteria?.length) return features;
    const sorted = [...criteria].sort((a, b) => b.mc - a.mc);
    return features.filter(feature => {
        const dateStr = feature.properties?.date ?? feature.properties?.fecha;
        if (!dateStr) return true;
        const year = new Date(dateStr).getFullYear();
        if (isNaN(year)) return true;
        const mag = Number(feature.properties?.magnitude ?? 0);
        const row = sorted.find(c => (c.mc ?? 0) <= mag);
        if (!row) return false;
        return year >= (row.yearStart ?? row.year ?? 0);
    });
}

export function applyFilters(appState, event) {
    if (event?.preventDefault) event.preventDefault();

    const baseFeatures  = getVisibleCatalogFeatures(appState);
    const minMag        = getNumericInputValue('mag_min', -Infinity);
    const maxMag        = getNumericInputValue('mag_max', Infinity);
    const minDepth      = getNumericInputValue('depth_min', -Infinity);
    const maxDepth      = getNumericInputValue('depth_max', Infinity);
    const startDate     = toDateBoundary(document.getElementById('date_start')?.value, false);
    const endDate       = toDateBoundary(document.getElementById('date_end')?.value, true);
    const filterByComp  = !!document.getElementById('filter_completeness')?.checked;

    const noDataHint = document.getElementById('completenessNoDataHint');
    if (noDataHint) {
        const hasCriteria = appState.completenessCriteria?.length > 0;
        noDataHint.classList.toggle('is-hidden', !filterByComp || hasCriteria);
    }

    if (!baseFeatures.length) {
        renderInChunks([], appState, { skipAnalysis: true });
        updateLegend([]);
        calculateGutenbergRichter([], appState, { renderRichterFromCache });
        updateDashboardBadges(0, 0, Boolean(appState.selectedZoneGeoJSON?.geometry));

        const emptyStatus = document.getElementById('statusMessage');
        const t = (key, params) => window.geoportalLanguage?.translate(key, params) || key;
        if (emptyStatus) emptyStatus.innerText = t('loadCatalogInstruction');
        return [];
    }

    const filtered = baseFeatures.filter(feature => {
        const mag   = Number(feature.properties?.magnitude);
        const depth = Number(feature.properties?.depth);
        return Number.isFinite(mag)   && mag   >= minMag   && mag   <= maxMag
            && Number.isFinite(depth) && depth >= minDepth && depth <= maxDepth
            && isDateInRange(feature.properties?.date ?? feature.properties?.fecha, startDate, endDate);
    });

    const filteredWithComp = (filterByComp && appState.completenessCriteria?.length)
        ? applyCompletenessFilter(filtered, appState.completenessCriteria)
        : filtered;

    let featuresForAnalysis = filteredWithComp;
    let featuresForViz      = filteredWithComp;

    if (appState.selectedZoneGeoJSON?.geometry) {
        featuresForAnalysis = [];
        featuresForViz      = [];
        const zoneGeom = appState.selectedZoneGeoJSON.geometry;

        filteredWithComp.forEach(feature => {
            const [lon, lat] = feature.geometry.coordinates || [];
            if (pointInPolygon(lon, lat, zoneGeom)) {
                featuresForAnalysis.push(feature);
                featuresForViz.push(feature);
            } else if (getDistanceToPolygon(lon, lat, zoneGeom) <= 50) {
                featuresForViz.push(feature);
            }
        });
    }

    appState.analysisFeatures = featuresForAnalysis;

    renderInChunks(featuresForViz, appState, { skipAnalysis: true });
    updateLegend(featuresForViz);
    calculateGutenbergRichter(featuresForAnalysis, appState, { renderRichterFromCache });
    updateDashboardBadges(featuresForViz.length, featuresForAnalysis.length, Boolean(appState.selectedZoneGeoJSON?.geometry));

    const t = (key, params) => window.geoportalLanguage?.translate(key, params) || key;
    const status = document.getElementById('statusMessage');
    if (status) {
        status.innerText = appState.selectedZoneGeoJSON?.geometry
            ? t('filtersAppliedWithZone', { visible: featuresForViz.length, analysis: featuresForAnalysis.length })
            : t('filtersAppliedNoZone', { visible: featuresForViz.length });
    }

    return featuresForViz;
}
