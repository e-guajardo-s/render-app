#!/bin/bash
# infra/scripts/start_app.sh
# Inicia la app con PM2. Inyecta secretos desde AWS Secrets Manager.

set -e
echo "=== [CodeDeploy] Iniciando app render-app ==="

APP_DIR="/var/www/render-app/backend"
REGION="${AWS_REGION:-us-east-1}"   # usa variable de entorno o default
SECRET_NAME="render-app/prod"

# ── 1. Obtener secretos desde AWS Secrets Manager ────────────────
echo "Obteniendo secretos desde Secrets Manager (${SECRET_NAME})..."

SECRET_JSON=$(aws secretsmanager get-secret-value \
  --secret-id "$SECRET_NAME" \
  --region "$REGION" \
  --query SecretString \
  --output text)

# Exportar cada variable para que PM2 las herede
export MONGO_URI=$(echo "$SECRET_JSON"     | python3 -c "import sys,json; print(json.load(sys.stdin)['MONGO_URI'])")
export JWT_SECRET=$(echo "$SECRET_JSON"    | python3 -c "import sys,json; print(json.load(sys.stdin)['JWT_SECRET'])")
export MQTT_HOST=$(echo "$SECRET_JSON"     | python3 -c "import sys,json; print(json.load(sys.stdin)['MQTT_HOST'])")
export MQTT_PORT=$(echo "$SECRET_JSON"     | python3 -c "import sys,json; print(json.load(sys.stdin)['MQTT_PORT'])")
export MQTT_USERNAME=$(echo "$SECRET_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['MQTT_USERNAME'])")
export MQTT_PASSWORD=$(echo "$SECRET_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['MQTT_PASSWORD'])")

# ── 2. Variables no secretas ─────────────────────────────────────
export NODE_ENV="production"
export PORT="5000"
# Cambia esto por tu dominio real de CloudFront o dominio propio:
export FRONTEND_URL="${FRONTEND_URL:-https://tu-dominio.cloudfront.net}"

# ── 3. Crear directorio de logs si no existe ─────────────────────
mkdir -p /var/log/render-app

# ── 4. Arrancar o reiniciar con PM2 usando ecosystem.config.js ───
cd "$APP_DIR" || exit 1

if pm2 list | grep -q "render-app"; then
  echo "Reiniciando app existente..."
  pm2 restart ecosystem.config.js --env production --update-env
else
  echo "Primera ejecución, iniciando app..."
  pm2 start ecosystem.config.js --env production
fi

# Guardar estado de PM2 para reinicios del SO
pm2 save

echo "App iniciada correctamente."
exit 0
