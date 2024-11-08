import streamlit as st
import json
from data_fetching import (
    get_player_prediction_data,
    get_db_connection,
    get_all_players,
    get_player_fg_percentage,
)
from utils import process_input
import joblib

# Load the model
models_directory = "models"
model_name = "fg_percentage_model"
model, feature_names = joblib.load(f"{models_directory}/{model_name}.joblib")

# Get database connection
conn = get_db_connection()

# Get all players for the 2024 season
all_players = get_all_players(conn, "2024")
player_names = [player["player"] for player in all_players]

st.title("NBA Player Field Goal Percentage Predictor")

st.write(
    "Select a player to predict their field goal percentage for the upcoming season."
)

# Create a searchable dropdown
selected_player = st.selectbox(
    "Select a player",
    options=player_names,
    index=0,
    format_func=lambda x: x,  # Display the full name
    help="Type to search for a player",
)

if st.button("Predict"):
    if selected_player:
        # Split the full name into first and last name
        names = selected_player.split(maxsplit=1)
        if len(names) == 2:
            first_name, last_name = names

            # Generate player data JSON
            player_data_json = get_player_prediction_data(first_name, last_name)
            player_data = json.loads(player_data_json)

            if "error" in player_data:
                st.error(f"Error: {player_data['error']}")
            else:
                # Process the player data for prediction
                features_df = process_input(player_data, feature_names)
                prediction = model.predict(features_df)[0]

                st.success(
                    f"Predicted Field Goal Percentage for {selected_player}: {prediction * 100:.2f}%"
                )

                # Fetch actual FG percentage for 2025
                full_name = selected_player.replace(
                    ".", ""
                )  # Normalize name format if necessary
                actual_fg_2025_row = get_player_fg_percentage(conn, full_name, "2025")
                actual_fg_2025 = (
                    actual_fg_2025_row["fg_percent"] if actual_fg_2025_row else None
                )

                if actual_fg_2025 is not None:
                    st.info(
                        f"Actual Field Goal Percentage for 2025: {actual_fg_2025 * 100:.2f}%"
                    )

                    # Calculate and display the difference
                    difference = (prediction - actual_fg_2025) * 100
                    st.write(f"Difference (Predicted - Actual): {difference:.2f}%")
                else:
                    st.warning("Actual Field Goal Percentage for 2025 not available.")

                with st.expander("Player Data", expanded=False):
                    st.json(player_data)
        else:
            st.error("Invalid player name format. Please select a valid player.")
    else:
        st.warning("Please select a player.")

# Close the database connection when done
conn.close()
