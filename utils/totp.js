const { authenticator } = require('otplib');

// Configure TOTP settings
authenticator.options = {
    window: 1,        // Allow 1 step before/after current time
    step: 30,         // 30-second step
    digits: 6         // 6-digit code
};

const generateTOTPSecret = () => {
    return authenticator.generateSecret();
};

const verifyTOTP = (token, secret) => {
    try {
        return authenticator.verify({ 
            token: token.toString(), 
            secret: secret 
        });
    } catch (error) {
        console.error('TOTP verification error:', error);
        return false;
    }
};

const generateTOTPQRCodeURL = (secret, email) => {
    return authenticator.keyuri(email, 'GreenCart Admin', secret);
};

module.exports = {
    generateTOTPSecret,
    verifyTOTP,
    generateTOTPQRCodeURL
}; 