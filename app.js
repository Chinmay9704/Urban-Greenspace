require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const { supabase } = require('./config/supabase');
const passport = require('passport');
require('./config/passport-google');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/admin');
const morgan = require('morgan');
const testRoutes = require('./routes/test');
const auth = require('./routes/auth');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up session middleware with more secure configuration
app.use(session({
    secret: process.env.JWT_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware to make session available to all views
app.use((req, res, next) => {
    res.locals.session = req.session;
    res.locals.user = req.user;
    next();
});

// Add this middleware to check database connection
app.use(async (req, res, next) => {
    try {
        const { data, error } = await supabase.from('users').select('count');
        if (error) throw error;
        next();
    } catch (err) {
        console.error('Database connection error:', err);
        res.status(500).send('Database connection error');
    }
});

// Add this after your other middleware
app.use(async (req, res, next) => {
    try {
        // Simple test query
        const { data, error } = await supabase
            .from('farmers_land')
            .select('count');
            
        if (error) throw error;
        next();
    } catch (err) {
        console.error('Database middleware error:', err);
        // Continue anyway, don't block the request
        next();
    }
});

// Add this before your routes
app.use(express.static(path.join(__dirname, 'public')));

// Add this near the top of app.js with other middleware definitions
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/auth/login');
    }
};

// Import the index router
const indexRouter = require('./routes/index');

// Routes - Add index router first
app.use('/', indexRouter);  // This should be the first route

// Register the auth routes
app.use('/auth', authRoutes);

// Other routes
app.use('/admin', adminRoutes);  // This now handles its own auth
app.use('/user', require('./routes/user'));
app.use('/farmer', require('./routes/farmer'));
app.use('/', require('./routes/pages'));

// User Profile Route
app.get('/user/profile', isAuthenticated, async (req, res) => {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', req.session.user.id)  // Changed from req.user.id to req.session.user.id
            .single();

        if (error) throw error;

        res.render('user/profile', { 
            user,
            currentPage: 'profile'
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.redirect('/user/dashboard');
    }
});

// Add this near the top of your Express app configuration
app.use(morgan('dev'));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Handle 404
app.use((req, res) => {
    res.status(404).render('error', { 
        message: 'Page not found',
        error: {}
    });
});

// Add this route before your other routes
app.get('/auth/login', (req, res) => {
    res.render('auth/login', { error: null });
});

const PORT = process.env.PORT || 3000;

// Improved error handling for server
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

server.on('error', (error) => {
    console.error('Server error:', error);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
});

app.use('/test', testRoutes); 