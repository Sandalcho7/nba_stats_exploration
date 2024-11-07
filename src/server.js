import express from 'express';
import dotenv from 'dotenv';
import promMiddleware from 'express-prometheus-middleware';
import promClient from 'prom-client';
import winston from 'winston';
import LokiTransport from 'winston-loki';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

import {
    getPool,
    testDbConnection,
    createTableFromCSV,
    insertDataFromCSV,
    selectFromDatabase,
    deleteAllFromTable,
} from './api/postgres-api.js';
import { scrapeTopScorers } from './utils/scraping.js';
import { fetchTeamsInfo } from './api/balldontlie-api.js';
import { enhanceAndInsertFgPercentage } from './utils/data-agg.js';

// Load environment variables
dotenv.config();

const app = express();
const host = '0.0.0.0';
const port = process.env.API_PORT || 3000;

// Create a Registry to register metrics
const register = new promClient.Registry();

const uploadsDir = path.join(process.cwd(), 'uploads');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const upload = multer({ storage: storage });

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

app.use(express.json());

// Add Prometheus middleware
app.use(
    promMiddleware({
        metricsPath: '/metrics',
        collectDefaultMetrics: true,
        requestDurationBuckets: [0.1, 0.5, 1, 1.5],
        requestLengthBuckets: [512, 1024, 5120, 10240, 51200, 102400],
        responseLengthBuckets: [512, 1024, 5120, 10240, 51200, 102400],
    })
);

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
    const isDemo = req.query.demo === 'true';
    try {
        const result = await testDbConnection(logger, isDemo);
        res.json(result);
    } catch (err) {
        res.status(500).json({
            status: 'error',
            message: `Database connection failed (${isDemo ? 'Demo' : 'Main'})`,
            error: err.message,
        });
    }
});

// Alert routes
app.post('/webhook', express.json(), (req, res) => {
    logger.info('Received webhook', { body: req.body });

    // Process the webhook payload
    const alerts = req.body.alerts;
    if (alerts && alerts.length > 0) {
        alerts.forEach((alert) => {
            logger.warn(`Alert received: ${alert.alertname}`, { alert });
            // Add your alert handling logic here
        });
    }

    res.status(200).send('Webhook received');
});

// Utils routes
app.post(
    '/create-table-from-csv',
    upload.single('csvFile'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            const filePath = req.file.path;
            const chosenTableName =
                req.body.tableName || path.parse(req.file.originalname).name;
            const isDemo = req.body.demo === 'true';

            const result = await createTableFromCSV(
                logger,
                filePath,
                chosenTableName,
                isDemo
            );

            fs.unlinkSync(filePath);

            res.json(result);
        } catch (error) {
            logger.error('Error creating table from CSV:', error);
            res.status(500).json({
                error: 'Failed to create table',
                details: error.message,
            });
        }
    }
);

app.post(
    '/insert-data-from-csv',
    upload.single('csvFile'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            const filePath = req.file.path;
            const tableName = req.body.tableName;
            const isDemo = req.body.demo === 'true';

            if (!tableName) {
                return res
                    .status(400)
                    .json({ error: 'Table name is required' });
            }

            const result = await insertDataFromCSV(
                logger,
                filePath,
                tableName,
                isDemo
            );

            res.json(result);
        } catch (error) {
            logger.error('Error inserting data from CSV:', error);
            res.status(500).json({
                error: 'Failed to insert data',
                details: error.message,
            });
        } finally {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
        }
    }
);

app.post('/select-query', async (req, res) => {
    try {
        const { tableName, fields, conditions, options, isDemo } = req.body;

        if (!tableName || !fields || !Array.isArray(fields)) {
            return res.status(400).json({
                error: 'Invalid request. tableName and fields array are required.',
            });
        }

        const results = await selectFromDatabase(
            logger,
            tableName,
            fields,
            conditions,
            options,
            isDemo
        );

        res.json({
            status: 'success',
            data: results,
        });
    } catch (error) {
        logger.error('Error in query endpoint', {
            error: error.message,
            stack: error.stack,
        });
        res.status(500).json({
            status: 'error',
            message: 'An error occurred while processing your request.',
            error: error.message,
        });
    }
});

