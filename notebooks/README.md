# Jupyter Notebooks

This directory contains Jupyter notebooks for data analysis and machine learning training.

## Requirements

Install the required Python packages:

```bash
pip install -r requirements.txt
```

Or install individually:

```bash
pip install pandas numpy scikit-learn matplotlib seaborn jupyter
```

## Available Notebooks

### `procurement_analysis.ipynb`

**Complete end-to-end analysis notebook** covering:

1. **Data Conversion** - Load JSON and convert to CSV
2. **Exploratory Data Analysis (EDA)** - Understand the data
3. **Feature Engineering** - Prepare features for ML
4. **Model Training** - Train Isolation Forest
5. **Evaluation** - Analyze and visualize results
6. **Export** - Save anomalies and predictions

**Features:**
- ✅ Loads and converts `public/data.json` to CSV
- ✅ Comprehensive visualizations (histograms, distributions, heatmaps)
- ✅ Trains Isolation Forest with scikit-learn
- ✅ PCA visualization in 2D
- ✅ Exports detected anomalies
- ✅ Saves full results with predictions

## Getting Started

### 1. Install Requirements

```bash
cd /path/to/seapAi
pip install pandas numpy scikit-learn matplotlib seaborn jupyter
```

### 2. Start Jupyter

```bash
cd notebooks
jupyter notebook
```

Or use JupyterLab:

```bash
jupyter lab
```

### 3. Open Notebook

Open `procurement_analysis.ipynb` in the Jupyter interface.

### 4. Run All Cells

- Click **Cell → Run All** to execute the entire notebook
- Or run cells individually by pressing **Shift+Enter**

## Expected Outputs

The notebook will generate:

1. **CSV File**: `output/procurement-training-data-YYYY-MM-DD.csv`
2. **Anomalies**: `output/detected-anomalies.csv`
3. **Full Results**: `output/procurement-with-predictions-YYYY-MM-DD.csv`
4. **Summary**: `output/analysis-summary-YYYY-MM-DD.txt`

## Visualizations Included

- Contract value distributions (linear and log scale)
- Procedure types bar chart
- Acquisition types pie chart
- Feature correlation heatmap
- Anomaly score distributions
- Feature comparisons (normal vs anomalies)
- PCA visualization in 2D

## Customization

### Adjust Model Parameters

In the notebook, modify these variables:

```python
contamination = 0.1  # Expected anomaly rate (10%)
n_estimators = 100   # Number of trees
```

### Add More Features

Extend the `feature_columns` list:

```python
feature_columns = [
    'ronContractValue',
    'highestOfferValue',
    # Add your features here
]
```

### Change Visualization Styles

Modify plot settings at the top:

```python
sns.set_style('whitegrid')  # or 'darkgrid', 'white', 'dark', 'ticks'
plt.rcParams['figure.figsize'] = (12, 6)  # Default figure size
```

## Tips

1. **Run in Order**: Execute cells from top to bottom
2. **Memory**: The notebook loads all data into memory
3. **Time**: Full execution takes 1-2 minutes depending on data size
4. **Restart**: Use **Kernel → Restart & Run All** for a fresh start
5. **Save**: Jupyter auto-saves, but manually save important results

## Troubleshooting

**Error: File not found**
- Ensure you're running from the `notebooks/` directory
- Check that `public/data.json` exists

**Error: Module not found**
- Install missing packages: `pip install <package-name>`
- Verify installation: `pip list | grep <package-name>`

**Kernel dies**
- Reduce data size
- Close other notebooks
- Restart Jupyter server

**Plots not showing**
- Use `%matplotlib inline` magic command
- Check if matplotlib is installed correctly

## Integration with Main Application

Results from the notebook can be integrated:

```python
# In your application
import pandas as pd

# Load predictions
df = pd.read_csv('output/procurement-with-predictions-2025-11-12.csv')

# Get anomalies
anomalies = df[df['is_anomaly'] == True]

# Use anomaly scores in risk calculation
for _, row in anomalies.iterrows():
    enhance_risk_score(row['caNoticeId'], row['anomaly_score'])
```

## Next Steps

1. Run the notebook to generate initial results
2. Review detected anomalies with domain experts
3. Tune hyperparameters based on feedback
4. Add custom feature engineering
5. Integrate results into the main application

## Additional Resources

- [Jupyter Documentation](https://jupyter.org/documentation)
- [Pandas Documentation](https://pandas.pydata.org/docs/)
- [Scikit-learn Documentation](https://scikit-learn.org/stable/)
- [Matplotlib Gallery](https://matplotlib.org/stable/gallery/)
- [Seaborn Gallery](https://seaborn.pydata.org/examples/index.html)
