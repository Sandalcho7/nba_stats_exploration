import dotenv from 'dotenv';
import pg from 'pg';
import pgCopyStreams from 'pg-copy-streams';
import fs from 'fs';

import { generateCreateTableSQL } from '../utils/sql-generation.js';


// Load environment variables
dotenv.config();

// PostgreSQL client configuration
const pool = new pg.Pool({
    user: process.env.POSTGRES_USER,
    host: 'postgres', // This should match the service name in docker-compose
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: 5432, // Default PostgreSQL port
});

const { from: copyFrom } = pgCopyStreams;


export async function testDbConnection(logger) {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
  
      logger.info('Database connection test successful');
      return {
        status: 'success',
        message: 'Database connection successful',
        timestamp: result.rows[0].now
      };
    } catch (err) {
      logger.error('Database connection test failed', { error: err.message });
      throw err;
    }
}

export async function createTableFromCSV(logger, filePath, chosenTableName) {
    let client;
    try {
        const sql = await generateCreateTableSQL(logger, filePath, chosenTableName);

        client = await pool.connect();

        await client.query(sql);

        logger.info(`Table ${chosenTableName || 'from CSV'} created successfully`);
        return {
            status: 'success',
            message: `Table ${chosenTableName || 'from CSV'} created successfully`
        };
    } catch (err) {
        logger.error('Error creating table', { error: err.message });
        throw err;
    } finally {
        if (client) {
            client.release();
        }
    }
}

export async function insertDataFromCSV(logger, filePath, tableName) {
    const client = await pool.connect();
    try {
        // Get column names from the table
        const columnQuery = `
            SELECT column_name
            FROM information_schema.columns 
            WHERE table_name = $1
            ORDER BY ordinal_position;
        `;
        const { rows: columns } = await client.query(columnQuery, [tableName]);

        // Create a simple COPY command
        const columnNames = columns.map(col => col.column_name).join(', ');
        const copySQL = `
            COPY ${tableName} (${columnNames})
            FROM STDIN WITH 
            CSV 
            HEADER 
            DELIMITER ','
            NULL 'NA'
        `;

        const stream = client.query(copyFrom(copySQL));
        const fileStream = fs.createReadStream(filePath);

        await new Promise((resolve, reject) => {
            fileStream.pipe(stream)
                .on('finish', resolve)
                .on('error', reject);
        });

        logger.info('Data inserted successfully', { tableName });
        return { message: 'Data inserted successfully', tableName };
    } catch (error) {
        logger.error('Error in insertDataFromCSV', { error: error.message, stack: error.stack });
        throw error;
    } finally {
        client.release();
    }
}

export async function selectFromDatabase(logger, tableName, fields, conditions = {}, options = {}) {
    const client = await pool.connect();
    try {
        let query = `SELECT ${fields.join(', ')} FROM ${tableName}`;
        const values = [];
        
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
        
        logger.info('Executing database query', { query, values });

        const result = await client.query(query, values);
        
        logger.info('Query executed successfully', { rowCount: result.rowCount });
        
        return result.rows;
    } catch (error) {
        logger.error('Error executing database query', { 
            error: error.message, 
            stack: error.stack,
            query,
            values
        });
        throw error;
    } finally {
        client.release();
    }
}