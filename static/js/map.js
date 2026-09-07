import { initLayerWidget, initFloatingLegend } from './layerWidget.js';
import { initFilterWidget } from './filterWidget.js';
import { initExportWidget } from './exportWidget.js';
import { uploadCatalogo, uploadSHP, uploadCompleteness, downloadCSV, exportJSON, limpiarMapa, deleteCatalog } from './map-load.js';
import { applyFilters } from './map-filters.js';
import { deleteZone, clearZoneSelection, updateQuickZoneSelector } from './map-zones.js';
import { renderRichterFromCache } from './map-analysis.js';
import {
    updateLegend,
    toggleEllipses,
    toggleEditMode,
    undoLastEdit,
    setTrailsVisibility,
    setLayerVisibility,
    toggleZoneLayer,
    toggleCatalogLayer,
    selectZoneFeature,
    styleZoneLayers
} from './map-render.js';

const appState = {
    map: null,
    earthquakeLayer: null,
    ellipsesLayer: null,
    editTrailsLayer: null,
    zonasLayer: null,
    catalogLayers: [],
    zoneLayers: [],
    allCurrentGeoJSON: { type: 'FeatureCollection', features: [] },
    editHistory: [],
    selectedZoneId: null,
    selectedZoneFeatureId: null,
    selectedZoneName: null,
    selectedZoneGeoJSON: null,
    completenessCriteria: [],
    activeEditMarkers: [],
    filteredFeatures: [],
    analysisFeatures: null,
    editMode: false,
    showTrails: true,
    canvasRenderer: null,
    zoneFeatureLayers: {},
    analysisCache: null
};

function initSidebarResizer() {
    const sidebar = document.getElementById('sidebar');
    const handle = document.getElementById('sidebar-resize-handle');
    if (!sidebar || !handle) return;

    let isResizing = false;
    const minWidth = 320;
    const maxWidth = Math.min(window.innerWidth * 0.9, 900);
    const naturalWidth = sidebar.offsetWidth;
    const chartCollapseThreshold = naturalWidth - 30;

    function applyChartCollapse(width) {
        const richterWrap = document.getElementById('richterWrap');
        if (richterWrap) {
            richterWrap.classList.toggle('chart-collapsed', width < chartCollapseThreshold);
        }
    }

    const onMouseMove = (event) => {
        if (!isResizing) return;
        const newWidth = Math.max(minWidth, Math.min(maxWidth, window.innerWidth - 20 - event.clientX));
        sidebar.style.width = `${newWidth}px`;
        applyChartCollapse(newWidth);
    };

    const stopResize = () => {
        if (!isResizing) return;
        isResizing = false;
        document.body.classList.remove('sidebar-resizing');
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', stopResize);
    };

    handle.addEventListener('mousedown', (event) => {
        event.preventDefault();
        isResizing = true;
        document.body.classList.add('sidebar-resizing');
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', stopResize);
    });
}

const zoneSelectIndex = new Map();

function selectZoneById(zoneId, featureId = null) {
    const zone = appState.zoneLayers.find((item) => item.id === zoneId && item.visible !== false);
    if (!zone?.layer?.eachLayer) return;

    if (featureId) {
        // Selección directa (selector rápido o clic en mapa) — resetea el ciclo
        zoneSelectIndex.delete(zoneId);
        let targetLayer = null;
        zone.layer.eachLayer((featureLayer) => {
            if (targetLayer) return;
            if (featureLayer.featureId === featureId || featureLayer.feature?._featureId === featureId) {
                targetLayer = featureLayer;
            }
        });
        const feature = targetLayer?.feature || zone.geojson?.features?.[0];
        const resolvedFeatureId = targetLayer?.featureId || feature?._featureId;
        if (!feature || !resolvedFeatureId) return;
        selectZoneFeature(appState, zoneId, resolvedFeatureId, feature);
        applyFilters(appState);
        return;
    }

    // Sin featureId (botón del widget) — cicla por los features en orden
    const allLayers = [];
    zone.layer.eachLayer((featureLayer) => allLayers.push(featureLayer));
    if (allLayers.length === 0) return;

    const currentIdx = zoneSelectIndex.get(zoneId) ?? -1;
    const nextIdx = (currentIdx + 1) % allLayers.length;
    zoneSelectIndex.set(zoneId, nextIdx);

    const targetLayer = allLayers[nextIdx];
    const feature = targetLayer?.feature;
    const resolvedFeatureId = targetLayer?.featureId || feature?._featureId;
    if (!feature || !resolvedFeatureId) return;

    selectZoneFeature(appState, zoneId, resolvedFeatureId, feature);
    applyFilters(appState);
}

