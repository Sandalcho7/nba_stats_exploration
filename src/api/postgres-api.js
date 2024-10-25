import dotenv from 'dotenv';
import pg from 'pg';
import pgCopyStreams from 'pg-copy-streams';
import fs from 'fs';

import { generateCreateTableSQL } from '../utils/sql-generation.js';

// Load environment variables
dotenv.config();

// PostgreSQL client configuration
function createPool(isDemo = false) {
    return new pg.Pool({
        user: isDemo
            ? process.env.DEMO_POSTGRES_USER
            : process.env.POSTGRES_USER,
        host: isDemo ? 'demo-postgres' : 'postgres', // Match the service name in docker-compose
        database: isDemo
            ? process.env.DEMO_POSTGRES_DB
            : process.env.POSTGRES_DB,
        password: isDemo
            ? process.env.DEMO_POSTGRES_PASSWORD
            : process.env.POSTGRES_PASSWORD,
        port: 5432,
    });
}

// Create pools for both databases
const mainPool = createPool(false);
const demoPool = createPool(true);

// Function to get the appropriate pool
function getPool(isDemo = false) {
    return isDemo ? demoPool : mainPool;
}

const { from: copyFrom } = pgCopyStreams;

export async function testDbConnection(logger, isDemo = false) {
    const pool = getPool(isDemo);
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        client.release();

        logger.info('Database connection test successful', { isDemo });
        return {
            status: 'success',
            message: `Database connection successful (${isDemo ? 'Demo' : 'Main'})`,
            timestamp: result.rows[0].now,
        };
    } catch (err) {
        logger.error('Database connection test failed', {
            error: err.message,
            isDemo,
        });
        throw err;
    }
}

export async function createTableFromCSV(
    logger,
    filePath,
    chosenTableName,
    isDemo = false
) {
    const pool = getPool(isDemo);
    let client;
    try {
        const sql = await generateCreateTableSQL(
            logger,
            filePath,
            chosenTableName
        );

        client = await pool.connect();

        await client.query(sql);

        logger.info(
            `Table ${chosenTableName || 'from CSV'} created successfully`,
            { isDemo }
        );
        return {
            status: 'success',
            message: `Table ${chosenTableName || 'from CSV'} created successfully in ${isDemo ? 'Demo' : 'Main'} database`,
        };
    } catch (err) {
        logger.error('Error creating table', { error: err.message, isDemo });
        throw err;
    } finally {
        if (client) {
            client.release();
        }
    }
}

export async function insertDataFromCSV(
    logger,
    filePath,
    tableName,
    isDemo = false
) {
    const pool = getPool(isDemo);
    const client = await pool.connect();
    try {
        // Start a transaction
        await client.query('BEGIN');

        // Get column names from the table
        const columnQuery = `
            SELECT column_name
            FROM information_schema.columns 
            WHERE table_name = $1
            ORDER BY ordinal_position;
        `;
        const { rows: columns } = await client.query(columnQuery, [tableName]);

        if (columns.length === 0) {
            throw new Error(
                `Table ${tableName} has no columns or does not exist.`
            );
        }

        // Create a simple COPY command
        const columnNames = columns.map((col) => col.column_name).join(', ');
        const copySQL = `
            COPY ${tableName} (${columnNames})
            FROM STDIN WITH 
            CSV 
            HEADER 
            DELIMITER ','
            NULL 'NA'
        `;

        logger.info('Executing COPY command', { copySQL, tableName, isDemo });

        const stream = client.query(copyFrom(copySQL));
        const fileStream = fs.createReadStream(filePath);

        await new Promise((resolve, reject) => {
            fileStream
                .pipe(stream)
                .on('finish', resolve)
                .on('error', (err) => {
                    logger.error('Stream error', {
                        error: err.message,
                        stack: err.stack,
                        isDemo,
                    });
                    reject(err);
                });
        });

        // Commit the transaction
        await client.query('COMMIT');

        logger.info('Data inserted successfully', { tableName, isDemo });
        return {
            message: `Data inserted successfully in ${isDemo ? 'Demo' : 'Main'} database`,
            tableName,
        };
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Error in insertDataFromCSV', {
            error: error.message,
            stack: error.stack,
            tableName,
            isDemo,
            filePath,
        });
        throw error;
    } finally {
        client.release();
    }
}

export async function selectFromDatabase(
    logger,
    tableName,
    fields,
    conditions = {},
    options = {},
    isDemo = false
) {
    const pool = getPool(isDemo);
    const client = await pool.connect();
    let query = '';
    let values = [];
    try {
        if (options.insert) {
            query = `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${options.values.map((_, i) => `$${i + 1}`).join(', ')})`;
            values = options.values;
        } else {
            query = `SELECT ${fields.join(', ')} FROM ${tableName}`;

            if (Object.keys(conditions).length > 0) {
                const whereClauses = [];
                Object.entries(conditions).forEach(([key, value], index) => {
                    whereClauses.push(`${key} = $${index + 1}`);
                    values.push(value);
                });
                query += ` WHERE ${whereClauses.join(' AND ')}`;
            }

            if (options.orderBy) {
                query += ` ORDER BY ${options.orderBy}`;
            }

            if (options.limit) {
                query += ` LIMIT ${options.limit}`;
            }
        }

        logger.info('Executing database query', { query, values });

        const result = await client.query(query, values);

        logger.info('Query executed successfully', {
            rowCount: result.rowCount,
        });

        return result.rows;
    } catch (error) {
        logger.error('Error executing database query', {
            error: error.message,
            stack: error.stack,
            query,
            values,
        });
        throw error;
    } finally {
        client.release();
    }
}

export async function deleteAllFromTable(logger, tableName, isDemo = false) {
    const pool = getPool(isDemo);
    const client = await pool.connect();
    try {
        const query = `DELETE FROM ${tableName}`;
        logger.info('Executing delete all query', { query });
        await client.query(query);
        logger.info('Delete all query executed successfully');
    } catch (error) {
        logger.error('Error executing delete all query', {
            error: error.message,
            stack: error.stack,
            tableName,
        });
        throw error;
    } finally {
        client.release();
    }
}
