import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Row, Col, Switch, Button, Space, Tabs, message }  from 'antd'
import { SaveOutlined, EnvironmentOutlined, FormOutlined } from '@ant-design/icons'
import MapAddressSelector from './MapAddressSelector';

const { Option } = Select;
const { TabPane } = Tabs;

const EnhancedAddressForm = ({
  form,
  onFinish,
  cities = [],
  areas = [],
  streets = [],
  onCityChange,
  onAreaChange,
  onMapAddressChange,
  isEditing = false,
  t,
  initialCoordinates = null,
  initialAddress = null,
  showMapFirst = true
}) => {
  const [activeTab, setActiveTab] = useState(showMapFirst ? 'map' : 'form');
  const [selectedLocation, setSelectedLocation] = useState(initialCoordinates);
  const [autoFilledAddress, setAutoFilledAddress] = useState(initialAddress || null);

  useEffect(() => {
    // Set initial coordinates if provided
    if (initialCoordinates && initialCoordinates.lat && initialCoordinates.lng) {
      const normalizedCoordinates = {
        lat: Number(initialCoordinates.lat),
        lng: Number(initialCoordinates.lng)
      };
      setSelectedLocation(normalizedCoordinates);
    }
  }, [initialCoordinates]);

  useEffect(() => {
    if (initialAddress) {
      setAutoFilledAddress(prev => prev || initialAddress);
    }
  }, [initialAddress]);

  const handleLocationSelect = (location) => {
    // Ensure coordinates are numbers
    const normalizedLocation = {
      lat: Number(location.lat),
      lng: Number(location.lng)
    };
    
    setSelectedLocation(normalizedLocation);
    
    // Update form with coordinates
    form.setFieldsValue({
      latitude: normalizedLocation.lat,
      longitude: normalizedLocation.lng
    });
  };

  const handleAddressChange = (addressData) => {
    setAutoFilledAddress(addressData);
    
    // Auto-fill form fields with geocoded data
    const updateFields = {
      latitude: Number(addressData.latitude),
      longitude: Number(addressData.longitude),
      details: addressData.full_address
    };

    // If we have street address, try to parse building number
    if (addressData.street_address) {
      const streetParts = addressData.street_address.split(' ');
      const buildingNo = streetParts.find(part => /^\d+$/.test(part));
      if (buildingNo) {
        updateFields.building_no = buildingNo;
      }
      
      // Use the street name part for details if no specific field
      updateFields.street_details = addressData.street_address;
    }

    form.setFieldsValue(updateFields);
    
    message.success(t ? t('map.addressAutoFilled') : 'Address fields auto-filled from map location');
    
    // Call the callback to handle location matching in parent component
    if (onMapAddressChange) {
      onMapAddressChange(addressData);
    }
    
    // Switch to form tab to show the filled fields
    setActiveTab('form');
  };

  const validateCoordinates = () => {
    if (!selectedLocation) {
      message.error(t ? t('map.pleaseSelectLocation') : 'Please select a location on the map first');
      setActiveTab('map');
      return false;
    }
    return true;
  };

  const handleFormSubmit = (values) => {
    // Include coordinates in the submission if available
    const formData = {
      ...values
    };
    
    // Ensure boolean fields are properly converted
    formData.is_default = Boolean(values.is_default);
    
    // Add coordinates if available
    if (selectedLocation) {
      formData.latitude = selectedLocation.lat;
      formData.longitude = selectedLocation.lng;
    }

    // Validate that we have at least one form of location data
    const hasLocationDropdowns = formData.city_id || formData.area_id || formData.street_id;
    const hasCoordinates = formData.latitude && formData.longitude;
    const hasAddressDetails = formData.details || formData.building_no || formData.floor_no || formData.apartment_no;

    if (!hasLocationDropdowns && !hasCoordinates && !hasAddressDetails) {
      message.error(
        t ? t('customers.locationDataRequired') : 
        'At least one form of location data is required (city/area/street, coordinates, or address details)'
      );
      return;
    }

    // Ensure address_name is properly mapped (backend expects address_name, not name)
    formData.address_name = formData.name || 'Address';

    if (onFinish) {
      onFinish(formData);
    }
  };

  const renderMapTab = () => (
    <MapAddressSelector
      onLocationSelect={handleLocationSelect}
      onAddressChange={handleAddressChange}
      initialLocation={selectedLocation}
      initialAddress={initialAddress}
      form={form}
      height={400}
      t={t}
    />
  );

  const renderFormTab = () => (
    <div>
      {autoFilledAddress && (
        <div style={{ 
          marginBottom: 16, 
          padding: 12, 
          backgroundColor: '#f6ffed', 
          border: '1px solid #b7eb8f',
          borderRadius: 6 
        }}>
          <div style={{ fontSize: '14px', color: '#52c41a', marginBottom: 4 }}>
            <EnvironmentOutlined /> {t ? t('map.autoFilledFromMap') : 'Auto-filled from map location:'}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {autoFilledAddress.full_address}
          </div>
        </div>
      )}

      {/* Info message about manual coordinate entry */}
      {!autoFilledAddress && (
        <div style={{ 
          marginBottom: 16, 
          padding: 12, 
          backgroundColor: '#e6f7ff', 
          border: '1px solid #91d5ff',
          borderRadius: 6 
        }}>
          <div style={{ fontSize: '13px', color: '#0050b3' }}>
            💡 <strong>Tip:</strong> {t ? t('map.manualCoordinatesInfo') : 'You can use the Map tab to select a location, or manually enter latitude and longitude coordinates below if map services are unavailable.'}
          </div>
        </div>
      )}

      <Form.Item
        label={t ? t('customers.addressName') : 'Address Name'}
        name="name"
        rules={[
          { required: true, message: t ? t('common.required') : 'This field is required' },
          { min: 2, message: t ? t('common.minLength', { min: 2 }) : 'Minimum 2 characters required' }
        ]}
      >
        <Input placeholder={t ? t('customers.addressName') : 'e.g., Home, Office'} />
      </Form.Item>

      <Form.Item
        label={t ? t('customers.phone') : 'Phone Number'}
        name="phone"
        rules={[
          { required: true, message: t ? t('customers.phone_required') : 'Phone number is required' }
        ]}
      >
        <Input placeholder={t ? t('customers.phone_placeholder') : 'e.g., 0791234567'} />
      </Form.Item>

      {/* Coordinates - Now visible and editable */}
      <div style={{ 
        marginBottom: 16, 
        padding: 16, 
        backgroundColor: '#fafafa', 
        border: '1px solid #d9d9d9',
        borderRadius: 6 
      }}>
        <div style={{ marginBottom: 12, fontWeight: 500, color: '#262626' }}>
          <EnvironmentOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          {t ? t('customers.gpsCoordinates') : 'GPS Coordinates'}
          {selectedLocation && selectedLocation.lat && selectedLocation.lng && (
            <span style={{ marginLeft: 8, fontSize: '12px', color: '#52c41a' }}>
              ✓ {t ? t('customers.coordinatesSet') : 'Coordinates set'}
            </span>
          )}
        </div>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item 
              label={t ? t('customers.latitude') : 'Latitude'}
              name="latitude"
              rules={[
                { 
                  pattern: /^-?([0-8]?[0-9]|90)(\.\d+)?$/, 
                  message: t ? t('customers.invalidLatitude') : 'Invalid latitude (-90 to 90)' 
                }
              ]}
              tooltip={t ? t('customers.latitudeTooltip') : 'Latitude coordinate (-90 to 90). Can be obtained from map or entered manually.'}
            >
              <Input 
                placeholder="e.g., 31.9539" 
                type="number"
                step="0.000001"
                prefix={<span style={{ color: '#999', fontSize: '12px' }}>Lat:</span>}
                onChange={(e) => {
                  const lat = parseFloat(e.target.value);
                  if (!isNaN(lat)) {
                    const lng = form.getFieldValue('longitude');
                    if (lng) {
                      setSelectedLocation({ lat, lng: parseFloat(lng) });
                    }
                  }
                }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item 
              label={t ? t('customers.longitude') : 'Longitude'}
              name="longitude"
              rules={[
                { 
                  pattern: /^-?((1[0-7][0-9])|([0-9]?[0-9]))(\.\d+)?$/, 
                  message: t ? t('customers.invalidLongitude') : 'Invalid longitude (-180 to 180)' 
                }
              ]}
              tooltip={t ? t('customers.longitudeTooltip') : 'Longitude coordinate (-180 to 180). Can be obtained from map or entered manually.'}
            >
              <Input 
                placeholder="e.g., 35.9106" 
                type="number"
                step="0.000001"
                prefix={<span style={{ color: '#999', fontSize: '12px' }}>Lng:</span>}
                onChange={(e) => {
                  const lng = parseFloat(e.target.value);
                  if (!isNaN(lng)) {
                    const lat = form.getFieldValue('latitude');
                    if (lat) {
                      setSelectedLocation({ lat: parseFloat(lat), lng });
                    }
                  }
                }}
              />
            </Form.Item>
          </Col>
        </Row>
        <div style={{ fontSize: '11px', color: '#8c8c8c', marginTop: -8 }}>
          💡 {t ? t('customers.coordinatesHelp') : 'Use the Map tab to auto-select coordinates, or enter them manually here (e.g., from Google Maps)'}
        </div>
      </div>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item
            label={t ? t('customers.city') : 'City'}
            name="city_id"
            rules={[{ required: false, message: t ? t('common.required') : 'This field is required' }]}
          >
            <Select
              placeholder={t ? t('customers.city') : 'Select City'}
              allowClear
              onChange={(value) => {
                if (onCityChange) onCityChange(value);
                form.setFieldsValue({ area_id: undefined, street_id: undefined });
              }}
            >
              {cities.map(city => (
                <Option key={city.id} value={city.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{city.title_en}</span>
                    {city.title_ar && (
                      <span style={{ fontSize: '12px', color: '#666', marginLeft: '8px' }}>
                        {city.title_ar}
                      </span>
                    )}
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            label={t ? t('customers.area') : 'Area'}
            name="area_id"
            rules={[{ required: false, message: t ? t('common.required') : 'This field is required' }]}
          >
            <Select
              placeholder={t ? t('customers.area') : 'Select Area'}
              allowClear
              onChange={(value) => {
                if (onAreaChange) onAreaChange(value);
                form.setFieldsValue({ street_id: undefined });
              }}
            >
              {areas.map(area => (
                <Option key={area.id} value={area.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{area.title_en}</span>
                    {area.title_ar && (
                      <span style={{ fontSize: '12px', color: '#666', marginLeft: '8px' }}>
                        {area.title_ar}
                      </span>
                    )}
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            label={t ? t('customers.street') : 'Street'}
            name="street_id"
            rules={[{ required: false, message: t ? t('common.required') : 'This field is required' }]}
          >
            <Select 
              placeholder={t ? t('customers.street') : 'Select Street'}
              allowClear
            >
              {streets.map(street => (
                <Option key={street.id} value={street.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{street.title_en}</span>
                    {street.title_ar && (
                      <span style={{ fontSize: '12px', color: '#666', marginLeft: '8px' }}>
                        {street.title_ar}
                      </span>
                    )}
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label={t ? t('customers.buildingNo') : 'Building No'} name="building_no">
            <Input placeholder="123" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={t ? t('customers.floorNo') : 'Floor No'} name="floor_no">
            <Input placeholder="2" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={t ? t('customers.apartmentNo') : 'Apartment No'} name="apartment_no">
            <Input placeholder="5A" />
          </Form.Item>
        </Col>
      </Row>

      {autoFilledAddress && autoFilledAddress.street_address && (
        <Form.Item label={t ? t('customers.streetDetails') : 'Street Details'} name="street_details">
          <Input placeholder={t ? t('customers.streetDetailsPlaceholder') : 'Street name and number'} />
        </Form.Item>
      )}

      <Form.Item label={t ? t('customers.details') : 'Additional Details'} name="details">
        <Input.TextArea 
          rows={3} 
          placeholder={t ? t('customers.detailsPlaceholder') : 'Landmark, special instructions, etc.'} 
        />
      </Form.Item>

      <Form.Item
        label={t ? t('customers.defaultAddress') : 'Default Address'}
        name="is_default"
        valuePropName="checked"
        initialValue={false}
      >
        <Switch />
      </Form.Item>

      {selectedLocation && selectedLocation.lat && selectedLocation.lng && (
        <div style={{ 
          marginBottom: 16, 
          padding: 12, 
          backgroundColor: '#f0f9ff', 
          border: '1px solid #91d5ff',
          borderRadius: 6 
        }}>
          <div style={{ fontSize: '12px', color: '#1890ff' }}>
            <EnvironmentOutlined /> {t ? t('map.selectedCoordinates') : 'Selected Coordinates'}: {Number(selectedLocation.lat).toFixed(6)}, {Number(selectedLocation.lng).toFixed(6)}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFormSubmit}
      autoComplete="off"
    >
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        items={[
          {
            key: 'map',
            label: (
              <span>
                <EnvironmentOutlined />
                {t ? t('map.selectOnMap') : 'Select on Map'}
                {selectedLocation && <span style={{ color: '#52c41a', marginLeft: 4 }}>✓</span>}
              </span>
            ),
            children: renderMapTab()
          },
          {
            key: 'form',
            label: (
              <span>
                <FormOutlined />
                {t ? t('map.addressDetails') : 'Address Details'}
              </span>
            ),
            children: renderFormTab()
          }
        ]}
      />

      <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
        <Space>
          <Button 
            type="primary" 
            htmlType="submit" 
            icon={<SaveOutlined />}
          >
            {isEditing ? (t ? t('common.update') : 'Update') : (t ? t('common.create') : 'Create')}
          </Button>
          <Button onClick={() => form.resetFields()}>
            {t ? t('common.cancel') : 'Cancel'}
          </Button>
          {!selectedLocation && (
            <Button 
              type="link" 
              onClick={() => setActiveTab('map')}
              style={{ color: '#1890ff' }}
            >
              {t ? t('map.selectLocationForDeliveryFee') : 'Select location on map for accurate delivery fee'}
            </Button>
          )}
        </Space>
      </Form.Item>
    </Form>
  );
};

export default EnhancedAddressForm;
