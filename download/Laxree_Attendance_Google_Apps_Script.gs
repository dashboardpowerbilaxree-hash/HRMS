/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LAXREE HR & SALARY MANAGEMENT — GOOGLE SHEETS ATTENDANCE AUTOMATION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This script creates and manages a Google Sheet with two sheets:
 *
 * 1. "Master Employees" — HR enters/maintains all employee data here.
 *    When new employees are added, they automatically appear in Daily Input.
 *
 * 2. "Daily Input" — HR selects a date, and the sheet auto-populates
 *    employee rows with names pulled from Master Employees. HR only needs
 *    to enter In Time and Out Time. The script auto-calculates:
 *    - Work Duration (hours)
 *    - OT Hours (beyond shift)
 *    - Total Hours (including OT)
 *    - Status (Present, Late, Half-Day, Absent, Weekly-Off, Holiday)
 *
 * SETUP INSTRUCTIONS:
 * 1. Create a new Google Sheet
 * 2. Go to Extensions → Apps Script
 * 3. Paste this entire script
 * 4. Run the function "initializeSheet" from the toolbar
 * 5. Grant permissions when prompted
 * 6. Your sheet is ready!
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─── CONFIGURATION ───────────────────────────────────────────────────────
// Default shift settings (can be overridden per employee in Master Employees)
const DEFAULT_SHIFT_START = "10:00";
const DEFAULT_SHIFT_END = "19:00";
const DEFAULT_SHIFT_HOURS = 9;
const LATE_GRACE_MINUTES = 15; // Grace period before marking late

// Sheet names
const MASTER_SHEET = "Master Employees";
const DAILY_SHEET = "Daily Input";
const HOLIDAYS_SHEET = "Holidays";

// Dashboard API endpoint (update this when your dashboard is deployed)
const DASHBOARD_API_URL = ""; // e.g., "https://your-app.vercel.app/api/gsheet"

// ─── MAIN MENU ───────────────────────────────────────────────────────────

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Laxree HR')
    .addItem('Initialize Sheet', 'initializeSheet')
    .addSeparator()
    .addItem('Generate Daily Attendance', 'generateDailyInput')
    .addItem('Generate Today\'s Attendance', 'generateTodayAttendance')
    .addSeparator()
    .addItem('Sync to Dashboard', 'syncToDashboard')
    .addItem('Pull from Dashboard', 'pullFromDashboard')
    .addSeparator()
    .addItem('Add Sample Employees', 'addSampleEmployees')
    .addItem('Add Holiday', 'addHolidayDialog')
    .addToUi();
}

// ─── INITIALIZE SHEET ────────────────────────────────────────────────────

function initializeSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // ── Create Master Employees Sheet ──
  let masterSheet = ss.getSheetByName(MASTER_SHEET);
  if (!masterSheet) {
    masterSheet = ss.insertSheet(MASTER_SHEET);
  }

  // Master Employees Headers
  const masterHeaders = [
    "Employee Code", "Full Name", "Firm", "Location", "Salary Type",
    "Monthly Salary", "Daily Rate", "Hourly Rate", "OT Rate",
    "Employment Type", "Active", "Shift Start", "Shift End", "Shift Hours",
    "Designation", "Department", "Joining Date", "Mobile", "Bank Name",
    "Bank Account", "Bank IFSC", "PAN Number", "Aadhaar Number"
  ];

  masterSheet.getRange(1, 1, 1, masterHeaders.length).setValues([masterHeaders]);

  // Style the header row
  const headerRange = masterSheet.getRange(1, 1, 1, masterHeaders.length);
  headerRange
    .setBackground("#1a1a2e")
    .setFontColor("#D4A843")
    .setFontWeight("bold")
    .setFontSize(11);

  // Set column widths
  const widths = [120, 180, 80, 140, 100, 120, 100, 100, 100, 120, 80, 100, 100, 100, 140, 120, 110, 130, 130, 140, 120, 130, 140];
  widths.forEach((w, i) => masterSheet.setColumnWidth(i + 1, w));

  // Data validation for Salary Type
  const salaryTypes = SpreadsheetApp.newDataValidation()
    .requireValueInList(["hourly", "daily", "monthly"], true)
    .build();
  masterSheet.getRange(2, 5, 100, 1).setDataValidation(salaryTypes);

  // Data validation for Active
  const activeValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Yes", "No"], true)
    .build();
  masterSheet.getRange(2, 11, 100, 1).setDataValidation(activeValidation);

  // Data validation for Employment Type
  const empTypeValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Full Time", "Part Time", "Contract", "Intern"], true)
    .build();
  masterSheet.getRange(2, 10, 100, 1).setDataValidation(empTypeValidation);

  // Data validation for Firm
  const firmValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(["LAPL", "LRSL", "SI", "SDF"], true)
    .build();
  masterSheet.getRange(2, 3, 100, 1).setDataValidation(firmValidation);

  // Data validation for Location
  const locationValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Ajmer", "Gurgaon", "Palra Warehouse", "Jaipur", "Roofing Factory"], true)
    .build();
  masterSheet.getRange(2, 4, 100, 1).setDataValidation(locationValidation);

  // Default values for new rows
  const defaults = {
    5: "hourly",  // Salary Type
    10: "Full Time", // Employment Type
    11: "Yes",    // Active
    12: DEFAULT_SHIFT_START, // Shift Start
    13: DEFAULT_SHIFT_END,   // Shift End
    14: DEFAULT_SHIFT_HOURS, // Shift Hours
  };

  // Set default values for 100 rows
  for (let row = 2; row <= 101; row++) {
    for (const [col, val] of Object.entries(defaults)) {
      const cell = masterSheet.getRange(row, parseInt(col));
      if (!cell.getValue()) {
        cell.setValue(val);
      }
    }
  }

  // Auto-calculate formulas for hourly rate and OT rate
  for (let row = 2; row <= 101; row++) {
    // Hourly Rate = Monthly Salary / 26 / Shift Hours (if salary type is monthly)
    // OT Rate = Hourly Rate * 1.5
    masterSheet.getRange(row, 8).setFormula(
      `=IF(E${row}="monthly",IF(N${row}>0,F${row}/26/N${row},0),IF(E${row}="daily",IF(N${row}>0,G${row}/N${row},0),0))`
    );
    masterSheet.getRange(row, 9).setFormula(
      `=IF(H${row}>0,H${row}*1.5,0)`
    );
  }

  // Protect header row
  const protection = masterSheet.getRange(1, 1, 1, masterHeaders.length).protect();
  protection.setDescription('Master Employees Header - Do not modify');
  protection.removeEditors(protection.getEditors().filter(e => e.getEmail() !== Session.getActiveUser().getEmail()));

  // ── Create Daily Input Sheet ──
  let dailySheet = ss.getSheetByName(DAILY_SHEET);
  if (!dailySheet) {
    dailySheet = ss.insertSheet(DAILY_SHEET);
  }

  // Daily Input Headers
  const dailyHeaders = [
    "Employee Code", "Employee Name", "Firm", "Location",
    "Date", "In Time", "Out Time",
    "Shift Start", "Shift End", "Shift Hours",
    "Work Duration (hrs)", "OT Hours", "Total Hours (incl OT)",
    "Status", "Late Entry", "Half Day",
    "Sunday Hours", "PH Hours", "Remarks"
  ];

  dailySheet.getRange(1, 1, 1, dailyHeaders.length).setValues([dailyHeaders]);

  // Style the header row
  const dailyHeaderRange = dailySheet.getRange(1, 1, 1, dailyHeaders.length);
  dailyHeaderRange
    .setBackground("#1a1a2e")
    .setFontColor("#D4A843")
    .setFontWeight("bold")
    .setFontSize(11);

  // Set column widths
  const dailyWidths = [120, 180, 80, 140, 110, 100, 100, 100, 100, 100, 140, 100, 140, 120, 100, 100, 110, 100, 200];
  dailyWidths.forEach((w, i) => dailySheet.setColumnWidth(i + 1, w));

  // ── Create Holidays Sheet ──
  let holidaySheet = ss.getSheetByName(HOLIDAYS_SHEET);
  if (!holidaySheet) {
    holidaySheet = ss.insertSheet(HOLIDAYS_SHEET);
  }

  const holidayHeaders = ["Date", "Holiday Name", "Type"];
  holidaySheet.getRange(1, 1, 1, holidayHeaders.length).setValues([holidayHeaders]);
  holidaySheet.getRange(1, 1, 1, holidayHeaders.length)
    .setBackground("#1a1a2e")
    .setFontColor("#D4A843")
    .setFontWeight("bold");

  const holidayTypeValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(["national", "state", "company"], true)
    .build();
  holidaySheet.getRange(2, 3, 100, 1).setDataValidation(holidayTypeValidation);

  // ── Delete default Sheet1 if exists ──
  const sheet1 = ss.getSheetByName("Sheet1");
  if (sheet1 && ss.getSheets().length > 1) {
    ss.deleteSheet(sheet1);
  }

  // Set Master Employees as active sheet
  ss.setActiveSheet(masterSheet);

  SpreadsheetApp.getUi().alert(
    "Laxree HR Sheet Initialized!",
    "The following sheets have been created:\n\n" +
    "1. Master Employees - Add your employee data here\n" +
    "2. Daily Input - Auto-generated attendance rows\n" +
    "3. Holidays - Add public holidays here\n\n" +
    "NEXT STEPS:\n" +
    "- Add employees in the Master Employees sheet\n" +
    "- Use menu: Laxree HR → Generate Today's Attendance\n" +
    "- Enter In Time and Out Time for each employee\n" +
    "- All calculations are automatic!"
  );
}

