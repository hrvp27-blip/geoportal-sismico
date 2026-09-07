import { renderInChunks, updateLegend, getDefaultZoneStyle, getZoneHoverStyle, registerLegendZone, clearLegendZones } from './map-render.js';
import { calculateGutenbergRichter, renderRichterFromCache } from './map-analysis.js';
import { generateId, pointInPolygon, generateZoneColor } from './map-utils.js';
import { addCatalogLayerControl, addZoneLayerControl, clearLayerWidget, updateLayerUploadStatus, removeZoneLayerControl, removeCatalogLayerControl } from './layerWidget.js';
import { isMatrixCSV, parseMatrixCSV, parseStandardCSV, parseCompletenessCSV } from './map-parse.js';
import { applyFilters, updateFilterRanges, updateDashboardBadges } from './map-filters.js';
import { changeZoneColor, updateQuickZoneSelector, deleteZone, clearZoneSelection } from './map-zones.js';

const t = (key, params) => window.geoportalLanguage?.translate(key, params) || key;

function resetUploadZoneAfterDelay(btnId, delay = 10000) {
    setTimeout(() => window.clearUploadZone?.(btnId), delay);
}

function rebuildAllCurrentGeoJSON(appState) {
    const allFeatures = (appState.catalogLayers || []).flatMap(c => c.features || []);
    appState.allCurrentGeoJSON = { type: 'FeatureCollection', features: allFeatures };
    return allFeatures;
}

// ─── Catálogo CSV ────────────────────────────────────────────────────────────

export function deleteCatalog(appState, catalogId) {
    const idx = (appState.catalogLayers || []).findIndex(c => c.id === catalogId);
    if (idx === -1) return;
    appState.catalogLayers.splice(idx, 1);
    rebuildAllCurrentGeoJSON(appState);
    removeCatalogLayerControl(catalogId);
    applyFilters(appState);
    if (appState.catalogLayers.length === 0) updateLayerUploadStatus(t('layerStatusNone'));
}

export function uploadCatalogo(appState) {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput?.files?.[0];
    if (!file) { alert(t('selectCsvFile')); return; }

    document.getElementById('statusMessage').innerText = t('processingCatalog');

    Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: results => {
            const features = isMatrixCSV(results.data)
                ? parseMatrixCSV(results.data)
                : parseStandardCSV(results.data);

            if (!features.length) {
                const msg = t('invalidCatalogData');
                console.warn(msg, results.data);
                document.getElementById('statusMessage').innerText = msg;
                updateLayerUploadStatus(msg);
                return;
            }

            const catalogId   = generateId('catalog');
            const catalogName = `${t('catalogLabel') || 'Catalog'} ${appState.catalogLayers.length + 1}`;
            appState.catalogLayers.push({ id: catalogId, name: catalogName, features, visible: true });

            rebuildAllCurrentGeoJSON(appState);
            addCatalogLayerControl(catalogId, `${catalogName} (${features.length})`, () => deleteCatalog(appState, catalogId));
            resetUploadZoneAfterDelay('uploadCSV');

            updateLayerUploadStatus(window.geoportalLanguage?.translate('catalogLoadedWithCount', { name: catalogName, count: features.length }) || `Catalog loaded: ${catalogName} (${features.length} events)`);
            document.getElementById('statusMessage').innerText = window.geoportalLanguage?.translate('catalogLoadedSimple', { count: features.length }) || `Catalog loaded: ${features.length} events`;

            updateFilterRanges(appState.allCurrentGeoJSON.features);
            applyFilters(appState);
        },
        error: err => {
            console.error(err);
            document.getElementById('statusMessage').innerText = t('errorLoadingCsv') || 'Error loading CSV';
        }
    });
}

// ─── Zonas SHP ───────────────────────────────────────────────────────────────

