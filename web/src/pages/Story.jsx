import './Story.css';

const Story = () => {
  const timelineEvents = [
    {
      year: '2024',
      title: 'opening the fourth branch',
      description: 'Due to Qablan Bakery pursuit of development and innovation, it has become one of the most preferred destinations in the Jordanian market, which helped us expand and open a new branch in the western regions of Amman.',
      image: '/assets/uploads/66a205d8cec4d.jpg'
    },
    {
      year: '1995',
      title: 'Qabalan Bakeries was established',
      description: 'Qabalan Bakeries was established in 1995 as a small family business. We entered the food industry inspired to make a difference in the market, and our mission was simple. To create high quality bread and delicious pastries at a reasonable price.',
      image: '/assets/uploads/65c4ce1575006.jpg'
    },
    {
      year: '2004',
      title: 'The opening of the main Bayader branch',
      description: 'The Bayader branch offered many fresh and delicious options and served to be the most loyal bakery in the Bayader Wadi Al-Seer area for the residents of the region and nearby places',
      image: '/assets/uploads/65c4ce1575006.jpg'
    },
    {
      year: '2014',
      title: 'The opening of the second Bayader branch',
      description: 'Due to the high demand for the main Al-Bayader branch and the desire to expand the service provided to the residents of the region, the second Al-Bayader branch was opened on the main street.',
      image: '/assets/uploads/66a2072450407.jpg'
    },
    {
      year: '2017',
      title: 'Renovation of the main Bayader branch',
      description: 'Developing the Bayader branch showroom to provide the best shopping experience for customers',
      image: '/assets/uploads/65cc8329917ff.jpg'
    },
    {
      year: '2021',
      title: 'The opening of the AL-Ysmin branch',
      description: 'A new bakery concept that combines a unique and convenient shopping experience with fresh and varied options',
      image: '/assets/uploads/65c498cd18a03.jpg'
    }
  ];

  return (
    <div className="story-page">
      {/* Hero Section */}
      <section className="story-hero">
        <div className="story-hero-content">
          <h1><span>know about</span> Our story</h1>
          <p className="subheading">Since the beginning</p>
        </div>
      </section>

      {/* Main Story Content */}
      <section className="story-content">
        <div className="story-grid">
          <div className="story-col-left">
            <div className="story-text-box teal-bg">
              <h2>WE CREATE DELICIOUS MEMORIES FOR YOU</h2>
              <p>
                Qabalan Bakeries value the importance of family gatherings and wish to be included in every special occasion. Not only with our bread but also with our wide range of baked goods that are made with love.
              </p>
              <img src="/assets/uploads/6735af4370822.jpg" alt="Bakery" />
            </div>
          </div>

          <div className="story-col-right">
            <div className="story-row-top">
              <img src="/assets/uploads/65cc82fec3fa8.jpg" alt="Our Staff" />
              <div className="story-text-box orange-bg">
                <h2>Our Staff</h2>
                <p>
                  Each of our products has a backstory brimming with dedication, determination and hard work, along with a team of experts in baking and desserts, whose quality and creativity has transformed eating into a unique and unparalleled experience.
                </p>
                <p>
                  All of our products are created using the best ingredients and latest tools and techniques. We deeply care about our customers' experience and are happy to provide an excellent service to keep our customers pleased. We highly respect our team of professionals and always celebrate our achievements together.
                </p>
              </div>
            </div>

            <div className="story-row-bottom">
              <div className="story-text-box beige-bg">
                <p>
                  Qabalan Bakeries is committed to making its customers happy by creating the perfect line of baked products and exceeding expectations. We excel in terms of quality, food safety and pay strong attention to detail and continue to innovate and upgrade new and existing products.
                </p>
              </div>
              <img src="/assets/uploads/65cc82f42c13e.webp" alt="Quality" />
            </div>
          </div>
        </div>
      </section>

      {/* Welcome Section */}
      <section className="story-welcome">
        <p className="story-ya">Ya hala</p>
        <h2 className="story-ya-title">WELCOME TO QABALAN BAKERY</h2>
        <div className="container">
          <div className="welcome-grid">
            <div className="welcome-text">
              <p>
                Qabalan Bakeries was established in 1995 as a small family business. We entered the food industry inspired to make a difference in the market, and our mission was simple. To create high quality bread and delicious pastries at a reasonable price.
              </p>
              <p>
                At Qabalan Bakeries, we have diversified our products to include over 500 types of premium quality bread, pastries, desserts, cakes and various nutritional food products which are all exclusive to our brand.
              </p>
            </div>
            <div className="welcome-image">
              <img src="/assets/uploads/65cc82e84c647.jpg" alt="Welcome" />
            </div>
            <div className="welcome-text">
              <p>
                We have successfully increased the efficiency of our business by investing in the best automatic production lines, tools and equipment, and, recruiting highly skilled employees who are talented and specialised in baked goods is one of our main priorities. While our bakeries have grown into one of the largest and most respected in the region, we continue to maintain our competitive value and preserve our initial mission (selling high quality products at reasonable prices).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="story-timeline">
        <div className="section-header">
          <h2><span>Timeline</span></h2>
          <p>Our history</p>
        </div>
        <div className="container">
          <div className="timeline-slider">
            {timelineEvents.map((event, index) => (
              <div key={index} className="timeline-item">
                <img src={event.image} alt={event.title} />
                <div className="timeline-content">
                  <p className="timeline-year">{event.year}</p>
                  <h3>{event.year} : {event.title}</h3>
                  <p>{event.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* News CTA Section */}
      <section className="story-events">
        <div className="container">
          <h2>Don't miss out on our latest great news and events</h2>
          <p>
            <a href="/news" className="button-regular">Explore news & Events</a>
          </p>
        </div>
      </section>
    </div>
  );
};

export default Story;