// ─── GENERATE DAILY INPUT ────────────────────────────────────────────────

function generateDailyInput(customDate) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(MASTER_SHEET);
  const dailySheet = ss.getSheetByName(DAILY_SHEET);

  if (!masterSheet || !dailySheet) {
    SpreadsheetApp.getUi().alert("Please run 'Initialize Sheet' first!");
    return;
  }

  // Get date (today or custom)
  const targetDate = customDate || new Date();
  const dateStr = Utilities.formatDate(targetDate, Session.getScriptTimeZone(), "yyyy-MM-dd");

  // Check if this date already exists in Daily Input
  const lastRow = dailySheet.getLastRow();
  if (lastRow > 1) {
    const existingDates = dailySheet.getRange(2, 5, lastRow - 1, 1).getValues().flat();
    const alreadyExists = existingDates.some(d => {
      if (!d) return false;
      const dStr = d instanceof Date ? Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd") : String(d);
      return dStr === dateStr;
    });
    if (alreadyExists) {
      const response = SpreadsheetApp.getUi().alert(
        "Date Already Exists",
        `Attendance for ${dateStr} already exists. Do you want to regenerate it? (This will clear existing In/Out times for that date)`,
        SpreadsheetApp.getUi().ButtonSet.YES_NO
      );
      if (response === SpreadsheetApp.getUi().Button.NO) return;

      // Remove existing rows for this date
      const rowsToDelete = [];
      for (let r = lastRow; r >= 2; r--) {
        const cellDate = dailySheet.getRange(r, 5).getValue();
        const cellDateStr = cellDate instanceof Date ? Utilities.formatDate(cellDate, Session.getScriptTimeZone(), "yyyy-MM-dd") : String(cellDate);
        if (cellDateStr === dateStr) {
          rowsToDelete.push(r);
        }
      }
      rowsToDelete.forEach(r => dailySheet.deleteRow(r));
    }
  }

  // Get all active employees from Master Employees
  const masterData = masterSheet.getDataRange().getValues();
  const employees = [];

  for (let i = 1; i < masterData.length; i++) {
    const row = masterData[i];
    const employeeCode = row[0];
    const fullName = row[1];
    const active = row[10];

    if (employeeCode && fullName && active === "Yes") {
      employees.push({
        code: String(employeeCode),
        name: String(fullName),
        firm: String(row[2] || ""),
        location: String(row[3] || ""),
        shiftStart: String(row[11] || DEFAULT_SHIFT_START),
        shiftEnd: String(row[12] || DEFAULT_SHIFT_END),
        shiftHours: parseFloat(row[13]) || DEFAULT_SHIFT_HOURS,
      });
    }
  }

  if (employees.length === 0) {
    SpreadsheetApp.getUi().alert("No active employees found in Master Employees sheet!");
    return;
  }

  // Get holidays for date checking
  const holidays = getHolidays();
  const isHoliday = holidays.some(h => h.date === dateStr);
  const dayOfWeek = targetDate.getDay();
  const isSunday = dayOfWeek === 0;

  // Add employee rows
  const startRow = dailySheet.getLastRow() + 1;
  const rows = [];

  employees.forEach(emp => {
    let defaultStatus = "";
    if (isSunday) defaultStatus = "weekly-off";
    else if (isHoliday) defaultStatus = "holiday";

    rows.push([
      emp.code,
      emp.name,
      emp.firm,
      emp.location,
      dateStr,
      "",  // In Time - HR will fill
      "",  // Out Time - HR will fill
      emp.shiftStart,
      emp.shiftEnd,
      emp.shiftHours,
      "",  // Work Duration - auto-calculated
      "",  // OT Hours - auto-calculated
      "",  // Total Hours - auto-calculated
      defaultStatus || "",  // Status - auto-calculated
      "",  // Late Entry - auto-calculated
      "",  // Half Day - auto-calculated
      "",  // Sunday Hours - auto-calculated
      "",  // PH Hours - auto-calculated
      "",  // Remarks
    ]);
  });

  dailySheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);

  // Add auto-calculation formulas
  for (let i = 0; i < employees.length; i++) {
    const row = startRow + i;

    // Work Duration = (Out Time - In Time) in hours
    // Column F = In Time, Column G = Out Time
    dailySheet.getRange(row, 11).setFormula(
      `=IF(AND(F${row}<>"",G${row}<>""),IF(VALUE(RIGHT(G${row},5))>=VALUE(RIGHT(F${row},5)),(VALUE(RIGHT(G${row},5))-VALUE(RIGHT(F${row},5)))*24,(1-VALUE(RIGHT(F${row},5))+VALUE(RIGHT(G${row},5)))*24),0)`
    );

    // OT Hours = max(0, Work Duration - Shift Hours)
    dailySheet.getRange(row, 12).setFormula(
      `=IF(K${row}>J${row},K${row}-J${row},0)`
    );

    // Total Hours (including OT) = Work Duration (already includes OT in duration)
    dailySheet.getRange(row, 13).setFormula(
      `=K${row}`
    );

    // Status = auto-calculated based on In Time, Work Duration, Sunday, Holiday
    dailySheet.getRange(row, 14).setFormula(
      `=IF(WEEKDAY(E${row},1)=1,"weekly-off",IF(COUNTIF(Holidays!A:A,E${row})>0,"holiday",IF(AND(F${row}<>"",G${row}<>""),IF(K${row}<J${row}/2,"half-day",IF(TIMEVALUE(F${row})>TIMEVALUE(H${row})+TIME(0,${LATE_GRACE_MINUTES},0),"late","present")),"")))`
    );

    // Late Entry
    dailySheet.getRange(row, 15).setFormula(
      `=IF(AND(F${row}<>"",N${row}="late"),TRUE,FALSE)`
    );

    // Half Day
    dailySheet.getRange(row, 16).setFormula(
      `=IF(AND(K${row}>0,K${row}<J${row}/2),TRUE,FALSE)`
    );

    // Sunday Hours
    dailySheet.getRange(row, 17).setFormula(
      `=IF(WEEKDAY(E${row},1)=1,K${row},0)`
    );

    // PH Hours
    dailySheet.getRange(row, 18).setFormula(
      `=IF(COUNTIF(Holidays!A:A,E${row})>0,K${row},0)`
    );
  }

  // Color code the Status column
  const statusRange = dailySheet.getRange(startRow, 14, rows.length, 1);
  const rules = statusRange.getConditionalFormatRules();
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo("present")
      .setBackground("#34d399")
      .setFontColor("#065f46")
      .setRanges([statusRange])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo("late")
      .setBackground("#fbbf24")
      .setFontColor("#78350f")
      .setRanges([statusRange])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo("absent")
      .setBackground("#f87171")
      .setFontColor("#7f1d1d")
      .setRanges([statusRange])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo("half-day")
      .setBackground("#fb923c")
      .setFontColor("#7c2d12")
      .setRanges([statusRange])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo("weekly-off")
      .setBackground("#60a5fa")
      .setFontColor("#1e3a5f")
      .setRanges([statusRange])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo("holiday")
      .setBackground("#c084fc")
      .setFontColor("#3b0764")
      .setRanges([statusRange])
      .build()
  );
  statusRange.setConditionalFormatRules(rules);

  // Freeze top row
  dailySheet.setFrozenRows(1);

  ss.setActiveSheet(dailySheet);
  dailySheet.getRange(startRow, 1).activate();

  SpreadsheetApp.getUi().alert(
    "Daily Attendance Generated!",
    `Generated ${employees.length} employee rows for ${dateStr}.\n\n` +
    (isSunday ? "NOTE: Today is Sunday - marked as Weekly-Off\n" : "") +
    (isHoliday ? "NOTE: Today is a Holiday - marked as Holiday\n" : "") +
    "\nNow enter In Time and Out Time for each employee.\n" +
    "Format: HH:MM (e.g., 10:00, 19:30)\n" +
    "All calculations are automatic!"
  );
}

