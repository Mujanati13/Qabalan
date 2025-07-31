import { useState, useMemo } from 'react';

/**
 * Custom hook for advanced table sorting with multi-column support
 * Features:
 * - Toggle between ascending and descending on repeated clicks
 * - Secondary sorting when primary column values match
 * - Support for custom comparators
 * - Date, number, and string sorting
 * - Null/undefined value handling
 */
export const useTableSorting = (data = [], defaultSorting = []) => {
  // Sorting state: array of sort objects { key, direction, comparator }
  const [sortConfig, setSortConfig] = useState(defaultSorting);

  // Default comparators for different data types
  const defaultComparators = {
    string: (a, b, direction) => {
      const aVal = (a || '').toString().toLowerCase();
      const bVal = (b || '').toString().toLowerCase();
      const result = aVal.localeCompare(bVal);
      return direction === 'asc' ? result : -result;
    },
    
    number: (a, b, direction) => {
      const aVal = parseFloat(a) || 0;
      const bVal = parseFloat(b) || 0;
      const result = aVal - bVal;
      return direction === 'asc' ? result : -result;
    },
    
    date: (a, b, direction) => {
      const aVal = new Date(a).getTime() || 0;
      const bVal = new Date(b).getTime() || 0;
      const result = aVal - bVal;
      return direction === 'asc' ? result : -result;
    },
    
    currency: (a, b, direction) => {
      // Handle currency strings like "$123.45" or numbers
      const aVal = typeof a === 'string' ? 
        parseFloat(a.replace(/[$,]/g, '')) || 0 : 
        parseFloat(a) || 0;
      const bVal = typeof b === 'string' ? 
        parseFloat(b.replace(/[$,]/g, '')) || 0 : 
        parseFloat(b) || 0;
      const result = aVal - bVal;
      return direction === 'asc' ? result : -result;
    }
  };

  // Function to get nested property value
  const getNestedValue = (obj, path) => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  // Handle column sort
  const handleSort = (columnKey, comparatorType = 'string', customComparator = null) => {
    setSortConfig(prevConfig => {
      const existingIndex = prevConfig.findIndex(sort => sort.key === columnKey);
      
      if (existingIndex >= 0) {
        // Column is already being sorted
        const existingSort = prevConfig[existingIndex];
        const newConfig = [...prevConfig];
        
        if (existingSort.direction === 'asc') {
          // Change to descending
          newConfig[existingIndex] = {
            ...existingSort,
            direction: 'desc'
          };
        } else {
          // Remove this sort (third click removes sorting)
          newConfig.splice(existingIndex, 1);
        }
        
        return newConfig;
      } else {
        // Add new sort as primary (first in array)
        const newSort = {
          key: columnKey,
          direction: 'asc',
          comparator: customComparator || defaultComparators[comparatorType] || defaultComparators.string
        };
        
        // Add to beginning to make it primary sort
        return [newSort, ...prevConfig];
      }
    });
  };

  // Sort data based on current sort configuration
  const sortedData = useMemo(() => {
    if (!data || data.length === 0 || sortConfig.length === 0) {
      return data;
    }

    return [...data].sort((a, b) => {
      // Apply sorts in order (primary first, then secondary, etc.)
      for (const sort of sortConfig) {
        const aValue = getNestedValue(a, sort.key);
        const bValue = getNestedValue(b, sort.key);
        
        const result = sort.comparator(aValue, bValue, sort.direction);
        
        // If values are different, return the result
        if (result !== 0) {
          return result;
        }
        
        // If values are equal, continue to next sort criteria
      }
      
      // If all sort criteria are equal, maintain original order
      return 0;
    });
  }, [data, sortConfig]);

  // Get sort indicator for a column
  const getSortIndicator = (columnKey) => {
    const sortIndex = sortConfig.findIndex(sort => sort.key === columnKey);
    if (sortIndex === -1) return null;
    
    const sort = sortConfig[sortIndex];
    const isPrimary = sortIndex === 0;
    
    return {
      direction: sort.direction,
      isPrimary,
      index: sortIndex + 1 // 1-based index for display
    };
  };

  // Clear all sorting
  const clearSorting = () => {
    setSortConfig([]);
  };

  // Set specific sorting configuration
  const setSorting = (newConfig) => {
    setSortConfig(newConfig);
  };

  // Get column props for Ant Design Table
  const getColumnSortProps = (columnKey, comparatorType = 'string', customComparator = null) => {
    const sortIndicator = getSortIndicator(columnKey);
    
    return {
      className: sortIndicator ? 'column-sorted' : '',
      onHeaderCell: () => ({
        onClick: () => handleSort(columnKey, comparatorType, customComparator),
        style: { 
          cursor: 'pointer',
          userSelect: 'none',
          position: 'relative'
        }
      }),
      sorter: true, // Enable Ant Design's built-in sort indicator
      sortOrder: sortIndicator ? (sortIndicator.direction === 'asc' ? 'ascend' : 'descend') : false,
    };
  };

  return {
    sortedData,
    sortConfig,
    handleSort,
    getSortIndicator,
    clearSorting,
    setSorting,
    getColumnSortProps
  };
};
