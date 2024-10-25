import puppeteer from 'puppeteer';

export async function scrapeTopScorers(logger, season, limit = 10) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });  
  const page = await browser.newPage();
  
  try {
    await page.goto(`https://www.nba.com/stats/leaders?Season=${season}&SeasonType=Regular%20Season&StatCategory=PTS`, {waitUntil: 'networkidle0'});

    const players = await page.evaluate((limit) => {
      const rows = document.querySelectorAll('tbody.Crom_body__UYOcU tr');
      return Array.from(rows).slice(0, limit).map(row => {
        const name = row.querySelector('td:nth-child(2) a').textContent.trim();
        const points = parseFloat(row.querySelector('td:nth-child(6)').textContent.trim());
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