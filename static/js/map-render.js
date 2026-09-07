import { createEarthquakeIcon, reverseGeocode, pointInPolygon, getColorByMagnitude, MAGNITUDE_COLORS, DEFAULT_MAGNITUDE_COLORS, makePopupHtml, drawErrorEllipse, isInsideEllipse } from './map-utils.js';
import { setActiveZoneControl } from './layerWidget.js';
import { calculateGutenbergRichter, renderRichterFromCache } from './map-analysis.js';

const DEFAULT_ZONE_STYLE = {
    pane: 'zonesPane',
    weight: 2,
    opacity: 0.7,
    fillOpacity: 0.06
};

const SELECTED_ZONE_STYLE = {
    pane: 'zonesPane',
    weight: 3,
    opacity: 1,
    fillOpacity: 0.18
};

const HOVER_ZONE_STYLE = {
    pane: 'zonesPane',
    weight: 3,
    opacity: 1,
    fillOpacity: 0.12
};

export function getVisibleFeatures(appState) {
    const visible = [];
    if (!appState?.earthquakeLayer) return visible;

    appState.earthquakeLayer.eachLayer((layer) => {
        if (!layer) return;
        if (layer.feature) visible.push(layer.feature);
        if (typeof layer.getLayers === 'function') {
            layer.getLayers().forEach((child) => {
                if (child?.feature) visible.push(child.feature);
            });
        }
    });

    return visible;
}

// Registro de zonas para la leyenda
const legendZones = new Map(); // zoneId → { name, color }
let _lastLegendFeatures = [];

export function registerLegendZone(zoneId, name, color) {
    legendZones.set(zoneId, { name, color });
    updateLegend(_lastLegendFeatures);
}

export function unregisterLegendZone(zoneId) {
    legendZones.delete(zoneId);
    updateLegend(_lastLegendFeatures);
}

export function updateLegendZoneColor(zoneId, color) {
    const entry = legendZones.get(zoneId);
    if (entry) { entry.color = color; updateLegend(_lastLegendFeatures); }
}

export function clearLegendZones() {
    legendZones.clear();
    updateLegend(_lastLegendFeatures);
}

export function updateLegend(features = []) {
    _lastLegendFeatures = features;
    const container = document.getElementById('legendContent');
    if (!container) return;

    const t = window.geoportalLanguage?.translate || ((key) => key);

    const legendDefs = [
        { range: '< 2.0',     idx: 0 },
        { range: '2.0 – 3.9', idx: 1 },
        { range: '4.0 – 5.4', idx: 2 },
        { range: '5.5 – 6.9', idx: 3 },
        { range: '7.0 – 8.4', idx: 4 },
        { range: '≥ 8.5',     idx: 5 }
    ];

    container.innerHTML = '';
    const box = document.createElement('div');
    box.className = 'legend-box';

    legendDefs.forEach(({ range, idx }) => {
        const colorEntry = MAGNITUDE_COLORS[idx];
        const color = colorEntry?.color || '#ccc';
        const defaultColor = DEFAULT_MAGNITUDE_COLORS[idx] || '#ccc';

        const row = document.createElement('div');
        row.className = 'legend-row';

        const pickerLabel = document.createElement('label');
        pickerLabel.className = 'legend-color-picker';
        pickerLabel.title = t('legendColorPickerTip') || 'Click to change color';

        const NS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('width', '20');
        svg.setAttribute('height', '20');
        svg.setAttribute('viewBox', '0 0 20 20');
        svg.classList.add('legend-circle-svg');

        const circle = document.createElementNS(NS, 'circle');
        circle.setAttribute('cx', '10');
        circle.setAttribute('cy', '10');
        circle.setAttribute('r', '8.5');
        circle.setAttribute('fill', color);
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        circle.setAttribute('stroke', isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.3)');
        circle.setAttribute('stroke-width', '1');
        svg.appendChild(circle);

        const input = document.createElement('input');
        input.type = 'color';
        input.className = 'legend-color-input';
        input.value = color;

        const resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.className = 'legend-reset-btn';
        resetBtn.title = t('legendResetColor') || 'Restaurar color por defecto';
        resetBtn.innerHTML = '<i class="fas fa-rotate-left"></i>';
        resetBtn.style.display = (color !== defaultColor) ? '' : 'none';

        input.addEventListener('input', (e) => {
            const newColor = e.target.value;
            if (colorEntry) colorEntry.color = newColor;
            circle.setAttribute('fill', newColor);
            resetBtn.style.display = (newColor !== defaultColor) ? '' : 'none';
            window.applyFilters?.();
        });

        resetBtn.addEventListener('click', () => {
            if (colorEntry) colorEntry.color = defaultColor;
            circle.setAttribute('fill', defaultColor);
            input.value = defaultColor;
            resetBtn.style.display = 'none';
            window.applyFilters?.();
        });

        pickerLabel.appendChild(svg);
        pickerLabel.appendChild(input);

        const labels = document.createElement('div');
        labels.className = 'legend-labels';

        const rangeSpan = document.createElement('span');
        rangeSpan.className = 'legend-range';
        rangeSpan.textContent = range;

        labels.appendChild(rangeSpan);

        row.appendChild(pickerLabel);
        row.appendChild(labels);
        row.appendChild(resetBtn);
        box.appendChild(row);
    });

    if (legendZones.size > 0) {
        const sep = document.createElement('div');
        sep.className = 'legend-separator';
        box.appendChild(sep);

        const zoneTitle = document.createElement('div');
        zoneTitle.className = 'legend-section-title';
        zoneTitle.textContent = t('legendZonesSection') || 'Zonas sísmicas';
        box.appendChild(zoneTitle);

        legendZones.forEach(({ name, color }, zoneId) => {
            const zoneRow = document.createElement('div');
            zoneRow.className = 'legend-row legend-zone-row';

            const swatch = document.createElement('span');
            swatch.className = 'legend-zone-swatch';
            swatch.style.background = color;
            swatch.style.borderColor = color;
            swatch.dataset.legendZoneSwatch = zoneId;

            const label = document.createElement('span');
            label.className = 'legend-range';
            label.textContent = name;

            zoneRow.appendChild(swatch);
            zoneRow.appendChild(label);
            box.appendChild(zoneRow);
        });
    }

    const meta = document.createElement('div');
    meta.className = 'legend-meta';
    meta.textContent = t('analysisMetrics', { count: features.length });
    box.appendChild(meta);

    container.appendChild(box);
}

