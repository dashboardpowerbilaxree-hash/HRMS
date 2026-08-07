#!/usr/bin/env python3
"""
Detailed bug analysis: trace through payroll generation code for Kamlesh (EMP-021)
to find exact discrepancy.
"""
import psycopg2
from datetime import date, datetime, timedelta
import calendar

DB_URL = open('/tmp/db_url.txt').read().strip()
conn = psycopg2.connect(DB_URL)
cur = conn.cursor()

YEAR = 2026
MONTH = 7
DAYS_IN_MONTH = 31

# July 2026 Sundays
sundays = set(d for d in range(1, DAYS_IN_MONTH+1) if calendar.weekday(YEAR, MONTH, d) == 6)
print(f"Sundays in July 2026: {sorted(sundays)}")

# ─── Trace payroll generation for Kamlesh (EMP-021) ───
emp_id = 'EMP-021'
print(f"\n{'='*80}")
print(f"TRACING PAYROLL GENERATION FOR {emp_id}")
print(f"{'='*80}")

# Employee data
cur.execute("""SELECT "employeeId", "fullName", "monthlySalary", "shiftHours", "shiftStart", "shiftEnd", "relievingDate" FROM "Employee" WHERE "employeeId" = %s""", (emp_id,))
emp = cur.fetchone()
print(f"Employee: {emp[1]}, salary={emp[2]}, shift={emp[3]}h ({emp[4]}-{emp[5]})")

# Get attendance
cur.execute("""SELECT date, "checkIn", "checkOut", "totalHours", "overtimeHours", status, "halfDay", "lateEntry", "earlyOut", "isSunday" FROM "Attendance" WHERE "employeeId" = %s AND date >= '2026-07-01' AND date < '2026-08-01' ORDER BY date""", (emp_id,))
attendance = cur.fetchall()

# Simulate payroll generation logic
shift_hours = emp[3]
actual_shift_hours = shift_hours  # 10:00-19:00 = 9h, no 12h issue
hourly_rate = round(emp[2] / (DAYS_IN_MONTH * shift_hours), 2)
print(f"hourlyRate = {emp[2]} / ({DAYS_IN_MONTH} * {shift_hours}) = {hourly_rate}")

# Cutoff day: today is 2026-08-07, July is past month, so cutoff = 31
cutoff_day = 31
sundays_count = len(sundays)  # 4
total_working_days = cutoff_day - sundays_count  # 31 - 4 = 27
print(f"cutoffDay={cutoff_day}, sundays={sundays_count}, totalWorkingDays={total_working_days}")

# Calculate hours and present days (USING STORED STATUS - like the current code)
total_base_hours = 0
total_work_minutes = 0
effective_present_days = 0
raw_present_days = 0
half_days_count = 0
ot_hours = 0

present_date_strs = set()
for a in attendance:
    adate = a[0]
    aday = adate.day
    checkin = a[1]
    checkout = a[2]
    tothrs = a[3] or 0
    ot = a[4] or 0
    status = a[5]
    
    if checkin and checkout and status in ('present', 'late', 'half-day', 'half_day', 'early-out'):
        h1, m1 = map(int, checkin.split(':'))
        h2, m2 = map(int, checkout.split(':'))
        work_min = max(0, (h2*60+m2) - (h1*60+m1))
        total_work_minutes += work_min
    
    if status in ('present', 'late', 'early-out', 'half-day', 'half_day'):
        base_hrs = max(0, tothrs - ot)
        total_base_hours += base_hrs
        present_date_strs.add(f"2026-07-{aday:02d}")
        
        if status in ('half-day', 'half_day'):
            effective_present_days += 0.5
            half_days_count += 1
        else:
            effective_present_days += min(1, base_hrs / shift_hours)
            raw_present_days += 1
        
        if status in ('present', 'late', 'half-day', 'half_day', 'early-out'):
            ot_hours += ot

