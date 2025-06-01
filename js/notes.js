// Notes page JavaScript

document.addEventListener('DOMContentLoaded', function() {
  // DOM elements
  const notesList = document.getElementById('notes-list');
  const noteTitle = document.getElementById('note-title');
  const noteContent = document.getElementById('note-content');
  const saveNoteBtn = document.getElementById('save-note');
  const deleteNoteBtn = document.getElementById('delete-note');
  const notesSearch = document.getElementById('notes-search');
  const sortNotesBtn = document.getElementById('sort-notes');
  const exportCsvBtn = document.getElementById('export-csv-btn');
  
  // Add references to the new dropdown elements
  const notePriority = document.getElementById('note-priority');
  const noteRecommendation = document.getElementById('note-recommendation');
  
  // Add reference to the new View Filing button
  const viewFilingBtn = document.getElementById('view-filing-btn') || createViewFilingButton();
  
  // Function to create the view filing button if it doesn't exist in HTML
  function createViewFilingButton() {
    const btn = document.createElement('button');
    btn.id = 'view-filing-btn';
    btn.className = 'editor-button view-filing-btn';
    btn.innerHTML = '<i class="fa-solid fa-external-link-alt"></i> Filing';
    btn.title = 'Open the SEC filing in a new tab';
    btn.disabled = true;
    
    // Insert the button before the save button
    const editorActions = document.querySelector('.editor-actions');
    if (editorActions) {
      editorActions.insertBefore(btn, saveNoteBtn);
    }
    
    return btn;
  }
  
  // Add a click event listener to the view filing button
  viewFilingBtn.addEventListener('click', function() {
    if (currentNote && currentNote.originalFiling && currentNote.originalFiling["Filing URL"]) {
      window.open(currentNote.originalFiling["Filing URL"], '_blank');
    }
  });
  
  // Add a reference to the Update Data button (assuming it exists in the HTML)
  const updateDataBtn = document.getElementById('update-data-btn');
  if (updateDataBtn) {
    updateDataBtn.addEventListener('click', runEdgarUpdate);
  }
  
  // Variables to track edgar.py progress
  let edgarPollingInterval = null;
  let edgarProgressMessages = new Set(); // Use Set to avoid duplicate messages
  let lastShownMessage = null;
  let isProcessing = false;

  // Function to run edgar.py update
  function runEdgarUpdate() {
    // Confirm the user wants to update data
    if (!confirm('Start SEC data update process? This may take several minutes.')) {
      return;
    }
    
    // Show initial message
    showProgressNotification('Starting SEC data update process...');
    
    // Get the current server origin
    const serverUrl = window.location.origin;
    
    // Call the server endpoint to run edgar.py
    fetch(`${serverUrl}/run_edgar`, {
      method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
      if (data.status === 'started' || data.status === 'running') {
        // Show the first update
        showProgressNotification('SEC data update process started successfully');
        isProcessing = true;
        
        // Start polling for progress updates
        startProgressPolling();
      } else {
        showProgressNotification(`Error: ${data.message || 'Unknown error'}`);
      }
    })
    .catch(error => {
      console.error('Error starting update process:', error);
      showProgressNotification(`Error starting update process: ${error.message}`);
    });
  }
  
  // Function to show progress notification (similar to save notification)
  function showProgressNotification(message) {
    // Ignore empty messages
    if (!message || message.trim() === '') return;
    
    // Remember this message to avoid duplicates
    if (edgarProgressMessages.has(message)) return;
    edgarProgressMessages.add(message);
    lastShownMessage = message;
    
    // Create notification element (like the save confirmation)
    const notification = document.createElement('div');
    notification.className = 'save-confirmation';
    
    // Style message based on content
    if (message.startsWith('ERROR:')) {
      notification.style.background = 'rgba(239, 83, 80, 0.9)'; // Red for errors
    } else if (message.includes('complete') || message.includes('successfully')) {
      notification.style.background = 'rgba(76, 175, 80, 0.9)'; // Green for success
    } else {
      notification.style.background = 'rgba(66, 165, 245, 0.9)'; // Blue for info
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Show notification with animation
    setTimeout(() => {
      notification.classList.add('visible');
    }, 10);
    
    // Hide after 3 seconds
    setTimeout(() => {
      notification.classList.remove('visible');
      setTimeout(() => {
        // Only remove if it's still in the DOM
        if (notification.parentNode) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }
  
  // Function to start polling for progress updates
  function startProgressPolling() {
    // Clear any existing interval
    if (edgarPollingInterval) {
      clearInterval(edgarPollingInterval);
    }
    
    // Start new polling interval
    edgarPollingInterval = setInterval(() => {
      // Get the current server origin
      const serverUrl = window.location.origin;
      
      // Fetch progress updates
      fetch(`${serverUrl}/edgar-progress`)
        .then(response => response.json())
        .then(data => {
          if (data.status === 'success') {
            // Display new messages as notifications
            if (data.messages.length > 0) {
              // Only show most recent message to avoid notification spam
              const latestMsg = data.messages[data.messages.length - 1];
              if (latestMsg !== lastShownMessage) {
                showProgressNotification(latestMsg);
              }
            }
            
            // If process is complete, stop polling and show final notification
            if (!data.running && isProcessing) {
              isProcessing = false;
              showProgressNotification('SEC data update process complete!');
              stopProgressPolling();
            }
          }
        })
        .catch(error => {
          console.error('Error fetching progress updates:', error);
          showProgressNotification(`Error fetching progress: ${error.message}`);
          stopProgressPolling();
        });
    }, 2000); // Poll every 2 seconds
  }
  
  // Function to stop progress polling
  function stopProgressPolling() {
    if (edgarPollingInterval) {
      clearInterval(edgarPollingInterval);
      edgarPollingInterval = null;
    }
  }

  // Filter elements
  const toggleFiltersBtn = document.getElementById('toggle-filters-btn');
  const filtersPanel = document.getElementById('filters-panel');
  const dateFrom = document.getElementById('date-from');
  const dateTo = document.getElementById('date-to');
  const dateFromDisplay = document.getElementById('date-from-display');
  const dateToDisplay = document.getElementById('date-to-display');
  const companyFilter = document.getElementById('company-filter');
  const priorityFilter = document.getElementById('priority-filter');
  const recommendationFilter = document.getElementById('recommendation-filter');
  const applyFiltersBtn = document.getElementById('apply-filters');
  const resetFiltersBtn = document.getElementById('reset-filters');
  
  // Custom date input handling - IMPROVED VERSION
  function setupCustomDateInput(dateInput, displayInput) {
    // When the native date input changes, update the display input with MM/DD/YY format
    dateInput.addEventListener('change', function() {
      if (this.value) {
        const parts = this.value.split('-');
        if (parts.length === 3) {
          // Format as MM/DD/YY
          displayInput.value = `${parts[1]}/${parts[2]}/${parts[0].substring(2)}`;
        }
      } else {
        displayInput.value = '';
      }
    });
    
    // When display input changes, parse the MM/DD/YY format and update the date input
    displayInput.addEventListener('input', function(e) {
      let value = e.target.value.replace(/[^\d\/]/g, ''); // Keep only digits and slashes
      
      // Auto-add slashes if the user is typing numbers only
      if (!value.includes('/')) {
        if (value.length > 0) {
          // Format as they type (MM/DD/YY)
          if (value.length <= 2) {
            // Just show month
            displayInput.value = value;
          } else if (value.length <= 4) {
            // Show MM/DD
            displayInput.value = `${value.substring(0, 2)}/${value.substring(2)}`;
          } else {
            // Show MM/DD/YY
            displayInput.value = `${value.substring(0, 2)}/${value.substring(2, 4)}/${value.substring(4, 6)}`;
          }
        }
      } else {
        // User is typing with slashes already, use their input directly
        displayInput.value = value;
      }
      
      // Parse the display value to update the actual date input
      const displayValue = displayInput.value;
      const parts = displayValue.split('/');
      
      if (parts.length === 3 && parts[2].length === 2) {
        const month = parts[0].padStart(2, '0');
        const day = parts[1].padStart(2, '0');
        const year = parseInt(parts[2]) < 30 ? `20${parts[2]}` : `19${parts[2]}`;
        
        try {
          // Only set the date if it's valid
          const testDate = new Date(`${year}-${month}-${day}`);
          if (!isNaN(testDate.getTime())) {
            dateInput.value = `${year}-${month}-${day}`;
            // Ensure the change event is fired
            dateInput.dispatchEvent(new Event('change', { bubbles: true }));
          }
        } catch (e) {
          // Invalid date, don't update the hidden input
          console.log('Invalid date format');
        }
      }
    });
    
    // Also handle manual focus events on both inputs
    displayInput.addEventListener('focus', function() {
      if (dateInput.value) {
        // When the display input gets focus, update it with the real date value
        const parts = dateInput.value.split('-');
        if (parts.length === 3) {
          displayInput.value = `${parts[1]}/${parts[2]}/${parts[0].substring(2)}`;
        }
      }
    });
    
    // Make sure clicks on the display also open the date picker
    displayInput.addEventListener('click', function(e) {
      dateInput.focus();
      dateInput.click();
      e.preventDefault(); // Prevent default to ensure datepicker opens
    });
  }
  
  // Set up custom date inputs
  setupCustomDateInput(dateFrom, dateFromDisplay);
  setupCustomDateInput(dateTo, dateToDisplay);
  
  // Set custom placeholders for date fields
  dateFrom.setAttribute('data-placeholder', 'mm/dd/yy');
  dateTo.setAttribute('data-placeholder', 'mm/dd/yy');
  
  // Function to format dates as MM/DD/YY for display
  function formatDateForDisplay(inputElement) {
    if (!inputElement.value) return;
    
    // Get the date from the input (native format is YYYY-MM-DD)
    const dateParts = inputElement.value.split('-');
    if (dateParts.length !== 3) return;
    
    const year = dateParts[0].substring(2); // Get only last 2 digits
    const month = dateParts[1];
    const day = dateParts[2];
    
    // Create formatted display text (MM/DD/YY)
    const formattedDate = `${month}/${day}/${year}`;
    
    // Store the formatted text as a data attribute
    inputElement.setAttribute('data-display-value', formattedDate);
    
    // Use CSS to show the formatted value instead of the native value
    inputElement.classList.add('formatted-date');
  }
  
  // Apply formatting when dates are set/changed
  dateFrom.addEventListener('change', function() {
    formatDateForDisplay(this);
  });
  
  dateTo.addEventListener('change', function() {
    formatDateForDisplay(this);
  });
  
  // Format any pre-selected dates on page load
  if (dateFrom.value) formatDateForDisplay(dateFrom);
  if (dateTo.value) formatDateForDisplay(dateTo);
  
  // Add event listeners to convert between yy and yyyy formats
  dateFrom.addEventListener('change', function() {
    if (this.value) {
      // The input value will be yyyy-mm-dd, but we don't change it since it's the correct format for the date input
      console.log('Date from set to:', this.value);
    }
  });
  
  dateTo.addEventListener('change', function() {
    if (this.value) {
      // The input value will be yyyy-mm-dd, but we don't change it since it's the correct format for the date input
      console.log('Date to set to:', this.value);
    }
  });

  // Ensure the notes list is scrollable and contained
  notesList.style.maxHeight = 'calc(80vh - 180px)';
  notesList.style.overflowY = 'auto';
  
  // Current note being edited
  let currentNote = null;
  let sortOrder = 'newest'; // 'newest' or 'oldest'
  
  // Array to store notes
  let notes = [];
  let filteredNotes = [];
  let allCompanies = new Set();
  
  // Store the original SEC filings data
  let allFilings = [];
  
  // Store the original project data for CSV export
  let projectData = [];
  
  // Company name mapping (will be populated from project data)
  let companyNames = {};
  
  // Filter state
  let activeFilters = {
    dateFrom: '',
    dateTo: '',
    company: 'all',
    priority: 'all',
    recommendation: 'all',
    searchTerm: ''
  };
  
  // First load the project data to get company names
  fetch('../data/project_list.json')
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to load project data');
      }
      return response.json();
    })
    .then(data => {
      // Store the original project data for CSV export
      projectData = data;
      
      // Populate companyNames with project data - UPDATED to use Regulatory_ID instead of CIK Number
      data.forEach(project => {
        if (project["Regulatory_ID"]) {
          // Store CIK as a string to ensure consistent matching
          const cik = project["Regulatory_ID"].toString();
          companyNames[cik] = {
            name: project["Lead_Organization"] || project["Lead Organization"] || `Company ${cik}`,
            officeSubprogram: project["Office_Subprogram"] || project["Office-Subprogram"] || "N/A"
          };
        }
      });
      
      console.log('Project data loaded:', data.length, 'projects');
      
      // Now fetch the SEC filings data
      return fetch('../data/SEC_Filings_Current.json');
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to load SEC filings data');
      }
      return response.json();
    })
    .then(filings => {
      console.log('Filings loaded:', filings.length);
      
      // Store all filings for later reference
      allFilings = filings;
      
      // Only filter out filings without notes
      const filingsToShow = filings.filter(filing => 
        filing["Notes"] && 
        filing["Notes"].trim() !== "" && 
        filing["Notes"] !== "."
      );
      
      console.log('Filings with notes:', filingsToShow.length);
      
      // Ensure CIK values are strings for consistent matching
      filingsToShow.forEach(filing => {
        filing.CIK = filing.CIK.toString();
        
        // If a filing's CIK is not in our companyNames mapping, add a default entry
        if (!companyNames[filing.CIK]) {
          companyNames[filing.CIK] = {
            name: `CIK: ${filing.CIK}`,
            officeSubprogram: "Unknown"
          };
        }
        
        // Add company name to allCompanies for the filter dropdown
        const companyName = companyNames[filing.CIK].name;
        allCompanies.add(companyName);
      });
      
      // Populate company filter dropdown
      populateCompanyFilter(Array.from(allCompanies).sort());
      
      // Convert filings to notes format
      notes = filingsToShow.map((filing, index) => {
        const filingDate = filing["Filing Date"] ? new Date(filing["Filing Date"]) : new Date();
        const companyName = companyNames[filing.CIK].name;
        
        return {
          id: index + 1,
          title: filing["Form"] ? `${filing["Form"]} - ${companyName || "Unknown"}` : `Filing ${index + 1}`,
          content: `${filing["Notes"] || ""}`,
          created: filingDate.toISOString(),
          updated: filingDate.toISOString(),
          company: companyName || "",
          recommendation: filing["Recommendation"] || "Skip", // Default to Skip if not specified
          // Store the original filing data for reference
          originalFiling: filing,
          // Store the company info from project data
          companyInfo: companyNames[filing.CIK]
        };
      });
      
      filteredNotes = [...notes]; // Initialize filteredNotes with all notes
      
      // Add a few sample notes if none were loaded
      if (notes.length === 0) {
        notes = [
          {
            id: 1,
            title: "Apple Revenue Analysis",
            content: "Apple's revenue grew by 8% year-over-year, primarily driven by services and wearables. iPhone sales were slightly down compared to previous quarter but up YoY.",
            created: "2023-03-15T14:30:00",
            updated: "2023-03-15T16:45:00",
            company: "Apple Inc.",
            recommendation: "Report",
            originalFiling: {
              "Priority Consideration": "High",
              "Recommendation": "Report",
              "Company Name": "Apple Inc."
            }
          },
          {
            id: 2,
            title: "Microsoft Cloud Strategy",
            content: "Microsoft's focus on Azure and cloud services continues to pay off with 26% growth in the Intelligent Cloud segment. Azure and other cloud services grew 31% YoY.",
            created: "2023-02-28T09:15:00",
            updated: "2023-03-01T11:20:00",
            company: "Microsoft Corporation",
            recommendation: "Track",
            originalFiling: {
              "Priority Consideration": "Medium",
              "Recommendation": "Track",
              "Company Name": "Microsoft Corporation"
            }
          },
          {
            id: 3,
            title: "Key Financial Ratios to Track",
            content: "Important ratios to monitor across companies:\n- P/E Ratio\n- Debt-to-Equity\n- Current Ratio\n- Return on Equity\n- Gross Margin",
            created: "2023-01-20T13:45:00",
            updated: "2023-01-20T13:45:00",
            relatedFiling: "",
            company: "",
            recommendation: "",
            originalFiling: {
              "Priority Consideration": "Low",
              "Recommendation": ""
            }
          }
        ];
        
        filteredNotes = [...notes];
        allCompanies.add("Apple Inc.");
        allCompanies.add("Microsoft Corporation");
        populateCompanyFilter(Array.from(allCompanies).sort());
      }
      
      // Display the notes
      displayNotes(filteredNotes);
      
      // Check if URL contains a filing parameter
      const urlParams = new URLSearchParams(window.location.search);
      const filingId = urlParams.get('filing');
      if (filingId) {
        const matchingFiling = filings.find(f => f["Accession Number"] === filingId);
        if (matchingFiling) {
          createNewNote();
          noteTitle.value = `${matchingFiling["Form"] || "Filing"} - Note`;
          // Store the original filing reference
          currentNote.originalFiling = matchingFiling;
        }
      }
    })
    .catch(error => {
      console.error('Error loading data:', error);
      // Load sample notes as fallback
      notes = [
        {
          id: 1,
          title: "Apple Revenue Analysis",
          content: "Apple's revenue grew by 8% year-over-year, primarily driven by services and wearables. iPhone sales were slightly down compared to previous quarter but up YoY.",
          created: "2023-03-15T14:30:00",
          updated: "2023-03-15T16:45:00",
          company: "Apple Inc.",
          recommendation: "Report",
          originalFiling: {
            "Priority Consideration": "High",
            "Recommendation": "Report",
            "Company Name": "Apple Inc."
          }
        },
        {
          id: 2,
          title: "Microsoft Cloud Strategy",
          content: "Microsoft's focus on Azure and cloud services continues to pay off with 26% growth in the Intelligent Cloud segment. Azure and other cloud services grew 31% YoY.",
          created: "2023-02-28T09:15:00",
          updated: "2023-03-01T11:20:00",
          company: "Microsoft Corporation",
          recommendation: "Track",
          originalFiling: {
            "Priority Consideration": "Medium",
            "Recommendation": "Track",
            "Company Name": "Microsoft Corporation"
          }
        },
        {
          id: 3,
          title: "Key Financial Ratios to Track",
          content: "Important ratios to monitor across companies:\n- P/E Ratio\n- Debt-to-Equity\n- Current Ratio\n- Return on Equity\n- Gross Margin",
            created: "2023-01-20T13:45:00",
            updated: "2023-01-20T13:45:00",
            relatedFiling: "",
            company: "",
            recommendation: "",
            originalFiling: {
              "Priority Consideration": "Low",
              "Recommendation": ""
            }
          }
        ];
        
        filteredNotes = [...notes];
        allCompanies.add("Apple Inc.");
        allCompanies.add("Microsoft Corporation");
        populateCompanyFilter(Array.from(allCompanies).sort());
        displayNotes(filteredNotes);
      });
    
    // Add event listeners
    saveNoteBtn.addEventListener('click', saveNote);
    deleteNoteBtn.addEventListener('click', deleteNote);
    notesSearch.addEventListener('input', searchNotes);
    if (sortNotesBtn) {
      sortNotesBtn.addEventListener('click', toggleSortOrder);
    }
    if (exportCsvBtn) {
      exportCsvBtn.addEventListener('click', exportFilteredNotesToCsv);
    }
    
    // Filter event listeners
    toggleFiltersBtn.addEventListener('click', toggleFilters);
    applyFiltersBtn.addEventListener('click', applyFilters);
    resetFiltersBtn.addEventListener('click', resetFilters);
    
    // Function to toggle the filters panel
    function toggleFilters() {
      // Position the filter panel near the button
      if (!filtersPanel.classList.contains('visible')) {
        // Get button position
        const buttonRect = toggleFiltersBtn.getBoundingClientRect();
        
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
      
      // Update button icon
      toggleFiltersBtn.innerHTML = filtersPanel.classList.contains('visible') 
        ? '<i class="fa-solid fa-filter-circle-xmark"></i>' 
        : '<i class="fa-solid fa-filter"></i>';
    }
    
    // Populate company filter dropdown
    function populateCompanyFilter(companies) {
      // Keep the "All Companies" option
      companyFilter.innerHTML = '<option value="all">All Companies</option>';
      
      // Add each company as an option
      companies.forEach(company => {
        if (company) {
          const option = document.createElement('option');
          option.value = company;
          option.textContent = company;
          companyFilter.appendChild(option);
        }
      });
    }
    
    // Apply filters
    function applyFilters() {
      // Update filter state
      activeFilters.dateFrom = dateFrom.value;
      activeFilters.dateTo = dateTo.value;
      activeFilters.company = companyFilter.value;
      activeFilters.priority = priorityFilter.value;
      activeFilters.recommendation = recommendationFilter.value;
      
      // Filter notes based on active filters
      filteredNotes = notes.filter(note => {
        // Filter by date
        if (!filterByDate(note, activeFilters)) {
          return false;
        }
        
        // Filter by company
        if (activeFilters.company !== 'all' && note.company !== activeFilters.company) {
          return false;
        }
        
        // Filter by priority
        if (activeFilters.priority !== 'all' && 
            (!note.originalFiling || note.originalFiling["Priority Consideration"] !== activeFilters.priority)) {
          return false;
        }
        
        // Filter by recommendation
        if (activeFilters.recommendation !== 'all' && 
            (!note.originalFiling || note.originalFiling["Recommendation"] !== activeFilters.recommendation)) {
          return false;
        }
        
        // Also apply any active search term
        if (activeFilters.searchTerm) {
          return note.title.toLowerCase().includes(activeFilters.searchTerm) || 
                 note.content.toLowerCase().includes(activeFilters.searchTerm);
        }
        
        return true;
      });
      
      // Display filtered notes
      displayNotes(filteredNotes);
    }
    
    // Helper function to filter by date
    function filterByDate(note, filters) {
      // If no dates are selected, show all notes
      if (!filters.dateFrom && !filters.dateTo) {
        return true;
      }
      
      // Determine which date to use from the note (filing date or updated date)
      let noteDate;
      if (note.originalFiling && note.originalFiling["Filing Date"]) {
        noteDate = new Date(note.originalFiling["Filing Date"]);
      } else {
        noteDate = new Date(note.updated);
      }
      
      // Set time to start of day for consistent comparison
      noteDate.setHours(0, 0, 0, 0);
      
      // Filter with only From date
      if (filters.dateFrom && !filters.dateTo) {
        const fromDate = new Date(filters.dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        return noteDate >= fromDate;
      }
      
      // Filter with only To date
      if (!filters.dateFrom && filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999); // End of day
        return noteDate <= toDate;
      }
      
      // Filter with both dates
      const fromDate = new Date(filters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      return noteDate >= fromDate && noteDate <= toDate;
    }
    
    // Reset filters
    function resetFilters() {
      dateFrom.value = '';
      dateTo.value = '';
      companyFilter.value = 'all';
      priorityFilter.value = 'all';
      recommendationFilter.value = 'all';
      
      // Reset filter state
      activeFilters = {
        dateFrom: '',
        dateTo: '',
        company: 'all',
        priority: 'all',
        recommendation: 'all',
        searchTerm: activeFilters.searchTerm // Keep the search term
      };
      
      // Apply reset filters
      if (activeFilters.searchTerm) {
        searchNotes(); // This will apply just the search filter
      } else {
        filteredNotes = [...notes];
        displayNotes(filteredNotes);
      }
    }
    
    // Helper function to format date for display using MM/DD/YY format
    function formatDateForDisplay(dateStr) {
      const date = new Date(dateStr);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const year = date.getFullYear().toString().substring(2); // Get just the last 2 digits
      return `${month}/${day}/${year}`;
    }

    // Functions
    function displayNotes(notesToDisplay) {
      notesList.innerHTML = '';
      
      if (notesToDisplay.length === 0) {
        notesList.innerHTML = '<div class="no-notes">No notes found</div>';
        return;
      }
      
      // Sort notes based on current sort order
      const sortedNotes = [...notesToDisplay].sort((a, b) => {
        const dateA = new Date(a.updated);
        const dateB = new Date(b.updated);
        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
      });
      
      sortedNotes.forEach(note => {
        const noteItem = document.createElement('div');
        noteItem.className = 'note-item';
        if (currentNote && currentNote.id === note.id) {
          noteItem.classList.add('active');
        }
        
        // Add priority class if available
        if (note.originalFiling && note.originalFiling["Priority Consideration"]) {
          const priority = note.originalFiling["Priority Consideration"].toLowerCase();
          if (priority === 'urgent') {
            noteItem.classList.add('priority-urgent');
          } else if (priority === 'high') {
            noteItem.classList.add('priority-high');
          } else if (priority === 'medium') {
            noteItem.classList.add('priority-medium');
          } else if (priority === 'low') {
            noteItem.classList.add('priority-low');
          }
        }
        
        // Format date for display - use either the filing date or note updated date
        let formattedDate = '';
        if (note.originalFiling && note.originalFiling["Filing Date"]) {
          const filingDate = new Date(note.originalFiling["Filing Date"]);
          // Use MM/DD/YY format
          const month = (filingDate.getMonth() + 1).toString().padStart(2, '0');
          const day = filingDate.getDate().toString().padStart(2, '0');
          const year = filingDate.getFullYear().toString().substring(2);
          formattedDate = `${month}/${day}/${year}`;
        } else {
          const updatedDate = new Date(note.updated);
          const month = (updatedDate.getMonth() + 1).toString().padStart(2, '0');
          const day = updatedDate.getDate().toString().padStart(2, '0');
          const year = updatedDate.getFullYear().toString().substring(2);
          formattedDate = `${month}/${day}/${year}`;
        }
        
        // Create priority badge HTML
        let priorityBadge = '';
        if (note.originalFiling && note.originalFiling["Priority Consideration"]) {
          const priority = note.originalFiling["Priority Consideration"].toLowerCase();
          let badgeClass = '';
          if (priority === 'urgent') {
            badgeClass = 'urgent';
          } else if (priority === 'high') {
            badgeClass = 'high';
          } else if (priority === 'medium') {
            badgeClass = 'medium';
          } else if (priority === 'low') {
            badgeClass = 'low';
          }
          priorityBadge = `<span class="priority-badge ${badgeClass}">${note.originalFiling["Priority Consideration"]}</span>`;
        }
        
        // Create recommendation badge HTML
        let recommendationBadge = '';
        if (note.originalFiling && note.originalFiling["Recommendation"]) {
          const recommendation = note.originalFiling["Recommendation"];
          // Create proper CSS class by replacing spaces with hyphens
          const recommendationClass = recommendation.replace(/\s+/g, '-');
          recommendationBadge = `<span class="recommendation-badge ${recommendationClass}">${recommendation}</span>`;
        }
        
        // Get filing type (Form)
        const filingType = note.originalFiling && note.originalFiling["Form"] 
          ? note.originalFiling["Form"] 
          : 'Unknown';
        
        // Company name - use from the companyInfo if available
        const companyName = note.company || 'Unknown Company';
        
        // Add office-subprogram indicator if available
        let subprogramClass = '';
        if (note.companyInfo && note.companyInfo.officeSubprogram) {
          const subprogramLower = note.companyInfo.officeSubprogram.toLowerCase();
          if (subprogramLower === 'mesc-10') {
            subprogramClass = 'subprogram-mesc-10';
          } else if (subprogramLower === 'mesc-20') {
            subprogramClass = 'subprogram-mesc-20';
          } else if (subprogramLower === 'mesc-30') {
            subprogramClass = 'subprogram-mesc-30';
          }
        }
        
        noteItem.innerHTML = `
          <div class="note-item-header">
            <h4>${companyName}</h4>
            <span class="note-date">${formattedDate}</span>
          </div>
          <div class="filing-type">${filingType}</div>
          <div class="note-item-metadata">
            ${priorityBadge}
          </div>
          ${note.companyInfo ? `<span class="company-subprogram ${subprogramClass}">${note.companyInfo.officeSubprogram || ''}</span>` : ''}
          ${recommendationBadge}
        `;
        
        noteItem.addEventListener('click', () => selectNote(note));
        
        notesList.appendChild(noteItem);
      });
    }
    
    function selectNote(note) {
      currentNote = note;
      
      // Extract metadata from note content
      const { cleanContent, reviewer, reviewDate } = extractNoteMetadata(note.content);
      
      // Update UI
      noteTitle.value = note.title;
      noteContent.value = cleanContent;
      
      // Remove any existing metadata display first
      const existingMetadata = document.querySelector('.note-metadata-display');
      if (existingMetadata) {
        existingMetadata.remove();
      }
      
      // Display reviewer and date info if available
      if (reviewer || reviewDate) {
        document.querySelector('.editor-actions').insertAdjacentHTML('beforebegin', 
          `<div class="note-metadata-display">
            ${reviewer ? `<span class="note-reviewer">${reviewer}</span>` : ''}
            ${reviewDate ? `<span class="note-review-date">${reviewDate}</span>` : ''}
          </div>`
        );
      }
      
      // Set dropdown values based on the note's original filing data
      if (note.originalFiling) {
        // Set recommendation dropdown first
        if (note.originalFiling["Recommendation"]) {
          noteRecommendation.value = note.originalFiling["Recommendation"];
        } else {
          noteRecommendation.value = "Skip"; // Default value
        }
        
        // Set priority dropdown
        if (note.originalFiling["Priority Consideration"]) {
          notePriority.value = note.originalFiling["Priority Consideration"];
        } else {
          notePriority.value = "Low"; // Default value
        }
        
        // Update priority state based on recommendation
        updatePriorityState();
        
        // Enable view filing button if the filing has a URL
        viewFilingBtn.disabled = !(note.originalFiling["Filing URL"]);
      } else {
        // Default values if no original filing data
        noteRecommendation.value = "Skip";
        notePriority.value = "Low";
        updatePriorityState();
        
        // Disable view filing button
        viewFilingBtn.disabled = true;
      }
      
      // Mark the selected note as active in the sidebar
      document.querySelectorAll('.note-item').forEach(item => {
        item.classList.remove('active');
      });
      
      document.querySelectorAll('.note-item').forEach((item, index) => {
        if (filteredNotes[index].id === note.id) {
          item.classList.add('active');
        }
      });
      
      // Enable delete button
      deleteNoteBtn.disabled = false;
    }
    
    function createNewNote() {
      currentNote = {
        id: Date.now(), // Generate a temporary ID
        title: "",
        content: "",
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        company: "",
        recommendation: "Skip",
        originalFiling: {
          "Priority Consideration": "Low",
          "Recommendation": "Skip"
        }
      };
      
      // Clear form
      noteTitle.value = "";
      noteContent.value = "";
      
      // Set default values for dropdowns
      noteRecommendation.value = "Skip";
      notePriority.value = "Low";
      updatePriorityState(); // Update priority state based on recommendation
      
      // Update UI
      document.querySelectorAll('.note-item').forEach(item => {
        item.classList.remove('active');
      });
      
      // Focus title field
      noteTitle.focus();
      
      // Disable delete button for new notes
      deleteNoteBtn.disabled = true;
      
      // Disable view filing button for new notes
      viewFilingBtn.disabled = true;
    }
    
    // Function to extract metadata from note content
    function extractNoteMetadata(content) {
      let cleanContent = content;
      let reviewer = null;
      let reviewDate = null;
      
      // Look for metadata pattern [Name - Date]
      const metadataRegex = /\[(.*?)\s*-\s*(.*?)\]/;
      const match = content.match(metadataRegex);
      
      if (match) {
        reviewer = match[1].trim();
        reviewDate = match[2].trim();
        
        // Remove the metadata from the content
        cleanContent = content.replace(match[0], '').trim();
      }
      
      return { cleanContent, reviewer, reviewDate };
    }
    
    function saveNote() {
      if (!noteTitle.value.trim()) {
        alert("Please enter a title for your note");
        return;
      }
      
      // Get the current reviewer name - defaults to "Reviewer" if not available
      const currentUserName = getUserName();
      
      // Preserve existing metadata or create new metadata
      let metadata = '';
      let reviewer = currentUserName;
      let reviewDate = '';
      
      if (currentNote && currentNote.content) {
        const metadataMatch = currentNote.content.match(/\[(.*?)\s*-\s*(.*?)\]/);
        if (metadataMatch) {
          metadata = metadataMatch[0];
          reviewer = metadataMatch[1].trim() || currentUserName;
          reviewDate = metadataMatch[2].trim();
        }
      }
      
      // If no existing metadata, create new one
      if (!metadata) {
        const today = new Date();
        // Format date as MM/DD/YY for consistency with filings.js
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const day = today.getDate().toString().padStart(2, '0');
        const year = today.getFullYear().toString().substring(2);
        const dateString = `${month}/${day}/${year}`;
        reviewDate = dateString;
        metadata = `[${currentUserName} - ${dateString}]`;
      }
      
      // Find the filing data if a related filing is selected
      let filingData = null;
      if (currentNote.originalFiling) {
        filingData = currentNote.originalFiling;
      } else {
        filingData = {};
      }
      
      // Update filing data with dropdown values
      filingData["Recommendation"] = noteRecommendation.value;
      
      // Set Priority Consideration to empty string if recommendation is Skip
      if (noteRecommendation.value === "Skip") {
        filingData["Priority Consideration"] = "";
      } else {
        filingData["Priority Consideration"] = notePriority.value;
      }
      
      // Update the "Notes" field in the original filing data with the metadata + content
      filingData["Notes"] = `${metadata} ${noteContent.value.trim()}`;
      
      // Ensure consistency with filings.js field names
      // Remove old Priority field if it exists to avoid confusion
      if (filingData.Priority !== undefined) {
        delete filingData.Priority;
      }
      
      const updatedNote = {
        ...currentNote,
        title: noteTitle.value.trim(),
        content: `${metadata} ${noteContent.value.trim()}`,
        updated: new Date().toISOString(),
        company: currentNote.company,
        originalFiling: filingData
      };
      
      // Check if it's a new note or an update
      if (notes.find(note => note.id === currentNote.id)) {
        // Update existing note
        const index = notes.findIndex(note => note.id === currentNote.id);
        notes[index] = updatedNote;
      } else {
        // Add new note
        notes.push(updatedNote);
      }
      
      // Update the original filing in allFilings if it exists
      if (filingData["Accession Number"]) {
        const filingIndex = allFilings.findIndex(filing => 
          filing["Accession Number"] === filingData["Accession Number"]);
        
        if (filingIndex !== -1) {
          // Update the original filing with the new data
          allFilings[filingIndex]["Notes"] = filingData["Notes"];
          allFilings[filingIndex]["Recommendation"] = filingData["Recommendation"];
          allFilings[filingIndex]["Priority Consideration"] = filingData["Priority Consideration"];
          
          // Remove any old fields to ensure consistency
          if (allFilings[filingIndex].Priority !== undefined) {
            delete allFilings[filingIndex].Priority;
          }
          
          // Save the updated allFilings array back to SEC_Filings_Current.json
          saveFilingsToFile(allFilings);
        }
      }
      
      currentNote = updatedNote;
      
      // Re-apply filters to update filteredNotes
      applyFilters();
      
      // Show save confirmation without waiting for the file save to complete
      showSaveConfirmation();
    }
    
    // Function to save filings data back to the file
    function saveFilingsToFile(filingsData) {
      // Get the current server origin to ensure we're using the correct server
      const serverUrl = window.location.origin;
      
      return fetch(`${serverUrl}/write`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          path: 'data/SEC_Filings_Current.json',
          content: JSON.stringify(filingsData, null, 2)
        })
      })
      .then(response => {
        if (!response.ok) {
          console.error(`Server returned error: ${response.status} ${response.statusText}`);
          // Try to parse the error response as JSON
          return response.text().then(text => {
            try {
              // Try to parse as JSON
              const data = JSON.parse(text);
              throw new Error(`Failed to save data to file: ${data.message || response.statusText}`);
            } catch (e) {
              // If parsing fails, use the raw text
              throw new Error(`Failed to save data to file: ${response.status} ${response.statusText}\n${text.substring(0, 100)}...`);
            }
          });
        }
        return response.json();
      })
      .then(data => {
        console.log('Filings data saved successfully:', data);
        return data; // Return the data for further processing
      })
      .catch(error => {
        console.error('Error saving filings data:', error);
        // Show error notification to user
        alert(`Warning: Your note was saved in memory but there was an error saving to the file system. Changes may be lost when you refresh the page.\n\nError details: ${error.message}`);
        throw error; // Re-throw for further handling if needed
      });
    }
    
    // Function to show save confirmation
    function showSaveConfirmation() {
      const saveConfirmation = document.createElement('div');
      saveConfirmation.className = 'save-confirmation';
      saveConfirmation.textContent = 'Note saved!';
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
    
    function deleteNote() {
      if (!currentNote || currentNote.id === null) {
        return;
      }
      
      if (confirm("Are you sure you want to delete this note? This action cannot be undone.")) {
        const index = notes.findIndex(note => note.id === currentNote.id);
        if (index !== -1) {
          // Check if this note has an associated filing
          if (currentNote.originalFiling && currentNote.originalFiling["Accession Number"]) {
            // Find the filing in allFilings
            const filingIndex = allFilings.findIndex(filing => 
              filing["Accession Number"] === currentNote.originalFiling["Accession Number"]);
            
            if (filingIndex !== -1) {
              console.log('Deleting note data from filing:', allFilings[filingIndex]["Accession Number"]);
              
              // Make a backup of the filing for error recovery
              const backupFiling = JSON.parse(JSON.stringify(allFilings[filingIndex]));
              
              // Clear all annotation fields in the original filing - use consistent field names
              allFilings[filingIndex]["Notes"] = "";
              allFilings[filingIndex]["Recommendation"] = "";
              allFilings[filingIndex]["Priority Consideration"] = "";
              
              // Remove old fields if they exist
              if (allFilings[filingIndex].Priority !== undefined) {
                delete allFilings[filingIndex].Priority;
              }
              
              // Save the updated allFilings array back to SEC_Filings_Current.json
              saveFilingsToFile(allFilings)
                .then(() => {
                  console.log('Filing note data completely deleted successfully');
                  // Remove the note from our local array only after successful file save
                  notes.splice(index, 1);
                  
                  // Clear the form and create new note state
                  createNewNote();
                  
                  // Refresh the filtered notes
                  applyFilters();
                })
                .catch(error => {
                  console.error('Error deleting note data from filing:', error);
                  // Restore the backup if saving failed
                  allFilings[filingIndex] = backupFiling;
                  alert("Failed to save changes to the file system. Please try again or contact your administrator.");
                });
            }
          } else {
            // If no filing found, just remove from local array
            notes.splice(index, 1);
            createNewNote();
            applyFilters();
          }
        }
      }
    }
    
    function searchNotes() {
      const searchTerm = notesSearch.value.toLowerCase();
      activeFilters.searchTerm = searchTerm;
      
      // If no search term and no other active filters, show all notes
      if (!searchTerm && activeFilters.dateRange === 'all' && 
          activeFilters.company === 'all' && 
          activeFilters.priority === 'all' && 
          activeFilters.recommendation === 'all') {
        filteredNotes = [...notes];
        displayNotes(filteredNotes);
        return;
      }
      
      // Apply all active filters
      applyFilters();
    }
    
    function toggleSortOrder() {
      sortOrder = sortOrder === 'newest' ? 'oldest' : 'newest';
      sortNotesBtn.innerHTML = `<i class="fa-solid fa-sort"></i> ${sortOrder === 'newest' ? 'Newest' : 'Oldest'}`;
      displayNotes(filteredNotes);
    }
    
    // Add recommendation change event listener
    noteRecommendation.addEventListener('change', function() {
      updatePriorityState();
      
      // Update recommendation dropdown styling
      noteRecommendation.className = 'editor-dropdown-button recommendation-select';
      const value = this.value.replace(/\s+/g, '-').toLowerCase();
      noteRecommendation.classList.add(value);
    });
    
    // Function to update Priority dropdown state based on Recommendation
    function updatePriorityState() {
      // Update the recommendation color class
      noteRecommendation.className = 'editor-dropdown-button recommendation-select';
      const recValue = noteRecommendation.value.replace(/\s+/g, '-').toLowerCase();
      noteRecommendation.classList.add(recValue);
      
      if (noteRecommendation.value === "Skip") {
        notePriority.disabled = true;
        notePriority.classList.add('disabled');
        notePriority.value = ""; // Set to empty instead of "Low"
        
        // Remove any color classes
        notePriority.classList.remove('high', 'medium', 'low', 'urgent');
      } else {
        notePriority.disabled = false;
        notePriority.classList.remove('disabled');
        
        // If priority is empty and recommendation is not Skip, default to Low
        if (!notePriority.value) {
          notePriority.value = "Low";
        }
        
        // Add appropriate color class based on current value
        notePriority.classList.remove('high', 'medium', 'low', 'urgent');
        notePriority.classList.add(notePriority.value.toLowerCase());
      }
    }
    
    // Add change event for priority to update its color class
    notePriority.addEventListener('change', function() {
      notePriority.classList.remove('high', 'medium', 'low', 'urgent');
      notePriority.classList.add(notePriority.value.toLowerCase());
    });
    
    // Initialize priority state on page load
    updatePriorityState();
    
    // Function to export filtered notes to CSV
    function exportFilteredNotesToCsv() {
      // Show export feedback
      exportCsvBtn.classList.add('active');
      
      // Generate a filename with current date
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10); // Format: YYYY-MM-DD
      const fileName = `notes_export_${dateStr}.csv`;
      
      // Define CSV headers
      const csvHeaders = [
        'RSS Feed',
        'Company',
        'MESC Office',
        'Filing Type',
        'Date',
        'Notable',
        'Link',
        'Notes',
        'Priority'  // Added Priority column
      ];
      
      // Create CSV content
      let csvContent = csvHeaders.join(',') + '\r\n';
      
      // Map filteredNotes to CSV rows
      filteredNotes.forEach(note => {
        // Find original filing data
        const filing = note.originalFiling || {};
        
        // Find project data by CIK/Regulatory_ID
        let project = null;
        if (filing.CIK) {
          // Ensure CIK is a string for comparison
          const cikStr = filing.CIK.toString();
          project = projectData.find(p => p["Regulatory_ID"] && p["Regulatory_ID"].toString() === cikStr);
        }
        
        // Extract and format CSV fields
        const rssFeed = project ? escapeCsvField(project["RSS_Name"] || "") : "";
        const company = project ? escapeCsvField(project["Lead_Organization"] || "") : escapeCsvField(note.company || "");
        const mescOffice = project ? escapeCsvField(project["Office_Subprogram"] || "") : "";
        const filingType = escapeCsvField(filing["Form"] || "");
        const filingDate = filing["Filing Date"] ? escapeCsvField(filing["Filing Date"]) : "";
        const notable = escapeCsvField(filing["Recommendation"] || "");
        const link = escapeCsvField(filing["Filing URL"] || "");
        
        // Clean notes content - remove metadata if present
        let notesContent = note.content || "";
        notesContent = notesContent.replace(/\[(.*?)\s*-\s*(.*?)\]/, "").trim();
        const notes = escapeCsvField(notesContent);
        
        // Get priority value from the original filing
        const priority = escapeCsvField(filing["Priority Consideration"] || "");
        
        // Add row to CSV content
        csvContent += [
          rssFeed,
          company,
          mescOffice,
          filingType,
          filingDate,
          notable,
          link,
          notes,
          priority  // Added priority column data
        ].join(',') + '\r\n';
      });
      
      // Create the download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // First try to create directory using fetch API - server-side handling
      createExportDirectory()
        .then(() => {
          // Try server-side file saving first
          return saveFileToServer(fileName, blob);
        })
        .then(serverResponse => {
          showExportConfirmation(`CSV exported to server: ${serverResponse.path || fileName}`);
        })
        .catch(error => {
          console.log('Server-side export failed, falling back to client-side download', error);
          // Fall back to client-side download if server-side fails
          const link = document.createElement("a");
          
          // Create download link
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
      // Get the current server origin to ensure we're using the correct server
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
    
    // Helper function to format CSV fields (handle commas, quotes, etc.)
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
    
    // Function to show export confirmation
    function showExportConfirmation(message) {
      const exportConfirmation = document.createElement('div');
      exportConfirmation.className = 'save-confirmation';
      exportConfirmation.textContent = message;
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
});

// Helper function to get the current user name
function getUserName() {
  // In a real app, you would get this from user authentication
  // For now, return a default or try to get from URL params or local storage
  const urlParams = new URLSearchParams(window.location.search);
  const userParam = urlParams.get('user');
  
  if (userParam) {
    return userParam;
  }
  
  const storedUser = localStorage.getItem('userName');
  if (storedUser) {
    return storedUser;
  }
  
  return "Reviewer"; // Default value
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
 * Create subprogram badge element for notes
 * @param {string} subprogram - Office_Subprogram value from data
 * @returns {HTMLElement} Badge element
 */
function createSubprogramBadge(subprogram) {
  const badge = document.createElement('span');
  badge.className = `company-subprogram ${getSubprogramClass(subprogram)}`;
  badge.textContent = subprogram || 'N/A';
  return badge;
}

// When rendering notes, replace the old code that applies classes with:
function renderNote(note) {
  // ...existing code...
  
  // Apply correct subprogram class
  if (note.company && note.company.Office_Subprogram) {
    const subprogramBadge = createSubprogramBadge(note.company.Office_Subprogram);
    noteElement.appendChild(subprogramBadge);
  }
  
  // ...existing code...
}