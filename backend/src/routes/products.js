const express = require('express');
const router = express.Router();

// Placeholder para rotas de produtos
router.get('/', (req, res) => {
  res.json({ message: 'Products routes - em desenvolvimento' });
});

module.exports = router;