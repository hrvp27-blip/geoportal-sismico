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

--- Uso en local ---
.\venv_new\Scripts\activate
py manage.py runserver

--- Uso online sin instalar nada (GitHub Codespaces) ---
1. En la página del repo en GitHub, botón verde "Code" > pestaña "Codespaces" > "Create codespace on master".
2. Espera a que termine el setup automático (.devcontainer/setup.sh instala GDAL y las dependencias de Python y aplica migraciones).
3. En la terminal del Codespace: python manage.py runserver 0.0.0.0:8000
4. Cuando el puerto 8000 se reenvíe, se abrirá una vista previa del visor en el navegador (accesible también desde la pestaña "Ports").

--- Despliegue permanente (PythonAnywhere) ---
URL: https://hrpetkova.pythonanywhere.com

Primer despliegue, desde una consola Bash de PythonAnywhere:
  git clone https://github.com/hrvp27-blip/geoportal-sismico.git
  cd geoportal-sismico
  python3.10 -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt
  cp .env.example .env
  # editar .env: generar SECRET_KEY nueva y poner DEBUG=False
  python manage.py collectstatic --noinput

En la pestaña "Web" de PythonAnywhere:
  - Add a new web app > Manual configuration > la versión de Python del venv
  - Virtualenv: /home/hrpetkova/geoportal-sismico/venv
  - Editar el WSGI config file para apuntar a openquake_web.wsgi.application
    (project home: /home/hrpetkova/geoportal-sismico)
  - Static files: URL /static/ -> Directory /home/hrpetkova/geoportal-sismico/staticfiles
  - Reload

Para actualizar tras nuevos cambios (repetir en cada despliegue):
  cd geoportal-sismico && git pull && source venv/bin/activate && pip install -r requirements.txt && python manage.py collectstatic --noinput
  # luego pulsar "Reload" en la pestaña Web
