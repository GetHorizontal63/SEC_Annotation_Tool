// Companies page JavaScript

// Add these variables at the top-level scope to ensure they're accessible throughout
let companiesList;
let selectedCompany = null;
let filteredCompanies = [];

// Define chart instances at the top level for proper management
let cashChart = null;
let performanceChart = null;
let balanceChart = null;
let cashflowChart = null;

document.addEventListener('DOMContentLoaded', function() {
  // DOM elements - store references for global access
  companiesList = document.getElementById('companies-list');
  const companiesSearch = document.getElementById('companies-search');
  const toggleFiltersBtn = document.getElementById('toggle-filters-btn');
  const filtersPanel = document.getElementById('filters-panel');
  const subprogramFilter = document.getElementById('subprogram-filter');
  const filingsCountFilter = document.getElementById('filings-count-filter');
  const annotationsFilter = document.getElementById('annotations-filter');
  const applyFiltersBtn = document.getElementById('apply-filters');
  const resetFiltersBtn = document.getElementById('reset-filters');
  const exportCsvBtn = document.getElementById('export-csv-btn');
  
  // Company profile elements
  const companyName = document.getElementById('company-name');
  const companyCik = document.getElementById('company-regulatory-id');
  const companyOffice = document.getElementById('company-office');
  const companyTickerElement = document.getElementById('company-ticker');
  const companyLogoImage = document.getElementById('company-logo-image');
  const companyLogoIcon = document.getElementById('company-logo-icon');
  
  // Elements that have been removed - setting to null
  const totalFilingsCount = null; // Was in stats section 
  const annotatedFilingsCount = null; // Was in stats section
  const priorityFilingsCount = null; // Was in stats section
  const filingTypesChart = null; // Was in chart section
  
  // Elements we're keeping
  const latestFilingDate = document.getElementById('latest-filing-date');
  const recentAnnotationsList = document.getElementById('recent-annotations-list');
  const viewAllAnnotations = document.getElementById('view-all-annotations');

  // Financial data elements
  const overviewTab = document.getElementById('overview-tab');
  const financialsTab = document.getElementById('financials-tab');
  const overviewContent = document.getElementById('overview-content');
  const financialsContent = document.getElementById('financials-content');
  const financialsPeriodSelect = document.getElementById('financials-period');
  const financialsTypeSelect = document.getElementById('financials-type');
  const financialsTable = document.getElementById('financials-table');
  const financialsLoading = document.getElementById('financials-loading');
  const financialsError = document.getElementById('financials-error');
  
  // Analytics elements
  const analyticsTab = document.getElementById('analytics-tab');
  const analyticsContent = document.getElementById('analytics-content');
  const analyticsPeriodSelect = document.getElementById('analytics-period');
  const industryBenchmarkSelect = document.getElementById('industry-benchmark');
  const solvencyMetricsDiv = document.getElementById('solvency-metrics');
  const runwayValueElement = document.getElementById('runway-value');
  const burnRateValueElement = document.getElementById('burn-rate-value');
  const cashChartCanvas = document.getElementById('cash-chart');
  const chartLoading = document.getElementById('chart-loading');
  const chartError = document.getElementById('chart-error');
  
  // Calendar display elements
  const calendarDisplaySelect = document.getElementById('calendar-display');
  const analyticsCalendarSelect = document.getElementById('analytics-calendar');
  const federalFiscalYearEl = document.getElementById('federal-fiscal-year');
  const companyFiscalYearEl = document.getElementById('company-fiscal-year');
  
  // Remove fiscal year selector elements
  const fiscalYearDropdown = null;  
  const selectedFiscalYearEl = null;
  
  // Data storage
  let allCompanies = [];
  let filteredCompanies = [];
  let allFilings = [];
  let projectData = [];
  let selectedCompany = null;
  
  // Filter state
  let activeFilters = {
    searchTerm: '',
    subprogram: 'all',
    minFilings: 0,
    annotations: 'all'
  };
  
  // Set up tab functionality immediately to ensure it's always available
  setupTabNavigation();
  
  // First, load project data to get company information
  fetch('../data/project_list.json')
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to load project data');
      }
      return response.json();
    })
    .then(data => {
      projectData = data;
      console.log('Project data loaded:', projectData.length, 'projects');
      
      // Try to load filings, but don't fail if they're not available
      return fetch('../data/SEC_Filings_Current.json')
        .then(response => {
          if (!response.ok) {
            console.warn('Filings data not available, continuing with project data only');
            return [];
          }
          return response.json();
        })
        .catch(err => {
          console.warn('Error loading filings data, continuing with project data only:', err);
          return [];
        });
    })
    .then(filings => {
      allFilings = filings || [];
      console.log('Filings loaded:', allFilings.length);
      
      // Process data to create company profiles
      processCompanyData();
      
      // Display companies
      displayCompanies(filteredCompanies);
      
      // Check for URL parameters first
      const selectedFromUrl = checkUrlParameters();
      
      // If no company was selected from URL, default to first company
      if (!selectedFromUrl && filteredCompanies.length > 0) {
        selectCompany(filteredCompanies[0]);
      }
    })
    .catch(error => {
      console.error('Error loading data:', error);
      companiesList.innerHTML = `
        <div class="error-message">
          <p>Error loading data: ${error.message}</p>
          <p>Please try refreshing the page.</p>
        </div>
      `;
    });
  
  // Event listeners
  companiesSearch.addEventListener('input', searchCompanies);
  toggleFiltersBtn.addEventListener('click', toggleFilters);
  applyFiltersBtn.addEventListener('click', applyFilters);
  resetFiltersBtn.addEventListener('click', resetFilters);
  exportCsvBtn.addEventListener('click', exportCompanyProfiles);
  
  // Add event listeners for calendar display changes
  if (calendarDisplaySelect) {
    calendarDisplaySelect.addEventListener('change', () => {
      updateFiscalYearDisplay('financials');
      // Reload financial data to update display
      if (selectedCompany) loadFinancialData(selectedCompany);
    });
  }
  
  // Add event listeners for financials period and type dropdowns
  if (financialsPeriodSelect) {
    financialsPeriodSelect.addEventListener('change', () => {
      if (selectedCompany) loadFinancialData(selectedCompany);
    });
  }
  
  if (financialsTypeSelect) {
    financialsTypeSelect.addEventListener('change', () => {
      if (selectedCompany) loadFinancialData(selectedCompany);
    });
  }
  
  if (analyticsCalendarSelect) {
    analyticsCalendarSelect.addEventListener('change', () => {
      updateFiscalYearDisplay('analytics');
      // Reload analytics data to update display
      if (selectedCompany) loadAnalyticsData(selectedCompany);
    });
  }
  
  // Function to set up tab navigation - moved outside initialization block
  function setupTabNavigation() {
    // Fix for the financial tabs navigation - ensure all tab elements are properly referenced
    const overviewTab = document.getElementById('overview-tab');
    const financialsTab = document.getElementById('financials-tab');
    const analyticsTab = document.getElementById('analytics-tab');
    const overviewContent = document.getElementById('overview-content');
    const financialsContent = document.getElementById('financials-content');
    const analyticsContent = document.getElementById('analytics-content');
    
    // DEBUG: Log the tab elements to verify they're being found
    console.log("Tab elements:", { 
      overviewTab, financialsTab, analyticsTab,
      overviewContent, financialsContent, analyticsContent
    });
    
    if (!overviewTab || !financialsTab || !analyticsTab) {
      console.error("Tab elements not found:", { overviewTab, financialsTab, analyticsTab });
      return;
    }
    
    // Create a map of all tabs for easier management
    tabsConfig = {
      'overview': { tab: overviewTab, content: overviewContent, loadData: null },
      'financials': { tab: financialsTab, content: financialsContent, loadData: loadFinancialData },
      'analytics': { tab: analyticsTab, content: analyticsContent, loadData: loadAnalyticsData }
    };
    
    // Define the global switchToTab function
    switchToTab = function(tabName) {
      console.log(`Switching to tab: ${tabName}`);
      
      // Validate tab name
      if (!tabsConfig[tabName]) {
        console.error(`Tab "${tabName}" does not exist`);
        return;
      }
      
      // Hide all tab contents and remove active class from all tabs
      Object.values(tabsConfig).forEach(item => {
        if (item.tab) item.tab.classList.remove('active');
        if (item.content) item.content.classList.add('hidden');
      });
      
      // Show selected tab content and mark tab as active
      const selectedTab = tabsConfig[tabName];
      if (selectedTab.tab) selectedTab.tab.classList.add('active');
      if (selectedTab.content) selectedTab.content.classList.remove('hidden');
      
      // Clear any previous error messages specific to this tab
      if (tabName === 'financials' && financialsError) {
        financialsError.classList.add('hidden');
      } else if (tabName === 'analytics' && chartError) {
        chartError.classList.add('hidden');
      }
      
      // Load tab-specific data if needed and if there's a company selected
      if (selectedCompany && selectedTab.loadData) {
        console.log(`Loading data for ${tabName} tab, company: ${selectedCompany.name}`);
        selectedTab.loadData(selectedCompany);
      } else {
        console.log(`No company selected or no data loader for ${tabName}`);
      }
      
      // Update URL to include tab for better history navigation
      try {
        const url = new URL(window.location);
        url.searchParams.set('tab', tabName);
        window.history.replaceState({}, '', url);
      } catch (e) {
        console.warn('Unable to update URL:', e);
      }
    };
    
    // Add click event listeners directly to each tab
    if (overviewTab) {
      overviewTab.addEventListener('click', function() {
        console.log("Overview tab clicked");
        switchToTab('overview');
      });
    }
    
    if (financialsTab) {
      financialsTab.addEventListener('click', function() {
        console.log("Financials tab clicked");
        switchToTab('financials');
      });
    }
    
    if (analyticsTab) {
      analyticsTab.addEventListener('click', function() {
        console.log("Analytics tab clicked");
        switchToTab('analytics');
      });
    }
    
    // Add keyboard navigation for tabs
    document.addEventListener('keydown', function(e) {
      // Only if company profile is visible/active
      if (!selectedCompany) return;
      
      // Ctrl+1, Ctrl+2, Ctrl+3 for tab switching
      if (e.ctrlKey && (e.key === '1' || e.key === '2' || e.key === '3')) {
        e.preventDefault();
        if (e.key === '1') switchToTab('overview');
        if (e.key === '2') switchToTab('financials');
        if (e.key === '3') switchToTab('analytics');
      }
    });
    
    // Default to overview tab
    console.log("Setting default tab to overview");
    switchToTab('overview');
  }
  
  // Function to process the raw data into company profiles
  function processCompanyData() {
    // Create a map of CIK to company info
    const companyMap = new Map();
    
    // First, process project data to get company information
    projectData.forEach(project => {
      // Use the Regulatory_ID (CIK) as the key
      if (project.Regulatory_ID) {
        const cik = project.Regulatory_ID.toString();
        
        if (!companyMap.has(cik)) {
          // Get data from project_list.json fields
          const stockExchange = project.Stock_Exchange || '';
          const ticker = project.Ticker || '';
          
          console.log(`Processing company: ${project.Lead_Organization}, Exchange: ${stockExchange}, Ticker: ${ticker}`);
          
          companyMap.set(cik, {
            cik: cik,
            name: project.Lead_Organization || `Company ${cik}`,
            office: project.Office_Subprogram || "Unknown",
            totalFilings: 0,
            annotatedFilings: 0,
            priorityFilings: 0,
            latestFiling: null,
            filingTypes: {},
            annotations: [],
            exchange: stockExchange,
            ticker: ticker,
            foa: project.FOA // Add FOA field for displaying project badges
          });
        }
      }
    });
    
    // Now process filings data to add filing statistics (if available)
    if (allFilings && allFilings.length > 0) {
      allFilings.forEach(filing => {
        // Ensure CIK is a string for comparison
        const cik = filing.CIK ? filing.CIK.toString() : null;
        
        if (!cik || !companyMap.has(cik)) {
          return; // Skip this filing if no CIK or company not in our map
        }
        
        // Get the company from the map
        const company = companyMap.get(cik);
        
        // Increment total filings
        company.totalFilings++;
        
        // Check if filing has annotations
        if (filing.Notes && filing.Notes.trim() !== "" && filing.Notes !== ".") {
          company.annotatedFilings++;
          
          // Add to annotations array
          company.annotations.push({
            accessionNumber: filing["Accession Number"],
            filingType: filing.Form,
            filingDate: new Date(filing["Filing Date"]),
            notes: filing.Notes,
            priority: filing["Priority Consideration"] || "",
            recommendation: filing.Recommendation || ""
          });
        }
        
        // Check if filing has priority consideration
        if (filing["Priority Consideration"] && 
            filing["Priority Consideration"] !== "" && 
            filing["Priority Consideration"] !== "Low") {
          company.priorityFilings++;
        }
        
        // Update latest filing date
        const filingDate = new Date(filing["Filing Date"]);
        if (!company.latestFiling || filingDate > new Date(company.latestFiling.date)) {
          company.latestFiling = {
            accessionNumber: filing["Accession Number"],
            type: filing.Form,
            date: filing["Filing Date"]
          };
        }
        
        // Update filing types count
        if (filing.Form) {
          if (!company.filingTypes[filing.Form]) {
            company.filingTypes[filing.Form] = 0;
          }
          company.filingTypes[filing.Form]++;
        }
      });
    } else {
      // If no filings data, set defaults for each company
      companyMap.forEach(company => {
        company.latestFiling = {
          accessionNumber: null,
          type: "N/A",
          date: new Date().toISOString()
        };
      });
    }
    
    // Convert map to array and sort by name
    allCompanies = Array.from(companyMap.values()).sort((a, b) => {
      return a.name.localeCompare(b.name);
    });
    
    // Initialize filteredCompanies
    filteredCompanies = [...allCompanies];
    
    // Initialize knownIndustries with 'all' already in the set
    knownIndustries = new Set(['all']);
    
    console.log('Processed company data:', allCompanies.length, 'companies');
  }
  
  // Function to display companies in the sidebar
  function displayCompanies(companies) {
    companiesList.innerHTML = '';
    
    if (companies.length === 0) {
      companiesList.innerHTML = '<div class="no-companies">No companies found</div>';
      return;
    }
    
    companies.forEach(company => {
      const companyItem = document.createElement('div');
      companyItem.className = 'company-item';
      
      // Add office-subprogram class
      let subprogramClass = '';
      if (company.office) {
        const officeLower = company.office.toLowerCase();
        if (officeLower.includes('tech') || officeLower.includes('soft')) {
          subprogramClass = 'subprogram-mesc-10';
        } else if (officeLower.includes('data') || officeLower.includes('ecom')) {
          subprogramClass = 'subprogram-mesc-20';
        } else if (officeLower.includes('auto') || officeLower.includes('energy')) {
          subprogramClass = 'subprogram-mesc-30';
        } else {
          // Fallback class based on FOA if available
          if (company.foa) {
            const foaNum = parseInt(company.foa);
            if (foaNum >= 3500 && foaNum < 3600) subprogramClass = 'foa-3500';
            else if (foaNum >= 3600 && foaNum < 3700) subprogramClass = 'foa-3600';
            else if (foaNum >= 3700 && foaNum < 3800) subprogramClass = 'foa-3700';
            else if (foaNum >= 3800 && foaNum < 3900) subprogramClass = 'foa-3800';
            else if (foaNum >= 3900 && foaNum < 4000) subprogramClass = 'foa-3900';
            else if (foaNum >= 4000 && foaNum < 4100) subprogramClass = 'foa-4000';
            else if (foaNum >= 4100) subprogramClass = 'foa-4100';
            else subprogramClass = 'foa-other';
          }
        }
      }
      
      companyItem.innerHTML = `
        <div class="company-item-header">
          <h4 title="${company.name}">${company.name}</h4>
          <span class="company-filings-count">${company.totalFilings}</span>
        </div>
        <div class="company-badges">
          <span class="company-subprogram ${subprogramClass}">${company.office}</span>
          ${company.foa ? `<span class="project-foa ${getProjectFoaClass(company.foa)}">${company.foa}</span>` : ''}
        </div>
      `;
      
      companyItem.addEventListener('click', () => selectCompany(company));
      
      // If this is the currently selected company, mark it as active
      if (selectedCompany && selectedCompany.cik === company.cik) {
        companyItem.classList.add('active');
      }
      
      companiesList.appendChild(companyItem);
    });
  }
  
  // Function to select a company and display its profile
  function selectCompany(company) {
    console.log(`Selecting company: ${company.name}`);
    
    // Show transition effect
    if (company !== selectedCompany) {
      const companyProfile = document.getElementById('company-profile');
      if (companyProfile) {
        companyProfile.classList.add('loading');
        setTimeout(() => companyProfile.classList.remove('loading'), 300);
      }
    }
    
    selectedCompany = company;
    
    // Mark the selected company as active in the sidebar
    document.querySelectorAll('.company-item').forEach(item => {
      item.classList.remove('active');
    });
    
    document.querySelectorAll('.company-item').forEach((item, index) => {
      if (filteredCompanies[index].cik === company.cik) {
        item.classList.add('active');
        
        // Ensure the selected company is visible in the sidebar
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
    
    // Update the company profile
    updateCompanyProfile(company);
    
    // Find which tab is currently active
    const activeTabName = tabsConfig ? 
      Object.keys(tabsConfig).find(name => tabsConfig[name].tab.classList.contains('active')) : 
      'overview';
    
    // Reload the current tab with the new company data
    if (switchToTab) {
      console.log(`Reloading active tab: ${activeTabName}`);
      switchToTab(activeTabName);
    } else {
      console.warn('switchToTab function not available');
    }
    
    // Update fiscal year displays for both tabs
    updateFiscalYearDisplay('financials');
    updateFiscalYearDisplay('analytics');
    
    // If company has ticker and exchange, fetch its industry information 
    // FIXED: Check if the getCompanyProfile function exists first
    if (company.ticker && company.exchange && 
        typeof FinancialDataService !== 'undefined' && 
        typeof FinancialDataService.getCompanyProfile === 'function') {
      
      FinancialDataService.getCompanyProfile(company.ticker, company.exchange)
        .then(profile => {
          if (profile && profile.industry) {
            console.log(`Company industry from FMP: ${profile.industry}`);
            company.industry = profile.industry;
            
            // Display industry in company metadata
            const companyIndustryElement = document.getElementById('company-industry');
            if (companyIndustryElement) {
              companyIndustryElement.textContent = `Industry: ${profile.industry}`;
              companyIndustryElement.classList.remove('hidden');
            }
            
            // Add to known industries and update dropdown
            knownIndustries.add(profile.industry);
            updateIndustryDropdown();
            
            // Set the dropdown to match this company's industry
            if (industryBenchmarkSelect) {
              const industryValue = profile.industry.toLowerCase().replace(/\s+/g, '-');
              
              // Try to find an exact match first
              let found = false;
              for (let i = 0; i < industryBenchmarkSelect.options.length; i++) {
                if (industryBenchmarkSelect.options[i].value === industryValue) {
                  industryBenchmarkSelect.selectedIndex = i;
                  found = true;
                  break;
                }
              }
              
              // If no exact match, use the mapping function as fallback
              if (!found && typeof FinancialDataService.mapIndustryToCategory === 'function') {
                const mappedIndustry = FinancialDataService.mapIndustryToCategory(profile.industry);
                industryBenchmarkSelect.value = mappedIndustry;
              }
              
              // If analytics tab is active, reload the data with correct industry
              const activeTabName = Object.keys(tabsConfig).find(
                name => tabsConfig[name].tab.classList.contains('active')
              );
              if (activeTabName === 'analytics') {
                updateSolvencyMetrics(company);
              }
            }
          }
        })
        .catch(err => console.error('Error getting company industry:', err));
    }
    
    // Ensure data for active tab is loaded regardless of tab initialization order
    if (tabsConfig) {
      // Find which tab is currently active
      const activeTabName = Object.keys(tabsConfig).find(
        name => tabsConfig[name].tab.classList.contains('active')
      ) || 'overview';
      
      // Use the switchToTab function to reload appropriate data
      if (typeof switchToTab === 'function') {
        console.log(`Selecting company ${company.name}, loading data for active tab: ${activeTabName}`);
        switchToTab(activeTabName);
      }
    }
    
    // Update URL to include company selection for bookmarking/history
    try {
      const url = new URL(window.location);
      url.searchParams.set('cik', company.cik);
      window.history.replaceState({}, '', url);
    } catch (e) {
      console.warn('Unable to update URL:', e);
    }
  }
  
  // Function to update the company profile section
  function updateCompanyProfile(company) {
    // Set company header information
    companyName.textContent = company.name;
    companyCik.textContent = `Regulatory ID: ${company.cik}`;
    companyOffice.textContent = company.office;
    
    // Update company logo
    updateCompanyLogo(company.cik);
    
    // Update ticker and exchange information if available
    if (companyTickerElement) {
      if (company.ticker && company.exchange) {
        companyTickerElement.textContent = `${company.exchange}: ${company.ticker}`;
        companyTickerElement.classList.remove('hidden');
      } else {
        companyTickerElement.classList.add('hidden');
      }
    }
    
    // Update industry information if available
    const companyIndustryElement = document.getElementById('company-industry');
    if (companyIndustryElement) {
      companyIndustryElement.classList.add('hidden');
    }
    
    // Format latest filing date or show placeholder if not available
    if (company.latestFiling && company.latestFiling.date) {
      const filingDate = new Date(company.latestFiling.date);
      const month = (filingDate.getMonth() + 1).toString().padStart(2, '0');
      const day = filingDate.getDate().toString().padStart(2, '0');
      const year = filingDate.getFullYear().toString().substring(2);
      latestFilingDate.textContent = `${month}/${day}/${year}`;
      
      // Update filing type if available
      const latestFilingType = document.getElementById('latest-filing-type');
      if (latestFilingType) {
        latestFilingType.textContent = company.latestFiling.type || 'N/A';
      }
    } else {
      latestFilingDate.textContent = '--/--/--';
      
      // Update filing type to N/A
      const latestFilingType = document.getElementById('latest-filing-type');
      if (latestFilingType) {
        latestFilingType.textContent = 'N/A';
      }
    }
    
    // Display recent annotations or show empty message
    displayRecentAnnotations(company.annotations);
    
    // Update "View All" link
    viewAllAnnotations.onclick = () => {
      // Redirect to the notes page with a filter for this company
      window.location.href = `notes.html?company=${encodeURIComponent(company.name)}`;
    };
  }
  
  // Function to display recent annotations
  function displayRecentAnnotations(annotations) {
    if (!annotations || annotations.length === 0) {
      recentAnnotationsList.innerHTML = '<div class="empty-annotations-message">No annotations found for this company</div>';
      return;
    }
    
    // Sort annotations by date, most recent first
    const sortedAnnotations = [...annotations].sort((a, b) => {
      return new Date(b.filingDate) - new Date(a.filingDate);
    });
    
    // Take only the 5 most recent annotations
    const recentAnnotations = sortedAnnotations.slice(0, 5);
    
    // Clear the list
    recentAnnotationsList.innerHTML = '';
    
    // Add each annotation to the list
    recentAnnotations.forEach(annotation => {
      const filingDate = new Date(annotation.filingDate);
      const month = (filingDate.getMonth() + 1).toString().padStart(2, '0');
      const day = filingDate.getDate().toString().padStart(2, '0');
      const year = filingDate.getFullYear().toString().substring(2);
      const formattedDate = `${month}/${day}/${year}`;
      
      // Create priority and recommendation classes
      let priorityClass = '';
      if (annotation.priority && annotation.priority.toLowerCase() !== 'low') {
        priorityClass = `priority-${annotation.priority.toLowerCase()}`;
      }
      
      let recommendationClass = '';
      if (annotation.recommendation) {
        const recommendationValue = annotation.recommendation.toLowerCase().replace(/\s+/g, '-');
        recommendationClass = `recommendation-${recommendationValue}`;
      }
      
      // Create annotation item HTML
      const annotationItem = document.createElement('div');
      annotationItem.className = 'annotation-item';
      annotationItem.innerHTML = `
        <div class="annotation-header">
          <span class="annotation-filing">${annotation.filingType}</span>
          <span class="annotation-date">${formattedDate}</span>
        </div>
        <div class="annotation-content">${annotation.notes}</div>
        <div class="annotation-metadata">
          ${annotation.priority ? `<span class="annotation-priority ${priorityClass}">${annotation.priority}</span>` : ''}
          ${annotation.recommendation ? `<span class="annotation-recommendation ${recommendationClass}">${annotation.recommendation}</span>` : ''}
        </div>
      `;
      
      // Add click event to view the filing
      annotationItem.addEventListener('click', () => {
        window.location.href = `filings.html?accessionNumber=${encodeURIComponent(annotation.accessionNumber)}`;
      });
      
      // Add to the list
      recentAnnotationsList.appendChild(annotationItem);
    });
  }

  // Function to load financial data for a company
  async function loadFinancialData(company) {
    console.log(`Loading financial data for: ${company.name}`);
    
    if (!company.ticker || !company.exchange) {
      console.warn(`No ticker/exchange for ${company.name}`);
      if (financialsContent) {
        financialsContent.innerHTML = `
          <div class="no-financials-message">
            <p>No financial data available for this company.</p>
            <p>This company doesn't have ticker symbol information.</p>
          </div>
        `;
      }
      return;
    }
    
    const ticker = company.ticker;
    const exchange = company.exchange;
    const period = document.getElementById('financials-period').value;
    const type = document.getElementById('financials-type').value;
    
    // Update fiscal year display based on current calendar selection
    updateFiscalYearDisplay('financials');
    
    // Show loading indicator
    const financialsLoading = document.getElementById('financials-loading');
    const financialsError = document.getElementById('financials-error');
    const financialsTable = document.getElementById('financials-table');
    
    if (financialsLoading) financialsLoading.classList.remove('hidden');
    if (financialsError) financialsError.classList.add('hidden');
    if (financialsTable) financialsTable.innerHTML = '';
    
    try {
      console.log(`Fetching ${type} data for ${ticker} (${exchange}), period: ${period}`);
      let data;
      let title;
      
      // Load the appropriate financial data based on the selected type
      switch (type) {
        case 'income':
          data = await FinancialDataService.getIncomeStatement(ticker, exchange, period);
          title = 'Income Statement';
          break;
        case 'balance':
          data = await FinancialDataService.getBalanceSheet(ticker, exchange, period);
          title = 'Balance Sheet';
          break;
        case 'cash':
          data = await FinancialDataService.getCashFlow(ticker, exchange, period);
          title = 'Cash Flow Statement';
          break;
        case 'metrics':
          data = await FinancialDataService.getKeyMetrics(ticker, exchange, period);
          title = 'Key Metrics';
          break;
        default:
          data = await FinancialDataService.getIncomeStatement(ticker, exchange, period);
          title = 'Income Statement';
      }
      
      // Hide loading indicator
      if (financialsLoading) financialsLoading.classList.add('hidden');
      
      if (!data || data.length === 0) {
        if (financialsTable) {
          financialsTable.innerHTML = `
            <tr><td colspan="100" class="no-data-message">
              No ${title.toLowerCase()} data available for this company.
            </td></tr>
          `;
        }
        return;
      }
      
      // Display the financial data in the table
      displayFinancialData(data, title);
      
    } catch (error) {
      console.error('Error loading financial data:', error);
      if (financialsLoading) financialsLoading.classList.add('hidden');
      if (financialsError) {
        financialsError.classList.remove('hidden');
        const errorSpan = financialsError.querySelector('span');
        if (errorSpan) errorSpan.textContent = `Failed to load financial data: ${error.message}`;
      }
    }
  }
  
  // Function to display financial data in the table
  function displayFinancialData(data, title) {
    if (!data || data.length === 0) {
      financialsTable.innerHTML = `
        <tr><td colspan="100" class="no-data-message">
          No ${title.toLowerCase()} data available.
        </td></tr>
      `;
      return;
    }
    
    // Get the properties to display
    // First, let's define some common properties to exclude
    const excludeProps = [
      'symbol', 'fillingDate', 'acceptedDate', 'period', 'link', 'finalLink',
      'reportedCurrency', 'cik', 'registrantName', 'calendar', 'date'
    ];
    
    // Get important properties to show at the top based on statement type
    let importantProps = [];
    if (title.includes('Income')) {
      importantProps = ['revenue', 'netIncome', 'grossProfit', 'operatingIncome', 'ebitda'];
    } else if (title.includes('Balance')) {
      importantProps = ['totalAssets', 'totalLiabilities', 'totalStockholdersEquity', 'cashAndCashEquivalents'];
    } else if (title.includes('Cash Flow')) {
      importantProps = ['netCashProvidedByOperatingActivities', 'netCashUsedForInvestingActivites', 'netCashUsedProvidedByFinancingActivities', 'freeCashFlow'];
    } else {
      importantProps = ['marketCap', 'peRatio', 'priceToSalesRatio', 'enterpriseValue', 'debtToEquity'];
    }
    
    // Get all unique keys from the data, excluding ones we don't want to show
    const allKeys = new Set();
    data.forEach(statement => {
      Object.keys(statement).forEach(key => {
        if (!excludeProps.includes(key)) {
          allKeys.add(key);
        }
      });
    });
    
    // Sort the keys to put important ones first and the rest alphabetically
    let sortedKeys = [...allKeys].sort((a, b) => {
      const aImportance = importantProps.indexOf(a);
      const bImportance = importantProps.indexOf(b);
      
      if (aImportance !== -1 && bImportance !== -1) {
        return aImportance - bImportance;
      }
      if (aImportance !== -1) {
        return -1;
      }
      if (bImportance !== -1) {
        return 1;
      }
      
      return a.localeCompare(b);
    });
    
    // Get dates (chronologically), and take up to 5 most recent quarters/years
    const dates = [...new Set(data.map(statement => statement.date))]
      .sort((a, b) => new Date(b) - new Date(a))
      .slice(0, 5);
    
    // Get the currency from the first statement
    const currency = data[0].reportedCurrency || 
                     FinancialDataService.getDefaultCurrencyForExchange(selectedCompany.exchange);
    
    // Build the table HTML
    let tableHTML = `
      <thead>
        <tr>
          <th class="financial-row-header">${title} (${currency})</th>
          ${dates.map(date => `<th>${formatFinancialDate(date, financialsPeriodSelect.value)}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
    `;
    
    sortedKeys.forEach(key => {
      const formattedKey = formatFinancialKey(key);
      
      tableHTML += `
        <tr class="${importantProps.includes(key) ? 'important-row' : ''}">
          <td class="financial-row-header">${formattedKey}</td>
      `;
      
      dates.forEach(date => {
        const statement = data.find(s => s.date === date);
        const value = statement ? statement[key] : null;
        tableHTML += `<td>${formatFinancialValue(value)}</td>`;
      });
      
      tableHTML += `</tr>`;
    });
    
    tableHTML += '</tbody>';
    financialsTable.innerHTML = tableHTML;
  }
  
  // Helper function to format financial dates
  function formatFinancialDate(dateStr, period) {
    const date = new Date(dateStr);
    
    // Determine which calendar system to use based on active tab & calendar selector
    let calendarType = 'federal'; // Default
    
    // Find the active tab
    const activeTabName = Object.keys(tabsConfig).find(
      name => tabsConfig[name].tab.classList.contains('active')
    );
    
    // Get the appropriate calendar selector based on active tab
    if (activeTabName === 'financials' && calendarDisplaySelect) {
      calendarType = calendarDisplaySelect.value;
    } else if (activeTabName === 'analytics' && analyticsCalendarSelect) {
      calendarType = analyticsCalendarSelect.value;
    }
    
    // Format based on period type and calendar type
    if (period === 'annual') {
      if (calendarType === 'federal' || calendarType === 'both') {
        // Use federal fiscal year
        const federalFY = FiscalYearUtils.getFederalFiscalYear(date);
        return `FY${federalFY}`;
      } else {
        // Use company fiscal year (defaulting to calendar year)
        return `FY${date.getFullYear()}`;
      }
    } else {
      // Quarterly data
      if (calendarType === 'federal' || calendarType === 'both') {
        // Use federal fiscal quarter
        return FiscalYearUtils.getFederalFiscalQuarter(date);
      } else {
        // Use calendar quarter by default
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        return `Q${quarter} FY${date.getFullYear()}`;
      }
    }
  }
  
  // Helper function to format financial keys into readable labels
  function formatFinancialKey(key) {
    // Convert camelCase to separate words
    const formatted = key.replace(/([A-Z])/g, ' $1')
                        // Capitalize first letter
                        .replace(/^./, str => str.toUpperCase());
    
    // Handle specific abbreviations and formats
    return formatted
      .replace(/E ?B ?I ?T ?D ?A/i, 'EBITDA')
      .replace(/Eps/i, 'EPS')
      .replace(/Roe/i, 'ROE')
      .replace(/Roa/i, 'ROA')
      .replace(/Sga/i, 'SG&A')
      .replace(/And/g, '&')
      .replace(/Capex/i, 'Capital Expenditures');
  }
  
  // Helper function to format financial values
  function formatFinancialValue(value) {
    if (value === null || value === undefined) {
      return '-';
    }
    
    // Handle numeric values
    if (typeof value === 'number') {
      // For large numbers (millions or more), format with abbreviations
      if (Math.abs(value) >= 1000000000) {
        return `$${(value / 1000000000).toFixed(2)}B`;
      } else if (Math.abs(value) >= 1000000) {
        return `$${(value / 1000000).toFixed(2)}M`;
      } else if (Math.abs(value) >= 1000) {
        return `$${(value / 1000).toFixed(2)}K`;
      } else {
        // Format with 2 decimal places, but only if needed
        const fixed = value.toFixed(2);
        return `$${fixed.endsWith('.00') ? fixed.slice(0, -3) : fixed}`;
      }
    }
    
    // For percentage values
    if (typeof value === 'string' && value.endsWith('%')) {
      return value;
    }
    
    // For date values
    if (value instanceof Date) {
      return value.toLocaleDateString();
    }
    
    // Default just return as string
    return String(value);
  }
  
  // Function to toggle the filters panel - update button styles
  function toggleFilters() {
    if (!filtersPanel.classList.contains('visible')) {
      // Remove hidden class first to allow positioning
      filtersPanel.classList.remove('hidden');
      
      // Set position - small delay to ensure DOM updates
      setTimeout(() => {
        // Add visible class for animation
        filtersPanel.classList.add('visible');
      }, 10);
    } else {
      // Hide the panel
      filtersPanel.classList.remove('visible');
      
      // Add hidden class after transition completes
      setTimeout(() => {
        filtersPanel.classList.add('hidden');
      }, 300);
    }
    
    // Toggle active class on button
    toggleFiltersBtn.classList.toggle('active');
    
    // Update button icon to match notes.js behavior
    toggleFiltersBtn.innerHTML = filtersPanel.classList.contains('visible') 
      ? '<i class="fa-solid fa-filter-circle-xmark"></i>' 
      : '<i class="fa-solid fa-filter"></i>';
  }
  
  // Function to search companies by name
  function searchCompanies() {
    const searchTerm = companiesSearch.value.toLowerCase();
    activeFilters.searchTerm = searchTerm;
    
    // Apply all filters
    applyFilters();
  }
  
  // Function to apply all active filters
  function applyFilters() {
    activeFilters.subprogram = subprogramFilter.value;
    activeFilters.minFilings = parseInt(filingsCountFilter.value, 10) || 0;
    activeFilters.annotations = annotationsFilter.value;
    
    // Filter companies based on active filters
    filteredCompanies = allCompanies.filter(company => {
      // Filter by search term (company name)
      if (activeFilters.searchTerm && 
          !company.name.toLowerCase().includes(activeFilters.searchTerm)) {
        return false;
      }
      
      // Filter by subprogram (MESC office)
      if (activeFilters.subprogram !== 'all' && 
          company.office !== activeFilters.subprogram) {
        return false;
      }
      
      // Filter by minimum filings count
      if (company.totalFilings < activeFilters.minFilings) {
        return false;
      }
      
      // Filter by annotation status
      if (activeFilters.annotations !== 'all') {
        if (activeFilters.annotations === 'with' && company.annotatedFilings === 0) {
          return false;
        }
        if (activeFilters.annotations === 'without' && company.annotatedFilings > 0) {
          return false;
        }
      }
      
      return true;
    });
    
    // Display filtered companies
    displayCompanies(filteredCompanies);
    
    // If the previously selected company is no longer in the filtered list,
    // clear the selection and update the UI accordingly
    if (selectedCompany && !filteredCompanies.some(c => c.cik === selectedCompany.cik)) {
      companyName.textContent = 'Select a Company';
      companyCik.textContent = 'Regulatory ID: ';
      companyOffice.textContent = '';
      latestFilingDate.textContent = '--/--/--';
      // Reset logo to default
      companyLogoImage.classList.add('hidden');
      companyLogoIcon.classList.remove('hidden');
      recentAnnotationsList.innerHTML = '<div class="empty-annotations-message">No company selected</div>';
    }
  }
  
  // Function to reset all filters
  function resetFilters() {
    // Reset filter values
    companiesSearch.value = '';
    subprogramFilter.value = 'all';
    filingsCountFilter.value = '0';
    annotationsFilter.value = 'all';
    
    // Reset active filters state
    activeFilters = {
      searchTerm: '',
      subprogram: 'all',
      minFilings: 0,
      annotations: 'all'
    };
    
    // Reset filteredCompanies to allCompanies
    filteredCompanies = [...allCompanies];
    
    // Update display
    displayCompanies(filteredCompanies);
    
    // Hide filters panel
    toggleFilters();
  }
  
  // Function to export company profiles to CSV
  function exportCompanyProfiles() {
    // Show export feedback
    exportCsvBtn.classList.add('active');
    
    // Generate a filename with current date
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10); // Format: YYYY-MM-DD
    const fileName = `company_profiles_${dateStr}.csv`;
    
    // Define CSV headers
    const csvHeaders = [
      'Company Name',
      'CIK',
      'MESC Office',
      'Total Filings',
      'Annotated Filings',
      'Priority Filings',
      'Latest Filing Date',
      'Latest Filing Type'
    ];
    
    // Create CSV content
    let csvContent = csvHeaders.join(',') + '\r\n';
    
    // Add company data
    filteredCompanies.forEach(company => {
      const latestFilingDate = company.latestFiling 
        ? new Date(company.latestFiling.date).toLocaleDateString('en-US') 
        : '';
      
      const latestFilingType = company.latestFiling ? company.latestFiling.type : '';
      
      // Format each field and handle commas and quotes correctly
      const row = [
        escapeCsvField(company.name),
        escapeCsvField(company.cik),
        escapeCsvField(company.office),
        company.totalFilings,
        company.annotatedFilings,
        company.priorityFilings,
        escapeCsvField(latestFilingDate),
        escapeCsvField(latestFilingType)
      ];
      
      csvContent += row.join(',') + '\r\n';
    });
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // First try to create directory using fetch API
    createExportDirectory()
      .then(() => {
        // Try server-side file saving
        return saveFileToServer(fileName, blob);
      })
      .then(serverResponse => {
        showExportConfirmation(`CSV exported to server: ${serverResponse.path || fileName}`);
      })
      .catch(error => {
        console.log('Server-side export failed, falling back to client-side download', error);
        // Fall back to client-side download
        const link = document.createElement("a");
        
        if (navigator.msSaveBlob) { // For IE and Edge
          navigator.msSaveBlob(blob, fileName);
        } else {
          // For other browsers
          const url = URL.createObjectURL(blob);
          link.setAttribute("href", url);
          link.setAttribute("download", fileName);
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        
        showExportConfirmation('CSV downloaded successfully');
      })
      .finally(() => {
        // Remove active class from button
        setTimeout(() => {
          exportCsvBtn.classList.remove('active');
        }, 1000);
      });
  }
  
  // Helper function to create the exports directory
  function createExportDirectory() {
    // Get the current server origin
    const serverUrl = window.location.origin;
    
    return fetch(`${serverUrl}/createDirectory`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        path: 'exports'
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to create directory: ${response.status} ${response.statusText}`);
      }
      return response.json();
    });
  }
  
  // Helper function to save file to server
  function saveFileToServer(fileName, blob) {
    return new Promise((resolve, reject) => {
      // Convert blob to base64 for server transmission
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = function() {
        const base64data = reader.result.split(',')[1];
        
        // Get the current server origin
        const serverUrl = window.location.origin;
        
        fetch(`${serverUrl}/write`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            path: `exports/${fileName}`,
            content: base64data,
            encoding: 'base64'
          })
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
          }
          return response.json();
        })
        .then(data => resolve(data))
        .catch(error => reject(error));
      };
    });
  }
  
  // Function to show export confirmation - match styling
  function showExportConfirmation(message) {
    const exportConfirmation = document.createElement('div');
    exportConfirmation.className = 'save-confirmation';
    exportConfirmation.innerHTML = `<i class="fa-solid fa-check-circle"></i> ${message}`;
    document.body.appendChild(exportConfirmation);
    
    setTimeout(() => {
      exportConfirmation.classList.add('visible');
    }, 10);
    
    setTimeout(() => {
      exportConfirmation.classList.remove('visible');
      setTimeout(() => {
        document.body.removeChild(exportConfirmation);
      }, 300);
    }, 3000);
  }
  
  // Helper function to escape CSV fields
  function escapeCsvField(field) {
    if (field === null || field === undefined) {
      return '';
    }
    
    // Convert to string
    const str = String(field);
    
    // If the field contains quotes, commas, or newlines, enclose in quotes
    // and escape any quotes within the field
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    
    return str;
  }
  
  // Function to update company logo
  function updateCompanyLogo(cik) {
    // Construct logo path
    const logoPath = `../assets/company-logos/${cik}-logo.png`;
    
    // Create a new image to test if the logo exists
    const testImage = new Image();
    testImage.onload = function() {
      // Logo exists, display it
      companyLogoImage.src = logoPath;
      companyLogoImage.classList.remove('hidden');
      companyLogoIcon.classList.add('hidden');
    };
    
    testImage.onerror = function() {
      // Logo doesn't exist, show default icon
      companyLogoImage.classList.add('hidden');
      companyLogoIcon.classList.remove('hidden');
    };
    
    // Set source to trigger load/error
    testImage.src = logoPath;
  }
  
  // Function to load analytics data for a company
  async function loadAnalyticsData(company) {
    console.log(`Loading analytics data for: ${company.name}`);
    
    // Clear previous data
    if (solvencyMetricsDiv) solvencyMetricsDiv.innerHTML = '';
    if (runwayValueElement) runwayValueElement.textContent = 'Calculating...';
    if (burnRateValueElement) burnRateValueElement.textContent = 'Calculating...';
    
    if (!company.ticker || !company.exchange) {
      console.warn(`No ticker/exchange for ${company.name}`);
      if (analyticsContent) {
        analyticsContent.innerHTML = `
          <div class="no-financials-message">
            <p>No analytics data available for this company.</p>
            <p>This company doesn't have ticker symbol information.</p>
          </div>
        `;
      }
      return;
    }
    
    // Show loading indicators for all charts
    document.querySelectorAll('.chart-loading-indicator').forEach(el => el.classList.remove('hidden'));
    document.querySelectorAll('.chart-error-message').forEach(el => el.classList.add('hidden'));
    
    try {
      // Clear previous charts if they exist
      if (cashChart) {
        cashChart.destroy();
        cashChart = null;
      }
      if (performanceChart) {
        performanceChart.destroy();
        performanceChart = null;
      }
      if (balanceChart) {
        balanceChart.destroy();
        balanceChart = null;
      }
      if (cashflowChart) {
        cashflowChart.destroy();
        cashflowChart = null;
      }
      
      // Get financial data needed for analytics
      const period = analyticsPeriodSelect.value;
      
      // Use Promise.allSettled to get data even if some requests fail
      const [balanceSheetResult, cashFlowResult, incomeStatementResult] = await Promise.allSettled([
        FinancialDataService.getBalanceSheet(company.ticker, company.exchange, period, 12),
        FinancialDataService.getCashFlow(company.ticker, company.exchange, period, 12),
        FinancialDataService.getIncomeStatement(company.ticker, company.exchange, period, 12)
      ]);
      
      // Extract the data or set to empty array if rejected
      const balanceSheetData = balanceSheetResult.status === 'fulfilled' ? balanceSheetResult.value : [];
      const cashFlowData = cashFlowResult.status === 'fulfilled' ? cashFlowResult.value : [];
      const incomeData = incomeStatementResult.status === 'fulfilled' ? incomeStatementResult.value : [];
      
      // Sort data chronologically for consistent display
      if (balanceSheetData.length) {
        balanceSheetData.sort((a, b) => new Date(a.date) - new Date(b.date));
      }
      
      if (cashFlowData.length) {
        cashFlowData.sort((a, b) => new Date(a.date) - new Date(b.date));
      }
      
      if (incomeData.length) {
        incomeData.sort((a, b) => new Date(a.date) - new Date(b.date));
      }
      
      // Update UI components with the data
      updateSolvencyMetrics(company, balanceSheetData, cashFlowData, incomeData);
      updateCashRunway(company, balanceSheetData, cashFlowData);
      
      // Create all charts
      createCashChart(company, balanceSheetData);
      createPerformanceChart(company, incomeData);
      createBalanceSheetChart(company, balanceSheetData);
      createCashFlowChart(company, cashFlowData);
      
      // Hide loading indicators
      document.querySelectorAll('.chart-loading-indicator').forEach(el => el.classList.add('hidden'));
    } catch (error) {
      console.error('Error loading analytics data:', error);
      document.querySelectorAll('.chart-loading-indicator').forEach(el => el.classList.add('hidden'));
      document.querySelectorAll('.chart-error-message').forEach(el => {
        el.classList.remove('hidden');
        const errorSpan = el.querySelector('span');
        if (errorSpan) errorSpan.textContent = `Failed to load chart data: ${error.message}`;
      });
    }
  }
  
  // Function to create revenue and profitability chart
  function createPerformanceChart(company, incomeData = []) {
    const chartCanvas = document.getElementById('performance-chart');
    if (!chartCanvas) return;
    
    if (!incomeData || incomeData.length < 2) {
      const container = document.getElementById('financial-performance-container');
      if (container) {
        const errorMsg = container.querySelector('.chart-error-message');
        if (errorMsg) {
          errorMsg.classList.remove('hidden');
          errorMsg.querySelector('span').textContent = 'Insufficient income statement data for chart';
        }
      }
      return;
    }
    
    try {
      // Take the last 8 quarters/years to avoid overcrowding
      const chartData = incomeData.slice(-8);
      
      // Format dates for display as labels
      const labels = chartData.map(item => {
        const date = new Date(item.date);
        // Format as Q1'23, Q2'23, etc.
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        const year = date.getFullYear().toString().slice(-2);
        return `Q${quarter}'${year}`;
      });
      
      // Extract financial data series
      const revenue = chartData.map(item => item.revenue);
      const netIncome = chartData.map(item => item.netIncome);
      const grossProfit = chartData.map(item => item.grossProfit);
      
      // Calculate margins as percentages
      const grossMargin = chartData.map(item => 
        item.revenue > 0 ? (item.grossProfit / item.revenue) * 100 : 0);
      
      const netMargin = chartData.map(item => 
        item.revenue > 0 ? (item.netIncome / item.revenue) * 100 : 0);
      
      // Get currency
      const currency = chartData[0].reportedCurrency || 
                      FinancialDataService.getDefaultCurrencyForExchange(company.exchange) || 
                      'USD';
      
      const ctx = chartCanvas.getContext('2d');
      
      // Destroy existing chart if it exists
      if (performanceChart) {
        performanceChart.destroy();
      }
      
      // Create new chart - bar chart for revenue/profit with line chart for margins
      performanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Revenue',
              data: revenue,
              backgroundColor: 'rgba(66, 165, 245, 0.6)',
              borderColor: 'rgba(66, 165, 245, 1)',
              borderWidth: 1,
              order: 2
            },
            {
              label: 'Gross Profit',
              data: grossProfit,
              backgroundColor: 'rgba(76, 175, 80, 0.6)',
              borderColor: 'rgba(76, 175, 80, 1)',
              borderWidth: 1,
              order: 3
            },
            {
              label: 'Net Income',
              data: netIncome,
              backgroundColor: 'rgba(156, 39, 176, 0.6)',
              borderColor: 'rgba(156, 39, 176, 1)',
              borderWidth: 1,
              order: 4
            },
            {
              label: 'Gross Margin %',
              data: grossMargin,
              backgroundColor: 'transparent',
              borderColor: 'rgba(76, 175, 80, 1)',
              borderWidth: 2,
              pointRadius: 3,
              type: 'line',
              yAxisID: 'y1',
              order: 1
            },
            {
              label: 'Net Margin %',
              data: netMargin,
              backgroundColor: 'transparent',
              borderColor: 'rgba(156, 39, 176, 1)',
              borderWidth: 2,
              pointRadius: 3,
              type: 'line',
              yAxisID: 'y1',
              order: 0
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: `Amount (${currency})`,
                color: 'rgba(255, 255, 255, 0.7)'
              },
              ticks: {
                callback: function(value) {
                  return formatChartValue(value, getCurrencySymbol(currency));
                },
                color: 'rgba(255, 255, 255, 0.7)'
              },
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              }
            },
            y1: {
              beginAtZero: true,
              position: 'right',
              title: {
                display: true,
                text: 'Margin %',
                color: 'rgba(255, 255, 255, 0.7)'
              },
              ticks: {
                callback: function(value) {
                  return value + '%';
                },
                color: 'rgba(255, 255, 255, 0.7)'
              },
              grid: {
                display: false
              },
              min: 0,
              max: Math.max(...grossMargin, ...netMargin) * 1.2 // Add some headroom
            },
            x: {
              title: {
                display: true,
                text: 'Quarter',
                color: 'rgba(255, 255, 255, 0.7)'
              },
              ticks: {
                color: 'rgba(255, 255, 255, 0.7)'
              },
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              }
            }
          },
          plugins: {
            legend: {
              position: 'top',
              labels: {
                color: 'rgba(255, 255, 255, 0.7)'
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.dataset.label || '';
                  const value = context.raw;
                  
                  if (label.includes('Margin')) {
                    return `${label}: ${value.toFixed(2)}%`;
                  } else {
                    return `${label}: ${formatCurrencyValue(value, currency)}`;
                  }
                }
              }
            }
          }
        }
      });
      
    } catch (error) {
      console.error('Error creating performance chart:', error);
      const container = document.getElementById('financial-performance-container');
      if (container) {
        const errorMsg = container.querySelector('.chart-error-message');
        if (errorMsg) {
          errorMsg.classList.remove('hidden');
          errorMsg.querySelector('span').textContent = `Failed to create chart: ${error.message}`;
        }
      }
    }
  }
  
  // Function to create balance sheet trends chart
  function createBalanceSheetChart(company, balanceSheetData = []) {
    const chartCanvas = document.getElementById('balance-chart');
    if (!chartCanvas) return;
    
    if (!balanceSheetData || balanceSheetData.length < 2) {
      const container = document.getElementById('balance-trend-container');
      if (container) {
        const errorMsg = container.querySelector('.chart-error-message');
        if (errorMsg) {
          errorMsg.classList.remove('hidden');
          errorMsg.querySelector('span').textContent = 'Insufficient balance sheet data for chart';
        }
      }
      return;
    }
    
    try {
      // Take the last 8 quarters/years to avoid overcrowding
      const chartData = balanceSheetData.slice(-8);
      
      // Format dates for display as labels
      const labels = chartData.map(item => {
        const date = new Date(item.date);
        // Format as Q1'23, Q2'23, etc.
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        const year = date.getFullYear().toString().slice(-2);
        return `Q${quarter}'${year}`;
      });
      
      // Extract key balance sheet metrics
      const totalAssets = chartData.map(item => item.totalAssets);
      const totalLiabilities = chartData.map(item => item.totalLiabilities);
      const totalEquity = chartData.map(item => item.totalStockholdersEquity);
      const currentAssets = chartData.map(item => item.totalCurrentAssets);
      const currentLiabilities = chartData.map(item => item.totalCurrentLiabilities);
      
      // Get currency
      const currency = chartData[0].reportedCurrency || 
                      FinancialDataService.getDefaultCurrencyForExchange(company.exchange) || 
                      'USD';
      
      const ctx = chartCanvas.getContext('2d');
      
      // Destroy existing chart if it exists
      if (balanceChart) {
        balanceChart.destroy();
      }
      
      // Create new chart - stacked bar chart for assets and liabilities
      balanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Current Assets',
              data: currentAssets,
              backgroundColor: 'rgba(76, 175, 80, 0.6)',
              borderColor: 'rgba(76, 175, 80, 1)',
              borderWidth: 1,
              stack: 'Assets'
            },
            {
              label: 'Non-Current Assets',
              data: totalAssets.map((total, i) => total - currentAssets[i]),
              backgroundColor: 'rgba(76, 175, 80, 0.3)',
              borderColor: 'rgba(76, 175, 80, 0.7)',
              borderWidth: 1,
              stack: 'Assets'
            },
            {
              label: 'Current Liabilities',
              data: currentLiabilities,
              backgroundColor: 'rgba(239, 83, 80, 0.6)',
              borderColor: 'rgba(239, 83, 80, 1)',
              borderWidth: 1,
              stack: 'Liabilities'
            },
            {
              label: 'Non-Current Liabilities',
              data: totalLiabilities.map((total, i) => total - currentLiabilities[i]),
              backgroundColor: 'rgba(239, 83, 80, 0.3)',
              borderColor: 'rgba(239, 83, 80, 0.7)',
              borderWidth: 1,
              stack: 'Liabilities'
            },
            {
              label: 'Shareholders\' Equity',
              data: totalEquity,
              backgroundColor: 'rgba(255, 193, 7, 0.6)',
              borderColor: 'rgba(255, 193, 7, 1)',
              borderWidth: 1,
              stack: 'Liabilities'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: `Amount (${currency})`,
                color: 'rgba(255, 255, 255, 0.7)'
              },
              ticks: {
                callback: function(value) {
                  return formatChartValue(value, getCurrencySymbol(currency));
                },
                color: 'rgba(255, 255, 255, 0.7)'
              },
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Quarter',
                color: 'rgba(255, 255, 255, 0.7)'
              },
              ticks: {
                color: 'rgba(255, 255, 255, 0.7)'
              },
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              }
            }
          },
          plugins: {
            legend: {
              position: 'top',
              labels: {
                color: 'rgba(255, 255, 255, 0.7)'
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.dataset.label || '';
                  return `${label}: ${formatCurrencyValue(context.raw, currency)}`;
                }
              }
            }
          }
        }
      });
      
    } catch (error) {
      console.error('Error creating balance sheet chart:', error);
      const container = document.getElementById('balance-trend-container');
      if (container) {
        const errorMsg = container.querySelector('.chart-error-message');
        if (errorMsg) {
          errorMsg.classList.remove('hidden');
          errorMsg.querySelector('span').textContent = `Failed to create chart: ${error.message}`;
        }
      }
    }
  }
  
  // Function to create cash flow analysis chart
  function createCashFlowChart(company, cashFlowData = []) {
    const chartCanvas = document.getElementById('cashflow-chart');
    if (!chartCanvas) return;
    
    if (!cashFlowData || cashFlowData.length < 2) {
      const container = document.getElementById('cashflow-analysis-container');
      if (container) {
        const errorMsg = container.querySelector('.chart-error-message');
        if (errorMsg) {
          errorMsg.classList.remove('hidden');
          errorMsg.querySelector('span').textContent = 'Insufficient cash flow data for chart';
        }
      }
      return;
    }
    
    try {
      // Take the last 8 quarters/years to avoid overcrowding
      const chartData = cashFlowData.slice(-8);
      
      // Format dates for display as labels
      const labels = chartData.map(item => {
        const date = new Date(item.date);
        // Format as Q1'23, Q2'23, etc.
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        const year = date.getFullYear().toString().slice(-2);
        return `Q${quarter}'${year}`;
      });
      
      // Extract cash flow data
      const operatingCashFlow = chartData.map(item => item.netCashProvidedByOperatingActivities);
      const investingCashFlow = chartData.map(item => item.netCashUsedForInvestingActivites);
      const financingCashFlow = chartData.map(item => item.netCashUsedProvidedByFinancingActivities);
      const freeCashFlow = chartData.map(item => item.freeCashFlow);
      
      // Get currency
      const currency = chartData[0].reportedCurrency || 
                      FinancialDataService.getDefaultCurrencyForExchange(company.exchange) || 
                      'USD';
      
      const ctx = chartCanvas.getContext('2d');
      
      // Destroy existing chart if it exists
      if (cashflowChart) {
        cashflowChart.destroy();
      }
      
      // Create new chart - grouped bar chart for cash flows
      cashflowChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Operating Cash Flow',
              data: operatingCashFlow,
              backgroundColor: 'rgba(76, 175, 80, 0.6)',
              borderColor: 'rgba(76, 175, 80, 1)',
              borderWidth: 1
            },
            {
              label: 'Investing Cash Flow',
              data: investingCashFlow,
              backgroundColor: 'rgba(239, 83, 80, 0.6)',
              borderColor: 'rgba(239, 83, 80, 1)',
              borderWidth: 1
            },
            {
              label: 'Financing Cash Flow',
              data: financingCashFlow,
              backgroundColor: 'rgba(255, 193, 7, 0.6)',
              borderColor: 'rgba(255, 193, 7, 1)',
              borderWidth: 1
            },
            {
              label: 'Free Cash Flow',
              data: freeCashFlow,
              backgroundColor: 'rgba(66, 165, 245, 0.6)',
              borderColor: 'rgba(66, 165, 245, 1)',
              borderWidth: 1,
              // Make this a line instead of a bar
              type: 'line',
              pointRadius: 4,
              pointBackgroundColor: 'rgba(66, 165, 245, 0.8)'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              title: {
                display: true,
                text: `Amount (${currency})`,
                color: 'rgba(255, 255, 255, 0.7)'
              },
              ticks: {
                callback: function(value) {
                  return formatChartValue(value, getCurrencySymbol(currency));
                },
                color: 'rgba(255, 255, 255, 0.7)'
              },
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Quarter',
                color: 'rgba(255, 255, 255, 0.7)'
              },
              ticks: {
                color: 'rgba(255, 255, 255, 0.7)'
              },
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              }
            }
          },
          plugins: {
            legend: {
              position: 'top',
              labels: {
                color: 'rgba(255, 255, 255, 0.7)'
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.dataset.label || '';
                  return `${label}: ${formatCurrencyValue(context.raw, currency)}`;
                }
              }
            }
          }
        }
      });
      
    } catch (error) {
      console.error('Error creating cash flow chart:', error);
      const container = document.getElementById('cashflow-analysis-container');
      if (container) {
        const errorMsg = container.querySelector('.chart-error-message');
        if (errorMsg) {
          errorMsg.classList.remove('hidden');
          errorMsg.querySelector('span').textContent = `Failed to create chart: ${error.message}`;
        }
      }
    }
  }
  
  // Function to update solvency metrics section
  function updateSolvencyMetrics(company, balanceSheetData, cashFlowData, incomeData) {
    balanceSheetData = balanceSheetData || [];
    cashFlowData = cashFlowData || [];
    incomeData = incomeData || [];
    
    console.log(`Updating solvency metrics for ${company.name}`);
    
    if (!solvencyMetricsDiv) {
      console.error('Solvency metrics container not found');
      return;
    }
    
    // Clear previous metrics
    solvencyMetricsDiv.innerHTML = '';
    
    // Default metrics values with standard thresholds (no benchmarks)
    let metrics = {
      currentRatio: { value: null, status: 'neutral' },
      quickRatio: { value: null, status: 'neutral' },
      cashRatio: { value: null, status: 'neutral' },
      debtToEquity: { value: null, status: 'neutral' }
    };
    
    // Calculate solvency metrics if we have balance sheet data
    if (balanceSheetData && balanceSheetData.length > 0) {
      // Use the most recent balance sheet
      const latestBalanceSheet = balanceSheetData[balanceSheetData.length - 1];
      
      // Calculate Current Ratio: Current Assets / Current Liabilities
      if (latestBalanceSheet.totalCurrentAssets && latestBalanceSheet.totalCurrentLiabilities) {
        const currentRatio = latestBalanceSheet.totalCurrentAssets / latestBalanceSheet.totalCurrentLiabilities;
        metrics.currentRatio.value = currentRatio;
        metrics.currentRatio.status = currentRatio >= 2.0 ? 'good' : 
                                     (currentRatio >= 1.0 ? 'warning' : 'critical');
      }
      
      // Calculate Quick Ratio: (Current Assets - Inventory) / Current Liabilities
      if (latestBalanceSheet.totalCurrentAssets && latestBalanceSheet.inventory && latestBalanceSheet.totalCurrentLiabilities) {
        const quickRatio = (latestBalanceSheet.totalCurrentAssets - latestBalanceSheet.inventory) / latestBalanceSheet.totalCurrentLiabilities;
        metrics.quickRatio.value = quickRatio;
        metrics.quickRatio.status = quickRatio >= 1.0 ? 'good' : 
                                   (quickRatio >= 0.7 ? 'warning' : 'critical');
      }
      
      
      // // Calculate Cash Ratio: Cash & Equivalents / Current Liabilities
           if (latestBalanceSheet.cashAndCashEquivalents && latestBalanceSheet.totalCurrentLiabilities) {
        const cashRatio = latestBalanceSheet.cashAndCashEquivalents / latestBalanceSheet.totalCurrentLiabilities;
        metrics.cashRatio.value = cashRatio;
        metrics.cashRatio.status = cashRatio >= 0.5 ? 'good' : 
                                  (cashRatio >= 0.25 ? 'warning' : 'critical');
      }
      
      // Calculate Debt to Equity Ratio: Total Liabilities / Shareholders' Equity
      if (latestBalanceSheet.totalLiabilities && latestBalanceSheet.totalStockholdersEquity && 
          latestBalanceSheet.totalStockholdersEquity !== 0) {
        const debtToEquity = latestBalanceSheet.totalLiabilities / latestBalanceSheet.totalStockholdersEquity;
        metrics.debtToEquity.value = debtToEquity;
        metrics.debtToEquity.status = debtToEquity <= 1.5 ? 'good' : 
                                     (debtToEquity <= 2.5 ? 'warning' : 'critical');
      }
    }
    
    // Update the UI with the metrics
    updateMetricsUI(metrics);
    
    // Function to update the metrics UI - no benchmarks
    function updateMetricsUI(metrics) {
      // Create a metric card for each solvency metric
      const metricCards = [
        {
          name: 'Current Ratio',
          value: metrics.currentRatio.value,
          status: metrics.currentRatio.status,
          description: 'Measures ability to pay short-term obligations'
        },
        {
          name: 'Quick Ratio',
          value: metrics.quickRatio.value,
          status: metrics.quickRatio.status,
          description: 'Measures ability to pay short-term obligations without selling inventory'
        },
        {
          name: 'Cash Ratio',
          value: metrics.cashRatio.value,
          status: metrics.cashRatio.status,
          description: 'Measures ability to cover short-term liabilities with cash'
        },
        {
          name: 'Debt to Equity',
          value: metrics.debtToEquity.value,
          status: metrics.debtToEquity.status,
          description: 'Measures financial leverage and risk'
        }
      ];
      
      // Create metric cards and add them to the container
      metricCards.forEach(metric => {
        const metricCard = document.createElement('div');
        metricCard.className = `metric-card metric-${metric.status}`;
        
        const formattedValue = metric.value !== null ? metric.value.toFixed(2) : 'N/A';
        
        metricCard.innerHTML = `
          <div class="metric-header">
            <span class="metric-name">${metric.name}</span>
            <span class="metric-status">
              ${getStatusIcon(metric.status)}
            </span>
          </div>
          <div class="metric-value">${formattedValue}</div>
          <div class="metric-description">
            ${metric.description}
          </div>
        `;
        
        solvencyMetricsDiv.appendChild(metricCard);
      });
    }
    
    // Helper function to get status icon
    function getStatusIcon(status) {
      switch(status) {
        case 'good':
          return '<i class="fa-solid fa-circle-check"></i>';
        case 'warning':
          return '<i class="fa-solid fa-triangle-exclamation"></i>';
        case 'critical':
          return '<i class="fa-solid fa-circle-xmark"></i>';
        default:
          return '<i class="fa-solid fa-circle-question"></i>';
      }
    }
  }

  // Function to update cash runway and burn rate
  function updateCashRunway(company, balanceSheetData, cashFlowData) {
    balanceSheetData = balanceSheetData || [];
    cashFlowData = cashFlowData || [];
    
    console.log(`Updating cash runway for ${company.name}`);
    
    if (!runwayValueElement || !burnRateValueElement) {
      console.error('Runway or burn rate elements not found');
      return;
    }
    
    // Default values
    let cashOnHand = 0;
    let burnRateMonthly = 0;
    let runwayMonths = 0;
    
    // Calculate cash on hand from the most recent balance sheet
    if (balanceSheetData && balanceSheetData.length > 0) {
      const latestBalanceSheet = balanceSheetData[balanceSheetData.length - 1];
      
      if (latestBalanceSheet.cashAndCashEquivalents) {
        cashOnHand = latestBalanceSheet.cashAndCashEquivalents;
      }
    }
    
    // Calculate burn rate from cash flow statements
    if (cashFlowData && cashFlowData.length >= 2) {
      // Get the most recent quarters
      const recentCashFlow = cashFlowData.slice(-4);
      
      // Calculate average monthly burn rate from operating cash flow (if negative)
      let totalNegativeCashFlow = 0;
      let negativeCashFlowCount = 0;
      
      recentCashFlow.forEach(cf => {
        if (cf.netCashProvidedByOperatingActivities < 0) {
          totalNegativeCashFlow += Math.abs(cf.netCashProvidedByOperatingActivities);
          negativeCashFlowCount++;
        }
      });
      
      if (negativeCashFlowCount > 0) {
        // Average per period
        const averageNegativeCashFlow = totalNegativeCashFlow / negativeCashFlowCount;
        // Convert to monthly (assuming quarterly data)
        burnRateMonthly = averageNegativeCashFlow / 3;
      }
    }
    
    // Calculate runway in months: Cash on Hand / Monthly Burn Rate
    if (burnRateMonthly > 0) {
      runwayMonths = cashOnHand / burnRateMonthly;
    } else {
      // If burn rate is 0 or positive, runway is effectively infinite
      runwayMonths = null;
    }
    
    // Get currency symbol
    const currency = balanceSheetData && balanceSheetData.length > 0 ? 
                    balanceSheetData[0].reportedCurrency || 
                    FinancialDataService.getDefaultCurrencyForExchange(company.exchange) || 
                    'USD' : 'USD';
    
    const currencySymbol = getCurrencySymbol(currency);
    
    // Update UI elements
    if (burnRateValueElement) {
      if (burnRateMonthly > 0) {
        burnRateValueElement.textContent = `${currencySymbol}${formatNumber(burnRateMonthly)} per month`;
      } else {
        burnRateValueElement.textContent = 'Cash flow positive';
        burnRateValueElement.style.color = 'var(--green)';
      }
    }
    
    if (runwayValueElement) {
      if (runwayMonths !== null) {
        const years = Math.floor(runwayMonths / 12);
        const months = Math.floor(runwayMonths % 12);
        
        if (years > 0) {
          runwayValueElement.textContent = `${years} years, ${months} months`;
        } else {
          runwayValueElement.textContent = `${months} months`;
        }
        
        // Color code based on runway length
        if (runwayMonths >= 18) {
          runwayValueElement.style.color = 'var(--green)';
        } else if (runwayMonths >= 9) {
          runwayValueElement.style.color = 'var(--orange)';
        } else {
          runwayValueElement.style.color = 'var(--red)';
        }
      } else {
        runwayValueElement.textContent = 'Cash flow positive';
        runwayValueElement.style.color = 'var(--green)';
      }
    }
  }

  // Function to create cash chart
  function createCashChart(company, balanceSheetData = []) {
    balanceSheetData = balanceSheetData || [];
    
    const chartCanvas = document.getElementById('cash-chart');
    if (!chartCanvas) return;
    
    if (!balanceSheetData || balanceSheetData.length < 2) {
      const container = document.getElementById('cash-chart-container');
      if (container) {
        const errorMsg = container.querySelector('.chart-error-message') || container.querySelector('#chart-error');
        if (errorMsg) {
          errorMsg.classList.remove('hidden');
          const errorSpan = errorMsg.querySelector('span');
          if (errorSpan) errorSpan.textContent = 'Insufficient balance sheet data for cash chart';
        }
      }
      return;
    }
    
    try {
      // Sort data chronologically (ascending order)
      const chronologicalData = [...balanceSheetData].sort((a, b) => new Date(a.date) - new Date(b.date));
      
      // Take the last 8 quarters/years to avoid overcrowding
      const chartData = chronologicalData.slice(-8);
      
      // Format dates for display as labels
      const labels = chartData.map(item => {
        const date = new Date(item.date);
        // Format as Q1'23, Q2'23, etc.
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        const year = date.getFullYear().toString().slice(-2);
        return `Q${quarter}'${year}`;
      });
      
      // Extract cash data
      const cashData = chartData.map(item => item.cashAndCashEquivalents);
      const shortTermInvestments = chartData.map(item => item.shortTermInvestments || 0);
      
      // Calculate total quick assets (cash + short-term investments)
      const quickAssetsData = chartData.map((item, index) => 
        (item.cashAndCashEquivalents || 0) + (item.shortTermInvestments || 0));
      
      // Get currency
      const currency = chartData[0].reportedCurrency || 
                      FinancialDataService.getDefaultCurrencyForExchange(company.exchange) || 
                      'USD';
      
      const ctx = chartCanvas.getContext('2d');
      
      // Destroy existing chart if it exists
      if (cashChart) {
        cashChart.destroy();
      }
      
      // Create new chart
      cashChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Cash & Equivalents',
              data: cashData,
              backgroundColor: 'rgba(66, 165, 245, 0.5)',
              borderColor: 'rgba(66, 165, 245, 1)',
              borderWidth: 2,
              fill: true,
              tension: 0.1,
              pointRadius: 4
            },
            {
              label: 'Total Quick Assets',
              data: quickAssetsData,
              backgroundColor: 'rgba(126, 87, 194, 0.5)',
              borderColor: 'rgba(126, 87, 194, 1)',
              borderWidth: 2,
              fill: false,
              tension: 0.1,
              pointRadius: 4,
              borderDash: [5, 5]
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: `Amount (${currency})`,
                color: 'rgba(255, 255, 255, 0.7)'
              },
              ticks: {
                callback: function(value) {
                  return formatChartValue(value, getCurrencySymbol(currency));
                },
                color: 'rgba(255, 255, 255, 0.7)'
              },
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Quarter',
                color: 'rgba(255, 255, 255, 0.7)'
              },
              ticks: {
                color: 'rgba(255, 255, 255, 0.7)'
              },
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              }
            }
          },
          plugins: {
            legend: {
              position: 'top',
              labels: {
                color: 'rgba(255, 255, 255, 0.7)'
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.dataset.label || '';
                  return `${label}: ${formatCurrencyValue(context.raw, currency)}`;
                }
              }
            }
          }
        }
    });
        
    } catch (error) {
      console.error('Error creating cash chart:', error);
      const container = document.getElementById('cash-chart-container');
      if (container) {
        const errorMsg = container.querySelector('.chart-error-message') || container.querySelector('#chart-error');
        if (errorMsg) {
          errorMsg.classList.remove('hidden');
          const errorSpan = errorMsg.querySelector('span');
          if (errorSpan) errorSpan.textContent = `Failed to create chart: ${error.message}`;
        }
      }
    }
  }
  
  // Helper function to get currency symbol
  function getCurrencySymbol(currencyCode) {
    const currencySymbols = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'CNY': '¥',
      'KRW': '₩',
      'INR': '₹',
      'RUB': '₽',
      'BRL': 'R$',
      'MXN': 'MX$',
      'CAD': 'CA$',
      'AUD': 'A$',
      'HKD': 'HK$',
      'SGD': 'S$',
      'SEK': 'kr',
      'NOK': 'kr',
      'DKK': 'kr'
    };
    
    return currencySymbols[currencyCode] || currencyCode;
  }
  
  // Helper function to format chart values
  function formatChartValue(value, symbol) {
    if (Math.abs(value) >= 1000000000) {
      return `${symbol}${(value / 1000000000).toFixed(1)}B`;
    } else if (Math.abs(value) >= 1000000) {
      return `${symbol}${(value / 1000000).toFixed(1)}M`;
    } else if (Math.abs(value) >= 1000) {
      return `${symbol}${(value / 1000).toFixed(1)}K`;
    }
    return `${symbol}${value}`;
  }
  
  // Helper function to format currency values
  function formatCurrencyValue(value, currencyCode) {
    const symbol = getCurrencySymbol(currencyCode);
    
    if (Math.abs(value) >= 1000000000) {
      return `${symbol}${(value / 1000000000).toFixed(2)} billion`;
    } else if (Math.abs(value) >= 1000000) {
      return `${symbol}${(value / 1000000).toFixed(2)} million`;
    } else if (Math.abs(value) >= 1000) {
      return `${symbol}${(value / 1000).toFixed(2)} thousand`;
    }
    return `${symbol}${value.toFixed(2)}`;
  }
  
  // Helper function to format large numbers with commas
  function formatNumber(num) {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(2) + 'B';
    } else if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K';
    }
    return num.toFixed(2);
  }
  
  // Helper function to calculate averages (for benchmarks)
  FinancialDataService.calculateAverage = function(items, property) {
    if (!items || items.length === 0) return null;
    
    const validValues = items
      .map(item => item[property])
      .filter(val => val !== undefined && val !== null && !isNaN(val));
    
    if (validValues.length === 0) return null;
    
    const sum = validValues.reduce((total, val) => total + val, 0);
    return sum / validValues.length;
  };
});

