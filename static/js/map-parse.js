import { generateId } from './map-utils.js';

export const isMatrixCSV = (rows) => rows.length > 0 && rows[0].hasOwnProperty('Columna');

export const parseBoolean = (value, fallback = true) => {
    if (value === undefined || value === null || `${value}`.trim() === '') return fallback;
    const normalized = `${value}`.trim().toLowerCase();
    if (['true', '1', 'si', 'sí', 'yes', 'y'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n'].includes(normalized)) return false;
    return fallback;
};

export const getField = (row, candidates) => {
    if (!row || !candidates?.length) return undefined;
    const normalized = {};
    Object.keys(row).forEach(k => { normalized[k.trim().toLowerCase()] = row[k]; });
    for (const key of candidates) {
        const value = normalized[key.toLowerCase()];
        if (value !== undefined && value !== null && `${value}`.trim() !== '') return `${value}`.trim();
    }
    return undefined;
};

export const parseNumericValue = (value, fallback = 0) => {
    if (value === undefined || value === null || `${value}`.trim() === '') return fallback;
    const parsed = Number.parseFloat(`${value}`.trim().replace(',', '.').replace(/[^0-9eE+\-.]/g, ''));
    return Number.isFinite(parsed) ? parsed : fallback;
};

export const createFeature = (lon, lat, row = {}) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lon, lat] },
    properties: {
        // Posición original del catálogo: la elipse de error se ancla aquí siempre,
        // aunque el terremoto se arrastre luego para reasignarlo de zona.
        _origCoordinates: [lon, lat],
        eventid:      getField(row, ['eventid', 'id', 'source_id']) || generateId('eq'),
        magnitude:    parseNumericValue(getField(row, ['mag', 'magnitude', 'mw', 'Mw', 'MG', 'q']), 0),
        depth:        parseNumericValue(getField(row, ['depth', 'profundidad']), 0),
        place_name:   getField(row, ['place', 'location', 'eventid', 'name']) || 'Desconocido',
        date:         getField(row, ['date', 'datetime', 'fecha', 'time']) || '',
        smajax:       parseNumericValue(getField(row, ['smajax', 'semi_major']), 0),
        sminax:       parseNumericValue(getField(row, ['sminax', 'semi_minor']), 0),
        strike:       parseNumericValue(getField(row, ['strike', 'azimuth']), 0),
        is_main_shock: parseBoolean(getField(row, ['is_main_shock', 'main_shock', 'ismainshock', 'mainshock']), true)
    }
});

export function parseMatrixCSV(rows) {
    const nEvents = Object.keys(rows[0] || {}).length - 1;
    const features = [];
    for (let i = 1; i <= nEvents; i++) {
        const event = {};
        rows.forEach(row => {
            const key = row.Columna?.trim?.().toLowerCase();
            if (key) event[key] = row[Object.keys(row)[i]];
        });
        const lon = parseFloat(event.lon ?? event.longitude ?? event.lng ?? event.longitud ?? event.long);
        const lat = parseFloat(event.lat ?? event.latitude ?? event.latitud);
        if (Number.isFinite(lat) && Number.isFinite(lon)) features.push(createFeature(lon, lat, event));
    }
    return features;
}

export function parseStandardCSV(rows) {
    const features = [];
    (rows || []).forEach((row, idx) => {
        const lonText = getField(row, ['longitude', 'lon', 'lng', 'longitud', 'long', 'x', 'lon_deg']);
        const latText = getField(row, ['latitude', 'lat', 'latitud', 'y', 'lat_deg']);
        const lon = lonText ? parseFloat(`${lonText}`.replace(',', '.')) : NaN;
        const lat = latText ? parseFloat(`${latText}`.replace(',', '.')) : NaN;

        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
            const candidateLon = parseFloat(`${row[0] ?? ''}`.replace(',', '.'));
            const candidateLat = parseFloat(`${row[1] ?? ''}`.replace(',', '.'));
            if (Number.isFinite(candidateLon) && Number.isFinite(candidateLat)) {
                features.push(createFeature(candidateLon, candidateLat, row));
                return;
            }
            console.warn(`Fila CSV ignorada por coordenadas inválidas (índice ${idx}):`, row);
            return;
        }
        features.push(createFeature(lon, lat, row));
    });
    return features;
}

