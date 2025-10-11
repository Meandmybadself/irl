/**
 * Updates the HTML document title with system name prefix
 * @param pageName - The name of the current page
 * @param systemName - The system name (optional)
 */
export const updateDocumentTitle = (pageName: string, systemName?: string | null): void => {
  const baseTitle = 'IRL - Community Directory';
  
  if (systemName) {
    document.title = `${systemName} - ${pageName}`;
  } else {
    document.title = baseTitle;
  }
};

/**
 * Gets the page name from the current route
 * @param pathname - The current pathname
 * @returns The page name
 */
export const getPageNameFromPath = (pathname: string): string => {
  switch (pathname) {
    case '/':
    case '/login':
      return 'Login';
    case '/register':
      return 'Sign Up';
    case '/verify-email':
      return 'Verify Email';
    case '/home':
      return 'Home';
    case '/admin/system':
      return 'System Admin';
    default:
      return 'Page';
  }
};
