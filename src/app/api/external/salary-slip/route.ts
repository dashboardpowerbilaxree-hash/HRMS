import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  getEffectiveCutoffDay,
  countSundaysUpTo,
  countHolidaysUpTo,
  filterAttendanceUpTo,
} from '@/lib/payroll-calc';

// ════════════════════════════════════════════════════════════════════════
// v24·0625-salary — EXTERNAL SALARY SLIP ENDPOINT (HRMS → ERP, READ-ONLY)
// ════════════════════════════════════════════════════════════════════════
// ERP's /api/salary-slip/bridge calls this endpoint to fetch an employee's
// payroll data (computed dynamically, identical to HRMS) so ERP users can
// view and download their salary slip without leaving ERP.
//
// FLOW:
//   1. ERP backend calls GET {HRMS_URL}/api/external/salary-slip
//        with header `x-hrms-api-key: <HRMS_BRIDGE_API_KEY>`
//        and query `?email=X&phone=Y&name=Z&month=M&year=Y`
//   2. HRMS looks up the employee by email → phone → name (fallback).
//   3. HRMS computes payroll dynamically (same formula as /api/payroll POST).
//   4. HRMS returns employee + computed payroll + firm details.
//
// AUTH: Requires `x-hrms-api-key` header matching env var HRMS_BRIDGE_API_KEY
//       (with fallback to ERP_BRIDGE_API_KEY — same pattern as attendance bridge).
//
// SAFETY: PURELY READ-ONLY. This endpoint NEVER writes to any database table.
// It does not generate or modify payroll records, employees, salary history,
// or any other record. It only computes and returns the values on-the-fly.
// ════════════════════════════════════════════════════════════════════════

const FIRM_NAMES: Record<string, string> = {
  LAPL: 'LAXREE AMENITIES PVT LTD',
  LRSL: 'LAXREE ROOFING SOLUTION',
  SI:   'SMARTH INTERNATIONAL',
  SDF:  'SANGRAH DECOR & FURNITURE',
};

const FIRM_ADDRESSES: Record<string, string> = {
  LAPL: 'Plot No. 1 & 2, Harbilas Sharda Marg, Civil Lines, Ajmer, Rajasthan 305001',
  LRSL: 'Plot No. 1 & 2, Harbilas Sharda Marg, Civil Lines, Ajmer, Rajasthan 305001',
  SI:   'Plot No. 1 & 2, Harbilas Sharda Marg, Civil Lines, Ajmer, Rajasthan 305001',
  SDF:  'Plot No. 1 & 2, Harbilas Sharda Marg, Civil Lines, Ajmer, Rajasthan 305001',
};

const FIRM_PHONES: Record<string, string> = {
  LAPL: '+919251683663',
  LRSL: '+919251683663',
  SI:   '+919251683663',
  SDF:  '+919251683663',
};

const FIRM_EMAILS: Record<string, string> = {
  LAPL: 'hr@laxree.com',
  LRSL: 'hr@laxrereoofing.com',
  SI:   'hr@smarthinternational.com',
  SDF:  'hr@sangrahdecor.com',
};

const FIRM_LOGOS: Record<string, string> = {
  LAPL: '/logos/lapl.jpg',
  LRSL: '/logos/lrsl.jpg',
  SI:   '/logos/si.png',
  SDF:  '/logos/sdf.png',
};

function getFirmFromEmployeeId(employeeId: string): string {
  const id = employeeId.toUpperCase();
  if (id.startsWith('LAPL')) return 'LAPL';
  if (id.startsWith('LRSL')) return 'LRSL';
  if (id.startsWith('SI-') || id.startsWith('SI0')) return 'SI';
  if (id.startsWith('SDF')) return 'SDF';
  return '';
}

// ── Convert decimal hours to HH.MM display format (matches HRMS SalarySlipGenerator) ──
function formatHours(decimal: number): string {
  if (!decimal || decimal === 0) return '0.00';
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  if (minutes >= 60) return `${hours + 1}.00`;
  return `${hours}.${String(minutes).padStart(2, '0')}`;
}

// ── Convert number to words (Indian format — same as HRMS SalarySlipGenerator) ──
function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convert(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  }

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let result = 'Rupees ' + convert(rupees);
  if (paise > 0) result += ' and ' + convert(paise) + ' Paise';
  result += ' Only';
  return result;
}

