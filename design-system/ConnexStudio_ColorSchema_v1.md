# Connex Studio Design System
## Color Schema & Visual Language Specification

**Version:** 1.0
**Last Updated:** January 2025
**Design Philosophy:** 工業級的精準，消費級的優雅 (Industrial Precision, Consumer Elegance)

---

# 1. Design Philosophy

## 1.1 Core Principles

| Principle | Description |
|-----------|-------------|
| **Precision** | Every color serves a purpose. No decorative gradients without function. |
| **Clarity** | Data readability is paramount. 4.5:1 minimum contrast ratio. |
| **Calm Confidence** | Industrial environments are stressful. UI should be calming yet authoritative. |
| **Scannable** | Engineers scan, not read. Status must be visible at a glance. |

## 1.2 Visual Identity

Connex Studio sits at the intersection of:
- **Developer Tools** (VS Code, Postman) — Dark mode, syntax highlighting
- **Industrial HMI** (SCADA systems) — Status indicators, alarm colors
- **Modern SaaS** (Linear, Vercel) — Clean, refined, professional

---

# 2. Foundation Colors

## 2.1 Background Hierarchy (Dark Mode Primary)

```
┌─────────────────────────────────────────────────────────────────┐
│  BACKGROUND HIERARCHY                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Level 0 - App Background        #0B0E14    rgb(11, 14, 20)    │
│  ████████████████████████████                                   │
│  Deep space black. OLED-friendly. Main canvas.                  │
│                                                                 │
│  Level 1 - Surface               #141820    rgb(20, 24, 32)    │
│  ████████████████████████████                                   │
│  Panels, sidebars, cards at rest.                               │
│                                                                 │
│  Level 2 - Surface Elevated      #1C2029    rgb(28, 32, 41)    │
│  ████████████████████████████                                   │
│  Hover states, dropdown menus, modals.                          │
│                                                                 │
│  Level 3 - Surface Active        #252A36    rgb(37, 42, 54)    │
│  ████████████████████████████                                   │
│  Selected items, active tabs, pressed states.                   │
│                                                                 │
│  Level 4 - Surface Highlight     #2E3440    rgb(46, 52, 64)    │
│  ████████████████████████████                                   │
│  Tooltip backgrounds, context menus.                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 2.2 Border & Divider Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `border-subtle` | #1E2430 | Subtle separation between sections |
| `border-default` | #2A3142 | Default borders, input outlines |
| `border-strong` | #3B4459 | Emphasized borders, focus states |
| `border-accent` | #4A90E2 | Focused input, selected items |

## 2.3 Text Hierarchy

| Token | Hex | Contrast | Usage |
|-------|-----|----------|-------|
| `text-primary` | #F0F4F8 | 15.8:1 | Primary content, headings |
| `text-secondary` | #A8B5C4 | 8.2:1 | Secondary text, descriptions |
| `text-tertiary` | #6B7A8F | 4.6:1 | Placeholders, disabled text |
| `text-muted` | #4A5568 | 3.1:1 | Watermarks only (not for content) |

---

# 3. Brand Colors

## 3.1 Primary Color — Industrial Blue

> *Connex Blue: Trust, precision, connectivity — the color of data flowing.*

```
┌─────────────────────────────────────────────────────────────────┐
│  CONNEX BLUE - PRIMARY PALETTE                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  50   #E8F4FD   Tint for backgrounds                           │
│  100  #C5E1FA   Light hover states                              │
│  200  #91C8F6   Secondary buttons                               │
│  300  #5BAAEF   Active states                                   │
│  400  #3B93E8   Links, interactive elements                     │
│  500  #2B7CD3   ★ PRIMARY - Main brand color                   │
│  600  #1E5FA6   Hover on primary                                │
│  700  #164680   Pressed states                                  │
│  800  #0F3058   Dark accents                                    │
│  900  #091E3A   Darkest tone                                    │
│                                                                 │
│  Usage:                                                         │
│  • Primary buttons: 500                                         │
│  • Primary button hover: 600                                    │
│  • Links: 400                                                   │
│  • Focus rings: 400 with 40% opacity                           │
│  • Selected items background: 500 at 15% opacity               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Semantic Tokens:**
```
--color-primary: #2B7CD3
--color-primary-hover: #1E5FA6
--color-primary-active: #164680
--color-primary-subtle: rgba(43, 124, 211, 0.15)
--color-primary-muted: rgba(43, 124, 211, 0.40)
```