document.addEventListener('geoportal:languageChanged', () => updateLegend());

function attachAsyncPopupRefresh(layer, feature) {
    layer.on('popupopen', async (e) => {
        const { lat, lng } = e.target.getLatLng();
        const place = await reverseGeocode(lat, lng);
        feature.properties.place_name = place;
        e.target.setPopupContent(makePopupHtml(feature));
    });
}

export function createDraggableMarker(feature, appState) {
    const [lon, lat] = feature.geometry.coordinates;
    const inZone = !appState.selectedZoneGeoJSON || pointInPolygon(lon, lat, appState.selectedZoneGeoJSON.geometry);

    const marker = L.marker([lat, lon], {
        pane: 'editMarkerPane',
        icon: createEarthquakeIcon(feature.properties?.magnitude, true, !inZone),
        draggable: true,
        autoPan: true,
        riseOnHover: true,
        zIndexOffset: 1500,
        opacity: inZone ? 1 : 0.75
    }).bindPopup(makePopupHtml(feature));

    marker.feature = feature;
    marker.on('click', () => marker.openPopup());
    marker.on('mouseover', () => marker.setZIndexOffset(2000));
    marker.on('mouseout', () => marker.setZIndexOffset(1500));
    attachAsyncPopupRefresh(marker, feature);
    attachEditHandlers(marker, feature, lon, lat, appState);
    appState.activeEditMarkers.push(marker);
    return marker;
}

export function createStaticCircle(feature, appState) {
    const [lon, lat] = feature.geometry.coordinates;
    const inZone = !appState.selectedZoneGeoJSON || pointInPolygon(lon, lat, appState.selectedZoneGeoJSON.geometry);
    const mag = Number(feature.properties?.magnitude || 0);
    const diameter = 2 + Math.pow(mag, 2) / 2;
    const radius = Math.min(22.5, Math.max(2, diameter / 2));
    const baseStyle = {
        pane: 'earthquakesPane',
        radius,
        fillColor: getColorByMagnitude(mag),
        color: mag >= 7 ? '#000000' : 'rgba(0,0,0,0.65)',
        weight: inZone ? 1.15 : 0.55,
        fillOpacity: inZone ? 0.95 : 0.5,
        renderer: appState.canvasRenderer,
        interactive: true,
        bubblingMouseEvents: false
    };

    const circle = L.circleMarker([lat, lon], baseStyle).bindPopup(makePopupHtml(feature));

    circle.feature = feature;
    circle.on('click', () => circle.openPopup());
    circle.on('mouseover', () => {
        circle.setStyle({
            weight: Math.max(baseStyle.weight, 1.8),
            fillOpacity: 1
        });
    });
    circle.on('mouseout', () => {
        circle.setStyle({
            weight: baseStyle.weight,
            fillOpacity: baseStyle.fillOpacity
        });
    });
    attachAsyncPopupRefresh(circle, feature);
    return circle;
}

