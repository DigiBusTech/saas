/**
 * Browser Fingerprinting Utilities
 * 
 * Generates a unique device fingerprint to detect trial abuse.
 * Uses client-side data hashed for privacy.
 */

/**
 * Generate a browser fingerprint from client-side data
 * This should be called on the client side and sent to the server
 * 
 * @returns A hash representing the browser/device fingerprint
 */
export async function generateFingerprint(): Promise<string> {
  try {
    const components: string[] = [];

    // Screen resolution
    components.push(`${window.screen.width}x${window.screen.height}`);
    components.push(`${window.screen.colorDepth}`);

    // Timezone
    components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

    // Language
    components.push(navigator.language);

    // Platform
    components.push(navigator.platform);

    // User agent
    components.push(navigator.userAgent);

    // Hardware concurrency (CPU cores)
    components.push(`${navigator.hardwareConcurrency || 'unknown'}`);

    // Device memory (if available)
    // @ts-expect-error - deviceMemory is not in all TS definitions
    if (navigator.deviceMemory) {
      // @ts-expect-error
      components.push(`${navigator.deviceMemory}GB`);
    }

    // Canvas fingerprint (lightweight version)
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = 200;
      canvas.height = 50;
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('SabiBio🔒', 2, 2);
      components.push(canvas.toDataURL().slice(0, 100)); // First 100 chars only
    }

    // WebGL fingerprint (lightweight)
    try {
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        // @ts-expect-error - getParameter types
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          // @ts-expect-error
          components.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
          // @ts-expect-error
          components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
        }
      }
    } catch {
      // WebGL not available, skip
    }

    // Combine all components and hash
    const fingerprint = await hashString(components.join('|'));
    return fingerprint;
  } catch (error) {
    console.error('[generateFingerprint] Error:', error);
    // Fallback to a simpler fingerprint
    return await hashString(navigator.userAgent + window.screen.width + window.screen.height);
  }
}

/**
 * Simple hash function using Web Crypto API
 * SHA-256 hash of the input string
 */
async function hashString(input: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch {
    // Fallback to a simple hash if Web Crypto API is not available
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
}

/**
 * Check if fingerprinting is supported in the current environment
 */
export function isFingerprintingSupported(): boolean {
  return typeof window !== 'undefined' && 
         typeof navigator !== 'undefined' && 
         typeof document !== 'undefined';
}
