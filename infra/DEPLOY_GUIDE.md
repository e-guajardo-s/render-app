# infra/DEPLOY_GUIDE.md
# Guía completa de despliegue profesional — render-app en AWS
# ============================================================
# Lee este archivo de arriba a abajo la primera vez.
# Los pasos siguientes son en orden estricto.

## ARQUITECTURA FINAL
#
#  Internet → CloudFront → /api/*      → ALB → EC2 (Node.js + PM2)
#                        → /socket.io/* → ALB → EC2 (WebSocket)
#                        → /*           → S3  (React build estático)
#
#  EC2 lee secretos desde AWS Secrets Manager al arrancar.
#  GitHub Actions despliega automáticamente en cada push a main.

---

## PASO 1 — AWS Secrets Manager (5 min)
# Guarda tus credenciales cifradas en AWS (reemplaza el .env)

1. Ve a AWS Console → Secrets Manager → "Store a new secret"
2. Tipo: "Other type of secret"
3. En "Key/value pairs" agrega estas 6 claves con sus valores reales:
   - MONGO_URI
   - JWT_SECRET     (usa una cadena aleatoria de 64+ caracteres)
   - MQTT_HOST
   - MQTT_PORT
   - MQTT_USERNAME
   - MQTT_PASSWORD
4. Nombre del secreto: render-app/prod
5. Rotación: desactivada por ahora
6. Clic en "Store"

IMPORTANTE: Después de esto, vacía tu backend/.env real.
El .env.example (sin valores) sí puede quedarse.

---

## PASO 2 — S3: Dos buckets (3 min)

### Bucket 1: Frontend estático
- Nombre: render-app-frontend
- Región: us-east-1 (o la tuya, pero elige una y quédate)
- Block all public access: ON  (CloudFront accede vía OAC, no directo)
- Versioning: OFF

### Bucket 2: Artefactos de CodeDeploy
- Nombre: render-app-artifacts
- Block all public access: ON
- Versioning: OFF

---

## PASO 3 — IAM Role para EC2 (5 min)

1. IAM → Roles → "Create role"
2. Trusted entity: EC2
3. Policies: adjunta la de infra/iam_policy.json (cópiala como inline policy)
4. Nombre del rol: render-app-ec2-role
5. Ve a tu instancia EC2 → Actions → Security → Modify IAM role → selecciona render-app-ec2-role

---

## PASO 4 — Setup inicial de EC2 (10 min)
# Solo la primera vez. Conéctate via SSH y ejecuta:

sudo bash /tmp/setup_ec2.sh

# Para subir el script:
scp -i tu-key.pem infra/scripts/setup_ec2.sh ubuntu@TU_IP:/tmp/

# Verifica que quedó todo bien:
node --version     # debe mostrar v20.x
pm2 --version      # debe mostrar 5.x
aws --version      # debe mostrar aws-cli 2.x
sudo systemctl status codedeploy-agent   # debe estar "active (running)"

---

## PASO 5 — Application Load Balancer (10 min)

1. EC2 → Load Balancers → "Create load balancer" → Application Load Balancer
2. Nombre: render-app-alb
3. Scheme: Internet-facing
4. Listeners:
   - HTTP:80  → redirige a HTTPS:443 (acción: Redirect)
   - HTTPS:443 → Target Group (ver abajo)
5. Target Group:
   - Nombre: render-app-tg
   - Target type: Instances
   - Protocol: HTTP, Port: 5000
   - Health check path: /api
   - Healthy threshold: 2 checks
6. Registra tu instancia EC2 en el Target Group

---

## PASO 6 — CodeDeploy (5 min)

1. CodeDeploy → Applications → "Create application"
   - Nombre: render-app
   - Compute platform: EC2/On-premises

2. Dentro de la app → "Create deployment group"
   - Nombre: render-app-prod
   - Service role: crea un rol con la policy AWSCodeDeployRole
   - Deployment type: In-place
   - Environment: Amazon EC2 instances
   - Tag: Key=App, Value=render-app  (añade este tag a tu EC2)
   - Deployment config: CodeDeployDefault.OneAtATime
   - Load balancer: desmarca si tienes solo 1 instancia al inicio

