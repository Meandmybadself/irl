-- Migration: Add Group Administrators
-- This migration adds documentation and handles any existing groups without administrators.
-- The PersonGroup table already has the isAdmin field, so no schema changes are needed.

-- Note: For existing groups, we don't automatically assign administrators because:
-- 1. We cannot reliably determine who created the group from the database
-- 2. Manually assigning admins could assign the wrong person
-- 3. System admins can always modify groups and manually assign administrators
-- 4. Going forward, all new groups will automatically have their creator assigned as admin

-- This is a no-op migration that serves as documentation of the feature addition
-- If you need to assign administrators to existing groups, do so manually via the API
-- or through a separate data migration script.
