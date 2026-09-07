/**
 * map-analysis.js — Análisis de Gutenberg-Richter
 *
 * Implementa la ley de Gutenberg-Richter (G-R):
 *
 *   log₁₀ N(≥M) = a − b·M
 *
 * donde:
 *   N(≥M) = número de eventos con magnitud ≥ M
 *   a      = nivel de sismicidad (intercepto; depende del volumen y periodo)
 *   b      = pendiente (≈ 1 en la mayoría de regiones; mide la relación terremotos grandes/pequeños)
 *   M      = magnitud
 *
 * Se calculan dos estimaciones de a y b:
 *   1) OLS  — Regresión por mínimos cuadrados ordinarios sobre la frecuencia acumulada.
 *   2) MLE  — Estimador de máxima verosimilitud de Aki (1965) / Utsu (1965).
 *
 * Referencia principal: Gutenberg & Richter (1944), Bull. Seismol. Soc. Am. 34, 185–188.
 */

function getSelectedMode() {
    return document.getElementById('richterModeSelect')?.value || 'both';
}

// =============================================================================
// REGRESIÓN LINEAL (OLS — Ordinary Least Squares)
// =============================================================================
/**
 * Ajuste por mínimos cuadrados ordinarios de y = intercepto + slope·x.
 *
 * Fórmulas cerradas de la regresión lineal simple:
 *
 *   slope     = (n·Σxy − Σx·Σy) / (n·Σx² − (Σx)²)
 *   intercept = (Σy − slope·Σx) / n
 *
 * Coeficiente de determinación (bondad del ajuste):
 *
 *   R² = 1 − SS_res / SS_tot
 *
 *   SS_res = Σ (yᵢ − ŷᵢ)²   (suma de residuos al cuadrado)
 *   SS_tot = Σ (yᵢ − ȳ)²    (varianza total)
 *
 * R² = 1 → ajuste perfecto; R² = 0 → el modelo no explica la varianza.
 *
 * @param {number[]} x - Array de magnitudes (variable independiente)
 * @param {number[]} y - Array de log₁₀(N) (variable dependiente)
 * @returns {{ slope, intercept, r2 } | null}
 */
export function linearRegression(x, y) {
    const n = x.length;
    if (n < 2) return null;

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
        sumX  += x[i];
        sumY  += y[i];
        sumXY += x[i] * y[i];
        sumX2 += x[i] * x[i];
    }

    // Denominador del estimador OLS (= varianza muestral de x × n)
    const denom = n * sumX2 - sumX * sumX;
    if (denom === 0) return null;          // Todos los x son iguales → no hay ajuste posible

    const slope     = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;

    // R²
    const yMean = sumY / n;
    let ssRes = 0, ssTot = 0;
    for (let i = 0; i < n; i++) {
        ssRes += Math.pow(y[i] - (intercept + slope * x[i]), 2);
        ssTot += Math.pow(y[i] - yMean, 2);
    }

    const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
    return { slope, intercept, r2 };
}

// =============================================================================
// ESTIMADOR DE MÁXIMA VEROSIMILITUD (MLE — Aki 1965 / Utsu 1965)
// =============================================================================
/**
 * Estimador de máxima verosimilitud del parámetro b de la ley G-R.
 *
 * Si las magnitudes siguen una distribución exponencial truncada en Mc,
 * la función de verosimilitud se maximiza con:
 *
 *   b_MLE = log₁₀(e) / (M̄ − Mc_min)
 *
 * donde:
 *   M̄      = magnitud media de los eventos con M ≥ Mc  (Σmᵢ / N)
 *   Mc_min = Mc − ΔM/2  = límite inferior efectivo del bin Mc
 *   ΔM     = anchura del bin de magnitud = 0.1
 *   log₁₀(e) ≈ 0.4343  (factor de conversión ln → log₁₀)
 *
 * Referencias: Aki (1965) J. Phys. Earth 13:1; Utsu (1965) Geophys. Mag. 30:521.
 *
 * El parámetro a se obtiene de la condición de normalización en Mc:
 *
 *   log₁₀(N) = a − b·Mc   →   a = log₁₀(N) + b·Mc
 *
 * donde N es el número total de eventos con M ≥ Mc.
 *
 * @param {number[]} magnitudes - Magnitudes ya filtradas (M ≥ Mc)
 * @param {number|null} mc      - Magnitud de completitud (Mc); si null, usa el mínimo observado
 * @returns {{ a, b, minMag, maxMag } | null}
 */
