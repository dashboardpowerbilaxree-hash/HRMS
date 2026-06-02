#!/usr/bin/env python3
"""Generate Laxree Google Sheets Attendance Setup Guide PDF"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, KeepTogether, HRFlowable, ListFlowable, ListItem
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os

# ── Register fonts ──
pdfmetrics.registerFont(TTFont('NotoSansSC', '/usr/share/fonts/truetype/chinese/SarasaMonoSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC', '/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))

# ── Palette ──
ACCENT       = colors.HexColor('#24738d')
GOLD         = colors.HexColor('#D4A843')
DARK_BG      = colors.HexColor('#1a1a2e')
TEXT_PRIMARY  = colors.HexColor('#1e1d1b')
TEXT_MUTED    = colors.HexColor('#8c8880')
BG_SURFACE   = colors.HexColor('#e0ddd6')
BG_PAGE      = colors.HexColor('#eeece9')
TABLE_HEADER_COLOR = ACCENT
TABLE_HEADER_TEXT  = colors.white
TABLE_ROW_EVEN     = colors.white
TABLE_ROW_ODD      = BG_SURFACE

OUTPUT_DIR = '/home/z/my-project/download/'
OUTPUT_FILE = os.path.join(OUTPUT_DIR, 'Laxree_Google_Sheets_Attendance_Setup_Guide.pdf')

# ── Document setup ──
doc = SimpleDocTemplate(
    OUTPUT_FILE,
    pagesize=A4,
    leftMargin=2*cm,
    rightMargin=2*cm,
    topMargin=2*cm,
    bottomMargin=2*cm,
    title='Laxree Google Sheets Attendance Setup Guide',
    author='Laxree HR',
    subject='Step-by-step guide for Google Sheets attendance automation',
)

# ── Styles ──
styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    'CustomTitle', parent=styles['Title'],
    fontSize=28, leading=34, textColor=DARK_BG,
    fontName='NotoSansSC', spaceAfter=6, alignment=TA_CENTER,
)
subtitle_style = ParagraphStyle(
    'CustomSubtitle', parent=styles['Normal'],
    fontSize=14, leading=18, textColor=GOLD,
    fontName='NotoSansSC', spaceAfter=20, alignment=TA_CENTER,
)
h1_style = ParagraphStyle(
    'H1', parent=styles['Heading1'],
    fontSize=20, leading=26, textColor=DARK_BG,
    fontName='NotoSansSC', spaceBefore=24, spaceAfter=12,
    borderWidth=0, borderPadding=0,
)
h2_style = ParagraphStyle(
    'H2', parent=styles['Heading2'],
    fontSize=16, leading=22, textColor=ACCENT,
    fontName='NotoSansSC', spaceBefore=18, spaceAfter=8,
)
h3_style = ParagraphStyle(
    'H3', parent=styles['Heading3'],
    fontSize=13, leading=18, textColor=GOLD,
    fontName='NotoSansSC', spaceBefore=12, spaceAfter=6,
)
body_style = ParagraphStyle(
    'CustomBody', parent=styles['Normal'],
    fontSize=11, leading=16, textColor=TEXT_PRIMARY,
    fontName='NotoSansSC', spaceAfter=8,
    alignment=TA_JUSTIFY,
)
step_style = ParagraphStyle(
    'Step', parent=body_style,
    fontSize=11, leading=16, textColor=TEXT_PRIMARY,
    fontName='NotoSansSC', spaceAfter=8,
    leftIndent=20, bulletIndent=0,
    alignment=TA_LEFT,
)
note_style = ParagraphStyle(
    'Note', parent=body_style,
    fontSize=10, leading=14, textColor=TEXT_MUTED,
    fontName='NotoSansSC', spaceAfter=6,
    leftIndent=20, borderWidth=0,
    backColor=colors.HexColor('#f0f8ff'),
    borderPadding=8,
)
code_style = ParagraphStyle(
    'Code', parent=styles['Code'],
    fontSize=9, leading=13, textColor=colors.HexColor('#c7254e'),
    fontName='Courier', spaceAfter=6,
    leftIndent=20, backColor=colors.HexColor('#f9f2f4'),
    borderPadding=6,
)
bullet_style = ParagraphStyle(
    'Bullet', parent=body_style,
    fontSize=11, leading=16, textColor=TEXT_PRIMARY,
    fontName='NotoSansSC', spaceAfter=4,
    leftIndent=30, bulletIndent=15,
)

story = []

# ═══════════════════════════════════════════════════════════════
# COVER / TITLE PAGE
# ═══════════════════════════════════════════════════════════════

story.append(Spacer(1, 60))

# Gold line
story.append(HRFlowable(width="80%", thickness=2, color=GOLD, spaceAfter=20))

story.append(Paragraph('LAXREE', ParagraphStyle(
    'BrandTitle', parent=title_style,
    fontSize=36, textColor=GOLD, spaceAfter=4,
)))
story.append(Paragraph('HR & Salary Management Dashboard', title_style))
story.append(Spacer(1, 10))
story.append(Paragraph('Google Sheets Attendance Automation', subtitle_style))
story.append(Paragraph('Step-by-Step Setup Guide', ParagraphStyle(
    'SubSub', parent=subtitle_style,
    fontSize=12, textColor=TEXT_MUTED, spaceAfter=10,
)))

story.append(HRFlowable(width="80%", thickness=2, color=GOLD, spaceBefore=20, spaceAfter=30))

# Overview box
overview_data = [
    ['What This Guide Covers', ''],
    ['Create', 'Google Sheet with Master Employees + Daily Input sheets'],
    ['Install', 'Google Apps Script for auto-calculations (OT, Status, Hours)'],
    ['Connect', 'Link the sheet to your Laxree Dashboard for automatic sync'],
    ['Automate', 'Daily attendance data flows from Sheet to Dashboard seamlessly'],
]
overview_table = Table(overview_data, colWidths=[3*cm, 12*cm])
overview_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), DARK_BG),
    ('TEXTCOLOR', (0, 0), (-1, 0), GOLD),
    ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC'),
    ('FONTSIZE', (0, 0), (-1, 0), 12),
    ('FONTWEIGHT', (0, 0), (-1, 0), 'BOLD'),
    ('BACKGROUND', (0, 1), (0, -1), colors.HexColor('#f0f0f0')),
    ('FONTNAME', (0, 1), (-1, -1), 'NotoSansSC'),
    ('FONTSIZE', (0, 1), (-1, -1), 10),
    ('BACKGROUND', (1, 1), (1, -1), colors.white),
    ('TEXTCOLOR', (0, 1), (0, -1), ACCENT),
    ('FONTWEIGHT', (0, 1), (0, -1), 'BOLD'),
    ('ALIGN', (0, 0), (0, -1), 'CENTER'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
    ('ROWBACKGROUNDS', (1, 1), (1, -1), [colors.white, colors.HexColor('#fafafa')]),
    ('TOPPADDING', (0, 0), (-1, -1), 8),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ('LEFTPADDING', (0, 0), (-1, -1), 10),
]))
story.append(overview_table)

story.append(Spacer(1, 30))
story.append(Paragraph('Version 1.0  |  May 2026', ParagraphStyle(
    'Version', parent=body_style, alignment=TA_CENTER,
    textColor=TEXT_MUTED, fontSize=10,
)))

story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════
# TABLE OF CONTENTS
# ═══════════════════════════════════════════════════════════════

story.append(Paragraph('Table of Contents', h1_style))
story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=15))

toc_items = [
    ('1', 'Overview: How It Works'),
    ('2', 'Step 1: Create a Google Sheet'),
    ('3', 'Step 2: Add the Google Apps Script'),
    ('4', 'Step 3: Initialize the Sheet'),
    ('5', 'Step 4: Add Employees to Master Sheet'),
    ('6', 'Step 5: Generate Daily Attendance'),
    ('7', 'Step 6: Enter In Time / Out Time'),
    ('8', 'Step 7: Create Google Cloud Service Account'),
    ('9', 'Step 8: Share Sheet with Service Account'),
    ('10', 'Step 9: Connect Sheet to Laxree Dashboard'),
    ('11', 'Step 10: Sync Data (Pull from Sheet)'),
    ('12', 'Auto-Sync Setup (Optional)'),
    ('13', 'How Calculations Work'),
    ('14', 'Troubleshooting'),
]

for num, title in toc_items:
    story.append(Paragraph(
        f'<b>{num}.</b>  {title}',
        ParagraphStyle('TOC', parent=body_style, fontSize=12, leading=20, spaceAfter=4)
    ))

story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════
# SECTION 1: OVERVIEW
# ═══════════════════════════════════════════════════════════════

story.append(Paragraph('1. Overview: How It Works', h1_style))
story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=12))

story.append(Paragraph(
    'The Laxree Google Sheets Attendance Automation system creates a seamless bridge between your Google Sheet '
    'and the Laxree HR Dashboard. Instead of manually entering attendance one-by-one in the dashboard, HR staff '
    'can simply fill in In Time and Out Time in a familiar spreadsheet interface, and the data automatically '
    'syncs to the dashboard with all calculations (OT, work duration, status) handled automatically.',
    body_style
))

story.append(Paragraph('The system has three main components:', body_style))

# Flow diagram as table
flow_data = [
    ['Google Sheet', '  >>>  ', 'Apps Script', '  >>>  ', 'Laxree Dashboard'],
    ['Master Employees\nDaily Input\nHolidays', '', 'Auto-calculations\nOT / Status / Hours\nDate detection', '', 'Attendance Records\nOT Records\nReports & Payroll'],
]
flow_table = Table(flow_data, colWidths=[4*cm, 1.5*cm, 4*cm, 1.5*cm, 4*cm])
flow_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e8f4fd')),
    ('BACKGROUND', (2, 0), (2, -1), colors.HexColor('#fff3e0')),
    ('BACKGROUND', (4, 0), (4, -1), colors.HexColor('#e8f5e9')),
    ('FONTNAME', (0, 0), (-1, -1), 'NotoSansSC'),
    ('FONTSIZE', (0, 0), (-1, 0), 11),
    ('FONTWEIGHT', (0, 0), (-1, 0), 'BOLD'),
    ('FONTSIZE', (0, 1), (-1, 1), 9),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('BOX', (0, 0), (0, -1), 1, ACCENT),
    ('BOX', (2, 0), (2, -1), 1, GOLD),
    ('BOX', (4, 0), (4, -1), 1, colors.HexColor('#4caf50')),
    ('TOPPADDING', (0, 0), (-1, -1), 8),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
]))
story.append(flow_table)

story.append(Spacer(1, 10))
story.append(Paragraph(
    '<b>Master Employees Sheet:</b> This is your single source of truth for employee data. When you add a new employee '
    'here, they automatically appear in the Daily Input sheet the next time you generate attendance rows. '
    'Fields include Employee Code, Full Name, Firm, Location, Salary Type, Shift Start/End, and more.',
    body_style
))
story.append(Paragraph(
    '<b>Daily Input Sheet:</b> For each day, HR generates rows for all active employees. The employee names and shift '
    'details are pre-filled. HR only needs to enter In Time and Out Time. The Apps Script auto-calculates work '
    'duration, OT hours, total hours, late entry detection, half-day status, Sunday hours, and public holiday hours. '
    'The Status column is also auto-calculated using color-coded conditional formatting.',
    body_style
))
story.append(Paragraph(
    '<b>Holidays Sheet:</b> A simple list of public holidays. When a date matches a holiday, the Daily Input sheet '
    'automatically marks employees as "holiday" and calculates PH hours.',
    body_style
))

# ═══════════════════════════════════════════════════════════════
# SECTION 2: CREATE GOOGLE SHEET
# ═══════════════════════════════════════════════════════════════

story.append(Paragraph('2. Step 1: Create a Google Sheet', h1_style))
story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=12))

story.append(Paragraph(
    'Start by creating a brand new Google Sheet that will serve as your attendance workbook. This sheet will '
    'contain three tabs (Master Employees, Daily Input, and Holidays) that are automatically created by the '
    'Apps Script in the next step.',
    body_style
))

steps = [
    'Open your web browser and go to <b>sheets.google.com</b>',
    'Click the <b>blank (+)</b> button to create a new spreadsheet',
    'Name the spreadsheet something recognizable like <b>"Laxree Attendance 2026"</b>',
    'Leave the default "Sheet1" tab as-is (it will be deleted by the script)',
    'Note the Sheet ID from the URL: https://docs.google.com/spreadsheets/d/<b>SHEET_ID_HERE</b>/edit',
    'Copy and save this Sheet ID somewhere safe; you will need it later to connect to the dashboard',
]
for i, step in enumerate(steps, 1):
    story.append(Paragraph(f'<b>Step {i}:</b> {step}', step_style))

story.append(Spacer(1, 8))
story.append(Paragraph(
    '<b>Important:</b> The Sheet ID is the long string of characters in the URL between /d/ and /edit. '
    'For example, if the URL is https://docs.google.com/spreadsheets/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ/edit, '
    'then the Sheet ID is: 1aBcDeFgHiJkLmNoPqRsTuVwXyZ',
    note_style
))

# ═══════════════════════════════════════════════════════════════
# SECTION 3: ADD APPS SCRIPT
# ═══════════════════════════════════════════════════════════════

story.append(Paragraph('3. Step 2: Add the Google Apps Script', h1_style))
story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=12))

story.append(Paragraph(
    'The Google Apps Script is the brain of the attendance automation. It creates the sheet structure, '
    'auto-populates employee data, calculates working hours, OT, status, and provides the sync functionality '
    'with your Laxree Dashboard. Follow these steps carefully to install it:',
    body_style
))

steps = [
    'In your Google Sheet, click <b>Extensions</b> from the top menu bar',
    'Select <b>Apps Script</b> from the dropdown menu. A new tab will open with the Apps Script editor',
    'You will see a default file called "Code.gs" with an empty function. <b>Delete all the existing code</b> in the editor',
    'Open the file <b>"Laxree_Attendance_Google_Apps_Script.gs"</b> that was provided with this guide',
    'Copy the <b>entire contents</b> of that file and paste it into the Apps Script editor, replacing everything',
    'Click the <b>Save icon</b> (floppy disk) or press Ctrl+S to save the script',
    'You may be prompted to authorize the script. Click <b>"Review permissions"</b>, select your Google account, '
    'click <b>"Advanced"</b>, then click <b>"Go to Laxree HR (unsafe)"</b>, and finally click <b>"Allow"</b>',
]
for i, step in enumerate(steps, 1):
    story.append(Paragraph(f'<b>Step {i}:</b> {step}', step_style))

story.append(Spacer(1, 8))
story.append(Paragraph(
    '<b>Authorization Note:</b> The script needs permission to edit your spreadsheet, access the calendar/timezone, '
    'and make HTTP requests (for syncing with the dashboard). These are standard permissions for Apps Script. '
    'The "unsafe" warning appears because the script is not published on the Google Workspace Marketplace; '
    'this is completely normal for custom scripts.',
    note_style
))

# ═══════════════════════════════════════════════════════════════
# SECTION 4: INITIALIZE SHEET
# ═══════════════════════════════════════════════════════════════

story.append(Paragraph('4. Step 3: Initialize the Sheet', h1_style))
story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=12))

story.append(Paragraph(
    'After installing the Apps Script, you need to run the initialization function to create the sheet structure. '
    'This will set up three sheets (Master Employees, Daily Input, Holidays) with proper headers, formatting, '
    'data validation dropdowns, and default values. This step only needs to be done once.',
    body_style
))

steps = [
    'In the Apps Script editor, look at the toolbar at the top. You will see a function dropdown selector',
    'Click the dropdown and select <b>"initializeSheet"</b> from the list of functions',
    'Click the <b>Run</b> button (play icon) next to the dropdown. The script will execute',
    'Wait for the execution to complete. You will see a progress indicator in the editor',
    'Switch back to your Google Sheet tab. You should now see three new sheets:',
]
for i, step in enumerate(steps, 1):
    story.append(Paragraph(f'<b>Step {i}:</b> {step}', step_style))

# Sheet structure table
sheet_data = [
    ['Sheet Name', 'Purpose', 'Key Columns'],
    ['Master Employees', 'Employee database - add/edit employees here', 'Employee Code, Full Name, Firm, Location, Salary Type, Shift Start/End'],
    ['Daily Input', 'Daily attendance - HR fills In/Out times', 'Employee Code, Name, Date, In Time, Out Time, Work Duration, OT, Status'],
    ['Holidays', 'Public holidays for PH detection', 'Date, Holiday Name, Type'],
]
sheet_table = Table(sheet_data, colWidths=[3.5*cm, 5.5*cm, 6*cm])
sheet_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    ('FONTNAME', (0, 0), (-1, -1), 'NotoSansSC'),
    ('FONTSIZE', (0, 0), (-1, 0), 10),
    ('FONTWEIGHT', (0, 0), (-1, 0), 'BOLD'),
    ('FONTSIZE', (0, 1), (-1, -1), 9),
    ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [TABLE_ROW_EVEN, TABLE_ROW_ODD]),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
]))
story.append(Spacer(1, 8))
story.append(sheet_table)

story.append(Spacer(1, 8))
story.append(Paragraph(
    '<b>Also note:</b> The default "Sheet1" tab will be automatically deleted. The "Master Employees" sheet will '
    'be set as the active sheet. The header rows are styled with the Laxree brand colors (dark background, gold text) '
    'and are protected from accidental editing.',
    note_style
))

# ═══════════════════════════════════════════════════════════════
# SECTION 5: ADD EMPLOYEES
# ═══════════════════════════════════════════════════════════════

story.append(Paragraph('5. Step 4: Add Employees to Master Sheet', h1_style))
story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=12))

story.append(Paragraph(
    'Now that the sheet is initialized, you need to add your employee data to the Master Employees sheet. '
    'This data will be used to auto-populate the Daily Input sheet. When you add new employees in the future, '
    'they will automatically be included the next time you generate daily attendance rows.',
    body_style
))

story.append(Paragraph('You have two options for adding employees:', h2_style))

story.append(Paragraph(
    '<b>Option A: Manual Entry</b> - Simply type the employee data directly into the Master Employees sheet. '
    'Most columns have dropdown validation (Firm, Location, Salary Type, Employment Type, Active) to prevent typos. '
    'The Hourly Rate and OT Rate columns have auto-calculating formulas based on Monthly Salary and Shift Hours.',
    body_style
))

story.append(Paragraph(
    '<b>Option B: Use Sample Data</b> - The Apps Script includes a "Add Sample Employees" function that adds '
    '10 sample employees with realistic data. This is useful for testing before entering your real employee data.',
    body_style
))

steps = [
    'To add sample employees: In the sheet, click <b>Laxree HR</b> menu (top menu bar) then <b>Add Sample Employees</b>',
    'To enter manually: Go to the Master Employees sheet and fill in the columns starting from Row 2',
    '<b>Required fields:</b> Employee Code (Col A), Full Name (Col B), Firm (Col C), Location (Col D)',
    'Optional fields: Salary Type (defaults to "hourly"), Shift Start (defaults to "10:00"), Shift End (defaults to "19:00")',
    'Make sure the <b>Active</b> column (Col K) is set to <b>"Yes"</b> for employees who should appear in daily attendance',
    'The Hourly Rate (Col H) and OT Rate (Col I) are auto-calculated from Monthly Salary and Shift Hours',
]
for i, step in enumerate(steps, 1):
    story.append(Paragraph(f'<b>Step {i}:</b> {step}', step_style))

# ═══════════════════════════════════════════════════════════════
# SECTION 6: GENERATE DAILY ATTENDANCE
# ═══════════════════════════════════════════════════════════════

story.append(Paragraph('6. Step 5: Generate Daily Attendance', h1_style))
story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=12))

story.append(Paragraph(
    'Each day, HR needs to generate attendance rows for all active employees. The Apps Script pulls the employee '
    'list from the Master Employees sheet and creates a row for each employee with their name, firm, location, '
    'shift details, and the selected date. HR then simply fills in the In Time and Out Time columns.',
    body_style
))

steps = [
    'In the Google Sheet, click the <b>Laxree HR</b> menu from the top menu bar',
    'Select <b>"Generate Today\'s Attendance"</b> to create rows for today, or <b>"Generate Daily Attendance"</b> for a custom date',
    'The script will read all active employees from Master Employees and create one row per employee in the Daily Input sheet',
    'Each row is pre-filled with: Employee Code, Name, Firm, Location, Date, Shift Start, Shift End, Shift Hours',
    'If today is a Sunday, all rows will be pre-marked as "weekly-off". If today is a holiday, they will be marked as "holiday"',
    'If attendance for the selected date already exists, you will be asked if you want to regenerate (this will clear existing In/Out times)',
]
for i, step in enumerate(steps, 1):
    story.append(Paragraph(f'<b>Step {i}:</b> {step}', step_style))

# ═══════════════════════════════════════════════════════════════
# SECTION 7: ENTER IN/OUT TIME
# ═══════════════════════════════════════════════════════════════

story.append(Paragraph('7. Step 6: Enter In Time / Out Time', h1_style))
story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=12))

story.append(Paragraph(
    'This is the main daily task for HR. After generating the attendance rows, simply fill in the In Time and '
    'Out Time columns for each employee. All calculations happen automatically through spreadsheet formulas. '
    'The auto-calculated columns are read-only and update instantly when you enter the time values.',
    body_style
))

# Columns table
col_data = [
    ['Column', 'You Fill?', 'Description'],
    ['Employee Code', 'Auto', 'Pulled from Master Employees'],
    ['Employee Name', 'Auto', 'Pulled from Master Employees'],
    ['Firm / Location', 'Auto', 'Pulled from Master Employees'],
    ['Date', 'Auto', 'Set when generating attendance'],
    ['In Time (Col F)', 'YES', 'Enter check-in time as HH:MM (e.g., 10:00, 09:15)'],
    ['Out Time (Col G)', 'YES', 'Enter check-out time as HH:MM (e.g., 19:00, 20:30)'],
    ['Shift Start/End', 'Auto', 'From Master Employees per employee'],
    ['Work Duration (Col K)', 'Auto', 'Calculated: (Out Time - In Time) in hours'],
    ['OT Hours (Col L)', 'Auto', 'Calculated: max(0, Work Duration - Shift Hours)'],
    ['Total Hours (Col M)', 'Auto', 'Same as Work Duration (already includes OT)'],
    ['Status (Col N)', 'Auto', 'Present / Late / Half-Day / Absent / Weekly-Off / Holiday'],
    ['Late Entry (Col O)', 'Auto', 'TRUE if In Time > Shift Start + 15 min grace'],
    ['Half Day (Col P)', 'Auto', 'TRUE if Work Duration < Shift Hours / 2'],
    ['Sunday Hours (Col Q)', 'Auto', 'Work Duration if Sunday, else 0'],
    ['PH Hours (Col R)', 'Auto', 'Work Duration if Public Holiday, else 0'],
    ['Remarks (Col S)', 'Optional', 'Any notes about the attendance record'],
]
col_table = Table(col_data, colWidths=[3.5*cm, 2*cm, 9.5*cm])
col_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    ('FONTNAME', (0, 0), (-1, -1), 'NotoSansSC'),
    ('FONTSIZE', (0, 0), (-1, 0), 10),
    ('FONTWEIGHT', (0, 0), (-1, 0), 'BOLD'),
    ('FONTSIZE', (0, 1), (-1, -1), 9),
    ('ALIGN', (0, 0), (1, -1), 'CENTER'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [TABLE_ROW_EVEN, TABLE_ROW_ODD]),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('BACKGROUND', (0, 5), (-1, 6), colors.HexColor('#fffde7')),  # Highlight HR input rows
]))
story.append(col_table)

story.append(Spacer(1, 8))
story.append(Paragraph(
    '<b>Time Format:</b> Always enter times in 24-hour format as HH:MM. For example: 09:00 for 9 AM, '
    '13:30 for 1:30 PM, 19:00 for 7 PM, 22:00 for 10 PM. Do not use AM/PM notation.',
    note_style
))

# ═══════════════════════════════════════════════════════════════
# SECTION 8: SERVICE ACCOUNT
# ═══════════════════════════════════════════════════════════════

story.append(Paragraph('8. Step 7: Create Google Cloud Service Account', h1_style))
story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=12))

story.append(Paragraph(
    'To connect the Google Sheet with the Laxree Dashboard, you need a Google Cloud Service Account. This is a '
    'special type of Google account that allows the dashboard to securely read and write data to your Google Sheet '
    'without needing your personal Google credentials. Think of it as a robot account that only has access to '
    'the specific spreadsheet you share with it.',
    body_style
))

steps = [
    'Go to <b>console.cloud.google.com</b> and sign in with your Google account',
    'Create a new project (or select an existing one). Name it "Laxree HR Integration"',
    'In the left sidebar, go to <b>IAM & Admin</b> then <b>Service Accounts</b>',
    'Click <b>"Create Service Account"</b>. Name it "laxree-sheet-access" and click Create',
    'Skip the optional permissions step (click Continue), then click <b>Done</b>',
    'Click the email address of the service account you just created',
    'Go to the <b>Keys</b> tab, click <b>Add Key</b> then <b>Create new key</b>',
    'Select <b>JSON</b> format and click Create. A JSON file will download to your computer',
    'Open the downloaded JSON file. You need two values from it:',
]
for i, step in enumerate(steps, 1):
    story.append(Paragraph(f'<b>Step {i}:</b> {step}', step_style))

story.append(Spacer(1, 8))
story.append(Paragraph(
    '<b>client_email:</b> Looks like "laxree-sheet-access@your-project.iam.gserviceaccount.com"<br/>'
    '<b>private_key:</b> A long string starting with "-----BEGIN PRIVATE KEY-----"<br/><br/>'
    'Keep this JSON file secure. It grants access to any Google Sheet shared with the service account email.',
    note_style
))

steps2 = [
    'Now enable the Google Sheets API: Go to <b>APIs & Services</b> then <b>Library</b>',
    'Search for <b>"Google Sheets API"</b> and click Enable',
    'The service account is now ready to use',
]
for i, step in enumerate(steps2, 10):
    story.append(Paragraph(f'<b>Step {i}:</b> {step}', step_style))

# ═══════════════════════════════════════════════════════════════
# SECTION 9: SHARE SHEET
# ═══════════════════════════════════════════════════════════════

story.append(Paragraph('9. Step 8: Share Sheet with Service Account', h1_style))
story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=12))

story.append(Paragraph(
    'The service account needs permission to access your Google Sheet. You grant this by sharing the sheet '
    'with the service account email address, just like you would share with a colleague.',
    body_style
))

steps = [
    'Open your Laxree Attendance Google Sheet',
    'Click the <b>Share</b> button in the top-right corner',
    'Paste the <b>service account email</b> from the JSON file (e.g., laxree-sheet-access@your-project.iam.gserviceaccount.com)',
    'Set the permission to <b>Editor</b> (the dashboard needs to read and write data)',
    'Uncheck "Notify people" (service accounts do not have email inboxes)',
    'Click <b>Send</b> or <b>Share</b>',
]
for i, step in enumerate(steps, 1):
    story.append(Paragraph(f'<b>Step {i}:</b> {step}', step_style))

story.append(Spacer(1, 8))
story.append(Paragraph(
    '<b>Security Note:</b> The service account only has access to sheets explicitly shared with it. '
    'It cannot access any other Google Drive files. If you ever need to revoke access, simply remove the '
    'service account from the Share settings of the sheet.',
    note_style
))

# ═══════════════════════════════════════════════════════════════
# SECTION 10: CONNECT TO DASHBOARD
# ═══════════════════════════════════════════════════════════════

story.append(Paragraph('10. Step 9: Connect Sheet to Laxree Dashboard', h1_style))
story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=12))

story.append(Paragraph(
    'Now connect the Google Sheet to your Laxree HR Dashboard. This is done through the Settings page in the '
    'dashboard where you enter the service account credentials and the Sheet ID.',
    body_style
))

steps = [
    'Open the Laxree HR Dashboard in your browser and log in with admin credentials',
    'Navigate to <b>Settings</b> (gear icon in the sidebar)',
    'Scroll down to the <b>Google Sheets Integration</b> section',
    'Enter the <b>Service Account Email</b> (from the JSON file: client_email field)',
    'Enter the <b>Private Key</b> (from the JSON file: private_key field). Copy the entire key including the BEGIN/END lines',
    'Enter the <b>Google Sheet ID</b> (from the sheet URL, as noted in Step 1)',
    'Click <b>Save & Connect</b>. The dashboard will test the connection',
    'If successful, you will see a green "Connected" message with the list of sheets found',
]
for i, step in enumerate(steps, 1):
    story.append(Paragraph(f'<b>Step {i}:</b> {step}', step_style))

# ═══════════════════════════════════════════════════════════════
# SECTION 11: SYNC DATA
# ═══════════════════════════════════════════════════════════════

story.append(Paragraph('11. Step 10: Sync Data (Pull from Sheet)', h1_style))
story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=12))

story.append(Paragraph(
    'Once the Google Sheet is connected, you can sync attendance data between the sheet and the dashboard. '
    'The primary workflow is: fill data in the Google Sheet, then pull it into the dashboard.',
    body_style
))

story.append(Paragraph('Sync Options in the Attendance Tracker page:', h2_style))

sync_data = [
    ['Button', 'Action', 'When to Use'],
    ['Pull Daily Input', 'Reads the "Daily Input" sheet and imports all attendance records into the dashboard database', 'Use this after filling In/Out times in Google Sheet - PRIMARY ACTION'],
    ['Push to Sheet', 'Exports dashboard attendance data to the "Daily Input" sheet in Google Sheets', 'Use this to back up dashboard data or start using a new sheet'],
    ['Create Template', 'Creates empty attendance rows in "Daily Input" for all active employees', 'Use this to create rows from the dashboard side instead of Apps Script menu'],
    ['Pull (Legacy)', 'Reads from the old "Attendance" sheet format (10 columns)', 'Only for backward compatibility with older sheets'],
]
sync_table = Table(sync_data, colWidths=[3*cm, 6*cm, 6*cm])
sync_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    ('FONTNAME', (0, 0), (-1, -1), 'NotoSansSC'),
    ('FONTSIZE', (0, 0), (-1, 0), 10),
    ('FONTWEIGHT', (0, 0), (-1, 0), 'BOLD'),
    ('FONTSIZE', (0, 1), (-1, -1), 9),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [TABLE_ROW_EVEN, TABLE_ROW_ODD]),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#e8f5e9')),  # Highlight primary action
]))
story.append(sync_table)

story.append(Spacer(1, 10))
story.append(Paragraph(
    '<b>Daily Workflow Summary:</b> Each day, (1) Go to Google Sheet, (2) Click Laxree HR > Generate Today\'s Attendance, '
    '(3) Fill in In Time and Out Time for each employee, (4) Go to Laxree Dashboard > Attendance page, '
    '(5) Click "Pull Daily Input" button. All attendance data including OT, status, and hours will be imported automatically.',
    note_style
))

# ═══════════════════════════════════════════════════════════════
# SECTION 12: AUTO-SYNC
# ═══════════════════════════════════════════════════════════════

story.append(Paragraph('12. Auto-Sync Setup (Optional)', h1_style))
story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=12))

story.append(Paragraph(
    'For advanced users, you can set up automatic synchronization so the Apps Script periodically pushes '
    'data from the Google Sheet to the Laxree Dashboard without manual intervention. This uses Google Apps Script '
    'time-based triggers.',
    body_style
))

steps = [
    'In the Apps Script editor, update the <b>DASHBOARD_API_URL</b> constant at the top of the script with your dashboard URL (e.g., "https://your-app.vercel.app/api/gsheet")',
    'Save the script (Ctrl+S)',
    'In the Apps Script editor, select the function <b>"setupAutoSync"</b> from the dropdown',
    'Click <b>Run</b>. When prompted, enter the sync interval in hours (e.g., 1 for every hour, 2 for every 2 hours)',
    'The script will create a time-based trigger that automatically calls syncToDashboard() at the specified interval',
    'To disable auto-sync later, select <b>"disableAutoSync"</b> from the function dropdown and click Run',
]
for i, step in enumerate(steps, 1):
    story.append(Paragraph(f'<b>Step {i}:</b> {step}', step_style))

story.append(Spacer(1, 8))
story.append(Paragraph(
    '<b>Note:</b> Auto-sync requires the DASHBOARD_API_URL to be set correctly and the dashboard server to be '
    'accessible from Google servers. If your dashboard is hosted on a local network or behind a firewall, '
    'auto-sync may not work. In that case, use the manual "Pull Daily Input" button from the dashboard instead.',
    note_style
))

# ═══════════════════════════════════════════════════════════════
# SECTION 13: HOW CALCULATIONS WORK
# ═══════════════════════════════════════════════════════════════

story.append(Paragraph('13. How Calculations Work', h1_style))
story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=12))

story.append(Paragraph(
    'The attendance calculations follow the Laxree HR policy. All calculations happen automatically in the '
    'Google Sheet via formulas and are verified again when the data is pulled into the dashboard. '
    'Here is how each field is calculated:',
    body_style
))

calc_data = [
    ['Field', 'Formula / Logic', 'Example'],
    ['Work Duration', '(Out Time - In Time) converted to hours. Handles overnight shifts.', '10:00 to 19:00 = 9.0 hours'],
    ['OT Hours', 'max(0, Work Duration - Shift Hours). Only counts extra hours beyond shift.', '11.0 - 9.0 = 2.0 OT hours'],
    ['Total Hours', 'Same as Work Duration (already includes OT in the duration).', '11.0 hours total'],
    ['Late Entry', 'TRUE if In Time > Shift Start + 15 minute grace period.', 'In at 10:20, Shift 10:00 = Late'],
    ['Half Day', 'TRUE if Work Duration < Shift Hours / 2.', '4.0 hours < 9/2 = 4.5 = Half Day'],
    ['Status', 'Priority: Sunday > Holiday > Half-Day > Late > Present > Absent', 'See below for details'],
    ['Sunday Hours', 'If day is Sunday (day 0), equals Work Duration. Else 0.', '9.0 hours on Sunday'],
    ['PH Hours', 'If date is in Holidays sheet, equals Work Duration. Else 0.', '9.0 hours on Republic Day'],
]
calc_table = Table(calc_data, colWidths=[3*cm, 6.5*cm, 5.5*cm])
calc_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    ('FONTNAME', (0, 0), (-1, -1), 'NotoSansSC'),
    ('FONTSIZE', (0, 0), (-1, 0), 10),
    ('FONTWEIGHT', (0, 0), (-1, 0), 'BOLD'),
    ('FONTSIZE', (0, 1), (-1, -1), 9),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [TABLE_ROW_EVEN, TABLE_ROW_ODD]),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
]))
story.append(calc_table)

story.append(Spacer(1, 12))
story.append(Paragraph('Status Priority Logic:', h2_style))

status_data = [
    ['Priority', 'Condition', 'Status', 'Color Code'],
    ['1 (Highest)', 'Day is Sunday (dayOfWeek = 0)', 'weekly-off', 'Blue'],
    ['2', 'Date matches a holiday in Holidays sheet', 'holiday', 'Purple'],
    ['3', 'Work Duration < Shift Hours / 2', 'half-day', 'Orange'],
    ['4', 'In Time > Shift Start + 15 min grace', 'late', 'Yellow'],
    ['5', 'In Time and Out Time are filled', 'present', 'Green'],
    ['6 (Lowest)', 'No In/Out time and not Sunday/Holiday', 'absent', 'Red'],
]
status_table = Table(status_data, colWidths=[2*cm, 5.5*cm, 3*cm, 4.5*cm])
status_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    ('FONTNAME', (0, 0), (-1, -1), 'NotoSansSC'),
    ('FONTSIZE', (0, 0), (-1, 0), 10),
    ('FONTWEIGHT', (0, 0), (-1, 0), 'BOLD'),
    ('FONTSIZE', (0, 1), (-1, -1), 9),
    ('ALIGN', (0, 0), (0, -1), 'CENTER'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [TABLE_ROW_EVEN, TABLE_ROW_ODD]),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
]))
story.append(status_table)

# ═══════════════════════════════════════════════════════════════
# SECTION 14: TROUBLESHOOTING
# ═══════════════════════════════════════════════════════════════

story.append(Paragraph('14. Troubleshooting', h1_style))
story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=12))

story.append(Paragraph(
    'Here are solutions to the most common issues you may encounter while setting up or using the '
    'Google Sheets attendance automation system. Most problems are related to permissions, time formatting, '
    'or configuration mismatches.',
    body_style
))

trouble_data = [
    ['Problem', 'Cause', 'Solution'],
    ['"Laxree HR" menu not appearing', 'Script not saved or not authorized', 'Go to Extensions > Apps Script, save the script, refresh the sheet, and re-authorize if prompted'],
    ['Formulas showing #ERROR!', 'Time format is wrong', 'Enter times as HH:MM (e.g., 10:00, not 10 AM or 10:00:00)'],
    ['Status column is blank', 'In/Out times not filled yet', 'Status auto-calculates only when In Time and Out Time are both entered'],
    ['OT showing 0 when it should not', 'Shift Hours is wrong in Master', 'Check the Shift Hours column in Master Employees; OT = Duration - Shift Hours'],
    ['Dashboard says "Not configured"', 'Credentials not saved', 'Go to Settings > Google Sheets Integration and enter all three fields (email, key, sheet ID)'],
    ['Connection test fails', 'Service account not set up or sheet not shared', 'Verify the JSON key file is correct and the sheet is shared with the service account email'],
    ['"Pull Daily Input" shows 0 synced', 'No data in Daily Input sheet or wrong format', 'Make sure you ran "Generate Today\'s Attendance" first and filled In/Out times'],
    ['Employee not found error during sync', 'Employee Code in sheet does not match dashboard', 'Ensure the Employee Code in the Google Sheet matches the employeeId in the dashboard exactly'],
    ['Late entry not detected', 'Shift Start not set correctly', 'Check the Shift Start column in Master Employees for that employee'],
    ['Holiday not detected', 'Date format wrong in Holidays sheet', 'Enter dates as YYYY-MM-DD (e.g., 2026-01-26) in the Holidays sheet'],
]
trouble_table = Table(trouble_data, colWidths=[4*cm, 4*cm, 7*cm])
trouble_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    ('FONTNAME', (0, 0), (-1, -1), 'NotoSansSC'),
    ('FONTSIZE', (0, 0), (-1, 0), 10),
    ('FONTWEIGHT', (0, 0), (-1, 0), 'BOLD'),
    ('FONTSIZE', (0, 1), (-1, -1), 8.5),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [TABLE_ROW_EVEN, TABLE_ROW_ODD]),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
]))
story.append(trouble_table)

story.append(Spacer(1, 20))
story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=10))
story.append(Paragraph(
    'For additional support, contact the Laxree HR system administrator or refer to the dashboard documentation.',
    ParagraphStyle('Footer', parent=body_style, alignment=TA_CENTER, textColor=TEXT_MUTED, fontSize=10)
))

# ═══════════════════════════════════════════════════════════════
# BUILD PDF
# ═══════════════════════════════════════════════════════════════

os.makedirs(OUTPUT_DIR, exist_ok=True)
doc.build(story)
print(f'PDF generated: {OUTPUT_FILE}')