app.post('/update-top-scorers', async (req, res) => {
    try {
        const season = req.body.season || '2024-25';
        const topLimit = parseInt(req.body.topLimit || '10', 10);
        const isDemo = req.body.demo === 'true';
        logger.info(
            `Scraping top ${topLimit} scorers for season ${season} (${isDemo ? 'Demo' : 'Main'} DB)`
        );

        const topScorers = await scrapeTopScorers(logger, season, topLimit);

        if (topScorers.length === 0) {
            logger.warn('No data retrieved from scraping');
            return res
                .status(404)
                .json({ status: 'error', message: 'No data retrieved' });
        }

        const tableName = 'top_scorers';

        // Clear existing data
        await deleteAllFromTable(logger, tableName, isDemo);

        // Insert new data with positions
        for (const scorer of topScorers) {
            // Get the position from player_season_info in demo DB
            const positionResult = await selectFromDatabase(
                logger,
                'player_season_info',
                ['pos'],
                { player: scorer.name },
                { orderBy: 'season DESC', limit: 1 },
                true
            );

            const position =
                positionResult.length > 0 ? positionResult[0].pos : 'Unknown';

            // Insert into top_scorers table in the appropriate DB based on isDemo
            await selectFromDatabase(
                logger,
                tableName,
                ['player', 'ppg', 'position'],
                null,
                {
                    insert: true,
                    values: [scorer.name, scorer.points, position],
                },
                isDemo
            );
        }

        logger.info(
            `Successfully updated top ${topLimit} scorers for season ${season} (${isDemo ? 'Demo' : 'Main'} DB)`
        );
        res.json({
            status: 'success',
            message: `Top ${topLimit} scorers updated successfully`,
            data: topScorers,
        });
    } catch (error) {
        logger.error(`Error updating top scorers:`, error);
        res.status(500).json({
            status: 'error',
            message: `Failed to update top scorers`,
            error: error.message,
        });
    }
});

app.post('/update-teams-info', async (req, res) => {
    try {
        const isDemo = req.body.demo === 'true';
        logger.info(
            `Updating teams information (${isDemo ? 'Demo' : 'Main'} DB)`
        );

        let teamsInformation;
        try {
            teamsInformation = await fetchTeamsInfo(logger);
        } catch (error) {
            if (error.response && error.response.status === 401) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Unauthorized: Please check your API key',
                });
            }
            throw error;
        }

        if (!teamsInformation || teamsInformation.length === 0) {
            logger.warn('No data retrieved from API');
            return res
                .status(404)
                .json({ status: 'error', message: 'No data retrieved' });
        }

        const tableName = 'teams_info';

        // Clear existing data
        await deleteAllFromTable(logger, tableName, isDemo);

        // Insert new data
        for (const team of teamsInformation) {
            await selectFromDatabase(
                logger,
                tableName,
                [
                    'conference',
                    'division',
                    'team_abbreviation',
                    'city',
                    'name',
                    'full_name',
                ],
                null,
                {
                    insert: true,
                    values: [
                        team.conference,
                        team.division,
                        team.abbreviation,
                        team.city,
                        team.name,
                        team.full_name,
                    ],
                },
                isDemo
            );
        }

        logger.info(
            `Successfully updated team information (${isDemo ? 'Demo' : 'Main'} DB)`
        );
        res.json({
            status: 'success',
            message: 'Team information updated successfully',
            data: teamsInformation,
        });
    } catch (error) {
        logger.error(`Error updating team information:`, error);
        res.status(500).json({
            status: 'error',
            message: `Failed to update team information`,
            error: error.message,
        });
    }
});

app.post('/update-fg-percentage', async (req, res) => {
    try {
        const isDemo = req.body.demo === 'true';
        const result = await enhanceAndInsertFgPercentage(logger, isDemo);
        res.json({ status: 'success', message: result.message });
    } catch (error) {
        logger.error('Error updating FG percentage data:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update FG percentage data',
            error: error.message,
        });
    }
});

// Start the server
app.listen(port, host, () => {
    logger.info(`Server running on http://${host}:${port}`);
    logger.info(`Metrics available at http://${host}:${port}/metrics`);
});
