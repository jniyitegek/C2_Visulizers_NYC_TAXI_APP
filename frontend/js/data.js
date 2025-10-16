const API_BASE_URL = 'http://localhost:3000';


const MOCK_DATA = {
    trips: [
        { id: "not_found", pickup_datetime: "0000-00-00 00:00:00", dropoff_datetime: "0000-00-00 00:00:00", trip_duration: 0, passenger_count: 0, pickup_latitude: 0, pickup_longitude: 0, dropoff_latitude: 0, dropoff_longitude: 0, vendor_id: "_" },
    ],
    analytics: {
        totalTrips: { value: '0.M', change: 0 },
        averageFare: { value: '$00.0', change: 0 },
        averageDuration: { value: '00.0', unit: 'mins' },
        busiestHours: { value: '00:00 - 00:00' }
    }
};

async function fetchData(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Error fetching ${endpoint}:`, error);
        return getMockData(endpoint);
    }
}

// Get mock data based on endpoint
function getMockData(endpoint) {
    if (endpoint.includes('/trips')) {
        return fetchData('/trips');
    } else if (endpoint.includes('/analytics')) {
        return generateAnalyticsData();
    } else if (endpoint.includes('/trip/')) {
        const tripId = endpoint.split('/').pop();
        return MOCK_DATA.trips.find(t => t.id === tripId) || MOCK_DATA.trips[0];
    }
    return null;
}

// Generate analytics data
function generateAnalyticsData() {
    const months = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];

    return {
        totalTrips: {
            value: '1.2M',
            change: 5,
            chartData: {
                labels: months,
                datasets: [{
                    label: 'July 2024',
                    data: [280000, 320000, 310000, 290000],
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    tension: 0.4
                }, {
                    label: 'June 2024',
                    data: [260000, 280000, 290000, 270000],
                    borderColor: '#95a5a6',
                    backgroundColor: 'rgba(149, 165, 166, 0.1)',
                    tension: 0.4
                }]
            }
        },
        averageFare: {
            value: '$15.50',
            change: -2,
            chartData: {
                labels: months,
                datasets: [{
                    label: 'July 2024',
                    data: [15.2, 15.8, 15.5, 15.5],
                    backgroundColor: '#3498db'
                }, {
                    label: 'June 2024',
                    data: [15.5, 15.9, 15.7, 15.8],
                    backgroundColor: '#95a5a6'
                }]
            }
        },
        paymentMethods: {
            value: '1.2M',
            change: 5,
            chartData: {
                labels: ['Credit Card', 'Cash', 'Digital Wallet', 'Other'],
                datasets: [{
                    data: [650000, 320000, 180000, 50000],
                    backgroundColor: ['#3498db', '#2ecc71', '#f39c12', '#95a5a6']
                }]
            }
        },
        boroughs: {
            value: '1.2M',
            change: -2,
            chartData: {
                labels: ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'],
                datasets: [{
                    label: 'July 2024',
                    data: [450000, 280000, 240000, 180000, 50000],
                    backgroundColor: '#3498db'
                }, {
                    label: 'June 2024',
                    data: [430000, 270000, 230000, 170000, 48000],
                    backgroundColor: '#95a5a6'
                }]
            }
        }
    };
}

// API Functions
async function getAllTrips(filters = {from: 0}) {
    const queryParams = new URLSearchParams(filters).toString();
    return await fetchData(`/trips${queryParams ? '?' + queryParams : ''}`);
}

async function getTotalTrips() {
    let total = await fetchData('/trips-total');
    console.log("totaalllll", total)
    return total;
}

async function getTrips(from) {
    return await fetchData(`/trips/?from=${from}`);
}

async function getTripById(tripId) {
    return await fetchData(`/trip/${tripId}`);
}

async function getAnalytics(dateRange = {}) {
    return await fetchData('/analytics', {
        method: 'POST',
        body: JSON.stringify(dateRange)
    });
}

async function getAverageDuration(){
    return await fetchData('/average-duration');
}

async function getBusiestHour(){
    return await fetchData('/busiest-hour')
}

async function getTripsByHour(){
    return await fetchData('/trips-by-hour')
}

async function getHistoricalData(period1, period2) {
    return await fetchData('/analytics/compare', {
        method: 'POST',
        body: JSON.stringify({ period1, period2 })
    });
}

async function getDashboardMetrics() {
    const trips = await getAllTrips();


    let totalTrips = await getTotalTrips()
    totalTrips = totalTrips.total.toLocaleString();

    let avgDuration = await getAverageDuration();
    avgDuration = avgDuration.number.toFixed(2)

    let busiestHour = await getBusiestHour()
    busiestHour = busiestHour.hour

    let tripsByHour = await getTripsByHour()
    console.log("by hourrr", tripsByHour)

    return {
        totalTrips,
        avgDuration,
        busiestHours: `${busiestHour}:00 - ${busiestHour + 1}:00`,
        trips
    };
}


if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getAllTrips,
        getTripById,
        getAnalytics,
        getTotalTrips,
        getHistoricalData,
        getDashboardMetrics,
        getTripsByHour,
        getTrips
    };
}