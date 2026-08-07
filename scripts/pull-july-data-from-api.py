"""Fetch all 42 employees' data from the production API and rebuild july_data.json.
This ensures we use the SAME status recomputation logic as the HRMS UI.
"""
import json
import urllib.request
import ssl
import calendar

YEAR = 2026
MONTH = 7
DAYS = calendar.monthrange(YEAR, MONTH)[1]
sundays = sorted(d for d in range(1, DAYS+1) if calendar.weekday(YEAR, MONTH, d) == 6)

ctx = ssl.create_default_context()

# Get all active employees from the payroll generate-all endpoint
print("Fetching payroll data for all employees...")
url = "https://hrms.laxree.com/api/payroll/generate-all"
req = urllib.request.Request(url, data=json.dumps({"month": MONTH, "year": YEAR}).encode(),
                             headers={"Content-Type": "application/json"}, method="POST")
with urllib.request.urlopen(req, context=ctx, timeout=120) as r:
    payroll_data = json.loads(r.read())
print(f"  Payroll generated for {payroll_data['generated']} employees, {payroll_data['errors']} errors")

# Now fetch monthly-summary for each employee (this has the recomputed statuses)
print(f"\nFetching monthly-summary for all {len(payroll_data['results'])} employees...")
results = []
for i, p in enumerate(payroll_data['results']):
    emp_id = p['employeeId']
    url = f"https://hrms.laxree.com/api/attendance/monthly-summary?employeeId={emp_id}&month={MONTH}&year={YEAR}"
    try:
        with urllib.request.urlopen(url, context=ctx, timeout=30) as r:
            d = json.loads(r.read())
        
        emp = d['employee']
        records = d.get('records', [])
        
        # Count statuses from API records (already recomputed)
        present_days = d.get('presentDays', 0)
        absent_days = d.get('absentDays', 0)
        half_days = d.get('halfDays', 0)
        
        # Worked hours including OT = totalWorkHours (from API)
        worked_hrs_incl_ot = d.get('totalWorkHours', 0)
        ot_hrs = d.get('totalOvertimeHours', 0)
        
        # Sunday hours = PAID Sunday hours (sundays × shiftHours)
        sunday_hrs = d.get('totalSundayHours', 0)
        num_sundays = d.get('sundays', 0)
        
        # Total Hrs = workedHrsInclOT + sundayHrs (per user spec)
        # Note: API's totalHrs includes OT separately, but our Excel spec is:
        #   H = Worked Hrs incl OT (already has OT)
        #   I = Additional hrs (Sunday Hrs)
        #   J = Total Hrs = H + I
        total_hrs = worked_hrs_incl_ot + sunday_hrs
        
        # Sl/Hr = monthlySalary / (daysInMonth × shiftHours)
        monthly_salary = emp.get('monthlySalary', 0)
        shift_hours = emp.get('shiftHours', 9)
        sl_per_hr = monthly_salary / (DAYS * shift_hours) if shift_hours > 0 else 0
        
        # Gross = totalHrs × slPerHr
        gross_salary = total_hrs * sl_per_hr
        
        # Get absent day list from records
        absent_day_list = []
        for rec in records:
            rec_date = rec.get('date', '')
            if rec.get('status') == 'absent':
                # Extract day from ISO date
                try:
                    day = int(rec_date.split('T')[0].split('-')[2])
                    absent_day_list.append(day)
                except:
                    pass
        
        # Daily status codes for attendance tracker
        daily_codes = {}
        for rec in records:
            rec_date = rec.get('date', '')
            try:
                day = int(rec_date.split('T')[0].split('-')[2])
            except:
                continue
            status = rec.get('status', '')
            is_sunday = rec.get('isSunday', False)
            if is_sunday:
                daily_codes[day] = 'S'
            elif status == 'present':
                daily_codes[day] = 'P'
            elif status == 'late':
                daily_codes[day] = 'L'
            elif status == 'early-out':
                daily_codes[day] = 'E'
            elif status == 'half-day' or status == 'half_day':
                daily_codes[day] = 'H'
            elif status == 'absent':
                daily_codes[day] = 'A'
            else:
                daily_codes[day] = '?'
        
        results.append({
            'employeeId': emp_id,
            'fullName': emp.get('fullName', p['name']),
            'firm': emp.get('firm', ''),
            'location': emp.get('location', ''),
            'monthlySalary': monthly_salary,
            'shiftHours': shift_hours,
            'shiftStart': emp.get('shiftStart', ''),
            'shiftEnd': emp.get('shiftEnd', ''),
            'salaryType': emp.get('salaryType', 'hourly'),
            'employmentType': emp.get('employmentType', 'Full Time'),
            'presentDays': present_days,
            'halfDays': half_days,
            'absentDays': absent_days,
            'absentDayList': sorted(absent_day_list),
            'leaveDays': d.get('paidLeaves', 0),  # total leave count for display
            'workedHrsInclOT': round(worked_hrs_incl_ot, 2),
            'otHrs': round(ot_hrs, 2),
            'sundayHrs': sunday_hrs,
            'numSundays': num_sundays,
            'totalHrs': round(total_hrs, 2),
            'slPerHr': round(sl_per_hr, 4),
            'grossSalary': round(gross_salary, 2),
            'dailyCodes': daily_codes,
            'netSalaryFromPayroll': p.get('netSalary', 0),
        })
        
        if (i + 1) % 10 == 0:
            print(f"  ... {i+1}/{len(payroll_data['results'])}")
    except Exception as e:
        print(f"  ⚠ {emp_id} ({p['name']}): {e}")