// Add CSS transition for company profile loading
document.addEventListener('DOMContentLoaded', function() {
  // Add style to head for loading transition
  const style = document.createElement('style');
  style.textContent = `
    #company-profile.loading {
      opacity: 0.5;
     
      transition: opacity 0.3s ease;
    }
  `;
  document.head.appendChild(style);
});

// Modify the keydown event handling for the companies page
document.addEventListener('keydown', function(event) {
  // Navigation by arrow keys in company list
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    // Only if companies list has focus or is active
    const activeElement = document.activeElement;
    const companiesListActive = 
      activeElement === companiesList || 
      activeElement.closest('#companies-list') || 
      document.querySelector('.company-item.active');
    
    if (companiesListActive && filteredCompanies.length > 0) {
      event.preventDefault();
      
      // Find current selected company index
      const currentIndex = selectedCompany ? 
        filteredCompanies.findIndex(c => c.cik === selectedCompany.cik) : -1;
      
      let newIndex;
      if (event.key === 'ArrowUp') {
        // Move up in the list (to previous company)
        newIndex = currentIndex <= 0 ? filteredCompanies.length - 1 : currentIndex - 1;
      } else {
        // Move down in the list (to next company)
        newIndex = currentIndex >= filteredCompanies.length - 1 ? 0 : currentIndex + 1;
      }
      
      // Select the new company
      selectCompany(filteredCompanies[newIndex]);
    }
  }
});

