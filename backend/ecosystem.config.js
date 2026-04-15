// backend/ecosystem.config.js
// Configuración de PM2 para producción.
// PM2 usa este archivo cuando lo lanzas con: pm2 start ecosystem.config.js
//
// Las variables de entorno NO van acá — las inyecta el script start_app.sh
// leyéndolas desde AWS Secrets Manager en tiempo de deploy.

module.exports = {
  apps: [
    {
      name: 'render-app',
      script: './index.js',

      // ── Gestión de instancias ──────────────────────────────────────────
      // 'max' usa todos los núcleos del CPU. Para t3.small (2 vCPU) usa 2.
      // Si tienes Socket.IO con estado compartido, usa 1 hasta que implementes
      // Redis Adapter. Con 1 instancia no hay problema de sesiones cruzadas.
      instances: 1,
      exec_mode: 'fork',   // cambiar a 'cluster' solo si añades Redis Adapter

      // ── Reinicio automático ───────────────────────────────────────────
      watch: false,                // nunca en producción
      max_memory_restart: '400M',  // reinicia si supera 400 MB
      restart_delay: 3000,         // espera 3s entre reinicios
      max_restarts: 10,            // si falla 10 veces seguidas, para
      min_uptime: '10s',           // debe vivir al menos 10s para contar como arranque exitoso

      // ── Logs ──────────────────────────────────────────────────────────
      log_file: '/var/log/render-app/combined.log',
      out_file: '/var/log/render-app/app.log',
      error_file: '/var/log/render-app/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // ── Variables de entorno ──────────────────────────────────────────
      // Solo ponemos las que NO son secretos.
      // Las secretas (JWT_SECRET, MONGO_URI, etc.) las inyecta start_app.sh
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 5000,
      },
    },
  ],
};
