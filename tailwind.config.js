/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./src/renderer/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        // Brand colors (MQTTX-inspired gradient)
        brand: {
          blue: '#0066FF',
          teal: '#00D4AA'
        },
        // Surface color hierarchy
        surface: {
          DEFAULT: '#111827',
          elevated: '#1F2937',
          active: '#374151'
        },
        // Protocol-specific colors
        protocol: {
          modbus: '#14B8A6',
          mqtt: '#22C55E',
          opcua: '#8B5CF6'
        },
        // IIoT-specific status colors
        status: {
          connected: '#22c55e',
          connecting: '#eab308',
          disconnected: '#6b7280',
          error: '#ef4444'
        },
        alarm: {
          normal: '#22c55e',
          warning: '#eab308',
          critical: '#ef4444'
        }
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #0066FF 0%, #00D4AA 100%)',
        'gradient-brand-horizontal': 'linear-gradient(90deg, #0066FF 0%, #00D4AA 100%)'
      },
      boxShadow: {
        'brand': '0 4px 14px 0 rgba(0, 102, 255, 0.25)',
        'brand-lg': '0 8px 24px 0 rgba(0, 102, 255, 0.35)'
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      }
    }
  },
  plugins: []
}
