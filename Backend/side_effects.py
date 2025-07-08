import google.generativeai as genai
import logging
import os
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini API
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    raise ValueError("GOOGLE_API_KEY not found in environment variables")
genai.configure(api_key=GEMINI_API_KEY)

# Configure logging
logger = logging.getLogger(__name__)
handler = logging.FileHandler('medication_checker.log')
handler.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - %(levelname)s - [SideEffects] - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)

def get_side_effects(drug_name):
    """
    Fetch patient-friendly side effect information for the drug using Gemini API.
    Args:
        drug_name (str): Name of the drug.
    Returns:
        str: Side effect summary or error message.
    """
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        prompt = f"Provide a concise, patient-friendly summary of common side effects for the drug '{drug_name}' in 2-3 sentences. Include one sentence advising when to seek medical help. Avoid technical jargon."
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        logger.error(f"Gemini API error for side effects ({drug_name}): {str(e)}")
        return "Unable to fetch side effect information at this time."