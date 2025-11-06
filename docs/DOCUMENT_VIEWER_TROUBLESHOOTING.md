# Document Viewer Troubleshooting Guide

## Overview

This guide helps diagnose and resolve issues with the document viewer in Docuflow.

## Common Error Messages and Solutions

### "Authentication failed. Please reconnect your storage account"

**Cause**: Storage credentials (OAuth tokens) have expired or are invalid.

**Solutions**:
1. Go to Settings > Integrations
2. Find your storage account (Google Drive, OneDrive, etc.)
3. Click "Reconnect" or "Refresh Token"
4. Complete the OAuth flow again

**Prevention**: Enable automatic token refresh in storage settings.

---

### "Network error. Please check your internet connection and try again."

**Cause**: Network connectivity issues or timeout.

**Solutions**:
1. Check your internet connection
2. Try refreshing the page
3. Check if the file is very large (>10MB) - consider downloading instead
4. Check browser console for detailed error messages

**Diagnostics**: Open browser DevTools (F12) > Network tab, look for failed requests.

---

### "This image format is not supported by your browser"

**Cause**: Unsupported image format (HEIC, HEIF, SVG with security restrictions).

**Solutions**:
1. Download the file to view it locally
2. Convert the image to a supported format (JPEG, PNG)
3. Use a different browser (Chrome/Firefox have better format support)

**Supported Formats**:
- ✅ JPEG, PNG, GIF, WebP, BMP
- ⚠️ SVG (may have security restrictions)
- ❌ HEIC, HEIF (not supported by most browsers)

---

### "Failed to load PDF preview"

**Cause**: PDF file corruption, format issues, or browser compatibility.

**Solutions**:
1. Try downloading the file and opening it locally
2. Clear browser cache and try again
3. Try a different browser
4. Check if the PDF is password-protected (not supported)
5. Verify the file is not corrupted

**Diagnostics**: Check browser console for specific error messages.

---

### "File not found in storage"

**Cause**: File was moved, deleted, or storage path is incorrect.

**Solutions**:
1. Check if the document still exists in your storage
2. Verify storage configuration is correct
3. Contact administrator if file should exist
4. Check activity logs for file movement

---

## Step-by-Step Diagnostic Process

### 1. Check Browser Console

Open browser DevTools (F12) and check the Console tab for error messages:

```
[Viewer Error] {
  documentId: "...",
  errorType: "auth|network|format|storage|unknown",
  errorMessage: "...",
  context: { ... }
}
```

### 2. Use Diagnostics Endpoint

The diagnostics endpoint provides detailed information about a document:

```bash
GET /api/documents/[id]/diagnostics
```

**Response includes**:
- Document metadata
- Storage configuration status
- Recommendations for fixes

### 3. Check Network Tab

In DevTools > Network tab:
- Look for failed requests (red status codes)
- Check response headers for error details
- Verify request URLs are correct

### 4. Verify Storage Configuration

1. Go to Settings > Storage
2. Check storage account status
3. Verify tokens are valid
4. Test connection

### 5. Check File Format

1. Verify file extension matches MIME type
2. Check file size (very large files may timeout)
3. Try opening file in different application

## Browser Compatibility Matrix

| Browser | PDF | Images | Office Docs | Video | Audio |
|---------|-----|--------|-------------|-------|-------|
| Chrome | ✅ | ✅ | ❌ (download) | ✅ | ✅ |
| Firefox | ✅ | ✅ | ❌ (download) | ✅ | ✅ |
| Safari | ✅ | ⚠️ (some formats) | ❌ (download) | ✅ | ✅ |
| Edge | ✅ | ✅ | ❌ (download) | ✅ | ✅ |

**Notes**:
- Office documents (Word, Excel, PowerPoint) cannot be previewed in browsers
- Some image formats (HEIC, HEIF) require download
- PDFs may have rendering differences between browsers

## File Format Support Matrix

### Fully Supported (Preview Available)

| Format | Extensions | MIME Types |
|--------|-----------|------------|
| PDF | .pdf | application/pdf |
| Images | .jpg, .jpeg, .png, .gif, .webp, .bmp | image/* |
| Video | .mp4, .webm, .mov | video/* |
| Audio | .mp3, .wav, .ogg, .aac | audio/* |
| Text | .txt, .md, .csv, .json, .xml, .html | text/* |

### Partially Supported (Download Only)

| Format | Extensions | Notes |
|--------|-----------|-------|
| Office | .docx, .xlsx, .pptx | Cannot preview in browser |
| Images | .heic, .heif, .svg | Browser limitations |

### Unsupported

- Password-protected PDFs
- Corrupted files
- Encrypted files
- Very large files (>100MB) may timeout

## How to Use Diagnostics Endpoint

### Example Request

```bash
curl -X GET "https://your-domain.com/api/documents/[document-id]/diagnostics" \
  -H "Authorization: Bearer [your-token]"
```

### Example Response

```json
{
  "success": true,
  "data": {
    "document": {
      "id": "...",
      "filename": "document.pdf",
      "mimeType": "application/pdf",
      "fileSize": 2048576,
      "storageProvider": "google_drive",
      "status": "processed"
    },
    "storage": {
      "provider": "google_drive",
      "isActive": true
    },
    "recommendations": [
      "Large file detected (>10MB). Preview may be slow or unavailable."
    ]
  }
}
```

## Performance Issues

### Slow Loading

**Causes**:
- Large file size
- Slow network connection
- Storage provider latency

**Solutions**:
1. Check file size - download if >10MB
2. Use caching (enabled by default)
3. Check network speed
4. Consider using a different storage provider

### High Memory Usage

**Causes**:
- Very large PDFs (>50 pages)
- High-resolution images
- Multiple documents open

**Solutions**:
1. Close other tabs
2. Download large files instead of previewing
3. Use browser's task manager to identify memory-heavy tabs

## Error Logging

All viewer errors are automatically logged with:

- Document ID
- Error type (auth, network, format, storage, unknown)
- Error message
- Context (browser, file type, storage provider, etc.)
- Timestamp

**Accessing Logs**:
- Browser console (development)
- Server logs (production)
- Activity logs in dashboard

## Getting Help

If you've tried the above solutions and still have issues:

1. **Collect Information**:
   - Document ID
   - Error message (from browser console)
   - Browser and version
   - File type and size
   - Steps to reproduce

2. **Check Activity Logs**:
   - Go to Dashboard > Activity
   - Filter by document ID
   - Look for error events

3. **Contact Support**:
   - Include error details
   - Attach diagnostics endpoint response
   - Describe what you were trying to do

## Prevention Tips

1. **Regular Maintenance**:
   - Monitor storage token expiration
   - Keep storage accounts active
   - Review error logs regularly

2. **Best Practices**:
   - Use standard file formats when possible
   - Keep file sizes reasonable (<10MB for preview)
   - Verify storage connectivity periodically

3. **Configuration**:
   - Enable automatic token refresh
   - Set up storage monitoring
   - Configure appropriate timeout values

---

**Last Updated**: 2025-01-15  
**Maintained By**: Docuflow Team

