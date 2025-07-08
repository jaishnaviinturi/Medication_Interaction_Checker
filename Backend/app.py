from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import urllib.parse
import sqlite3
import logging
from datetime import datetime, timedelta
from itertools import combinations
import google.generativeai as genai
import os
import json

app = Flask(__name__)
CORS(app)

# Custom logging formatter to handle missing module_name
class CustomFormatter(logging.Formatter):
    def format(self, record):
        # Provide a default value for module_name if not present
        if not hasattr(record, 'module_name'):
            record.module_name = 'General'
        return super().format(record)

# Configure logging
handler = logging.FileHandler('medication_checker.log')
handler.setLevel(logging.INFO)
formatter = CustomFormatter('%(asctime)s - %(levelname)s - [%(module_name)s] - %(message)s')
handler.setFormatter(formatter)
logging.getLogger('').addHandler(handler)
logging.getLogger('werkzeug').addHandler(handler)  # Capture Flask/Werkzeug logs

# SQLite database paths
RXNORM_DB_PATH = 'rxnorm_cache.db'
INTERACTIONS_DB_PATH = 'interactions_cache.db'
SEVERITY_DB_PATH = 'severity_cache.db'

# --- Gemini API Utility ---
def configure_gemini():
    """Configure Gemini API with secure key."""
    api_key = os.getenv("GEMINI_API_KEY", "your_secure_gemini_api_key")
    genai.configure(api_key=api_key)

def generate_interaction_rule(drug1, drug2):
    """Use Gemini to generate interaction rule for a drug pair."""
    try:
        configure_gemini()
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = f"""
        Provide a drug-drug interaction rule for {drug1} and {drug2}.
        Return a JSON object with:
        - interaction: Short description (e.g., "Increased risk of bleeding")
        - details: Detailed explanation (e.g., "{drug1} may enhance {drug2}'s effect.")
        If no significant interaction exists, return {{ "interaction": null, "details": null }}.
        Example:
        {{
            "interaction": "Increased risk of bleeding",
            "details": "Atorvastatin may enhance warfarin's anticoagulant effect."
        }}
        """
        response = model.generate_content(prompt)
        result = json.loads(response.text.strip())
        logging.info(f"Gemini generated rule for {drug1}+{drug2}: {result['interaction']}", extra={'module_name': 'Gemini'})
        return result
    except Exception as e:
        logging.error(f"Gemini API error for {drug1}+{drug2}: {str(e)}", extra={'module_name': 'Gemini'})
        return {"interaction": null, "details": null}

def generate_severity_and_suggestions(drug1, drug2, interaction, patient):
    """Use Gemini to generate severity, patient factors, and suggestions."""
    try:
        configure_gemini()
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = f"""
        For the drug interaction between {drug1} and {drug2} with description "{interaction}",
        provide:
        - Severity: "critical", "major", "moderate", or "minor"
        - Patient factors: List of relevant factors (e.g., ["age > 65", "renal impairment"])
        - Suggestions: List of alternative drugs or actions (e.g., ["rosuvastatin", "monitor INR"])
        Consider patient details: age={patient['age']}, weight={patient['weight']}, conditions={patient['conditions']}.
        Return a JSON object like:
        {{
            "severity": "major",
            "patient_factors": ["age > 65", "hypertension"],
            "suggestions": ["rosuvastatin", "monitor INR"]
        }}
        If no interaction, return {{ "severity": "none", "patient_factors": [], "suggestions": [] }}.
        """
        response = model.generate_content(prompt)
        result = json.loads(response.text.strip())
        logging.info(f"Gemini generated severity for {drug1}+{drug2}: {result['severity']}", extra={'module_name': 'Gemini'})
        return result
    except Exception as e:
        logging.error(f"Gemini API error for severity {drug1}+{drug2}: {str(e)}", extra={'module_name': 'Gemini'})
        return {"severity": "none", "patient_factors": [], "suggestions": []}

