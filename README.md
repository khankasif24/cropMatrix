🌾 CropMatrix — AI-Powered End-to-End Agricultural Intelligence & Decision Support Platform

CropMatrix is a unified AI-powered agriculture platform designed to support farmers across the complete farming lifecycle — from crop planning and disease detection to weather intelligence, yield prediction, market analysis, fertilizer guidance, pest alerts, crop rotation, and AI-based farming assistance.

Built for Smart India Hackathon 2026 under the Agriculture, FoodTech & Rural Development theme.

🚀 GitHub Repository: https://github.com/khankasif24/cropMatrix

🚀 Key Features

🧠 Core Intelligence

Feature

Model / Technology

Description

🌱 AI Crop Advisory

Random Forest / State-aware ML

Recommends suitable crops using soil nutrients, pH, weather and location

🔬 Disease Scanner

TensorFlow / TFLite + Gemini Vision

Detects crop diseases from uploaded leaf images and provides guidance

🌾 Yield Prediction

Gradient Boosting

Estimates crop yield using state, district, crop, season and farm area

💰 Market & Price Intelligence

ML + Agmarknet Data

Provides latest-available market insights, price trends and commodity analysis

🌿 Crop Rotation Planner

Rule-based Intelligence

Suggests season-aware crop rotation for sustainable farming

🤖 CropMatrix AI Assistant

Gemini API + Local AI Orchestrator

Conversational farming assistant with project-grounded responses

🎤 Voice Assistance

Speech Input + Text-to-Speech

Enables farmers to interact using voice for easier accessibility

🌐 Multilingual Support

Translation Layer

Helps make the platform usable for farmers from different language backgrounds

🎯 Decision Support Tools

Feature

Description

🌱 Crop Recommendation

Suggests suitable crops based on farm and environmental inputs

🔬 Disease Detection

Upload crop leaf images for disease-related analysis

☀️ Weather Intelligence

Current weather, forecasts and farming-relevant weather metrics

⚠️ Pest Alerts

State/crop-aware pest information and seasonal risk guidance

🧪 Fertilizer Advisor

Soil and nutrient-aware fertilizer guidance

📈 Yield Prediction

Estimates expected production for planning decisions

💰 Market Intelligence

Helps farmers understand crop price trends and available mandi data

🔄 Rotation Planner

Assists farmers in planning the next crop cycle

📍 My Fields

Manage farm/field information in one place

💬 Community

Farmer-oriented discussion and information-sharing space

🏛️ Government Schemes

Agricultural scheme information and support resources

🏗️ System Architecture

Farmer
   │
   ▼
React + Vite Frontend
   │
   ▼
FastAPI Backend
   │
   ├── AI Orchestrator
   │      ├── Crop Recommendation
   │      ├── Weather Intelligence
   │      ├── Market Intelligence
   │      ├── Pest Knowledge
   │      ├── Fertilizer Guidance
   │      ├── Yield Prediction
   │      └── Disease Assistance
   │
   ├── Machine Learning Models
   ├── Gemini AI
   ├── OpenWeatherMap
   ├── Agmarknet / Agriculture Datasets
   └── Supabase
          ├── Authentication
          └── Database

📂 Project Structure

CROP-ADVISORY-SIH25010/
├── api/                         # FastAPI backend
│   ├── main.py                  # Main application + AI assistant
│   ├── ai_orchestrator.py       # Intent detection and AI routing
│   ├── ml_service.py            # ML model loading & inference
│   ├── disease_service.py       # Disease detection
│   ├── weather_service.py       # Weather integration
│   ├── pest_service.py          # Pest knowledge base
│   ├── market_service.py        # Market data processing
│   ├── fertilizer_service.py    # Fertilizer intelligence
│   ├── auth_service.py          # Authentication
│   ├── profile_service.py       # User profile management
│   ├── db.py                    # Supabase database connection
│   └── routes.py                # API endpoints
│
├── apps/
│   └── web/                     # React + Vite frontend
│       ├── src/
│       │   ├── App.jsx
│       │   ├── components/
│       │   │   └── Chatbot.jsx
│       │   ├── pages/
│       │   │   ├── Dashboard.jsx
│       │   │   ├── Landing.jsx
│       │   │   ├── Login.jsx
│       │   │   └── ...
│       │   └── services/
│       │       ├── api.js
│       │       └── supabaseClient.js
│       └── package.json
│
├── datasets/                    # Agriculture and training datasets
├── latest_model/                # Trained ML/TFLite models
├── model_scripts/               # Training and preprocessing scripts
├── requirements.txt             # Python dependencies
├── render.yaml                  # Backend deployment config
└── vercel.json                  # Frontend deployment config