// ─── QUICK: GENERATE TODAY'S ATTENDANCE ──────────────────────────────────

function generateTodayAttendance() {
  generateDailyInput(new Date());
}

// ─── ADD HOLIDAY DIALOG ──────────────────────────────────────────────────

function addHolidayDialog() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    "Add Holiday",
    "Enter date and holiday name:\nFormat: YYYY-MM-DD, Holiday Name\nExample: 2026-01-26, Republic Day",
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() === ui.Button.OK) {
    const input = response.getResponseText();
    const parts = input.split(",").map(s => s.trim());
    if (parts.length < 2) {
      ui.alert("Invalid format! Use: YYYY-MM-DD, Holiday Name");
      return;
    }

    const holidaySheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOLIDAYS_SHEET);
    if (!holidaySheet) {
      ui.alert("Please run 'Initialize Sheet' first!");
      return;
    }

    const date = new Date(parts[0]);
    if (isNaN(date.getTime())) {
      ui.alert("Invalid date! Use format: YYYY-MM-DD");
      return;
    }

    const lastRow = holidaySheet.getLastRow();
    holidaySheet.getRange(lastRow + 1, 1, 1, 3).setValues([
      [parts[0], parts[1], parts[2] || "national"]
    ]);

    ui.alert(`Holiday added: ${parts[1]} on ${parts[0]}`);
  }
}

