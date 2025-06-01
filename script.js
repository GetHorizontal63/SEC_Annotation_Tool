// Enums
const UserStatus = {
  LoggedIn: "logged-in",
  LoggingIn: "logging-in",
  LoggedOut: "logged-out",
  LogInError: "log-in-error",
  VerifyingLogIn: "verifying-log-in"
};

const Default = {
  PIN: "1234"
};

const WeatherType = {
  Cloudy: "Cloudy",
  Rainy: "Rainy",
  Stormy: "Stormy",
  Sunny: "Sunny"
};

// Utility functions
const N = {
  clamp: (min, value, max) => Math.min(Math.max(min, value), max),
  rand: (min, max) => Math.floor(Math.random() * (max - min + 1) + min)
};

const T = {
  format: (date) => {
    const hours = T.formatHours(date.getHours());
    const minutes = date.getMinutes();
    
    return `${hours}:${T.formatSegment(minutes)}`;
  },
  formatHours: (hours) => {
    return hours % 12 === 0 ? 12 : hours % 12;
  },
  formatSegment: (segment) => {
    return segment < 10 ? `0${segment}` : segment;
  },
  formatDate: (date) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    const dayName = days[date.getDay()];
    const monthName = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    
    return `${dayName} ${monthName} ${day}, ${year}`;
  }
};

const LogInUtility = {
  verify: async (pin) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if(pin === Default.PIN) {
          resolve(true);
        } else {
          reject(`Invalid pin: ${pin}`);
        }
      }, N.rand(300, 700));
    });
  }
};