// Add a function to check URL parameters on page load
function checkUrlParameters() {
  try {
    const url = new URL(window.location);
    
    // Check if there's a company CIK in the URL
    const cikParam = url.searchParams.get('cik');
    if (cikParam && filteredCompanies.length > 0) {
      const company = filteredCompanies.find(c => c.cik === cikParam);
      if (company) {
        selectCompany(company);
        return true; // Company was selected from URL
      }
    }
  } catch (e) {
    console.warn('Unable to parse URL parameters:', e);
  }
  return false;
}

// Add this function to gather industries and populate the dropdown
function updateIndustryDropdown() {
  if (!industryBenchmarkSelect) return;
  
  // Clear existing options except "All Industries"
  while (industryBenchmarkSelect.options.length > 1) {
    industryBenchmarkSelect.remove(1);
  }
  
  // Add each known industry as an option
  Array.from(knownIndustries).sort().forEach(industry => {
    if (industry === 'all') return; // Skip 'all' since it's already there
    
    const option = document.createElement('option');
    option.value = industry.toLowerCase().replace(/\s+/g, '-');
    option.textContent = industry;
    industryBenchmarkSelect.appendChild(option);
  });
}

// Add this function to update fiscal year display based on selected calendar option
function updateFiscalYearDisplay(tab) {
  console.log(`Updating fiscal year display mode for ${tab} tab`);
  
  // Get the relevant calendar selector based on tab
  const calendarSelect = tab === 'financials' ? 
    document.getElementById('calendar-display') : 
    document.getElementById('analytics-calendar');
  
  if (!calendarSelect) {
    console.error(`Calendar select not found for ${tab} tab`);
    return;
  }
  
  // The actual formatting of dates in the UI will use this value
  // when displaying financial data or charts
  const calendarMode = calendarSelect.value;
  console.log(`Fiscal year display mode set to: ${calendarMode}`);
  
  // If we have fiscal year elements in the DOM, we could update them here
  const federalFYEl = document.getElementById('federal-fiscal-year');
  const companyFYEl = document.getElementById('company-fiscal-year');
  
  if (federalFYEl) {
    federalFYEl.style.display = (calendarMode === 'federal' || calendarMode === 'both') ? 'block' : 'none';
  }
  
  if (companyFYEl) {
    companyFYEl.style.display = (calendarMode === 'company' || calendarMode === 'both') ? 'block' : 'none';
  }
}

