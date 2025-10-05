# IDIA Health Data Hub - Technical Requirements Document

## 1. System Overview

### 1.1 Platform Purpose
IDIA Health Data Hub is a comprehensive health data marketplace platform that:
- Processes and anonymizes health data from multiple sources (Apple Health, Strava, wearables)
- Creates marketable data bundles for research and business intelligence
- Rewards users for data contributions
- Provides business analytics and AR experiences for merchants
- Enables secure data sharing with privacy preservation

### 1.2 Core Architecture
- **Frontend**: React 18.3 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Authentication**: Supabase Auth (email, phone, Google OAuth)
- **Storage**: Supabase Storage
- **Real-time**: Supabase Realtime subscriptions
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: shadcn/ui with Radix UI primitives

---

## 2. User Roles & Permissions

### 2.1 User Role Hierarchy
```
Super Admin (platform-level access)
  └─> Organization Admin (organization-wide access)
      └─> Team Lead (team management + member access)
          └─> Team Member (basic access)
```

### 2.2 Role-Based Access Control (RBAC)
- **User Roles Table**: `public.business_users`
- **Role Type**: `user_role` enum: `owner`, `admin`, `manager`, `staff`
- **Permission System**: `business_user_permissions` table for granular control
- **Security Functions**: 
  - `user_has_permission(user_id, permission_name)` - checks specific permissions
  - `get_user_business_role(user_id, business_id)` - retrieves user role and permissions
  - `get_user_business_access(user_id)` - returns all accessible businesses

### 2.3 Row-Level Security (RLS)
All tables implement RLS policies based on:
- User authentication via `auth.uid()`
- Business ownership via `business_users` relationships
- Role-based permissions via security definer functions
- Never storing roles in `auth.users` or `profiles` (security requirement)

---

## 3. Database Schema

### 3.1 Core Tables

#### User & Profile Management
- **profiles**: User profile information (first_name, last_name, avatar_url, bio)
- **user_preferences**: User settings and preferences
- **friends**: Social connections between users
- **endorsements**: Skill endorsements between users

#### Business Management
- **businesses**: Business entities (restaurants, retail, etc.)
- **business_users**: User-business relationships with roles
- **business_locations**: Physical business locations
- **business_wallets**: IDIA-USD wallets for businesses
- **business_health_metrics**: Business performance scoring

#### Health Data Pipeline
- **raw_health_data**: Incoming health data (steps, heart rate, activities)
- **health_metrics**: Processed health metrics
- **staged_health_data**: Anonymized, marketplace-ready data
- **data_connections**: External service connections (Apple Health, Strava)
- **data_processing_queue**: Processing workflow management

#### Marketplace
- **marketplace_bundles**: Data bundles for sale
- **bundle_generation_logs**: Bundle creation tracking
- **purchase_history**: User bundle purchases
- **data_monetization**: Revenue tracking

#### AR & Experiences
- **ar_experiences**: AR content definitions
- **ar_menu_items**: AR-enhanced menu items
- **ar_interactions**: User interaction tracking
- **ar_placement_zones**: Geospatial AR placement

#### Business Intelligence
- **idia_pay_transactions**: Payment transactions
- **nfc_transactions**: NFC payment data
- **inventory_items**: Product inventory
- **warehouse_bins**: Warehouse organization
- **cycle_counts**: Inventory audit cycles

#### Governance & Security
- **proposals**: Community governance proposals
- **votes**: Proposal voting records
- **security_events**: Security monitoring
- **remediation_plans**: Security response plans
- **audit_logs**: System activity logging

### 3.2 Key Relationships
```
users (auth.users)
  └─> profiles (1:1)
  └─> business_users (1:N)
      └─> businesses (N:1)
          └─> business_locations (1:N)
          └─> ar_experiences (1:N)
          └─> marketplace_bundles (1:N)
  └─> raw_health_data (1:N)
      └─> staged_health_data (processed)
          └─> marketplace_bundles (aggregated)
```

---

## 4. Data Processing Pipeline

### 4.1 Health Data Flow
```
Raw Data Ingestion
  ↓
idia-synapse (orchestrator)
  ↓
anonymize-and-stage-data
  ↓
staged_health_data
  ↓
create-health-data-bundle
  ↓
marketplace_bundles
```