// Helper functions
function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
  // Get DOM elements
  const app = document.getElementById('app');
  const appPinHiddenInput = document.getElementById('app-pin-hidden-input');
  const appPinDigits = document.querySelectorAll('.app-pin-digit');
  const appPinWrapper = document.getElementById('app-pin-wrapper');
  const appPinCancelText = document.getElementById('app-pin-cancel-text');
  const appPinErrorText = document.getElementById('app-pin-error-text');
  const appBackground = document.getElementById('app-background');
  
  // Navigation buttons
  const filingsButton = document.getElementById('filings-button');
  const appsButton = document.getElementById('apps-button'); // Notes button
  const financialsButton = document.getElementById('financials-button');
  const homeButton = document.getElementById('home-button'); // May exist on subpages
  
  // Home action buttons
  const updateDataBtn = document.getElementById('update-data-btn');
  const addProjectsBtn = document.getElementById('add-projects-btn');
  
  // Project action dialog elements
  const projectActionDialog = document.getElementById('project-action-dialog');
  const closeDialogBtn = document.getElementById('close-dialog');
  const newProjectBtn = document.getElementById('new-project-btn');
  const editProjectBtn = document.getElementById('edit-project-btn');
  
  // Add Projects Modal elements
  const addProjectsOverlay = document.getElementById('add-projects-overlay');
  const closeProjectsBtn = document.getElementById('close-projects');
  const cancelProjectBtn = document.getElementById('cancel-project');
  const saveProjectBtn = document.getElementById('save-project');
  const projectNameInput = document.getElementById('project-name');

  // Edit Projects Modal elements
  const editProjectsOverlay = document.getElementById('edit-projects-overlay');
  const closeEditProjectsBtn = document.getElementById('close-edit-projects');
  const cancelEditProjectBtn = document.getElementById('cancel-edit-project');
  const updateProjectBtn = document.getElementById('update-project');
  const projectSelector = document.getElementById('project-selector');
  
  // Project data
  let projectsList = [];

  // Initialize state - start directly in logged-in state
  let userStatus = UserStatus.LoggedIn;
  let pin = "";
  
  // Set app to logged-in state immediately
  app.className = UserStatus.LoggedIn;
  
  // Initialize scrollable components
  initScrollableComponents();
  
  // Update time periodically
  updateTime();
  setInterval(updateTime, 1000);
  
  // Generate random temperature
  updateTemperature();
  
  // Initialize content sections - removed unused sections
  initToolsSection();
  
  // Setup navigation between pages
  setupNavigation();
  
  // Start background image cycling
  startBackgroundCycle();
  
  // Functions
  function setupNavigation() {
    // Check if we're on the main page
    if (filingsButton) {
      // Only add click listener if it's not already an anchor tag
      if (filingsButton.tagName.toLowerCase() !== 'a') {
        filingsButton.addEventListener('click', function() {
          window.location.href = 'html/filings.html';
        });
      }
    }
    
    if (appsButton) {
      if (appsButton.tagName.toLowerCase() !== 'a') {
        appsButton.addEventListener('click', function() {
          window.location.href = 'html/notes.html';
        });
      }
    }
    
    if (financialsButton) {
      if (financialsButton.tagName.toLowerCase() !== 'a') {
        financialsButton.addEventListener('click', function() {
          window.location.href = 'html/financials.html';
        });
      }
    }
    
    // For navigating back to main from subpages
    if (homeButton) {
      if (homeButton.tagName.toLowerCase() !== 'a') {
        homeButton.addEventListener('click', function() {
          window.location.href = '../main.html';
        });
      }
    }
    
    // Home action buttons
    if (updateDataBtn) {
      updateDataBtn.addEventListener('click', function() {
        console.log('Update Data clicked - refreshing JSON data');
        
        // Disable the button and show it's processing
        updateDataBtn.disabled = true;
        const originalText = updateDataBtn.innerHTML;
        updateDataBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Refreshing...</span>';
        
        // Show processing toast notification
        const processingToast = showToast('Refreshing application data...', 'processing');
        
        // Function to refresh all JSON data in the app
        refreshAppData()
          .then(result => {
            console.log('Data refresh complete:', result);
            
            // Update the toast to show success
            processingToast.classList.remove('processing');
            processingToast.classList.add('success');
            processingToast.innerHTML = '<i class="fa-solid fa-check-circle"></i> <span>Data refresh complete!</span>';
            
            // Remove the toast after a few seconds
            setTimeout(() => {
              processingToast.classList.remove('visible');
              setTimeout(() => processingToast.remove(), 300);
            }, 3000);
            
            // Refresh the UI components that display data
            if (typeof initToolsSection === 'function') {
              initToolsSection();
            }
            
            // Add any other UI updates needed here
          })
          .catch(error => {
            console.error('Error refreshing data:', error);
            
            // Update toast to show error
            processingToast.classList.remove('processing');
            processingToast.classList.add('error');
            processingToast.innerHTML = `<i class="fa-solid fa-times-circle"></i> <span>Error refreshing data: ${error.message}</span>`;
            
            // Remove the toast after a few seconds
            setTimeout(() => {
              processingToast.classList.remove('visible');
              setTimeout(() => processingToast.remove(), 300);
            }, 5000);
          })
          .finally(() => {
            // Re-enable the button
            setTimeout(() => {
              updateDataBtn.disabled = false;
              updateDataBtn.innerHTML = originalText;
            }, 1000);
          });
      });
    }
  }
  
  // Add a utility function to show toast notifications that can be reused elsewhere
  function showToast(message, type = 'info', duration = 3000) {
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
    
    // Create the toast
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    
    // Add appropriate icon based on type
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    else if (type === 'warning') icon = 'exclamation-circle';
    else if (type === 'error') icon = 'times-circle';
    else if (type === 'processing') icon = 'spinner spinner';
    
    toast.innerHTML = `<i class="fa-solid fa-${icon}"></i> <span>${message}</span>`;
    toastContainer.appendChild(toast);
    
    // Show the toast
    setTimeout(() => {
      toast.classList.add('visible');
    }, 10);
    
    // Remove the toast after the specified duration (unless it's a processing toast)
    if (type !== 'processing') {
      setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }
    
    return toast; // Return toast element if caller needs to update it later
  }

  // Add this new function to refresh app data - place it near other utility functions
  function refreshAppData() {
    return new Promise((resolve, reject) => {
      console.group("Application Data Refresh");
      console.log("%c Starting data refresh process ", "background-color: #1a3a5c; color: white; padding: 2px 5px; border-radius: 3px;");
      
      // Array of data files to refresh
      const dataFiles = [
        { name: 'Project List', url: 'data/project_list.json' },
        { name: 'SEC Filings', url: 'data/SEC_Filings_Current.json' }
        // Add any other JSON data files here
      ];
      
      // Array to track successful refreshes
      const refreshResults = [];
      
      // Create promises for each data file
      const refreshPromises = dataFiles.map(file => {
        return fetch(file.url + '?nocache=' + new Date().getTime())  // Add cache-busting parameter
          .then(response => {
            if (!response.ok) {
              throw new Error(`Failed to refresh ${file.name}: ${response.status} ${response.statusText}`);
            }
            return response.json();
          })
          .then(data => {
            console.log(`%c ✓ ${file.name} refreshed successfully `, "background-color: #43a047; color: white; padding: 2px 5px; border-radius: 3px;");
            refreshResults.push({ file: file.name, success: true, count: Array.isArray(data) ? data.length : 'N/A' });
            return data;
          })
          .catch(error => {
            console.error(`%c ✗ ${file.name} refresh failed `, "background-color: #e53935; color: white; padding: 2px 5px; border-radius: 3px;");
            console.error(`Error: ${error.message}`);
            refreshResults.push({ file: file.name, success: false, error: error.message });
            // Don't reject the whole process for one file
            return null;
          });
      });
      
      // Wait for all refreshes to complete
      Promise.all(refreshPromises)
        .then(() => {
          console.log("%c Data refresh process completed ", "background-color: #43a047; color: white; padding: 2px 5px; border-radius: 3px;");
          console.groupEnd();
          
          // Check if any refreshes failed
          const failures = refreshResults.filter(result => !result.success);
          if (failures.length > 0) {
            if (failures.length === refreshResults.length) {
              // All refreshes failed
              reject(new Error("All data refreshes failed"));
            } else {
              // Some refreshes failed, but not all
              resolve({ 
                status: 'partial', 
                message: 'Some data refreshed successfully', 
                results: refreshResults 
              });
            }
          } else {
            // All refreshes succeeded
            resolve({ 
              status: 'success', 
              message: 'All data refreshed successfully', 
              results: refreshResults 
            });
          }
        })
        .catch(error => {
          console.error("%c Data refresh process failed ", "background-color: #e53935; color: white; padding: 2px 5px; border-radius: 3px;");
          console.error("Error:", error.message);
          console.groupEnd();
          reject(error);
        });
    });
  }

  // Directly add event listeners here instead of relying on setupNavigation
  if (addProjectsBtn) {
    console.log('Found Add Projects button, adding click listener');
    addProjectsBtn.addEventListener('click', function() {
      console.log('Add Projects clicked');
      openProjectActionDialog();
    });
  } else {
    console.log('Add Projects button not found');
  }
  
  // Project action dialog buttons
  if (closeDialogBtn) {
    closeDialogBtn.addEventListener('click', closeProjectActionDialog);
  }

  if (newProjectBtn) {
    newProjectBtn.addEventListener('click', function() {
      closeProjectActionDialog();
      openProjectsOverlay();
    });
  }

  // Add save project button event listener that was missing
  if (saveProjectBtn) {
    saveProjectBtn.addEventListener('click', saveProject);
  } else {
    console.error('Save project button not found');
  }

  // Add close projects button event listener that was missing
  if (closeProjectsBtn) {
    closeProjectsBtn.addEventListener('click', closeProjectsOverlay);
  } else {
    console.error('Close projects button not found');
  }

  // Add cancel project button event listener that was missing
  if (cancelProjectBtn) {
    cancelProjectBtn.addEventListener('click', closeProjectsOverlay);
  } else {
    console.error('Cancel project button not found');
  }

  // Modify the edit project button handler to ensure it displays correctly
  if (editProjectBtn) {
    console.log('Found Edit Project button, adding click listener');
    editProjectBtn.addEventListener('click', function() {
      console.log('Edit project button clicked');
      
      // First close the project action dialog
      closeProjectActionDialog();
      
      // Make absolutely sure all other overlays are hidden
      if (addProjectsOverlay) {
        addProjectsOverlay.classList.add('hidden');
      }
      
      // Clear any existing data in the form fields before loading
      clearEditProjectFields();
      
      console.log('Loading project data for editing...');
      
      // Show the edit projects overlay first with a loading indicator
      const editProjectsOverlay = document.getElementById('edit-projects-overlay');
      if (editProjectsOverlay) {
        // Show the overlay immediately for better UX
        editProjectsOverlay.classList.remove('hidden');
        console.log('Edit projects overlay displayed');
        
        // Add a temporary loading indicator if needed
        const projectSelector = document.getElementById('project-selector');
        if (projectSelector) {
          projectSelector.innerHTML = '<option value="">Loading projects...</option>';
        }
        
        // Now fetch the data
        fetch('data/project_list.json')
          .then(response => {
            if (!response.ok) {
              throw new Error('Failed to load project data');
            }
            return response.json();
          })
          .then(data => {
            projectsList = data;
            console.log('Projects loaded successfully:', data.length, 'projects');
            
            // Now populate the selector with the loaded data
            populateProjectSelector();
          })
          .catch(error => {
            console.error('Error loading project data:', error);
            alert('Failed to load project data. Please try again.');
            
            // If there's an error, close the overlay
            closeEditProjectsOverlay();
          });
      } else {
        console.error('Critical error: Edit projects overlay not found in DOM');
      }
    });
  } else {
    console.error('CRITICAL ERROR: Edit Project button not found in DOM');
  }

  // Edit Projects Modal event listeners
  if (closeEditProjectsBtn) {
    closeEditProjectsBtn.addEventListener('click', closeEditProjectsOverlay);
  }
  
  if (cancelEditProjectBtn) {
    cancelEditProjectBtn.addEventListener('click', closeEditProjectsOverlay);
  }
  
  if (updateProjectBtn) {
    updateProjectBtn.addEventListener('click', updateProject);
  }
  
  if (projectSelector) {
    projectSelector.addEventListener('change', loadProjectData);
  }
  
  // Also close the edit projects overlay when clicking outside the modal
  if (editProjectsOverlay) {
    editProjectsOverlay.addEventListener('click', function(e) {
      if (e.target === editProjectsOverlay) {
        closeEditProjectsOverlay();
      }
    });
  }
  
  // Update keyboard support to handle the edit projects overlay as well
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      if (projectActionDialog && !projectActionDialog.classList.contains('hidden')) {
        closeProjectActionDialog();
      } else if (addProjectsOverlay && !addProjectsOverlay.classList.contains('hidden')) {
        closeProjectsOverlay();
      } else if (editProjectsOverlay && !editProjectsOverlay.classList.contains('hidden')) {
        closeEditProjectsOverlay();
      }
    }
  });
  
  function setUserStatusTo(status) {
    userStatus = status;
    
    // Update app class
    app.className = status;
    
    // Handle specific status changes - simplified
    if (status === UserStatus.LoggingIn || status === UserStatus.LogInError) {
      appPinHiddenInput.disabled = false;
      
      // Reset PIN if changing to LoggingIn
      if (status === UserStatus.LoggingIn) {
        updatePin("");
      }
    } else {
      appPinHiddenInput.disabled = true;
      updatePin("");
    }
  }
  
  // Keep these functions in case other parts of the code depend on them
  function updatePin(newPin) {
    pin = newPin;
    
    // Update pin digits display
    appPinDigits.forEach((digit, index) => {
      // Remove all classes first
      digit.classList.remove('focused');
      digit.classList.remove('hidden');
      
      // Set digit value
      const digitValue = digit.querySelector('.app-pin-digit-value');
      digitValue.textContent = pin[index] || "";
      
      // Add appropriate classes
      if (index === pin.length) {
        digit.classList.add('focused');
      }
      
      if (pin[index]) {
        setTimeout(() => {
          digit.classList.add('hidden');
        }, 500);
      }
    });
  }
  
  function updateTime() {
    const date = new Date();
    const timeString = T.format(date);
    const dateString = T.formatDate(date);
    
    document.querySelectorAll('.time').forEach(timeElement => {
      timeElement.textContent = timeString;
    });
    
    document.querySelectorAll('.date').forEach(dateElement => {
      dateElement.textContent = dateString;
    });
  }
  
  function updateTemperature() {
    const temperature = N.rand(65, 85);
    
    document.querySelectorAll('.weather-temperature-value').forEach(element => {
      element.textContent = temperature;
    });
  }
  
  function initScrollableComponents() {
    const scrollableComponents = document.querySelectorAll('.scrollable-component');
    
    scrollableComponents.forEach(component => {
      let isGrabbing = false;
      let position = { left: 0, x: 0 };
      
      component.addEventListener('mousedown', handleMouseDown);
      component.addEventListener('mousemove', handleMouseMove);
      component.addEventListener('mouseup', handleMouseUp);
      component.addEventListener('mouseleave', handleMouseUp);
      
      function handleMouseDown(e) {
        isGrabbing = true;
        position = {
          left: component.scrollLeft,
          x: e.clientX
        };
      }
      
      function handleMouseMove(e) {
        if (isGrabbing) {
          const left = Math.max(0, position.left + (position.x - e.clientX));
          component.scrollLeft = left;
        }
      }
      
      function handleMouseUp() {
        isGrabbing = false;
      }
    });
  }
  
  function initToolsSection() {
    const toolsSection = document.querySelector('#tools-section .menu-section-content');
    toolsSection.innerHTML = ''; // Clear existing content
    
    // Update section title
    document.querySelector('#tools-section .menu-section-title-text').textContent = 'Recent Filings';
    
    // Company name mapping (will be populated from project data)
    const companyNames = {};
    
    // First load project data, then load filings
    fetch('data/project_list.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch project data');
        }
        return response.json();
      })
      .then(projectData => {
        // Populate companyNames with project data - UPDATED to use Regulatory_ID instead of CIK Number
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
        
        // Now fetch filings data
        return fetch('data/SEC_Filings_Current.json');
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch filings data');
        }
        return response.json();
      })
      .then(data => {
        // Sort filings by date (newest first)
        const sortedFilings = data.sort((a, b) => {
          const dateA = new Date(a["Filing Date"]);
          const dateB = new Date(b["Filing Date"]);
          return dateB - dateA;
        });
        
        // Ensure CIK values are strings for consistent matching
        sortedFilings.forEach(filing => {
          // Convert CIK to string if it's not already
          filing.CIK = filing.CIK.toString();
          
          // If a filing's CIK is not in our companyNames mapping, add a default entry
          if (!companyNames[filing.CIK]) {
            companyNames[filing.CIK] = {
              name: `Company with CIK: ${filing.CIK}`,
              officeSubprogram: "Unknown"
            };
          }
        });
        
        // Display the 6 most recent filings
        const recentFilings = sortedFilings.slice(0, 6);
        
        recentFilings.forEach(filing => {
          const company = companyNames[filing.CIK] || { 
            name: `Company with CIK: ${filing.CIK}`, 
            officeSubprogram: "Unknown" 
          };
          
          const filingDate = new Date(filing["Filing Date"]);
          const formattedDate = filingDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          });
          
          // FIXED: Generate the correct subprogram class based on the actual value
          let subprogramClass = '';
          if (company.officeSubprogram && company.officeSubprogram !== 'N/A' && company.officeSubprogram !== 'Unknown') {
            // Create a class name in the format 'subprogram-TECH-10'
            subprogramClass = `subprogram-${company.officeSubprogram}`;
          } else {
            subprogramClass = 'subprogram-other';
          }
          
          // Create filing card
          const filingCard = document.createElement('div');
          filingCard.className = 'tool-card filing-preview-card';
          filingCard.innerHTML = `
            <div class="tool-card-background"></div>
            <span class="company-subprogram ${subprogramClass}">${company.officeSubprogram || ''}</span>
            <div class="tool-card-content">            
              <div class="tool-card-content-header">            
                <span class="tool-card-label">${filing.Form}</span>
                <span class="tool-card-name">${company.name}</span>
                <span class="filing-preview-date">${formattedDate}</span>
              </div>
            </div>
          `;
          
          // Add click event to view the filing
          filingCard.addEventListener('click', () => {
            viewFiling(filing);
          });
          
          toolsSection.appendChild(filingCard);
        });
        
        // Add "View All" card at the end
        const viewAllCard = document.createElement('div');
        viewAllCard.className = 'tool-card filing-preview-card view-all-card';
        viewAllCard.innerHTML = `
          <div class="tool-card-background"></div>
          <div class="tool-card-content">
            <i class="fa-solid fa-plus view-all-icon"></i>
          </div>
        `;
        
        // Add click event to navigate to filings page
        viewAllCard.addEventListener('click', () => {
          window.location.href = 'html/filings.html';
        });
        
        toolsSection.appendChild(viewAllCard);
      })
      .catch(error => {
        console.error('Error loading data:', error);
        toolsSection.innerHTML = `
          <div class="error-message">
            <i class="fa-solid fa-triangle-exclamation"></i>
            Error loading data. Please try refreshing the page.
            <p class="error-details">${error.message}</p>
          </div>
        `;
      });
  }
  
  // Function to view a filing
  function viewFiling(filing) {
    console.log(`Viewing filing: ${filing["Accession Number"]}`);
    window.open(filing["Filing URL"], '_blank');
  }
  
  // Function to open the project action dialog
  function openProjectActionDialog() {
    console.log('Opening project action dialog');
    if (projectActionDialog) {
      projectActionDialog.classList.remove('hidden');
    } else {
      console.log('Project action dialog element not found');
    }
  }
  
  // Function to close the project action dialog
  function closeProjectActionDialog() {
    if (projectActionDialog) {
      projectActionDialog.classList.add('hidden');
    }
  }
  
  // Function to open the projects overlay
  function openProjectsOverlay() {
    console.log('Opening projects overlay');
    if (addProjectsOverlay) {
      addProjectsOverlay.classList.remove('hidden');
      
      // Set focus to the first input field
      if (projectNameInput) {
        projectNameInput.focus();
      }
      
      // Setup dynamic styling for subprogram dropdown
      const subprogramSelect = document.getElementById('project-subprogram');
      if (subprogramSelect) {
        // Add change event listener to apply color styling
        subprogramSelect.addEventListener('change', function() {
          // Remove all previous classes
          this.classList.remove('mesc-10', 'mesc-20', 'mesc-30');
          
          // Add appropriate class based on selection
          if (this.value === 'MESC-10') {
            this.classList.add('mesc-10');
          } else if (this.value === 'MESC-20') {
            this.classList.add('mesc-20');
          } else if (this.value === 'MESC-30') {
            this.classList.add('mesc-30');
          }
        });
      }
    } else {
      console.log('Projects overlay element not found');
    }
  }
  
  // Function to close the projects overlay
  function closeProjectsOverlay() {
    if (addProjectsOverlay) {
      addProjectsOverlay.classList.add('hidden');
    }
  }
  
