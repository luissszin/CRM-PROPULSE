import 'dotenv/config';


const requiredEnvs = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_ACCESS_SECRET'
];

/**
 * Validates that all required environment variables are set.
 * Throws an error if any are missing in production.
 */
function validate() {
  const missing = requiredEnvs.filter(env => !process.env[env]);
  
  if (missing.length > 0) {
    const errorMsg = `Missing required environment variables: ${missing.join(', ')}`;
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ FATAL ERROR:', errorMsg);
      process.exit(1);
    } else {
      console.warn('⚠️ WARNING:', errorMsg);
    }
  }
}

validate();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 3000,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY,
  EVOLUTION_API_BASE_URL: process.env.EVOLUTION_API_BASE_URL,
  // Fallbacks for DEV only, strictly controlled
  get jwtSecret() {
    if (!this.JWT_ACCESS_SECRET) {
      if (this.NODE_ENV === 'production') {
        throw new Error('JWT_ACCESS_SECRET must be set in production!');
      }
      return 'dev-secret-only-not-for-production';
    }
    return this.JWT_ACCESS_SECRET;
  }
};