## 3.2 Secondary Color — Precision Slate

> *Grounded, professional, the steel of industrial equipment.*

```
┌─────────────────────────────────────────────────────────────────┐
│  PRECISION SLATE - SECONDARY PALETTE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  50   #F8FAFC                                                   │
│  100  #F1F5F9                                                   │
│  200  #E2E8F0                                                   │
│  300  #CBD5E1                                                   │
│  400  #94A3B8                                                   │
│  500  #64748B   ★ SECONDARY                                    │
│  600  #475569                                                   │
│  700  #334155                                                   │
│  800  #1E293B                                                   │
│  900  #0F172A                                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 3.3 Accent Color — Signal Orange

> *Attention-grabbing without alarm. For CTAs and important actions.*

```
┌─────────────────────────────────────────────────────────────────┐
│  SIGNAL ORANGE - ACCENT PALETTE                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  50   #FFF7ED                                                   │
│  100  #FFEDD5                                                   │
│  200  #FED7AA                                                   │
│  300  #FDBA74                                                   │
│  400  #FB923C                                                   │
│  500  #F97316   ★ ACCENT                                       │
│  600  #EA580C                                                   │
│  700  #C2410C                                                   │
│  800  #9A3412                                                   │
│  900  #7C2D12                                                   │
│                                                                 │
│  Usage:                                                         │
│  • REC button (recording)                                       │
│  • Important CTA buttons                                        │
│  • Notification badges                                          │
│  • "New" indicators                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

# 4. Semantic Colors — Status System

## 4.1 Connection Status

> *Critical for IIoT. Must be instantly recognizable.*

```
┌─────────────────────────────────────────────────────────────────┐
│  CONNECTION STATUS COLORS                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ● CONNECTED        #10B981 (Emerald-500)                      │
│    Background:      rgba(16, 185, 129, 0.15)                   │
│    Pulse animation: Yes (subtle glow)                          │
│                                                                 │
│  ● CONNECTING       #F59E0B (Amber-500)                        │
│    Background:      rgba(245, 158, 11, 0.15)                   │
│    Animation:       Pulsing dot                                 │
│                                                                 │
│  ● DISCONNECTED     #6B7280 (Gray-500)                         │
│    Background:      rgba(107, 114, 128, 0.15)                  │
│    Style:           Hollow circle or dimmed                     │
│                                                                 │
│  ● ERROR            #EF4444 (Red-500)                          │
│    Background:      rgba(239, 68, 68, 0.15)                    │
│    Animation:       Static (no animation on error)              │
│                                                                 │
│  ● RECONNECTING     #8B5CF6 (Violet-500)                       │
│    Background:      rgba(139, 92, 246, 0.15)                   │
│    Animation:       Spinning indicator                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 4.2 Data Quality Indicators

| Quality | Color | Hex | Icon Suggestion |
|---------|-------|-----|-----------------|
| **Good** | Green | #10B981 | ● Solid dot |
| **Uncertain** | Yellow | #F59E0B | ◐ Half-filled |
| **Bad** | Red | #EF4444 | ○ Hollow + X |
| **Not Connected** | Gray | #6B7280 | ○ Hollow |

## 4.3 Alert Severity Levels

```
┌─────────────────────────────────────────────────────────────────┐
│  ALERT SEVERITY SYSTEM                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ╔═══════════════════════════════════════════════════════════╗ │
│  ║  CRITICAL                                                  ║ │
│  ║  Background: #450A0A    Text: #FCA5A5    Icon: #EF4444    ║ │
│  ║  Border: #DC2626        Animation: Pulse                   ║ │
│  ╚═══════════════════════════════════════════════════════════╝ │
│                                                                 │
│  ╔═══════════════════════════════════════════════════════════╗ │
│  ║  WARNING                                                   ║ │
│  ║  Background: #451A03    Text: #FCD34D    Icon: #F59E0B    ║ │
│  ║  Border: #D97706        Animation: None                    ║ │
│  ╚═══════════════════════════════════════════════════════════╝ │
│                                                                 │
│  ╔═══════════════════════════════════════════════════════════╗ │
│  ║  INFO                                                      ║ │
│  ║  Background: #082F49    Text: #7DD3FC    Icon: #0EA5E9    ║ │
│  ║  Border: #0284C7        Animation: None                    ║ │
│  ╚═══════════════════════════════════════════════════════════╝ │
│                                                                 │
│  ╔═══════════════════════════════════════════════════════════╗ │
│  ║  SUCCESS                                                   ║ │
│  ║  Background: #052E16    Text: #86EFAC    Icon: #10B981    ║ │
│  ║  Border: #059669        Animation: Fade out after 5s       ║ │
│  ╚═══════════════════════════════════════════════════════════╝ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

