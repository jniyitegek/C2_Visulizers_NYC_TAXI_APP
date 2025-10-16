// server.js
import { createServer } from 'http';
import url from 'url';
import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('trips.db', sqlite3.OPEN_READONLY);

// Helper for CORS headers
function setCORS(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// JSON response helper
function sendJSON(res, status, data) {
    setCORS(res);
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

const routes = {
    '/trips': (req, res, query) => {
        const from = parseInt(query.from) || 1;
        const limit = 100;
        const offset = (from - 1) * limit;
        db.all('SELECT * FROM trips LIMIT ? OFFSET ?', [limit, offset], (err, rows) => {
            if (err) return sendJSON(res, 500, { error: err.message });
            sendJSON(res, 200, rows);
        });
    },
    '/trip': (req, res, query, params) => {
        const id = query.id || params[0];
        db.get('SELECT * FROM trips WHERE id = ?', [id], (err, row) => {
            if (err) return sendJSON(res, 500, { error: err.message });
            if (!row) return sendJSON(res, 404, { error: 'Trip not found' });
            sendJSON(res, 200, row);
        });
    },
    '/trips-total': (req, res) => {
        db.get('SELECT COUNT(*) AS total FROM trips', (err, row) => {
            if (err) return sendJSON(res, 500, { error: err.message });
            sendJSON(res, 200, { total: row.total });
        });
    },
    '/average-duration': (req, res) => {
        db.get('SELECT AVG(trip_duration_minutes) AS average_duration FROM trips', (err, row) => {
            if (err) return sendJSON(res, 500, { error: err.message });
            sendJSON(res, 200, { number: row.average_duration });
        });
    },
    '/busiest-hour': (req, res) => {
        db.get('SELECT hour_of_day, COUNT(*) AS count FROM trips GROUP BY hour_of_day ORDER BY count DESC LIMIT 1', (err, row) => {
            if (err) return sendJSON(res, 500, { error: err.message });
            if (!row) return sendJSON(res, 404, { error: 'No data found' });
            sendJSON(res, 200, { hour: row.hour_of_day, count: row.count });
        });
    },
    '/trips-by-hour': (req, res) => {
        db.all('SELECT hour_of_day, COUNT(*) AS count FROM trips GROUP BY hour_of_day', (err, rows) => {
            if (err) return sendJSON(res, 500, { error: err.message });

            const counts = Array(24).fill(0);
            rows.forEach(row => {
                const hour = Number(row.hour_of_day);
                if (hour >= 0 && hour < 24) {
                    counts[hour] = row.count;
                }
            });

            sendJSON(res, 200, counts);
        });
    }
};

function router(req, res) {
    const parsed = url.parse(req.url, true);
    const path = parsed.pathname.replace(/\/+$/, '');

    console.log(req.method, path);

    // Handle preflight CORS
    if (req.method === 'OPTIONS') {
        setCORS(res);
        res.writeHead(204);
        res.end();
        return;
    }
const [_, route, id] = path.split('/');
    if (routes[`/${route}`]) {
    routes[`/${route}`](req, res, parsed.query, id ? [id] : []);
} else {
        setCORS(res);
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
}

const server = createServer(router);

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
