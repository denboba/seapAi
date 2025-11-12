# e-Procurement Risk Analytics Suite

A comprehensive risk analytics platform for monitoring and analyzing public procurement data from Romania's e-licitatie.ro system.

## 🎯 Overview

Public procurement is a high-risk area for inefficiency and corruption. This e-Procurement Risk Analytics Suite provides municipalities, oversight bodies, and civic watchdog organizations with powerful tools to proactively monitor tenders, identify risks, and improve transparency.

## ✨ Key Features

### 1. **Automated Data Ingestion**
- Real-time synchronization with e-licitatie.ro public API
- Support for historical data via istoric.e-licitatie.ro
- Automated periodic data updates
- Contract details fetching with vendor information

### 2. **Advanced Risk Scoring Engine**
The system calculates risk scores (0-100) based on multiple indicators:
- **Single Bidder Detection** (35 points) - Lack of competition
- **Quick Deadlines** (20-30 points) - Potentially tailored tenders
  - Very short: < 7 days
  - Short: < 14 days
- **High Value Contracts** (15-25 points) - Requires higher scrutiny
  - Very high: > 5M RON
  - High: > 1M RON
- **Missing Data** (15 points) - Incomplete value estimates
- **Weekend Publications** (10 points) - Unusual timing

### 3. **Vendor Profile Analytics**
- Complete contract history tracking
- Performance metrics and statistics
- Total contract value and count
- Win rate calculations
- High-risk contract identification
- Vendor relationship analysis

### 4. **Interactive Dashboard & Visualizations**
- **Risk Distribution** - Pie chart showing low/medium/high risk contracts
- **Monthly Trends** - Line chart tracking contract volume and value over time
- **Top Contractors** - Bar chart of vendors by total contract value
- Real-time statistics:
  - Total contracts monitored
  - High-risk notices count
  - Total procurement value
  - Average risk score

### 5. **Search & Filtering**
- Full-text search across contract titles and authorities
- Real-time filtering
- Pagination support
- Date range selection

### 6. **Detailed Notice Views**
- Complete contract information
- Risk factor breakdown
- Contracting authority details
- Procurement procedure type
- CPV codes for categorization
- Publication and deadline dates

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account (for backend/database)

### Installation

```bash
# Clone the repository
git clone https://github.com/bitpyrus/procurement-watchdog.git
cd procurement-watchdog

# Install dependencies
npm install

# Start development server
npm run dev
```

### Configuration

The application uses Supabase for backend services. Configure your environment variables in `.env`:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
```

## 🏗️ Technology Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Framework**: shadcn/ui + Tailwind CSS
- **Charts**: Recharts
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router v6

## 📊 Database Schema

### Tables

#### `notices`
Primary table for procurement notices
- `ca_notice_id` - Unique notice identifier from e-licitatie.ro
- `notice_no` - Notice number
- `contracting_authority` - Authority name
- `contract_title` - Contract title/name
- `publication_date` - When published
- `finalization_date` - Submission deadline
- `estimated_value` - Estimated contract value
- `risk_score` - Calculated risk score (0-100)
- `risk_factors` - Array of risk indicators
- `cpv_code` - Common Procurement Vocabulary code
- `procedure_type` - Type of procurement procedure

#### `vendors`
Supplier/contractor profiles
- `vendor_name` - Company name
- `fiscal_code` - Tax identification
- `total_contracts` - Count of awarded contracts
- `total_value` - Sum of all contract values
- `average_contract_value` - Mean contract value
- `win_rate` - Success rate percentage
- `high_risk_count` - Number of high-risk contracts

#### `contracts`
Individual contract awards
- `notice_id` - Reference to notice
- `vendor_id` - Reference to vendor
- `contract_value` - Award amount
- `award_date` - When awarded
- `contract_number` - Contract identifier

#### `risk_history`
Historical risk score tracking
- `notice_id` - Reference to notice
- `risk_score` - Score at time of recording
- `risk_factors` - Factors identified
- `recorded_at` - Timestamp

## 🔌 API Integration

### e-licitatie.ro Endpoints

#### Get Notice List
```
GET https://e-licitatie.ro/api-pub/NoticeCommon/GetCANoticeList/?page=1&pagesize=50
```
Returns paginated list of procurement notices.

#### Get Contract Details
```
GET https://e-licitatie.ro/api-pub/C_PUBLIC_CANotice/GetCANoticeContracts?caNoticeId={id}
```
Returns detailed contract information for a specific notice.

#### Historical Data
```
GET https://istoric.e-licitatie.ro/api-pub/...
```
Access to legacy/historical procurement data.

### Supabase Edge Functions

#### `fetch-notices`
Fetches and stores procurement notices
```typescript
POST /functions/v1/fetch-notices
Body: { page: 1, pagesize: 50, saveToDb: true }
```

#### `fetch-contract-details`
Fetches contract details for a specific notice
```typescript
POST /functions/v1/fetch-contract-details
Body: { caNoticeId: 123456, saveToDb: true }
```

## 📖 Usage Guide

### For Municipalities
1. **Monitor Your Procurements** - Track all published tenders in real-time
2. **Review Risk Scores** - Identify potentially problematic contracts before finalization
3. **Analyze Trends** - Understand procurement patterns and seasonal variations
4. **Vendor Analysis** - Review contractor performance and history

### For Oversight Bodies
1. **Dashboard Overview** - Get instant visibility into procurement landscape
2. **High-Risk Filtering** - Focus on contracts requiring immediate attention
3. **Vendor Networks** - Identify concentration and potential collusion
4. **Export Reports** - Generate audit trails and compliance reports

### For Auditors
1. **Risk-Based Sampling** - Prioritize audits based on risk scores
2. **Historical Analysis** - Track changes over time
3. **Vendor Profiles** - Deep-dive into contractor histories
4. **Data Export** - Download data for detailed analysis

## 🔄 Data Sync

Click the "Sync Latest Data" button on the dashboard to:
1. Fetch the latest 50 procurement notices from e-licitatie.ro
2. Calculate risk scores using the enhanced algorithm
3. Update vendor statistics
4. Refresh all dashboard visualizations

The system can be configured for automated periodic syncing via scheduled Edge Functions.

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Code Structure

```
src/
├── components/       # Reusable UI components
│   ├── ui/          # shadcn/ui components
│   ├── NoticeCard.tsx
│   ├── DashboardCharts.tsx
│   └── ...
├── pages/           # Route pages
│   ├── Index.tsx    # Main dashboard
│   ├── NoticeDetail.tsx
│   └── VendorProfile.tsx
├── integrations/    # External service integrations
│   └── supabase/    # Supabase client config
└── lib/             # Utility functions

supabase/
├── functions/       # Edge Functions
│   ├── fetch-notices/
│   └── fetch-contract-details/
└── migrations/      # Database schema
```

## 🔐 Security & Privacy

- All procurement data is public information
- Row-level security (RLS) enabled on all tables
- Public read access for transparency
- No personal data collection
- CORS headers configured for API security

## 🤝 Contributing

This is an open-source civic technology project. Contributions are welcome!

## 📚 References

- [e-licitatie.ro API Documentation](https://e-licitatie.ro)
- [SICAP Parser](https://github.com/ciocan/sicap-parser)
- [SICAP.AI](https://github.com/ciocan/sicap.ai)
- [OCDS Standard](https://standard.open-contracting.org/)

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

This project builds upon the work of the Romanian civic tech community and utilizes public procurement data made available by SEAP/e-licitatie.ro.

---

**Built with ❤️ for transparency in public procurement**

