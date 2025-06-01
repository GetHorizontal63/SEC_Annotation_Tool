// Filings page JavaScript

document.addEventListener('DOMContentLoaded', function() {
  // DOM elements
  const filingsList = document.getElementById('filings-list');
  const filingSearch = document.getElementById('filing-search');
  const formTypeFilter = document.getElementById('form-type-filter');
  const startDateFilter = document.getElementById('start-date-filter');
  const endDateFilter = document.getElementById('end-date-filter');
  const companyFilter = document.getElementById('company-filter');
  
  // Pagination variables
  const itemsPerPage = 6;
  let currentPage = 1;
  let filteredFilings = [];
  let allFilings = [];
  let projectData = {};
  
  // Company name mapping (will be populated from project data)
  const companyNames = {};

  // Show loading indicator
  filingsList.innerHTML = '<div class="loading-indicator"><i class="fa-solid fa-spinner fa-spin"></i> Loading filings data...</div>';
  
  // Fetch project data first, then filings data
  loadProjectData()
    .then(() => fetchFilingsData())
    .catch(error => {
      console.error('Error in data loading chain:', error);
      filingsList.innerHTML = `<div class="error-message">
        <i class="fa-solid fa-triangle-exclamation"></i>
        Error loading data. Please try refreshing the page.
        <p class="error-details">${error.message}</p>
      </div>`;
    });
  
  // Add event listeners for search and filters
  filingSearch.addEventListener('input', filterFilings);
  formTypeFilter.addEventListener('change', filterFilings);
  startDateFilter.addEventListener('change', filterFilings);
  endDateFilter.addEventListener('change', filterFilings);
  companyFilter.addEventListener('change', filterFilings);
  
  // Set default date ranges
  setDefaultDateRange();
  
  // Functions
  async function loadProjectData() {
    try {
      const response = await fetch('../data/project_list.json');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch project data: ${response.status} ${response.statusText}`);
      }
      
      projectData = await response.json();
      
      // Populate companyNames with project data using the correct field names - UPDATED to use Regulatory_ID
      projectData.forEach(project => {
        if (project["Regulatory_ID"]) {
          // Store CIK as a string to ensure consistent matching
          const cik = project["Regulatory_ID"].toString();
          companyNames[cik] = {
            name: project["Lead_Organization"] || project["Lead Organization"] || `Company ${cik}`,
            officeSubprogram: project["Office_Subprogram"] || project["Office-Subprogram"] || "N/A"
          };
        }
      });
      
      console.log('Project data loaded:', projectData.length, 'projects');
      
    } catch (error) {
      console.error('Error loading project data:', error);
      throw new Error(`Failed to load project data: ${error.message}`);
    }
  }
  
  async function fetchFilingsData() {
    try {
      // The path is relative to the HTML file location
      const response = await fetch('../data/SEC_Filings_Current.json');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch filings data: ${response.status} ${response.statusText}`);
      }
      
      allFilings = await response.json();
      
      // Sort filings by date, newest first
      allFilings.sort((a, b) => {
        return new Date(b["Filing Date"]) - new Date(a["Filing Date"]);
      });
      
      // Ensure CIK values are strings for consistent matching
      allFilings.forEach(filing => {
        // Convert CIK to string if it's not already
        filing.CIK = filing.CIK.toString();
        
        // If a filing's CIK is not in our companyNames mapping, add a default entry
        if (!companyNames[filing.CIK]) {
          companyNames[filing.CIK] = {
            name: `CIK: ${filing.CIK}`,
            officeSubprogram: "Unknown"
          };
        }
      });
      
      // Initially set filtered filings to all filings
      filteredFilings = [...allFilings];
      
      // Initialize date range based on available data
      initializeDateRanges();
      
      // Populate company filter with available companies from the data
      populateCompanyFilter();
      
      // Populate form type filter with unique forms from the data
      populateFormTypeFilter();
      
      // Set default form type to 10-K
      formTypeFilter.value = '10-K';
      
      // Apply filters with the default values
      filterFilings();
      
      // Update annotation gauge after initial data load
      updateAnnotationGauge();
      
      // No need to call updateFilingsDisplay() directly as it's called by filterFilings()
    } catch (error) {
      console.error('Error loading filings data:', error);
      filingsList.innerHTML = `<div class="error-message">
        <i class="fa-solid fa-triangle-exclamation"></i>
        Error loading filings data. Please try refreshing the page.
        <p class="error-details">${error.message}</p>
      </div>`;
    }
  }
  
  function setDefaultDateRange() {
    // Set dates to specific range: Jan 1, 2025 to May 31, 2025
    const startDate = new Date(2025, 0, 1); // January 1, 2025
    const endDate = new Date(2025, 4, 31);  // May 31, 2025
    
    // Format dates for input fields (YYYY-MM-DD)
    startDateFilter.value = startDate.toISOString().split('T')[0];
    endDateFilter.value = endDate.toISOString().split('T')[0];
  }
  
  function initializeDateRanges() {
    if (allFilings.length > 0) {
      // Find earliest and latest filing dates in the data
      let earliestDate = new Date();
      let latestDate = new Date(0); // Jan 1, 1970
      
      allFilings.forEach(filing => {
        const filingDate = new Date(filing["Filing Date"]);
        if (filingDate < earliestDate) earliestDate = filingDate;
        if (filingDate > latestDate) latestDate = filingDate;
      });
      
      // Set min attributes for the date inputs
      const earliestDateStr = earliestDate.toISOString().split('T')[0];
      const latestDateStr = latestDate.toISOString().split('T')[0];
      
      startDateFilter.min = earliestDateStr;
      startDateFilter.max = latestDateStr;
      endDateFilter.min = earliestDateStr;
      endDateFilter.max = latestDateStr;
      
      // If the current date range is outside the available data, adjust it
      if (new Date(startDateFilter.value) < earliestDate) {
        startDateFilter.value = earliestDateStr;
      }
      
      if (new Date(endDateFilter.value) > latestDate) {
        endDateFilter.value = latestDateStr;
      }
    }
  }
  
  function populateCompanyFilter() {
    // Extract unique CIKs from the filings
    const ciks = [...new Set(allFilings.map(filing => filing.CIK))];
    
    // Clear existing options, keeping the "All Companies" option
    const allCompaniesOption = companyFilter.querySelector('option[value="all"]');
    companyFilter.innerHTML = '';
    companyFilter.appendChild(allCompaniesOption);
    
    // Create an array of companies with their information
    const companies = ciks.map(cik => {
      const company = companyNames[cik] || { name: `CIK: ${cik}`, officeSubprogram: "Unknown" };
      return { cik, ...company };
    }).sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
    
    // Add options for each company
    companies.forEach(company => {
      const option = document.createElement('option');
      option.value = company.cik; // Use CIK as value instead of ticker
      option.textContent = company.name;
      companyFilter.appendChild(option);
    });
    
    // Add event listener to style form-type-filter based on selection
    formTypeFilter.addEventListener('change', function() {
      // Apply visual styling if needed based on form type
      if (this.value !== 'all') {
        this.style.color = getFormTypeColor(this.value);
      } else {
        this.style.color = '';
      }
    });
  }
  
  function populateFormTypeFilter() {
    // Extract unique form types from the filings
    const formTypes = [...new Set(allFilings.map(filing => filing.Form))];
    
    // Sort alphabetically
    formTypes.sort();
    
    // Clear existing options, keeping the "All Forms" option
    const allFormsOption = formTypeFilter.querySelector('option[value="all"]');
    formTypeFilter.innerHTML = '';
    formTypeFilter.appendChild(allFormsOption);
    
    // Add options for each form type
    formTypes.forEach(formType => {
      const option = document.createElement('option');
      option.value = formType;
      option.textContent = formType;
      formTypeFilter.appendChild(option);
    });
  }
  
  // Helper function to get color based on form type
  function getFormTypeColor(formType) {
    switch(formType) {
      case '10-K':
        return '#3f88c5'; // Blue
      case '10-Q':
        return '#d4a72c'; // Yellow/Orange
      case '8-K':
        return '#3c9d40'; // Green
      case '20-F':
        return '#a16dfa'; // Purple
      default:
        return 'var(--gray-245)';
    }
  }
  
  function updateFilingsDisplay() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentFilings = filteredFilings.slice(startIndex, endIndex);
    
    displayFilings(currentFilings);
    updatePagination();
  }
  
  function displayFilings(filingsToDisplay) {
    filingsList.innerHTML = '';
    
    if (filingsToDisplay.length === 0) {
      filingsList.innerHTML = '<div class="no-results">No filings match your search criteria</div>';
      return;
    }
    
    filingsToDisplay.forEach(filing => {
      const filingCard = document.createElement('div');
      
      // Check if the filing has notes to determine if we should add the annotation class
      const hasAnnotation = filing.Notes && filing.Notes.trim() !== '';
      
      // Add the has-annotation class to the card if it has notes
      filingCard.className = `filing-card${hasAnnotation ? ' has-annotation' : ''}`;
      
      // Get company info from the mapping
      const company = companyNames[filing.CIK] || { 
        name: `CIK: ${filing.CIK}`, 
        officeSubprogram: "Unknown"
      };
      
      // Format date for display
      const filingDate = new Date(filing["Filing Date"]);
      const formattedDate = filingDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      
      // This will now work because getSubprogramClass is in the same scope
      const subprogramClass = getSubprogramClass(company.officeSubprogram);
      
      filingCard.innerHTML = `
        <div class="filing-header">
          <div class="filing-company">
            <span class="company-name">${company.name}</span>
            <span class="company-subprogram ${subprogramClass}">${company.officeSubprogram || 'N/A'}</span>
          </div>
          <div class="filing-type ${filing.Form.replace('-', '')}">${filing.Form}</div>
        </div>
        <div class="filing-details">
          <div class="filing-date-container">
            <div class="filing-date">Filed: ${formattedDate}</div>
          </div>
        </div>
        <div class="filing-actions">
          <button class="view-filing-btn">View Filing</button>
          <button class="download-filing-btn"><i class="fa-solid fa-download"></i></button>
          <button class="add-note-btn"><i class="fa-solid fa-note-sticky"></i></button>
          <button class="add-plus-btn"><i class="fa-solid fa-plus"></i></button>
        </div>
      `;
      
      filingsList.appendChild(filingCard);
    });
    
    // Add event listeners to the newly created buttons
    document.querySelectorAll('.view-filing-btn').forEach((btn, index) => {
      const filingIndex = (currentPage - 1) * itemsPerPage + index;
      if (filingIndex < filteredFilings.length) {
        btn.addEventListener('click', () => viewFiling(filteredFilings[filingIndex]));
      }
    });
    
    document.querySelectorAll('.download-filing-btn').forEach((btn, index) => {
      const filingIndex = (currentPage - 1) * itemsPerPage + index;
      if (filingIndex < filteredFilings.length) {
        btn.addEventListener('click', () => downloadFiling(filteredFilings[filingIndex]));
      }
    });
    
    document.querySelectorAll('.add-note-btn').forEach((btn, index) => {
      const filingIndex = (currentPage - 1) * itemsPerPage + index;
      if (filingIndex < filteredFilings.length) {
        btn.addEventListener('click', () => addNote(filteredFilings[filingIndex]));
      }
    });
    
    // Add event listeners for the new plus button
    document.querySelectorAll('.add-plus-btn').forEach((btn, index) => {
      const filingIndex = (currentPage - 1) * itemsPerPage + index;
      if (filingIndex < filteredFilings.length) {
        btn.addEventListener('click', () => openAnnotationOverlay(filteredFilings[filingIndex]));
      }
    });
  }
  
  function updatePagination() {
    const paginationContainer = document.getElementById('pagination-container');
    if (!paginationContainer) return;
    
    const totalPages = Math.ceil(filteredFilings.length / itemsPerPage);
    
    // Clear previous pagination
    paginationContainer.innerHTML = '';
    
    // Don't show pagination if there's only one page
    if (totalPages <= 1) return;
    
    // Create previous button
    const prevButton = document.createElement('button');
    prevButton.className = 'pagination-btn prev-btn';
    prevButton.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        updateFilingsDisplay();
      }
    });
    paginationContainer.appendChild(prevButton);
    
    // Create page buttons
    // Determine which page buttons to show
    let startPage = Math.max(1, currentPage - 1);
    let endPage = Math.min(totalPages, startPage + 2);
    
    // Adjust start if we're near the end
    if (endPage - startPage < 2) {
      startPage = Math.max(1, endPage - 2);
    }
    
    // First page button if not showing first page
    if (startPage > 1) {
      const firstPageBtn = document.createElement('button');
      firstPageBtn.className = 'pagination-btn page-btn';
      firstPageBtn.textContent = '1';
      firstPageBtn.addEventListener('click', () => {
        currentPage = 1;
        updateFilingsDisplay();
      });
      paginationContainer.appendChild(firstPageBtn);
      
      // Add ellipsis if needed
      if (startPage > 2) {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'pagination-ellipsis';
        ellipsis.textContent = '...';
        paginationContainer.appendChild(ellipsis);
      }
    }
    
    // Main page buttons
    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = document.createElement('button');
      pageBtn.className = `pagination-btn page-btn ${i === currentPage ? 'active' : ''}`;
      pageBtn.textContent = i;
      pageBtn.addEventListener('click', () => {
        currentPage = i;
        updateFilingsDisplay();
      });
      paginationContainer.appendChild(pageBtn);
    }
    
    // Last page button if not showing last page
    if (endPage < totalPages) {
      // Add ellipsis if needed
      if (endPage < totalPages - 1) {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'pagination-ellipsis';
        ellipsis.textContent = '...';
        paginationContainer.appendChild(ellipsis);
      }
      
      const lastPageBtn = document.createElement('button');
      lastPageBtn.className = 'pagination-btn page-btn';
      lastPageBtn.textContent = totalPages;
      lastPageBtn.addEventListener('click', () => {
        currentPage = totalPages;
        updateFilingsDisplay();
      });
      paginationContainer.appendChild(lastPageBtn);
    }
    
    // Create next button
    const nextButton = document.createElement('button');
    nextButton.className = 'pagination-btn next-btn';
    nextButton.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        updateFilingsDisplay();
      }
    });
    paginationContainer.appendChild(nextButton);
  }
  
  function filterFilings() {
    const searchTerm = filingSearch.value.toLowerCase();
    const formType = formTypeFilter.value;
    
    // Parse dates with timezone adjustment
    let startDate = null;
    if (startDateFilter.value) {
      // Add one day to the start date to fix the offset issue
      startDate = new Date(startDateFilter.value);
      startDate.setDate(startDate.getDate() + 1);
    }
    
    let endDate = null;
    if (endDateFilter.value) {
      // Add one day to the end date to fix the offset issue
      endDate = new Date(endDateFilter.value);
      endDate.setDate(endDate.getDate() + 1);
    }
    
    const company = companyFilter.value;
    
    filteredFilings = allFilings.filter(filing => {
      // Get company info for this filing
      const companyInfo = companyNames[filing.CIK] || { 
        name: `CIK: ${filing.CIK}`, 
        officeSubprogram: "Unknown" 
      };
      
      // Get filing date - normalize the date to prevent timezone issues
      const filingDateStr = filing["Filing Date"];
      const filingDate = new Date(filingDateStr);
      
      // Create a date-only version by setting to midnight in local timezone
      const filingDateOnly = new Date(
        filingDate.getFullYear(), 
        filingDate.getMonth(), 
        filingDate.getDate()
      );
      
      // Apply search term filter
      const matchesSearch = 
        companyInfo.name.toLowerCase().includes(searchTerm) ||
        companyInfo.officeSubprogram.toLowerCase().includes(searchTerm) ||
        (filing.Notes || '').toLowerCase().includes(searchTerm) ||
        filing.Form.toLowerCase().includes(searchTerm) ||
        filing["Accession Number"].toLowerCase().includes(searchTerm) ||
        (filing["Priority Consideration"] || '').toLowerCase().includes(searchTerm);
    
      // Apply dropdown filters
      const matchesFormType = formType === 'all' || filing.Form === formType;
      
      // Apply date range filter with proper inclusive boundaries
      let matchesDateRange = true;
      if (startDate) {
        // Set start date to beginning of day (00:00:00.000)
        const startDateOnly = new Date(
          startDate.getFullYear(), 
          startDate.getMonth(), 
          startDate.getDate(), 
          0, 0, 0, 0
        );
        matchesDateRange = filingDateOnly >= startDateOnly;
      }
      
      if (endDate && matchesDateRange) {
        // Set end date to end of day (23:59:59.999) to include the entire day
        const endDateOnly = new Date(
          endDate.getFullYear(), 
          endDate.getMonth(), 
          endDate.getDate(), 
          23, 59, 59, 999
        );
        matchesDateRange = filingDateOnly <= endDateOnly;
      }
      
      // Match company filter with string CIK values for consistency
      const matchesCompany = company === 'all' || filing.CIK === company;
      
      return matchesSearch && matchesFormType && matchesDateRange && matchesCompany;
    });
    
    // Reset to first page when filters change
    currentPage = 1;
    updateFilingsDisplay();
    
    // Update the annotation gauge after filtering
    updateAnnotationGauge();
  }
  
  // Add function to update the annotation gauge
  function updateAnnotationGauge() {
    // Calculate percentage of annotated filings
    const totalFilings = filteredFilings.length;
    let annotatedFilings = 0;
    
    if (totalFilings > 0) {
      annotatedFilings = filteredFilings.filter(filing => {
        return filing.Notes && filing.Notes.trim() !== '';
      }).length;
    }
    
    const annotationPercentage = totalFilings > 0 ? Math.round((annotatedFilings / totalFilings) * 100) : 0;
    
    // Update the donut chart
    const donutSegment = document.getElementById('donut-segment');
    const percentageDisplay = document.querySelector('.donut-percentage');
    
    if (donutSegment && percentageDisplay) {
      // Update the stroke dasharray to show the percentage
      donutSegment.setAttribute('stroke-dasharray', `${annotationPercentage} ${100 - annotationPercentage}`);
      
      // Update the percentage text
      percentageDisplay.textContent = `${annotationPercentage}%`;
      
      // Change color based on percentage
      if (annotationPercentage < 25) {
        donutSegment.setAttribute('stroke', 'var(--red)');
      } else if (annotationPercentage < 75) {
        donutSegment.setAttribute('stroke', 'var(--orange)');
      } else {
        donutSegment.setAttribute('stroke', 'var(--green)');
      }
    }
  }
  
  function viewFiling(filing) {
    console.log(`Viewing filing: ${filing["Accession Number"]}`);
    // In a real app, this would navigate to the filing viewer page or open the SEC URL
    window.open(filing["Filing URL"], '_blank');
  }
  
  function downloadFiling(filing) {
    console.log(`Downloading filing: ${filing["Accession Number"]}`);
    // In a real app, this would trigger a file download
    alert(`Downloading filing ${filing["Accession Number"]}`);
  }
  
  function addNote(filing) {
    console.log(`Adding note for filing: ${filing["Accession Number"]}`);
    // Instead of redirecting to notes.html, open the annotation overlay
    openAnnotationOverlay(filing);
  }

  // Add new function to handle plus button clicks
  function addPlus(filing) {
    openAnnotationOverlay(filing);
  }
  
  // Add new variables for annotation overlay
  const annotationOverlay = document.getElementById('annotation-overlay');
  const closeAnnotationBtn = document.getElementById('close-annotation');
  const cancelAnnotationBtn = document.getElementById('cancel-annotation');
  const saveAnnotationBtn = document.getElementById('save-annotation');
  const annotationNotes = document.getElementById('annotation-notes');
  const charCount = document.getElementById('char-count');
  const annotationCompanyName = document.getElementById('annotation-company-name');
  const annotationFilingType = document.getElementById('annotation-filing-type');
  const annotationFilingDate = document.getElementById('annotation-filing-date');
  
  // Current filing being annotated
  let currentFiling = null;
  
  function openAnnotationOverlay(filing) {
    currentFiling = filing;
    
    // Get company info
    const company = companyNames[filing.CIK] || { 
      name: `CIK: ${filing.CIK}`, 
      officeSubprogram: "Unknown"
    };
    
    // Format date for display
    const filingDate = new Date(filing["Filing Date"]);
    const formattedDate = filingDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    
    // Populate the annotation fields
    annotationCompanyName.textContent = company.name;
    annotationFilingType.textContent = filing.Form;
    annotationFilingDate.textContent = `Filed: ${formattedDate}`;
    
    // Clear form fields or populate with existing data if available
    annotationNotes.value = filing.Notes || '';
    
    // Extract reviewer from notes if present
    let reviewerValue = '';
    if (filing.Notes) {
      const reviewerMatch = filing.Notes.match(/^\[(.*?)\s*-\s*.*?\]/);
      if (reviewerMatch && reviewerMatch[1]) {
        reviewerValue = reviewerMatch[1].trim();
      }
    }
    
    document.getElementById('annotation-reviewer').value = reviewerValue;
    document.getElementById('annotation-recommendation').value = filing.Recommendation || '';
    document.getElementById('annotation-priority').value = filing["Priority Consideration"] || '';
    
    // Update character count
    updateCharCount();
    
    // Show the overlay
    annotationOverlay.classList.remove('hidden');
    
    // Set focus to the notes field
    annotationNotes.focus();
  }
  
  function closeAnnotationOverlay() {
    annotationOverlay.classList.add('hidden');
    currentFiling = null;
  }
  
  function updateCharCount() {
    const count = annotationNotes.value.length;
    charCount.textContent = count;
    
    // Optional: Change color when approaching limit
    if (count > 9000) {
      charCount.style.color = 'var(--red)';
    } else if (count > 7500) {
      charCount.style.color = 'var(--orange)';
    } else {
      charCount.style.color = '';
    }
  }
  
  function saveAnnotation() {
    if (!currentFiling) return;
    
    // Get values from form
    let notes = annotationNotes.value.trim();
    const reviewer = document.getElementById('annotation-reviewer').value;
    const recommendation = document.getElementById('annotation-recommendation').value;
    const priority = document.getElementById('annotation-priority').value;
    
    // Add validation if needed
    if (!reviewer) {
      alert('Please select a reviewer.');
      return;
    }
    
    if (!recommendation) {
      alert('Please select a recommendation.');
      return;
    }
    
    // Only validate priority if recommendation is not "Skip"
    if (recommendation !== "Skip" && !priority) {
      alert('Please select a priority level.');
      return;
    }
    
    // Format the current date
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    
    // Check if notes already has a reviewer prefix
    if (notes.match(/^\[.*?\s*-\s*.*?\]/)) {
      // Remove existing prefix
      notes = notes.replace(/^\[.*?\s*-\s*.*?\]/, '').trim();
    }
    
    // Format notes with reviewer and date
    notes = `[${reviewer} - ${formattedDate}] ${notes}`;
    
    // Update the filing object with annotation data
    currentFiling.Notes = notes;
    currentFiling.Recommendation = recommendation;
    
    // Set Priority Consideration to empty string if recommendation is Skip
    if (recommendation === "Skip") {
      currentFiling["Priority Consideration"] = "";
    } else {
      currentFiling["Priority Consideration"] = priority;
    }
    
    // Find the filing in allFilings and update it
    const filingIndex = allFilings.findIndex(filing => 
      filing["Accession Number"] === currentFiling["Accession Number"]);
    
    if (filingIndex !== -1) {
      // Update the filing in allFilings
      allFilings[filingIndex].Notes = notes;
      allFilings[filingIndex].Recommendation = recommendation;
      
      // Set Priority Consideration to empty string if recommendation is Skip
      if (recommendation === "Skip") {
        allFilings[filingIndex]["Priority Consideration"] = "";
      } else {
        allFilings[filingIndex]["Priority Consideration"] = priority;
      }
      
      // Delete the old Priority field if it exists to avoid confusion
      if (allFilings[filingIndex].Priority) {
        delete allFilings[filingIndex].Priority;
      }
      
      // Save the updated allFilings back to the file
      saveFilingsToFile(allFilings);
    }
    
    // Show success message before waiting for file save to complete
    showSaveConfirmation();
    
    // Close the overlay
    closeAnnotationOverlay();
    
    // Refresh the display to show any visual indicators related to annotations
    updateFilingsDisplay();
    
    // Update the annotation gauge
    updateAnnotationGauge();
  }
  
  // Function to save filings data back to file
  function saveFilingsToFile(filingsData) {
    // Log the save attempt for debugging
    console.log('Attempting to save filings data to file...');
    
    return fetch('/write', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // Use server-relative path to ensure consistency
        path: 'data/SEC_Filings_Current.json',
        content: JSON.stringify(filingsData, null, 2)
      })
    })
    .then(response => {
      if (!response.ok) {
        // More detailed error logging
        console.error(`Error response from server: ${response.status} ${response.statusText}`);
        
        return response.json().then(data => {
          throw new Error(`Failed to save data to file: ${data.message || response.statusText}`);
        }).catch(err => {
          // If response isn't JSON, use status text
          throw new Error(`Failed to save data to file: ${response.status} ${response.statusText}`);
        });
      }
      console.log('Server responded with OK status');
      return response.json();
    })
    .then(data => {
      console.log('Filings data saved successfully:', data);
    })
    .catch(error => {
      console.error('Error saving filings data:', error);
      // Show error notification to user
      alert(`Warning: Your annotation was saved in memory but there was an error saving to the file system. Changes may be lost when you refresh the page.\n\nError details: ${error.message}`);
    });
  }
  
  // Function to show save confirmation
  function showSaveConfirmation() {
    const saveConfirmation = document.createElement('div');
    saveConfirmation.className = 'save-confirmation';
    saveConfirmation.textContent = 'Annotation saved successfully!';
    document.body.appendChild(saveConfirmation);
    
    setTimeout(() => {
      saveConfirmation.classList.add('visible');
    }, 10);
    
    setTimeout(() => {
      saveConfirmation.classList.remove('visible');
      setTimeout(() => {
        document.body.removeChild(saveConfirmation);
      }, 300);
    }, 2000);
  }
  
  // Add event listeners for the annotation overlay
  if (closeAnnotationBtn) {
    closeAnnotationBtn.addEventListener('click', closeAnnotationOverlay);
  }
  
  if (cancelAnnotationBtn) {
    cancelAnnotationBtn.addEventListener('click', closeAnnotationOverlay);
  }
  
  if (saveAnnotationBtn) {
    saveAnnotationBtn.addEventListener('click', saveAnnotation);
  }
  
  if (annotationNotes) {
    annotationNotes.addEventListener('input', updateCharCount);
  }
  
  // Also close the overlay when clicking outside the modal
  if (annotationOverlay) {
    annotationOverlay.addEventListener('click', function(e) {
      if (e.target === annotationOverlay) {
        closeAnnotationOverlay();
      }
    });
  }
  
  // Add keyboard support for closing the overlay with Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && !annotationOverlay.classList.contains('hidden')) {
      closeAnnotationOverlay();
    }
  });
  
  // Move getSubprogramClass function inside the DOMContentLoaded event listener
  function getSubprogramClass(subprogram) {
    if (!subprogram) return 'subprogram-other';
    
    // Format subprogram as CSS class name by removing spaces and special characters
    return `subprogram-${subprogram.trim().replace(/[^A-Z0-9]/gi, '-')}`;
  }
});

