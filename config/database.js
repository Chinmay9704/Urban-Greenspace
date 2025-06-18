const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');
require('dotenv').config();

// Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// PostgreSQL connection pool with direct connection details
const pool = new Pool({
    host: 'aws-0-ap-south-1.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    user: 'postgres.fmvjtpjooqnlfwwqbbiz',
    password: 'Chinnu@2518',
    ssl: {
        rejectUnauthorized: false
    }
});

// Test database connection
const testConnection = async () => {
    try {
        // Test Supabase connection
        const { data, error } = await supabase
            .from('farmers_land')
            .select('count');
            
        if (error) {
            console.error('Supabase connection error:', error);
            throw error;
        }
        console.log('Successfully connected to Supabase');

        // Test PostgreSQL connection
        const client = await pool.connect();
        console.log('Successfully connected to PostgreSQL');
        client.release();
    } catch (err) {
        console.error('Database connection error:', err);
        // Don't exit the process, just log the error
        console.log('Continuing despite connection error...');
    }
};

// Run the test connection but don't wait for it
testConnection().catch(console.error);

module.exports = { supabase, pool }; 