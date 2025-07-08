import sqlite3
import urllib.parse
import requests
import logging
from datetime import datetime, timedelta
from tenacity import retry, stop_after_attempt, wait_fixed
import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

RXNORM_DB_PATH = 'rxnorm_cache.db'

def init_rxnorm_cache_db():
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
    logging.info("RxNorm cache DB initialized", extra={'module_name': 'Standardization'})

def clear_rxnorm_cache():
    with sqlite3.connect(RXNORM_DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM rxnorm_cache")
        conn.commit()
    logging.info("RxNorm cache cleared", extra={'module_name': 'Standardization'})

def get_cached_drug(drug_name):
    with sqlite3.connect(RXNORM_DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT rxcui, generic_name, last_updated
            FROM rxnorm_cache WHERE drug_name = ?
        """, (drug_name.lower(),))
        result = cursor.fetchone()
        if result:
            rxcui, generic_name, last_updated = result
            if datetime.now() - datetime.fromisoformat(last_updated) < timedelta(days=30):
                return rxcui, generic_name
        return None, None

def cache_drug(drug_name, rxcui, generic_name):
    with sqlite3.connect(RXNORM_DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO rxnorm_cache
            (drug_name, rxcui, generic_name, last_updated)
            VALUES (?, ?, ?, ?)
        """, (drug_name.lower(), rxcui, generic_name, datetime.now().isoformat()))
        conn.commit()

@retry(stop=stop_after_attempt(3), wait=wait_fixed(2))
def query_rxnorm(drug_name):
    rxcui, generic_name = get_cached_drug(drug_name)
    if rxcui and generic_name:
        logging.info(f"Cache hit for {drug_name}: RxCUI={rxcui}", extra={'module_name': 'Standardization'})
        return rxcui, generic_name

    encoded_name = urllib.parse.quote(drug_name)
    url = f"https://rxnav.nlm.nih.gov/REST/rxcui.json?name={encoded_name}&search=1"
    response = requests.get(url, headers={"Accept": "application/json"}, timeout=5)
    if response.status_code != 200:
        logging.error(f"RxNorm API error for {drug_name}: Status {response.status_code}", extra={'module_name': 'Standardization'})
        return None, None

    data = response.json()
    rxcui = data['idGroup']['rxnormId'][0] if data.get('idGroup', {}).get('rxnormId') else None
    if not rxcui:
        approx_url = f"https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term={encoded_name}&maxEntries=1"
        approx_response = requests.get(approx_url, headers={"Accept": "application/json"}, timeout=5)
        if approx_response.status_code == 200 and approx_response.json().get('approximateGroup', {}).get('candidate'):
            rxcui = approx_response.json()['approximateGroup']['candidate'][0]['rxcui']
        else:
            logging.warning(f"No match for {drug_name}", extra={'module_name': 'Standardization'})
            return None, None

    prop_url = f"https://rxnav.nlm.nih.gov/REST/rxcui/{rxcui}/properties"
    prop_response = requests.get(prop_url, headers={"Accept": "application/json"}, timeout=5)
    if prop_response.status_code == 200:
        generic_name = prop_response.json()['properties']['name']
    else:
        logging.error(f"RxNorm properties error for RxCUI {rxcui}", extra={'module_name': 'Standardization'})
        return None, None

    cache_drug(drug_name, rxcui, generic_name)
    logging.info(f"RxNorm success for {drug_name}: RxCUI={rxcui}", extra={'module_name': 'Standardization'})
    return rxcui, generic_name

def standardize_drugs():
    from flask import request, jsonify
    import re
    try:
        data = request.get_json()
        if not data or 'medications' not in data:
            logging.error("Invalid request: Missing 'medications'", extra={'module_name': 'Standardization'})
            return jsonify({"error": "Missing 'medications'"}), 400

        medications = data['medications']
        if not all('name' in med and 'dosage' in med and 'frequency' in med for med in medications):
            logging.error("Invalid request: Missing required fields", extra={'module_name': 'Standardization'})
            return jsonify({"error": "Each medication must have name, dosage, and frequency"}), 400

        standardized = []
        for med in medications:
            drug_name = med['name'].strip()
            if not drug_name or not re.match(r'^[a-zA-Z0-9\s-]+$', drug_name):
                logging.warning("Invalid drug name", extra={'module_name': 'Standardization'})
                standardized.append({"error": "Invalid drug name", "original": med})
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
                standardized.append({"error": f"Unknown drug: {drug_name}", "original": med})

        return jsonify({
            "standardized": standardized,
            "timestamp": datetime.now().isoformat()
        }), 200
    except Exception as e:
        logging.error(f"Unexpected error: {str(e)}", extra={'module_name': 'Standardization'})
        return jsonify({"error": "Internal server error"}), 500