---

## PASO 7 — CloudFront (15 min)
# Sigue el archivo infra/cloudfront_behaviors.md para la configuración
# detallada de Origins, Behaviors y la CloudFront Function para React Router.

Resumen rápido:
- Origin 1: S3 con OAC (bucket render-app-frontend)
- Origin 2: ALB (render-app-alb-xxx.elb.amazonaws.com)
- Behavior /socket.io/* → ALB, WebSocket ON, sin caché
- Behavior /api/*       → ALB, sin caché
- Behavior *            → S3, con caché + CloudFront Function SPA
- Custom error pages: 403 y 404 → /index.html (HTTP 200)
- SSL: certificado en ACM (us-east-1)

---

## PASO 8 — Variables de entorno del backend para producción

En infra/scripts/start_app.sh, actualiza la línea:
   export FRONTEND_URL="https://TU_DOMINIO_REAL.cloudfront.net"

O si tienes dominio propio:
   export FRONTEND_URL="https://app.tu-empresa.cl"

---

## PASO 9 — GitHub Secrets (2 min)
# Ve a tu repo en GitHub → Settings → Secrets and variables → Actions

Agrega estos 6 secrets (ver infra/github_secrets.md para detalle):
   AWS_ACCESS_KEY_ID
   AWS_SECRET_ACCESS_KEY
   AWS_REGION                    → us-east-1
   S3_BUCKET_FRONTEND            → render-app-frontend
   S3_BUCKET_ARTIFACTS           → render-app-artifacts
   CLOUDFRONT_DISTRIBUTION_ID    → E1XXXXXXXXX

---

## PASO 10 — Primer deploy (automático)

git add .
git commit -m "feat: professional AWS deployment setup"
git push origin main

# GitHub Actions hará:
# 1. npm ci + vite build del frontend
# 2. aws s3 sync → render-app-frontend
# 3. Invalidar caché CloudFront
# 4. Empaquetar backend (sin node_modules ni .env)
# 5. Subir .zip a render-app-artifacts
# 6. aws deploy create-deployment → CodeDeploy
# 7. CodeDeploy en EC2: stop → install deps → start PM2 → validate /api

---

## VERIFICACIÓN FINAL

# Desde tu máquina local:
curl https://TU_DOMINIO/api
# Debe devolver: {"message":"render-app API online","env":"production"}

# Logs en EC2:
pm2 logs render-app --lines 50
cat /var/log/render-app/error.log

# Estado de CodeDeploy:
aws deploy list-deployments --application-name render-app --deployment-group-name render-app-prod

---

## TROUBLESHOOTING COMÚN

### "La app arranca y se cae inmediatamente"
→ pm2 logs render-app --lines 100
→ Verifica que Secrets Manager tiene el nombre exacto: render-app/prod
→ Verifica que el IAM Role está adjunto al EC2

### "502 Bad Gateway en /api/*"
→ El ALB no llega al EC2. Verifica el Target Group health check.
→ Asegúrate que el puerto 5000 está abierto en el Security Group del EC2
   (inbound desde el Security Group del ALB, no desde 0.0.0.0/0)

### "El frontend carga pero /dashboard da 404 al refrescar"
→ La CloudFront Function para SPA routing no está aplicada.
→ O las Custom Error Pages (403/404 → /index.html) no están configuradas.

### "Socket.IO no conecta en producción"
→ Verifica que el Behavior /socket.io/* tiene WebSocket habilitado.
→ El ALB necesita tener habilitado "Stickiness" si escalas a más de 1 EC2.
   (o implementa Redis Adapter en Socket.IO para estado compartido)

### "CORS error en producción"
→ Agrega FRONTEND_URL al script start_app.sh con el dominio exacto.
→ Redeploya con: pm2 restart render-app --update-env
