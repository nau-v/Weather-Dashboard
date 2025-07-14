CREATE TABLE IF NOT EXISTS forecasts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location TEXT NOT NULL,
    time TEXT NOT NULL,
    temperature REAL,
    feels_like REAL,
    rain_mm REAL,
    snow_mm REAL,
    precip_prob REAL,
    weather_desc TEXT,
    UNIQUE(location, time)
);
