const { supabase } = require('../config/supabase');

const isAdmin = async (req, res, next) => {
    try {
        // Check if user is logged in and has admin session
        if (!req.session.adminId) {
            return res.redirect('/admin/login');
        }

        // Verify admin exists in database
        const { data: admin, error } = await supabase
            .from('admins')
            .select('*')
            .eq('id', req.session.adminId)
            .single();

        if (error || !admin) {
            req.session.destroy();
            return res.redirect('/admin/login');
        }

        // Add admin data to request
        req.admin = admin;
        next();
    } catch (error) {
        console.error('Admin auth error:', error);
        res.redirect('/admin/login');
    }
};

module.exports = { isAdmin }; 