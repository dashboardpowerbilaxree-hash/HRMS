import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';

// ─── Fallback Response Generator (rule-based, uses fetched data) ───
function generateFallbackResponse(message: string, dataContext: string): string {
  const msgLower = message.toLowerCase();

  // Helper: extract a section from dataContext by heading
  const getSection = (heading: string): string => {
    const regex = new RegExp(`### ${heading}[\\s\\S]*?(?=###|$)`, 'i');
    const match = dataContext.match(regex);
    return match ? match[0] : '';
  };

  // ─── Who is absent / absent today ───
  if (msgLower.includes('absent') && (msgLower.includes('who') || msgLower.includes('list') || msgLower.includes('today') || msgLower.includes('name'))) {
    const section = getSection('Attendance Overview');
    const absentMatch = section.match(/\*\*Absent\*[^:]*:\s*\d+\s*employees\s*—\s*(.*)/);
    const markedMatch = section.match(/\*\*Marked Absent\*[^:]*:\s*\d+\s*employees\s*—\s*(.*)/);
    const countMatch = section.match(/\*\*Absent\*[^:]*:\s*(\d+)\s*employees/);
    const count = countMatch ? countMatch[1] : '0';

    let reply = `📋 **Absent Employees** (${count} absent)\n\n`;
    if (absentMatch && absentMatch[1].trim()) {
      const names = absentMatch[1].split(', ').filter(n => n.trim());
      reply += names.map(n => `• ${n}`).join('\n');
    }
    if (markedMatch && markedMatch[1].trim()) {
      reply += `\n\n**Marked Absent:** ${markedMatch[1]}`;
    }
    if (count === '0') {
      reply += 'No employees are absent today! 🎉';
    }
    return reply;
  }

  // ─── Who is present / present today ───
  if (msgLower.includes('present') && (msgLower.includes('who') || msgLower.includes('list') || msgLower.includes('today') || msgLower.includes('name'))) {
    const section = getSection('Attendance Overview');
    const presentMatch = section.match(/\*\*Present\*[^:]*:\s*(\d+)\s*employees\s*—\s*(.*)/);
    const count = presentMatch ? presentMatch[1] : '0';

    let reply = `✅ **Present Employees** (${count} present)\n\n`;
    if (presentMatch && presentMatch[2].trim()) {
      const names = presentMatch[2].split(', ').filter(n => n.trim());
      if (names.length <= 15) {
        reply += names.map(n => `• ${n}`).join('\n');
      } else {
        reply += names.slice(0, 15).map(n => `• ${n}`).join('\n');
        reply += `\n\n... and ${names.length - 15} more employees`;
      }
    }
    return reply;
  }

  // ─── Who was late / late today ───
  if (msgLower.includes('late') && (msgLower.includes('who') || msgLower.includes('list') || msgLower.includes('today') || msgLower.includes('name') || msgLower.includes('how many'))) {
    const section = getSection('Attendance Overview');
    const lateMatch = section.match(/\*\*Late\*[^:]*:\s*(\d+)\s*employees\s*—\s*(.*)/);
    const count = lateMatch ? lateMatch[1] : '0';

    let reply = `⏰ **Late Entries** (${count} late)\n\n`;
    if (lateMatch && lateMatch[2].trim()) {
      const names = lateMatch[2].split(', ').filter(n => n.trim());
      reply += names.map(n => `• ${n}`).join('\n');
    }
    if (count === '0') {
      reply += 'No late entries today! 👍';
    }
    return reply;
  }

  // ─── Early out ───
  if (msgLower.includes('early out') || msgLower.includes('early-out') || msgLower.includes('left early')) {
    const section = getSection('Attendance Overview');
    const earlyMatch = section.match(/\*\*Early Out\*[^:]*:\s*(\d+)\s*employees\s*—\s*(.*)/);
    const count = earlyMatch ? earlyMatch[1] : '0';

    let reply = `🚪 **Early Outs** (${count} early outs)\n\n`;
    if (earlyMatch && earlyMatch[2].trim()) {
      const names = earlyMatch[2].split(', ').filter(n => n.trim());
      reply += names.map(n => `• ${n}`).join('\n');
    }
    if (count === '0') {
      reply += 'No early outs today! 👍';
    }
    return reply;
  }

  // ─── Half day ───
  if (msgLower.includes('half day') || msgLower.includes('half-day')) {
    const section = getSection('Attendance Overview');
    const halfMatch = section.match(/\*\*Half Day\*[^:]*:\s*(\d+)/);
    const count = halfMatch ? halfMatch[1] : '0';
    return `📋 **Half Days**: ${count} employees on half day today.`;
  }

  // ─── OT / overtime ───
  if (msgLower.includes('ot') || msgLower.includes('overtime')) {
    const section = getSection('Attendance Overview');
    const otMatch = section.match(/\*\*Total OT Hours\*[^:]*:\s*([\d.]+)\s*hours/);
    const otHours = otMatch ? otMatch[1] : '0.00';

    // Also check monthly OT
    const monthSection = getSection('Monthly Summary');
    const monthOtMatch = monthSection.match(/Total OT Hours:\s*([\d.]+)/);
    const monthOtHours = monthOtMatch ? monthOtMatch[1] : '0.00';

    let reply = `⏱️ **Overtime Summary**\n\n`;
    reply += `• **Today's Total OT**: ${otHours} hours\n`;
    reply += `• **Monthly Total OT**: ${monthOtHours} hours\n`;
    return reply;
  }

  // ─── Attendance summary / this month ───
  if (msgLower.includes('attendance summary') || msgLower.includes('this month') || msgLower.includes('monthly summary') || msgLower.includes('current month')) {
    const section = getSection('Monthly Summary');
    const overview = getSection('Attendance Overview');

    let reply = `📊 **Monthly Attendance Summary**\n\n`;
    // Extract key stats from monthly section
    const stats = [
      ['Total Attendance Records', /Total Attendance Records:\s*(\d+)/],
      ['Unique Employees', /Unique Employees with Records:\s*(\d+)/],
      ['Present Count', /Present Count:\s*(\d+)/],
      ['Absent Count', /Absent Count:\s*(\d+)/],
      ['Late Count', /Late Count:\s*(\d+)/],
      ['Early Out Count', /Early Out Count:\s*(\d+)/],
      ['Half Day Count', /Half Day Count:\s*(\d+)/],
      ['Total Work Hours', /Total Work Hours:\s*([\d.]+)/],
      ['Total OT Hours', /Total OT Hours:\s*([\d.]+)/],
    ];

    for (const [label, regex] of stats) {
      const match = section.match(regex);
      reply += `• **${label}**: ${match ? match[1] : 'N/A'}\n`;
    }

    // Also add today's overview
    const presentMatch = overview.match(/\*\*Present\*[^:]*:\s*(\d+)/);
    const absentMatch = overview.match(/\*\*Absent\*[^:]*:\s*(\d+)/);
    const lateMatch = overview.match(/\*\*Late\*[^:]*:\s*(\d+)/);
    reply += `\n**Today's Snapshot:**\n`;
    reply += `• Present: ${presentMatch ? presentMatch[1] : '0'} | Absent: ${absentMatch ? absentMatch[1] : '0'} | Late: ${lateMatch ? lateMatch[1] : '0'}`;

    return reply;
  }

  // ─── Payroll / salary related ───
  if (msgLower.includes('payroll') || msgLower.includes('salary') || msgLower.includes('deduction') || msgLower.includes('net pay') || msgLower.includes('gross')) {
    const section = getSection('Payroll Summary');
    let reply = `💰 **Payroll Summary**\n\n`;

    const payrollStats = [
      ['Total Gross Salary', /Total Gross Salary:\s*₹?([\d,]+)/],
      ['Total Net Salary', /Total Net Salary:\s*₹?([\d,]+)/],
      ['Total Deductions', /Total Deductions:\s*₹?([\d,]+)/],
      ['Total OT Amount', /Total OT Amount:\s*₹?([\d,]+)/],
      ['Total Bonus', /Total Bonus:\s*₹?([\d,]+)/],
      ['Total Incentive', /Total Incentive:\s*₹?([\d,]+)/],
    ];

    for (const [label, regex] of payrollStats) {
      const match = section.match(regex);
      reply += `• **${label}**: ₹${match ? match[1] : 'N/A'}\n`;
    }

    return reply;
  }

  // ─── Firm-wise / company breakdown ───
  if (msgLower.includes('firm') || msgLower.includes('company') || msgLower.includes('lapl') || msgLower.includes('lrsl') || msgLower.includes('si ') || msgLower.includes('sdf') || msgLower.includes('laxree amenities') || msgLower.includes('laxree roofing') || msgLower.includes('smarth') || msgLower.includes('sangrah')) {
    const section = getSection('Firm-Wise Breakdown');
    if (section) {
      let reply = `🏢 **Firm-Wise Breakdown**\n\n`;
      const lines = section.split('\n').filter(l => l.trim().startsWith('-'));
      for (const line of lines) {
        reply += `${line}\n`;
      }
      return reply;
    }
  }

  // ─── Employee-specific question ───
  // Try to match employee name or ID from the message against the employee list section
  const allEmpSection = getSection('All Active Employees');
  if (allEmpSection) {
    const empLines = allEmpSection.split('\n').filter(l => l.trim().startsWith('-'));
    for (const line of empLines) {
      const nameMatch = line.match(/-\s*(.+?)\s*\(([^)]+)\)/);
      if (nameMatch) {
        const empName = nameMatch[1];
        const empId = nameMatch[2];
        if (msgLower.includes(empName.toLowerCase()) || msgLower.includes(empId.toLowerCase())) {
          // Found a matching employee - check if there's detailed context
          const empDetailSection = dataContext.match(/### Employee:.*?(?=###|$)/s);
          if (empDetailSection) {
            return `👤 **Employee Details**\n\n${empDetailSection[0].replace(/### /g, '**').replace(/:\n/g, ':**\n')}`;
          }
          // Fallback to the line from all employees list
          return `👤 **Employee Found**:\n\n${line.replace(/^-\s*/, '')}`;
        }
      }
    }
  }

  // ─── How many employees / headcount ───
  if (msgLower.includes('how many') || msgLower.includes('headcount') || msgLower.includes('total employee') || msgLower.includes('employee count')) {
    const overview = getSection('Attendance Overview');
    const activeMatch = overview.match(/Total Active Employees:\s*(\d+)/);
    const active = activeMatch ? activeMatch[1] : 'N/A';

    const empSection = getSection('All Active Employees');
    const empLines = empSection.split('\n').filter(l => l.trim().startsWith('-'));

    let reply = `👥 **Employee Count**: ${active} active employees\n\n`;

    // Group by firm
    const firmCounts: Record<string, number> = {};
    for (const line of empLines) {
      const parts = line.split('|');
      if (parts.length >= 2) {
        const firm = parts[1]?.trim() || 'Unknown';
        firmCounts[firm] = (firmCounts[firm] || 0) + 1;
      }
    }
    if (Object.keys(firmCounts).length > 0) {
      reply += '**By Firm:**\n';
      for (const [firm, count] of Object.entries(firmCounts)) {
        reply += `• ${firm}: ${count} employees\n`;
      }
    }
    return reply;
  }

  // ─── Overview / dashboard summary / general ───
  if (msgLower.includes('overview') || msgLower.includes('dashboard') || msgLower.includes('summary') || msgLower.includes('report') || msgLower.includes('status') || msgLower.includes('hello') || msgLower.includes('hi ') || msgLower === 'hi' || msgLower.includes('help')) {
    const overview = getSection('Attendance Overview');
    const monthSection = getSection('Monthly Summary');

    const activeMatch = overview.match(/Total Active Employees:\s*(\d+)/);
    const presentMatch = overview.match(/\*\*Present\*[^:]*:\s*(\d+)/);
    const absentMatch = overview.match(/\*\*Absent\*[^:]*:\s*(\d+)/);
    const lateMatch = overview.match(/\*\*Late\*[^:]*:\s*(\d+)/);

    const monthPresent = monthSection.match(/Present Count:\s*(\d+)/);
    const monthAbsent = monthSection.match(/Absent Count:\s*(\d+)/);
    const monthLate = monthSection.match(/Late Count:\s*(\d+)/);

    let reply = `📊 **Laxree HRMS Dashboard Overview**\n\n`;
    reply += `**Today's Attendance:**\n`;
    reply += `• Active Employees: ${activeMatch ? activeMatch[1] : 'N/A'}\n`;
    reply += `• Present: ${presentMatch ? presentMatch[1] : '0'} | Absent: ${absentMatch ? absentMatch[1] : '0'} | Late: ${lateMatch ? lateMatch[1] : '0'}\n\n`;
    reply += `**Monthly Summary:**\n`;
    reply += `• Present Count: ${monthPresent ? monthPresent[1] : '0'} | Absent: ${monthAbsent ? monthAbsent[1] : '0'} | Late: ${monthLate ? monthLate[1] : '0'}\n\n`;
    reply += `I can help you with:\n`;
    reply += `• "Who is absent today?"\n`;
    reply += `• "Who was late?"\n`;
    reply += `• "Attendance summary this month"\n`;
    reply += `• "Show payroll details"\n`;
    reply += `• "OT hours report"\n`;
    reply += `• Employee-specific queries\n`;
    reply += `• Firm-wise breakdowns\n`;
    return reply;
  }

  // ─── Default fallback: provide key data highlights ───
  const overview = getSection('Attendance Overview');
  const activeMatch = overview.match(/Total Active Employees:\s*(\d+)/);
  const presentMatch = overview.match(/\*\*Present\*[^:]*:\s*(\d+)/);
  const absentMatch = overview.match(/\*\*Absent\*[^:]*:\s*(\d+)/);

  return `I understand you're asking about: "${message}"\n\nHere's a quick snapshot of current data:\n\n• **Active Employees**: ${activeMatch ? activeMatch[1] : 'N/A'}\n• **Present**: ${presentMatch ? presentMatch[1] : '0'} | **Absent**: ${absentMatch ? absentMatch[1] : '0'}\n\nFor more specific information, try asking:\n- "Who is absent today?"\n- "Attendance summary this month"\n- "Who was late?"\n- "Show payroll details"\n- "OT hours report"`;
}

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
- Hourly Rate: ₹${Math.ceil(empPayroll.hourlyRate)}
- Total Worked Hours: ${empPayroll.totalWorkedHrs.toFixed(2)}
- OT Hours: ${empPayroll.otHours.toFixed(2)} | OT Amount: ₹${empPayroll.otAmount.toLocaleString('en-IN')}
- Sunday Hours: ${empPayroll.sundayHrs.toFixed(2)}
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

    // ---- Call AI with fallback ----
    let reply: string;
    try {
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
- **Per Day Rate** = Monthly Salary / Days in Month (28, 29, 30, or 31 as per calendar)
- **Base Salary** = Per Day Rate × Earned Days (Sundays NOT counted as earned)
- **Earned Days** = Present Days + Half Days × 0.5 + Paid Leaves (Sundays are weekly off)
- **For All Workers**: Gross = Base Salary + OT Amount + Bonus + Incentive
- **Sundays are weekly off** — NOT counted as present or earned days, no Sunday pay
- **OT Rate** = Same as Salary/Hour (base rate, 1x — NOT 1.5x)
- **Deductions**: TDS, Loan, Advance, Security Deposit, Other Deductions
- **Net Salary** = Gross Salary + Arrear - Total Deductions

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
      reply = completion.choices[0]?.message?.content || '';
    } catch (aiError: any) {
      console.error('AI SDK error, falling back to rule-based response:', aiError?.message || aiError);
      // Fallback: generate a response from the already-fetched data
      reply = generateFallbackResponse(message, dataContext);
    }

    if (!reply) {
      reply = 'I apologize, I could not process your request. Please try again or ask a specific question like "Who is absent today?"';
    }

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error('AI Assistant error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
