module.exports = {
  apps: [
    {
      name: 'competency-framework',
      script: './backend/server.js',
      cwd: '/Users/mahesh.marath/Cursor/Work/Team/competency-framework-designers',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
