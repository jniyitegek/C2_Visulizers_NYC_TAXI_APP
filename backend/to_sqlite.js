import fs from 'fs';
import sqlite3 from 'sqlite3';
import csv from 'csv-parser';

const db = new sqlite3.Database('trips.db');

const table = `CREATE TABLE IF NOT EXISTS trips (
    id TEXT PRIMARY KEY,
    vendor_id INTEGER,
    pickup_datetime TEXT,
    dropoff_datetime TEXT,
    passenger_count INTEGER,
    pickup_longitude REAL,
    pickup_latitude REAL,
    dropoff_longitude REAL,
    dropoff_latitude REAL,
    store_and_fwd_flag TEXT,
    trip_duration INTEGER,
    distance_km REAL,
    speed_kmh REAL,
    trip_duration_minutes REAL,
    hour_of_day INTEGER,
    day_of_week INTEGER,
    is_weekend INTEGER,
    time_category TEXT,
    is_rush_hour INTEGER,
    pickup_date TEXT,
    pickup_time TEXT,
    dropoff_date TEXT,
    dropoff_time TEXT
);`;

db.serialize(() => {
    db.run(table);
    db.run("BEGIN TRANSACTION");
    const stmt = db.prepare(`INSERT OR REPLACE INTO trips VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

    fs.createReadStream('trips.csv')
        .pipe(csv())
        .on('data', row => {
            stmt.run(
                row.id,
                row.vendor_id,
                row.pickup_datetime,
                row.dropoff_datetime,
                row.passenger_count,
                row.pickup_longitude,
                row.pickup_latitude,
                row.dropoff_longitude,
                row.dropoff_latitude,
                row.store_and_fwd_flag,
                row.trip_duration,
                row.distance_km,
                row.speed_kmh,
                row.trip_duration_minutes,
                row.hour_of_day,
                row.day_of_week,
                row.is_weekend,
                row.time_category,
                row.is_rush_hour,
                row.pickup_date,
                row.pickup_time,
                row.dropoff_date,
                row.dropoff_time
            );
        })
        .on('end', () => {
            stmt.finalize();
            db.run("COMMIT", () => {
                db.close();
                console.log("CSV data loaded into SQLite.");
            });
        });
});
