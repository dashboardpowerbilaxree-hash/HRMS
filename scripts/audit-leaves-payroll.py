#!/usr/bin/env python3
"""
Comprehensive audit of July 2026 leaves vs payroll.
Find ALL employees with July leaves and check if payroll counted them.
"""
import psycopg2
from datetime import date, timedelta
import calendar

DB_URL = open('/tmp/db_url.txt').read().strip()
conn = psycopg2.connect(DB_URL)
cur = conn.cursor()

YEAR = 2026
MONTH = 7
DAYS_IN_MONTH = 31

# Sundays in July 2026
sundays = set(d for d in range(1, DAYS_IN_MONTH+1) if calendar.weekday(YEAR, MONTH, d) == 6)

# Holidays in July 2026
cur.execute("""SELECT date, name FROM "Holiday" WHERE date >= '2026-07-01' AND date < '2026-08-01'""")
holiday_days = set()
for h in cur.fetchall():
    hdate = h[0]
    holiday_days.add(hdate.day)
print(f"Sundays in July: {sorted(sundays)}")
print(f"Holidays in July: {sorted(holiday_days)}")

# ─── Find ALL employees with approved leaves overlapping July 2026 ───
print("\n" + "=" * 90)
print("ALL EMPLOYEES WITH LEAVES OVERLAPPING JULY 2026")
print("=" * 90)
cur.execute("""
    SELECT l."employeeId", e."fullName", e.firm, l."startDate", l."endDate", l.type, l.status, l.reason
    FROM "Leave" l
    JOIN "Employee" e ON l."employeeId" = e."employeeId"
    WHERE l.status = 'approved' AND l."startDate" < '2026-08-01' AND l."endDate" >= '2026-07-01'
    ORDER BY e.firm, e."fullName", l."startDate"
""")
leave_rows = cur.fetchall()
print(f"Found {len(leave_rows)} approved leaves overlapping July 2026")
for l in leave_rows:
    print(f"  {l[0]} | {l[1]} | {l[2]} | {l[3].date()} to {l[4].date()} | type={l[5]} | reason={l[7]}")

# ─── For each employee with leaves, check payroll ───
print("\n" + "=" * 90)
print("LEAVE vs PAYROLL COMPARISON")
print("=" * 90)
print(f"{'Employee':<12} {'Name':<25} {'LeaveDays':<10} {'PPL_Leave':<10} {'Payroll_Leave':<14} {'Match?':<8}")
print("-" * 90)

for l in leave_rows:
    emp_id = l[0]
    name = l[1]
    firm = l[2]
    ls = l[3]
    le = l[4]
    
    # Expand leave to July days
    leave_days_july = set()
    cur_date = ls
    while cur_date <= le:
        if cur_date.month == 7 and cur_date.year == 2026:
            leave_days_july.add(cur_date.day)
        cur_date += timedelta(days=1)
    
    # Get present dates for this employee in July
    cur.execute("""
        SELECT date, status FROM "Attendance"
        WHERE "employeeId" = %s AND date >= '2026-07-01' AND date < '2026-08-01'
    """, (emp_id,))
    present_dates = set()
    for a in cur.fetchall():
        if a[1] in ('present', 'late', 'early-out', 'half-day', 'half_day'):
            present_dates.add(a[0].day)
    
    # Manual leave count (excluding Sun/Holiday/present)
    manual_leaves = 0
    for d in leave_days_july:
        if d in sundays or d in holiday_days or d in present_dates:
            continue
        manual_leaves += 1
    
    # Get stored payroll
    cur.execute("""
        SELECT "paidLeaves", "absentDays", "presentDays", "netSalary", "grossSalary"
        FROM "Payroll"
        WHERE "employeeId" = %s AND month = 7 AND year = 2026
    """, (emp_id,))
    p = cur.fetchone()
    if p:
        ppl_leave = p[0]
        payroll_leave = p[0]  # paidLeaves
        absent = p[1]
        present = p[2]
        net = p[3]
        match = "YES" if manual_leaves == int(ppl_leave) else "NO"
        print(f"{emp_id:<12} {name[:24]:<25} {manual_leaves:<10} {ppl_leave!s:<10} {payroll_leave!s:<14} {match:<8}")
        if match == "NO":
            print(f"             -> absent={absent}, present={present}, net={net}")
            print(f"             -> leave days in July: {sorted(leave_days_july)}")
            print(f"             -> present dates: {sorted(present_dates)}")
    else:
        print(f"{emp_id:<12} {name[:24]:<25} {manual_leaves:<10} {'N/A':<10} {'NO PAYROLL':<14} {'-':<8}")

