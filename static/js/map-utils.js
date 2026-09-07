// Módulo de utilidades compartidas

export function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = n => {
        const k = (n + h / 30) % 12;
        const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
        return Math.round(255 * c).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

export function generateZoneColor() {
    return hslToHex(Math.floor(Math.random() * 360), 72, 42);
}

export function getDistanceToPolygon(lon, lat, geometry) {
    let minDistSq = Infinity;
    const R = 111.32;
    const cosLat = Math.cos(lat * Math.PI / 180);

    function distanceSq(px, py, vx, vy, wx, wy) {
        const l2 = (wx - vx) ** 2 + (wy - vy) ** 2;
        if (l2 === 0) return (px - vx) ** 2 + (py - vy) ** 2;
        const t = Math.max(0, Math.min(1, ((px - vx) * (wx - vx) + (py - vy) * (wy - vy)) / l2));
        return (px - (vx + t * (wx - vx))) ** 2 + (py - (vy + t * (wy - vy))) ** 2;
    }

    function checkRing(ring) {
        for (let i = 0; i < ring.length - 1; i++) {
            const vx = (ring[i][0] - lon) * cosLat * R;
            const vy = (ring[i][1] - lat) * R;
            const wx = (ring[i + 1][0] - lon) * cosLat * R;
            const wy = (ring[i + 1][1] - lat) * R;
            const dSq = distanceSq(0, 0, vx, vy, wx, wy);
            if (dSq < minDistSq) minDistSq = dSq;
        }
    }

    if (geometry.type === 'Polygon') geometry.coordinates.forEach(checkRing);
    else if (geometry.type === 'MultiPolygon') geometry.coordinates.forEach(poly => poly.forEach(checkRing));
    return Math.sqrt(minDistSq);
}

export function generateId(prefix='id') {
    return `${prefix}_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
}

export const DEFAULT_MAGNITUDE_COLORS = ['#fff9c4', '#fff176', '#ffb74d', '#ff7043', '#e53935', '#000000'];

export const MAGNITUDE_COLORS = [
    { maxMag: 2,        color: '#fff9c4' },
    { maxMag: 4,        color: '#fff176' },
    { maxMag: 5.5,      color: '#ffb74d' },
    { maxMag: 7,        color: '#ff7043' },
    { maxMag: 8.5,      color: '#e53935' },
    { maxMag: Infinity, color: '#000000' }
];

export function getColorByMagnitude(mag) {
    if (mag === null || mag === undefined || isNaN(mag)) return '#cccccc';
    for (const entry of MAGNITUDE_COLORS) {
        if (mag < entry.maxMag) return entry.color;
    }
    return MAGNITUDE_COLORS[MAGNITUDE_COLORS.length - 1].color;
}

export function createEarthquakeIcon(mag, isMain, isDimmed = false, outsideEllipse = false) {
    const raw = (mag && !isNaN(mag)) ? Math.round(2 + Math.pow(mag, 2) / 2) : 3;
    const size = Math.min(45, Math.max(3, raw));
    const color = getColorByMagnitude(mag);
    const stroke = outsideEllipse ? '#ef4444' : (mag >= 7) ? '#000000' : 'rgba(0,0,0,0.6)';
    const strokeWidth = outsideEllipse ? 2.5 : 1;
    const opacity = isDimmed ? 0.6 : 1;
    const svg = `\n      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" opacity="${opacity}">\n        <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 1}"\n          fill="${color}" stroke="${stroke}" stroke-width="${strokeWidth}" />\n      </svg>`;
    return L.divIcon({ html: svg, className: '', iconSize: [size, size], iconAnchor: [size/2, size/2] });
}

export async function reverseGeocode(lat, lon) {
    const language = window.geoportalLanguage?.getAcceptLanguage?.() || 'es';
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=${language}`;
    try {
        const r = await fetch(url, { method: 'GET', headers: { 'Referer': window.location.origin } });
        if (!r.ok) throw new Error('Geo error');
        const data = await r.json();
        if (data && data.address) {
            const a = data.address;
            return a.city || a.town || a.village || a.hamlet || a.county || data.display_name || window.geoportalLanguage?.translate('reverseGeocodeUnknown') || 'Desconocida';
        }
        return data.display_name || window.geoportalLanguage?.translate('reverseGeocodeUnknown') || 'Desconocida';
    } catch (err) {
        console.warn('reverseGeocode fallo:', err);
        return window.geoportalLanguage?.translate('reverseGeocodeUnknown') || 'Desconocida';
    }
}

export function drawErrorEllipse(lat, lon, semiMajor, semiMinor, azimuth, options = {color: '#444', weight: 1, fillOpacity: 0.15}) {
    const points = [];
    const n = 40;
    const rot = azimuth * Math.PI / 180;
    for (let i = 0; i < n; i++) {
        const t = (i / n) * 2 * Math.PI;
        const x = semiMajor * Math.cos(t);
        const y = semiMinor * Math.sin(t);
        const xr = x * Math.cos(rot) - y * Math.sin(rot);
        const yr = x * Math.sin(rot) + y * Math.cos(rot);
        points.push([lat + yr / 111, lon + xr / (111 * Math.cos(lat * Math.PI / 180))]);
    }
    return L.polygon(points, { ...options, interactive: false });
}

export function isInsideEllipse(newLat, newLng, centerLat, centerLon, semiMajorKm, semiMinorKm, azimuthDeg) {
    const R = 111;
    const dy = (newLat - centerLat) * R;
    const dx = (newLng - centerLon) * R * Math.cos(centerLat * Math.PI / 180);
    const rot = azimuthDeg * Math.PI / 180;
    const u = dx * Math.cos(rot) + dy * Math.sin(rot);
    const v = -dx * Math.sin(rot) + dy * Math.cos(rot);
    return (u / semiMajorKm) ** 2 + (v / semiMinorKm) ** 2 <= 1;
}

export function pointInPolygon(lon, lat, geometry) {
    if (!geometry || !geometry.coordinates) return false;
    if (geometry.type === 'MultiPolygon') {
        return geometry.coordinates.some((poly) => {
            return poly.some((ring) => pointInPolygonRing(lon, lat, ring));
        });
    }
    if (geometry.type === 'Polygon') {
        return pointInPolygonRing(lon, lat, geometry.coordinates[0]);
    }
    return false;
}

export function pointInPolygonRing(lon, lat, coords) {
    if (!coords || coords.length < 3) return false;
    let inside = false;
    for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
        const xi = coords[i][0], yi = coords[i][1];
        const xj = coords[j][0], yj = coords[j][1];
        const intersect = ((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

export function makePopupHtml(f) {
    const coords = f.geometry && f.geometry.coordinates ? f.geometry.coordinates : [NaN, NaN];
    const lon = coords[0];
    const lat = coords[1];
    const translate = window.geoportalLanguage?.translate?.bind(window.geoportalLanguage) || ((key) => key);
    const place = f.properties.place_name;
    const placeLabel = translate('popupLocation');
    const idLabel = translate('popupId');
    const dateLabel = translate('popupDate');
    const magLabel = translate('popupMagnitude');
    const depthLabel = translate('popupDepth');
    const mainLabel = translate('popupMain');
    const yesText = translate('popupYes');
    const noText = translate('popupNo');
    const unknownText = translate('reverseGeocodeUnknown');
    const placeLine = place ? `<div><strong>${placeLabel}:</strong> ${place} <small>(${isFinite(lat) ? lat.toFixed(4) : 'N/A'}, ${isFinite(lon) ? lon.toFixed(4) : 'N/A'})</small></div>` :
                              `<div><strong>${placeLabel}:</strong> ${isFinite(lat) ? lat.toFixed(4) : 'N/A'}, ${isFinite(lon) ? lon.toFixed(4) : 'N/A'}</div>`;
    return `
        <div class="popup-table">
            <div><strong>${idLabel}:</strong> ${f.properties.eventid || 'N/A'}</div>
            <div><strong>${dateLabel}:</strong> ${f.properties.date || 'N/A'}</div>
            <div><strong>${magLabel}:</strong> ${f.properties.magnitude ?? 'N/A'}</div>
            <div><strong>${depthLabel}:</strong> ${f.properties.depth ?? 'N/A'}</div>
            ${placeLine}
            <div><strong>${mainLabel}:</strong> ${f.properties.is_main_shock ? yesText : noText}</div>
        </div>`;
}

