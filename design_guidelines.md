# Lead Intel - Design Guidelines

## Design Approach: Utility-Focused Platform with Premium Landing Experience
**Primary Reference**: Linear + Stripe Dashboard aesthetics  
**Landing Page**: Custom 3D particle system with gestural interaction (already designed)

---

## Core Design Elements

### A. Typography
**Body Application** (Dashboard, Forms):
- Primary: Inter (Google Fonts)
- Headings: Inter 600 Semibold, 24px-32px
- Body: Inter 400 Regular, 14px-16px
- Labels/Metrics: Inter 500 Medium, 16px-20px
- Code/Data: JetBrains Mono 400, 13px

**Landing Page**:
- Headlines: Montserrat Bold, 56px-72px
- Subheadings: Hind Regular, 20px-24px

### B. Layout System
**Tailwind Spacing**: Use units **2, 4, 6, 8** consistently
- Form spacing: `gap-4`, `space-y-4`
- Card padding: `p-6` or `p-8`
- Section margins: `mb-8`, `mt-6`
- Container: `max-w-7xl mx-auto px-6`

### C. Color Palette
**Hawk Ridge Brand**:
- Primary Blue: `#2C88C9` (CTAs, links, active states)
- Accent Orange: `#F26419` (highlights, success states)

**Functional Colors** (from existing theme):
- Background: `hsl(var(--background))`
- Foreground: `hsl(var(--foreground))`
- Muted: `hsl(var(--muted))` for secondary text
- Border: `hsl(var(--border))` for dividers
- Destructive: Red for errors/warnings

---

## Component Library

### Navigation
**Main Application Sidebar**:
- Fixed left sidebar, 240px width
- Role-based menu items (Dashboard, Leads, Coaching, Reports, Settings)
- User avatar and name at bottom
- Collapse/expand functionality on mobile

**Top Bar**:
- Breadcrumb navigation on left
- Search bar (center, max-w-md)
- Notifications bell + user menu on right

### Authentication Forms
**Login/Signup Pages**:
- Split layout: Landing background (left 50%, with particle effects visible) + Form panel (right 50%, solid background)
- Form container: `max-w-md`, centered in panel
- Logo at top of form
- Heading + subheading above form
- Input fields: Full width, `h-12`, clear labels above
- Primary button: Blue (#2C88C9), full width, `h-12`
- Links: Orange (#F26419) for "Forgot password?", "Sign up instead"
- Validation errors: Inline below fields, destructive color

### Dashboard Cards
**Metric Cards**:
- White/dark card background with subtle border
- Large number display (32px-48px, Inter Medium)
- Label below (14px, muted color)
- Small trend indicator (↑ 12% with green/red)
- Grid layout: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`

**Data Tables**:
- Striped rows on hover (`hover:bg-muted/50`)
- Column headers: Inter 500 Medium, 12px uppercase, muted
- Row height: `h-14`
- Action buttons: Icon-only, ghost variant
- Pagination at bottom right

### Forms & Inputs
**Input Fields**:
- Height: `h-11`
- Border: 1px solid border color
- Focus: Ring in primary blue
- Disabled: Reduced opacity, muted background
- Error state: Red border + error message below

**Buttons**:
- Primary: Blue background, white text, `h-11`, `px-6`
- Secondary: Transparent background, blue border
- Destructive: Red background
- Ghost: No background, hover shows muted background
- All buttons: Rounded corners (`rounded-md`), Inter 500 Medium

### Status Badges
- Processing: Blue background, white text
- Success: Green background
- Error: Red background
- Pending: Gray background
- Small: `px-2 py-1`, 12px text, `rounded-full`

---

## Page Layouts

### Landing Page
- Full viewport height gradient background (blue to dark blue)
- Animated 3D particle system (supernova shape)
- MediaPipe hand gesture control enabled
- Logo top-left
- Center: Large headline + subheadline + Enter button
- Enter button: Transparent with blue border, glowing hover effect
- No footer needed - single-purpose entry point

### Login/Signup
- Left panel (50%): Extends landing page background with particles
- Right panel (50%): Solid card (`bg-card`) with form
- Form: Centered, max-w-md, vertical stack
- No complex navigation - just form and toggle between login/signup

### Dashboard (Post-Auth)
- Sidebar navigation (fixed left)
- Main content area: `ml-60` (offset for sidebar)
- Top metrics row: 4-column grid of metric cards
- Below: Recent activity table or main content area
- All content: `max-w-7xl` container with `px-6` padding

### User Profile
- Two-column layout: Settings sidebar (left, 280px) + Content (right)
- Settings sections: Account, Security, Preferences, Notifications
- Form fields: Left-aligned labels, right-aligned inputs
- Save button: Fixed at bottom or inline per section

---

## Interactions

**Minimal Animations**:
- Fade transitions: `transition-opacity duration-200`
- Hover elevation on cards: Use existing `.hover-elevate` utility
- Button states: Automatic via `.hover-elevate-2`
- Page transitions: Simple fade, no complex motion
- Loading states: Spinner or skeleton screens

**Form Validation**:
- Real-time validation on blur
- Inline error messages appear below field
- Success checkmark appears in field when valid
- Submit button disabled until form valid

---

## Images
No decorative images needed for this application. Focus is on:
- **Logo**: Hawk Ridge SVG logo (provided)
- **User avatars**: Circular, 32px-40px diameter, initials fallback
- **Icons**: Heroicons (outline style) throughout application
- **Landing page**: Generative 3D particle effects (no static images)

The application prioritizes data density and functional clarity over visual decoration.