### 4.2 Processing Stages
1. **Ingestion**: Raw data enters via `idia-synapse` edge function
2. **Validation**: Check for duplicates, validate data quality
3. **Anonymization**: Generate pseudonymous IDs, remove PII
4. **Quality Scoring**: Calculate data completeness and quality scores
5. **Staging**: Store in `staged_health_data` table
6. **Bundling**: Aggregate into marketable bundles
7. **Pricing**: Calculate bundle prices based on data quality and volume

### 4.3 Deduplication Logic
- **Function**: `check_raw_health_data_duplicate(step_count, recorded_at, user_id)`
- **Strategy**: Exact timestamp match within 1-minute window
- **Rationale**: Allows cumulative Apple Health updates while preventing true duplicates

### 4.4 Data Quality Scoring
```typescript
calculate_data_quality_score(
  heartrate: integer,
  elevation: integer, 
  duration: integer,
  distance: numeric
) → numeric (0.0 - 1.0)
```
- Base score: 0.5
- +0.2 for heart rate data
- +0.1 for elevation data
- +0.1 for duration > 5 minutes
- +0.1 for distance > 0

### 4.5 Comprehensive Quality Scoring
```typescript
calculate_comprehensive_data_quality_score(
  basic_metrics_count: integer,
  vitals_count: integer,
  nutrition_count: integer,
  sleep_data: boolean,
  clinical_data: boolean,
  symptoms_count: integer
) → numeric (0.0 - 1.0)
```

---

## 5. Edge Functions (Backend API)

### 5.1 Core Processing Functions

#### **idia-synapse**
- **Purpose**: Main orchestrator for health data processing
- **Trigger**: INSERT on `raw_health_data` with `processing_status = 'pending'`
- **Flow**: Validates → Processes → Anonymizes → Stages
- **Auth**: Service role

#### **anonymize-and-stage-data**
- **Purpose**: Anonymizes PII and stages data for marketplace
- **Input**: `raw_data_id`
- **Output**: Record in `staged_health_data`
- **Functions**: `generate_pseudonym()`, `anonymize_location()`

#### **create-health-data-bundle**
- **Purpose**: Aggregates staged data into marketable bundles
- **Trigger**: INSERT on `staged_health_data`
- **Bundling Logic**: Groups by activity type, date range, quality tier
- **Output**: Record in `marketplace_bundles`

#### **process-lifestyle-data**
- **Purpose**: Processes lifestyle and behavioral data
- **Categories**: social, behavioral, location, governance
- **Output**: `staged_lifestyle_data`

#### **process-business-data**
- **Purpose**: Processes business transaction data
- **Input**: Transaction records from various tables
- **Output**: `staged_business_data`

### 5.2 Bundle Management Functions

#### **create-lifestyle-bundles**
- Creates lifestyle data bundles from staged data

#### **create-business-intelligence-bundles**
- Creates business intelligence bundles

#### **force-bundle-update**
- Forces bundle regeneration for specific categories

#### **trigger-comprehensive-bundle-generation**
- Batch generates bundles across all categories

#### **cleanup-duplicate-bundles**
- Removes duplicate marketplace bundles

### 5.3 Pipeline Recovery Functions

#### **fix-health-pipeline**
- Identifies and fixes stuck pipeline stages
- Checks: pending data, unprocessed raw data, null step counts

#### **recover-health-pipeline**
- Recovers stuck processing jobs
- Resets processing states for retry

#### **trigger-pipeline-recovery**
- Manual trigger for pipeline recovery

#### **nightly-data-processor**
- Scheduled processing of accumulated data
- Runs daily bundle generation and cleanup

### 5.4 AI & Voice Functions

#### **best-friend-ai**
- AI chat assistant for users
- Uses Lovable AI Gateway (Gemini 2.5 Flash)
- Context-aware health data insights

#### **text-to-speech**
- Converts text to speech using ElevenLabs
- Voice: Rachel
- Used for AI assistant responses

#### **voice-to-text**
- Converts voice to text for user input
- Integration with voice recognition APIs

#### **ai-data-curator**
- AI-powered data quality assessment
- Generates insights from health data

### 5.5 Security Functions

#### **security-event-generator**
- Generates security events for monitoring
- Creates fake events for demonstration

