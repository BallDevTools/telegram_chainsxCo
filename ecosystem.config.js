module.exports = {
  apps: [{
    name: 'crypto-bot',
    script: 'src/app.js',
    instances: 1, // Single instance for 1 core server
    max_memory_restart: '1500M', // Restart if memory > 1.5GB
    node_args: '--expose-gc --max-old-space-size=1536', // Enable GC and limit heap
    
    // Environment
    env: {
      NODE_ENV: 'development',
      PORT: 3000,
      METRICS_PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      METRICS_PORT: 3001
    },
    
    // Logging
    log_file: 'logs/combined.log',
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Process management
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 5000,
    
    // Performance monitoring
    pmx: true,
    monitoring: true,
    
    // Advanced options
    kill_timeout: 5000,
    listen_timeout: 8000,
    
    // Health check
    health_check: {
      url: 'http://localhost:3000/health',
      interval: 60000, // 1 minute
      timeout: 5000
    },
    
    // Custom metrics
    custom_metrics: {
      'Memory Usage': () => {
        const used = process.memoryUsage();
        return Math.round(used.rss / 1024 / 1024);
      },
      'Heap Used': () => {
        const used = process.memoryUsage();
        return Math.round(used.heapUsed / 1024 / 1024);
      },
      'CPU Usage': () => {
        return process.cpuUsage();
      }
    }
  }],

  // Deployment configuration
  deploy: {
    production: {
      user: 'root',
      host: ['your-server-ip'],
      ref: 'origin/main',
      repo: 'https://github.com/your-username/telegram-crypto-bot.git',
      path: '/var/www/crypto-bot',
      'pre-deploy-local': '',
      'post-deploy': 'npm install --production && npm run migrate && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};