import { createLeafletWidget } from './widget-factory.js';

const layerControlRefs = {
    zoneList:     null,
    catalogList:  null,
    zoneItems:    {},
    catalogItems: {}
};

let currentUploadedLayer = null;
let widgetHandlers = {};
let layerControlInstance = null;
let legendControlInstance = null;

export function updateLayerUploadStatus(message) {
    const el = document.getElementById('layer-upload-status');
    if (el) el.innerText = message || window.geoportalLanguage?.translate('layerStatusNone') || 'Ninguna capa cargada aún.';
}

export function initFloatingLegend(mapInstance) {
    if (legendControlInstance) {
        mapInstance.removeControl(legendControlInstance);
        legendControlInstance = null;
    }

    const legendControl = L.control({ position: 'bottomleft' });

    legendControl.onAdd = function () {
        const div = L.DomUtil.create('div', 'leaflet-control legend-floating-control');

        const titleBar = L.DomUtil.create('div', 'legend-title-bar', div);
        const t = key => window.geoportalLanguage?.translate(key) || key;
        titleBar.innerHTML = `<span id="legendTitleText"><i class="fas fa-list-ul" style="margin-right:8px"></i>${t('legendTitle')}</span><i class="fas fa-chevron-up toggle-icon" style="transition:transform 0.3s"></i>`;
        titleBar.title = t('legendToggleTip');

        const content = L.DomUtil.create('div', 'legend-floating-content', div);
        content.id = 'legendContent';

        L.DomEvent.on(titleBar, 'click', event => {
            L.DomEvent.stopPropagation(event);
            const isCollapsed = div.classList.toggle('collapsed');
            titleBar.querySelector('.toggle-icon').style.transform = isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
            content.style.maxHeight = isCollapsed ? '0px' : '600px';
        });

        // Start collapsed
        div.classList.add('collapsed');
        content.style.maxHeight = '0px';
        titleBar.querySelector('.toggle-icon').style.transform = 'rotate(180deg)';

        L.DomEvent.disableClickPropagation(div);
        L.DomEvent.disableScrollPropagation(div);
        return div;
    };

    legendControl.addTo(mapInstance);
    legendControlInstance = legendControl;
}

export function clearLayerWidget() {
    if (layerControlRefs.zoneList)    layerControlRefs.zoneList.innerHTML = '';
    if (layerControlRefs.catalogList) layerControlRefs.catalogList.innerHTML = '';
    layerControlRefs.zoneItems    = {};
    layerControlRefs.catalogItems = {};
    currentUploadedLayer = null;
    updateLayerUploadStatus(window.geoportalLanguage?.translate('layerStatusNone'));
}

export function removeZoneLayerControl(zoneId) {
    layerControlRefs.zoneItems[zoneId]?.remove();
    delete layerControlRefs.zoneItems[zoneId];
}

export function removeCatalogLayerControl(catalogId) {
    layerControlRefs.catalogItems[catalogId]?.remove();
    delete layerControlRefs.catalogItems[catalogId];
}

export function setActiveZoneControl(zoneId = null) {
    Object.entries(layerControlRefs.zoneItems || {}).forEach(([id, el]) => {
        if (el) el.classList.toggle('active', Boolean(zoneId) && id === zoneId);
    });
}

function addLayerItem(listRef, name, onToggle, onSelect, dataKey, dataValue, zoneColor, onColorChange, onDelete) {
    if (!listRef) return;
    const t = key => window.geoportalLanguage?.translate(key) || key;

    const row = document.createElement('div');
    row.className = 'layer-item-row';

    if (dataKey === 'zoneId' && zoneColor && onColorChange) {
        const colorLabel = document.createElement('label');
        colorLabel.className = 'layer-zone-color-label';
        colorLabel.title = t('zoneColorPickerTip') || 'Cambiar color de zona';

        const dot = document.createElement('span');
        dot.className = 'layer-type-dot zone';
        dot.dataset.zoneColor = dataValue;
        dot.style.background = zoneColor;

        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = zoneColor;
        colorInput.dataset.zoneColorInput = dataValue;
        colorInput.className = 'zone-group-color-input';
        colorInput.addEventListener('input', e => onColorChange(e.target.value));

        colorLabel.appendChild(dot);
        colorLabel.appendChild(colorInput);
        row.appendChild(colorLabel);
    }

    const label = document.createElement('label');
    label.className = 'layer-check';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = true;
    cb.dataset[dataKey] = dataValue;
    cb.addEventListener('change', event => { event.stopPropagation(); onToggle?.(cb.checked); });

    const span = document.createElement('span');
    span.innerText = name;
    span.title = name;

    label.appendChild(cb);
    label.appendChild(span);
    row.appendChild(label);

    if (onSelect) {
        const selectBtn = document.createElement('button');
        selectBtn.type = 'button';
        selectBtn.className = 'layer-select-btn';
        selectBtn.innerHTML = '<i class="fas fa-shuffle"></i>';
        selectBtn.title = t('layerAnalize', { name }) || `Analizar ${name}`;
        selectBtn.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            setActiveZoneControl(dataValue);
            onSelect();
        });
        row.appendChild(selectBtn);
    }

    if (dataKey === 'zoneId')    layerControlRefs.zoneItems[dataValue]    = row;
    if (dataKey === 'catalogId') layerControlRefs.catalogItems[dataValue] = row;

    if (onDelete) {
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'layer-delete-btn';
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        deleteBtn.title = t('deleteCatalog') || 'Eliminar catálogo';
        deleteBtn.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); onDelete(); });
        row.appendChild(deleteBtn);
    }

    listRef.appendChild(row);
}

