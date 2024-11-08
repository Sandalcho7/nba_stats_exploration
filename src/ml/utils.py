import pandas as pd
from unidecode import unidecode


# Small normalization functions
def remove_dots(text):
    return text.replace(".", "")


def remove_accents(text):
    return unidecode(text)


# Data preparation for prediction
def process_input(player_data, feature_names):
    # Initialize a dictionary to hold all features
    features = {}

    # Add basic player info
    features["player_id"] = player_data["player_id"]
    features["age"] = player_data["age"]
    features["experience"] = player_data["experience"]
    features["birth_year"] = player_data.get(
        "birth_year", 0
    )  # Use 0 if birth_year is None

    # Process position (one-hot encoding)
    for pos in ["PG", "SG", "SF", "PF", "C"]:
        features[f"pos_{pos}"] = 1 if player_data["pos"] == pos else 0

    # Process team (one-hot encoding)
    features[f"tm_{player_data['tm']}"] = 1

    # Process previous seasons' stats
    stats_to_shift = [
        "fg_percent",
        "x3p_percent",
        "x2p_percent",
        "e_fg_percent",
        "ft_percent",
        "pts",
        "trb",
        "ast",
    ]
    for i, season in enumerate(
        player_data["prev_seasons"][:5], 1
    ):  # Consider up to 5 previous seasons
        for stat in stats_to_shift:
            features[f"{stat}_prev{i}"] = season.get(
                stat, 0
            )  # Use 0 if stat is missing

    # Fill missing previous seasons with 0
    for i in range(len(player_data["prev_seasons"]) + 1, 6):
        for stat in stats_to_shift:
            features[f"{stat}_prev{i}"] = 0

    # Create a DataFrame with a single row
    df = pd.DataFrame([features])

    # Ensure all expected features are present and in the correct order
    for feature in feature_names:
        if feature not in df.columns:
            df[feature] = 0

    # Reorder columns to match the expected feature order
    df = df.reindex(columns=feature_names, fill_value=0)

    return df
