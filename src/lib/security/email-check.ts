/**
 * Disposable Email Domain Blocker
 * 
 * Prevents trial abuse by blocking temporary/disposable email providers.
 * Uses a lightweight blocklist approach for performance.
 */

// Comprehensive list of known disposable email domains
// Source: Combined from multiple anti-abuse databases
const DISPOSABLE_DOMAINS = new Set([
  // Common temporary email services
  '10minutemail.com', 'guerrillamail.com', 'mailinator.com', 'tempmail.com',
  'throwaway.email', 'getnada.com', 'trashmail.com', 'fakeinbox.com',
  'temp-mail.org', 'sharklasers.com', 'guerrillamail.info', 'grr.la',
  'guerrillamail.biz', 'guerrillamail.de', 'guerrillamail.net', 'guerrillamail.org',
  'yopmail.com', 'yopmail.fr', 'cool.fr.nf', 'jetable.fr.nf', 'nospam.ze.tc',
  'nomail.xl.cx', 'mega.zik.dj', 'speed.1s.fr', 'courriel.fr.nf', 'moncourrier.fr.nf',
  'maildrop.cc', 'maildrop.cf', 'maildrop.ga', 'maildrop.gq', 'maildrop.ml',
  'emailondeck.com', 'ema ilondeck.com', 'emltmp.com', 'getairmail.com',
  'dispostable.com', 'throwam.com', 'mytemp.email', 'tempinbox.com',
  'mohmal.com', 'throwawaymail.com', 'tempm.com', 'incognitomail.com',
  'tmailor.com', 'tmailinator.com', 'anonymbox.com', 'spamgourmet.com',
  'mailcatch.com', 'mintemail.com', 'spamex.com', 'spambox.us',
  'no-spam.ws', 'meltmail.com', 'spamfree24.org', 'spamfree24.de',
  'spamfree24.eu', 'spamfree24.info', 'spamfree24.net', 'spamfree24.org',
  'spam4.me', 'spamcannon.com', 'spamcannon.net', 'spamcon.org',
  
  // Newer services (2024-2026)
  'tmpmail.net', 'tmpmail.org', 'minutemail.com', '10minemail.com',
  'emailfake.com', 'tempmail.de', 'tempmail.it', 'tempmail.plus',
  'moakt.com', 'dropmail.me', 'inboxkitten.com', 'fakemail.net',
  'anonbox.net', 'burnermail.io', 'guerrillamailblock.com', 'temp-link.net',
  
  // Country-specific temporary services
  'tempmail.ng', 'tempmail.pk', 'tempmail.in', 'temp-mail.ru',
  'fake-box.com', 'e4ward.com', 'mailnesia.com', 'mailnull.com',
  
  // Crypto/Web3 throwaway services
  'ethmail.cc', 'tempmail.tech', 'chainmail.io', 'web3mail.com',
  
  // Common patterns
  'temp.mail', 'throwaway.link', 'disposable.email', 'spam.com',
]);

/**
 * Common patterns for disposable email domains
 * Matches: tempXXX.com, disposableXXX.net, etc.
 */
const DISPOSABLE_PATTERNS = [
  /^temp[a-z0-9]*mail/i,
  /^disposable/i,
  /^throwaway/i,
  /^fake[a-z]*mail/i,
  /^trash[a-z]*mail/i,
  /^spam[a-z0-9]*/i,
  /^guerrilla/i,
  /burner/i,
  /10min/i,
  /minute.*mail/i,
];

/**
 * Check if an email domain is a known disposable/temporary email provider
 */
export function isDisposableEmail(email: string): boolean {
  try {
    const domain = email.toLowerCase().split('@')[1]?.trim();
    if (!domain) return false;

    // Check against known disposable domains
    if (DISPOSABLE_DOMAINS.has(domain)) {
      return true;
    }

    // Check against pattern matches
    for (const pattern of DISPOSABLE_PATTERNS) {
      if (pattern.test(domain)) {
        return true;
      }
    }

    return false;
  } catch {
    // If email parsing fails, allow it (fail open for legitimate edge cases)
    return false;
  }
}

/**
 * Extract the email domain from a full email address
 */
export function extractEmailDomain(email: string): string {
  try {
    return email.toLowerCase().split('@')[1]?.trim() || '';
  } catch {
    return '';
  }
}

/**
 * Validate email format (basic RFC 5322 compliance)
 */
export function isValidEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Comprehensive email validation for signup
 * Returns { valid: boolean, reason?: string }
 */
export function validateSignupEmail(email: string): { valid: boolean; reason?: string } {
  if (!email || email.trim().length === 0) {
    return { valid: false, reason: 'Email is required.' };
  }

  if (!isValidEmailFormat(email)) {
    return { valid: false, reason: 'Please enter a valid email address.' };
  }

  if (isDisposableEmail(email)) {
    return { 
      valid: false, 
      reason: 'Temporary/disposable email addresses are not allowed. Please use a permanent business email.' 
    };
  }

  return { valid: true };
}
