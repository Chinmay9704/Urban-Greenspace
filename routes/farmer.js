const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');

// Middleware to check if farmer is logged in
const isFarmer = async (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'farmer') {
        return res.redirect('/auth/farmer/login');
    }
    next();
};

// Farmer Dashboard
router.get('/dashboard', isFarmer, async (req, res) => {
    try {
        // Get farmer details with land information
        const { data: farmer, error: farmerError } = await supabase
            .from('farmers')
            .select(`
                *,
                farmer_lands (*)
            `)
            .eq('id', req.session.user.id)
            .single();

        if (farmerError) throw farmerError;

        // Get crop statistics
        const { data: cropStats, error: cropError } = await supabase
            .from('farmer_crops')
            .select('*')
            .eq('farmer_id', req.session.user.id);

        if (cropError) throw cropError;

        // Get sales data
        const { data: salesData, error: salesError } = await supabase
            .from('vegetables')
            .select('*')
            .eq('farmer_id', req.session.user.id);

        if (salesError) throw salesError;

        // Calculate statistics
        const cropCount = cropStats?.length || 0;
        const activeSales = salesData?.filter(v => v.stock_quantity > 0).length || 0;
        const totalRevenue = salesData?.reduce((sum, v) => sum + (v.price * v.stock_quantity), 0) || 0;

        // Get recent activities
        const { data: recentActivities, error: activityError } = await supabase
            .from('farmer_activities')
            .select('*')
            .eq('farmer_id', req.session.user.id)
            .order('created_at', { ascending: false })
            .limit(5);

        if (activityError) throw activityError;

        res.render('farmer/dashboard', {
            farmer,
            cropCount,
            activeSales,
            totalRevenue,
            recentActivities,
            currentPage: 'dashboard'
        });
    } catch (error) {
        console.error('Error loading farmer dashboard:', error);
        res.render('farmer/dashboard', {
            error: 'Failed to load dashboard data',
            farmer: req.session.user,
            cropCount: 0,
            activeSales: 0,
            totalRevenue: 0,
            recentActivities: [],
            currentPage: 'dashboard'
        });
    }
});

module.exports = router; 