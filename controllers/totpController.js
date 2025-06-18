const { authenticator } = require('otplib');
const QRCode = require('qrcode');

// Generate TOTP Secret and QR Code
exports.generateTOTP = async (req, res) => {
    const secret = authenticator.generateSecret();
    req.session.tempSecret = secret; // Store secret temporarily in session

    const otpauth = authenticator.keyuri(req.session.tempAdmin.email, 'GreenCart', secret);
    QRCode.toDataURL(otpauth, (err, imageUrl) => {
        if (err) {
            console.error('Error generating QR code:', err);
            res.status(500).send('Error generating QR code');
        } else {
            res.render('setup-2fa', { qrCode: imageUrl, secret });
        }
    });
};

// Verify TOTP Token
exports.verifyTOTP = (req, res) => {
    const { token } = req.body;
    const secret = req.session.tempSecret;

    const isValid = authenticator.verify({ token, secret });
    if (isValid) {
        // Save the secret to the database and mark as verified
        // Example: Save to your database here
        req.session.user = req.session.tempAdmin; // Promote tempAdmin to user
        delete req.session.tempAdmin;
        delete req.session.tempSecret;
        res.redirect('/admin/dashboard');
    } else {
        res.render('verify-2fa', { error: 'Invalid TOTP Token!' });
    }
}; 