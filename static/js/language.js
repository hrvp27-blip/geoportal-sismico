const GEO_PORTAL_LANGUAGE_KEY = 'geoportalLanguage';
const DEFAULT_LANGUAGE = 'es';

const TRANSLATIONS = {
    es: {
        pageTitleDashboard: 'Geoportal de Fuente Sísmica | Geoportal para el Análisis de Recurrencia Sísmica',
        pageTitleMap: 'Geoportal de Fuente Sísmica',

        navbarOpenViewer: 'Abrir visor',

        /* ── Dashboard 2026 ─────────────────────────────────────────── */
        navMethodology: 'Metodología',
        navSpecs: 'Especificaciones',
        heroOverline: 'Geoportal de Fuente Sísmica, ETSITGC-UPM, 2026',
        heroTitle: 'Geoportal para el Análisis de Recurrencia Sísmica',
        heroBody: 'Herramienta para la visualización, edición y análisis de catálogos sísmicos orientados a la definicón de modelos de recurrencia sísmica en fuentes tipo zona. La plataforma implementa la ley de Gutenberg-Richter mediante los métodos de mínimos cuadrados y máxima verosimilitud, e incorpora herramientas para el análisis de la incertidumbre en la localización de los eventos sísmicos.',
        heroViewSpecs: 'Ver especificaciones',
        heroStartAnalysis: 'Ir al visor',
        heroStartView: 'Ir al visor',
        heroQuickRefTitle: 'Archivos de entrada',
        heroRefCatalog: 'Catálogo sísmico',
        heroRefZones: 'Zonas fuente',
        heroRefCompleteness: 'Completitud',
        methodologyTitle: 'Metodología',
        methodologyLead: 'La plataforma estima modelos de recurrencia sísmica mediante la relación de Gutenberg-Richter utilizando los métodos de mínimos cuadrados y máxima verosimilitud. El cálculo se realiza considerando los períodos de completitud definidos por el usuario para cada rango de magnitudes.',
        methodGRTitle: 'Ley de Gutenberg-Richter',
        methodGRDesc: 'Modelo de recurrencia sísmica ampliamente utilizado para caracterizar la actividad sísmica de una fuente. La relación describe la tasa o frecuencia acumulada de terremotos con magnitud igual o superior a M. El parámetro a representa el nivel de actividad sísmica de la fuente, mientras que el parámetro b controla la proporción relativa de terremotos grandes y pequeños. En la plataforma, los parámetros de la relación se estiman a partir de los terremotos asignados a cada zona sismogenética y de los periodos de completitud definidos por el usuario. Gutenberg & Richter (1944), Bulletin of the Seismological Society of America, 34, 185–188.',
        methodOLSTitle: 'Método de Mínimos Cuadrados (MMCC)',
        methodOLSDesc: 'Método clásico para estimar los parámetros a y b de la relación de Gutenberg-Richter mediante el ajuste lineal de la distribución acumulada magnitud-frecuencia. La plataforma proporciona además indicadores de la calidad del ajuste para facilitar la comparación entre diferentes modelos de recurrencia.',
        methodMLETitle: 'Método de Máxima Verosimilitud (MV)',
        methodMLEDesc: 'Método de ajuste basado en la estimación por máxima verosimilitud de los parámetros de la relación de Gutenberg-Richter. Utiliza directamente las magnitudes observadas en el catálogo sísmico y constituye uno de los procedimientos más utilizados en estudios de recurrencia y peligrosidad sísmica. En la plataforma, el cálculo considera los periodos de completitud definidos por el usuario para estimar los parámetros a y b del modelo de recurrencia.',
        methodMAXCTitle: 'Magnitud de Completitud',
        methodMAXCDesc: 'Método de Maximum Curvature (Wiemer & Wyss 2000). Determina Mc como el bin de magnitud con mayor frecuencia en el histograma incremental (bin = 0.1). Solo los eventos con M ≥ Mc entran en el análisis. El método tiende a subestimar Mc en ~0.1–0.2 unidades en catálogos incompletos.',
        specsTitle: 'Formato y estructura de los datos de entrada',
        specsLead: 'La correcta ejecución de la plataforma requiere que los datos de entrada sigan una estructura determinada. A continuación se detallan los formatos admitidos y los atributos necesarios para cada tipo de archivo.',
        fieldRequired: 'Estado',
        shpGeomDesc: 'Geometría vectorial de los polígonos de zona fuente',
        shxDesc: 'Índice de posición de geometría',
        dbfDesc: 'Tabla de atributos alfanuméricos (nombre, código de zona…)',
        prjDesc: 'Definición del sistema de referencia',

        heroAccessViewer: 'Acceder al visor interactivo',

        catalogTitle: 'Catálogo Sísmico',
        requiredBadge: 'Requerido',
        catalogBody: 'Archivo de texto delimitado por comas. La primera fila debe ser una cabecera con los nombres de campo exactos indicados en la tabla. La codificación debe ser UTF-8.',
        fieldHeader: 'Campo',
        fieldDescription: 'Descripción',
        sourceTitle: 'Zonas Fuente Sísmica',
        sourceBody: 'Archivo ZIP que contiene un Shapefile con los polígonos de las zonas fuente. Se admiten geometrías de tipo Polygon y MultiPolygon. Se recomienda sistema de referencia WGS84 (EPSG:4326).',
        completenessTitle: 'Tabla de Completitud',
        optionalBadge: 'Opcional',
        completenessBody: 'Define los periodos de completitud del catálogo para distintos niveles de magnitud. Esta información se utiliza para seleccionar los terremotos que pueden considerarse completamente registrados y calcular de forma consistente los modelos de recurrencia sísmica.',
        completenessYear: 'Año de completitud',
        completenessYearEnd: 'Año fin',
        completenessCurrent: 'Actual',

        footerBuilt: 'Trabajo Fin de Titulación, ETSITGC-UPM',
        footerVersion: 'v1.0, 2026',

        fieldType: 'Tipo',
        fieldDateDesc: 'Fecha y hora de ocurrencia del terremoto (UTC, formato AAAA-MM-DD HH:MM:SS)',
        fieldLatDesc: 'Latitud geográfica del epicentro en coordenadas WGS84 (°)',
        fieldLonDesc: 'Longitud geográfica del epicentro en coordenadas WGS84 (°)',
        fieldMwDesc: 'Magnitud momento del terremoto (Mw)',
        fieldDepthDesc: 'Profundidad focal del terremoto (km)',
        fieldSmajaxDesc: 'Semieje mayor de la elipse de error asociada a la localización del evento (km)',
        fieldSminaxDesc: 'Semieje menor de la elipse de error asociada a la localización del evento (km)',
        fieldStrikeDesc: 'Azimut del semieje mayor de la elipse de error respecto al norte geográfico (°)',
        fieldEventIdDesc: 'Identificador único del evento sísmico dentro del catálogo',
        fieldIsMainShockDesc: 'Indica si el evento corresponde a un sismo principal (true/false)',

        sidebarHeaderTitle: 'Geoportal de Fuente Sísmica',
        sidebarSubtitle: 'Explora catálogos, selecciona zonas y ajusta filtros en tiempo real.',
        sidebarStatusInitial: 'Cargue un catálogo o una zona para comenzar el análisis interactivo.',
        tabDataFilters: 'Datos',
        tabAnalysis: 'Análisis',

        sectionCatalog: 'Catálogo Sísmico ',
        uploadCatalog: 'Subir Catálogo',
        sectionZones: 'Zonas Sísmicas',
        sectionDirectSelection: 'Selección directa',
        shpFileLabel: 'Archivo (ZIP - SHP)',
        loadZones: 'Cargar Zonas',
        zoneHelp: '💡 Puedes cargar múltiples zonas y seleccionarlas aquí o haciendo clic en el mapa o en el selector rápido.',
        zoneQuickTitle: 'Zona de análisis rápida',
        zoneEmptyHint: 'Cargue zonas y selecciónelas aquí o haciendo clic directamente sobre el mapa.',
        selectedZoneLabel: 'Zona seleccionada:',
        deselectZone: 'Deseleccionar',
        sectionCompleteness: 'Completitud',
        completenessFileLabel: 'Tabla de Completitud',
        uploadCompleteness: 'Subir Completitud',
        clearMap: 'Limpiar Mapa',
        visualizationSection: 'Visualización',
        showEllipses: 'Mostrar elipses de error',
        showLogo: 'Mostrar Logo',

        sectionEditing: 'Edición',
        enableEditing: 'Activar Edición',
        undo: 'Deshacer',
        showTrails: 'Mostrar trazas',
        exportControlTitle: 'Exportar datos',
        exportJson: 'JSON',
        exportCsv: 'CSV',
        exportPdf: 'Informe PDF',

        sectionGR: 'Gutenberg-Richter',
        recalcHint: 'Seleccione una zona para generar automáticamente las curvas MMCC y MV.',
        chartFullScreen: 'Pantalla completa',
        chartModeLabel: 'Mostrar:',
        chartModeBoth: 'Ambas',
        chartModeGR: 'MMCC',
        chartModeMLE: 'Máxima verosimilitud (MV)',
        chartHelp: 'Para salir del zoom, presione Escape (ESC).',
        analysisMetrics: 'Eventos: {count}',
        legendVeryWeak: 'Muy débil',
        legendWeak: 'Débil',
        legendModerate: 'Moderado',
        legendStrong: 'Fuerte',
        legendVeryStrong: 'Muy fuerte',
        legendExtreme: 'Extremo',
        quickSelectorHiddenZones: 'Todas las zonas están ocultas. Vuelva a activar alguna para analizarla.',
        quickSelectorNoZones: 'No se han podido identificar zonas analizables en el archivo cargado.',
        selectZoneHint: 'Seleccionar {label}',

        filterLabelMagnitude: 'Magnitud (Mw)',
        filterLabelDepth: 'Profundidad (km)',
        filterLabelDate: 'Fecha',
        filterLabelMainShock: 'Sólo terremotos principales',
        filterLabelCompleteness: 'Filtrar por completitud',
        filterCompletenessNoData: 'Sin tabla de completitud cargada',
        filterPlaceholderMin: 'Min',
        zoneNameFallback: 'Zona sísmica',
        filterPlaceholderMax: 'Max',
        filterPlaceholderStart: 'Inicio',
        filterPlaceholderEnd: 'Fin',
        filterControlTitle: 'Filtros de datos',

        layerPanelTitle: 'Capas cargadas',
        layerStatusNone: 'Ninguna capa cargada aún.',
        layerAnalize: 'Analizar {name}',
        layerLoadedZone: 'Zona cargada: {name}',
        layerLoadedCatalog: 'Catálogo cargado: {name}',

        reverseGeocodeUnknown: 'Desconocida',
        popupId: 'ID',
        popupDate: 'Fecha',
        popupMagnitude: 'Magnitud (Mw)',
        popupDepth: 'Profundidad (km)',
        popupLocation: 'Ubicación',
        popupMain: 'Principal',
        popupYes: 'Sí',
        popupNo: 'No',

        selectCsvFile: 'Selecciona un archivo CSV',
        processingCatalog: 'Procesando catálogo...',
        invalidCatalogData: 'CSV cargado pero sin terremotos válidos. Revisa nombres de columnas y formato de coordenadas.',
        selectShpFile: 'Selecciona un archivo ZIP con el SHP',
        shpjsMissing: 'shpjs no encontrado. Asegúrate de cargar la librería antes del visor.',
        noValidZones: 'No se encontraron zonas válidas en el SHP.',
        zonesLoaded: '{count} zonas cargadas. Puede seleccionar una directamente en el mapa o en el panel rápido.',
        completenessLoaded: 'Completitud cargada: {count} registros',
        loadCatalogInstruction: 'Cargue un catálogo sísmico para empezar a filtrar.',
        filtersAppliedWithZone: 'Filtros aplicados: {visible} visibles (con buffer 50km), {analysis} estrictamente dentro de la zona',
        filtersAppliedNoZone: 'Filtros aplicados: {visible} eventos visibles',
        visibleEarthquakesCount: '{count} terremotos visibles',
        zoneCountActive: '{count} en la zona activa',
        noZoneSelected: 'Sin zona seleccionada',
        zonalAnalysisActive: 'Análisis zonal activo',
        globalFilterActive: 'Filtro global activo',
        catalogLabel: 'Catálogo',
        catalogLoadedWithCount: 'Catálogo cargado: {name} ({count} eventos)',
        catalogLoadedSimple: 'Catálogo cargado: {count} eventos',
        earthquakeMovedRecalcStatus: 'Terremoto movido. Los parámetros de la zona se han recalculado.',
        editNeedsEllipses: 'Activa las elipses de error antes de usar el modo edición.',
        errorLoadingCsv: 'Error cargando CSV',
        errorReadingShp: 'Error leyendo SHP',
        selectedZoneFallback: 'Zona seleccionada',
        activeZoneSubtitle: 'Zona activa: {zone}. El análisis se actualiza automáticamente.',
        selectedZoneRecalcStatus: 'Zona seleccionada: gráficas de recurrencia generadas automáticamente.',
        clickToAnalyzeZone: 'Clic para analizar esta zona',
        legendTitle: 'Leyenda',
        legendZonesSection: 'Zonas sísmicas',
        legendTitleRichter: 'Magnitud Richter',
        legendToggleTip: 'Click para expandir/contraer',
        legendColorPickerTip: 'Click para cambiar el color',
        legendResetColor: 'Restaurar color por defecto',
        zoneLabelFallback: 'Zona',
        mapCleaned: 'Mapa limpio',
        earthquakesCleared: 'Terremotos limpiados',
        noEarthquakesToEdit: 'No hay terremotos cargados para editar todavía.',
        editBtnNoZoneTooltip: 'Faltan archivos por cargar u opciones por activar.',
        editModeDisabledHint: 'Faltan archivos por cargar u opciones por activar.',
        disableEditing: 'Desactivar Edición',
        editModeActivated: 'Modo edición activado: arrastre cualquier terremoto visible para recolocarlo.',
        editModeDeactivated: 'Modo edición desactivado.',
        noChartExportAvailable: 'No hay gráfico disponible para exportar.',
        noUndoMoves: 'No hay movimientos para deshacer.',

        chartObservedData: 'Datos observados',
        chartGR: 'MMCC',
        chartMLE: 'Máx. verosimilitud (MV)',
        chartTitleBoth: 'Ajuste Gutenberg-Richter MMCC y MV',
        chartTitleMMCC: 'Ajuste Gutenberg-Richter MMCC',
        chartTitleMV: 'Ajuste Gutenberg-Richter MV',
        chartTitleAnalysis: 'Análisis de recurrencia sísmica',
        chartAxisMagnitude: 'Magnitud (Mw)',
        chartAxisLogN: 'log10(N ≥ M)',

        mapHintText: 'Seleccione una zona haciendo clic en el mapa o desde el selector rápido del panel.',
        completenessPanelTitle: 'Completitud',
        completenessEmptyMsg: 'Sin datos cargados',
        badgeZeroEarthquakes: '0 terremotos visibles',

        panelExpand: 'Desplegar panel',
        panelCollapse: 'Recoger panel',
        undoSuccess: 'Último movimiento deshecho correctamente.',

        statsParameter: 'Parámetro',
        statsGR: 'MMCC',
        statsMLE: 'MV',
        statsAValue: 'Valor a',
        statsBValue: 'Valor b',
        statsMcCompleteness: 'Mc (completitud)',
        statsAnnualRate: 'Tasa anual (λ)',
        statsObservationPeriod: 'Período de observación (años)',
        statsEventsAnalyzed: 'Eventos analizados',
        deleteZone: 'Eliminar zona',
        deleteCatalog: 'Eliminar catálogo',
        zoneColorPickerTip: 'Clic para cambiar el color de la zona',

        /* ── Sección de características del visor (dashboard) ──────── */
        featuresTitle: 'Características del visor',
        featuresLead: 'El visor interactivo incluye herramientas de análisis, edición y personalización visual diseñadas para facilitar el trabajo de análisis de fuentes sísmicas.',
        featThemeTag: 'Accesibilidad',
        featThemeTitle: 'Temas visuales adaptables',
        featThemeDesc: 'El panel lateral ofrece tres modos de visualización seleccionables con un clic desde la cabecera. La elección se recuerda entre sesiones.',
        themeLightLabel: 'Claro',
        themeDarkLabel: 'Oscuro',
        themeColorblindLabel: 'Daltónico',
        featThemeNote: 'El modo daltónico emplea la paleta Okabe-Ito, libre de confusiones rojo-verde para deuteranopia y protanopia.',
        featEditTag: 'Edición',
        featEditTitle: 'Edición interactiva de eventos',
        featEditDesc: 'Visualiza las elipses de error y activa el modo edición para reubicación de eventos sísmicos directamente sobre el mapa. Cada desplazamiento queda registrado mediante una traza visual y puede deshacerse de forma individual.',
        featEditItem1: 'Arrastra de marcadores sobre el mapa',
        featEditItem2: 'Visualización de la traza de desplazamiento de cada evento',
        featEditItem3: 'Deshacer movimientos paso a paso',
        featGRTag: 'Análisis',
        featGRTitle: 'Curvas Gutenberg-Richter automáticas',
        featGRDesc: 'Al seleccionar una zona sismogenética, la plataforma calcula automáticamente los parámetros de la relación de Gutenberg-Richter mediante métodos de mínimos cuadrados y máxima verosimilitud, representando gráficamente los modelos obtenidos y sus indicadores de ajuste.',
        featGRItem1: 'Doble estimación MMCC + MV',
        featGRItem2: 'Mc automática por MAXC',
        featGRItem3: 'Vista expandida en pantalla completa',

        /* ── Drop zones de carga ──────────────────────────────────── */
        uploadZoneCsvText: 'Arrastra tu CSV aquí',
        uploadZoneZipText: 'Arrastra tu ZIP aquí',
        uploadZoneClickHint: 'o haz clic para seleccionar'
        ,
        /* Nota para campos de elipse */
        ellipseFieldsNote: '*Nota: Si no dispone de los campos smajax, sminax o strike, indique 0 en esos campos para que el visor utilice valores por defecto.'
    },
    en: {
        pageTitleDashboard: 'Seismic Geoportal UPM | Seismic Analysis Platform',
        pageTitleMap: 'Seismic Source Geoportal',

        navbarOpenViewer: 'Open viewer',

        /* ── Dashboard 2026 ─────────────────────────────────────────── */
        navMethodology: 'Methodology',
        navSpecs: 'Specifications',
        heroOverline: 'Seismic Source Geoportal, ETSITGC-UPM, 2026',
        heroTitle: 'Seismic Recurrence Analysis Geoportal',
        heroBody: 'Tool for visualization, editing and analysis of seismic catalogs oriented towards the extraction of seismic recurrence models in zone-type sources. The platform implements the Gutenberg-Richter law through least-squares and maximum likelihood methods, and tools for uncertainty analysis in event localization.',
        heroViewSpecs: 'View specifications',
        heroStartView: 'Open viewer',
        heroQuickRefTitle: 'Input files',
        heroRefCatalog: 'Seismic catalog',
        heroRefZones: 'Source zones',
        heroRefCompleteness: 'Completeness',
        heroStartAnalysis: 'Open viewer',
        methodologyTitle: 'Methodology',
        methodologyLead: 'The platform estimates seismic recurrence models using the Gutenberg-Richter relationship with least squares and maximum likelihood methods. Calculations are performed considering the completeness periods defined by the user for each magnitude range.',
        methodGRTitle: 'Gutenberg-Richter Law',
        methodGRDesc: 'Widely used seismic recurrence model for characterizing the seismic activity of a source. The relationship describes the cumulative rate or frequency of earthquakes with magnitude equal to or greater than M. Parameter a represents the source seismic activity level, while parameter b controls the relative proportion of large and small earthquakes. In the platform, the relationship parameters are estimated from the earthquakes assigned to each seismic source zone and from the user-defined completeness periods. Gutenberg & Richter (1944), Bulletin of the Seismological Society of America, 34, 185–188.',
        methodOLSTitle: 'Least Squares Method (OLS/MMCC)',
        methodOLSDesc: 'Classic method to estimate the a and b parameters of the Gutenberg-Richter relationship through linear fitting of the cumulative magnitude-frequency distribution. The platform also provides goodness-of-fit indicators to facilitate comparison between different recurrence models.',
        methodMLETitle: 'Maximum Likelihood Method (MV)',
        methodMLEDesc: 'Fitting method based on maximum likelihood estimation of the Gutenberg-Richter relationship parameters. It uses the observed magnitudes directly from the seismic catalog and is one of the most widely used procedures in recurrence and seismic hazard studies. In the platform, the calculation considers user-defined completeness periods to estimate the model parameters a and b.',
        methodMAXCTitle: 'Completeness Magnitude',
        methodMAXCDesc: 'Maximum Curvature method (Wiemer & Wyss 2000). Determines Mc as the magnitude bin with the highest frequency in the incremental histogram (bin = 0.1). Only events with M ≥ Mc enter the analysis. The method tends to underestimate Mc by ~0.1–0.2 units in incomplete catalogs.',
        specsTitle: 'Input data format and structure',
        specsLead: 'Correct platform execution requires input data to follow a defined structure. The supported formats and required attributes for each file type are detailed below.',
        fieldRequired: 'Status',
        shpGeomDesc: 'Vector geometry of source zone polygons',
        shxDesc: 'Geometry position index',
        dbfDesc: 'Alphanumeric attribute table (name, zone code…)',
        prjDesc: 'Reference system definition',

        heroAccessViewer: 'Enter interactive viewer',

        catalogTitle: 'Seismic Catalog',
        requiredBadge: 'Required',
        catalogBody: 'Comma-delimited text file. The first row must be a header with the exact field names listed in the table. Encoding must be UTF-8.',
        fieldHeader: 'Field',
        fieldDescription: 'Description',
        sourceTitle: 'Seismic Source Zones',
        sourceBody: 'ZIP file containing a Shapefile with source zone polygons. Polygon and MultiPolygon geometries are supported. WGS84 projection (EPSG:4326) is recommended.',
        completenessTitle: 'Completeness Table',
        optionalBadge: 'Optional',
        completenessBody: 'Defines the catalog completeness periods for different magnitude levels. This information is used to select earthquakes that can be considered fully recorded and to consistently compute seismic recurrence models.',
        completenessYear: 'Completeness year',
        completenessYearEnd: 'End year',
        completenessCurrent: 'Current',

        footerBuilt: 'Final Degree Project, ETSITGC-UPM',
        footerVersion: 'v1.0, 2026',

        fieldType: 'Type',
        fieldDateDesc: 'Event origin date and time (UTC, format YYYY-MM-DD HH:MM:SS)',
        fieldLatDesc: 'Epicentral geographic latitude in WGS84 coordinates (°)',
        fieldLonDesc: 'Epicentral geographic longitude in WGS84 coordinates (°)',
        fieldMwDesc: 'Moment magnitude of the earthquake (Mw)',
        fieldDepthDesc: 'Focal depth of the earthquake (km)',
        fieldSmajaxDesc: 'Semi-major axis of the error ellipse associated with the event location (km)',
        fieldSminaxDesc: 'Semi-minor axis of the error ellipse associated with the event location (km)',
        fieldStrikeDesc: 'Azimuth of the error ellipse semi-major axis relative to geographic north (°)',
        fieldEventIdDesc: 'Unique seismic event identifier within the catalog',
        fieldIsMainShockDesc: 'Indicates whether the event corresponds to a main shock (true/false)',

        sidebarHeaderTitle: 'Intelligent Seismic Geoportal',
        sidebarSubtitle: 'Browse catalogs, select zones and adjust filters in real time.',
        sidebarStatusInitial: 'Load a catalog or a zone to start the interactive analysis.',
        tabDataFilters: 'Data & Filters',
        tabAnalysis: 'Analysis',

        sectionCatalog: 'Seismic Catalog ',
        uploadCatalog: 'Upload Catalog',
        sectionZones: 'Seismic Zones',
        sectionDirectSelection: 'Direct selection',
        shpFileLabel: 'File (ZIP - SHP)',
        loadZones: 'Load Zones',
        zoneHelp: '💡 You can upload multiple zones and select them here or by clicking on the map or the quick selector.',
        zoneQuickTitle: 'Quick analysis zone',
        zoneEmptyHint: 'Upload zones and select them here or by clicking directly on the map.',
        selectedZoneLabel: 'Selected zone:',
        deselectZone: 'Deselect',
        sectionCompleteness: 'Completeness',
        completenessFileLabel: 'Completeness Table',
        uploadCompleteness: 'Upload Completeness',
        clearMap: 'Clear Map',
        visualizationSection: 'Visualization',
        showEllipses: 'Show error ellipses',
        showLogo: 'Show Logo',

        sectionEditing: 'Editing',
        enableEditing: 'Enable Editing',
        undo: 'Undo',
        showTrails: 'Show trails',
        exportControlTitle: 'Export data',
        exportJson: 'JSON',
        exportCsv: 'CSV',
        exportPdf: 'PDF report',

        sectionGR: 'Gutenberg-Richter',
        recalcHint: 'Select a zone to automatically generate the OLS and MLE curves.',
        chartFullScreen: 'Fullscreen',
        chartModeLabel: 'Show:',
        chartModeBoth: 'Both',
        chartModeGR: 'Gutenberg-Richter (OLS)',
        chartModeMLE: 'Maximum likelihood (MLE)',
        chartHelp: 'To exit the zoom, press Escape (ESC).',
        analysisMetrics: 'Events: {count}',
        legendVeryWeak: 'Very weak',
        legendWeak: 'Weak',
        legendModerate: 'Moderate',
        legendStrong: 'Strong',
        legendVeryStrong: 'Very strong',
        legendExtreme: 'Extreme',
        quickSelectorHiddenZones: 'All zones are hidden. Re-enable one to analyze it.',
        quickSelectorNoZones: 'No analyzable zones could be identified in the uploaded file.',
        selectZoneHint: 'Select {label}',

        filterLabelMagnitude: 'Magnitude (Mw)',
        filterLabelDepth: 'Depth (km)',
        filterLabelDate: 'Date',
        filterLabelMainShock: 'Main shocks only',
        filterLabelCompleteness: 'Filter by completeness',
        filterCompletenessNoData: 'No completeness table loaded',
        filterPlaceholderMin: 'Min',
        zoneNameFallback: 'Seismic zone',
        filterPlaceholderMax: 'Max',
        filterPlaceholderStart: 'Start',
        filterPlaceholderEnd: 'End',
        filterControlTitle: 'Data filters',

        layerPanelTitle: 'Loaded layers',
        layerStatusNone: 'No layers uploaded yet.',
        layerAnalize: 'Analyze {name}',
        layerLoadedZone: 'Zone loaded: {name}',
        layerLoadedCatalog: 'Catalog loaded: {name}',

        reverseGeocodeUnknown: 'Unknown',
        popupId: 'ID',
        popupDate: 'Date',
        popupMagnitude: 'Magnitude (Mw)',
        popupDepth: 'Depth (km)',
        popupLocation: 'Location',
        popupMain: 'Main',
        popupYes: 'Yes',
        popupNo: 'No',

        selectCsvFile: 'Select a CSV file',
        processingCatalog: 'Processing catalog...',
        invalidCatalogData: 'CSV loaded but no valid earthquakes found. Check column names and coordinate format.',
        selectShpFile: 'Select a ZIP with the SHP',
        shpjsMissing: 'shpjs not found. Make sure the library is loaded before the viewer.',
        noValidZones: 'No valid zones were found in the SHP.',
        zonesLoaded: '{count} zones loaded. You can select one directly on the map or in the quick panel.',
        completenessLoaded: 'Completeness loaded: {count} records',
        loadCatalogInstruction: 'Load a seismic catalog to begin filtering.',
        filtersAppliedWithZone: 'Filters applied: {visible} visible (with 50km buffer), {analysis} strictly inside the zone',
        filtersAppliedNoZone: 'Filters applied: {visible} visible events',
        visibleEarthquakesCount: '{count} visible earthquakes',
        zoneCountActive: '{count} in the active zone',
        noZoneSelected: 'No zone selected',
        zonalAnalysisActive: 'Zonal analysis active',
        globalFilterActive: 'Global filter active',
        catalogLabel: 'Catalog',
        catalogLoadedWithCount: 'Catalog loaded: {name} ({count} events)',
        catalogLoadedSimple: 'Catalog loaded: {count} events',
        earthquakeMovedRecalcStatus: 'Earthquake moved. Zone parameters have been recalculated.',
        editNeedsEllipses: 'Missing files to upload or options to activate.',
        errorLoadingCsv: 'Error loading CSV',
        errorReadingShp: 'Error reading SHP',
        selectedZoneFallback: 'Selected zone',
        activeZoneSubtitle: 'Active zone: {zone}. Analysis refreshes automatically.',
        selectedZoneRecalcStatus: 'Selected zone: recurrence plots generated automatically.',
        clickToAnalyzeZone: 'Click to analyze this zone',
        legendTitle: 'Legend',
        legendZonesSection: 'Seismic zones',
        legendTitleRichter: 'Richter magnitude',
        legendToggleTip: 'Click to expand/collapse',
        legendColorPickerTip: 'Click to change the color',
        legendResetColor: 'Restore default color',
        zoneLabelFallback: 'Zone',
        mapCleaned: 'Map cleared',
        earthquakesCleared: 'Earthquakes cleared',
        noEarthquakesToEdit: 'No earthquakes loaded for editing yet.',
        editBtnNoZoneTooltip: 'Missing files to upload or options to activate.',
        editModeDisabledHint: 'Missing files to upload or options to activate.',
        disableEditing: 'Disable Editing',
        editModeActivated: 'Edit mode activated: drag any visible earthquake to reposition it.',
        editModeDeactivated: 'Edit mode deactivated.',
        noChartExportAvailable: 'No chart available to export.',
        noUndoMoves: 'No moves to undo.',

        chartObservedData: 'Observed data',
        chartGR: 'Gutenberg-Richter (OLS)',
        chartMLE: 'Max likelihood (MLE)',
        chartTitleBoth: 'Gutenberg-Richter OLS and MLE fits',
        chartTitleMMCC: 'Gutenberg-Richter OLS fit',
        chartTitleMV: 'Gutenberg-Richter MLE fit',
        chartTitleAnalysis: 'Seismic recurrence analysis',
        chartAxisMagnitude: 'Magnitude (Mw)',
        chartAxisLogN: 'log10(N ≥ M)',

        mapHintText: 'Select a zone by clicking on the map or from the quick selector in the panel.',
        completenessPanelTitle: 'Completeness',
        completenessEmptyMsg: 'No data loaded',
        badgeZeroEarthquakes: '0 earthquakes visible',

        panelExpand: 'Expand panel',
        panelCollapse: 'Collapse panel',
        undoSuccess: 'Last move successfully undone.',

        statsParameter: 'Parameter',
        statsGR: 'G-R (OLS)',
        statsMLE: 'MLE/MV',
        statsAValue: 'a value',
        statsBValue: 'b value',
        statsMcCompleteness: 'Mc (completeness)',
        statsAnnualRate: 'Annual rate (λ)',
        statsObservationPeriod: 'Observation period (years)',
        statsEventsAnalyzed: 'Events analyzed',
        deleteZone: 'Delete zone',
        deleteCatalog: 'Delete catalog',
        zoneColorPickerTip: 'Click to change the zone color',

        /* ── Viewer features section (dashboard) ───────────────────── */
        featuresTitle: 'Viewer features',
        featuresLead: 'The interactive viewer includes analysis, editing and visual customization tools designed to facilitate seismic source analysis work.',
        featThemeTag: 'Accessibility',
        featThemeTitle: 'Adaptable visual themes',
        featThemeDesc: 'The side panel offers three display modes selectable with one click from the header. The choice is remembered between sessions.',
        themeLightLabel: 'Light',
        themeDarkLabel: 'Dark',
        themeColorblindLabel: 'Colorblind',
        featThemeNote: 'The colorblind mode uses the Okabe-Ito palette, free of red-green confusion for deuteranopia and protanopia.',
        featEditTag: 'Editing',
        featEditTitle: 'Interactive event editing',
        featEditDesc: 'Display error ellipses and activate edit mode for relocating seismic events directly on the map. Each displacement is recorded with a visual trail and can be undone individually.',
        featEditItem1: 'Drag markers on the map',
        featEditItem2: 'Displacement trail per event',
        featEditItem3: 'Undo movement step by step',
        featGRTag: 'Analysis',
        featGRTitle: 'Automatic Gutenberg-Richter curves',
        featGRDesc: 'When a source zone is selected, the platform automatically calculates the Gutenberg-Richter relationship parameters using least squares and maximum likelihood methods, graphically representing the obtained models and their goodness-of-fit indicators.',
        featGRItem1: 'Dual estimation OLS + MLE/MV (Aki-Utsu)',
        featGRItem2: 'Automatic Mc by MAXC',
        featGRItem3: 'Expanded fullscreen view',

        /* ── Upload drop zones ───────────────────────────────────── */
        uploadZoneCsvText: 'Drop your CSV here',
        uploadZoneZipText: 'Drop your ZIP here',
        uploadZoneClickHint: 'or click to browse'
        ,
        ellipseFieldsNote: '*Note: If you do not have the smajax, sminax or strike fields, put 0 in those fields so the viewer uses default values.'
    }
};

