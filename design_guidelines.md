# Design Guidelines: Multi-Purpose Disaster Management Platform

## Design Approach: Material Design for Emergency Systems

This is a data-intensive, mission-critical application where clarity, reliability, and rapid information processing are paramount. The design follows **Material Design principles** adapted for emergency management contexts, prioritizing information hierarchy, semantic color coding, and professional data visualization.

## Core Design Principles

1. **Critical Information First**: Alert status and risk levels dominate the visual hierarchy
2. **Semantic Color System**: Instant recognition of danger levels through standardized colors
3. **Data Clarity**: Clean charts, maps, and metrics without decorative elements
4. **24/7 Reliability**: Optimized for extended monitoring sessions with strong dark mode support
5. **Field-Ready**: Touch-friendly controls for mobile emergency response

---

## Color Palette

### Light Mode
- **Primary**: 205 85% 45% (Professional blue - trust, water, stability)
- **Secondary**: 200 70% 40% (Teal accent for secondary actions)
- **Background**: 210 20% 98% (Soft neutral for reduced eye strain)
- **Surface**: 0 0% 100% (Pure white for cards and panels)
- **Text Primary**: 220 15% 15% (Near black for readability)
- **Text Secondary**: 220 10% 45% (Gray for supporting text)

### Dark Mode (Critical for 24/7 monitoring)
- **Primary**: 205 75% 55% (Brighter blue for visibility)
- **Secondary**: 200 65% 50% (Teal maintains prominence)
- **Background**: 220 20% 12% (Deep blue-gray, less harsh than pure black)
- **Surface**: 220 15% 18% (Elevated surfaces for depth)
- **Text Primary**: 210 10% 95% (High contrast white-gray)
- **Text Secondary**: 210 8% 65% (Muted for hierarchy)

### Alert/Risk Colors (Both Modes)
- **Safe/Low**: 140 65% 45% (Green)
- **Warning/Medium**: 45 95% 55% (Amber/Yellow)
- **High Risk**: 25 90% 55% (Orange)
- **Critical/Severe**: 0 85% 50% (Red)
- **Info/Neutral**: 210 75% 55% (Blue)

---

## Typography

**Primary Font Family**: 'Inter', system-ui, -apple-system, sans-serif (Clean, highly legible for data)

**Font Hierarchy**:
- **Hero/Dashboard Title**: 2.5rem (40px), font-weight 700, letter-spacing -0.02em
- **Section Headers**: 1.75rem (28px), font-weight 600
- **Card Titles**: 1.25rem (20px), font-weight 600
- **Body Text**: 1rem (16px), font-weight 400, line-height 1.6
- **Data Labels**: 0.875rem (14px), font-weight 500, text-transform uppercase, letter-spacing 0.05em
- **Metrics/Numbers**: 2rem (32px), font-weight 700, tabular-nums (monospace numbers)

---

## Layout System

**Spacing Scale**: Use Tailwind units of **2, 4, 6, 8, 12, 16** for consistent rhythm
- Card padding: p-6
- Section gaps: gap-8
- Component spacing: space-y-4 or space-x-4
- Dashboard margins: m-8 on desktop, m-4 on mobile

**Grid System**:
- Dashboard layout: 12-column grid with 4:8 split (sidebar:main content)
- Card grids: 3 columns on desktop (grid-cols-3), 2 on tablet (md:grid-cols-2), 1 on mobile
- Map view: Full-width with fixed sidebar overlay on mobile

**Container Widths**:
- Max dashboard width: max-w-screen-2xl (1536px)
- Content sections: max-w-7xl
- Forms and focused content: max-w-3xl

---

## Component Library

### Navigation
- **Top App Bar**: Fixed, 64px height, primary color background with white text
- Contains: Logo (left), Location selector (center), User profile + alerts (right)
- **Sidebar Navigation**: 280px wide, surface color, icon + label format
- Sections: Dashboard, Predictions, Alerts, Maps, Reports, Settings
- Active state: Highlighted background (primary color at 10% opacity)

### Dashboard Cards
- **Metric Cards**: White/surface background, rounded-lg (8px), shadow-md
- Structure: Icon (top-left), Label (uppercase, small), Large number, Trend indicator (arrow + percentage)
- Color-coded borders (4px left border) matching risk level
- **Alert Cards**: Elevated with stronger shadow, yellow/orange/red accent colors
- Include: Severity badge, timestamp, location, action buttons

