import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
    darkMode: "class",
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
      fontFamily: {
        serif: ['var(--font-serif)', 'serif'],
        sans: ['var(--font-sans)', 'sans-serif'],
      },
  		colors: {
        brand: {
          navy: {
            950: 'var(--brand-navy-950)',
            900: 'var(--brand-navy-900)',
            800: 'var(--brand-navy-800)',
            700: 'var(--brand-navy-700)',
          },
          terracotta: {
            DEFAULT: 'var(--brand-terracotta)',
            hover: 'var(--brand-terracotta-hover)',
            tint: 'var(--brand-terracotta-tint)',
          },
          amber: {
            DEFAULT: 'var(--brand-amber)',
            tint: 'var(--brand-amber-tint)',
          },
          cream: {
            DEFAULT: 'var(--brand-cream)',
            card: 'var(--brand-cream-card)',
            border: 'var(--brand-cream-border)',
          }
        },
  			background: 'var(--background)',
  			foreground: 'var(--foreground)',
  			card: {
  				DEFAULT: 'var(--card)',
  				foreground: 'var(--card-foreground)'
  			},
  			popover: {
  				DEFAULT: 'var(--popover)',
  				foreground: 'var(--popover-foreground)'
  			},
  			primary: {
  				DEFAULT: 'var(--primary)',
  				foreground: 'var(--primary-foreground)'
  			},
  			secondary: {
  				DEFAULT: 'var(--secondary)',
  				foreground: 'var(--secondary-foreground)'
  			},
  			muted: {
  				DEFAULT: 'var(--muted)',
  				foreground: 'var(--muted-foreground)'
  			},
  			accent: {
  				DEFAULT: 'var(--accent)',
  				foreground: 'var(--accent-foreground)'
  			},
  			destructive: {
  				DEFAULT: 'var(--destructive)',
  				foreground: 'var(--destructive-foreground)'
  			},
  			border: 'var(--border)',
  			input: 'var(--input)',
  			ring: 'var(--ring)',
  			chart: {
  				'1': 'var(--chart-1)',
  				'2': 'var(--chart-2)',
  				'3': 'var(--chart-3)',
  				'4': 'var(--chart-4)',
  				'5': 'var(--chart-5)'
  			}
  		},
  		borderRadius: {
        brand: '14px',
        button: '8px',
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
      boxShadow: {
        editorial: 'var(--shadow-editorial)',
        activeCard: 'var(--shadow-activeCard)',
      }
  	}
  },
  plugins: [tailwindcssAnimate],
};
export default config;
