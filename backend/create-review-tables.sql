-- Create missing review system tables with MySQL compatible syntax

-- Product reviews table
CREATE TABLE IF NOT EXISTS `product_reviews` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `user_id` int NOT NULL,
  `order_id` int NULL,
  `order_item_id` int NULL,
  `rating` tinyint(1) NOT NULL,
  `title` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `review_text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `pros` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `cons` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_verified_purchase` tinyint(1) NOT NULL DEFAULT '0',
  `is_featured` tinyint(1) NOT NULL DEFAULT '0',
  `is_approved` tinyint(1) NOT NULL DEFAULT '1',
  `helpful_count` int NOT NULL DEFAULT '0',
  `not_helpful_count` int NOT NULL DEFAULT '0',
  `admin_response` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `admin_response_at` timestamp NULL,
  `admin_response_by` int NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_product_reviews_product` (`product_id`),
  KEY `fk_product_reviews_user` (`user_id`),
  KEY `fk_product_reviews_order` (`order_id`),
  KEY `fk_product_reviews_order_item` (`order_item_id`),
  KEY `fk_product_reviews_admin` (`admin_response_by`),
  INDEX `idx_product_reviews_rating` (`rating`),
  INDEX `idx_product_reviews_approved` (`is_approved`),
  INDEX `idx_product_reviews_verified` (`is_verified_purchase`),
  INDEX `idx_product_reviews_featured` (`is_featured`),
  INDEX `idx_product_reviews_created` (`created_at`),
  UNIQUE KEY `unique_user_product_order` (`user_id`, `product_id`, `order_item_id`),
  CONSTRAINT `fk_product_reviews_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_product_reviews_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_product_reviews_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_product_reviews_order_item` FOREIGN KEY (`order_item_id`) REFERENCES `order_items` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_product_reviews_admin` FOREIGN KEY (`admin_response_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Review images table
CREATE TABLE IF NOT EXISTS `review_images` (
  `id` int NOT NULL AUTO_INCREMENT,
  `review_id` int NOT NULL,
  `image_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `alt_text` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `sort_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_review_images_review` (`review_id`),
  INDEX `idx_review_images_sort` (`sort_order`),
  CONSTRAINT `fk_review_images_review` FOREIGN KEY (`review_id`) REFERENCES `product_reviews` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Review votes (helpful/not helpful)
CREATE TABLE IF NOT EXISTS `review_votes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `review_id` int NOT NULL,
  `user_id` int NOT NULL,
  `vote_type` enum('helpful','not_helpful') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_review_vote` (`user_id`, `review_id`),
  KEY `fk_review_votes_review` (`review_id`),
  KEY `fk_review_votes_user` (`user_id`),
  INDEX `idx_review_votes_type` (`vote_type`),
  CONSTRAINT `fk_review_votes_review` FOREIGN KEY (`review_id`) REFERENCES `product_reviews` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_review_votes_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Product rating summary (denormalized for performance)
CREATE TABLE IF NOT EXISTS `product_rating_summary` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `total_reviews` int NOT NULL DEFAULT '0',
  `average_rating` decimal(3,2) NOT NULL DEFAULT '0.00',
  `rating_1` int NOT NULL DEFAULT '0',
  `rating_2` int NOT NULL DEFAULT '0',
  `rating_3` int NOT NULL DEFAULT '0',
  `rating_4` int NOT NULL DEFAULT '0',
  `rating_5` int NOT NULL DEFAULT '0',
  `verified_purchase_count` int NOT NULL DEFAULT '0',
  `last_review_at` timestamp NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_product_rating` (`product_id`),
  INDEX `idx_rating_summary_avg` (`average_rating`),
  INDEX `idx_rating_summary_total` (`total_reviews`),
  CONSTRAINT `fk_rating_summary_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- TRIGGERS FOR AUTOMATIC RATING SUMMARY UPDATES
-- =============================================================================

-- Trigger to update product rating summary when a review is added
DELIMITER $$
CREATE TRIGGER IF NOT EXISTS `update_rating_summary_after_insert` 
AFTER INSERT ON `product_reviews` 
FOR EACH ROW
BEGIN
  INSERT INTO product_rating_summary (product_id, total_reviews, average_rating, rating_1, rating_2, rating_3, rating_4, rating_5, verified_purchase_count, last_review_at)
  VALUES (NEW.product_id, 0, 0.00, 0, 0, 0, 0, 0, 0, NOW())
  ON DUPLICATE KEY UPDATE
    total_reviews = (
      SELECT COUNT(*) 
      FROM product_reviews 
      WHERE product_id = NEW.product_id AND is_approved = 1
    ),
    average_rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM product_reviews 
      WHERE product_id = NEW.product_id AND is_approved = 1
    ),
    rating_1 = (
      SELECT COUNT(*) 
      FROM product_reviews 
      WHERE product_id = NEW.product_id AND rating = 1 AND is_approved = 1
    ),
    rating_2 = (
      SELECT COUNT(*) 
      FROM product_reviews 
      WHERE product_id = NEW.product_id AND rating = 2 AND is_approved = 1
    ),
    rating_3 = (
      SELECT COUNT(*) 
      FROM product_reviews 
      WHERE product_id = NEW.product_id AND rating = 3 AND is_approved = 1
    ),
    rating_4 = (
      SELECT COUNT(*) 
      FROM product_reviews 
      WHERE product_id = NEW.product_id AND rating = 4 AND is_approved = 1
    ),
    rating_5 = (
      SELECT COUNT(*) 
      FROM product_reviews 
      WHERE product_id = NEW.product_id AND rating = 5 AND is_approved = 1
    ),
    verified_purchase_count = (
      SELECT COUNT(*) 
      FROM product_reviews 
      WHERE product_id = NEW.product_id AND is_verified_purchase = 1 AND is_approved = 1
    ),
    last_review_at = NOW();
