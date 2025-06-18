const { supabase } = require('../config/supabase');
const bcrypt = require('bcrypt');

const adminModel = {
    async login(email, password) {
        try {
            if (!email || !password) {
                return { error: 'Email and password are required' };
            }

            // First, check if the admin exists in the admins table
            const { data: admin, error } = await supabase
                .from('admins')
                .select('*')
                .eq('email', email.toLowerCase())
                .single();

            if (error) {
                console.error('Admin lookup error:', error);
                return { error: 'Authentication failed' };
            }

            if (!admin) {
                return { error: 'Admin not found' };
            }

            // Compare passwords
            const passwordMatch = await bcrypt.compare(password, admin.password);
            if (!passwordMatch) {
                return { error: 'Invalid credentials' };
            }

            // Return admin data (excluding sensitive information)
            const { password: _, ...adminData } = admin;
            return { admin: adminData };

        } catch (error) {
            console.error('Admin login error:', error);
            return { error: 'Internal server error' };
        }
    },

    async createAdmin(adminData) {
        try {
            // Validate input
            if (!adminData.email || !adminData.password) {
                return { error: 'Email and password are required' };
            }

            // Check if admin already exists
            const { data: existingAdmin } = await supabase
                .from('admins')
                .select('id')
                .eq('email', adminData.email.toLowerCase())
                .single();

            if (existingAdmin) {
                return { error: 'Admin with this email already exists' };
            }

            const hashedPassword = await bcrypt.hash(adminData.password, 10);
            
            const { data, error } = await supabase
                .from('admins')
                .insert([
                    {
                        email: adminData.email.toLowerCase(),
                        password: hashedPassword,
                        name: adminData.name,
                        role: 'admin'
                    }
                ])
                .select()
                .single();

            if (error) {
                console.error('Create admin error:', error);
                return { error: error.message };
            }

            // Return admin data without password
            const { password: _, ...adminData } = data;
            return { admin: adminData };
        } catch (error) {
            console.error('Create admin error:', error);
            return { error: 'Internal server error' };
        }
    }
};

module.exports = adminModel; 