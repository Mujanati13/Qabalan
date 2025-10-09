import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { categoriesAPI, branchesAPI, getCategoryImageUrl } from '../services/api';
import './Home.css';

const Home = () => {
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

  useEffect(() => {
    fetchCategories();
    fetchBranches();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      const categoriesData = response.data.data || response.data.categories || response.data || [];
      
      if (Array.isArray(categoriesData) && categoriesData.length > 0) {
        const formattedCategories = categoriesData.slice(0, 3).map(cat => ({
          id: cat.id,
          name: cat.title_en || cat.title_ar || cat.name || 'Category',
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
      
      if (Array.isArray(branchesData) && branchesData.length > 0) {
        setBranches(branchesData);
        setSelectedBranch(branchesData[0]); // Select first branch by default
        console.log('✅ Loaded branches:', branchesData);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
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
            <span>Hello</span> Welcome!
          </h1>
          <p className="subheading">
            Welcome to Qabalan bakery! Where every piece of bread is an experience 
            And our desserts will bring out the child in every one.
          </p>
          <Link to="/story" className="button-regular">
            Read about our story
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
          <h2><span>What's New</span></h2>
        </div>
        <div className="container">
          <div className="carousel-grid">
            {slides.map(slide => (
              <div key={slide.id} className="carousel-item">
                <div className="carousel-image">
                  <img src={slide.image} alt={slide.title} />
                </div>
                <div className="carousel-info">
                  <h3>{slide.title}</h3>
                  <p>{slide.description}</p>
                  <Link to={slide.link} className="button-regular">Shop Now</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="categories-section">
        <div className="section-header">
          <h2><span>Categories</span></h2>
        </div>
        <div className="container">
          <div className="categories-grid">
            <div className="category-main">
              <div className="category-card">
                <img 
                  src={categories[0].image} 
                  alt={categories[0].name}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/assets/images/placeholder.svg';
                  }}
                />
                <p className="category-title">{categories[0].name}</p>
                <div className="category-overlay">
                  <h3>{categories[0].name}</h3>
                  <div className="category-buttons">
                    <Link to={categories[0].link}>Explore</Link>
                    <Link to={categories[0].link}>Shop now</Link>
                  </div>
                </div>
              </div>
            </div>
            <div className="category-sub">
              {categories.slice(1).map(category => (
                <div key={category.id} className="category-card">
                  <img 
                    src={category.image} 
                    alt={category.name}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/assets/images/placeholder.svg';
                    }}
                  />
                  <p className="category-title">{category.name}</p>
                  <div className="category-overlay">
                    <h3>{category.name}</h3>
                    <div className="category-buttons">
                      <Link to={category.link}>Explore</Link>
                      <Link to={category.link}>Shop now</Link>
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
                <p>Select a branch to view location</p>
              </div>
            )}
          </div>

          {/* Floating Branch List Overlay */}
          <div className="branches-list-overlay">
            <div className="branches-list-header">
              <h2>Find Us</h2>
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
                    <h3>{branch.title_en || branch.title_ar || `Branch #${branch.id}`}</h3>
                    <p>{branch.address_en || branch.address_ar || 'Address not available'}</p>
                  </div>
                </div>
              ))}
            </div>

            {branches.length === 0 && (
              <div className="no-branches-placeholder">
                <i className="fa fa-store"></i>
                <p>No branches available</p>
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
          <p className="video-title">News & events</p>
          <div className="exp-btn">
            <Link to="/news">Explore all</Link>
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