END$$
DELIMITER ;

-- Trigger to update product rating summary when a review is updated
DELIMITER $$
CREATE TRIGGER IF NOT EXISTS `update_rating_summary_after_update` 
AFTER UPDATE ON `product_reviews` 
FOR EACH ROW
BEGIN
  IF OLD.rating != NEW.rating OR OLD.is_approved != NEW.is_approved OR OLD.is_verified_purchase != NEW.is_verified_purchase THEN
    INSERT INTO product_rating_summary (product_id, total_reviews, average_rating, rating_1, rating_2, rating_3, rating_4, rating_5, verified_purchase_count, last_review_at)
    VALUES (NEW.product_id, 0, 0.00, 0, 0, 0, 0, 0, 0, NOW())
    ON DUPLICATE KEY UPDATE
      total_reviews = (
        SELECT COUNT(*) 
        FROM product_reviews 
        WHERE product_id = NEW.product_id AND is_approved = 1
      ),
      average_rating = (
        SELECT COALESCE(AVG(rating), 0)
        FROM product_reviews 
        WHERE product_id = NEW.product_id AND is_approved = 1
      ),
      rating_1 = (
        SELECT COUNT(*) 
        FROM product_reviews 
        WHERE product_id = NEW.product_id AND rating = 1 AND is_approved = 1
      ),
      rating_2 = (
        SELECT COUNT(*) 
        FROM product_reviews 
        WHERE product_id = NEW.product_id AND rating = 2 AND is_approved = 1
      ),
      rating_3 = (
        SELECT COUNT(*) 
        FROM product_reviews 
        WHERE product_id = NEW.product_id AND rating = 3 AND is_approved = 1
      ),
      rating_4 = (
        SELECT COUNT(*) 
        FROM product_reviews 
        WHERE product_id = NEW.product_id AND rating = 4 AND is_approved = 1
      ),
      rating_5 = (
        SELECT COUNT(*) 
        FROM product_reviews 
        WHERE product_id = NEW.product_id AND rating = 5 AND is_approved = 1
      ),
      verified_purchase_count = (
        SELECT COUNT(*) 
        FROM product_reviews 
        WHERE product_id = NEW.product_id AND is_verified_purchase = 1 AND is_approved = 1
      ),
      last_review_at = NOW();
  END IF;
END$$
DELIMITER ;

