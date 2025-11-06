# Validation Settings User Guide

## Overview

This guide explains how to configure document validation settings in Docuflow, including confidence thresholds, auto-approval rules, and expiry checks.

## Accessing Settings

1. Navigate to **Dashboard > Settings**
2. You must be an **administrator** or **owner** to access settings
3. Settings are organization-specific

## Validation Settings Explained

### Auto-Approval Toggle

**What it does**: Automatically approves documents that meet all validation thresholds.

**When to use**:
- ✅ High confidence in validation accuracy
- ✅ Large volume of documents
- ✅ Standard document formats

**When to disable**:
- ⚠️ New organization (initial setup)
- ⚠️ Non-standard document formats
- ⚠️ Compliance-sensitive use cases

---

### Owner Match Confidence

**Range**: 50% - 100%  
**Default**: 90%  
**Recommended**: 90%

**What it measures**: How confident the system is that the document owner matches an employee in your directory.

**How it works**:
- Matches document name/email to employee records
- Uses fuzzy matching for name variations
- Checks date of birth if available
- Calculates confidence score (0-1)

**Example Scenarios**:

| Confidence | Example | Action |
|------------|---------|--------|
| 95% | "John Smith" matches "John A. Smith" | ✅ Auto-approved |
| 85% | "J. Smith" matches "John Smith" | ⚠️ Needs review |
| 60% | "John Doe" matches "Jane Doe" | ❌ Rejected |

**Recommendations**:
- **90%**: Balanced - catches most valid matches, flags uncertain ones
- **95%+**: Strict - fewer false positives, may reject valid documents
- **80%**: Lenient - more auto-approvals, higher risk of false matches

---

### Authenticity Score

**Range**: 50% - 100%  
**Default**: 85%  
**Recommended**: 85%

**What it measures**: Document authenticity and quality indicators.

**Checks include**:
- Image quality (resolution, clarity)
- Duplicate detection
- Tampering indicators
- File integrity

**Example Scenarios**:

| Score | Example | Action |
|-------|---------|--------|
| 95% | High-quality scan, unique document | ✅ Auto-approved |
| 80% | Low resolution, but clear | ⚠️ Needs review |
| 65% | Blurry scan or potential duplicate | ❌ Rejected |

**Recommendations**:
- **85%**: Good balance for most documents
- **90%+**: Strict - ensures high-quality documents only
- **75%**: Lenient - accepts lower quality scans

---

### Request Compliance Score

**Range**: 50% - 100%  
**Default**: 95%  
**Recommended**: 95%

**What it measures**: How well the document type matches the requested document type.

**How it works**:
- Classifies document type (passport, license, certificate, etc.)
- Compares to requested document type
- Calculates match confidence

**Example Scenarios**:

| Score | Example | Action |
|-------|---------|--------|
| 98% | Requested passport, received passport | ✅ Auto-approved |
| 90% | Requested ID, received driver's license | ⚠️ Needs review |
| 70% | Requested passport, received birth certificate | ❌ Rejected |