function exportRichterPdf() {
    const jsPDFCtor = window.jspdf?.jsPDF;
    if (!jsPDFCtor) {
        alert(window.geoportalLanguage?.translate('noChartExportAvailable') || 'No chart available to export.');
        return;
    }

    const cache = window.richterChartInstance?._cache || window.lastRichterCache || appState.analysisCache;
    // Usar solo los eventos dentro de la zona (no el buffer de 50 km de visualización)
    const features = appState.analysisFeatures ?? appState.filteredFeatures ?? [];

    // A4 in mm
    const pdf = new jsPDFCtor({ unit: 'mm', format: 'a4' });
    const PW = 210;
    const PH = 297;
    const ML = 14;
    const CW = PW - ML * 2;

    const TEAL   = [15, 118, 110];
    const DARK   = [15, 23, 42];
    const SLATE  = [100, 116, 139];
    const LIGHT  = [248, 250, 252];
    const BORDER = [226, 232, 240];
    const WHITE  = [255, 255, 255];

    // ── HEADER ───────────────────────────────────────────────────────────
    pdf.setFillColor(...TEAL);
    pdf.rect(0, 0, PW, 36, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.setTextColor(...WHITE);
    pdf.text('GEOPORTAL DE FUENTE SÍSMICA', ML, 15);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text('Informe de Análisis Sísmico', ML, 23);

    const now = new Date();
    const genDate = now.toLocaleDateString('es-ES') + '  ' + now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    pdf.setFontSize(7.5);
    pdf.text(genDate, PW - ML, 23, { align: 'right' });

    pdf.setFillColor(209, 250, 229);
    pdf.rect(0, 36, PW, 1, 'F');

    let y = 46;

    // ── ZONE NAME ────────────────────────────────────────────────────────
    if (appState.selectedZoneName) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7);
        pdf.setTextColor(...TEAL);
        pdf.text('ZONA ANALIZADA', ML, y);
        y += 5;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.setTextColor(...DARK);
        pdf.text(appState.selectedZoneName, ML, y);
        y += 9;
    }

    // ── SUMMARY CARDS ────────────────────────────────────────────────────
    const mags = features.map((f) => parseFloat(f.properties?.magnitude)).filter(Number.isFinite);
    const deps = features.map((f) => parseFloat(f.properties?.depth)).filter(Number.isFinite);
    const dates = features.map((f) => f.properties?.date).filter(Boolean).sort();
    const nMain = features.filter((f) => f.properties?.is_main_shock).length;

    const fN = (v, d = 1) => Number.isFinite(v) ? v.toFixed(d) : '—';
    const minMag = mags.length ? Math.min(...mags) : null;
    const maxMag = mags.length ? Math.max(...mags) : null;
    const meanMag = mags.length ? mags.reduce((a, b) => a + b, 0) / mags.length : null;
    const minDep = deps.length ? Math.min(...deps) : null;
    const maxDep = deps.length ? Math.max(...deps) : null;

    const cards = [
        { label: 'Total de eventos',       value: String(features.length) },
        { label: 'Terremotos principales',   value: String(nMain) },
        { label: 'Mag. mín / máx',          value: `${fN(minMag)} / ${fN(maxMag)}` },
        { label: 'Magnitud media',           value: fN(meanMag, 2) },
        { label: 'Profundidad mín/máx (km)', value: `${fN(minDep, 0)} / ${fN(maxDep, 0)}` },
        { label: 'Periodo',                  value: dates.length ? `${dates[0].substring(0, 10)}  →  ${dates[dates.length - 1].substring(0, 10)}` : '—' },
    ];

    pdf.setFillColor(...LIGHT);
    pdf.rect(ML, y, CW, 6, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(...TEAL);
    pdf.text('RESUMEN DE DATOS', ML + 2, y + 4.2);
    y += 8;

    const COLS = 3;
    const CARD_H = 15;
    const CARD_W = (CW - (COLS - 1) * 3) / COLS;

    cards.forEach((card, i) => {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const cx = ML + col * (CARD_W + 3);
        const cy = y + row * (CARD_H + 3);

        pdf.setFillColor(...WHITE);
        pdf.setDrawColor(...BORDER);
        pdf.rect(cx, cy, CARD_W, CARD_H, 'FD');

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6);
        pdf.setTextColor(...SLATE);
        pdf.text(card.label.toUpperCase(), cx + 3, cy + 5);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9.5);
        pdf.setTextColor(...DARK);
        pdf.text(card.value, cx + 3, cy + 12);
    });

    y += Math.ceil(cards.length / COLS) * (CARD_H + 3) + 8;

    // ── ACTIVE FILTERS ───────────────────────────────────────────────────
    const activeFilters = [];
    const vMagMin  = document.getElementById('mag_min')?.value;
    const vMagMax  = document.getElementById('mag_max')?.value;
    const vDepMin  = document.getElementById('depth_min')?.value;
    const vDepMax  = document.getElementById('depth_max')?.value;
    const vDateS   = document.getElementById('date_start')?.value;
    const vDateE   = document.getElementById('date_end')?.value;
    const vMain    = document.getElementById('main_shock')?.checked;

    if (vMagMin || vMagMax) activeFilters.push(`Magnitud: ${vMagMin || '—'} – ${vMagMax || '—'}`);
    if (vDepMin || vDepMax) activeFilters.push(`Profundidad: ${vDepMin || '—'} – ${vDepMax || '—'} km`);
    if (vDateS   || vDateE) activeFilters.push(`Fechas: ${vDateS || '—'}  →  ${vDateE || '—'}`);
    if (vMain)               activeFilters.push('Solo terremotos principales');

    if (activeFilters.length) {
        const FH = 6 + activeFilters.length * 5;
        pdf.setFillColor(239, 246, 255);
        pdf.setDrawColor(191, 219, 254);
        pdf.rect(ML, y, CW, FH, 'FD');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7);
        pdf.setTextColor(37, 99, 235);
        pdf.text('FILTROS ACTIVOS', ML + 3, y + 4.5);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(30, 64, 175);
        activeFilters.forEach((f, i) => pdf.text(`•  ${f}`, ML + 3, y + 9.5 + i * 5));
        y += FH + 8;
    }

    // ── GR STATS TABLE ───────────────────────────────────────────────────
    if (cache) {
        pdf.setFillColor(...LIGHT);
        pdf.rect(ML, y, CW, 6, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7);
        pdf.setTextColor(...TEAL);
        pdf.text('ANÁLISIS GUTENBERG-RICHTER', ML + 2, y + 4.2);
        y += 8;

        const fV = (v, d = 3) => (v != null && Number.isFinite(Number(v))) ? Number(v).toFixed(d) : '—';
        const beta_gr  = cache.gr?.b  != null ? cache.gr.b  * Math.LN10 : null;
        const beta_mle = cache.mle?.b != null ? cache.mle.b * Math.LN10 : null;
        const tRows = [
            ['α  (nivel de actividad)',              fV(cache.gr?.a),           fV(cache.mle?.a)],
            ['b  (pendiente de recurrencia)',        fV(cache.gr?.b),           fV(cache.mle?.b)],
            ['β',                                   fV(beta_gr),               fV(beta_mle)],
            ['λ  (eventos/año ≥ Mc)',               fV(cache.gr?.lambda, 2),   fV(cache.mle?.lambda, 2)],
            ['R²  (bondad del ajuste)',              fV(cache.gr?.r2, 4),       fV(cache.mle?.r2, 4)],
            ['Magnitud de completitud  (Mc)',        fV(cache.Mc, 2),           '—'],
            ['Período de observación  (años)',       fV(cache.T_obs, 1),        '—'],
        ];

        const TCW = [CW * 0.55, CW * 0.225, CW * 0.225];
        const TR_H = 7.5;

        pdf.setFillColor(...TEAL);
        pdf.rect(ML, y, CW, TR_H, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.5);
        pdf.setTextColor(...WHITE);
        ['Parámetro', 'MMCC', 'MV'].forEach((h, i) => {
            const cx = ML + TCW.slice(0, i).reduce((a, b) => a + b, 0);
            pdf.text(h, cx + 2, y + 5.2);
        });
        y += TR_H;

        tRows.forEach((row, idx) => {
            pdf.setFillColor(...(idx % 2 === 0 ? WHITE : LIGHT));
            pdf.setDrawColor(...BORDER);
            pdf.rect(ML, y, CW, TR_H, 'FD');
            pdf.setFontSize(7.5);
            pdf.setTextColor(...DARK);
            row.forEach((cell, i) => {
                const cx = ML + TCW.slice(0, i).reduce((a, b) => a + b, 0);
                pdf.setFont('helvetica', i === 0 ? 'normal' : 'bold');
                pdf.text(cell, cx + 2, y + 5.2);
            });
            y += TR_H;
        });

        y += 8;

        // ── CHART IMAGE ──────────────────────────────────────────────────
        const chart = window.richterChartInstance;
        if (chart) {
            const IMG_H = 95;
            if (y + IMG_H > PH - 18) { pdf.addPage(); y = 20; }

            // Renderizar sobre canvas temporal con fondo blanco para PDF
            const src = chart.canvas;
            const tmp = document.createElement('canvas');
            tmp.width  = src.width;
            tmp.height = src.height;
            const tc = tmp.getContext('2d');
            tc.fillStyle = '#ffffff';
            tc.fillRect(0, 0, tmp.width, tmp.height);
            tc.drawImage(src, 0, 0);
            const imgData = tmp.toDataURL('image/png', 1.0);

            pdf.setFillColor(...WHITE);
            pdf.setDrawColor(...BORDER);
            pdf.rect(ML, y, CW, IMG_H + 4, 'FD');
            pdf.addImage(imgData, 'PNG', ML + 2, y + 2, CW - 4, IMG_H);
            y += IMG_H + 10;
        }
    }

    // ── FOOTER (all pages) ───────────────────────────────────────────────
    const totalPages = pdf.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p);
        pdf.setFillColor(...TEAL);
        pdf.rect(0, PH - 10, PW, 10, 'F');
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(...WHITE);
        pdf.text('Geoportal de Fuente Sísmica — Informe generado automáticamente', ML, PH - 3.5);
        pdf.text(`Página ${p} / ${totalPages}`, PW - ML, PH - 3.5, { align: 'right' });
    }

    pdf.save('informe_sismico.pdf');
}

