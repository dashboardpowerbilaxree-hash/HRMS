#!/usr/bin/env python3
"""
Check Kamlesh's July 2026 attendance + leaves to understand
the discrepancy between "Leave" column (1) and expected (3).
"""
import psycopg2, json
from collections import defaultdict

DB_URL = open("/tmp/db_url.txt").read().strip()

conn = psycopg2.connect(DB_URL)
cur = conn.cursor()

# 1. Find Kamlesh
cur.execute("""
    SELECT id, "employeeId", "fullName", "shiftHours", "shiftStart", "shiftEnd", status
    FROM "Employee"
    WHERE "fullName" ILIKE '%kamlesh%'
""")
kam = cur.fetchall()
print("=== Kamlesh employees ===")
for k in kam:
    print(k)

emp_id, emp_code, emp_name, sh, ss, se, status = kam[0]
print(f"\nUsing: {emp_code} - {emp_name} (id={emp_id})")

# 2. Kamlesh's July 2026 attendance records
print("\n=== July 2026 attendance (raw) ===")
cur.execute("""
    SELECT date, status, "checkIn", "checkOut", "totalHours", "isSunday", "isHoliday"
    FROM "Attendance"
    WHERE "employeeId" = %s
      AND date >= '2026-07-01' AND date <= '2026-07-31'
    ORDER BY date
""", (emp_code,))
rows = cur.fetchall()
print(f"Total records: {len(rows)}")
absent_count = 0
for r in rows:
    date, st, ci, co, th, is_sun, is_hol = r
    marker = ""
    if st == 'absent':
        absent_count += 1
        marker = " <<ABSENT>>"
    print(f"  {date} | {st:12s} | in={ci} out={co} hrs={th} sun={is_sun} hol={is_hol}{marker}")
print(f"\nRaw absent count: {absent_count}")

# 3. Kamlesh's July 2026 Leave records
print("\n=== July 2026 Leave records ===")
cur.execute("""
    SELECT id, "startDate", "endDate", type, status, reason, days
    FROM "Leave"
    WHERE "employeeId" = %s
      AND "startDate" <= '2026-07-31'
      AND "endDate" >= '2026-07-01'
    ORDER BY "startDate"
""", (emp_code,))
leaves = cur.fetchall()
print(f"Total leave records: {len(leaves)}")
for lv in leaves:
    print(f"  {lv}")

# 4. Compute total leave days in July 2026
total_leave_days = 0
leave_dates = set()
for lv in leaves:
    lid, lstart, lend, ltype, lstatus, lreason, ldays = lv
    # Iterate days
    from datetime import date, timedelta
    cur_d = lstart
    end_d = lend
    while cur_d <= end_d:
        if date(2026,7,1) <= cur_d <= date(2026,7,31):
            leave_dates.add(cur_d.isoformat())
            total_leave_days += 1
        cur_d += timedelta(days=1)
print(f"\nTotal leave days in July 2026: {total_leave_days}")
print(f"Leave dates: {sorted(leave_dates)}")

# 5. For all 42 active employees, show absent vs leave counts
print("\n=== ALL 42 EMPLOYEES: absent days vs approved leave days (July 2026) ===")
cur.execute("""
    SELECT e.id, e."employeeId", e."fullName",
           COUNT(a.*) FILTER (WHERE a.status = 'absent') AS absent_count,
           COUNT(a.*) FILTER (WHERE a.status IN ('present','late','early-out','half-day','half_day')) AS present_count
    FROM "Employee" e
    LEFT JOIN "Attendance" a ON a."employeeId" = e."employeeId"
        AND a.date >= '2026-07-01' AND a.date <= '2026-07-31'
    WHERE e.status = 'Yes'
    GROUP BY e.id, e."employeeId", e."fullName"
    ORDER BY e."fullName"
""")
emps = cur.fetchall()
print(f"{'#':3} {'EmpCode':12} {'Name':30} {'Absent':7} {'Present':8} {'LeaveDays':10}")
for i, (eid, ec, nm, ab, pr) in enumerate(emps, 1):
    # Count leave days in July 2026 for this employee
    cur.execute("""
        SELECT "startDate", "endDate" FROM "Leave"
        WHERE "employeeId" = %s
          AND "startDate" <= '2026-07-31'
          AND "endDate" >= '2026-07-01'
    """, (ec,))
    lrows = cur.fetchall()
    ld = 0
    from datetime import date, timedelta
    for (ls, le_) in lrows:
        c = ls
        while c <= le_:
            if date(2026,7,1) <= c <= date(2026,7,31):
                ld += 1
            c += timedelta(days=1)
    flag = "  <-- mismatch" if (ab != ld and ab > 0) else ""
    print(f"{i:3} {ec:12} {nm[:30]:30} {ab or 0:<7} {pr or 0:<8} {ld:<10}{flag}")

cur.close()
conn.close()