# 5. Data Visualization Palette

## 5.1 Chart Series Colors (Multi-line/Multi-series)

> *Designed for distinguishability, colorblind safety, and dark mode.*

```
┌─────────────────────────────────────────────────────────────────┐
│  CHART SERIES PALETTE - 10 COLORS                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Series 1   #4A90E2   Azure Blue       (Primary series)        │
│  ████████████████████████████                                   │
│                                                                 │
│  Series 2   #50C878   Emerald Green                            │
│  ████████████████████████████                                   │
│                                                                 │
│  Series 3   #E8AA42   Amber Gold                               │
│  ████████████████████████████                                   │
│                                                                 │
│  Series 4   #E25C5C   Coral Red                                │
│  ████████████████████████████                                   │
│                                                                 │
│  Series 5   #9B72CF   Lavender Purple                          │
│  ████████████████████████████                                   │
│                                                                 │
│  Series 6   #4ECDC4   Turquoise                                │
│  ████████████████████████████                                   │
│                                                                 │
│  Series 7   #F7A072   Peach                                    │
│  ████████████████████████████                                   │
│                                                                 │
│  Series 8   #72A0CF   Steel Blue                               │
│  ████████████████████████████                                   │
│                                                                 │
│  Series 9   #95D5B2   Sage Green                               │
│  ████████████████████████████                                   │
│                                                                 │
│  Series 10  #DDA0DD   Plum                                     │
│  ████████████████████████████                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 5.2 Sparklines

| Element | Color | Notes |
|---------|-------|-------|
| Line | #4A90E2 | Primary blue, 2px stroke |
| Fill | rgba(74, 144, 226, 0.15) | Subtle area fill |
| Min Point | #EF4444 | Red dot for minimum |
| Max Point | #10B981 | Green dot for maximum |
| Last Point | #F59E0B | Amber dot for current |

## 5.3 Heatmap & Traffic Light

```
┌─────────────────────────────────────────────────────────────────┐
│  VALUE RANGE HEATMAP                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Cool (Low)  ───────────────────────────────────►  Hot (High)  │
│                                                                 │
│  #1E40AF  #3B82F6  #60A5FA  #93C5FD  │  #FBBF24  #F97316  #EF4444
│  Deep     Medium   Light    Pale     │  Warm     Orange   Hot   │
│  Blue     Blue     Blue     Blue     │  Yellow                  │
│                                                                 │
│  For: Temperature, load, utilization metrics                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  TRAFFIC LIGHT (Boolean/Status)                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Running/On/True:    #10B981 (Green)    ●                      │
│  Idle/Standby:       #F59E0B (Amber)    ●                      │
│  Stopped/Off/False:  #EF4444 (Red)      ●                      │
│  Unknown/N/A:        #6B7280 (Gray)     ●                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 5.4 Protocol-Specific Colors

