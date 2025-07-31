/**
 * URL Generator Utility for FECS Web Client
 * Generates shareable links for offers and products
 */

class URLGenerator {
  constructor() {
    this.baseUrl = import.meta.env.VITE_SHARE_URL || window.location.origin;
    this.apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  }

  /**
   * Generate offer URL
   * @param {string|object} offer - Offer ID or offer object
   * @param {object} options - Additional options
   * @returns {string} Generated URL
   */
  generateOfferURL(offer, options = {}) {
    const offerId = typeof offer === 'object' ? offer.id : offer;
    const {
      utm_source = 'share',
      utm_medium = 'direct',
      utm_campaign = 'offer_share',
      ref = null,
      track = true
    } = options;

    let url = `${this.baseUrl}/offer/${offerId}`;
    const params = new URLSearchParams();

    // Add UTM parameters for tracking
    if (track) {
      params.append('utm_source', utm_source);
      params.append('utm_medium', utm_medium);
      params.append('utm_campaign', utm_campaign);
    }

    // Add referral code if provided
    if (ref) {
      params.append('ref', ref);
    }

    // Add offer-specific parameters
    if (typeof offer === 'object') {
      if (offer.discount) {
        params.append('discount', offer.discount);
      }
      if (offer.validUntil) {
        params.append('expires', new Date(offer.validUntil).getTime());
      }
    }

    const queryString = params.toString();
    return queryString ? `${url}?${queryString}` : url;
  }

  /**
   * Generate product URL
   * @param {string|object} product - Product ID or product object
   * @param {object} options - Additional options
   * @returns {string} Generated URL
   */
  generateProductURL(product, options = {}) {
    const productId = typeof product === 'object' ? product.id : product;
    const {
      utm_source = 'share',
      utm_medium = 'direct',
      utm_campaign = 'product_share',
      ref = null,
      track = true,
      variant = null
    } = options;

    let url = `${this.baseUrl}/product/${productId}`;
    const params = new URLSearchParams();

    // Add UTM parameters for tracking
    if (track) {
      params.append('utm_source', utm_source);
      params.append('utm_medium', utm_medium);
      params.append('utm_campaign', utm_campaign);
    }

    // Add referral code if provided
    if (ref) {
      params.append('ref', ref);
    }

    // Add variant if specified
    if (variant) {
      params.append('variant', variant);
    }

    // Add product-specific parameters
    if (typeof product === 'object') {
      if (product.category) {
        params.append('cat', product.category);
      }
    }

    const queryString = params.toString();
    return queryString ? `${url}?${queryString}` : url;
  }

