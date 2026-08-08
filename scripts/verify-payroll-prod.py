#!/usr/bin/env python3
"""
Verify July 2026 payroll & leave data in PRODUCTION Neon PostgreSQL DB.
Identify discrepancies between stored attendance/leaves/payroll.
"""
import psycopg2
import os
from datetime import date, timedelta

DB_URL = open('/tmp/db_url.txt').read().strip()

conn = psycopg2.connect(DB_URL)
conn.autocommit = True
cur = conn.cursor()

YEAR = 2026
MONTH = 7  # July
DAYS_IN_MONTH = 31

# ─── 1. Find employees with July 2026 payroll records ───
print("=" * 90)
print("JULY 2026 PAYROLL SUMMARY (first 15 employees)")
print("=" * 90)
cur.execute("""
    SELECT p."employeeId", e."fullName", e.firm, e."monthlySalary", e."shiftHours",
           e."shiftStart", e."shiftEnd", e."relievingDate",
           p."presentDays", p."absentDays", p."paidLeaves",
           p."grossSalary", p."netSalary", p."totalHrs", p."totalWorkedHrs",
           p."otHours", p."sundayHrs", p."sundayCount"
    FROM "Payroll" p
    JOIN "Employee" e ON p."employeeId" = e."employeeId"
    WHERE p.month = 7 AND p.year = 2026
    ORDER BY e.firm, e."fullName"
    LIMIT 15
""")
payroll_rows = cur.fetchall()
print(f"Found {len(payroll_rows)} employees with July 2026 payroll")
for r in payroll_rows:
    emp_id, name, firm, salary, shifthrs, sstart, send, rel, present, absent, paidleaves, gross, net, tothrs, totworked, ot, sunhrs, suncount = r
    print(f"\n{emp_id} | {name} | {firm} | salary={salary} | shift={shifthrs}h ({sstart}-{send})")
    print(f"  STORED payroll: present={present}, absent={absent}, paidLeaves={paidleaves}")
    print(f"  STORED payroll: gross={gross}, net={net}, totalHrs={tothrs}, workedHrs={totworked}, ot={ot}, sunHrs={sunhrs}, sunCount={suncount}")

# ─── 2. For first 5 employees, dump detailed attendance + leaves ───
print("\n" + "=" * 90)
print("DETAILED ATTENDANCE + LEAVES FOR FIRST 5 EMPLOYEES (July 2026)")
print("=" * 90)

# Get holidays
cur.execute("""
    SELECT date, name FROM "Holiday"
    WHERE date >= '2026-07-01' AND date < '2026-08-01'
    ORDER BY date
""")
holiday_rows = cur.fetchall()
holiday_days = set()
print(f"\nHOLIDAYS in July 2026:")
for h in holiday_rows:
    hdate = h[0]
    hday = hdate.day if hasattr(hdate, 'day') else int(str(hdate)[8:10])
    holiday_days.add(hday)
    print(f"  Day {hday}: {h[1]}")

# Sundays in July 2026
import calendar
sundays = [d for d in range(1, DAYS_IN_MONTH+1) if calendar.weekday(YEAR, MONTH, d) == 6]
print(f"\nSUNDAYS in July 2026: {sundays}")

for r in payroll_rows[:5]:
    emp_id = r[0]
    print(f"\n{'='*90}")
    print(f"EMPLOYEE: {emp_id} | {r[1]} | firm={r[2]} | salary={r[3]} | shift={r[4]}h ({r[5]}-{r[6]})")
    print(f"  STORED: present={r[8]}, absent={r[9]}, paidLeaves={r[10]}, gross={r[11]}, net={r[12]}")
    print(f"{'='*90}")

    # Attendance
    cur.execute("""
        SELECT date, "checkIn", "checkOut", "totalHours", "overtimeHours", status, "halfDay",
               "lateEntry", "earlyOut", "isSunday"
        FROM "Attendance"
        WHERE "employeeId" = %s AND date >= '2026-07-01' AND date < '2026-08-01'
        ORDER BY date
    """, (emp_id,))
    att_rows = cur.fetchall()

    print(f"\nATTENDANCE ({len(att_rows)} records):")
    print(f"  {'Date':<12} {'CheckIn':<8} {'CheckOut':<8} {'TotHrs':<8} {'OT':<5} {'Status':<12} {'Half':<5} {'Late':<5} {'Early':<5} {'Sun':<4}")
    present_count = 0
    half_count = 0
    absent_count = 0
    for a in att_rows:
        adate = a[0]
        aday = adate.day if hasattr(adate, 'day') else int(str(adate)[8:10])
        checkin = a[1] or '-'
        checkout = a[2] or '-'
        tothrs = a[3] or 0
        ot = a[4] or 0
        status = a[5] or ''
        half = a[6]
        late = a[7]
        early = a[8]
        issun = a[9]
        print(f"  Day {aday:<8} {checkin:<8} {checkout:<8} {tothrs:<8} {ot:<5} {status:<12} {str(half):<5} {str(late):<5} {str(early):<5} {str(issun):<4}")
        if status in ('present', 'late', 'early-out'):
            present_count += 1
        elif status in ('half-day', 'half_day'):
            half_count += 1
        elif status == 'absent':
            absent_count += 1

    print(f"\n  COUNTS from attendance records: present={present_count}, half={half_count}, absent={absent_count}")

    # Leaves
    cur.execute("""
        SELECT id, "startDate", "endDate", type, status, reason
        FROM "Leave"
        WHERE "employeeId" = %s AND status = 'approved'
          AND "startDate" < '2026-08-01' AND "endDate" >= '2026-07-01'
        ORDER BY "startDate"
    """, (emp_id,))
    leave_rows = cur.fetchall()

    print(f"\nLEAVES ({len(leave_rows)} approved, overlapping July):")
    leave_days = set()
    for l in leave_rows:
        ls = l[1]
        le = l[2]
        print(f"  {ls} to {le} | type={l[3]} | reason={l[5]}")
        # Expand to individual days
        cur_date = ls
        while cur_date <= le:
            cday = cur_date.day if hasattr(cur_date, 'day') else int(str(cur_date)[8:10])
            cmonth = cur_date.month if hasattr(cur_date, 'month') else int(str(cur_date)[5:7])
            if cmonth == 7:
                leave_days.add(cday)
            cur_date += timedelta(days=1)
    print(f"  Leave days in July: {sorted(leave_days)}")

    # Manual leave count (excluding Sundays, holidays, and days employee was present)
    cur.execute("""
        SELECT date, status FROM "Attendance"
        WHERE "employeeId" = %s AND date >= '2026-07-01' AND date < '2026-08-01'
    """, (emp_id,))
    present_dates = set()
    for a in cur.fetchall():
        adate = a[0]
        aday = adate.day if hasattr(adate, 'day') else int(str(adate)[8:10])
        if a[1] in ('present', 'late', 'early-out', 'half-day', 'half_day'):
            present_dates.add(aday)

    manual_leaves = 0
    for d in leave_days:
        if d in sundays:
            continue
        if d in holiday_days:
            continue
        if d in present_dates:
            continue
        manual_leaves += 1
    print(f"\n  MANUAL leave count (excluding Sun/Holiday/present): {manual_leaves}")
    print(f"  STORED paidLeaves in payroll: {r[10]}")

conn.close()
