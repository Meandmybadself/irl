# Data Import Files

This folder contains TSV (Tab-Separated Values) files for bulk importing data into the IRL application.

## Group Import Files

### `eisenhower-groups.tsv`

Contains the group structure for Eisenhower Elementary School:

**Hierarchy:**
```
eisenhower (must exist already)
├── Classrooms
│   ├── Pre-K
│   ├── Kindergarten
│   ├── Grade 1
│   ├── Grade 2
│   ├── Grade 3
│   ├── Grade 4
│   └── Grade 5
├── Staff
└── Households
```

**Import Instructions:**

⚠️ **Important:** Parent groups must exist in the database before importing their children.

**Option 1: Import in Two Batches**

1. First, import rows 2-4 (Classrooms, Staff, Households)
2. Then, import rows 5-11 (Pre-K through Grade 5)

**Option 2: Ensure eisenhower and classrooms exist first**

If the `eisenhower` group already exists, you can import all rows at once, but you must import in the order shown (Classrooms before its child grades).

**How to Import:**

1. Navigate to the Groups page (`/groups`)
2. Click "Bulk Import"
3. Copy and paste the desired rows from the TSV file
4. Click "Parse Data" to preview
5. Click "Import X group(s)" to complete the import

**TSV Format:**
- Column 1: `name` - Display name of the group
- Column 2: `displayId` - Unique identifier (URL-friendly)
- Column 3: `description` - Optional description
- Column 4: `publiclyVisible` - `true` or `false`
- Column 5: `allowsAnyUserToCreateSubgroup` - `true` or `false`
- Column 6: `parentGroupDisplayId` - Display ID of parent group (or empty for root groups)

Additional columns can be added for contact information (contactType, contactLabel, contactValue, contactPrivacy).


