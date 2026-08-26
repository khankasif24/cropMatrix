import os
import requests
import logging

logger = logging.getLogger(__name__)

# Constants
TRANSLATOR_ENDPOINT = os.getenv("AZURE_TRANSLATOR_ENDPOINT", "https://api.cognitive.microsofttranslator.com/")
TRANSLATOR_KEY = os.getenv("AZURE_TRANSLATOR_KEY")
TRANSLATOR_REGION = os.getenv("AZURE_TRANSLATOR_REGION")

def translate_texts(texts: list[str], target_language: str, source_language: str = "en") -> list[str]:
    """
    Translates a list of strings array from source_language to target_language
    using Azure Cognitive Services Translator API.
    """
    if target_language == source_language:
        return texts
    
    # If API keys are missing, gracefully return the original English texts
    if not TRANSLATOR_KEY or not TRANSLATOR_REGION:
        logger.warning("Azure Translator Keys missing. Using fallback English.")
        return texts

    path = '/translate'
    constructed_url = f"{TRANSLATOR_ENDPOINT.rstrip('/')}{path}"
    
    params = {
        'api-version': '3.0',
        'from': source_language,
        'to': [target_language]
    }
    
    headers = {
        'Ocp-Apim-Subscription-Key': TRANSLATOR_KEY,
        'Ocp-Apim-Subscription-Region': TRANSLATOR_REGION,
        'Content-type': 'application/json'
    }
    
    # Azure accepts lists of objects: [{"Text": "I would really like to drive..."}]
    body = [{'text': t} for t in texts]

    try:
        response = requests.post(constructed_url, params=params, headers=headers, json=body, timeout=10)
        response.raise_for_status()
        result = response.json()
        
        translated_texts = []
        for item in result:
            translated_texts.append(item['translations'][0]['text'])
            
        return translated_texts
        
    except Exception as e:
        logger.error(f"Azure Translation API Error: {e}")
        return texts  # Fail gracefully by falling back to original strings