print(f"\nGot data for {len(results)} employees")

# Sort by firm, then fullName
results.sort(key=lambda e: (e['firm'] or '~', e['fullName']))

# Save
output = {
    'meta': {
        'year': YEAR,
        'month': MONTH,
        'daysInMonth': DAYS,
        'sundays': sundays,
        'numSundays': len(sundays),
        'holidays': [],
        'numHolidays': 0,
        'workingDays': DAYS - len(sundays),
        'source': 'production API (https://hrms.laxree.com)',
    },
    'employees': results,
}

with open('/home/z/my-project/scripts/july_data.json', 'w') as f:
    json.dump(output, f, indent=2, default=str)

# Print summary
print(f"\n{'='*120}")
print(f"ALL {len(results)} EMPLOYEES — July 2026 (from production API)")
print(f"{'='*120}")
print(f"{'EmpID':<10} {'Name':<25} {'Firm':<6} {'Sal':<8} {'P':>3} {'H':>3} {'A':>3} {'Sun':>4} {'Days':>5} {'WrkHrs':<8} {'OT':<6} {'SunHrs':<7} {'TotHrs':<8} {'Gross':<10}")
print("-" * 120)
for r in results:
    days_sum = r['presentDays'] + r['halfDays'] + r['absentDays'] + r['numSundays']
    print(f"{r['employeeId']:<10} {r['fullName'][:24]:<25} {r['firm'] or '-':<6} {r['monthlySalary']:<8.0f} {r['presentDays']:>3} {r['halfDays']:>3} {r['absentDays']:>3} {r['numSundays']:>4} {days_sum:>5} {r['workedHrsInclOT']:<8.2f} {r['otHrs']:<6.2f} {r['sundayHrs']:<7.0f} {r['totalHrs']:<8.2f} {r['grossSalary']:<10.2f}")

# Verify all days sum to 31
print(f"\nDays sum check (P + H + A + Sundays should = {DAYS}):")
bad = 0
for r in results:
    days_sum = r['presentDays'] + r['halfDays'] + r['absentDays'] + r['numSundays']
    if days_sum != DAYS:
        print(f"  ⚠ {r['employeeId']} ({r['fullName']}): {days_sum} ≠ {DAYS}")
        bad += 1
if bad == 0:
    print(f"  ✓ All {len(results)} employees: days sum = {DAYS}")

# Show Mayank specifically
print(f"\nMayank Agarwal (EMP-026) — was the discrepancy:")
m = next((e for e in results if e['employeeId'] == 'EMP-026'), None)
if m:
    print(f"  Present: {m['presentDays']}, Half: {m['halfDays']}, Absent: {m['absentDays']}, Sundays: {m['numSundays']}")
    print(f"  Days sum: {m['presentDays']+m['halfDays']+m['absentDays']+m['numSundays']}")
    print(f"  Shift: {m['shiftStart']}-{m['shiftEnd']} ({m['shiftHours']}h)")
    print(f"  Worked Hrs incl OT: {m['workedHrsInclOT']}, Sunday Hrs: {m['sundayHrs']}, Total: {m['totalHrs']}")
