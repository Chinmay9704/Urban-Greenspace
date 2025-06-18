const express = require('express');
const router = express.Router();
const { supabase } = require('../config/database');
const passport = require('passport');

// Login page
router.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/admin/dashboard');
    }
    res.render('auth/login', { error: null });
});

// Login handler
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Check if it's an admin login
        if (email === 'admin@greencart.com') {
            const { data: admin, error } = await supabase
                .from('admins')
                .select('*')
                .eq('email', email)
                .single();

            if (error || !admin || admin.password !== password) {
                return res.render('auth/login', { error: 'Invalid credentials' });
            }

            req.session.user = {
                id: admin.id,
                email: admin.email,
                role: 'admin'
            };
            return res.redirect('/admin/dashboard');
        }

        // Regular user login
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user || user.password !== password) {
            return res.render('auth/login', { error: 'Invalid credentials' });
        }

        req.session.user = {
            id: user.id,
            email: user.email,
            role: 'user'
        };
        res.redirect('/user/dashboard');

    } catch (error) {
        console.error('Login error:', error);
        res.render('auth/login', { error: 'An error occurred during login' });
    }
});

// Register route (for users only)
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (existingUser) {
            return res.render('register', {
                error: 'Email already registered'
            });
        }

        // Create new user with plain password for now
        const { data: newUser, error } = await supabase
            .from('users')
            .insert([
                {
                    name,
                    email,
                    password, // Store password directly for now
                    role: 'user'
                }
            ])
            .select()
            .single();

        if (error) throw error;

        // Set session
        req.session.user = {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            role: 'user'
        };

        return res.redirect('/user/dashboard');
    } catch (error) {
        console.error('Registration error:', error);
        return res.render('register', {
            error: 'Registration failed'
        });
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/auth/login');
    });
});

// Add admin middleware
const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        next();
    } else {
        res.status(403).redirect('/');
    }
};

// Google OAuth routes
router.get('/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    prompt: 'select_account'
  })
);

router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: '/',
    failureFlash: true
  }),
  function(req, res) {
    if (req.user) {
      req.session.user = {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
        name: req.user.name || req.user.full_name,
        avatar_url: req.user.avatar_url
      };
      return res.redirect('/user/dashboard');
    }
    res.redirect('/');
  }
);

// Export both router and middleware
module.exports = {
    router,
    isAdmin
}; 