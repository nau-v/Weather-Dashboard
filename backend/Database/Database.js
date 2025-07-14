//
// SQLite3 database module for weather forecast storage.
// - Initializes the forecasts table (location + timestamp unique constraint)
// - Provides insertOrUpdateForecast(location, array) for bulk inserts/updates
// - Provides getForecast(location) to retrieve forecasts sorted by time
//

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbFile = path.join(__dirname, 'weather.db');
const db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
        console.error("Failed to open database", err);
    } else {
        console.log("Database opened successfully");
    }
});

db.run(`
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
    )
`, (err) => {
    if (err) console.error("Error creating forecasts table:", err);
});

function insertOrUpdateForecast(location, forecastArray, callback) {
    if (typeof location !== 'string' || location.trim() === '') {
        return callback(new Error("Invalid location"));
    }

    if (!Array.isArray(forecastArray) || forecastArray.length === 0) {
        return callback(new Error("Forecast array is empty or invalid"));
    }

    const sql = `
        INSERT INTO forecasts
        (location, time, temperature, feels_like, rain_mm, snow_mm, precip_prob, weather_desc)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(location, time) DO UPDATE SET
            temperature = excluded.temperature,
            feels_like = excluded.feels_like,
            rain_mm = excluded.rain_mm,
            snow_mm = excluded.snow_mm,
            precip_prob = excluded.precip_prob,
            weather_desc = excluded.weather_desc
    `;

    const stmt = db.prepare(sql, (err) => {
        if (err) {
            console.error("Error preparing statement:", err);
            return callback(err);
        }

        db.serialize(() => {
            for (const f of forecastArray) {
                stmt.run(
                    location,
                    f.time,
                    f.temp,
                    f.feels_like,
                    f.rain_mm,
                    f.snow_mm,
                    f.precip_prob,
                    f.weather_desc
                );
            }

            stmt.finalize((err) => {
                if (err) {
                    console.error("Error finalizing statement:", err);
                    return callback(err);
                }
                callback(null);
            });
        });
    });
}

function getForecast(location, callback) {
    if (typeof location !== 'string' || location.trim() === '') {
        return callback(new Error("Invalid location"));
    }

    const sql = `SELECT time, temperature, feels_like, rain_mm, snow_mm, precip_prob, weather_desc FROM forecasts WHERE location = ? ORDER BY time ASC`;

    db.all(sql, [location], (err, rows) => {
        if (err) {
            console.error("Error fetching forecast:", err);
            return callback(err);
        }
        callback(null, rows);
    });
}

module.exports = {
    insertOrUpdateForecast,
    getForecast,
};