// Function to save a new project
function saveProject() {
  const projectFOA = document.getElementById('project-foa').value.trim();
  const projectRSS = document.getElementById('project-rss').value.trim();
  const projectLead = document.getElementById('project-lead').value.trim();
  const projectTracking = document.getElementById('project-tracking').value.trim();
  const projectEDGAR = document.getElementById('project-edgar').value.trim();
  const projectCIK = document.getElementById('project-cik').value.trim();
  const projectSubprogram = document.getElementById('project-subprogram').value;
  
  // Validate inputs - at minimum require the RSS Name
  if (!projectRSS) {
    alert('Please enter an RSS Name');
    return;
  }
  
  // Create the project object
  const newProject = {
    "FOA": projectFOA,
    "RSS Name": projectRSS,
    "Lead Organization": projectLead,
    "SEC Tracking ": projectTracking,
    "EDGAR Link": projectEDGAR,
    "CIK Number": projectCIK,
    "Office-Subprogram": projectSubprogram
  };
  
  console.log('Saving project:', newProject);
  
  // Send the data to the server
  fetch('/save_project', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(newProject)
  })
  .then(response => {
    if (!response.ok) {
      console.error('Server response not OK:', response.status, response.statusText);
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    return response.json();
  })
  .then(data => {
    console.log('Server response:', data);
    
    if (data.status === 'success') {
      // Show success message
      alert('Project saved successfully!');
      
      // Clear form
      document.getElementById('project-foa').value = '';
      document.getElementById('project-rss').value = '';
      document.getElementById('project-lead').value = '';
      document.getElementById('project-tracking').value = '';
      document.getElementById('project-edgar').value = '';
      document.getElementById('project-cik').value = '';
      document.getElementById('project-subprogram').value = '';
      
      closeProjectsOverlay();
    } else {
      // Show error message
      alert(`Error saving project: ${data.message || 'Unknown error'}`);
    }
  })
  .catch(error => {
    console.error('Error saving project:', error);
    alert(`Error saving project: ${error.message}`);
  });
}
  