export async function GET(request: NextRequest) {
  try {
    // Validate API key (with fallback — same pattern as attendance endpoint)
    const apiKey = request.headers.get('x-hrms-api-key');
    const expectedKey = process.env.HRMS_BRIDGE_API_KEY || process.env.ERP_BRIDGE_API_KEY;
    if (!expectedKey || apiKey !== expectedKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const email = (searchParams.get('email') || '').toLowerCase().trim();
    const phone = (searchParams.get('phone') || '').trim();
    const name = (searchParams.get('name') || '').toLowerCase().trim();
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    if (!email && !phone && !name) {
      return NextResponse.json(
        { error: 'Either email, phone, or name is required to identify the employee' },
        { status: 400 }
      );
    }

    // ── Employee lookup — IDENTICAL to /api/external/attendance/route.ts ──
    // (email → phone → name [exact then partial])
    let employee: any = null;
    const empSelect = {
      employeeId: true, fullName: true, email: true, mobile: true,
      department: true, designation: true, location: true,
      firm: true, shiftHours: true, employmentType: true,
      monthlySalary: true, salaryType: true, hourlyRate: true,
      address: true, joiningDate: true, relievingDate: true,
    };

    if (email) {
      employee = await db.employee.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: empSelect,
      });
    }
    if (!employee && phone) {
      const phoneLast10 = phone.replace(/\D/g, '').slice(-10);
      if (phoneLast10.length >= 10) {
        employee = await db.employee.findFirst({
          where: { mobile: { contains: phoneLast10 } },
          select: empSelect,
        });
      }
    }
    if (!employee && name) {
      employee = await db.employee.findFirst({
        where: { fullName: { equals: name, mode: 'insensitive' } },
        select: empSelect,
      });
      if (!employee) {
        const allEmployees = await db.employee.findMany({ select: empSelect });
        const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');
        const normName = normalize(name);
        const partialMatch = allEmployees.find(e => {
          const empName = normalize(e.fullName || '');
          if (!empName || !normName) return false;
          return empName.includes(normName) || normName.includes(empName);
        });
        if (partialMatch) employee = partialMatch;
      }
    }

    if (!employee) {
      return NextResponse.json({
        employee: null,
        payroll: null,
        firm: null,
        message: 'No HRMS employee found matching this email/phone/name.',
      });
    }

    // ── Compute payroll dynamically (mirrors /api/payroll POST logic) ──
    // If a stored Payroll row exists, use it as the base; otherwise compute from attendance.
    const daysInMonth = new Date(year, month, 0).getDate();
    const cutoffDay = getEffectiveCutoffDay(year, month, daysInMonth, employee.relievingDate);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const holidays = await db.holiday.findMany({ where: { date: { gte: startDate, lt: endDate } } });
    const elapsedHolidays = countHolidaysUpTo(holidays, cutoffDay);
    const holidayDays = elapsedHolidays;
    const sundays = countSundaysUpTo(year, month, cutoffDay);
    const totalWorkingDays = Math.max(0, cutoffDay - sundays - elapsedHolidays);

    const shiftHrs = employee.shiftHours || 9;
    const perDayRate = employee.monthlySalary / daysInMonth;
    const hourlyRate = employee.monthlySalary / (daysInMonth * shiftHrs);

    const attendance = await db.attendance.findMany({
      where: { employeeId: employee.employeeId, date: { gte: startDate, lt: endDate } },
    });
    const effectiveAttendance = filterAttendanceUpTo(attendance, year, month, cutoffDay);

    // Hour-based salary computation
    let totalBaseHours = 0;
    let totalWorkMinutes = 0;
    let effectivePresentDays = 0;

    for (const a of effectiveAttendance) {
      if (a.checkIn && a.checkOut && ['present', 'late', 'half-day', 'half_day', 'early-out'].includes(a.status)) {
        const [h1, m1] = a.checkIn.split(':').map(Number);
        const [h2, m2] = a.checkOut.split(':').map(Number);
        const workMin = Math.max(0, (h2 * 60 + m2) - (h1 * 60 + m1));
        totalWorkMinutes += workMin;
      }
      if (['present', 'late', 'early-out', 'half-day', 'half_day'].includes(a.status)) {
        const baseHrs = Math.max(0, (a.totalHours || 0) - (a.overtimeHours || 0));
        totalBaseHours += baseHrs;
        if (a.status === 'half-day' || a.status === 'half_day') {
          effectivePresentDays += 0.5;
        } else {
          effectivePresentDays += Math.min(1, baseHrs / shiftHrs);
        }
      }
    }
    effectivePresentDays = Math.round(effectivePresentDays * 100) / 100;

    const totalWorkedHrs = Math.floor(totalWorkMinutes / 60) + (totalWorkMinutes % 60) / 100;
    const otHoursDecimal = Math.round(effectiveAttendance
      .filter(a => ['present', 'late', 'half-day', 'half_day', 'early-out'].includes(a.status))
      .reduce((sum, a) => sum + (a.overtimeHours || 0), 0) * 100) / 100;

    const rawPresentDays = effectiveAttendance.filter(a => ['present', 'late', 'early-out'].includes(a.status)).length;
    const halfDays = effectiveAttendance.filter(a => a.status === 'half-day' || a.status === 'half_day').length;
    const presentDays = rawPresentDays;

    // Approved leaves
    const leaves = await db.leave.findMany({
      where: { employeeId: employee.employeeId, status: 'approved', startDate: { gte: startDate }, endDate: { lt: endDate } },
    });

    const holidayDateStrs = new Set(
      holidays.map(h => {
        const hd = new Date(h.date);
        return `${hd.getFullYear()}-${String(hd.getMonth() + 1).padStart(2, '0')}-${String(hd.getDate()).padStart(2, '0')}`;
      })
    );
    const presentDateStrs = new Set();
    for (const a of effectiveAttendance) {
      if (['present', 'late', 'early-out', 'half-day', 'half_day'].includes(a.status)) {
        const ad = new Date(a.date);
        presentDateStrs.add(`${ad.getFullYear()}-${String(ad.getMonth() + 1).padStart(2, '0')}-${String(ad.getDate()).padStart(2, '0')}`);
      }
    }

    let effectivePaidLeaves = 0;
    let effectiveUnpaidLeaves = 0;
    const cutoffDate = new Date(year, month - 1, cutoffDay);
    for (const leave of leaves) {
      const isUnpaid = leave.type === 'unpaid' || leave.type === 'UL' || leave.type === 'LOP';
      let d = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const effectiveEnd = end > cutoffDate ? cutoffDate : end;
      while (d <= effectiveEnd) {
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const isSunday = d.getDay() === 0;
        const isHoliday = holidayDateStrs.has(dateStr);
        if (!isSunday && !isHoliday && !presentDateStrs.has(dateStr)) {
          if (isUnpaid) effectiveUnpaidLeaves++;
          else effectivePaidLeaves++;
        }
        d.setDate(d.getDate() + 1);
      }
    }

    const absentDays = Math.max(0, totalWorkingDays - presentDays - halfDays - effectivePaidLeaves - effectiveUnpaidLeaves);

    const sundayCount = sundays;
    const sundayHrs = sundayCount * shiftHrs;
    const paidLeaveHrs = effectivePaidLeaves * shiftHrs;
    const totalHrs = totalBaseHours + sundayHrs + otHoursDecimal + paidLeaveHrs;
    const baseSalary = hourlyRate * totalBaseHours;
    const sundayEarnings = hourlyRate * sundayHrs;
    const earnedSundayHrs = sundayHrs;
    const otAmount = otHoursDecimal * hourlyRate;
    const grossSalary = hourlyRate * totalHrs;

    // Sunday worked hours (for display only)
    let sundayWorkMinutes = 0;
    for (const a of effectiveAttendance) {
      if ((a as any).isSunday && a.checkIn && a.checkOut) {
        const [h1, m1] = a.checkIn.split(':').map(Number);
        const [h2, m2] = a.checkOut.split(':').map(Number);
        sundayWorkMinutes += Math.max(0, (h2 * 60 + m2) - (h1 * 60 + m1));
      }
    }
    const sundayWorkedHrs = Math.floor(sundayWorkMinutes / 60) + (sundayWorkMinutes % 60) / 100;

    // ── Pull stored Payroll row (if exists) to get deductions / bonus / incentive / arrear ──
    // We always recompute the dynamic fields above; we only borrow the operator-entered fields.
    const storedPayroll = await db.payroll.findFirst({
      where: { employeeId: employee.employeeId, month, year },
    });

    const tdsDeduction = storedPayroll?.tdsDeduction || 0;
    const loanDeduction = storedPayroll?.loanDeduction || 0;
    const advanceDeduction = storedPayroll?.advanceDeduction || 0;
    const securityDeposit = storedPayroll?.securityDeposit || 0;
    const otherDeductions = storedPayroll?.otherDeductions || 0;
    const totalDeductions = Math.round((tdsDeduction + loanDeduction + advanceDeduction + securityDeposit + otherDeductions) * 100) / 100;

    const arrear = storedPayroll?.arrear || 0;
    const bonus = storedPayroll?.bonus || 0;
    const incentive = storedPayroll?.incentive || 0;
    const netSalary = Math.round((grossSalary + bonus + incentive + arrear - totalDeductions) * 100) / 100;

    const earnedDays = effectivePresentDays + effectivePaidLeaves;
    const totalEarnings = grossSalary + bonus + incentive + arrear;

    // ── Firm details ──
    const firmCode = getFirmFromEmployeeId(employee.employeeId) || employee.firm || employee.department || '';
    const firm = {
      code: firmCode,
      name: FIRM_NAMES[firmCode] || 'Laxree Group of Companies',
      address: FIRM_ADDRESSES[firmCode] || '',
      phone: FIRM_PHONES[firmCode] || '+919251683663',
      email: FIRM_EMAILS[firmCode] || 'hr@laxree.com',
      logo: FIRM_LOGOS[firmCode] || '/laxree-logo.png',
    };

    // ── Build the payroll payload ──
    // Field names match what HRMS SalarySlipGenerator.tsx expects, so ERP can render
    // the slip using the EXACT same layout/formulas as HRMS.
    const payroll = {
      employeeId: employee.employeeId,
      month,
      year,
      monthlySalary: employee.monthlySalary,
      hourlyRate, // Full precision
      perDayRate, // Full precision
      daysInMonth,
      cutoffDay,
      totalWorkedHrs,
      otHours: otHoursDecimal,
      otRate: hourlyRate,
      otAmount: Math.round(otAmount * 100) / 100,
      sundayHrs: sundayWorkedHrs,
      sundayCount,
      sundayEarnings: Math.round(sundayEarnings * 100) / 100,
      earnedSundayHrs,
      totalHrs: Math.round(totalHrs * 100) / 100,
      totalBaseHours: Math.round(totalBaseHours * 100) / 100,
      baseSalary: Math.round(baseSalary * 100) / 100,
      presentDays,
      absentDays,
      halfDays,
      holidayDays,
      paidLeaves: effectivePaidLeaves,
      unpaidLeaves: effectiveUnpaidLeaves,
      effectivePresentDays,
      earnedDays,
      totalWorkingDays,
      grossSalary: Math.round(grossSalary * 100) / 100,
      tdsDeduction,
      loanDeduction,
      advanceDeduction,
      securityDeposit,
      otherDeductions,
      totalDeductions,
      arrear,
      bonus,
      incentive,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      netSalary,
      netSalaryInWords: numberToWords(netSalary),
      status: storedPayroll?.status || 'generated',
      // Helpful pre-formatted strings so ERP doesn't need to duplicate formatHours logic
      totalWorkedHrsDisplay: formatHours(totalWorkedHrs),
      otHoursDisplay: formatHours(otHoursDecimal),
      sundayHrsDisplay: formatHours(sundayWorkedHrs),
      totalHrsDisplay: formatHours(totalHrs),
      earnedSundayHrsDisplay: formatHours(earnedSundayHrs),
    };

    return NextResponse.json({
      employee: {
        employeeId: employee.employeeId,
        fullName: employee.fullName,
        email: employee.email,
        mobile: employee.mobile,
        department: employee.department,
        designation: employee.designation,
        location: employee.location,
        firm: employee.firm,
        address: employee.address,
        joiningDate: employee.joiningDate,
        salaryType: employee.salaryType,
        shiftHours: employee.shiftHours,
        employmentType: employee.employmentType,
      },
      payroll,
      firm,
      month,
      year,
      monthName: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][month - 1],
    });
  } catch (error: any) {
    console.error('External salary-slip GET error:', error);
    return NextResponse.json(
      { error: error?.message || 'Server error' },
      { status: 500 }
    );
  }
}
