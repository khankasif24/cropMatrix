import requests
import json

url = "http://localhost:8000/api/recommend/crop"
payload = {
    "nitrogen": 90,
    "phosphorus": 42,
    "potassium": 43,
    "temperature": 20,
    "humidity": 65,
    "ph": 7.0,
    "rainfall": 50,
    "season": "rabi",
    "state": "Uttar Pradesh",
    "soil_type": "Alluvial soil"
}

try:
    print(f"Testing API endpoint: {url}...")
    response = requests.post(url, json=payload, timeout=10)
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(json.dumps(data, indent=2))
    else:
        print(f"FAILED: {response.text}")
except Exception as e:
    print(f"Error testing API: {e}")
