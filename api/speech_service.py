"""
Azure Speech-to-Text Service
=============================
Forwards audio to Azure Cognitive Services Speech REST API.
No SDK needed - uses the simple REST endpoint.
Expects WAV audio (16-bit PCM, mono, 16kHz) from the frontend.
"""

import os
import httpx
from fastapi import UploadFile

AZURE_SPEECH_KEY = os.getenv("AZURE_SPEECH_KEY", "")
AZURE_SPEECH_REGION = os.getenv("AZURE_SPEECH_REGION", "southeastasia")

# Azure Speech REST endpoint
AZURE_STT_URL = (
    f"https://{AZURE_SPEECH_REGION}.stt.speech.microsoft.com"
    f"/speech/recognition/conversation/cognitiveservices/v1"
)

# Supported languages (BCP-47 codes matching LanguageContext)
SUPPORTED_LANGUAGES = {
    "en-IN", "hi-IN", "ta-IN", "te-IN", "kn-IN",
    "ml-IN", "bn-IN", "or-IN", "mr-IN", "gu-IN", "pa-IN",
}


async def transcribe_audio(audio_file: UploadFile, language: str = "en-IN") -> dict:
    """
    Send audio to Azure Speech-to-Text REST API and return the transcribed text.

    Args:
        audio_file: The uploaded audio file (WAV format, 16-bit PCM, mono, 16kHz).
        language: BCP-47 language code (e.g. 'hi-IN' for Hindi).

    Returns:
        dict with 'text' (transcribed string), 'status', and 'language'.
    """
    if not AZURE_SPEECH_KEY:
        return {
            "text": "",
            "status": "error",
            "error": "Azure Speech API key not configured. Add AZURE_SPEECH_KEY to .env",
        }

    # Validate language
    if language not in SUPPORTED_LANGUAGES:
        language = "en-IN"

    # Read the uploaded audio bytes
    audio_bytes = await audio_file.read()

    if len(audio_bytes) == 0:
        return {"text": "", "status": "error", "error": "Empty audio file"}

    print(f"[AZURE STT] Received audio: {len(audio_bytes)} bytes, language={language}")

    # Always send as WAV — the frontend encodes it as proper WAV
    headers = {
        "Ocp-Apim-Subscription-Key": AZURE_SPEECH_KEY,
        "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
        "Accept": "application/json",
    }

    params = {
        "language": language,
        "format": "detailed",
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                AZURE_STT_URL,
                headers=headers,
                params=params,
                content=audio_bytes,
            )

        print(f"[AZURE STT] Response status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            recognition_status = data.get("RecognitionStatus", "")
            print(f"[AZURE STT] Recognition status: {recognition_status}")

            if recognition_status == "Success":
                # Use the best result from NBest
                nbest = data.get("NBest", [])
                if nbest:
                    text = nbest[0].get("Display", "") or nbest[0].get("Lexical", "")
                else:
                    text = data.get("DisplayText", "")

                print(f"[AZURE STT] Recognized: '{text}'")
                return {
                    "text": text,
                    "status": "success",
                    "language": language,
                    "confidence": nbest[0].get("Confidence", 0) if nbest else 0,
                }
            elif recognition_status == "NoMatch":
                return {
                    "text": "",
                    "status": "no_match",
                    "error": "Could not recognize speech. Please speak clearly and try again.",
                    "language": language,
                }
            elif recognition_status == "InitialSilenceTimeout":
                return {
                    "text": "",
                    "status": "silence",
                    "error": "No speech detected. Please speak and try again.",
                    "language": language,
                }
            else:
                return {
                    "text": "",
                    "status": "error",
                    "error": f"Recognition status: {recognition_status}",
                    "language": language,
                }
        else:
            error_text = response.text[:300]
            print(f"[AZURE STT] Error {response.status_code}: {error_text}")
            return {
                "text": "",
                "status": "error",
                "error": f"Azure API error ({response.status_code})",
            }

    except httpx.TimeoutException:
        return {
            "text": "",
            "status": "error",
            "error": "Azure API request timed out. Please try again.",
        }
    except Exception as e:
        print(f"[AZURE STT] Exception: {e}")
        return {
            "text": "",
            "status": "error",
            "error": f"Speech recognition failed: {str(e)}",
        }
