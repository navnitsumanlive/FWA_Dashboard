// In your main application code:
import { loadFWAData } from './utils/dataLoader.js';

async function initializeApp() {
    try {
        const fwaData = await loadFWAData();
        console.log('Data loaded:', fwaData);
        // Initialize your dashboards with this data
    } catch (error) {
        console.error('Failed to load data:', error);
        // Show error message to user
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);

class FWAApplication {
    constructor() {
        this.dashboards = {
            'kri-outliers': null,
            'decision-comparison': null,
            'provider-watchlist': null,
            'length-of-stay': null,
            'savings-potential': null,
            'simulation-view': null
        };
        
        this.currentDashboard = null;
        this.data = null;
        this.filters = {
            timePeriod: '30d',
            riskThreshold: 85
        };
        
        this.initEventListeners();
        this.loadData();
    }
    
    initEventListeners() {
        // Dashboard navigation
        document.querySelectorAll('#dashboard-nav li').forEach(item => {
            item.addEventListener('click', () => {
                const dashboardId = item.getAttribute('data-dashboard');
                this.loadDashboard(dashboardId);
                
                // Update active state
                document.querySelectorAll('#dashboard-nav li').forEach(li => {
                    li.classList.remove('active');
                });
                item.classList.add('active');
            });
        });
        
        // Time period filter
        document.getElementById('time-period').addEventListener('change', (e) => {
            this.filters.timePeriod = e.target.value;
            this.updateCurrentDashboard();
        });
        
        // Risk threshold filter
        document.getElementById('risk-threshold').addEventListener('input', (e) => {
            this.filters.riskThreshold = parseInt(e.target.value);
            document.getElementById('threshold-value').textContent = `${e.target.value}%`;
            this.updateCurrentDashboard();
        });
    }
    
    async loadData() {
        try {
            // Show loading state
            document.getElementById('dashboard-container').innerHTML = 
                '<div class="loading">Loading data...</div>';
            
            // Load sample data (in real app, this would be an API call)
            const response = await fetch('data/fwa-data.json');
            this.data = await response.json();
            
            // Process data
            this.processData();
            
            // Load default dashboard
            this.loadDashboard('kri-outliers');
            document.querySelector('#dashboard-nav li[data-dashboard="kri-outliers"]').classList.add('active');
            
        } catch (error) {
            console.error('Error loading data:', error);
            document.getElementById('dashboard-container').innerHTML = 
                '<div class="error">Failed to load data. Please try again later.</div>';
        }
    }
    
    processData() {
        // Apply time period filter
        const now = new Date();
        let cutoffDate;
        
        switch(this.filters.timePeriod) {
            case '7d': cutoffDate = new Date(now.setDate(now.getDate() - 7)); break;
            case '30d': cutoffDate = new Date(now.setDate(now.getDate() - 30)); break;
            case '90d': cutoffDate = new Date(now.setDate(now.getDate() - 90)); break;
            default: cutoffDate = new Date(0);
        }
        
        this.filteredData = {
            claims: this.data.claims.filter(claim => 
                new Date(claim.service_date) >= cutoffDate
            ),
            providers: this.data.providers
        };
        
        // Calculate risk threshold
        const riskScores = this.filteredData.claims.map(d => d.risk_score);
        this.riskCutoff = d3.quantile(riskScores, this.filters.riskThreshold / 100);
    }
    
    async loadDashboard(dashboardId) {
        // Unload current dashboard
        if (this.currentDashboard && this.dashboards[this.currentDashboard]) {
            this.dashboards[this.currentDashboard].unload();
        }
        
        // Show loading state
        document.getElementById('dashboard-container').innerHTML = 
            '<div class="loading">Loading dashboard...</div>';
        
        try {
            // Load dashboard module if not already loaded
            if (!this.dashboards[dashboardId]) {
                const module = await import(`./dashboards/${dashboardId}.js`);
                this.dashboards[dashboardId] = new module.default(
                    document.getElementById('dashboard-container'),
                    this.filteredData,
                    this.riskCutoff
                );
            }
            
            // Render dashboard
            this.dashboards[dashboardId].render();
            this.currentDashboard = dashboardId;
            
        } catch (error) {
            console.error(`Error loading dashboard ${dashboardId}:`, error);
            document.getElementById('dashboard-container').innerHTML = 
                '<div class="error">Failed to load dashboard. Please try again.</div>';
        }
    }
    
    updateCurrentDashboard() {
        if (!this.currentDashboard) return;
        
        // Reprocess data with current filters
        this.processData();
        
        // Update current dashboard
        if (this.dashboards[this.currentDashboard]) {
            this.dashboards[this.currentDashboard].updateData(
                this.filteredData,
                this.riskCutoff
            );
        }
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new FWAApplication();
});