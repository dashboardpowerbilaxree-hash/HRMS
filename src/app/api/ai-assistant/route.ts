import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';

function parseDateFromMessage(message: string): { targetDate: Date; nextDay: Date } {
  const today = new Date();
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const msgLower = message.toLowerCase();
  let targetDate = new Date(now);

  if (msgLower.includes('yesterday')) {
    targetDate.setDate(targetDate.getDate() - 1);
  } else if (msgLower.includes('day before yesterday')) {
    targetDate.setDate(targetDate.getDate() - 2);
  } else if (msgLower.includes('today')) {
    // default is today
  } else {
    // Try to parse specific date formats: "on 2024-01-15", "on Jan 15", "on 15 Jan", "on January 15"
    const datePatterns = [
      /on\s+(\d{4}-\d{2}-\d{2})/i,
      /on\s+(\d{2}\/\d{2}\/\d{4})/i,
      /(\d{4}-\d{2}-\d{2})/i,
      /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(\d{4})?/i,
      /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2}),?\s*(\d{4})?/i,
    ];

    for (const pattern of datePatterns) {
      const match = msgLower.match(pattern);
      if (match) {
        try {
          const parsed = new Date(match[1] || match[0]);
          if (!isNaN(parsed.getTime())) {
            targetDate = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
          }
        } catch {
          // Keep default (today)
        }
        break;
      }
    }
  }

  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1);

  return { targetDate, nextDay };
}