export function calculateMaximumLikelihood(magnitudes = [], mc = null) {
    if (!Array.isArray(magnitudes) || magnitudes.length < 2) return null;

    const sorted   = [...magnitudes].sort((a, b) => a - b);
    const minMag   = mc !== null ? mc : sorted[0];       // Mc (límite inferior)
    const maxMag   = sorted[sorted.length - 1];           // Magnitud máxima observada
    const meanMag  = sorted.reduce((acc, v) => acc + v, 0) / sorted.length;  // M̄
    const binWidth = 0.1;                                  // ΔM = anchura del bin

    // Mc_min = Mc − ΔM/2 (límite inferior efectivo del bin de magnitud de completitud)
    const denom = meanMag - (minMag - binWidth / 2);      // M̄ − Mc_min

    // Si denom ≤ 0 el catálogo es degenerado (todas las magnitudes iguales o M̄ < Mc)
    if (!Number.isFinite(denom) || denom <= 0) return null;

    // b = log₁₀(e) / (M̄ − Mc_min)
    const b = Math.LOG10E / denom;   // Math.LOG10E = log₁₀(e) ≈ 0.4343

    // a tal que log₁₀(N_Mc) = a − b·Mc, es decir, a = log₁₀(N) + b·Mc
    const a = Math.log10(sorted.length) + b * minMag;

    return { a, b, minMag, maxMag };
}

// =============================================================================
// R² DE UN MODELO EXTERNO (para evaluar el ajuste MLE sobre los datos observados)
// =============================================================================
/**
 * Calcula R² de una función de predicción predictFn(x) contra puntos observados.
 *
 *   R² = 1 − SS_res / SS_tot
 *
 * Se usa para medir cuánto explica la línea MLE la varianza de los puntos
 * de frecuencia acumulada observados. Permite comparar OLS vs MLE en igualdad de condiciones.
 *
 * @param {{ x, y }[]} points  - Puntos observados
 * @param {(x: number) => number} predictFn - Función modelo: x → log₁₀(N̂)
 * @returns {number | null}
 */
function computeR2ForModel(points, predictFn) {
    if (!points || points.length < 2) return null;
    const yMean = points.reduce((s, p) => s + p.y, 0) / points.length;
    let ssRes = 0, ssTot = 0;
    for (const p of points) {
        ssRes += Math.pow(p.y - predictFn(p.x), 2);
        ssTot += Math.pow(p.y - yMean, 2);
    }
    return ssTot === 0 ? 1 : 1 - ssRes / ssTot;
}

