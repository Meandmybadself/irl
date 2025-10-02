# Product Requirements Document: IRL Directory Service UI

## 1. Overview

### 1.1 Product Name
IRL (subject to change)

### 1.2 Purpose
IRL is a web-based directory service UI that provides contact information management for people within organized systems such as sports leagues, schools, churches, and neighborhoods.

### 1.3 Target Users
- Organization administrators
- Group coordinators (coaches, teachers, team leaders)
- Members of organizations who need to access contact information

## 2. Product Goals

### 2.1 Primary Objectives
- Provide intuitive interface for managing organizational contact directories
- Enable secure authentication and authorization
- Support flexible group-based organization structures
- Deliver responsive experience across all device types

### 2.2 Success Metrics
- User registration and email verification completion rate
- Time to complete common tasks (adding contacts, creating groups)
- Mobile vs desktop usage patterns
- User retention after initial registration

## 3. Technical Architecture

### 3.1 Frontend Stack
- **Framework**: Lit web components
- **Routing**: lit-labs/router with urlpattern-polyfill
- **State Management**: Redux with normalizr for data normalization and reselect for derived state
- **Styling**: Tailwind CSS
- **Context**: lit/context for dependency injection
- **Application Type**: Single Page Application (SPA)

### 3.2 Backend Integration
- Dedicated API service (pre-existing)
- API client library (pre-existing)
- Cookie-based authentication (transparent to UI)

### 3.3 Responsive Design
- Mobile-first approach
- Breakpoints aligned with Tailwind defaults
- Touch-friendly interface elements

## 4. Data Models

### 4.1 Common Properties
All models include:
- `createdAt`: timestamp
- `updatedAt`: timestamp
- Soft delete flags (no hard deletion from database)

### 4.2 Core Models

#### ContactInformation
- **Relationship**: Many-to-one via mapping table
- **Associations**: Can be attached to System, Person, or Group entities
- **Fields**: (defined by existing API)

#### User
- **Purpose**: Authentication credentials
- **Relationship**: One-to-one with Person
- **Fields**: (defined by existing API)

#### Person
- **Purpose**: Represents actual human in organization
- **Required**: Must have associated User for authentication
- **Relationships**:
  - One User (required)
  - Many ContactInformation entities
  - Many Groups via mapping table
- **Group Mapping Properties**:
  - `relation`: defines relationship type (Parent, Teacher, Coach, etc.)
  - `admin`: boolean indicating group admin status
- **Special Features**:
  - Transferable between Users
  - Can be claimed by actual person after initial creation by group admin

#### System
- **Purpose**: Root organization entity
- **Cardinality**: One per organization
- **Relationships**: Many ContactInformation entities
- **Fields**: Organization-level details

#### Group
- **Purpose**: Collection of Persons for organizational purposes
- **Relationships**: 
  - Many Persons via mapping table
  - Many ContactInformation entities
- **Use Cases**: Teams, classes, committees, departments

## 5. Authentication Flow

### 5.1 Registration Process
1. User submits registration form
2. System creates User and Person records
3. Verification email sent
4. User directed to "verify your email" page
5. User clicks verification link in email
6. Email verified and user automatically logged in
7. User redirected to home page

### 5.2 Login Process
1. User submits credentials
2. API validates and sets authentication cookie
3. User redirected to originally requested page (or home if none)

### 5.3 Session Management
- Cookie-based authentication (transparent to UI)
- On initial page load, UI requests user details from API
- If API returns 401, user is not authenticated
- Unauthenticated users redirected to login page
- Original destination URL persisted for post-login redirect

### 5.4 Authorization
- Group admin status determined by Person-Group mapping
- Permissions enforced by API (UI respects API responses)

## 6. Initial Feature Set

### 6.1 Phase 1 Pages

#### Register Page
**Route**: `/register`
**Purpose**: New user account creation
**Components**:
- Registration form
  - Email address (required)
  - Password (required, with strength indicator)
  - First name (required)
  - Last name (required)
  - Organization code/invite (if required)
- Form validation
- Error messaging
- Link to login page

**Success Flow**:
- Form submission
- Account creation
- Redirect to email verification pending page

#### Email Verification Pending Page
**Route**: `/verify-email`
**Purpose**: Inform user to check email
**Components**:
- Instructional message
- Email address display
- Resend verification email button
- Support contact information

