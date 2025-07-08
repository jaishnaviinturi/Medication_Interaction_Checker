import sqlite3
import logging
from datetime import datetime, timedelta
from itertools import combinations
import google.generativeai as genai
import os
from dotenv import load_dotenv
import json

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=api_key)

INTERACTIONS_DB_PATH = 'interactions_cache.db'

INTERACTION_RULES = {
    ("atorvastatin", "warfarin"): {"interaction": "Increased risk of bleeding", "details": "Enhances anticoagulant effect."},
    ("ibuprofen", "warfarin"): {"interaction": "Increased risk of bleeding", "details": "Increases anticoagulant effect."},
    ("fluoxetine", "warfarin"): {"interaction": "Increased risk of bleeding", "details": "Inhibits metabolism."}
}

def init_interactions_cache_db():
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
    logging.info("Interactions cache DB initialized", extra={'module_name': 'Interactions'})

def get_cached_interaction(drug1, drug2):
    pair_key = f"{min(drug1, drug2)}:{max(drug1, drug2)}"
    with sqlite3.connect(INTERACTIONS_DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT interaction, details, last_updated
            FROM interactions_cache WHERE drug_pair = ?
        """, (pair_key,))
        result = cursor.fetchone()
        if result:
            interaction, details, last_updated = result
            if datetime.now() - datetime.fromisoformat(last_updated) < timedelta(days=30):
                return {"interaction": interaction, "details": details}
        return None

def cache_interaction(drug1, drug2, interaction, details):
    pair_key = f"{min(drug1, drug2)}:{max(drug1, drug2)}"
    with sqlite3.connect(INTERACTIONS_DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO interactions_cache
            (drug_pair, interaction, details, last_updated)
            VALUES (?, ?, ?, ?)
        """, (pair_key, interaction, details, datetime.now().isoformat()))
        conn.commit()

def generate_interaction_rule(drug1, drug2):
    try:
        model = genai.GenerativeModel("gemini-pro-1.5")
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
        logging.info(f"Gemini generated rule for {drug1}+{drug2}: {result['interaction']}", extra={'module_name': 'Interactions'})
        return result
    except Exception as e:
        logging.error(f"Gemini API error for {drug1}+{drug2}: {str(e)}", extra={'module_name': 'Interactions'})
        return {"interaction": null, "details": null}

def query_interaction(drug1, drug2):
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

def find_interactions():
    from flask import request, jsonify
    try:
        data = request.get_json()
        if not data or 'standardized' not in data:
            logging.error("Invalid request: Missing 'standardized'", extra={'module_name': 'Interactions'})
            return jsonify({"error": "Missing 'standardized'"}), 400

        drugs = data['standardized']
        if not all('generic_name' in drug and 'rxnorm_id' in drug for drug in drugs):
            logging.error("Invalid request: Missing required fields", extra={'module_name': 'Interactions'})
            return jsonify({"error": "Each drug must have generic_name and rxnorm_id"}), 400

        interactions = []
        for drug1, drug2 in combinations(drugs, 2):
            result = query_interaction(drug1["generic_name"].lower(), drug2["generic_name"].lower())
            if result and result["interaction"]:
                interactions.append({
                    "drug1": drug1["generic_name"],
                    "drug2": drug2["generic_name"],
                    "interaction": result["interaction"],
                    "details": result["details"]
                })

        logging.info(f"Found {len(interactions)} interactions", extra={'module_name': 'Interactions'})
        return jsonify({
            "data": interactions,
            "timestamp": datetime.now().isoformat()
        }), 200
    except Exception as e:
        logging.error(f"Unexpected error: {str(e)}", extra={'module_name': 'Interactions'})
        return jsonify({"error": "Internal server error"}), 500