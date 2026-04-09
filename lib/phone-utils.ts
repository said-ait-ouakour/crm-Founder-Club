/**
 * Utility functions for phone number formatting and validation
 */

/**
 * Cleans a phone number by removing all spaces, dashes, parentheses, and other formatting
 * Ensures the number starts with a country code (+)
 */
export function cleanPhoneNumber(phoneNumber: string | null | undefined): string {
  if (!phoneNumber) return "";
  
  // Remove all spaces, dashes, parentheses, and other formatting characters
  let cleaned = phoneNumber.replace(/[\s\-\(\)\.]/g, "");
  
  // If it doesn't start with +, assume it's a UK number and add +44
  if (!cleaned.startsWith("+")) {
    // Remove leading 0 if present (UK numbers often start with 0)
    if (cleaned.startsWith("0")) {
      cleaned = cleaned.substring(1);
    }
    // Add UK country code
    cleaned = "+44" + cleaned;
  }
  
  return cleaned;
}

/**
 * Formats a phone number for display while keeping it clean
 * Returns the cleaned number for consistency
 */
export function formatPhoneNumber(phoneNumber: string | null | undefined): string {
  return cleanPhoneNumber(phoneNumber);
}

/**
 * Validates if a phone number has a proper country code
 */
export function hasCountryCode(phoneNumber: string | null | undefined): boolean {
  if (!phoneNumber) return false;
  const cleaned = cleanPhoneNumber(phoneNumber);
  return cleaned.startsWith("+");
}

/**
 * Gets the country code from a phone number
 */
export function getCountryCode(phoneNumber: string | null | undefined): string {
  if (!phoneNumber) return "";
  const cleaned = cleanPhoneNumber(phoneNumber);
  const match = cleaned.match(/^\+(\d{1,4})/);
  return match ? match[1] : "";
}

/**
 * Gets the national number (without country code)
 */
export function getNationalNumber(phoneNumber: string | null | undefined): string {
  if (!phoneNumber) return "";
  const cleaned = cleanPhoneNumber(phoneNumber);
  const match = cleaned.match(/^\+\d{1,4}(.+)$/);
  return match ? match[1] : cleaned;
}