#### Sign In / Log In Page
**Route**: `/login`
**Purpose**: Existing user authentication
**Components**:
- Login form
  - Email address
  - Password
  - "Remember me" option
- "Forgot password" link
- Link to registration page
- Error messaging for failed attempts

**Success Flow**:
- Credentials validated
- Cookie set by API
- Redirect to original destination or home

#### Home Page
**Route**: `/` or `/home`
**Purpose**: Primary landing page after authentication
**Components**:
- Welcome message with user name
- Quick access to:
  - My groups
  - My contact information
  - Directory search
- Recent activity feed (future enhancement)
- Navigation to main sections

### 6.2 Common UI Components

#### Navigation
- Top navigation bar with:
  - IRL logo/branding
  - Main navigation links
  - User profile menu
  - Logout option
- Mobile hamburger menu
- Active route indication

#### Layout
- Responsive container
- Consistent padding/margins
- Loading states
- Error boundaries

## 7. State Management

### 7.1 Redux Store Structure
```
{
  entities: {
    users: { [id]: User },
    persons: { [id]: Person },
    groups: { [id]: Group },
    contactInformation: { [id]: ContactInformation },
    system: System
  },
  auth: {
    currentUserId: string | null,
    currentPersonId: string | null,
    isAuthenticated: boolean,
    isLoading: boolean
  },
  ui: {
    modals: {},
    notifications: [],
    routing: {
      previousPath: string | null
    }
  }
}
```

### 7.2 Data Normalization
- Use normalizr to flatten nested API responses
- Store entities by ID in respective slices
- Use reselect for computed/derived state

### 7.3 Context Providers
- Redux store provider (top-level)
- API client provider
- Theme/styling context (if needed)
- Common utilities context

## 8. Routing Strategy

### 8.1 Public Routes
- `/register`
- `/login`
- `/verify-email`
- `/forgot-password` (future)

### 8.2 Protected Routes
- `/` or `/home`
- `/profile`
- `/groups`
- `/directory`
- All other authenticated pages

### 8.3 Route Guards
- Check authentication status before rendering protected routes
- Store attempted destination for post-login redirect
- Redirect unauthenticated users to `/login`

## 9. User Experience Considerations

### 9.1 Loading States
- Skeleton screens for content loading
- Spinner for action processing
- Progress indicators for multi-step processes

### 9.2 Error Handling
- Inline form validation
- Toast notifications for actions
- Error boundaries for component failures
- Graceful degradation for API failures

### 9.3 Accessibility
- Semantic HTML
- ARIA labels where needed
- Keyboard navigation support
- Focus management
- Color contrast compliance

### 9.4 Performance
- Code splitting by route
- Lazy loading for non-critical components
- Optimistic UI updates where appropriate
- API response caching

## 10. Future Considerations

### 10.1 Planned Features (Post-Phase 1)
- Group management interface
- Contact directory with search/filter
- Person profile pages
- Contact information CRUD
- Person claim/transfer workflow
- Group admin dashboard
- System settings (for system admins)

### 10.2 Technical Enhancements
- Offline support with service workers
- Push notifications
- Real-time updates via WebSocket
- Advanced search with filters
- Bulk operations
- Export functionality

## 11. Open Questions

1. What is the onboarding flow for organization creation?
2. How are organization codes/invites generated and validated?
3. What contact information fields are supported?
4. Are there any special privacy controls for contact visibility?
5. What are the specific admin capabilities at each level (System, Group)?
6. Is there a password reset flow requirement for Phase 1?
7. What branding/theming customization is needed?
8. Are there any compliance requirements (GDPR, COPPA, etc.)?

## 12. Success Criteria

### 12.1 Phase 1 Completion
- All four pages functional (Register, Verify Email, Login, Home)
- Authentication flow working end-to-end
- Responsive design validated on mobile and desktop
- Protected routes properly guarded
- Session persistence working
- Error states handled gracefully

### 12.2 Quality Standards
- Zero critical bugs in authentication flow
- <2s page load time on 3G connection
- 100% pass rate on accessibility audit
- Cross-browser compatibility (Chrome, Firefox, Safari, Edge)

## Existing Folder Structure

### Client
Client is located in the `client` folder.

#### API Client
API client is located in the `client/src/services/api-client.ts` file.

### Service
Service is located in the `service` folder.  You can find all associated endpoints in this folder.

### Shared
Shared is located in the `shared` folder.  It contains all types associated with the API, as well as any other types.