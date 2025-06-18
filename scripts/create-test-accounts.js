const { supabase } = require('../config/supabase');
const bcrypt = require('bcrypt');
const { generateTOTPSecret } = require('../utils/totp');

async function createTestAccounts() {
    try {
        // Create test user
        const hashedPassword = await bcrypt.hash('password123', 10);
        const { data: user, error: userError } = await supabase
            .from('users')
            .insert([
                {
                    name: 'Test User',
                    email: 'user@test.com',
                    password: hashedPassword,
                    role: 'user',
                    phone: '1234567890',
                    address: 'Test Address',
                    city: 'Test City',
                    state: 'Test State',
                    pincode: '123456',
                    is_active: true,
                    email_verified: true
                }
            ])
            .select()
            .single();

        if (userError) {
            console.error('Error creating test user:', userError);
        } else {
            console.log('Test user created:', user);
        }

        // Create test admin
        const adminTOTPSecret = generateTOTPSecret();
        const { data: admin, error: adminError } = await supabase
            .from('admins')
            .insert([
                {
                    name: 'Test Admin',
                    email: 'admin@test.com',
                    password: hashedPassword,
                    totp_secret: adminTOTPSecret
                }
            ])
            .select()
            .single();

        if (adminError) {
            console.error('Error creating test admin:', adminError);
        } else {
            console.log('Test admin created:', admin);
            console.log('Admin TOTP Secret:', adminTOTPSecret);
            console.log('Please save this TOTP secret and use it to set up your authenticator app');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

createTestAccounts(); 