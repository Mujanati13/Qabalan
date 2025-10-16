import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { categoriesAPI, branchesAPI, offersAPI, getCategoryImageUrl, getImageUrl } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import './Home.css';

const Home = () => {
  const { t, isArabic } = useLanguage();
  
  // Helper function to get category title based on language
  const getCategoryTitle = (category) => {
    return isArabic ? (category.title_ar || category.title_en || category.name) : (category.title_en || category.title_ar || category.name);
  };
  const [categories, setCategories] = useState([
    {
      id: 1,
      name: "Habet Barakeh",
      image: "/assets/images/placeholder.svg",
      link: "/shop"
    },
    {
      id: 2,
      name: "Ka'ak",
      image: "/assets/images/placeholder.svg",
      link: "/shop"
    },
    {
      id: 3,
      name: "Healthy Products",
      image: "/assets/images/placeholder.svg",
      link: "/shop"
    }
  ]);

  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [featuredOffers, setFeaturedOffers] = useState([]);
  const [offersError, setOffersError] = useState('');

  useEffect(() => {
    fetchCategories();
    fetchBranches();
    fetchOffers();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      const categoriesData = response.data.data || response.data.categories || response.data || [];
      
      if (Array.isArray(categoriesData) && categoriesData.length > 0) {
        const formattedCategories = categoriesData.slice(0, 3).map(cat => ({
          id: cat.id,
          title_en: cat.title_en || cat.name || 'Category',
          title_ar: cat.title_ar || cat.name || 'الفئة',
          image: getCategoryImageUrl(cat.image_url || cat.image) || '/assets/images/placeholder.svg',
          link: `/shop?category=${cat.id}`
        }));
        
        setCategories(formattedCategories);
        console.log('✅ Loaded categories:', formattedCategories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Keep default placeholder categories on error
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await branchesAPI.getAll();
      const branchesData = response.data.data || response.data.branches || response.data || [];
      
      // Filter to only show active branches
      const activeBranches = Array.isArray(branchesData) 
        ? branchesData.filter(branch => branch.is_active === 1 || branch.is_active === true)
        : [];
      
      if (activeBranches.length > 0) {
        setBranches(activeBranches);
        setSelectedBranch(activeBranches[0]); // Select first active branch by default
        console.log('✅ Loaded active branches:', activeBranches);
      } else {
        console.warn('⚠️ No active branches found');
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchOffers = async () => {
    try {
      const response = await offersAPI.getAll({ limit: 6, status: 'active' });
      console.log('📦 Offers API Response:', response);
      
      // Backend returns: { success: true, data: { offers: [...], pagination: {...} } }
      const offersData = response.data?.data?.offers || response.data?.offers || [];
      console.log('📦 Offers Data:', offersData);

      if (Array.isArray(offersData) && offersData.length > 0) {
        const mappedOffers = offersData
          .slice(0, 3)
          .map((offer) => ({
            id: offer.id,
            title: offer.title || 'Special Offer',
            description: offer.description || '',
            code: offer.code || '',
            image: getImageUrl(offer.featured_image || offer.image_url || offer.banner_image),
            startDate: offer.valid_from || offer.start_date,
            endDate: offer.valid_until || offer.end_date,
          }));

        console.log('✅ Mapped Offers:', mappedOffers);
        setFeaturedOffers(mappedOffers);
      } else {
        console.log('⚠️ No offers found or data is not an array');
        setFeaturedOffers([]);
      }
    } catch (error) {
      console.error('❌ Error fetching offers:', error);
      setOffersError('Offers are temporarily unavailable.');
    }
  };

  const slides = [
    {
      id: 1,
      title: "Healthy manakish",
      description: "Manakish with whole wheat flour, a healthy and delicious snack",
      image: "/assets/uploads/6555e55bea0f1.jpg",
      link: "/shop"
    },
    {
      id: 2,
      title: "Relax",
      description: "All you need is a cup of tea and a collection of our Arabic sweets",
      image: "/assets/uploads/6555e54ea588d.png",
      link: "/shop"
    },
    {
      id: 3,
      title: "Pastries to warm your heart",
      description: "Have a taste of our finest new collection of pastries with a cup of tea and warm up these cold nights",
      image: "/assets/uploads/6555e5bb0ce59.jpg",
      link: "/shop"
    }
  ];

  const news = [
    {
      id: 17,
      title: "ISM Middle East 2024 - Dubi",
      image: "/assets/uploads/67177cb27b765.jpeg",
      link: "/news#17"
    },
    {
      id: 16,
      title: "Opening of the fourth branch",
      image: "/assets/uploads/66a2044c3586f.jpg",
      link: "/news#16"
    },
    {
      id: 15,
      title: "ISO 22000:2018 Certification",
      image: "/assets/uploads/65c49ed61fbf8.png",
      link: "/news#15"
    },
    {
      id: 14,
      title: "Best Retail Interior Project Award",
      image: "/assets/uploads/65cc82cd79605.jpg",
      link: "/news#14"
    }
  ];

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-homepage">
        <div className="hero-content">
          <h1 className="home-title">
            {t('heroTitle')}
          </h1>
          <p className="subheading">
            {t('heroSubtitle')}
          </p>
          <Link to="/story" className="button-regular">
            {t('readOurStory')}
          </Link>
        </div>
        <a href="#whats-new" className="button-round">
          <span className="screen-reader-text">Scroll to carousel section</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="23" height="28" viewBox="0 0 23.002 27.585">
            <path d="M42.93,31.467l-9.189,9.19a2.331,2.331,0,1,1-3.3-3.3l5.19-5.19h-17.3a2.331,2.331,0,0,1,0-4.662h17.3l-5.19-5.19a2.331,2.331,0,1,1,3.3-3.3l9.187,9.188A2.33,2.33,0,0,1,42.93,31.467Z" transform="translate(41.34 -16.007) rotate(90)" fill="#fff"/>
          </svg>
        </a>
      </section>

      {/* What's New Carousel Section */}
      <section className="carousel-new" id="whats-new">
        <div className="section-header">
          <h2><span>{t('whatsNew')}</span></h2>
        </div>
        <div className="container">
          <div className="carousel-grid-new">
            {/* Large Card - Relax (Left Side) */}
            <div className="carousel-item-large">
              <img src={slides[1].image} alt={slides[1].title} />
              <div className="carousel-overlay">
                <h3>{slides[1].title}</h3>
                <p>{slides[1].description}</p>
                <Link to={slides[1].link} className="button-light">{t('shopNow')}</Link>
              </div>
            </div>
            
            {/* Small Cards - Right Side */}
            <div className="carousel-items-small">
              <div className="carousel-item-small">
                <img src={slides[0].image} alt={slides[0].title} />
                <div className="carousel-overlay-small">
                  <p className="carousel-label">{slides[0].title}</p>
                </div>
              </div>
              
              <div className="carousel-item-small">
                <img src={slides[2].image} alt={slides[2].title} />
                <div className="carousel-overlay-small">
                  <p className="carousel-label">RELAX</p>
                </div>
              </div>
              
              <div className="carousel-item-small">
                <img src={slides[2].image} alt={slides[2].title} />
                <div className="carousel-overlay-small">
                  <p className="carousel-label">{slides[2].title}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="categories-section">
        <div className="section-header">
          <h2><span>{t('shopByCategory')}</span></h2>
        </div>
        <div className="container">
          <div className="categories-grid">
            <div className="category-main">
              <div className="category-card">
                <img 
                  src={categories[0].image} 
                  alt={getCategoryTitle(categories[0])}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/assets/images/placeholder.svg';
                  }}
                />
                <p className="category-title">{getCategoryTitle(categories[0])}</p>
                <div className="category-overlay">
                  <h3>{getCategoryTitle(categories[0])}</h3>
                  <div className="category-buttons">
                    <Link to={categories[0].link}>{t('explore')}</Link>
                    <Link to={categories[0].link}>{t('shopNow')}</Link>
                  </div>
                </div>
              </div>
            </div>
            <div className="category-sub">
              {categories.slice(1).map(category => (
                <div key={category.id} className="category-card">
                  <img 
                    src={category.image} 
                    alt={getCategoryTitle(category)}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/assets/images/placeholder.svg';
                    }}
                  />
                  <p className="category-title">{getCategoryTitle(category)}</p>
                  <div className="category-overlay">
                    <h3>{getCategoryTitle(category)}</h3>
                    <div className="category-buttons">
                      <Link to={category.link}>{t('explore')}</Link>
                      <Link to={category.link}>{t('shopNow')}</Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Branch Locations Section - Map with Floating Branch List */}
      <section className="branches-map-section">
        <div className="branches-map-container">
          {/* Full Width Google Maps Background */}
          <div className="map-background">
            {selectedBranch && selectedBranch.latitude && selectedBranch.longitude ? (
              <iframe
                src={`https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d1000!2d${selectedBranch.longitude}!3d${selectedBranch.latitude}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2s`}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`Map of ${selectedBranch.title_en || selectedBranch.title_ar}`}
              ></iframe>
            ) : (
              <div className="map-placeholder">
                <i className="fa fa-map-marked-alt"></i>
                <p>{t('selectBranchToViewLocation')}</p>
              </div>
            )}
          </div>

          {/* Floating Branch List Overlay */}
          <div className="branches-list-overlay">
            <div className="branches-list-header">
              <h2>{t('findUs')}</h2>
            </div>

            <div className="branches-list-compact">
              {branches.map((branch) => (
                <div
                  key={branch.id}
                  className={`branch-compact-item ${selectedBranch?.id === branch.id ? 'active' : ''}`}
                  onClick={() => setSelectedBranch(branch)}
                >
                  <div className="branch-compact-icon">
                    <i className="fa fa-map-marker-alt"></i>
                  </div>
                  <div className="branch-compact-content">
                    <h3>{isArabic ? (branch.title_ar || branch.title_en || `${t('branch')} #${branch.id}`) : (branch.title_en || branch.title_ar || `${t('branch')} #${branch.id}`)}</h3>
                    <p>{isArabic ? (branch.address_ar || branch.address_en || t('addressNotAvailable')) : (branch.address_en || branch.address_ar || t('addressNotAvailable'))}</p>
                  </div>
                </div>
              ))}
            </div>

            {branches.length === 0 && (
              <div className="no-branches-placeholder">
                <i className="fa fa-store"></i>
                <p>{t('noBranchesAvailable')}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Video Section */}
      {/* <section className="video-section">
        <div className="video-text">
          <p className="video-title">There is a story behind every piece of bread</p>
          <p>We care about the smallest details</p>
        </div>
        <video autoPlay muted loop playsInline>
          <source src="/assets/videos/bakery.mp4" type="video/mp4" />
        </video>
      </section> */}

      {/* News & Events Section */}
      <section className="news-section-cover">
        <div className="news-text">
          <p className="video-title">{t('newsAndEvents')}</p>
          <div className="exp-btn">
            <Link to="/news">{t('exploreAll')}</Link>
          </div>
        </div>
      </section>

      <section className="news-grid-section">
        <div className="news-grid-home">
          {news.map(item => (
            <div key={item.id} className="news-card-home">
              <Link to={item.link}>
                <img src={item.image} alt={item.title} />
                <div className="news-overlay">
                  <h3>{item.title}</h3>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