export function attachEditHandlers(marker, feature, origLon, origLat, appState) {
    marker.on('dragstart', () => {
        marker.setOpacity(0.6);
    });

    marker.on('dragend', (e) => {
        const { lat, lng } = e.target.getLatLng();

        const mag = Number(feature.properties?.magnitude || 0);
        const semiMajor = Number(feature.properties?.smajax) || Math.max(5, mag * 2);
        const semiMinor = Number(feature.properties?.sminax) || Math.max(3, mag * 1.5);
        const azimuth = Number(feature.properties?.strike || 0);
        // El aviso de "fuera de la elipse" compara siempre contra la posición original
        // del catálogo (fija), no contra la posición del marcador al crearse este render.
        const [trueOrigLon, trueOrigLat] = feature.properties?._origCoordinates || [origLon, origLat];
        const outsideEllipse = !isInsideEllipse(lat, lng, trueOrigLat, trueOrigLon, semiMajor, semiMinor, azimuth);

        feature.geometry.coordinates = [lng, lat];

        // Eliminar el trail anterior de este mismo marcador si existe
        const prevEntry = [...(appState.editHistory || [])].reverse().find(h => h.marker === marker);
        if (prevEntry?.trail && appState.editTrailsLayer) {
            appState.editTrailsLayer.removeLayer(prevEntry.trail);
            prevEntry.trail = null;
        }

        let trail = null;
        if (appState.editTrailsLayer) {
            trail = L.polyline([[origLat, origLon], [lat, lng]], {
                color: '#ff00aa',
                weight: 2.5,
                opacity: 0.9,
                className: 'neon-trail'
            }).addTo(appState.editTrailsLayer);
        }

        if (appState.showTrails === false && trail && appState.editTrailsLayer) {
            appState.editTrailsLayer.removeLayer(trail);
        }

        marker.feature = feature;
        marker.setPopupContent(makePopupHtml(feature));
        appState.editHistory.push({ marker, feature, orig: [origLon, origLat], trail });

        const inZone = !appState.selectedZoneGeoJSON || pointInPolygon(lng, lat, appState.selectedZoneGeoJSON.geometry);
        marker.setIcon(createEarthquakeIcon(feature.properties?.magnitude, true, !inZone, outsideEllipse));
        marker.setOpacity(inZone ? 1 : 0.75);

        const recalcStatus = document.getElementById('recalcStatus');
        if (recalcStatus) recalcStatus.innerText = window.geoportalLanguage?.translate('earthquakeMovedRecalcStatus') || 'Earthquake moved. Zone parameters have been recalculated.';

        const visibleFeatures = getVisibleFeatures(appState);
        const featuresForAnalysis = appState.selectedZoneGeoJSON?.geometry
            ? visibleFeatures.filter((visibleFeature) => {
                const [featureLon, featureLat] = visibleFeature.geometry.coordinates || [];
                return pointInPolygon(featureLon, featureLat, appState.selectedZoneGeoJSON.geometry);
            })
            : visibleFeatures;

        // Mantener analysisFeatures sincronizado tras cada arrastre
        appState.analysisFeatures = featuresForAnalysis;
        calculateGutenbergRichter(featuresForAnalysis, appState, { renderRichterFromCache });
    });
}

