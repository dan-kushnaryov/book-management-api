import { Request, Response, NextFunction } from 'express';
import { authService } from '../services';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({ error: 'Username and password are required' });
        return;
      }

      const token = await authService.login(username, password);

      if (!token) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      res.json({ token });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
