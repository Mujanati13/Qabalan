# FECS E-commerce Admin Dashboard - Type Definitions

This directory contains type definitions (using JSDoc comments) for the FECS e-commerce admin dashboard. These definitions help with code documentation, IDE support, and can be easily converted to TypeScript interfaces if needed.

## Files Overview

### `category.js`
Contains type definitions for categories including:
- `Category` - Main category object structure
- `CategoryFormData` - Data structure for category forms
- `CategoryTreeNode` - Tree view structure for hierarchical categories
- `CategoryCreateRequest` / `CategoryUpdateRequest` - API request structures
- `CategoryResponse` - API response structure
- `CategoryListParams` - Query parameters for category lists
- `CategoryStatus` - Status enum type

### `product.js`
Contains type definitions for products including:
- `Product` - Main product object structure
- `ProductAttribute` - Product attributes structure
- `ProductImage` - Product images structure
- `BranchInventory` - Branch inventory data
- `ProductFormData` - Data structure for product forms
- `BranchAssignment` - Branch assignment data
- `ProductResponse` - API response structure
- `ProductListParams` - Query parameters for product lists
- `ProductStatus` / `StockStatus` - Status enum types
- `ProductSortField` / `SortOrder` - Sorting options

### `branch.js`
Contains type definitions for branches including:
- `Branch` - Main branch object structure
- `BranchFormData` - Data structure for branch forms
- `BranchResponse` - API response structure
- `BranchListParams` - Query parameters for branch lists
- `BranchStatus` - Status enum type

### `index.js`
Main export file containing:
- Common API response structures
- Pagination metadata types
- Authentication user types
- Application-wide enum types (language, theme)
- General utility types

## Usage

These type definitions are documented using JSDoc comments and can be used for:

1. **IDE Support**: Better autocomplete and IntelliSense
2. **Documentation**: Clear contracts for data structures
3. **Code Quality**: Type safety through JSDoc annotations
4. **Future Migration**: Easy conversion to TypeScript

### Example Usage

```javascript
/**
 * Fetch categories from API
 * @param {CategoryListParams} params - Query parameters
 * @returns {Promise<CategoryResponse>} API response with categories
 */
async function fetchCategories(params) {
  // Implementation
}

/**
 * Handle category form submission
 * @param {CategoryFormData} formData - Category form data
 */
function handleCategorySubmit(formData) {
  // Implementation
}
```

## TypeScript Migration

To convert to TypeScript, replace JSDoc comments with actual TypeScript interfaces:

```typescript
// Instead of JSDoc @typedef
export interface Category {
  id: number;
  title_ar: string;
  title_en: string;
  // ... other properties
}
```

## Schema Alignment

These type definitions are aligned with the database schema defined in `improved_schema.sql` and match the API responses from the backend routes.
