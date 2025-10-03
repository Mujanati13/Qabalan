jest.mock('../config/database', () => ({
  executeQuery: jest.fn()
}));

const shippingService = require('../services/shippingService');
const { executeQuery } = require('../config/database');

describe('ShippingService delivery fee calculations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('clampDistance', () => {
    test('returns bounds for invalid or out-of-range distances', () => {
      expect(shippingService.clampDistance(-5)).toBe(0);
      expect(shippingService.clampDistance(Number.NaN)).toBe(0);
      expect(shippingService.clampDistance(12.75)).toBeCloseTo(12.75, 2);
      expect(shippingService.clampDistance(150)).toBe(shippingService.maxDeliveryDistance);
    });
  });

  describe('calculateShippingCost', () => {
    const zone = {
      id: 1,
      name_en: 'Urban Zone',
      name_ar: 'المنطقة الحضرية',
      base_price: 2.0,
      price_per_km: 0.5,
      free_shipping_threshold: 50
    };

    test('uses clamped distance and calculates per-km pricing', () => {
      const result = shippingService.calculateShippingCost(12.345, zone, 30);

      expect(result.distance_km).toBeCloseTo(12.35, 2);
      expect(result.distance_cost).toBeCloseTo(6.18, 2);
      expect(result.total_cost).toBeCloseTo(8.18, 2);
      expect(result.free_shipping_applied).toBe(false);
      expect(result.distance_basis).toBe('bounded_0-100_km');
      expect(result.order_amount).toBe(30);
    });

    test('applies free shipping threshold when order qualifies', () => {
      const result = shippingService.calculateShippingCost(12.345, zone, 55);

      expect(result.free_shipping_applied).toBe(true);
      expect(result.total_cost).toBe(0);
    });
  });

  describe('calculateShipping', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    test('reports raw vs effective distance and clamps pricing to maxDeliveryDistance', async () => {
      const branchRow = [{
        id: 7,
        title_en: 'Main Branch',
        title_ar: 'الفرع الرئيسي',
        latitude: 31.95,
        longitude: 35.9,
        address_en: 'Downtown',
        address_ar: 'وسط المدينة'
      }];

      const zoneRow = [{
        id: 3,
        name_en: 'Nationwide',
        name_ar: 'على مستوى المملكة',
        description_en: null,
        description_ar: null,
        base_price: 3,
        price_per_km: 0.4,
        free_shipping_threshold: null,
        min_distance_km: 0,
        max_distance_km: 999,
        custom_base_price: null,
        custom_price_per_km: null,
        custom_free_threshold: null
      }];

      executeQuery.mockResolvedValueOnce(branchRow); // branch lookup
      executeQuery.mockResolvedValueOnce(zoneRow); // zone lookup

      const distanceSpy = jest
        .spyOn(shippingService, 'calculateDistance')
        .mockReturnValue(150.789);

      const result = await shippingService.calculateShipping(31.5, 35.7, 7, 20);

      expect(distanceSpy).toHaveBeenCalledTimes(1);
      expect(result.raw_distance_km).toBeCloseTo(150.79, 2);
      expect(result.effective_distance_km).toBe(shippingService.maxDeliveryDistance);
      expect(result.distance_km).toBe(shippingService.maxDeliveryDistance);
      expect(result.distance_cost).toBeCloseTo(40, 2);
      expect(result.total_cost).toBeCloseTo(43, 2);
      expect(result.is_within_range).toBe(false);
      expect(result.max_delivery_distance).toBe(shippingService.maxDeliveryDistance);

      // Zone query should receive the clamped distance twice (min/max comparison)
      const zoneQueryCall = executeQuery.mock.calls[1];
      expect(zoneQueryCall[1][1]).toBe(shippingService.maxDeliveryDistance);
      expect(zoneQueryCall[1][2]).toBe(shippingService.maxDeliveryDistance);
    });
  });
});
