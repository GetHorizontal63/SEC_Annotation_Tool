// Financials page JavaScript

document.addEventListener('DOMContentLoaded', function() {
  // DOM elements
  const companySelect = document.getElementById('company-select');
  const metricCards = document.querySelectorAll('.metric-card');
  const statementContainer = document.getElementById('statement-container');
  const tabButtons = document.querySelectorAll('.tab-button');
  const periodToggle = document.getElementById('period-toggle');
  const dataSourceSelect = document.getElementById('data-source-select');
  const downloadDataBtn = document.getElementById('download-data-btn');
  
  // Current data state
  let currentFinancialData = null;
  let currentPeriod = 'annual'; // 'annual' or 'quarterly'
  
  // Initialize
  async function initialize() {
    try {
      // Initialize the CIK to ticker mapper
      await cikTickerMapper.initialize();
      
      // Initialize the financial data provider
      await financialDataProvider.initialize({
        alphavantage: apiKeys.alphavantage || '',
        fmp: apiKeys.fmp || ''
      });
      
      // Setup data source selector
      setupDataSourceSelector();
      
      // Load project list to get companies
      const projectList = await loadProjectList();
      
      // Populate company dropdown
      populateCompanyDropdown(projectList);
      
      // Initialize charts placeholder
      initChartPlaceholders();
      
      // Setup period toggle
      setupPeriodToggle();
      
      // Load first company data
      if (companySelect.options.length > 0) {
        const firstCik = companySelect.options[0].value;
        await loadCompanyFinancials(firstCik);
      }
    } catch (error) {
      console.error('Error initializing financials page:', error);
      showErrorMessage('Failed to initialize financials page. Please try refreshing the page.');
    }
  }
  
  // Setup data source selector
  function setupDataSourceSelector() {
    if (!dataSourceSelect) return;
    
    // Clear existing options
    dataSourceSelect.innerHTML = '';
    
    // Add options for each data source
    const sources = [
      { value: financialDataProvider.DATA_SOURCES.WEBULL, label: 'Webull (Local)' },
      { value: financialDataProvider.DATA_SOURCES.YAHOO_FINANCE, label: 'Yahoo Finance' },
      { value: financialDataProvider.DATA_SOURCES.ALPHA_VANTAGE, label: 'Alpha Vantage' },
      { value: financialDataProvider.DATA_SOURCES.FINANCIAL_MODELING_PREP, label: 'Financial Modeling Prep' }
    ];
    
    sources.forEach(source => {
      const option = document.createElement('option');
      option.value = source.value;
      option.textContent = source.label;
      dataSourceSelect.appendChild(option);
    });
    
    // Set event listener
    dataSourceSelect.addEventListener('change', async function() {
      const newSource = this.value;
      if (financialDataProvider.setDataSource(newSource) && currentFinancialData) {
        // Show download button only for Webull data source
        if (newSource === financialDataProvider.DATA_SOURCES.WEBULL) {
          downloadDataBtn.style.display = 'inline-flex';
        } else {
          downloadDataBtn.style.display = 'none';
        }
        
        // Reload data for current company with new source
        await loadCompanyFinancials(currentFinancialData.cik);
      }
    });
    
    // Initialize download button visibility
    if (dataSourceSelect.value === financialDataProvider.DATA_SOURCES.WEBULL) {
      downloadDataBtn.style.display = 'inline-flex';
    } else {
      downloadDataBtn.style.display = 'none';
    }
    
    // Setup download button functionality
    setupDownloadButton();
  }
  
  // Setup download button
  function setupDownloadButton() {
    if (!downloadDataBtn) return;
    
    downloadDataBtn.addEventListener('click', async function() {
      if (!currentFinancialData || !currentFinancialData.ticker) {
        showErrorMessage('No company selected to download data for.');
        return;
      }
      
      const ticker = currentFinancialData.ticker;
      
      // Show loading state
      downloadDataBtn.disabled = true;
      downloadDataBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Downloading...';
      
      try {
        // Download and store the data
        await webullDataFetcher.getFinancials(ticker, true);
        
        // Update the UI to show success
        downloadDataBtn.innerHTML = '<i class="fa-solid fa-check"></i> Downloaded';
        setTimeout(() => {
          downloadDataBtn.innerHTML = '<i class="fa-solid fa-download"></i> Download Data';
          downloadDataBtn.disabled = false;
        }, 3000);
        
        // If we're currently using Webull data source, reload the data
        if (dataSourceSelect.value === financialDataProvider.DATA_SOURCES.WEBULL) {
          await loadCompanyFinancials(currentFinancialData.cik);
        }
      } catch (error) {
        console.error('Error downloading financial data:', error);
        downloadDataBtn.innerHTML = '<i class="fa-solid fa-xmark"></i> Failed';
        setTimeout(() => {
          downloadDataBtn.innerHTML = '<i class="fa-solid fa-download"></i> Download Data';
          downloadDataBtn.disabled = false;
        }, 3000);
        
        showErrorMessage(`Failed to download data: ${error.message}`);
      }
    });
  }
  
  // Setup period toggle button
  function setupPeriodToggle() {
    periodToggle.addEventListener('click', function() {
      if (currentPeriod === 'annual') {
        currentPeriod = 'quarterly';
        periodToggle.textContent = 'Switch to Annual';
        periodToggle.classList.add('quarterly');
        periodToggle.classList.remove('annual');
      } else {
        currentPeriod = 'annual';
        periodToggle.textContent = 'Switch to Quarterly';
        periodToggle.classList.add('annual');
        periodToggle.classList.remove('quarterly');
      }
      
      // Update the display with new period
      if (currentFinancialData) {
        updateFinancialDisplay();
      }
    });
  }
  
  // Load project list from JSON
  async function loadProjectList() {
    try {
      const response = await fetch('../data/project_list.json');
      if (!response.ok) {
        throw new Error('Failed to load project list');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error loading project list:', error);
      showErrorMessage('Failed to load project list. Please try refreshing the page.');
      return [];
    }
  }
  
  // Populate company dropdown with companies that have both CIK numbers and ticker symbols
  function populateCompanyDropdown(projectList) {
    // Clear existing options
    companySelect.innerHTML = '';
    
    // Filter projects with valid CIK numbers
    const projectsWithCik = projectList.filter(project => project["CIK Number"]);
    
    // Group by CIK to remove duplicates and keep only companies with ticker symbols in cik_to_ticker.json
    const uniqueProjects = {};
    projectsWithCik.forEach(project => {
      const cik = project["CIK Number"].toString();
      
      // Only add if this CIK has a ticker symbol in our mapper
      if (cikTickerMapper.hasTickerForCik(cik)) {
        if (!uniqueProjects[cik]) {
          uniqueProjects[cik] = project;
        }
      }
    });
    
    // Create options for each project with ticker
    const companies = Object.values(uniqueProjects);
    
    if (companies.length > 0) {
      // Sort companies alphabetically by name
      companies.sort((a, b) => {
        const nameA = a["Lead Organization"] || '';
        const nameB = b["Lead Organization"] || '';
        return nameA.localeCompare(nameB);
      });
      
      // Add companies to dropdown
      companies.forEach(project => {
        const cik = project["CIK Number"].toString();
        const companyInfo = cikTickerMapper.getCompanyInfoByCik(cik);
        
        const option = document.createElement('option');
        option.value = cik;
        option.textContent = `${project["Lead Organization"]} (${companyInfo.ticker})`;
        companySelect.appendChild(option);
      });
      
      console.log(`Found ${companies.length} companies with ticker symbols from project list`);
    } else {
      // If no companies were found, show a message
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No companies with financial data available';
      option.disabled = true;
      companySelect.appendChild(option);
      
      showErrorMessage('No companies with financial data available in your project list.');
    }
  }
  
  // Load company financials
  async function loadCompanyFinancials(cik) {
    try {
      // Show loading state
      showLoadingState();
      
      // Get ticker for the CIK
      const companyInfo = cikTickerMapper.getCompanyInfoByCik(cik);
      
      if (!companyInfo || !companyInfo.ticker) {
        throw new Error(`No ticker found for CIK: ${cik}`);
      }
      
      const ticker = companyInfo.ticker;
      
      // Fetch financial data using our provider service
      const data = await financialDataProvider.getCompanyFinancials(ticker);
      
      // Store the data in a more organized structure
      currentFinancialData = {
        cik: cik,
        ticker: ticker,
        companyName: companyInfo.title,
        profile: data.profile,
        incomeStatement: data.income,
        balanceSheet: data.balance,
        cashFlow: data.cashflow,
        metrics: data.metrics
      };
      
      // Update UI with the data
      updateFinancialDisplay();
      
    } catch (error) {
      console.error('Error loading company financials:', error);
      showErrorMessage(`Failed to load financial data: ${error.message}`);
      hideLoadingState();
    }
  }
  
  // Update the display with current financial data
  function updateFinancialDisplay() {
    if (!currentFinancialData) {
      showErrorMessage('No financial data available');
      return;
    }
    
    // Update metric cards
    updateMetricCards();
    
    // Update charts
    updateCharts();
    
    // Update active financial statement
    const activeTab = document.querySelector('.tab-button.active').dataset.tab;
    displayFinancialStatement(activeTab);
    
    // Remove loading state
    hideLoadingState();
  }
  
  // Update metric cards with current data - updated to use new data structure
  function updateMetricCards() {
    if (!currentFinancialData) return;
    
    const profile = currentFinancialData.profile;
    const income = currentFinancialData.incomeStatement;
    const metrics = currentFinancialData.metrics;
    
    // Get reports based on current period
    const reports = currentPeriod === 'annual' ? income.annualReports : income.quarterlyReports;
    
    // Get latest data
    const latestReport = reports && reports.length > 0 ? reports[0] : null;
    
    // Get previous period data for comparison
    const previousReport = reports && reports.length > 1 ? reports[1] : null;
    
    // Revenue
    const revenueValue = latestReport ? 
      yahooFinanceService.formatFinancialValue(latestReport.revenue) : 'N/A';
    
    const revenueChange = (latestReport && previousReport) ? 
      yahooFinanceService.calculatePercentChange(
        latestReport.revenue, 
        previousReport.revenue
      ) : 'N/A';
    
    // Net Income
    const netIncomeValue = latestReport ? 
      yahooFinanceService.formatFinancialValue(latestReport.netIncome) : 'N/A';
    
    const netIncomeChange = (latestReport && previousReport) ? 
      yahooFinanceService.calculatePercentChange(
        latestReport.netIncome, 
        previousReport.netIncome
      ) : 'N/A';
    
    // EPS
    const epsValue = latestReport && latestReport.eps ? 
      `$${parseFloat(latestReport.eps).toFixed(2)}` : 'N/A';
    
    const epsChange = (latestReport && previousReport && latestReport.eps && previousReport.eps) ? 
      yahooFinanceService.calculatePercentChange(
        latestReport.eps, 
        previousReport.eps
      ) : 'N/A';
    
    // P/E Ratio - using profile data if available
    const peRatioValue = profile && profile.peRatio ? 
      parseFloat(profile.peRatio).toFixed(2) : 'N/A';
    
    // For PE ratio change, we can use key metrics if available
    let peRatioChange = 'N/A';
    if (metrics && metrics.metrics && metrics.metrics.length >= 2) {
      const latestMetric = metrics.metrics[0];
      const prevMetric = metrics.metrics[1];
      
      if (latestMetric.peRatio && prevMetric.peRatio) {
        peRatioChange = yahooFinanceService.calculatePercentChange(
          latestMetric.peRatio,
          prevMetric.peRatio
        );
      }
    }
    
    // Update the cards
    const cards = document.querySelectorAll('.metric-card');
    
    // Revenue card
    if (cards[0]) {
      cards[0].querySelector('.metric-value').textContent = revenueValue;
      updateMetricChange(cards[0].querySelector('.metric-change'), revenueChange);
    }
    
    // Net Income card
    if (cards[1]) {
      cards[1].querySelector('.metric-value').textContent = netIncomeValue;
      updateMetricChange(cards[1].querySelector('.metric-change'), netIncomeChange);
    }
    
    // EPS card
    if (cards[2]) {
      cards[2].querySelector('.metric-value').textContent = epsValue;
      updateMetricChange(cards[2].querySelector('.metric-change'), epsChange);
    }
    
    // P/E Ratio card
    if (cards[3]) {
      cards[3].querySelector('.metric-value').textContent = peRatioValue;
      updateMetricChange(cards[3].querySelector('.metric-change'), peRatioChange);
    }
    
    // Update period indicator
    updatePeriodIndicator();
  }
  
  // Update period indicator
  function updatePeriodIndicator() {
    const periodIndicator = document.getElementById('current-period-indicator');
    if (!periodIndicator) return;
    
    const income = currentFinancialData.incomeStatement;
    const reports = currentPeriod === 'annual' ? income.annualReports : income.quarterlyReports;
    
    if (reports && reports.length > 0) {
      const latestDate = reports[0].date;
      const formattedDate = yahooFinanceService.formatReportDate(latestDate, currentPeriod === 'quarterly');
      periodIndicator.textContent = formattedDate;
    } else {
      periodIndicator.textContent = 'N/A';
    }
  }
  
  // Update a metric change element
  function updateMetricChange(element, changeText) {
    element.textContent = changeText === 'N/A' ? 'N/A' : `${changeText} YoY`;
    
    // Reset classes
    element.classList.remove('positive', 'negative');
    
    // Add appropriate class
    if (changeText.startsWith('+')) {
      element.classList.add('positive');
    } else if (changeText.startsWith('-')) {
      element.classList.add('negative');
    }
  }
  
  // Display financial statement based on type
  function displayFinancialStatement(statementType) {
    if (!currentFinancialData) {
      statementContainer.innerHTML = '<div class="no-data">No financial data available</div>';
      return;
    }
    
    // For metrics tab, use the financial metrics module
    if (statementType === 'metrics') {
      financialMetrics.displayFinancialMetrics(currentFinancialData, statementContainer);
      return;
    }
    
    // For other statements, continue with existing code
    let reportData = [];
    
    switch (statementType) {
      case 'income':
        reportData = prepareIncomeStatementData();
        break;
      case 'balance':
        reportData = prepareBalanceSheetData();
        break;
      case 'cashFlow':
        reportData = prepareCashFlowData();
        break;
      default:
        statementContainer.innerHTML = '<div class="no-data">Invalid statement type</div>';
        return;
    }
    
    if (!reportData || reportData.length === 0) {
      statementContainer.innerHTML = '<div class="no-data">No data available for this statement</div>';
      return;
    }
    
    // Create visualization container
    const container = document.createElement('div');
    container.className = 'financial-report-container';
    
    // Create table
    const table = document.createElement('table');
    table.className = 'financial-table';
    
    // Get report dates for column headers
    const reportsData = reportData[0].periods.slice(0, 5); // Limit to 5 periods for better display
    
    // Create header row
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // Add item column header
    const itemHeader = document.createElement('th');
    itemHeader.textContent = 'Item';
    headerRow.appendChild(itemHeader);
    
    // Add period column headers
    reportsData.forEach(period => {
      const periodHeader = document.createElement('th');
      periodHeader.textContent = period.label;
      headerRow.appendChild(periodHeader);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create table body
    const tbody = document.createElement('tbody');
    
    // Add rows for each item
    reportData.forEach(row => {
      const tr = document.createElement('tr');
      
      // Add item name cell
      const itemCell = document.createElement('td');
      itemCell.textContent = row.item;
      itemCell.className = 'item-name';
      tr.appendChild(itemCell);
      
      // Add period value cells (limit to 5 periods)
      row.periods.slice(0, 5).forEach(period => {
        const valueCell = document.createElement('td');
        valueCell.textContent = period.value;
        
        // Add trend indicator for changes
        if (period.change) {
          valueCell.className = period.change.startsWith('+') ? 'positive' : period.change.startsWith('-') ? 'negative' : '';
          
          // Create tooltip with change percentage
          const tooltip = document.createElement('span');
          tooltip.className = 'change-tooltip';
          tooltip.textContent = period.change;
          valueCell.appendChild(tooltip);
        }
        
        tr.appendChild(valueCell);
      });
      
      tbody.appendChild(tr);
    });
    
    table.appendChild(tbody);
    container.appendChild(table);
    
    statementContainer.innerHTML = '';
    statementContainer.appendChild(container);
  }
  
  // Prepare income statement data for display - with multi-period support
  function prepareIncomeStatementData() {
    const incomeData = currentFinancialData.incomeStatement;
    const reports = currentPeriod === 'annual' ? incomeData.annualReports : incomeData.quarterlyReports;
    
    if (!reports || reports.length < 2) {
      return [];
    }
    
    // Function to prepare period data
    function preparePeriodData(index) {
      if (index >= reports.length) return null;
      
      const report = reports[index];
      const prevReport = index < reports.length - 1 ? reports[index + 1] : null;
      const change = prevReport ? 
        yahooFinanceService.calculatePercentChange(report.revenue, prevReport.revenue) : '';
      
      return {
        label: yahooFinanceService.formatReportDate(report.date, currentPeriod === 'quarterly'),
        value: yahooFinanceService.formatFinancialValue(report.revenue),
        rawValue: report.revenue,
        change: change
      };
    }
    
    // Prepare income statement items with multiple periods
    return [
      {
        item: "Revenue",
        periods: Array.from({ length: Math.min(reports.length, 15) }, (_, i) => {
          const report = reports[i];
          const prevReport = i < reports.length - 1 ? reports[i + 1] : null;
          const change = prevReport ? 
            yahooFinanceService.calculatePercentChange(report.revenue, prevReport.revenue) : '';
          
          return {
            label: yahooFinanceService.formatReportDate(report.date, currentPeriod === 'quarterly'),
            value: yahooFinanceService.formatFinancialValue(report.revenue),
            rawValue: report.revenue,
            change: change
          };
        })
      },
      {
        item: "Cost of Revenue",
        periods: Array.from({ length: Math.min(reports.length, 15) }, (_, i) => {
          const report = reports[i];
          const prevReport = i < reports.length - 1 ? reports[i + 1] : null;
          const change = prevReport ? 
            yahooFinanceService.calculatePercentChange(report.costOfRevenue, prevReport.costOfRevenue) : '';
          
          return {
            label: yahooFinanceService.formatReportDate(report.date, currentPeriod === 'quarterly'),
            value: yahooFinanceService.formatFinancialValue(report.costOfRevenue),
            rawValue: report.costOfRevenue,
            change: change
          };
        })
      },
      {
        item: "Gross Profit",
        periods: Array.from({ length: Math.min(reports.length, 15) }, (_, i) => {
          const report = reports[i];
          const prevReport = i < reports.length - 1 ? reports[i + 1] : null;
          const change = prevReport ? 
            yahooFinanceService.calculatePercentChange(report.grossProfit, prevReport.grossProfit) : '';
          
          return {
            label: yahooFinanceService.formatReportDate(report.date, currentPeriod === 'quarterly'),
            value: yahooFinanceService.formatFinancialValue(report.grossProfit),
            rawValue: report.grossProfit,
            change: change
          };
        })
      },
      {
        item: "Operating Expenses",
        periods: Array.from({ length: Math.min(reports.length, 15) }, (_, i) => {
          const report = reports[i];
          const prevReport = i < reports.length - 1 ? reports[i + 1] : null;
          const change = prevReport ? 
            yahooFinanceService.calculatePercentChange(report.operatingExpenses, prevReport.operatingExpenses) : '';
          
          return {
            label: yahooFinanceService.formatReportDate(report.date, currentPeriod === 'quarterly'),
            value: yahooFinanceService.formatFinancialValue(report.operatingExpenses),
            rawValue: report.operatingExpenses,
            change: change
          };
        })
      },
      {
        item: "Operating Income",
        periods: Array.from({ length: Math.min(reports.length, 15) }, (_, i) => {
          const report = reports[i];
          const prevReport = i < reports.length - 1 ? reports[i + 1] : null;
          const change = prevReport ? 
            yahooFinanceService.calculatePercentChange(report.operatingIncome, prevReport.operatingIncome) : '';
          
          return {
            label: yahooFinanceService.formatReportDate(report.date, currentPeriod === 'quarterly'),
            value: yahooFinanceService.formatFinancialValue(report.operatingIncome),
            rawValue: report.operatingIncome,
            change: change
          };
        })
      },
      {
        item: "Net Income",
        periods: Array.from({ length: Math.min(reports.length, 15) }, (_, i) => {
          const report = reports[i];
          const prevReport = i < reports.length - 1 ? reports[i + 1] : null;
          const change = prevReport ? 
            yahooFinanceService.calculatePercentChange(report.netIncome, prevReport.netIncome) : '';
          
          return {
            label: yahooFinanceService.formatReportDate(report.date, currentPeriod === 'quarterly'),
            value: yahooFinanceService.formatFinancialValue(report.netIncome),
            rawValue: report.netIncome,
            change: change
          };
        })
      },
      {
        item: "EPS",
        periods: Array.from({ length: Math.min(reports.length, 15) }, (_, i) => {
          const report = reports[i];
          const prevReport = i < reports.length - 1 ? reports[i + 1] : null;
          const change = prevReport && report.eps && prevReport.eps ? 
            yahooFinanceService.calculatePercentChange(report.eps, prevReport.eps) : '';
          
          return {
            label: yahooFinanceService.formatReportDate(report.date, currentPeriod === 'quarterly'),
            value: report.eps ? `$${parseFloat(report.eps).toFixed(2)}` : 'N/A',
            rawValue: report.eps,
            change: change
          };
        })
      }
    ];
  }
  
  // Prepare balance sheet data for display - with multi-period support
  function prepareBalanceSheetData() {
    const balanceData = currentFinancialData.balanceSheet;
    const reports = currentPeriod === 'annual' ? balanceData.annualReports : balanceData.quarterlyReports;
    
    if (!reports || reports.length < 2) {
      return [];
    }
    
    // Similar implementation as prepareIncomeStatementData for balance sheet items
    // Create multi-period rows for Total Assets, Current Assets, Cash, Total Liabilities, etc.
    return [
      {
        item: "Total Assets",
        periods: Array.from({ length: Math.min(reports.length, 15) }, (_, i) => {
          const report = reports[i];
          const prevReport = i < reports.length - 1 ? reports[i + 1] : null;
          const change = prevReport ? 
            yahooFinanceService.calculatePercentChange(report.totalAssets, prevReport.totalAssets) : '';
          
          return {
            label: yahooFinanceService.formatReportDate(report.date, currentPeriod === 'quarterly'),
            value: yahooFinanceService.formatFinancialValue(report.totalAssets),
            rawValue: report.totalAssets,
            change: change
          };
        })
      },
      {
        item: "Current Assets",
        periods: Array.from({ length: Math.min(reports.length, 15) }, (_, i) => {
          const report = reports[i];
          const prevReport = i < reports.length - 1 ? reports[i + 1] : null;
          const change = prevReport ? 
            yahooFinanceService.calculatePercentChange(report.totalCurrentAssets, prevReport.totalCurrentAssets) : '';
          
          return {
            label: yahooFinanceService.formatReportDate(report.date, currentPeriod === 'quarterly'),
            value: yahooFinanceService.formatFinancialValue(report.totalCurrentAssets),
            rawValue: report.totalCurrentAssets,
            change: change
          };
        })
      },
      {
        item: "Cash & Equivalents",
        periods: Array.from({ length: Math.min(reports.length, 15) }, (_, i) => {
          const report = reports[i];
          const prevReport = i < reports.length - 1 ? reports[i + 1] : null;
          const change = prevReport ? 
            yahooFinanceService.calculatePercentChange(report.cashAndCashEquivalents, prevReport.cashAndCashEquivalents) : '';
          
          return {
            label: yahooFinanceService.formatReportDate(report.date, currentPeriod === 'quarterly'),
            value: yahooFinanceService.formatFinancialValue(report.cashAndCashEquivalents),
            rawValue: report.cashAndCashEquivalents,
            change: change
          };
        })
      },
      {
        item: "Total Liabilities",
        periods: Array.from({ length: Math.min(reports.length, 15) }, (_, i) => {
          const report = reports[i];
          const prevReport = i < reports.length - 1 ? reports[i + 1] : null;
          const change = prevReport ? 
            yahooFinanceService.calculatePercentChange(report.totalLiabilities, prevReport.totalLiabilities) : '';
          
          return {
            label: yahooFinanceService.formatReportDate(report.date, currentPeriod === 'quarterly'),
            value: yahooFinanceService.formatFinancialValue(report.totalLiabilities),
            rawValue: report.totalLiabilities,
            change: change
          };
        })
      },
      {
        item: "Current Liabilities",
        periods: Array.from({ length: Math.min(reports.length, 15) }, (_, i) => {
          const report = reports[i];
          const prevReport = i < reports.length - 1 ? reports[i + 1] : null;
          const change = prevReport ? 
            yahooFinanceService.calculatePercentChange(report.totalCurrentLiabilities, prevReport.totalCurrentLiabilities) : '';
          
          return {
            label: yahooFinanceService.formatReportDate(report.date, currentPeriod === 'quarterly'),
            value: yahooFinanceService.formatFinancialValue(report.totalCurrentLiabilities),
            rawValue: report.totalCurrentLiabilities,
            change: change
          };
        })
      },
      {
        item: "Long-Term Debt",
        periods: Array.from({ length: Math.min(reports.length, 15) }, (_, i) => {
          const report = reports[i];
          const prevReport = i < reports.length - 1 ? reports[i + 1] : null;
          const change = prevReport ? 
            yahooFinanceService.calculatePercentChange(report.longTermDebt, prevReport.longTermDebt) : '';
          
          return {
            label: yahooFinanceService.formatReportDate(report.date, currentPeriod === 'quarterly'),
            value: yahooFinanceService.formatFinancialValue(report.longTermDebt),
            rawValue: report.longTermDebt,
            change: change
          };
        })
      },
      {
        item: "Shareholder Equity",
        periods: Array.from({ length: Math.min(reports.length, 15) }, (_, i) => {
          const report = reports[i];
          const prevReport = i < reports.length - 1 ? reports[i + 1] : null;
          const change = prevReport ? 
            yahooFinanceService.calculatePercentChange(report.totalStockholdersEquity, prevReport.totalStockholdersEquity) : '';
          
          return {
            label: yahooFinanceService.formatReportDate(report.date, currentPeriod === 'quarterly'),
            value: yahooFinanceService.formatFinancialValue(report.totalStockholdersEquity),
            rawValue: report.totalStockholdersEquity,
            change: change
          };
        })
      }
    ];
  }
  
  // Prepare cash flow data for display - with multi-period support
  function prepareCashFlowData() {
    const cashFlowData = currentFinancialData.cashFlow;
    const reports = currentPeriod === 'annual' ? cashFlowData.annualReports : cashFlowData.quarterlyReports;
    
    if (!reports || reports.length < 2) {
      return [];
    }
    
    // Similar implementation as prepareIncomeStatementData for cash flow items
    // Create multi-period rows for Operating Cash Flow, CapEx, Free Cash Flow, etc.
    return [
      {
        item: "Operating Cash Flow",
        periods: Array.from({ length: Math.min(reports.length, 15) }, (_, i) => {
          const report = reports[i];
          const prevReport = i < reports.length - 1 ? reports[i + 1] : null;
          const change = prevReport ? 
            yahooFinanceService.calculatePercentChange(report.operatingCashFlow, prevReport.operatingCashFlow) : '';
          
          return {
            label: yahooFinanceService.formatReportDate(report.date, currentPeriod === 'quarterly'),
            value: yahooFinanceService.formatFinancialValue(report.operatingCashFlow),
            rawValue: report.operatingCashFlow,
            change: change
          };
        })
      },
      {
        item: "Capital Expenditures",
        periods: Array.from({ length: Math.min(reports.length, 15) }, (_, i) => {
          const report = reports[i];
          const prevReport = i < reports.length - 1 ? reports[i + 1] : null;
          const change = prevReport ? 
            yahooFinanceService.calculatePercentChange(report.capitalExpenditure, prevReport.capitalExpenditure) : '';
          
          return {
            label: yahooFinanceService.formatReportDate(report.date, currentPeriod === 'quarterly'),
            value: yahooFinanceService.formatFinancialValue(report.capitalExpenditure),
            rawValue: report.capitalExpenditure,
            change: change
          };
        })
      },
      {
        item: "Free Cash Flow",
        periods: Array.from({ length: Math.min(reports.length, 15) }, (_, i) => {
          const report = reports[i];
          const prevReport = i < reports.length - 1 ? reports[i + 1] : null;
          const change = prevReport ? 
            yahooFinanceService.calculatePercentChange(report.freeCashFlow, prevReport.freeCashFlow) : '';
          
          return {
            label: yahooFinanceService.formatReportDate(report.date, currentPeriod === 'quarterly'),
            value: yahooFinanceService.formatFinancialValue(report.freeCashFlow),
            rawValue: report.freeCashFlow,
            change: change
          };
        })
      },
      {
        item: "Cash from Investing",
        periods: Array.from({ length: Math.min(reports.length, 15) }, (_, i) => {
          const report = reports[i];
          const prevReport = i < reports.length - 1 ? reports[i + 1] : null;
          const change = prevReport ? 
            yahooFinanceService.calculatePercentChange(report.netCashUsedForInvestingActivites, prevReport.netCashUsedForInvestingActivites) : '';
          
          return {
            label: yahooFinanceService.formatReportDate(report.date, currentPeriod === 'quarterly'),
            value: yahooFinanceService.formatFinancialValue(report.netCashUsedForInvestingActivites),
            rawValue: report.netCashUsedForInvestingActivites,
            change: change
          };
        })
      },
      {
        item: "Cash from Financing",
        periods: Array.from({ length: Math.min(reports.length, 15) }, (_, i) => {
          const report = reports[i];
          const prevReport = i < reports.length - 1 ? reports[i + 1] : null;
          const change = prevReport ? 
            yahooFinanceService.calculatePercentChange(report.netCashUsedProvidedByFinancingActivities, prevReport.netCashUsedProvidedByFinancingActivities) : '';
          
          return {
            label: yahooFinanceService.formatReportDate(report.date, currentPeriod === 'quarterly'),
            value: yahooFinanceService.formatFinancialValue(report.netCashUsedProvidedByFinancingActivities),
            rawValue: report.netCashUsedProvidedByFinancingActivities,
            change: change
          };
        })
      },
      {
        item: "Dividend Payout",
        periods: Array.from({ length: Math.min(reports.length, 15) }, (_, i) => {
          const report = reports[i];
          const prevReport = i < reports.length - 1 ? reports[i + 1] : null;
          const change = prevReport ? 
            yahooFinanceService.calculatePercentChange(report.dividendsPaid, prevReport.dividendsPaid) : '';
          
          return {
            label: yahooFinanceService.formatReportDate(report.date, currentPeriod === 'quarterly'),
            value: yahooFinanceService.formatFinancialValue(report.dividendsPaid),
            rawValue: report.dividendsPaid,
            change: change
          };
        })
      },
      {
        item: "Net Change in Cash",
        periods: Array.from({ length: Math.min(reports.length, 15) }, (_, i) => {
          const report = reports[i];
          const prevReport = i < reports.length - 1 ? reports[i + 1] : null;
          const change = prevReport ? 
            yahooFinanceService.calculatePercentChange(report.netChangeInCash, prevReport.netChangeInCash) : '';
          
          return {
            label: yahooFinanceService.formatReportDate(report.date, currentPeriod === 'quarterly'),
            value: yahooFinanceService.formatFinancialValue(report.netChangeInCash),
            rawValue: report.netChangeInCash,
            change: change
          };
        })
      }
    ];
  }
  
  // Update charts with current data
  function updateCharts() {
    if (!currentFinancialData) return;
    
    const income = currentFinancialData.incomeStatement;
    
    // Get all available annual reports (up to 4)
    const reports = income.annualReports || [];
    const recentReports = reports.slice(0, 4);
    
    // Get max revenue for scaling
    const maxRevenue = Math.max(...recentReports.map(r => parseFloat(r.revenue) || 0));
    
    // Revenue chart
    const revenueChart = document.getElementById('revenue-chart');
    let revenueChartHtml = `<div class="chart-placeholder"><div class="chart-bars">`;
    
    // Create bars for each year
    recentReports.forEach((report, index) => {
      const year = report.date ? report.date.substring(0, 4) : `Year ${index+1}`;
      // Scale the height based on revenue relative to max
      const revenue = parseFloat(report.revenue) || 0;
      const height = Math.max(10, Math.round((revenue / maxRevenue) * 80));
      
      revenueChartHtml += `
        <div class="chart-bar" style="height: ${height}%;"><span>${year}</span></div>
      `;
    });
    
    revenueChartHtml += `</div>
      <div class="chart-label">Annual Revenue (${currentFinancialData.ticker})</div>
    </div>`;
    
    revenueChart.innerHTML = revenueChartHtml;
    
    // Margins chart
    const marginsChart = document.getElementById('margins-chart');
    
    // Calculate margins from latest report
    const latestReport = reports[0];
    let grossMargin = 'N/A';
    let operatingMargin = 'N/A';
    let netMargin = 'N/A';
    
    if (latestReport) {
      const revenue = parseFloat(latestReport.revenue);
      if (revenue > 0) {
        grossMargin = ((parseFloat(latestReport.grossProfit) || 0) / revenue * 100).toFixed(1) + '%';
        operatingMargin = ((parseFloat(latestReport.operatingIncome) || 0) / revenue * 100).toFixed(1) + '%';
        netMargin = ((parseFloat(latestReport.netIncome) || 0) / revenue * 100).toFixed(1) + '%';
      }
    }
    
    marginsChart.innerHTML = `

      <div class="chart-placeholder">
        <div class="chart-lines">
          <div class="chart-line gross" style="top: 25%"></div>
          <div class="chart-line operating" style="top: 45%"></div>
          <div class="chart-line net" style="top: 65%"></div>
        </div>
        <div class="chart-labels">
          <div class="chart-line-label" style="top: 25%">Gross Margin: ${grossMargin}</div>
          <div class="chart-line-label" style="top: 45%">Operating Margin: ${operatingMargin}</div>
          <div class="chart-line-label" style="top: 65%">Net Margin: ${netMargin}</div>
        </div>
      </div>
    `;
  }
  
  // Initialize chart placeholders
  function initChartPlaceholders() {
    const revenueChart = document.getElementById('revenue-chart');
    const marginsChart = document.getElementById('margins-chart');
    
    // Create placeholder chart elements
    revenueChart.innerHTML = `
      <div class="chart-placeholder">
        <div class="chart-bars">
          <div class="chart-bar" style="height: 60%;"><span>2023</span></div>
          <div class="chart-bar" style="height: 50%;"><span>2022</span></div>
          <div class="chart-bar" style="height: 40%;"><span>2021</span></div>
          <div class="chart-bar" style="height: 30%;"><span>2020</span></div>
        </div>
        <div class="chart-label">Annual Revenue</div>
      </div>
    `;
    
    marginsChart.innerHTML = `
      <div class="chart-placeholder">
        <div class="chart-lines">
          <div class="chart-line gross" style="top: 25%"></div>
          <div class="chart-line operating" style="top: 45%"></div>
          <div class="chart-line net" style="top: 65%"></div>
        </div>
        <div class="chart-labels">
          <div class="chart-line-label" style="top: 25%">Gross Margin: N/A</div>
          <div class="chart-line-label" style="top: 45%">Operating Margin: N/A</div>
          <div class="chart-line-label" style="top: 65%">Net Margin: N/A</div>
        </div>
      </div>
    `;
  }
  
  // Show loading state
  function showLoadingState() {
    const loadingHtml = `
      <div class="loading-overlay">
        <div class="loading-spinner"></div>
        <div class="loading-text">Loading financial data...</div>
      </div>
    `;
    
    // Create loading overlay if it doesn't exist
    if (!document.querySelector('.loading-overlay')) {
      const loadingDiv = document.createElement('div');
      loadingDiv.innerHTML = loadingHtml;
      document.getElementById('financials-container').appendChild(loadingDiv.firstElementChild);
    }
    
    // Disable the dropdown
    companySelect.disabled = true;
  }
  
  // Hide loading state
  function hideLoadingState() {
    // Remove loading overlay
    const loadingOverlay = document.querySelector('.loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.remove();
    }
    
    // Enable the dropdown
    companySelect.disabled = false;
  }
  
  // Show error message
  function showErrorMessage(message) {
    const errorHtml = `
      <div class="error-message">
        <i class="fa-solid fa-triangle-exclamation"></i>
        ${message}
      </div>
    `;
    
    statementContainer.innerHTML = errorHtml;
    hideLoadingState();
  }
  
  // Event listeners
  companySelect.addEventListener('change', async (e) => {
    const cik = e.target.value;
    if (cik) {
      await loadCompanyFinancials(cik);
    }
  });
  
  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Update active tab
      tabButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
      
      // Display corresponding statement
      const tabType = this.dataset.tab;
      displayFinancialStatement(tabType);
    });
  });
  
  // Initialize the page
  initialize();
});