/**
 * SEC Filings management module
 * Handles loading and accessing SEC filing data
 */
const filingsManager = (function() {
  // Private storage for filings data
  let allFilings = [];
  let filingsByCIK = new Map();
  
  /**
   * Load SEC filings from JSON file
   * @returns {Promise<Array>} List of filing objects
   */
  async function loadFilings() {
    try {
      const response = await fetch('data/SEC_Filings_Current.json');
      if (!response.ok) {
        throw new Error(`Failed to load SEC filings: ${response.status} ${response.statusText}`);
      }
      
      allFilings = await response.json();
      
      // Organize filings by CIK for faster lookup
      filingsByCIK.clear();
      allFilings.forEach(filing => {
        const cik = String(filing.CIK);
        if (!filingsByCIK.has(cik)) {
          filingsByCIK.set(cik, []);
        }
        filingsByCIK.get(cik).push(filing);
      });
      
      console.log(`Loaded ${allFilings.length} SEC filings`);
      return allFilings;
    } catch (error) {
      console.error('Error loading SEC filings:', error);
      return [];
    }
  }
  
  /**
   * Get all filings for a specific CIK
   * @param {string} cik - Company CIK
   * @returns {Array} List of filings for the specified CIK
   */
  function getFilingsByCIK(cik) {
    return filingsByCIK.get(String(cik)) || [];
  }
  
  /**
   * Get all filings
   * @returns {Array} List of all filings
   */
  function getAllFilings() {
    return [...allFilings];
  }
  
  /**
   * Filter filings by criteria
   * @param {Object} criteria - Filter criteria
   * @returns {Array} Filtered filings
   */
  function filterFilings(criteria = {}) {
    return allFilings.filter(filing => {
      // Apply each criterion
      for (const [key, value] of Object.entries(criteria)) {
        if (filing[key] !== value) {
          return false;
        }
      }
      return true;
    });
  }
  
  /**
   * Initialize the filings manager
   * @returns {Promise<void>}
   */
  async function initialize() {
    await loadFilings();
  }
  
  // Public API
  return {
    initialize,
    loadFilings,
    getFilingsByCIK,
    getAllFilings,
    filterFilings
  };
})();
