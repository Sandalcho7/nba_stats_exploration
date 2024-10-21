import express from 'express';
import dotenv from 'dotenv';
import promMiddleware from 'express-prometheus-middleware';
import promClient from 'prom-client';
import winston from 'winston';
import LokiTransport from 'winston-loki';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

import { testDbConnection, createTableFromCSV, insertDataFromCSV } from './api/postgres-api.js';

// Load environment variables
dotenv.config();

const app = express();
const host = '0.0.0.0';
const port = process.env.API_PORT || 3000;

// Create a Registry to register metrics
const register = new promClient.Registry();

const upload = multer({ dest: 'uploads/' });

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


// Test routes
app.get('/test', (req, res) => {
  logger.info('Test endpoint was called!');
  res.send(`Test endpoint successful. Running on ${host}:${port}`);
});

app.get('/test-db', async (req, res) => {
  try {
    const result = await testDbConnection(logger);
    res.json(result);
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: err.message
    });
  }
});

// Utilities routes
app.post('/create-table-from-csv', upload.single('csvFile'), async (req, res) => {
  try {
      if (!req.file) {
          return res.status(400).json({ error: 'No file uploaded' });
      }

      const filePath = req.file.path;
      const chosenTableName = req.body.tableName || path.parse(req.file.originalname).name;

      const result = await createTableFromCSV(logger, filePath, chosenTableName);

      fs.unlinkSync(filePath);

      res.json(result);
  } catch (error) {
      logger.error('Error creating table from CSV:', error);
      res.status(500).json({ error: 'Failed to create table', details: error.message });
  }
});

app.post('/insert-data-from-csv', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const tableName = req.body.tableName;

    if (!tableName) {
      return res.status(400).json({ error: 'Table name is required' });
    }

    const result = await insertDataFromCSV(logger, filePath, tableName);

    res.json(result);
  } catch (error) {
    logger.error('Error inserting data from CSV:', error);
    res.status(500).json({ error: 'Failed to insert data', details: error.message });
  } finally {
    // Optionally, delete the uploaded file after processing
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
  }
});


// Start the server
app.listen(port, host, () => {
  logger.info(`Server running on http://${host}:${port}`);
  logger.info(`Metrics available at http://${host}:${port}/metrics`);
});