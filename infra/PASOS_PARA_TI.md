# infra/PASOS_PARA_TI.md
# ============================================================
# GUÍA PARA PRINCIPIANTES EN AWS — render-app
# Lee esto de arriba a abajo. Cada paso dice exactamente qué
# hacer, dónde hacer clic, y qué copiar.
# ============================================================

## ANTES DE EMPEZAR — Cosas que debes tener listas
# 1. Tu cuenta de AWS (la que ya tienes con S3 y EC2)
# 2. Tu EC2 andando y con acceso SSH (el .pem o clave que usas)
# 3. Tu repo de GitHub con este proyecto
# 4. Node.js instalado en tu computador local

---

## ╔══════════════════════════════════════════╗
## ║  PARTE 1: PREPARAR AWS (consola web)    ║
## ╚══════════════════════════════════════════╝

## ── PASO 1: Secrets Manager (guardar tus contraseñas en AWS) ──
# Esto reemplaza tu archivo .env en producción.
# Tus credenciales de MongoDB, JWT y MQTT quedan cifradas en AWS.

1. Ve a: https://console.aws.amazon.com/secretsmanager
2. Clic en "Store a new secret"
3. Tipo de secreto: "Other type of secret"
4. Agrega estas 6 claves (Key = nombre, Value = tu valor real):

   Key: MONGO_URI
   Value: (copia tu MONGO_URI del backend/.env actual)

   Key: JWT_SECRET
   Value: (copia tu JWT_SECRET del backend/.env actual)

   Key: MQTT_HOST
   Value: (copia tu MQTT_HOST)

   Key: MQTT_PORT
   Value: 8883

   Key: MQTT_USERNAME
   Value: (tu usuario MQTT)

   Key: MQTT_PASSWORD
   Value: (tu contraseña MQTT)

5. Clic "Next"
6. Nombre del secreto: render-app/prod
   (este nombre exacto, con la barra)
7. Clic "Next" → "Next" → "Store"

✅ LISTO. Ahora puedes borrar los valores reales de backend/.env
   (el archivo .env.example sin valores puede quedarse)

---

## ── PASO 2: Crear el bucket S3 para el frontend ──
# Ya tienes S3, solo necesitas un bucket nuevo para el frontend.

1. Ve a: https://console.aws.amazon.com/s3
2. Clic "Create bucket"
3. Nombre: render-app-frontend
4. Región: la MISMA que tu EC2 (ej: us-east-1)
5. "Block all public access": dejar ACTIVADO (palomita azul)
   (CloudFront accede sin hacerlo público directamente)
6. Todo lo demás: dejar por defecto
7. Clic "Create bucket"

Luego crea un segundo bucket para los archivos de deploy:
1. Nombre: render-app-artifacts
2. Misma región
3. Block all public access: ACTIVADO
4. Clic "Create bucket"

---

## ── PASO 3: Crear un IAM Role para tu EC2 ──
# Este "permiso" le dice a tu EC2 que puede leer los secretos
# que guardaste en el Paso 1 y descargar archivos de S3.

1. Ve a: https://console.aws.amazon.com/iam/home#/roles
2. Clic "Create role"
3. "Trusted entity type": AWS service
4. "Use case": EC2
5. Clic "Next"
6. En el buscador de policies escribe "SecretsManager"
   → Selecciona: SecretsManagerReadWrite
7. Vuelve a buscar y agrega: AmazonS3ReadOnlyAccess
8. Vuelve a buscar y agrega: AWSCodeDeployRole
9. Clic "Next"
10. Role name: render-app-ec2-role
11. Clic "Create role"

Ahora adjuntar el rol a tu EC2:
1. Ve a: https://console.aws.amazon.com/ec2 → Instances
2. Selecciona tu instancia EC2
3. Clic "Actions" → "Security" → "Modify IAM role"
4. Selecciona: render-app-ec2-role
5. Clic "Update IAM role"

---

## ── PASO 4: Preparar tu EC2 (ejecutar setup) ──
# Este paso instala Node.js, PM2 y el agente de CodeDeploy en tu EC2.
# Solo se hace UNA VEZ.

Desde tu computador local, abre una terminal:

# 1. Copiar el script de setup a tu EC2
scp -i TU_CLAVE.pem infra/scripts/setup_ec2.sh ubuntu@TU_IP_EC2:/tmp/

