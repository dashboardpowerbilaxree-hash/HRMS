const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const employees = [
  { employeeId: 'EMP-014', fullName: 'Anamika', firm: 'SI', location: 'Ajmer', salaryType: 'hourly', monthlySalary: 14000, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9 },
  { employeeId: 'EMP-026', fullName: 'Mayank', firm: 'SI', location: 'Ajmer', salaryType: 'hourly', monthlySalary: 10000, employmentType: 'Part Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9 },
  { employeeId: 'EMP-033', fullName: 'Radhika Mehra', firm: 'SI', location: 'Ajmer', salaryType: 'hourly', monthlySalary: 12000, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9 },
  { employeeId: 'EMP-501', fullName: 'Arun', firm: 'SI', location: 'Jaipur', salaryType: 'hourly', monthlySalary: 50000, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9 },
  { employeeId: 'EMP-504', fullName: 'Priyanka', firm: 'SI', location: 'Jaipur', salaryType: 'hourly', monthlySalary: 18000, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9 },
  { employeeId: 'EMP-007', fullName: 'Khushboo', firm: 'LRSL', location: 'Ajmer', salaryType: 'hourly', monthlySalary: 18000, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9 },
  { employeeId: 'EMP-417', fullName: 'Aditya Sharma', firm: 'LRSL', location: 'Ajmer', salaryType: 'hourly', monthlySalary: 25000, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9 },
  { employeeId: 'EMP-420', fullName: 'Arti Sharma', firm: 'LRSL', location: 'Ajmer', salaryType: 'hourly', monthlySalary: 20000, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9 },
  { employeeId: 'EMP-421', fullName: 'Aayush Sharma', firm: 'LRSL', location: 'Ajmer', salaryType: 'hourly', monthlySalary: 16000, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9 },
  { employeeId: 'EMP-422', fullName: 'Aakash Sangat', firm: 'LRSL', location: 'Ajmer', salaryType: 'hourly', monthlySalary: 15000, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9, status: 'inactive' },
  { employeeId: 'EMP-423', fullName: 'Arjun', firm: 'LRSL', location: 'Ajmer', salaryType: 'hourly', monthlySalary: 23000, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9 },
  { employeeId: 'EMP-424', fullName: 'Sujeet', firm: 'LRSL', location: 'Ajmer', salaryType: 'hourly', monthlySalary: 24000, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9 },
  { employeeId: 'EMP-034', fullName: 'Prakash', firm: 'LRSL', location: 'Ajmer', salaryType: 'hourly', monthlySalary: 60000, employmentType: 'Part Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9 },
  { employeeId: 'EMP-415', fullName: 'Ronak Jain', firm: 'LRSL', location: 'Ajmer', salaryType: 'hourly', monthlySalary: 51000, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9, status: 'inactive' },
  { employeeId: 'EMP-302', fullName: 'Lalchand', firm: 'LRSL', location: 'Roofing Factory', salaryType: 'daily', monthlySalary: 15000, dailyRate: 650, employmentType: 'Full Time', shiftStart: '09:00', shiftEnd: '18:00', shiftHours: 9, status: 'inactive' },
  { employeeId: 'EMP-306', fullName: 'Parkash', firm: 'LRSL', location: 'Roofing Factory', salaryType: 'daily', monthlySalary: 12000, dailyRate: 550, employmentType: 'Full Time', shiftStart: '09:00', shiftEnd: '18:00', shiftHours: 9 },
  { employeeId: 'EMP-308', fullName: 'Savroopnath', firm: 'LRSL', location: 'Roofing Factory', salaryType: 'daily', monthlySalary: 18000, dailyRate: 750, employmentType: 'Full Time', shiftStart: '09:00', shiftEnd: '18:00', shiftHours: 9 },
  { employeeId: 'EMP-326', fullName: 'Sitadevi', firm: 'LRSL', location: 'Roofing Factory', salaryType: 'daily', monthlySalary: 10000, dailyRate: 450, employmentType: 'Full Time', shiftStart: '09:00', shiftEnd: '18:00', shiftHours: 9 },
  { employeeId: 'EMP-327', fullName: 'Ramprasad', firm: 'LRSL', location: 'Roofing Factory', salaryType: 'daily', monthlySalary: 14000, dailyRate: 600, employmentType: 'Full Time', shiftStart: '09:00', shiftEnd: '18:00', shiftHours: 9 },
  { employeeId: 'EMP-328', fullName: 'Pradhan', firm: 'LRSL', location: 'Roofing Factory', salaryType: 'daily', monthlySalary: 13950, dailyRate: 600, employmentType: 'Full Time', shiftStart: '09:00', shiftEnd: '18:00', shiftHours: 9 },
  { employeeId: 'EMP-329', fullName: 'Shaitan', firm: 'LRSL', location: 'Roofing Factory', salaryType: 'daily', monthlySalary: 13950, dailyRate: 600, employmentType: 'Full Time', shiftStart: '09:00', shiftEnd: '18:00', shiftHours: 9 },
  { employeeId: 'EMP-330', fullName: 'Anil', firm: 'LRSL', location: 'Roofing Factory', salaryType: 'daily', monthlySalary: 13950, dailyRate: 600, employmentType: 'Full Time', shiftStart: '09:00', shiftEnd: '18:00', shiftHours: 9 },
  { employeeId: 'EMP-331', fullName: 'Bhangchand', firm: 'LRSL', location: 'Roofing Factory', salaryType: 'daily', monthlySalary: 16000, dailyRate: 700, employmentType: 'Full Time', shiftStart: '09:00', shiftEnd: '19:00', shiftHours: 10 },
  { employeeId: 'EMP-332', fullName: 'Raji Devi', firm: 'LRSL', location: 'Roofing Factory', salaryType: 'daily', monthlySalary: 8000, dailyRate: 350, employmentType: 'Part Time', shiftStart: '09:00', shiftEnd: '13:00', shiftHours: 4 },
  { employeeId: 'EMP-041', fullName: 'Kulvinder', firm: 'LAPL', location: 'Gurgaon', salaryType: 'hourly', monthlySalary: 75000, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9 },
  { employeeId: 'EMP-054', fullName: 'Ranveer', firm: 'LAPL', location: 'Gurgaon', salaryType: 'hourly', monthlySalary: 15000, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9 },
  { employeeId: 'EMP-002', fullName: 'Soma', firm: 'LAPL', location: 'Gurgaon', salaryType: 'hourly', monthlySalary: 25000, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9 },
  { employeeId: 'EMP-030', fullName: 'Ruchi', firm: 'LAPL', location: 'Ajmer', salaryType: 'hourly', monthlySalary: 24500, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9 },
  { employeeId: 'EMP-102', fullName: 'Ugam', firm: 'LAPL', location: 'Palra Warehouse', salaryType: 'hourly', monthlySalary: 18000, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '20:00', shiftHours: 10 },
  { employeeId: 'EMP-114', fullName: 'Gajendra', firm: 'LAPL', location: 'Palra Warehouse', salaryType: 'hourly', monthlySalary: 18000, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '20:00', shiftHours: 10 },
  { employeeId: 'EMP-116', fullName: 'Jivanand', firm: 'LAPL', location: 'Palra Warehouse', salaryType: 'hourly', monthlySalary: 15000, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '20:00', shiftHours: 10, status: 'inactive' },
  { employeeId: 'EMP-001', fullName: 'taraChand', firm: 'LAPL', location: 'Palra Warehouse', salaryType: 'hourly', monthlySalary: 15500, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '20:00', shiftHours: 10 },
  { employeeId: 'EMP-016', fullName: 'Mahipal', firm: 'LAPL', location: 'Ajmer', salaryType: 'hourly', monthlySalary: 16500, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '20:00', shiftHours: 10, status: 'inactive' },
  { employeeId: 'EMP-013', fullName: 'Saurabh', firm: 'LAPL', location: 'Ajmer', salaryType: 'hourly', monthlySalary: 22600, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9 },
  { employeeId: 'EMP-021', fullName: 'Kamlesh', firm: 'LAPL', location: 'Ajmer', salaryType: 'hourly', monthlySalary: 17000, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9 },
  { employeeId: 'EMP-018', fullName: 'Sandeep Sawilani', firm: 'LAPL', location: 'Ajmer', salaryType: 'hourly', monthlySalary: 20000, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9 },
  { employeeId: 'EMP-406', fullName: 'Hitesh Tak', firm: 'LAPL', location: 'Ajmer', salaryType: 'hourly', monthlySalary: 27500, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9 },
  { employeeId: 'EMP-011', fullName: 'Reena', firm: 'SDF', location: 'Ajmer', salaryType: 'hourly', monthlySalary: 5700, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9 },
  { employeeId: 'EMP-012', fullName: 'Raju', firm: 'SDF', location: 'Ajmer', salaryType: 'hourly', monthlySalary: 11150, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '20:00', shiftHours: 10 },
  { employeeId: 'EMP-037', fullName: 'Reetu Sindal', firm: 'SDF', location: 'Ajmer', salaryType: 'hourly', monthlySalary: 10000, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9 },
];

async function reseed() {
  console.log('Creating admin, firms, locations...');
  await prisma.admin.create({ data: { username: 'admin', password: 'laxree@2026', name: 'Laxree Admin', role: 'super_admin' } });
  const firms = [
    { code: 'LAPL', name: 'LAXREE AMENITIES PVT LTD', address: 'Plot No. 1 & 2, Harbilas Sharda Marg, Civil Lines, Ajmer, Rajasthan 305001', contactPhone: '+919251683663', contactEmail: 'hr@laxree.com', logo: '/laxree-logo.png' },
    { code: 'LRSL', name: 'LAXREE ROOFING SOLUTION', address: 'Plot No. 1 & 2, Harbilas Sharda Marg, Civil Lines, Ajmer, Rajasthan 305001', contactPhone: '+919251683663', contactEmail: 'hr@laxree.com', logo: '/laxree-logo.png' },
    { code: 'SI', name: 'SMARTH INTERNATIONAL', address: 'Plot No. 1 & 2, Harbilas Sharda Marg, Civil Lines, Ajmer, Rajasthan 305001', contactPhone: '+919251683663', contactEmail: 'hr@laxree.com', logo: '/laxree-logo.png' },
    { code: 'SDF', name: 'SANGRAH DECOR & FURNITURE', address: 'Plot No. 1 & 2, Harbilas Sharda Marg, Civil Lines, Ajmer, Rajasthan 305001', contactPhone: '+919251683663', contactEmail: 'hr@laxree.com', logo: '/laxree-logo.png' },
  ];
  for (const f of firms) await prisma.firm.create({ data: f });
  for (const l of ['Ajmer','Jaipur','Gurgaon','Palra Warehouse','Roofing Factory']) await prisma.location.create({ data: { name: l } });
  console.log('Creating employees...');
  for (let idx = 0; idx < employees.length; idx++) {
    const emp = employees[idx];
    const hourlyRate = emp.salaryType === 'hourly' ? Math.round((emp.monthlySalary / (31 * emp.shiftHours)) * 100) / 100 : Math.round((emp.dailyRate || emp.monthlySalary / 30) / emp.shiftHours * 100) / 100;
    await prisma.employee.create({
      data: { employeeId: emp.employeeId, fullName: emp.fullName.trim(), firm: emp.firm, location: emp.location,
        salaryType: emp.salaryType, monthlySalary: emp.monthlySalary,
        dailyRate: emp.dailyRate || Math.round(emp.monthlySalary / 30),
        hourlyRate, overtimeRate: hourlyRate, employmentType: emp.employmentType || 'Full Time',
        shiftStart: emp.shiftStart, shiftEnd: emp.shiftEnd, shiftHours: emp.shiftHours,
        status: emp.status === 'inactive' ? 'No' : 'Yes',
        designation: emp.firm === 'LAPL' ? 'Staff' : emp.firm === 'LRSL' ? 'Worker' : emp.firm === 'SI' ? 'Associate' : 'Helper',
        department: emp.firm, joiningDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        gender: idx % 3 === 0 ? 'Female' : 'Male',
        dateOfBirth: new Date(1985 + Math.floor(Math.random() * 17), Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 28)) }
    });
  }
  console.log('Employees:', employees.length);

  // Holidays
  const holidays = [
    { name: 'Republic Day', date: new Date(2026,0,26), type: 'national' },
    { name: 'Holi', date: new Date(2026,2,14), type: 'festival' },
    { name: 'Good Friday', date: new Date(2026,3,18), type: 'festival' },
    { name: 'Eid ul-Fitr', date: new Date(2026,3,22), type: 'festival' },
    { name: 'Labour Day', date: new Date(2026,4,1), type: 'national' },
    { name: 'Independence Day', date: new Date(2026,7,15), type: 'national' },
    { name: 'Gandhi Jayanti', date: new Date(2026,9,2), type: 'national' },
    { name: 'Dussehra', date: new Date(2026,9,22), type: 'festival' },
    { name: 'Diwali', date: new Date(2026,10,1), type: 'festival' },
    { name: 'Guru Nanak Jayanti', date: new Date(2026,10,15), type: 'festival' },
    { name: 'Christmas', date: new Date(2026,11,25), type: 'festival' },
  ];
  for (const h of holidays) await prisma.holiday.create({ data: h });

  // FULL May 2026 + June 2026 attendance
  const active = employees.filter(e => e.status !== 'inactive');
  let totalAtt = 0;
  // May
  for (let d = 1; d <= 31; d++) {
    const date = new Date(2026, 4, d);
    if (date.getDay() === 0) continue;
    const hc = await prisma.holiday.findFirst({ where: { date: { gte: new Date(2026,4,d), lt: new Date(2026,4,d+1) } } });
    for (const emp of active) {
      const seed = (emp.employeeId.charCodeAt(4)*7 + d*13 + 52*3) % 100;
      if (hc) {
        if (seed > 55) {
          const [sh,sm] = emp.shiftStart.split(':').map(Number);
          const [eh,em] = emp.shiftEnd.split(':').map(Number);
          const hT = ((eh*60+em)-(sh*60+sm))/60;
          await prisma.attendance.create({ data: { employeeId: emp.employeeId, date, checkIn: emp.shiftStart, checkOut: emp.shiftEnd, totalHours: hT, status: 'holiday', isHoliday: true, isPH: true } });
          totalAtt++;
        }
        continue;
      }
      if (seed > 5) { // ~95% attendance rate
        const [sh,sm] = emp.shiftStart.split(':').map(Number);
        const [eh,em] = emp.shiftEnd.split(':').map(Number);
        const lateMins = seed%10>6 ? (seed%40)+10 : 0; // ~30% late
        const cIH = sh+Math.floor((sm+lateMins)/60); const cIM = (sm+lateMins)%60;
        const checkIn = String(cIH).padStart(2,'0')+':'+String(cIM).padStart(2,'0');
        const otMins = seed%10>4 ? (seed%90)+15 : 0; // ~50% OT
        const cOM = (eh*60+em)+otMins; const cOH = Math.floor(cOM/60); const cOMM = cOM%60;
        const checkOut = String(cOH).padStart(2,'0')+':'+String(cOMM).padStart(2,'0');
        const totalH = Math.round(((cOH*60+cOMM)-(cIH*60+cIM))/60*100)/100;
        const actualOT = Math.max(0, Math.round((totalH-emp.shiftHours)*100)/100);
        const isLate = seed%10>7;
        await prisma.attendance.create({ data: { employeeId: emp.employeeId, date, checkIn, checkOut, totalHours: Math.max(0,totalH), status: isLate?'late':'present', lateEntry: isLate, overtimeHours: actualOT } });
        totalAtt++;
        if (actualOT > 0) {
          const nr = Math.round((emp.monthlySalary/(31*emp.shiftHours))*100)/100;
          await prisma.overtime.create({ data: { employeeId: emp.employeeId, date, hours: actualOT, rate: nr, amount: Math.round(actualOT*nr*100)/100, status: 'approved' } });
        }
      }
    }
  }
  console.log('May attendance:', totalAtt);

  // June
  const today = new Date(); const todayD = today.getDate();
  let jAtt = 0;
  for (let d = 1; d <= todayD; d++) {
    const date = new Date(2026, 5, d);
    if (date.getDay() === 0) continue;
    for (const emp of active) {
      const seed = (emp.employeeId.charCodeAt(4)*11 + d*17 + 53*7) % 100;
      if (seed > 3) { // ~97% attendance
        const [sh,sm] = emp.shiftStart.split(':').map(Number);
        const [eh,em] = emp.shiftEnd.split(':').map(Number);
        const lateMins = seed%10>5 ? (seed%25)+5 : 0;
        const cIH = sh+Math.floor((sm+lateMins)/60); const cIM = (sm+lateMins)%60;
        const checkIn = String(cIH).padStart(2,'0')+':'+String(cIM).padStart(2,'0');
        const otMins = seed%10>4 ? (seed%75)+15 : 0;
        const cOM = (eh*60+em)+otMins; const cOH = Math.floor(cOM/60); const cOMM = cOM%60;
        const checkOut = String(cOH).padStart(2,'0')+':'+String(cOMM).padStart(2,'0');
        const totalH = Math.round(((cOH*60+cOMM)-(cIH*60+cIM))/60*100)/100;
        const actualOT = Math.max(0, Math.round((totalH-emp.shiftHours)*100)/100);
        const isLate = seed%10>6;
        await prisma.attendance.create({ data: { employeeId: emp.employeeId, date, checkIn, checkOut, totalHours: Math.max(0,totalH), status: isLate?'late':'present', lateEntry: isLate, overtimeHours: actualOT } });
        jAtt++;
        if (actualOT > 0) {
          const nr = Math.round((emp.monthlySalary/(30*emp.shiftHours))*100)/100;
          await prisma.overtime.create({ data: { employeeId: emp.employeeId, date, hours: actualOT, rate: nr, amount: Math.round(actualOT*nr*100)/100, status: 'approved' } });
        }
      }
    }
  }
  console.log('June attendance:', jAtt);

  // Leaves, notifications, settings
  await prisma.leave.createMany({ data: [
    { employeeId: 'EMP-007', type: 'Casual Leave', startDate: new Date(2026,4,10), endDate: new Date(2026,4,11), days: 2, reason: 'Personal work', status: 'approved' },
    { employeeId: 'EMP-041', type: 'Sick Leave', startDate: new Date(2026,4,15), endDate: new Date(2026,4,16), days: 2, reason: 'Health issues', status: 'approved' },
    { employeeId: 'EMP-012', type: 'Earned Leave', startDate: new Date(2026,4,20), endDate: new Date(2026,4,22), days: 3, reason: 'Family vacation', status: 'pending' },
    { employeeId: 'EMP-014', type: 'Casual Leave', startDate: new Date(2026,4,25), endDate: new Date(2026,4,25), days: 1, reason: 'Personal work', status: 'pending' },
    { employeeId: 'EMP-021', type: 'Sick Leave', startDate: new Date(2026,5,2), endDate: new Date(2026,5,3), days: 2, reason: 'Fever', status: 'approved' },
    { employeeId: 'EMP-423', type: 'Casual Leave', startDate: new Date(2026,5,4), endDate: new Date(2026,5,4), days: 1, reason: 'Personal work', status: 'pending' },
  ]});
  const notifs = [
    { title: 'Welcome to Laxree HRMS', message: 'Your futuristic HR management system is ready!', type: 'system' },
    { title: 'Attendance Synced', message: 'May 2026 full month attendance synced', type: 'attendance' },
    { title: 'Leave Request', message: 'New leave request pending approval', type: 'leave' },
    { title: 'Holiday Alert', message: 'Labour Day holiday on May 1', type: 'holiday' },
    { title: 'Payroll Ready', message: 'Monthly payroll is ready for generation', type: 'payroll' },
    { title: 'June Attendance', message: 'June 2026 attendance is being tracked', type: 'attendance' },
  ];
  for (const n of notifs) await prisma.notification.create({ data: n });
  await prisma.setting.createMany({ data: [
    { key: 'companyName', value: 'Laxree' }, { key: 'companyFullName', value: 'Laxree Group of Companies' },
    { key: 'companyAddress', value: 'Ajmer, Rajasthan, India' }, { key: 'currency', value: 'INR' },
    { key: 'pfRate', value: '12' }, { key: 'esiRate', value: '0.75' }, { key: 'gracePeriod', value: '15' },
    { key: 'otMultiplier', value: '1' }, { key: 'holidayOTMultiplier', value: '1' },
    { key: 'salaryFormula', value: 'hourly' }, { key: 'sundayRule', value: 'earned_per_6_days' },
  ]});
  console.log('\\n=== SEED COMPLETE ===');
  console.log('May att:', totalAtt, '| June att:', jAtt, '| Admin: admin / laxree@2026');
  await prisma.$disconnect();
}
reseed().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