function parseMonthFromMessage(message: string): { monthStart: Date; monthEnd: Date; month: number; year: number } | null {
  const msgLower = message.toLowerCase();
  const today = new Date();

  // Check for specific month mentions
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const monthAbbr = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  for (let i = 0; i < monthNames.length; i++) {
    if (msgLower.includes(monthNames[i]) || msgLower.includes(monthAbbr[i])) {
      const yearMatch = msgLower.match(/\b(20\d{2})\b/);
      const year = yearMatch ? parseInt(yearMatch[1]) : today.getFullYear();
      const month = i; // 0-indexed
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 1);
      return { monthStart, monthEnd, month: month + 1, year };
    }
  }

  // "this month" or "current month"
  if (msgLower.includes('this month') || msgLower.includes('current month')) {
    const month = today.getMonth();
    const year = today.getFullYear();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 1);
    return { monthStart, monthEnd, month: month + 1, year };
  }

  // "last month" or "previous month"
  if (msgLower.includes('last month') || msgLower.includes('previous month')) {
    const month = today.getMonth() - 1;
    const year = month < 0 ? today.getFullYear() - 1 : today.getFullYear();
    const actualMonth = month < 0 ? 11 : month;
    const monthStart = new Date(year, actualMonth, 1);
    const monthEnd = new Date(year, actualMonth + 1, 1);
    return { monthStart, monthEnd, month: actualMonth + 1, year };
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { message, context } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const msgLower = message.toLowerCase();
    const today = new Date();
    const { targetDate, nextDay } = parseDateFromMessage(message);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    // ---- Fetch data in parallel ----
    const [
      todayAttendance,
      activeEmployeeCount,
      allActiveEmployees,
      inactiveEmployeeCount,
    ] = await Promise.all([
      db.attendance.findMany({
        where: { date: { gte: targetDate, lt: nextDay } },
        include: {
          employee: {
            select: { fullName: true, employeeId: true, department: true, firm: true, location: true, monthlySalary: true, shiftHours: true, salaryType: true, designation: true },
          },
        },
      }),
      db.employee.count({ where: { status: { notIn: ['inactive', 'No'] } } }),
      db.employee.findMany({
        where: { status: { notIn: ['inactive', 'No'] } },
        select: { fullName: true, employeeId: true, department: true, firm: true, location: true, monthlySalary: true, shiftHours: true, salaryType: true, designation: true },
      }),
      db.employee.count({ where: { status: { in: ['inactive', 'No'] } } }),
    ]);

    // Determine current month range
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    // Parse month from message if present
    const monthInfo = parseMonthFromMessage(message);
    const effectiveMonthStart = monthInfo?.monthStart || currentMonthStart;
    const effectiveMonthEnd = monthInfo?.monthEnd || currentMonthEnd;
    const effectiveMonth = monthInfo?.month || (today.getMonth() + 1);
    const effectiveYear = monthInfo?.year || today.getFullYear();

    // Fetch monthly attendance
    const monthAttendance = await db.attendance.findMany({
      where: { date: { gte: effectiveMonthStart, lt: effectiveMonthEnd } },
      include: {
        employee: {
          select: { fullName: true, employeeId: true, department: true, firm: true, location: true },
        },
      },
    });

    // Fetch payroll data for the effective month
    const payrolls = await db.payroll.findMany({
      where: { month: effectiveMonth, year: effectiveYear },
      include: {
        employee: {
          select: { fullName: true, employeeId: true, firm: true, location: true, department: true },
        },
      },
    });

    // ---- Analyze today's attendance ----
    const presentToday = todayAttendance.filter(a => ['present', 'late', 'half-day', 'half_day', 'early-out'].includes(a.status));
    const absentToday = todayAttendance.filter(a => a.status === 'absent');
    const lateToday = todayAttendance.filter(a => a.lateEntry);
    const earlyOutToday = todayAttendance.filter(a => a.earlyOut);
    const halfDayToday = todayAttendance.filter(a => a.halfDay);
    const totalOTToday = todayAttendance.reduce((sum, a) => sum + (a.overtimeHours || 0), 0);

    // Find employees with no attendance record for target date (likely absent)
    const presentEmployeeIds = new Set(todayAttendance.filter(a => a.status !== 'absent').map(a => a.employeeId));
    const absentEmployeeNames = allActiveEmployees
      .filter(e => !presentEmployeeIds.has(e.employeeId))
      .map(e => `${e.fullName} (${e.employeeId})`);

    // ---- Monthly summary ----
    const totalMonthWorkHours = monthAttendance.reduce((sum, a) => sum + (a.totalHours || 0), 0);
    const totalMonthOTHours = monthAttendance.reduce((sum, a) => sum + (a.overtimeHours || 0), 0);
    const uniqueEmployeesWithRecords = new Set(monthAttendance.map(a => a.employeeId)).size;
    const monthLateCount = monthAttendance.filter(a => a.lateEntry).length;
    const monthAbsentCount = monthAttendance.filter(a => a.status === 'absent').length;
    const monthPresentCount = monthAttendance.filter(a => ['present', 'late', 'half-day', 'half_day', 'early-out'].includes(a.status)).length;
    const monthHalfDayCount = monthAttendance.filter(a => a.halfDay).length;
    const monthEarlyOutCount = monthAttendance.filter(a => a.earlyOut).length;
    const monthSundayCount = monthAttendance.filter(a => a.isSunday).length;
    const monthPHCount = monthAttendance.filter(a => a.isPH).length;

    // ---- Payroll summary ----
    const totalGrossPayroll = payrolls.reduce((sum, p) => sum + p.grossSalary, 0);
    const totalNetPayroll = payrolls.reduce((sum, p) => sum + p.netSalary, 0);
    const totalDeductions = payrolls.reduce((sum, p) => sum + p.totalDeductions, 0);
    const totalOTAmount = payrolls.reduce((sum, p) => sum + p.otAmount, 0);
    const totalBonus = payrolls.reduce((sum, p) => sum + p.bonus, 0);
    const totalIncentive = payrolls.reduce((sum, p) => sum + p.incentive, 0);

    // ---- Employee-specific data ----
    let employeeSpecificContext = '';
    const mentionedEmp = allActiveEmployees.find(e =>
      msgLower.includes(e.fullName.toLowerCase()) || msgLower.includes(e.employeeId.toLowerCase())
    );

    if (mentionedEmp) {
      const empAttendance = await db.attendance.findMany({
        where: {
          employeeId: mentionedEmp.employeeId,
          date: { gte: effectiveMonthStart, lt: effectiveMonthEnd },
        },
        orderBy: { date: 'asc' },
      });

      const empPayroll = await db.payroll.findFirst({
        where: {
          employeeId: mentionedEmp.employeeId,
          month: effectiveMonth,
          year: effectiveYear,
        },
      });

      const empPresentDays = empAttendance.filter(a => ['present', 'late', 'half-day', 'half_day', 'early-out'].includes(a.status)).length;
      const empAbsentDays = empAttendance.filter(a => a.status === 'absent').length;
      const empLateEntries = empAttendance.filter(a => a.lateEntry).length;
      const empEarlyOuts = empAttendance.filter(a => a.earlyOut).length;
      const empTotalWorkHours = empAttendance.reduce((s, a) => s + (a.totalHours || 0), 0);
      const empTotalOTHours = empAttendance.reduce((s, a) => s + (a.overtimeHours || 0), 0);

      employeeSpecificContext = `
### Employee: ${mentionedEmp.fullName} (${mentionedEmp.employeeId})
- Firm: ${mentionedEmp.firm} | Location: ${mentionedEmp.location}
- Department: ${mentionedEmp.department || 'N/A'} | Designation: ${mentionedEmp.designation || 'N/A'}
- Salary Type: ${mentionedEmp.salaryType} | Monthly Salary: ₹${mentionedEmp.monthlySalary?.toLocaleString('en-IN') || 'N/A'}
- Shift Hours: ${mentionedEmp.shiftHours} hrs

**${effectiveMonth}/${effectiveYear} Attendance Summary:**
- Total Records: ${empAttendance.length}
- Present Days: ${empPresentDays}
- Absent Days: ${empAbsentDays}
- Late Entries: ${empLateEntries}
- Early Outs: ${empEarlyOuts}
- Total Work Hours: ${empTotalWorkHours.toFixed(2)}
- Total OT Hours: ${empTotalOTHours.toFixed(2)}

**Daily Breakdown:**
${empAttendance.map(a => {
  const dateStr = a.date.toISOString().split('T')[0];
  return `- ${dateStr}: ${a.status} | ${a.totalHours.toFixed(2)}hrs | In: ${a.checkIn || '-'} Out: ${a.checkOut || '-'} | OT: ${a.overtimeHours.toFixed(2)}hrs${a.lateEntry ? ' ⚠️ Late' : ''}${a.earlyOut ? ' ⚠️ Early Out' : ''}${a.halfDay ? ' (Half Day)' : ''}`;
}).join('\n')}
${empPayroll ? `
**Payroll for ${effectiveMonth}/${effectiveYear}:**
- Monthly Salary: ₹${empPayroll.monthlySalary.toLocaleString('en-IN')}
- Hourly Rate: ₹${empPayroll.hourlyRate.toFixed(2)}
- Total Worked Hours: ${empPayroll.totalWorkedHrs.toFixed(2)}
- OT Hours: ${empPayroll.otHours.toFixed(2)} | OT Amount: ₹${empPayroll.otAmount.toLocaleString('en-IN')}
- Sunday Hours: ${empPayroll.sundayHrs.toFixed(2)} | PH Hours: ${empPayroll.phHours.toFixed(2)}
- Present Days: ${empPayroll.presentDays} | Absent Days: ${empPayroll.absentDays}
- Gross Salary: ₹${empPayroll.grossSalary.toLocaleString('en-IN')}
- Deductions: TDS ₹${empPayroll.tdsDeduction} | Loan ₹${empPayroll.loanDeduction} | Advance ₹${empPayroll.advanceDeduction} | Security ₹${empPayroll.securityDeposit} | Other ₹${empPayroll.otherDeductions} | Total ₹${empPayroll.totalDeductions.toLocaleString('en-IN')}
- Bonus: ₹${empPayroll.bonus.toLocaleString('en-IN')} | Incentive: ₹${empPayroll.incentive.toLocaleString('en-IN')}
- **Net Salary: ₹${empPayroll.netSalary.toLocaleString('en-IN')}**
` : `\nNo payroll record found for ${effectiveMonth}/${effectiveYear}.`}
`;
    }

    // ---- Firm-wise breakdown for the month ----
    const firmWiseAttendance: Record<string, { present: number; absent: number; late: number; otHours: number; workHours: number }> = {};
    for (const att of monthAttendance) {
      const firm = att.employee?.firm || 'Unknown';
      if (!firmWiseAttendance[firm]) {
        firmWiseAttendance[firm] = { present: 0, absent: 0, late: 0, otHours: 0, workHours: 0 };
      }
      if (['present', 'late', 'half-day', 'half_day', 'early-out'].includes(att.status)) {
        firmWiseAttendance[firm].present++;
      }
      if (att.status === 'absent') firmWiseAttendance[firm].absent++;
      if (att.lateEntry) firmWiseAttendance[firm].late++;
      firmWiseAttendance[firm].otHours += att.overtimeHours || 0;
      firmWiseAttendance[firm].workHours += att.totalHours || 0;
    }

    const firmWiseEmployeeCount: Record<string, number> = {};
    for (const emp of allActiveEmployees) {
      firmWiseEmployeeCount[emp.firm] = (firmWiseEmployeeCount[emp.firm] || 0) + 1;
    }

    // ---- Build data context ----
    const dataContext = `
## Real-Time HRMS Data (Queried at: ${today.toISOString()})

### Target Date: ${targetDateStr}

### Attendance Overview for ${targetDateStr}
- Total Active Employees: ${activeEmployeeCount}
- Attendance Records Found: ${todayAttendance.length}
- **Present**: ${presentToday.length} employees — ${presentToday.map(a => `${a.employee?.fullName || a.employeeId}`).join(', ')}
- **Absent** (no record or status=absent): ${absentEmployeeNames.length} employees — ${absentEmployeeNames.slice(0, 30).join(', ')}${absentEmployeeNames.length > 30 ? ` ... and ${absentEmployeeNames.length - 30} more` : ''}
- **Marked Absent**: ${absentToday.length} employees — ${absentToday.map(a => `${a.employee?.fullName || a.employeeId}`).join(', ')}
- **Late**: ${lateToday.length} employees — ${lateToday.map(a => `${a.employee?.fullName || a.employeeId}`).join(', ')}
- **Early Out**: ${earlyOutToday.length} employees — ${earlyOutToday.map(a => `${a.employee?.fullName || a.employeeId}`).join(', ')}
- **Half Day**: ${halfDayToday.length} employees
- **Total OT Hours**: ${totalOTToday.toFixed(2)} hours

### Monthly Summary (${effectiveMonth}/${effectiveYear})
- Total Attendance Records: ${monthAttendance.length}
- Unique Employees with Records: ${uniqueEmployeesWithRecords}
- Present Count: ${monthPresentCount}
- Absent Count: ${monthAbsentCount}
- Late Count: ${monthLateCount}
- Early Out Count: ${monthEarlyOutCount}
- Half Day Count: ${monthHalfDayCount}
- Sundays: ${monthSundayCount} | Public Holidays: ${monthPHCount}
- Total Work Hours: ${totalMonthWorkHours.toFixed(2)}
- Total OT Hours: ${totalMonthOTHours.toFixed(2)}

### Firm-Wise Breakdown (${effectiveMonth}/${effectiveYear})
${Object.entries(firmWiseAttendance).map(([firm, data]) =>
  `- **${firm}** (${firmWiseEmployeeCount[firm] || '?'} employees): Present ${data.present} | Absent ${data.absent} | Late ${data.late} | Work Hours ${data.workHours.toFixed(2)} | OT Hours ${data.otHours.toFixed(2)}`
).join('\n')}

### Payroll Summary (${effectiveMonth}/${effectiveYear})
- Payroll Records: ${payrolls.length}
- Total Gross Salary: ₹${totalGrossPayroll.toLocaleString('en-IN')}
- Total Net Salary: ₹${totalNetPayroll.toLocaleString('en-IN')}
- Total Deductions: ₹${totalDeductions.toLocaleString('en-IN')}
- Total OT Amount: ₹${totalOTAmount.toLocaleString('en-IN')}
- Total Bonus: ₹${totalBonus.toLocaleString('en-IN')}
- Total Incentive: ₹${totalIncentive.toLocaleString('en-IN')}

${payrolls.length > 0 ? `**Top 5 Highest Net Salary:**\n${payrolls.sort((a, b) => b.netSalary - a.netSalary).slice(0, 5).map(p => `- ${p.employee?.fullName} (${p.employeeId}): ₹${p.netSalary.toLocaleString('en-IN')}`).join('\n')}` : ''}

${payrolls.length > 0 ? `**Top 5 Lowest Net Salary:**\n${payrolls.sort((a, b) => a.netSalary - b.netSalary).slice(0, 5).map(p => `- ${p.employee?.fullName} (${p.employeeId}): ₹${p.netSalary.toLocaleString('en-IN')}`).join('\n')}` : ''}

### All Active Employees (${allActiveEmployees.length})
${allActiveEmployees.map(e => `- ${e.fullName} (${e.employeeId}) | ${e.firm} | ${e.location} | ${e.designation || 'N/A'} | ₹${e.monthlySalary?.toLocaleString('en-IN') || '0'} | Shift: ${e.shiftHours}hrs`).join('\n')}

${employeeSpecificContext}
`;

    // ---- Call AI ----
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are an advanced AI HR Assistant for Laxree Group's HR & Salary Management Dashboard (Laxree HRMS). You have access to REAL-TIME data from the HRMS database.

## Company Information
- **Laxree Group** has 4 firms:
  - LAPL: LAXREE AMENITIES PVT LTD (Gurgaon/Palra Warehouse)
  - LRSL: LAXREE ROOFING SOLUTION (Ajmer/Roofing Factory)
  - SI: SMARTH INTERNATIONAL (Jaipur)
  - SDF: SANGRAH DECOR & FURNITURE (Ajmer)
- **Locations**: Ajmer, Gurgaon, Palra Warehouse, Jaipur, Roofing Factory
- **Employee ID Format**: EMP-XXX
- **Currency**: INR (Indian Rupees) — use ₹ symbol

## Payroll Rules (Laxree-Specific)
- **Salary Types**: Hourly workers and Daily wage workers
- **Salary Per Hour** = Monthly Salary / (Shift Hours × Days in Month)
- **For Hourly Workers**: Gross = (Salary/Hour × Total Work Hours) + OT Amount + Sunday Amount + PH Amount + Bonus + Incentive
- **For Daily Workers**: Gross = (Daily Rate × Present Days) + Sunday Amount + PH Amount + Bonus + Incentive
- **Sunday Amount** = Salary/Hour × Sunday Hours
- **PH (Public Holiday) Amount** = Salary/Hour × PH Hours
- **OT Rate** = Same as Salary/Hour (base rate, 1x — NOT 1.5x)
- **Deductions**: TDS, Loan, Advance, Security Deposit, PF (12% if PF number exists), ESI (0.75% if ESI number exists), Other Deductions
- **Net Salary** = Gross Salary - Total Deductions

## Attendance Rules
- Sundays are automatically detected
- Public Holidays are configured in the system
- OT is calculated when total hours > shift hours
- Status: present, absent, late, half-day, weekly-off, holiday, early-out
- Employee active status: anything except "inactive" or "No" = active

## Your Capabilities
You have access to REAL attendance, payroll, and employee data. You can:
- Tell who was present/absent on any date
- Show attendance breakdown for any employee
- Calculate work hours, OT hours
- Provide monthly attendance summaries
- Answer payroll questions with real numbers
- Compare attendance across firms/locations
- Identify trends and anomalies

When answering questions about specific data, ALWAYS use the REAL DATA provided below. Give exact numbers, names, and details. Do not make up or estimate data. If data is not available, say so clearly.

Be concise, professional, and data-driven. Use Indian workplace context. Format responses with markdown for readability:
- Use **bold** for emphasis
- Use bullet points (•) for lists
- Use numbered lists for steps
- Use tables when comparing data
- When showing numbers, use Indian number formatting (lakhs/crores) with ₹ symbol

${dataContext}`,
        },
        { role: 'user', content: message },
      ],
    });

    const reply = completion.choices[0]?.message?.content || 'I apologize, I could not process your request. Please try again.';
    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error('AI Assistant error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
