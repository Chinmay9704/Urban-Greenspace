const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/test-db', async (req, res) => {
    try {
        const result = await db.query('SELECT NOW()');
        res.send(`Database connection successful. Current time: ${result.rows[0].now}`);
    } catch (error) {
        console.error('Database connection error:', error);
        res.status(500).send('Database connection failed');
    }
});

module.exports = router; 