# Delivery Fee Calculation Testing

This folder contains test scripts to verify the delivery fee calculation system is working correctly with real Jordan locations.

## Test Scripts

### 1. `test-delivery-fee-quick.js` - Quick Test ⚡
**Recommended for quick verification**

Simple test that checks delivery fees for common Jordan locations.

```bash
node test-delivery-fee-quick.js
```

**What it tests:**
- ✅ 8 real locations across Jordan (Amman, Zarqa, Irbid, Aqaba, etc.)
- ✅ Distance calculation accuracy
- ✅ Zone assignment correctness
- ✅ Fee calculation (base + distance)
- ✅ Free shipping thresholds
- ✅ Different order amounts scenario

**Output includes:**
- Distance from branch to destination
- Shipping zone assigned
- Breakdown of delivery fee (base + distance)
- Total delivery cost
- Free shipping status

---

### 2. `test-delivery-fee-real-locations.js` - Comprehensive Test 📊
**For detailed analysis and reporting**

Extensive test with 16 real Jordan locations and multiple order amounts.

```bash
node test-delivery-fee-real-locations.js
```

**What it tests:**
- ✅ 16 destinations across all zones
- ✅ Multiple order amounts (0-250 JOD)
- ✅ Free shipping threshold validation
- ✅ Nearest branch detection
- ✅ Zone prediction accuracy
- ✅ Statistical analysis

**Locations tested:**
- **Within City (0-5km):** Downtown, Abdoun, Marka
- **City Outskirts (5-15km):** Sweileh, Wadi Saqra, Sahab
- **Regional (15-30km):** Zarqa, Madaba, Salt
- **Extended (30-50km):** Jerash, Irbid, Mafraq, Karak
- **Remote (50+km):** Aqaba, Ma'an

**Output includes:**
- Detailed fee breakdown per location
- Free shipping threshold analysis
- Zone distribution statistics
- Fee range analysis (min/max/average)
- Distance vs Fee correlation
- Accuracy metrics and mismatches report

---

## Prerequisites

Before running the tests:

1. **Database must be running**
   ```bash
   # Make sure MySQL is running
   ```

2. **Branches must have coordinates**
   ```sql
   -- Check if branches have coordinates
   SELECT id, title_en, latitude, longitude 
   FROM branches 
   WHERE is_active = 1;
   ```

3. **Shipping zones must be configured**
   ```sql
   -- Check shipping zones
   SELECT * FROM shipping_zones WHERE is_active = 1;
   ```

---

## Understanding the Output

### Distance Calculation
```
Distance: 12.34 km → 12.34 km (effective)
```
- First number: Direct distance (Haversine formula)
- Second number: Effective distance used for pricing (may be clamped to max 100km)

### Zone Assignment
```
✅ Zone: City Outskirts (Expected: City Outskirts)
⚠️  Zone: Regional Area (Expected: City Outskirts)
```
- ✅ = Zone matches expectation
- ⚠️ = Zone different than expected (review distance ranges)

### Fee Breakdown
```
💰 Delivery Fee: 6.50 JOD
   └─ Base: 3.50 JOD + Distance: 3.00 JOD
```
- Base: Zone's base price
- Distance: Distance × price_per_km for the zone

### Free Shipping
```
🎁 FREE SHIPPING (Threshold: 75 JOD)
```
- Indicates order amount exceeded the free shipping threshold

---

## Example Output

```bash
🚚 DELIVERY FEE CALCULATION TEST
======================================================================

📍 Testing from: Amman Main Branch
   Branch Location: 31.9539, 35.9106

──────────────────────────────────────────────────────────────────────

📦 Jabal Al Hussein (Amman)
   Distance: 1.23 km
   Zone: Within City
   Base Fee: 2.00 JOD
   Distance Fee: 0.62 JOD
   💰 Total Delivery: 2.62 JOD
   ℹ️  Free shipping at: 50 JOD
   ✨ With 200 JOD order: FREE DELIVERY!

📦 Irbid (Irbid)
   Distance: 72.45 km
   Zone: Extended Area
   Base Fee: 8.00 JOD
   Distance Fee: 90.56 JOD
   💰 Total Delivery: 98.56 JOD
   ℹ️  Free shipping at: 150 JOD
```

---

## Verification Checklist

After running tests, verify:

- [ ] **Distances are accurate** - Compare with Google Maps distances
- [ ] **Zones are correct** - Short distances = Within City, Far = Extended/Remote
- [ ] **Fees are reasonable** - Should increase with distance
- [ ] **Free shipping works** - High order amounts should have 0 JOD delivery
- [ ] **No errors** - All locations should calculate successfully

---

## Expected Fee Ranges

Based on default Jordan shipping zones:

| Zone | Distance | Base Fee | Per KM | Free Shipping Threshold |
|------|----------|----------|--------|------------------------|
| Within City | 0-5 km | 2.00 JOD | 0.50 JOD/km | 50 JOD |
| City Outskirts | 5-15 km | 3.50 JOD | 0.75 JOD/km | 75 JOD |
| Regional Area | 15-30 km | 5.00 JOD | 1.00 JOD/km | 100 JOD |
| Extended Area | 30-50 km | 8.00 JOD | 1.25 JOD/km | 150 JOD |
| Remote Areas | 50+ km | 12.00 JOD | 1.50 JOD/km | 200 JOD |

**Example Calculations:**
- 3 km away = 2.00 + (3 × 0.50) = **3.50 JOD**
- 10 km away = 3.50 + (10 × 0.75) = **11.00 JOD**
- 25 km away = 5.00 + (25 × 1.00) = **30.00 JOD**
- 45 km away = 8.00 + (45 × 1.25) = **64.25 JOD**

---

## Troubleshooting

### "No active branch found with coordinates"
**Solution:** Add coordinates to at least one branch
```sql
UPDATE branches 
SET latitude = 31.9539, longitude = 35.9106 
WHERE id = 1;
```

### "No active branches with coordinates found"
**Solution:** Make sure branches are active
```sql
UPDATE branches SET is_active = 1 WHERE id = 1;
```

### All fees showing as 0 JOD
**Solution:** Check shipping zones exist and are active
```sql
SELECT * FROM shipping_zones WHERE is_active = 1;
```

### Distances seem wrong
**Solution:** Verify branch coordinates are correct (use Google Maps to confirm)

---

## Integration with Application

These calculations are used in:
- `routes/orders.js` - Order creation and checkout
- `services/shippingService.js` - Core shipping logic
- Mobile app checkout flow
- Admin order management

---

## Notes

- Coordinates use decimal degrees (DD) format
- Distance calculated using Haversine formula
- Maximum delivery distance: 100 km (configurable)
- Free shipping automatically applied when order meets threshold
- System logs all calculations to `shipping_calculations` table

---

## Support

If tests fail or results seem incorrect:
1. Check database connection
2. Verify branch coordinates are set
3. Confirm shipping zones are active
4. Review `shipping_zones` table configuration
5. Check for any database errors in console output

---

**Created:** 2025-10-06
**Last Updated:** 2025-10-06
