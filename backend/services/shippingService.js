const { executeQuery } = require('../config/database');

/**
 * Enhanced Shipping Service for Jordan
 * Calculates shipping costs based on distance from customer to branch with configurable tiers
 */
class ShippingService {
  constructor() {
    this.earthRadius = 6371; // Earth's radius in kilometers
    this.defaultShippingFee = 5.00;
    this.maxDeliveryDistance = 100; // km
    this.minEffectiveDistance = 0;
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * @param {number} lat1 - Latitude of point 1
   * @param {number} lon1 - Longitude of point 1  
   * @param {number} lat2 - Latitude of point 2
   * @param {number} lon2 - Longitude of point 2
   * @returns {number} Distance in kilometers
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) {
      throw new Error('Valid coordinates required for distance calculation');
    }

    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = this.earthRadius * c;
    
    return parseFloat(distance.toFixed(2));
  }

  /**
   * Convert degrees to radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Clamp delivery distance to operational pricing range
   * @param {number} distance - Raw calculated distance in kilometers
   * @returns {number} Distance constrained within service boundaries
   */
  clampDistance(distance) {
    if (typeof distance !== 'number' || Number.isNaN(distance)) {
      return this.minEffectiveDistance;
    }

    return Math.min(
      this.maxDeliveryDistance,
      Math.max(this.minEffectiveDistance, distance)
    );
  }

  /**
   * Find appropriate shipping zone based on distance
   * @param {number} distance - Distance in kilometers
   * @param {number} branchId - Branch ID for potential overrides
   * @returns {Object} Shipping zone with pricing details
   */
  async findShippingZone(distance, branchId = null) {
    try {
      // Get zones with potential branch overrides
      const query = `
        SELECT 
          sz.*,
          bsz.custom_base_price,
          bsz.custom_price_per_km,
          bsz.custom_free_threshold,
          bsz.is_active as branch_override_active
        FROM shipping_zones sz
        LEFT JOIN branch_shipping_zones bsz ON sz.id = bsz.zone_id 
          AND bsz.branch_id = ? AND bsz.is_active = 1
        WHERE sz.is_active = 1 
          AND sz.min_distance_km <= ? 
          AND sz.max_distance_km >= ?
        ORDER BY sz.sort_order ASC
        LIMIT 1
      `;

      const [zone] = await executeQuery(query, [branchId, distance, distance]);

      if (!zone) {
        // No zone found, use default/fallback
        return {
          id: null,
          name_en: 'Default Zone',
          name_ar: 'المنطقة الافتراضية',
          base_price: this.defaultShippingFee,
          price_per_km: 0,
          free_shipping_threshold: null,
          min_distance_km: 0,
          max_distance_km: 999
        };
      }

      // Apply branch overrides if available
      return {
        id: zone.id,
        name_en: zone.name_en,
        name_ar: zone.name_ar,
        description_en: zone.description_en,
        description_ar: zone.description_ar,
        base_price: zone.custom_base_price || zone.base_price,
        price_per_km: zone.custom_price_per_km || zone.price_per_km,
        free_shipping_threshold: zone.custom_free_threshold || zone.free_shipping_threshold,
        min_distance_km: zone.min_distance_km,
        max_distance_km: zone.max_distance_km
      };
    } catch (error) {
      console.error('Error finding shipping zone:', error);
      throw error;
    }
  }

  /**
   * Calculate shipping cost based on distance and zone pricing
   * @param {number} distance - Distance in kilometers
   * @param {Object} zone - Shipping zone object
   * @param {number} orderAmount - Order total for free shipping check
   * @returns {Object} Shipping calculation details
   */
  calculateShippingCost(distance, zone, orderAmount = 0) {
    const effectiveDistance = parseFloat((distance || 0).toFixed(2));
    const baseCost = parseFloat(zone.base_price) || 0;
    const perKmCost = parseFloat(zone.price_per_km) || 0;
    const freeThreshold = parseFloat(zone.free_shipping_threshold) || 0;

    // Calculate distance-based cost
    const distanceCost = effectiveDistance * perKmCost;
    let totalCost = baseCost + distanceCost;

    // Check for free shipping
    const freeShippingApplied = freeThreshold > 0 && orderAmount >= freeThreshold;
    if (freeShippingApplied) {
      totalCost = 0;
    }

    return {
      distance_km: effectiveDistance,
      zone_id: zone.id,
      zone_name_en: zone.name_en,
      zone_name_ar: zone.name_ar,
      base_cost: baseCost,
      distance_cost: distanceCost,
      total_cost: parseFloat(totalCost.toFixed(2)),
      free_shipping_applied: freeShippingApplied,
  free_shipping_threshold: freeThreshold,
  calculation_method: 'zone_based',
  distance_basis: `bounded_${this.minEffectiveDistance}-${this.maxDeliveryDistance}_km`,
      order_amount: parseFloat(orderAmount) || 0
    };
  }

  /**
   * Get nearest branch to customer coordinates
   * @param {number} customerLat - Customer latitude
   * @param {number} customerLon - Customer longitude
   * @returns {Object} Nearest branch with distance
   */
  async getNearestBranch(customerLat, customerLon) {
    try {
      const branches = await executeQuery(`
        SELECT 
          id, title_en, title_ar, latitude, longitude,
          address_en, address_ar, phone
        FROM branches 
        WHERE is_active = 1 
          AND latitude IS NOT NULL 
          AND longitude IS NOT NULL
      `);

      if (!branches.length) {
        throw new Error('No active branches with coordinates found');
      }

      let nearestBranch = null;
      let shortestDistance = Infinity;

      for (const branch of branches) {
        const distance = this.calculateDistance(
          customerLat, customerLon,
          branch.latitude, branch.longitude
        );

        if (distance < shortestDistance) {
          shortestDistance = distance;
          nearestBranch = {
            ...branch,
            distance_km: distance
          };
        }
      }

      return nearestBranch;
    } catch (error) {
      console.error('Error finding nearest branch:', error);
      throw error;
    }
  }

  /**
   * Calculate complete shipping for customer address and branch
   * @param {number} customerLat - Customer latitude
   * @param {number} customerLon - Customer longitude  
   * @param {number} branchId - Target branch ID
   * @param {number} orderAmount - Order total amount
   * @returns {Object} Complete shipping calculation
   */
  async calculateShipping(customerLat, customerLon, branchId, orderAmount = 0) {
    try {
      // Validate inputs
      if (!customerLat || !customerLon || !branchId) {
        throw new Error('Customer coordinates and branch ID are required');
      }

      // Get branch coordinates
      const [branch] = await executeQuery(`
        SELECT id, title_en, title_ar, latitude, longitude, address_en, address_ar
        FROM branches 
        WHERE id = ? AND is_active = 1
      `, [branchId]);

      if (!branch) {
        throw new Error('Branch not found or inactive');
      }

      if (!branch.latitude || !branch.longitude) {
        throw new Error('Branch coordinates not configured');
      }

      // Calculate raw distance
      const rawDistance = this.calculateDistance(
        customerLat, customerLon,
        branch.latitude, branch.longitude
      );

      // Clamp distance for pricing calculations
      const effectiveDistance = this.clampDistance(rawDistance);

  // Do not hard-fail on out-of-range distances; compute cost and flag

      // Find appropriate shipping zone
      const zone = await this.findShippingZone(effectiveDistance, branchId);

      // Calculate shipping cost
      const shippingCalculation = this.calculateShippingCost(effectiveDistance, zone, orderAmount);
      const roundedRawDistance = parseFloat(rawDistance.toFixed(2));

      // Return complete calculation
      return {
        branch: {
          id: branch.id,
          title_en: branch.title_en,
          title_ar: branch.title_ar,
          latitude: branch.latitude,
          longitude: branch.longitude,
          address_en: branch.address_en,
          address_ar: branch.address_ar
        },
        customer_coordinates: {
          latitude: customerLat,
          longitude: customerLon
        },
        raw_distance_km: roundedRawDistance,
        effective_distance_km: shippingCalculation.distance_km,
        ...shippingCalculation,
        is_within_range: roundedRawDistance <= this.maxDeliveryDistance,
        max_delivery_distance: this.maxDeliveryDistance
      };
    } catch (error) {
      console.error('Shipping calculation error:', error);
      throw error;
    }
  }

  /**
   * Log shipping calculation for analysis
   * @param {Object} calculation - Shipping calculation result
   * @param {number} orderId - Order ID (optional)
   */
  async logShippingCalculation(calculation, orderId = null) {
    try {
      await executeQuery(`
        INSERT INTO shipping_calculations (
          order_id, branch_id, customer_latitude, customer_longitude,
          calculated_distance_km, zone_id, base_cost, distance_cost,
          total_shipping_cost, order_amount, free_shipping_applied, calculation_method
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        orderId,
        calculation.branch.id,
        calculation.customer_coordinates.latitude,
        calculation.customer_coordinates.longitude,
        calculation.distance_km,
        calculation.zone_id,
        calculation.base_cost,
        calculation.distance_cost,
        calculation.total_cost,
        calculation.order_amount || 0,
        calculation.free_shipping_applied ? 1 : 0,
        calculation.calculation_method
      ]);
    } catch (error) {
      console.error('Error logging shipping calculation:', error);
      // Don't throw - logging shouldn't break the shipping calculation
    }
  }

  /**
   * Get all available shipping zones for admin management
   */
  async getAllZones() {
    try {
      return await executeQuery(`
        SELECT * FROM shipping_zones 
        WHERE is_active = 1 
        ORDER BY sort_order ASC, min_distance_km ASC
      `);
    } catch (error) {
      console.error('Error getting shipping zones:', error);
      throw error;
    }
  }

  /**
   * Get zone pricing for specific branch (including overrides)
   * @param {number} branchId - Branch ID
   */
  async getBranchZonePricing(branchId) {
    try {
      return await executeQuery(`
        SELECT 
          sz.*,
          bsz.custom_base_price,
          bsz.custom_price_per_km,
          bsz.custom_free_threshold,
          bsz.is_active as has_override
        FROM shipping_zones sz
        LEFT JOIN branch_shipping_zones bsz ON sz.id = bsz.zone_id 
          AND bsz.branch_id = ? AND bsz.is_active = 1
        WHERE sz.is_active = 1
        ORDER BY sz.sort_order ASC
      `, [branchId]);
    } catch (error) {
      console.error('Error getting branch zone pricing:', error);
      throw error;
    }
  }

  /**
   * Update customer address with calculated distance and zone
   * @param {number} addressId - Address ID
   * @param {number} distance - Calculated distance
   * @param {number} zoneId - Assigned zone ID
   */
  async updateAddressShippingInfo(addressId, distance, zoneId) {
    try {
      await executeQuery(`
        UPDATE user_addresses 
        SET calculated_distance_km = ?, shipping_zone_id = ?, updated_at = NOW()
        WHERE id = ?
      `, [distance, zoneId, addressId]);
    } catch (error) {
      console.error('Error updating address shipping info:', error);
      // Don't throw - this is supplementary information
    }
  }
}

module.exports = new ShippingService();
