const fs = require('fs');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

class NYCTaxiDataProcessor {
    constructor(inputPath, outputPath = 'cleaned_taxi_data.csv') {
        this.inputPath = inputPath;
        this.outputPath = outputPath;
        this.rawData = [];
        this.cleanedData = [];
        this.cleaningLog = {
            total_records: 0,
            duplicates_removed: 0,
            missing_values_removed: 0,
            invalid_coordinates: 0,
            invalid_timestamps: 0,
            negative_values: 0,
            outliers_removed: 0,
            final_records: 0,
            suspicious_records: []
        };
    }

    // Load CSV data
    async loadData() {
        console.log('Loading dataset...');
        return new Promise((resolve, reject) => {
            fs.createReadStream(this.inputPath)
                .pipe(csv())
                .on('data', (row) => {
                    this.rawData.push(row);
                })
                .on('end', () => {
                    this.cleaningLog.total_records = this.rawData.length;
                    console.log(`Loaded ${this.rawData.length} records`);
                    console.log(`Columns: ${Object.keys(this.rawData[0] || {}).join(', ')}`);
                    resolve();
                })
                .on('error', reject);
        });
    }

    // Remove duplicates
    removeDuplicates() {
        console.log('\n=== Removing Duplicates ===');
        const initialCount = this.rawData.length;
        const seen = new Set();
        
        this.rawData = this.rawData.filter(row => {
            // Create a unique key from important fields
            const key = `${row.pickup_datetime}_${row.dropoff_datetime}_${row.pickup_longitude}_${row.pickup_latitude}_${row.dropoff_longitude}_${row.dropoff_latitude}`;
            
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });

        const duplicates = initialCount - this.rawData.length;
        this.cleaningLog.duplicates_removed = duplicates;
        console.log(`Removed ${duplicates} duplicate records`);
    }

    // Handle missing values
    handleMissingValues() {
        console.log('\n=== Handling Missing Values ===');
        const initialCount = this.rawData.length;
        
        // Required fields
        const requiredFields = [
            'pickup_datetime', 'dropoff_datetime',
            'pickup_longitude', 'pickup_latitude',
            'dropoff_longitude', 'dropoff_latitude',
            'passenger_count', 'trip_duration'
        ];

        this.rawData = this.rawData.filter(row => {
            for (let field of requiredFields) {
                if (!row[field] || row[field] === '' || row[field] === 'null') {
                    this.cleaningLog.suspicious_records.push({
                        reason: `Missing ${field}`,
                        data: row
                    });
                    return false;
                }
            }
            return true;
        });

        const removed = initialCount - this.rawData.length;
        this.cleaningLog.missing_values_removed = removed;
        console.log(`Removed ${removed} records with missing values`);
    }

    validateCoordinates() {
        console.log('\n=== Validating Coordinates ===');
        const initialCount = this.rawData.length;

        const NYC_BOUNDS = {
            lat_min: 40.5,
            lat_max: 41.0,
            lon_min: -74.3,
            lon_max: -73.7
        };

        this.rawData = this.rawData.filter(row => {
            const pickup_lat = parseFloat(row.pickup_latitude);
            const pickup_lon = parseFloat(row.pickup_longitude);
            const dropoff_lat = parseFloat(row.dropoff_latitude);
            const dropoff_lon = parseFloat(row.dropoff_longitude);

            // Check if coordinates are valid numbers
            if (isNaN(pickup_lat) || isNaN(pickup_lon) || 
                isNaN(dropoff_lat) || isNaN(dropoff_lon)) {
                this.cleaningLog.suspicious_records.push({
                    reason: 'Invalid coordinate format',
                    data: row
                });
                return false;
            }

            // Check if within NYC bounds
            if (pickup_lat < NYC_BOUNDS.lat_min || pickup_lat > NYC_BOUNDS.lat_max ||
                pickup_lon < NYC_BOUNDS.lon_min || pickup_lon > NYC_BOUNDS.lon_max ||
                dropoff_lat < NYC_BOUNDS.lat_min || dropoff_lat > NYC_BOUNDS.lat_max ||
                dropoff_lon < NYC_BOUNDS.lon_min || dropoff_lon > NYC_BOUNDS.lon_max) {
                this.cleaningLog.suspicious_records.push({
                    reason: 'Coordinates outside NYC bounds',
                    data: row
                });
                return false;
            }

            // Check for zero coordinates (common error)
            if (pickup_lat === 0 || pickup_lon === 0 || 
                dropoff_lat === 0 || dropoff_lon === 0) {
                this.cleaningLog.suspicious_records.push({
                    reason: 'Zero coordinates',
                    data: row
                });
                return false;
            }

            return true;
        });

        const removed = initialCount - this.rawData.length;
        this.cleaningLog.invalid_coordinates = removed;
        console.log(`Removed ${removed} records with invalid coordinates`);
    }

