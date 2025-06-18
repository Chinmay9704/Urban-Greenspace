require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_KEY:', process.env.SUPABASE_ANON_KEY);

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
}

// Validate URL format
try {
    new URL(supabaseUrl);
} catch (error) {
    console.error('Invalid Supabase URL format:', error);
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Add a PostgreSQL pool for direct database connections
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: {
        rejectUnauthorized: false
    }
});

// Test database connection
const testConnection = async () => {
    try {
        // Test Supabase connection
        const { data: usersData, error: usersError } = await supabase.from('users').select('count');
        if (usersError) throw usersError;
        console.log('Successfully connected to Supabase');

        // Test PostgreSQL connection
        const client = await pool.connect();
        try {
            await client.query('SELECT NOW()');
            console.log('Successfully connected to PostgreSQL');
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Database connection error:', error.message);
    }
};

testConnection();

module.exports = {
    supabase,
    pool
}; 