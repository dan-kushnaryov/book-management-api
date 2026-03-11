import jwt from 'jsonwebtoken';
import { config } from '../config';
import { User, IUser } from '../models';

export class AuthService {
  async login(username: string, password: string): Promise<string | null> {
    const user = await User.findOne({ username });
    if (!user) {
      return null;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return null;
    }

    const token = jwt.sign(
      { userId: user._id },
      config.jwt.secret,
      { expiresIn: '24h' }
    );

    return token;
  }

  async getUserById(userId: string): Promise<IUser | null> {
    return User.findById(userId);
  }
}

export const authService = new AuthService();