// ─── GET HOLIDAYS ────────────────────────────────────────────────────────

function getHolidays() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const holidaySheet = ss.getSheetByName(HOLIDAYS_SHEET);
  if (!holidaySheet) return [];

  const data = holidaySheet.getDataRange().getValues();
  const holidays = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      const dateStr = data[i][0] instanceof Date
        ? Utilities.formatDate(data[i][0], Session.getScriptTimeZone(), "yyyy-MM-dd")
        : String(data[i][0]);
      holidays.push({
        date: dateStr,
        name: String(data[i][1] || ""),
        type: String(data[i][2] || "national"),
      });
    }
  }

  return holidays;
}

// ─── ADD SAMPLE EMPLOYEES ────────────────────────────────────────────────

function addSampleEmployees() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(MASTER_SHEET);

  if (!masterSheet) {
    SpreadsheetApp.getUi().alert("Please run 'Initialize Sheet' first!");
    return;
  }

  const sampleEmployees = [
    ["14", "Anamika", "SI", "Ajmer", "hourly", 14000, 538, 57.69, 86.54, "Full Time", "Yes", "10:00", "19:00", 9],
    ["26", "Mayank", "LRSL", "Ajmer", "hourly", 10000, 385, 42.74, 64.10, "Full Time", "Yes", "10:00", "19:00", 9],
    ["33", "Radhika Mehra", "LAPL", "Gurgaon", "hourly", 50000, 1923, 213.68, 320.51, "Full Time", "Yes", "10:00", "19:00", 9],
    ["501", "Amit Sharma", "LAPL", "Ajmer", "hourly", 15000, 577, 64.10, 96.15, "Full Time", "Yes", "10:00", "19:00", 9],
    ["502", "Priya Singh", "LRSL", "Jaipur", "hourly", 18000, 692, 76.92, 115.38, "Full Time", "Yes", "9:00", "18:00", 9],
    ["503", "Rahul Verma", "SI", "Ajmer", "hourly", 12000, 462, 51.28, 76.92, "Full Time", "Yes", "10:00", "19:00", 9],
    ["504", "Sunita Devi", "SDF", "Palra Warehouse", "hourly", 11000, 423, 47.01, 70.51, "Full Time", "Yes", "10:00", "19:00", 9],
    ["505", "Vikram Patel", "LAPL", "Roofing Factory", "hourly", 16000, 615, 68.38, 102.56, "Full Time", "Yes", "9:00", "18:00", 9],
    ["506", "Deepa Kumari", "LRSL", "Ajmer", "daily", 20000, 25000, 277.78, 416.67, "Full Time", "Yes", "10:00", "19:00", 9],
    ["507", "Sanjay Gupta", "SI", "Gurgaon", "hourly", 25000, 962, 106.84, 160.26, "Full Time", "Yes", "10:00", "19:00", 9],
  ];

  const lastRow = masterSheet.getLastRow();
  const startRow = lastRow + 1;

  masterSheet.getRange(startRow, 1, sampleEmployees.length, sampleEmployees[0].length)
    .setValues(sampleEmployees);

  SpreadsheetApp.getUi().alert(
    "Sample Employees Added!",
    `${sampleEmployees.length} sample employees have been added to the Master Employees sheet.\n\nYou can now use 'Laxree HR → Generate Today's Attendance' to create daily rows.`
  );
}