#### **crazy-8-security**
- Security analysis and threat detection
- AI-powered security insights

---

## 6. Frontend Architecture

### 6.1 Page Structure

#### Public Routes
- `/` - Landing page / Login screen
- `/404` - Not found page

#### Authenticated Routes
- `/marketplace` - Data marketplace (all roles)
- `/security` - Security dashboard (SuperAdmin only)

### 6.2 Dashboard Components

#### **SuperAdminDashboard**
- **Location**: `src/components/dashboards/SuperAdminDashboard.tsx`
- **Features**:
  - System health monitoring
  - Organization management
  - AI management
  - Audit logs
  - Synapse visualizer
  - Pipeline activity monitor

#### **OrganizationAdminDashboard**
- **Location**: `src/components/dashboards/OrganizationAdminDashboard.tsx`
- **Features**:
  - Business metrics overview
  - Team management
  - Location management
  - Compliance dashboard

#### **TeamLeadDashboard**
- **Location**: `src/components/dashboards/TeamLeadDashboard.tsx`
- **Features**:
  - Team member management
  - Task assignment
  - Performance metrics

#### **TeamMemberDashboard**
- **Location**: `src/components/dashboards/TeamMemberDashboard.tsx`
- **Features**:
  - Personal tasks
  - Basic analytics
  - Data viewer access

### 6.3 Core Components

#### Marketplace
- **DataMarketplace**: Main marketplace interface
- **BundleCard**: Individual bundle display
- **ShoppingCart**: Purchase cart management
- **FilterModal**: Advanced filtering
- **DownloadModal**: Bundle download interface
- **AlaCarteModal**: Custom bundle creation

#### Data Management
- **DataViewer**: View purchased bundle data
- **DataViewerTable**: Tabular data display
- **DataViewerFilters**: Data filtering controls
- **ContactLists**: Manage contact data
- **SavedSearches**: Save and load search criteria

#### Health Data
- **HealthDataDashboard**: Health metrics overview
- **HealthDataInput**: Manual data entry
- **HealthDataProcessor**: Processing status display
- **PipelineMonitor**: Pipeline health monitoring
- **PipelineRecovery**: Pipeline recovery tools

#### Security
- **SecurityCommandCenter**: Security overview
- **CrazyFriendSecurityDashboard**: AI-powered security
- **SecurityOrchestration**: Threat orchestration
- **ThreatAnalysis**: Threat analysis tools
- **AgentCards**: Security agent status
- **HistoricalAnalytics**: Security history

#### AI Features
- **FloatingBestFriend**: AI assistant bubble
- **BestFriendChat**: Chat interface
- **BestFriendAvatar**: AI avatar display
- **AIManagement**: AI configuration (SuperAdmin)

#### Business Features
- **OrganizationManagement**: Organization CRUD
- **TeamManagement**: Team member management
- **BillingCredits**: Credit management
- **ComplianceDashboard**: Compliance tracking
- **LiquidityPools**: Liquidity management
- **TradingInterface**: Trading features

#### System Monitoring
- **SystemHealthDashboard**: System status
- **PipelineActivityMonitor**: Pipeline metrics
- **AuditLogs**: Activity auditing
- **SynapseVisualizer**: 3D network visualization

### 6.4 Layout Components

#### **AppLayout**
- **Location**: `src/components/layout/AppLayout.tsx`
- **Components**: Sidebar, TopBar, Main content area
- **Features**: Responsive design, role-based sidebar

#### **AppSidebar**
- **Location**: `src/components/layout/AppSidebar.tsx`
- **Features**: 
  - Role-based navigation
  - Collapsible sections
  - Active route highlighting

#### **TopBar**
- **Location**: `src/components/layout/TopBar.tsx`
- **Features**:
  - User profile dropdown
  - Logout functionality
  - Mobile menu trigger

---

## 7. Authentication & Authorization

### 7.1 Authentication Methods
- **Email/Password**: Standard email authentication
- **Phone/SMS**: SMS-based authentication
- **Google OAuth**: Google sign-in
- **Magic Links**: Passwordless email links (future)

### 7.2 Session Management
- **Storage**: localStorage (Supabase client config)
- **Auto-refresh**: Enabled via Supabase client
- **Persistence**: Session persisted across page reloads
- **Logout**: Clears session and redirects to login

