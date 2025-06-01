/**
 * This script modifies the FinancialDataService to use local JSON data
 * instead of making API calls. Include this script after financial-data-service.js
 * to use local data instead of making API calls.
 */

// Store the original service methods before overriding
const originalService = {
  getIncomeStatement: FinancialDataService.getIncomeStatement,
  getBalanceSheet: FinancialDataService.getBalanceSheet,
  getCashFlow: FinancialDataService.getCashFlow,
  getKeyMetrics: FinancialDataService.getKeyMetrics,
  getCompanyProfile: FinancialDataService.getCompanyProfile
};

// Load local financial data
let localFinancialData = [];
let dataLoaded = false;

// Load the financial data
function loadLocalFinancialData() {
  return fetch('../data/company_financials.json')
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to load local financial data');
      }
      return response.json();
    })
    .then(data => {
      localFinancialData = data;
      dataLoaded = true;
      console.log('Loaded local financial data for', data.length, 'companies');
      return data;
    })
    .catch(error => {
      console.error('Error loading local financial data:', error);
      return [];
    });
}

// Helper function to find company data by ticker/exchange
function findCompanyData(ticker, exchange) {
  if (!dataLoaded || !localFinancialData.length) {
    console.warn('Local financial data not loaded yet');
    return null;
  }
  
  const company = localFinancialData.find(c => 
    c.ticker.toLowerCase() === ticker.toLowerCase() && 
    c.exchange.toLowerCase() === exchange.toLowerCase()
  );
  
  return company;
}

// Override FinancialDataService methods to use local data
FinancialDataService.getIncomeStatement = function(ticker, exchange, period = 'quarter', limit = 10) {
  if (!dataLoaded) {
    console.log('Local data not loaded yet, loading now...');
    return loadLocalFinancialData().then(() => FinancialDataService.getIncomeStatement(ticker, exchange, period, limit));
  }
  
  console.log(`Using local data: Income statement for ${ticker} (${exchange}), period: ${period}`);
  const company = findCompanyData(ticker, exchange);
  
  if (!company || !company.data[period] || !company.data[period].income) {
    console.warn(`No local income statement data found for ${ticker} (${exchange})`);
    return Promise.resolve([]);
  }
  
  return Promise.resolve(company.data[period].income.slice(0, limit));
};

FinancialDataService.getBalanceSheet = function(ticker, exchange, period = 'quarter', limit = 10) {
  if (!dataLoaded) {
    console.log('Local data not loaded yet, loading now...');
    return loadLocalFinancialData().then(() => FinancialDataService.getBalanceSheet(ticker, exchange, period, limit));
  }
  
  console.log(`Using local data: Balance sheet for ${ticker} (${exchange}), period: ${period}`);
  const company = findCompanyData(ticker, exchange);
  
  if (!company || !company.data[period] || !company.data[period].balance) {
    console.warn(`No local balance sheet data found for ${ticker} (${exchange})`);
    return Promise.resolve([]);
  }
  
  return Promise.resolve(company.data[period].balance.slice(0, limit));
};

FinancialDataService.getCashFlow = function(ticker, exchange, period = 'quarter', limit = 10) {
  if (!dataLoaded) {
    console.log('Local data not loaded yet, loading now...');
    return loadLocalFinancialData().then(() => FinancialDataService.getCashFlow(ticker, exchange, period, limit));
  }
  
  console.log(`Using local data: Cash flow for ${ticker} (${exchange}), period: ${period}`);
  const company = findCompanyData(ticker, exchange);
  
  if (!company || !company.data[period] || !company.data[period].cash_flow) {
    console.warn(`No local cash flow data found for ${ticker} (${exchange})`);
    return Promise.resolve([]);
  }
  
  return Promise.resolve(company.data[period].cash_flow.slice(0, limit));
};

FinancialDataService.getKeyMetrics = function(ticker, exchange, period = 'quarter', limit = 10) {
  if (!dataLoaded) {
    console.log('Local data not loaded yet, loading now...');
    return loadLocalFinancialData().then(() => FinancialDataService.getKeyMetrics(ticker, exchange, period, limit));
  }
  
  console.log(`Using local data: Key metrics for ${ticker} (${exchange}), period: ${period}`);
  const company = findCompanyData(ticker, exchange);
  
  if (!company || !company.data[period] || !company.data[period].key_metrics) {
    console.warn(`No local key metrics data found for ${ticker} (${exchange})`);
    return Promise.resolve([]);
  }
  
  return Promise.resolve(company.data[period].key_metrics.slice(0, limit));
};

FinancialDataService.getCompanyProfile = function(ticker, exchange) {
  if (!dataLoaded) {
    console.log('Local data not loaded yet, loading now...');
    return loadLocalFinancialData().then(() => FinancialDataService.getCompanyProfile(ticker, exchange));
  }
  
  console.log(`Using local data: Company profile for ${ticker} (${exchange})`);
  const company = findCompanyData(ticker, exchange);
  
  if (!company) {
    console.warn(`No local company data found for ${ticker} (${exchange})`);
    return Promise.resolve(null);
  }
  
  // Create a company profile object from the company data
  return Promise.resolve({
    symbol: company.ticker,
    name: company.name,
    exchange: company.exchange,
    industry: "Technology", // Default industry, would need to be included in the scraped data
    cik: company.cik
  });
};

// Initialize by loading the data
console.log('Initializing local financial data service...');
loadLocalFinancialData();

console.log('FinancialDataService methods overridden to use local data');
