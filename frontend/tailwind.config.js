/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6366F1', // Vibrant Rounded Indigo
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },
        secondary: {
          DEFAULT: '#FB923C', // Sunny Orange - Action
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
        },
        success: {
          DEFAULT: '#34D399', // Mint Green
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#34D399',
          600: '#22C55E',
          700: '#16A34A',
          800: '#15803D',
          900: '#166534',
        },
        warning: {
          DEFAULT: '#FBBF24', // Warm Amber - Attention
          50: '#FEF9E7',
          100: '#FDF3CF',
          200: '#FBE79F',
          300: '#F9DB6F',
          400: '#F7CF3F',
          500: '#FBBF24',
          600: '#C9991D',
          700: '#977316',
          800: '#644C0E',
          900: '#322607',
        },
        accent: {
          lavender: '#A78BFA', // Lavender - Creativity
          coral: '#FF6B6B', // Coral - Playfulness
          mint: '#4ECDC4', // Mint - Freshness
          peach: '#FFB84D', // Peach - Warmth
        },
        text: {
          primary: '#1E293B', // Deep Slate
          secondary: '#64748B', // Medium Slate
          tertiary: '#94A3B8', // Light Slate
        },
      },
      spacing: {
        'section': '48px', // Primary separator spacing
      },
      fontFamily: {
        sans: ['Fredoka', 'Quicksand', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        'bento': '24px',
        'bento-lg': '32px',
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'frosted': '0 8px 30px rgba(0, 0, 0, 0.08)',
        'glow': '0 0 20px rgba(0, 102, 255, 0.25)',
        'glow-hover': '0 0 30px rgba(0, 102, 255, 0.4)',
        'glow-orange': '0 0 20px rgba(255, 107, 53, 0.3)',
        'glow-teal': '0 0 20px rgba(78, 205, 196, 0.3)',
        'elevation-1': '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
        'elevation-2': '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)',
        'elevation-3': '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'bounce-subtle': 'bounceSubtle 0.6s ease-in-out',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 102, 255, 0.25)' },
          '50%': { boxShadow: '0 0 30px rgba(0, 102, 255, 0.5)' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
    },
  },
  plugins: [],
}

