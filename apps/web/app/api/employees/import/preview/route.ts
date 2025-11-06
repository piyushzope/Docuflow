import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseCSV } from '@/lib/utils/csv-parser';
import { parseExcel } from '@/lib/utils/excel-parser';
import {
  detectFieldMapping,
  validateImportData,
  IMPORTABLE_FIELDS,
} from '@/lib/utils/employee-import';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ROWS = 1000;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 400 }
      );
    }

    // Check permissions (admin/owner for import)
    if (profile.role !== 'owner' && profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only administrators can import employees' },
        { status: 403 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
        { status: 400 }
      );
    }

    // Validate file type
    const fileType = file.type;
    const fileName = file.name.toLowerCase();
    const isCSV = fileName.endsWith('.csv') || fileType === 'text/csv';
    const isExcel =
      fileName.endsWith('.xlsx') ||
      fileName.endsWith('.xls') ||
      fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      fileType === 'application/vnd.ms-excel';

    if (!isCSV && !isExcel) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a CSV or Excel (.xlsx) file' },
        { status: 400 }
      );
    }

    // Read file
    const arrayBuffer = await file.arrayBuffer();

    // Parse file
    let parsedData: { data: Record<string, any>[]; headers: string[]; errors: string[] };
    let sheetNames: string[] = [];

    if (isCSV) {
      const text = new TextDecoder('utf-8').decode(arrayBuffer);
      const result = parseCSV(text, { header: true });
      parsedData = {
        data: result.data,
        headers: result.headers,
        errors: result.errors,
      };
    } else {
      const result = parseExcel(arrayBuffer);
      parsedData = {
        data: result.data,
        headers: result.headers,
        errors: result.errors,
      };
      sheetNames = result.sheetNames;
    }

    if (parsedData.errors.length > 0) {
      return NextResponse.json(
        { error: `Failed to parse file: ${parsedData.errors.join(', ')}` },
        { status: 400 }
      );
    }

    if (parsedData.data.length === 0) {
      return NextResponse.json(
        { error: 'File contains no data rows' },
        { status: 400 }
      );
    }

    // Check row limit
    if (parsedData.data.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `File contains ${parsedData.data.length} rows. Maximum ${MAX_ROWS} rows allowed.` },
        { status: 400 }
      );
    }

    // Get existing emails for duplicate detection
    const { data: existingEmployees } = await supabase
      .from('profiles')
      .select('email')
      .eq('organization_id', profile.organization_id);

    const existingEmails = new Set(
      (existingEmployees || []).map((e) => e.email.toLowerCase())
    );

    // Auto-detect field mapping
    const fieldMapping = detectFieldMapping(parsedData.headers);

    // Validate data
    const validation = validateImportData(
      parsedData.data,
      fieldMapping,
      existingEmails
    );

    return NextResponse.json({
      success: true,
      headers: parsedData.headers,
      fieldMapping,
      validation,
      sheetNames,
      totalRows: parsedData.data.length,
    });
  } catch (error: any) {
    console.error('Import preview error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to preview import file' },
      { status: 500 }
    );
  }
}

