require('dotenv').config();
const mysql = require('mysql2/promise');

async function createReviewTablesSimple() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'fecs_db',
      port: process.env.DB_PORT || 3306
    });

    console.log('✅ Connected to database');

    // Create tables one by one with simpler syntax
    console.log('📝 Creating product_reviews table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS product_reviews (
        id int NOT NULL AUTO_INCREMENT,
        product_id int NOT NULL,
        user_id int NOT NULL,
        order_id int NULL,
        order_item_id int NULL,
        rating tinyint(1) NOT NULL,
        title varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        review_text text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        pros text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        cons text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        is_verified_purchase tinyint(1) NOT NULL DEFAULT 0,
        is_featured tinyint(1) NOT NULL DEFAULT 0,
        is_approved tinyint(1) NOT NULL DEFAULT 1,
        helpful_count int NOT NULL DEFAULT 0,
        not_helpful_count int NOT NULL DEFAULT 0,
        admin_response text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        admin_response_at timestamp NULL,
        admin_response_by int NULL,
        created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY fk_product_reviews_product (product_id),
        KEY fk_product_reviews_user (user_id),
        KEY fk_product_reviews_order (order_id),
        KEY fk_product_reviews_order_item (order_item_id),
        KEY fk_product_reviews_admin (admin_response_by),
        INDEX idx_product_reviews_rating (rating),
        INDEX idx_product_reviews_approved (is_approved),
        INDEX idx_product_reviews_verified (is_verified_purchase),
        INDEX idx_product_reviews_featured (is_featured),
        INDEX idx_product_reviews_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('📝 Creating review_images table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS review_images (
        id int NOT NULL AUTO_INCREMENT,
        review_id int NOT NULL,
        image_url varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        alt_text varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        sort_order int DEFAULT 0,
        created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY fk_review_images_review (review_id),
        INDEX idx_review_images_sort (sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('📝 Creating review_votes table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS review_votes (
        id int NOT NULL AUTO_INCREMENT,
        review_id int NOT NULL,
        user_id int NOT NULL,
        vote_type enum('helpful','not_helpful') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY unique_user_review_vote (user_id, review_id),
        KEY fk_review_votes_review (review_id),
        KEY fk_review_votes_user (user_id),
        INDEX idx_review_votes_type (vote_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('📝 Creating product_rating_summary table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS product_rating_summary (
        id int NOT NULL AUTO_INCREMENT,
        product_id int NOT NULL,
        total_reviews int NOT NULL DEFAULT 0,
        average_rating decimal(3,2) NOT NULL DEFAULT 0.00,
        rating_1 int NOT NULL DEFAULT 0,
        rating_2 int NOT NULL DEFAULT 0,
        rating_3 int NOT NULL DEFAULT 0,
        rating_4 int NOT NULL DEFAULT 0,
        rating_5 int NOT NULL DEFAULT 0,
        verified_purchase_count int NOT NULL DEFAULT 0,
        last_review_at timestamp NULL,
        updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY unique_product_rating (product_id),
        INDEX idx_rating_summary_avg (average_rating),
        INDEX idx_rating_summary_total (total_reviews)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ Review tables created successfully');

    // Verify tables were created
    const reviewTables = ['product_reviews', 'review_images', 'review_votes', 'product_rating_summary'];
    console.log('\n📊 Verifying review system tables:');
    for (const tableName of reviewTables) {
      const [result] = await connection.execute(`SHOW TABLES LIKE '${tableName}'`);
      console.log(`  - ${tableName}: ${result.length > 0 ? '✅ EXISTS' : '❌ MISSING'}`);
    }

    await connection.end();
    console.log('✅ Database connection closed');

  } catch (error) {
    console.error('❌ Error creating review tables:', error.message);
  }
}

createReviewTablesSimple();
