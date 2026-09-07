import { updateLegendZoneColor, unregisterLegendZone, toggleEditMode } from './map-render.js';
import { removeZoneLayerControl, setActiveZoneControl } from './layerWidget.js';
import { getField } from './map-parse.js';
import { applyFilters } from './map-filters.js';

// ─── Color de zona ───────────────────────────────────────────────────────────

export function changeZoneColor(zoneId, newColor, appState) {
    const zone = (appState.zoneLayers || []).find(z => z.id === zoneId);
    if (!zone) return;
    zone.color = newColor;
    if (typeof window.styleZoneLayers === 'function') window.styleZoneLayers();
    document.querySelectorAll(`[data-zone-color="${zoneId}"]`).forEach(el => { el.style.background = newColor; });
    document.querySelector(`[data-zone-id="${zoneId}"]`)?.style.setProperty('--zone-color', newColor);
    document.querySelectorAll(`[data-zone-color-input="${zoneId}"]`).forEach(el => { el.value = newColor; });
    updateLegendZoneColor(zoneId, newColor);
}

// ─── Selector rápido de zonas ────────────────────────────────────────────────

function getZoneFeatureLabel(feature, fallbackName, index = 0) {
    const t = key => window.geoportalLanguage?.translate(key) || key;
    const name = fallbackName ?? t('zoneNameFallback') ?? 'Zona sísmica';
    return getField(feature?.properties || {}, ['name', 'nombre', 'zona', 'zone', 'source_name', 'source', 'id', 'codigo', 'code', 'label'])
        || `${name} ${index + 1}`;
}

function setQuickZoneButtonsActive(activeZoneId = null, activeFeatureId = null) {
    document.querySelectorAll('.zone-feature-btn').forEach(button => {
        const sameZone    = Boolean(activeZoneId) && button.dataset.zoneId === activeZoneId;
        const sameFeature = !activeFeatureId || button.dataset.featureId === activeFeatureId;
        button.classList.toggle('active', sameZone && sameFeature);
    });
}

export function updateQuickZoneSelector(appState) {
    const container = document.getElementById('zoneQuickSelector');
    if (!container) return;

    const t = key => window.geoportalLanguage?.translate(key) || key;
    const zones        = appState?.zoneLayers || [];
    const visibleZones = zones.filter(z => z.visible !== false);

    if (!zones.length) {
        container.innerHTML = `<p class="zone-empty-hint">${t('zoneEmptyHint')}</p>`;
        return;
    }
    if (!visibleZones.length) {
        container.innerHTML = `<p class="zone-empty-hint">${t('quickSelectorHiddenZones')}</p>`;
        return;
    }

    container.innerHTML = '';

    visibleZones.forEach(zone => {
        if (!zone?.layer?.eachLayer) return;

        const features = [];
        let featureIndex = 0;
        zone.layer.eachLayer(featureLayer => {
            const feature   = featureLayer?.feature;
            const featureId = featureLayer?.featureId || feature?._featureId;
            if (!feature || !featureId) return;
            features.push({ featureId, label: feature?.properties?._displayName || getZoneFeatureLabel(feature, zone.name, featureIndex) });
            featureIndex++;
        });
        if (!features.length) return;

        const zoneColor = zone.color || '#2563eb';
        const group     = document.createElement('div');
        group.className = 'zone-group';
        group.dataset.zoneId = zone.id;
        group.style.setProperty('--zone-color', zoneColor);

        const header = document.createElement('div');
        header.className = 'zone-group-header';

        const colorLabel = document.createElement('label');
        colorLabel.className = 'zone-group-color-label';
        colorLabel.title = t('zoneColorPickerTip') || 'Cambiar color de zona';

        const dot = document.createElement('span');
        dot.className = 'zone-group-dot';
        dot.dataset.zoneColor = zone.id;
        dot.style.background = zoneColor;

        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = zoneColor;
        colorInput.dataset.zoneColorInput = zone.id;
        colorInput.className = 'zone-group-color-input';
        colorInput.addEventListener('input', e => changeZoneColor(zone.id, e.target.value, appState));

        colorLabel.appendChild(dot);
        colorLabel.appendChild(colorInput);

        const nameEl = document.createElement('span');
        nameEl.className = 'zone-group-name';
        nameEl.textContent = zone.name;
        nameEl.title = zone.name;

        const countEl = document.createElement('span');
        countEl.className = 'zone-group-count';
        countEl.textContent = features.length;

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'zone-group-delete-btn';
        deleteBtn.title = t('deleteZone') || 'Eliminar zona';
        deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
        deleteBtn.addEventListener('click', e => {
            e.stopPropagation();
            if (typeof window.deleteZone === 'function') window.deleteZone(zone.id);
        });

        header.appendChild(colorLabel);
        header.appendChild(nameEl);
        header.appendChild(countEl);
        header.appendChild(deleteBtn);
        group.appendChild(header);

        const featuresDiv = document.createElement('div');
        featuresDiv.className = 'zone-group-features';

        features.forEach(option => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'zone-feature-btn';
            btn.dataset.zoneId    = zone.id;
            btn.dataset.featureId = option.featureId;
            btn.title = t('selectZoneHint', { label: option.label });
            btn.innerHTML = `<i class="fas fa-draw-polygon"></i><span>${option.label}</span>`;
            if (appState.selectedZoneId === zone.id && appState.selectedZoneFeatureId === option.featureId) btn.classList.add('active');
            btn.addEventListener('click', () => window.selectZoneById?.(zone.id, option.featureId));
            featuresDiv.appendChild(btn);
        });

        group.appendChild(featuresDiv);
        container.appendChild(group);
    });
}

