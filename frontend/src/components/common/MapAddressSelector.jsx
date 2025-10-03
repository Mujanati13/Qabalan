import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Input, Row, Col, Form, message, Spin, Alert, AutoComplete } from 'antd';
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
  const [suggestions, setSuggestions] = useState([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [initialApplied, setInitialApplied] = useState(false);
  const searchInputRef = useRef(null);
  const autocompleteServiceRef = useRef(null);
  const placesServiceRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const prevInitialLocationKeyRef = useRef(null);

  const applyAddressToForm = (address, location) => {
    if (!address) return;

    if (form && onAddressChange) {
      onAddressChange({
        street_address: address.street_address || '',
        city: address.city || '',
        state: address.state || '',
        country: address.country || '',
        postal_code: address.postal_code || '',
        full_address: address.full_address || address.formatted_address || '',
        latitude: Number(location.lat),
        longitude: Number(location.lng)
      });
    }
  };

  const parseGooglePlace = (result) => {
    if (!result) return null;

    const addressComponents = result.address_components || [];
    const addressData = {
      full_address: result.formatted_address,
      street_number: '',
      route: '',
      city: '',
      state: '',
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
        addressData.city = component.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        addressData.state = component.long_name;
      } else if (types.includes('country')) {
        addressData.country = component.long_name;
      } else if (types.includes('postal_code')) {
        addressData.postal_code = component.long_name;
      }
    });

    addressData.street_address = `${addressData.street_number} ${addressData.route}`.trim();
    return addressData;
  };

  // Default location (Amman, Jordan)
  const defaultLocation = { lat: 31.9454, lng: 35.9284 };

  useEffect(() => {
    loadGoogleMaps();
  }, []);

  useEffect(() => {
    const key = initialLocation ? `${Number(initialLocation.lat)}:${Number(initialLocation.lng)}` : null;
    if (prevInitialLocationKeyRef.current !== key) {
      prevInitialLocationKeyRef.current = key;
      setInitialApplied(false);
    }
  }, [initialLocation]);

  useEffect(() => {
    if (initialAddress) {
      const addressText = initialAddress.full_address || initialAddress.street_address || initialAddress.description || '';
      if (addressText && !searchInput) {
        setSearchInput(addressText);
      }
    }
  }, [initialAddress]);

  useEffect(() => {
    if (!map || !initialLocation || initialApplied) {
      return;
    }

    const lat = Number(initialLocation.lat);
    const lng = Number(initialLocation.lng);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return;
    }

    const location = { lat, lng };

    updateMapLocation(location);

    if (initialAddress) {
      applyAddressToForm(initialAddress, location);
      const addressText = initialAddress.full_address || initialAddress.street_address || initialAddress.description || '';
      if (addressText) {
        setSearchInput(prev => prev || addressText);
      }
    } else {
      performReverseGeocoding(location);
    }

    setInitialApplied(true);
  }, [map, initialLocation, initialAddress, initialApplied]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

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

  autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
  placesServiceRef.current = new window.google.maps.places.PlacesService(mapInstance);

      // Add click listener
      if (!disabled) {
        mapInstance.addListener('click', handleMapClick);
      }

      // Add initial marker if location exists
      if (initialPos) {
        addMarker(initialPos, mapInstance);
      }

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

  const geocodeWithGoogle = (query) => {
    if (!window.google || !window.google.maps) {
      return Promise.reject(new Error('google_unavailable'));
    }

    const geocoder = new window.google.maps.Geocoder();

    return new Promise((resolve, reject) => {
      geocoder.geocode({ address: query }, (results, status) => {
        if (status === 'OK' && results?.length) {
          const primaryResult = results[0];
          const geometryLocation = primaryResult.geometry?.location;
          if (geometryLocation) {
            resolve({
              location: {
                lat: Number(geometryLocation.lat()),
                lng: Number(geometryLocation.lng())
              },
              formattedAddress: primaryResult.formatted_address || query
            });
            return;
          }
        }
        reject(new Error(status || 'geocode_failed'));
      });
    });
  };

  const geocodeWithNominatim = async (query) => {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('nominatim_error');
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('nominatim_no_results');
    }

    const result = data[0];
    return {
      location: {
        lat: Number(result.lat),
        lng: Number(result.lon)
      },
      formattedAddress: result.display_name || query
    };
  };

  const fetchGoogleSuggestions = (value) => {
    if (!autocompleteServiceRef.current) return;

    setIsFetchingSuggestions(true);

    autocompleteServiceRef.current.getPlacePredictions(
      {
        input: value,
        componentRestrictions: { country: 'jo' }
      },
      (predictions, status) => {
        if (status === 'OK') {
          setSuggestions(predictions || []);
        } else if (status === 'ZERO_RESULTS') {
          setSuggestions([]);
        } else {
          console.warn('Autocomplete prediction status:', status);
          setSuggestions([]);
        }
        setIsFetchingSuggestions(false);
      }
    );
  };

  const fetchNominatimSuggestions = async (value) => {
    setIsFetchingSuggestions(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(value)}`;
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('nominatim_error');
      }

      const data = await response.json();
      const results = Array.isArray(data) ? data.map(item => ({
        description: item.display_name,
        place_id: item.place_id,
        lat: item.lat,
        lng: item.lon,
        source: 'nominatim'
      })) : [];

      setSuggestions(results);
    } catch (error) {
      console.error('Suggestion fetch error:', error);
      setSuggestions([]);
    } finally {
      setIsFetchingSuggestions(false);
    }
  };

  const selectPrediction = (prediction) => {
    if (!prediction) {
      return Promise.reject(new Error('invalid_prediction'));
    }

    if (prediction.source === 'nominatim') {
      const location = {
        lat: Number(prediction.lat),
        lng: Number(prediction.lng)
      };
      updateMapLocation(location);
      setSuggestions([]);
      setSearchInput(prediction.description || '');
      performReverseGeocoding(location);
      message.success(t ? t('map.placeSelected') : 'Location selected successfully');
      return Promise.resolve(location);
    }

    if (!window.google || !window.google.maps || !prediction.place_id) {
      return Promise.reject(new Error('google_unavailable'));
    }

    if (!placesServiceRef.current && map) {
      placesServiceRef.current = new window.google.maps.places.PlacesService(map);
    }

    const service = placesServiceRef.current;
    if (!service) {
      return Promise.reject(new Error('places_service_unavailable'));
    }

    return new Promise((resolve, reject) => {
      service.getDetails(
        {
          placeId: prediction.place_id,
          fields: ['geometry', 'formatted_address', 'address_components']
        },
        (placeResult, status) => {
          if (
            status === window.google.maps.places.PlacesServiceStatus.OK &&
            placeResult?.geometry?.location
          ) {
            const location = {
              lat: Number(placeResult.geometry.location.lat()),
              lng: Number(placeResult.geometry.location.lng())
            };

            updateMapLocation(location);
            const parsedAddress = parseGooglePlace(placeResult);
            if (parsedAddress) {
              performReverseGeocoding(location, parsedAddress);
            } else {
              performReverseGeocoding(location);
            }

            setSearchInput(placeResult.formatted_address || prediction.description || '');
            setSuggestions([]);
            message.success(t ? t('map.placeSelected') : 'Location selected successfully');
            resolve(location);
          } else {
            reject(new Error(status || 'place_details_failed'));
          }
        }
      );
    });
  };

  const handleSuggestionSelect = async (value, option) => {
    const prediction = option?.prediction;
    try {
      await selectPrediction(prediction);
    } catch (error) {
      console.error('Suggestion selection error:', error);
      message.error(t ? t('map.placeNotFound') : 'Unable to load details for this place. Please try another search.');
    }
  };

  const handleSearchSubmit = async () => {
    const query = searchInput.trim();
    if (!query) {
      message.warning(t ? t('map.enterSearchTerm') : 'Please enter a location to search');
      return;
    }

    if (!map) {
      message.warning(t ? t('map.mapNotReady') : 'Map is still loading. Please wait a moment and try again.');
      return;
    }

    setIsSearching(true);

    try {
      let handled = false;

      if (suggestions.length > 0) {
        try {
          await selectPrediction(suggestions[0]);
          handled = true;
        } catch (predictionError) {
          console.warn('Primary prediction selection failed:', predictionError);
        }
      }

      if (!handled) {
        let result = null;

        if (window.google && window.google.maps) {
          try {
            result = await geocodeWithGoogle(query);
          } catch (googleError) {
            console.warn('Google geocoding failed, falling back to Nominatim:', googleError);
          }
        }

        if (!result) {
          result = await geocodeWithNominatim(query);
        }

        if (result?.location) {
          updateMapLocation(result.location);
          setSearchInput(result.formattedAddress || query);
          performReverseGeocoding(result.location);
          setSuggestions([]);
          message.success(t ? t('map.searchSuccess') : 'Location found and selected on the map');
        } else {
          throw new Error('no_location_result');
        }
      }
    } catch (error) {
      console.error('Manual map search error:', error);
      message.error(t ? t('map.searchFailed') : 'Could not find that location. Please refine your search.');
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };

  const performReverseGeocoding = async (location, prefetchedAddress = null) => {
    if (prefetchedAddress) {
      applyAddressToForm(prefetchedAddress, location);
      return;
    }

    setIsReverseGeocoding(true);

    const reverseGeocodeWithGoogle = () => {
      if (!window.google || !window.google.maps) {
        return Promise.reject(new Error('google_unavailable'));
      }

      const geocoder = new window.google.maps.Geocoder();

      return new Promise((resolve, reject) => {
        geocoder.geocode({ location }, (results, status) => {
          if (status === 'OK' && results?.length) {
            resolve(parseGooglePlace(results[0]));
          } else {
            reject(new Error(status || 'geocode_failed'));
          }
        });
      });
    };

    const reverseGeocodeWithNominatim = async () => {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(location.lat)}&lon=${encodeURIComponent(location.lng)}&zoom=18&addressdetails=1`;

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('nominatim_reverse_error');
      }

      const data = await response.json();
      if (!data) {
        throw new Error('nominatim_reverse_empty');
      }

      const address = data.address || {};
      return {
        full_address: data.display_name || '',
        street_address: [address.house_number, address.road].filter(Boolean).join(' '),
        city: address.city || address.town || address.village || address.municipality || '',
        state: address.state || address.region || '',
        country: address.country || '',
        postal_code: address.postcode || ''
      };
    };

    try {
      let address = null;

      try {
        address = await reverseGeocodeWithGoogle();
      } catch (googleError) {
        console.warn('Google reverse geocoding failed, falling back to Nominatim:', googleError);
        address = await reverseGeocodeWithNominatim();
      }

      applyAddressToForm(address, location);

      if (!address?.full_address) {
        message.warning(t ? t('map.geocodingPartial') : 'Coordinates saved, but no formatted address was found.');
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      message.warning(t ? t('map.geocodingFailed') : 'Could not get address for this location');
    } finally {
      setIsReverseGeocoding(false);
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

  const handleSearchInputChange = (value) => {
    setSearchInput(value);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = value.trim();
    if (!trimmed) {
      setSuggestions([]);
      setIsFetchingSuggestions(false);
      return;
    }

    debounceTimerRef.current = window.setTimeout(() => {
      if (window.google && window.google.maps && autocompleteServiceRef.current) {
        fetchGoogleSuggestions(trimmed);
      } else {
        fetchNominatimSuggestions(trimmed);
      }
    }, 250);
  };

  const clearSearch = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setSearchInput('');
    setSuggestions([]);
    setIsFetchingSuggestions(false);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const autoCompleteOptions = suggestions.map(prediction => {
    const mainText = prediction.structured_formatting?.main_text || prediction.description || prediction.formattedAddress || '';
    const secondaryText = prediction.structured_formatting?.secondary_text || '';

    return {
      value: prediction.description || prediction.formattedAddress || '',
      label: (
        <div>
          <div style={{ fontWeight: 600 }}>{mainText}</div>
          {secondaryText && (
            <div style={{ fontSize: 12, color: '#999' }}>{secondaryText}</div>
          )}
        </div>
      ),
      prediction
    };
  });

  const suggestionsOpen = (suggestions.length > 0) || (isFetchingSuggestions && searchInput.trim().length > 0);

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
        <Row gutter={8} wrap={false} align="middle">
          <Col flex="auto">
            <AutoComplete
              value={searchInput}
              options={autoCompleteOptions}
              onSearch={handleSearchInputChange}
              onSelect={handleSuggestionSelect}
              open={suggestionsOpen}
              notFoundContent={isFetchingSuggestions ? <Spin size="small" /> : null}
              dropdownMatchSelectWidth={false}
              filterOption={false}
              getPopupContainer={(trigger) => trigger.parentNode}
              disabled={disabled}
            >
              <Input
                ref={searchInputRef}
                placeholder={t ? t('map.searchPlaceholder') : 'Search for places, addresses, or landmarks...'}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                onPressEnter={handleSearchSubmit}
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
            </AutoComplete>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleSearchSubmit}
              disabled={disabled}
              loading={isSearching}
            >
              {t ? t('common.search') : 'Search'}
            </Button>
          </Col>
        </Row>
        {isSearching && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
            {t ? t('map.searching') : 'Searching for the best match...'}
          </div>
        )}
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