  /**
   * Generate category URL
   * @param {string|object} category - Category ID or category object
   * @param {object} options - Additional options
   * @returns {string} Generated URL
   */
  generateCategoryURL(category, options = {}) {
    const categoryId = typeof category === 'object' ? category.id : category;
    const {
      utm_source = 'share',
      utm_medium = 'direct',
      utm_campaign = 'category_share',
      ref = null,
      track = true,
      sort = null,
      filter = null
    } = options;

    let url = `${this.baseUrl}/category/${categoryId}`;
    const params = new URLSearchParams();

    // Add UTM parameters for tracking
    if (track) {
      params.append('utm_source', utm_source);
      params.append('utm_medium', utm_medium);
      params.append('utm_campaign', utm_campaign);
    }

    // Add referral code if provided
    if (ref) {
      params.append('ref', ref);
    }

    // Add sorting and filtering
    if (sort) {
      params.append('sort', sort);
    }

    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        params.append(`filter_${key}`, value);
      });
    }

    const queryString = params.toString();
    return queryString ? `${url}?${queryString}` : url;
  }

  /**
   * Generate search URL
   * @param {string} query - Search query
   * @param {object} options - Additional options
   * @returns {string} Generated URL
   */
  generateSearchURL(query, options = {}) {
    const {
      utm_source = 'share',
      utm_medium = 'direct',
      utm_campaign = 'search_share',
      ref = null,
      track = true,
      filters = {}
    } = options;

    let url = `${this.baseUrl}/search`;
    const params = new URLSearchParams();

    // Add search query
    params.append('q', query);

    // Add UTM parameters for tracking
    if (track) {
      params.append('utm_source', utm_source);
      params.append('utm_medium', utm_medium);
      params.append('utm_campaign', utm_campaign);
    }

    // Add referral code if provided
    if (ref) {
      params.append('ref', ref);
    }

    // Add filters
    Object.entries(filters).forEach(([key, value]) => {
      params.append(key, value);
    });

    return `${url}?${params.toString()}`;
  }

  /**
   * Generate QR code URL for any link
   * @param {string} url - URL to encode
   * @param {object} options - QR code options
   * @returns {string} QR code image URL
   */
  generateQRCodeURL(url, options = {}) {
    const {
      size = 200,
      format = 'png',
      errorCorrection = 'M',
      margin = 4
    } = options;

    // Using QR Server API (free service)
    const qrParams = new URLSearchParams({
      data: url,
      size: `${size}x${size}`,
      format: format,
      ecc: errorCorrection,
      margin: margin
    });

    return `https://api.qrserver.com/v1/create-qr-code/?${qrParams.toString()}`;
  }

  /**
   * Generate short URL (placeholder for URL shortening service)
   * @param {string} longUrl - Long URL to shorten
   * @param {object} options - Shortening options
   * @returns {Promise<string>} Shortened URL
   */
  async generateShortURL(longUrl, options = {}) {
    const {
      customAlias = null,
      expirationDate = null
    } = options;

    try {
      // This would integrate with a URL shortening service like bit.ly, tinyurl, etc.
      // For now, return a mock shortened URL
      const response = await fetch(`${this.apiUrl}/urls/shorten`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: longUrl,
          alias: customAlias,
          expires: expirationDate
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.shortUrl;
      } else {
        // Fallback to original URL if service fails
        return longUrl;
      }
    } catch (error) {
      console.error('Error shortening URL:', error);
      return longUrl;
    }
  }

  /**
   * Generate social sharing URLs
   * @param {string} url - URL to share
   * @param {object} content - Content for sharing
   * @returns {object} Social media sharing URLs
   */
  generateSocialURLs(url, content = {}) {
    const {
      title = 'Check out this amazing offer!',
      description = 'Discover great deals and products.',
      image = '',
      hashtags = ['FECS', 'deals', 'bakery']
    } = content;

    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);
    const encodedDescription = encodeURIComponent(description);
    const encodedHashtags = hashtags.map(tag => encodeURIComponent(tag)).join(',');

    return {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}&hashtags=${encodedHashtags}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      whatsapp: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      pinterest: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedDescription}${image ? `&media=${encodeURIComponent(image)}` : ''}`,
      reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
      email: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%0A%0A${encodedUrl}`
    };
  }

  /**
   * Parse URL parameters
   * @param {string} url - URL to parse
   * @returns {object} Parsed parameters
   */
  parseURLParams(url = window.location.href) {
    const urlObj = new URL(url);
    const params = {};

    for (const [key, value] of urlObj.searchParams.entries()) {
      params[key] = value;
    }

    return {
      path: urlObj.pathname,
      params: params,
      utm: {
        source: params.utm_source,
        medium: params.utm_medium,
        campaign: params.utm_campaign,
        term: params.utm_term,
        content: params.utm_content
      },
      ref: params.ref,
      hash: urlObj.hash
    };
  }

  /**
   * Track URL click
   * @param {string} url - URL that was clicked
   * @param {object} metadata - Additional tracking data
   */
  async trackClick(url, metadata = {}) {
    try {
      await fetch(`${this.apiUrl}/analytics/url-click`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          referrer: document.referrer,
          ...metadata
        })
      });
    } catch (error) {
      console.error('Error tracking URL click:', error);
    }
  }

  /**
   * Generate deep link for mobile app
   * @param {string} type - Type of content (offer, product, category)
   * @param {string} id - Content ID
   * @param {object} options - Additional options
   * @returns {string} Deep link URL
   */
  generateDeepLink(type, id, options = {}) {
    const {
      fallbackUrl = null,
      campaign = 'web_to_app'
    } = options;

    // Custom URL scheme for the mobile app
    const deepLink = `fecs://${type}/${id}?campaign=${campaign}`;
    
    // Return universal link format that handles both app and web
    const universalLink = `${this.baseUrl}/${type}/${id}?app=true&campaign=${campaign}`;
    
    return {
      deepLink: deepLink,
      universalLink: universalLink,
      fallbackUrl: fallbackUrl || universalLink
    };
  }
}

// Create and export singleton instance
const urlGenerator = new URLGenerator();

export default urlGenerator;

// Export convenience functions
export const {
  generateOfferURL,
  generateProductURL,
  generateCategoryURL,
  generateSearchURL,
  generateQRCodeURL,
  generateShortURL,
  generateSocialURLs,
  parseURLParams,
  trackClick,
  generateDeepLink
} = urlGenerator;