// ─── SYNC TO DASHBOARD ───────────────────────────────────────────────────
// Pushes attendance data from the Daily Input sheet to the Laxree Dashboard

function syncToDashboard() {
  const ui = SpreadsheetApp.getUi();

  if (!DASHBOARD_API_URL) {
    ui.alert(
      "Dashboard Not Configured",
      "Please set the DASHBOARD_API_URL in the script configuration.\n\n" +
      "1. Go to Extensions → Apps Script\n" +
      "2. Find the line: const DASHBOARD_API_URL = \"\"\n" +
      "3. Replace with your dashboard URL, e.g.:\n" +
      "   const DASHBOARD_API_URL = \"https://your-app.vercel.app/api/gsheet\"\n" +
      "4. Save and run again"
    );
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dailySheet = ss.getSheetByName(DAILY_SHEET);

  if (!dailySheet) {
    ui.alert("Please run 'Initialize Sheet' first!");
    return;
  }

  const data = dailySheet.getDataRange().getValues();
  if (data.length < 2) {
    ui.alert("No attendance data to sync!");
    return;
  }

  const headers = data[0];
  const records = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue; // Skip empty rows

    const dateVal = row[4] instanceof Date
      ? Utilities.formatDate(row[4], Session.getScriptTimeZone(), "yyyy-MM-dd")
      : String(row[4] || "");

    records.push({
      employeeId: String(row[0]),
      employeeName: String(row[1]),
      firm: String(row[2]),
      location: String(row[3]),
      date: dateVal,
      checkIn: String(row[5] || ""),
      checkOut: String(row[6] || ""),
      shiftStart: String(row[7] || ""),
      shiftEnd: String(row[8] || ""),
      shiftHours: parseFloat(row[9]) || 0,
      workDuration: parseFloat(row[10]) || 0,
      otHours: parseFloat(row[11]) || 0,
      totalHours: parseFloat(row[12]) || 0,
      status: String(row[13] || "").toLowerCase(),
      lateEntry: row[14] === true || row[14] === "TRUE",
      halfDay: row[15] === true || row[15] === "TRUE",
      sundayHours: parseFloat(row[16]) || 0,
      phHours: parseFloat(row[17]) || 0,
      remarks: String(row[18] || ""),
    });
  }

  if (records.length === 0) {
    ui.alert("No valid attendance records found!");
    return;
  }

  try {
    const payload = JSON.stringify({ action: "bulkSync", records });

    const options = {
      method: "post",
      contentType: "application/json",
      payload: payload,
      muteHttpExceptions: true,
    };

    const response = UrlFetchApp.fetch(`${DASHBOARD_API_URL}?action=bulkSync`, options);
    const result = JSON.parse(response.getContentText());

    if (result.error) {
      ui.alert("Sync Error", result.error);
    } else {
      ui.alert(
        "Sync Successful!",
        `Synced ${records.length} attendance records to the Laxree Dashboard.\n\n${result.message || ""}`
      );
    }
  } catch (error) {
    ui.alert(
      "Sync Failed",
      `Error: ${error.message}\n\nMake sure:\n1. Dashboard URL is correct\n2. Dashboard server is running\n3. Network access is allowed`
    );
  }
}

// ─── PULL FROM DASHBOARD ─────────────────────────────────────────────────
// Pulls employee data from the Laxree Dashboard into Master Employees sheet

