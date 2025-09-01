# Jordan Cities Database Update

This folder contains scripts to replace all existing cities in your database with Jordan cities (governorates and major cities).

## ⚠️ Important Warning

**These scripts will delete ALL existing cities from your database.** Make sure to backup your database before running any of these scripts.

## Scripts Available

### 1. `update-jordan-cities.js` (Basic Script)
- Replaces all cities with Jordan cities
- No backup functionality
- Use only if you're sure you don't need existing data

**Usage:**
```bash
cd backend-api/scripts
node update-jordan-cities.js
```

### 2. `safe-update-jordan-cities.js` (Recommended)
- Creates automatic backup before making changes
- Generates restore script for emergency rollback
- Safer option for production environments

**Usage:**
```bash
cd backend-api/scripts
node safe-update-jordan-cities.js
```

### 3. `update-jordan-cities.sql` (Direct SQL)
- Pure SQL script for direct database execution
- Can be run in MySQL Workbench or command line
- No backup functionality

**Usage:**
```bash
mysql -u username -p database_name < update-jordan-cities.sql
```

## What Cities Are Included

The scripts include **52 Jordan cities** covering all governorates:

### Major Governorates:
- **Amman** (عمان) - 8 cities including Wadi as-Seer, Russeifa, Na'ur
- **Zarqa** (الزرقاء) - 4 cities including Al Hashimiyyah, Al Azraq
- **Irbid** (إربد) - 14 cities including Ramtha, Al Husn, Bani Kinanah
- **Balqa** (البلقاء) - 8 cities including As-Salt, Fuheis, Ain al Basha
- **Karak** (الكرك) - 6 cities including Al Mazar al Janubi, Ar Rabbah
- **Ma'an** (معان) - 4 cities including Wadi Musa, Ash Shawbak
- **Aqaba** (العقبة)
- **Mafraq** (المفرق) - including Zaatari
- **Jerash** (جرش) - including Dibbin
- **Ajloun** (عجلون) - including Barma, Kufranjah
- **Madaba** (مادبا)
- **Tafilah** (الطفيلة)

### Special Areas:
- Northern, Central, and Southern Jordan Valley regions

## After Running the Scripts

### 1. Verify the Update
Check that cities were inserted correctly:
```sql
SELECT COUNT(*) FROM cities;
SELECT * FROM cities ORDER BY title_en LIMIT 10;
```

### 2. Update Related Data
If you had existing areas or addresses linked to cities, you'll need to update them:

```sql
-- Check for orphaned areas
SELECT COUNT(*) FROM areas WHERE city_id NOT IN (SELECT id FROM cities);

-- Check for orphaned addresses
SELECT COUNT(*) FROM addresses WHERE city_id NOT IN (SELECT id FROM cities);
```

### 3. Test Your Application
- Check city dropdowns in forms
- Verify address creation works
- Test order placement with delivery addresses
- Ensure delivery fee calculation works

## Rollback Instructions

### If using safe-update-jordan-cities.js:
The script creates a restore script automatically. Run:
```bash
node backups/restore_cities_backup_YYYY-MM-DDTHH-MM-SS.js
```

### Manual rollback:
If you have a manual backup, restore using:
```bash
mysql -u username -p database_name < your_backup_file.sql
```

## Troubleshooting

### Foreign Key Constraint Errors
If you get foreign key errors, there might be references to city IDs in other tables:
```sql
-- Find all foreign key references
SELECT 
  TABLE_NAME,
  COLUMN_NAME,
  CONSTRAINT_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE REFERENCED_TABLE_NAME = 'cities';
```

### Delivery Fee Issues
After updating cities, you might need to:
1. Update areas with appropriate delivery fees
2. Run migration 010 to set up shipping zones
3. Test delivery fee calculation

## Support

If you encounter any issues:
1. Check the console output for error messages
2. Verify your database connection
3. Ensure you have sufficient permissions
4. Check that all required tables exist

## Files Created

After running the safe update script, you'll find:
- `backups/cities_backup_YYYY-MM-DDTHH-MM-SS.json` - Data backup
- `backups/restore_cities_backup_YYYY-MM-DDTHH-MM-SS.js` - Restore script

Keep these files safe until you're certain the update was successful!
