import fs from 'fs';
import { parse } from 'csv-parse/sync';
import path from 'path';

export function generateCreateTableSQL(logger, filePath, chosenTableName) {
  return new Promise((resolve, reject) => {
    try {
      const tableName = chosenTableName || path.parse(filePath).name;

      // Log file path and check if file exists
      logger.info('Attempting to read file:', { filePath });
      if (!fs.existsSync(filePath)) {
        throw new Error(`File does not exist: ${filePath}`);
      }

      const fileContent = fs.readFileSync(filePath, 'utf8');
      logger.info('File content preview:', { preview: fileContent.substring(0, 100) });

      const lines = fileContent.split('\n').slice(0, 2);
      logger.info('First two lines:', { lines });

      const parsedData = parse(lines.join('\n'), {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      logger.info('Parsed data:', { parsedData });

      if (parsedData.length < 1) {
        throw new Error('CSV file is empty or has no data rows');
      }

      const headers = Object.keys(parsedData[0]);
      const dataRow = parsedData[0];

      logger.info('Headers:', { headers });
      logger.info('Data row:', { dataRow });

      const fields = headers.map(header => {
        const value = dataRow[header];
        let type = 'TEXT';
      
        if (value !== undefined && value !== 'NA') {
          if (/^\d+$/.test(value)) {
            type = 'INTEGER';
          } else if (/^[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?$/.test(value)) {
            type = 'DOUBLE PRECISION';
          }
        }
      
        return `${header.replace(/[^a-zA-Z0-9_]/g, '_')} ${type}`;
      });      

      const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (${fields.join(', ')});`;
      logger.info('Generated SQL:', { sql });
      resolve(sql);
    } catch (error) {
      logger.error('Error in generateCreateTableSQL:', { error: error.message, stack: error.stack });
      reject(error);
    }
  });
}