    // Validate timestamps
    validateTimestamps() {
        console.log('\n=== Validating Timestamps ===');
        const initialCount = this.rawData.length;

        this.rawData = this.rawData.filter(row => {
            const pickup = new Date(row.pickup_datetime);
            const dropoff = new Date(row.dropoff_datetime);

            // Check if valid dates
            if (isNaN(pickup.getTime()) || isNaN(dropoff.getTime())) {
                this.cleaningLog.suspicious_records.push({
                    reason: 'Invalid timestamp format',
                    data: row
                });
                return false;
            }

            // Check if dropoff is after pickup
            if (dropoff <= pickup) {
                this.cleaningLog.suspicious_records.push({
                    reason: 'Dropoff before or equal to pickup',
                    data: row
                });
                return false;
            }

            // Check for reasonable year range (e.g., 2010-2020)
            const year = pickup.getFullYear();
            if (year < 2010 || year > 2020) {
                this.cleaningLog.suspicious_records.push({
                    reason: 'Timestamp outside reasonable range',
                    data: row
                });
                return false;
            }

            return true;
        });

        const removed = initialCount - this.rawData.length;
        this.cleaningLog.invalid_timestamps = removed;
        console.log(`Removed ${removed} records with invalid timestamps`);
    }

    // Remove negative values
    removeNegativeValues() {
        console.log('\n=== Removing Negative Values ===');
        const initialCount = this.rawData.length;

        this.rawData = this.rawData.filter(row => {
            const passenger_count = parseInt(row.passenger_count);
            const trip_duration = parseFloat(row.trip_duration);

            if (passenger_count <= 0 || passenger_count > 9) {
                this.cleaningLog.suspicious_records.push({
                    reason: 'Invalid passenger count',
                    data: row
                });
                return false;
            }

            if (trip_duration <= 0) {
                this.cleaningLog.suspicious_records.push({
                    reason: 'Negative or zero trip duration',
                    data: row
                });
                return false;
            }

            return true;
        });

        const removed = initialCount - this.rawData.length;
        this.cleaningLog.negative_values = removed;
        console.log(`Removed ${removed} records with negative/invalid values`);
    }

    // Remove outliers using IQR method
    removeOutliers() {
        console.log('\n=== Removing Outliers ===');
        const initialCount = this.rawData.length;

        // Get trip durations for IQR calculation
        const durations = this.rawData.map(row => parseFloat(row.trip_duration)).sort((a, b) => a - b);
        
        const q1_index = Math.floor(durations.length * 0.25);
        const q3_index = Math.floor(durations.length * 0.75);
        const q1 = durations[q1_index];
        const q3 = durations[q3_index];
        const iqr = q3 - q1;
        const lower_bound = q1 - 1.5 * iqr;
        const upper_bound = q3 + 1.5 * iqr;

        console.log(`Duration IQR: Q1=${q1.toFixed(2)}s, Q3=${q3.toFixed(2)}s, IQR=${iqr.toFixed(2)}s`);
        console.log(`Outlier bounds: ${lower_bound.toFixed(2)}s - ${upper_bound.toFixed(2)}s`);

        this.rawData = this.rawData.filter(row => {
            const duration = parseFloat(row.trip_duration);
            
            if (duration < lower_bound || duration > upper_bound) {
                this.cleaningLog.suspicious_records.push({
                    reason: `Duration outlier: ${duration}s`,
                    data: row
                });
                return false;
            }

            return true;
        });

        const removed = initialCount - this.rawData.length;
        this.cleaningLog.outliers_removed = removed;
        console.log(`Removed ${removed} outlier records`);
    }

