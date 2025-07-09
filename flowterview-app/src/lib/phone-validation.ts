/**
 * Phone number validation and formatting utilities
 */

export interface PhoneValidationResult {
  isValid: boolean;
  formatted: string;
  error?: string;
}

/**
 * Validate and format a phone number to international format
 */
export function validatePhoneNumber(phone: string): PhoneValidationResult {
  if (!phone) {
    return {
      isValid: false,
      formatted: "",
      error: "Phone number is required",
    };
  }

  // Remove all non-digit characters except + at the beginning
  const cleaned = phone.replace(/[^\d+]/g, "");

  // If it doesn't start with +, assume it's a US number and add +1
  let formatted = cleaned;
  if (!cleaned.startsWith("+")) {
    if (cleaned.length === 10) {
      // US number without country code
      formatted = "+1" + cleaned;
    } else if (cleaned.length === 11 && cleaned.startsWith("1")) {
      // US number with 1 prefix
      formatted = "+" + cleaned;
    } else if (cleaned.length === 10) {
      // Could be US number
      formatted = "+1" + cleaned;
    } else {
      return {
        isValid: false,
        formatted: phone,
        error: "Phone number must include country code (e.g., +1, +91)",
      };
    }
  } else {
    formatted = cleaned;
  }

  // Validate length (minimum 10 digits + country code)
  if (formatted.length < 10) {
    return {
      isValid: false,
      formatted: phone,
      error: "Phone number is too short",
    };
  }

  if (formatted.length > 16) {
    // ITU-T recommendation max length
    return {
      isValid: false,
      formatted: phone,
      error: "Phone number is too long",
    };
  }

  // Validate format
  const phonePattern = /^\+\d{1,4}\d{6,14}$/;
  if (!phonePattern.test(formatted)) {
    return {
      isValid: false,
      formatted: phone,
      error:
        "Invalid phone number format. Use international format like +1234567890",
    };
  }

  return {
    isValid: true,
    formatted,
  };
}

/**
 * Format phone number for display
 */
export function formatPhoneForDisplay(phone: string): string {
  if (!phone) return "";

  // Simple formatting for display
  if (phone.startsWith("+1") && phone.length === 12) {
    return `+1 (${phone.slice(2, 5)}) ${phone.slice(5, 8)}-${phone.slice(8)}`;
  }

  // For other country codes, just add spaces
  if (phone.startsWith("+")) {
    const countryCode = phone.match(/^\+(\d{1,4})/)?.[1] || "";
    const number = phone.slice(countryCode.length + 1);

    if (number.length >= 10) {
      // Format as +CC (XXX) XXX-XXXX for 10+ digit numbers
      return `+${countryCode} (${number.slice(0, 3)}) ${number.slice(
        3,
        6
      )}-${number.slice(6)}`;
    }

    return phone;
  }

  return phone;
}

/**
 * Get example phone number based on country code
 */
export function getPhoneExample(countryCode: string = "1"): string {
  const examples: Record<string, string> = {
    "1": "+1 (555) 123-4567", // US/Canada
    "91": "+91 98765 43210", // India
    "44": "+44 20 7946 0958", // UK
    "33": "+33 1 42 86 83 26", // France
    "49": "+49 30 12345678", // Germany
    "81": "+81 3 1234 5678", // Japan
    "86": "+86 138 0013 8000", // China
    "61": "+61 2 1234 5678", // Australia
    "55": "+55 11 99999 9999", // Brazil
  };

  return examples[countryCode] || "+1 (555) 123-4567";
}

/**
 * Extract country code from phone number
 */
export function extractCountryCode(phone: string): string {
  if (!phone.startsWith("+")) return "";

  const match = phone.match(/^\+(\d{1,4})/);
  return match?.[1] || "";
}

/**
 * Check if phone number is likely valid for a specific country
 */
export function isValidForCountry(phone: string, countryCode: string): boolean {
  const validation = validatePhoneNumber(phone);
  if (!validation.isValid) return false;

  const phoneCountryCode = extractCountryCode(validation.formatted);
  return phoneCountryCode === countryCode;
}
