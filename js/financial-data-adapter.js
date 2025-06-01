/**
 * Financial Data Adapter
 * Standalone adapter that loads financial data from local JSON file
 * without any dependency on financial-data-service.js
 */

const FinancialDataService = (function() {
    // Cache for the financial data
    let financialData = null;
    let isLoading = false;
    let loadPromise = null;
    
    /**
     * Load financial data from local JSON file
     * @returns {Promise} Promise that resolves with the financial data
     */
    function loadFinancialData() {
        if (financialData !== null) {
            return Promise.resolve(financialData);
        }
        
        if (isLoading) {
            return loadPromise;
        }
        
        isLoading = true;
        console.log('Loading financial data from local JSON file...');
        loadPromise = fetch('../data/company_financials.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load financial data');
                }
                return response.json();
            })
            .then(data => {
                console.log('Loaded financial data for', data.length, 'companies');
                financialData = data;
                isLoading = false;
                return financialData;
            })
            .catch(error => {
                console.error('Error loading financial data:', error);
                isLoading = false;
                throw error;
            });
        
        return loadPromise;
    }
    
    /**
     * Find a company in the financial data by ticker and exchange
     * @param {string} ticker - Company ticker symbol
     * @param {string} exchange - Stock exchange
     * @returns {Promise} Promise that resolves with the company data
     */
    function findCompany(ticker, exchange) {
        return loadFinancialData().then(data => {
            const company = data.find(c => 
                c.ticker.toLowerCase() === ticker.toLowerCase() && 
                c.exchange.toLowerCase() === exchange.toLowerCase()
            );
            
            if (!company) {
                throw new Error(`No data found for ${ticker} (${exchange})`);
            }
            
            return company;
        });
    }
    
    /**
     * Get income statement data for a company
     * @param {string} ticker - Company ticker symbol
     * @param {string} exchange - Stock exchange
     * @param {string} period - Period (quarter, annual)
     * @param {number} limit - Maximum number of statements to return
     * @returns {Promise} Promise that resolves with the income statement data
     */
    function getIncomeStatement(ticker, exchange, period = 'quarter', limit = 10) {
        return findCompany(ticker, exchange)
            .then(company => {
                if (!company.data || !company.data[period] || !company.data[period].income) {
                    return [];
                }
                
                return company.data[period].income.slice(0, limit);
            })
            .catch(error => {
                console.warn('Error fetching income statement:', error);
                return [];
            });
    }
    
    /**
     * Get balance sheet data for a company
     * @param {string} ticker - Company ticker symbol
     * @param {string} exchange - Stock exchange
     * @param {string} period - Period (quarter, annual)
     * @param {number} limit - Maximum number of statements to return
     * @returns {Promise} Promise that resolves with the balance sheet data
     */
    function getBalanceSheet(ticker, exchange, period = 'quarter', limit = 10) {
        return findCompany(ticker, exchange)
            .then(company => {
                if (!company.data || !company.data[period] || !company.data[period].balance) {
                    return [];
                }
                
                return company.data[period].balance.slice(0, limit);
            })
            .catch(error => {
                console.warn('Error fetching balance sheet:', error);
                return [];
            });
    }
    
    /**
     * Get cash flow data for a company
     * @param {string} ticker - Company ticker symbol
     * @param {string} exchange - Stock exchange
     * @param {string} period - Period (quarter, annual)
     * @param {number} limit - Maximum number of statements to return
     * @returns {Promise} Promise that resolves with the cash flow data
     */
    function getCashFlow(ticker, exchange, period = 'quarter', limit = 10) {
        return findCompany(ticker, exchange)
            .then(company => {
                if (!company.data || !company.data[period] || !company.data[period].cash_flow) {
                    return [];
                }
                
                return company.data[period].cash_flow.slice(0, limit);
            })
            .catch(error => {
                console.warn('Error fetching cash flow:', error);
                return [];
            });
    }
    
    /**
     * Get key metrics for a company
     * @param {string} ticker - Company ticker symbol
     * @param {string} exchange - Stock exchange
     * @param {string} period - Period (quarter, annual)
     * @param {number} limit - Maximum number of metrics to return
     * @returns {Promise} Promise that resolves with the key metrics data
     */
    function getKeyMetrics(ticker, exchange, period = 'quarter', limit = 10) {
        return findCompany(ticker, exchange)
            .then(company => {
                if (!company.data || !company.data[period] || !company.data[period].key_metrics) {
                    return [];
                }
                
                return company.data[period].key_metrics.slice(0, limit);
            })
            .catch(error => {
                console.warn('Error fetching key metrics:', error);
                return [];
            });
    }
    
    /**
     * Get company profile
     * @param {string} ticker - Company ticker symbol
     * @param {string} exchange - Stock exchange
     * @returns {Promise} Promise that resolves with the company profile
     */
    function getCompanyProfile(ticker, exchange) {
        return findCompany(ticker, exchange)
            .then(company => {
                // Create a company profile object from the company data
                return {
                    symbol: company.ticker,
                    name: company.name,
                    exchange: company.exchange,
                    industry: "Technology", // Default industry
                    cik: company.cik,
                    dataSource: 'Local JSON file'
                };
            })
            .catch(error => {
                console.warn('Error fetching company profile:', error);
                return null;
            });
    }
    
    /**
     * Calculate average of a property across multiple items
     * @param {Array} items - Array of items
     * @param {string} property - Property to average
     * @returns {number|null} Average value or null if no valid values
     */
    function calculateAverage(items, property) {
        if (!items || items.length === 0) return null;
        
        const validValues = items
            .map(item => item[property])
            .filter(val => val !== undefined && val !== null && !isNaN(val));
        
        if (validValues.length === 0) return null;
        
        const sum = validValues.reduce((total, val) => total + val, 0);
        return sum / validValues.length;
    }
    
    /**
     * Get default currency for an exchange
     * @param {string} exchange - Stock exchange
     * @returns {string} Default currency code
     */
    function getDefaultCurrencyForExchange(exchange) {
        // Map exchanges to default currencies
        const exchangeCurrencyMap = {
            'NYSE': 'USD',
            'NASDAQ': 'USD',
            'TSE': 'JPY',
            'ASX': 'AUD',
            'FRA': 'EUR',
            'BMV': 'MXN',
            'KRX': 'KRW',
            'NSE': 'INR',
            'BSE': 'EUR',
            'TSX': 'CAD',
            'OMX': 'SEK'
        };
        
        return exchangeCurrencyMap[exchange] || 'USD';
    }
    
    // Public API
    return {
        loadFinancialData,
        getIncomeStatement,
        getBalanceSheet,
        getCashFlow,
        getKeyMetrics,
        getCompanyProfile,
        calculateAverage,
        getDefaultCurrencyForExchange
    };
})();

// Initialize by loading data
console.log('Initializing local financial data service...');
FinancialDataService.loadFinancialData();
