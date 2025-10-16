// NYC Taxi Analytics - Shared Application Logic

// Utility Functions
const utils = {
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    },

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    },

    formatDate(date) {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(new Date(date));
    },

    formatDateTime(datetime) {
        const date = new Date(datetime);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    },

    formatDuration(seconds) {
        const minutes = Math.floor(seconds);
        return `${minutes} mins`;
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// Navigation Management
class NavigationManager {
    constructor() {
        this.currentPage = this.getCurrentPage();
        this.init();
    }

    init() {
        this.highlightCurrentPage();
        this.setupNavigationListeners();
    }

    getCurrentPage() {
        const path = window.location.pathname;
        if (path.includes('page2.html')) return 'history';
        if (path.includes('page3.html')) return 'trip-details';
        return 'dashboard';
    }

    highlightCurrentPage() {
        const navLinks = document.querySelectorAll('.nav-item');
        navLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');

            if ((this.currentPage === 'dashboard' && href === 'index.html') ||
                (this.currentPage === 'history' && href === 'page2.html') ||
                (this.currentPage === 'trip-details' && href === 'page3.html')) {
                link.classList.add('active');
            }
        });
    }

    setupNavigationListeners() {
        const navLinks = document.querySelectorAll('.nav-item');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                console.log('Navigating to:', link.getAttribute('href'));
            });
        });
    }
}

// Loading State Manager
class LoadingManager {
    static show(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.add('loading');
            element.style.opacity = '0.6';
        }
    }

    static hide(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.remove('loading');
            element.style.opacity = '1';
        }
    }

    static showSpinner(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '<div class="spinner">Loading...</div>';
        }
    }
}

// Notification Manager
class NotificationManager {
    static show(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    static error(message) {
        this.show(message, 'error');
    }

    static success(message) {
        this.show(message, 'success');
    }
}

// ---------------------------------------------
// MODIFIED CLASS: SortManager
// ---------------------------------------------
class SortManager {
    /**
     * @param {Array<Object>} initialData - The full array of data objects to be sorted.
     * @param {string} selectId - The ID of the HTML <select> element (e.g., 'sortOption').
     * @param {function(Array<Object>): void} callback - A function to re-render the table/view with the sorted data.
     */
    constructor(initialData, selectId, callback) {
        this.data = initialData || [];
        this.select = document.getElementById(selectId);
        this.callback = callback;

        if (!this.select) {
            console.error(`SortManager: Element with id "${selectId}" not found`);
            return;
        }

        if (!this.callback || typeof this.callback !== 'function') {
            console.error('SortManager: Callback must be a function');
            return;
        }

        this.init();
    }

    init() {
        if (this.select) {
            this.select.addEventListener('change', (event) => {
                this.sortAndTriggerUpdate(event.target.value);
            });
        }
    }

    // Public method to update data (e.g., after filtering/searching)
    updateData(newData) {
        this.data = newData || [];
        // Re-sort the new data based on the currently selected option
        const currentSortKey = this.select ? this.select.value : 'pickup_datetime_desc';
        this.sortAndTriggerUpdate(currentSortKey);
    }

    sortAndTriggerUpdate(sortKey) {
        // Validate inputs
        if (!this.data || this.data.length === 0) {
            console.warn('SortManager: No data to sort');
            this.callback([]);
            return;
        }

        if (!sortKey) {
            console.warn('SortManager: No sort key provided');
            this.callback(this.data);
            return;
        }

        // 1. Clone the array to avoid modifying the original data set
        let sortedData = [...this.data];
        const parts = sortKey.split('_');

        // Handle multi-word field names (e.g., pickup_datetime_desc)
        const order = parts[parts.length - 1]; // Last part is always order (asc/desc)
        const field = parts.slice(0, -1).join('_'); // Everything before is the field name

        // 2. Perform the sort
        sortedData.sort((a, b) => {
            let valA = a[field];
            let valB = b[field];

            // Handle undefined or null values
            if (valA === undefined || valA === null) return 1;
            if (valB === undefined || valB === null) return -1;

            // Handle date fields correctly by comparing timestamps
            if (field.includes('datetime') || field.includes('date')) {
                valA = new Date(valA).getTime();
                valB = new Date(valB).getTime();

                // Handle invalid dates
                if (isNaN(valA)) valA = 0;
                if (isNaN(valB)) valB = 0;
            }

            // Handle numeric fields
            if (typeof valA === 'number' && typeof valB === 'number') {
                return order === 'asc' ? valA - valB : valB - valA;
            }

            // Handle string comparison
            if (typeof valA === 'string' && typeof valB === 'string') {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
            }

            // Perform comparison
            if (valA < valB) return order === 'asc' ? -1 : 1;
            if (valA > valB) return order === 'asc' ? 1 : -1;
            return 0;
        });

        // 3. Call the external callback function to re-render the table
        this.callback(sortedData);
    }