// =============================================================================
// TABLA DE ESTADÍSTICOS
// =============================================================================
export function updateStatsTable(stats, count) {
    const t = window.geoportalLanguage?.translate?.bind(window.geoportalLanguage) || ((k) => k);
    const container = document.getElementById('comparative_table');
    if (!container) return;

    if (!stats) { container.innerHTML = ''; return; }

    const fV  = (v, d = 3) => (v != null && Number.isFinite(Number(v))) ? Number(v).toFixed(d) : '—';
    const N   = stats.N ?? count;
    const Mc  = fV(stats.Mc, 2);
    const Mmax = fV(stats.maxMagObs, 1);
    const T   = fV(stats.T_obs, 1);

    container.innerHTML = `
        <div class="gr-stats">
            <table class="gr-stats-table">
                <thead>
                    <tr>
                        <th>${t('statsParameter')}</th>
                        <th>${t('statsGR')}</th>
                        <th>${t('statsMLE')}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="gr-td-label">Mc (mag. mín.)</td>
                        <td class="gr-td-val">${Mc}</td>
                        <td class="gr-td-val">${Mc}</td>
                    </tr>
                    <tr>
                        <td class="gr-td-label">Mag. máx. observada</td>
                        <td class="gr-td-val">${Mmax}</td>
                        <td class="gr-td-val">${Mmax}</td>
                    </tr>
                    <tr>
                        <td class="gr-td-label">α</td>
                        <td class="gr-td-val">${fV(stats.gr?.a)}</td>
                        <td class="gr-td-val">${fV(stats.mle?.a)}</td>
                    </tr>
                    <tr>
                        <td class="gr-td-label">b</td>
                        <td class="gr-td-val">${fV(stats.gr?.b)}</td>
                        <td class="gr-td-val">${fV(stats.mle?.b)}</td>
                    </tr>
                    <tr>
                        <td class="gr-td-label">λ (eventos/año ≥ Mc)</td>
                        <td class="gr-td-val">${fV(stats.gr?.lambda, 2)}</td>
                        <td class="gr-td-val">${fV(stats.mle?.lambda, 2)}</td>
                    </tr>
                    <tr>
                        <td class="gr-td-label">R²</td>
                        <td class="gr-td-val">${fV(stats.gr?.r2, 4)}</td>
                        <td class="gr-td-val">${fV(stats.mle?.r2, 4)}</td>
                    </tr>
                </tbody>
            </table>
            <div class="gr-global-row">
                <div class="gr-global-card">
                    <span class="gr-global-label">Beta (MMCC)</span>
                    <span class="gr-global-val">${fV(stats.gr?.b != null ? stats.gr.b * Math.LN10 : null)}</span>
                </div>
                <div class="gr-global-card">
                    <span class="gr-global-label">Beta (MV)</span>
                    <span class="gr-global-val">${fV(stats.mle?.b != null ? stats.mle.b * Math.LN10 : null)}</span>
                </div>
                <div class="gr-global-card">
                    <span class="gr-global-label">Período de análisis (años)</span>
                    <span class="gr-global-val">${T}</span>
                </div>
                <div class="gr-global-card">
                    <span class="gr-global-label">${t('statsEventsAnalyzed')}</span>
                    <span class="gr-global-val">${N}</span>
                </div>
            </div>
        </div>
    `;
}

// =============================================================================
// PIPELINE PRINCIPAL — calculateGutenbergRichter
// =============================================================================
/**
 * Calcula los parámetros de Gutenberg-Richter a partir de un conjunto de features.
 *
 * Flujo de cálculo:
 *
 *   1. Extrae magnitudes y fechas de los features.
 *   2. Calcula T_obs (periodo de observación en años).
 *   3. Estima Mc con el método MAXC (Maximum Curvature).
 *   4. Filtra eventos con M ≥ Mc.
 *   5. Construye los puntos de frecuencia acumulada N(≥M).
 *   6. Ajusta OLS sobre log₁₀(N) vs M.
 *   7. Ajusta MLE (Aki-Utsu) sobre los mismos eventos.
 *   8. Calcula λ (tasa anual ≥ Mc) para cada método.
 *   9. Calcula R² de ambos ajustes.
 *  10. Actualiza la tabla y renderiza la gráfica.
 *
 * @param {GeoJSONFeature[]} features  - Eventos sísmicos a analizar (solo interior de zona)
 * @param {AppState} appState
 * @param {{ renderRichterFromCache }} renderModule
 * @param {(cache) => void} [onComplete]
 */
