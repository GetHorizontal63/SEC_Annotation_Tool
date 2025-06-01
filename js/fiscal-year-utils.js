/**
 * Utility functions for fiscal year calculations and conversions
 */

const FiscalYearUtils = {
  /**
   * Calculate federal fiscal year from a date
   * Federal FY runs from October 1 to September 30
   * @param {Date|string} date - Date object or date string
   * @returns {number} Federal fiscal year
   */
  getFederalFiscalYear(date) {
    const d = date instanceof Date ? date : new Date(date);
    const month = d.getMonth(); // 0-11
    const year = d.getFullYear();
    
    // If month is October (9) or later, it's the next fiscal year
    return month >= 9 ? year + 1 : year;
  },
  
  /**
   * Calculate federal fiscal quarter from a date
   * @param {Date|string} date - Date object or date string
   * @returns {string} Federal fiscal quarter (e.g., "Q1 FY2024")
   */
  getFederalFiscalQuarter(date) {
    const d = date instanceof Date ? date : new Date(date);
    const month = d.getMonth(); // 0-11
    
    // Federal fiscal quarters:
    // Q1: Oct-Dec, Q2: Jan-Mar, Q3: Apr-Jun, Q4: Jul-Sep
    let quarter;
    let year = d.getFullYear();
    
    if (month >= 9) { // Oct-Dec (9-11)
      quarter = 1;
      year += 1;
    } else if (month >= 0 && month <= 2) { // Jan-Mar (0-2)
      quarter = 2;
    } else if (month >= 3 && month <= 5) { // Apr-Jun (3-5)
      quarter = 3;
    } else { // Jul-Sep (6-8)
      quarter = 4;
    }
    
    return `Q${quarter} FY${year}`;
  },
  
  /**
   * Calculate company fiscal year from a date
   * @param {Date|string} date - Date object or date string
   * @param {Object} companyFYInfo - Company fiscal year information
   * @param {number} companyFYInfo.endMonth - Fiscal year end month (0-11)
   * @param {number} companyFYInfo.endDay - Fiscal year end day
   * @returns {number} Company fiscal year
   */
  getCompanyFiscalYear(date, companyFYInfo = { endMonth: 11, endDay: 31 }) {
    const d = date instanceof Date ? date : new Date(date);
    const month = d.getMonth(); // 0-11
    const day = d.getDate();
    const year = d.getFullYear();
    
    const endMonth = companyFYInfo.endMonth || 11; // Default to December
    const endDay = companyFYInfo.endDay || 31;     // Default to 31st
    
    // If the current date is after the fiscal year end, it belongs to the next fiscal year
    if (month > endMonth || (month === endMonth && day > endDay)) {
      return year + 1;
    }
    return year;
  },
  
  /**
   * Calculate company fiscal quarter from a date
   * @param {Date|string} date - Date object or date string
   * @param {Object} companyFYInfo - Company fiscal year information
   * @returns {string} Company fiscal quarter (e.g., "Q2 FY2023")
   */
  getCompanyFiscalQuarter(date, companyFYInfo = { endMonth: 11, endDay: 31 }) {
    const d = date instanceof Date ? date : new Date(date);
    
    // Calculate fiscal year first
    const fiscalYear = this.getCompanyFiscalYear(d, companyFYInfo);
    
    // First, determine the start of the fiscal year
    const fyEndMonth = companyFYInfo.endMonth || 11;
    const fyEndDay = companyFYInfo.endDay || 31;
    
    // FY start is the day after FY end of previous year
    const fyStartDate = new Date(fiscalYear - 1, fyEndMonth, fyEndDay + 1);
    
    // Calculate days from the start of the fiscal year
    const daysDiff = Math.floor((d - fyStartDate) / (1000 * 60 * 60 * 24));
    
    // Determine quarter based on days into the fiscal year
    // Assuming approximately equal quarters of ~91 days each
    const daysInYear = 365;
    const daysInQuarter = Math.ceil(daysInYear / 4);
    
    const quarter = Math.floor(daysDiff / daysInQuarter) + 1;
    
    // Ensure quarter is between 1 and 4
    return `Q${Math.max(1, Math.min(4, quarter))} FY${fiscalYear}`;
  },
  
  /**
   * Format date in MM/DD/YY format
   * @param {Date|string} date - Date object or date string
   * @returns {string} Formatted date
   */
  formatShortDate(date) {
    const d = date instanceof Date ? date : new Date(date);
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const year = d.getFullYear().toString().slice(-2);
    
    return `${month}/${day}/${year}`;
  },
  
  /**
   * Calculate federal fiscal year start and end dates
   * @param {number} fiscalYear - Federal fiscal year
   * @returns {Object} Object containing start and end dates
   */
  getFederalFiscalYearDates(fiscalYear) {
    return {
      start: new Date(fiscalYear - 1, 9, 1), // October 1 of previous calendar year
      end: new Date(fiscalYear, 8, 30)       // September 30 of fiscal year
    };
  },
  
  /**
   * Calculate company fiscal year start and end dates
   * @param {number} fiscalYear - Company fiscal year
   * @param {Object} companyFYInfo - Company fiscal year information
   * @returns {Object} Object containing start and end dates
   */
  getCompanyFiscalYearDates(fiscalYear, companyFYInfo = { endMonth: 11, endDay: 31 }) {
    const fyEndMonth = companyFYInfo.endMonth || 11;
    const fyEndDay = companyFYInfo.endDay || 31;
    
    return {
      start: new Date(fiscalYear - 1, fyEndMonth, fyEndDay + 1), // Day after FY end of previous year
      end: new Date(fiscalYear, fyEndMonth, fyEndDay)            // FY end day of current fiscal year
    };
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FiscalYearUtils;
}
