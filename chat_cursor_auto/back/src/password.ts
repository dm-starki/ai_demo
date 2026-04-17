import bcrypt from 'bcryptjs';

export const hashPassword = async (plain: string): Promise<string> =>
  bcrypt.hash(plain, 10);

export const verifyPassword = async (
  plain: string,
  hash: string,
): Promise<boolean> => bcrypt.compare(plain, hash);