function renderEllipses(appState, features = []) {
    if (!appState?.ellipsesLayer) return;
    appState.ellipsesLayer.clearLayers();

    features.forEach((feature) => {
        // La elipse se ancla siempre a la posición original del catálogo, no a la
        // posición actual (que puede haber cambiado si el terremoto fue arrastrado).
        const [lon, lat] = feature.properties?._origCoordinates || feature.geometry.coordinates || [NaN, NaN];
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

        const mag = Number(feature.properties?.magnitude || 0);
        const semiMajor = Number(feature.properties?.smajax || Math.max(5, mag * 2));
        const semiMinor = Number(feature.properties?.sminax || Math.max(3, mag * 1.5));
        const azimuth = Number(feature.properties?.strike || 0);

        const ellipse = drawErrorEllipse(lat, lon, semiMajor, semiMinor, azimuth, {
            color: '#f97316',
            weight: 1,
            fillOpacity: 0.08
        });

        appState.ellipsesLayer.addLayer(ellipse);
    });
}

export function renderInChunks(features, appState, options = {}) {
    const safeFeatures = Array.isArray(features) ? features : [];
    const settings = {
        clearEllipses: true,
        targetGroup: null,
        skipAnalysis: false,
        ...options
    };

    const layerGroup = settings.targetGroup || appState.earthquakeLayer;
    if (layerGroup?.clearLayers) layerGroup.clearLayers();
    if (settings.clearEllipses && appState.ellipsesLayer?.clearLayers) appState.ellipsesLayer.clearLayers();

    if (!settings.targetGroup) {
        appState.activeEditMarkers = [];
        appState.filteredFeatures = safeFeatures;
    }

    const CHUNK_SIZE = 1000;
    let index = 0;

    function processNextChunk() {
        const slice = safeFeatures.slice(index, index + CHUNK_SIZE);
        slice.forEach((feature) => {
            const layer = appState.editMode
                ? createDraggableMarker(feature, appState)
                : createStaticCircle(feature, appState);
            layerGroup.addLayer(layer);
        });

        index += CHUNK_SIZE;
        if (index < safeFeatures.length) {
            setTimeout(processNextChunk, 0);
            return;
        }

        if (document.getElementById('showEllipses')?.checked) {
            renderEllipses(appState, safeFeatures);
            if (!appState.map.hasLayer(appState.ellipsesLayer)) {
                appState.map.addLayer(appState.ellipsesLayer);
            }
        }

        if (layerGroup?.eachLayer) {
            layerGroup.eachLayer((layer) => {
                if (typeof layer.bringToFront === 'function') layer.bringToFront();
            });
        }

        if (!settings.skipAnalysis) {
            updateLegend(safeFeatures);
            calculateGutenbergRichter(safeFeatures, appState, { renderRichterFromCache });
        }
    }

    processNextChunk();
}

export function renderMapLayers(geoData, appState) {
    renderInChunks(geoData?.features || [], appState);
}

export function toggleEllipses(appState, visible) {
    const checkbox = document.getElementById('showEllipses');
    if (checkbox && checkbox.checked !== visible) checkbox.checked = visible;
    if (window.layerToggles?.ellipses && window.layerToggles.ellipses.checked !== visible) {
        window.layerToggles.ellipses.checked = visible;
    }

    if (!appState?.ellipsesLayer || !appState?.map) return;

    if (visible) {
        renderEllipses(appState, appState.filteredFeatures?.length ? appState.filteredFeatures : getVisibleFeatures(appState));
        if (!appState.map.hasLayer(appState.ellipsesLayer)) appState.map.addLayer(appState.ellipsesLayer);
    } else if (appState.map.hasLayer(appState.ellipsesLayer)) {
        appState.map.removeLayer(appState.ellipsesLayer);
    }

    // El botón de edición requiere zona seleccionada Y elipses visibles
    if (!appState.editMode && appState.selectedZoneId) {
        const editBtn = document.getElementById('editModeBtn');
        if (editBtn) {
            editBtn.disabled = !visible;
            editBtn.title = visible ? '' : (window.geoportalLanguage?.translate('editNeedsEllipses') || '');
            updateEditModeHint(!visible, 'editModeDisabledHint');
        }
    }
}

function updateEditModeHint(show, key) {
    const hintEl = document.getElementById('editModeHint');
    if (!hintEl) return;
    hintEl.textContent = show ? (window.geoportalLanguage?.translate(key) || '') : '';
}

