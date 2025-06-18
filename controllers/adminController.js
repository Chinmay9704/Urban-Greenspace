const { supabase } = require('../config/database');

const getFarmerInfo = async (req, res) => {
    try {
        const { data: landData, error } = await supabase
            .from('farmers_land')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase query error:', error);
            throw error;
        }

        res.render('admin/farmer-info', {
            landData: landData || [],
            error: null,
            query: req.query.landNumber || ''
        });
    } catch (error) {
        console.error('Error fetching farmer data:', error);
        res.render('admin/farmer-info', {
            landData: [],
            error: 'Failed to fetch farmer data. Please try again.',
            query: req.query.landNumber || ''
        });
    }
};

const searchLand = async (req, res) => {
    try {
        const { landNumber } = req.query;
        const { data: landData, error } = await supabase
            .from('farmers_land')
            .select('*')
            .ilike('land_number', `%${landNumber}%`);

        if (error) throw error;

        res.render('admin/farmer-info', {
            landData: landData || [],
            error: null,
            query: landNumber
        });
    } catch (error) {
        console.error('Error searching land:', error);
        res.render('admin/farmer-info', {
            landData: [],
            error: 'Failed to search land data. Please try again.',
            query: req.query.landNumber || ''
        });
    }
};

const deleteLand = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('farmers_land')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({ success: true, message: 'Land record deleted successfully' });
    } catch (error) {
        console.error('Error deleting land:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete land record' 
        });
    }
};

module.exports = {
    getFarmerInfo,
    searchLand,
    deleteLand
}; 