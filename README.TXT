TFG_PLATAFORMA/
│
├── manage.py
├── requirements.txt
├── openquake_web/
│   ├── __init__.py
│   ├── asgi.py
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├──map
│   ├── __init__.py
│   ├── admin.py
│   ├── apps.py
│   ├── models.py
│   ├── serializers.py
│   ├──tests.py
│   ├── urls.py
│   └── views.py
│
├──openquake_jobs
│   ├──output
│   ├── gsim_logic_tree.xml
│   ├── job.ini
│   ├── site_model.csv
│   └── source_model.xml
│
├──scripts
│   └── run_oq_job.py
└── earthquakes/
    ├── __init__.py
    ├── admin.py
    ├── apps.py
    ├── models.py
    ├── serializers.py
    ├── urls.py
    ├── views.py
    ├── templates/
    │   └── map.html
    └── migrations/
        └── __init__.py

Características recientes:
- Exportación de gráficos Gutenberg‑Richter a PDF directamente desde el cliente. Incluye la gráfica, parámetros a/b, R², filtros aplicados y listado de eventos analizados.

.\venv_new\Scripts\activate
py manage.py runserver