/**
 * Create proper class name for office subprogram badge
 * @param {string} subprogram - Office_Subprogram value from data
 * @returns {string} CSS class name
 */
function getSubprogramClass(subprogram) {
  if (!subprogram) return 'subprogram-other';
  
  // Format subprogram as CSS class name
  return `subprogram-${subprogram.trim()}`;
}

/**
 * Create subprogram badge element
 * @param {string} subprogram - Office_Subprogram value from data
 * @returns {HTMLElement} Badge element
 */
function createSubprogramBadge(subprogram) {
  const badge = document.createElement('span');
  badge.className = `subprogram-badge ${getSubprogramClass(subprogram)}`;
  badge.textContent = subprogram || 'N/A';
  return badge;
}

// Replace existing company card rendering code:
function renderCompanyCard(company) {
  // Apply correct subprogram class for badge
  if (company.Office_Subprogram) {
    const subprogramBadge = createSubprogramBadge(company.Office_Subprogram);
    companyCard.appendChild(subprogramBadge);
  }
  
  // ...existing code...
}

// Helper function to determine FOA class
function getProjectFoaClass(foa) {
  if (!foa) return 'foa-other';
  
  const foaNum = parseInt(foa);
  if (foaNum >= 3500 && foaNum < 3600) return 'foa-3500';
  else if (foaNum >= 3600 && foaNum < 3700) return 'foa-3600';
  else if (foaNum >= 3700 && foaNum < 3800) return 'foa-3700';
  else if (foaNum >= 3800 && foaNum < 3900) return 'foa-3800';
  else if (foaNum >= 3900 && foaNum < 4000) return 'foa-3900';
  else if (foaNum >= 4000 && foaNum < 4100) return 'foa-4000';
  else if (foaNum >= 4100) return 'foa-4100';
  else return 'foa-other';
}

// Create a stub for the missing function to prevent further errors
if (typeof FinancialDataService !== 'undefined') {
  // Add the missing function if it doesn't exist
  if (!FinancialDataService.getCompanyProfile) {
    FinancialDataService.getCompanyProfile = function(ticker, exchange) {
      console.log(`FinancialDataService.getCompanyProfile stub called for ${ticker} (${exchange})`);
      // Return a promise that resolves with a minimal object
      return Promise.resolve({
        symbol: ticker,
        exchange: exchange,
        industry: null
      });
    };
  }
  
  // Add the mapIndustryToCategory function if it doesn't exist
  if (!FinancialDataService.mapIndustryToCategory) {
    FinancialDataService.mapIndustryToCategory = function(industry) {
      return 'other';
    };
  }
}

// Initialize controllers when document is ready
$(document).ready(function() {
    // Initialize the Analytics Controller
    AnalyticsController.init('analytics-tab');
});

// Function to load and display company details
function displayCompanyDetails(companyId) {
    // After loading company data:
    $.getJSON('../data/project_list.json', function(data) {
        const company = data.find(c => c.Project_ID === companyId);
        if (company) {
            // Set company for analytics
            AnalyticsController.setCompany(company);
        }
    });
}