export function calculateGutenbergRichter(features, appState, renderModule, onComplete) {
    if (!features || features.length === 0) {
        updateStatsTable(null, 0);
        if (appState) appState.analysisCache = null;
        window.lastRichterCache = null;
        renderModule?.renderRichterFromCache?.(null);
        onComplete?.(null);
        return;
    }

    // -------------------------------------------------------------------------
    // 1. MAGNITUDES — extraer y ordenar
    // -------------------------------------------------------------------------
    const mags = features
        .map((f) => Number(f?.properties?.magnitude))
        .filter(Number.isFinite)
        .sort((a, b) => a - b);   // Orden ascendente

    if (!mags.length) {
        updateStatsTable({ gr: null, mle: null, Mc: 0, maxMagObs: 0, N: 0, T_obs: 0 }, 0);
        if (appState) appState.analysisCache = null;
        window.lastRichterCache = null;
        renderModule?.renderRichterFromCache?.(null);
        onComplete?.(null);
        return;
    }

    // -------------------------------------------------------------------------
    // 2. T_obs — PERIODO DE OBSERVACIÓN (años)
    //
    //  Opciones (en orden de preferencia):
    //
    //  A) Con tabla de completitud definida por el usuario:
    //     Se usa la duración del periodo con Mc más bajo (periodo de mejor detección),
    //     pues define la ventana temporal válida para el análisis.
    //     T_obs = año_actual − año_inicio_del_periodo_con_menor_Mc
    //
    //  B) Sin tabla de completitud: rango real de fechas del catálogo.
    //     T_obs = (fecha_max − fecha_min) en años
    //
    //  C) Sin fechas disponibles: aproximación histórica (año actual − 1900).
    //
    //  NOTA: T_obs entra en el cálculo de λ (tasa anual). Un T_obs incorrecto
    //  afecta λ pero no a los parámetros a y b.
    // -------------------------------------------------------------------------
    const validDates = features
        .map((f) => f.properties?.date ? new Date(f.properties.date) : null)
        .filter((d) => d && !isNaN(d.getTime()));

    let T_obs;
    if (appState?.completenessCriteria?.length) {
        // Opción A: completitud definida por el usuario
        const currentYear = new Date().getFullYear();
        const minMcPeriod = appState.completenessCriteria.reduce(
            (prev, curr) => curr.mc <= prev.mc ? curr : prev
        );
        T_obs = Math.max(1, currentYear - minMcPeriod.yearStart);
    } else if (validDates.length >= 2) {
        // Opción B: rango real de fechas
        const tMin = Math.min(...validDates.map((d) => d.getTime()));
        const tMax = Math.max(...validDates.map((d) => d.getTime()));
        T_obs = Math.max(1, (tMax - tMin) / (365.25 * 24 * 3600 * 1000));
    } else {
        // Opción C: fallback histórico
        T_obs = Math.max(1, new Date().getFullYear() - 1900);
    }

    // -------------------------------------------------------------------------
    // 3. Mc — MAGNITUD DE COMPLETITUD por MAXC (Maximum Curvature)
    //
    //  El método MAXC (Wiemer & Wyss 2000) estima Mc como la magnitud del bin
    //  con mayor frecuencia en el histograma de magnitudes.
    //
    //  Algoritmo:
    //    a) Construir histograma con bins de ΔM = 0.1
    //    b) Mc = magnitud del bin con mayor conteo de eventos
    //
    //  Limitación conocida: MAXC tiende a subestimar Mc en ~0.1–0.2 unidades
    //  (Woessner & Wiemer 2005, Bull. Seismol. Soc. Am.).
    //  Algunos estudios aplican una corrección de +0.2; aquí no se aplica.
    // -------------------------------------------------------------------------
    const binSize = 0.1;
    const freqBins = {};
    for (const m of mags) {
        // Redondeo al bin de 0.1 más cercano hacia abajo
        const bin = Math.round(Math.floor(m / binSize) * binSize * 10) / 10;
        freqBins[bin] = (freqBins[bin] || 0) + 1;
    }
    const allBinKeys = Object.keys(freqBins).map(Number).sort((a, b) => a - b);
    const maxFreq = Math.max(...allBinKeys.map(b => freqBins[b]));
    const mcBin   = allBinKeys.find(b => freqBins[b] === maxFreq) ?? mags[0];
    const Mc      = Math.round(mcBin * 10) / 10;  // Magnitud de completitud

    // -------------------------------------------------------------------------
    // 4. FILTRADO POR Mc
    //
    //  Solo se usan eventos con M ≥ Mc para el análisis G-R.
    //  Eventos por debajo de Mc se consideran incompletos en el catálogo.
    // -------------------------------------------------------------------------
    const magsAboveMc = mags.filter(m => m >= Mc);
    const maxMagObs   = magsAboveMc[magsAboveMc.length - 1];  // Magnitud máxima observada
    const N           = magsAboveMc.length;                    // N total de eventos ≥ Mc

    // -------------------------------------------------------------------------
    // 5. PUNTOS DE FRECUENCIA ACUMULADA — N(≥M)
    //
    //  Para cada bin de magnitud m (desde Mc hasta maxMag, paso 0.1):
    //    N(≥m) = número de eventos con magnitud ≥ m
    //    y = log₁₀(N(≥m))
    //
    //  Estos puntos (m, log₁₀ N) forman la nube de la gráfica G-R.
    //
    //  Filtro de duplicados consecutivos:
    //    Si dos bins consecutivos tienen el mismo N, se omite el segundo.
    //    Razón: en la cola de alta magnitud hay pocos eventos y muchos bins
    //    comparten el mismo N, creando una línea horizontal espuria en el gráfico.
    // -------------------------------------------------------------------------
    const binMax = Math.ceil(maxMagObs * 10) / 10;
    const dataPoints = [];
    let prevCount = -1;
    for (let m = Mc; m <= binMax + 1e-9; m = Math.round((m + 0.1) * 100) / 100) {
        const n = magsAboveMc.filter((v) => v >= m).length;  // N(≥m)
        if (n > 0 && n !== prevCount) {
            dataPoints.push({ x: m, y: Math.log10(n) });     // Punto (M, log₁₀ N)
            prevCount = n;
        }
    }

    // -------------------------------------------------------------------------
    // 6. OLS — AJUSTE POR MÍNIMOS CUADRADOS
    //
    //  Se ajusta la recta:  log₁₀(N) = a + slope·M
    //  donde slope ≈ −b (pendiente negativa).
    //
    //  NOTA: Se excluyen puntos con N = 1 (y = 0) antes de la regresión.
    //  Razón: el último punto de la cola (N=1) es un valor singular muy disperso
    //  que sesga artificialmente la pendiente hacia valores de b más bajos.
    //  Esta es una práctica habitual en la literatura (e.g., Aki 1965).
    //
    //  El parámetro a de la ley G-R es el intercepto de la regresión:
    //    a = lr.intercept  (valor de log₁₀ N extrapolado a M = 0)
    //  El parámetro b es la pendiente cambiada de signo:
    //    b = −slope  (b siempre positivo)
    // -------------------------------------------------------------------------
    const regressionPoints = dataPoints.filter(p => p.y > 0);   // Excluir N=1
    const lr = regressionPoints.length >= 2
        ? linearRegression(regressionPoints.map(p => p.x), regressionPoints.map(p => p.y))
        : null;

    // -------------------------------------------------------------------------
    // 7. MLE — ESTIMADOR AKI-UTSU (anclado en Mc)
    //
    //  Llama a calculateMaximumLikelihood con los eventos ya filtrados M ≥ Mc.
    //  Devuelve { a, b, minMag, maxMag } según las fórmulas documentadas arriba.
    // -------------------------------------------------------------------------
    const mle = calculateMaximumLikelihood(magsAboveMc, Mc);

    // -------------------------------------------------------------------------
    // 8. λ — TASA ANUAL DE EVENTOS CON M ≥ Mc  (eventos/año)
    //
    //  λ es el parámetro de un proceso de Poisson:
    //    P(k eventos en 1 año) = (λᵏ·e^−λ) / k!
    //
    //  OLS: Se evalúa el modelo en Mc para obtener la tasa predicha por la recta.
    //    log₁₀(N_modelo en Mc) = intercepto + slope·Mc = a − b·Mc
    //    N_modelo_en_Mc = 10^(a − b·Mc)
    //    λ_OLS = N_modelo_en_Mc / T_obs
    //
    //  MLE: Se usa directamente el conteo observado (estimador insesgado de Poisson).
    //    λ_MLE = N_observado / T_obs
    //
    //  Diferencia esperada: λ_OLS depende del ajuste de la recta en Mc,
    //  λ_MLE refleja directamente la sismicidad observada. Ambos son válidos.
    // -------------------------------------------------------------------------
    // λ OLS: modelo predicho en Mc → tasa anual
    const lambda_gr  = lr  ? Math.pow(10, lr.intercept + lr.slope * Mc) / T_obs : null;
    // λ MLE: tasa observada directa
    const lambda_mle = N / T_obs;

    // -------------------------------------------------------------------------
    // 9. R² DEL AJUSTE MLE
    //
    //  El R² del OLS ya se calcula internamente en linearRegression().
    //  Para el MLE se calcula a posteriori comparando la línea MLE contra
    //  todos los puntos de frecuencia acumulada (incluyendo N=1).
    //  Esto permite comparar OLS y MLE en igualdad de condiciones sobre
    //  los mismos puntos observados.
    // -------------------------------------------------------------------------
    const r2_mle = mle
        ? computeR2ForModel(dataPoints, (x) => mle.a - mle.b * x)
        : null;

    // -------------------------------------------------------------------------
    // 10. EMPAQUETAR ESTADÍSTICOS
    //
    //  stats.gr  → parámetros OLS (a, b positivo, R², λ)
    //  stats.mle → parámetros MLE (a, b positivo, R², λ)
    //  stats.Mc  → magnitud de completitud
    //  stats.N   → número de eventos usados (M ≥ Mc)
    //  stats.T_obs → periodo de observación en años
    //
    //  NOTA sobre b:
    //    lr.slope es negativo (pendiente descendente en log₁₀ N vs M).
    //    Se almacena como Math.abs(lr.slope) para mostrarlo como valor positivo
    //    conforme a la convención estándar de la ley G-R (a − b·M con b > 0).
    // -------------------------------------------------------------------------
    const stats = {
        gr: lr ? {
            a:      Number(lr.intercept.toFixed(3)),         // Intercepto (a OLS)
            b:      Number(Math.abs(lr.slope).toFixed(3)),   // −slope = b (positivo)
            r2:     lr.r2,                                   // Bondad del ajuste OLS
            lambda: lambda_gr                                 // Tasa anual predicha ≥ Mc
        } : null,
        mle: mle ? {
            a:      Number(mle.a.toFixed(3)),      // a MLE
            b:      Number(mle.b.toFixed(3)),      // b MLE (siempre positivo)
            r2:     r2_mle,                        // R² evaluado sobre dataPoints
            lambda: lambda_mle                     // Tasa anual observada N/T_obs
        } : null,
        Mc,           // Magnitud de completitud (MAXC)
        maxMagObs,    // Magnitud máxima observada en el catálogo
        N,            // Número de eventos con M ≥ Mc
        T_obs         // Periodo de observación (años)
    };

    updateStatsTable(stats, N);

    // Cache para redibujar sin recalcular (cambio de idioma, modo gr/mle/both, etc.)
    const cache = {
        dataPoints,   // Array de { x: M, y: log₁₀ N(≥M) }
        stats,
        gr: lr ? {
            intercept: lr.intercept,              // a OLS (para evaluar la recta)
            slope:     lr.slope,                  // pendiente raw (negativa)
            a:         Number(lr.intercept.toFixed(3)),
            b:         Number(Math.abs(lr.slope).toFixed(3)),
            minMag:    Mc,                        // Extremo izquierdo de la recta = Mc
            maxMag:    binMax,                    // Extremo derecho = magnitud máxima del bin
            r2:        lr.r2,
            lambda:    lambda_gr
        } : null,
        mle: mle ? {
            a:      Number(mle.a.toFixed(3)),
            b:      Number(mle.b.toFixed(3)),
            minMag: Mc,
            maxMag: binMax,
            r2:     r2_mle,
            lambda: lambda_mle
        } : null
    };

    if (appState) appState.analysisCache = cache;
    window.lastRichterCache = cache;
    renderModule?.renderRichterFromCache?.(cache);
    onComplete?.(cache);
}

