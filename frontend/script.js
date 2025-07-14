//
// Frontend script for weather dashboard:
// - Handles user input and button click
// - Fetches forecast data via API
// - Selects closest hour, updates UI card
// - Draws hourly temperature graph with icons
// - Applies dynamic background color and contrast
//


function getWeatherIcon(description) {
    const mapping = {
        "clear sky": "clear_day.svg",
        "mainly clear": "clear_day.svg",
        "partly cloudy": "partly_cloudy_day.svg",
        "overcast": "cloudy.svg",

        "fog": "haze_fog_dust_smoke.svg",
        "depositing rime fog": "haze_fog_dust_smoke.svg",

        "light drizzle": "cloudy_with_rain_dark.svg",
        "moderate drizzle": "cloudy_with_rain_dark.svg",
        "dense drizzle": "cloudy_with_rain_dark.svg",

        "light freezing drizzle": "cloudy_with_rain_dark.svg",
        "dense freezing drizzle": "cloudy_with_rain_dark.svg",

        "slight rain": "cloudy_with_rain_dark.svg",
        "moderate rain": "cloudy_with_rain_dark.svg",
        "heavy rain": "cloudy_with_rain_dark.svg",

        "light freezing rain": "cloudy_with_rain_dark.svg",
        "heavy freezing rain": "cloudy_with_rain_dark.svg",

        "slight snowfall": "cloudy_with_snow_dark.svg",
        "moderate snowfall": "cloudy_with_snow_dark.svg",
        "heavy snowfall": "cloudy_with_snow_dark.svg",

        "snow grains": "cloudy_with_snow_dark.svg",

        "slight rain showers": "cloudy_with_rain_dark.svg",
        "moderate rain showers": "cloudy_with_rain_dark.svg",
        "violent rain showers": "cloudy_with_rain_dark.svg",

        "slight snow showers": "cloudy_with_snow_dark.svg",
        "heavy snow showers": "cloudy_with_snow_dark.svg",

        "thunderstorm": "isolated_thunderstorms.svg",
        "thunderstorm with slight hail": "isolated_thunderstorms.svg",
        "thunderstorm with heavy hail": "isolated_thunderstorms.svg"
    };

    const key = description.trim().toLowerCase();
    return mapping[key] ?? "unknown.svg";
}

document.addEventListener("DOMContentLoaded", () => {
    setBackgroundByTime();
    const input = document.getElementById("location");
    const button = document.getElementById("fetch-button");
    const status = document.getElementById("status");

    button.addEventListener("click", () => {
        const location = input.value.trim();
        if (!location) {
            status.textContent = "Please enter a location.";
            return;
        }

        status.textContent = "Fetching forecast...";

        fetch(`http://localhost:3000/api/fetch?location=${encodeURIComponent(location)}`)
            .then(response => {
                if (!response.ok){
                    status.textContent = "Location could not be found!";
                    throw new Error("Fetch failed");
                }
                return response.text();
            })
            .then(() => fetch(`http://localhost:3000/api/data?location=${encodeURIComponent(location)}`))
            .then(response => response.json())
            
            .then(data => {
                if (!Array.isArray(data) || data.length === 0) {
                    status.textContent = "No forecast data found.";
                    return;
                }
                status.textContent = "";

                const parseTime = (entry) => new Date(entry.time);

                const now = new Date();
                const rounded = new Date(now);
                rounded.setMinutes(now.getMinutes() < 30 ? 0 : 60, 0, 0);

                let closest = data[0];
                let minDiff = Infinity;
                for (const entry of data) {
                    const diff = Math.abs(parseTime(entry) - rounded);
                    if (diff < minDiff) {
                        minDiff = diff;
                        closest = entry;
                    }
                }

                const container = document.getElementById("card-container");
                const iconFile = getWeatherIcon(closest.weather_desc);
                container.style.backgroundImage = "none";
                container.innerHTML = `
                    <img src="./images/icons/${iconFile}" alt="Weather Icon" class="weather-icon">
                    <div class="card-section">
                        <span>Precip: ${Math.round(closest.precip_prob)}%</span>
                        <span>Rain: ${closest.rain_mm} mm</span>
                        <span>Snow: ${closest.snow_mm} mm</span>
                    </div>
                    <div class="card-section" style="text-align: right;">
                        <span class="main-temp">${Math.round(closest.temperature)}°C</span>
                        <span>Feels like ${Math.round(closest.feels_like)}°C</span>
                    </div>
                `;

                const filtered = data.filter((_, i) => i % 4 === 0);
                drawGraph(filtered);
            })


        })
    });

function getBackgroundImage(description) {
    const lower = description.toLowerCase();
    if (lower.includes("cloud")) return "cloudy.png";
    if (lower.includes("rain")) return "rain.png";
    if (lower.includes("snow")) return "snow.png";
    if (lower.includes("overcast")) return "overcast.png";
    return "clear.png";
}

function drawGraph(forecast) {
    const canvas = document.getElementById("forecast-graph");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const temps = forecast.map(f => f.temperature);
    const times = forecast.map(f => f.time.split("T")[1]?.slice(0, 5));
    const min = Math.min(...temps);
    const max = Math.max(...temps);
    const padding = 100;

    const graphHeight = canvas.height - padding * 2;
    const graphWidth = canvas.width - padding * 2;
    const spacing = graphWidth / (forecast.length - 1);
    const tempToY = temp => padding + graphHeight - ((temp - min) / (max - min)) * graphHeight;

    const iconPromises = forecast.map(point => {
        return new Promise(resolve => {
            const img = new Image();
            img.src = `./images/icons/${getWeatherIcon(point.weather_desc)}`;
            img.onload = () => resolve({ img });
            img.onerror = () => resolve({ img: null });
        });
    });

    Promise.all(iconPromises).then(icons => {
        ctx.beginPath();
        ctx.strokeStyle = "#007bff";
        forecast.forEach((point, i) => {
            const x = padding + i * spacing;
            const y = tempToY(point.temperature);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        ctx.fillStyle = document.body.style.color;
        ctx.font = "12px sans-serif";

        forecast.forEach((point, i) => {
            const x = padding + i * spacing;
            const y = tempToY(point.temperature);

            ctx.beginPath();
            ctx.arc(x, y, 3, 0, 2 * Math.PI);
            ctx.fill();

            ctx.fillText(`${Math.round(point.temperature)}°`, x - 10, y - 10);
            ctx.fillText(times[i], x - 15, canvas.height - 10);

            const icon = icons[i].img;
            if (icon) ctx.drawImage(icon, x - 12, y - 60, 24, 24);
        });
    });
}

function setBackgroundByTime() {
    const now = new Date();
    const hour = now.getHours();
    let bgColor;
    let textColor;

    if (hour >= 6 && hour < 12) {
        bgColor = "#FFF9C4";
        textColor = "#283593";
    } else if (hour >= 12 && hour < 18) {
        bgColor = "#BBDEFB";
        textColor = "#283593";
    } else if (hour >= 18 && hour < 21) {
        bgColor = "#FFCC80";
        textColor = "#283593";
    } else {
        bgColor = "#283593";
        textColor = "#BBDEFB";
    }

    document.body.style.backgroundColor = bgColor;
    document.body.style.color = textColor;
}