**Recommendations**:
- **95%**: Ensures documents match requests exactly
- **90%**: Allows some flexibility (e.g., driver's license vs. ID card)
- **98%+**: Very strict - exact type matching only

---

### Expiry Settings

#### Require Expiry Check

**What it does**: Always checks if documents have expiry dates and validates them.

**When enabled**:
- All documents are checked for expiry
- Expiring documents are flagged
- Renewal reminders are scheduled

**When disabled**:
- Expiry checks are skipped
- Renewal reminders not created
- Not recommended for compliance-sensitive use cases

#### Allow Expired Documents

**What it does**: Permits auto-approval of documents that have expired.

**⚠️ Warning**: Not recommended for most use cases.

**When to enable**:
- Historical document collection
- Non-critical documents
- Testing environments

**When to disable** (recommended):
- Compliance-sensitive documents
- Legal requirements
- Active employee verification

---

## Real-World Usage Scenarios

### Scenario 1: High-Volume, Standard Documents

**Use Case**: Processing many standard employee documents (IDs, certificates)

**Recommended Settings**:
- Auto-approval: ✅ Enabled
- Owner match: 90%
- Authenticity: 85%
- Compliance: 95%
- Allow expired: ❌ No

**Result**: Most documents auto-approved, only anomalies flagged for review.

---

### Scenario 2: Compliance-Sensitive Documents

**Use Case**: Legal documents, certifications requiring strict validation

**Recommended Settings**:
- Auto-approval: ⚠️ Disabled (or very high thresholds)
- Owner match: 95%
- Authenticity: 90%
- Compliance: 98%
- Allow expired: ❌ No

**Result**: All documents reviewed manually, high confidence required.

---

### Scenario 3: Initial Setup / Testing

**Use Case**: New organization, testing validation accuracy

**Recommended Settings**:
- Auto-approval: ❌ Disabled
- Owner match: 85%
- Authenticity: 80%
- Compliance: 90%
- Allow expired: ⚠️ Yes (for testing)

**Result**: All documents reviewed, lower thresholds for learning.

---

## Impact of Threshold Changes

### Increasing Thresholds (More Strict)

**Effects**:
- ✅ Fewer false positives
- ✅ Higher quality documents only
- ⚠️ More documents need manual review
- ⚠️ May reject valid documents

**Best for**: Compliance-sensitive, high-stakes documents

### Decreasing Thresholds (More Lenient)

**Effects**:
- ✅ More auto-approvals
- ✅ Fewer manual reviews needed
- ⚠️ Higher risk of false matches
- ⚠️ May approve low-quality documents

**Best for**: High-volume, standard documents

---

## Edge Cases and Recommendations

### Common Name Variations

**Issue**: "John Smith" vs. "J. Smith" vs. "John A. Smith"

**Solution**: 
- Owner match confidence: 85-90%
- System handles common variations automatically

### Low-Quality Scans

**Issue**: Blurry or low-resolution document images

**Solution**:
- Authenticity score: 75-80% (more lenient)
- Consider manual review for critical documents

### Document Type Ambiguity

**Issue**: Driver's license vs. ID card vs. passport

**Solution**:
- Compliance score: 90% (allows flexibility)
- Or use specific document type requests

### Expired Documents

**Issue**: Need to accept expired documents for historical records

**Solution**:
- Enable "Allow expired documents" temporarily
- Or disable auto-approval and review manually

---

## Safe Default Values

These are the recommended default values for most organizations:

```json
{
  "enabled": true,
  "min_owner_match_confidence": 0.90,
  "min_authenticity_score": 0.85,
  "min_request_compliance_score": 0.95,
  "require_expiry_check": true,
  "allow_expired_documents": false
}
```

**Why these values?**
- Balance between automation and accuracy
- Catch most valid documents
- Flag uncertain matches for review
- Maintain compliance standards

---

## Monitoring and Adjustment

### Initial Setup

1. Start with default values
2. Monitor validation results for 1-2 weeks
3. Review documents flagged for review
4. Adjust thresholds based on:
   - False positive rate
   - Manual review workload
   - Document quality patterns

### Regular Review

1. **Weekly**: Check auto-approval rate
2. **Monthly**: Review rejected documents
3. **Quarterly**: Adjust thresholds if patterns change

### Metrics to Track

- **Auto-approval rate**: Target 70-90%
- **False positive rate**: Should be <5%
- **Manual review count**: Should be manageable
- **Rejection rate**: Should be <10%

---

## Troubleshooting

### Too Many Manual Reviews

**Cause**: Thresholds too strict

**Solution**: Lower thresholds by 5-10%

**Example**: 95% → 90% owner match confidence

### Too Many False Approvals

**Cause**: Thresholds too lenient

**Solution**: Increase thresholds by 5-10%

**Example**: 80% → 85% authenticity score

### Documents Not Matching Owners

**Cause**: Employee directory data quality

**Solution**:
1. Improve employee directory data (full names, DOB)
2. Lower owner match threshold temporarily
3. Review unmatched documents manually

---

## Best Practices

1. **Start Conservative**: Begin with strict thresholds, relax gradually
2. **Monitor Regularly**: Review validation results weekly
3. **Document Changes**: Note why thresholds were adjusted
4. **Test Changes**: Use test documents before applying to production
5. **Train Staff**: Ensure reviewers understand the validation process

---

**Last Updated**: 2025-01-15  
**For Questions**: Contact your administrator or support

