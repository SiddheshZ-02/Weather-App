// Local storage utility functions
const STORAGE_KEYS = {
  SEARCH_HISTORY: 'weather_app_search_history',
  DARK_MODE: 'weather_app_dark_mode',
  TEMPERATURE_UNIT: 'weather_app_temperature_unit',
  LAST_SEARCH: 'weather_app_last_search'
};

export const saveToLocalStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
  }
};

export const getFromLocalStorage = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn('Failed to get from localStorage:', error);
    return defaultValue;
  }
};

export const removeFromLocalStorage = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('Failed to remove from localStorage:', error);
  }
};

// Specific functions for weather app data
export const saveSearchHistory = (history) => {
  saveToLocalStorage(STORAGE_KEYS.SEARCH_HISTORY, history);
};

export const getSearchHistory = () => {
  return getFromLocalStorage(STORAGE_KEYS.SEARCH_HISTORY, []);
};

export const saveDarkMode = (isDarkMode) => {
  saveToLocalStorage(STORAGE_KEYS.DARK_MODE, isDarkMode);
};

export const getDarkMode = () => {
  return getFromLocalStorage(STORAGE_KEYS.DARK_MODE, false);
};

export const saveTemperatureUnit = (unit) => {
  saveToLocalStorage(STORAGE_KEYS.TEMPERATURE_UNIT, unit);
};

export const getTemperatureUnit = () => {
  return getFromLocalStorage(STORAGE_KEYS.TEMPERATURE_UNIT, 'metric');
};

export const saveLastSearch = (city, country) => {
  saveToLocalStorage(STORAGE_KEYS.LAST_SEARCH, { city, country });
};

export const getLastSearch = () => {
  return getFromLocalStorage(STORAGE_KEYS.LAST_SEARCH, { city: 'Mumbai', country: 'IN' });
};