> *Each protocol has a signature color for instant recognition.*

| Protocol | Color | Hex | Usage |
|----------|-------|-----|-------|
| **Modbus** | Teal | #14B8A6 | Connection icons, badges |
| **OPC UA** | Purple | #8B5CF6 | Connection icons, badges |
| **MQTT** | Green | #22C55E | Connection icons, badges |
| **BACnet** | Blue | #3B82F6 | Connection icons, badges |

---

# 6. Typography System

## 6.1 Font Stack

```css
/* Primary UI Font */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI',
             Roboto, Oxygen, Ubuntu, sans-serif;

/* Monospace (Data, Code, Addresses) */
--font-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono',
             Consolas, 'Liberation Mono', monospace;

/* Numeric Display (Dashboard numbers) */
--font-numeric: 'Inter', 'Roboto Mono', monospace;
```

## 6.2 Type Scale

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `display-lg` | 32px | 700 | 1.2 | Dashboard big numbers |
| `display-md` | 24px | 600 | 1.3 | Panel headers |
| `heading-lg` | 20px | 600 | 1.4 | Section titles |
| `heading-md` | 16px | 600 | 1.5 | Card headers |
| `body-lg` | 15px | 400 | 1.6 | Primary content |
| `body-md` | 14px | 400 | 1.5 | Standard text |
| `body-sm` | 13px | 400 | 1.5 | Secondary text |
| `caption` | 12px | 400 | 1.4 | Labels, timestamps |
| `micro` | 11px | 500 | 1.3 | Badges, tags |
| `data` | 13px | 500 | 1.0 | Grid data (mono) |

---

# 7. Component-Specific Guidelines

## 7.1 Super Grid (Data Table)

```
┌─────────────────────────────────────────────────────────────────┐
│  SUPER GRID COLOR SPECIFICATION                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Header Row:                                                    │
│    Background:     #1C2029                                      │
│    Text:           #A8B5C4                                      │
│    Border-bottom:  #2A3142                                      │
│                                                                 │
│  Data Rows:                                                     │
│    Default:        #141820                                      │
│    Alternate:      #181C24   (zebra striping)                  │
│    Hover:          #252A36                                      │
│    Selected:       rgba(43, 124, 211, 0.15)                    │
│    Text:           #F0F4F8                                      │
│                                                                 │
│  Cell States:                                                   │
│    Value Changed:  #F59E0B (text flash, 500ms fade)            │
│    Alert High:     rgba(239, 68, 68, 0.20) background          │
│    Alert Low:      rgba(59, 130, 246, 0.20) background         │
│                                                                 │
│  Sparkline Column:                                              │
│    Line:           #4A90E2                                      │
│    Background:     transparent                                  │
│    Width:          80-120px                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 7.2 Connection Panel

```
┌─────────────────────────────────────────────────────────────────┐
│  CONNECTION CARD STATES                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Disconnected:                                                  │
│  ┌─────────────────────────────────────────┐                   │
│  │  ○ PLC-Line-A          [Connect]        │  Border: #2A3142  │
│  │  Modbus TCP • 192.168.1.100:502         │  BG: #141820      │
│  └─────────────────────────────────────────┘                   │
│                                                                 │
│  Connecting:                                                    │
│  ┌─────────────────────────────────────────┐                   │
│  │  ◐ PLC-Line-A          [Cancel]         │  Border: #D97706  │
│  │  Modbus TCP • Connecting...             │  BG: #1C2029      │
│  └─────────────────────────────────────────┘  Pulse animation  │
│                                                                 │
│  Connected:                                                     │
│  ┌─────────────────────────────────────────┐                   │
│  │  ● PLC-Line-A          [Disconnect]     │  Border: #059669  │
│  │  Modbus TCP • RTT: 12ms                 │  BG: #0F2922      │
│  └─────────────────────────────────────────┘  Subtle glow      │
│                                                                 │
│  Error:                                                         │
│  ┌─────────────────────────────────────────┐                   │
│  │  ✕ PLC-Line-A          [Retry]          │  Border: #DC2626  │
│  │  Connection timeout                     │  BG: #2A1515      │
│  └─────────────────────────────────────────┘                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 7.3 Recording Button (REC)

