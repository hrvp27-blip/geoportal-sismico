#!/usr/bin/env bash
set -e

echo "==> Instalando dependencias del sistema (GDAL, necesario para geopandas/pyproj)"
sudo apt-get update -qq
sudo apt-get install -y -qq gdal-bin libgdal-dev

echo "==> Instalando dependencias de Python"
pip install --upgrade pip -q
pip install -r requirements.txt -q

if [ ! -f .env ]; then
  echo "==> Generando .env para Codespaces"
  SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(50))")
  cat > .env <<EOF
SECRET_KEY=$SECRET_KEY
DEBUG=True
ALLOWED_HOSTS=.app.github.dev,localhost,127.0.0.1
CORS_ALLOW_ALL_ORIGINS=True
CORS_ALLOWED_ORIGINS=
CSRF_TRUSTED_ORIGINS=https://*.app.github.dev
EOF
fi

echo "==> Aplicando migraciones"
python manage.py migrate --noinput

echo "==> Listo. Ejecuta: python manage.py runserver 0.0.0.0:8000"
