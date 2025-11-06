#!/bin/bash
# Copy migration SQL to clipboard for easy pasting into Supabase Dashboard

MIGRATION_FILE="supabase/migrations/20250106000000_add_document_request_status_tracking.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Migration file not found: $MIGRATION_FILE"
    exit 1
fi

# Copy to clipboard (macOS)
if command -v pbcopy &> /dev/null; then
    cat "$MIGRATION_FILE" | pbcopy
    echo "✅ Migration SQL copied to clipboard!"
    echo ""
    echo "Next steps:"
    echo "  1. Go to: https://supabase.com/dashboard/project/nneyhfhdthpxmkemyenm/sql"
    echo "  2. Click 'New Query'"
    echo "  3. Paste (Cmd+V) and click 'Run'"
elif command -v xclip &> /dev/null; then
    cat "$MIGRATION_FILE" | xclip -selection clipboard
    echo "✅ Migration SQL copied to clipboard!"
    echo ""
    echo "Next steps:"
    echo "  1. Go to: https://supabase.com/dashboard/project/nneyhfhdthpxmkemyenm/sql"
    echo "  2. Click 'New Query'"
    echo "  3. Paste (Ctrl+V) and click 'Run'"
else
    echo "⚠️  Clipboard not available. Here's the file location:"
    echo "   $MIGRATION_FILE"
    echo ""
    echo "Please open it manually and copy the contents."
fi