// =============================================================================
// RENDERIZADO DE LA GRÁFICA G-R (Chart.js)
// =============================================================================
/**
 * Dibuja la gráfica de Gutenberg-Richter a partir del caché calculado.
 *
 * Datasets:
 *   - Puntos observados (scatter): (M, log₁₀ N(≥M))
 *   - Recta OLS (naranja): desde Mc hasta maxMag, recortada si baja de y=0
 *   - Curva MLE (azul punteado): muestreada en 80 puntos entre Mc y maxMag
 *
 * Eje X: Magnitud M
 * Eje Y: log₁₀ N (número acumulado de eventos)
 *
 * @param {object|null} cache - Resultado de calculateGutenbergRichter
 */
function getChartThemeColors() {
    const style = getComputedStyle(document.documentElement);
    const get = (v) => style.getPropertyValue(v).trim();
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    return {
        text:      get('--sb-text')        || '#0f172a',
        muted:     get('--sb-muted')       || '#64748b',
        grid:      get('--sb-chart-grid')  || get('--sb-border') || '#e2e8f0',
        canvas:    get('--sb-canvas-bg')   || '#ffffff',
        pointColor: theme === 'colorblind' ? '#0077bb' : '#0f766e',
        grColor:   theme === 'colorblind' ? '#ee7733' : '#f97316',
        mleColor:  theme === 'colorblind' ? '#009988' : '#2563eb'
    };
}