export function uploadSHP(appState) {
    const fileInput = document.getElementById('shpInput');
    const file = fileInput?.files?.[0];
    if (!file) { alert(t('selectShpFile')); return; }

    const reader = new FileReader();
    reader.onload = async () => {
        try {
            const shpParser = window.shp || (typeof shp !== 'undefined' ? shp : null);
            if (!shpParser) {
                const errMsg = t('shpjsMissing');
                console.error(errMsg);
                document.getElementById('statusMessage').innerText = errMsg;
                updateLayerUploadStatus(errMsg);
                return;
            }

            const rawData = await shpParser(reader.result);
            const shpData = Array.isArray(rawData)
                ? { type: 'FeatureCollection', features: rawData.flatMap(item => item?.features || []) }
                : rawData;

            if (!shpData?.features?.length) {
                document.getElementById('statusMessage').innerText = t('noValidZones');
                return;
            }

            const zoneId       = generateId('zone');
            const baseZoneName = file.name?.replace(/\.[^.]+$/, '') || `${t('zoneLabelFallback') || 'Zona'} ${appState.zoneLayers.length + 1}`;
            const zoneName     = shpData.features.length > 1 ? `${baseZoneName} (${shpData.features.length})` : baseZoneName;
            let featureCounter = 0;

            const getZoneFeatureLabel = (feature, index) => {
                const props = feature?.properties || {};
                const keys  = ['name', 'nombre', 'zona', 'zone', 'source_name', 'source', 'id', 'codigo', 'code', 'label'];
                for (const k of keys) { if (props[k]) return `${props[k]}`.trim(); }
                return `${baseZoneName} ${index + 1}`;
            };

            const layer = L.geoJSON(shpData, {
                pane: 'zonesPane',
                style: () => getDefaultZoneStyle(),
                interactive: true,
                onEachFeature: (feature, featureLayer) => {
                    const featureId = feature._featureId || generateId('zone_feature');
                    feature._featureId = featureId;
                    feature.properties = feature.properties || {};
                    feature.properties._displayName = getZoneFeatureLabel(feature, featureCounter);
                    featureCounter++;
                    featureLayer.featureId = featureId;
                    featureLayer.zoneId    = zoneId;
                    appState.zoneFeatureLayers[featureId] = featureLayer;

                    featureLayer.bindTooltip(t('clickToAnalyzeZone') || 'Click to analyze this zone', { sticky: true, direction: 'top', opacity: 0.92 });

                    featureLayer.on('click', event => {
                        L.DomEvent.stopPropagation(event);
                        if (typeof window.selectZoneById === 'function') window.selectZoneById(zoneId, featureId);
                    });

                    featureLayer.on('mouseover', () => {
                        if (appState.selectedZoneFeatureId !== featureId && featureLayer.setStyle) {
                            const zoneObj = (appState.zoneLayers || []).find(z => z.id === zoneId);
                            featureLayer.setStyle(getZoneHoverStyle(zoneObj?.color));
                        }
                    });

                    featureLayer.on('mouseout', () => {
                        if (typeof window.styleZoneLayers === 'function') window.styleZoneLayers();
                    });
                }
            }).addTo(appState.zonasLayer);

            if (layer.bringToBack) layer.bringToBack();

            const zoneColor = generateZoneColor();
            appState.zoneLayers.push({ id: zoneId, name: zoneName, layer, geojson: shpData, visible: true, color: zoneColor });

            addZoneLayerControl(zoneId, zoneName, zoneColor, newColor => changeZoneColor(zoneId, newColor, appState));
            registerLegendZone(zoneId, zoneName, zoneColor);
            resetUploadZoneAfterDelay('uploadSHP');
            if (appState.zoneLayers.length === 1) window.openLayerWidget?.();
            updateQuickZoneSelector(appState);
            updateLayerUploadStatus(t('zonesLoaded', { count: shpData.features.length }));
            document.getElementById('statusMessage').innerText = t('zonesLoaded', { count: shpData.features.length });

            if (typeof window.styleZoneLayers === 'function') window.styleZoneLayers();
            if (layer.getBounds?.().isValid?.()) appState.map.fitBounds(layer.getBounds(), { maxZoom: 12, padding: [20, 20] });

            // Fallback de eventos ratón para Canvas Renderer
            if (!appState.map._zoneEventsFallback) {
                appState.map._zoneEventsFallback = true;
                let lastHoveredId = null;
                let moveTimeout   = null;

                const findIntersectingZone = (lng, lat) => {
                    for (const zone of (appState.zoneLayers || []).filter(z => z.visible !== false)) {
                        if (!zone.layer?.eachLayer) continue;
                        let hitLayer = null, hitFeatureId = null;
                        zone.layer.eachLayer(fl => {
                            if (hitLayer) return;
                            if (fl.feature?.geometry && pointInPolygon(lng, lat, fl.feature.geometry)) {
                                hitLayer = fl;
                                hitFeatureId = fl.featureId || fl.feature._featureId;
                            }
                        });
                        if (hitLayer) return { zoneId: zone.id, featureId: hitFeatureId, featureLayer: hitLayer };
                    }
                    return null;
                };

                appState.map.on('click', e => {
                    const hit = findIntersectingZone(e.latlng.lng, e.latlng.lat);
                    if (hit && typeof window.selectZoneById === 'function') window.selectZoneById(hit.zoneId, hit.featureId);
                });

                appState.map.on('mousemove', e => {
                    if (moveTimeout) return;
                    moveTimeout = requestAnimationFrame(() => {
                        moveTimeout = null;
                        const hit          = findIntersectingZone(e.latlng.lng, e.latlng.lat);
                        const currentHitId = hit ? hit.featureId : null;
                        if (currentHitId !== lastHoveredId) {
                            if (lastHoveredId && typeof window.styleZoneLayers === 'function') window.styleZoneLayers();
                            if (hit?.featureLayer?.setStyle && appState.selectedZoneFeatureId !== currentHitId) {
                                const zoneObj = (appState.zoneLayers || []).find(z => z.id === hit.featureLayer.zoneId);
                                hit.featureLayer.setStyle(getZoneHoverStyle(zoneObj?.color));
                            }
                            lastHoveredId = currentHitId;
                        }
                    });
                });
            }
        } catch (err) {
            console.error(err);
            document.getElementById('statusMessage').innerText = t('errorReadingShp') || 'Error reading SHP';
        }
    };

    reader.readAsArrayBuffer(file);
}