### 7.3 Protected Routes
- All routes except `/` require authentication
- Route protection via `App.tsx` conditional rendering
- Automatic redirect to login if unauthenticated

### 7.4 RLS Security
- All database operations secured via RLS policies
- User context via `auth.uid()` in policies
- Business access via `get_user_business_access(user_id)`
- Role verification via `user_has_permission(user_id, permission)`

---

## 8. Data Anonymization

### 8.1 Anonymization Strategy
- **Pseudonymization**: `generate_pseudonym(input_text)` using SHA-256
- **Salt**: `'IDIA_SALT_2024'` for hash generation
- **Location Anonymization**: `anonymize_location(lat, lng)` to zone-based IDs
- **PII Removal**: Strip names, emails, phone numbers, addresses

### 8.2 Pseudonymous ID Generation
```sql
generate_pseudonym(input_text) = 
  encode(sha256((input_text || 'IDIA_SALT_2024')::bytea), 'hex')
```

### 8.3 Location Anonymization
```sql
anonymize_location(lat, lng) = 
  'ZONE_' || encode(sha256((ROUND(lat, 1)::TEXT || '_' || ROUND(lng, 1)::TEXT)::bytea), 'hex')::CHAR(8)
```

### 8.4 Data Retention
- **Raw Data**: Retained for 90 days
- **Staged Data**: Retained indefinitely (anonymized)
- **Bundle Data**: Retained until deleted by admin
- **User Data**: Deleted on account deletion (cascade)

---

## 9. Marketplace & Pricing

### 9.1 Bundle Structure
```typescript
interface Bundle {
  bundle_id: string;
  name: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  category: string;
  contacts: number;
  price: number;
  features: string[];
  keyInsights: string[];
  dataPoints: string[];
  suggestedFilters: string[];
  dataJson: any;
  matchPercentage?: number;
}
```

### 9.2 Bundle Tiers
- **Bronze**: Basic data, 100-500 records
- **Silver**: Enhanced data, 500-2000 records
- **Gold**: Premium data, 2000-5000 records
- **Platinum**: Enterprise data, 5000+ records

### 9.3 Pricing Algorithm
```typescript
calculateBundlePrice(
  recordCount: number,
  qualityScore: number,
  tier: string,
  category: string
) → number
```

**Base Prices by Tier:**
- Bronze: $10-50
- Silver: $50-200
- Gold: $200-500
- Platinum: $500-2000

**Quality Multiplier:** 0.5 - 2.0 based on data quality score
**Category Multiplier:** 
- Health: 1.5x
- Business: 2.0x
- Lifestyle: 1.2x

### 9.4 Purchase Flow
1. User browses marketplace
2. Adds bundles to cart
3. Reviews cart and total
4. Confirms purchase (deducts credits)
5. Bundle added to purchase history
6. Data available in Data Viewer

### 9.5 Credit System
- **User Credits**: Stored in user profile
- **Initial Credits**: 100 credits on signup
- **Credit Purchases**: Via billing interface
- **Data Contribution Rewards**: Earn credits for data sharing

---

## 10. AR Experiences

### 10.1 AR Architecture
- **AR Experiences**: Defined in `ar_experiences` table
- **AR Content Assets**: Stored in `ar_content_assets`
- **AR Interactions**: Tracked in `ar_interactions`
- **AR Placement Zones**: Geospatial zones for AR content

### 10.2 AR Experience Types
- **Menu Visualization**: 3D menu items
- **Product Showcase**: 3D product models
- **Interactive Games**: AR mini-games
- **Location-based**: Geofenced AR experiences
- **Social AR**: Shared AR experiences

### 10.3 AR Integration
- **3D Models**: GLB/GLTF format
- **Spatial Anchors**: Cloud anchor support
- **Marker-based**: QR code triggers
- **Markerless**: Surface detection
- **Web AR**: browser-based AR (WebXR)

### 10.4 AR Analytics
- **Interaction Tracking**: Duration, type, conversion
- **Conversion Attribution**: AR → Purchase correlation
- **Performance Metrics**: Load times, engagement rates
- **Campaign Performance**: ROI tracking

---

## 11. Business Intelligence

