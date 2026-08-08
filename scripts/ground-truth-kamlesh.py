#!/usr/bin/env python3
"""Ground-truth audit for Kamlesh (EMP-021) July 2026."""
import psycopg2
from datetime import date, timedelta
import calendar

DB_URL = open('/tmp/db_url.txt').read().strip()
conn = psycopg2.connect(DB_URL)
cur = conn.cursor()

emp_id = 'EMP-021'
YEAR = 2026
MONTH = 7
DAYS = 31

cur.execute("""SELECT "fullName", "monthlySalary", "shiftHours", "shiftStart", "shiftEnd" FROM "Employee" WHERE "employeeId" = %s""", (emp_id,))
emp = cur.fetchone()
print(f"Employee: {emp[0]}, salary={emp[1]}, shift={emp[2]}h ({emp[3]}-{emp[4]})")
shift_hrs = emp[2]

sundays = sorted(d for d in range(1, DAYS+1) if calendar.weekday(YEAR, MONTH, d) == 6)
print(f"\nSundays in July 2026: {sundays} (count={len(sundays)})")

cur.execute("""SELECT date, name FROM "Holiday" WHERE date >= '2026-07-01' AND date < '2026-08-01' ORDER BY date""")
holidays = cur.fetchall()
holiday_days = sorted(h[0].day for h in holidays)
print(f"Holidays in July 2026: {holiday_days} ({len(holidays)})")

working_days = DAYS - len(sundays) - len(holidays)
print(f"Working days (excl Sun+Holiday): {working_days}")

cur.execute("""
    SELECT date, "checkIn", "checkOut", "totalHours", "overtimeHours", status, "halfDay", "lateEntry", "earlyOut", "isSunday"
    FROM "Attendance"
    WHERE "employeeId" = %s AND date >= '2026-07-01' AND date < '2026-08-01'
    ORDER BY date
""", (emp_id,))
attendance = cur.fetchall()

print(f"\n{'='*100}")
print(f"DAY-BY-DAY ATTENDANCE — JULY 2026")
print(f"{'='*100}")
print(f"{'Day':<5} {'Date':<12} {'DayName':<10} {'CheckIn':<8} {'CheckOut':<8} {'TotHrs':<8} {'OT':<5} {'Status':<12} {'Half':<5} {'Sun':<4} {'Category':<15}")
print("-" * 100)

present_days = []
half_days = []
absent_days = []
sunday_days = []

for a in attendance:
    adate = a[0]
    day = adate.day
    day_name = calendar.day_name[adate.weekday()]
    checkin = a[1] or '-'
    checkout = a[2] or '-'
    tothrs = a[3] or 0
    ot = a[4] or 0
    status = a[5]
    half = a[6]
    issun = a[9]

    if day in sundays:
        cat = "SUNDAY"
        sunday_days.append(day)
    elif status == 'absent':
        cat = "ABSENT"
        absent_days.append(day)
    elif status in ('half-day', 'half_day'):
        cat = "HALF-DAY"
        half_days.append(day)
    elif status in ('present', 'late', 'early-out'):
        cat = "PRESENT"
        present_days.append(day)
    else:
        cat = f"OTHER({status})"

    print(f"{day:<5} {str(adate)[:10]:<12} {day_name:<10} {checkin:<8} {checkout:<8} {tothrs:<8.2f} {ot:<5.2f} {status:<12} {str(half):<5} {str(issun):<4} {cat:<15}")

# Leaves
cur.execute("""
    SELECT "startDate", "endDate", type, status, reason
    FROM "Leave"
    WHERE "employeeId" = %s AND status = 'approved'
      AND "startDate" < '2026-08-01' AND "endDate" >= '2026-07-01'
    ORDER BY "startDate"
""", (emp_id,))
leaves = cur.fetchall()

leave_days_july = set()
for l in leaves:
    ls, le, ltype, lstatus, lreason = l
    print(f"\nLeave: {ls.date()} to {le.date()}, type={ltype}, reason={lreason}")
    d = ls
    while d <= le:
        if d.month == 7 and d.year == 2026:
            leave_days_july.add(d.day)
        d += timedelta(days=1)

