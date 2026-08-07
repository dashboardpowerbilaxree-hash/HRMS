#!/usr/bin/env python3
"""Re-run ground truth with the FIXED logic:
- absentDays = totalWorkingDays - presentDays - halfDays  (NOT subtracting leaves)
- sundayHrs = sundays × shiftHours  (PAID, not actual worked)
- workedHrsInclOT = totalBaseHours + otHours  (INCLUDES OT)
- additionalHrs = sundayHrs  (PAID Sunday hrs)
"""
import psycopg2, json
from datetime import date, timedelta
import calendar

DB_URL = open('/tmp/db_url.txt').read().strip()
conn = psycopg2.connect(DB_URL)
cur = conn.cursor()

YEAR = 2026; MONTH = 7; DAYS = 31
sundays = sorted(d for d in range(1, DAYS+1) if calendar.weekday(YEAR, MONTH, d) == 6)
print(f"Sundays: {sundays} (count={len(sundays)})")

cur.execute("""SELECT date FROM "Holiday" WHERE date >= '2026-07-01' AND date < '2026-08-01'""")
holidays = [r[0].day for r in cur.fetchall()]
print(f"Holidays: {holidays}")

working_days = DAYS - len(sundays) - len(holidays)
print(f"Working days: {working_days}")

# Kamlesh specifically
emp_id = 'EMP-021'
cur.execute("""SELECT "fullName", "monthlySalary", "shiftHours" FROM "Employee" WHERE "employeeId" = %s""", (emp_id,))
emp = cur.fetchone()
name, salary, shift_hrs = emp
print(f"\nEmployee: {name}, salary={salary}, shift={shift_hrs}h")

cur.execute("""
    SELECT date, "totalHours", "overtimeHours", status, "halfDay"
    FROM "Attendance"
    WHERE "employeeId" = %s AND date >= '2026-07-01' AND date < '2026-08-01'
    ORDER BY date
""", (emp_id,))
attendance = cur.fetchall()

present_days = 0
half_days = 0
absent_status_days = 0
total_base_hrs = 0
total_ot_hrs = 0
total_worked_hrs = 0  # base + OT (i.e., totalHours sum)

for a in attendance:
    day = a[0].day
    tothrs = a[1] or 0
    ot = a[2] or 0
    status = a[3]
    base = max(0, tothrs - ot)
    if day in sundays:
        continue  # Sundays not counted as present/absent
    if status in ('present', 'late', 'early-out'):
        present_days += 1
        total_base_hrs += base
        total_ot_hrs += ot
        total_worked_hrs += tothrs
    elif status in ('half-day', 'half_day'):
        half_days += 1
        total_base_hrs += base
        total_ot_hrs += ot
        total_worked_hrs += tothrs
    elif status == 'absent':
        absent_status_days += 1

# NEW LOGIC: absent = working_days - present - half (NOT subtracting leaves)
absent_days = working_days - present_days - half_days

# Sunday Hrs = PAID (sundays × shift_hours), not actual worked
sunday_hrs = len(sundays) * shift_hrs

# Worked Hrs INCLUDING OT = base + OT
worked_hrs_incl_ot = total_base_hrs + total_ot_hrs

# Total Hrs INCLUDING Sunday = worked_hrs_incl_ot + sunday_hrs
total_hrs_incl_sunday = worked_hrs_incl_ot + sunday_hrs

# Salary
hourly_rate = round(salary / (DAYS * shift_hrs), 2)
gross = round(total_hrs_incl_sunday * hourly_rate, 2)

print(f"\n{'='*70}")
print(f"FIXED LOGIC — Kamlesh July 2026")
print(f"{'='*70}")
print(f"  Present days:                  {present_days}    (expected 24)")
print(f"  Half days:                     {half_days}    (expected 0)")
print(f"  Absent days (NEW LOGIC):       {absent_days}    (expected 3) ✓")
print(f"  Absent status=absent (raw):    {absent_status_days}    (days 1, 27, 31)")
print(f"  Total base hours:              {total_base_hrs:.2f}  (=totalHours - OT)")
print(f"  Total OT hours:                {total_ot_hrs:.2f}")
print(f"  Worked Hrs INCLUDING OT:       {worked_hrs_incl_ot:.2f}  (=base + OT, expected 216.07)")
print(f"  Sunday Hrs (PAID):             {sunday_hrs:.2f}  (= 4 × 9, expected 36)")
print(f"  Total Hrs incl Sunday:         {total_hrs_incl_sunday:.2f}  (= 216.07 + 36, expected 252.07)")
print(f"  Hourly rate:                   ₹{hourly_rate}  (= 19000 / (31 × 9))")
print(f"  Gross salary:                  ₹{gross}  (= 252.07 × 68.10)")

# Verify
assert absent_days == 3, f"FAIL: absent={absent_days}, expected 3"
assert abs(worked_hrs_incl_ot - 216.07) < 0.1, f"FAIL: worked_incl_OT={worked_hrs_incl_ot}"
assert abs(sunday_hrs - 36) < 0.01, f"FAIL: sunday_hrs={sunday_hrs}"
assert abs(total_hrs_incl_sunday - 252.07) < 0.1, f"FAIL: total={total_hrs_incl_sunday}"
print(f"\n  ✓ ALL CHECKS PASSED")
print(f"\n  Image 1 dashboard will now show:")
print(f"    DAYS ABSENT = {absent_days} (was 2)")
print(f"    SUNDAY HRS  = {int(sunday_hrs)}:00 (was 0:00)")
print(f"    Total Hrs incl Sunday = {total_hrs_incl_sunday:.2f} (already correct)")
print(f"\n  Image 2 Payroll Summary will now show:")
print(f"    Col H 'Worked Hrs including OT' = {worked_hrs_incl_ot:.2f} (was 213.12)")
print(f"    Col I 'Additional hrs'          = {sunday_hrs:.2f} (was 2.95)")
print(f"    Col J 'Total Hrs incl Sunday'   = {total_hrs_incl_sunday:.2f} (already correct)")
print(f"    Col G 'Absent Days'             = {absent_days} (was 2)")

conn.close()
