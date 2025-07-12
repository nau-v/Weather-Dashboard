//
// Code which fetches weather data from open-meteo.com and location data from OpenStreetMap's Nominatim service.
// `getLocation(locationName, callback)`: Fetches latitude and longitude for a given location name.
// `getHourlyForecast(latitude, longitude, callback)`: Fetches hourly weather forecast for the given coordinates.
// `getWeatherDescription(code)`: Converts weather codes to human-readable descriptions, can be done in UI directly, but will make the DB less readable, not that it really matters.
//

const https = require('https');

function getLocation(locationName, callback) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationName)}&format=json&limit=1`;

    https.get(url, { headers: { "User-Agent": "Node.js App" } }, response => {
        let data = "";
        response.on("data", chunk => data += chunk);
        response.on("end", () => {
            try {
                const results = JSON.parse(data);
                if (results.length === 0) {
                    callback(new Error("No results found for " + locationName));
                    return;
                }
                const { lat, lon } = results[0];
                callback(null, { lat: parseFloat(lat), lon: parseFloat(lon) });
            } catch (err) {
                callback(err);
            }
        });
    }).on("error", err => callback(err));
}

function getHourlyForecast(latitude, longitude, callback) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,precipitation_probability,precipitation,apparent_temperature,rain,snowfall,weather_code&timezone=Europe%2FBerlin`;

    https.get(url, (response) => {
        let data = "";
        response.on("data", chunk => data += chunk);
        response.on("end", () => {
            try {
                const json = JSON.parse(data);
                const hourly = json.hourly;
                const forecast = [];

                for (let i = 0; i < 24; i++) {
                    forecast.push({
                        time: hourly.time[i],
                        temp: hourly.temperature_2m[i],
                        feels_like: hourly.apparent_temperature[i],
                        rain_mm: hourly.rain[i],
                        snow_mm: hourly.snowfall[i],
                        precip_prob: hourly.precipitation_probability[i],
                        weather_desc: getWeatherDescription(hourly.weather_code[i])
                    });
                }

                callback(null, forecast);
            } catch (err) {
                callback(err);
            }
        });
    }).on("error", err => callback(err));
}

function getWeatherDescription(code) {
    const map = {
        0: "Clear sky",
        1: "Mainly clear",
        2: "Partly cloudy",
        3: "Overcast",

        45: "Fog",
        48: "Depositing rime fog",

        51: "Light drizzle",
        53: "Moderate drizzle",
        55: "Dense drizzle",

        56: "Light freezing drizzle",
        57: "Dense freezing drizzle",
        
        61: "Slight rain",
        63: "Moderate rain",
        65: "Heavy rain",

        66: "Light freezing rain",
        67: "Heavy freezing rain",

        71: "Slight snowfall",
        73: "Moderate snowfall",
        75: "Heavy snowfall",
        
        77: "Snow grains",
        
        80: "Slight rain showers",
        81: "Moderate rain showers",
        82: "Violent rain showers",

        85: "Slight snow showers",
        86: "Heavy snow showers",
        
        95: "Thunderstorm",
        96: "Thunderstorm with slight hail",
        99: "Thunderstorm with heavy hail"
    };
    return map[code] || "Unknown";
}

module.exports = {
    getLocation,
    getHourlyForecast
};