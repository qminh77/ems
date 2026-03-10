import bcrypt from 'bcryptjs';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import type { Express } from 'express';
import { storage } from './storage.js';
import { randomUUID } from 'crypto';
import { createRateLimiter } from './requestGuards.js';
import { z } from 'zod';

const authRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  keyPrefix: 'auth',
});

const registerSchema = z.object({
  username: z.string().trim().min(3).max(100),
  password: z.string().min(8).max(100),
  email: z.string().trim().email().max(255),
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
});

function isBootstrapAdmin(email?: string | null): boolean {
  if (!email || !process.env.ADMIN_EMAIL) return false;
  return email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();
}

// Setup local authentication strategy
export function setupLocalAuth(app: Express) {
  // Local strategy for username/password login
  passport.use(new LocalStrategy(
    async (username, password, done) => {
      try {
        const auth = await storage.getLocalAuthByEmailOrUsername(username);
        if (!auth) {
          return done(null, false, { message: 'Email hoặc tên đăng nhập không tồn tại' });
        }

        const user = await storage.getUser(auth.userId);
        if (!user) {
          return done(null, false, { message: 'Người dùng không tồn tại' });
        }

        if (!user.isActive) {
          return done(null, false, { message: 'Tài khoản đã bị vô hiệu hóa' });
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
  app.post('/api/register', authRateLimit, async (req, res) => {
    try {
      const settings = await storage.getSystemSettings();
      if (!settings.registrationEnabled) {
        return res.status(403).json({ message: 'Đăng ký tài khoản hiện đang tạm tắt' });
      }

      const { username, password, email, firstName, lastName } = registerSchema.parse(req.body);

      // Check if username already exists
      const existingAuth = await storage.getLocalAuthByUsername(username);
      if (existingAuth) {
        return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại' });
      }

      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'Email đã được đăng ký' });
      }

      // Create user
      const userId = randomUUID();
      const existingUsers = await storage.listUsers();
      const hasAnyAdmin = existingUsers.some((user) => user.isAdmin);
      const shouldGrantAdmin = !hasAnyAdmin || isBootstrapAdmin(email);
      const user = await storage.upsertUser({
        id: userId,
        email,
        firstName: firstName || '',
        lastName: lastName || '',
        profileImageUrl: null,
        isAdmin: shouldGrantAdmin,
        canCreateEvents: true,
        isActive: true,
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
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Dữ liệu đăng ký không hợp lệ', errors: error.errors });
      }
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Lỗi khi đăng ký' });
    }
  });

  // Local login route
  app.post('/api/login-local', authRateLimit, (req, res, next) => {
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
