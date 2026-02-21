import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { User, IUser } from '../models';
import { AppError } from '../middleware';

export class AuthService {
  static async register(data: {
    name: string;
    email: string;
    password: string;
    department: string;
    role?: 'admin' | 'employee';
  }): Promise<{ user: Partial<IUser>; token: string }> {
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      throw new AppError('Email already registered', 409);
    }

    const hashedPassword = await argon2.hash(data.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const user = await User.create({
      ...data,
      password: hashedPassword,
    });

    const token = AuthService.generateToken(user);

    return {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
      },
      token,
    };
  }

  static async login(
    email: string,
    password: string
  ): Promise<{ user: Partial<IUser>; token: string }> {
    const user = await User.findOne({ email, isActive: true }).select('+password');
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isValid = await argon2.verify(user.password, password);
    if (!isValid) {
      throw new AppError('Invalid email or password', 401);
    }

    const token = AuthService.generateToken(user);

    return {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
      },
      token,
    };
  }

  private static generateToken(user: IUser): string {
    return jwt.sign(
      { userId: user._id.toString(), role: user.role },
      config.jwtSecret,
      { expiresIn: 28800 } // 8 hours in seconds
    );
  }
}