actual_leave_days = []
actual_absent_days = list(absent_days)
for ld in sorted(leave_days_july):
    if ld in sundays or ld in holiday_days:
        print(f"  July {ld}: Leave but falls on Sun/Holiday -> skip")
        continue
    if ld in present_days or ld in half_days:
        print(f"  July {ld}: Leave but employee was present/half-day -> attendance takes priority")
        continue
    if ld in actual_absent_days:
        actual_absent_days.remove(ld)
    actual_leave_days.append(ld)
    print(f"  July {ld}: Leave day, employee absent -> classified as LEAVE")

print(f"\n{'='*100}")
print(f"GROUND TRUTH SUMMARY — JULY 2026")
print(f"{'='*100}")
print(f"  Total days in month:     {DAYS}")
print(f"  Sundays:                 {len(sundays)} ({sundays})")
print(f"  Holidays:                {len(holidays)} ({holiday_days})")
print(f"  Working days:            {working_days}")
print(f"  Present days:            {len(present_days)} ({sorted(present_days)})")
print(f"  Half-days:               {len(half_days)} ({sorted(half_days)})")
print(f"  Absent days (no leave):  {len(actual_absent_days)} ({sorted(actual_absent_days)})")
print(f"  Leave days (unpaid):     {len(actual_leave_days)} ({sorted(actual_leave_days)})")
print(f"  Sunday days:             {len(sunday_days)} ({sorted(sunday_days)})")
total_count = len(present_days)+len(half_days)+len(actual_absent_days)+len(actual_leave_days)+len(sunday_days)
print(f"  CHECK: present+half+absent+leave+sunday = {total_count} (should be {DAYS})")

total_worked_hrs = sum((a[3] or 0) for a in attendance if a[5] in ('present', 'late', 'early-out', 'half-day', 'half_day'))
total_base_hrs = sum((a[3] or 0) - (a[4] or 0) for a in attendance if a[5] in ('present', 'late', 'early-out', 'half-day', 'half_day'))
total_ot_hrs = sum((a[4] or 0) for a in attendance if a[5] in ('present', 'late', 'early-out', 'half-day', 'half_day'))
sunday_hrs = len(sundays) * shift_hrs

print(f"\n  Total Worked Hrs (base+OT):  {total_worked_hrs:.2f}")
print(f"  Total Base Hrs (no OT):      {total_base_hrs:.2f}")
print(f"  Total OT Hrs:                {total_ot_hrs:.2f}")
print(f"  Sunday Hrs ({len(sundays)} x {shift_hrs}h):     {sunday_hrs:.2f}")
print(f"  Total Hrs incl Sun (no OT):  {total_base_hrs + sunday_hrs:.2f}")
print(f"  Total Hrs (base+OT+Sun):     {total_base_hrs + total_ot_hrs + sunday_hrs:.2f}")

cur.execute("""SELECT "paidLeaves", "absentDays", "presentDays", "grossSalary", "netSalary", "totalHrs", "totalWorkedHrs", "otHours", "sundayHrs" FROM "Payroll" WHERE "employeeId" = %s AND month = 7 AND year = 2026""", (emp_id,))
p = cur.fetchone()
print(f"\n{'='*100}")
print(f"STORED PAYROLL — JULY 2026")
print(f"{'='*100}")
if p:
    print(f"  paidLeaves    = {p[0]}")
    print(f"  absentDays    = {p[1]}")
    print(f"  presentDays   = {p[2]}")
    print(f"  grossSalary   = {p[3]}")
    print(f"  netSalary     = {p[4]}")
    print(f"  totalHrs      = {p[5]}")
    print(f"  totalWorkedHrs= {p[6]}")
    print(f"  otHours       = {p[7]}")
    print(f"  sundayHrs     = {p[8]}")

    print(f"\n  DISCREPANCIES:")
    if p[1] != len(actual_absent_days):
        print(f"    X absentDays: stored={p[1]}, truth={len(actual_absent_days)}")
    if p[0] != len(actual_leave_days):
        print(f"    X paidLeaves: stored={p[0]}, truth={len(actual_leave_days)}")
    truth_total_hrs = total_base_hrs + sunday_hrs + total_ot_hrs
    if abs(p[5] - round(truth_total_hrs, 2)) > 0.1:
        print(f"    X totalHrs: stored={p[5]}, truth={round(truth_total_hrs, 2)}")

conn.close()
