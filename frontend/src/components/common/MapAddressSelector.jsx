import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Input, Row, Col, Form, message, Spin, Alert } from 'antd';
import { EnvironmentOutlined, AimOutlined, CheckOutlined, SearchOutlined } from '@ant-design/icons';

const MapAddressSelector = ({ 
  onLocationSelect, 
  onAddressChange, 
  initialLocation, 
  initialAddress,
  form,
  disabled = false,
  height = 400,
  t 
}) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(initialLocation || null);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [autocomplete, setAutocomplete] = useState(null);
  const searchInputRef = useRef(null);

  // Default location (Amman, Jordan)
  const defaultLocation = { lat: 31.9454, lng: 35.9284 };

  useEffect(() => {
    loadGoogleMaps();
  }, []);

  useEffect(() => {
    if (map && initialLocation) {
      updateMapLocation(initialLocation);
    }
  }, [map, initialLocation]);

  const loadGoogleMaps = () => {
    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      initializeMap();
      return;
    }

    // Check if script is already being loaded
    if (window.googleMapsLoading) {
      const checkGoogleMaps = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(checkGoogleMaps);
          initializeMap();
        }
      }, 100);
      return;
    }

    // Load Google Maps script
    window.googleMapsLoading = true;
    const script = document.createElement('script');
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
    
    if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
      console.warn('Google Maps API key not found or not configured. Map functionality will be limited.');
      setMapError(
        <div>
          <p>Google Maps API key not configured.</p>
          <p>Please add <code>VITE_GOOGLE_MAPS_API_KEY</code> to your .env file.</p>
          <p>You can still enter address details manually below.</p>
        </div>
      );
      setLoading(false);
      return;
    }
    
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      window.googleMapsLoading = false;
      initializeMap();
    };
    
    script.onerror = () => {
      window.googleMapsLoading = false;
      setMapError('Failed to load Google Maps. Please check your API key and internet connection.');
      setLoading(false);
    };
    
    document.head.appendChild(script);
  };

  const initializeMap = () => {
    try {
      const initialPos = selectedLocation || initialLocation || defaultLocation;
      
      const mapInstance = new window.google.maps.Map(mapRef.current, {
        center: initialPos,
        zoom: 15,
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      setMap(mapInstance);

      // Add click listener
      if (!disabled) {
        mapInstance.addListener('click', handleMapClick);
      }

      // Add initial marker if location exists
      if (initialPos) {
        addMarker(initialPos, mapInstance);
      }

      // Initialize autocomplete
      initializeAutocomplete();

      setLoading(false);
    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError('Failed to initialize map. Please refresh and try again.');
      setLoading(false);
    }
  };

  const handleMapClick = (event) => {
    if (disabled) return;
    
    const location = {
      lat: Number(event.latLng.lat()),
      lng: Number(event.latLng.lng())
    };
    
    updateMapLocation(location);
    performReverseGeocoding(location);
  };

  const updateMapLocation = (location) => {
    if (!map) return;

    // Normalize coordinates to ensure they're numbers
    const normalizedLocation = {
      lat: Number(location.lat),
      lng: Number(location.lng)
    };

    setSelectedLocation(normalizedLocation);
    
    // Remove existing marker
    if (marker) {
      marker.setMap(null);
    }
    
    // Add new marker
    addMarker(normalizedLocation, map);
    
    // Center map on location
    map.setCenter(normalizedLocation);
    
    // Notify parent component
    if (onLocationSelect) {
      onLocationSelect(normalizedLocation);
    }
  };

  const addMarker = (location, mapInstance) => {
    const newMarker = new window.google.maps.Marker({
      position: location,
      map: mapInstance,
      draggable: !disabled,
      animation: window.google.maps.Animation.DROP,
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="8" fill="#1890ff" stroke="#fff" stroke-width="2"/>
            <circle cx="16" cy="16" r="3" fill="#fff"/>
          </svg>
        `),
        scaledSize: new window.google.maps.Size(32, 32),
        anchor: new window.google.maps.Point(16, 16)
      }
    });

    if (!disabled) {
      newMarker.addListener('dragend', (event) => {
        const newLocation = {
          lat: Number(event.latLng.lat()),
          lng: Number(event.latLng.lng())
        };
        setSelectedLocation(newLocation);
        performReverseGeocoding(newLocation);
        if (onLocationSelect) {
          onLocationSelect(newLocation);
        }
      });
    }

    setMarker(newMarker);
  };

  const performReverseGeocoding = async (location) => {
    if (!window.google || !window.google.maps) return;
    
    setIsReverseGeocoding(true);
    
    try {
      const geocoder = new window.google.maps.Geocoder();
      
      geocoder.geocode(
        { location: location },
        (results, status) => {
          setIsReverseGeocoding(false);
          
          if (status === 'OK' && results[0]) {
            const result = results[0];
            const addressComponents = result.address_components;
            
            // Parse address components
            const addressData = {
              formatted_address: result.formatted_address,
              street_number: '',
              route: '',
              locality: '',
              administrative_area_level_1: '',
              country: '',
              postal_code: ''
            };
            
            addressComponents.forEach(component => {
              const types = component.types;
              if (types.includes('street_number')) {
                addressData.street_number = component.long_name;
              } else if (types.includes('route')) {
                addressData.route = component.long_name;
              } else if (types.includes('locality')) {
                addressData.locality = component.long_name;
              } else if (types.includes('administrative_area_level_1')) {
                addressData.administrative_area_level_1 = component.long_name;
              } else if (types.includes('country')) {
                addressData.country = component.long_name;
              } else if (types.includes('postal_code')) {
                addressData.postal_code = component.long_name;
              }
            });
            
            // Update form fields if form is provided
            if (form && onAddressChange) {
              const formattedAddress = {
                street_address: `${addressData.street_number} ${addressData.route}`.trim(),
                city: addressData.locality,
                state: addressData.administrative_area_level_1,
                country: addressData.country,
                postal_code: addressData.postal_code,
                full_address: addressData.formatted_address,
                latitude: Number(location.lat),
                longitude: Number(location.lng)
              };
              
              onAddressChange(formattedAddress);
            }
            
          } else {
            console.warn('Geocoding failed:', status);
            message.warning(t ? t('map.geocodingFailed') : 'Could not get address for this location');
          }
        }
      );
    } catch (error) {
      setIsReverseGeocoding(false);
      console.error('Reverse geocoding error:', error);
      message.error(t ? t('map.geocodingError') : 'Error getting address information');
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      message.error(t ? t('map.geolocationNotSupported') : 'Geolocation is not supported');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: Number(position.coords.latitude),
          lng: Number(position.coords.longitude)
        };
        updateMapLocation(location);
        performReverseGeocoding(location);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        console.error('Geolocation error:', error);
        let errorMessage = t ? t('map.geolocationError') : 'Error getting your location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = t ? t('map.geolocationDenied') : 'Location access denied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = t ? t('map.geolocationUnavailable') : 'Location unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = t ? t('map.geolocationTimeout') : 'Location request timeout';
            break;
        }
        
        message.error(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  const initializeAutocomplete = () => {
    if (!window.google || !window.google.maps || !searchInputRef.current) return;

    try {
      const autocompleteInstance = new window.google.maps.places.Autocomplete(
        searchInputRef.current.input,
        {
          types: ['address'],
          componentRestrictions: { country: 'jo' }, // Restrict to Jordan
          fields: ['place_id', 'geometry', 'name', 'formatted_address', 'address_components']
        }
      );

      autocompleteInstance.addListener('place_changed', () => {
        const place = autocompleteInstance.getPlace();
        
        if (!place.geometry || !place.geometry.location) {
          message.warning(t ? t('map.placeNotFound') : 'Location not found for this place');
          return;
        }

        const location = {
          lat: Number(place.geometry.location.lat()),
          lng: Number(place.geometry.location.lng())
        };

        // Update map and marker
        updateMapLocation(location);
        
        // Set search input to the formatted address
        setSearchInput(place.formatted_address || place.name || '');
        
        // Perform reverse geocoding to get detailed address info
        performReverseGeocoding(location);
        
        message.success(t ? t('map.placeSelected') : 'Location selected successfully');
      });

      setAutocomplete(autocompleteInstance);
    } catch (error) {
      console.error('Error initializing autocomplete:', error);
    }
  };

  const handleSearchInputChange = (e) => {
    setSearchInput(e.target.value);
  };

  const clearSearch = () => {
    setSearchInput('');
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  if (mapError) {
    return (
      <Card 
        title={
          <Row justify="space-between" align="middle">
            <Col>
              <EnvironmentOutlined /> {t ? t('map.selectLocation') : 'Select Location'}
            </Col>
          </Row>
        }
        style={{ marginBottom: 16 }}
      >
        <Alert
          message={t ? t('map.loadError') : 'Map Load Error'}
          description={mapError}
          type="warning"
          showIcon
          action={
            <Button size="small" onClick={() => window.location.reload()}>
              {t ? t('common.retry') : 'Retry'}
            </Button>
          }
        />
        <div style={{ marginTop: 16, padding: 16, backgroundColor: '#fafafa', borderRadius: 6 }}>
          <p style={{ margin: 0, color: '#666' }}>
            {t ? t('map.manualEntryNote') : 'You can still manually enter address information in the Address Details tab.'}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      title={
        <Row justify="space-between" align="middle">
          <Col>
            <EnvironmentOutlined /> {t ? t('map.selectLocation') : 'Select Location'}
          </Col>
          <Col>
            <Row gutter={8}>
              {selectedLocation && (
                <Col>
                  <Button 
                    size="small" 
                    type="text" 
                    icon={<CheckOutlined />}
                    style={{ color: '#52c41a' }}
                  >
                    {t ? t('map.locationSelected') : 'Location Selected'}
                  </Button>
                </Col>
              )}
              <Col>
                <Button
                  size="small"
                  icon={<AimOutlined />}
                  onClick={getCurrentLocation}
                  loading={loading}
                  disabled={disabled}
                >
                  {t ? t('map.currentLocation') : 'Current Location'}
                </Button>
              </Col>
            </Row>
          </Col>
        </Row>
      }
      style={{ marginBottom: 16 }}
    >
      {/* Search Input */}
      <div style={{ marginBottom: 16 }}>
        <Input
          ref={searchInputRef}
          placeholder={t ? t('map.searchPlaceholder') : 'Search for places, addresses, or landmarks...'}
          value={searchInput}
          onChange={handleSearchInputChange}
          prefix={<SearchOutlined />}
          suffix={
            searchInput && (
              <Button 
                type="text" 
                size="small" 
                onClick={clearSearch}
                style={{ padding: 0, height: 'auto', minWidth: 'auto' }}
              >
                ×
              </Button>
            )
          }
          disabled={disabled}
          style={{ width: '100%' }}
        />
      </div>
      <div style={{ position: 'relative' }}>
        <div
          ref={mapRef}
          style={{ 
            height: height, 
            width: '100%',
            borderRadius: '6px',
            border: '1px solid #d9d9d9'
          }}
        />
        
        {loading && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              borderRadius: '6px',
              zIndex: 1000
            }}
          >
            <Spin size="large" />
          </div>
        )}
        
        {isReverseGeocoding && (
          <div
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              zIndex: 1001
            }}
          >
            <Spin size="small" style={{ marginRight: 8 }} />
            {t ? t('map.gettingAddress') : 'Getting address...'}
          </div>
        )}
        
        {!disabled && !selectedLocation && (
          <div
            style={{
              position: 'absolute',
              bottom: 10,
              left: 10,
              right: 10,
              backgroundColor: 'rgba(24, 144, 255, 0.9)',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '4px',
              fontSize: '14px',
              textAlign: 'center',
              zIndex: 1001
            }}
          >
            {t ? t('map.clickToSelect') : 'Click on the map to select a location'}
          </div>
        )}
      </div>
      
      {selectedLocation && selectedLocation.lat && selectedLocation.lng && (
        <div style={{ marginTop: 12, fontSize: '12px', color: '#666' }}>
          <strong>{t ? t('map.coordinates') : 'Coordinates'}:</strong> {Number(selectedLocation.lat).toFixed(6)}, {Number(selectedLocation.lng).toFixed(6)}
        </div>
      )}
    </Card>
  );
};

export default MapAddressSelector;
