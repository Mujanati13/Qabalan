import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import api from '../services/api';

export const useBranches = () => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadBranches = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/branches');
      
      if (response.data.success) {
        // Map backend fields to frontend expected structure
        const mappedBranches = Array.isArray(response.data.data) ? 
          response.data.data.map(branch => ({
            ...branch,
            name: branch.title_en || branch.name,
            code: branch.code || (branch.title_en ? branch.title_en.substring(0, 4).toUpperCase() : 'UNKN'),
            address: branch.address_en || branch.address_ar || branch.address,
            is_active: branch.is_active === 1 || branch.is_active === true
          })) : [];
        
        setBranches(mappedBranches);
        return mappedBranches;
      } else {
        // Fallback to mock data for development
        const mockBranches = [
          {
            id: 1,
            name: 'Main Branch',
            code: 'MAIN',
            title_en: 'Main Branch',
            title_ar: 'الفرع الرئيسي',
            location: 'Downtown',
            address: '123 Main St, City Center',
            address_en: '123 Main St, City Center',
            address_ar: '123 شارع الرئيسي، وسط المدينة',
            phone: '+962-6-1234567',
            email: 'main@company.com',
            manager: 'John Doe',
            is_active: true,
            latitude: 31.9454,
            longitude: 35.9284,
            created_at: '2024-01-01T00:00:00Z'
          },
          {
            id: 2,
            name: 'West Branch',
            code: 'WEST',
            title_en: 'West Branch',
            title_ar: 'الفرع الغربي',
            location: 'West District',
            address: '456 West Ave, West District',
            address_en: '456 West Ave, West District',
            address_ar: '456 شارع الغرب، المنطقة الغربية',
            phone: '+962-6-2345678',
            email: 'west@company.com',
            manager: 'Jane Smith',
            is_active: true,
            latitude: 31.9394,
            longitude: 35.8714,
            created_at: '2024-01-02T00:00:00Z'
          },
          {
            id: 3,
            name: 'East Branch',
            code: 'EAST',
            title_en: 'East Branch',
            title_ar: 'الفرع الشرقي',
            location: 'East District',
            address: '789 East Blvd, East District',
            address_en: '789 East Blvd, East District',
            address_ar: '789 شارع الشرق، المنطقة الشرقية',
            phone: '+962-6-3456789',
            email: 'east@company.com',
            manager: 'Mike Johnson',
            is_active: false,
            latitude: 31.9594,
            longitude: 35.9484,
            created_at: '2024-01-03T00:00:00Z'
          }
        ];
        setBranches(mockBranches);
        return mockBranches;
      }
    } catch (err) {
      console.error('Error loading branches:', err);
      setError(err);
      
      // Fallback to mock data on error
      const mockBranches = [
        {
          id: 1,
          name: 'Main Branch',
          code: 'MAIN',
          title_en: 'Main Branch',
          title_ar: 'الفرع الرئيسي',
          is_active: true
        }
      ];
      setBranches(mockBranches);
      return mockBranches;
    } finally {
      setLoading(false);
    }
  }, []);

  const createBranch = useCallback(async (branchData) => {
    try {
      setLoading(true);
      const response = await api.post('/branches', {
        title_en: branchData.name,
        title_ar: branchData.name_ar || branchData.name,
        phone: branchData.phone,
        email: branchData.email,
        address_en: branchData.address,
        address_ar: branchData.address_ar || branchData.address,
        latitude: branchData.latitude,
        longitude: branchData.longitude,
        is_active: branchData.is_active
      });
      
      if (response.data.success) {
        message.success('Branch created successfully');
        await loadBranches(); // Refresh the list
        return response.data.data;
      }
    } catch (error) {
      console.error('Error creating branch:', error);
      message.error('Failed to create branch');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [loadBranches]);

  const updateBranch = useCallback(async (branchId, branchData) => {
    try {
      setLoading(true);
      const response = await api.put(`/branches/${branchId}`, {
        title_en: branchData.name,
        title_ar: branchData.name_ar || branchData.name,
        phone: branchData.phone,
        email: branchData.email,
        address_en: branchData.address,
        address_ar: branchData.address_ar || branchData.address,
        latitude: branchData.latitude,
        longitude: branchData.longitude,
        is_active: branchData.is_active
      });
      
      if (response.data.success) {
        message.success('Branch updated successfully');
        await loadBranches(); // Refresh the list
        return response.data.data;
      }
    } catch (error) {
      console.error('Error updating branch:', error);
      message.error('Failed to update branch');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [loadBranches]);

  const deleteBranch = useCallback(async (branchId) => {
    try {
      setLoading(true);
      await api.delete(`/branches/${branchId}`);
      message.success('Branch deleted successfully');
      await loadBranches(); // Refresh the list
    } catch (error) {
      console.error('Error deleting branch:', error);
      message.error('Failed to delete branch');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [loadBranches]);

  const getActiveBranches = useCallback(() => {
    return branches.filter(branch => branch.is_active);
  }, [branches]);

  const getBranchById = useCallback((branchId) => {
    return branches.find(branch => branch.id === branchId);
  }, [branches]);

  // Auto-load branches on hook initialization
  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  return {
    branches,
    loading,
    error,
    loadBranches,
    createBranch,
    updateBranch,
    deleteBranch,
    getActiveBranches,
    getBranchById
  };
};

export default useBranches;
