import React, { useState, useEffect, useRef } from 'react';
import { 
  Typography, 
  Row, 
  Col, 
  Card, 
  Button, 
  Space, 
  Spin,
  Tag,
  Divider
} from 'antd';
import { 
  EnvironmentOutlined, 
  PhoneOutlined, 
  CompassOutlined,
  CarOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useSettings } from '../contexts/SettingsContext';
import { useTranslation } from '../contexts/TranslationContext';
import AppLayout from './AppLayout';

const { Title, Paragraph, Text } = Typography;

const LocationsPage = () => {
  const { settings, loading } = useSettings();
  const { t, isRTL } = useTranslation();
  const [branches, setBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(true);

  const locationSettings = settings.locations || {};

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      setLoadingBranches(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/branches`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const activeBranches = data.data.filter(branch => branch.status === 'active');
          setBranches(activeBranches);
        }
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    } finally {
      setLoadingBranches(false);
    }
  };

  const getDirections = (lat, lng) => {
    if (lat && lng) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      window.open(url, '_blank');
    }
  };

  const callBranch = (phone) => {
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  };

  // Simple map component with real Google Maps integration
  const MapComponent = ({ branches, height = 400 }) => {
    const mapProvider = locationSettings.mapProvider || 'google';
    const zoom = locationSettings.defaultZoom || 12;
    const mapRef = React.useRef(null);
    const [mapLoaded, setMapLoaded] = React.useState(false);

    React.useEffect(() => {
      if (!locationSettings.enableMap || !branches.length || mapLoaded) return;

      // Load Google Maps if not already loaded
      if (!window.google) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${locationSettings.mapApiKey || 'AIzaSyBkQvQG_-z4b7vZ8eJjzq6k4V7z7q6vZzQ'}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = initializeMap;
        document.head.appendChild(script);
      } else {
        initializeMap();
      }

      function initializeMap() {
        if (!mapRef.current) return;

        // Get center point from first branch or default to Beirut
        const center = branches[0]?.latitude && branches[0]?.longitude 
          ? { lat: parseFloat(branches[0].latitude), lng: parseFloat(branches[0].longitude) }
          : { lat: 33.8938, lng: 35.5018 }; // Beirut, Lebanon

        const map = new window.google.maps.Map(mapRef.current, {
          zoom: zoom,
          center: center,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });

        // Add markers for each branch
        branches.forEach((branch, index) => {
          if (branch.latitude && branch.longitude) {
            const marker = new window.google.maps.Marker({
              position: { 
                lat: parseFloat(branch.latitude), 
                lng: parseFloat(branch.longitude) 
              },
              map: map,
              title: branch.name_en || branch.name,
              icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="20" cy="20" r="18" fill="#229A95" stroke="white" stroke-width="2"/>
                    <text x="20" y="25" text-anchor="middle" fill="white" font-size="14" font-weight="bold">${index + 1}</text>
                  </svg>
                `),
                scaledSize: new window.google.maps.Size(40, 40),
                anchor: new window.google.maps.Point(20, 20)
              }
            });

            // Add info window
            const infoWindow = new window.google.maps.InfoWindow({
              content: `
                <div style="padding: 10px; max-width: 250px;">
                  <h3 style="margin: 0 0 8px 0; color: #229A95;">${branch.name_en || branch.name}</h3>
                  <p style="margin: 0 0 8px 0; color: #666;">${branch.address_en || branch.address}</p>
                  ${branch.phone ? `<p style="margin: 0 0 8px 0;"><strong>📞</strong> ${branch.phone}</p>` : ''}
                  ${branch.working_hours ? `<p style="margin: 0 0 8px 0;"><strong>🕒</strong> ${branch.working_hours}</p>` : ''}
                  <button onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${branch.latitude},${branch.longitude}', '_blank')" 
                          style="background: #229A95; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; margin-top: 8px;">
                    Get Directions
                  </button>
                </div>
              `
            });

            marker.addListener('click', () => {
              infoWindow.open(map, marker);
            });
          }
        });

        setMapLoaded(true);
      }
    }, [locationSettings.enableMap, branches, locationSettings.mapApiKey, zoom, mapLoaded]);

    if (!locationSettings.enableMap) {
      return (
        <div 
          className="bg-gray-100 rounded-lg flex items-center justify-center"
          style={{ height: `${height}px` }}
        >
          <div className="text-center">
            <CompassOutlined className="text-4xl text-gray-400 mb-2" />
            <Text className="text-gray-500">Map is currently disabled</Text>
            <br />
            <Text className="text-xs text-gray-400">Enable map in admin settings</Text>
          </div>
        </div>
      );
    }

    if (!branches.length) {
      return (
        <div 
          className="bg-gray-100 rounded-lg flex items-center justify-center"
          style={{ height: `${height}px` }}
        >
          <div className="text-center">
            <CompassOutlined className="text-4xl text-gray-400 mb-2" />
            <Text className="text-gray-500">No locations available</Text>
          </div>
        </div>
      );
    }

    return (
      <div className="relative">
        <div 
          ref={mapRef}
          style={{ height: `${height}px`, width: '100%' }}
          className="rounded-lg overflow-hidden shadow-lg"
        />
        {!mapLoaded && (
          <div 
            className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center"
            style={{ height: `${height}px` }}
          >
            <div className="text-center">
              <Spin size="large" />
              <br />
              <Text className="text-gray-500 mt-2">Loading map...</Text>
            </div>
          </div>
        )}
      </div>
    );
  };

  const branchesToShow = locationSettings.showAllBranches ? branches : branches.slice(0, 1);

  if (loading || loadingBranches) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Spin size="large" tip={t('general.loading')} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <Title level={1} className="mb-4">
              {t('locations.title')}
            </Title>
            <Paragraph className="text-lg text-gray-600 max-w-2xl mx-auto">
              Find our locations and get directions to visit us.
            </Paragraph>
          </motion.div>

          <Row gutter={[32, 32]}>
            {/* Map Section */}
            <Col xs={24}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Card className="mb-8">
                  <div className="mb-4">
                    <Title level={3}>
                      {locationSettings.showAllBranches 
                        ? t('locations.allBranches') 
                        : t('locations.mainBranch')
                      }
                    </Title>
                  </div>
                  <MapComponent 
                    branches={branchesToShow} 
                    height={locationSettings.mapHeight || 400} 
                  />
                </Card>
              </motion.div>
            </Col>

            {/* Branches List */}
            <Col xs={24}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <Title level={3} className="mb-6">
                  {t('locations.ourLocations')}
                </Title>
                
                {branchesToShow.length === 0 ? (
                  <Card>
                    <div className="text-center py-8">
                      <EnvironmentOutlined className="text-4xl text-gray-400 mb-4" />
                      <Text className="text-gray-500">
                        No locations available at the moment.
                      </Text>
                    </div>
                  </Card>
                ) : (
                  <Row gutter={[24, 24]}>
                    {branchesToShow.map((branch, index) => (
                      <Col xs={24} md={12} lg={8} key={branch.id}>
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.6, delay: 0.1 * index }}
                        >
                          <Card 
                            className="h-full hover:shadow-lg transition-shadow"
                            actions={[
                              locationSettings.enableDirections && branch.latitude && branch.longitude && (
                                <Button
                                  type="text"
                                  icon={<CarOutlined />}
                                  onClick={() => getDirections(branch.latitude, branch.longitude)}
                                >
                                  {t('locations.directions')}
                                </Button>
                              ),
                              branch.phone && (
                                <Button
                                  type="text"
                                  icon={<PhoneOutlined />}
                                  onClick={() => callBranch(branch.phone)}
                                >
                                  {t('locations.call')}
                                </Button>
                              )
                            ].filter(Boolean)}
                          >
                            <div className="mb-4">
                              <Title level={4} className="mb-2">
                                {branch.name}
                              </Title>
                              {branch.is_main && (
                                <Tag color="gold" className="mb-2">
                                  {t('locations.mainBranch')}
                                </Tag>
                              )}
                            </div>

                            <Space direction="vertical" size="small" className="w-full">
                              {branch.address && (
                                <div className="flex items-start space-x-2">
                                  <EnvironmentOutlined className="text-gray-500 mt-1" />
                                  <Text className="text-gray-600 flex-1">
                                    {branch.address}
                                  </Text>
                                </div>
                              )}

                              {branch.phone && (
                                <div className="flex items-center space-x-2">
                                  <PhoneOutlined className="text-gray-500" />
                                  <Text className="text-gray-600">
                                    {branch.phone}
                                  </Text>
                                </div>
                              )}

                              {branch.hours && (
                                <div className="flex items-start space-x-2">
                                  <span className="text-gray-500 mt-1">🕒</span>
                                  <Text className="text-gray-600 flex-1 whitespace-pre-line">
                                    {branch.hours}
                                  </Text>
                                </div>
                              )}

                              {branch.latitude && branch.longitude && (
                                <div className="flex items-center space-x-2">
                                  <CompassOutlined className="text-gray-500" />
                                  <Text className="text-gray-500 text-xs">
                                    {branch.latitude.toFixed(6)}, {branch.longitude.toFixed(6)}
                                  </Text>
                                </div>
                              )}
                            </Space>
                          </Card>
                        </motion.div>
                      </Col>
                    ))}
                  </Row>
                )}
              </motion.div>
            </Col>
          </Row>

          {/* Configuration Info for Admins (remove in production) */}
          {process.env.NODE_ENV === 'development' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="mt-12"
            >
              <Card>
                <Title level={4}>Configuration Info (Development Only)</Title>
                <Divider />
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={12}>
                    <Text strong>Map Enabled:</Text> {locationSettings.enableMap ? 'Yes' : 'No'}
                    <br />
                    <Text strong>Map Provider:</Text> {locationSettings.mapProvider || 'google'}
                    <br />
                    <Text strong>Show All Branches:</Text> {locationSettings.showAllBranches ? 'Yes' : 'No'}
                    <br />
                    <Text strong>Default Zoom:</Text> {locationSettings.defaultZoom || 12}
                  </Col>
                  <Col xs={24} md={12}>
                    <Text strong>Map Height:</Text> {locationSettings.mapHeight || 400}px
                    <br />
                    <Text strong>Enable Directions:</Text> {locationSettings.enableDirections ? 'Yes' : 'No'}
                    <br />
                    <Text strong>API Key Set:</Text> {locationSettings.mapApiKey ? 'Yes' : 'No'}
                    <br />
                    <Text strong>Branches Found:</Text> {branches.length}
                  </Col>
                </Row>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default LocationsPage;
