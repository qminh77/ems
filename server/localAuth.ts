import bcrypt from 'bcryptjs';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import type { Express } from 'express';
import { storage } from './storage';
import { randomUUID } from 'crypto';

// Setup local authentication strategy
export function setupLocalAuth(app: Express) {
  // Local strategy for username/password login
  passport.use(new LocalStrategy(
    async (username, password, done) => {
      try {
        const auth = await storage.getLocalAuthByUsername(username);
        if (!auth) {
          return done(null, false, { message: 'Tên đăng nhập không tồn tại' });
        }

        const user = await storage.getUser(auth.userId);
        if (!user) {
          return done(null, false, { message: 'Người dùng không tồn tại' });
        }

        const isValid = await bcrypt.compare(password, auth.passwordHash);
        if (!isValid) {
          return done(null, false, { message: 'Mật khẩu không đúng' });
        }

        return done(null, {
          claims: {
            sub: user.id,
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName,
            profile_image_url: user.profileImageUrl,
          }
        });
      } catch (error) {
        return done(error);
      }
    }
  ));

  // Register route for creating new user with local auth
  app.post('/api/register', async (req, res) => {
    const { username, password, email, firstName, lastName } = req.body;

    if (!username || !password || !email) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin' });
    }

    try {
      // Check if username already exists
      const existingAuth = await storage.getLocalAuthByUsername(username);
      if (existingAuth) {
        return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại' });
      }

      // Create user
      const userId = randomUUID();
      const user = await storage.upsertUser({
        id: userId,
        email,
        firstName: firstName || '',
        lastName: lastName || '',
        profileImageUrl: null,
      });

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create local auth
      await storage.createLocalAuth({
        userId: user.id,
        username,
        passwordHash,
      });

      res.json({ message: 'Đăng ký thành công', user });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Lỗi khi đăng ký' });
    }
  });

  // Local login route
  app.post('/api/login-local', (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: 'Lỗi máy chủ' });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || 'Đăng nhập thất bại' });
      }
      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({ message: 'Lỗi khi đăng nhập' });
        }
        return res.json({ message: 'Đăng nhập thành công', user });
      });
    })(req, res, next);
  });
}