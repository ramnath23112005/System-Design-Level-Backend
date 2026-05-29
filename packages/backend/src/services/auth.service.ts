import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';
import {
  IUser,
  IRegisterInput,
  ILoginInput,
  ROLES,
  EVENT_TYPES,
} from '@urlshortener/shared';
import { UserModel } from '../models';
import { config } from '../config';
import { AppError } from '../middleware/error-handler.middleware';
import { logger } from '../utils/logger';
import { eventEmitter } from '../utils/events';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface TokenPayload {
  userId: string;
  role: string;
  type: 'access' | 'refresh';
}

export class AuthService {
  static async register(input: IRegisterInput): Promise<{
    user: IUser;
    tokens: TokenPair;
  }> {
    const existingUser = await UserModel.findByEmail(input.email);
    if (existingUser) {
      throw AppError.conflict('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const apiKey = `uk_${randomBytes(24).toString('hex')}`;
    const userId = uuidv4();

    const user = await UserModel.create({
      id: userId,
      email: input.email,
      passwordHash,
      name: input.name,
      role: ROLES.USER,
      apiKey,
    });

    const tokens = AuthService.generateTokens(user.id, user.role);

    eventEmitter.emit(EVENT_TYPES.USER_REGISTERED, { userId: user.id, email: user.email });

    logger.info('User registered', { userId: user.id, email: user.email });

    return { user, tokens };
  }

  static async login(input: ILoginInput): Promise<{
    user: IUser;
    tokens: TokenPair;
  }> {
    const user = await UserModel.findByEmail(input.email);
    if (!user) {
      throw AppError.unauthorized('Invalid email or password');
    }

    if (!user.isActive) {
      throw AppError.forbidden('Account is deactivated. Contact support.');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const tokens = AuthService.generateTokens(user.id, user.role);

    eventEmitter.emit(EVENT_TYPES.USER_LOGGED_IN, { userId: user.id });

    logger.info('User logged in', { userId: user.id });

    return { user, tokens };
  }

  static async refreshToken(token: string): Promise<{ accessToken: string }> {
    const payload = AuthService.verifyToken(token, 'refresh');
    const user = await UserModel.findById(payload.userId);
    if (!user) {
      throw AppError.unauthorized('User no longer exists');
    }
    if (!user.isActive) {
      throw AppError.forbidden('Account is deactivated');
    }

    const accessToken = AuthService.signToken(
      { userId: user.id, role: user.role },
      'access'
    );

    return { accessToken };
  }

  static generateTokens(userId: string, role: string): TokenPair {
    const accessToken = AuthService.signToken({ userId, role }, 'access');
    const refreshToken = AuthService.signToken({ userId, role }, 'refresh');
    return { accessToken, refreshToken };
  }

  static verifyToken(token: string, expectedType: 'access' | 'refresh' = 'access'): TokenPayload {
    try {
      const secret = expectedType === 'access'
        ? config.jwt.secret
        : config.jwt.refreshSecret;

      const decoded = jwt.verify(token, secret, {
        issuer: config.jwt.issuer,
      }) as TokenPayload;

      if (decoded.type !== expectedType) {
        throw AppError.unauthorized('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof jwt.TokenExpiredError) {
        throw AppError.unauthorized('Token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw AppError.unauthorized('Invalid token');
      }
      throw AppError.unauthorized('Token verification failed');
    }
  }

  static async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isOldPasswordValid) {
      throw AppError.badRequest('Current password is incorrect');
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      throw AppError.badRequest('New password must be different from the current password');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    await UserModel.update(userId, { passwordHash: newPasswordHash });

    logger.info('Password changed', { userId });
  }

  private static signToken(
    payload: { userId: string; role: string },
    type: 'access' | 'refresh'
  ): string {
    const secret = type === 'access' ? config.jwt.secret : config.jwt.refreshSecret;
    const expiresIn = type === 'access' ? config.jwt.expiresIn : config.jwt.refreshExpiresIn;

    return jwt.sign(
      {
        userId: payload.userId,
        role: payload.role,
        type,
      },
      secret,
      {
        expiresIn,
        issuer: config.jwt.issuer,
      }
    );
  }
}
