import express from 'express';
import dotenv from 'dotenv';
import promMiddleware from 'express-prometheus-middleware';
import promClient from 'prom-client';
import winston from 'winston';
import LokiTransport from 'winston-loki';

// Load environment variables
dotenv.config();

const app = express();
const host = '0.0.0.0';
const port = process.env.API_PORT || 3000;

// Create a Registry to register metrics
const register = new promClient.Registry();

// Configure Winston logger with Loki transport
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'api-server' },
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
    new LokiTransport({
      host: 'http://loki:3100',
      labels: { job: 'api-server' },
      json: true,
      format: winston.format.json(),
      replaceTimestamp: true,
      onConnectionError: (err) => console.error(err),
    }),
  ],
});

// Add Prometheus middleware
app.use(promMiddleware({
  metricsPath: '/metrics',
  collectDefaultMetrics: true,
  requestDurationBuckets: [0.1, 0.5, 1, 1.5],
  requestLengthBuckets: [512, 1024, 5120, 10240, 51200, 102400],
  responseLengthBuckets: [512, 1024, 5120, 10240, 51200, 102400]
}));

// Middleware to log all requests
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    method: req.method,
    url: req.url,
    ip: req.ip,
  });
  next();
});

// Routes
app.get('/test', (req, res) => {
  logger.info('Test endpoint was called!');
  res.send(`Test endpoint successful. Running on ${host}:${port}`);
});

// Start the server
app.listen(port, host, () => {
  logger.info(`Server running on http://${host}:${port}`);
  logger.info(`Metrics available at http://${host}:${port}/metrics`);
});