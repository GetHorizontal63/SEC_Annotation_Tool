/**
 * Financial Data Provider Service
 * Fetches financial data from multiple standardized sources
 */

const financialDataProvider = (function() {
  // Available data sources
  const DATA_SOURCES = {
    WEBULL: 'webull',
    YAHOO_FINANCE: 'yahoo',
    ALPHA_VANTAGE: 'alphavantage',
    FINANCIAL_MODELING_PREP: 'fmp'
  };
  
  // Default data source
  let currentSource = DATA_SOURCES.WEBULL;
  
  // API keys for different services
  const apiKeys = {
    alphavantage: '',
    fmp: ''
  };
  
  /**
   * Initialize the service with API keys
   * @param {Object} keys - API keys for different services
   */
  function initialize(keys = {}) {
    if (keys.alphavantage) {
      apiKeys.alphavantage = keys.alphavantage;
    }
    
    if (keys.fmp) {
      apiKeys.fmp = keys.fmp;
    }
    
    // Initialize the Yahoo Finance service for fallback
    return yahooFinanceService.initialize();
  }
  
  /**
   * Set the current data source
   * @param {string} source - Data source identifier
   */
  function setDataSource(source) {
    if (Object.values(DATA_SOURCES).includes(source)) {
      currentSource = source;
      console.log(`Set financial data source to: ${source}`);
      return true;
    }
    console.error(`Invalid data source: ${source}`);
    return false;
  }
  
  /**
   * Get financial data for a company
   * @param {string} ticker - Stock ticker symbol
   * @returns {Promise<Object>} Financial data
   */
  async function getCompanyFinancials(ticker) {
    try {
      switch (currentSource) {
        case DATA_SOURCES.WEBULL:
          return await webullDataFetcher.getFinancials(ticker);
          
        case DATA_SOURCES.YAHOO_FINANCE:
          return await yahooFinanceService.getCompanyFinancials(ticker);
          
        case DATA_SOURCES.ALPHA_VANTAGE:
          return await getAlphaVantageFinancials(ticker);
          
        case DATA_SOURCES.FINANCIAL_MODELING_PREP:
          return await getFMPFinancials(ticker);
          
        default:
          console.error(`Unknown data source: ${currentSource}, falling back to Webull`);
          return await webullDataFetcher.getFinancials(ticker);
      }
    } catch (error) {
      console.error(`Error fetching financial data from ${currentSource}:`, error);
      
      // If primary source fails, try Webull data
      if (currentSource !== DATA_SOURCES.WEBULL) {
        try {
          console.log('Falling back to Webull data');
          return await webullDataFetcher.getFinancials(ticker);
        } catch (webullError) {
          console.error('Webull fallback failed:', webullError);
        }
      }
      
      // If still failing and not using Yahoo Finance, try that as last resort
      if (currentSource !== DATA_SOURCES.YAHOO_FINANCE) {
        console.log('Falling back to Yahoo Finance');
        return await yahooFinanceService.getCompanyFinancials(ticker);
      }
      
      throw error;
    }
  }
  
  /**
   * Force refresh financial data from the source
   * @param {string} ticker - Stock ticker symbol
   * @returns {Promise<Object>} Fresh financial data
   */
  async function refreshFinancialData(ticker) {
    try {
      if (currentSource === DATA_SOURCES.WEBULL) {
        return await webullDataFetcher.getFinancials(ticker, true);
      } else {
        // For other sources, just call getCompanyFinancials as they don't cache
        return await getCompanyFinancials(ticker);
      }
    } catch (error) {
      console.error(`Error refreshing financial data for ${ticker}:`, error);
      throw error;
    }
  }

  /**
   * Fetch financial data from Alpha Vantage
   * @param {string} ticker - Stock ticker symbol
   * @returns {Promise<Object>} Normalized financial data
   */
  async function getAlphaVantageFinancials(ticker) {
    if (!apiKeys.alphavantage) {
      throw new Error('Alpha Vantage API key not configured');
    }
    
    // Income Statement
    const incomeUrl = `https://www.alphavantage.co/query?function=INCOME_STATEMENT&symbol=${ticker}&apikey=${apiKeys.alphavantage}`;
    
    // Balance Sheet
    const balanceUrl = `https://www.alphavantage.co/query?function=BALANCE_SHEET&symbol=${ticker}&apikey=${apiKeys.alphavantage}`;
    
    // Cash Flow
    const cashflowUrl = `https://www.alphavantage.co/query?function=CASH_FLOW&symbol=${ticker}&apikey=${apiKeys.alphavantage}`;
    
    // Company Overview (profile)
    const overviewUrl = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${ticker}&apikey=${apiKeys.alphavantage}`;
    
    try {
      // Fetch all data in parallel
      const [incomeResponse, balanceResponse, cashflowResponse, overviewResponse] = await Promise.all([
        fetch(incomeUrl),
        fetch(balanceUrl),
        fetch(cashflowUrl),
        fetch(overviewUrl)
      ]);
      
      // Parse responses
      const incomeData = await incomeResponse.json();
      const balanceData = await balanceResponse.json();
      const cashflowData = await cashflowResponse.json();
      const overviewData = await overviewResponse.json();
      
      // Check for error responses
      if (incomeData.hasOwnProperty('Error Message') || 
          balanceData.hasOwnProperty('Error Message') ||
          cashflowData.hasOwnProperty('Error Message') ||
          overviewData.hasOwnProperty('Error Message')) {
        throw new Error('Alpha Vantage API error: ' + (incomeData['Error Message'] || 'Unknown error'));
      }
      
      // Normalize data to match Yahoo Finance format
      return normalizeAlphaVantageData(ticker, incomeData, balanceData, cashflowData, overviewData);
    } catch (error) {
      console.error('Error fetching data from Alpha Vantage:', error);
      throw error;
    }
  }
  
  /**
   * Normalize Alpha Vantage data to match Yahoo Finance format
   */
  function normalizeAlphaVantageData(ticker, incomeData, balanceData, cashflowData, overviewData) {
    // Prepare annual and quarterly reports for income statement
    const annualIncome = incomeData.annualReports ? incomeData.annualReports.map(report => ({
      date: report.fiscalDateEnding,
      revenue: parseFloat(report.totalRevenue),
      costOfRevenue: parseFloat(report.costOfRevenue),
      grossProfit: parseFloat(report.grossProfit),
      operatingExpenses: calculateOperatingExpenses(report),
      operatingIncome: parseFloat(report.operatingIncome),
      netIncome: parseFloat(report.netIncome),
      eps: parseFloat(report.eps || overviewData.EPS || 0)
    })) : [];
    
    const quarterlyIncome = incomeData.quarterlyReports ? incomeData.quarterlyReports.map(report => ({
      date: report.fiscalDateEnding,
      revenue: parseFloat(report.totalRevenue),
      costOfRevenue: parseFloat(report.costOfRevenue),
      grossProfit: parseFloat(report.grossProfit),
      operatingExpenses: calculateOperatingExpenses(report),
      operatingIncome: parseFloat(report.operatingIncome),
      netIncome: parseFloat(report.netIncome),
      eps: parseFloat(report.eps || 0)
    })) : [];
    
    // Prepare annual and quarterly reports for balance sheet
    const annualBalance = balanceData.annualReports ? balanceData.annualReports.map(report => ({
      date: report.fiscalDateEnding,
      totalAssets: parseFloat(report.totalAssets),
      totalCurrentAssets: parseFloat(report.totalCurrentAssets),
      cashAndCashEquivalents: parseFloat(report.cashAndCashEquivalentsAtCarryingValue),
      totalLiabilities: parseFloat(report.totalLiabilities),
      totalCurrentLiabilities: parseFloat(report.totalCurrentLiabilities),
      longTermDebt: parseFloat(report.longTermDebt),
      totalStockholdersEquity: parseFloat(report.totalShareholderEquity)
    })) : [];
    
    const quarterlyBalance = balanceData.quarterlyReports ? balanceData.quarterlyReports.map(report => ({
      date: report.fiscalDateEnding,
      totalAssets: parseFloat(report.totalAssets),
      totalCurrentAssets: parseFloat(report.totalCurrentAssets),
      cashAndCashEquivalents: parseFloat(report.cashAndCashEquivalentsAtCarryingValue),
      totalLiabilities: parseFloat(report.totalLiabilities),
      totalCurrentLiabilities: parseFloat(report.totalCurrentLiabilities),
      longTermDebt: parseFloat(report.longTermDebt),
      totalStockholdersEquity: parseFloat(report.totalShareholderEquity)
    })) : [];
    
    // Prepare annual and quarterly reports for cash flow
    const annualCashflow = cashflowData.annualReports ? cashflowData.annualReports.map(report => ({
      date: report.fiscalDateEnding,
      operatingCashFlow: parseFloat(report.operatingCashflow),
      capitalExpenditure: parseFloat(report.capitalExpenditures),
      freeCashFlow: parseFloat(report.operatingCashflow) - parseFloat(report.capitalExpenditures),
      netCashUsedForInvestingActivites: parseFloat(report.cashflowFromInvestment),
      netCashUsedProvidedByFinancingActivities: parseFloat(report.cashflowFromFinancing),
      dividendsPaid: parseFloat(report.dividendPayout || 0),
      netChangeInCash: parseFloat(report.changeInCash)
    })) : [];
    
    const quarterlyCashflow = cashflowData.quarterlyReports ? cashflowData.quarterlyReports.map(report => ({
      date: report.fiscalDateEnding,
      operatingCashFlow: parseFloat(report.operatingCashflow),
      capitalExpenditure: parseFloat(report.capitalExpenditures),
      freeCashFlow: parseFloat(report.operatingCashflow) - parseFloat(report.capitalExpenditures),
      netCashUsedForInvestingActivites: parseFloat(report.cashflowFromInvestment),
      netCashUsedProvidedByFinancingActivities: parseFloat(report.cashflowFromFinancing),
      dividendsPaid: parseFloat(report.dividendPayout || 0),
      netChangeInCash: parseFloat(report.changeInCash)
    })) : [];
    
    // Create profile data
    const profile = {
      ticker: ticker,
      title: overviewData.Name || ticker,
      description: overviewData.Description || '',
      sector: overviewData.Sector || '',
      industry: overviewData.Industry || '',
      employees: parseFloat(overviewData.FullTimeEmployees || 0),
      website: overviewData.AssetType || '',
      peRatio: parseFloat(overviewData.PERatio || 0),
      marketCap: parseFloat(overviewData.MarketCapitalization || 0)
    };
    
    // Combine all data
    return {
      profile: profile,
      income: {
        annualReports: annualIncome,
        quarterlyReports: quarterlyIncome
      },
      balance: {
        annualReports: annualBalance,
        quarterlyReports: quarterlyBalance
      },
      cashflow: {
        annualReports: annualCashflow,
        quarterlyReports: quarterlyCashflow
      },
      metrics: calculateMetrics(annualIncome, annualBalance, annualCashflow)
    };
  }
  
  /**
   * Helper function to calculate operating expenses from Alpha Vantage data
   */
  function calculateOperatingExpenses(report) {
    // If operatingExpenses is directly provided, use it
    if (report.operatingExpenses) {
      return parseFloat(report.operatingExpenses);
    }
    
    // Otherwise, calculate it based on components
    let expenses = 0;
    if (report.sellingGeneralAndAdministrative) {
      expenses += parseFloat(report.sellingGeneralAndAdministrative);
    }
    if (report.researchAndDevelopment) {
      expenses += parseFloat(report.researchAndDevelopment);
    }
    if (report.depreciationAndAmortization) {
      expenses += parseFloat(report.depreciationAndAmortization);
    }
    return expenses;
  }
  
  /**
   * Fetch financial data from Financial Modeling Prep
   * @param {string} ticker - Stock ticker symbol
   * @returns {Promise<Object>} Normalized financial data
   */
  async function getFMPFinancials(ticker) {
    if (!apiKeys.fmp) {
      throw new Error('Financial Modeling Prep API key not configured');
    }
    
    // Income Statement (Annual and Quarterly)
    const incomeAnnualUrl = `https://financialmodelingprep.com/api/v3/income-statement/${ticker}?limit=5&apikey=${apiKeys.fmp}`;
    const incomeQuarterlyUrl = `https://financialmodelingprep.com/api/v3/income-statement/${ticker}?period=quarter&limit=20&apikey=${apiKeys.fmp}`;
    
    // Balance Sheet (Annual and Quarterly)
    const balanceAnnualUrl = `https://financialmodelingprep.com/api/v3/balance-sheet-statement/${ticker}?limit=5&apikey=${apiKeys.fmp}`;
    const balanceQuarterlyUrl = `https://financialmodelingprep.com/api/v3/balance-sheet-statement/${ticker}?period=quarter&limit=20&apikey=${apiKeys.fmp}`;
    
    // Cash Flow (Annual and Quarterly)
    const cashflowAnnualUrl = `https://financialmodelingprep.com/api/v3/cash-flow-statement/${ticker}?limit=5&apikey=${apiKeys.fmp}`;
    const cashflowQuarterlyUrl = `https://financialmodelingprep.com/api/v3/cash-flow-statement/${ticker}?period=quarter&limit=20&apikey=${apiKeys.fmp}`;
    
    // Company Profile
    const profileUrl = `https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${apiKeys.fmp}`;
    
    try {
      // Fetch all data in parallel
      const [
        incomeAnnualResponse, 
        incomeQuarterlyResponse,
        balanceAnnualResponse,
        balanceQuarterlyResponse,
        cashflowAnnualResponse,
        cashflowQuarterlyResponse,
        profileResponse
      ] = await Promise.all([
        fetch(incomeAnnualUrl),
        fetch(incomeQuarterlyUrl),
        fetch(balanceAnnualUrl),
        fetch(balanceQuarterlyUrl),
        fetch(cashflowAnnualUrl),
        fetch(cashflowQuarterlyUrl),
        fetch(profileUrl)
      ]);
      
      // Parse responses
      const incomeAnnualData = await incomeAnnualResponse.json();
      const incomeQuarterlyData = await incomeQuarterlyResponse.json();
      const balanceAnnualData = await balanceAnnualResponse.json();
      const balanceQuarterlyData = await balanceQuarterlyResponse.json();
      const cashflowAnnualData = await cashflowAnnualResponse.json();
      const cashflowQuarterlyData = await cashflowQuarterlyResponse.json();
      const profileData = await profileResponse.json();
      
      // Check if we got valid data
      if (!Array.isArray(incomeAnnualData) || incomeAnnualData.length === 0) {
        throw new Error('Invalid or empty response from Financial Modeling Prep API');
      }
      
      // Normalize data to match Yahoo Finance format
      return normalizeFMPData(ticker, {
        incomeAnnual: incomeAnnualData,
        incomeQuarterly: incomeQuarterlyData,
        balanceAnnual: balanceAnnualData,
        balanceQuarterly: balanceQuarterlyData,
        cashflowAnnual: cashflowAnnualData,
        cashflowQuarterly: cashflowQuarterlyData,
        profile: profileData[0] || {}
      });
    } catch (error) {
      console.error('Error fetching data from Financial Modeling Prep:', error);
      throw error;
    }
  }
  
  /**
   * Normalize Financial Modeling Prep data to match Yahoo Finance format
   */
  function normalizeFMPData(ticker, data) {
    // Prepare annual and quarterly reports for income statement
    const annualIncome = data.incomeAnnual.map(report => ({
      date: report.date,
      revenue: report.revenue,
      costOfRevenue: report.costOfRevenue,
      grossProfit: report.grossProfit,
      operatingExpenses: report.operatingExpenses,
      operatingIncome: report.operatingIncome,
      netIncome: report.netIncome,
      eps: report.eps
    }));
    
    const quarterlyIncome = data.incomeQuarterly.map(report => ({
      date: report.date,
      revenue: report.revenue,
      costOfRevenue: report.costOfRevenue,
      grossProfit: report.grossProfit,
      operatingExpenses: report.operatingExpenses,
      operatingIncome: report.operatingIncome,
      netIncome: report.netIncome,
      eps: report.eps
    }));
    
    // Prepare annual and quarterly reports for balance sheet
    const annualBalance = data.balanceAnnual.map(report => ({
      date: report.date,
      totalAssets: report.totalAssets,
      totalCurrentAssets: report.totalCurrentAssets,
      cashAndCashEquivalents: report.cashAndCashEquivalents,
      totalLiabilities: report.totalLiabilities,
      totalCurrentLiabilities: report.totalCurrentLiabilities,
      longTermDebt: report.longTermDebt,
      totalStockholdersEquity: report.totalStockholdersEquity
    }));
    
    const quarterlyBalance = data.balanceQuarterly.map(report => ({
      date: report.date,
      totalAssets: report.totalAssets,
      totalCurrentAssets: report.totalCurrentAssets,
      cashAndCashEquivalents: report.cashAndCashEquivalents,
      totalLiabilities: report.totalLiabilities,
      totalCurrentLiabilities: report.totalCurrentLiabilities,
      longTermDebt: report.longTermDebt,
      totalStockholdersEquity: report.totalStockholdersEquity
    }));
    
    // Prepare annual and quarterly reports for cash flow
    const annualCashflow = data.cashflowAnnual.map(report => ({
      date: report.date,
      operatingCashFlow: report.netCashProvidedByOperatingActivities,
      capitalExpenditure: report.capitalExpenditure,
      freeCashFlow: report.freeCashFlow,
      netCashUsedForInvestingActivites: report.netCashUsedForInvestingActivities,
      netCashUsedProvidedByFinancingActivities: report.netCashUsedProvidedByFinancingActivities,
      dividendsPaid: report.dividendsPaid || 0,
      netChangeInCash: report.netChangeInCash
    }));
    
    const quarterlyCashflow = data.cashflowQuarterly.map(report => ({
      date: report.date,
      operatingCashFlow: report.netCashProvidedByOperatingActivities,
      capitalExpenditure: report.capitalExpenditure,
      freeCashFlow: report.freeCashFlow,
      netCashUsedForInvestingActivites: report.netCashUsedForInvestingActivities,
      netCashUsedProvidedByFinancingActivities: report.netCashUsedProvidedByFinancingActivities,
      dividendsPaid: report.dividendsPaid || 0,
      netChangeInCash: report.netChangeInCash
    }));
    
    // Create profile data
    const profile = {
      ticker: ticker,
      title: data.profile.companyName || ticker,
      description: data.profile.description || '',
      sector: data.profile.sector || '',
      industry: data.profile.industry || '',
      employees: data.profile.fullTimeEmployees || 0,
      website: data.profile.website || '',
      peRatio: data.profile.pe || 0,
      marketCap: data.profile.mktCap || 0
    };
    
    // Combine all data
    return {
      profile: profile,
      income: {
        annualReports: annualIncome,
        quarterlyReports: quarterlyIncome
      },
      balance: {
        annualReports: annualBalance,
        quarterlyReports: quarterlyBalance
      },
      cashflow: {
        annualReports: annualCashflow,
        quarterlyReports: quarterlyCashflow
      },
      metrics: calculateMetrics(annualIncome, annualBalance, annualCashflow)
    };
  }
  
  /**
   * Calculate financial metrics based on the data
   */
  function calculateMetrics(incomeData, balanceData, cashflowData) {
    const metrics = [];
    
    // Ensure we have at least two periods of data for trends
    if (incomeData.length >= 2 && balanceData.length >= 2) {
      // Calculate metrics for each period
      for (let i = 0; i < Math.min(incomeData.length, balanceData.length); i++) {
        const income = incomeData[i];
        const balance = balanceData[i];
        const cashflow = cashflowData[i];
        
        // Skip if missing essential data
        if (!income || !balance) continue;
        
        const revenue = income.revenue;
        const netIncome = income.netIncome;
        const totalAssets = balance.totalAssets;
        const totalEquity = balance.totalStockholdersEquity;
        const operatingCashFlow = cashflow ? cashflow.operatingCashFlow : 0;
        
        metrics.push({
          date: income.date,
          // Profitability
          grossMargin: revenue ? income.grossProfit / revenue : 0,
          operatingMargin: revenue ? income.operatingIncome / revenue : 0,
          netMargin: revenue ? netIncome / revenue : 0,
          
          // Returns
          returnOnAssets: totalAssets ? netIncome / totalAssets : 0,
          returnOnEquity: totalEquity ? netIncome / totalEquity : 0,
          
          // Other
          peRatio: 0, // This would require market price data
          debtToEquity: totalEquity ? balance.totalLiabilities / totalEquity : 0,
          currentRatio: balance.totalCurrentLiabilities ? 
                         balance.totalCurrentAssets / balance.totalCurrentLiabilities : 0,
          
          // Cash Flow
          operatingCashFlowToSales: revenue ? operatingCashFlow / revenue : 0
        });
      }
    }
    
    return { metrics };
  }
  
  // Public API
  return {
    initialize,
    getCompanyFinancials,
    refreshFinancialData,
    setDataSource,
    DATA_SOURCES
  };
})();
