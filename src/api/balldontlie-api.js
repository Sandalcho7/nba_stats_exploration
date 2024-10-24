import axios from 'axios';
import dotenv from 'dotenv';


// Load environment variables
dotenv.config();


export async function fetchTeamsInfo(logger) {
    try {
        logger.info(process.env.BALLDONTLIE_API_KEY);
      const response = await axios.get('https://api.balldontlie.io/v1/teams', {
        headers: {
          'Authorization': process.env.BALLDONTLIE_API_KEY
        }
      });
      return response.data.data;
    } catch (error) {
      logger.error('Error fetching teams info:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw error;
    }
}