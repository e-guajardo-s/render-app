#!/bin/bash
# infra/scripts/install_deps.sh
# Instala dependencias de Node.js en producción

echo "=== [CodeDeploy] Instalando dependencias ==="

APP_DIR="/var/www/render-app/backend"

cd "$APP_DIR" || exit 1

# Instala solo dependencias de producción (sin devDependencies)
npm ci --omit=dev

echo "Dependencias instaladas correctamente."
exit 0