function pullFromDashboard() {
  const ui = SpreadsheetApp.getUi();

  if (!DASHBOARD_API_URL) {
    ui.alert(
      "Dashboard Not Configured",
      "Please set the DASHBOARD_API_URL in the script configuration.\n\n" +
      "1. Go to Extensions → Apps Script\n" +
      "2. Find the line: const DASHBOARD_API_URL = \"\"\n" +
      "3. Replace with your dashboard URL\n" +
      "4. Save and run again"
    );
    return;
  }

  try {
    const response = UrlFetchApp.fetch(`${DASHBOARD_API_URL}?action=pullEmployees`, { muteHttpExceptions: true });
    const result = JSON.parse(response.getContentText());

    if (result.error) {
      ui.alert("Pull Error", result.error);
      return;
    }

    const employees = result.employees || [];
    if (employees.length === 0) {
      ui.alert("No employees found on dashboard!");
      return;
    }

    const masterSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MASTER_SHEET);
    if (!masterSheet) {
      ui.alert("Please run 'Initialize Sheet' first!");
      return;
    }

    // Clear existing data (keep header)
    const lastRow = masterSheet.getLastRow();
    if (lastRow > 1) {
      masterSheet.getRange(2, 1, lastRow - 1, 23).clearContent();
    }

    // Write employee data
    const rows = employees.map(e => [
      e.employeeId, e.fullName, e.firm || "", e.location || "",
      e.salaryType || "hourly", e.monthlySalary || 0, e.dailyRate || 0,
      e.hourlyRate || 0, e.overtimeRate || 0,
      e.employmentType || "Full Time", e.status || "Yes",
      e.shiftStart || DEFAULT_SHIFT_START, e.shiftEnd || DEFAULT_SHIFT_END,
      e.shiftHours || DEFAULT_SHIFT_HOURS,
      e.designation || "", e.department || "",
      e.joiningDate ? new Date(e.joiningDate) : "",
      e.mobile || "", e.bankName || "",
      e.bankAccount || "", e.bankIfsc || "",
      e.panNumber || "", e.aadhaarNumber || ""
    ]);

    masterSheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);

    ui.alert(
      "Pull Successful!",
      `Pulled ${employees.length} employees from the Laxree Dashboard into Master Employees sheet.`
    );
  } catch (error) {
    ui.alert(
      "Pull Failed",
      `Error: ${error.message}\n\nMake sure the dashboard server is running.`
    );
  }
}

// ─── AUTO-SYNC TRIGGER ───────────────────────────────────────────────────
// Set up automatic sync every hour (or custom interval)

function setupAutoSync(intervalHours) {
  // Delete existing triggers
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'autoSyncTrigger') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Create new time-based trigger
  ScriptApp.newTrigger('autoSyncTrigger')
    .timeBased()
    .everyHours(intervalHours || 1)
    .create();

  SpreadsheetApp.getUi().alert(
    "Auto-Sync Enabled",
    `Attendance data will automatically sync to the dashboard every ${intervalHours || 1} hour(s).`
  );
}

function autoSyncTrigger() {
  if (DASHBOARD_API_URL) {
    syncToDashboard();
  }
}

function disableAutoSync() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'autoSyncTrigger') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  SpreadsheetApp.getUi().alert("Auto-Sync Disabled", "Automatic sync has been turned off.");
}

// ─── ON EDIT: Auto-update Daily Input when Master changes ────────────────
// This trigger ensures that when you add a new employee to Master Employees,
// they will be included in the next daily input generation.

function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  const sheetName = sheet.getName();

  // When Master Employees is edited
  if (sheetName === MASTER_SHEET) {
    const row = e.range.getRow();
    const col = e.range.getColumn();

    // If a new employee was added (row > 1 and Employee Code column was filled)
    if (row > 1 && col === 1 && e.value) {
      // Auto-fill defaults if empty
      const defaults = {
        5: "hourly",     // Salary Type
        10: "Full Time",  // Employment Type
        11: "Yes",        // Active
        12: DEFAULT_SHIFT_START,
        13: DEFAULT_SHIFT_END,
        14: DEFAULT_SHIFT_HOURS,
      };

      for (const [c, val] of Object.entries(defaults)) {
        const cell = sheet.getRange(row, parseInt(c));
        if (!cell.getValue()) {
          cell.setValue(val);
        }
      }

      // Auto-calculate hourly rate and OT rate
      sheet.getRange(row, 8).setFormula(
        `=IF(E${row}="monthly",IF(N${row}>0,F${row}/26/N${row},0),IF(E${row}="daily",IF(N${row}>0,G${row}/N${row},0),0))`
      );
      sheet.getRange(row, 9).setFormula(
        `=IF(H${row}>0,H${row}*1.5,0)`
      );
    }
  }
}

// ─── UTILITY: Export Daily Data as JSON ──────────────────────────────────
// Returns all attendance data from Daily Input sheet as JSON

