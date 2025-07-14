const { executeQuery } = require('./config/database');

async function addSampleFeedback() {
  try {
    console.log('Adding sample feedback from existing customers...');

    // First, get some existing users and orders
    const users = await executeQuery('SELECT id, full_name FROM users WHERE user_type = ? LIMIT 10', ['customer']);
    const orders = await executeQuery('SELECT id, user_id FROM orders LIMIT 20');

    if (users.length === 0) {
      console.log('No customers found. Please create some customers first.');
      return;
    }

    const feedbackData = [
      {
        rating: 5,
        subject: 'Excellent food quality!',
        message: 'The food was absolutely delicious! Fresh ingredients and perfect seasoning. Will definitely order again.',
        category: 'food_quality'
      },
      {
        rating: 4,
        subject: 'Great delivery service',
        message: 'Food arrived hot and on time. The delivery person was very polite and professional.',
        category: 'delivery'
      },
      {
        rating: 5,
        subject: 'Amazing customer service',
        message: 'Had an issue with my order and the support team resolved it quickly and efficiently. Great customer service!',
        category: 'service'
      },
      {
        rating: 4,
        subject: 'User-friendly app',
        message: 'The app is easy to navigate and ordering is straightforward. Love the tracking feature.',
        category: 'app_experience'
      },
      {
        rating: 3,
        subject: 'Food was okay',
        message: 'The food was decent but could use more flavor. Also took a bit longer than expected.',
        category: 'food_quality'
      },
      {
        rating: 5,
        subject: 'Outstanding experience',
        message: 'From ordering to delivery, everything was perfect. This is my go-to food delivery service now!',
        category: 'general'
      },
      {
        rating: 2,
        subject: 'Delivery was late',
        message: 'Order arrived 45 minutes late and the food was cold. Not very satisfied with the service.',
        category: 'delivery'
      },
      {
        rating: 4,
        subject: 'Good variety of food',
        message: 'Love the variety of restaurants and cuisines available. Prices are reasonable too.',
        category: 'general'
      },
      {
        rating: 5,
        subject: 'Quick and reliable',
        message: 'Always receive my orders on time and the food quality is consistently good.',
        category: 'service'
      },
      {
        rating: 4,
        subject: 'Easy payment process',
        message: 'Payment through the app is smooth and secure. Multiple payment options are great.',
        category: 'app_experience'
      },
      {
        rating: 3,
        subject: 'Average experience',
        message: 'Service is okay but nothing exceptional. Room for improvement in food presentation.',
        category: 'general'
      },
      {
        rating: 5,
        subject: 'Best food delivery app!',
        message: 'This app has never disappointed me. Fast delivery, hot food, and excellent customer support.',
        category: 'general'
      },
      {
        rating: 4,
        subject: 'Fresh and tasty',
        message: 'All ingredients taste fresh and the portion sizes are generous. Very satisfied!',
        category: 'food_quality'
      },
      {
        rating: 2,
        subject: 'App could be better',
        message: 'The app sometimes crashes and the search function is not very responsive.',
        category: 'app_experience'
      },
      {
        rating: 5,
        subject: 'Exceptional service!',
        message: 'Had a special request for my order and they accommodated it perfectly. Excellent service!',
        category: 'service'
      }
    ];

    // Insert feedback
    for (let i = 0; i < feedbackData.length; i++) {
      const feedback = feedbackData[i];
      const user = users[i % users.length]; // Cycle through users
      const userOrders = orders.filter(o => o.user_id === user.id);
      const orderId = userOrders.length > 0 ? userOrders[0].id : null;

      const query = `
        INSERT INTO feedback (
          user_id, order_id, rating, subject, message, category, 
          is_public, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        user.id,
        orderId,
        feedback.rating,
        feedback.subject,
        feedback.message,
        feedback.category,
        true, // is_public
        feedback.rating >= 4 ? 'approved' : 'pending', // auto-approve good feedback
        new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date in last 30 days
      ];

      await executeQuery(query, values);
      console.log(`✅ Added feedback from ${user.full_name}: "${feedback.subject}"`);
    }

    // Add some admin responses to approved feedback
    const approvedFeedback = await executeQuery(
      'SELECT id FROM feedback WHERE status = ? AND admin_response IS NULL LIMIT 5', 
      ['approved']
    );

    const responses = [
      'Thank you for your wonderful feedback! We\'re delighted to hear about your positive experience.',
      'We appreciate your kind words! Our team works hard to maintain high quality service.',
      'Thank you for choosing us! We\'re glad you enjoyed your meal and our service.',
      'Your feedback means a lot to us! We\'ll continue to strive for excellence.',
      'We\'re thrilled that you had a great experience! Thank you for your review.'
    ];

    // Get an admin user
    const [admin] = await executeQuery('SELECT id FROM users WHERE user_type = ? LIMIT 1', ['admin']);
    
    if (admin && approvedFeedback.length > 0) {
      for (let i = 0; i < approvedFeedback.length; i++) {
        const feedback = approvedFeedback[i];
        const response = responses[i % responses.length];

        await executeQuery(
          'UPDATE feedback SET admin_response = ?, responded_by_admin_id = ?, responded_at = ? WHERE id = ?',
          [response, admin.id, new Date(), feedback.id]
        );
        console.log(`✅ Added admin response to feedback #${feedback.id}`);
      }
    }

    console.log('\n🎉 Sample feedback data added successfully!');
    console.log(`📊 Total feedback entries: ${feedbackData.length}`);
    console.log(`👥 Distributed across ${users.length} customers`);
    
    // Show summary
    const summary = await executeQuery(`
      SELECT 
        COUNT(*) as total_feedback,
        AVG(rating) as avg_rating,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN admin_response IS NOT NULL THEN 1 END) as with_responses
      FROM feedback
    `);
    
    console.log('\n📈 Feedback Summary:');
    console.log(`   Total Feedback: ${summary[0].total_feedback}`);
    console.log(`   Average Rating: ${Number(summary[0].avg_rating).toFixed(1)}/5`);
    console.log(`   Approved: ${summary[0].approved}`);
    console.log(`   Pending: ${summary[0].pending}`);
    console.log(`   With Admin Responses: ${summary[0].with_responses}`);

  } catch (error) {
    console.error('❌ Error adding sample feedback:', error);
  }
}

// Run the script
addSampleFeedback().then(() => {
  console.log('\nScript completed!');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
