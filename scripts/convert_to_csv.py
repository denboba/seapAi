#!/usr/bin/env python3
"""
JSON to CSV Converter for Procurement Data
Converts data.json procurement data to CSV format for AI training

Usage:
    python scripts/convert_to_csv.py [input_file] [output_file]
    
Example:
    python scripts/convert_to_csv.py public/data.json output/training-data.csv
"""

import json
import csv
import sys
import os
from pathlib import Path
from datetime import datetime


def flatten_notice_item(item):
    """
    Flattens nested objects into a single-level structure suitable for CSV
    
    Args:
        item: Dictionary representing a procurement notice
        
    Returns:
        Dictionary with flattened structure
    """
    return {
        # Basic identifiers
        'caNoticeId': item.get('caNoticeId', ''),
        'noticeId': item.get('noticeId', ''),
        'procedureId': item.get('procedureId', ''),
        'noticeNo': item.get('noticeNo', ''),
        
        # Notice state
        'sysNoticeTypeId': item.get('sysNoticeTypeId', ''),
        'noticeStateId': item.get('sysNoticeState', {}).get('id', ''),
        'noticeStateText': item.get('sysNoticeState', {}).get('text', ''),
        
        # Procedure state
        'procedureStateId': item.get('sysProcedureState', {}).get('id', ''),
        'procedureStateText': item.get('sysProcedureState', {}).get('text', ''),
        
        # Contracting authority
        'contractingAuthority': item.get('contractingAuthorityNameAndFN', ''),
        'contractTitle': item.get('contractTitle', ''),
        
        # Contract types
        'acquisitionContractTypeId': item.get('sysAcquisitionContractType', {}).get('id', ''),
        'acquisitionContractTypeText': item.get('sysAcquisitionContractType', {}).get('text', ''),
        'procedureTypeId': item.get('sysProcedureType', {}).get('id', ''),
        'procedureTypeText': item.get('sysProcedureType', {}).get('text', ''),
        'contractAssigmentTypeId': item.get('sysContractAssigmentType', {}).get('id', ''),
        'contractAssigmentTypeText': item.get('sysContractAssigmentType', {}).get('text', ''),
        
        # CPV and values
        'cpvCodeAndName': item.get('cpvCodeAndName', ''),
        'ronContractValue': item.get('ronContractValue', ''),
        'estimatedValueExport': item.get('estimatedValueExport', ''),
        'highestOfferValue': item.get('highestOfferValue', ''),
        'lowestOfferValue': item.get('lowestOfferValue', ''),
        
        # Dates
        'noticeStateDate': item.get('noticeStateDate', ''),
        'minTenderReceiptDeadline': item.get('minTenderReceiptDeadline', ''),
        'maxTenderReceiptDeadline': item.get('maxTenderReceiptDeadline', ''),
        'tenderReceiptDeadlineExport': item.get('tenderReceiptDeadlineExport', ''),
        
        # Flags
        'isOnline': str(item.get('isOnline', '')).lower() if isinstance(item.get('isOnline'), bool) else item.get('isOnline', ''),
        'hasSubsequentContracts': str(item.get('hasSubsequentContracts', '')).lower() if isinstance(item.get('hasSubsequentContracts'), bool) else item.get('hasSubsequentContracts', ''),
        'isUtility': str(item.get('isUtility', '')).lower() if isinstance(item.get('isUtility'), bool) else item.get('isUtility', ''),
        'isPPP': str(item.get('isPPP', '')).lower() if isinstance(item.get('isPPP'), bool) else item.get('isPPP', ''),
        
        # Other fields
        'errataNo': item.get('errataNo', ''),
        'versionNo': item.get('versionNo', ''),
        'sysNoticeVersionId': item.get('sysNoticeVersionId', ''),
        'currencyCode': item.get('currencyCode', ''),
    }


def convert_json_to_csv(input_file, output_file):
    """
    Converts procurement data from JSON to CSV format
    
    Args:
        input_file: Path to input JSON file
        output_file: Path to output CSV file
    """
    print('=' * 60)
    print('Procurement Data JSON to CSV Converter (Python)')
    print('=' * 60)
    print(f'Input file:  {input_file}')
    print(f'Output file: {output_file}')
    print('=' * 60)
    
    # Check if input file exists
    if not os.path.exists(input_file):
        print(f'Error: Input file "{input_file}" not found')
        sys.exit(1)
    
    try:
        # Read and parse JSON file
        print('Reading input file...')
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if 'items' not in data or not data['items']:
            print('Error: No items found in data')
            sys.exit(1)
        
        total_records = data.get('total', 'unknown')
        items_count = len(data['items'])
        print(f'Total records in JSON: {total_records}')
        print(f'Processing {items_count} procurement notices...')
        
        # Get headers from the first flattened item
        first_item = flatten_notice_item(data['items'][0])
        headers = list(first_item.keys())
        print(f'CSV will have {len(headers)} columns')
        
        # Ensure output directory exists
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Convert to CSV
        print('Converting to CSV format...')
        with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=headers, quoting=csv.QUOTE_MINIMAL)
            
            # Write header
            writer.writeheader()
            
            # Write data rows with progress tracking
            for idx, item in enumerate(data['items'], 1):
                if idx % 500 == 0:
                    print(f'Processed {idx} / {items_count} records...')
                
                flattened = flatten_notice_item(item)
                writer.writerow(flattened)
        
        # Get file size
        file_size = os.path.getsize(output_file)
        file_size_mb = file_size / (1024 * 1024)
        
        print('=' * 60)
        print('✓ Conversion completed successfully!')
        print(f'✓ CSV file size: {file_size_mb:.2f} MB')
        print(f'✓ Records written: {items_count}')
        print('=' * 60)
        print('\nThe CSV file is ready for AI training!')
        
    except json.JSONDecodeError as e:
        print(f'Error: Invalid JSON file - {e}')
        sys.exit(1)
    except Exception as e:
        print(f'Error during conversion: {e}')
        sys.exit(1)


def main():
    """Main function"""
    # Parse command line arguments
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
    else:
        input_file = 'public/data.json'
    
    if len(sys.argv) > 2:
        output_file = sys.argv[2]
    else:
        # Generate timestamped output filename
        timestamp = datetime.now().strftime('%Y-%m-%d')
        output_file = f'output/procurement-training-data-{timestamp}.csv'
    
    convert_json_to_csv(input_file, output_file)


if __name__ == '__main__':
    main()
