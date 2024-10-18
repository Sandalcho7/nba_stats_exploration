import express from 'express';
import dotenv from 'dotenv';
import promMiddleware from 'express-prometheus-middleware';
import promClient from 'prom-client';

// Load environment variables
dotenv.config();

const app = express();
const host = '0.0.0.0';
const port = process.env.API_PORT || 3000;

// Create a Registry to register metrics
const register = new promClient.Registry();

// Add Prometheus middleware
app.use(promMiddleware({
  metricsPath: '/metrics',
  collectDefaultMetrics: true,
  requestDurationBuckets: [0.1, 0.5, 1, 1.5],
  requestLengthBuckets: [512, 1024, 5120, 10240, 51200, 102400],
  responseLengthBuckets: [512, 1024, 5120, 10240, 51200, 102400]
}));

// Routes
app.get('/test', (req, res) => {
  console.log('Test endpoint was called!');
  res.send(`Test endpoint successful. Running on ${host}:${port}`);
});

// Start the server
app.listen(port, host, () => {
  console.log(`Server running on http://${host}:${port}`);
  console.log(`Metrics available at http://${host}:${port}/metrics`);
});