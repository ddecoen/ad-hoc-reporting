import openpyxl
from openpyxl import Workbook

# Create a new workbook
wb = Workbook()
ws = wb.active
ws.title = "Transaction Detail"

# Add header row
headers = ["Date", "Type", "Document Number", "Name", "Account", "Department", "Class", "Amount", "Memo"]
ws.append(headers)

# Add sample data
data = [
    ["2024-01-15", "Journal", "JE-2024-001", "Acme Corp", "4000 - Revenue", "Sales", "Product A", 100000.00, "Monthly recurring revenue"],
    ["2024-01-15", "Journal", "JE-2024-002", "Tech Services", "4000 - Revenue", "Sales", "Product B", 50000.00, "Annual subscription"],
    ["2024-01-20", "Bill", "BILL-2024-100", "AWS", "5100 - COGS - Infrastructure", "Engineering", "Product A", 5000.00, "Cloud hosting costs"],
    ["2024-01-20", "Bill", "BILL-2024-101", "Google Cloud", "5100 - COGS - Infrastructure", "Engineering", "Product B", 3000.00, "Infrastructure"],
    ["2024-01-25", "Payroll", "PR-2024-01", "John Doe", "5200 - COGS - Salaries", "Customer Support", "Support", 15000.00, "Customer support salary"],
    ["2024-01-25", "Payroll", "PR-2024-02", "Jane Smith", "5200 - COGS - Salaries", "Customer Support", "Support", 14000.00, "Customer support salary"],
    ["2024-01-30", "Bill", "BILL-2024-102", "Office Supplies Co", "6100 - G&A Expenses", "Finance", "Admin", 500.00, "Office supplies"],
    ["2024-01-30", "Payroll", "PR-2024-03", "Bob Johnson", "6200 - G&A Salaries", "Finance", "Accounting", 12000.00, "Accounting manager salary"],
    ["2024-01-30", "Payroll", "PR-2024-04", "Alice Williams", "6200 - G&A Salaries", "HR", "Human Resources", 11000.00, "HR coordinator salary"],
    ["2024-02-01", "Payroll", "PR-2024-05", "Charlie Brown", "7100 - R&D Salaries", "Engineering", "Product", 18000.00, "Software engineer salary"],
    ["2024-02-01", "Payroll", "PR-2024-06", "Diana Prince", "7100 - R&D Salaries", "Engineering", "Product", 17000.00, "Software engineer salary"],
    ["2024-02-01", "Payroll", "PR-2024-07", "Ethan Hunt", "7100 - R&D Salaries", "Product", "Product Management", 16000.00, "Product manager salary"],
    ["2024-02-05", "Bill", "BILL-2024-103", "GitHub", "7200 - R&D Expenses", "Engineering", "Development", 500.00, "Development tools"],
    ["2024-02-05", "Bill", "BILL-2024-104", "AWS", "7200 - R&D Expenses", "Engineering", "Development", 2000.00, "Development infrastructure"],
    ["2024-02-10", "Payroll", "PR-2024-08", "Frank Castle", "8100 - S&M Salaries", "Sales", "SDR", 8000.00, "SDR base salary"],
    ["2024-02-10", "Payroll", "PR-2024-09", "Grace Hopper", "8100 - S&M Salaries", "Sales", "AE", 10000.00, "Account executive salary"],
    ["2024-02-10", "Payroll", "PR-2024-10", "Henry Ford", "8100 - S&M Salaries", "Marketing", "Marketing", 12000.00, "Marketing manager salary"],
    ["2024-02-10", "Commission", "COMM-2024-01", "Grace Hopper", "8100 - S&M Commission", "Sales", "AE", 5000.00, "Q1 sales commission"],
    ["2024-02-15", "Bill", "BILL-2024-105", "HubSpot", "8200 - S&M Expenses", "Marketing", "Marketing", 3000.00, "Marketing automation"],
    ["2024-02-15", "Bill", "BILL-2024-106", "LinkedIn", "8200 - S&M Expenses", "Marketing", "Advertising", 2000.00, "LinkedIn ads"],
    ["2024-02-20", "Bill", "BILL-2024-107", "Salesforce", "8200 - S&M Expenses", "Sales", "CRM", 1500.00, "CRM subscription"],
    ["2024-02-20", "Bill", "BILL-2024-108", "Wilson Sonsini", "6300 - G&A Legal", "Legal", "Legal Services", 5000.00, "Legal counsel"],
    ["2024-02-25", "Bill", "BILL-2024-109", "WeWork", "6400 - G&A Facilities", "Facilities", "Office", 8000.00, "Office rent"],
    ["2024-02-25", "Bill", "BILL-2024-110", "PG&E", "6400 - G&A Facilities", "Facilities", "Utilities", 1000.00, "Electricity and utilities"],
]

for row in data:
    ws.append(row)

# Save the workbook
wb.save("sample-data.xlsx")
print("✅ Created sample-data.xlsx")
