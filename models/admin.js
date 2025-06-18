const { supabase } = require('../config/supabase');

class Admin {
    static async findOne(query) {
        const { data, error } = await supabase
            .from('admins')
            .select('*')
            .eq('email', query.email)
            .single();

        if (error) {
            console.error('Error finding admin:', error);
            return null;
        }

        return data;
    }

    static async create(adminData) {
        const { data, error } = await supabase
            .from('admins')
            .insert([adminData])
            .select()
            .single();

        if (error) {
            console.error('Error creating admin:', error);
            throw error;
        }

        return data;
    }
}

module.exports = Admin; 