⚡ Quick Start

Prerequisites

Python 3.10+

Node.js 18+

npm

Git

1. Clone the Repository

git clone https://github.com/khankasif24/cropMatrix.git
cd cropMatrix

2. Create Python Virtual Environment

python -m venv venv
.\venv\Scripts\Activate.ps1

3. Install Backend Dependencies

pip install -r requirements.txt

4. Start Backend

cd api
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000

Backend: http://localhost:8000

API Docs: http://localhost:8000/docs

5. Start Frontend

Open another terminal:

cd apps\web
npm install
npm run dev

Frontend: http://localhost:5173

🔐 Environment Variables

Create a project-root .env file and configure your own credentials.

SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_key
GEMINI_API_KEY=your_gemini_api_key

Frontend environment variables can be configured in apps/web/.env.

VITE_API_URL=http://localhost:8000/api
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_publishable_key

⚠️ Never commit .env files, API keys, passwords or secret credentials to GitHub.

🤖 AI Assistant Architecture

CropMatrix uses a local-first AI routing approach.

Farmer Question
      │
      ▼
Intent Detection
      │
      ├── Crop ───────► CropMatrix Crop Data / Model
      ├── Weather ────► Weather Service
      ├── Market ─────► Market Service
      ├── Pest ───────► Pest Knowledge Base
      ├── Fertilizer ─► Fertilizer Service
      ├── Yield ──────► Yield Model
      ├── Disease ────► Disease Scanner
      │
      └── General ────► Gemini AI

This keeps dedicated farming services usable even when the general AI service is unavailable or rate-limited.

🧠 Machine Learning Components

Module

Technique

Main Inputs

Output

Crop Recommendation

Random Forest

N, P, K, temperature, humidity, pH, rainfall, state

Suitable crops

Disease Detection

CNN / TFLite + Vision AI

Crop leaf image

Disease-related result

Yield Prediction

Gradient Boosting

State, district, crop, season, area

Estimated yield

Market / Price Prediction

Gradient Boosting / Market Data

Commodity, state, market data

Price intelligence

Fertilizer Guidance

ML / Rule-based intelligence

Soil, crop and nutrient values

Fertilizer guidance

🛠️ Technology Stack

Layer

Technologies

Frontend

React, Vite, Tailwind CSS

Backend

Python, FastAPI

Database & Auth

Supabase / PostgreSQL

Machine Learning

scikit-learn, TensorFlow / TFLite

AI

Google Gemini API

Weather

OpenWeatherMap API

Market Data

Agmarknet / agriculture datasets

Version Control

Git, GitHub, Git LFS

Deployment Ready

Render + Vercel

💡 Why CropMatrix?

Farmers often need different platforms for crop selection, weather information, disease identification, fertilizer guidance, pest management, yield estimation, market information, crop rotation and agricultural assistance.

CropMatrix combines these capabilities into one unified farmer-centric platform.

One Farmer → One Platform → Complete Agricultural Intelligence

📈 Feasibility & Viability

Feasibility

Built using mature open-source technologies

Uses existing agriculture datasets and APIs

Modular architecture makes individual services easy to improve

Cloud-ready and scalable

Does not require expensive farmer-side hardware for core features

Viability

Solves multiple recurring farming problems

Can support farmers, FPOs, cooperatives and agricultural institutions

Voice and multilingual interaction can improve rural accessibility

Can scale to district, state and national-level deployments

Future integration possible with IoT, satellite imagery and government systems

🔮 Future Scope

Voice-to-voice farming assistant

More Indian regional languages

Offline / low-connectivity AI support

IoT soil sensor integration

Satellite and remote-sensing intelligence

District-level crop recommendation

Expanded crop disease models

Post-harvest storage and logistics intelligence

Government scheme recommendation engine

Supply-chain and demand forecasting

Farm digital twin and precision agriculture capabilities

👥 Team

Developed by Kasif Khan and Team for Smart India Hackathon.

📄 License

This project is intended for educational, research and hackathon use. Check repository licensing before commercial deployment
