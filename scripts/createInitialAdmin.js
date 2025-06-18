require('dotenv').config();
const { adminModel } = require('../models/adminModel');

async function createInitialAdmin() {
    const adminData = {
        email: 'admin@example.com',    // Change this to your admin email
        password: 'Admin@123',         // Change this to your desired password
        name: 'Admin User'
    };

    try {
        const { admin, error } = await adminModel.createAdmin(adminData);
        if (error) {
            console.error('Failed to create initial admin:', error);
        } else {
            console.log('Initial admin created successfully:', admin);
        }
    } catch (error) {
        console.error('Error:', error);
    }
    process.exit();
}

createInitialAdmin(); 