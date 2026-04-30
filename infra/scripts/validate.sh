#!/bin/bash
# infra/scripts/validate.sh
# Verifica que la API responde antes de dar el deployment por exitoso

echo "=== [CodeDeploy] Validando servicio ==="

# Esperar hasta 15 segundos a que Node.js levante
MAX_RETRIES=5
COUNT=0

until curl -sf http://localhost:3000/api > /dev/null; do
  COUNT=$((COUNT + 1))
  if [ $COUNT -ge $MAX_RETRIES ]; then
    echo "ERROR: La app no respondió después de $MAX_RETRIES intentos."
    pm2 logs render-app --lines 50
    exit 1
  fi
  echo "Intento $COUNT/$MAX_RETRIES - esperando 3s..."
  sleep 3
done

echo "Servicio respondiendo correctamente en /api."
exit 0
