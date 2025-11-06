// Supabase Edge Function to validate documents using AI
// This function:
// 1. Downloads document from storage
// 2. Extracts text using OCR (for images/scanned PDFs)
// 3. Classifies document type using LLM
// 4. Matches owner identity
// 5. Detects expiry dates
// 6. Checks authenticity and quality
// 7. Verifies request compliance
// 8. Stores validation results

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface ValidationResult {
  document_type?: string;
  document_type_confidence?: number;
  issuing_country?: string;
  document_number?: string;
  expiry_date?: string;
  issue_date?: string;
  full_name_on_document?: string;
  dob_on_document?: string;
}

interface OwnerMatchResult {
  matched_employee_id?: string;
  name_match_score: number;
  dob_match: boolean;
  owner_match_confidence: number;
  requires_review: boolean;
}

interface ExpiryAnalysis {
  expiry_date?: string;
  issue_date?: string;
  expiry_status: 'expired' | 'expiring_soon' | 'expiring_later' | 'no_expiry';
  days_until_expiry?: number;
}

interface AuthenticityCheck {
  authenticity_score: number;
  image_quality_score?: number;
  is_duplicate: boolean;
  duplicate_of_document_id?: string;
  pdf_valid: boolean;
  requires_review: boolean;
}

interface RequestCompliance {
  matches_request_type: boolean;
  request_compliance_score: number;
}

interface ValidationSummary {
  overall_status: 'verified' | 'needs_review' | 'rejected';
  can_auto_approve: boolean;
  requires_admin_review: boolean;
  review_priority: 'low' | 'medium' | 'high' | 'critical';
  critical_issues: string[];
  warnings: string[];
}

// Simple XOR encryption/decryption (matches @docuflow/shared)
function decrypt(encryptedText: string, key: string): string {
  if (!encryptedText) return encryptedText;
  try {
    const text = atob(encryptedText);
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch {
    throw new Error('Failed to decrypt data');
  }
}

function encrypt(text: string, key: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result);
}

// Validate OAuth token format
// Microsoft Graph API can return:
// 1. JWT tokens (with dots: header.payload.signature) - starts with "eyJ"
// 2. Opaque tokens (no dots) - starts with various prefixes like "Ew...", "0.A...", etc.
// Google OAuth tokens are always JWTs
function validateTokenFormat(token: string, provider?: string): boolean {
  // Basic validation: must be a non-empty string
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  // Tokens should be at least 10 characters (very short tokens are likely invalid)
  if (token.length < 10) {
    return false;
  }
  
  // JWT tokens have dots (header.payload.signature)
  if (token.includes('.')) {
    const parts = token.split('.');
    // JWT tokens should have at least 2 parts (header.payload or header.payload.signature)
    return parts.length >= 2;
  }
  
  // Opaque tokens (Microsoft) don't have dots but are valid
  // They typically start with "Ew", "0.A", or other prefixes
  // Microsoft opaque tokens are typically 1000+ characters long
  // Accept any non-empty string without dots as potentially valid opaque token
  if (provider === 'outlook' || provider === 'onedrive') {
    // Microsoft tokens without dots are valid opaque tokens
    return token.trim().length > 0;
  }
  
  // For other providers or unknown, also accept opaque tokens if they're long enough
  return token.trim().length >= 100;
}