// Function to update a project
function updateProject() {
  const selectedIndex = projectSelector.value;
  
  console.log(`Selected project index: ${selectedIndex} (${typeof selectedIndex})`);
  
  if (!selectedIndex) {
    alert('Please select a project to update');
    return;
  }
  
  const foa = document.getElementById('edit-project-foa').value.trim();
  const rssName = document.getElementById('edit-project-rss').value.trim();
  const leadOrg = document.getElementById('edit-project-lead').value.trim();
  const secTracking = document.getElementById('edit-project-tracking').value.trim();
  const edgarLink = document.getElementById('edit-project-edgar').value.trim();
  const cikNumber = document.getElementById('edit-project-cik').value.trim();
  const subprogram = document.getElementById('edit-project-subprogram').value;
  
  // Basic validation
  if (!leadOrg) {
    alert('Please enter a Lead Organization');
    return;
  }
  
  // Create updated project object
  const updatedProject = {
    "FOA": foa,
    "RSS Name": rssName,
    "Lead Organization": leadOrg,
    "SEC Tracking ": secTracking,
    "EDGAR Link": edgarLink,
    "CIK Number": cikNumber,
    "Office-Subprogram": subprogram
  };
  
  const parsedIndex = parseInt(selectedIndex, 10);
  console.log(`Parsed index: ${parsedIndex} (${typeof parsedIndex})`);
  
  // Create the request payload
  const payload = {
    index: parsedIndex,
    project: updatedProject
  };
  
  console.log('Full update payload:', JSON.stringify(payload, null, 2));
  
  // Send the data to the server
  fetch('/update_project', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  .then(response => {
    console.log(`Response status: ${response.status}`);
    if (!response.ok) {
      console.error('Server response not OK:', response.status, response.statusText);
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    return response.json();
  })
  .then(data => {
    console.log('Server response:', data);
    
    if (data.status === 'success') {
      // Show success message
      alert('Project updated successfully!');
      
      // Close the overlay
      closeEditProjectsOverlay();
      
      // Refresh any project data shown on the page if needed
      if (typeof initToolsSection === 'function') {
        initToolsSection();
      }
    } else {
      // Show error message
      alert(`Error updating project: ${data.message || 'Unknown error'}`);
    }
  })
  .catch(error => {
    console.error('Error updating project:', error);
    alert(`Error updating project: ${error.message}`);
  });
}
  
  // Function to clear all edit project fields
  function clearEditProjectFields() {
    const fields = [
      'edit-project-foa',
      'edit-project-rss',
      'edit-project-lead',
      'edit-project-tracking',
      'edit-project-edgar',
      'edit-project-cik',
      'edit-project-subprogram'
    ];
    
    fields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.value = '';
        // Remove any special styling classes
        if (fieldId === 'edit-project-subprogram') {
          field.classList.remove('mesc-10', 'mesc-20', 'mesc-30');
        }
      }
    });
    
    console.log('Edit project form fields cleared');
  }
  
  // Function to close the edit projects overlay
  function closeEditProjectsOverlay() {
    if (editProjectsOverlay) {
      editProjectsOverlay.classList.add('hidden');
      clearEditProjectFields();
    }
  }
  
  // Function to populate the project selector with existing projects
  function populateProjectSelector() {
    // Get the selector element
    const projectSelector = document.getElementById('project-selector');
    if (!projectSelector) {
      console.error('Error: Project selector element not found');
      return;
    }
    
    // Clear existing options
    projectSelector.innerHTML = '';
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = "";
    defaultOption.textContent = "Choose a project to edit";
    projectSelector.appendChild(defaultOption);
    
    // Check if projectsList is available
    if (!projectsList || projectsList.length === 0) {
      console.warn('No projects available to populate selector');
      return;
    }
    
    console.log('Populating project selector with', projectsList.length, 'projects');
    console.log('Project list data:', JSON.stringify(projectsList, null, 2));
    
    // Sort projects alphabetically by lead organization
    projectsList.sort((a, b) => {
      const nameA = a["Lead Organization"] || '';
      const nameB = b["Lead Organization"] || '';
      return nameA.localeCompare(nameB);
    });
    
    // Add each project to the dropdown
    projectsList.forEach((project, index) => {
      const option = document.createElement('option');
      option.value = index;  // THIS IS THE KEY LINE - make sure it's using the correct index
      option.textContent = project["Lead Organization"] || `Project ${index + 1}`;
      projectSelector.appendChild(option);
      console.log(`Added option: value=${option.value}, text=${option.textContent}`);
    });
    
    console.log('Project selector populated with', projectSelector.options.length - 1, 'options');
  }
  
  // Function to load project data when a project is selected
  function loadProjectData() {
    const selectedIndex = projectSelector.value;
    
    if (!selectedIndex) {
      // Clear form if no project is selected
      clearEditProjectFields();
      return;
    }
    
    // Use the already loaded project data instead of fetching again
    if (projectsList && projectsList.length > 0) {
      const project = projectsList[selectedIndex];
      
      if (project) {
        // Populate form fields with project data
        document.getElementById('edit-project-foa').value = project["FOA"] || '';
        document.getElementById('edit-project-rss').value = project["RSS Name"] || '';
        document.getElementById('edit-project-lead').value = project["Lead Organization"] || '';
        document.getElementById('edit-project-tracking').value = project["SEC Tracking "] || '';
        document.getElementById('edit-project-edgar').value = project["EDGAR Link"] || '';
        document.getElementById('edit-project-cik').value = project["CIK Number"] || '';
        
        const subprogramSelect = document.getElementById('edit-project-subprogram');
        if (subprogramSelect) {
          subprogramSelect.value = project["Office-Subprogram"] || '';
          
          // Apply color styling to subprogram dropdown
          subprogramSelect.classList.remove('mesc-10', 'mesc-20', 'mesc-30');
          
          if (project["Office-Subprogram"] === 'MESC-10') {
            subprogramSelect.classList.add('mesc-10');
          } else if (project["Office-Subprogram"] === 'MESC-20') {
            subprogramSelect.classList.add('mesc-20');
          } else if (project["Office-Subprogram"] === 'MESC-30') {
            subprogramSelect.classList.add('mesc-30');
          }
        }
      }
    } else {
      console.error('Project data not available');
      alert('Error: Project data not loaded. Please try again.');
    }
  }
  
  // Function to start cycling background images
  function startBackgroundCycle() {
    // Set a static background image instead of cycling
    updateBackgroundImage('../assets/background1.png');
  }

  function updateBackgroundImage(imagePath) {
    const appBackgroundImage = document.getElementById('app-background-image');
    if (appBackgroundImage) {
      // Add the transitioning class to trigger the fade effect
      appBackgroundImage.classList.add('transitioning');
      
      // After a short delay, update the image and remove the transition class
      setTimeout(() => {
        appBackgroundImage.style.backgroundImage = `url('${imagePath}')`;
        
        // After the new image is loaded, remove the transitioning class
        setTimeout(() => {
          appBackgroundImage.classList.remove('transitioning');
        }, 1000);
      }, 500);
      
      console.log(`Background changed to universal image: ${imagePath}`);
    }
  }
  
  // Function to load CIK data from JSON file