### 11.1 Business Health Index (BHI)
```typescript
calculate_business_health_index(
  business_id: uuid,
  location_id?: uuid
) → numeric (0.0 - 1.0)
```

**Components:**
- Sales Score (35%): Revenue trends, growth rate
- Inventory Score (25%): Stock levels, turnover
- Labor Score (25%): Staffing efficiency, scheduling
- Customer Score (15%): Retention, satisfaction

### 11.2 Competitive Analysis
- **Table**: `competitive_analysis`
- **Metrics**: Industry benchmarks, percentile ranking
- **Gap Analysis**: Performance vs. industry average
- **Recommendations**: AI-generated improvement suggestions

### 11.3 Customer Analytics
- **Segmentation**: RFM analysis (Recency, Frequency, Monetary)
- **Lifetime Value**: Predicted CLV
- **Churn Prediction**: At-risk customer identification
- **Behavior Patterns**: Purchase patterns, preferences

### 11.4 Cross-Platform Insights
- **Table**: `cross_platform_insights`
- **Analysis**: Health + Business correlation
- **Economic Indicators**: Regional economic data
- **Trend Detection**: Emerging patterns

---

## 12. Security & Monitoring

### 12.1 Security Features
- **Event Monitoring**: `security_events` table
- **Threat Detection**: AI-powered anomaly detection
- **Remediation Plans**: Automated response plans
- **Agent System**: 8 security agents (CPU, RAM, API, DB, Auth, Storage, Network, Breach)

### 12.2 Security Agents
1. **CPU Guardian**: CPU usage monitoring
2. **RAM Sentinel**: Memory monitoring
3. **API Watchdog**: API request monitoring
4. **Database Shield**: Database query monitoring
5. **Auth Fortress**: Authentication monitoring
6. **Storage Monitor**: File system monitoring
7. **Network Defender**: Network traffic monitoring
8. **Breach Detector**: Intrusion detection

### 12.3 Audit Logging
- **Table**: `audit_logs`
- **Events**: All user actions, system events
- **Retention**: 1 year
- **Compliance**: GDPR, HIPAA, SOC 2

### 12.4 Data Privacy
- **GDPR Compliance**: Right to deletion, data portability
- **HIPAA Compliance**: PHI handling, encryption
- **Data Minimization**: Collect only necessary data
- **Purpose Limitation**: Use data only for stated purposes

---

## 13. Performance Requirements

### 13.1 Response Times
- **Page Load**: < 2 seconds (first contentful paint)
- **API Response**: < 500ms (p95)
- **Database Queries**: < 200ms (p95)
- **Bundle Generation**: < 30 seconds
- **Data Processing**: < 5 minutes per 1000 records

### 13.2 Scalability
- **Concurrent Users**: 10,000+
- **Data Volume**: 100M+ records
- **Bundle Generation**: 1000+ bundles/hour
- **API Throughput**: 1000+ req/sec

### 13.3 Availability
- **Uptime SLA**: 99.9%
- **Database Replication**: Multi-region
- **Backup Frequency**: Hourly (point-in-time recovery)
- **Disaster Recovery**: < 4 hour RTO, < 1 hour RPO

---

## 14. Integration Points

### 14.1 External Services

#### **Apple Health**
- **Integration**: HealthKit API
- **Data Types**: Steps, heart rate, workouts, sleep
- **Sync Frequency**: Real-time via iOS app
- **Authentication**: OAuth 2.0

#### **Strava**
- **Integration**: Strava API v3
- **Data Types**: Activities, segments, athlete stats
- **Sync Frequency**: Webhook-based (real-time)
- **Authentication**: OAuth 2.0
- **Secrets**: `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`

#### **Google APIs**
- **OAuth**: Google sign-in
- **Maps**: Geolocation services
- **Secret**: `GOOGLE_API_KEY`

#### **ElevenLabs**
- **Purpose**: Text-to-speech for AI assistant
- **Voice**: Rachel
- **Secret**: `ELEVENLABS_API_KEY`

#### **Lovable AI Gateway**
- **Purpose**: AI chat, data curation, security analysis
- **Models**: Gemini 2.5 Flash (default), GPT-5 (optional)
- **Endpoint**: `https://ai.gateway.lovable.dev/v1/chat/completions`
- **Authentication**: Bearer token (auto-provisioned)