// ─── CRUD de zonas ───────────────────────────────────────────────────────────

export function deleteZone(appState, zoneId) {
    const zoneIndex = appState.zoneLayers.findIndex(z => z.id === zoneId);
    if (zoneIndex === -1) return;

    const zone = appState.zoneLayers[zoneIndex];
    if (zone.layer && appState.zonasLayer) appState.zonasLayer.removeLayer(zone.layer);

    if (zone.layer?.eachLayer) {
        zone.layer.eachLayer(featureLayer => {
            const fId = featureLayer.featureId || featureLayer.feature?._featureId;
            if (fId && appState.zoneFeatureLayers) delete appState.zoneFeatureLayers[fId];
        });
    }

    appState.zoneLayers.splice(zoneIndex, 1);
    removeZoneLayerControl(zoneId);
    unregisterLegendZone(zoneId);

    if (appState.selectedZoneId === zoneId) {
        clearZoneSelection(appState);
    } else {
        updateQuickZoneSelector(appState);
        applyFilters(appState);
    }
}

export function clearZoneSelection(appState) {
    if (appState.editMode) toggleEditMode(appState);

    appState.selectedZoneId        = null;
    appState.selectedZoneFeatureId = null;
    appState.selectedZoneName      = null;
    appState.selectedZoneGeoJSON   = null;

    const t = key => window.geoportalLanguage?.translate(key) || key;

    const editBtn = document.getElementById('editModeBtn');
    if (editBtn) {
        editBtn.disabled = true;
        editBtn.title = t('editBtnNoZoneTooltip') || 'Seleccione primero una zona sísmica';
        const editModeHint = document.getElementById('editModeHint');
        if (editModeHint) {
            editModeHint.innerText = t('editModeDisabledHint') || t('editBtnNoZoneTooltip') || 'Seleccione primero una zona sísmica';
        }
    }
    const undoBtn = document.getElementById('undoMoveBtn');
    if (undoBtn) undoBtn.disabled = true;

    document.getElementById('selectedZoneInfo')?.classList.remove('is-visible');
    const selectedZoneName = document.getElementById('selectedZoneName');
    if (selectedZoneName) selectedZoneName.innerText = '';
    const subtitle = document.getElementById('headerSubtitle');
    if (subtitle) subtitle.innerText = t('sidebarSubtitle');
    const recalcStatus = document.getElementById('recalcStatus');
    if (recalcStatus) recalcStatus.innerText = t('recalcHint');

    setActiveZoneControl(null);
    setQuickZoneButtonsActive(null);
    if (typeof window.styleZoneLayers === 'function') window.styleZoneLayers();
    updateQuickZoneSelector(appState);
    applyFilters(appState);
}
