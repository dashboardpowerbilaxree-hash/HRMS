#!/usr/bin/env python3
"""Pull ALL July 2026 data from DB and compute ground-truth per employee.
Output: /home/z/my-project/scripts/july_data.json with full per-employee breakdown.
"""
import psycopg2
import json
from datetime import date, timedelta
import calendar

DB_URL = open('/tmp/db_url.txt').read().strip()
conn = psycopg2.connect(DB_URL)
cur = conn.cursor()

YEAR = 2026
MONTH = 7
DAYS = calendar.monthrange(YEAR, MONTH)[1]

# Sundays in July 2026
sundays = sorted(d for d in range(1, DAYS+1) if calendar.weekday(YEAR, MONTH, d) == 6)

# Holidays in July 2026
cur.execute("""SELECT date, name FROM "Holiday" WHERE date >= '2026-07-01' AND date < '2026-08-01' ORDER BY date""")
holidays = cur.fetchall()
holiday_days = sorted(h[0].day for h in holidays)

# All active employees
cur.execute("""
    SELECT "employeeId", "fullName", "firm", "location", "monthlySalary", "shiftHours",
           "shiftStart", "shiftEnd", "salaryType", "employmentType"
    FROM "Employee"
    WHERE "status" = 'Yes'
    ORDER BY "firm", "fullName"
""")
employees = cur.fetchall()
print(f"Active employees: {len(employees)}")
print(f"Sundays: {sundays}")
print(f"Holidays: {holiday_days}")

# Attendance for all employees in July 2026
cur.execute("""
    SELECT "employeeId", date, "checkIn", "checkOut", "totalHours", "overtimeHours",
           status, "halfDay", "lateEntry", "earlyOut", "isSunday"
    FROM "Attendance"
    WHERE date >= '2026-07-01' AND date < '2026-08-01'
    ORDER BY "employeeId", date
""")
all_attendance = cur.fetchall()
print(f"Attendance records: {len(all_attendance)}")

# Approved leaves touching July 2026
cur.execute("""
    SELECT "employeeId", "startDate", "endDate", type, status, reason
    FROM "Leave"
    WHERE status = 'approved'
      AND "startDate" < '2026-08-01' AND "endDate" >= '2026-07-01'
""")
all_leaves = cur.fetchall()
print(f"Leave records (approved, touching July): {len(all_leaves)}")

# Payroll for July 2026
cur.execute("""
    SELECT "employeeId", "paidLeaves", "absentDays", "presentDays", "grossSalary", "netSalary",
           "totalHrs", "totalWorkedHrs", "otHours", "sundayHrs", "hourlyRate", "otRate",
           "totalDeductions", "advanceDeduction", "tdsDeduction", "arrear"
    FROM "Payroll"
    WHERE month = 7 AND year = 2026
""")
all_payroll = cur.fetchall()
print(f"Payroll records: {len(all_payroll)}")

# Group attendance and leaves by employee
attendance_by_emp = {}
for a in all_attendance:
    emp_id = a[0]
    if emp_id not in attendance_by_emp:
        attendance_by_emp[emp_id] = []
    attendance_by_emp[emp_id].append({
        'date': a[1].isoformat(),
        'day': a[1].day,
        'weekday': calendar.day_name[a[1].weekday()],
        'checkIn': str(a[2]) if a[2] else None,
        'checkOut': str(a[3]) if a[3] else None,
        'totalHours': float(a[4]) if a[4] else 0,
        'overtimeHours': float(a[5]) if a[5] else 0,
        'status': a[6],
        'halfDay': a[7],
        'lateEntry': a[8],
        'earlyOut': a[9],
        'isSunday': a[10],
    })