function formatTemplate(template, params = {}) {
    return Object.keys(params).reduce((result, key) => {
        return result.replace(new RegExp(`\\{${key}\\}`, 'g'), params[key]);
    }, template);
}

function getSavedLanguage() {
    const saved = window.localStorage.getItem(GEO_PORTAL_LANGUAGE_KEY);
    return saved && TRANSLATIONS[saved] ? saved : DEFAULT_LANGUAGE;
}

function setSavedLanguage(lang) {
    const safeLang = TRANSLATIONS[lang] ? lang : DEFAULT_LANGUAGE;
    window.localStorage.setItem(GEO_PORTAL_LANGUAGE_KEY, safeLang);
    return safeLang;
}

function translate(key, params = {}) {
    const lang = getSavedLanguage();
    const translation = TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS[DEFAULT_LANGUAGE]?.[key] ?? key;
    return formatTemplate(translation, params);
}

function updateElementText(element) {
    const key = element.dataset.i18n;
    if (!key) return;
    const text = translate(key);
    if (element.dataset.i18nHtml !== undefined) {
        element.innerHTML = text;
    } else {
        element.textContent = text;
    }
}

function updateElementAttributes(element) {
    if (element.dataset.i18nTitle) {
        element.title = translate(element.dataset.i18nTitle);
    }
    if (element.dataset.i18nPlaceholder) {
        element.placeholder = translate(element.dataset.i18nPlaceholder);
    }
    if (element.dataset.i18nAriaLabel) {
        element.setAttribute('aria-label', translate(element.dataset.i18nAriaLabel));
    }
    if (element.dataset.i18nValue) {
        element.value = translate(element.dataset.i18nValue);
    }
}

