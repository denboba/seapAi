# Scripts Directory

This directory contains utility scripts for data processing and system maintenance.

## Available Scripts

### `convert_to_csv.py` (Primary)

**Python script** for converting procurement data from JSON to CSV format for AI training.

**Requirements:** Python 3.6+

**Usage:**

```bash
# Using npm script (recommended - uses default paths)
npm run convert:csv

# Direct usage with Python
python3 scripts/convert_to_csv.py [input-file] [output-file]

# Examples
python3 scripts/convert_to_csv.py
python3 scripts/convert_to_csv.py public/data.json output/training-data.csv
```

**Default Behavior:**
- **Input**: `public/data.json`
- **Output**: `output/procurement-training-data-YYYY-MM-DD.csv` (timestamped)
- Creates output directory if it doesn't exist
- Processes all items in the JSON data
- Flattens nested objects into 34 CSV columns

**Features:**
- Native Python CSV library (proper escaping and quoting)
- Progress tracking for large datasets (reports every 500 records)
- File size and record count reporting
- Error handling with informative messages
- UTF-8 encoding support
- Automatic timestamp in filename

### `convertToCSV.cjs` (Legacy)

**Node.js script** for the same purpose. Kept for compatibility.

**Usage:**

```bash
node scripts/convertToCSV.cjs [input-file] [output-file]
```

## Output Format

The CSV file contains flattened procurement data with these 34 columns:

**Categories:**
- **Identifiers**: caNoticeId, noticeId, procedureId, noticeNo
- **States**: notice and procedure states (ID and text)
- **Authority**: contracting authority information
- **Contract Details**: title, types, CPV codes
- **Financial Data**: values, offers, estimates
- **Dates**: publication dates, deadlines
- **Boolean Flags**: isOnline, isPPP, isUtility, hasSubsequentContracts
- **Metadata**: errataNo, versionNo, currencyCode

See [AI Training Guide](../docs/AI_TRAINING_GUIDE.md) for detailed information on the CSV schema and how to use the data for machine learning.

## Adding New Scripts

When adding new scripts:

**For Python scripts (`.py`):**
1. Add shebang: `#!/usr/bin/env python3`
2. Add executable permissions: `chmod +x scripts/yourscript.py`
3. Use proper error handling and exit codes
4. Add docstrings for functions
5. Support command-line arguments

**For Node.js scripts:**
1. Use `.cjs` extension for CommonJS (with `require()`)
2. Use `.mjs` extension for ES modules (with `import`)
3. Add executable permissions: `chmod +x scripts/yourscript.cjs`

**General Guidelines:**
1. Add npm script in `package.json` for convenience
2. Document usage in this README
3. Handle errors gracefully
4. Provide progress feedback for long-running operations
5. Scripts should be idempotent where possible
6. Always validate input before processing
7. Create output directories if they don't exist
8. Log progress and completion status
9. Exit with appropriate error codes (0 = success, 1 = error)

## Python vs Node.js

**Use Python when:**
- Data science / ML workflows
- Integration with pandas, numpy, sklearn
- CSV/JSON processing
- Statistical analysis

**Use Node.js when:**
- Web application integration
- TypeScript type safety needed
- Browser-based tools

## Notes

- Primary conversion script is now Python-based (`convert_to_csv.py`)
- Node.js version maintained for compatibility
- Both scripts produce identical CSV output
- Output files are timestamped to prevent overwrites