# --- Drug Standardization Module ---
def init_rxnorm_cache_db():
    """Initialize SQLite database for caching RxNorm results."""
    with sqlite3.connect(RXNORM_DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS rxnorm_cache (
                drug_name TEXT PRIMARY KEY,
                rxcui TEXT,
                generic_name TEXT,
                last_updated TIMESTAMP
            )
        """)
        conn.commit()

def clear_rxnorm_cache():
    """Clear the RxNorm cache to ensure fresh data."""
    with sqlite3.connect(RXNORM_DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM rxnorm_cache")
        conn.commit()
        logging.info("RxNorm cache cleared", extra={'module_name': 'Standardization'})

def get_cached_drug(drug_name):
    """Retrieve drug data from RxNorm cache if not expired."""
    with sqlite3.connect(RXNORM_DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT rxcui, generic_name, last_updated
            FROM rxnorm_cache
            WHERE drug_name = ?
        """, (drug_name.lower(),))
        result = cursor.fetchone()
        if result:
            rxcui, generic_name, last_updated = result
            last_updated = datetime.fromisoformat(last_updated)
            if datetime.now() - last_updated < timedelta(days=30):
                return rxcui, generic_name
        return None, None

def cache_drug(drug_name, rxcui, generic_name):
    """Store drug data in RxNorm cache."""
    with sqlite3.connect(RXNORM_DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO rxnorm_cache
            (drug_name, rxcui, generic_name, last_updated)
            VALUES (?, ?, ?, ?)
        """, (drug_name.lower(), rxcui, generic_name, datetime.now().isoformat()))
        conn.commit()

def query_rxnorm(drug_name):
    """Query RxNorm API to get RxCUI and generic name."""
    try:
        rxcui, generic_name = get_cached_drug(drug_name)
        if rxcui and generic_name:
            logging.info(f"Cache hit for {drug_name}: RxCUI={rxcui}, Generic={generic_name}", extra={'module_name': 'Standardization'})
            return rxcui, generic_name

        encoded_name = urllib.parse.quote(drug_name)
        url = f"https://rxnav.nlm.nih.gov/REST/rxcui.json?name={encoded_name}&search=1"
        headers = {"Accept": "application/json"}
        
        response = requests.get(url, headers=headers, timeout=5)
        if response.status_code != 200:
            logging.error(f"RxNorm API error for {drug_name}: Status {response.status_code}", extra={'module_name': 'Standardization'})
            return None, None
        
        data = response.json()
        if not data.get('idGroup', {}).get('rxnormId'):
            approx_url = f"https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term={encoded_name}&maxEntries=1"
            approx_response = requests.get(approx_url, headers=headers, timeout=5)
            if approx_response.status_code == 200 and approx_response.json().get('approximateGroup', {}).get('candidate'):
                rxcui = approx_response.json()['approximateGroup']['candidate'][0]['rxcui']
            else:
                logging.warning(f"No match for {drug_name}", extra={'module_name': 'Standardization'})
                return None, None
        else:
            rxcui = data['idGroup']['rxnormId'][0]

        related_url = f"https://rxnav.nlm.nih.gov/REST/rxcui/{rxcui}/related.json?tty=IN"
        related_response = requests.get(related_url, headers=headers, timeout=5)
        if related_response.status_code == 200 and related_response.json().get('relatedGroup', {}).get('conceptGroup'):
            for group in related_response.json()['relatedGroup']['conceptGroup']:
                if group.get('tty') == 'IN' and group.get('conceptProperties'):
                    generic_rxcui = group['conceptProperties'][0]['rxcui']
                    generic_name = group['conceptProperties'][0]['name']
                    break
            else:
                prop_url = f"https://rxnav.nlm.nih.gov/REST/rxcui/{rxcui}/properties"
                prop_response = requests.get(prop_url, headers=headers, timeout=5)
                if prop_response.status_code == 200:
                    generic_name = prop_response.json()['properties']['name']
                    generic_rxcui = rxcui
                else:
                    logging.error(f"RxNorm properties error for RxCUI {rxcui}: Status {prop_response.status_code}", extra={'module_name': 'Standardization'})
                    return None, None
        else:
            prop_url = f"https://rxnav.nlm.nih.gov/REST/rxcui/{rxcui}/properties"
            prop_response = requests.get(prop_url, headers=headers, timeout=5)
            if prop_response.status_code == 200:
                generic_name = prop_response.json()['properties']['name']
                generic_rxcui = rxcui
            else:
                logging.error(f"RxNorm properties error for RxCUI {rxcui}: Status {prop_response.status_code}", extra={'module_name': 'Standardization'})
                return None, None

        cache_drug(drug_name, generic_rxcui, generic_name)
        logging.info(f"RxNorm success for {drug_name}: RxCUI={generic_rxcui}, Generic={generic_name}", extra={'module_name': 'Standardization'})
        return generic_rxcui, generic_name
    
    except (requests.RequestException, KeyError, ValueError) as e:
        logging.error(f"RxNorm API exception for {drug_name}: {str(e)}", extra={'module_name': 'Standardization'})
        return None, None

@app.route('/api/standardize', methods=['POST'])
def standardize_drugs():
    """Standardize a list of medications using RxNorm API."""
    try:
        data = request.get_json()
        if not data or 'medications' not in data:
            logging.error("Invalid request: Missing 'medications'", extra={'module_name': 'Standardization'})
            return jsonify({"error": "Missing 'medications' in request body"}), 400

        medications = data['medications']
        if not all('name' in med and 'dosage' in med and 'frequency' in med for med in medications):
            logging.error("Invalid request: Missing required fields in medications", extra={'module_name': 'Standardization'})
            return jsonify({"error": "Each medication must have name, dosage, and frequency"}), 400

        standardized = []
        for med in medications:
            drug_name = med['name'].strip()
            if not drug_name:
                logging.warning("Empty drug name provided", extra={'module_name': 'Standardization'})
                standardized.append({"error": "Empty drug name", "original": med})
                continue

            rxcui, generic_name = query_rxnorm(drug_name)
            if rxcui and generic_name:
                standardized.append({
                    "rxnorm_id": rxcui,
                    "generic_name": generic_name,
                    "dosage": med['dosage'],
                    "frequency": med['frequency']
                })
            else:
                logging.warning(f"Failed to standardize drug: {drug_name}", extra={'module_name': 'Standardization'})
                standardized.append({"error": f"Unknown drug: {drug_name}", "original": med})

        return jsonify({
            "standardized": standardized,
            "timestamp": datetime.now().isoformat()
        }), 200

    except Exception as e:
        logging.error(f"Unexpected error: {str(e)}", extra={'module_name': 'Standardization'})
        return jsonify({"error": "Internal server error"}), 500

# --- Interaction Detection Engine ---
def init_interactions_cache_db():
    """Initialize SQLite database for caching interaction results."""
    with sqlite3.connect(INTERACTIONS_DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS interactions_cache (
                drug_pair TEXT PRIMARY KEY,
                interaction TEXT,
                details TEXT,
                last_updated TIMESTAMP
            )
        """)
        conn.commit()

