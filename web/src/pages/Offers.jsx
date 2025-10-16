import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { offersAPI, getImageUrl } from '../services/api';
import './Offers.css';

const Offers = () => {
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOffers = async () => {
      setIsLoading(true);
      setError('');

      try {
        const { data } = await offersAPI.getAll();
        const items = Array.isArray(data?.offers) ? data.offers : Array.isArray(data?.data?.offers) ? data.data.offers : [];
        setOffers(items);
      } catch (err) {
        console.error('Failed to load offers', err);
        setError('We\'re having trouble loading offers right now. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOffers();
  }, []);

  const sortedOffers = useMemo(() => {
    if (!Array.isArray(offers)) return [];
    
    return [...offers].sort((a, b) => {
      const dateA = a?.valid_from ? new Date(a.valid_from) : a?.start_date ? new Date(a.start_date) : null;
      const dateB = b?.valid_from ? new Date(b.valid_from) : b?.start_date ? new Date(b.start_date) : null;

      if (dateA && dateB) {
        return dateB - dateA;
      }

      if (dateA) return -1;
      if (dateB) return 1;
      return (b?.id ?? 0) - (a?.id ?? 0);
    });
  }, [offers]);

  return (
    <div className="offers-page">
      <section className="offers-listing">
        <div className="section-header">
          <h2>Special Offers</h2>
        </div>

        {isLoading && <p className="offers-status">Loading offers...</p>}
        {error && !isLoading && <p className="offers-status error">{error}</p>}

        {!isLoading && !error && sortedOffers.length === 0 && (
          <p className="offers-status">No offers are available at the moment. Check back soon!</p>
        )}

        <div className="offers-grid">
          {sortedOffers.map((offer) => {
            const imagePath = offer?.featured_image || offer?.image_url || offer?.banner_image;
            const imageUrl = imagePath ? getImageUrl(imagePath) : null;
            
            const startDate = offer?.valid_from ? new Date(offer.valid_from) : offer?.start_date ? new Date(offer.start_date) : null;
            const endDate = offer?.valid_until ? new Date(offer.valid_until) : offer?.end_date ? new Date(offer.end_date) : null;
            const rawMinimum = offer?.min_order_amount || offer?.minimum_order_value;
            const minimumOrderValue =
              typeof rawMinimum === 'number'
                ? rawMinimum
                : rawMinimum !== undefined && rawMinimum !== null
                  ? Number(rawMinimum)
                  : null;

            const discountLabel = (() => {
              if (!offer?.discount_type) return null;
              const rawValue = offer?.discount_value;
              const discountValue =
                typeof rawValue === 'number'
                  ? rawValue
                  : rawValue !== undefined && rawValue !== null
                    ? Number(rawValue)
                    : null;

              switch (offer.discount_type) {
                case 'percentage':
                  return discountValue !== null && !Number.isNaN(discountValue)
                    ? `${discountValue}% OFF`
                    : null;
                case 'fixed':
                case 'fixed_amount':
                  return discountValue !== null && !Number.isNaN(discountValue)
                    ? `${discountValue.toLocaleString()} JOD OFF`
                    : null;
                case 'free_shipping':
                  return 'Free Delivery';
                case 'bxgy':
                  return 'Buy X Get Y';
                default:
                  return null;
              }
            })();

            const handleOfferClick = () => {
              // If offer has a promo code, navigate to products with the code
              if (offer.code) {
                navigate(`/products?promo=${offer.code}`);
              } else {
                // Otherwise just navigate to products
                navigate('/products');
              }
            };

            return (
              <article 
                key={offer.id} 
                className="offer-card"
                onClick={handleOfferClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOfferClick();
                  }
                }}
              >
                {imageUrl && (
                  <div className="offer-card-image">
                    <img 
                      src={imageUrl} 
                      alt={offer.title || 'Special offer'} 
                      loading="lazy"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.style.background = 'linear-gradient(135deg, rgba(229, 206, 181, 0.5), rgba(180, 138, 89, 0.3))';
                      }}
                    />
                  </div>
                )}
                <div className="offer-card-content">
                  <div className="offer-header">
                    {discountLabel && <span className="offer-badge">{discountLabel}</span>}
                    <h3>{offer.title || 'Special Offer'}</h3>
                  </div>
                  {offer.description && <p className="offer-description">{offer.description}</p>}
                  <ul className="offer-details">
                    {offer.code && (
                      <li>
                        <span className="label">Code</span>
                        <span className="value code">{offer.code}</span>
                      </li>
                    )}
                    {minimumOrderValue !== null && !Number.isNaN(minimumOrderValue) && minimumOrderValue > 0 && (
                      <li>
                        <span className="label">Min. Order</span>
                        <span className="value">{minimumOrderValue.toLocaleString()} JOD</span>
                      </li>
                    )}
                    {(startDate || endDate) && (
                      <li>
                        <span className="label">Valid Until</span>
                        <span className="value">
                          {endDate ? endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Limited time'}
                        </span>
                      </li>
                    )}
                  </ul>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default Offers;
