/**
 * Financial Metrics Module
 * Handles calculation and display of financial metrics and shareholders for the dashboard
 */

const financialMetrics = {
  // Display financial metrics dashboard
  displayFinancialMetrics: function(currentFinancialData, statementContainer) {
    if (!currentFinancialData) {
      statementContainer.innerHTML = '<div class="no-data">No financial data available</div>';
      return;
    }
    
    const income = currentFinancialData.incomeStatement;
    const balance = currentFinancialData.balanceSheet;
    const cashflow = currentFinancialData.cashFlow;
    const holders = currentFinancialData.holders;
    
    // Get reports based on current period
    const currentPeriod = 'annual'; // We typically want annual data for metrics
    const incomeReports = income.annualReports || [];
    const balanceReports = balance.annualReports || [];
    const cashflowReports = cashflow.annualReports || [];
    
    // Need at least current and previous periods
    if (incomeReports.length < 1 || balanceReports.length < 1) {
      statementContainer.innerHTML = '<div class="no-data">Insufficient data to calculate financial metrics</div>';
      return;
    }
    
    // Create container for metrics
    const container = document.createElement('div');
    container.className = 'metrics-container';
    
    // Add profitability metrics group
    container.appendChild(this.createMetricsGroup(
      'Profitability Metrics',
      this.calculateProfitabilityMetrics(incomeReports)
    ));
    
    // Add liquidity metrics group
    container.appendChild(this.createMetricsGroup(
      'Liquidity & Solvency Metrics',
      this.calculateLiquidityMetrics(balanceReports, incomeReports)
    ));
    
    // Add efficiency metrics group
    container.appendChild(this.createMetricsGroup(
      'Efficiency Metrics',
      this.calculateEfficiencyMetrics(incomeReports, balanceReports)
    ));
    
    // Add major shareholders group if available
    if (holders && holders.institutionalHolders && holders.institutionalHolders.length > 0) {
      container.appendChild(this.createShareholdersTable(
        'Top Institutional Holders',
        holders.institutionalHolders
      ));
    }
    
    // Update the statement container
    statementContainer.innerHTML = '';
    statementContainer.appendChild(container);
  },
  
  // Create a metrics group element
  createMetricsGroup: function(title, metrics) {
    const group = document.createElement('div');
    group.className = 'metrics-group';
    
    const titleElement = document.createElement('h3');
    titleElement.className = 'metrics-group-title';
    titleElement.textContent = title;
    group.appendChild(titleElement);
    
    // Create metrics table
    const table = document.createElement('table');
    table.className = 'metrics-table';
    
    // Add metrics rows
    metrics.forEach(metric => {
      const row = document.createElement('tr');
      
      // Metric name with tooltip
      const nameCell = document.createElement('td');
      nameCell.className = 'metric-name';
      nameCell.innerHTML = `
        ${metric.name}
        <i class="fa-solid fa-circle-info info-icon"></i>
        <div class="info-tooltip">${metric.tooltip}</div>
      `;
      row.appendChild(nameCell);
      
      // Value and change
      const valueCell = document.createElement('td');
      valueCell.innerHTML = `
        <span class="value">${metric.value}</span>
        <span class="change ${this.getChangeClass(metric.change)}">${metric.change !== 'N/A' ? metric.change : ''}</span>
        <span class="benchmark">${metric.benchmark ? 'Industry: ' + metric.benchmark : ''}</span>
      `;
      row.appendChild(valueCell);
      
      // Status indicator
      const statusCell = document.createElement('td');
      statusCell.className = 'status';
      statusCell.innerHTML = `<span class="status-icon status-${metric.status}"></span>`;
      row.appendChild(statusCell);
      
      table.appendChild(row);
    });
    
    group.appendChild(table);
    return group;
  },
  
  // Create a shareholders table element
  createShareholdersTable: function(title, shareholders) {
    const group = document.createElement('div');
    group.className = 'metrics-group';
    
    const titleElement = document.createElement('h3');
    titleElement.className = 'metrics-group-title';
    titleElement.textContent = title;
    group.appendChild(titleElement);
    
    // Create table
    const table = document.createElement('table');
    table.className = 'metrics-table';
    
    // Table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    ['Institution', 'Shares', 'Date Reported', '% of Shares'].forEach(header => {
      const th = document.createElement('th');
      th.textContent = header;
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Table body
    const tbody = document.createElement('tbody');
    
    shareholders.forEach(holder => {
      const row = document.createElement('tr');
      
      // Institution name
      const nameCell = document.createElement('td');
      nameCell.textContent = holder.name;
      row.appendChild(nameCell);
      
      // Shares
      const sharesCell = document.createElement('td');
      sharesCell.textContent = this.formatNumber(holder.shares);
      row.appendChild(sharesCell);
      
      // Date reported
      const dateCell = document.createElement('td');
      dateCell.textContent = holder.dateReported;
      row.appendChild(dateCell);
      
      // Percentage
      const percentCell = document.createElement('td');
      percentCell.textContent = (holder.percentHeld * 100).toFixed(2) + '%';
      row.appendChild(percentCell);
      
      tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    group.appendChild(table);
    return group;
  },
  
  // Calculate profitability metrics
  calculateProfitabilityMetrics: function(incomeReports) {
    if (!incomeReports || incomeReports.length === 0) return [];
    
    // Get latest and previous years
    const latestReport = incomeReports[0];
    const previousReport = incomeReports.length > 1 ? incomeReports[1] : null;
    
    // Calculate metrics
    const revenue = latestReport.revenue || 0;
    const prevRevenue = previousReport ? previousReport.revenue || 0 : 0;
    
    const grossProfit = latestReport.grossProfit || 0;
    const prevGrossProfit = previousReport ? previousReport.grossProfit || 0 : 0;
    
    const operatingIncome = latestReport.operatingIncome || 0;
    const prevOperatingIncome = previousReport ? previousReport.operatingIncome || 0 : 0;
    
    const netIncome = latestReport.netIncome || 0;
    const prevNetIncome = previousReport ? previousReport.netIncome || 0 : 0;
    
    // Calculate ratios
    const grossMargin = this.safeDiv(grossProfit, revenue);
    const prevGrossMargin = this.safeDiv(prevGrossProfit, prevRevenue);
    
    const operatingMargin = this.safeDiv(operatingIncome, revenue);
    const prevOperatingMargin = this.safeDiv(prevOperatingIncome, prevRevenue);
    
    const netMargin = this.safeDiv(netIncome, revenue);
    const prevNetMargin = this.safeDiv(prevNetIncome, prevRevenue);
    
    // Return metrics array
    return [
      {
        name: 'Gross Margin',
        value: this.formatPercentage(grossMargin),
        change: this.calculatePercentageChange(grossMargin, prevGrossMargin),
        benchmark: '30-50%',
        status: this.getStatusForRatio(grossMargin, 0.3, 0.5),
        tooltip: 'Gross profit as a percentage of revenue. Shows how efficiently a company converts raw materials to finished products.'
      },
      {
        name: 'Operating Margin',
        value: this.formatPercentage(operatingMargin),
        change: this.calculatePercentageChange(operatingMargin, prevOperatingMargin),
        benchmark: '15-30%',
        status: this.getStatusForRatio(operatingMargin, 0.15, 0.3),
        tooltip: 'Operating income as a percentage of revenue. Measures how much profit a company makes from its core business operations.'
      },
      {
        name: 'Net Profit Margin',
        value: this.formatPercentage(netMargin),
        change: this.calculatePercentageChange(netMargin, prevNetMargin),
        benchmark: '10-20%',
        status: this.getStatusForRatio(netMargin, 0.1, 0.2),
        tooltip: 'Net income as a percentage of revenue. Shows how much of each dollar of revenue is converted to profit.'
      },
      {
        name: 'Revenue Growth',
        value: previousReport ? this.calculatePercentageChange(revenue, prevRevenue) : 'N/A',
        change: 'N/A',
        benchmark: '>10%',
        status: previousReport ? this.getStatusForGrowth(revenue, prevRevenue, 0.05, 0.1) : 'neutral',
        tooltip: 'Year-over-year change in revenue. Shows how quickly the company is growing.'
      }
    ];
  },
  
  // Calculate liquidity metrics
  calculateLiquidityMetrics: function(balanceReports, incomeReports) {
    if (!balanceReports || balanceReports.length === 0) return [];
    
    // Get latest balance sheet
    const latestBalance = balanceReports[0];
    const prevBalance = balanceReports.length > 1 ? balanceReports[1] : null;
    
    // Get latest income for interest coverage
    const latestIncome = incomeReports.length > 0 ? incomeReports[0] : null;
    const prevIncome = incomeReports.length > 1 ? incomeReports[1] : null;
    
    // Calculate metrics
    const currentAssets = latestBalance.totalCurrentAssets || 0;
    const prevCurrentAssets = prevBalance ? prevBalance.totalCurrentAssets || 0 : 0;
    
    const currentLiabilities = latestBalance.totalCurrentLiabilities || 0;
    const prevCurrentLiabilities = prevBalance ? prevBalance.totalCurrentLiabilities || 0 : 0;
    
    const cash = latestBalance.cashAndCashEquivalents || 0;
    const prevCash = prevBalance ? prevBalance.cashAndCashEquivalents || 0 : 0;
    
    const inventory = latestBalance.inventory || 0;
    const totalAssets = latestBalance.totalAssets || 0;
    const totalLiabilities = latestBalance.totalLiabilities || 0;
    const totalEquity = latestBalance.totalStockholdersEquity || 0;
    
    // Calculate ratios
    const currentRatio = this.safeDiv(currentAssets, currentLiabilities);
    const prevCurrentRatio = this.safeDiv(prevCurrentAssets, prevCurrentLiabilities);
    
    const quickRatio = this.safeDiv(currentAssets - inventory, currentLiabilities);
    const prevQuickRatio = prevBalance ? this.safeDiv(prevCurrentAssets - (prevBalance.inventory || 0), prevCurrentLiabilities) : 0;
    
    const cashRatio = this.safeDiv(cash, currentLiabilities);
    const prevCashRatio = this.safeDiv(prevCash, prevCurrentLiabilities);
    
    const debtToEquity = this.safeDiv(totalLiabilities, totalEquity);
    const debtToAssets = this.safeDiv(totalLiabilities, totalAssets);
    
    // Interest coverage ratio (if income data available)
    let interestCoverage = 0;
    let prevInterestCoverage = 0;
    
    if (latestIncome) {
      const operatingIncome = latestIncome.operatingIncome || 0;
      const interestExpense = Math.abs(latestIncome.interestExpense || 0);
      interestCoverage = interestExpense ? operatingIncome / interestExpense : 0;
      
      if (prevIncome) {
        const prevOperatingIncome = prevIncome.operatingIncome || 0;
        const prevInterestExpense = Math.abs(prevIncome.interestExpense || 0);
        prevInterestCoverage = prevInterestExpense ? prevOperatingIncome / prevInterestExpense : 0;
      }
    }
    
    // Return metrics array
    return [
      {
        name: 'Current Ratio',
        value: this.formatRatio(currentRatio),
        change: this.calculatePercentageChange(currentRatio, prevCurrentRatio),
        benchmark: '1.5-3.0',
        status: this.getStatusForRatio(currentRatio, 1.2, 1.5),
        tooltip: 'Current assets divided by current liabilities. Measures a company\'s ability to pay short-term obligations.'
      },
      {
        name: 'Quick Ratio',
        value: this.formatRatio(quickRatio),
        change: this.calculatePercentageChange(quickRatio, prevQuickRatio),
        benchmark: '>1.0',
        status: this.getStatusForRatio(quickRatio, 0.8, 1.0),
        tooltip: 'Current assets minus inventory, divided by current liabilities. A more stringent measure of liquidity.'
      },
      {
        name: 'Cash Ratio',
        value: this.formatRatio(cashRatio),
        change: this.calculatePercentageChange(cashRatio, prevCashRatio),
        benchmark: '>0.5',
        status: this.getStatusForRatio(cashRatio, 0.2, 0.5),
        tooltip: 'Cash and cash equivalents divided by current liabilities. Measures ability to cover short-term debt with cash.'
      },
      {
        name: 'Debt-to-Equity',
        value: this.formatRatio(debtToEquity),
        change: 'N/A',
        benchmark: '<2.0',
        status: this.getStatusForRatio(debtToEquity, 2.0, 1.0, true), // Reversed thresholds (lower is better)
        tooltip: 'Total liabilities divided by shareholders\' equity. Shows the extent to which a company is financing operations through debt.'
      },
      {
        name: 'Interest Coverage',
        value: this.formatRatio(interestCoverage),
        change: this.calculatePercentageChange(interestCoverage, prevInterestCoverage),
        benchmark: '>3.0',
        status: this.getStatusForRatio(interestCoverage, 1.5, 3.0),
        tooltip: 'Operating income divided by interest expense. Shows how easily a company can pay interest on its debt.'
      }
    ];
  },
  
  // Calculate efficiency metrics
  calculateEfficiencyMetrics: function(incomeReports, balanceReports) {
    if (!incomeReports || incomeReports.length === 0 || !balanceReports || balanceReports.length === 0) return [];
    
    // Get latest reports
    const latestIncome = incomeReports[0];
    const latestBalance = balanceReports[0];
    const prevIncome = incomeReports.length > 1 ? incomeReports[1] : null;
    const prevBalance = balanceReports.length > 1 ? balanceReports[1] : null;
    
    // Calculate metrics
    const revenue = latestIncome.revenue || 0;
    const netIncome = latestIncome.netIncome || 0;
    const totalAssets = latestBalance.totalAssets || 0;
    const totalEquity = latestBalance.totalStockholdersEquity || 0;
    
    // Previous values for comparison
    const prevRevenue = prevIncome ? prevIncome.revenue || 0 : 0;
    const prevNetIncome = prevIncome ? prevIncome.netIncome || 0 : 0;
    const prevTotalAssets = prevBalance ? prevBalance.totalAssets || 0 : 0;
    const prevTotalEquity = prevBalance ? prevBalance.totalStockholdersEquity || 0 : 0;
    
    // Calculate average values between current and previous year
    const avgTotalAssets = (totalAssets + prevTotalAssets) / 2;
    const avgTotalEquity = (totalEquity + prevTotalEquity) / 2;
    
    // Calculate ratios
    const roa = this.safeDiv(netIncome, avgTotalAssets);
    const prevRoa = prevIncome && prevBalance ? this.safeDiv(prevNetIncome, prevTotalAssets) : 0;
    
    const roe = this.safeDiv(netIncome, avgTotalEquity);
    const prevRoe = prevIncome && prevBalance ? this.safeDiv(prevNetIncome, prevTotalEquity) : 0;
    
    const assetTurnover = this.safeDiv(revenue, avgTotalAssets);
    const prevAssetTurnover = prevIncome && prevBalance ? this.safeDiv(prevRevenue, prevTotalAssets) : 0;
    
    // Return metrics array
    return [
      {
        name: 'Return on Assets (ROA)',
        value: this.formatPercentage(roa),
        change: this.calculatePercentageChange(roa, prevRoa),
        benchmark: '>5%',
        status: this.getStatusForRatio(roa, 0.03, 0.05),
        tooltip: 'Net income divided by average total assets. Measures how efficiently a company uses its assets to generate profit.'
      },
      {
        name: 'Return on Equity (ROE)',
        value: this.formatPercentage(roe),
        change: this.calculatePercentageChange(roe, prevRoe),
        benchmark: '>15%',
        status: this.getStatusForRatio(roe, 0.1, 0.15),
        tooltip: 'Net income divided by average shareholders\' equity. Shows how effectively a company uses equity to generate profit.'
      },
      {
        name: 'Asset Turnover',
        value: this.formatRatio(assetTurnover),
        change: this.calculatePercentageChange(assetTurnover, prevAssetTurnover),
        benchmark: '>0.5',
        status: this.getStatusForRatio(assetTurnover, 0.3, 0.5),
        tooltip: 'Revenue divided by average total assets. Shows how efficiently a company uses its assets to generate revenue.'
      },
      {
        name: 'Profit Margin',
        value: this.formatPercentage(this.safeDiv(netIncome, revenue)),
        change: prevIncome ? this.calculatePercentageChange(
          this.safeDiv(netIncome, revenue), 
          this.safeDiv(prevNetIncome, prevRevenue)
        ) : 'N/A',
        benchmark: '>10%',
        status: this.getStatusForRatio(this.safeDiv(netIncome, revenue), 0.05, 0.1),
        tooltip: 'Net income divided by revenue. Shows how much profit is generated from each dollar of revenue.'
      }
    ];
  },
  
  // Safe division to avoid division by zero
  safeDiv: function(numerator, denominator) {
    return denominator !== 0 ? numerator / denominator : 0;
  },
  
  // Format a ratio value
  formatRatio: function(value) {
    if (isNaN(value) || value === null) return 'N/A';
    return value.toFixed(2);
  },
  
  // Format a percentage value
  formatPercentage: function(value) {
    if (isNaN(value) || value === null) return 'N/A';
    return (value * 100).toFixed(2) + '%';
  },
  
  // Calculate percentage change
  calculatePercentageChange: function(current, previous) {
    if (isNaN(current) || isNaN(previous) || previous === 0) return 'N/A';
    const change = ((current - previous) / Math.abs(previous)) * 100;
    return (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
  },
  
  // Get status class for a ratio
  getStatusForRatio: function(value, threshold1, threshold2, reversed = false) {
    if (isNaN(value) || value === null) return 'neutral';
    
    if (reversed) {
      // For metrics where lower is better (like debt ratios)
      if (value <= threshold2) return 'good';
      if (value <= threshold1) return 'warning';
      return 'bad';
    } else {
      // For metrics where higher is better
      if (value >= threshold2) return 'good';
      if (value >= threshold1) return 'warning';
      return 'bad';
    }
  },
  
  // Get status class for growth metrics
  getStatusForGrowth: function(current, previous, threshold1, threshold2) {
    if (isNaN(current) || isNaN(previous) || previous === 0) return 'neutral';
    
    const growthRate = (current - previous) / Math.abs(previous);
    
    if (growthRate >= threshold2) return 'good';
    if (growthRate >= threshold1) return 'warning';
    return 'bad';
  },
  
  // Get CSS class for change values
  getChangeClass: function(change) {
    if (change === 'N/A') return '';
    return change.startsWith('+') ? 'positive' : change.startsWith('-') ? 'negative' : '';
  },
  
  // Format a number with commas
  formatNumber: function(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
};
