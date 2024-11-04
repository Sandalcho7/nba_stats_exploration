from flask import Flask, request, jsonify
import joblib

from utils import processInput

app = Flask(__name__)

# Load the model
models_directory = 'models'
model_name = 'fg_percentage_model'
model, feature_names = joblib.load(f'{models_directory}/{model_name}.joblib')


@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        features = processInput(data, feature_names)
        prediction = model.predict([features])[0]
        return jsonify({'prediction': float(prediction)})
    except Exception as e:
        return jsonify({'error': str(e)}), 400
    

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)