def get_cached_interaction(drug1, drug2):
    """Retrieve interaction data from cache if not expired."""
    pair_key = f"{min(drug1, drug2)}:{max(drug1, drug2)}"
    with sqlite3.connect(INTERACTIONS_DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT interaction, details, last_updated
            FROM interactions_cache
            WHERE drug_pair = ?
        """, (pair_key,))
        result = cursor.fetchone()
        if result:
            interaction, details, last_updated = result
            last_updated = datetime.fromisoformat(last_updated)
            if datetime.now() - last_updated < timedelta(days=30):
                return {"interaction": interaction, "details": details}
        return None

def cache_interaction(drug1, drug2, interaction, details):
    """Store interaction data in cache."""
    pair_key = f"{min(drug1, drug2)}:{max(drug1, drug2)}"
    with sqlite3.connect(INTERACTIONS_DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO interactions_cache
            (drug_pair, interaction, details, last_updated)
            VALUES (?, ?, ?, ?)
        """, (pair_key, interaction, details, datetime.now().isoformat()))
        conn.commit()

INTERACTION_RULES = {
    ("atorvastatin", "warfarin"): {
        "interaction": "Increased risk of bleeding",
        "details": "Atorvastatin may enhance warfarin's anticoagulant effect."
    },
    ("ibuprofen", "warfarin"): {
        "interaction": "Increased risk of bleeding",
        "details": "Ibuprofen may increase warfarin's anticoagulant effect due to antiplatelet activity."
    },
    ("fluoxetine", "warfarin"): {
        "interaction": "Increased risk of bleeding",
        "details": "Fluoxetine may inhibit warfarin's metabolism, increasing bleeding risk."
    },
    ("amiodarone", "warfarin"): {
        "interaction": "Increased anticoagulant effect",
        "details": "Amiodarone inhibits warfarin's metabolism, leading to higher INR."
    },
    ("sertraline", "ibuprofen"): {
        "interaction": "Increased risk of gastrointestinal bleeding",
        "details": "Sertraline and ibuprofen together increase the risk of GI bleeding."
    },
    ("citalopram", "omeprazole"): {
        "interaction": "Increased citalopram levels",
        "details": "Omeprazole may inhibit citalopram metabolism, leading to higher levels."
    }
}