export function renderRichterFromCache(cache = null) {
    const chartEl = document.getElementById('richterChart');
    if (!chartEl || !window.Chart) return;

    if (window.richterChartInstance) {
        window.richterChartInstance.destroy();
        window.richterChartInstance = null;
    }

    if (!cache || !cache.dataPoints?.length) return;

    const translate = window.geoportalLanguage?.translate?.bind(window.geoportalLanguage) || ((k) => k);
    const mode = getSelectedMode();
    const clr = getChartThemeColors();
    const ctx  = chartEl.getContext('2d');

    // Márgenes del eje X con padding proporcional al rango de datos
    const xRange = cache.dataPoints[cache.dataPoints.length - 1].x - cache.dataPoints[0].x;
    const xPad   = Math.max(1.0, xRange * 0.35);
    const xMin   = Math.floor((cache.dataPoints[0].x - xPad) * 10) / 10;
    const xMax   = Math.ceil((cache.dataPoints[cache.dataPoints.length - 1].x + xPad) * 10) / 10;
    const yMax   = Math.max(...cache.dataPoints.map(p => p.y));
    const yMin   = Math.min(...cache.dataPoints.map(p => p.y));
    const yPadBottom = Math.max(0.08, (yMax - yMin) * 0.08);

    // Dataset 1: puntos observados (frecuencia acumulada)
    const datasets = [{
        label:            translate('chartObservedData'),
        data:             cache.dataPoints,
        backgroundColor:  clr.pointColor,
        borderColor:      clr.pointColor,
        pointRadius:      3.75,
        pointHoverRadius: 5.25,
        type:             'scatter'
    }];

    // Dataset 2: recta OLS — dos puntos extremos, recortada si y < 0
    if ((mode === 'gr' || mode === 'both') && cache.gr) {
        const { intercept, slope, minMag, maxMag } = cache.gr;
        // Evaluar la recta en los extremos del rango de datos
        const yAtMin = intercept + slope * minMag;   // log₁₀ N en Mc
        const yAtMax = intercept + slope * maxMag;   // log₁₀ N en Mmax
        // Si la recta llega a y < 0 antes de maxMag, recortar en la raíz x₀ = −a/slope
        const xRight = yAtMax >= 0 ? maxMag : -intercept / slope;
        const yRight = Math.max(0, yAtMax);

        datasets.push({
            label:       translate('chartGR'),
            data:        [{ x: minMag, y: yAtMin }, { x: xRight, y: yRight }],
            borderColor: clr.grColor,
            backgroundColor: clr.grColor,
            borderWidth: 2.5,
            type:        'line',
            fill:        false,
            tension:     0,
            pointRadius: 0
        });
    }

    // Dataset 3: curva MLE — muestreada en 80 pasos, recortada en y = 0
    if ((mode === 'mle' || mode === 'both') && cache.mle) {
        const { a, b, minMag, maxMag } = cache.mle;
        const mleLine = [];
        const step = (maxMag - minMag) / 80;
        for (let x = minMag; x <= maxMag + 1e-9; x = Math.round((x + step) * 1e6) / 1e6) {
            const y = a - b * x;         // log₁₀ N(≥x) según MLE
            if (y >= 0) mleLine.push({ x, y });
        }

        datasets.push({
            label:          translate('chartMLE'),
            data:           mleLine,
            borderColor:    clr.mleColor,
            backgroundColor: clr.mleColor,
            borderWidth:    2.5,
            type:           'line',
            fill:           false,
            tension:        0,
            pointRadius:    0
        });
    }

    const canvasBgPlugin = {
        id: 'canvasBg',
        beforeDraw(chart) {
            const { ctx: c, chartArea } = chart;
            if (!chartArea) return;
            c.save();
            c.fillStyle = clr.canvas;
            c.fillRect(0, 0, chart.width, chart.height);
            c.restore();
        }
    };

    window.richterChartInstance = new Chart(ctx, {
        type: 'scatter',
        data: { datasets },
        plugins: [canvasBgPlugin],
        options: {
            responsive:        true,
            maintainAspectRatio: true,
            aspectRatio:       1.9,
            resizeDelay:       120,
            interaction: { mode: 'nearest', intersect: false },
            plugins: {
                legend: { display: true, position: 'bottom', labels: { color: clr.text, font: { size: 11 } } },
                title:  {
                    display: true,
                    text:    mode === 'both' ? translate('chartTitleBoth') : mode === 'mle' ? translate('chartTitleMV') : translate('chartTitleMMCC'),
                    font:    { size: 13, weight: '600' },
                    color:   clr.text,
                    padding: { bottom: 8 }
                },
                zoom: {
                    limits: { x: { minRange: 0.5 }, y: { minRange: 0.5 } },
                    pan:    { enabled: false },
                    zoom:   { wheel: { enabled: false }, pinch: { enabled: false }, drag: { enabled: false }, mode: 'xy' }
                }
            },
            scales: {
                x: {
                    type:  'linear',
                    min:   xMin,
                    max:   xMax,
                    title: { display: true, text: translate('chartAxisMagnitude'), font: { size: 11 }, color: clr.muted },
                    grid:  { color: clr.grid },
                    ticks: { font: { size: 10 }, color: clr.muted }
                },
                y: {
                    min:          Math.floor((yMin - yPadBottom) * 10) / 10,
                    suggestedMax: Math.ceil(yMax * 10 + 5) / 10,
                    title: { display: true, text: translate('chartAxisLogN'), font: { size: 11 }, color: clr.muted },
                    grid:  { color: clr.grid },
                    ticks: { font: { size: 10 }, color: clr.muted }
                }
            }
        }
    });

    window.richterChartInstance._cache = cache;
}

// Redibujar la gráfica al cambiar de idioma (sin recalcular)
document.addEventListener('geoportal:languageChanged', () => {
    const cache = window.richterChartInstance?._cache || window.lastRichterCache;
    if (cache && typeof renderRichterFromCache === 'function') {
        renderRichterFromCache(cache);
    }
});

// Redibujar la gráfica al cambiar de tema (para actualizar colores)
document.addEventListener('themechange', () => {
    const cache = window.richterChartInstance?._cache || window.lastRichterCache;
    if (cache && typeof renderRichterFromCache === 'function') {
        renderRichterFromCache(cache);
    }
});
