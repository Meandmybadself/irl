# TODO List

## Completed

### 2025-10-26: Read-Only Directory Views Feature
- ✅ Created feature branch `feature/read-only-views`
- ✅ Added backend API endpoints for querying person-groups by person and by group
  - `GET /api/person-groups/by-person/:displayId` - Returns all groups for a person with admin flags
  - `GET /api/person-groups/by-group/:displayId` - Returns all members for a group with admin flags
- ✅ Updated API client with new methods:
  - `getPersonGroupsByPerson(displayId)`
  - `getPersonGroupsByGroup(displayId)`
- ✅ Created reusable UI components:
  - `contact-info-display` - Read-only display of contact information with privacy awareness
  - `person-list` - Reusable person list component with admin badges and click handling
  - `group-list` - Reusable group list component with admin badges and click handling
- ✅ Created new detail pages:
  - `person-detail-page` - View person profile, contact info, and group memberships
  - `group-detail-page` - View group details, contact info, and member list
- ✅ Refactored existing pages to use new reusable components:
  - Updated `persons-page` to use `person-list` component
  - Updated `groups-page` to use `group-list` component
- ✅ Added new routes to router:
  - `/persons/:id` - Person detail view
  - `/groups/:id` - Group detail view
- ✅ Build verification passed

**Key Features Added:**
- Click-through navigation from list pages to detail pages
- Read-only views for persons and groups showing complete information
- Privacy-aware contact information display
- Admin badges on group memberships
- Breadcrumb navigation
- Permission-based edit button visibility
- Reusable list components for consistent UI across the application

## In Progress

_No tasks currently in progress_

## Upcoming / Future Tasks

- [ ] Add endpoint to get group by numeric ID (for parent group display)
- [ ] Add tests for new API endpoints
- [ ] Add tests for new UI components
- [ ] Consider adding activity/audit logs to detail pages
- [ ] Add ability to export contact information
- [ ] Add search/filter functionality to detail page member/group lists
