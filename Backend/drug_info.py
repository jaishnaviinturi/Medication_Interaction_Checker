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
formatter = logging.Formatter('%(asctime)s - %(levelname)s - [DrugInfo] - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)

def get_drug_info(drug_name):
    """
    Fetch a patient-friendly description of the drug using Gemini API.
    Args:
        drug_name (str): Name of the drug.
    Returns:
        str: Simple description or error message.
    """
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        prompt = f"Provide a simple, patient-friendly description of the drug '{drug_name}' in 2-3 sentences. Explain what it is used for in easy-to-understand language. Avoid technical jargon."
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        logger.error(f"Gemini API error for drug info ({drug_name}): {str(e)}")
        return "Unable to fetch drug information at this time."