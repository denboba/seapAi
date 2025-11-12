# Scripts Directory

This directory contains utility scripts for data processing and system maintenance.

## Available Scripts

### `convertToCSV.cjs`

Converts procurement data from JSON to CSV format for AI training.

**Usage:**

```bash
# Using npm script (default paths)
npm run convert:csv

# Direct usage with custom paths
node scripts/convertToCSV.cjs [input-file] [output-file]

# Example
node scripts/convertToCSV.cjs public/data.json output/training-data.csv
```

**Default Behavior:**
- **Input**: `public/data.json`
- **Output**: `output/procurement-training-data.csv`
- Creates output directory if it doesn't exist
- Processes all items in the JSON data
- Flattens nested objects into 34 CSV columns

**Features:**
- Proper CSV escaping (handles quotes, commas, newlines)
- Progress tracking for large datasets
- File size and record count reporting
- Error handling with informative messages

**Output Format:**
The CSV file contains flattened procurement data with these columns:
- Identifiers (caNoticeId, noticeId, procedureId, noticeNo)
- States (notice and procedure states)
- Authority information
- Contract details (title, types, CPV codes)
- Financial data (values, offers)
- Dates (publication, deadlines)
- Boolean flags (isOnline, isPPP, isUtility, etc.)

See [AI Training Guide](../docs/AI_TRAINING_GUIDE.md) for detailed information on the CSV schema and how to use the data for machine learning.

## Adding New Scripts

When adding new scripts:

1. Use `.cjs` extension for CommonJS (with `require()`)
2. Use `.mjs` extension for ES modules (with `import`)
3. Add executable permissions: `chmod +x scripts/yourscript.cjs`
4. Add npm script in `package.json` for convenience
5. Document usage in this README
6. Handle errors gracefully
7. Provide progress feedback for long-running operations

## Notes

- Scripts should be idempotent where possible
- Always validate input before processing
- Create output directories if they don't exist
- Log progress and completion status
- Exit with appropriate error codes (0 = success, 1 = error)