```css
/* REC Button - Idle */
.rec-button-idle {
  background: #252A36;
  color: #A8B5C4;
  border: 1px solid #3B4459;
}

/* REC Button - Recording */
.rec-button-active {
  background: #EF4444;
  color: #FFFFFF;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
```

## 7.4 The Bridge (Protocol Mapping)

```
┌─────────────────────────────────────────────────────────────────┐
│  BRIDGE VISUALIZATION COLORS                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Source Panel:         #14B8A6 (Teal) accent                   │
│  Target Panel:         #22C55E (Green) accent                   │
│                                                                 │
│  Connection Line:                                               │
│    Idle:              #3B4459 (dashed)                         │
│    Active:            #4A90E2 (solid, animated flow)           │
│    Error:             #EF4444 (solid, static)                  │
│                                                                 │
│  Data Flow Animation:                                           │
│    Particle color:    #4A90E2                                   │
│    Direction:         Animated dots flowing source → target    │
│    Speed:             Proportional to data rate                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 7.5 Data DVR Timeline

```
┌─────────────────────────────────────────────────────────────────┐
│  DVR TIMELINE COLORS                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Timeline Track:       #1C2029                                  │
│  Recorded Region:      rgba(74, 144, 226, 0.30)                │
│  Playhead:            #F97316 (orange, high visibility)        │
│  Bookmark Marker:      #8B5CF6 (purple)                         │
│  Alert Marker:         #EF4444 (red triangle)                  │
│                                                                 │
│  Time Labels:          #6B7A8F                                  │
│  Current Time:         #F0F4F8                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

# 8. Interactive States

## 8.1 Button States

| State | Primary | Secondary | Danger |
|-------|---------|-----------|--------|
| **Default** | #2B7CD3 | #252A36 | #DC2626 |
| **Hover** | #1E5FA6 | #2E3440 | #B91C1C |
| **Active** | #164680 | #3B4459 | #991B1B |
| **Disabled** | #1E5FA6 @ 50% | #252A36 @ 50% | #DC2626 @ 50% |
| **Focus Ring** | #4A90E2 @ 40% | #4A90E2 @ 40% | #EF4444 @ 40% |

## 8.2 Input Fields

