import './Recipes.css';

const Recipes = () => {
  const featuredRecipes = [
    {
      id: 42,
      title: "Cheese pie",
      image: "/assets/uploads/64f5836d15b97.jpg"
    },
    {
      id: 41,
      title: "Bread pudding",
      image: "/assets/uploads/64f582706fdbd.jpg"
    },
    {
      id: 40,
      title: "Chicken sambousek tray",
      image: "/assets/uploads/64f5821ac45f3.jpg"
    }
  ];

  return (
    <div className="recipes-page">
      {/* Hero Section */}
      <section className="recipes-hero">
        <div className="recipes-hero-content">
          <h1><span>Getting creative</span> Our recipes</h1>
          <p className="subheading">Delicious recipes with fresh Qabalan products</p>
        </div>
      </section>

      {/* Featured Recipes Section */}
      <section className="recipes-featured">
        <div className="recipes-background">
          <div className="section-header">
            <h2><span>Featured</span></h2>
            <p>Recipes</p>
          </div>
          <div className="container">
            <div className="recipes-grid">
              {featuredRecipes.map(recipe => (
                <div key={recipe.id} className="recipe-card">
                  <a href={`/recipes/${recipe.id}`}>
                    <img src={recipe.image} alt={recipe.title} className="recipe-image" />
                    <p className="recipe-title">{recipe.title}</p>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Recipes;
