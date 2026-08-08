#!/usr/bin/env python3
"""
Verify payroll & leave calculations for July 2026.
Query the local SQLite DB and compare with what the code SHOULD produce.
"""
import sqlite3
import os
from datetime import date, timedelta

DB_PATH = '/home/z/my-project/db/custom.db'

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

YEAR = 2026
MONTH = 7  # July
DAYS_IN_MONTH = 31

# ─── 1. Find employees with July 2026 payroll records ───
print("=" * 80)
print("EMPLOYEES WITH JULY 2026 PAYROLL")
print("=" * 80)
cur.execute("""
    SELECT p.employeeId, e.fullName, e.firm, e.monthlySalary, e.shiftHours,
           e.shiftStart, e.shiftEnd, e.relievingDate,
           p.presentDays, p.absentDays, p.paidLeaves, p.grossSalary, p.netSalary,
           p.totalHrs, p.totalWorkedHrs, p.otHours, p.sundayHrs, p.sundayCount
    FROM Payroll p
    JOIN Employee e ON p.employeeId = e.employeeId
    WHERE p.month = 7 AND p.year = 2026
    ORDER BY e.firm, e.fullName
    LIMIT 10
""")
payroll_rows = cur.fetchall()
for r in payroll_rows:
    print(f"\n--- {r['employeeId']} | {r['fullName']} | firm={r['firm']} ---")
    print(f"  monthlySalary={r['monthlySalary']}, shiftHours={r['shiftHours']}, shift={r['shiftStart']}-{r['shiftEnd']}")
    print(f"  STORED payroll: present={r['presentDays']}, absent={r['absentDays']}, paidLeaves={r['paidLeaves']}")
    print(f"  STORED payroll: grossSalary={r['grossSalary']}, netSalary={r['netSalary']}, totalHrs={r['totalHrs']}")
    print(f"  STORED payroll: totalWorkedHrs={r['totalWorkedHrs']}, otHours={r['otHours']}, sundayHrs={r['sundayHrs']}, sundayCount={r['sundayCount']}")

# ─── 2. For first 3 employees, dump their July attendance + leaves ───
print("\n" + "=" * 80)
print("DETAILED ATTENDANCE + LEAVES FOR FIRST 3 EMPLOYEES")
print("=" * 80)

for r in payroll_rows[:3]:
    emp_id = r['employeeId']
    print(f"\n{'='*80}")
    print(f"EMPLOYEE: {emp_id} | {r['fullName']} | firm={r['firm']} | salary={r['monthlySalary']} | shift={r['shiftHours']}h ({r['shiftStart']}-{r['shiftEnd']})")
    print(f"{'='*80}")

    # Attendance
    cur.execute("""
        SELECT date, checkIn, checkOut, totalHours, overtimeHours, status, halfDay, lateEntry, earlyOut, isSunday
        FROM Attendance
        WHERE employeeId = ? AND date >= '2026-07-01' AND date < '2026-08-01'
        ORDER BY date
    """, (emp_id,))
    att_rows = cur.fetchall()

    print(f"\nATTENDANCE ({len(att_rows)} records):")
    print(f"  {'Date':<12} {'CheckIn':<8} {'CheckOut':<8} {'TotalHrs':<10} {'OT':<5} {'Status':<12} {'HalfDay':<7} {'Late':<5} {'Early':<5} {'Sun':<4}")
    for a in att_rows:
        print(f"  {a['date']:<12} {a['checkIn'] or '-':<8} {a['checkOut'] or '-':<8} {a['totalHours'] or 0:<10} {a['overtimeHours'] or 0:<5} {a['status']:<12} {str(a['halfDay']):<7} {str(a['lateEntry']):<5} {str(a['earlyOut']):<5} {str(a['isSunday']):<4}")

    # Leaves
    cur.execute("""
        SELECT id, startDate, endDate, type, status, reason
        FROM Leave
        WHERE employeeId = ? AND status = 'approved'
          AND startDate < '2026-08-01' AND endDate >= '2026-07-01'
        ORDER BY startDate
    """, (emp_id,))
    leave_rows = cur.fetchall()

    print(f"\nLEAVES ({len(leave_rows)} approved, overlapping July):")
    for l in leave_rows:
        print(f"  {l['startDate']} to {l['endDate']} | type={l['type']} | reason={l['reason']}")

    # Holidays in July 2026
    cur.execute("""
        SELECT date, name FROM Holiday
        WHERE date >= '2026-07-01' AND date < '2026-08-01'
        ORDER BY date
    """)
    holiday_rows = cur.fetchall()
    print(f"\nHOLIDAYS in July 2026:")
    for h in holiday_rows:
        print(f"  {h['date']} | {h['name']}")

conn.close()