    // Get current sort option
    getCurrentSortKey() {
        return this.select ? this.select.value : null;
    }

    // Manually set sort option
    setSortOption(sortKey) {
        if (this.select) {
            this.select.value = sortKey;
            this.sortAndTriggerUpdate(sortKey);
        }
    }
}

// Search Functionality (Modified to work with external data array)
class SearchManager {
    /**
     * @param {string} inputId - The ID of the search input field.
     * @param {function(Array<Object>): void} updateCallback - A function to update the displayed list/table.
     * @param {Array<Object>} fullData - The full, unfiltered data array.
     */
    constructor(inputId, updateCallback, fullData) {
        this.input = document.getElementById(inputId);
        this.updateCallback = updateCallback;
        this.fullData = fullData;

        if (this.input && this.updateCallback && this.fullData) {
            this.init();
        }
    }

    init() {
        this.input.addEventListener('input', utils.debounce((e) => {
            this.filterData(e.target.value);
        }, 300));
    }

    filterData(searchTerm) {
        const term = searchTerm.toLowerCase();

        if (!term) {
            // If search term is empty, return full data
            this.updateCallback(this.fullData);
            return;
        }

        const filteredData = this.fullData.filter(item => {
            // Convert the object to a string for simple searching across all fields
            const itemString = Object.values(item).map(v => String(v).toLowerCase()).join(' ');
            return itemString.includes(term);
        });

        this.updateCallback(filteredData);
    }
}

// Chart Manager
class ChartManager {
    constructor() {
        this.charts = {};
    }

    createLineChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const defaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, position: 'bottom' }
            },
            scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true }
            }
        };

        this.charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: data,
            options: { ...defaultOptions, ...options }
        });

        return this.charts[canvasId];
    }

    createBarChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const defaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, position: 'bottom' }
            },
            scales: {
                y: { beginAtZero: true }
            }
        };

        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: data,
            options: { ...defaultOptions, ...options }
        });

        return this.charts[canvasId];
    }

    createDoughnutChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const defaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' }
            }
        };

        this.charts[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: { ...defaultOptions, ...options }
        });

        return this.charts[canvasId];
    }

    updateChart(chartId, newData) {
        const chart = this.charts[chartId];
        if (chart) {
            chart.data = newData;
            chart.update();
        }
    }

    destroyChart(chartId) {
        if (this.charts[chartId]) {
            this.charts[chartId].destroy();
            delete this.charts[chartId];
        }
    }

    resizeAll() {
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.resize();
        });
    }
}

// Popup Alert Manager
class PopupManager {
    static showTripAlert() {
        const popup = document.getElementById("tripAlert");
        const goBtn = document.getElementById("goDashboard");

        if (popup && goBtn) {
            popup.style.display = "flex";
            goBtn.addEventListener("click", () => {
                window.location.href = "index.html";
            });
        } else {
            console.warn("Popup elements not found in DOM.");
        }
    }
}

// Initialize navigation on all pages
let navigationManager;
document.addEventListener('DOMContentLoaded', () => {
    navigationManager = new NavigationManager();
});

// Handle window resize for charts
window.addEventListener('resize', utils.debounce(() => {
    if (window.chartManager) {
        window.chartManager.resizeAll();
    }
}, 250));

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }

    .loading::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 20px;
        height: 20px;
        margin: -10px 0 0 -10px;
        border: 2px solid #3498db;
        border-top-color: transparent;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    .spinner {
        text-align: center;
        padding: 2rem;
        color: #7f8c8d;
    }
`;
document.head.appendChild(style);