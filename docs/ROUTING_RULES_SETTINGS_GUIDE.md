# Routing Rules Settings Guide

## Overview

This guide explains how routing rules work and how to configure them for optimal document organization.

## What Are Routing Rules?

Routing rules automatically organize documents into folders based on:
- Sender email address
- Email subject line
- File types
- Document requests

**Example**: All documents from "hr@company.com" with subject "Employee ID" go to `/employees/ids/`.

## Accessing Routing Rules

1. Navigate to **Dashboard > Routing Rules**
2. Click **"Create Rule"** or edit existing rules
3. Settings are organization-specific

## How Routing Works

### Priority System

Rules are evaluated in **priority order** (highest number first):

1. Rule with priority 100 is checked first
2. Rule with priority 50 is checked second
3. Rule with priority 0 (default) is checked last

**First matching rule wins** - once a rule matches, processing stops.

### Matching Process

For each rule, the system checks:
1. **Sender Pattern**: Does sender email match?
2. **Subject Pattern**: Does subject line match?
3. **File Types**: Do attachment types match?

**All conditions must match** (AND logic) unless rule has no conditions (catch-all).

## Creating Effective Rules

### Rule Priority Guidelines

| Priority | Use Case | Example |
|----------|----------|---------|
| 100+ | Specific, high-priority rules | "CEO documents" → `/executive/` |
| 50-99 | Department-specific rules | "HR documents" → `/hr/` |
| 10-49 | Category rules | "Passports" → `/passports/` |
| 0-9 | Default/catch-all rules | All others → `/documents/` |

### Pattern Matching

#### Sender Patterns (Regex)

**Examples**:
- `hr@company.com` - Exact match
- `.*@company.com` - Any sender from company.com
- `hr|admin|payroll@company.com` - Multiple senders
- `^[a-z]+@company\.com$` - Any lowercase name from company.com