### 14.2 Webhook Endpoints
- **Strava Webhook**: `/functions/v1/strava-webhook`
- **Apple Health Sync**: `/functions/v1/daily-apple-health-sync`
- **Payment Webhooks**: `/functions/v1/payment-webhook` (future)

---

## 15. Data Flow Diagrams

### 15.1 Health Data Processing Flow
```
User Device (Apple Health / Strava)
  ↓
idia-synapse Edge Function
  ↓
raw_health_data (validation)
  ↓ [trigger: safe_health_processing_trigger]
anonymize-and-stage-data
  ↓
staged_health_data (anonymized)
  ↓ [trigger: trigger_bundle_generation]
create-health-data-bundle
  ↓
marketplace_bundles
  ↓
User Purchases
  ↓
purchase_history
  ↓
Data Viewer
```

### 15.2 Business Transaction Flow
```
IDIA Pay POS / NFC Transaction
  ↓
idia_pay_transactions / nfc_transactions
  ↓ [trigger: trigger_business_data_processing]
process-business-data
  ↓
staged_business_data
  ↓ [trigger: trigger_bundle_generation]
create-business-intelligence-bundles
  ↓
marketplace_bundles
```

### 15.3 AR Interaction Flow
```
User (Mobile App / Web AR)
  ↓
AR Experience Load
  ↓
ar_content_assets (3D models)
  ↓
User Interaction
  ↓
ar_interactions (tracking)
  ↓
Analytics Dashboard
```

---

## 16. Testing Requirements

### 16.1 Unit Testing
- **Coverage Target**: 80%+
- **Framework**: Vitest (recommended)
- **Focus**: Utility functions, data transformations, calculations

### 16.2 Integration Testing
- **Edge Functions**: Test with mock data
- **Database Triggers**: Test trigger execution
- **RLS Policies**: Test access control

### 16.3 E2E Testing
- **Framework**: Playwright or Cypress
- **Scenarios**: User flows (signup, purchase, data upload)
- **Coverage**: Critical paths only

### 16.4 Performance Testing
- **Load Testing**: Apache JMeter or k6
- **Stress Testing**: Gradual load increase
- **Spike Testing**: Sudden traffic bursts

---

## 17. Deployment & DevOps

### 17.1 Deployment Pipeline
1. **Development**: Local Supabase + Vite dev server
2. **Staging**: Lovable preview environment
3. **Production**: Lovable production deployment

### 17.2 Environment Variables
- **Supabase URL**: Auto-configured
- **Supabase Anon Key**: Auto-configured
- **Service Role Key**: Secure secret storage
- **API Keys**: Stored in Supabase secrets

### 17.3 Database Migrations
- **Location**: `supabase/migrations/`
- **Naming**: `YYYYMMDDHHMMSS_description.sql`
- **Execution**: Automatic on deployment
- **Rollback**: Manual SQL execution (careful!)

### 17.4 Monitoring
- **Error Tracking**: Supabase logs
- **Performance**: Supabase metrics
- **Uptime**: Supabase status page
- **Custom Metrics**: `audit_logs` table

---

## 18. Future Enhancements

### 18.1 Planned Features
- **Mobile Apps**: Native iOS and Android apps
- **Blockchain Integration**: NFT data ownership, token rewards
- **Advanced AI**: Predictive health insights, personalized recommendations
- **Social Features**: Data sharing between friends, leaderboards
- **Enterprise Features**: Multi-tenant support, white-label solutions
- **Advanced Analytics**: ML-powered insights, forecasting

### 18.2 Technical Debt
- **Code Refactoring**: Consolidate duplicate logic in hooks
- **Type Safety**: Improve TypeScript strict mode compliance
- **Component Library**: Create shared component library
- **Testing**: Increase test coverage to 80%+
- **Documentation**: Add inline code documentation (JSDoc)

---

## 19. Compliance & Legal

### 19.1 Data Protection Regulations
- **GDPR**: EU data protection compliance
- **CCPA**: California consumer privacy compliance
- **HIPAA**: Health data privacy compliance (partial)

### 19.2 User Rights
- **Right to Access**: Users can export their data
- **Right to Deletion**: Users can delete their account
- **Right to Portability**: Users can transfer data
- **Right to Correction**: Users can update their data

