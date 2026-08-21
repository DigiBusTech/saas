/**
 * Design Tokens & Theme Configuration
 * Modern, spacious design system with fluid typography and elevated surfaces
 */

export const DesignTokens = {
  // === SPACING (8px base unit) ===
  spacing: {
    xs: '0.25rem', // 4px
    sm: '0.5rem',  // 8px
    md: '1rem',    // 16px
    lg: '1.5rem',  // 24px
    xl: '2rem',    // 32px
    '2xl': '3rem', // 48px
    '3xl': '4rem', // 64px
  },

  // === TYPOGRAPHY ===
  typography: {
    // Headings
    h1: 'text-4xl md:text-5xl font-bold tracking-tight leading-tight',
    h2: 'text-3xl md:text-4xl font-bold tracking-tight leading-snug',
    h3: 'text-2xl md:text-3xl font-semibold tracking-tight leading-snug',
    h4: 'text-xl md:text-2xl font-semibold tracking-tight leading-snug',
    h5: 'text-lg md:text-xl font-semibold tracking-tight',
    h6: 'text-base md:text-lg font-semibold tracking-tight',

    // Body text
    body: 'text-base leading-relaxed',
    bodyLarge: 'text-lg leading-relaxed',
    bodySmall: 'text-sm leading-relaxed',
    bodySm: 'text-xs leading-relaxed text-gray-500 dark:text-gray-400',

    // Captions & labels
    caption: 'text-xs font-medium uppercase tracking-wider',
    label: 'text-sm font-medium',
    labelSm: 'text-xs font-medium',

    // Code
    code: 'text-xs font-mono bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded',
  },

  // === COLORS - LIGHT MODE ===
  colorsLight: {
    // Backgrounds
    bgPrimary: 'bg-white',
    bgSecondary: 'bg-slate-50',
    bgTertiary: 'bg-slate-100',
    bgInverted: 'bg-slate-900',

    // Surfaces
    surface: 'bg-white',
    surfaceElevated: 'bg-slate-50 border border-slate-200',
    surfaceGlass: 'bg-white/50 backdrop-blur-md border border-white/20',

    // Text
    textPrimary: 'text-slate-900',
    textSecondary: 'text-slate-700',
    textTertiary: 'text-slate-500',
    textInverted: 'text-white',

    // Accents
    accentCyan: 'text-cyan-600',
    accentBlue: 'text-blue-600',
    accentIndigo: 'text-indigo-600',
    accentRose: 'text-rose-600',
    accentGreen: 'text-emerald-600',

    // Borders
    borderPrimary: 'border-slate-200',
    borderSecondary: 'border-slate-300',
    borderAccent: 'border-cyan-200',
  },

  // === COLORS - DARK MODE ===
  colorsDark: {
    // Backgrounds
    bgPrimary: 'dark:bg-slate-950',
    bgSecondary: 'dark:bg-slate-900',
    bgTertiary: 'dark:bg-slate-800',
    bgInverted: 'dark:bg-white',

    // Surfaces
    surface: 'dark:bg-slate-900',
    surfaceElevated: 'dark:bg-slate-800 dark:border dark:border-slate-700',
    surfaceGlass: 'dark:bg-slate-900/50 dark:backdrop-blur-md dark:border dark:border-white/10',

    // Text
    textPrimary: 'dark:text-white',
    textSecondary: 'dark:text-slate-200',
    textTertiary: 'dark:text-slate-400',
    textInverted: 'dark:text-slate-900',

    // Accents
    accentCyan: 'dark:text-cyan-400',
    accentBlue: 'dark:text-blue-400',
    accentIndigo: 'dark:text-indigo-400',
    accentRose: 'dark:text-rose-400',
    accentGreen: 'dark:text-emerald-400',

    // Borders
    borderPrimary: 'dark:border-slate-700',
    borderSecondary: 'dark:border-slate-600',
    borderAccent: 'dark:border-cyan-500/20',
  },

  // === COMPONENTS ===
  components: {
    button: {
      primary: 'px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-cyan-600/30 hover:scale-105',
      secondary: 'px-4 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-medium transition-all duration-200',
      ghost: 'px-4 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-all duration-200',
      danger: 'px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium transition-all duration-200',
    },

    input: 'w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200',

    card: 'p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm hover:shadow-md transition-all duration-200',

    badge: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-200/50 dark:border-cyan-500/30',

    tooltip: 'px-2 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs rounded-lg shadow-lg',
  },

  // === BREAKPOINTS (Mobile-First) ===
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // === ANIMATIONS & TRANSITIONS ===
  animations: {
    fadeIn: 'animate-fade-in',
    slideUp: 'animate-slide-up',
    slideDown: 'animate-slide-down',
    slideLeft: 'animate-slide-left',
    slideRight: 'animate-slide-right',
    pulse: 'animate-pulse',
    bounce: 'animate-bounce',
    spin: 'animate-spin',
  },

  // === SHADOWS ===
  shadows: {
    xs: 'shadow-sm',
    sm: 'shadow-md',
    md: 'shadow-lg',
    lg: 'shadow-xl',
    xl: 'shadow-2xl',
    elevate: 'shadow-2xl shadow-black/20 dark:shadow-black/50',
  },

  // === BORDER RADIUS ===
  radius: {
    sm: 'rounded',
    md: 'rounded-lg',
    lg: 'rounded-xl',
    xl: 'rounded-2xl',
    full: 'rounded-full',
  },

  // === MOTION (Framer Motion) ===
  motionConfig: {
    // Transition presets
    transition: {
      fast: { duration: 0.2 },
      normal: { duration: 0.3 },
      slow: { duration: 0.5 },
    },

    // Variant presets
    variants: {
      fadeIn: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      },
      slideUpFadeIn: {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 20 },
      },
      slideDownFadeIn: {
        initial: { opacity: 0, y: -20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 },
      },
      scaleIn: {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.95 },
      },
      springBounce: {
        animate: {
          transition: {
            type: 'spring',
            stiffness: 200,
            damping: 15,
          },
        },
      },
    },
  },
};

/**
 * CSS Animation Keyframes to add to tailwind.config.ts:
 *
 * keyframes: {
 *   fadeIn: {
 *     '0%': { opacity: '0' },
 *     '100%': { opacity: '1' },
 *   },
 *   slideUp: {
 *     '0%': { opacity: '0', transform: 'translateY(20px)' },
 *     '100%': { opacity: '1', transform: 'translateY(0)' },
 *   },
 *   slideDown: {
 *     '0%': { opacity: '0', transform: 'translateY(-20px)' },
 *     '100%': { opacity: '1', transform: 'translateY(0)' },
 *   },
 *   slideLeft: {
 *     '0%': { opacity: '0', transform: 'translateX(20px)' },
 *     '100%': { opacity: '1', transform: 'translateX(0)' },
 *   },
 *   slideRight: {
 *     '0%': { opacity: '0', transform: 'translateX(-20px)' },
 *     '100%': { opacity: '1', transform: 'translateX(0)' },
 *   },
 * },
 * animation: {
 *   fadeIn: 'fadeIn 0.3s ease-in',
 *   slideUp: 'slideUp 0.3s ease-out',
 *   slideDown: 'slideDown 0.3s ease-out',
 *   slideLeft: 'slideLeft 0.3s ease-out',
 *   slideRight: 'slideRight 0.3s ease-out',
 * },
 */
