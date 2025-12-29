import { svg, SVGTemplateResult } from 'lit';

/**
 * Renders a Lucide icon as a Lit SVG template
 * @param name - The name of the lucide icon (e.g., 'User', 'Users')
 * @param className - Optional CSS classes to apply to the icon
 * @returns A Lit SVGTemplateResult containing the icon
 */
export function renderIcon(name: string, className = ''): SVGTemplateResult {
  const iconClass = className || 'w-4 h-4';

  switch (name) {
    case 'User':
      return svg`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${iconClass}"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;

    case 'Users':
      return svg`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${iconClass}"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`;

    default:
      console.warn(`Icon "${name}" not found. Available icons: User, Users`);
      return svg``;
  }
}
