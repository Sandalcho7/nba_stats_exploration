import requests
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import json
from dotenv import load_dotenv

from utils import remove_dots

load_dotenv()


def get_db_connection():
    return psycopg2.connect(
        dbname=os.getenv("POSTGRES_DB"),
        user=os.getenv("POSTGRES_USER"),
        password=os.getenv("POSTGRES_PASSWORD"),
        host=os.getenv("POSTGRES_HOST"),
        port=os.getenv("POSTGRES_PORT")
    )

def fetch_player_db_data(conn, full_name):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT player_id, age, experience, birth_year, 
                   fg_percent, x3p_percent, x2p_percent, e_fg_percent, ft_percent, pts, trb, ast
            FROM player_totals
            WHERE REPLACE(player, '.', '') = %s
            ORDER BY season DESC
            LIMIT 16
        """, (full_name,))
        
        return cur.fetchall()

def fetch_player_api_data(first_name, last_name):
    api_url = f"https://api.balldontlie.io/v1/players?first_name={first_name}&last_name={last_name}"
    headers = {"Authorization": os.getenv("BALLDONTLIE_API_KEY")}
    response = requests.get(api_url, headers=headers)
    
    if response.status_code != 200 or not response.json()['data']:
        raise ValueError(f"Player {first_name} {last_name} not found in API")
    
    return response.json()['data'][0]
    
def get_player_prediction_data(first_name, last_name):
    first_name = remove_dots(first_name)
    last_name = remove_dots(last_name)
    full_name = f"{first_name} {last_name}"

    try:
        player_api_data = fetch_player_api_data(first_name, last_name)
        position = player_api_data['position']
        team = player_api_data['team']['abbreviation']

        conn = get_db_connection()
        try:
            rows = fetch_player_db_data(conn, full_name)
            
            if not rows:
                raise ValueError(f"Player {full_name} not found in database")

            player_data = {
                "player_id": rows[0]['player_id'],
                "age": rows[0]['age'] + 1,
                "experience": rows[0]['experience'] + 1,
                "birth_year": rows[0]['birth_year'],
                "pos": position,
                "tm": team,
                "prev_seasons": []
            }

            for row in rows:
                season_data = {
                    "fg_percent": row['fg_percent'],
                    "x3p_percent": row['x3p_percent'],
                    "x2p_percent": row['x2p_percent'],
                    "e_fg_percent": row['e_fg_percent'],
                    "ft_percent": row['ft_percent'],
                    "pts": row['pts'],
                    "trb": row['trb'],
                    "ast": row['ast']
                }
                player_data["prev_seasons"].append(season_data)

            return json.dumps(player_data, indent=2)

        finally:
            conn.close()

    except Exception as e:
        return json.dumps({"error": str(e)}, indent=2)