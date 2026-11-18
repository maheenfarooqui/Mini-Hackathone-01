
import "dotenv/config";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import userModel from "../models/user.model.js";



if (
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CALLBACK_URL
) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;

          if (!email) {
            return done(null, false);
          }

          let user = await userModel
            .findOne({
              $or: [{ googleId: profile.id }, { email }],
            })
            .select("+username");

          if (!user) {
            user = await userModel.create({
              name: profile.displayName || email.split("@")[0],
              email,
              googleId: profile.id,
            });
          } else {
            let changed = false;
            if (!user.googleId) {
              user.googleId = profile.id;
              changed = true;
            }
            if (!user.name) {
              user.name = user.username || email.split("@")[0];
              changed = true;
            }
            if (user.role === "user") {
              user.role = "salesRepresentative";
              changed = true;
            }
            if (changed) await user.save();
          }

          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      },
    ),
  );
}

export default passport;