effective_present_days = round(effective_present_days * 100) / 100
total_worked_hrs = (total_work_minutes // 60) + (total_work_minutes % 60) / 100

print(f"\nWith STORED status:")
print(f"  totalBaseHours = {round(total_base_hours, 2)}")
print(f"  totalWorkedHrs (display) = {total_worked_hrs}")
print(f"  effectivePresentDays = {effective_present_days}")
print(f"  rawPresentDays = {raw_present_days}")
print(f"  halfDays = {half_days_count}")
print(f"  otHours = {round(ot_hours, 2)}")

# Leaves
cur.execute("""SELECT "startDate", "endDate", type FROM "Leave" WHERE "employeeId" = %s AND status = 'approved' AND "startDate" < '2026-08-01' AND "endDate" >= '2026-07-01'""", (emp_id,))
leaves = cur.fetchall()

# Holiday date strings (July only)
cur.execute("""SELECT date FROM "Holiday" WHERE date >= '2026-07-01' AND date < '2026-08-01'""")
holiday_strs = set()
for h in cur.fetchall():
    hd = h[0]
    holiday_strs.add(f"{hd.year}-{hd.month:02d}-{hd.day:02d}")

effective_paid_leaves = 0
effective_unpaid_leaves = 0
cutoff_date = datetime(2026, 7, 31, 23, 59, 59)

print(f"\nLeave processing:")
for leave in leaves:
    ls = leave[0]
    le = leave[1]
    ltype = leave[2]
    is_unpaid = ltype in ('unpaid', 'UL', 'LOP')
    print(f"  Leave: {ls.date()} to {le.date()}, type={ltype}, unpaid={is_unpaid}")
    
    d = ls
    effective_end = le if le <= cutoff_date else cutoff_date
    print(f"  effectiveEnd = {effective_end.date()}")
    
    while d <= effective_end:
        date_str = f"{d.year}-{d.month:02d}-{d.day:02d}"
        is_sunday = d.weekday() == 6  # Sunday
        is_holiday = date_str in holiday_strs
        is_present = date_str in present_date_strs
        
        print(f"    {d.date()} | sunday={is_sunday} | holiday={is_holiday} | present={is_present}", end="")
        
        if not is_sunday and not is_holiday and not is_present:
            if is_unpaid:
                effective_unpaid_leaves += 1
                print(" → UNPAID LEAVE")
            else:
                effective_paid_leaves += 1
                print(" → PAID LEAVE")
        else:
            print(" → SKIPPED")
        
        d += timedelta(days=1)

print(f"\n  effectivePaidLeaves = {effective_paid_leaves}")
print(f"  effectiveUnpaidLeaves = {effective_unpaid_leaves}")

# Absent days
absent_days = max(0, total_working_days - raw_present_days - half_days_count - effective_paid_leaves - effective_unpaid_leaves)
print(f"  absentDays = {total_working_days} - {raw_present_days} - {half_days_count} - {effective_paid_leaves} - {effective_unpaid_leaves} = {absent_days}")

# Salary calculation
sunday_hrs = sundays_count * shift_hours
paid_leave_hrs = effective_paid_leaves * shift_hours
total_hrs = total_base_hours + sunday_hrs + ot_hours + paid_leave_hrs
gross_salary = round(hourly_rate * total_hrs, 2)

print(f"\nSalary calculation:")
print(f"  sundayHrs = {sundays_count} * {shift_hours} = {sunday_hrs}")
print(f"  paidLeaveHrs = {effective_paid_leaves} * {shift_hours} = {paid_leave_hrs}")
print(f"  totalHrs = {round(total_base_hours, 2)} + {sunday_hrs} + {round(ot_hours, 2)} + {paid_leave_hrs} = {round(total_hrs, 2)}")
print(f"  grossSalary = {hourly_rate} * {round(total_hrs, 2)} = {gross_salary}")

# Get stored payroll
cur.execute("""SELECT "paidLeaves", "absentDays", "presentDays", "grossSalary", "netSalary", "totalHrs", "totalWorkedHrs", "otHours", "sundayHrs" FROM "Payroll" WHERE "employeeId" = %s AND month = 7 AND year = 2026""", (emp_id,))
stored = cur.fetchone()
print(f"\n{'='*80}")
print(f"COMPARISON (Stored vs Calculated)")
print(f"{'='*80}")
print(f"  {'Field':<20} {'Stored':<15} {'Calculated':<15} {'Match':<8}")
print(f"  {'-'*55}")
print(f"  {'paidLeaves':<20} {stored[0]!s:<15} {effective_paid_leaves!s:<15} {'YES' if stored[0] == effective_paid_leaves else 'NO ✗'}")
print(f"  {'absentDays':<20} {stored[1]!s:<15} {absent_days!s:<15} {'YES' if stored[1] == absent_days else 'NO ✗'}")
print(f"  {'presentDays':<20} {stored[2]!s:<15} {raw_present_days!s:<15} {'YES' if stored[2] == raw_present_days else 'NO ✗'}")
print(f"  {'grossSalary':<20} {stored[3]!s:<15} {gross_salary!s:<15} {'YES' if abs(stored[3] - gross_salary) < 0.01 else 'NO ✗'}")
print(f"  {'totalHrs':<20} {stored[5]!s:<15} {round(total_hrs, 2)!s:<15} {'YES' if abs(stored[5] - round(total_hrs, 2)) < 0.01 else 'NO ✗'}")

# ─── KEY BUG: The leave loop counts June days as July paid leaves! ───
print(f"\n{'='*80}")
print(f"KEY BUGS FOUND:")
print(f"{'='*80}")
print(f"1. The leave loop iterates from leave.startDate to leave.endDate,")
print(f"   counting ALL days (including June days) as July paid leaves.")
print(f"   For Kamlesh's leave (June 27 to July 1), it would count:")
print(f"   - June 27 (Sat) → paid leave (WRONG - it's a June day)")
print(f"   - June 28 (Sun) → skipped")
print(f"   - June 29 (Mon) → paid leave (WRONG - it's a June day)")
print(f"   - June 30 (Tue) → paid leave (WRONG - it's a June day)")
print(f"   - July 1 (Wed)  → paid leave (CORRECT)")
print(f"   Total = 4 paid leaves, but should be 1!")
print(f"")
print(f"2. Stored payroll shows paidLeaves=0, meaning the payroll was")
print(f"   generated BEFORE the leave was synced from ERP.")
print(f"")
print(f"3. The payroll generation uses STORED status, not recomputed status.")
print(f"   This causes mismatch with Master Excel which uses recomputeStatus().")

conn.close()