function updateSelectOptions(select) {
    if (!select || !select.options) return;
    Array.from(select.options).forEach((option) => {
        const key = option.dataset.i18n;
        if (key) option.textContent = translate(key);
    });
}

function applyPageTitle() {
    const titleKey = document.documentElement.dataset.pageTitleKey;
    if (titleKey) {
        document.title = translate(titleKey);
    }
}

function applyLanguage(lang = null) {
    const finalLang = setSavedLanguage(lang || getSavedLanguage());
    document.documentElement.lang = finalLang;
    applyPageTitle();
    document.querySelectorAll('[data-i18n]').forEach(updateElementText);
    document.querySelectorAll('[data-i18n-title]').forEach(updateElementAttributes);
    document.querySelectorAll('[data-i18n-placeholder]').forEach(updateElementAttributes);
    document.querySelectorAll('[data-i18n-aria-label]').forEach(updateElementAttributes);
    document.querySelectorAll('select').forEach(updateSelectOptions);
    const selectors = document.querySelectorAll('[data-i18n-select]');
    selectors.forEach((el) => el.value = finalLang);
    updateFlagSwitchers(finalLang);
    document.dispatchEvent(new CustomEvent('geoportal:languageChanged', { detail: { lang: finalLang } }));
}

function updateFlagSwitchers(lang) {
    document.querySelectorAll('.lang-flag-btn').forEach((btn) => {
        btn.classList.toggle('lang-flag-active', btn.dataset.lang === lang);
    });
}

function initializeFlagSwitchers() {
    document.querySelectorAll('.lang-flag-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            applyLanguage(btn.dataset.lang);
        });
    });
}

function initializeLanguageSelectors() {
    document.querySelectorAll('[data-language-selector]').forEach((select) => {
        select.addEventListener('change', (event) => {
            applyLanguage(event.target.value);
        });
    });
}

function initLanguageSupport() {
    document.addEventListener('DOMContentLoaded', () => {
        initializeLanguageSelectors();
        initializeFlagSwitchers();
        applyLanguage();
    });
}

function getAcceptLanguage() {
    return getSavedLanguage() === 'en' ? 'en' : 'es';
}

window.geoportalLanguage = {
    translate,
    applyLanguage,
    getSavedLanguage,
    setSavedLanguage,
    getAcceptLanguage,
    initLanguageSupport
};

initLanguageSupport();