export function addZoneLayerControl(zoneId, name, zoneColor, onColorChange) {
    addLayerItem(
        layerControlRefs.zoneList,
        name,
        checked => widgetHandlers.toggleZoneLayer?.(zoneId, checked),
        () => widgetHandlers.selectZoneById?.(zoneId),
        'zoneId', zoneId, zoneColor, onColorChange
    );
    currentUploadedLayer = { id: zoneId, type: 'zone', name };
    updateLayerUploadStatus(window.geoportalLanguage?.translate('layerLoadedZone', { name }) || `Zone loaded: ${name}`);
}

export function addCatalogLayerControl(catalogId, name, onDelete) {
    addLayerItem(
        layerControlRefs.catalogList,
        name,
        checked => widgetHandlers.toggleCatalogLayer?.(catalogId, checked),
        null,
        'catalogId', catalogId, null, null, onDelete
    );
    currentUploadedLayer = { id: catalogId, type: 'catalog', name };
    updateLayerUploadStatus(window.geoportalLanguage?.translate('layerLoadedCatalog', { name }) || `Catalog loaded: ${name}`);
}

// ─── Panel content builder ───────────────────────────────────────────────────

function buildLayerPanelBody(body) {
    const t = key => window.geoportalLanguage?.translate(key) || key;

    const section = L.DomUtil.create('div', 'layer-section', body);

    const statusEl = L.DomUtil.create('div', 'layer-upload-status', section);
    statusEl.id = 'layer-upload-status';
    statusEl.innerText = t('layerStatusNone');

    const zoneList = L.DomUtil.create('div', 'layer-sublist', section);
    zoneList.id = 'layer-zone-list';

    const catalogList = L.DomUtil.create('div', 'layer-sublist', section);
    catalogList.id = 'layer-catalog-list';

    layerControlRefs.zoneList    = zoneList;
    layerControlRefs.catalogList = catalogList;
}

// ─── Init ────────────────────────────────────────────────────────────────────

export function initLayerWidget(mapInstance, handlers = {}) {
    widgetHandlers = handlers;
    if (layerControlInstance && mapInstance) {
        mapInstance.removeControl(layerControlInstance);
        layerControlInstance = null;
    }

    layerControlInstance = createLeafletWidget({
        position:       'topleft',
        cssClass:       'layer-control-custom',
        btnClass:       'layer-btn-toggle',
        panelClass:     'layer-panel',
        icon:           '<i class="fas fa-layer-group"></i>',
        titleKey:       'layerPanelTitle',
        contentBuilder: buildLayerPanelBody
    });

    layerControlInstance.addTo(mapInstance);

    document.addEventListener('geoportal:languageChanged', () => {
        const t = key => window.geoportalLanguage?.translate(key) || key;
        if (currentUploadedLayer) {
            const key = currentUploadedLayer.type === 'zone' ? 'layerLoadedZone' : 'layerLoadedCatalog';
            updateLayerUploadStatus(t(key, { name: currentUploadedLayer.name }));
        } else {
            updateLayerUploadStatus(t('layerStatusNone'));
        }
        const legendTitleEl = document.getElementById('legendTitleText');
        if (legendTitleEl) legendTitleEl.innerHTML = `<i class="fas fa-list-ul" style="margin-right:8px"></i>${t('legendTitle')}`;
        legendTitleEl?.closest('.legend-title-bar')?.setAttribute('title', t('legendToggleTip'));
    });
}