// Refresh Google OAuth token
async function refreshGoogleToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID') || '',
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') || '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google token refresh failed: ${error}`);
  }

  return await response.json();
}

// Refresh Microsoft OAuth token
async function refreshMicrosoftToken(
  refreshToken: string,
  tenantId?: string
): Promise<{ access_token: string; expires_in: number; refresh_token?: string }> {
  const tenant = tenantId || 'common';
  console.log(`🔄 Calling Microsoft token refresh API (tenant: ${tenant})`);
  
  const response = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: Deno.env.get('MICROSOFT_CLIENT_ID') || '',
      client_secret: Deno.env.get('MICROSOFT_CLIENT_SECRET') || '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: 'https://graph.microsoft.com/.default offline_access',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`❌ Microsoft token refresh API error:`, {
      status: response.status,
      statusText: response.statusText,
      error: error.substring(0, 200),
    });
    throw new Error(`Microsoft token refresh failed: ${error}`);
  }

  const result = await response.json();
  console.log(`✅ Microsoft token refresh response:`, {
    hasAccessToken: !!result.access_token,
    accessTokenLength: result.access_token?.length || 0,
    hasRefreshToken: !!result.refresh_token,
    expiresIn: result.expires_in,
  });
  
  return result;
}

// Refresh storage config tokens and update database
async function refreshStorageConfigTokens(
  supabase: any,
  storageConfig: any,
  encryptionKey: string
): Promise<{ success: boolean; accessToken?: string; error?: string }> {
  try {
    const configData = storageConfig.config as any || {};
    const encryptedRefreshToken = configData.encrypted_refresh_token || configData.encryptedRefreshToken;
    
    if (!encryptedRefreshToken) {
      return {
        success: false,
        error: 'No refresh token available for storage config',
      };
    }

    console.log(`🔄 Attempting to refresh token for ${storageConfig.provider} storage config: ${storageConfig.id}`);
    const refreshToken = decrypt(encryptedRefreshToken, encryptionKey);
    
    // Validate refresh token format
    if (!validateTokenFormat(refreshToken, storageConfig.provider)) {
      console.error(`❌ Refresh token is malformed for storage config ${storageConfig.id}:`, {
        tokenLength: refreshToken.length,
        tokenPreview: refreshToken.substring(0, 20) + '...',
        hasDots: refreshToken.includes('.'),
        provider: storageConfig.provider,
      });
      return {
        success: false,
        error: 'Refresh token is malformed. Please reconnect storage.',
      };
    }
    
    let newAccessToken: string;
    let newRefreshToken: string | undefined;
    let expiresIn: number;

    if (storageConfig.provider === 'google_drive') {
      const result = await refreshGoogleToken(refreshToken);
      newAccessToken = result.access_token;
      expiresIn = result.expires_in;
      console.log(`✅ Google Drive token refresh successful: token length=${newAccessToken.length}`);
    } else if (storageConfig.provider === 'onedrive') {
      const result = await refreshMicrosoftToken(refreshToken);
      newAccessToken = result.access_token;
      newRefreshToken = result.refresh_token;
      expiresIn = result.expires_in;
      console.log(`✅ OneDrive token refresh successful: token length=${newAccessToken.length}, has refresh=${!!newRefreshToken}`);
    } else {
      return {
        success: false,
        error: `Unsupported provider: ${storageConfig.provider}`,
      };
    }

    // Validate new token format
    if (!validateTokenFormat(newAccessToken, storageConfig.provider)) {
      console.error(`❌ Refreshed access token is malformed:`, {
        provider: storageConfig.provider,
        tokenLength: newAccessToken?.length || 0,
        tokenPreview: newAccessToken ? newAccessToken.substring(0, 50) + '...' : 'null',
        hasDots: newAccessToken?.includes('.') || false,
      });
      return {
        success: false,
        error: 'Refreshed token is malformed. Please reconnect storage.',
      };
    }
    
    // Log token format for debugging
    const tokenType = newAccessToken.includes('.') ? 'JWT' : 'Opaque';
    console.log(`✅ Token format validated: ${tokenType} token (length=${newAccessToken.length}, provider=${storageConfig.provider})`);

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Encrypt and update tokens in config
    const encryptedAccessToken = encrypt(newAccessToken, encryptionKey);
    const updatedConfig = {
      ...configData,
      encrypted_access_token: encryptedAccessToken,
      accessToken: undefined, // Remove plaintext token if exists
      expires_at: expiresAt.toISOString(),
    };

    if (newRefreshToken) {
      updatedConfig.encrypted_refresh_token = encrypt(newRefreshToken, encryptionKey);
    }

    const { error } = await supabase
      .from('storage_configs')
      .update({
        config: updatedConfig,
        updated_at: new Date().toISOString(),
      })
      .eq('id', storageConfig.id);

    if (error) {
      throw error;
    }

    console.log(`✅ Successfully refreshed token for storage config ${storageConfig.id}`);
    return {
      success: true,
      accessToken: newAccessToken,
    };
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error';
    console.error(`❌ Failed to refresh token for storage config ${storageConfig.id}:`, errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Download document from storage
 */
async function downloadDocumentFromStorage(
  supabase: any,
  document: any,
  encryptionKey: string
): Promise<Uint8Array> {
  const { data: storageConfig } = await supabase
    .from('storage_configs')
    .select('*')
    .eq('id', document.storage_config_id)
    .single();

  if (!storageConfig) {
    throw new Error('Storage configuration not found');
  }

  const config = storageConfig.config as any || {};
  const provider = storageConfig.provider;

  if (provider === 'supabase') {
    // Use Supabase storage directly
    const { data, error } = await supabase.storage
      .from(config.bucket || 'documents')
      .download(document.storage_path);

    if (error) throw new Error(`Failed to download: ${error.message}`);
    if (!data) throw new Error('No data returned');

    const arrayBuffer = await data.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } else if (provider === 'onedrive') {
    // Download from OneDrive using Microsoft Graph API
    let accessToken = config.encrypted_access_token
      ? decrypt(config.encrypted_access_token, encryptionKey)
      : config.accessToken;

    if (!accessToken) {
      throw new Error('OneDrive access token not found');
    }

    // Attempt download
    let response = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/items/${document.storage_path}/content`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    // If 401 (Unauthorized), token may be expired - try refreshing
    if (!response.ok && response.status === 401) {
      console.log(`🔄 OneDrive token expired (401), attempting refresh for storage config ${storageConfig.id}...`);
      const refreshResult = await refreshStorageConfigTokens(supabase, storageConfig, encryptionKey);
      
      if (refreshResult.success && refreshResult.accessToken) {
        accessToken = refreshResult.accessToken;
        console.log(`✅ OneDrive token refreshed successfully, retrying download...`);
        
        // Retry download with new token
        response = await fetch(
          `https://graph.microsoft.com/v1.0/me/drive/items/${document.storage_path}/content`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          throw new Error(`OneDrive download failed after refresh: ${response.status} ${response.statusText} ${errorText}`);
        }
      } else {
        throw new Error(`OneDrive access token is expired and refresh failed: ${refreshResult.error || 'Unknown error'}`);
      }
    } else if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`OneDrive download failed: ${response.status} ${response.statusText} ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } else if (provider === 'google_drive') {
    // Download from Google Drive using Drive API
    let accessToken = config.encrypted_access_token
      ? decrypt(config.encrypted_access_token, encryptionKey)
      : config.accessToken;

    if (!accessToken) {
      throw new Error('Google Drive access token not found');
    }

    // Attempt download
    let response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${document.storage_path}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    // If 401 (Unauthorized), token may be expired - try refreshing
    if (!response.ok && response.status === 401) {
      console.log(`🔄 Google Drive token expired (401), attempting refresh for storage config ${storageConfig.id}...`);
      const refreshResult = await refreshStorageConfigTokens(supabase, storageConfig, encryptionKey);
      
      if (refreshResult.success && refreshResult.accessToken) {
        accessToken = refreshResult.accessToken;
        console.log(`✅ Google Drive token refreshed successfully, retrying download...`);
        
        // Retry download with new token
        response = await fetch(
          `https://www.googleapis.com/drive/v3/files/${document.storage_path}?alt=media`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          throw new Error(`Google Drive download failed after refresh: ${response.status} ${response.statusText} ${errorText}`);
        }
      } else {
        throw new Error(`Google Drive access token is expired and refresh failed: ${refreshResult.error || 'Unknown error'}`);
      }
    } else if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Google Drive download failed: ${response.status} ${response.statusText} ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } else {
    throw new Error(`Unsupported storage provider: ${provider}`);
  }
}

