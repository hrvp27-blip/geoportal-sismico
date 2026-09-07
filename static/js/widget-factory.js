export function createLeafletWidget({ position, cssClass, btnClass, panelClass, icon, titleKey, contentBuilder }) {
    const t = key => window.geoportalLanguage?.translate(key) || key;
    const control = L.control({ position });

    control.onAdd = function () {
        const div = L.DomUtil.create('div', `leaflet-control leaflet-bar ${cssClass}`);

        const btn = L.DomUtil.create('a', btnClass, div);
        btn.href = '#';
        btn.innerHTML = icon;
        btn.title = t(titleKey);
        btn.setAttribute('aria-label', t(titleKey));

        const panel = L.DomUtil.create('div', panelClass, div);

        const header = L.DomUtil.create('div', 'widget-panel-header', panel);
        header.innerHTML = `${icon}<span data-i18n="${titleKey}">${t(titleKey)}</span><button class="widget-close-btn" type="button" aria-label="Cerrar">&#x2715;</button>`;
        header.querySelector('.widget-close-btn').addEventListener('click', () => div.classList.remove('is-open'));

        const body = L.DomUtil.create('div', 'widget-panel-body', panel);
        contentBuilder(body, div);

        L.DomEvent.on(btn, 'click', e => { L.DomEvent.preventDefault(e); div.classList.toggle('is-open'); });
        L.DomEvent.disableClickPropagation(div);
        L.DomEvent.disableScrollPropagation(div);
        L.DomEvent.on(panel, 'mousedown', L.DomEvent.stopPropagation);
        L.DomEvent.on(panel, 'click', L.DomEvent.stopPropagation);

        return div;
    };

    return control;
}
