import api from './api';

const locationsService = {
  // Cities
  getCities: async (params = {}) => {
    const response = await api.get('/locations/cities', { params });
    return response.data;
  },

  getCityById: async (id) => {
    const response = await api.get(`/locations/cities/${id}`);
    return response.data;
  },

  createCity: async (cityData) => {
    const response = await api.post('/locations/cities', cityData);
    return response.data;
  },

  updateCity: async (id, cityData) => {
    const response = await api.put(`/locations/cities/${id}`, cityData);
    return response.data;
  },

  deleteCity: async (id) => {
    const response = await api.delete(`/locations/cities/${id}`);
    return response.data;
  },

  // Areas
  getAreas: async (params = {}) => {
    const response = await api.get('/locations/areas', { params });
    return response.data;
  },

  getAreaById: async (id) => {
    const response = await api.get(`/locations/areas/${id}`);
    return response.data;
  },

  createArea: async (areaData) => {
    const response = await api.post('/locations/areas', areaData);
    return response.data;
  },

  updateArea: async (id, areaData) => {
    const response = await api.put(`/locations/areas/${id}`, areaData);
    return response.data;
  },

  deleteArea: async (id) => {
    const response = await api.delete(`/locations/areas/${id}`);
    return response.data;
  },

  // Streets
  getStreets: async (params = {}) => {
    const response = await api.get('/locations/streets', { params });
    return response.data;
  },

  createStreet: async (streetData) => {
    const response = await api.post('/locations/streets', streetData);
    return response.data;
  },

  updateStreet: async (id, streetData) => {
    const response = await api.put(`/locations/streets/${id}`, streetData);
    return response.data;
  },

  deleteStreet: async (id) => {
    const response = await api.delete(`/locations/streets/${id}`);
    return response.data;
  },

  // Quick access methods for dropdowns
  getCitiesForDropdown: async () => {
    const response = await api.get('/addresses/locations/cities');
    return response.data;
  },

  getAreasForDropdown: async (cityId) => {
    const response = await api.get(`/addresses/locations/areas/${cityId}`);
    return response.data;
  },

  getStreetsForDropdown: async (areaId) => {
    const response = await api.get(`/addresses/locations/streets/${areaId}`);
    return response.data;
  }
};

export default locationsService;
