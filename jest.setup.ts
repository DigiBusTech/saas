// Jest setup file
// Add any global test configuration here
import { expect } from '@jest/globals';

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key';

// Add custom matchers if needed
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  },
  toBeValidTimestamp(received: string) {
    try {
      new Date(received).toISOString();
      return {
        message: () => `expected ${received} not to be a valid timestamp`,
        pass: true,
      };
    } catch {
      return {
        message: () => `expected ${received} to be a valid ISO timestamp`,
        pass: false,
      };
    }
  },
});