# 2. Conectarte al EC2
ssh -i TU_CLAVE.pem ubuntu@TU_IP_EC2

# 3. Ejecutar el setup (dentro del EC2)
sudo bash /tmp/setup_ec2.sh

# Espera ~5 minutos. Verás mucho texto. Al final debe decir:
# "=== Setup completado ==="

# 4. Verificar que todo quedó bien:
node --version    # debe mostrar v20.x.x
pm2 --version     # debe mostrar 5.x.x
sudo systemctl status codedeploy-agent   # debe decir "active (running)"

# 5. Agregar un tag a tu EC2 (CodeDeploy lo necesita para encontrarla):
#    Ve a EC2 → tu instancia → pestaña "Tags" → "Manage tags" → "Add tag"
#    Key: App
#    Value: render-app

---

## ── PASO 5: Crear CodeDeploy ──
# CodeDeploy es el servicio que actualiza tu backend en EC2
# automáticamente cuando haces push a GitHub.

1. Ve a: https://console.aws.amazon.com/codesuite/codedeploy/applications
2. Clic "Create application"
3. Application name: render-app
4. Compute platform: EC2/On-premises
5. Clic "Create application"

6. Dentro de la app, clic "Create deployment group"
7. Deployment group name: render-app-prod
8. Service role: clic "Create new service role"
   → Se abre IAM, crea un rol llamado CodeDeployServiceRole
   → Adjúntale la policy: AWSCodeDeployRole
   → Vuelve a CodeDeploy y selecciona ese rol
9. Deployment type: In-place
10. Environment configuration: Amazon EC2 instances
    → Key: App, Value: render-app  (el tag que pusiste en el Paso 4)
11. Deployment settings: CodeDeployDefault.OneAtATime
12. Load balancer: DESMARCA (por ahora sin ALB)
13. Clic "Create deployment group"

---

## ── PASO 6: Crear un IAM User para GitHub Actions ──
# GitHub necesita credenciales para poder subir archivos a S3
# y disparar deployments en CodeDeploy.

1. Ve a: https://console.aws.amazon.com/iam/home#/users
2. Clic "Create user"
3. User name: github-actions-render-app
4. Clic "Next"
5. "Attach policies directly":
   Busca y selecciona estas 3:
   → AmazonS3FullAccess
   → CloudFrontFullAccess
   → AWSCodeDeployFullAccess
6. Clic "Next" → "Create user"

7. Clic en el usuario recién creado
8. Pestaña "Security credentials"
9. "Access keys" → "Create access key"
10. Use case: "Application running outside AWS"
11. Clic "Next" → "Create access key"
12. COPIA y GUARDA en un lugar seguro:
    → Access key ID (empieza con AKIA...)
    → Secret access key (solo se muestra UNA VEZ)

---

## ── PASO 7: Configurar GitHub Secrets ──
# Aquí le das a GitHub las credenciales para que el workflow
# pueda desplegar en AWS.

1. Ve a tu repositorio en GitHub
2. Clic "Settings" (arriba a la derecha del repo)
3. En el menú izquierdo: "Secrets and variables" → "Actions"
4. Clic "New repository secret" y agrega estos 6:

   Name: AWS_ACCESS_KEY_ID
   Value: (el Access key ID del Paso 6)

   Name: AWS_SECRET_ACCESS_KEY
   Value: (el Secret access key del Paso 6)

   Name: AWS_REGION
   Value: us-east-1   (o tu región)

   Name: S3_BUCKET_FRONTEND
   Value: render-app-frontend

   Name: S3_BUCKET_ARTIFACTS
   Value: render-app-artifacts

   Name: CLOUDFRONT_DISTRIBUTION_ID
   Value: (lo obtienes en el Paso 8 de abajo)

---

## ── PASO 8: Crear la distribución CloudFront ──
# CloudFront es el CDN que sirve tu frontend al mundo
# y también enruta /api/* a tu EC2.

1. Ve a: https://console.aws.amazon.com/cloudfront
2. Clic "Create a CloudFront distribution"

3. Origin domain: selecciona tu bucket "render-app-frontend"
   → Aparece sugerencia de OAC → clic "Create new OAC"
   → Nombre: render-app-s3-oac → Clic "Create"
   → Te aparecerá un banner amarillo con "Copy policy"
   → Guarda esa policy, la necesitas en el siguiente sub-paso

4. Viewer protocol policy: Redirect HTTP to HTTPS
5. Default root object: index.html