def query_interaction(drug1, drug2):
    """Query for drug-drug interactions using rules and Gemini."""
    try:
        cached = get_cached_interaction(drug1, drug2)
        if cached:
            logging.info(f"Cache hit for {drug1}+{drug2}: {cached['interaction']}", extra={'module_name': 'Interactions'})
            return cached

        pair = (min(drug1.lower(), drug2.lower()), max(drug1.lower(), drug2.lower()))
        if pair in INTERACTION_RULES:
            interaction = INTERACTION_RULES[pair]
            cache_interaction(drug1, drug2, interaction["interaction"], interaction["details"])
            logging.info(f"Rule-based interaction found for {drug1}+{drug2}: {interaction['interaction']}", extra={'module_name': 'Interactions'})
            return interaction

        interaction = generate_interaction_rule(drug1, drug2)
        if interaction["interaction"]:
            cache_interaction(drug1, drug2, interaction["interaction"], interaction["details"])
            logging.info(f"Gemini interaction found for {drug1}+{drug2}: {interaction['interaction']}", extra={'module_name': 'Interactions'})
            return interaction
        else:
            cache_interaction(drug1, drug2, None, None)
            logging.info(f"No interaction found for {drug1}+{drug2}", extra={'module_name': 'Interactions'})
            return None

    except Exception as e:
        logging.error(f"Interaction error for {drug1}+{drug2}: {str(e)}", extra={'module_name': 'Interactions'})
        return None

@app.route('/api/interactions', methods=['POST'])
def find_interactions():
    """Find drug-drug interactions for standardized drugs."""
    try:
        data = request.get_json()
        if not data or 'standardized' not in data:
            logging.error("Invalid request: Missing 'standardized'", extra={'module_name': 'Interactions'})
            return jsonify({"error": "Missing 'standardized' in request body"}), 400

        drugs = data['standardized']
        if not all('generic_name' in drug and 'rxnorm_id' in drug for drug in drugs):
            logging.error("Invalid request: Missing required fields in drugs", extra={'module_name': 'Interactions'})
            return jsonify({"error": "Each drug must have generic_name and rxnorm_id"}), 400

        interactions = []
        for drug1, drug2 in combinations(drugs, 2):
            result = query_interaction(drug1["generic_name"].lower(), drug2["generic_name"].lower())  # Normalize case
            if result and result["interaction"]:
                interactions.append({
                    "drug1": drug1["generic_name"],
                    "drug2": drug2["generic_name"],
                    "interaction": result["interaction"],
                    "details": result["details"]
                })

        logging.info(f"Found {len(interactions)} interactions", extra={'module_name': 'Interactions'})
        return jsonify({
            "data": interactions,  # Changed to 'data' to match frontend
            "timestamp": datetime.now().isoformat()
        }), 200

    except Exception as e:
        logging.error(f"Unexpected error: {str(e)}", extra={'module_name': 'Interactions'})
        return jsonify({"error": "Internal server error"}), 500

# --- Severity Assessment Module ---
def init_severity_cache_db():
    """Initialize SQLite database for caching severity and suggestion results."""
    with sqlite3.connect(SEVERITY_DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS severity_cache (
                interaction_key TEXT PRIMARY KEY,
                severity TEXT,
                patient_factors TEXT,
                suggestions TEXT,
                last_updated TIMESTAMP
            )
        """)
        conn.commit()

def get_cached_severity(drug1, drug2, interaction):
    """Retrieve severity and suggestions from cache if not expired."""
    try:
        interaction_key = f"{min(drug1.lower(), drug2.lower())}:{max(drug1.lower(), drug2.lower())}:{interaction.lower()}"
        with sqlite3.connect(SEVERITY_DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT severity, patient_factors, suggestions, last_updated
                FROM severity_cache
                WHERE interaction_key = ?
            """, (interaction_key,))
            result = cursor.fetchone()
            if result:
                severity, patient_factors, suggestions, last_updated = result
                last_updated = datetime.fromisoformat(last_updated)
                if datetime.now() - last_updated < timedelta(days=30):
                    return {
                        "severity": severity,
                        "patient_factors": patient_factors.split(",") if patient_factors else [],
                        "suggestions": suggestions.split(",") if suggestions else []
                    }
        return None
    except Exception as e:
        logging.error(f"Cache retrieval error for {drug1}+{drug2}: {str(e)}", extra={'module_name': 'Severity'})
        return None

