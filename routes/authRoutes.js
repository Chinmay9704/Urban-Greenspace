const express = require('express');
const bcrypt = require('bcrypt');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const Admin = require('../models/admin');
const { verifyTOTP } = require('../utils/totp');
const { supabase } = require('../config/supabase');
const passport = require('passport');

const router = express.Router();

// Regular user login route
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check user in Supabase
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check if password is already hashed
        let isValidPassword = false;
        if (user.password.startsWith('$2')) {
            // Password is hashed, use bcrypt compare
            isValidPassword = await bcrypt.compare(password, user.password);
        } else {
            // Password is plain text, do direct comparison (temporary)
            isValidPassword = password === user.password;
        }

        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Set user session
        req.session.user = {
            id: user.id,
            email: user.email,
            role: user.role
        };

        // Determine redirect URL based on user role
        let redirectUrl = '/user/dashboard';
        if (user.role === 'farmer') {
            redirectUrl = '/farmer/dashboard';
        }

        res.json({ success: true, redirectUrl });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Modify the admin check route to check if TOTP is set up
router.post('/check-admin', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('Checking admin credentials:', { email }); // Debug log

        const { data: admin, error } = await supabase
            .from('admins')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !admin) {
            console.log('Admin not found or error:', error);
            return res.json({ isAdmin: false });
        }

        let isValidPassword = false;
        if (admin.password.startsWith('$2')) {
            isValidPassword = await bcrypt.compare(password, admin.password);
        } else {
            isValidPassword = password === admin.password;
        }

        if (!isValidPassword) {
            console.log('Invalid password for admin');
            return res.json({ isAdmin: false });
        }

        // Check if TOTP is already set up
        if (!admin.totp_enabled || !admin.totp_secret) {
            console.log('TOTP not set up, generating new secret'); // Debug log
            
            // Generate new TOTP secret
            const secret = authenticator.generateSecret();
            
            // Store in session for setup verification
            req.session.setupTOTP = {
                adminId: admin.id,
                secret: secret,
                email: admin.email
            };

            return res.json({ 
                isAdmin: true, 
                requireSetup: true 
            });
        }

        console.log('Admin verified, TOTP already set up'); // Debug log
        res.json({ isAdmin: true });
    } catch (error) {
        console.error('Admin check error:', error);
        res.status(500).json({ error: 'Server error', isAdmin: false });
    }
});

// Admin TOTP verification route
router.post('/verify-admin-totp', async (req, res) => {
    try {
        const { email, password, totp } = req.body;
        
        const { data: admin, error } = await supabase
            .from('admins')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !admin) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        let isValidPassword = false;
        if (admin.password.startsWith('$2')) {
            isValidPassword = await bcrypt.compare(password, admin.password);
        } else {
            isValidPassword = password === admin.password;
        }

        if (!isValidPassword) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Verify TOTP
        const isValidTOTP = authenticator.verify({
            token: totp.toString(),
            secret: admin.totp_secret
        });

        if (isValidTOTP) {
            // Set full admin session
            req.session.isAdmin = true;
            req.session.adminId = admin.id;
            req.session.adminEmail = admin.email;
            
            // Clear temporary states
            delete req.session.tempAdmin;
            delete req.session.setupTOTP;

            // Redirect to dashboard or stored URL
            const redirectUrl = req.session.returnTo || '/admin/dashboard';
            delete req.session.returnTo;
            
            res.json({ 
                success: true,
                redirectUrl
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid TOTP code' });
        }
    } catch (error) {
        console.error('TOTP verification error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Add route to show TOTP setup page
router.get('/setup-2fa', async (req, res) => {
    if (!req.session.setupTOTP) {
        return res.redirect('/');
    }

    try {
        const { secret, email } = req.session.setupTOTP;
        
        // Generate QR code
        const otpauth = authenticator.keyuri(email, 'GreenCart Admin', secret);
        const qrCodeUrl = await QRCode.toDataURL(otpauth);

        res.render('admin/setup-2fa', {
            qrCodeUrl,
            totpSecret: secret
        });
    } catch (error) {
        console.error('Setup 2FA error:', error);
        res.redirect('/');
    }
});

// Add route to verify and save TOTP setup
router.post('/verify-setup-totp', async (req, res) => {
    try {
        if (!req.session.setupTOTP) {
            return res.status(401).json({ 
                success: false, 
                message: 'Setup session expired' 
            });
        }

        const { token } = req.body;
        const { secret, adminId, email } = req.session.setupTOTP;

        // Verify the token using the utility function
        const isValid = authenticator.verify({
            token: token.toString(),
            secret: secret
        });

        if (!isValid) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid verification code' 
            });
        }

        // Save the TOTP secret to admin record
        const { error: updateError } = await supabase
            .from('admins')
            .update({ 
                totp_secret: secret,
                totp_enabled: true 
            })
            .eq('id', adminId);

        if (updateError) {
            console.error('Error updating admin:', updateError);
            throw new Error('Failed to save TOTP settings');
        }

        // Set admin session
        req.session.isAdmin = true;
        req.session.adminId = adminId;
        req.session.adminEmail = email;

        // Clear setup session
        delete req.session.setupTOTP;

        res.json({ success: true });
    } catch (error) {
        console.error('TOTP setup verification error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Server error' 
        });
    }
});

// Google OAuth routes
router.get('/google',
    passport.authenticate('google', {
        scope: ['profile', 'email']
    })
);

router.get('/google/callback',
    passport.authenticate('google', {
        failureRedirect: '/login',
        failureFlash: true
    }),
    async (req, res) => {
        try {
            // Set user session
            req.session.user = req.user;
            req.session.isAuthenticated = true;

            // Redirect based on user role
            const { data: adminCheck } = await supabase
                .from('admins')
                .select('*')
                .eq('email', req.user.email)
                .single();

            if (adminCheck) {
                req.session.isAdmin = true;
                res.redirect('/admin/dashboard');
            } else {
                res.redirect('/user/dashboard');
            }
        } catch (error) {
            console.error('Google auth callback error:', error);
            res.redirect('/login');
        }
    }
);

module.exports = router; 