function scheduleFilterRefresh() {
    window.clearTimeout(window.__mapFilterTimer);
    window.__mapFilterTimer = window.setTimeout(() => applyFilters(appState), 120);
}

function setPanelCollapsed(panel, collapsed) {
    if (!panel) return;

    panel.classList.toggle('is-collapsed', collapsed);
    const direction = panel.dataset.collapseDirection || 'up';
    const toggleBtn = document.querySelector(`.panel-toggle-btn[data-panel-target="${panel.id}"]`);
    const icon = toggleBtn?.querySelector('i');

    if (toggleBtn) {
        toggleBtn.setAttribute('aria-expanded', String(!collapsed));
        toggleBtn.title = collapsed
            ? (window.geoportalLanguage?.translate('panelExpand') || 'Desplegar panel')
            : (window.geoportalLanguage?.translate('panelCollapse') || 'Recoger panel');
    }

    if (icon) {
        if (direction === 'side') {
            icon.className = collapsed ? 'fas fa-angle-right' : 'fas fa-angle-left';
        } else {
            icon.className = collapsed ? 'fas fa-angle-down' : 'fas fa-angle-up';
        }
    }

    if (panel.id === 'sidebar') {
        const reopenTab = document.getElementById('sidebar-reopen-tab');
        if (reopenTab) reopenTab.classList.toggle('is-visible', collapsed);
    }
}

