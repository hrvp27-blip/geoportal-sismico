import { createLeafletWidget } from './widget-factory.js';

let exportControlInstance = null;
let exportHandlers = {};

function buildExportBody(body) {
    const t = key => window.geoportalLanguage?.translate(key) || key;

    [
        { id: 'exportJsonBtn',       icon: 'fa-file-code', key: 'exportJson', handler: () => exportHandlers.exportJson?.() },
        { id: 'exportCsvBtn',        icon: 'fa-file-csv',  key: 'exportCsv',  handler: () => exportHandlers.exportCsv?.() },
        { id: 'exportRichterPdfBtn', icon: 'fa-file-pdf',  key: 'exportPdf',  handler: () => exportHandlers.exportPdf?.() },
    ].forEach(({ id, icon, key, handler }) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = id;
        btn.className = 'export-widget-btn';
        btn.innerHTML = `<i class="fas ${icon}"></i><span data-i18n="${key}">${t(key)}</span>`;
        btn.addEventListener('click', handler);
        body.appendChild(btn);
    });
}

export function initExportWidget(mapInstance, handlers = {}) {
    exportHandlers = handlers;
    if (exportControlInstance) { mapInstance.removeControl(exportControlInstance); exportControlInstance = null; }

    exportControlInstance = createLeafletWidget({
        position:       'topleft',
        cssClass:       'export-control-custom',
        btnClass:       'export-btn-toggle',
        panelClass:     'export-panel',
        icon:           '<i class="fas fa-file-export"></i>',
        titleKey:       'exportControlTitle',
        contentBuilder: buildExportBody
    });

    exportControlInstance.addTo(mapInstance);
}
