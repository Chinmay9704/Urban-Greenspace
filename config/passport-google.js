const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { supabase } = require('./supabase');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
    try {
        // Check if user exists
        const { data: existingUser, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('google_id', profile.id)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError;
        }

        if (existingUser) {
            // Update user's last login
            await supabase
                .from('users')
                .update({ last_login: new Date() })
                .eq('id', existingUser.id);

            return done(null, existingUser);
        }

        // Create new user
        const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert([{
                google_id: profile.id,
                email: profile.emails[0].value,
                name: profile.displayName,
                profile_picture: profile.photos[0].value,
                email_verified: profile.emails[0].verified
            }])
            .select()
            .single();

        if (insertError) throw insertError;

        done(null, newUser);
    } catch (error) {
        done(error, null);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

module.exports = passport; 