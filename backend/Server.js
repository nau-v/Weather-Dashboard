//
// HTTP server for frontend delivery and weather API endpoints.
// - Serves static frontend files (HTML, JS, CSS, etc.)
// - Handles /api/fetch to retrieve weather data and store it in DB
// - Handles /api/data to retrieve stored forecast data for a given location
//

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const { getLocation, getHourlyForecast } = require('./WeatherFetcher');
const { insertOrUpdateForecast, getForecast } = require('./Database/Database');
const PORT = 3000;
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

function serveStaticFile(request, response) {
    const parsedUrl = url.parse(request.url);
    let pathname = parsedUrl.pathname;

    if (pathname === '/') pathname = '/index.html';

    const filePath = path.join(FRONTEND_DIR, pathname);

    console.log('Trying to serve:', filePath);

    fs.readFile(filePath, (err, data) => {
        if (err) {
            console.error('File not found:', filePath);
            response.writeHead(404, { 'Content-Type': 'text/plain' });
            return response.end("404 Not Found");
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentTypes = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.svg': 'image/svg+xml'
        };

        const contentType = contentTypes[ext] || 'application/octet-stream';

        response.writeHead(200, { 'Content-Type': contentType });
        response.end(data);
    });
}

function handleApiRequest(request, response) {
    const parsed = url.parse(request.url, true);
    const pathname = parsed.pathname;
    const location = parsed.query.location;

    if (!location) {
        response.writeHead(400, { 'Content-Type': 'text/plain' });
        return response.end("Missing location parameter");
    }

    if (pathname === '/api/fetch') {
        getLocation(location, (err, coords) => {
            if (err) {
                response.writeHead(500, { 'Content-Type': 'text/plain' });
                return response.end("Location fetch failed: " + err.message);
            }

            getHourlyForecast(coords.lat, coords.lon, (err, forecast) => {
                if (err) {
                    response.writeHead(500, { 'Content-Type': 'text/plain' });
                    return response.end("Forecast fetch failed: " + err.message);
                }

                insertOrUpdateForecast(location, forecast, (err) => {
                    if (err) {
                        console.error("insertOrUpdateForecast error:", err);
                        response.writeHead(500, { 'Content-Type': 'text/plain' });
                        return response.end("Failed to update forecast data: " + err.message);
                    }

                    response.writeHead(200, { 'Content-Type': 'text/plain' });
                    response.end("Forecast updated successfully");
                });
            });
        });
    } else if (pathname === '/api/data') {
        getForecast(location, (err, rows) => {
            if (err) {
                response.writeHead(500, { 'Content-Type': 'text/plain' });
                return response.end("Failed to fetch forecast data");
            }

            response.writeHead(200, { 'Content-Type': 'application/json' });
            response.end(JSON.stringify(rows));
        });
    } else {
        response.writeHead(404, { 'Content-Type': 'text/plain' });
        response.end("Unknown API endpoint");
    }
}

const server = http.createServer((request, response) => {
    response.setHeader('Access-Control-Allow-Origin', '*');

    const parsed = url.parse(request.url);
    if (parsed.pathname.startsWith('/api/')) {
        handleApiRequest(request, response);
    } else {
        serveStaticFile(request, response);
    }
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