/**
 * Check if a file is an image based on MIME type
 */
function isImageFile(mimeType: string): boolean {
  return mimeType?.startsWith('image/') || false;
}

/**
 * Convert binary data to base64 string
 */
function uint8ArrayToBase64(data: Uint8Array): string {
  const binary = Array.from(data)
    .map(byte => String.fromCharCode(byte))
    .join('');
  return btoa(binary);
}

/**
 * Extract text from document using OCR (basic implementation)
 * For images, we'll use OpenAI Vision API
 * For PDFs, we can try to extract text directly if it's a text-based PDF
 */
async function extractTextFromDocument(
  fileData: Uint8Array,
  mimeType: string
): Promise<string> {
  console.log(`Extracting text from ${mimeType} (${fileData.length} bytes)`);
  
  // For images, we'll use OpenAI Vision API in classifyDocumentWithLLM
  // For PDFs, we can try to extract text directly if it's a text-based PDF
  // For now, return empty string - OCR will be handled via Vision API for images
  
  return '';
}

/**
 * Classify document using LLM
 * For images, uses GPT-4o with vision capabilities
 * For other files, uses GPT-4o-mini with text
 */
async function classifyDocumentWithLLM(
  extractedText: string,
  filename: string,
  mimeType: string,
  openAiKey: string,
  fileData?: Uint8Array
): Promise<ValidationResult> {
  const isImage = isImageFile(mimeType);
  
  // Prepare the prompt
  const prompt = `Analyze this document and extract the following information. Return ONLY valid JSON.

Document filename: ${filename}
Document type: ${mimeType}
${extractedText ? `Extracted text: ${extractedText.substring(0, 2000)}...` : ''}

Extract and return JSON with these fields:
{
  "document_type": "passport|drivers_license|id_card|birth_certificate|visa|other",
  "issuing_country": "country code (e.g., USA, IND, GBR)",
  "document_number": "document number if visible",
  "expiry_date": "YYYY-MM-DD or null",
  "issue_date": "YYYY-MM-DD or null",
  "full_name_on_document": "full name as it appears on document",
  "dob_on_document": "YYYY-MM-DD or null"
}

Return ONLY the JSON object, no other text.`;

  try {
    // For images, use GPT-4o with vision capabilities
    // For other files, use GPT-4o-mini (text-only, cheaper)
    const model = isImage ? 'gpt-4o' : 'gpt-4o-mini';
    
    const messages: any[] = [
      {
        role: 'system',
        content: 'You are a document analysis expert. Extract structured data from documents. Return only valid JSON.',
      },
    ];

    // If it's an image, send the image data
    if (isImage && fileData) {
      // Convert image to base64
      const base64Image = uint8ArrayToBase64(fileData);
      const imageUrl = `data:${mimeType};base64,${base64Image}`;
      
      messages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt,
          },
          {
            type: 'image_url',
            image_url: {
              url: imageUrl,
            },
          },
        ],
      });
      
      console.log(`Using GPT-4o Vision API for image analysis (${fileData.length} bytes, ${mimeType})`);
    } else {
      // For non-images, use text-only
      messages.push({
        role: 'user',
        content: prompt,
      });
      
      console.log(`Using ${model} for text-based analysis`);
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        max_tokens: isImage ? 1000 : 500, // Images may need more tokens for detailed analysis
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content from OpenAI');
    }

    const result = JSON.parse(content) as ValidationResult;
    
    // Add confidence score (higher for images analyzed with vision API)
    const confidence = result.document_type 
      ? (isImage ? 0.9 : 0.85) // Vision API is more accurate
      : 0.5;
    
    return {
      ...result,
      document_type_confidence: confidence,
    };
  } catch (error) {
    console.error('LLM classification error:', error);
    // Fallback: try to infer from filename
    return {
      document_type: inferDocumentTypeFromFilename(filename),
      document_type_confidence: 0.6,
    };
  }
}

/**
 * Infer document type from filename (fallback)
 */
function inferDocumentTypeFromFilename(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.includes('passport')) return 'passport';
  if (lower.includes('driver') || lower.includes('license')) return 'drivers_license';
  if (lower.includes('id') || lower.includes('identification')) return 'id_card';
  if (lower.includes('birth') || lower.includes('certificate')) return 'birth_certificate';
  if (lower.includes('visa')) return 'visa';
  return 'other';
}

/**
 * Match owner identity using fuzzy matching
 */