**Best Practices**:
- Use `^` and `$` for exact matches when needed
- Escape special characters (`.`, `+`, `*`) with `\`
- Test patterns before saving

#### Subject Patterns (Regex)

**Examples**:
- `Employee ID` - Exact match
- `.*ID.*` - Contains "ID"
- `Passport|License|Certificate` - Multiple keywords
- `^Re:.*ID` - Reply with "ID" in subject

**Best Practices**:
- Account for "Re:" and "Fwd:" prefixes (handled automatically)
- Use case-insensitive matching (default)
- Test with actual email subjects

#### File Types

**Format**: Comma-separated extensions (no dots)

**Examples**:
- `pdf` - PDF files only
- `pdf,docx,xlsx` - Multiple types
- `jpg,jpeg,png` - Image files

**Available Types**:
- Documents: `pdf`, `doc`, `docx`, `xls`, `xlsx`, `ppt`, `pptx`
- Images: `jpg`, `jpeg`, `png`, `gif`, `webp`
- Archives: `zip`, `rar`, `7z`

## Folder Path Placeholders

Use these placeholders in folder paths:

| Placeholder | Example Output | Description |
|-------------|----------------|-------------|
| `{sender_email}` | `john@company.com` | Sender's email address |
| `{sender_name}` | `John Smith` | Sender's display name |
| `{employee_email}` | `employee@company.com` | Employee email (if matched) |
| `{employee_name}` | `Jane Doe` | Employee full name (if matched) |
| `{date}` | `2025-01-15` | Current date (YYYY-MM-DD) |
| `{year}` | `2025` | Current year |
| `{month}` | `01` | Current month (01-12) |
| `{day}` | `15` | Current day (01-31) |

**Example Folder Path**:
```
/employees/{employee_name}/{date}/
```

**Result**:
```
/employees/Jane Doe/2025-01-15/
```

## Common Routing Scenarios

### Scenario 1: Department-Based Routing

**Goal**: Route documents by department

**Rules**:
1. Priority 80: `hr@company.com` → `/hr/documents/{date}/`
2. Priority 80: `finance@company.com` → `/finance/documents/{date}/`
3. Priority 80: `legal@company.com` → `/legal/documents/{date}/`

**Result**: Each department's documents in their own folder.

---

### Scenario 2: Document Type Routing

**Goal**: Route by document type

**Rules**:
1. Priority 60: Subject contains "Passport" → `/passports/{employee_name}/`
2. Priority 60: Subject contains "License" → `/licenses/{employee_name}/`
3. Priority 60: Subject contains "Certificate" → `/certificates/{employee_name}/`

**Result**: Documents organized by type.

---

### Scenario 3: Employee-Specific Routing

**Goal**: Route to employee folders

**Rules**:
1. Priority 70: Employee matched → `/employees/{employee_name}/{date}/`
2. Priority 50: Default → `/documents/{date}/`

**Result**: Employee documents in personal folders, others in general folder.

---

### Scenario 4: Date-Based Organization

**Goal**: Organize by date

**Rules**:
1. Priority 40: All documents → `/documents/{year}/{month}/{day}/`

**Result**: Documents organized by date for easy archival.

---

## Rule Configuration Best Practices

### 1. Start with Catch-All Rule

**Always create a default rule first**:
- Priority: 0
- No conditions (catch-all)
- Folder: `/documents/{date}/`

This ensures all documents are routed somewhere.

### 2. Add Specific Rules

Create specific rules with higher priority:
- Priority: 50-100
- Specific conditions
- Organized folders

### 3. Test Rules

1. Create test rule with priority 100
2. Send test email
3. Verify routing
4. Adjust if needed
5. Lower priority to final value

### 4. Use Descriptive Names

**Good names**:
- "HR Department Documents"
- "Employee Passports"
- "Finance Invoices"

**Bad names**:
- "Rule 1"
- "Test"
- "New Rule"

### 5. Document Rules

Add notes in rule description:
- What documents it handles
- Why it exists
- When it was created
- Last updated

## Troubleshooting

### Documents Not Routing

**Causes**:
1. No matching rule exists
2. Rule conditions don't match
3. Rule is inactive
4. Storage configuration issue

**Solutions**:
1. Check rule priority order
2. Verify pattern matches (use test emails)
3. Ensure rule is active
4. Check storage configuration

### Documents Going to Wrong Folder

**Causes**:
1. Multiple rules matching
2. Priority order incorrect
3. Pattern too broad

**Solutions**:
1. Review rule priority
2. Make patterns more specific
3. Test with actual email examples

### Pattern Not Matching

**Causes**:
1. Regex syntax error
2. Case sensitivity
3. Special characters not escaped

**Solutions**:
1. Test pattern in regex tester
2. Use case-insensitive flag (default)
3. Escape special characters (`\`, `.`, `+`, etc.)

## Advanced Patterns

### Multiple Senders

```
(hr|admin|payroll)@company\.com
```

### Flexible Subject

```
.*(passport|license|id).*
```

### Date-Based Organization

```
/documents/{year}/{month}/{employee_name}/
```

### Employee with Fallback

```
/employees/{employee_name}/{date}/
```

If `{employee_name}` is empty, use:
```
/documents/unmatched/{date}/
```

## Monitoring and Maintenance

### Regular Review

1. **Weekly**: Check routing accuracy
2. **Monthly**: Review rule effectiveness
3. **Quarterly**: Clean up unused rules

### Metrics to Track

- Documents routed correctly
- Documents in wrong folders
- Unmatched documents
- Rule execution time

### Rule Optimization

1. **Merge Similar Rules**: Combine rules with same destination
2. **Remove Unused Rules**: Delete rules that never match
3. **Simplify Patterns**: Use simpler patterns when possible
4. **Adjust Priority**: Reorder based on actual usage

---

**Last Updated**: 2025-01-15  
**For Questions**: Contact your administrator

