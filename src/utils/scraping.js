import axios from 'axios';


export async function scrapeTopScorers(logger, season, limit) {
    const url = `https://stats.nba.com/stats/leagueleaders?LeagueID=00&PerMode=PerGame&Scope=S&Season=${season}&SeasonType=Regular%20Season&StatCategory=PTS`;
    
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Referer': 'https://www.nba.com/',
          'Origin': 'https://www.nba.com'
        }
      });
  
      const data = response.data.resultSet;
      const headers = data.headers;
      const players = data.rowSet;
  
      const playerNameIndex = headers.indexOf('PLAYER');
      const ptsIndex = headers.indexOf('PTS');

      const realLimit = limit >= 50 ? 50 : limit;
  
      const topScorers = players.slice(0, realLimit).map(player => ({
        playerName: player[playerNameIndex],
        points: player[ptsIndex]
      }));
  
      return topScorers;
    } catch (error) {
      logger.error('Error in scraping:', error);
      return [];
    }
}