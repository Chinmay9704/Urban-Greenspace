const { supabase } = require('../config/supabase');

const adminAuth = async (req, res, next) => {
    try {
        // Check if admin is authenticated
        if (!req.session.isAdmin || !req.session.adminId) {
            // Store the intended URL
            req.session.returnTo = req.originalUrl;
            return res.redirect('/admin/login');
        }

        // Verify admin exists in database
        const { data: admin, error } = await supabase
            .from('admins')
            .select('*')
            .eq('id', req.session.adminId)
            .single();

        if (error || !admin) {
            // Clear invalid session
            req.session.destroy();
            return res.redirect('/admin/login');
        }

        // Add admin data to request
        req.admin = admin;
        next();
    } catch (error) {
        console.error('Admin auth error:', error);
        res.status(500).render('error', {
            message: 'Authentication failed',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};

module.exports = adminAuth; 