import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

const LocationContext = createContext(null);

const STORAGE_KEY = 'smartcrop_location';

export function LocationProvider({ children }) {
  const { user } = useAuth();
  const [location, setLocation] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Detect location from IP on mount (after auth)
  useEffect(() => {
    if (user && !location) {
      detectLocation();
    }
  }, [user]);

  const detectLocation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.detectLocation();
      if (data && data.state && !data.error) {
        const loc = {
          state: data.state || '',
          city: data.city || '',
          latitude: data.latitude || 0,
          longitude: data.longitude || 0,
          country: data.country || 'India',
          source: data.source || 'ipstack',
          detectedAt: new Date().toISOString(),
        };
        setLocation(loc);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
      } else {
        setError(data?.error || 'Could not detect location');
      }
    } catch (err) {
      setError(err.message || 'Location detection failed');
    } finally {
      setLoading(false);
    }
  }, []);

  // Manual override — user selects a different state
  const setManualLocation = useCallback((newLoc) => {
    const merged = { ...location, ...newLoc, source: 'manual' };
    setLocation(merged);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  }, [location]);

  // Clear location data
  const clearLocation = useCallback(() => {
    setLocation(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = {
    location,
    loading,
    error,
    detectLocation,
    setManualLocation,
    clearLocation,
    // Convenience getters
    state: location?.state || '',
    city: location?.city || '',
    latitude: location?.latitude || 0,
    longitude: location?.longitude || 0,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return ctx;
}

export default LocationContext;
