import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST() {
  try {
    await db.notification.deleteMany();
    await db.salaryHistory.deleteMany();
    await db.payroll.deleteMany();
    await db.overtime.deleteMany();
    await db.leave.deleteMany();
    await db.attendance.deleteMany();
    await db.holiday.deleteMany();
    await db.employee.deleteMany();
    await db.department.deleteMany();
    await db.setting.deleteMany();

    const departments = [
      { name: 'Engineering', code: 'ENG', description: 'Software Engineering Department', head: 'Rajesh Kumar' },
      { name: 'Marketing', code: 'MKT', description: 'Marketing & Branding Department', head: 'Priya Sharma' },
      { name: 'Finance', code: 'FIN', description: 'Finance & Accounting Department', head: 'Arun Mehta' },
      { name: 'Human Resources', code: 'HR', description: 'HR & Administration Department', head: 'Sunita Patel' },
      { name: 'Operations', code: 'OPS', description: 'Operations & Logistics Department', head: 'Vikram Singh' },
    ];
    for (const d of departments) {
      await db.department.create({ data: d });
    }

    const employees = [
      { fullName: 'Aarav Sharma', mobile: '9876543210', email: 'aarav@company.com', department: 'Engineering', designation: 'Senior Developer', basicSalary: 85000, overtimeRate: 500, shiftStart: '09:00', shiftEnd: '18:00' },
      { fullName: 'Priya Gupta', mobile: '9876543211', email: 'priya@company.com', department: 'Engineering', designation: 'Full Stack Developer', basicSalary: 75000, overtimeRate: 450, shiftStart: '09:00', shiftEnd: '18:00' },
      { fullName: 'Rohan Patel', mobile: '9876543212', email: 'rohan@company.com', department: 'Marketing', designation: 'Marketing Manager', basicSalary: 70000, overtimeRate: 400, shiftStart: '09:30', shiftEnd: '18:30' },
      { fullName: 'Ananya Singh', mobile: '9876543213', email: 'ananya@company.com', department: 'Finance', designation: 'Financial Analyst', basicSalary: 65000, overtimeRate: 380, shiftStart: '09:00', shiftEnd: '18:00' },
      { fullName: 'Karan Mehta', mobile: '9876543214', email: 'karan@company.com', department: 'Human Resources', designation: 'HR Manager', basicSalary: 72000, overtimeRate: 420, shiftStart: '09:00', shiftEnd: '18:00' },
      { fullName: 'Deepika Reddy', mobile: '9876543215', email: 'deepika@company.com', department: 'Operations', designation: 'Operations Lead', basicSalary: 68000, overtimeRate: 400, shiftStart: '08:00', shiftEnd: '17:00' },
      { fullName: 'Arjun Kumar', mobile: '9876543216', email: 'arjun@company.com', department: 'Engineering', designation: 'Backend Developer', basicSalary: 78000, overtimeRate: 480, shiftStart: '09:00', shiftEnd: '18:00' },
      { fullName: 'Meera Joshi', mobile: '9876543217', email: 'meera@company.com', department: 'Marketing', designation: 'Content Strategist', basicSalary: 55000, overtimeRate: 320, shiftStart: '09:30', shiftEnd: '18:30' },
      { fullName: 'Vivek Nair', mobile: '9876543218', email: 'vivek@company.com', department: 'Finance', designation: 'Accountant', basicSalary: 50000, overtimeRate: 300, shiftStart: '09:00', shiftEnd: '18:00' },
      { fullName: 'Sneha Iyer', mobile: '9876543219', email: 'sneha@company.com', department: 'Engineering', designation: 'QA Engineer', basicSalary: 60000, overtimeRate: 350, shiftStart: '09:00', shiftEnd: '18:00' },
      { fullName: 'Rahul Verma', mobile: '9876543220', email: 'rahul@company.com', department: 'Operations', designation: 'Logistics Coordinator', basicSalary: 45000, overtimeRate: 280, shiftStart: '08:00', shiftEnd: '17:00' },
      { fullName: 'Pooja Das', mobile: '9876543221', email: 'pooja@company.com', department: 'Human Resources', designation: 'Recruiter', basicSalary: 48000, overtimeRate: 300, shiftStart: '09:00', shiftEnd: '18:00' },
      { fullName: 'Aditya Rao', mobile: '9876543222', email: 'aditya@company.com', department: 'Engineering', designation: 'DevOps Engineer', basicSalary: 82000, overtimeRate: 500, shiftStart: '09:00', shiftEnd: '18:00' },
      { fullName: 'Nisha Pillai', mobile: '9876543223', email: 'nishap@company.com', department: 'Marketing', designation: 'Social Media Manager', basicSalary: 52000, overtimeRate: 320, shiftStart: '09:30', shiftEnd: '18:30' },
      { fullName: 'Sanjay Mishra', mobile: '9876543224', email: 'sanjay@company.com', department: 'Finance', designation: 'Tax Consultant', basicSalary: 62000, overtimeRate: 370, shiftStart: '09:00', shiftEnd: '18:00' },
      { fullName: 'Kavita Chauhan', mobile: '9876543225', email: 'kavita@company.com', department: 'Operations', designation: 'Project Manager', basicSalary: 78000, overtimeRate: 460, shiftStart: '08:00', shiftEnd: '17:00' },
      { fullName: 'Manish Tiwari', mobile: '9876543226', email: 'manish@company.com', department: 'Engineering', designation: 'Frontend Developer', basicSalary: 70000, overtimeRate: 420, shiftStart: '09:00', shiftEnd: '18:00' },
      { fullName: 'Ritu Saxena', mobile: '9876543227', email: 'ritu@company.com', department: 'Human Resources', designation: 'Training Manager', basicSalary: 58000, overtimeRate: 340, shiftStart: '09:00', shiftEnd: '18:00' },
      { fullName: 'Amit Thakur', mobile: '9876543228', email: 'amit@company.com', department: 'Engineering', designation: 'Data Engineer', basicSalary: 80000, overtimeRate: 490, shiftStart: '09:00', shiftEnd: '18:00' },
      { fullName: 'Divya Kapoor', mobile: '9876543229', email: 'divya@company.com', department: 'Marketing', designation: 'Brand Manager', basicSalary: 68000, overtimeRate: 400, shiftStart: '09:30', shiftEnd: '18:30' },
    ];

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      const employeeId = `EMP-${String(i + 1).padStart(3, '0')}`;
      const joiningDate = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
      await db.employee.create({
        data: {
          employeeId,
          fullName: emp.fullName,
          mobile: emp.mobile,
          email: emp.email,
          department: emp.department,
          designation: emp.designation,
          joiningDate,
          salaryType: 'monthly',
          basicSalary: emp.basicSalary,
          perDaySalary: emp.basicSalary / 30,
          overtimeRate: emp.overtimeRate,
          shiftStart: emp.shiftStart,
          shiftEnd: emp.shiftEnd,
          shiftHours: 9,
          status: 'active',
          pfNumber: i % 3 === 0 ? `PF${String(i + 1).padStart(6, '0')}` : null,
          esiNumber: i % 4 === 0 ? `ESI${String(i + 1).padStart(8, '0')}` : null,
          panNumber: `ABCDE${String(1000 + i)}`,
          aadhaarNumber: `${String(100000000000 + i)}`,
          bankName: 'State Bank of India',
          bankAccount: `${String(10000000000 + i)}`,
          bankIfsc: 'SBIN0001234',
        },
      });
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const holidays = [
      { name: 'Republic Day', date: new Date(currentYear, 0, 26), type: 'national' },
      { name: 'Holi', date: new Date(currentYear, 2, 14), type: 'festival' },
      { name: 'Good Friday', date: new Date(currentYear, 3, 18), type: 'festival' },
      { name: 'Independence Day', date: new Date(currentYear, 7, 15), type: 'national' },
      { name: 'Gandhi Jayanti', date: new Date(currentYear, 9, 2), type: 'national' },
      { name: 'Dussehra', date: new Date(currentYear, 9, 22), type: 'festival' },
      { name: 'Diwali', date: new Date(currentYear, 10, 1), type: 'festival' },
      { name: 'Christmas', date: new Date(currentYear, 11, 25), type: 'festival' },
    ];
    for (const h of holidays) {
      await db.holiday.create({ data: h });
    }

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    for (let d = 0; d < Math.min(now.getDate(), 25); d++) {
      const date = new Date(today);
      date.setDate(date.getDate() - d);
      if (date.getDay() === 0) continue;

      const holidayCheck = await db.holiday.findFirst({
        where: { date: { gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()), lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1) } },
      });

      for (let e = 1; e <= employees.length; e++) {
        const employeeId = `EMP-${String(e).padStart(3, '0')}`;
        const isPresent = Math.random() > 0.08;
        const isLate = Math.random() > 0.8;
        const hasOT = Math.random() > 0.75;

        if (holidayCheck) {
          const worked = Math.random() > 0.7;
          if (worked) {
            await db.attendance.create({
              data: {
                employeeId, date,
                checkIn: '09:00', checkOut: '18:30',
                totalHours: 9.5, status: 'holiday',
                lateEntry: false, halfDay: false,
                overtimeHours: 0.5, isHoliday: true, isWeeklyOff: false,
              },
            });
          }
          continue;
        }

        if (isPresent) {
          const checkIn = isLate ? `${9 + Math.floor(Math.random() * 2)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}` : '09:00';
          const checkOutHour = hasOT ? 18 + Math.floor(Math.random() * 3) : 18;
          const checkOut = `${checkOutHour}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`;
          const [ciH, ciM] = checkIn.split(':').map(Number);
          const [coH, coM] = checkOut.split(':').map(Number);
          const totalH = Math.max(0, ((coH * 60 + coM) - (ciH * 60 + ciM)) / 60);
          const otHours = Math.max(0, totalH - 9);

          await db.attendance.create({
            data: {
              employeeId, date,
              checkIn, checkOut,
              totalHours: Math.round(totalH * 10) / 10,
              status: isLate ? 'late' : 'present',
              lateEntry: isLate,
              halfDay: false,
              overtimeHours: Math.round(otHours * 10) / 10,
              isHoliday: false,
              isWeeklyOff: false,
            },
          });
        }
      }
    }

    await db.leave.createMany({
      data: [
        { employeeId: 'EMP-003', type: 'Casual Leave', startDate: new Date(now.getFullYear(), now.getMonth(), 10), endDate: new Date(now.getFullYear(), now.getMonth(), 11), days: 2, reason: 'Personal work', status: 'approved' },
        { employeeId: 'EMP-007', type: 'Sick Leave', startDate: new Date(now.getFullYear(), now.getMonth(), 15), endDate: new Date(now.getFullYear(), now.getMonth(), 16), days: 2, reason: 'Health issues', status: 'approved' },
        { employeeId: 'EMP-012', type: 'Earned Leave', startDate: new Date(now.getFullYear(), now.getMonth(), 20), endDate: new Date(now.getFullYear(), now.getMonth(), 22), days: 3, reason: 'Family vacation', status: 'pending' },
        { employeeId: 'EMP-015', type: 'Casual Leave', startDate: new Date(now.getFullYear(), now.getMonth(), 25), endDate: new Date(now.getFullYear(), now.getMonth(), 25), days: 1, reason: 'Personal work', status: 'pending' },
      ],
    });

    const notifications = [
      { title: 'Welcome to HRMS', message: 'Your futuristic HR management system is ready!', type: 'system' },
      { title: 'Payroll Generated', message: 'Monthly payroll has been auto-generated for all employees', type: 'payroll' },
      { title: 'Leave Request', message: 'New leave request from EMP-012 pending approval', type: 'leave' },
      { title: 'New Employee', message: 'Welcome Divya Kapoor to the Marketing team', type: 'employee' },
      { title: 'Holiday Alert', message: 'Republic Day holiday on Jan 26', type: 'holiday' },
    ];
    for (const n of notifications) {
      await db.notification.create({ data: n });
    }

    await db.setting.createMany({
      data: [
        { key: 'companyName', value: 'NeoCorp Technologies' },
        { key: 'companyAddress', value: 'Tech Park, Bangalore, India' },
        { key: 'currency', value: 'INR' },
        { key: 'pfRate', value: '12' },
        { key: 'esiRate', value: '0.75' },
        { key: 'gracePeriod', value: '15' },
        { key: 'otMultiplier', value: '1.5' },
        { key: 'holidayOTMultiplier', value: '2' },
      ],
    });

    return NextResponse.json({ message: 'Database seeded successfully', employees: employees.length, departments: departments.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
