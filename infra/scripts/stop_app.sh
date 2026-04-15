#!/bin/bash
# infra/scripts/stop_app.sh
# Detiene PM2 si está corriendo, sin fallar si no existe

echo "=== [CodeDeploy] Deteniendo app render-app ==="

# Verifica si PM2 está instalado y la app existe
if command -v pm2 &> /dev/null; then
  if pm2 list | grep -q "render-app"; then
    pm2 stop render-app
    echo "App detenida correctamente."
  else
    echo "App no estaba corriendo, continuando..."
  fi
else
  echo "PM2 no instalado, saltando stop."
fi

exit 0
