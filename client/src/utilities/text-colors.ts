/**
 * Standardized text color utilities for consistent theming across the application
 * 
 * These utilities provide consistent text colors that work well in both light and dark modes.
 * They follow a semantic naming convention based on text hierarchy and purpose.
 */

export const textColors = {
  // Primary text - main content text
  primary: 'text-gray-900 dark:text-white',
  
  // Secondary text - supporting content, descriptions
  secondary: 'text-gray-700 dark:text-gray-300',
  
  // Tertiary text - less important content, metadata
  tertiary: 'text-gray-500 dark:text-gray-400',
  
  // Muted text - disabled or placeholder text
  muted: 'text-gray-400 dark:text-gray-500',
  
  // Error text
  error: 'text-red-600 dark:text-red-400',
  
  // Success text
  success: 'text-green-600 dark:text-green-400',
  
  // Warning text
  warning: 'text-yellow-600 dark:text-yellow-400',
  
  // Info text
  info: 'text-blue-600 dark:text-blue-400',
  
  // Link text
  link: 'text-indigo-600 dark:text-indigo-400',
  
  // Link hover text
  linkHover: 'hover:text-indigo-500 dark:hover:text-indigo-300',
  
  // White text (for dark backgrounds)
  white: 'text-white',
  
  // Inverse text (white in light mode, dark in dark mode)
  inverse: 'text-white dark:text-gray-900'
} as const;

/**
 * Get text color classes for a specific semantic purpose
 */
export const getTextColor = (purpose: keyof typeof textColors): string => {
  return textColors[purpose];
};

/**
 * Background color utilities for consistent theming
 */
export const backgroundColors = {
  // Page backgrounds
  page: 'bg-white dark:bg-gray-900',
  pageAlt: 'bg-gray-50 dark:bg-gray-950',
  
  // Content backgrounds
  content: 'bg-white dark:bg-gray-800',
  contentHover: 'hover:bg-gray-50 dark:hover:bg-gray-700',
  
  // Overlay backgrounds
  overlay: 'bg-white/75 dark:bg-gray-900/70',
  
  // Border colors
  border: 'border-gray-200 dark:border-gray-700',
  borderStrong: 'border-gray-300 dark:border-white/15',
  
  // Divider colors
  divide: 'divide-gray-200 dark:divide-white/10',
  divideStrong: 'divide-gray-300 dark:divide-white/15',

  // Badge/status backgrounds
  badgePublic: 'bg-green-100 dark:bg-green-500/20',
  badgePrivate: 'bg-gray-100 dark:bg-gray-800/60'
} as const;

/**
 * Common text color combinations for different UI elements
 */
export const textStyles = {
  // Headings
  heading: {
    h1: `text-3xl font-bold ${textColors.primary}`,
    h2: `text-2xl font-semibold ${textColors.primary}`,
    h3: `text-xl font-semibold ${textColors.primary}`,
    h4: `text-lg font-medium ${textColors.primary}`,
    h5: `text-base font-medium ${textColors.primary}`,
    h6: `text-sm font-medium ${textColors.primary}`
  },
  
  // Body text
  body: {
    large: `text-lg ${textColors.secondary}`,
    base: `text-base ${textColors.secondary}`,
    small: `text-sm ${textColors.secondary}`,
    xs: `text-xs ${textColors.secondary}`
  },
  
  // Labels and form elements
  label: `text-sm font-medium ${textColors.secondary}`,
  input: `text-base ${textColors.primary}`,
  placeholder: `placeholder:${textColors.muted}`,
  
  // Table text
  table: {
    header: `text-sm font-semibold ${textColors.primary}`,
    cell: `text-sm ${textColors.secondary}`,
    cellPrimary: `text-sm font-medium ${textColors.primary}`,
    cellSecondary: `text-sm ${textColors.tertiary}`
  },
  
  // Button text
  button: {
    primary: 'text-white',
    secondary: 'text-white',
    outline: `${textColors.link}`,
    ghost: `${textColors.secondary}`
  },
  
  // Status indicators
  status: {
    success: `${textColors.success}`,
    error: `${textColors.error}`,
    warning: `${textColors.warning}`,
    info: `${textColors.info}`,
    public: 'text-green-700 dark:text-green-400',
    private: `${textColors.secondary}`
  }
} as const;
