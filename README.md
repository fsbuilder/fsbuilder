# FS-Maker - Project Feasibility Analysis Tool

A comprehensive web-based project appraisal and feasibility analysis tool similar to UNIDO's COMFAR. Built with React, TypeScript, Node.js, and PostgreSQL.

## Features

### Core Modules
- **Project Setup**: Define project parameters, timeline, and financial assumptions
- **Investment Planning**: Track fixed assets, pre-production costs, working capital with depreciation
- **Production & Revenue**: Capacity planning, product pricing, and sales projections
- **Operating Costs**: Fixed and variable cost tracking with escalation
- **Financing**: Equity, loans with amortization schedules, and grants

### Financial Analysis
- **Cash Flow Projections**: Operating, investing, and financing activities
- **Financial Statements**: Income Statement and Balance Sheet generation
- **Profitability Indicators**:
  - Net Present Value (NPV)
  - Internal Rate of Return (IRR)
  - Modified IRR (MIRR)
  - Payback Period (simple and discounted)
  - Return on Investment (ROI)
  - Benefit-Cost Ratio
- **Break-Even Analysis**: Units and revenue calculation with visualization
- **Sensitivity Analysis**: Variable impact analysis with tornado charts
- **Scenario Analysis**: Best/base/worst case comparisons

### Reporting
- **PDF Reports**: Professional formatted reports with charts
- **Excel Export**: Multi-sheet workbooks with formulas preserved

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Tailwind CSS, Recharts |
| State Management | Zustand |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL with Prisma ORM |
| Authentication | JWT + bcrypt |
| Reports | PDFKit, ExcelJS |

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd fs-maker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Set up the database**
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

5. **Start development servers**
   ```bash
   npm run dev
   ```

   This will start:
   - Frontend at http://localhost:3000
   - Backend at http://localhost:4000

## Project Structure

```
fs-maker/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── features/          # Feature modules
│   │   │   ├── investment/
│   │   │   ├── production/
│   │   │   ├── costs/
│   │   │   ├── financing/
│   │   │   ├── analysis/
│   │   │   └── reports/
│   │   ├── hooks/             # Custom hooks & stores
│   │   ├── pages/             # Route pages
│   │   ├── services/          # API client
│   │   ├── types/             # TypeScript types
│   │   └── utils/             # Helpers
│   └── package.json
├── server/                    # Node.js backend
│   ├── src/
│   │   ├── routes/            # API routes
│   │   ├── middleware/        # Auth, error handling
│   │   ├── services/
│   │   │   ├── calculations/  # Financial calculation engine
│   │   │   └── reports/       # Report generators
│   │   └── types/
│   └── package.json
├── prisma/                    # Database schema
│   └── schema.prisma
└── package.json               # Root package.json
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `POST /api/projects/:id/duplicate` - Duplicate project

### Project Data (for each project)
- `/api/projects/:id/investments` - Investment CRUD
- `/api/projects/:id/products` - Products CRUD
- `/api/projects/:id/costs` - Operating costs CRUD
- `/api/projects/:id/financing` - Financing CRUD

### Analysis
- `GET /api/projects/:id/analysis/indicators` - Financial indicators
- `GET /api/projects/:id/analysis/cashflow` - Cash flow projections
- `GET /api/projects/:id/analysis/income-statement` - Income statements
- `GET /api/projects/:id/analysis/balance-sheet` - Balance sheets
- `POST /api/projects/:id/analysis/sensitivity` - Sensitivity analysis
- `GET /api/projects/:id/analysis/break-even` - Break-even analysis

### Reports
- `POST /api/projects/:id/reports/pdf` - Generate PDF report
- `POST /api/projects/:id/reports/excel` - Generate Excel report

## Financial Formulas

### Net Present Value (NPV)
```
NPV = Σ (CFt / (1 + r)^t)
```
Where CFt = cash flow at time t, r = discount rate

### Internal Rate of Return (IRR)
Rate r where NPV = 0 (calculated using Newton-Raphson method)

### Payback Period
Year when cumulative cash flow turns positive

### Break-Even Point
```
Break-Even Units = Fixed Costs / (Price - Variable Cost per Unit)
```

## Development

### Run tests
```bash
npm run test
```

### Build for production
```bash
npm run build
```

### Database commands
```bash
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run migrations
npm run db:push      # Push schema changes (dev only)
```

## License

MIT License

## Acknowledgments

Inspired by UNIDO's COMFAR (Computer Model for Feasibility Analysis and Reporting) software for investment project analysis.