export function toggleEditMode(appState) {
    const currentlyVisible = getVisibleFeatures(appState);
    const features = appState.filteredFeatures?.length
        ? appState.filteredFeatures
        : (currentlyVisible.length ? currentlyVisible : (appState.allCurrentGeoJSON?.features || []));

    const translate = window.geoportalLanguage?.translate?.bind(window.geoportalLanguage) || ((key, params) => key);
    if (!features.length) {
        const status = document.getElementById('statusMessage');
        if (status) status.innerText = translate('noEarthquakesToEdit');
        return;
    }

    appState.editMode = !appState.editMode;
    document.body.classList.toggle('editing-mode', appState.editMode);

    const btn = document.getElementById('editModeBtn');
    if (btn) {
        btn.innerHTML = appState.editMode
            ? `<i class="fas fa-pencil-alt"></i> ${translate('disableEditing')}`
            : `<i class="fas fa-pencil-alt"></i> ${translate('enableEditing')}`;
    }

    const status = document.getElementById('statusMessage');
    if (status) {
        status.innerText = appState.editMode
            ? translate('editModeActivated')
            : translate('editModeDeactivated');
    }
    updateEditModeHint(false);

    // skipAnalysis: true para no recalcular la gráfica con los features de visualización
    // (que incluyen el buffer de 50 km), sino conservar los analysis features correctos.
    renderInChunks(features, appState, { clearEllipses: false, skipAnalysis: true });
    const analysisFeats = appState.analysisFeatures ?? features;
    calculateGutenbergRichter(analysisFeats, appState, { renderRichterFromCache });
}

export function undoLastEdit(appState) {
    const translate = window.geoportalLanguage?.translate?.bind(window.geoportalLanguage) || ((key, params) => key);
    const lastEdit = appState.editHistory.pop();
    if (!lastEdit) {
        const status = document.getElementById('statusMessage');
        if (status) status.innerText = translate('noUndoMoves');
        return;
    }

    const [lon, lat] = lastEdit.orig;
    lastEdit.feature.geometry.coordinates = [lon, lat];

    if (lastEdit.trail && appState.editTrailsLayer) {
        appState.editTrailsLayer.removeLayer(lastEdit.trail);
    }

    const features = appState.filteredFeatures?.length ? appState.filteredFeatures : getVisibleFeatures(appState);

    // skipAnalysis: true para no recalcular con todos los features de visualización.
    // Re-filtramos manualmente según la zona activa (las coordenadas han cambiado tras el undo).
    renderInChunks(features, appState, { clearEllipses: false, skipAnalysis: true });

    const featuresForAnalysis = appState.selectedZoneGeoJSON?.geometry
        ? features.filter((f) => {
            const [fLon, fLat] = f.geometry.coordinates || [];
            return pointInPolygon(fLon, fLat, appState.selectedZoneGeoJSON.geometry);
        })
        : features;
    appState.analysisFeatures = featuresForAnalysis;
    calculateGutenbergRichter(featuresForAnalysis, appState, { renderRichterFromCache });

    const status = document.getElementById('statusMessage');
    if (status) status.innerText = translate('undoSuccess');
}

export function setTrailsVisibility(appState, visible) {
    appState.showTrails = visible;

    if (!appState?.editTrailsLayer || !appState?.map) return;
    if (visible) {
        if (!appState.map.hasLayer(appState.editTrailsLayer)) appState.map.addLayer(appState.editTrailsLayer);
    } else if (appState.map.hasLayer(appState.editTrailsLayer)) {
        appState.map.removeLayer(appState.editTrailsLayer);
    }
}

export function setLayerVisibility(appState, layerName, visible) {
    if (!appState?.map) return;

    if (layerName === 'sismos' && appState.earthquakeLayer) {
        if (visible) appState.map.addLayer(appState.earthquakeLayer);
        else appState.map.removeLayer(appState.earthquakeLayer);
    }

    if (layerName === 'ellipses') {
        toggleEllipses(appState, visible);
    }

    if (layerName === 'zonas' && appState.zonasLayer) {
        if (visible) appState.map.addLayer(appState.zonasLayer);
        else appState.map.removeLayer(appState.zonasLayer);
    }

    if (layerName === 'trazas') {
        setTrailsVisibility(appState, visible);
    }
}

export function toggleZoneLayer(appState, zoneId, visible) {
    const zone = (appState.zoneLayers || []).find((item) => item.id === zoneId);
    if (!zone || !appState.zonasLayer) return;

    zone.visible = visible;
    if (visible) appState.zonasLayer.addLayer(zone.layer);
    else appState.zonasLayer.removeLayer(zone.layer);

    if (!visible && appState.selectedZoneId === zoneId) {
        appState.selectedZoneId = null;
        appState.selectedZoneFeatureId = null;
        appState.selectedZoneName = null;
        appState.selectedZoneGeoJSON = null;
        setActiveZoneControl(null);
    }

    window.refreshZoneQuickSelector?.();
    styleZoneLayers(appState);
}

