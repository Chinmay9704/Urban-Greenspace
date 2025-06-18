const { Pool } = require('pg');
require('dotenv').config();

// Use the POSTGRES_URL instead of DATABASE_URL
const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || 'postgres://postgres.fmvjtpjooqnlfwwqbbiz:Chinnu%402518@aws-0-ap-south-1.pooler.supabase.com:5432/postgres',
    ssl: {
        rejectUnauthorized: false
    },
    // Add connection timeout and retry settings
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    max: 20 // maximum number of clients in the pool
});

// Test and log the connection
const testConnection = async () => {
    try {
        const client = await pool.connect();
        console.log('Database connected successfully');
        client.release();
    } catch (err) {
        console.error('Database connection error:', err);
        // Log more details about the error
        console.error('Connection details:', {
            host: new URL(process.env.POSTGRES_URL).hostname,
            database: 'postgres',
            port: 5432
        });
    }
};

testConnection();

// Add error handling for the pool
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

module.exports = pool; 