### 19.3 Terms of Service
- Data ownership: Users own their data
- Data usage: Platform can anonymize and sell data with consent
- Revenue sharing: Users earn credits for data contributions
- Liability: Limited liability for data accuracy

---

## 20. Support & Maintenance

### 20.1 Support Channels
- **Email**: support@idia.health
- **In-app Chat**: AI assistant (Crazy Friend)
- **Documentation**: Online help center
- **Community**: Discord server

### 20.2 Maintenance Windows
- **Database Maintenance**: Weekly, Sundays 2-4 AM UTC
- **Edge Function Deployment**: Rolling, no downtime
- **Client Deployment**: Rolling, no downtime

### 20.3 Backup & Recovery
- **Database Backups**: Hourly (Supabase managed)
- **Point-in-Time Recovery**: 7 days
- **Full Backup**: Daily
- **Storage Backups**: Daily

---

## Appendix A: Environment Setup

### A.1 Development Environment
```bash
# Install dependencies
npm install

# Start Supabase locally (optional)
npx supabase start

# Start dev server
npm run dev
```

### A.2 Required Secrets
- `SUPABASE_URL`: Auto-configured
- `SUPABASE_ANON_KEY`: Auto-configured
- `SUPABASE_SERVICE_ROLE_KEY`: Secure storage
- `STRAVA_CLIENT_ID`: Strava integration
- `STRAVA_CLIENT_SECRET`: Strava integration
- `GOOGLE_API_KEY`: Google OAuth
- `ELEVENLABS_API_KEY`: Text-to-speech
- `GEMINI_API_KEY`: AI features (if not using Lovable AI)

### A.3 Database Setup
```sql
-- Run migrations in order
psql < supabase/migrations/20250101000000_initial_schema.sql
psql < supabase/migrations/20250102000000_rls_policies.sql
-- ... etc
```

---

## Appendix B: API Reference

### B.1 Edge Function Endpoints

#### Health Data
- `POST /functions/v1/idia-synapse` - Process health data
- `POST /functions/v1/anonymize-and-stage-data` - Anonymize data
- `POST /functions/v1/create-health-data-bundle` - Create bundle

#### Lifestyle Data
- `POST /functions/v1/process-lifestyle-data` - Process lifestyle data
- `POST /functions/v1/create-lifestyle-bundles` - Create lifestyle bundles

#### Business Data
- `POST /functions/v1/process-business-data` - Process business data
- `POST /functions/v1/create-business-intelligence-bundles` - Create BI bundles

#### Pipeline Management
- `POST /functions/v1/fix-health-pipeline` - Fix pipeline issues
- `POST /functions/v1/recover-health-pipeline` - Recover stuck jobs
- `POST /functions/v1/trigger-pipeline-recovery` - Manual recovery
- `POST /functions/v1/nightly-data-processor` - Batch processing

#### AI & Voice
- `POST /functions/v1/best-friend-ai` - AI chat
- `POST /functions/v1/text-to-speech` - TTS conversion
- `POST /functions/v1/voice-to-text` - STT conversion
- `POST /functions/v1/ai-data-curator` - Data curation

#### Security
- `POST /functions/v1/security-event-generator` - Generate events
- `POST /functions/v1/crazy-8-security` - Security analysis

### B.2 Database Functions

#### User & Permissions
- `get_user_business_access(user_id)` - Get accessible businesses
- `get_user_business_role(user_id, business_id)` - Get role and permissions
- `user_has_permission(user_id, permission_name)` - Check permission

#### Data Quality
- `calculate_data_quality_score(heartrate, elevation, duration, distance)` - Basic scoring
- `calculate_comprehensive_data_quality_score(...)` - Comprehensive scoring

#### Anonymization
- `generate_pseudonym(input_text)` - Generate pseudonymous ID
- `anonymize_location(lat, lng)` - Anonymize location

#### Business Intelligence
- `calculate_business_health_index(business_id, location_id)` - Calculate BHI

#### Pipeline Management
- `check_health_data_pipeline_status()` - Pipeline health check
- `process_synapse_backlog()` - Process backlog
- `recover_all_stuck_health_data()` - Recover stuck data

---

## Document Version
- **Version**: 1.0
- **Last Updated**: 2025-01-12
- **Author**: IDIA Development Team
- **Status**: Living Document