leaves_by_emp = {}
for l in all_leaves:
    emp_id = l[0]
    if emp_id not in leaves_by_emp:
        leaves_by_emp[emp_id] = []
    ls, le = l[1], l[2]
    leave_days_in_july = []
    d = ls
    while d <= le:
        if d.month == 7 and d.year == 2026:
            leave_days_in_july.append(d.day)
        d += timedelta(days=1)
    leaves_by_emp[emp_id].append({
        'startDate': ls.isoformat(),
        'endDate': le.isoformat(),
        'type': l[3],
        'status': l[4],
        'reason': l[5],
        'july_days': leave_days_in_july,
    })

payroll_by_emp = {p[0]: p for p in all_payroll}

# Compute per-employee summary
results = []
for emp in employees:
    emp_id = emp[0]
    full_name = emp[1]
    firm = emp[2]
    location = emp[3]
    monthly_salary = float(emp[4]) if emp[4] else 0
    shift_hours = float(emp[5]) if emp[5] else 9
    shift_start = str(emp[6])
    shift_end = str(emp[7])
    salary_type = emp[8]
    employment_type = emp[9]

    att_records = attendance_by_emp.get(emp_id, [])
    leaves = leaves_by_emp.get(emp_id, [])

    # Categorize each day
    present_days = []
    half_days = []
    absent_status_days = []  # days where status='absent' (raw count = what user wants for "absent")
    leave_days_set = set()
    sunday_attendance_days = []  # sundays where they actually have attendance

    # Build leave-day set
    for lv in leaves:
        for d in lv['july_days']:
            if d not in sundays and d not in holiday_days:
                leave_days_set.add(d)

    for a in att_records:
        day = a['day']
        status = a['status']
        if day in sundays:
            sunday_attendance_days.append(day)
            continue  # Sundays handled separately
        if status == 'absent':
            absent_status_days.append(day)
        elif status in ('half-day', 'half_day'):
            half_days.append(day)
        elif status in ('present', 'late', 'early-out'):
            present_days.append(day)

    # Compute hours
    worked_hrs_including_ot = sum(a['totalHours'] or 0 for a in att_records if a['status'] in ('present', 'late', 'early-out', 'half-day', 'half_day'))
    ot_hrs = sum(a['overtimeHours'] or 0 for a in att_records if a['status'] in ('present', 'late', 'early-out', 'half-day', 'half_day'))
    base_hrs = worked_hrs_including_ot - ot_hrs  # hours excluding OT

    # Sunday hours: each Sunday counts as shift_hours (paid)
    num_sundays_in_month = len(sundays)
    sunday_hrs = num_sundays_in_month * shift_hours

    # Total Hrs = Worked Hrs (incl OT) + Sunday Hrs (Additional Hrs)
    # Per user's request: H = Worked Hrs including OT, I = Additional hrs (Sunday Hrs), J = Total Hrs
    # Total Hrs = H + I = Worked Hrs (incl OT) + Sunday Hrs
    total_hrs = worked_hrs_including_ot + sunday_hrs

    # Absent days: per user's expectation, count = (working_days - present_days - half_days)
    # For Kamlesh: 27 working - 24 present - 0 half = 3 absent ✓
    working_days = DAYS - len(sundays) - len(holiday_days)
    absent_days = working_days - len(present_days) - len(half_days)

    # If we want to ALSO show leave days separately, we need to decide:
    # The user wants absent=3 for Kamlesh. With (27-24-0)=3 ✓
    # But July 1 had status='absent' AND has approved leave.
    # The user counts it as absent (since they verified "3 absent hain").
    # So absent = working_days - present - half = 3 ✓

    # Salary computation:
    # Sl/Hr = Monthly Salary / (Days in Month × Shift Hrs/Day)
    # Per Master template: G = E / (31 * F)
    sl_per_hr = monthly_salary / (DAYS * shift_hours) if shift_hours > 0 else 0

    # Gross Salary = Total Hrs × Sl/Hr
    gross_salary = total_hrs * sl_per_hr

    # Get stored payroll for cross-reference
    p = payroll_by_emp.get(emp_id)
    stored = None
    if p:
        stored = {
            'paidLeaves': float(p[1]) if p[1] else 0,
            'absentDays': float(p[2]) if p[2] else 0,
            'presentDays': float(p[3]) if p[3] else 0,
            'grossSalary': float(p[4]) if p[4] else 0,
            'netSalary': float(p[5]) if p[5] else 0,
            'totalHrs': float(p[6]) if p[6] else 0,
            'totalWorkedHrs': float(p[7]) if p[7] else 0,
            'otHours': float(p[8]) if p[8] else 0,
            'sundayHrs': float(p[9]) if p[9] else 0,
            'hourlyRate': float(p[10]) if p[10] else 0,
            'otRate': float(p[11]) if p[11] else 0,
            'deductions': float(p[12]) if p[12] else 0,
            'salaryAdvance': float(p[13]) if p[13] else 0,
            'tds': float(p[14]) if p[14] else 0,
            'arrears': float(p[15]) if p[15] else 0,
        }

    results.append({
        'employeeId': emp_id,
        'fullName': full_name,
        'firm': firm,
        'location': location,
        'monthlySalary': monthly_salary,
        'shiftHours': shift_hours,
        'shiftStart': shift_start,
        'shiftEnd': shift_end,
        'salaryType': salary_type,
        'employmentType': employment_type,
        'presentDays': len(present_days),
        'presentDayList': present_days,
        'halfDays': len(half_days),
        'halfDayList': half_days,
        'absentDays': absent_days,  # 3 for Kamlesh ✓
        'absentStatusDays': absent_status_days,  # raw status=absent days
        'absentDayList': absent_status_days,
        'leaveDays': len(leave_days_set),
        'leaveDayList': sorted(leave_days_set),
        'leaves': leaves,
        'workedHrsInclOT': round(worked_hrs_including_ot, 2),
        'otHrs': round(ot_hrs, 2),
        'baseHrs': round(base_hrs, 2),
        'sundayHrs': sunday_hrs,
        'numSundays': num_sundays_in_month,
        'totalHrs': round(total_hrs, 2),
        'slPerHr': round(sl_per_hr, 4),
        'grossSalary': round(gross_salary, 2),
        'stored': stored,
    })