6. Clic "Create distribution"
   (Tarda ~5 min en desplegarse, estado "Deploying")

7. Copia el ID de la distribución (ej: E1ABCDEFGHIJKL)
   → Úsalo como valor de CLOUDFRONT_DISTRIBUTION_ID en GitHub Secrets

8. Agregar la policy al bucket S3:
   → Ve a S3 → render-app-frontend → Permissions → Bucket policy
   → Pega la policy que copiaste antes → Save

9. Agregar error pages para React Router:
   → Ve a tu distribución CloudFront → Error pages → Create custom error response
   → HTTP error code: 403 → Response page: /index.html → HTTP response code: 200
   → Repite para HTTP error code: 404

---

## ╔══════════════════════════════════════════╗
## ║  PARTE 2: HACER EL PRIMER DEPLOY        ║
## ╚══════════════════════════════════════════╝

## ── PASO 9: Actualizar start_app.sh con tu región ──
# Abre el archivo infra/scripts/start_app.sh
# Busca esta línea y cambia la región si es diferente:
#   REGION="${AWS_REGION:-us-east-1}"
# Y cambia el FRONTEND_URL con tu dominio de CloudFront:
#   export FRONTEND_URL="https://XXXXXX.cloudfront.net"
# (el dominio lo ves en la distribución CloudFront que creaste)

---

## ── PASO 10: Hacer el push y observar el deploy ──

# En tu computador local, desde la raíz del proyecto:
git add .
git commit -m "feat: professional AWS deployment ready"
git push origin main

# Ve a GitHub → tu repo → pestaña "Actions"
# Verás el workflow "Deploy render-app to AWS" ejecutándose.
# Son dos jobs: Frontend y Backend.
# El Frontend tarda ~2 min, el Backend ~5 min.

# Si alguno falla, clic en el job rojo → ve los logs de error.

---

## ── PASO 11: Verificar que todo funciona ──

# 1. Abrir tu URL de CloudFront en el navegador:
#    https://XXXXXX.cloudfront.net
#    → Debe cargar el login de tu app

# 2. Verificar la API:
curl https://XXXXXX.cloudfront.net/api
# → Debe devolver: {"message":"render-app API online","env":"production"}

# 3. En tu EC2, ver los logs:
ssh -i TU_CLAVE.pem ubuntu@TU_IP_EC2
pm2 logs render-app --lines 50
# → Debe mostrar "MongoDB conectado exitosamente" y "MQTT conectado"

# 4. Hacer login en tu app y probar que todo funciona.

---

## ╔══════════════════════════════════════════╗
## ║  PROBLEMAS COMUNES Y SOLUCIONES         ║
## ╚══════════════════════════════════════════╝

## "El login da error de red"
→ Revisa que CloudFront tenga el Origin del backend configurado.
  Por ahora la API va directamente a EC2 hasta que configures el ALB.
  Opción rápida: en frontend/.env del build, pon la IP pública del EC2:
  VITE_API_BASE_URL=http://TU_IP_EC2:5000

## "CodeDeploy falla con 'no instances found'"
→ Verifica que tu EC2 tenga el tag: App = render-app
→ Verifica que el CodeDeploy Agent esté corriendo:
  sudo systemctl status codedeploy-agent

## "El frontend carga pero al refrescar da 403"
→ Las Custom Error Pages de CloudFront no están configuradas.
  Agrégalas como se explica en el Paso 8.

## "pm2 logs render-app no muestra nada / no hay proceso"
→ El deploy de CodeDeploy no terminó aún, o falló.
  Revisa: aws deploy list-deployments --application-name render-app

## "Error de CORS en producción"
→ En start_app.sh, el FRONTEND_URL debe ser el dominio EXACTO de CloudFront
  (con https://, sin barra al final).
→ Luego reinicia: pm2 restart render-app --update-env

---

## PRÓXIMOS PASOS (cuando quieras mejorar más)

# 1. Dominio propio: registra un dominio en Route53 y apúntalo a CloudFront
# 2. ALB: agrega un Application Load Balancer delante del EC2 para escalar
# 3. Subida de archivos a S3: migrar document.routes.js para subir a S3
#    en vez del disco local del EC2 (los archivos se pierden al redesplegar)
# 4. MongoDB Atlas IP Whitelist: agregar la IP del EC2 a MongoDB Atlas
#    en Network Access para mayor seguridad
