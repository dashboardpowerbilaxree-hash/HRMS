const XLSX = require('xlsx-js-style');
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_pGbVon2mrZ3q@ep-empty-haze-aq8y1r98-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require'
  });
  const client = await pool.connect();
  const result = await client.query(
    'SELECT "employeeId", "fullName", "firm" FROM "Employee" WHERE "status" != $1 ORDER BY "firm", "employeeId"',
    ['inactive']
  );
  client.release();
  await pool.end();

  const employees = result.rows;
  const wb = XLSX.utils.book_new();

  const thinBorder = {
    top: { style: 'thin', color: { rgb: 'D0D0D0' } },
    bottom: { style: 'thin', color: { rgb: 'D0D0D0' } },
    left: { style: 'thin', color: { rgb: 'D0D0D0' } },
    right: { style: 'thin', color: { rgb: 'D0D0D0' } },
  };

  const goldBorder = {
    top: { style: 'medium', color: { rgb: 'D4A843' } },
    bottom: { style: 'medium', color: { rgb: 'D4A843' } },
    left: { style: 'medium', color: { rgb: 'D4A843' } },
    right: { style: 'medium', color: { rgb: 'D4A843' } },
  };

  // Sheet 1: Daily Attendance
  const dailyData = [
    [null, 'LAXREE GROUP OF COMPANIES', null, null, null, null, null, null, null],
    [null, 'Date of Attdence', null, null, null, null, null, null, null],
    [null, 'Daily Attendance Report —', null, null, null, null, null, null, null],
    [],
    ['S.No', 'Employee Name', 'Emp Code', 'Company', 'In Time', 'Out Time', 'Hours', 'Status', 'OT Hours', 'Remark'],
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(dailyData);

  ws1['!merges'] = [
    { s: { r: 0, c: 1 }, e: { r: 0, c: 8 } },
    { s: { r: 1, c: 1 }, e: { r: 1, c: 8 } },
    { s: { r: 2, c: 1 }, e: { r: 2, c: 8 } },
  ];

  ws1['!cols'] = [
    { wch: 6 },
    { wch: 25 },
    { wch: 12 },
    { wch: 18 },
    { wch: 10 },
    { wch: 10 },
    { wch: 8 },
    { wch: 12 },
    { wch: 10 },
    { wch: 15 },
  ];

  // Style header rows
  const goldStyle = { font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 14 }, fill: { fgColor: { rgb: 'D4A843' } }, alignment: { horizontal: 'center', vertical: 'center' }, border: goldBorder };
  const darkStyle = { font: { bold: true, color: { rgb: 'CCCCCC' }, sz: 11 }, fill: { fgColor: { rgb: '1A1A1A' } }, alignment: { horizontal: 'center' } };
  const colHeaderStyle = { font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 }, fill: { fgColor: { rgb: '1E3A5F' } }, alignment: { horizontal: 'center', vertical: 'center' }, border: thinBorder };

  ['B1'].forEach(c => { if (ws1[c]) ws1[c].s = goldStyle; });
  ['B2'].forEach(c => { if (ws1[c]) ws1[c].s = darkStyle; });
  ['B3'].forEach(c => { if (ws1[c]) ws1[c].s = darkStyle; });

  const headerCols = ['A','B','C','D','E','F','G','H','I','J'];
  headerCols.forEach(c => {
    const cell = ws1[c + '5'];
    if (cell) cell.s = colHeaderStyle;
  });

  // Add employee rows
  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];
    const row = 6 + i;
    const isEven = i % 2 === 0;
    const bgColor = isEven ? 'FFF8E7' : undefined;

    ws1['A' + row] = { v: i + 1, t: 'n', s: { alignment: { horizontal: 'center' }, border: thinBorder, fill: bgColor ? { fgColor: { rgb: bgColor } } : undefined } };
    ws1['B' + row] = { v: emp.fullName, s: { border: thinBorder, fill: bgColor ? { fgColor: { rgb: bgColor } } : undefined } };
    ws1['C' + row] = { v: emp.employeeId, s: { alignment: { horizontal: 'center' }, border: thinBorder, fill: bgColor ? { fgColor: { rgb: bgColor } } : undefined } };
    ws1['D' + row] = { v: emp.firm, s: { alignment: { horizontal: 'center' }, border: thinBorder, fill: bgColor ? { fgColor: { rgb: bgColor } } : undefined } };
    // E, F, G, H, I, J left empty for user to fill
    headerCols.slice(4).forEach(c => {
      ws1[c + row] = { v: '', s: { alignment: { horizontal: 'center' }, border: thinBorder, fill: bgColor ? { fgColor: { rgb: bgColor } } : undefined } };
    });
  }

  // Update sheet range
  ws1['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 5 + employees.length, c: 9 } });

  XLSX.utils.book_append_sheet(wb, ws1, 'Daily Attendance');

  // Sheet 2: Summary
  const summaryData = [
    ['Attendance Summary'],
    [],
    ['Category', 'Count'],
    ['Present', 0],
    ['Absent', 0],
    ['Late', 0],
    ['Early Out', 0],
    ['OT Hours', '0m'],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(summaryData);
  ws2['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
  ['A1'].forEach(c => { if (ws2[c]) ws2[c].s = goldStyle; });
  ['A3','B3'].forEach(c => { if (ws2[c]) ws2[c].s = { font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 }, fill: { fgColor: { rgb: '1E3A5F' } }, alignment: { horizontal: 'center' }, border: thinBorder }; });
  ws2['!cols'] = [{ wch: 18 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Summary');

  // Save
  XLSX.writeFile(wb, '/home/z/my-project/public/Laxree_Attendance_Template.xlsx');
  console.log('Daily attendance template created with ' + employees.length + ' employees');
}

main().catch(function(e) { console.error(e); process.exit(1); });