    // Calculate haversine distance between two coordinates
    haversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // Create derived features
    createDerivedFeatures() {
        console.log('\n=== Creating Derived Features ===');

        this.cleanedData = this.rawData.map(row => {
            const pickup = new Date(row.pickup_datetime);
            const dropoff = new Date(row.dropoff_datetime);
            const trip_duration_seconds = parseFloat(row.trip_duration);
            const trip_duration_minutes = trip_duration_seconds / 60;

            // Feature 1: Calculate trip distance using Haversine formula
            const distance_km = this.haversineDistance(
                parseFloat(row.pickup_latitude),
                parseFloat(row.pickup_longitude),
                parseFloat(row.dropoff_latitude),
                parseFloat(row.dropoff_longitude)
            );

            // Feature 2: Calculate average speed (km/h)
            const speed_kmh = trip_duration_seconds > 0 
                ? (distance_km / (trip_duration_seconds / 3600)) 
                : 0;

            // Feature 3: Extract temporal features
            const hour_of_day = pickup.getHours();
            const day_of_week = pickup.getDay(); // 0 = Sunday, 6 = Saturday
            const is_weekend = day_of_week === 0 || day_of_week === 6;
            
            // Time of day categories
            let time_category;
            if (hour_of_day >= 6 && hour_of_day < 12) time_category = 'morning';
            else if (hour_of_day >= 12 && hour_of_day < 17) time_category = 'afternoon';
            else if (hour_of_day >= 17 && hour_of_day < 22) time_category = 'evening';
            else time_category = 'night';

            // Feature 4: Rush hour flag
            const is_rush_hour = (hour_of_day >= 7 && hour_of_day <= 9) || 
                                 (hour_of_day >= 16 && hour_of_day <= 19);

            return {
                ...row,
                // Derived features
                distance_km: distance_km.toFixed(3),
                speed_kmh: speed_kmh.toFixed(2),
                trip_duration_minutes: trip_duration_minutes.toFixed(2),
                hour_of_day,
                day_of_week,
                is_weekend: is_weekend ? 1 : 0,
                time_category,
                is_rush_hour: is_rush_hour ? 1 : 0,
                // Formatted timestamps
                pickup_date: pickup.toISOString().split('T')[0],
                pickup_time: pickup.toTimeString().split(' ')[0],
                dropoff_date: dropoff.toISOString().split('T')[0],
                dropoff_time: dropoff.toTimeString().split(' ')[0]
            };
        });

        console.log('Created derived features:');
        console.log('  - distance_km: Haversine distance between pickup and dropoff');
        console.log('  - speed_kmh: Average trip speed');
        console.log('  - trip_duration_minutes: Duration in minutes');
        console.log('  - hour_of_day, day_of_week: Temporal features');
        console.log('  - time_category: morning/afternoon/evening/night');
        console.log('  - is_rush_hour: Boolean flag for rush hour trips');
    }

    // Save cleaned data
    async saveCleanedData() {
        console.log('\n=== Saving Cleaned Data ===');
        
        if (this.cleanedData.length === 0) {
            console.error('No cleaned data to save!');
            return;
        }

        // Get headers from first record
        const headers = Object.keys(this.cleanedData[0]).map(key => ({
            id: key,
            title: key
        }));

        const csvWriter = createCsvWriter({
            path: this.outputPath,
            header: headers
        });

        await csvWriter.writeRecords(this.cleanedData);
        console.log(`Saved ${this.cleanedData.length} cleaned records to ${this.outputPath}`);
        
        this.cleaningLog.final_records = this.cleanedData.length;
    }

    // Save cleaning log
    saveCleaningLog() {
        const logPath = 'cleaning_log.json';
        
        // Limit suspicious records to first 100 for readability
        const log = {
            ...this.cleaningLog,
            suspicious_records: this.cleaningLog.suspicious_records.slice(0, 100)
        };

        fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
        console.log(`\nCleaning log saved to ${logPath}`);
    }

    printSummary() {
        console.log('\n' + '='.repeat(50));
        console.log('DATA CLEANING SUMMARY');
        console.log('='.repeat(50));
        console.log(`Total records loaded:        ${this.cleaningLog.total_records}`);
        console.log(`Duplicates removed:          ${this.cleaningLog.duplicates_removed}`);
        console.log(`Missing values removed:      ${this.cleaningLog.missing_values_removed}`);
        console.log(`Invalid coordinates:         ${this.cleaningLog.invalid_coordinates}`);
        console.log(`Invalid timestamps:          ${this.cleaningLog.invalid_timestamps}`);
        console.log(`Negative values removed:     ${this.cleaningLog.negative_values}`);
        console.log(`Outliers removed:            ${this.cleaningLog.outliers_removed}`);
        console.log(`Final clean records:         ${this.cleaningLog.final_records}`);
        console.log(`Data retention rate:         ${((this.cleaningLog.final_records / this.cleaningLog.total_records) * 100).toFixed(2)}%`);
        console.log('='.repeat(50));
    }

    async process() {
        try {
            await this.loadData();
            this.removeDuplicates();
            this.handleMissingValues();
            this.validateCoordinates();
            this.validateTimestamps();
            this.removeNegativeValues();
            this.removeOutliers();
            this.createDerivedFeatures();
            await this.saveCleanedData();
            this.saveCleaningLog();
            this.printSummary();
            
            console.log('\nData processing completed successfull');
            return this.cleanedData;
        } catch (error) {
            console.error('Error during processing:', error);
            throw error;
        }
    }
}

async function main() {
    const processor = new NYCTaxiDataProcessor('train.csv', 'cleaned_taxi_data.csv');
    await processor.process();
}

// external use
module.exports = NYCTaxiDataProcessor;


if (require.main === module) {
    main();
}