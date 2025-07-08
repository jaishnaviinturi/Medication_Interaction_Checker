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
formatter = logging.Formatter('%(asctime)s - %(levelname)s - [FoodInteractions] - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)

def get_food_interactions(drug_name):
    """
    Fetch food interactions for the drug using Gemini API.
    Args:
        drug_name (str): Name of the drug.
    Returns:
        str: Formatted food interactions or error message.
    """
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        prompt = f"For the drug '{drug_name}', list specific food items that are recommended to eat and foods to avoid, if any. Format the response as: Recommended Foods: [list or 'None'], Foods to Avoid: [list or 'None']. Keep it concise and clear for a patient."
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        logger.error(f"Gemini API error for food interactions ({drug_name}): {str(e)}")
        return "Unable to fetch food interaction information at this time."