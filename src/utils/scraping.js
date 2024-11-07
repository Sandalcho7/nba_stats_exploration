import puppeteer from 'puppeteer';

export async function scrapeTopScorers(logger, season, limit = 10) {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    try {
        await page.goto(
            `https://www.nba.com/stats/leaders?Season=${season}&SeasonType=Regular%20Season&StatCategory=PTS`,
            { waitUntil: 'networkidle0' }
        );

        const players = await page.evaluate((limit) => {
            const rows = document.querySelectorAll('tbody.Crom_body__UYOcU tr');
            return Array.from(rows)
                .slice(0, limit)
                .map((row) => {
                    const name = row
                        .querySelector('td:nth-child(2) a')
                        .textContent.trim();
                    const points = parseFloat(
                        row.querySelector('td:nth-child(6)').textContent.trim()
                    );
                    return { name, points };
                });
        }, limit);

        return players;
    } catch (error) {
        logger.error('Error during scraping:', error);
        throw error;
    } finally {
        await browser.close();
    }
}

export async function scrapeFgPercentage(logger) {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    try {
        await page.goto(
            `https://www.nba.com/stats/leaders?StatCategory=FG_PCT&PerMode=Totals`,
            {
                waitUntil: 'networkidle0',
                timeout: 60000, // Increase timeout to 60 seconds
            }
        );

        let players = [];
        let currentPage = 1;
        let hasNextPage = true;

        while (hasNextPage) {
            await page.waitForSelector('tbody.Crom_body__UYOcU tr', {
                timeout: 30000,
            });

            const newPlayers = await page.evaluate(() => {
                const rows = document.querySelectorAll(
                    'tbody.Crom_body__UYOcU tr'
                );
                return Array.from(rows).map((row) => {
                    const name = row
                        .querySelector('td:nth-child(2) a')
                        .textContent.trim();
                    const team = row
                        .querySelector('td:nth-child(3) a')
                        .textContent.trim();
                    const fgPct =
                        parseFloat(
                            row
                                .querySelector('td:nth-child(9)')
                                .textContent.trim()
                        ) / 100;
                    return { name, team, fgPct };
                });
            });

            players = players.concat(newPlayers);

            logger.info(
                `Scraped ${players.length} players so far. Current page: ${currentPage}`
            );

            const nextButton = await page.$(
                'button.Pagination_button__sqGoH[title="Next Page Button"]:not([disabled])'
            );

            if (!nextButton) {
                logger.info('No more pages available');
                hasNextPage = false;
            } else {
                await nextButton.click();

                // Wait for network to be idle instead of full navigation
                try {
                    await page.waitForNetworkIdle({ timeout: 30000 });
                } catch (error) {
                    logger.warn(
                        `Network didn't become idle after 30 seconds on page ${currentPage + 1}. Continuing anyway.`
                    );
                }

                currentPage++;
            }
        }

        logger.info(
            `Scraping completed. Total players scraped: ${players.length}`
        );
        return players;
    } catch (error) {
        logger.error('Error during scraping:', error);
        throw error;
    } finally {
        await browser.close();
    }
}
