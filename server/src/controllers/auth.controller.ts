import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services';
import { User } from '../models';
import argon2 from 'argon2';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.register(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await User.findById(req.user!.userId).select('-password');
      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }
      res.json(user);
    } catch (error) {
      next(error);
    }
  }

  static async getMyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await User.findById(req.user!.userId)
        .select('+profilePicture +baseMonthlySalary +currency +salaryEffectiveFrom');
      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }
      res.json({
        profile: {
          _id: user._id,
          name: user.name,
          email: user.email,
          department: user.department,
          role: user.role,
          profilePicture: user.profilePicture,
          baseMonthlySalary: user.baseMonthlySalary || 0,
          currency: user.currency || 'PKR',
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateMyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, profilePicture, email } = req.body;
      const updates: any = {};
      if (name) updates.name = name;
      if (profilePicture !== undefined) updates.profilePicture = profilePicture;
      if (email) updates.email = email;

      const user = await User.findByIdAndUpdate(
        req.user!.userId,
        { $set: updates },
        { new: true }
      ).select('+profilePicture');

      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }
      res.json({ message: 'Profile updated successfully', name: user.name });
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { newPassword } = req.body;
      if (!newPassword) {
        res.status(400).json({ message: 'New password is required' });
        return;
      }
      if (newPassword.length < 6) {
        res.status(400).json({ message: 'New password must be at least 6 characters' });
        return;
      }

      const user = await User.findById(req.user!.userId).select('+password');
      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      user.password = await argon2.hash(newPassword);
      user.plaintextPassword = newPassword;
      await user.save();

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      next(error);
    }
  }
}
