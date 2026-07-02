import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Check for force parameter to allow re-seeding
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    // Skip seeding if admin already exists (unless force=true)
    if (!force) {
      const existingAdmin = await db.admin.findFirst();
      if (existingAdmin) {
        return NextResponse.json({ message: 'Database already seeded, skipping. Use ?force=true to re-seed.', skipped: true });
      }
    }

    // Clear all data (order matters due to foreign keys)
    await db.notification.deleteMany();
    await db.salaryHistory.deleteMany();
    await db.payroll.deleteMany();
    await db.overtime.deleteMany();
    await db.leave.deleteMany();
    await db.attendance.deleteMany();
    await db.holiday.deleteMany();
    await db.employee.deleteMany();
    await db.firm.deleteMany();
    await db.location.deleteMany();
    await db.admin.deleteMany();
    await db.setting.deleteMany();
    await db.auditLog.deleteMany();
    await db.department.deleteMany();
    await db.advance.deleteMany();

    // Create Admin User
    await db.admin.create({
      data: { username: 'admin', password: 'laxree@2026', name: 'Laxree Admin', role: 'super_admin' },
    });

    // Create Firms (from Excel data) — with company details for payslip
    const firms = [
      { code: 'LAPL', name: 'LAXREE AMENITIES PVT LTD', address: 'Plot No. 1 & 2, Harbilas Sharda Marg, Civil Lines, Ajmer, Rajasthan 305001', contactPhone: '+919251683663', contactEmail: 'hr@laxree.com', logo: '/laxree-logo.png' },
      { code: 'LRSL', name: 'LAXREE ROOFING SOLUTION', address: 'Plot No. 1 & 2, Harbilas Sharda Marg, Civil Lines, Ajmer, Rajasthan 305001', contactPhone: '+919251683663', contactEmail: 'hr@laxree.com', logo: '/laxree-logo.png' },
      { code: 'SI', name: 'SMARTH INTERNATIONAL', address: 'Plot No. 1 & 2, Harbilas Sharda Marg, Civil Lines, Ajmer, Rajasthan 305001', contactPhone: '+919251683663', contactEmail: 'hr@laxree.com', logo: '/laxree-logo.png' },
      { code: 'SDF', name: 'SANGRAH DECOR & FURNITURE', address: 'Plot No. 1 & 2, Harbilas Sharda Marg, Civil Lines, Ajmer, Rajasthan 305001', contactPhone: '+919251683663', contactEmail: 'hr@laxree.com', logo: '/laxree-logo.png' },
    ];
    for (const f of firms) await db.firm.create({ data: f });

    // Create Locations
    const locations = ['Ajmer', 'Jaipur', 'Gurgaon', 'Palra Warehouse', 'Roofing Factory'];
    for (const l of locations) await db.location.create({ data: { name: l } });

    // Real Employee Data from Payroll Master.xlsx
    const employees = [
      // SI Firm
      { employeeId: 'EMP-014', fullName: 'Anamika', firm: 'SI', location: 'Ajmer', salaryType: 'hourly', monthlySalary: 14000, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9 },
      { employeeId: 'EMP-026', fullName: 'Mayank', firm: 'SI', location: 'Ajmer', salaryType: 'hourly', monthlySalary: 10000, employmentType: 'Part Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9 },
      { employeeId: 'EMP-033', fullName: 'Radhika Mehra', firm: 'SI', location: 'Ajmer', salaryType: 'hourly', monthlySalary: 12000, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9 },
      { employeeId: 'EMP-501', fullName: 'Arun', firm: 'SI', location: 'Jaipur', salaryType: 'hourly', monthlySalary: 50000, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9 },
      { employeeId: 'EMP-504', fullName: 'Priyanka', firm: 'SI', location: 'Jaipur', salaryType: 'hourly', monthlySalary: 18000, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9 },
      // LRSL Firm
      { employeeId: 'EMP-007', fullName: 'Khushboo', firm: 'LRSL', location: 'Ajmer', salaryType: 'hourly', monthlySalary: 18000, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9 },
      { employeeId: 'EMP-417', fullName: 'Aditya Sharma', firm: 'LRSL', location: 'Ajmer', salaryType: 'hourly', monthlySalary: 25000, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9 },
      { employeeId: 'EMP-420', fullName: 'Arti Sharma', firm: 'LRSL', location: 'Ajmer', salaryType: 'hourly', monthlySalary: 20000, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9 },
      { employeeId: 'EMP-421', fullName: 'Aayush Sharma', firm: 'LRSL', location: 'Ajmer', salaryType: 'hourly', monthlySalary: 16000, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9 },
      { employeeId: 'EMP-422', fullName: 'Aakash Sangat', firm: 'LRSL', location: 'Ajmer', salaryType: 'hourly', monthlySalary: 15000, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9, status: 'inactive' },
      { employeeId: 'EMP-423', fullName: 'Arjun', firm: 'LRSL', location: 'Ajmer', salaryType: 'hourly', monthlySalary: 23000, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9 },
      { employeeId: 'EMP-424', fullName: 'Sujeet', firm: 'LRSL', location: 'Ajmer', salaryType: 'hourly', monthlySalary: 24000, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9 },
      // LRSL Ajmer — restored (were deleted by previous re-seed, restored 2026-06-18)
      { employeeId: 'EMP-426', fullName: 'Narayan', firm: 'LRSL', location: 'Ajmer', salaryType: 'hourly', monthlySalary: 15000, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9 },
      { employeeId: 'EMP-427', fullName: 'Jitendra', firm: 'LRSL', location: 'Ajmer', salaryType: 'hourly', monthlySalary: 15000, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9 },
      { employeeId: 'EMP-428', fullName: 'Mukul', firm: 'LRSL', location: 'Ajmer', salaryType: 'hourly', monthlySalary: 15000, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9 },
      { employeeId: 'EMP-429', fullName: 'Girish', firm: 'LRSL', location: 'Ajmer', salaryType: 'hourly', monthlySalary: 15000, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9 },
      { employeeId: 'EMP-034', fullName: 'Prakash', firm: 'LRSL', location: 'Ajmer', salaryType: 'hourly', monthlySalary: 60000, employmentType: 'Part Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9 },
      { employeeId: 'EMP-415', fullName: 'Ronak Jain', firm: 'LRSL', location: 'Ajmer', salaryType: 'hourly', monthlySalary: 51000, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9, status: 'inactive' },
      // LRSL Roofing Factory
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
      // LAPL Firm
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
      // SDF Firm
      { employeeId: 'EMP-011', fullName: 'Reena', firm: 'SDF', location: 'Ajmer', salaryType: 'hourly', monthlySalary: 5700, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9 },
      { employeeId: 'EMP-012', fullName: 'Raju', firm: 'SDF', location: 'Ajmer', salaryType: 'hourly', monthlySalary: 11150, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '20:00', shiftHours: 10 },
      { employeeId: 'EMP-037', fullName: 'Reetu Sindal', firm: 'SDF', location: 'Ajmer', salaryType: 'hourly', monthlySalary: 10000, employmentType: 'Full Time', shiftStart: '10:00', shiftEnd: '19:00', shiftHours: 9 },
    ];

    for (let idx = 0; idx < employees.length; idx++) {
      const emp = employees[idx];
      const hourlyRate = emp.salaryType === 'hourly'
        ? Math.round((emp.monthlySalary / (31 * emp.shiftHours)) * 100) / 100
        : Math.round(((emp.dailyRate || emp.monthlySalary / 30) / emp.shiftHours) * 100) / 100;
      const overtimeRate = hourlyRate;

      await db.employee.create({
        data: {
          employeeId: emp.employeeId,
          fullName: emp.fullName.trim(),
          firm: emp.firm,
          location: emp.location,
          salaryType: emp.salaryType,
          monthlySalary: emp.monthlySalary,
          dailyRate: emp.dailyRate || Math.round(emp.monthlySalary / 30),
          hourlyRate,
          overtimeRate,
          employmentType: emp.employmentType || 'Full Time',
          shiftStart: emp.shiftStart,
          shiftEnd: emp.shiftEnd,
          shiftHours: emp.shiftHours,
          status: emp.status === 'inactive' ? 'No' : 'Yes',
          designation: emp.firm === 'LAPL' ? 'Staff' : emp.firm === 'LRSL' ? 'Worker' : emp.firm === 'SI' ? 'Associate' : 'Helper',
          department: emp.firm,
          joiningDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
          gender: idx % 3 === 0 ? 'Female' : 'Male',
          dateOfBirth: new Date(1985 + Math.floor(Math.random() * 17), Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 28)),
        },
      });
    }

    // Holidays for 2026
    const currentYear = 2026;
    const holidays = [
      { name: 'Republic Day', date: new Date(currentYear, 0, 26), type: 'national' },
      { name: 'Holi', date: new Date(currentYear, 2, 14), type: 'festival' },
      { name: 'Good Friday', date: new Date(currentYear, 3, 18), type: 'festival' },
      { name: 'Eid ul-Fitr', date: new Date(currentYear, 3, 22), type: 'festival' },
      { name: 'Labour Day', date: new Date(currentYear, 4, 1), type: 'national' },
      { name: 'Independence Day', date: new Date(currentYear, 7, 15), type: 'national' },
      { name: 'Gandhi Jayanti', date: new Date(currentYear, 9, 2), type: 'national' },
      { name: 'Dussehra', date: new Date(currentYear, 9, 22), type: 'festival' },
      { name: 'Diwali', date: new Date(currentYear, 10, 1), type: 'festival' },
      { name: 'Guru Nanak Jayanti', date: new Date(currentYear, 10, 15), type: 'festival' },
      { name: 'Christmas', date: new Date(currentYear, 11, 25), type: 'festival' },
    ];
    for (const h of holidays) await db.holiday.create({ data: h });

    // ═══════════════════════════════════════════════════════════
    // Generate FULL May 2026 attendance (all working days)
    // ═══════════════════════════════════════════════════════════
    const activeEmployees = employees.filter(e => e.status !== 'inactive');
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // Helper: generate attendance for a given month
    async function generateMonthAttendance(year: number, month: number, upToDay?: number) {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const maxDay = upToDay || daysInMonth;
      let attCount = 0;
      let otCount = 0;

      for (let d = 1; d <= Math.min(maxDay, daysInMonth); d++) {
        const date = new Date(year, month, d);
        // Don't generate future dates
        if (date > todayDate) break;
        // Skip Sundays
        if (date.getDay() === 0) continue;

        // Check if holiday
        const holidayCheck = await db.holiday.findFirst({
          where: { date: { gte: new Date(year, month, d), lt: new Date(year, month, d + 1) } },
        });

        for (const emp of activeEmployees) {
          // Use deterministic seed based on employeeId + date for consistent data
          const seed = (emp.employeeId.charCodeAt(4) * 31 + d * 7 + month * 13) % 100;
          const isPresent = seed > 8; // ~92% attendance rate
          const isLate = (seed % 10) > 7; // ~20% late rate
          const hasOT = (seed % 10) > 6; // ~30% OT rate

          if (holidayCheck) {
            // Holiday - some employees may work
            const worksOnHoliday = seed > 65;
            if (worksOnHoliday) {
              const [sh, sm] = emp.shiftStart.split(':').map(Number);
              const [eh, em] = emp.shiftEnd.split(':').map(Number);
              const hTotal = ((eh * 60 + em) - (sh * 60 + sm)) / 60;
              await db.attendance.create({
                data: {
                  employeeId: emp.employeeId, date,
                  checkIn: emp.shiftStart, checkOut: emp.shiftEnd,
                  totalHours: hTotal, status: 'holiday',
                  lateEntry: false, halfDay: false,
                  overtimeHours: 0, isHoliday: true, isWeeklyOff: false, isPH: true,
                },
              });
              attCount++;
            }
            continue;
          }

          if (isPresent) {
            const [sh, sm] = emp.shiftStart.split(':').map(Number);
            const [eh, em] = emp.shiftEnd.split(':').map(Number);

            // Late entry
            const lateMins = isLate ? (seed % 45) + 10 : 0;
            const checkInH = sh + Math.floor((sm + lateMins) / 60);
            const checkInM = (sm + lateMins) % 60;
            const checkIn = `${String(checkInH).padStart(2, '0')}:${String(checkInM).padStart(2, '0')}`;

            // Overtime - work past shift end
            const otMins = hasOT ? (seed % 120) + 30 : 0; // 30-150 mins OT
            const otHours = Math.round((otMins / 60) * 100) / 100;
            const checkOutMins = (eh * 60 + em) + otMins;
            const checkOutH = Math.floor(checkOutMins / 60);
            const checkOutM = checkOutMins % 60;
            const checkOut = `${String(checkOutH).padStart(2, '0')}:${String(checkOutM).padStart(2, '0')}`;

            const totalH = Math.round(((checkOutH * 60 + checkOutM) - (checkInH * 60 + checkInM)) / 60 * 100) / 100;
            const actualOT = Math.max(0, Math.round((totalH - emp.shiftHours) * 100) / 100);

            // Early out detection
            const earlyOut = checkOutMins < (eh * 60 + em);

            let status = 'present';
            if (isLate && earlyOut) status = 'late';
            else if (isLate) status = 'late';
            else if (earlyOut) status = 'early-out';

            await db.attendance.create({
              data: {
                employeeId: emp.employeeId, date,
                checkIn, checkOut,
                totalHours: Math.max(0, totalH),
                status,
                lateEntry: isLate, halfDay: false,
                earlyOut,
                overtimeHours: actualOT, isHoliday: false, isWeeklyOff: false,
              },
            });
            attCount++;

            // Create OT record (1x normal rate)
            if (actualOT > 0) {
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const normalHourlyRate = Math.round((emp.monthlySalary / (daysInMonth * emp.shiftHours)) * 100) / 100;
              await db.overtime.create({
                data: {
                  employeeId: emp.employeeId, date,
                  hours: actualOT, rate: normalHourlyRate,
                  amount: Math.round(actualOT * normalHourlyRate * 100) / 100,
                  isHoliday: false, status: 'approved',
                },
              });
              otCount++;
            }
          }
        }
      }
      return { attCount, otCount };
    }

    // Generate May 2026 — FULL MONTH (all 31 days)
    const mayResult = await generateMonthAttendance(2026, 4); // May = month index 4

    // Generate June 2026 — up to today
    const juneResult = await generateMonthAttendance(2026, 5, today.getDate()); // June = month index 5

    // Sample leaves for May
    await db.leave.createMany({
      data: [
        { employeeId: 'EMP-007', type: 'Casual Leave', startDate: new Date(2026, 4, 10), endDate: new Date(2026, 4, 11), days: 2, reason: 'Personal work', status: 'approved' },
        { employeeId: 'EMP-041', type: 'Sick Leave', startDate: new Date(2026, 4, 15), endDate: new Date(2026, 4, 16), days: 2, reason: 'Health issues', status: 'approved' },
        { employeeId: 'EMP-012', type: 'Earned Leave', startDate: new Date(2026, 4, 20), endDate: new Date(2026, 4, 22), days: 3, reason: 'Family vacation', status: 'pending' },
        { employeeId: 'EMP-014', type: 'Casual Leave', startDate: new Date(2026, 4, 25), endDate: new Date(2026, 4, 25), days: 1, reason: 'Personal work', status: 'pending' },
        { employeeId: 'EMP-021', type: 'Sick Leave', startDate: new Date(2026, 5, 2), endDate: new Date(2026, 5, 3), days: 2, reason: 'Fever', status: 'approved' },
        { employeeId: 'EMP-423', type: 'Casual Leave', startDate: new Date(2026, 5, 4), endDate: new Date(2026, 5, 4), days: 1, reason: 'Personal work', status: 'pending' },
      ],
    });

    // Notifications
    const notifications = [
      { title: 'Welcome to Laxree HRMS', message: 'Your futuristic HR management system is ready!', type: 'system' },
      { title: 'Attendance Synced', message: 'May 2026 full month attendance data has been synced', type: 'attendance' },
      { title: 'Leave Request', message: 'New leave request from Raju pending approval', type: 'leave' },
      { title: 'Holiday Alert', message: 'Labour Day holiday on May 1', type: 'holiday' },
      { title: 'Payroll Ready', message: 'Monthly payroll is ready for generation', type: 'payroll' },
      { title: 'June Attendance', message: 'June 2026 attendance data is being tracked', type: 'attendance' },
    ];
    for (const n of notifications) await db.notification.create({ data: n });

    // Settings
    await db.setting.createMany({
      data: [
        { key: 'companyName', value: 'Laxree' },
        { key: 'companyFullName', value: 'Laxree Group of Companies' },
        { key: 'companyAddress', value: 'Ajmer, Rajasthan, India' },
        { key: 'currency', value: 'INR' },
        { key: 'pfRate', value: '12' },
        { key: 'esiRate', value: '0.75' },
        { key: 'gracePeriod', value: '15' },
        { key: 'otMultiplier', value: '1' },
        { key: 'holidayOTMultiplier', value: '1' },
        { key: 'salaryFormula', value: 'hourly' },
        { key: 'sundayRule', value: 'earned_per_6_days' },
      ],
    });

    return NextResponse.json({
      message: 'Laxree HRMS seeded successfully',
      employees: employees.length,
      firms: firms.length,
      locations: locations.length,
      holidays: holidays.length,
      mayAttendance: mayResult.attCount,
      mayOvertime: mayResult.otCount,
      juneAttendance: juneResult.attCount,
      juneOvertime: juneResult.otCount,
      admin: { username: 'admin', password: 'laxree@2026' },
    });
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}
