import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { User, UserRole } from '../models';
import { AuthenticatedRequest } from '../types';

interface JwtPayload {
  userId: string;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Access denied. No token provided.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(401).json({ error: 'Invalid token. User not found.' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

/**
 * Middleware to require specific role(s) for an endpoint.
 * Must be used after authenticate middleware.
 *
 * @example
 * // Single role
 * router.delete('/:id', authenticate, requireRole(UserRole.ADMIN), controller.delete);
 *
 * // Multiple roles
 * router.put('/:id', authenticate, requireRole(UserRole.ADMIN, UserRole.USER), controller.update);
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Access denied. Insufficient permissions.',
        required: allowedRoles,
        current: req.user.role,
      });
      return;
    }

    next();
  };
};
