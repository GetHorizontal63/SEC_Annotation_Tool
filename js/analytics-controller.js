/**
 * Analytics Controller
 * Handles loading and displaying financial analytics data
 */

const AnalyticsController = (function() {
    // Reference to the selected company
    let currentCompany = null;
    
    // Status element for showing data source
    let dataSourceElement = null;
    
    /**
     * Initialize the analytics tab
     * @param {string} tabId - ID of the analytics tab element
     */
    function init(tabId = 'analytics-tab') {
        // Create data source indicator
        createDataSourceIndicator(tabId);
        
        // Hook into tab activation event to load data when the analytics tab is shown
        $('#company-tabs a[href="#' + tabId + '"]').on('shown.bs.tab', function(e) {
            if (currentCompany) {
                loadAnalyticsData(currentCompany);
            }
        });
        
        console.log('Analytics controller initialized');
    }
    
    /**
     * Create an indicator showing the data source
     * @param {string} tabId - ID of the analytics tab element
     */
    function createDataSourceIndicator(tabId) {
        const tab = document.getElementById(tabId);
        if (!tab) return;
        
        dataSourceElement = document.createElement('div');
        dataSourceElement.className = 'data-source-indicator alert alert-info mt-2';
        dataSourceElement.innerHTML = 'Using local financial data';
        dataSourceElement.style.fontSize = 'small';
        dataSourceElement.style.padding = '0.5rem';
        
        // Insert at the beginning of the tab
        tab.insertBefore(dataSourceElement, tab.firstChild);
    }
    
    /**
     * Set the current company and load data if analytics tab is active
     * @param {Object} company - Company object with ticker and exchange properties
     */
    function setCompany(company) {
        currentCompany = company;
        
        // Check if analytics tab is currently active
        const analyticsTabIsActive = $('#company-tabs a[href="#analytics-tab"]').hasClass('active');
        
        if (analyticsTabIsActive && currentCompany) {
            loadAnalyticsData(currentCompany);
        }
    }
    
    /**
     * Load analytics data for the specified company
     * @param {Object} company - Company object with ticker and exchange properties
     */
    function loadAnalyticsData(company) {
        if (!company || !company.Ticker || !company.Stock_Exchange) {
            showNoDataMessage();
            return;
        }
        
        // Show loading state
        showLoadingState();
        
        // Check if data is available for this company
        FinancialDataAdapter.isDataAvailable(company.Ticker, company.Stock_Exchange)
            .then(available => {
                if (!available) {
                    showNoDataMessage(`No financial data available for ${company.Ticker} (${company.Stock_Exchange})`);
                    return;
                }
                
                // Fetch the necessary data
                return Promise.all([
                    FinancialDataAdapter.getCompanyProfile(company.Ticker, company.Stock_Exchange),
                    FinancialDataAdapter.getKeyMetrics(company.Ticker, company.Stock_Exchange, 'annual', 5),
                    FinancialDataAdapter.getKeyMetrics(company.Ticker, company.Stock_Exchange, 'quarter', 5)
                ]);
            })
            .then(results => {
                if (!results) return;
                
                const [profile, annualMetrics, quarterlyMetrics] = results;
                
                // Update UI with the data
                updateAnalyticsUI(profile, annualMetrics, quarterlyMetrics);
            })
            .catch(error => {
                console.error('Error loading analytics data:', error);
                showErrorMessage(error.message);
            });
    }
    
    /**
     * Show loading state in the analytics tab
     */
    function showLoadingState() {
        const analyticsContent = document.getElementById('analytics-content');
        if (analyticsContent) {
            analyticsContent.innerHTML = '<div class="text-center my-5"><div class="spinner-border" role="status"><span class="sr-only">Loading...</span></div><p class="mt-2">Loading financial data...</p></div>';
        }
    }
    
    /**
     * Show a message when no data is available
     * @param {string} message - Optional custom message
     */
    function showNoDataMessage(message = 'No financial data available for this company') {
        const analyticsContent = document.getElementById('analytics-content');
        if (analyticsContent) {
            analyticsContent.innerHTML = `<div class="alert alert-warning my-3">${message}</div>`;
        }
    }
    
    /**
     * Show an error message
     * @param {string} message - Error message to display
     */
    function showErrorMessage(message) {
        const analyticsContent = document.getElementById('analytics-content');
        if (analyticsContent) {
            analyticsContent.innerHTML = `<div class="alert alert-danger my-3">Error: ${message}</div>`;
        }
    }
    
    /**
     * Update the analytics UI with the fetched data
     * @param {Object} profile - Company profile data
     * @param {Array} annualMetrics - Annual key metrics data
     * @param {Array} quarterlyMetrics - Quarterly key metrics data
     */
    function updateAnalyticsUI(profile, annualMetrics, quarterlyMetrics) {
        const analyticsContent = document.getElementById('analytics-content');
        if (!analyticsContent) return;
        
        // Update data source indicator if profile has source information
        if (profile && profile.dataSource && dataSourceElement) {
            dataSourceElement.innerHTML = `Data Source: ${profile.dataSource}`;
        }
        
        // Clear existing content
        analyticsContent.innerHTML = '';
        
        // Add company header
        if (profile) {
            const header = document.createElement('div');
            header.className = 'company-header mb-4';
            header.innerHTML = `
                <h3>${profile.name} (${profile.symbol})</h3>
                <p>CIK: ${profile.cik || 'N/A'} | Exchange: ${profile.exchange || 'N/A'}</p>
            `;
            analyticsContent.appendChild(header);
        }
        
        // Create metrics section
        const metricsSection = document.createElement('div');
        metricsSection.className = 'row';
        
        // Add annual metrics
        const annualSection = createMetricsCard('Annual Metrics', annualMetrics, 'year');
        metricsSection.appendChild(annualSection);
        
        // Add quarterly metrics
        const quarterlySection = createMetricsCard('Quarterly Metrics', quarterlyMetrics, 'quarter');
        metricsSection.appendChild(quarterlySection);
        
        analyticsContent.appendChild(metricsSection);
    }
    
    /**
     * Create a card displaying financial metrics
     * @param {string} title - Card title
     * @param {Array} metrics - Metrics data
     * @param {string} period - Time period ('year' or 'quarter')
     * @returns {HTMLElement} Card element
     */
    function createMetricsCard(title, metrics, period) {
        const cardCol = document.createElement('div');
        cardCol.className = 'col-md-6 mb-4';
        
        if (!metrics || metrics.length === 0) {
            cardCol.innerHTML = `
                <div class="card">
                    <div class="card-header">${title}</div>
                    <div class="card-body">
                        <p class="text-muted">No ${period}ly metrics available</p>
                    </div>
                </div>
            `;
            return cardCol;
        }
        
        let tableRows = '';
        
        // Calculate metrics from capexPerShare
        metrics.forEach((metric, index) => {
            if (metric && metric.capexPerShare !== undefined) {
                tableRows += `
                    <tr>
                        <td>${period === 'year' ? 'Year' : 'Quarter'} ${index + 1}</td>
                        <td>$${metric.capexPerShare.toFixed(2)}</td>
                    </tr>
                `;
            }
        });
        
        cardCol.innerHTML = `
            <div class="card">
                <div class="card-header">${title}</div>
                <div class="card-body">
                    ${metrics.length > 0 ? `
                        <table class="table table-striped">
                            <thead>
                                <tr>
                                    <th>Period</th>
                                    <th>Capital Expenditure Per Share</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRows}
                            </tbody>
                        </table>
                    ` : `<p class="text-muted">No ${period}ly metrics available</p>`}
                </div>
            </div>
        `;
        
        return cardCol;
    }
    
    // Public API
    return {
        init,
        setCompany,
        loadAnalyticsData
    };
})();
