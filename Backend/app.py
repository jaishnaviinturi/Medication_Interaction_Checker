from flask import Flask, request, jsonify
from flask_cors import CORS
from standardization import init_rxnorm_cache_db, clear_rxnorm_cache, standardize_drugs
from interactions import init_interactions_cache_db, find_interactions
from severity import init_severity_cache_db, assess_severity
from drug_info import get_drug_info
from food import get_food_interactions
from side_effects import get_side_effects
import logging
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Custom logging formatter
class CustomFormatter(logging.Formatter):
    def format(self, record):
        if not hasattr(record, 'module_name'):
            record.module_name = 'General'
        return super().format(record)

# Configure logging
handler = logging.FileHandler('medication_checker.log')
handler.setLevel(logging.INFO)
formatter = CustomFormatter('%(asctime)s - %(levelname)s - [%(module_name)s] - %(message)s')
handler.setFormatter(formatter)
logging.getLogger('').addHandler(handler)
logging.getLogger('werkzeug').addHandler(handler)

@app.route('/api/standardize', methods=['POST'])
def standardize():
    return standardize_drugs()

@app.route('/api/interactions', methods=['POST'])
def interactions():
    return find_interactions()

@app.route('/api/severity', methods=['POST'])
def severity():
    return assess_severity()

@app.route('/api/side-effects', methods=['POST'])
def side_effects():
    try:
        data = request.get_json()
        if not data or 'drug_name' not in data:
            return jsonify({"error": "Missing 'drug_name'"}), 400
        drug_name = data['drug_name']
        effects = get_side_effects(drug_name)
        return jsonify({"drug_name": drug_name, "side_effects": effects}), 200
    except Exception as e:
        logging.error(f"Error in side-effects endpoint: {str(e)}", extra={'module_name': 'SideEffects'})
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/drug-info', methods=['POST'])
def drug_info():
    try:
        data = request.get_json()
        if not data or 'drug_name' not in data:
            return jsonify({"error": "Missing 'drug_name'"}), 400
        drug_name = data['drug_name']
        info = get_drug_info(drug_name)
        return jsonify({"drug_name": drug_name, "description": info}), 200
    except Exception as e:
        logging.error(f"Error in drug-info endpoint: {str(e)}", extra={'module_name': 'DrugInfo'})
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/food-interactions', methods=['POST'])
def food_interactions():
    try:
        data = request.get_json()
        if not data or 'drug_name' not in data:
            return jsonify({"error": "Missing 'drug_name'"}), 400
        drug_name = data['drug_name']
        interactions = get_food_interactions(drug_name)
        return jsonify({"drug_name": drug_name, "food_interactions": interactions}), 200
    except Exception as e:
        logging.error(f"Error in food-interactions endpoint: {str(e)}", extra={'module_name': 'FoodInteractions'})
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/check', methods=['POST'])
def check_medications():
    try:
        data = request.get_json()
        if not data or 'medications' not in data or 'patient' not in data:
            return jsonify({"error": "Missing 'medications' or 'patient'"}), 400

        # Step 1: Standardize
        standardize_response = standardize_drugs()
        if standardize_response[1] != 200:
            return standardize_response
        standardized_data = standardize_response[0].get_json()
        if not standardized_data or 'standardized' not in standardized_data:
            return jsonify({"error": "Standardization failed"}), 500
        standardized = standardized_data['standardized']

        # Step 2: Find Interactions (rule-based only)
        from flask import Request
        mock_request = Request.from_values(json={"standardized": standardized})
        with app.test_request_context() as ctx:
            ctx.request = mock_request
            interactions_response = find_interactions()
            if interactions_response[1] != 200:
                return interactions_response
            interactions = interactions_response[0].get_json()['data']

        # Step 3: Assess Severity (rule-based only)
        severity_data = {"interactions": interactions, "patient": data['patient']}
        mock_request = Request.from_values(json=severity_data)
        with app.test_request_context() as ctx:
            ctx.request = mock_request
            severity_response = assess_severity()
            if severity_response[1] != 200:
                return severity_response
            assessed = severity_response[0].get_json()['assessed_interactions']

        # Step 4: Get Drug Info and Food Interactions
        drug_info = {}
        food_interactions = {}
        for med in data['medications']:
            drug_info[med['name']] = get_drug_info(med['name'])
            food_interactions[med['name']] = get_food_interactions(med['name'])

        return jsonify({
            "standardized": standardized,
            "interactions": interactions,
            "assessed_interactions": assessed,
            "drug_info": drug_info,
            "food_interactions": food_interactions,
            "timestamp": datetime.now().isoformat()
        }), 200
    except Exception as e:
        logging.error(f"Unexpected error: {str(e)}", extra={'module_name': 'General'})
        return jsonify({"error": "Internal server error"}), 500

if __name__ == '__main__':
    init_rxnorm_cache_db()
    clear_rxnorm_cache()
    init_interactions_cache_db()
    init_severity_cache_db()
    app.run(debug=True, host='0.0.0.0', port=5000)