# Save full results
output = {
    'meta': {
        'year': YEAR,
        'month': MONTH,
        'daysInMonth': DAYS,
        'sundays': sundays,
        'numSundays': len(sundays),
        'holidays': holiday_days,
        'numHolidays': len(holiday_days),
        'workingDays': DAYS - len(sundays) - len(holiday_days),
    },
    'employees': results,
}

with open('/home/z/my-project/scripts/july_data.json', 'w') as f:
    json.dump(output, f, indent=2, default=str)

# Print Kamlesh specifically
print(f"\n{'='*100}")
print(f"KAMLESH CHECK:")
print(f"{'='*100}")
for r in results:
    if 'Kamlesh' in r['fullName']:
        print(json.dumps(r, indent=2, default=str))

# Print summary table
print(f"\n{'='*100}")
print(f"ALL EMPLOYEES — July 2026 Ground Truth")
print(f"{'='*100}")
print(f"{'EmpID':<10} {'Name':<25} {'Firm':<6} {'Sal':<8} {'Present':<8} {'Half':<5} {'Absent':<7} {'Leave':<6} {'WrkHrs':<8} {'OT':<6} {'SunHrs':<7} {'TotHrs':<8} {'Gross':<10}")
print("-" * 130)
for r in results:
    print(f"{r['employeeId']:<10} {r['fullName'][:24]:<25} {r['firm'] or '-':<6} {r['monthlySalary']:<8.0f} {r['presentDays']:<8} {r['halfDays']:<5} {r['absentDays']:<7} {r['leaveDays']:<6} {r['workedHrsInclOT']:<8.2f} {r['otHrs']:<6.2f} {r['sundayHrs']:<7.0f} {r['totalHrs']:<8.2f} {r['grossSalary']:<10.2f}")

print(f"\nTotal employees: {len(results)}")
conn.close()