```
┌─────────────────────────────────────────────────────────────────┐
│  INPUT FIELD STATES                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Default:                                                       │
│  ┌──────────────────────────────────┐                          │
│  │  192.168.1.100                   │  BG: #141820             │
│  └──────────────────────────────────┘  Border: #2A3142         │
│                                                                 │
│  Focused:                                                       │
│  ┌──────────────────────────────────┐                          │
│  │  192.168.1.100                   │  BG: #1C2029             │
│  └──────────────────────────────────┘  Border: #4A90E2         │
│                                        Shadow: 0 0 0 3px        │
│                                        rgba(74,144,226,0.25)    │
│                                                                 │
│  Error:                                                         │
│  ┌──────────────────────────────────┐                          │
│  │  invalid_ip                      │  BG: #1C1515             │
│  └──────────────────────────────────┘  Border: #EF4444         │
│  Invalid IP address format                                      │
│                                                                 │
│  Disabled:                                                      │
│  ┌──────────────────────────────────┐                          │
│  │  Locked value                    │  BG: #0B0E14             │
│  └──────────────────────────────────┘  Border: #1E2430         │
│                                        Opacity: 0.5             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

# 9. Accessibility Compliance

## 9.1 Contrast Ratios (WCAG 2.1 AA)

| Combination | Ratio | Status |
|-------------|-------|--------|
| `text-primary` on `bg-surface` | 15.8:1 | ✅ AAA |
| `text-secondary` on `bg-surface` | 8.2:1 | ✅ AAA |
| `text-tertiary` on `bg-surface` | 4.6:1 | ✅ AA |
| `primary-500` on `bg-app` | 6.8:1 | ✅ AA |
| `success` on dark background | 5.2:1 | ✅ AA |
| `error` on dark background | 4.9:1 | ✅ AA |

## 9.2 Colorblind-Safe Design

- **Never use color alone** to convey status. Always pair with:
  - Icons (✓, ✕, !, ●)
  - Text labels
  - Patterns for chart series

- **Deuteranopia/Protanopia Safe:**
  - Replace pure red/green with:
    - Success: #10B981 (teal-green, visible)
    - Error: #EF4444 (orange-red, distinguishable)
  - Add icon indicators always

## 9.3 Motion Preferences

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }

  .sparkline-animate,
  .connection-pulse,
  .data-flow-particles {
    animation: none;
  }
}
```

---

# 10. Implementation Reference

## 10.1 CSS Custom Properties (Avalonia-Compatible)

```css
:root {
  /* ═══════════════════════════════════════════════════════ */
  /* BACKGROUND HIERARCHY                                     */
  /* ═══════════════════════════════════════════════════════ */
  --bg-app: #0B0E14;
  --bg-surface: #141820;
  --bg-surface-elevated: #1C2029;
  --bg-surface-active: #252A36;
  --bg-surface-highlight: #2E3440;

  /* ═══════════════════════════════════════════════════════ */
  /* BORDERS                                                  */
  /* ═══════════════════════════════════════════════════════ */
  --border-subtle: #1E2430;
  --border-default: #2A3142;
  --border-strong: #3B4459;
  --border-accent: #4A90E2;

  /* ═══════════════════════════════════════════════════════ */
  /* TEXT                                                     */
  /* ═══════════════════════════════════════════════════════ */
  --text-primary: #F0F4F8;
  --text-secondary: #A8B5C4;
  --text-tertiary: #6B7A8F;
  --text-muted: #4A5568;

  /* ═══════════════════════════════════════════════════════ */
  /* BRAND COLORS                                             */
  /* ═══════════════════════════════════════════════════════ */
  --color-primary: #2B7CD3;
  --color-primary-hover: #1E5FA6;
  --color-primary-active: #164680;
  --color-primary-subtle: rgba(43, 124, 211, 0.15);

  --color-accent: #F97316;
  --color-accent-hover: #EA580C;

  /* ═══════════════════════════════════════════════════════ */
  /* STATUS COLORS                                            */
  /* ═══════════════════════════════════════════════════════ */
  --color-success: #10B981;
  --color-success-bg: rgba(16, 185, 129, 0.15);

  --color-warning: #F59E0B;
  --color-warning-bg: rgba(245, 158, 11, 0.15);

  --color-error: #EF4444;
  --color-error-bg: rgba(239, 68, 68, 0.15);

  --color-info: #0EA5E9;
  --color-info-bg: rgba(14, 165, 233, 0.15);

  /* ═══════════════════════════════════════════════════════ */
  /* PROTOCOL COLORS                                          */
  /* ═══════════════════════════════════════════════════════ */
  --protocol-modbus: #14B8A6;
  --protocol-opcua: #8B5CF6;
  --protocol-mqtt: #22C55E;
  --protocol-bacnet: #3B82F6;

  /* ═══════════════════════════════════════════════════════ */
  /* CHART SERIES                                             */
  /* ═══════════════════════════════════════════════════════ */
  --chart-1: #4A90E2;
  --chart-2: #50C878;
  --chart-3: #E8AA42;
  --chart-4: #E25C5C;
  --chart-5: #9B72CF;
  --chart-6: #4ECDC4;
  --chart-7: #F7A072;
  --chart-8: #72A0CF;
  --chart-9: #95D5B2;
  --chart-10: #DDA0DD;
}
```

