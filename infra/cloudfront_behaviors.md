# infra/cloudfront_behaviors.md
# Configuración de CloudFront: dos Origins, dos Behaviors
#
# Esta guía explica cómo configurar CloudFront para que:
#   - /api/* y /socket.io/* → van al ALB (EC2 backend)
#   - Todo lo demás          → va a S3 (frontend estático)
#
# Esto es lo que permite que el frontend en S3 y la API en EC2
# compartan el mismo dominio (tu-dominio.com) sin CORS.

## Paso 1: Crear los dos Origins en CloudFront

### Origin 1 – S3 (frontend estático)
- Origin domain: render-app-frontend.s3.us-east-1.amazonaws.com
- Origin access: Origin Access Control (OAC) — NO hacer público el bucket
- S3 bucket policy: CloudFront te la genera automáticamente al crear el OAC

### Origin 2 – ALB (backend API)
- Origin domain: render-app-alb-xxxxxxxxx.us-east-1.elb.amazonaws.com
- Protocol: HTTPS only
- Origin custom headers: ninguno
- Viewer protocol policy: Redirect HTTP to HTTPS

## Paso 2: Configurar Cache Behaviors (en orden de prioridad)

### Behavior 1 – WebSocket (Socket.io)
- Path pattern: /socket.io/*
- Origin: ALB
- Viewer protocol policy: HTTPS only
- Cache policy: CachingDisabled
- Origin request policy: AllViewer
- WebSocket: ENABLED  ← MUY IMPORTANTE para tu Socket.IO

### Behavior 2 – API REST
- Path pattern: /api/*
- Origin: ALB
- Viewer protocol policy: HTTPS only
- Cache policy: CachingDisabled  ← APIs nunca se cachean
- Origin request policy: AllViewerExceptHostHeader
- Compress: No

### Behavior 3 – Default (*) – Frontend
- Path pattern: * (default)
- Origin: S3
- Viewer protocol policy: Redirect HTTP to HTTPS
- Cache policy: CachingOptimized
- Compress: Yes
- Function associations: CloudFront Function para SPA routing (ver abajo)

## Paso 3: CloudFront Function para React Router (SPA)
# Sin esto, refrescar la página en /dashboard devuelve 403 desde S3.
# Crear una CloudFront Function con el siguiente código:

function handler(event) {
    var request = event.request;
    var uri = request.uri;
    
    // Si la URI no tiene extensión (no es un asset), devolver index.html
    if (!uri.includes('.')) {
        request.uri = '/index.html';
    }
    
    return request;
}

# Asociar esta Function al Behavior Default (*) en el evento "Viewer request".

## Paso 4: Custom Error Pages
# Para que React Router maneje los 404 (en vez de S3):
- HTTP error code: 403 → Response page: /index.html → HTTP 200
- HTTP error code: 404 → Response page: /index.html → HTTP 200

## Paso 5: SSL/TLS
# Solicitar certificado en AWS Certificate Manager (ACM) en us-east-1
# (CloudFront solo acepta certificados de us-east-1)
# Añadir tu dominio al campo "Alternate domain name" en la distribución.