async function loadCIKList() {
  try {
    const response = await fetch('data/current_cik_list.json');
    if (!response.ok) {
      throw new Error(`Failed to load CIK list: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Handle different JSON formats
    let ciks = [];
    if (Array.isArray(data)) {
      ciks = data;
    } else if (data.ciks && Array.isArray(data.ciks)) {
      ciks = data.ciks;
    } else {
      console.error('Invalid CIK list format. Expected array or object with ciks property.');
      return [];
    }
    
    return ciks;
  } catch (error) {
    console.error('Error loading CIK list:', error);
    return [];
  }
}

// Function to load SEC filings from JSON file
async function loadSECFilings() {
  try {
    const response = await fetch('data/SEC_Filings_Current.json');
    if (!response.ok) {
      throw new Error(`Failed to load SEC filings: ${response.status} ${response.statusText}`);
    }
    
    const filings = await response.json();
    return filings;
  } catch (error) {
    console.error('Error loading SEC filings:', error);
    return [];
  }
}

// Function to load project list from JSON file
async function loadProjectList() {
  try {
    const response = await fetch('data/project_list.json');
    if (!response.ok) {
      throw new Error(`Failed to load project list: ${response.status} ${response.statusText}`);
    }
    
    const projects = await response.json();
    return projects;
  } catch (error) {
    console.error('Error loading project list:', error);
    return [];
  }
}

// Function to save project list to JSON file
async function saveProjectList(projects) {
  try {
    const response = await fetch('/save_project', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ projects })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to save project list: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Error saving project list:', error);
    return false;
  }
}

// Execute Edgar data update
async function runEdgarUpdate() {
  try {
    const response = await fetch('/run_edgar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'update' })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to initiate Edgar update: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error running Edgar update:', error);
    return { status: 'error', message: error.message };
  }
}

// Check Edgar update progress
async function checkEdgarProgress() {
  try {
    const response = await fetch('/edgar-progress');
    if (!response.ok) {
      throw new Error(`Failed to get Edgar progress: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error checking Edgar progress:', error);
    return { status: 'error', message: error.message, running: false, messages: [] };
  }
}
});
