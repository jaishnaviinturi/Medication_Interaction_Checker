import sqlite3
import logging
from datetime import datetime, timedelta
import google.generativeai as genai
import os
from dotenv import load_dotenv
import json

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=api_key)

SEVERITY_DB_PATH = 'severity_cache.db'

SEVERITY_RULES = {
    "increased risk of bleeding": [
        {"severity": "critical", "patient_factors": ["age > 65", "renal impairment"], "conditions": ["hypertension"]}
    ],
    "increased anticoagulant effect": [
        {"severity": "major", "patient_factors": ["age > 65"], "conditions": ["liver disease"]}
    ]
}

ALTERNATIVE_RULES = {
    ("atorvastatin", "warfarin"): ["rosuvastatin", "monitor INR"]
}

def init_severity_cache_db():
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
    logging.info("Severity cache DB initialized", extra={'module_name': 'Severity'})

def get_cached_severity(drug1, drug2, interaction):
    interaction_key = f"{min(drug1.lower(), drug2.lower())}:{max(drug1.lower(), drug2.lower())}:{interaction.lower()}"
    with sqlite3.connect(SEVERITY_DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT severity, patient_factors, suggestions, last_updated
            FROM severity_cache WHERE interaction_key = ?
        """, (interaction_key,))
        result = cursor.fetchone()
        if result:
            severity, patient_factors, suggestions, last_updated = result
            if datetime.now() - datetime.fromisoformat(last_updated) < timedelta(days=30):
                return {
                    "severity": severity,
                    "patient_factors": patient_factors.split(",") if patient_factors else [],
                    "suggestions": suggestions.split(",") if suggestions else []
                }
        return None

def cache_severity(drug1, drug2, interaction, severity, patient_factors, suggestions):
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

def generate_severity_and_suggestions(drug1, drug2, interaction, patient):
    try:
        model = genai.GenerativeModel("gemini-pro-1.5")
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
        logging.info(f"Gemini generated severity for {drug1}+{drug2}: {result['severity']}", extra={'module_name': 'Severity'})
        return result
    except Exception as e:
        logging.error(f"Gemini API error for severity {drug1}+{drug2}: {str(e)}", extra={'module_name': 'Severity'})
        return {"severity": "none", "patient_factors": [], "suggestions": []}

def get_severity(interaction, patient):
    interaction_text = interaction["interaction"].lower()
    if not patient.get("age") or not patient.get("conditions"):
        logging.warning("Incomplete patient data", extra={'module_name': 'Severity'})
        return "moderate", []

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
                return rule["severity"], rule["patient_factors"]
    return "moderate", []

def get_alternatives(drug1, drug2):
    pair = (min(drug1.lower(), drug2.lower()), max(drug1.lower(), drug2.lower()))
    return ALTERNATIVE_RULES.get(pair, [])

def assess_severity():
    from flask import request, jsonify
    try:
        data = request.get_json()
        if not data or 'interactions' not in data or 'patient' not in data:
            logging.error("Invalid request: Missing 'interactions' or 'patient'", extra={'module_name': 'Severity'})
            return jsonify({"error": "Missing 'interactions' or 'patient'"}), 400

        interactions = data['interactions']
        patient = data['patient']
        if not all('drug1' in i and 'drug2' in i and 'interaction' in i for i in interactions):
            logging.error("Invalid request: Missing required fields in interactions", extra={'module_name': 'Severity'})
            return jsonify({"error": "Each interaction must have drug1, drug2, and interaction"}), 400
        if not all(k in patient for k in ['age', 'weight', 'conditions']):
            logging.error("Invalid request: Missing patient details", extra={'module_name': 'Severity'})
            return jsonify({"error": "Patient must have age, weight, and conditions"}), 400

        assessed_interactions = []
        for interaction in interactions:
            drug1, drug2, interaction_text = interaction['drug1'], interaction['drug2'], interaction['interaction']
            if not all([drug1, drug2, interaction_text]):
                logging.warning(f"Skipping invalid interaction: {interaction}", extra={'module_name': 'Severity'})
                continue

            cached = get_cached_severity(drug1, drug2, interaction_text)
            if cached:
                logging.info(f"Cache hit for {drug1}+{drug2}", extra={'module_name': 'Severity'})
                assessed_interactions.append({
                    "drug1": drug1, "drug2": drug2, "interaction": interaction_text,
                    "severity": cached["severity"], "patient_factors": cached["patient_factors"],
                    "suggestions": cached["suggestions"]
                })
                continue

            severity, patient_factors = get_severity(interaction, patient)
            suggestions = get_alternatives(drug1, drug2)

            if not suggestions or severity == "none":
                gemini_result = generate_severity_and_suggestions(drug1, drug2, interaction_text, patient)
                if gemini_result["severity"] != "none":
                    severity = gemini_result["severity"]
                    patient_factors = gemini_result["patient_factors"] or []
                    suggestions = gemini_result["suggestions"] or []

            cache_severity(drug1, drug2, interaction_text, severity, patient_factors, suggestions)
            logging.info(f"Assessed {drug1}+{drug2}: severity={severity}", extra={'module_name': 'Severity'})

            assessed_interactions.append({
                "drug1": drug1, "drug2": drug2, "interaction": interaction_text,
                "severity": severity, "patient_factors": patient_factors, "suggestions": suggestions
            })

        return jsonify({
            "assessed_interactions": assessed_interactions,
            "timestamp": datetime.now().isoformat()
        }), 200
    except Exception as e:
        logging.error(f"Unexpected error: {str(e)}", extra={'module_name': 'Severity'})
        return jsonify({"error": "Internal server error"}), 500