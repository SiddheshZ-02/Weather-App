import React, { useEffect, useState, useCallback, useMemo } from 'react'
import './App.css';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { getCurrentPosition, getCityFromCoordinates } from './utils/geolocation';
import { 
  saveSearchHistory, 
  getSearchHistory, 
  saveDarkMode, 
  getDarkMode, 
  saveTemperatureUnit, 
  getTemperatureUnit as getStoredTemperatureUnit,
  saveLastSearch,
  getLastSearch
} from './utils/localStorage';
import { 
  WiDaySunny, 
  WiCloudy, 
  WiThunderstorm,
  WiNightClear,
  WiDayRain,
  WiNightRain,
  WiDaySnow,
  WiNightSnow,
  WiDayCloudy,
  WiNightCloudy,

} from 'react-icons/wi';
import { 
  FiSearch, 
  FiMapPin, 
  FiRefreshCw,
  FiSun,
  FiMoon,
  FiNavigation
} from 'react-icons/fi';

const App = () => {
  // Initialize state with localStorage values
  const [city, setCity] = useState(() => getLastSearch().city)
  const [country, setCountry] = useState(() => getLastSearch().country)
  const [weatherData, setWeatherData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(() => getDarkMode())
  const [unit, setUnit] = useState(() => getStoredTemperatureUnit())
  const [searchHistory, setSearchHistory] = useState(() => getSearchHistory())
  const [showHistory, setShowHistory] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [gettingLocation, setGettingLocation] = useState(false)
  const MAX_RETRIES = 3
  const RETRY_DELAY = 2000

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Persist dark mode preference
  useEffect(() => {
    saveDarkMode(isDarkMode);
    document.documentElement.classList.toggle('dark-mode', isDarkMode);
  }, [isDarkMode]);

  // Persist temperature unit preference
  useEffect(() => {
    saveTemperatureUnit(unit);
  }, [unit]);

  // Persist search history
  useEffect(() => {
    saveSearchHistory(searchHistory);
  }, [searchHistory]);

  // Persist last search
  useEffect(() => {
    saveLastSearch(city, country);
  }, [city, country]);

  const formatDateTime = useMemo(() => {
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    
    const month = months[currentTime.getMonth()];
    const day = currentTime.getDate();
    const year = currentTime.getFullYear();
    const dayName = days[currentTime.getDay()];
    const time = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    return {
      date: `${month} ${day}, ${year}`,
      day: dayName,
      time: time
    };
  }, [currentTime]);

  const API_KEY = "828e8c0531f88bfebd093d69a4f0396b";

  const countries = useMemo(() => [
    { code: "IN", name: "India" },
    { code: "US", name: "United States" },
    { code: "GB", name: "United Kingdom" },
    { code: "CA", name: "Canada" },
    { code: "AU", name: "Australia" },
    { code: "DE", name: "Germany" },
    { code: "FR", name: "France" },
    { code: "IT", name: "Italy" },
    { code: "JP", name: "Japan" },
    { code: "CN", name: "China" },
    { code: "RU", name: "Russia" },
    { code: "BR", name: "Brazil" },
    { code: "ZA", name: "South Africa" },
    { code: "MX", name: "Mexico" },
    { code: "ES", name: "Spain" },
    { code: "KR", name: "South Korea" },
    { code: "SG", name: "Singapore" },
    { code: "AE", name: "United Arab Emirates" },
    { code: "SA", name: "Saudi Arabia" },
    { code: "NZ", name: "New Zealand" }
  ], []);

  const getWeatherIcon = useCallback((weatherMain, isNight = false, size = 100) => {
    if (!weatherMain) return isNight ? <WiNightClear size={size} /> : <WiDaySunny size={size} />;

    const weather = weatherMain.toLowerCase();
    
    switch (weather) {
      case 'clear':
        return isNight ? <WiNightClear size={size} /> : <WiDaySunny size={size} />;
      case 'rain':
      case 'drizzle':
        return isNight ? <WiNightRain size={size} /> : <WiDayRain size={size} />;
      case 'snow':
        return isNight ? <WiNightSnow size={size} /> : <WiDaySnow size={size} />;
      case 'clouds':
        return isNight ? <WiNightCloudy size={size} /> : <WiDayCloudy size={size} />;
      case 'thunderstorm':
        return <WiThunderstorm size={size} />;
      case 'mist':
      case 'fog':
      case 'haze':
        return <WiCloudy size={size} />;
      default:
        return isNight ? <WiNightClear size={size} /> : <WiDaySunny size={size} />;
    }
  }, []);

  const isNightTime = useCallback((sunrise, sunset, timezone) => {
    const now = Math.floor(Date.now() / 1000);
    const localTime = now + timezone;
    return localTime < sunrise || localTime > sunset;
  }, []);

  const validateWeatherData = (data) => {
    if (!data || !data.main || !data.weather || !data.weather[0]) {
      throw new Error('Invalid weather data received');
    }
    return true;
  };

  const fetchWeatherData = useCallback(async (isRetry = false) => {
    if (!city.trim()) {
      setError('Please enter a city name');
      return;
    }

    if (isRetry) {
      setIsRetrying(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      // Fetch current weather and 5-day forecast in parallel
      const [weatherResponse, forecastResponse] = await Promise.all([
        axios.get(`https://api.openweathermap.org/data/2.5/weather`, {
          params: {
            q: `${city},${country}`,
            appid: API_KEY,
            units: unit
          },
          timeout: 10000
        }),
        axios.get(`https://api.openweathermap.org/data/2.5/forecast`, {
          params: {
            q: `${city},${country}`,
            appid: API_KEY,
            units: unit
          },
          timeout: 10000
        })
      ]);

      const weatherData = weatherResponse.data;
      const forecastData = forecastResponse.data;

      validateWeatherData(weatherData);
      
      setWeatherData(weatherData);
      setForecastData(forecastData);
      setRetryCount(0);
      setError(null);

      // Add to search history
      const searchItem = {
        city: weatherData.name,
        country: weatherData.sys.country,
        timestamp: Date.now()
      };
      
      setSearchHistory(prev => {
        const filtered = prev.filter(item => 
          !(item.city === searchItem.city && item.country === searchItem.country)
        );
        return [searchItem, ...filtered].slice(0, 5); // Keep only last 5 searches
      });

    } catch (error) {
      console.error('Weather fetch error:', error);
      
      let errorMessage = 'Failed to fetch weather data. Please try again.';
      
      if (error.response) {
        switch (error.response.status) {
          case 404:
            errorMessage = `City "${city}" not found in ${countries.find(c => c.code === country)?.name}. Please check the city name and try again.`;
            break;
          case 401:
            errorMessage = 'API key is invalid or expired. Please contact support.';
            break;
          case 429:
            errorMessage = 'Too many requests. Please try again later.';
            break;
          default:
            errorMessage = `Error: ${error.response.statusText}`;
        }
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Please check your internet connection.';
      }

      if (retryCount < MAX_RETRIES && !error.response?.status === 404) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          fetchWeatherData(true);
        }, RETRY_DELAY);
      } else {
        setError({
          message: errorMessage,
          canRetry: true
        });
        setWeatherData(null);
        setForecastData(null);
      }
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  }, [city, country, unit, retryCount, API_KEY, countries]);

  // Auto-fetch on input change removed to avoid fetching while typing

  // Utility functions
  const getTemperatureUnit = useCallback(() => {
    return unit === 'metric' ? '°C' : '°F';
  }, [unit]);

  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    if (value.length <= 50) {
      setCity(value);
    }
  }, []);

  const handleCountryChange = useCallback((e) => {
    setCountry(e.target.value);
    setWeatherData(null);
    setForecastData(null);
    setError(null);
  }, []);

  const handleUnitChange = useCallback(() => {
    setUnit(prev => prev === 'metric' ? 'imperial' : 'metric');
    if (weatherData) {
      fetchWeatherData();
    }
  }, [weatherData, fetchWeatherData]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    setRetryCount(0);
    setShowHistory(false);
    fetchWeatherData();
  }, [fetchWeatherData]);

  const handleRetry = useCallback(() => {
    setRetryCount(0);
    setError(null);
    fetchWeatherData(true);
  }, [fetchWeatherData]);

  const handleHistorySelect = useCallback((historyItem) => {
    setCity(historyItem.city);
    setCountry(historyItem.country);
    setShowHistory(false);
    setTimeout(() => fetchWeatherData(), 100);
  }, [fetchWeatherData]);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => !prev);
  }, []);

  const handleGetCurrentLocation = useCallback(async () => {
    setGettingLocation(true);
    setError(null);
    
    try {
      const position = await getCurrentPosition();
      const locationData = await getCityFromCoordinates(
        position.latitude, 
        position.longitude, 
        API_KEY
      );
      
      setCity(locationData.city);
      setCountry(locationData.country);
      
      // Fetch weather for current location
      setTimeout(() => {
        fetchWeatherData();
      }, 100);
      
    } catch (error) {
      console.error('Geolocation error:', error);
      setError({
        message: error.message || 'Failed to get your current location.',
        canRetry: false
      });
    } finally {
      setGettingLocation(false);
    }
  }, [API_KEY, fetchWeatherData]);

  return (
    <div className={`app ${isDarkMode ? 'dark-mode' : ''}`}>
      <div className="app-background"></div>
      
      <motion.div 
        className="container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <div className="header">
          <motion.div 
            className="header-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="app-title">
              <WiDaySunny className="title-icon" />
              Weather Pro
            </h1>
            <div className="header-controls">
              <button 
                className="control-btn"
                onClick={toggleDarkMode}
                aria-label="Toggle dark mode"
              >
                {isDarkMode ? <FiSun /> : <FiMoon />}
              </button>
              <button 
                className="control-btn"
                onClick={handleUnitChange}
                aria-label="Toggle temperature unit"
              >
                {unit === 'metric' ? '°F' : '°C'}
              </button>
            </div>
          </motion.div>
          
          <div className="date-time">
            <div className="current-time">{formatDateTime.time}</div>
            <div className="current-date">{formatDateTime.day}, {formatDateTime.date}</div>
          </div>
        </div>

        {/* Search Form */}
        <motion.form 
          className="search-form" 
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="search-container">
            <div className="input-group">
              <FiMapPin className="input-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Enter city name..."
                value={city}
                onChange={handleInputChange}
                disabled={loading}
                onFocus={() => setShowHistory(searchHistory.length > 0)}
              />
              {showHistory && searchHistory.length > 0 && (
                <motion.div 
                  className="search-history"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {searchHistory.map((item, index) => (
                    <div
                      key={`${item.city}-${item.country}-${index}`}
                      className="history-item"
                      onClick={() => handleHistorySelect(item)}
                    >
                      <FiMapPin size={14} />
                      <span>{item.city}, {countries.find(c => c.code === item.country)?.name}</span>
                    </div>
                  ))}
                </motion.div>
              )}
            </div>
            
            <select
              className="country-select"
              value={country}
              onChange={handleCountryChange}
              disabled={loading}
            >
              {countries.map(country => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
            
            <motion.button
              type="button"
              className="location-btn"
              onClick={handleGetCurrentLocation}
              disabled={gettingLocation || loading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Get current location"
            >
              {gettingLocation ? <FiRefreshCw className="spinning" /> : <FiNavigation />}
            </motion.button>
            
            <motion.button
              type="submit"
              className="search-btn"
              disabled={loading || !city.trim()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {loading ? <FiRefreshCw className="spinning" /> : <FiSearch />}
            </motion.button>
          </div>
        </motion.form>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div 
              className="error-message"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              role="alert"
            >
              <div className="error-content">
                <span className="error-icon">⚠️</span>
                <p>{error.message}</p>
              </div>
              {error.canRetry && (
                <motion.button
                  onClick={handleRetry}
                  className="retry-button"
                  disabled={isRetrying}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isRetrying ? <FiRefreshCw className="spinning" /> : 'Try Again'}
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading State */}
        <AnimatePresence>
          {loading && (
            <motion.div 
              className="loading-container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="loading-spinner"></div>
              <p>Fetching weather data...</p>
              {retryCount > 0 && (
                <p className="retry-attempt">
                  Attempt {retryCount + 1} of {MAX_RETRIES + 1}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Weather Data */}
        <AnimatePresence>
          {weatherData && !error && (
            <motion.div 
              className="weather-content"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ duration: 0.5 }}
            >
              {/* Current Weather */}
              <div className="current-weather">
                <div className="weather-main">
                  <div className="location">
                    <FiMapPin className="location-icon" />
                    <h2>
                      {weatherData.name}, {countries.find(c => c.code === weatherData.sys.country)?.name}
                    </h2>
                  </div>
                  
                  <div className="weather-display">
                    <div className="weather-icon-large">
                      {getWeatherIcon(
                        weatherData.weather[0].main, 
                        isNightTime(weatherData.sys.sunrise, weatherData.sys.sunset, weatherData.timezone),
                        120
                      )}
                    </div>
                    
                    <div className="temperature-main">
                      <div className="temp-current">
                        {Math.round(weatherData.main.temp)}{getTemperatureUnit()}
                      </div>
                      <div className="temp-feels">
                        Feels like {Math.round(weatherData.main.feels_like)}{getTemperatureUnit()}
                      </div>
                      <div className="weather-desc">
                        {weatherData.weather[0].description}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Weather Details Grid */}
                {/* <div className="weather-details-grid">
                  <div className="detail-card">
                    <FiDroplet className="detail-icon" />
                    <div className="detail-info">
                      <span className="detail-label">Humidity</span>
                      <span className="detail-value">{weatherData.main.humidity}%</span>
                    </div>
                  </div>
                  
                  <div className="detail-card">
                    <FiWind className="detail-icon" />
                    <div className="detail-info">
                      <span className="detail-label">Wind Speed</span>
                      <span className="detail-value">{weatherData.wind.speed} {getWindSpeedUnit()}</span>
                    </div>
                  </div>
                  
                  <div className="detail-card">
                    <WiBarometer className="detail-icon" />
                    <div className="detail-info">
                      <span className="detail-label">Pressure</span>
                      <span className="detail-value">{weatherData.main.pressure} hPa</span>
                    </div>
                  </div>
                  
                  <div className="detail-card">
                    <FiEye className="detail-icon" />
                    <div className="detail-info">
                      <span className="detail-label">Visibility</span>
                      <span className="detail-value">{(weatherData.visibility / 1000).toFixed(1)} km</span>
                    </div>
                  </div>
                  
                  <div className="detail-card">
                    <WiSunrise className="detail-icon" />
                    <div className="detail-info">
                      <span className="detail-label">Sunrise</span>
                      <span className="detail-value">
                        {formatTime(weatherData.sys.sunrise, weatherData.timezone)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="detail-card">
                    <WiSunset className="detail-icon" />
                    <div className="detail-info">
                      <span className="detail-label">Sunset</span>
                      <span className="detail-value">
                        {formatTime(weatherData.sys.sunset, weatherData.timezone)}
                      </span>
                    </div>
                  </div>
                </div> */}
              </div>

              {/* 5-Day Forecast */}
              {/* {forecastData && (
                <motion.div 
                  className="forecast-section"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <h3 className="forecast-title">5-Day Forecast</h3>
                  <div className="forecast-grid">
                    {forecastData.list
                      .filter((_, index) => index % 8 === 0) // Get one forecast per day
                      .slice(0, 5)
                      .map((forecast, index) => {
                        const date = new Date(forecast.dt * 1000);
                        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                        
                        return (
                          <motion.div 
                            key={forecast.dt}
                            className="forecast-card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * index }}
                          >
                            <div className="forecast-day">{dayName}</div>
                            <div className="forecast-icon">
                              {getWeatherIcon(forecast.weather[0].main, false, 40)}
                            </div>
                            <div className="forecast-temps">
                              <span className="temp-high">
                                {Math.round(forecast.main.temp_max)}{getTemperatureUnit()}
                              </span>
                              <span className="temp-low">
                                {Math.round(forecast.main.temp_min)}{getTemperatureUnit()}
                              </span>
                            </div>
                            <div className="forecast-desc">
                              {forecast.weather[0].main}
                            </div>
                          </motion.div>
                        );
                      })}
                  </div>
                </motion.div>
              )} */}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default App;