### Maps & Visualization
- **Interactive Map**: Full-height Leaflet/Mapbox with custom markers
- Risk zones: Color-coded polygons with opacity 0.4, stroke width 2
- Markers: Custom SVG icons for monitoring stations, shelters, affected areas
- Legend: Fixed bottom-right with white background, rounded corners
- **Charts**: Use Chart.js or Recharts with matching color palette
- Line charts for predictions (gradient fills), Bar charts for rainfall data

### Forms & Inputs
- **Input Fields**: Border-2, rounded-md, focus:ring-2 focus:ring-primary
- Dark mode: bg-surface with lighter borders
- Labels: Font-weight 500, mb-2, text-sm
- **Dropdowns/Selects**: Native styled with custom arrow icon, matching input style
- **Buttons Primary**: bg-primary text-white, px-6 py-3, rounded-md, font-medium
- **Buttons Secondary**: border-2 border-primary text-primary, hover:bg-primary/10

### Alert System
- **Toast Notifications**: Fixed top-right, animated slide-in
- Color-coded left border (4px), icon, message, dismiss button
- Auto-dismiss after 5s for info, manual dismiss for warnings/errors
- **Alert Banner**: Full-width at top of dashboard for critical alerts
- Pulsing animation for critical severity

### Data Tables
- **Structure**: Sticky header, striped rows (alternate row background)
- Sortable columns with arrow indicators
- Pagination at bottom with "Rows per page" selector
- Mobile: Cards layout instead of table

---

## Animations

**Principle**: Minimal, purposeful animations only for critical feedback

- **Loading States**: Skeleton screens with subtle shimmer (1.5s duration)
- **Alert Entries**: Slide-in from right (200ms, ease-out)
- **Map Updates**: Fade transition for risk zones (300ms)
- **Critical Alerts**: Gentle pulsing glow (2s infinite) on severity badges
- **No** decorative parallax, scroll-triggered effects, or complex transitions

---

## Images & Visual Assets

**Hero Section**: NOT applicable - this is a dashboard application, not a marketing site
**Icons**: Use Heroicons (outline style) via CDN for all UI icons
**Map Markers**: Custom SVG icons in semantic colors (water drop for stations, triangle for alerts)
**Placeholder Images**: None needed - data visualization and maps are the visual focus

---

## Responsive Behavior

**Desktop (1280px+)**:
- Full sidebar navigation visible
- 3-column metric card grid
- Split-screen map + data panels

**Tablet (768px - 1279px)**:
- Collapsible sidebar (hamburger menu)
- 2-column metric cards
- Map overlays data panel

**Mobile (< 768px)**:
- Bottom navigation bar (4 primary tabs)
- Single-column cards
- Full-screen map with slide-up data drawer
- Larger touch targets (min 44px)

---

## Accessibility

- **WCAG AAA Contrast**: All text meets 7:1 ratio in both modes
- **Focus Indicators**: 3px solid ring in primary color, offset 2px
- **Screen Reader**: aria-labels on all interactive elements, live regions for alerts
- **Keyboard Navigation**: Full tab order, Enter/Space for activation, Escape to close modals
- **Motion**: Respect `prefers-reduced-motion` - disable all animations

---

## Page Structure

### Main Dashboard
- Top: Critical alert banner (if active)
- App bar with global controls
- Sidebar navigation (left)
- Main content area:
  - Row 1: 4 metric cards (Active Alerts, Affected Areas, Risk Level, Last Updated)
  - Row 2: Real-time prediction chart (full-width)
  - Row 3: Recent alerts table + Risk map (60/40 split)

### Prediction Map View
- Full-screen map interface
- Floating controls (top-right): Layers, Legend, Refresh
- Slide-out panel (left): Location search, Filter controls
- Bottom drawer (mobile): Quick stats

### Alert Management
- Filter bar (severity, location, time range)
- Alert cards in chronological order
- Bulk action toolbar (acknowledge, export)

This design system ensures rapid information processing, clear visual hierarchy for critical data, and reliable performance under emergency conditions while maintaining professional aesthetics appropriate for disaster management authorities.