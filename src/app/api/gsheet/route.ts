import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { google } from 'googleapis';

// ─── Helper: Create Google Sheets client from stored credentials ───
async function getSheetsClient() {
  const settings = await db.setting.findMany({
    where: { key: { in: ['gsheet_client_email', 'gsheet_private_key', 'gsheet_sheet_id'] } },
  });
  const map: Record<string, string> = {};
  settings.forEach(s => { map[s.key] = s.value; });

  const clientEmail = map.gsheet_client_email;
  const privateKey = map.gsheet_private_key?.replace(/\\n/g, '\n');
  const sheetId = map.gsheet_sheet_id;

  if (!clientEmail || !privateKey || !sheetId) {
    throw new Error('Google Sheets not configured. Go to Settings → Google Sheets Integration to set up.');
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  return { sheets, sheetId };
}

// ─── Helper: Parse hours from time string ───
function calcHours(checkIn: string, checkOut: string): number {
  const [h1, m1] = checkIn.split(':').map(Number);
  const [h2, m2] = checkOut.split(':').map(Number);
  let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (diff < 0) diff += 24 * 60; // overnight shift
  return Math.max(0, diff / 60);
}

// ─── GET: Various read actions ───
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'status';

    // ── Status check ──
    if (action === 'status') {
      const settings = await db.setting.findMany({
        where: { key: { in: ['gsheet_client_email', 'gsheet_private_key', 'gsheet_sheet_id'] } },
      });
      const map: Record<string, string> = {};
      settings.forEach(s => { map[s.key] = s.value; });
      const configured = !!(map.gsheet_client_email && map.gsheet_private_key && map.gsheet_sheet_id);
      return NextResponse.json({
        configured,
        sheetId: map.gsheet_sheet_id || '',
        clientEmail: map.gsheet_client_email || '',
        hasKey: !!map.gsheet_private_key,
      });
    }

    // ── Test connection ──
    if (action === 'test') {
      const { sheets, sheetId } = await getSheetsClient();
      const response = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
      const sheetNames = response.data.sheets?.map(s => s.properties?.title || '') || [];
      return NextResponse.json({
        success: true,
        message: `Connected! Found ${sheetNames.length} sheet(s): ${sheetNames.join(', ')}`,
        sheets: sheetNames,
      });
    }

    // ── Pull employees (for Apps Script to fetch) ──
    if (action === 'pullEmployees') {
      const employees = await db.employee.findMany({
        where: { status: 'Yes' },
        select: {
          employeeId: true, fullName: true, firm: true, location: true,
          salaryType: true, monthlySalary: true, dailyRate: true,
          hourlyRate: true, overtimeRate: true, employmentType: true,
          status: true, shiftStart: true, shiftEnd: true, shiftHours: true,
          designation: true, department: true, joiningDate: true,
          mobile: true, bankName: true, bankAccount: true, bankIfsc: true,
          panNumber: true, aadhaarNumber: true,
        },
        orderBy: { employeeId: 'asc' },
      });
      return NextResponse.json({ employees });
    }

    // ── Pull from "Daily Input" sheet (new format with 19 columns A-S) ──
    if (action === 'pullDaily') {
      const { sheets, sheetId } = await getSheetsClient();
      const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `Daily Input!A:S`,
      });

      const rows = response.data.values;
      if (!rows || rows.length < 2) {
        return NextResponse.json({ message: 'No data found in Daily Input sheet', synced: 0 });
      }

      let synced = 0;
      let errors = 0;
      const errorDetails: string[] = [];

      for (const row of rows.slice(1)) {
        try {
          const employeeId = String(row[0] || '').trim();
          const rowDate = String(row[4] || date).trim();
          const checkIn = String(row[5] || '').trim();
          const checkOut = String(row[6] || '').trim();
          // Row columns: 0=Code, 1=Name, 2=Firm, 3=Location, 4=Date, 5=InTime, 6=OutTime
          // 7=ShiftStart, 8=ShiftEnd, 9=ShiftHours, 10=WorkDuration, 11=OTHours, 12=TotalHours
          // 13=Status, 14=LateEntry, 15=HalfDay, 16=SundayHrs, 17=Remarks
          const sheetStatus = String(row[13] || '').trim().toLowerCase();
          const sheetWorkDuration = parseFloat(row[10]) || 0;
          const sheetOTHours = parseFloat(row[11]) || 0;
          const sheetSundayHours = parseFloat(row[16]) || 0;
          const remarks = String(row[17] || '').trim();

          if (!employeeId) continue;

          const employee = await db.employee.findUnique({ where: { employeeId } });
          if (!employee) { errorDetails.push(`Employee ${employeeId} not found`); errors++; continue; }

          const d = new Date(rowDate);
          if (isNaN(d.getTime())) { errorDetails.push(`Invalid date for ${employeeId}: ${rowDate}`); errors++; continue; }

          const dayOfWeek = d.getDay();
          const isSunday = dayOfWeek === 0;

          const holidays = await db.holiday.findMany({
            where: { date: { gte: new Date(d.getFullYear(), d.getMonth(), d.getDate()), lt: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1) } },
          });
          const isPH = holidays.length > 0;
          const isHoliday = isPH;

          let totalHours = sheetWorkDuration;
          let overtimeHours = sheetOTHours;
          let lateEntry = false;
          let halfDay = false;
          let sundayHours = sheetSundayHours;
          let finalStatus = sheetStatus;

          // If checkIn and checkOut provided, recalculate to be accurate
          if (checkIn && checkOut) {
            totalHours = calcHours(checkIn, checkOut);
            const [shiftH, shiftM] = employee.shiftStart.split(':').map(Number);
            const [ciH, ciM] = checkIn.split(':').map(Number);
            lateEntry = (ciH * 60 + ciM) > (shiftH * 60 + shiftM + 15);
            halfDay = totalHours < employee.shiftHours / 2;
            overtimeHours = Math.max(0, totalHours - employee.shiftHours);
            if (isSunday) sundayHours = totalHours;

            if (!finalStatus || finalStatus === 'present') {
              if (isSunday) finalStatus = 'weekly-off';
              else if (isHoliday) finalStatus = 'holiday';
              else if (halfDay) finalStatus = 'half-day';
              else if (lateEntry) finalStatus = 'late';
              else finalStatus = 'present';
            }
          } else if (isSunday) {
            finalStatus = 'weekly-off';
          } else if (isHoliday) {
            finalStatus = 'holiday';
          } else if (finalStatus === 'absent') {
            // keep absent
          } else if (!finalStatus) {
            finalStatus = 'present';
          }

          const existing = await db.attendance.findFirst({
            where: { employeeId, date: { gte: new Date(d.getFullYear(), d.getMonth(), d.getDate()), lt: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1) } },
          });

          const data = {
            checkIn: checkIn || null, checkOut: checkOut || null,
            totalHours, status: finalStatus, lateEntry, halfDay, overtimeHours,
            isHoliday, isWeeklyOff: isSunday, isSunday, isPH, sundayHours, remarks,
          };

          if (existing) {
            await db.attendance.update({ where: { id: existing.id }, data });
          } else {
            await db.attendance.create({ data: { employeeId, date: d, ...data } });
          }

          if (overtimeHours > 0) {
            // OT at normal hourly rate (1x), NOT 1.5x
            const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
            const normalHourlyRate = Math.ceil(employee.monthlySalary / (daysInMonth * employee.shiftHours));
            const otAmount = Math.round(overtimeHours * normalHourlyRate * 100) / 100;
            await db.overtime.upsert({
              where: { id: `ot-sheet-${employeeId}-${d.toISOString().split('T')[0]}` },
              update: { hours: overtimeHours, rate: normalHourlyRate, amount: otAmount },
              create: { id: `ot-sheet-${employeeId}-${d.toISOString().split('T')[0]}`, employeeId, date: d, hours: overtimeHours, rate: normalHourlyRate, amount: otAmount, status: 'approved' },
            });
          }
          synced++;
        } catch (err: any) {
          errorDetails.push(`Row error: ${err.message}`);
          errors++;
        }
      }

      await db.notification.create({ data: { title: 'Google Sheets Sync', message: `Pulled ${synced} records from Daily Input (${errors} errors)`, type: 'system' } });
      return NextResponse.json({ synced, errors, errorDetails: errorDetails.slice(0, 10), message: `Synced ${synced} records from Daily Input sheet` });
    }

    // ── Pull from legacy "Attendance" sheet (old format, 10 columns) ──
    if (action === 'pull') {
      const { sheets, sheetId } = await getSheetsClient();
      const sheetName = searchParams.get('sheetName') || 'Attendance';
      const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${sheetName}!A:S`,
      });

      const rows = response.data.values;
      if (!rows || rows.length < 2) {
        return NextResponse.json({ message: 'No data found in sheet', synced: 0 });
      }

      let synced = 0;
      let errors = 0;
      const errorDetails: string[] = [];

      for (const row of rows.slice(1)) {
        try {
          const employeeId = String(row[0] || '').trim();
          // Support both old format (date at col 2) and new format (date at col 4)
          const isNewFormat = rows[0].length > 12;
          const rowDate = isNewFormat ? String(row[4] || date).trim() : String(row[2] || date).trim();
          const checkIn = isNewFormat ? String(row[5] || '').trim() : String(row[3] || '').trim();
          const checkOut = isNewFormat ? String(row[6] || '').trim() : String(row[4] || '').trim();
          const status = isNewFormat ? String(row[13] || 'present').trim().toLowerCase() : String(row[5] || 'present').trim().toLowerCase();
          const remarks = isNewFormat ? String(row[18] || '').trim() : String(row[8] || '').trim();

          if (!employeeId) continue;

          const employee = await db.employee.findUnique({ where: { employeeId } });
          if (!employee) { errorDetails.push(`Employee ${employeeId} not found`); errors++; continue; }

          const d = new Date(rowDate);
          if (isNaN(d.getTime())) { errorDetails.push(`Invalid date for ${employeeId}: ${rowDate}`); errors++; continue; }

          const dayOfWeek = d.getDay();
          const isSunday = dayOfWeek === 0;

          const holidays = await db.holiday.findMany({
            where: { date: { gte: new Date(d.getFullYear(), d.getMonth(), d.getDate()), lt: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1) } },
          });
          const isPH = holidays.length > 0;
          const isHoliday = isPH;

          let totalHours = 0, lateEntry = false, halfDay = false, overtimeHours = 0, sundayHours = 0;
          let finalStatus = status;

          if (checkIn && checkOut) {
            totalHours = calcHours(checkIn, checkOut);
            const [shiftH, shiftM] = employee.shiftStart.split(':').map(Number);
            const [ciH, ciM] = checkIn.split(':').map(Number);
            lateEntry = (ciH * 60 + ciM) > (shiftH * 60 + shiftM + 15);
            halfDay = totalHours < employee.shiftHours / 2;
            overtimeHours = Math.max(0, totalHours - employee.shiftHours);
            if (isSunday) sundayHours = totalHours;

            if (isSunday) finalStatus = 'weekly-off';
            else if (isHoliday) finalStatus = 'holiday';
            else if (halfDay) finalStatus = 'half-day';
            else if (lateEntry) finalStatus = 'late';
            else finalStatus = 'present';
          } else if (isSunday) finalStatus = 'weekly-off';
          else if (isHoliday) finalStatus = 'holiday';
          else if (status === 'absent') finalStatus = 'absent';

          const existing = await db.attendance.findFirst({
            where: { employeeId, date: { gte: new Date(d.getFullYear(), d.getMonth(), d.getDate()), lt: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1) } },
          });

          const data = { checkIn: checkIn || null, checkOut: checkOut || null, totalHours, status: finalStatus, lateEntry, halfDay, overtimeHours, isHoliday, isWeeklyOff: isSunday, isSunday, isPH, sundayHours, remarks };

          if (existing) {
            await db.attendance.update({ where: { id: existing.id }, data });
          } else {
            await db.attendance.create({ data: { employeeId, date: d, ...data } });
          }

          if (overtimeHours > 0) {
            // OT at normal hourly rate (1x), NOT 1.5x
            const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
            const normalHourlyRate = Math.ceil(employee.monthlySalary / (daysInMonth * employee.shiftHours));
            const otAmount = Math.round(overtimeHours * normalHourlyRate * 100) / 100;
            await db.overtime.upsert({
              where: { id: `ot-sheet-${employeeId}-${d.toISOString().split('T')[0]}` },
              update: { hours: overtimeHours, rate: normalHourlyRate, amount: otAmount },
              create: { id: `ot-sheet-${employeeId}-${d.toISOString().split('T')[0]}`, employeeId, date: d, hours: overtimeHours, rate: normalHourlyRate, amount: otAmount, status: 'approved' },
            });
          }
          synced++;
        } catch (err: any) {
          errorDetails.push(`Row error: ${err.message}`);
          errors++;
        }
      }

      await db.notification.create({ data: { title: 'Google Sheets Sync', message: `Pulled ${synced} records (${errors} errors)`, type: 'system' } });
      return NextResponse.json({ synced, errors, errorDetails: errorDetails.slice(0, 10), message: `Synced ${synced} records from Google Sheet` });
    }

    // ── Push attendance to "Daily Input" sheet (new format) ──
    if (action === 'push') {
      const { sheets, sheetId } = await getSheetsClient();
      const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
      const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);

      const records = await db.attendance.findMany({
        where: { date: { gte: startDate, lt: endDate } },
        include: { employee: { select: { fullName: true, department: true, location: true, firm: true, shiftStart: true, shiftEnd: true, shiftHours: true } } },
        orderBy: [{ date: 'asc' }, { employeeId: 'asc' }],
      });

      if (records.length === 0) {
        return NextResponse.json({ message: 'No attendance records found', pushed: 0 });
      }

      const headerRow = [
        'Employee Code', 'Employee Name', 'Firm', 'Location',
        'Date', 'In Time', 'Out Time',
        'Shift Start', 'Shift End', 'Shift Hours',
        'Work Duration (hrs)', 'OT Hours', 'Total Hours (incl OT)',
        'Status', 'Late Entry', 'Half Day',
        'Sunday Hours', 'Remarks'
      ];
      const dataRows = records.map(r => [
        r.employeeId,
        r.employee?.fullName || '',
        r.employee?.firm || r.employee?.department || '',
        r.employee?.location || '',
        new Date(r.date).toISOString().split('T')[0],
        r.checkIn || '',
        r.checkOut || '',
        r.employee?.shiftStart || '10:00',
        r.employee?.shiftEnd || '19:00',
        r.employee?.shiftHours || 9,
        r.totalHours.toString(),
        r.overtimeHours.toString(),
        r.totalHours.toString(),
        r.status,
        r.lateEntry ? 'TRUE' : 'FALSE',
        r.halfDay ? 'TRUE' : 'FALSE',
        r.sundayHours.toString(),
        r.remarks || '',
      ]);

      // Create "Daily Input" sheet if it doesn't exist
      try {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: sheetId,
          requestBody: { requests: [{ addSheet: { properties: { title: 'Daily Input' } } }] },
        });
      } catch {}

      await sheets.spreadsheets.values.clear({ spreadsheetId: sheetId, range: `Daily Input!A:Z` });
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId, range: `Daily Input!A1`, valueInputOption: 'USER_ENTERED',
        requestBody: { values: [headerRow, ...dataRows] },
      });

      await db.notification.create({ data: { title: 'Google Sheets Sync', message: `Pushed ${records.length} records to Daily Input`, type: 'system' } });
      return NextResponse.json({ pushed: records.length, message: `Pushed ${records.length} records to Daily Input sheet` });
    }

    // ── Create template in "Daily Input" sheet ──
    if (action === 'template') {
      const { sheets, sheetId } = await getSheetsClient();
      const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

      const employees = await db.employee.findMany({
        where: { status: 'Yes' },
        select: { employeeId: true, fullName: true, firm: true, department: true, location: true, shiftStart: true, shiftEnd: true, shiftHours: true },
        orderBy: { employeeId: 'asc' },
      });

      const headerRow = [
        'Employee Code', 'Employee Name', 'Firm', 'Location',
        'Date', 'In Time', 'Out Time',
        'Shift Start', 'Shift End', 'Shift Hours',
        'Work Duration (hrs)', 'OT Hours', 'Total Hours (incl OT)',
        'Status', 'Late Entry', 'Half Day',
        'Sunday Hours', 'Remarks'
      ];
      const dataRows = employees.map(e => [
        e.employeeId, e.fullName, e.firm || e.department, e.location,
        date, '', '',
        e.shiftStart, e.shiftEnd, e.shiftHours,
        '', '', '', '', '', '', '', '',
      ]);

      // Create "Daily Input" sheet if it doesn't exist
      try {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: sheetId,
          requestBody: { requests: [{ addSheet: { properties: { title: 'Daily Input' } } }] },
        });
      } catch {}

      await sheets.spreadsheets.values.clear({ spreadsheetId: sheetId, range: `Daily Input!A:Z` });
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId, range: `Daily Input!A1`, valueInputOption: 'USER_ENTERED',
        requestBody: { values: [headerRow, ...dataRows] },
      });

      return NextResponse.json({ created: true, sheetName: 'Daily Input', employees: employees.length, message: `Created template in "Daily Input" with ${employees.length} employees for ${date}` });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('Google Sheets error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── POST: Save config, bulk sync from Apps Script ───
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ── Bulk sync from Google Apps Script ──
    if (body.action === 'bulkSync' && body.records) {
      let synced = 0;
      let errors = 0;
      const errorDetails: string[] = [];

      for (const record of body.records) {
        try {
          const { employeeId, date, checkIn, checkOut, status, remarks, workDuration, otHours, totalHours, sundayHours, lateEntry, halfDay } = record;

          if (!employeeId || !date) continue;

          const employee = await db.employee.findUnique({ where: { employeeId } });
          if (!employee) { errorDetails.push(`Employee ${employeeId} not found`); errors++; continue; }

          const d = new Date(date);
          if (isNaN(d.getTime())) { errorDetails.push(`Invalid date for ${employeeId}: ${date}`); errors++; continue; }

          const dayOfWeek = d.getDay();
          const isSunday = dayOfWeek === 0;

          const holidays = await db.holiday.findMany({
            where: { date: { gte: new Date(d.getFullYear(), d.getMonth(), d.getDate()), lt: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1) } },
          });
          const isPH = holidays.length > 0;
          const isHoliday = isPH;

          let finalTotalHours = workDuration || 0;
          let finalOvertimeHours = otHours || 0;
          let finalSundayHours = sundayHours || 0;
          let finalLateEntry = lateEntry || false;
          let finalHalfDay = halfDay || false;
          let finalStatus = (status || 'present').toLowerCase();

          // Recalculate if checkIn and checkOut are provided
          if (checkIn && checkOut) {
            finalTotalHours = calcHours(checkIn, checkOut);
            const [shiftH, shiftM] = employee.shiftStart.split(':').map(Number);
            const [ciH, ciM] = checkIn.split(':').map(Number);
            finalLateEntry = (ciH * 60 + ciM) > (shiftH * 60 + shiftM + 15);
            finalHalfDay = finalTotalHours < employee.shiftHours / 2;
            finalOvertimeHours = Math.max(0, finalTotalHours - employee.shiftHours);
            if (isSunday) finalSundayHours = finalTotalHours;

            if (isSunday) finalStatus = 'weekly-off';
            else if (isHoliday) finalStatus = 'holiday';
            else if (finalHalfDay) finalStatus = 'half-day';
            else if (finalLateEntry) finalStatus = 'late';
            else finalStatus = 'present';
          } else if (isSunday) finalStatus = 'weekly-off';
          else if (isHoliday) finalStatus = 'holiday';

          const existing = await db.attendance.findFirst({
            where: { employeeId, date: { gte: new Date(d.getFullYear(), d.getMonth(), d.getDate()), lt: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1) } },
          });

          const data = {
            checkIn: checkIn || null, checkOut: checkOut || null,
            totalHours: finalTotalHours, status: finalStatus, lateEntry: finalLateEntry,
            halfDay: finalHalfDay, overtimeHours: finalOvertimeHours,
            isHoliday, isWeeklyOff: isSunday, isSunday, isPH,
            sundayHours: finalSundayHours,
            remarks: remarks || null,
          };

          if (existing) {
            await db.attendance.update({ where: { id: existing.id }, data });
          } else {
            await db.attendance.create({ data: { employeeId, date: d, ...data } });
          }

          if (finalOvertimeHours > 0) {
            // OT at normal hourly rate (1x), NOT 1.5x
            const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
            const normalHourlyRate = Math.ceil(employee.monthlySalary / (daysInMonth * employee.shiftHours));
            const otAmount = Math.round(finalOvertimeHours * normalHourlyRate * 100) / 100;
            await db.overtime.upsert({
              where: { id: `ot-sheet-${employeeId}-${d.toISOString().split('T')[0]}` },
              update: { hours: finalOvertimeHours, rate: normalHourlyRate, amount: otAmount },
              create: { id: `ot-sheet-${employeeId}-${d.toISOString().split('T')[0]}`, employeeId, date: d, hours: finalOvertimeHours, rate: normalHourlyRate, amount: otAmount, status: 'approved' },
            });
          }
          synced++;
        } catch (err: any) {
          errorDetails.push(`Record error: ${err.message}`);
          errors++;
        }
      }

      await db.notification.create({ data: { title: 'Google Sheets Bulk Sync', message: `Synced ${synced} records (${errors} errors)`, type: 'system' } });
      return NextResponse.json({ synced, errors, errorDetails: errorDetails.slice(0, 10), message: `Bulk synced ${synced} attendance records` });
    }

    // ── Save Google Sheets configuration ──
    const { clientEmail, privateKey, sheetId } = body;

    if (!clientEmail || !privateKey || !sheetId) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    await db.setting.upsert({ where: { key: 'gsheet_client_email' }, update: { value: clientEmail }, create: { key: 'gsheet_client_email', value: clientEmail } });
    await db.setting.upsert({ where: { key: 'gsheet_private_key' }, update: { value: privateKey }, create: { key: 'gsheet_private_key', value: privateKey } });
    await db.setting.upsert({ where: { key: 'gsheet_sheet_id' }, update: { value: sheetId }, create: { key: 'gsheet_sheet_id', value: sheetId } });

    try {
      const auth = new google.auth.JWT({ email: clientEmail, key: privateKey.replace(/\\n/g, '\n'), scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
      const sheets = google.sheets({ version: 'v4', auth });
      const response = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
      const sheetNames = response.data.sheets?.map(s => s.properties?.title || '') || [];
      await db.notification.create({ data: { title: 'Google Sheets Connected', message: `Connected to: ${sheetNames.join(', ')}`, type: 'system' } });
      return NextResponse.json({ success: true, message: `Connected! Sheets: ${sheetNames.join(', ')}`, sheets: sheetNames });
    } catch (testErr: any) {
      return NextResponse.json({ success: true, warning: `Saved but connection test failed: ${testErr.message}` });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── DELETE: Disconnect ───
export async function DELETE() {
  try {
    await db.setting.deleteMany({ where: { key: { in: ['gsheet_client_email', 'gsheet_private_key', 'gsheet_sheet_id'] } } });
    return NextResponse.json({ success: true, message: 'Google Sheets disconnected' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