function initCollapsiblePanels() {
    document.querySelectorAll('.panel-toggle-btn[data-panel-target]').forEach((button) => {
        const targetId = button.dataset.panelTarget;
        const panel = document.getElementById(targetId);
        if (!panel) return;

        button.addEventListener('mousedown', (event) => event.stopPropagation());
        button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            setPanelCollapsed(panel, !panel.classList.contains('is-collapsed'));
        });

        setPanelCollapsed(panel, false);
    });

    const reopenTab = document.getElementById('sidebar-reopen-tab');
    if (reopenTab) {
        reopenTab.addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) setPanelCollapsed(sidebar, false);
        });
    }

    const hintPanel = document.getElementById('mapHintCard');
    if (hintPanel) {
        window.setTimeout(() => {
            hintPanel.classList.add('is-hidden');
        }, 10000);
    }

    document.addEventListener('geoportal:languageChanged', () => {
        document.querySelectorAll('.panel-toggle-btn[data-panel-target]').forEach((btn) => {
            const panelId = btn.dataset.panelTarget;
            const panel = document.getElementById(panelId);
            if (!panel) return;
            const collapsed = panel.classList.contains('is-collapsed');
            btn.title = collapsed
                ? (window.geoportalLanguage?.translate('panelExpand') || 'Expand panel')
                : (window.geoportalLanguage?.translate('panelCollapse') || 'Collapse panel');
        });
    });
}

