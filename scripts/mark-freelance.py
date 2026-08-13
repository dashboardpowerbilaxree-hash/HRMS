"""
Update 3 employees (EMP-011, EMP-034, EMP-026) to mark them as 'Freelance'.
Only employmentType is changed — all other fields (salary, shift, etc.) are
preserved exactly as they are.

Per user instruction: "baki koi data ched chad nahi hona chahiye"
We send the FULL employee body back to PUT /api/employees/[id] with only
the employmentType field flipped. Salary and shiftHours are unchanged, so
the auto-regen-on-salary-change logic in the PUT route will NOT trigger
(employmentType change alone doesn't trigger regen).
"""
import json
import urllib.request

BASE = 'https://hrms.laxree.com'
TARGETS = ['EMP-011', 'EMP-034', 'EMP-026']

for eid in TARGETS:
    # 1. Fetch current employee data
    with urllib.request.urlopen(f'{BASE}/api/employees/{eid}') as r:
        emp = json.load(r)

    print(f'\n=== {eid} — {emp["fullName"]} ===')
    print(f'  Before: employmentType = {emp["employmentType"]}')

    # 2. Build the update body — preserve ALL fields, only flip employmentType
    # Match the field names expected by PUT /api/employees/[employeeId]/route.ts
    body = {
        'fullName': emp['fullName'],
        'mobile': emp.get('mobile'),
        'email': emp.get('email'),
        'firm': emp.get('firm'),
        'department': emp.get('department') or emp.get('firm'),
        'location': emp.get('location'),
        'salaryType': emp.get('salaryType', 'hourly'),
        'monthlySalary': emp['monthlySalary'],
        'shiftHours': emp['shiftHours'],
        'shiftStart': emp.get('shiftStart'),
        'shiftEnd': emp.get('shiftEnd'),
        'employmentType': 'Freelance',  # ← THE ONLY CHANGE
        'designation': emp.get('designation'),
        'gender': emp.get('gender'),
        'dateOfBirth': emp.get('dateOfBirth'),
        'joiningDate': emp.get('joiningDate'),
        'relievingDate': emp.get('relievingDate'),
        'address': emp.get('address'),
        'bankName': emp.get('bankName'),
        'bankAccount': emp.get('bankAccount'),
        'bankIfsc': emp.get('bankIfsc'),
        'panNumber': emp.get('panNumber'),
        'aadhaarNumber': emp.get('aadhaarNumber'),
        'pfNumber': emp.get('pfNumber'),
        'esiNumber': emp.get('esiNumber'),
        'status': emp.get('status', 'Yes'),
        'reportingManager': emp.get('reportingManager'),
        'emergencyContact': emp.get('emergencyContact'),
    }

    # 3. Send PUT request
    req = urllib.request.Request(
        f'{BASE}/api/employees/{eid}',
        data=json.dumps(body).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='PUT',
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            updated = json.loads(r.read().decode('utf-8'))
        print(f'  After : employmentType = {updated.get("employmentType")}')
        print(f'  Salary (preserved): {updated.get("monthlySalary")}')
        print(f'  Shift Hrs (preserved): {updated.get("shiftHours")}')
        print(f'  Shift (preserved): {updated.get("shiftStart")}–{updated.get("shiftEnd")}')
        # Verify NO other field changed unexpectedly
        diffs = []
        for k in ['monthlySalary', 'shiftHours', 'shiftStart', 'shiftEnd',
                  'salaryType', 'firm', 'location', 'designation', 'status']:
            before = emp.get(k)
            after = updated.get(k)
            if before != after:
                diffs.append(f'{k}: {before!r} → {after!r}')
        if diffs:
            print(f'  ⚠ UNEXPECTED CHANGES: {diffs}')
        else:
            print(f'  ✓ All other fields preserved (no data changes)')
    except urllib.error.HTTPError as e:
        body_text = e.read().decode('utf-8')
        print(f'  ✗ HTTPError {e.code}: {body_text[:500]}')

print('\n' + '='*60)
print('VERIFICATION — re-fetch all 3 employees')
print('='*60)
for eid in TARGETS:
    with urllib.request.urlopen(f'{BASE}/api/employees/{eid}') as r:
        e = json.load(r)
    print(f'  {eid} | {e["fullName"]:25} | {e["firm"]:5} | {e.get("designation"):15} | employmentType = {e["employmentType"]}')