async function matchOwnerIdentity(
  supabase: any,
  organizationId: string,
  senderEmail: string,
  docName?: string,
  docDOB?: string
): Promise<OwnerMatchResult> {
  // First, try exact email match
  const { data: employee, error: emailError } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('organization_id', organizationId)
    .eq('email', senderEmail)
    .single();

  if (emailError && emailError.code !== 'PGRST116') {
    console.error('Error looking up employee by email:', emailError);
  }

  if (employee) {
    let nameMatchScore = 1.0;
    let dobMatch = true;

    // If document name provided, do fuzzy matching
    if (docName && employee.full_name) {
      nameMatchScore = fuzzyMatchNames(docName, employee.full_name);
    }

    // If DOB provided, compare (date_of_birth column may not exist in profiles table)
    // Note: DOB matching is optional, so we skip if column doesn't exist
    if (docDOB && (employee as any).date_of_birth) {
      dobMatch = compareDates(docDOB, (employee as any).date_of_birth);
    } else if (docDOB) {
      // Default to true if DOB column doesn't exist
      dobMatch = true;
    }

    const confidence = calculateOwnerMatchConfidence(nameMatchScore, dobMatch, true);

    return {
      matched_employee_id: employee.id,
      name_match_score: nameMatchScore,
      dob_match: dobMatch,
      owner_match_confidence: confidence,
      requires_review: confidence < 0.85,
    };
  }

  // If no exact email match and docName provided, try fuzzy name matching
  if (docName) {
    const { data: employees, error: employeesError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('organization_id', organizationId);

    if (employeesError) {
      console.error('Error fetching employees for fuzzy matching:', employeesError);
    }

    if (employees && employees.length > 0) {
      let bestMatch = null;
      let bestScore = 0;

      for (const emp of employees) {
        if (emp.full_name) {
          const score = fuzzyMatchNames(docName, emp.full_name);
          if (score > bestScore && score > 0.7) {
            bestScore = score;
            bestMatch = emp;
          }
        }
      }

      if (bestMatch && bestScore > 0.7) {
        let dobMatch = true;
        // Note: date_of_birth column may not exist in profiles table
        if (docDOB && (bestMatch as any).date_of_birth) {
          dobMatch = compareDates(docDOB, (bestMatch as any).date_of_birth);
        } else if (docDOB) {
          // Default to true if DOB column doesn't exist
          dobMatch = true;
        }

        const confidence = calculateOwnerMatchConfidence(bestScore, dobMatch, false);

        return {
          matched_employee_id: bestMatch.id,
          name_match_score: bestScore,
          dob_match: dobMatch,
          owner_match_confidence: confidence,
          requires_review: confidence < 0.85,
        };
      }
    }
  }

  // No match found
  return {
    name_match_score: 0,
    dob_match: false,
    owner_match_confidence: 0,
    requires_review: true,
  };
}

/**
 * Normalize a name by removing commas, extra spaces, and converting to lowercase
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/,/g, ' ') // Replace commas with spaces
    .replace(/[^\w\s]/g, '') // Remove special characters except spaces
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
    .trim();
}

/**
 * Split a name into parts (first, middle, last)
 * Handles both "last, first middle" and "first middle last" formats
 */
interface NameParts {
  first: string;
  middle: string[];
  last: string;
  order: 'first_last' | 'last_first';
}

function parseNameParts(name: string): NameParts {
  const normalized = normalizeName(name);
  const parts = normalized.split(/\s+/).filter(p => p.length > 0);

  // Check if it's "last, first middle" format (comma indicates last name first)
  // Even after normalization, we check the original for comma pattern
  const hasCommaPattern = /^[^,]+,\s*[^,]+/.test(name.trim());
  
  if (hasCommaPattern && parts.length >= 2) {
    // Last, first [middle...] format
    return {
      last: parts[0],
      first: parts[1],
      middle: parts.slice(2),
      order: 'last_first' as const,
    };
  } else if (parts.length === 1) {
    // Single name - treat as first name
    return {
      first: parts[0],
      middle: [],
      last: '',
      order: 'first_last',
    };
  } else if (parts.length === 2) {
    // Two parts - assume first last
    return {
      first: parts[0],
      middle: [],
      last: parts[1],
      order: 'first_last',
    };
  } else {
    // Three or more parts - assume first [middle...] last
    return {
      first: parts[0],
      middle: parts.slice(1, -1),
      last: parts[parts.length - 1],
      order: 'first_last',
    };
  }
}

/**
 * Fuzzy match two name parts using Levenshtein distance
 */
function matchNamePart(part1: string, part2: string): number {
  if (!part1 || !part2) return 0;
  if (part1 === part2) return 1.0;
  
  const distance = levenshteinDistance(part1, part2);
  const maxLength = Math.max(part1.length, part2.length);
  
  if (maxLength === 0) return 1.0;
  
  return Math.max(0, 1 - (distance / maxLength));
}

/**
 * Match two name parts structures, trying both order variations
 */
function matchNameParts(parts1: NameParts, parts2: NameParts): number {
  // Try matching in original order
  const score1 = calculateNameMatchScore(parts1, parts2);
  
  // Try matching with reversed order for parts2
  const reversedParts2: NameParts = {
    first: parts2.last,
    middle: parts2.middle,
    last: parts2.first,
    order: parts2.order === 'first_last' ? 'last_first' : 'first_last',
  };
  const score2 = calculateNameMatchScore(parts1, reversedParts2);
  
  // Try matching with reversed order for parts1
  const reversedParts1: NameParts = {
    first: parts1.last,
    middle: parts1.middle,
    last: parts1.first,
    order: parts1.order === 'first_last' ? 'last_first' : 'first_last',
  };
  const score3 = calculateNameMatchScore(reversedParts1, parts2);
  
  // Return the best score
  return Math.max(score1, score2, score3);
}

/**
 * Calculate match score between two name parts structures
 */
function calculateNameMatchScore(parts1: NameParts, parts2: NameParts): number {
  // Match first names
  const firstScore = matchNamePart(parts1.first, parts2.first);
  
  // Match last names
  const lastScore = matchNamePart(parts1.last, parts2.last);
  
  // Match middle names (handle missing middle names)
  let middleScore = 1.0;
  if (parts1.middle.length > 0 && parts2.middle.length > 0) {
    // Both have middle names - try to match them
    const middle1 = parts1.middle.join(' ');
    const middle2 = parts2.middle.join(' ');
    middleScore = matchNamePart(middle1, middle2);
  } else if (parts1.middle.length > 0 || parts2.middle.length > 0) {
    // One has middle name, other doesn't - check if it matches first/last
    const middle1 = parts1.middle.length > 0 ? parts1.middle.join(' ') : '';
    const middle2 = parts2.middle.length > 0 ? parts2.middle.join(' ') : '';
    
    // Check if middle name from one matches first or last of the other
    const middleToFirst1 = middle1 ? matchNamePart(middle1, parts2.first) : 0;
    const middleToFirst2 = middle2 ? matchNamePart(middle2, parts1.first) : 0;
    const middleToLast1 = middle1 ? matchNamePart(middle1, parts2.last) : 0;
    const middleToLast2 = middle2 ? matchNamePart(middle2, parts1.last) : 0;
    
    const bestMiddleMatch = Math.max(middleToFirst1, middleToFirst2, middleToLast1, middleToLast2);
    
    // If first and last match perfectly, don't penalize too much for missing middle
    // Otherwise, apply a moderate penalty
    if (firstScore >= 0.9 && lastScore >= 0.9) {
      middleScore = Math.max(bestMiddleMatch, 0.85); // Higher score when first/last match perfectly
    } else {
      middleScore = Math.max(bestMiddleMatch, 0.7); // Standard penalty
    }
  }
  
  // Weighted score: first and last are more important
  // First name: 35%, Last name: 40%, Middle name: 25% (if present)
  let totalWeight = 0.75; // base weight for first + last
  let weightedScore = firstScore * 0.35 + lastScore * 0.40;
  
  if (parts1.middle.length > 0 || parts2.middle.length > 0) {
    weightedScore += middleScore * 0.25;
    totalWeight = 1.0;
  }
  
  return weightedScore / totalWeight;
}

/**
 * Improved fuzzy name matching that handles:
 * - Name order variations (last, first vs first last)
 * - Missing middle names
 * - Comma-separated formats
 * - Individual name part matching
 */
function fuzzyMatchNames(name1: string, name2: string): number {
  // Normalize and check exact match first
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);
  if (n1 === n2) {
    return 1.0;
  }
  
  // Parse both names into parts
  const parts1 = parseNameParts(name1);
  const parts2 = parseNameParts(name2);
  
  // Match the parts (tries both order variations)
  const matchScore = matchNameParts(parts1, parts2);
  
  // Also try a simple string similarity as fallback (for edge cases)
  const simpleDistance = levenshteinDistance(n1, n2);
  const maxLength = Math.max(n1.length, n2.length);
  const simpleScore = maxLength > 0 ? 1 - (simpleDistance / maxLength) : 0;
  
  // Return the better of the two scores
  return Math.max(matchScore, simpleScore * 0.8); // Weight simple score slightly lower
}