export function parseCompletenessCSV(text) {
    const currentYear = new Date().getFullYear();
    const clean = (text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text).replace(/\r/g, '').trim();
    if (!clean) return [];

    const allLines = clean.split('\n').filter(l => l.trim());
    if (!allLines.length) return [];

    const sep = ([',', ';', '\t']
        .map(s => ({ s, n: allLines[0].split(s).length - 1 }))
        .sort((a, b) => b.n - a.n)[0] || { s: ',' }).s;

    const normKey = s => s.trim().toLowerCase()
        .replace(/[áàäâ]/g, 'a').replace(/[éèëê]/g, 'e')
        .replace(/[íìïî]/g, 'i').replace(/[óòöô]/g, 'o')
        .replace(/[úùüû]/g, 'u').replace(/ñ/g, 'n')
        .replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

    const firstCols = allLines[0].split(sep).map(c => c.trim().replace(/^["']|["']$/g, ''));
    const hasHeader = isNaN(parseInt(firstCols[0], 10));

    // Formato "AÑO;Rango Mw": detectado cuando col1 contiene patrones "[X - Y)"
    {
        const dataLine = allLines[hasHeader ? 1 : 0] || '';
        const sampleCols = dataLine.split(sep).map(c => c.trim());
        const col1ascii = (sampleCols[1] || '').replace(/[^\x20-\x7E]/g, ' ').trim();
        if (sampleCols.length >= 2 && /^\[?\s*[\d.]+\s*[-–]/.test(col1ascii)) {
            const rangoRows = [];
            for (let i = hasHeader ? 1 : 0; i < allLines.length; i++) {
                const cols = allLines[i].split(sep).map(c => c.trim().replace(/^["']|["']$/g, ''));
                if (!cols.some(c => c)) continue;
                const year = parseInt(cols[0], 10);
                const m = (cols[1] || '').replace(/[^\x20-\x7E]/g, ' ').match(/[\d.]+/);
                const mc = m ? parseFloat(m[0]) : NaN;
                if (!isNaN(year) && !isNaN(mc) && mc > 0) rangoRows.push({ year, mc });
            }
            rangoRows.sort((a, b) => a.year - b.year);
            return rangoRows.map(r => ({ yearStart: r.year, mc: r.mc }));
        }
    }

    let colA = -1, colB = -1, colMc = -1;
    let dataStart = 0;

    if (hasHeader) {
        dataStart = 1;
        const hdr = firstCols.map(normKey);
        const getCol = (...candidates) => {
            for (const cand of candidates) {
                const idx = hdr.indexOf(normKey(cand));
                if (idx >= 0) return idx;
            }
            return -1;
        };
        colA  = getCol('year_start', 'year', 'inicio', 'start', 'from', 'ano', 'anio', 'ano_inicio', 'anio_inicio', 'a_inicio', 'ano_ini', 'yr_start', 'yr');
        colB  = getCol('year_end', 'fin', 'end', 'to', 'hasta', 'ano_fin', 'anio_fin', 'a_fin', 'yr_end');
        colMc = getCol('mc', 'mmin', 'm_c', 'mag', 'magnitude', 'completeness', 'minmag', 'mw', 'umbral', 'mc_minima', 'mc_min');
    }

    const rawRows = [];
    for (let i = dataStart; i < allLines.length; i++) {
        const cols = allLines[i].split(sep).map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (!cols.some(c => c)) continue;

        let yearStart, yearEnd = null, mc;

        if (hasHeader && colA >= 0 && colMc >= 0) {
            yearStart = parseInt(cols[colA] ?? '', 10);
            mc        = parseFloat((cols[colMc] ?? '').replace(',', '.'));
            if (colB >= 0) {
                const rawEnd = (cols[colB] ?? '').toLowerCase();
                const parsed = parseInt(rawEnd, 10);
                yearEnd = (!rawEnd || rawEnd === 'present' || rawEnd === 'actual' || isNaN(parsed)) ? currentYear : parsed;
            }
        } else {
            if (cols.length >= 3) {
                yearStart = parseInt(cols[0], 10);
                const rawEnd = (cols[1] ?? '').toLowerCase();
                const parsed = parseInt(rawEnd, 10);
                yearEnd = (rawEnd === 'present' || rawEnd === 'actual' || isNaN(parsed)) ? currentYear : parsed;
                mc = parseFloat((cols[2] ?? '').replace(',', '.'));
            } else if (cols.length === 2) {
                yearStart = parseInt(cols[0], 10);
                mc        = parseFloat((cols[1] ?? '').replace(',', '.'));
            } else continue;
        }

        if (!isNaN(yearStart) && !isNaN(mc) && mc > 0) rawRows.push({ yearStart, yearEnd, mc });
    }

    rawRows.sort((a, b) => a.yearStart - b.yearStart);
    return rawRows;
}
