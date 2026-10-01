/**
 * Cấu hình PM2 cho production.
 *
 *   pm2 start ecosystem.config.js --env production
 *   pm2 save && pm2 startup systemd
 */
module.exports = {
  apps: [
    {
      name: 'blog',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: '/var/www/blog',

      // fork + 1 instance cho VPS 2GB. Lên 4GB thì đổi exec_mode: 'cluster',
      // instances: 2 — nhưng chỉ sau khi đã đo, không đổi theo cảm tính.
      instances: 1,
      exec_mode: 'fork',

      // Ưu tiên IPv4 để loại bỏ độ trễ timeout DNS IPv6 (2-5s) tới Supabase Tokyo / OAuth
      node_args: '--dns-result-order=ipv4first',

      // Next giữ cache trong RAM; mốc này chặn rò rỉ bộ nhớ làm OOM cả máy.
      max_memory_restart: '800M',

      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        // Chỉ nghe localhost. Nginx là cổng duy nhất ra internet.
        HOSTNAME: '127.0.0.1',
        NODE_OPTIONS: '--dns-result-order=ipv4first',
      },

      error_file: '/var/www/blog/logs/err.log',
      out_file: '/var/www/blog/logs/out.log',
      time: true,
      merge_logs: true,

      // Nếu app chết liên tục thì dừng lại, đừng quay vòng vô hạn đốt CPU.
      max_restarts: 10,
      min_uptime: '20s',
    },
  ],
};