# ─── Check salary correctness for a sample ───
print("\n" + "=" * 90)
print("SALARY VERIFICATION (manual calc vs stored)")
print("=" * 90)

# Pick Kamlesh (EMP-021) - has 1 leave
cur.execute("""
    SELECT e."employeeId", e."fullName", e."monthlySalary", e."shiftHours", e."shiftStart", e."shiftEnd",
           p."grossSalary", p."netSalary", p."totalHrs", p."totalWorkedHrs", p."otHours", p."sundayHrs", p."sundayCount",
           p."presentDays", p."absentDays", p."paidLeaves"
    FROM "Employee" e
    JOIN "Payroll" p ON e."employeeId" = p."employeeId"
    WHERE e."employeeId" = 'EMP-021' AND p.month = 7 AND p.year = 2026
""")
r = cur.fetchone()
if r:
    emp_id, name, salary, shift_hrs, ss, se, gross, net, tothrs, worked, ot, sunhrs, suncount, present, absent, paidleaves = r
    print(f"\n{emp_id} | {name} | salary={salary} | shift={shift_hrs}h")
    print(f"  STORED: gross={gross}, net={net}, totalHrs={tothrs}, workedHrs={worked}")
    print(f"  STORED: ot={ot}, sunHrs={sunhrs}, sunCount={suncount}")
    print(f"  STORED: present={present}, absent={absent}, paidLeaves={paidleaves}")
    
    # Manual salary calc
    days_in_month = 31
    hourly_rate = round(salary / (days_in_month * shift_hrs), 2)
    print(f"\n  MANUAL CALC:")
    print(f"  hourlyRate = {salary} / ({days_in_month} * {shift_hrs}) = {hourly_rate}")
    print(f"  totalBaseHours (from workedHrs) = {worked}")
    
    # Get all attendance for July
    cur.execute("""
        SELECT date, "checkIn", "checkOut", "totalHours", "overtimeHours", status, "halfDay", "lateEntry", "earlyOut"
        FROM "Attendance"
        WHERE "employeeId" = %s AND date >= '2026-07-01' AND date < '2026-08-01'
        ORDER BY date
    """, (emp_id,))
    
    total_base_hrs = 0
    total_ot_hrs = 0
    present_count = 0
    half_count = 0
    for a in cur.fetchall():
        status = a[5]
        toth = a[3] or 0
        oth = a[4] or 0
        base = max(0, toth - oth)
        if status in ('present', 'late', 'early-out'):
            total_base_hrs += base
            present_count += 1
        elif status in ('half-day', 'half_day'):
            total_base_hrs += base
            half_count += 1
        total_ot_hrs += oth if status in ('present', 'late', 'early-out', 'half-day', 'half_day') else 0
    
    sundays_count = len(sundays)  # 4 in July (assuming full month)
    sunday_hrs = sundays_count * shift_hrs
    paid_leave_hrs = 1 * shift_hrs  # Kamlesh has 1 leave day
    total_hrs_manual = total_base_hrs + sunday_hrs + total_ot_hrs + paid_leave_hrs
    gross_manual = round(hourly_rate * total_hrs_manual, 2)
    
    print(f"  present_count={present_count}, half_count={half_count}")
    print(f"  totalBaseHours (manual) = {round(total_base_hrs, 2)}")
    print(f"  totalOTHours (manual) = {round(total_ot_hrs, 2)}")
    print(f"  sundayCount=4, sundayHrs = 4 * {shift_hrs} = {sunday_hrs}")
    print(f"  paidLeaveHrs = 1 * {shift_hrs} = {paid_leave_hrs}")
    print(f"  totalHrs (manual) = {round(total_base_hrs, 2)} + {sunday_hrs} + {round(total_ot_hrs, 2)} + {paid_leave_hrs} = {round(total_hrs_manual, 2)}")
    print(f"  grossSalary (manual) = {hourly_rate} * {round(total_hrs_manual, 2)} = {gross_manual}")
    print(f"\n  STORED gross = {gross}")
    print(f"  MANUAL gross = {gross_manual}")
    print(f"  DIFFERENCE = {round(gross_manual - gross, 2)}")

conn.close()
