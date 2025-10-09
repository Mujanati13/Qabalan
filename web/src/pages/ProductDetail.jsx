import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productsAPI } from '../services/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import './ProductDetail.css';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [branchStock, setBranchStock] = useState(null);
  const [variants, setVariants] = useState([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProduct();
  }, [id]);

  useEffect(() => {
    if (product) {
      fetchBranchStock();
      loadProductVariants();
    }
  }, [product]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await productsAPI.getById(id);
      const productData = response.data.data;
      setProduct(productData);
      setSelectedImage(getProductImage(productData.main_image));
      
      // Don't auto-select variant here - wait for branch selection and variant loading
    } catch (err) {
      console.error('Error fetching product:', err);
      setError('Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const fetchBranchStock = async () => {
    try {
      const response = await productsAPI.getById(id);
      setBranchStock(response.data.data);
    } catch (err) {
      console.error('Error fetching branch stock:', err);
    }
  };

  const loadProductVariants = async () => {
    if (!id) return;
    
    try {
      setLoadingVariants(true);
      const response = await productsAPI.getVariants(id);
      
      console.log('Variants response:', response); // Debug log
      
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        const normalizedVariants = response.data.data.map(normalizeVariant);
        console.log('Normalized variants:', normalizedVariants); // Debug log
        setVariants(normalizedVariants);
        
        // Auto-select first available variant
        if (normalizedVariants.length > 0 && !selectedVariant) {
          const firstAvailable = normalizedVariants.find(v => isVariantAvailable(v));
          setSelectedVariant(firstAvailable || normalizedVariants[0]);
        }
      } else {
        console.log('No variants data found');
        setVariants([]);
      }
    } catch (err) {
      console.error('Error loading variants:', err);
      setVariants([]);
    } finally {
      setLoadingVariants(false);
    }
  };

  // Helper function to normalize variant data
  const normalizeVariant = (variant) => {
    const availableQuantity = Math.max(
      variant.available_quantity ?? 
      variant.branch_available_quantity ?? 
      variant.branch_stock_quantity ?? 
      variant.stock_quantity ?? 
      0, 
      0
    );

    let stockStatus = variant.stock_status;
    if (!stockStatus) {
      if (variant.branch_is_available === 0) {
        stockStatus = 'unavailable';
      } else {
        stockStatus = availableQuantity > 0 ? 'in_stock' : 'out_of_stock';
      }
    }

    return {
      ...variant,
      available_quantity: availableQuantity,
      stock_status: stockStatus
    };
  };

  // Check if variant is available
  const isVariantAvailable = (variant) => {
    if (!variant) return false;
    const status = variant.stock_status;
    return status === 'in_stock' || status === 'low_stock' || status === 'limited';
  };

  // Get variant display price
  const getVariantDisplayPrice = (variant) => {
    if (!product || !variant) return 0;
    
    const basePrice = parseFloat(branchStock?.final_price || product.sale_price || product.base_price || 0);
    
    if (variant.price_behavior === 'override' || variant.pricing_behavior === 'override') {
      return parseFloat(variant.price || variant.price_modifier || 0);
    } else {
      // Add behavior
      return basePrice + parseFloat(variant.price || variant.price_modifier || 0);
    }
  };

  const getProductImage = (image) => {
    if (!image) return '/assets/images/placeholder.svg';
    // If it's a full URL, use as is
    if (image.startsWith('http')) return image;
    // If it starts with /, it's already a path from backend
    if (image.startsWith('/')) {
      return `http://localhost:3015${image}`;
    }
    // Otherwise construct the full path
    return `http://localhost:3015/uploads/products/${image}`;
  };

  const calculatePrice = () => {
    if (!product) return 0;
    
    // If variant is selected, use variant price
    if (selectedVariant) {
      return getVariantDisplayPrice(selectedVariant);
    }
    
    let basePrice = parseFloat(product.sale_price || product.base_price || 0);
    
    // Apply branch price override if available
    if (branchStock?.branch_price_override) {
      basePrice = parseFloat(branchStock.branch_price_override);
    } else if (branchStock?.final_price) {
      basePrice = parseFloat(branchStock.final_price);
    }
    
    return basePrice;
  };

  const getStockStatus = () => {
    // If variants exist and one is selected, check variant stock
    if (variants.length > 0 && selectedVariant) {
      if (!isVariantAvailable(selectedVariant)) {
        return { status: 'out', text: 'Out of Stock', class: 'out-of-stock' };
      }
      if (selectedVariant.stock_status === 'low_stock') {
        return { status: 'low', text: 'Low Stock', class: 'low-stock' };
      }
      return { status: 'in', text: 'In Stock', class: 'in-stock' };
    }
    
    // If variants exist but none selected, check if any variant is available
    if (variants.length > 0) {
      const hasAvailable = variants.some(v => isVariantAvailable(v));
      if (!hasAvailable) {
        return { status: 'out', text: 'Out of Stock', class: 'out-of-stock' };
      }
      return { status: 'in', text: 'Select Option', class: 'in-stock' };
    }
    
    // No variants - check product stock
    if (branchStock) {
      if (branchStock.branch_is_available === 0) {
        return { status: 'unavailable', text: 'Not Available at This Branch', class: 'unavailable' };
      }
      if (branchStock.branch_stock_status === 'out_of_stock') {
        return { status: 'out', text: 'Out of Stock', class: 'out-of-stock' };
      }
      if (branchStock.branch_stock_status === 'low_stock') {
        return { status: 'low', text: 'Low Stock', class: 'low-stock' };
      }
      return { status: 'in', text: 'In Stock', class: 'in-stock' };
    }
    
    // Fallback to product-level stock
    if (product?.stock_status === 'out_of_stock') {
      return { status: 'out', text: 'Out of Stock', class: 'out-of-stock' };
    }
    if (product?.stock_status === 'limited') {
      return { status: 'low', text: 'Limited Stock', class: 'low-stock' };
    }
    return { status: 'in', text: 'In Stock', class: 'in-stock' };
  };

  const handleAddToCart = () => {
    if (!product) return;
    
    // Check if variant selection is required
    if (variants.length > 0 && !selectedVariant) {
      alert('Please select an option before adding to cart');
      return;
    }
    
    // Check if selected variant is available
    if (selectedVariant && !isVariantAvailable(selectedVariant)) {
      alert('The selected option is currently unavailable');
      return;
    }
    
    const stockStatus = getStockStatus();
    if (stockStatus.status === 'out' || stockStatus.status === 'unavailable') {
      alert('This product is not available');
      return;
    }

    const cartItem = {
      ...product,
      selectedVariant: selectedVariant,
      price: calculatePrice(),
      quantity: quantity
    };

    addToCart(cartItem, quantity, selectedVariant);
    alert('Product added to cart!');
  };

  if (loading) {
    return <div className="product-detail-loading">Loading product...</div>;
  }

  if (error || !product) {
    return <div className="product-detail-error">{error || 'Product not found'}</div>;
  }

  const stockStatus = getStockStatus();

  return (
    <div className="product-detail-page">
      <div className="container">
        <button onClick={() => navigate(-1)} className="back-button">
          ← Back to Shop
        </button>

        <div className="product-detail-content">
          {/* Product Images */}
          <div className="product-images-section">
            <div className="main-image">
              <img 
                src={selectedImage} 
                alt={product.title_en || product.title_ar || 'Product'} 
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/assets/images/placeholder.svg';
                }}
              />
            </div>
            {product.images && product.images.length > 0 && (
              <div className="thumbnail-images">
                <div
                  className={`thumbnail ${selectedImage === getProductImage(product.main_image) ? 'active' : ''}`}
                  onClick={() => setSelectedImage(getProductImage(product.main_image))}
                >
                  <img 
                    src={getProductImage(product.main_image)} 
                    alt="Main" 
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/assets/images/placeholder.svg';
                    }}
                  />
                </div>
                {product.images.map((img, index) => (
                  <div
                    key={index}
                    className={`thumbnail ${selectedImage === getProductImage(img.image_path) ? 'active' : ''}`}
                    onClick={() => setSelectedImage(getProductImage(img.image_path))}
                  >
                    <img 
                      src={getProductImage(img.image_path)} 
                      alt={`View ${index + 1}`} 
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/assets/images/placeholder.svg';
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="product-info-section">
            <h1 className="product-title">{product.title_en}</h1>
            <p className="product-category">{product.category_title_en}</p>

            <div className="product-price-section">
              <div className="price">
                <span className="current-price">{calculatePrice().toFixed(2)} JOD</span>
                {product.sale_price && parseFloat(product.sale_price) < parseFloat(product.base_price) && (
                  <span className="original-price">{parseFloat(product.base_price || 0).toFixed(2)} JOD</span>
                )}
              </div>
              <div className={`stock-badge ${stockStatus.class}`}>
                {stockStatus.text}
              </div>
            </div>

            {/* Variants */}
            {variants.length > 0 && (
              <div className="variants-section">
                <label>Select Option:</label>
                {loadingVariants ? (
                  <div className="variants-loading">Loading options...</div>
                ) : (
                  <div className="variants-grid">
                    {variants.map((variant) => {
                      const isSelected = selectedVariant?.id === variant.id;
                      const variantAvailable = isVariantAvailable(variant);
                      const availableQty = variant.available_quantity || 0;
                      const variantPrice = getVariantDisplayPrice(variant);
                      
                      return (
                        <button
                          key={variant.id}
                          className={`variant-option ${isSelected ? 'active' : ''} ${!variantAvailable ? 'unavailable' : ''}`}
                          onClick={() => variantAvailable && setSelectedVariant(variant)}
                          disabled={!variantAvailable}
                        >
                          <div className="variant-content">
                            <span className="variant-title">
                              {variant.title_en || variant.title_ar || variant.variant_value}
                            </span>
                            <span className="variant-price">
                              {variantPrice.toFixed(2)} JOD
                            </span>
                            <span className={`variant-availability ${!variantAvailable ? 'unavailable' : ''}`}>
                              {variantAvailable 
                                ? `In Stock${availableQty > 0 ? ` (${availableQty})` : ''}`
                                : 'Out of Stock'
                              }
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Quantity Selector */}
            <div className="quantity-section">
              <label>Quantity:</label>
              <div className="quantity-controls">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="qty-btn"
                >
                  -
                </button>
                <span className="qty-value">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="qty-btn"
                >
                  +
                </button>
              </div>
            </div>

            {/* Add to Cart Button */}
            <button
              onClick={handleAddToCart}
              disabled={stockStatus.status === 'out' || stockStatus.status === 'unavailable'}
              className="add-to-cart-button"
            >
              {stockStatus.status === 'out' || stockStatus.status === 'unavailable'
                ? 'Not Available'
                : `Add to Cart - ${(calculatePrice() * quantity).toFixed(2)} JOD`}
            </button>

            {/* Product Description */}
            {product.description_en && (
              <div className="product-description">
                <h3>Description</h3>
                <p>{product.description_en}</p>
              </div>
            )}

            {/* Product Details */}
            <div className="product-details">
              <h3>Product Details</h3>
              <ul>
                {product.sku && <li><strong>SKU:</strong> {product.sku}</li>}
                {product.weight && (
                  <li><strong>Weight:</strong> {product.weight} {product.weight_unit}</li>
                )}
                {product.loyalty_points > 0 && (
                  <li><strong>Loyalty Points:</strong> {product.loyalty_points}</li>
                )}
                {branchStock?.branch_stock_quantity !== undefined && (
                  <li><strong>Available at Branch:</strong> {branchStock.branch_stock_quantity} units</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