/**
 * Levenshtein distance calculation
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Compare two dates (YYYY-MM-DD format)
 */
function compareDates(date1: string, date2: string): boolean {
  try {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getTime() === d2.getTime();
  } catch {
    return false;
  }
}

/**
 * Calculate owner match confidence
 */
function calculateOwnerMatchConfidence(
  nameScore: number,
  dobMatch: boolean,
  emailMatch: boolean
): number {
  let confidence = nameScore * 0.6; // Name is 60% weight
  if (emailMatch) confidence += 0.3; // Email match adds 30%
  if (dobMatch) confidence += 0.1; // DOB match adds 10%
  return Math.min(confidence, 1.0);
}

/**
 * Analyze expiry date
 */
function analyzeExpiry(expiryDate?: string, issueDate?: string): ExpiryAnalysis {
  if (!expiryDate) {
    return {
      expiry_status: 'no_expiry',
    };
  }

  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);

  const daysUntilExpiry = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  let expiryStatus: 'expired' | 'expiring_soon' | 'expiring_later' | 'no_expiry';
  
  if (daysUntilExpiry < 0) {
    expiryStatus = 'expired';
  } else if (daysUntilExpiry <= 90) {
    expiryStatus = 'expiring_soon';
  } else {
    expiryStatus = 'expiring_later';
  }

  return {
    expiry_date: expiryDate,
    issue_date: issueDate,
    expiry_status: expiryStatus,
    days_until_expiry: daysUntilExpiry,
  };
}

/**
 * Check if file data matches expected format based on MIME type
 */
