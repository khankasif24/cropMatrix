// src/services/api.js

// ======================================================
// CropMatrix API Service
// ======================================================

// Backend URL
// Supports BOTH:
// VITE_API_URL=http://localhost:8000
// VITE_API_URL=http://localhost:8000/api

const RAW_API_BASE =
  (import.meta.env.VITE_API_URL || 'http://localhost:8000').trim();

const API_BASE = (() => {
  const base = RAW_API_BASE.replace(/\/+$/, '');

  // If /api already exists, don't add it again
  return /\/api$/i.test(base) ? base : `${base}/api`;
})();


// ======================================================
// AUTH TOKEN
// ======================================================

function getAuthToken() {
  return localStorage.getItem('smartcrop_token');
}


// ======================================================
// MAIN API CALL FUNCTION
// ======================================================

async function apiCall(endpoint, options = {}) {

  const url = `${API_BASE}${endpoint}`;
  const token = getAuthToken();

  const headers = {};

  // Don't manually set Content-Type for FormData
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {

    const response = await fetch(url, {
      ...options,

      headers: {
        ...headers,
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {

      let errorData = {};

      try {
        errorData = await response.json();
      } catch {
        // Ignore JSON parsing error
      }

      throw new Error(
        errorData.detail ||
        errorData.message ||
        `API error: ${response.status}`
      );
    }

    // Some APIs may return no content
    if (response.status === 204) {
      return null;
    }

    return await response.json();

  } catch (error) {

    console.error('API request failed:', {
      url,
      error,
    });

    // Network error
    if (
      error instanceof TypeError ||
      error.message?.toLowerCase().includes('fetch')
    ) {

      throw new Error(
        'Cannot connect to backend. Make sure the server is running on port 8000.'
      );
    }

    throw error;
  }
}


// ======================================================
// AUTH
// ======================================================

export async function registerUser(data) {
  return apiCall('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}


export async function loginUser(data) {
  return apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}


export async function googleLogin(accessToken) {
  return apiCall('/auth/google', {
    method: 'POST',
    body: JSON.stringify({
      access_token: accessToken,
    }),
  });
}


// ======================================================
// PROFILE
// ======================================================

export async function getProfile() {
  return apiCall('/profile');
}


export async function saveProfile(data) {
  return apiCall('/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}


export async function deleteProfile() {
  return apiCall('/profile', {
    method: 'DELETE',
  });
}


// ======================================================
// FIELDS
// ======================================================

export async function getFields() {
  return apiCall('/fields');
}


export async function getFieldById(fieldId) {
  return apiCall(`/fields/${fieldId}`);
}


export async function createField(data) {
  return apiCall('/fields', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}


export async function updateField(fieldId, data) {
  return apiCall(`/fields/${fieldId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}


export async function deleteFieldById(fieldId) {
  return apiCall(`/fields/${fieldId}`, {
    method: 'DELETE',
  });
}


// ======================================================
// HEALTH CHECK
// ======================================================

export async function healthCheck() {
  return apiCall('/health');
}


// ======================================================
// CROP RECOMMENDATION
// ======================================================

export async function recommendCrop(data) {
  return apiCall('/recommend/crop', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}


// ======================================================
// YIELD PREDICTION
// ======================================================

export async function predictYield(data) {
  return apiCall('/predict/yield', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}


export async function getYieldDistricts(state) {
  return apiCall(
    `/yield/districts?state=${encodeURIComponent(state)}`
  );
}


// ======================================================
// PRICE PREDICTION
// ======================================================

export async function predictPrice(data) {
  return apiCall('/predict/price', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}


// ======================================================
// CROPS
// ======================================================

export async function getCrops() {
  return apiCall('/crops');
}


// ======================================================
// STATES
// ======================================================

export async function getStates() {
  return apiCall('/states');
}


export async function getCropsByState(state) {
  return apiCall(
    `/crops/by-state/${encodeURIComponent(state)}`
  );
}


export async function getSoilTypes() {
  return apiCall('/soil-types');
}


// ======================================================
// WEATHER
// ======================================================

export async function getWeather(lat, lon) {
  return apiCall(`/weather/${lat}/${lon}`);
}


export async function getWeatherAlerts(lat, lon, days = 2) {
  return apiCall(
    `/weather/alerts/${lat}/${lon}?days=${days}`
  );
}


export async function getMyAlerts(limit = 10) {
  return apiCall(
    `/alerts/my-alerts?limit=${limit}`
  );
}


// ======================================================
// LOCATION
// ======================================================

export async function detectLocation(ip = '') {

  const params = ip
    ? `?ip=${encodeURIComponent(ip)}`
    : '';

  return apiCall(`/location/detect${params}`);
}


// ======================================================
// MARKET PRICES
// ======================================================

export async function getMarketPrices(
  commodity = 'Wheat',
  state = '',
  district = '',
  market = '',
  days = 90
) {

  const params = new URLSearchParams({
    commodity,
    state,
    district,
    market,
    days: String(days),
  });

  return apiCall(
    `/market/prices?${params.toString()}`
  );
}


export async function getMarketMetadata() {
  return apiCall('/market/metadata');
}


export async function getMarketCommodities(
  state = '',
  district = ''
) {

  const params = new URLSearchParams({
    state,
    district,
  });

  return apiCall(
    `/market/commodities?${params.toString()}`
  );
}


// ======================================================
// DISEASE DETECTION
// ======================================================

export async function getDiseaseCrops() {
  return apiCall('/disease/crops');
}


export async function detectDisease(crop, imageFile) {

  const formData = new FormData();

  formData.append('crop', crop);
  formData.append('image', imageFile);

  return apiCall('/disease/detect', {
    method: 'POST',
    body: formData,
  });
}


// ======================================================
// RECOMMENDATION HISTORY
// ======================================================

export async function getRecommendationHistory(
  limit = 20
) {

  return apiCall(
    `/recommendations/history?limit=${limit}`
  );
}


export async function deleteRecommendationHistory(
  recordId
) {

  return apiCall(
    `/recommendations/history/${recordId}`,
    {
      method: 'DELETE',
    }
  );
}


// ======================================================
// DISEASE HISTORY
// ======================================================

export async function getDiseaseHistory(
  limit = 20
) {

  return apiCall(
    `/disease/history?limit=${limit}`
  );
}


export async function deleteDiseaseHistory(
  scanId
) {

  return apiCall(
    `/disease/history/${scanId}`,
    {
      method: 'DELETE',
    }
  );
}


// ======================================================
// CROP ROTATION PLANS
// ======================================================

export async function getCropPlans(
  year = null,
  grouped = true
) {

  let url = `/plans?grouped=${grouped}`;

  if (year) {
    url += `&year=${year}`;
  }

  return apiCall(url);
}


export async function createCropPlan(data) {
  return apiCall('/plans', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}


export async function updateCropPlan(
  planId,
  data
) {

  return apiCall(`/plans/${planId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}


export async function deleteCropPlan(planId) {

  return apiCall(`/plans/${planId}`, {
    method: 'DELETE',
  });
}


// ======================================================
// PEST ALERTS
// ======================================================

export async function getPestAlerts(
  state,
  season = ''
) {

  const params = new URLSearchParams({
    state,
    season,
  });

  return apiCall(
    `/pests/alerts?${params.toString()}`
  );
}


export async function getPestForCrop(cropKey) {

  return apiCall(
    `/pests/crop/${encodeURIComponent(cropKey)}`
  );
}


export async function getSeasonInfo() {
  return apiCall('/pests/season');
}


export async function getPestStates() {
  return apiCall('/pests/states');
}


// ======================================================
// FERTILIZER
// ======================================================

export async function recommendFertilizer(data) {

  return apiCall('/fertilizer/recommend', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}


export async function getOrganicRemedies(data) {

  return apiCall('/fertilizer/organic', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}


export async function getFertilizerMetadata() {
  return apiCall('/fertilizer/metadata');
}


// ======================================================
// COMMUNITY CHAT
// ======================================================

export async function getCommunityMessages(
  limit = 50,
  before = null
) {

  let url = `/community/messages?limit=${limit}`;

  if (before) {
    url += `&before=${encodeURIComponent(before)}`;
  }

  return apiCall(url);
}


export async function sendCommunityMessage(
  message
) {

  return apiCall('/community/messages', {
    method: 'POST',
    body: JSON.stringify({
      message,
    }),
  });
}


export async function getOnlineCount() {
  return apiCall('/community/online');
}


// ======================================================
// FEEDBACK
// ======================================================

export async function submitFeedback(data) {

  return apiCall('/feedback', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}


export async function getFeedbackHistory(
  limit = 10
) {

  return apiCall(
    `/feedback?limit=${limit}`
  );
}


// ======================================================
// SPEECH TO TEXT
// ======================================================

export async function speechToText(
  audioBlob,
  language = 'en-IN'
) {

  const formData = new FormData();

  formData.append(
    'audio',
    audioBlob,
    'recording.wav'
  );

  formData.append(
    'language',
    language
  );

  return apiCall('/speech-to-text', {
    method: 'POST',
    body: formData,
  });
}


// ======================================================
// TRANSLATION
// ======================================================

export async function translateDynamicText(
  texts,
  targetLanguage
) {

  return apiCall('/translate', {

    method: 'POST',

    body: JSON.stringify({

      texts,

      target_language:
        targetLanguage,

      source_language:
        'en',
    }),
  });
}


// ======================================================
// DEFAULT EXPORT
// ======================================================

const api = {

  // Auth
  registerUser,
  loginUser,
  googleLogin,

  // Profile
  getProfile,
  saveProfile,
  deleteProfile,

  // Fields
  getFields,
  getFieldById,
  createField,
  updateField,
  deleteFieldById,

  // Health
  healthCheck,

  // ML
  recommendCrop,
  predictYield,
  predictPrice,
  getYieldDistricts,
  getCrops,

  // Location
  detectLocation,

  // Weather
  getWeather,
  getWeatherAlerts,
  getMyAlerts,

  // Market
  getMarketPrices,
  getMarketMetadata,
  getMarketCommodities,

  // State
  getStates,
  getCropsByState,
  getSoilTypes,

  // Disease
  getDiseaseCrops,
  detectDisease,

  // History
  getRecommendationHistory,
  deleteRecommendationHistory,
  getDiseaseHistory,
  deleteDiseaseHistory,

  // Plans
  getCropPlans,
  createCropPlan,
  updateCropPlan,
  deleteCropPlan,

  // Pest
  getPestAlerts,
  getPestForCrop,
  getSeasonInfo,
  getPestStates,

  // Fertilizer
  recommendFertilizer,
  getOrganicRemedies,
  getFertilizerMetadata,

  // Community
  getCommunityMessages,
  sendCommunityMessage,
  getOnlineCount,

  // Feedback
  submitFeedback,
  getFeedbackHistory,

  // Speech
  speechToText,

  // Translation
  translateDynamicText,
};


export default api;