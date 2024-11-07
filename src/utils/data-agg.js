import { scrapeFgPercentage } from './scraping.js';
import { getPool, selectFromDatabase } from '../api/postgres-api.js';
import {
    normalizePlayerName,
    normalizeAustrianName,
    generateId,
} from './utilities.js';

export async function enhanceAndInsertFgPercentage(logger, isDemo = false) {
    const pool = getPool(isDemo);
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const scrapedData = await scrapeFgPercentage(logger);
        const tableName = 'player_totals';
        let successCount = 0;
        let failCount = 0;

        for (const player of scrapedData) {
            try {
                // First attempt with original name
                let existingPlayerData = await selectFromDatabase(
                    logger,
                    tableName,
                    ['player_id', 'age', 'experience', 'pos'],
                    { player: player.name },
                    { orderBy: 'season DESC', limit: 1 },
                    isDemo,
                    client
                );

                // If no data found, try with normalized name
                if (existingPlayerData.length === 0) {
                    const normalizedName = normalizePlayerName(player.name);
                    existingPlayerData = await selectFromDatabase(
                        logger,
                        tableName,
                        ['player_id', 'age', 'experience', 'pos'],
                        { player: normalizedName },
                        { orderBy: 'season DESC', limit: 1 },
                        isDemo,
                        client
                    );

                    // If still no data found, try with Austrian normalization
                    if (existingPlayerData.length === 0) {
                        const austrianNormalizedName = normalizeAustrianName(
                            player.name
                        );
                        existingPlayerData = await selectFromDatabase(
                            logger,
                            tableName,
                            ['player_id', 'age', 'experience', 'pos'],
                            { player: austrianNormalizedName },
                            { orderBy: 'season DESC', limit: 1 },
                            isDemo,
                            client
                        );

                        if (existingPlayerData.length === 0) {
                            logger.warn(
                                `No existing data found for player: ${player.name} (normalized: ${normalizedName}, Austrian normalized: ${austrianNormalizedName})`
                            );
                            failCount++;
                            continue;
                        }
                    }
                }

                const playerData = existingPlayerData[0];
                const season = 2025;
                const seasId = generateId(player.name, season, player.team);

                // Prepare the new row data
                const newRowData = {
                    player: player.name,
                    tm: player.team,
                    fg_percent: player.fgPct,
                    season: season,
                    lg: 'NBA',
                    seas_id: seasId,
                    player_id: playerData.player_id,
                    age: playerData.age + 1,
                    experience: playerData.experience + 1,
                    pos: playerData.pos,
                };

                // Check if a row for this player, season, and team already exists
                const existingRow = await selectFromDatabase(
                    logger,
                    tableName,
                    ['seas_id'],
                    { seas_id: seasId },
                    { limit: 1 },
                    isDemo,
                    client
                );

                if (existingRow.length > 0) {
                    // Update existing row
                    await selectFromDatabase(
                        logger,
                        tableName,
                        Object.keys(newRowData),
                        { seas_id: seasId },
                        { update: true, values: Object.values(newRowData) },
                        isDemo,
                        client
                    );
                    logger.info(
                        `Updated existing row for player: ${player.name}`
                    );
                } else {
                    // Insert new row
                    await selectFromDatabase(
                        logger,
                        tableName,
                        Object.keys(newRowData),
                        null,
                        { insert: true, values: Object.values(newRowData) },
                        isDemo,
                        client
                    );
                    logger.info(`Inserted new row for player: ${player.name}`);
                }
                successCount++;
            } catch (error) {
                logger.error(`Error processing player ${player.name}:`, error);
                failCount++;
            }
        }

        await client.query('COMMIT');
        logger.info(
            `Finished enhancing and inserting/updating FG percentage data. Success: ${successCount}, Failed: ${failCount}, Total: ${scrapedData.length}`
        );
        return {
            success: true,
            message: `Processed ${successCount} out of ${scrapedData.length} players. Failed: ${failCount}`,
        };
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Error in enhanceAndInsertFgPercentage:', error);
        throw error;
    } finally {
        client.release();
    }
}