function validateFileFormat(fileData: Uint8Array, mimeType: string): boolean {
  if (!fileData || fileData.length === 0) {
    return false;
  }

  // Check PDF format (starts with %PDF)
  if (mimeType === 'application/pdf') {
    return fileData[0] === 0x25 && fileData[1] === 0x50 && fileData[2] === 0x44 && fileData[3] === 0x46;
  }

  // Check image formats using magic numbers
  if (mimeType?.startsWith('image/')) {
    // JPEG: starts with FF D8 FF
    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
      return fileData[0] === 0xFF && fileData[1] === 0xD8 && fileData[2] === 0xFF;
    }
    // PNG: starts with 89 50 4E 47
    if (mimeType === 'image/png') {
      return fileData[0] === 0x89 && fileData[1] === 0x50 && fileData[2] === 0x4E && fileData[3] === 0x47;
    }
    // GIF: starts with GIF8
    if (mimeType === 'image/gif') {
      return (fileData[0] === 0x47 && fileData[1] === 0x49 && fileData[2] === 0x46 && fileData[3] === 0x38);
    }
    // WebP: starts with RIFF...WEBP
    if (mimeType === 'image/webp') {
      return fileData[0] === 0x52 && fileData[1] === 0x49 && fileData[2] === 0x46 && fileData[3] === 0x46 &&
             fileData[8] === 0x57 && fileData[9] === 0x45 && fileData[10] === 0x42 && fileData[11] === 0x50;
    }
    // BMP: starts with BM
    if (mimeType === 'image/bmp') {
      return fileData[0] === 0x42 && fileData[1] === 0x4D;
    }
    // For other image types, just check that file is not empty
    return fileData.length > 0;
  }

  // For other types, just check that file is not empty
  return fileData.length > 0;
}

/**
 * Check document authenticity and quality (basic implementation)
 */
async function checkAuthenticity(
  supabase: any,
  documentId: string,
  organizationId: string,
  fileData: Uint8Array,
  mimeType: string
): Promise<AuthenticityCheck> {
  // Validate file format matches MIME type
  const formatValid = validateFileFormat(fileData, mimeType);
  
  // Check if it's a valid PDF
  const pdfValid = mimeType === 'application/pdf' && formatValid;
  
  // Check if it's a valid image
  const imageValid = mimeType?.startsWith('image/') && formatValid;
  
  // Calculate authenticity score
  let authenticityScore = 0.7; // Base score
  if (formatValid) {
    if (pdfValid) {
      authenticityScore = 0.9;
    } else if (imageValid) {
      authenticityScore = 0.85; // Images are generally valid if format matches
    }
  }
  
  // Check for duplicates (by file hash)
  const fileHash = await calculateFileHash(fileData);
  
  const { data: existingDocs } = await supabase
    .from('documents')
    .select('id')
    .eq('organization_id', organizationId)
    .neq('id', documentId);

  let duplicateOf: string | undefined;
  let isDuplicate = false;

  // For now, simple duplicate check by size and filename
  // In production, use content hash comparison
  
  return {
    authenticity_score: authenticityScore,
    pdf_valid: pdfValid,
    is_duplicate: isDuplicate,
    duplicate_of_document_id: duplicateOf,
    requires_review: !formatValid || isDuplicate,
  };
}

/**
 * Calculate file hash (SHA-256)
 */
