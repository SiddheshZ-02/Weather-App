import React, { useEffect, useState } from 'react'
import './App.css';
import { WiDaySunny, WiRain, WiSnow, WiCloudy, WiThunderstorm } from 'react-icons/wi';

const App = () => {
  const [city, setCity] = useState("Delhi")
  const [country, setCountry] = useState("IN")
  const [weatherData, setWeatherData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)
  const MAX_RETRIES = 3
  const RETRY_DELAY = 2000

  const currentDate = new Date();
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const month = months[currentDate.getMonth()];
  const day = currentDate.getDate();
  const year = currentDate.getFullYear();
  const formattedDate = `${month} ${day}, ${year}`;

  const API_KEY = "828e8c0531f88bfebd093d69a4f0396b";


  const countries = [
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
  ];

  const getWeatherIcon = (weatherMain) => {
    if (!weatherMain) return <WiDaySunny size={100} />;

    switch (weatherMain.toLowerCase()) {
      case 'clear':
        return <WiDaySunny size={100} />;
      case 'rain':
        return <WiRain size={100} />;
      case 'snow':
        return <WiSnow size={100} />;
      case 'clouds':
        return <WiCloudy size={100} />;
      case 'thunderstorm':
        return <WiThunderstorm size={100} />;
      default:
        return <WiDaySunny size={100} />;
    }
  };

  const validateWeatherData = (data) => {
    if (!data || !data.main || !data.weather || !data.weather[0]) {
      throw new Error('Invalid weather data received');
    }
    return true;
  };

  const fetchWeatherData = async (isRetry = false) => {
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
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)},${country}&appid=${API_KEY}&units=metric`
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`City "${city}" not found in ${countries.find(c => c.code === country)?.name}. Please check the spelling and try again.`);
        } else if (response.status === 401) {
          throw new Error('API key is invalid or expired. Please contact support.');
        } else if (response.status === 429) {
          throw new Error('Too many requests. Please try again later.');
        } else {
          throw new Error(`Error: ${response.statusText}`);
        }
      }

      const data = await response.json();
      validateWeatherData(data);
      setWeatherData(data);
      setRetryCount(0);
      setError(null);
    } catch (error) {
      console.error('Weather fetch error:', error);

      if (retryCount < MAX_RETRIES) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          fetchWeatherData(true);
        }, RETRY_DELAY);
      } else {
        setError({
          message: error.message || 'Failed to fetch weather data. Please try again.',
          canRetry: true
        });
        setWeatherData(null);
      }
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchWeatherData();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    if (value.length <= 50) {
      setCity(value);
    }
  };

  const handleCountryChange = (e) => {
    setCountry(e.target.value);
    setWeatherData(null);
    setError(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setRetryCount(0);
    fetchWeatherData();
  };

  const handleRetry = () => {
    setRetryCount(0);
    setError(null);
    fetchWeatherData(true);
  };

  return (

    <>
      <div className='App'>

        <div className="container">
        <h1 className='h1'>Weather App</h1>
          <h1 className='container_date'>{formattedDate}</h1>
         

          <form className='form' onSubmit={handleSubmit}>
            <div className="search-container">
              <input
                type="text"
                className='input'
                placeholder='Enter city name'
                value={city}
                onChange={handleInputChange}
                aria-label="City name"
                disabled={loading}
              />
              <select
                className="country-select"
                value={country}
                onChange={handleCountryChange}
                disabled={loading}
                aria-label="Select country"
              >
                {countries.map(country => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type='submit'
              disabled={loading || !city.trim()}
              aria-label="Get weather"
              className={loading ? 'loading-button' : ''}
            >
              {loading ? 'Loading...' : 'Get Weather'}
            </button>
          </form>

          {error && (
            <div className="error-message" role="alert">
              <div className="error-content">
                <span className="error-icon">⚠️</span>
                <p>{error.message}</p>
              </div>
              {error.canRetry && (
                <button
                  onClick={handleRetry}
                  className="retry-button"
                  disabled={isRetrying}
                  aria-label="Retry fetching weather"
                >
                  {isRetrying ? 'Retrying...' : 'Try Again'}
                </button>
              )}
            </div>
          )}

          {loading && (
            <div className="loading" role="status">
              <div className="loading-spinner"></div>
              <p>Loading weather data...</p>
              {retryCount > 0 && (
                <p className="retry-attempt">
                  Attempt {retryCount + 1} of {MAX_RETRIES + 1}
                </p>
              )}
            </div>
          )}

          {weatherData && !error && (
            <div className="weather_data">
              <div className="weather-header">
                <h2 className='container_city'>
                  {weatherData.name}, {countries.find(c => c.code === weatherData.sys.country)?.name || weatherData.sys.country}
                </h2>
                <div className="weather-icon" aria-hidden="true">
                  {getWeatherIcon(weatherData.weather[0].main)}
                </div>
              </div>

              <div className="temperature-section">
                <h2 className='container-degree'>
                  {Math.round(weatherData.main.temp)}°C
                </h2>
                <p className="feels-like">
                  Feels like: {Math.round(weatherData.main.feels_like)}°C
                </p>
              </div>

              <div className="weather-details">
                <div className="detail-item">
                  <span>Humidity</span>
                  <span>{weatherData.main.humidity}%</span>
                </div>
                <div className="detail-item">
                  <span>Wind Speed</span>
                  <span>{weatherData.wind.speed} m/s</span>
                </div>
                <div className="detail-item">
                  <span>Weather</span>
                  <span>{weatherData.weather[0].main}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default App;