def cache_severity(drug1, drug2, interaction, severity, patient_factors, suggestions):
    """Store severity and suggestions in cache."""
    try:
        interaction_key = f"{min(drug1.lower(), drug2.lower())}:{max(drug1.lower(), drug2.lower())}:{interaction.lower()}"
        patient_factors_str = ",".join(str(f) for f in patient_factors) if patient_factors else ""
        suggestions_str = ",".join(str(s) for s in suggestions) if suggestions else ""
        with sqlite3.connect(SEVERITY_DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO severity_cache
                (interaction_key, severity, patient_factors, suggestions, last_updated)
                VALUES (?, ?, ?, ?, ?)
            """, (interaction_key, severity, patient_factors_str, suggestions_str, datetime.now().isoformat()))
            conn.commit()
    except Exception as e:
        logging.error(f"Cache storage error for {drug1}+{drug2}: {str(e)}", extra={'module_name': 'Severity'})

SEVERITY_RULES = {
    "increased risk of bleeding": [
        {"severity": "critical", "patient_factors": ["age > 65", "renal impairment", "history of bleeding"], "conditions": ["hypertension", "ulcers"]},
        {"severity": "major", "patient_factors": [], "conditions": []}
    ],
    "increased anticoagulant effect": [
        {"severity": "major", "patient_factors": ["age > 65"], "conditions": ["liver disease"]},
        {"severity": "moderate", "patient_factors": [], "conditions": []}
    ],
    "increased risk of gastrointestinal bleeding": [
        {"severity": "major", "patient_factors": ["age > 65", "history of ulcers"], "conditions": ["gastritis"]},
        {"severity": "moderate", "patient_factors": [], "conditions": []}
    ],
    "increased citalopram levels": [
        {"severity": "moderate", "patient_factors": [], "conditions": ["hepatic impairment"]},
        {"severity": "minor", "patient_factors": [], "conditions": []}
    ],
    "increased risk of qt prolongation": [
        {"severity": "critical", "patient_factors": ["electrolyte imbalance"], "conditions": ["arrhythmia"]},
        {"severity": "major", "patient_factors": [], "conditions": []}
    ],
    "increased risk of liver toxicity": [
        {"severity": "major", "patient_factors": ["hepatic impairment"], "conditions": ["liver disease"]},
        {"severity": "moderate", "patient_factors": [], "conditions": []}
    ]
}

ALTERNATIVE_RULES = {
    ("atorvastatin", "warfarin"): ["rosuvastatin", "monitor INR closely"],
    ("ibuprofen", "warfarin"): ["acetaminophen", "monitor INR"],
    ("fluoxetine", "warfarin"): ["sertraline", "monitor INR"],
    ("amiodarone", "warfarin"): ["dronedarone", "adjust warfarin dose"],
    ("sertraline", "ibuprofen"): ["paracetamol", "monitor for GI symptoms"],
    ("citalopram", "omeprazole"): ["escitalopram", "monitor for side effects"]
}

def get_severity(interaction, patient):
    """Determine interaction severity based on rules and patient factors."""
    try:
        interaction_text = interaction["interaction"].lower()
        patient_factors = []
        severity = "moderate"

        if not patient.get("age") or not patient.get("conditions"):
            logging.warning("Incomplete patient data", extra={'module_name': 'Severity'})
            return severity, patient_factors

        if interaction_text in SEVERITY_RULES:
            for rule in SEVERITY_RULES[interaction_text]:
                conditions_met = all(cond in patient["conditions"] for cond in rule["conditions"])
                factors_met = True
                for factor in rule["patient_factors"]:
                    if factor.startswith("age > "):
                        age_threshold = int(factor.split(">")[1].strip())
                        if patient["age"] <= age_threshold:
                            factors_met = False
                            break
                    elif factor not in patient.get("conditions", []):
                        factors_met = False
                        break
                if conditions_met and factors_met:
                    severity = rule["severity"]
                    patient_factors.extend(rule["patient_factors"])
                    break

        return severity, patient_factors
    except Exception as e:
        logging.error(f"Severity calculation error: {str(e)}", extra={'module_name': 'Severity'})
        return "moderate", []

def get_alternatives(drug1, drug2):
    """Suggest alternative drugs or actions."""
    try:
        pair = (min(drug1.lower(), drug2.lower()), max(drug1.lower(), drug2.lower()))
        return ALTERNATIVE_RULES.get(pair, [])
    except Exception as e:
        logging.error(f"Alternatives retrieval error for {drug1}+{drug2}: {str(e)}", extra={'module_name': 'Severity'})
        return []

@app.route('/api/severity', methods=['POST'])
def assess_severity():
    """Assess severity of interactions and suggest alternatives."""
    try:
        data = request.get_json()
        if not data or 'interactions' not in data or 'patient' not in data:
            logging.error("Invalid request: Missing 'interactions' or 'patient'", extra={'module_name': 'Severity'})
            return jsonify({"error": "Missing 'interactions' or 'patient' in request body"}), 400

        interactions = data['interactions']
        patient = data['patient']
        required_interaction_fields = ['drug1', 'drug2', 'interaction']
        if not all(all(field in i for field in required_interaction_fields) for i in interactions):
            logging.error("Invalid request: Missing required fields in interactions", extra={'module_name': 'Severity'})
            return jsonify({"error": "Each interaction must have drug1, drug2, and interaction"}), 400
        required_patient_fields = ['age', 'weight', 'conditions']
        if not all(k in patient for k in required_patient_fields):
            logging.error("Invalid request: Missing patient details", extra={'module_name': 'Severity'})
            return jsonify({"error": "Patient must have age, weight, and conditions"}), 400

        assessed_interactions = []
        for interaction in interactions:
            drug1 = interaction.get("drug1")
            drug2 = interaction.get("drug2")
            interaction_text = interaction.get("interaction")
            if not all([drug1, drug2, interaction_text]):
                logging.warning(f"Skipping invalid interaction: {interaction}", extra={'module_name': 'Severity'})
                continue

            cached = get_cached_severity(drug1, drug2, interaction_text)
            if cached:
                logging.info(f"Cache hit for {drug1}+{drug2}", extra={'module_name': 'Severity'})
                assessed_interactions.append({
                    "drug1": drug1,
                    "drug2": drug2,
                    "interaction": interaction_text,
                    "severity": cached["severity"],
                    "patient_factors": cached["patient_factors"],
                    "suggestions": cached["suggestions"]
                })
                continue

            severity, patient_factors = get_severity(interaction, patient)
            suggestions = get_alternatives(drug1, drug2)

            if not suggestions or severity == "none":
                try:
                    gemini_result = generate_severity_and_suggestions(drug1, drug2, interaction_text, patient)
                    if gemini_result["severity"] != "none":
                        severity = gemini_result["severity"]
                        patient_factors = gemini_result["patient_factors"] or []
                        suggestions = gemini_result["suggestions"] or []
                except Exception as e:
                    logging.error(f"Gemini fallback failed for {drug1}+{drug2}: {str(e)}", extra={'module_name': 'Severity'})

            cache_severity(drug1, drug2, interaction_text, severity, patient_factors, suggestions)
            logging.info(f"Assessed {drug1}+{drug2}: severity={severity}", extra={'module_name': 'Severity'})

            assessed_interactions.append({
                "drug1": drug1,
                "drug2": drug2,
                "interaction": interaction_text,
                "severity": severity,
                "patient_factors": patient_factors,
                "suggestions": suggestions
            })

        return jsonify({
            "assessed_interactions": assessed_interactions,
            "timestamp": datetime.now().isoformat()
        }), 200

    except Exception as e:
        logging.error(f"Unexpected error in assess_severity: {str(e)}", extra={'module_name': 'Severity'})
        return jsonify({"error": "Internal server error"}), 500

if __name__ == '__main__':
    init_rxnorm_cache_db()
    clear_rxnorm_cache()
    init_interactions_cache_db()
    init_severity_cache_db()
    app.run(debug=True, host='0.0.0.0', port=5000)