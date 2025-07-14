const express = require('express');
const router = express.Router();

// Location routes will be implemented here
router.get('/cities', (req, res) => {
  res.json({ message: 'Locations route - coming soon' });
});

module.exports = router;
