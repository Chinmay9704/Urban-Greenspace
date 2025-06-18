const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');

// Landing page route - home.ejs will be the first page
router.get('/', (req, res) => {
    // If user is already logged in, redirect to their dashboard
    if (req.session.user) {
        if (req.session.user.role === 'admin') {
            return res.redirect('/admin/dashboard');
        }
        return res.redirect('/dashboard');
    }
    // Otherwise show the home page
    res.render('home');
});

// Login route
router.get('/login', (req, res) => {
    if (req.session.user) {
        if (req.session.user.role === 'admin') {
            return res.redirect('/admin/dashboard');
        }
        return res.redirect('/dashboard');
    }
    res.render('index', { error: null });
});

// Register route
router.get('/register', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('register', { error: null });
});

// Other existing routes...

module.exports = router; 