## 10.2 Avalonia Resource Dictionary

```xml
<ResourceDictionary xmlns="https://github.com/avaloniaui"
                    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">

    <!-- Background Hierarchy -->
    <Color x:Key="BgApp">#0B0E14</Color>
    <Color x:Key="BgSurface">#141820</Color>
    <Color x:Key="BgSurfaceElevated">#1C2029</Color>
    <Color x:Key="BgSurfaceActive">#252A36</Color>
    <Color x:Key="BgSurfaceHighlight">#2E3440</Color>

    <!-- Text Colors -->
    <Color x:Key="TextPrimary">#F0F4F8</Color>
    <Color x:Key="TextSecondary">#A8B5C4</Color>
    <Color x:Key="TextTertiary">#6B7A8F</Color>

    <!-- Brand Colors -->
    <Color x:Key="Primary">#2B7CD3</Color>
    <Color x:Key="PrimaryHover">#1E5FA6</Color>
    <Color x:Key="Accent">#F97316</Color>

    <!-- Status Colors -->
    <Color x:Key="Success">#10B981</Color>
    <Color x:Key="Warning">#F59E0B</Color>
    <Color x:Key="Error">#EF4444</Color>
    <Color x:Key="Info">#0EA5E9</Color>

    <!-- Protocol Colors -->
    <Color x:Key="ProtocolModbus">#14B8A6</Color>
    <Color x:Key="ProtocolOpcUa">#8B5CF6</Color>
    <Color x:Key="ProtocolMqtt">#22C55E</Color>

    <!-- Brushes -->
    <SolidColorBrush x:Key="BgAppBrush" Color="{StaticResource BgApp}"/>
    <SolidColorBrush x:Key="BgSurfaceBrush" Color="{StaticResource BgSurface}"/>
    <SolidColorBrush x:Key="TextPrimaryBrush" Color="{StaticResource TextPrimary}"/>
    <SolidColorBrush x:Key="PrimaryBrush" Color="{StaticResource Primary}"/>

</ResourceDictionary>
```

---

# 11. Quick Reference Card

```
╔═══════════════════════════════════════════════════════════════════╗
║                    CONNEX STUDIO COLOR QUICK REF                   ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  BACKGROUNDS           BRAND              STATUS                   ║
║  ────────────          ─────              ──────                   ║
║  App:      #0B0E14     Primary: #2B7CD3   Success: #10B981        ║
║  Surface:  #141820     Accent:  #F97316   Warning: #F59E0B        ║
║  Elevated: #1C2029                        Error:   #EF4444        ║
║  Active:   #252A36                        Info:    #0EA5E9        ║
║                                                                    ║
║  TEXT                  PROTOCOLS          BORDERS                  ║
║  ────                  ─────────          ───────                  ║
║  Primary:   #F0F4F8    Modbus:  #14B8A6   Subtle:  #1E2430        ║
║  Secondary: #A8B5C4    OPC UA:  #8B5CF6   Default: #2A3142        ║
║  Tertiary:  #6B7A8F    MQTT:    #22C55E   Strong:  #3B4459        ║
║                                                                    ║
║  CHART SERIES                                                      ║
║  ─────────────                                                     ║
║  1: #4A90E2  2: #50C878  3: #E8AA42  4: #E25C5C  5: #9B72CF       ║
║  6: #4ECDC4  7: #F7A072  8: #72A0CF  9: #95D5B2  10: #DDA0DD      ║
║                                                                    ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

**Document Version:** 1.0
**Design System Name:** Connex Industrial Precision
**Created for:** Connex Studio - The Postman for Industrial IoT

*「簡單的事情保持簡單，複雜的事情變得可能。」*
