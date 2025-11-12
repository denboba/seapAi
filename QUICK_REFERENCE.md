# Quick Reference Guide - AI Training Data

## 🚀 Quick Start

### Convert JSON to CSV (Python - Recommended)
```bash
npm run convert:csv
```

Or use Python directly:
```bash
python3 scripts/convert_to_csv.py
python3 scripts/convert_to_csv.py public/data.json output/my-data.csv
```

Output: `output/procurement-training-data-YYYY-MM-DD.csv` (34 columns, timestamped)

### Use in Code
```typescript
// Browser export
import { exportDataForAITraining } from '@/lib/dataConverter';
await exportDataForAITraining();

// Anomaly detection
import { trainAndDetectAnomalies } from '@/lib/isolationForest';
const result = await trainAndDetectAnomalies(data);
console.log('Anomalies:', result.anomalyIndices);
```

## 📊 CSV Schema (34 columns)

| Category | Columns |
|----------|---------|
| **IDs** | caNoticeId, noticeId, procedureId, noticeNo |
| **States** | noticeStateId, noticeStateText, procedureStateId, procedureStateText |
| **Authority** | contractingAuthority |
| **Contract** | contractTitle, acquisitionContractTypeId, acquisitionContractTypeText, procedureTypeId, procedureTypeText, contractAssigmentTypeId, contractAssigmentTypeText |
| **Financial** | ronContractValue, estimatedValueExport, highestOfferValue, lowestOfferValue |
| **Classification** | cpvCodeAndName |
| **Dates** | noticeStateDate, minTenderReceiptDeadline, maxTenderReceiptDeadline, tenderReceiptDeadlineExport |
| **Flags** | isOnline, hasSubsequentContracts, isUtility, isPPP |
| **Other** | errataNo, versionNo, sysNoticeVersionId, sysNoticeTypeId, currencyCode |

## 🤖 Isolation Forest Features

**Extracted Features (6 per notice):**
1. Contract Value (RON)
2. Deadline Days (calculated)
3. Procedure Type ID
4. Is Online (0/1)
5. Acquisition Type ID
6. Highest Offer Value

**Hyperparameters:**
- `numTrees`: 100 (default)
- `subsampleSize`: 256 (default)
- `threshold`: 0.6 (default)

**Usage:**
```typescript
import { IsolationForest, extractProcurementFeatures } from '@/lib/isolationForest';

// Train model
const model = new IsolationForest(100, 256);
const features = data.map(extractProcurementFeatures);
model.fit(features);

// Score new notice
const score = model.scoreOne(extractProcurementFeatures(newNotice));
console.log('Anomaly score:', score); // 0-1 (higher = more anomalous)
```

## 📖 Documentation

- **Complete Guide**: [docs/AI_TRAINING_GUIDE.md](docs/AI_TRAINING_GUIDE.md)
- **Implementation Summary**: [AI_IMPLEMENTATION_SUMMARY.md](AI_IMPLEMENTATION_SUMMARY.md)
- **Examples**: [src/examples/isolationForestExamples.ts](src/examples/isolationForestExamples.ts)
- **Scripts**: [scripts/README.md](scripts/README.md)

## 🔗 Resources

- [Isolation Forest Algorithm](https://www.geeksforgeeks.org/machine-learning/what-is-isolation-forest/)
- [e-licitatie.ro API](https://e-licitatie.ro)
- [CertSign ShellSafe](https://www.certsign.ro/ro/shellsafe-verify/)
- [Main README](README.md)

## 🐍 Python Example

```python
import pandas as pd
from sklearn.ensemble import IsolationForest

# Load CSV
df = pd.read_csv('output/procurement-training-data.csv')

# Select features
X = df[['ronContractValue', 'highestOfferValue', 'procedureTypeId']].fillna(0)

# Train
model = IsolationForest(n_estimators=100, contamination=0.1)
predictions = model.fit_predict(X)

# Find anomalies
anomalies = df[predictions == -1]
print(f"Found {len(anomalies)} anomalies")
```

## ✅ Quality Assurance

- ✅ **Build**: 292 KB gzipped
- ✅ **Security**: 0 vulnerabilities (CodeQL)
- ✅ **Tests**: Conversion verified with 500 records
- ✅ **Types**: No `any` types in new code
- ✅ **Lint**: Clean (only pre-existing UI warnings)

## 💡 Tips

1. **Start Simple**: Use `npm run convert:csv` to get familiar with the data
2. **Tune Thresholds**: Adjust Isolation Forest threshold based on your domain
3. **Combine Scores**: Mix ML anomaly scores with rule-based risk scores
4. **Monitor Results**: Track false positives and refine features
5. **Iterate**: ML models improve with more data and feedback

## 🆘 Troubleshooting

**CSV not generating?**
- Check `public/data.json` exists
- Ensure Node.js is installed
- Try: `node scripts/convertToCSV.cjs`

**Anomaly detection not working?**
- Ensure enough training data (>50 samples)
- Check features have variation
- Adjust threshold (try 0.5-0.7)

**Build errors?**
- Run `npm install`
- Try `npm run build`
- Check TypeScript version

## 📞 Need Help?

See [AI_TRAINING_GUIDE.md](docs/AI_TRAINING_GUIDE.md) for detailed documentation.
