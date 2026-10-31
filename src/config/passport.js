const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const userStore = require('../models/User');

passport.use(
  new LocalStrategy(
    { usernameField: 'email', passwordField: 'password' },
    async (email, password, done) => {
      try {
        const user = await userStore.findByEmail(email);
        if (!user) {
          return done(null, false, { message: 'Невірний email або пароль.' });
        }

        const isValid = await userStore.validatePassword(user, password);
        if (!isValid) {
          return done(null, false, { message: 'Невірний email або пароль.' });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails && profile.emails[0] && profile.emails[0].value;
          if (!email) {
            return done(new Error('Google profile did not return an email address.'));
          }

          let user = await userStore.findByEmail(email);
          if (!user) {
            const randomPassword = require('crypto').randomBytes(16).toString('hex');
            await userStore.create({
              email,
              password: randomPassword,
              displayName: profile.displayName,
            });
            user = await userStore.findByEmail(email);
          }

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await userStore.findById(id);
    done(null, user || false);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;
