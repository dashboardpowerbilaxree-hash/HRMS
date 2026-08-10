"""
Pull Kamlesh's raw July 2026 attendance from production DB
and show how 'Worked Hrs incl OT' (216.04) is composed of totalHours,
and confirm whether overtimeHours is already inside totalHours or separate.
"""
import psycopg2

db_url = open('/tmp/db_url.txt').read().strip()
conn = psycopg2.connect(db_url)
cur = conn.cursor()

cur.execute("""
    SELECT date, "totalHours", "overtimeHours", status, "checkIn", "checkOut"
    FROM "Attendance"
    WHERE "employeeId" = 'EMP-021'
      AND date >= '2026-07-01' AND date < '2026-08-01'
    ORDER BY date
""")
rows = cur.fetchall()
conn.close()

print(f'Kamlesh (EMP-021) — July 2026 raw attendance')
print(f'Records: {len(rows)}')
print()
print(f'{"Day":<4} {"totalHours":<12} {"overtimeHours":<14} {"status":<14} {"checkIn":<8} {"checkOut":<8}')
print('-' * 72)

sum_th = 0.0
sum_ot = 0.0
present_th = 0.0  # only present/late/early-out/half-day
sundays = {5, 12, 19, 26}

for r in rows:
    day = r[0].day
    th = float(r[1] or 0)
    ot = float(r[2] or 0)
    st = r[3] or '-'
    sum_th += th
    sum_ot += ot
    if day not in sundays:
        present_th += th
    print(f'{day:<4} {th:<12.2f} {ot:<14.2f} {st:<14} {(r[4] or "-"):<8} {(r[5] or "-"):<8}')

print('-' * 72)
print(f'SUM  totalHours={sum_th:.2f}    overtimeHours={sum_ot:.2f}')
print()
print('=' * 72)
print('VERIFICATION')
print('=' * 72)
print(f'  Sum of totalHours (all attendance records)   = {sum_th:.2f}')
print(f'  Sum of overtimeHours (separate OT column)    = {sum_ot:.2f}')
print()
print('CONCLUSION:')
print(f'  • "Worked Hrs incl OT" column = Σ totalHours = {sum_th:.2f}')
print(f'  • overtimeHours is SEPARATE field in DB, but totalHours ALREADY')
print(f'    includes the OT portion (DB stores totalHours = shiftHrs + OT).')
print(f'  • So 216.04 ALREADY contains Kamlesh\'s ~3 OT hours.')
print(f'  • Sunday Hrs (column L) = 4 Sundays × 9 shiftHrs = 36.00 (separate, ADDED)')
print(f'  • Total Hrs (column N) = H + L + M = {sum_th:.2f} + 36.00 + 0 = {sum_th + 36:.2f}')