-- Trigger to update product rating summary when a review is deleted
DELIMITER $$
CREATE TRIGGER IF NOT EXISTS `update_rating_summary_after_delete` 
AFTER DELETE ON `product_reviews` 
FOR EACH ROW
BEGIN
  INSERT INTO product_rating_summary (product_id, total_reviews, average_rating, rating_1, rating_2, rating_3, rating_4, rating_5, verified_purchase_count, last_review_at)
  VALUES (OLD.product_id, 0, 0.00, 0, 0, 0, 0, 0, 0, NOW())
  ON DUPLICATE KEY UPDATE
    total_reviews = (
      SELECT COUNT(*) 
      FROM product_reviews 
      WHERE product_id = OLD.product_id AND is_approved = 1
    ),
    average_rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM product_reviews 
      WHERE product_id = OLD.product_id AND is_approved = 1
    ),
    rating_1 = (
      SELECT COUNT(*) 
      FROM product_reviews 
      WHERE product_id = OLD.product_id AND rating = 1 AND is_approved = 1
    ),
    rating_2 = (
      SELECT COUNT(*) 
      FROM product_reviews 
      WHERE product_id = OLD.product_id AND rating = 2 AND is_approved = 1
    ),
    rating_3 = (
      SELECT COUNT(*) 
      FROM product_reviews 
      WHERE product_id = OLD.product_id AND rating = 3 AND is_approved = 1
    ),
    rating_4 = (
      SELECT COUNT(*) 
      FROM product_reviews 
      WHERE product_id = OLD.product_id AND rating = 4 AND is_approved = 1
    ),
    rating_5 = (
      SELECT COUNT(*) 
      FROM product_reviews 
      WHERE product_id = OLD.product_id AND rating = 5 AND is_approved = 1
    ),
    verified_purchase_count = (
      SELECT COUNT(*) 
      FROM product_reviews 
      WHERE product_id = OLD.product_id AND is_verified_purchase = 1 AND is_approved = 1
    ),
    last_review_at = (
      SELECT MAX(created_at)
      FROM product_reviews 
      WHERE product_id = OLD.product_id AND is_approved = 1
    );
END$$
DELIMITER ;

-- Trigger to update review helpfulness counts when votes change
DELIMITER $$
CREATE TRIGGER IF NOT EXISTS `update_review_helpfulness_after_vote_insert` 
AFTER INSERT ON `review_votes` 
FOR EACH ROW
BEGIN
  UPDATE product_reviews 
  SET 
    helpful_count = (
      SELECT COUNT(*) FROM review_votes 
      WHERE review_id = NEW.review_id AND vote_type = 'helpful'
    ),
    not_helpful_count = (
      SELECT COUNT(*) FROM review_votes 
      WHERE review_id = NEW.review_id AND vote_type = 'not_helpful'
    )
  WHERE id = NEW.review_id;
END$$
DELIMITER ;

DELIMITER $$
CREATE TRIGGER IF NOT EXISTS `update_review_helpfulness_after_vote_update` 
AFTER UPDATE ON `review_votes` 
FOR EACH ROW
BEGIN
  UPDATE product_reviews 
  SET 
    helpful_count = (
      SELECT COUNT(*) FROM review_votes 
      WHERE review_id = NEW.review_id AND vote_type = 'helpful'
    ),
    not_helpful_count = (
      SELECT COUNT(*) FROM review_votes 
      WHERE review_id = NEW.review_id AND vote_type = 'not_helpful'
    )
  WHERE id = NEW.review_id;
END$$
DELIMITER ;

DELIMITER $$
CREATE TRIGGER IF NOT EXISTS `update_review_helpfulness_after_vote_delete` 
AFTER DELETE ON `review_votes` 
FOR EACH ROW
BEGIN
  UPDATE product_reviews 
  SET 
    helpful_count = (
      SELECT COUNT(*) FROM review_votes 
      WHERE review_id = OLD.review_id AND vote_type = 'helpful'
    ),
    not_helpful_count = (
      SELECT COUNT(*) FROM review_votes 
      WHERE review_id = OLD.review_id AND vote_type = 'not_helpful'
    )
  WHERE id = OLD.review_id;
END$$
DELIMITER ;
