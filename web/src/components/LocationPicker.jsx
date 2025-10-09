import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './LocationPicker.css';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const LocationMarker = ({ position, setPosition }) => {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position === null ? null : <Marker position={position} />;
};

// Component to recenter map when position changes
const RecenterMap = ({ position }) => {
  const map = useMap();
  
  useEffect(() => {
    if (position) {
      map.setView([position.lat, position.lng], 13);
    }
  }, [position, map]);

  return null;
};

const LocationPicker = ({ onLocationSelect, initialPosition = null }) => {
  const [position, setPosition] = useState(initialPosition || { lat: 32.2211, lng: 35.2544 }); // Default to Jordan
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (position) {
      reverseGeocode(position.lat, position.lng);
    }
  }, [position]);

  const reverseGeocode = async (lat, lng) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=en`
      );
      const data = await response.json();
      setAddress(data.display_name || 'Unknown location');
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      setAddress('Unable to get address');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      return;
    }

    setIsSearching(true);
    setSearchResults([]);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=jo&limit=5&accept-language=en`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        setSearchResults(data);
      } else {
        setSearchResults([]);
        alert('No results found. Try a different search term.');
      }
    } catch (error) {
      console.error('Search failed:', error);
      alert('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchResultClick = (result) => {
    const newPos = {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
    };
    setPosition(newPos);
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleUseLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPos = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          setPosition(newPos);
        },
        (error) => {
          console.error('Error getting location:', error);
          // alert('Unable to get your current location');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser');
    }
  };

  const handleConfirm = () => {
    if (onLocationSelect) {
      onLocationSelect({
        latitude: position.lat,
        longitude: position.lng,
        address: address,
      });
    }
  };

  return (
    <div className="location-picker">
      <div className="location-picker-header">
        <h3>Select Delivery Location</h3>
        <button onClick={handleUseLocation} className="use-location-btn">
          <i className="fa fa-location-arrow"></i> Use My Location
        </button>
      </div>

      {/* Search Input */}
      <div className="location-search">
        <div className="search-input-wrapper">
          <input
            type="text"
            placeholder="Search for an address (e.g., Amman, Jordan)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="search-input"
          />
          <button 
            onClick={handleSearch} 
            disabled={isSearching || !searchQuery.trim()}
            className="search-btn"
          >
            {isSearching ? (
              <i className="fa fa-spinner fa-spin"></i>
            ) : (
              <i className="fa fa-search"></i>
            )}
          </button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="search-results">
            {searchResults.map((result, index) => (
              <div
                key={index}
                className="search-result-item"
                onClick={() => handleSearchResultClick(result)}
              >
                <i className="fa fa-map-marker-alt"></i>
                <span>{result.display_name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="map-container">
        <MapContainer
          center={[position.lat, position.lng]}
          zoom={13}
          style={{ height: '400px', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <LocationMarker position={position} setPosition={setPosition} />
          <RecenterMap position={position} />
        </MapContainer>
      </div>

      <div className="location-info">
        <p className="location-instruction">
          <i className="fa fa-info-circle"></i> Click on the map to select your delivery location or search for an address
        </p>
        <div className="selected-location">
          <label>Selected Location:</label>
          {loading ? (
            <p>Loading address...</p>
          ) : (
            <p>{address}</p>
          )}
          <div className="coordinates">
            <small>Lat: {position.lat.toFixed(6)}, Lng: {position.lng.toFixed(6)}</small>
          </div>
        </div>
        <button onClick={handleConfirm} className="confirm-location-btn">
          Confirm Location
        </button>
      </div>
    </div>
  );
};

export default LocationPicker;