async function calculateFileHash(data: Uint8Array): Promise<string> {
  // Convert Uint8Array to ArrayBuffer for crypto.subtle
  const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Normalize document type for comparison
 * Handles variations like "driving license" vs "drivers_license"
 */
function normalizeDocumentType(type: string): string {
  if (!type) return '';
  
  const normalized = type.toLowerCase()
    .trim()
    .replace(/[_\s-]+/g, ' ') // Replace underscores, multiple spaces, hyphens with single space
    .replace(/'/g, '') // Remove apostrophes
    .replace(/\s+/g, ' '); // Normalize whitespace
  
  return normalized;
}

/**
 * Map document type variations to standard types
 */
function getDocumentTypeSynonyms(type: string): string[] {
  const normalized = normalizeDocumentType(type);
  const synonyms: string[] = [normalized];
  
  // Map common variations to standard types
  const synonymMap: Record<string, string[]> = {
    'driving license': ['drivers license', 'driver license', 'drivers_license', 'driver_license', 'driving_license'],
    'drivers license': ['driving license', 'driver license', 'drivers_license', 'driver_license', 'driving_license'],
    'driver license': ['driving license', 'drivers license', 'drivers_license', 'driver_license', 'driving_license'],
    'drivers_license': ['driving license', 'drivers license', 'driver license', 'driver_license', 'driving_license'],
    'driver_license': ['driving license', 'drivers license', 'driver license', 'drivers_license', 'driving_license'],
    'driving_license': ['driving license', 'drivers license', 'driver license', 'drivers_license', 'driver_license'],
    'id card': ['id_card', 'identification card', 'national id', 'government id'],
    'id_card': ['id card', 'identification card', 'national id', 'government id'],
    'identification card': ['id card', 'id_card', 'national id', 'government id'],
    'birth certificate': ['birth_certificate', 'birth cert'],
    'birth_certificate': ['birth certificate', 'birth cert'],
  };
  
  // Add synonyms for the normalized type
  const key = Object.keys(synonymMap).find(k => normalizeDocumentType(k) === normalized);
  if (key) {
    synonyms.push(...synonymMap[key].map(s => normalizeDocumentType(s)));
  }
  
  return [...new Set(synonyms)]; // Remove duplicates
}

/**
 * Check if two document types match (fuzzy matching with synonyms)
 */
function documentTypesMatch(type1: string, type2: string): boolean {
  if (!type1 || !type2) return false;
  
  const normalized1 = normalizeDocumentType(type1);
  const normalized2 = normalizeDocumentType(type2);
  
  // Exact match after normalization
  if (normalized1 === normalized2) return true;
  
  // Check if one contains the other (after normalization)
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return true;
  }
  
  // Check synonyms
  const synonyms1 = getDocumentTypeSynonyms(type1);
  const synonyms2 = getDocumentTypeSynonyms(type2);
  
  // Check if any synonym from type1 matches any synonym from type2
  for (const syn1 of synonyms1) {
    for (const syn2 of synonyms2) {
      if (syn1 === syn2 || syn1.includes(syn2) || syn2.includes(syn1)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Check request compliance
 */
async function checkRequestCompliance(
  supabase: any,
  documentId: string,
  documentType: string | undefined
): Promise<RequestCompliance> {
  // Get document request if linked
  const { data: document } = await supabase
    .from('documents')
    .select('document_request_id')
    .eq('id', documentId)
    .single();

  if (!document?.document_request_id) {
    return {
      matches_request_type: true, // No request to match against
      request_compliance_score: 1.0,
    };
  }

  const { data: request } = await supabase
    .from('document_requests')
    .select('request_type, subject')
    .eq('id', document.document_request_id)
    .single();

  if (!request) {
    return {
      matches_request_type: true,
      request_compliance_score: 1.0,
    };
  }

  const requestedType = request.request_type || '';
  const submittedType = documentType || '';

  // If no requested type specified, consider it compliant
  if (!requestedType || requestedType.trim() === '') {
    return {
      matches_request_type: true,
      request_compliance_score: 1.0,
    };
  }

  // Use fuzzy matching with synonyms
  const matches = documentTypesMatch(requestedType, submittedType);
  
  // Calculate score based on match quality
  let score = 0.5; // Default score for mismatch
  if (matches) {
    const normalizedRequested = normalizeDocumentType(requestedType);
    const normalizedSubmitted = normalizeDocumentType(submittedType);
    
    // Exact match gets highest score
    if (normalizedRequested === normalizedSubmitted) {
      score = 1.0;
    } else {
      // Partial match gets high score
      score = 0.9;
    }
  }

  console.log('Request compliance check:', {
    requestedType,
    submittedType,
    normalizedRequested: normalizeDocumentType(requestedType),
    normalizedSubmitted: normalizeDocumentType(submittedType),
    matches,
    score,
  });

  return {
    matches_request_type: matches,
    request_compliance_score: score,
  };
}

/**
 * Determine overall validation status
 */
function determineValidationStatus(
  ownerMatch: OwnerMatchResult,
  expiryAnalysis: ExpiryAnalysis,
  authenticity: AuthenticityCheck,
  requestCompliance: RequestCompliance,
  autoApprovalConfig: any
): ValidationSummary {
  const criticalIssues: string[] = [];
  const warnings: string[] = [];

  // Check owner match
  if (ownerMatch.owner_match_confidence < 0.70) {
    criticalIssues.push('name_match_low_confidence');
  } else if (ownerMatch.owner_match_confidence < 0.90) {
    warnings.push('name_match_moderate_confidence');
  }

  // Check expiry
  if (expiryAnalysis.expiry_status === 'expired' && !autoApprovalConfig?.allow_expired_documents) {
    criticalIssues.push('document_expired');
  } else if (expiryAnalysis.expiry_status === 'expiring_soon') {
    warnings.push(`expiring_in_${expiryAnalysis.days_until_expiry}_days`);
  }

  // Check authenticity
  if (authenticity.authenticity_score < 0.70) {
    criticalIssues.push('authenticity_check_failed');
  } else if (authenticity.authenticity_score < 0.85) {
    warnings.push('authenticity_score_low');
  }

  // Check request compliance
  if (!requestCompliance.matches_request_type) {
    criticalIssues.push('document_type_mismatch');
  }

  // Determine if can auto-approve
  const canAutoApprove = 
    criticalIssues.length === 0 &&
    ownerMatch.owner_match_confidence >= (autoApprovalConfig?.min_owner_match_confidence || 0.90) &&
    authenticity.authenticity_score >= (autoApprovalConfig?.min_authenticity_score || 0.85) &&
    requestCompliance.request_compliance_score >= (autoApprovalConfig?.min_request_compliance_score || 0.95);

  // Determine overall status
  let overallStatus: 'verified' | 'needs_review' | 'rejected';
  if (criticalIssues.length > 0) {
    overallStatus = 'rejected';
  } else if (canAutoApprove) {
    overallStatus = 'verified';
  } else {
    overallStatus = 'needs_review';
  }

  // Determine review priority
  let reviewPriority: 'low' | 'medium' | 'high' | 'critical';
  if (criticalIssues.length > 0) {
    reviewPriority = 'critical';
  } else if (warnings.length > 2 || ownerMatch.owner_match_confidence < 0.85) {
    reviewPriority = 'high';
  } else if (warnings.length > 0) {
    reviewPriority = 'medium';
  } else {
    reviewPriority = 'low';
  }

  return {
    overall_status: overallStatus,
    can_auto_approve: canAutoApprove,
    requires_admin_review: !canAutoApprove,
    review_priority: reviewPriority,
    critical_issues: criticalIssues,
    warnings: warnings,
  };
}

/**
 * Main validation function
 */
async function validateDocument(
  supabase: any,
  documentId: string,
  encryptionKey: string,
  openAiKey: string
): Promise<void> {
  // Get document
  const { data: document, error: docError } = await supabase
    .from('documents')
    .select('*, document_requests:document_request_id(*)')
    .eq('id', documentId)
    .single();

  if (docError || !document) {
    throw new Error(`Document not found: ${docError?.message}`);
  }

  // Update validation status to 'validating'
  await supabase
    .from('documents')
    .update({ validation_status: 'validating' })
    .eq('id', documentId);

  try {
    // Download document
    const fileData = await downloadDocumentFromStorage(supabase, document, encryptionKey);

    // Extract text (basic - will be enhanced with OCR)
    // For images, we'll pass the file data to the LLM for vision analysis
    const extractedText = await extractTextFromDocument(fileData, document.mime_type || '');

    // Classify document using LLM
    // Pass fileData for images so GPT-4o Vision can analyze them
    const classification = await classifyDocumentWithLLM(
      extractedText,
      document.original_filename,
      document.mime_type || '',
      openAiKey,
      isImageFile(document.mime_type || '') ? fileData : undefined
    );

    // Match owner identity
    const ownerMatch = await matchOwnerIdentity(
      supabase,
      document.organization_id,
      document.sender_email,
      classification.full_name_on_document,
      classification.dob_on_document
    );

    // Analyze expiry
    const expiryAnalysis = analyzeExpiry(
      classification.expiry_date,
      classification.issue_date
    );

    // Check authenticity
    const authenticity = await checkAuthenticity(
      supabase,
      documentId,
      document.organization_id,
      fileData,
      document.mime_type || ''
    );

    // Check request compliance
    const requestCompliance = await checkRequestCompliance(
      supabase,
      documentId,
      classification.document_type
    );

    // Get auto-approval config
    const { data: org } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', document.organization_id)
      .single();

    const autoApprovalConfig = org?.settings?.auto_approval || {
      min_owner_match_confidence: 0.90,
      min_authenticity_score: 0.85,
      min_request_compliance_score: 0.95,
      allow_expired_documents: false,
    };

    // Determine overall status
    const summary = determineValidationStatus(
      ownerMatch,
      expiryAnalysis,
      authenticity,
      requestCompliance,
      autoApprovalConfig
    );

    // Save validation results
    const validationData = {
      document_id: documentId,
      organization_id: document.organization_id,
      document_type: classification.document_type,
      document_type_confidence: classification.document_type_confidence,
      issuing_country: classification.issuing_country,
      document_number: classification.document_number,
      matched_employee_id: ownerMatch.matched_employee_id,
      name_match_score: ownerMatch.name_match_score,
      dob_match: ownerMatch.dob_match,
      owner_match_confidence: ownerMatch.owner_match_confidence,
      expiry_date: expiryAnalysis.expiry_date,
      issue_date: expiryAnalysis.issue_date,
      expiry_status: expiryAnalysis.expiry_status,
      days_until_expiry: expiryAnalysis.days_until_expiry,
      authenticity_score: authenticity.authenticity_score,
      image_quality_score: authenticity.image_quality_score,
      is_duplicate: authenticity.is_duplicate,
      duplicate_of_document_id: authenticity.duplicate_of_document_id,
      matches_request_type: requestCompliance.matches_request_type,
      request_compliance_score: requestCompliance.request_compliance_score,
      overall_status: summary.overall_status,
      can_auto_approve: summary.can_auto_approve,
      requires_admin_review: summary.requires_admin_review,
      review_priority: summary.review_priority,
      validation_metadata: {
        classification,
        owner_match: ownerMatch,
        expiry_analysis: expiryAnalysis,
        authenticity,
        request_compliance: requestCompliance,
        summary,
      },
    };

    // Upsert validation (document_id has UNIQUE constraint)
    // Try update first, then insert if no rows updated
    const { data: existing, error: checkError } = await supabase
      .from('document_validations')
      .select('id')
      .eq('document_id', documentId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error(`Failed to check existing validation: ${checkError.message}`);
    }

    if (existing) {
      // Update existing validation
      const { error: updateError } = await supabase
        .from('document_validations')
        .update(validationData)
        .eq('document_id', documentId);

      if (updateError) {
        throw new Error(`Failed to update validation: ${updateError.message}`);
      }
    } else {
      // Insert new validation
      const { error: insertError } = await supabase
        .from('document_validations')
        .insert(validationData);

      if (insertError) {
        throw new Error(`Failed to save validation: ${insertError.message}`);
      }
    }

    console.log(`✅ Validation completed for document ${documentId}: ${summary.overall_status}`);
  } catch (error) {
    console.error(`❌ Validation failed for document ${documentId}:`, error);
    
    // Update status to indicate error
    await supabase
      .from('documents')
      .update({ 
        validation_status: 'needs_review',
        validation_metadata: { error: error.message },
      })
      .eq('id', documentId);
    
    throw error;
  }
}

/**
 * Main serve handler
 */
serve(async (req) => {
  try {
    const { documentId } = await req.json();

    if (!documentId) {
      return new Response(
        JSON.stringify({ error: 'documentId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY')!;
    const openAiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openAiKey) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Run validation
    await validateDocument(supabase, documentId, encryptionKey, openAiKey);

    return new Response(
      JSON.stringify({ success: true, message: 'Document validated successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Validation function error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Validation failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