function initVis() {
    appState.map = L.map('map1', {
        zoomControl: true,
        preferCanvas: true
    }).setView([40.0, -3.5], 6);

    // Shift the view right so Spain is centred in the visible area (left of the right sidebar)
    const sidebarEl = document.getElementById('sidebar');
    if (sidebarEl) {
        appState.map.panBy([sidebarEl.offsetWidth / 2, 0], { animate: false });
    }

    appState.map.createPane('zonesPane');
    L.DomUtil.addClass(appState.map.getPane('zonesPane'), 'leaflet-zones-pane');

    appState.map.createPane('earthquakesPane');
    L.DomUtil.addClass(appState.map.getPane('earthquakesPane'), 'leaflet-earthquakes-pane');

    appState.map.createPane('editMarkerPane');
    L.DomUtil.addClass(appState.map.getPane('editMarkerPane'), 'leaflet-edit-marker-pane');

    appState.canvasRenderer = L.canvas({ padding: 0.5, pane: 'earthquakesPane' });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        attribution: '&copy; OSM & CARTO'
    }).addTo(appState.map);

    L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(appState.map);

    // Initialize floating legend control after scale so it appears ABOVE the scale in bottomleft corner
    initFloatingLegend(appState.map);

    // Register the completeness panel as a Leaflet bottomleft control so it stacks
    // automatically above the legend (completeness → legend → scale, bottom to top).
    const completenessControl = L.control({ position: 'bottomleft' });
    completenessControl.onAdd = function() {
        const panel = document.getElementById('completeness-floating-table');
        L.DomEvent.disableClickPropagation(panel);
        L.DomEvent.disableScrollPropagation(panel);
        return panel;
    };
    completenessControl.addTo(appState.map);

    appState.earthquakeLayer = L.layerGroup().addTo(appState.map);
    appState.ellipsesLayer = L.layerGroup();
    appState.editTrailsLayer = L.layerGroup().addTo(appState.map);
    appState.zonasLayer = L.layerGroup().addTo(appState.map);

    window.toggleEllipses = (visible) => toggleEllipses(appState, visible);
    window.deleteZone = (zoneId) => deleteZone(appState, zoneId);
    window.openLayerWidget = () => {
        const el = document.querySelector('.layer-control-custom');
        if (el) el.classList.add('is-open');
    };
    window.applyFilters = () => applyFilters(appState);
    window.styleZoneLayers = () => styleZoneLayers(appState);
    window.selectZoneById = selectZoneById;
    window.refreshZoneQuickSelector = () => updateQuickZoneSelector(appState);
    window.renderRichterFromCache = (cache) => renderRichterFromCache(cache || appState.analysisCache || window.lastRichterCache);
    window.selectZoneFeature = (zoneId, featureId, feature) => {
        selectZoneFeature(appState, zoneId, featureId, feature);
        applyFilters(appState);
    };

    initLayerWidget(appState.map, {
        setLayerVisibility: (layerName, visible) => setLayerVisibility(appState, layerName, visible),
        toggleZoneLayer: (zoneId, visible) => {
            toggleZoneLayer(appState, zoneId, visible);
            applyFilters(appState);
        },
        toggleCatalogLayer: (catalogId, visible) => {
            toggleCatalogLayer(appState, catalogId, visible);
            applyFilters(appState);
        },
        selectZoneById
    });

    initFilterWidget(appState.map, {
        scheduleFilterRefresh,
        applyFilters: (event) => applyFilters(appState, event)
    });

    initExportWidget(appState.map, {
        exportJson: () => exportJSON(appState),
        exportCsv: () => downloadCSV(appState),
        exportPdf: exportRichterPdf
    });


    // Panel manager: coloca los paneles abiertos uno al lado del otro
    (function initPanelManager() {
        const PANEL_TOP = 60;
        const PANEL_LEFT_START = 50;
        const PANEL_GAP = 8;
        const ctrlSelectors = ['.layer-control-custom', '.filter-control-custom', '.export-control-custom'];

        function reflowPanels() {
            let left = PANEL_LEFT_START;
            ctrlSelectors.forEach(sel => {
                const ctrl = document.querySelector(sel);
                if (!ctrl) return;
                const panel = ctrl.querySelector('.layer-panel, .filter-panel, .export-panel');
                if (!panel) return;
                if (ctrl.classList.contains('is-open')) {
                    panel.style.left = left + 'px';
                    panel.style.top = PANEL_TOP + 'px';
                    left += (panel.offsetWidth || 300) + PANEL_GAP;
                }
            });
        }

        const observer = new MutationObserver(reflowPanels);
        ctrlSelectors.forEach(sel => {
            const ctrl = document.querySelector(sel);
            if (ctrl) observer.observe(ctrl, { attributes: true, attributeFilter: ['class'] });
        });
    })();

    document.getElementById('uploadCSV')?.addEventListener('click', () => uploadCatalogo(appState));
    document.getElementById('uploadSHP')?.addEventListener('click', () => uploadSHP(appState));
    document.getElementById('uploadCompleteness')?.addEventListener('click', () => uploadCompleteness(appState));
    document.getElementById('editModeBtn')?.addEventListener('click', () => toggleEditMode(appState));
    document.getElementById('undoMoveBtn')?.addEventListener('click', () => undoLastEdit(appState));
    document.getElementById('clearZoneBtn')?.addEventListener('click', () => clearZoneSelection(appState));
    document.getElementById('toggleTrails')?.addEventListener('change', (event) => setTrailsVisibility(appState, event.target.checked));
    document.getElementById('showEllipses')?.addEventListener('change', (event) => toggleEllipses(appState, event.target.checked));
    document.getElementById('richterModeSelect')?.addEventListener('change', () => {
        renderRichterFromCache(appState.analysisCache || window.lastRichterCache);
    });
    document.getElementById('openLayerWidgetBtn')?.addEventListener('click', () => {
        const el = document.querySelector('.layer-control-custom');
        if (el) el.classList.toggle('is-open');
    });
    document.getElementById('openFilterWidgetBtn')?.addEventListener('click', () => {
        const el = document.querySelector('.filter-control-custom');
        if (el) el.classList.toggle('is-open');
    });
    document.getElementById('openExportWidgetBtn')?.addEventListener('click', () => {
        const el = document.querySelector('.export-control-custom');
        if (el) el.classList.toggle('is-open');
    });
    document.getElementById('openCompletenessBtn')?.addEventListener('click', () => {
        const panel = document.getElementById('completeness-floating-table');
        if (panel) panel.classList.toggle('is-open');
    });

    updateLegend([]);
    updateQuickZoneSelector(appState);
    setTrailsVisibility(appState, true);
    initSidebarResizer();
    initCollapsiblePanels();
}

document.addEventListener('DOMContentLoaded', initVis);
