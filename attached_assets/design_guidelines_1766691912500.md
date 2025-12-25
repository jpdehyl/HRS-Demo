# Sales Coaching Automation - Design Guidelines

## Project Context
This is a **backend automation system** with minimal UI requirements. The primary interface will be an admin dashboard for monitoring processing status, viewing logs, and manually triggering workflows.

## Design Approach: **Utility-Focused System Dashboard**
Reference: **Linear** + **Stripe Dashboard** aesthetics
- Clean, data-dense layouts optimized for scanning information quickly
- Minimal decorative elements, maximum functional clarity
- Professional, business-focused aesthetic

---

## Core Design Elements

### A. Typography
- **Primary Font**: Inter (via Google Fonts)
- **Headings**: Inter 600 (Semibold), sizes 24px-32px
- **Body Text**: Inter 400 (Regular), 14px-16px
- **Data/Metrics**: Inter 500 (Medium), 16px-20px
- **Code/Filenames**: JetBrains Mono 400, 13px

### B. Layout System
**Tailwind Spacing**: Use units of **2, 4, 6, and 8** consistently
- Component padding: `p-6` or `p-8`
- Section spacing: `gap-6` or `gap-8`
- Card margins: `space-y-4`

**Grid Structure**:
- Main container: `max-w-7xl mx-auto px-6`
- Dashboard cards: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`

### C. Component Library

**Navigation**
- Minimal sidebar with icon + label navigation
- Links: Dashboard, Processing Queue, SDR Directory, Logs, Settings

**Dashboard Cards**
- Status cards showing: Files Processed Today, Success Rate, Pending Files, Last Run Time
- Recent activity table with: Filename, SDR, Status, Timestamp, Actions
- Metric displays with large numbers and subtle trend indicators

**Processing Queue Table**
- Columns: Filename, SDR Name, Status (badge), Date Uploaded, Actions
- Status badges: Processing (blue), Success (green), Error (red), Pending (gray)
- Row actions: View Transcript, View Feedback, Retry

**Manual Trigger Interface**
- Large "Process Inbox Now" button with loading state
- Real-time processing status with file count and progress indicator

**SDR Directory Management**
- Editable table showing: SDR ID, Name, Email, Manager Email
- Inline editing or modal-based editing

**Log Viewer**
- Filterable log entries with timestamp, level (info/error), message
- Expandable details for error stack traces

**Forms**
- Simple input fields with clear labels
- Validation states with inline error messages
- Submit buttons with loading states

### D. Interactions
**Minimal Animations**
- Subtle fade-in for dashboard data: `transition-opacity duration-200`
- Hover states on table rows: slight background change
- Loading spinners for async operations
- No scroll animations or complex transitions

---

## Page Layouts

### Dashboard (Home)
- Full-width metrics cards at top (4-column grid)
- Recent processing activity table below
- Quick action button: "Process Inbox Now"

### Processing Queue
- Filterable/sortable table showing all processed files
- Search by filename or SDR ID
- Export to CSV functionality

### SDR Directory
- Editable table of all SDRs
- Add/Edit/Delete actions
- Manager assignment dropdown

### Logs
- Reverse chronological log entries
- Filter by level (All, Info, Error)
- Search functionality

### Settings
- Google Drive folder IDs (read-only display)
- Email configuration status
- Manual connection test buttons

---

## Images
**No hero images needed** - this is a functional admin dashboard.

**Icons**: Use **Heroicons** (outline style) for navigation and UI elements
- Dashboard icon, Document icon, User icon, Cog icon, Exclamation icon for errors

---

## Key Principles
1. **Information Density**: Maximize useful data per screen
2. **Status Clarity**: Clear visual indicators for processing states
3. **Quick Actions**: One-click access to common tasks
4. **Error Visibility**: Prominent error states with actionable messages
5. **Responsive Tables**: Scroll horizontally on mobile, full width on desktop