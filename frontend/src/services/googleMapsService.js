/**
 * Google Maps Integration Service for FECS
 * Provides accurate distance and duration calculations for delivery fee determination
 */

class GoogleMapsService {
  constructor() {
    this.apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
    this.service = null;
    this.isLoaded = false;
    this.loadPromise = null;
  }

  /**
   * Load Google Maps JavaScript API
   */
  async loadGoogleMaps() {
    if (this.isLoaded) {
      return Promise.resolve();
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = new Promise((resolve, reject) => {
      // Check if Google Maps is already loaded
      if (window.google && window.google.maps) {
        this.isLoaded = true;
        this.initializeService();
        resolve();
        return;
      }

      // Create script tag to load Google Maps API
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey}&libraries=geometry`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        this.isLoaded = true;
        this.initializeService();
        resolve();
      };

      script.onerror = () => {
        reject(new Error('Failed to load Google Maps API'));
      };

      document.head.appendChild(script);
    });

    return this.loadPromise;
  }

  /**
   * Initialize Distance Matrix service
   */
  initializeService() {
    if (window.google && window.google.maps) {
      this.service = new window.google.maps.DistanceMatrixService();
    }
  }

  /**
   * Calculate distance and duration between two locations using Google Maps Distance Matrix API
   * @param {Object} origin - Origin location {lat, lng} or address string
   * @param {Object} destination - Destination location {lat, lng} or address string
   * @param {string} travelMode - Travel mode (DRIVING, WALKING, TRANSIT, BICYCLING)
   * @returns {Promise<Object>} Distance and duration information
   */
  async calculateDistance(origin, destination, travelMode = 'DRIVING') {
    try {
      await this.loadGoogleMaps();

      if (!this.service) {
        throw new Error('Google Maps Distance Matrix service not available');
      }

      return new Promise((resolve, reject) => {
        this.service.getDistanceMatrix({
          origins: [origin],
          destinations: [destination],
          travelMode: window.google.maps.TravelMode[travelMode],
          unitSystem: window.google.maps.UnitSystem.METRIC,
          avoidHighways: false,
          avoidTolls: false
        }, (response, status) => {
          if (status === 'OK') {
            const result = response.rows[0].elements[0];
            
            if (result.status === 'OK') {
              resolve({
                success: true,
                distance: {
                  text: result.distance.text,
                  value: result.distance.value, // in meters
                  kilometers: (result.distance.value / 1000).toFixed(2)
                },
                duration: {
                  text: result.duration.text,
                  value: result.duration.value, // in seconds
                  minutes: Math.round(result.duration.value / 60)
                },
                traffic: result.duration_in_traffic || null
              });
            } else {
              reject(new Error(`Distance calculation failed: ${result.status}`));
            }
          } else {
            reject(new Error(`Google Maps API error: ${status}`));
          }
        });
      });
    } catch (error) {
      console.error('Google Maps distance calculation error:', error);
      throw error;
    }
  }

  /**
   * Calculate delivery fee based on Google Maps distance and shipping zones
   * @param {Object} branchLocation - Branch coordinates {lat, lng}
   * @param {Object} customerLocation - Customer coordinates {lat, lng} or address
   * @param {Array} shippingZones - Array of shipping zones with distance and fee rules
   * @param {number} orderAmount - Order amount for potential free shipping thresholds
   * @returns {Promise<Object>} Delivery fee calculation result
   */
  async calculateDeliveryFee(branchLocation, customerLocation, shippingZones = [], orderAmount = 0) {
    try {
      console.log('🗺️ Calculating delivery fee with Google Maps:', {
        branchLocation,
        customerLocation,
        orderAmount
      });

      // Calculate actual distance using Google Maps
      const distanceResult = await this.calculateDistance(branchLocation, customerLocation);
      
      const distanceKm = parseFloat(distanceResult.distance.kilometers);
      const durationMinutes = distanceResult.duration.minutes;

      console.log('📍 Google Maps distance result:', {
        distance: `${distanceKm} km`,
        duration: `${durationMinutes} minutes`,
        route: distanceResult.distance.text
      });

      // Find appropriate shipping zone based on distance
      let selectedZone = null;
      let deliveryFee = 5.00; // Default fallback fee

      if (shippingZones && shippingZones.length > 0) {
        // Sort zones by distance (ascending) to find the first matching zone
        const sortedZones = [...shippingZones].sort((a, b) => 
          parseFloat(a.max_distance || 0) - parseFloat(b.max_distance || 0)
        );

        selectedZone = sortedZones.find(zone => {
          const maxDistance = parseFloat(zone.max_distance || 0);
          const minDistance = parseFloat(zone.min_distance || 0);
          return distanceKm >= minDistance && distanceKm <= maxDistance;
        });

        if (selectedZone) {
          deliveryFee = parseFloat(selectedZone.base_fee || selectedZone.fee || 5.00);
          console.log('🎯 Found matching shipping zone:', {
            zoneName: selectedZone.name,
            distanceRange: `${selectedZone.min_distance || 0} - ${selectedZone.max_distance || '∞'} km`,
            baseFee: deliveryFee
          });
        } else {
          console.warn('⚠️ No shipping zone found for distance:', distanceKm);
          // Use distance-based calculation as fallback
          deliveryFee = this.calculateDistanceBasedFee(distanceKm);
        }
      } else {
        // No shipping zones defined, use distance-based calculation
        deliveryFee = this.calculateDistanceBasedFee(distanceKm);
      }

      // Check for free shipping thresholds
      if (selectedZone && selectedZone.free_shipping_threshold) {
        const threshold = parseFloat(selectedZone.free_shipping_threshold);
        if (orderAmount >= threshold) {
          console.log('🎉 Free shipping threshold met:', {
            orderAmount: `$${orderAmount}`,
            threshold: `$${threshold}`
          });
          deliveryFee = 0;
        }
      }

      // Add distance-based surcharge if very far
      if (distanceKm > 25) {
        const surcharge = Math.ceil((distanceKm - 25) / 5) * 1.00; // $1 per 5km over 25km
        deliveryFee += surcharge;
        console.log('📏 Distance surcharge applied:', {
          extraDistance: `${(distanceKm - 25).toFixed(2)} km`,
          surcharge: `$${surcharge.toFixed(2)}`
        });
      }

      return {
        success: true,
        googleMapsData: distanceResult,
        deliveryCalculation: {
          distance_km: distanceKm,
          duration_minutes: durationMinutes,
          route_text: distanceResult.distance.text,
          duration_text: distanceResult.duration.text,
          selected_zone: selectedZone,
          base_fee: parseFloat(selectedZone?.base_fee || selectedZone?.fee || deliveryFee),
          final_fee: deliveryFee,
          free_shipping_applied: deliveryFee === 0 && orderAmount > 0,
          calculation_method: 'google_maps_distance',
          calculated_at: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('❌ Google Maps delivery fee calculation failed:', error);
      
      // Fallback to basic calculation
      return {
        success: false,
        error: error.message,
        fallback: {
          distance_km: null,
          final_fee: 5.00,
          calculation_method: 'fallback_default',
          calculated_at: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Calculate distance-based fee as fallback
   * @param {number} distanceKm - Distance in kilometers
   * @returns {number} Calculated fee
   */
  calculateDistanceBasedFee(distanceKm) {
    if (distanceKm <= 5) return 3.00;
    if (distanceKm <= 10) return 4.00;
    if (distanceKm <= 15) return 5.00;
    if (distanceKm <= 20) return 6.00;
    if (distanceKm <= 25) return 7.00;
    return 8.00 + Math.ceil((distanceKm - 25) / 5) * 1.00;
  }

  /**
   * Geocode an address to get coordinates
   * @param {string} address - Address to geocode
   * @returns {Promise<Object>} Geocoding result with coordinates
   */
  async geocodeAddress(address) {
    try {
      await this.loadGoogleMaps();

      return new Promise((resolve, reject) => {
        const geocoder = new window.google.maps.Geocoder();
        
        geocoder.geocode({ address }, (results, status) => {
          if (status === 'OK') {
            const location = results[0].geometry.location;
            resolve({
              success: true,
              coordinates: {
                lat: location.lat(),
                lng: location.lng()
              },
              formatted_address: results[0].formatted_address,
              place_id: results[0].place_id
            });
          } else {
            reject(new Error(`Geocoding failed: ${status}`));
          }
        });
      });
    } catch (error) {
      console.error('Geocoding error:', error);
      throw error;
    }
  }

  /**
   * Validate if coordinates are within Jordan
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {boolean} True if coordinates are in Jordan
   */
  isWithinJordan(lat, lng) {
    // Jordan bounding box (approximate)
    const jordanBounds = {
      north: 33.5,
      south: 29.0,
      east: 39.5,
      west: 34.0
    };

    return lat >= jordanBounds.south && lat <= jordanBounds.north &&
           lng >= jordanBounds.west && lng <= jordanBounds.east;
  }
}

// Create and export singleton instance
const googleMapsService = new GoogleMapsService();
export default googleMapsService;
