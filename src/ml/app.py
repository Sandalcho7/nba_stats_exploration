from flask import Flask, request, jsonify
import json
import joblib

from utils import process_input
from data_fetching import get_player_prediction_data

app = Flask(__name__)

# Load the model
models_directory = 'models'
model_name = 'fg_percentage_model'
model, feature_names = joblib.load(f'{models_directory}/{model_name}.joblib')


@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        if 'first_name' not in data or 'last_name' not in data:
            return jsonify({'error': 'First name and last name are required'}), 400

        # Generate player data JSON
        player_data_json = get_player_prediction_data(data['first_name'], data['last_name'])
        player_data = json.loads(player_data_json)

        # Check if there was an error in getting player data
        if 'error' in player_data:
            return jsonify(player_data), 404

        # Process the player data for prediction
        features_df = process_input(player_data, feature_names)
        prediction = model.predict(features_df)[0]

        return jsonify({
            'player': f"{data['first_name']} {data['last_name']}",
            'prediction': float(prediction),
            'player_data': player_data
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400
    

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)