import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtPayload {
  sub: string;   // User._id as string
  roles: string[];
}

/** Sign a 30-day JWT for the given user. */
export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '30d' });
}

/** Verify and decode a token. Throws on invalid or expired. */
export function verifyTokenPayload(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
