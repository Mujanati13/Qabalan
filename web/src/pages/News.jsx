import './News.css';

const News = () => {
  const newsItems = [
    {
      id: 17,
      month: "September",
      year: "2024",
      image: "/assets/uploads/67177cb27b765.jpeg",
      description: "We are happy for everyone who visited us at ISM Middle East- Dubi to learn about the latest innovations and trends in the field of sweets"
    },
    {
      id: 16,
      month: "July",
      year: "2024",
      image: "/assets/uploads/66a2044c3586f.jpg",
      description: "Qablan Bakeries Branch 4 in Rabieh"
    },
    {
      id: 15,
      month: "October",
      year: "2023",
      image: "/assets/uploads/65c49ed61fbf8.png",
      description: "Qabalan Bakery has been assessed and certified as meeting the requierment of ISO 22000:2018"
    },
    {
      id: 14,
      month: "2022",
      year: "2023",
      image: "/assets/uploads/65cc82cd79605.jpg",
      description: "Qabalan win the five stars award of \"The Best Retail Interior Project\" in Jordan for the year 2022-2023 by the Arabian Awards"
    },
    {
      id: 13,
      month: "September",
      year: "2021",
      image: "/assets/uploads/65c4a15137551.png",
      description: "Launching the first Jordanian loaf made of whole wheat and free of added sugar automatically"
    }
  ];

  return (
    <div className="news-page">
      {/* Hero Section */}
      <section className="news-hero">
        <div className="news-hero-content">
          <h1><span>Read all about</span> News & events</h1>
          <p className="subheading">Keep up with our new event and be part of it</p>
        </div>
      </section>

      {/* News Items */}
      <section className="news-content">
        {newsItems.map(item => (
          <div key={item.id} className="container news-item">
            <div className="row">
              <div className="news-date-col">
                <p className="news-day">{item.month}</p>
                <hr />
                <p className="news-year">{item.year}</p>
              </div>
              <div className="news-image-col">
                <img src={item.image} alt={item.description} className="news-image" />
              </div>
              <div className="news-text-col">
                <p className="news-description">{item.description}</p>
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
};

export default News;