export function toggleCatalogLayer(appState, catalogId, visible) {
    const catalog = (appState.catalogLayers || []).find((item) => item.id === catalogId);
    if (catalog) catalog.visible = visible;
}

export function selectZoneFeature(appState, zoneId, featureId, feature) {
    appState.selectedZoneId = zoneId;
    appState.selectedZoneFeatureId = featureId;
    appState.selectedZoneGeoJSON = feature;

    const zone = (appState.zoneLayers || []).find((item) => item.id === zoneId);
    appState.selectedZoneName = feature?.properties?._displayName || zone?.name || window.geoportalLanguage?.translate('selectedZoneFallback') || 'Selected zone';

    const infoBox = document.getElementById('selectedZoneInfo');
    const nameEl = document.getElementById('selectedZoneName');
    const subtitle = document.getElementById('headerSubtitle');
    const recalcStatus = document.getElementById('recalcStatus');

    if (nameEl) nameEl.innerText = appState.selectedZoneName;
    if (infoBox) infoBox.classList.add('is-visible');
    if (subtitle) subtitle.innerText = window.geoportalLanguage?.translate('activeZoneSubtitle', { zone: appState.selectedZoneName }) || `Active zone: ${appState.selectedZoneName}. Analysis refreshes automatically.`;
    if (recalcStatus) recalcStatus.innerText = window.geoportalLanguage?.translate('selectedZoneRecalcStatus') || 'Selected zone: recurrence plots generated automatically.';

    const editBtn = document.getElementById('editModeBtn');
    const ellipsesVisible = !!document.getElementById('showEllipses')?.checked;
    if (editBtn) {
        editBtn.disabled = !ellipsesVisible;
        editBtn.title = ellipsesVisible ? '' : (window.geoportalLanguage?.translate('editNeedsEllipses') || '');
        updateEditModeHint(!ellipsesVisible, 'editModeDisabledHint');
    }
    const undoBtn = document.getElementById('undoMoveBtn');
    if (undoBtn) undoBtn.disabled = false;
    setActiveZoneControl(zoneId);
    document.querySelectorAll('.zone-feature-btn').forEach((button) => {
        const sameZone = button.dataset.zoneId === zoneId;
        const sameFeature = !button.dataset.featureId || button.dataset.featureId === featureId;
        button.classList.toggle('active', sameZone && sameFeature);
    });

    styleZoneLayers(appState);

    // Auto-zoom a la zona seleccionada
    if (appState.map && appState.zoneFeatureLayers && appState.zoneFeatureLayers[featureId]) {
        const layer = appState.zoneFeatureLayers[featureId];
        if (typeof layer.getBounds === 'function') {
            appState.map.fitBounds(layer.getBounds(), { padding: [30, 30], maxZoom: 10, animate: true, duration: 0.5 });
        }
    }
}

export function styleZoneLayers(appState) {
    (appState.zoneLayers || []).forEach((zone) => {
        if (!zone?.layer?.eachLayer) return;
        const zoneColor = zone.color || '#475569';

        zone.layer.eachLayer((featureLayer) => {
            const isSelected = appState.selectedZoneFeatureId && featureLayer.featureId === appState.selectedZoneFeatureId;
            if (featureLayer.setStyle) {
                featureLayer.setStyle(
                    isSelected
                        ? { ...SELECTED_ZONE_STYLE, color: zoneColor, fillColor: zoneColor }
                        : getDefaultZoneStyle(zoneColor)
                );
            }
            if (isSelected && featureLayer.bringToFront) featureLayer.bringToFront();
            else if (featureLayer.bringToBack) featureLayer.bringToBack();
        });

        if (zone.layer.bringToBack) zone.layer.bringToBack();
    });
}

export function getZoneHoverStyle(color = '#475569') {
    return { ...HOVER_ZONE_STYLE, color, fillColor: color };
}

export function getDefaultZoneStyle(color = '#475569') {
    return { ...DEFAULT_ZONE_STYLE, color, fillColor: color };
}