// ─── Completitud ─────────────────────────────────────────────────────────────

function renderCompletenessPanel(criteria) {
    const body = document.getElementById('completeness-body');
    if (!body) return;

    if (!criteria?.length) {
        body.innerHTML = `<p class="empty-msg">${t('completenessEmptyMsg') || 'Sin datos cargados'}</p>`;
        return;
    }

    const rows = criteria
        .slice()
        .sort((a, b) => (a.mc ?? 0) - (b.mc ?? 0))
        .map(c => `<tr>
            <td>${c.yearStart ?? c.year ?? '—'}</td>
            <td><strong>M ≥ ${(c.mc ?? 0).toFixed(1)}</strong></td>
        </tr>`).join('');

    body.innerHTML = `
        <table class="comp-table">
            <thead><tr>
                <th>${t('completenessYear') || 'Desde el año'}</th>
                <th>${t('completenessMc')   || 'Mc'}</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}

export function uploadCompleteness(appState) {
    const fileInput = document.getElementById('compInput');
    const file = fileInput?.files?.[0];
    if (!file) return;

    function processText(rawText) {
        const criteria = parseCompletenessCSV(rawText);
        appState.completenessCriteria = criteria;
        renderCompletenessPanel(criteria);
        document.getElementById('completeness-floating-table')?.classList.add('is-open');
        const cb = document.getElementById('filter_completeness');
        if (cb) cb.disabled = false;
        const statusEl = document.getElementById('statusMessage');
        if (statusEl) statusEl.innerText = t('completenessLoaded', { count: criteria.length });
        resetUploadZoneAfterDelay('uploadCompleteness');
        if (appState.allCurrentGeoJSON?.features?.length > 0) applyFilters(appState);
    }

    const reader = new FileReader();
    reader.onload = event => {
        const utf8text = event.target.result;
        const badRatio = (utf8text.match(/�/g) || []).length / (utf8text.length || 1);
        if (badRatio > 0.01) {
            const r2 = new FileReader();
            r2.onload = e => processText(e.target.result);
            r2.readAsText(file, 'windows-1252');
        } else {
            processText(utf8text);
        }
    };
    reader.readAsText(file);
}

// ─── Exportación ─────────────────────────────────────────────────────────────

export function downloadCSV(appState) {
    const features = appState.filteredFeatures?.length
        ? appState.filteredFeatures
        : (appState.allCurrentGeoJSON?.features || []);

    const headers = ['id', 'latitude', 'longitude', 'magnitude', 'depth', 'date'];
    const rows    = features.map((f, i) => {
        const [lon, lat] = f.geometry.coordinates || ['', ''];
        return `${i + 1},${lat},${lon},${f.properties?.magnitude ?? ''},${f.properties?.depth ?? ''},${f.properties?.date ?? ''}`;
    });

    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'terremotos_export.csv');
    link.click();
}

export function exportJSON(appState) {
    const rawFeatures = appState.selectedZoneGeoJSON?.geometry && appState.analysisFeatures?.length
        ? appState.analysisFeatures
        : (appState.filteredFeatures?.length ? appState.filteredFeatures : (appState.allCurrentGeoJSON?.features || []));

    if (!rawFeatures.length) {
        alert(t('noDataToExport') || 'No hay datos para exportar.');
        return;
    }

    const features = rawFeatures.map(f => ({
        type: 'Feature',
        geometry: f.geometry,
        properties: Object.fromEntries(Object.entries(f.properties || {}).filter(([k]) => !k.startsWith('_')))
    }));

    const url  = URL.createObjectURL(new Blob([JSON.stringify({ type: 'FeatureCollection', features }, null, 2)], { type: 'application/json' }));
    const tab  = window.open(url, '_blank');
    if (!tab) {
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'terremotos_export.geojson');
        link.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// ─── Limpieza ────────────────────────────────────────────────────────────────

function limpiarSismos(appState) {
    appState.earthquakeLayer?.clearLayers();
    appState.ellipsesLayer?.clearLayers();
    appState.editTrailsLayer?.clearLayers();

    appState.allCurrentGeoJSON = { type: 'FeatureCollection', features: [] };
    appState.catalogLayers     = [];
    appState.filteredFeatures  = [];
    appState.analysisFeatures  = null;
    appState.activeEditMarkers = [];
    appState.editHistory       = [];
    appState.analysisCache     = null;

    ['mag_min', 'mag_max', 'depth_min', 'depth_max', 'date_start', 'date_end'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    document.getElementById('comparative_table')?.replaceChildren();
    updateLegend([]);
    renderRichterFromCache(null);

    document.getElementById('statusMessage').innerText = t('earthquakesCleared');
}

export function limpiarMapa(appState) {
    limpiarSismos(appState);

    appState.zonasLayer?.clearLayers();
    appState.zoneLayers        = [];
    appState.zoneFeatureLayers = {};
    appState.selectedZoneId        = null;
    appState.selectedZoneFeatureId = null;
    appState.selectedZoneName      = null;
    appState.selectedZoneGeoJSON   = null;

    document.getElementById('selectedZoneInfo')?.classList.remove('is-visible');
    const selectedZoneName = document.getElementById('selectedZoneName');
    if (selectedZoneName) selectedZoneName.innerText = '';
    const subtitle = document.getElementById('headerSubtitle');
    if (subtitle) subtitle.innerText = t('sidebarSubtitle');

    updateDashboardBadges(0, 0, false);

    appState.completenessCriteria = [];
    renderCompletenessPanel([]);
    document.getElementById('completeness-floating-table')?.classList.remove('is-open');
    const cb = document.getElementById('filter_completeness');
    if (cb) { cb.checked = false; cb.disabled = true; }

    clearLayerWidget();
    clearLegendZones();
    updateQuickZoneSelector(appState);
    document.getElementById('statusMessage').innerText = t('mapCleaned');
}
