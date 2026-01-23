namespace ConnexStudio.Design;

/// <summary>
/// Connex Studio Design System - Color Constants
/// Industrial Precision Design Language v1.0
///
/// Usage: var brush = new SolidColorBrush(ConnexColors.Primary);
/// </summary>
public static class ConnexColors
{
    // ═══════════════════════════════════════════════════════════════════
    // BACKGROUND HIERARCHY
    // Level 0-4: Progressively lighter surfaces for depth perception
    // ═══════════════════════════════════════════════════════════════════

    /// <summary>Level 0 - App Background. Deep space black, OLED-friendly.</summary>
    public const string BgApp = "#0B0E14";

    /// <summary>Level 1 - Surface. Panels, sidebars, cards at rest.</summary>
    public const string BgSurface = "#141820";

    /// <summary>Level 2 - Elevated. Hover states, dropdown menus, modals.</summary>
    public const string BgSurfaceElevated = "#1C2029";

    /// <summary>Level 3 - Active. Selected items, active tabs, pressed states.</summary>
    public const string BgSurfaceActive = "#252A36";

    /// <summary>Level 4 - Highlight. Tooltip backgrounds, context menus.</summary>
    public const string BgSurfaceHighlight = "#2E3440";

    // ═══════════════════════════════════════════════════════════════════
    // BORDER COLORS
    // ═══════════════════════════════════════════════════════════════════

    /// <summary>Subtle separation between sections</summary>
    public const string BorderSubtle = "#1E2430";

    /// <summary>Default borders, input outlines</summary>
    public const string BorderDefault = "#2A3142";

    /// <summary>Emphasized borders, focus states</summary>
    public const string BorderStrong = "#3B4459";

    /// <summary>Focused input, selected items</summary>
    public const string BorderAccent = "#4A90E2";

    // ═══════════════════════════════════════════════════════════════════
    // TEXT HIERARCHY
    // ═══════════════════════════════════════════════════════════════════

    /// <summary>Primary content, headings. Contrast: 15.8:1</summary>
    public const string TextPrimary = "#F0F4F8";

    /// <summary>Secondary text, descriptions. Contrast: 8.2:1</summary>
    public const string TextSecondary = "#A8B5C4";

    /// <summary>Placeholders, disabled text. Contrast: 4.6:1</summary>
    public const string TextTertiary = "#6B7A8F";

    /// <summary>Watermarks only (not for content). Contrast: 3.1:1</summary>
    public const string TextMuted = "#4A5568";

    // ═══════════════════════════════════════════════════════════════════
    // BRAND COLORS - CONNEX BLUE (PRIMARY)
    // Trust, precision, connectivity
    // ═══════════════════════════════════════════════════════════════════

    public const string Primary50 = "#E8F4FD";
    public const string Primary100 = "#C5E1FA";
    public const string Primary200 = "#91C8F6";
    public const string Primary300 = "#5BAAEF";
    public const string Primary400 = "#3B93E8";
    public const string Primary500 = "#2B7CD3";  // ★ Main brand color
    public const string Primary600 = "#1E5FA6";
    public const string Primary700 = "#164680";
    public const string Primary800 = "#0F3058";
    public const string Primary900 = "#091E3A";

    /// <summary>Primary brand color</summary>
    public const string Primary = Primary500;

    /// <summary>Primary hover state</summary>
    public const string PrimaryHover = Primary600;

    /// <summary>Primary active/pressed state</summary>
    public const string PrimaryActive = Primary700;

    // ═══════════════════════════════════════════════════════════════════
    // ACCENT COLOR - SIGNAL ORANGE
    // Attention-grabbing for CTAs and important actions
    // ═══════════════════════════════════════════════════════════════════

    public const string Accent50 = "#FFF7ED";
    public const string Accent100 = "#FFEDD5";
    public const string Accent200 = "#FED7AA";
    public const string Accent300 = "#FDBA74";
    public const string Accent400 = "#FB923C";
    public const string Accent500 = "#F97316";  // ★ Main accent
    public const string Accent600 = "#EA580C";
    public const string Accent700 = "#C2410C";

    /// <summary>Accent color for CTAs, REC button, notifications</summary>
    public const string Accent = Accent500;

    /// <summary>Accent hover state</summary>
    public const string AccentHover = Accent600;