function getDailyDataAsJSON(dateFilter) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dailySheet = ss.getSheetByName(DAILY_SHEET);

  if (!dailySheet) return [];

  const data = dailySheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data[0];
  const records = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;

    const dateVal = row[4] instanceof Date
      ? Utilities.formatDate(row[4], Session.getScriptTimeZone(), "yyyy-MM-dd")
      : String(row[4] || "");

    if (dateFilter && dateVal !== dateFilter) continue;

    records.push({
      employeeId: String(row[0]),
      employeeName: String(row[1]),
      firm: String(row[2]),
      location: String(row[3]),
      date: dateVal,
      checkIn: String(row[5] || ""),
      checkOut: String(row[6] || ""),
      workDuration: parseFloat(row[10]) || 0,
      otHours: parseFloat(row[11]) || 0,
      totalHours: parseFloat(row[12]) || 0,
      status: String(row[13] || "").toLowerCase(),
      lateEntry: row[14] === true || row[14] === "TRUE",
      halfDay: row[15] === true || row[15] === "TRUE",
      sundayHours: parseFloat(row[16]) || 0,
      phHours: parseFloat(row[17]) || 0,
      remarks: String(row[18] || ""),
    });
  }

  return records;
}

// ─── UTILITY: Get Master Employees as JSON ───────────────────────────────

function getMasterEmployeesAsJSON() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(MASTER_SHEET);

  if (!masterSheet) return [];

  const data = masterSheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const employees = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;

    employees.push({
      employeeId: String(row[0]),
      fullName: String(row[1]),
      firm: String(row[2] || ""),
      location: String(row[3] || ""),
      salaryType: String(row[4] || "hourly"),
      monthlySalary: parseFloat(row[5]) || 0,
      dailyRate: parseFloat(row[6]) || 0,
      hourlyRate: parseFloat(row[7]) || 0,
      overtimeRate: parseFloat(row[8]) || 0,
      employmentType: String(row[9] || "Full Time"),
      status: String(row[10] || "Yes"),
      shiftStart: String(row[11] || DEFAULT_SHIFT_START),
      shiftEnd: String(row[12] || DEFAULT_SHIFT_END),
      shiftHours: parseFloat(row[13]) || DEFAULT_SHIFT_HOURS,
      designation: String(row[14] || ""),
      department: String(row[15] || ""),
    });
  }

  return employees;
}

// ─── WEB APP: Serve Data via HTTP ────────────────────────────────────────
// Deploy as Web App to allow the dashboard to fetch data directly

function doGet(e) {
  const action = e.parameter.action || "status";
  let result;

  switch (action) {
    case "status":
      result = { status: "ok", app: "Laxree HR Attendance", version: "1.0" };
      break;

    case "getEmployees":
      result = { employees: getMasterEmployeesAsJSON() };
      break;

    case "getAttendance":
      const date = e.parameter.date || "";
      result = { records: getDailyDataAsJSON(date), date: date };
      break;

    default:
      result = { error: "Unknown action. Use: status, getEmployees, getAttendance" };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let result;

  try {
    const payload = JSON.parse(e.postData.contents);

    if (payload.action === "updateAttendance") {
      // Dashboard can push attendance updates back to the sheet
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const dailySheet = ss.getSheetByName(DAILY_SHEET);

      if (dailySheet && payload.records) {
        payload.records.forEach(record => {
          // Find the row for this employee + date
          const data = dailySheet.getDataRange().getValues();
          for (let i = 1; i < data.length; i++) {
            const dateVal = data[i][4] instanceof Date
              ? Utilities.formatDate(data[i][4], Session.getScriptTimeZone(), "yyyy-MM-dd")
              : String(data[i][4]);

            if (String(data[i][0]) === record.employeeId && dateVal === record.date) {
              // Update In Time and Out Time
              if (record.checkIn) dailySheet.getRange(i + 1, 6).setValue(record.checkIn);
              if (record.checkOut) dailySheet.getRange(i + 1, 7).setValue(record.checkOut);
              if (record.remarks) dailySheet.getRange(i + 1, 19).setValue(record.remarks);
              break;
            }
          }
        });
        result = { success: true, updated: payload.records.length };
      } else {
        result = { error: "Daily Input sheet not found" };
      }
    } else {
      result = { error: "Unknown action" };
    }
  } catch (error) {
    result = { error: error.message };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
