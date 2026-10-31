const crypto = require('crypto');
const bcrypt = require('bcryptjs');

class UserStore {
  constructor() {
    /** @type {Map<string, object>} userId -> user record */
    this.usersById = new Map();
    /** @type {Map<string, string>} lowercased email -> userId */
    this.idsByEmail = new Map();
  }

  async create({ email, password, displayName }) {
    const normalizedEmail = email.trim().toLowerCase();
    if (this.idsByEmail.has(normalizedEmail)) {
      const err = new Error('A user with this email already exists.');
      err.code = 'EMAIL_TAKEN';
      throw err;
    }

    const id = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);

    const user = {
      id,
      email: normalizedEmail,
      displayName: displayName || normalizedEmail.split('@')[0],
      passwordHash,
      resetTokenHash: null,
      resetTokenExpiresAt: null,
      createdAt: new Date(),
    };

    this.usersById.set(id, user);
    this.idsByEmail.set(normalizedEmail, id);
    return this.toSafeObject(user);
  }

  async findByEmail(email) {
    const id = this.idsByEmail.get(email.trim().toLowerCase());
    return id ? this.usersById.get(id) : null;
  }

  async findById(id) {
    return this.usersById.get(id) || null;
  }

  async validatePassword(user, password) {
    return bcrypt.compare(password, user.passwordHash);
  }

  async setResetToken(user, ttlMinutes) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    user.resetTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.resetTokenExpiresAt = Date.now() + ttlMinutes * 60 * 1000;
    return rawToken;
  }

  async findByValidResetToken(rawToken) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    for (const user of this.usersById.values()) {
      if (
        user.resetTokenHash &&
        user.resetTokenHash === tokenHash &&
        user.resetTokenExpiresAt &&
        user.resetTokenExpiresAt > Date.now()
      ) {
        return user;
      }
    }
    return null;
  }

  async setPassword(user, newPassword) {
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.resetTokenHash = null;
    user.resetTokenExpiresAt = null;
  }

  toSafeObject(user) {
    const { passwordHash, resetTokenHash, resetTokenExpiresAt, ...safe } = user;
    return safe;
  }
}

module.exports = new UserStore();