    // ═══════════════════════════════════════════════════════════════════
    // STATUS COLORS - CONNECTION & DATA QUALITY
    // Critical for IIoT - must be instantly recognizable
    // ═══════════════════════════════════════════════════════════════════

    /// <summary>Success, Connected, Good quality</summary>
    public const string Success = "#10B981";
    public const string SuccessBg = "#0F2922";
    public const string SuccessBorder = "#059669";

    /// <summary>Warning, Connecting, Uncertain quality</summary>
    public const string Warning = "#F59E0B";
    public const string WarningBg = "#2A2210";
    public const string WarningBorder = "#D97706";

    /// <summary>Error, Connection failed, Bad quality</summary>
    public const string Error = "#EF4444";
    public const string ErrorBg = "#2A1515";
    public const string ErrorBorder = "#DC2626";

    /// <summary>Informational messages</summary>
    public const string Info = "#0EA5E9";
    public const string InfoBg = "#0C2A3A";
    public const string InfoBorder = "#0284C7";

    /// <summary>Neutral, Disconnected (idle), Not connected</summary>
    public const string Neutral = "#6B7280";
    public const string NeutralBg = "#1C1E24";

    /// <summary>Reconnecting state</summary>
    public const string Reconnecting = "#8B5CF6";
    public const string ReconnectingBg = "#1E1A2E";

    // ═══════════════════════════════════════════════════════════════════
    // ALERT SEVERITY COLORS
    // ═══════════════════════════════════════════════════════════════════

    public static class AlertCritical
    {
        public const string Background = "#450A0A";
        public const string Text = "#FCA5A5";
        public const string Icon = "#EF4444";
        public const string Border = "#DC2626";
    }

    public static class AlertWarning
    {
        public const string Background = "#451A03";
        public const string Text = "#FCD34D";
        public const string Icon = "#F59E0B";
        public const string Border = "#D97706";
    }

    public static class AlertInfo
    {
        public const string Background = "#082F49";
        public const string Text = "#7DD3FC";
        public const string Icon = "#0EA5E9";
        public const string Border = "#0284C7";
    }

    public static class AlertSuccess
    {
        public const string Background = "#052E16";
        public const string Text = "#86EFAC";
        public const string Icon = "#10B981";
        public const string Border = "#059669";
    }

    // ═══════════════════════════════════════════════════════════════════
    // PROTOCOL-SPECIFIC COLORS
    // Each protocol has a signature color for instant recognition
    // ═══════════════════════════════════════════════════════════════════

    public static class Protocol
    {
        /// <summary>Modbus - Teal</summary>
        public const string Modbus = "#14B8A6";

        /// <summary>OPC UA - Purple</summary>
        public const string OpcUa = "#8B5CF6";

        /// <summary>MQTT - Green</summary>
        public const string Mqtt = "#22C55E";

        /// <summary>BACnet - Blue</summary>
        public const string Bacnet = "#3B82F6";
    }

    // ═══════════════════════════════════════════════════════════════════
    // DATA VISUALIZATION - CHART SERIES COLORS
    // Designed for distinguishability and colorblind safety
    // ═══════════════════════════════════════════════════════════════════

    public static class Chart
    {
        public const string Series1 = "#4A90E2";   // Azure Blue
        public const string Series2 = "#50C878";   // Emerald Green
        public const string Series3 = "#E8AA42";   // Amber Gold
        public const string Series4 = "#E25C5C";   // Coral Red
        public const string Series5 = "#9B72CF";   // Lavender Purple
        public const string Series6 = "#4ECDC4";   // Turquoise
        public const string Series7 = "#F7A072";   // Peach
        public const string Series8 = "#72A0CF";   // Steel Blue
        public const string Series9 = "#95D5B2";   // Sage Green
        public const string Series10 = "#DDA0DD";  // Plum

        /// <summary>Get chart color by index (1-based, wraps around)</summary>
        public static string GetSeriesColor(int index) => (index % 10) switch
        {
            1 => Series1,
            2 => Series2,
            3 => Series3,
            4 => Series4,
            5 => Series5,
            6 => Series6,
            7 => Series7,
            8 => Series8,
            9 => Series9,
            0 => Series10,
            _ => Series1
        };

        public static readonly string[] AllSeries =
        [
            Series1, Series2, Series3, Series4, Series5,
            Series6, Series7, Series8, Series9, Series10
        ];
    }

    // ═══════════════════════════════════════════════════════════════════
    // SPARKLINE COLORS
    // ═══════════════════════════════════════════════════════════════════

    public static class Sparkline
    {
        public const string Line = "#4A90E2";
        public const string Fill = "#194A90E2";  // 10% opacity
        public const string MinPoint = "#EF4444";
        public const string MaxPoint = "#10B981";
        public const string LastPoint = "#F59E0B";
    }

    // ═══════════════════════════════════════════════════════════════════
    // HEATMAP GRADIENT (Cool → Hot)
    // ═══════════════════════════════════════════════════════════════════

    public static class Heatmap
    {
        public const string Cool1 = "#1E40AF";     // Deep Blue
        public const string Cool2 = "#3B82F6";     // Medium Blue
        public const string Cool3 = "#60A5FA";     // Light Blue
        public const string Neutral = "#93C5FD";   // Pale Blue
        public const string Warm1 = "#FBBF24";     // Warm Yellow
        public const string Warm2 = "#F97316";     // Orange
        public const string Hot = "#EF4444";       // Hot Red

        public static readonly string[] Gradient =
        [
            Cool1, Cool2, Cool3, Neutral, Warm1, Warm2, Hot
        ];
    }

    // ═══════════════════════════════════════════════════════════════════
    // TRAFFIC LIGHT COLORS
    // ═══════════════════════════════════════════════════════════════════

    public static class TrafficLight
    {
        public const string Green = "#10B981";   // Running/On/True
        public const string Amber = "#F59E0B";   // Idle/Standby
        public const string Red = "#EF4444";     // Stopped/Off/False
        public const string Gray = "#6B7280";    // Unknown/N/A
    }

    // ═══════════════════════════════════════════════════════════════════
    // DATA GRID COLORS
    // ═══════════════════════════════════════════════════════════════════

    public static class Grid
    {
        public const string HeaderBg = "#1C2029";
        public const string HeaderText = "#A8B5C4";
        public const string RowDefault = "#141820";
        public const string RowAlternate = "#181C24";
        public const string RowHover = "#252A36";
        public const string RowSelected = "#162A44";
        public const string CellChanged = "#F59E0B";
    }

    // ═══════════════════════════════════════════════════════════════════
    // DVR TIMELINE COLORS
    // ═══════════════════════════════════════════════════════════════════

    public static class Timeline
    {
        public const string Track = "#1C2029";
        public const string Recorded = "#2A4A6E";
        public const string Playhead = "#F97316";
        public const string Bookmark = "#8B5CF6";
        public const string AlertMarker = "#EF4444";
    }

    // ═══════════════════════════════════════════════════════════════════
    // BRIDGE VISUALIZATION COLORS
    // ═══════════════════════════════════════════════════════════════════

    public static class Bridge
    {
        public const string SourceAccent = "#14B8A6";
        public const string TargetAccent = "#22C55E";
        public const string LineIdle = "#3B4459";
        public const string LineActive = "#4A90E2";
        public const string LineError = "#EF4444";
        public const string Particle = "#4A90E2";
    }

    // ═══════════════════════════════════════════════════════════════════
    // RECORDING BUTTON COLORS
    // ═══════════════════════════════════════════════════════════════════

    public static class RecButton
    {
        public const string IdleBg = "#252A36";
        public const string IdleText = "#A8B5C4";
        public const string IdleBorder = "#3B4459";
        public const string ActiveBg = "#EF4444";
        public const string ActiveText = "#FFFFFF";
    }

    // ═══════════════════════════════════════════════════════════════════
    // UTILITY COLORS
    // ═══════════════════════════════════════════════════════════════════

    public const string FocusRing = "#4A90E2";
    public const string SelectionBg = "#162A44";
    public const string SelectionBorder = "#4A90E2";
    public const string Overlay = "#80000000";  // 50% black
    public const string DropShadow = "#40000000";  // 25% black
    public const string ScrollbarTrack = "#141820";
    public const string ScrollbarThumb = "#3B4459";
    public const string ScrollbarThumbHover = "#4A5568";
}
