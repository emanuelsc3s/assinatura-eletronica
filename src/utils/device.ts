/**
 * Generates a UUID v4
 * @returns UUID string
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Gets or creates a device ID from localStorage
 * @returns Device ID string
 */
export function getOrCreateDeviceId(): string {
  const DEVICE_ID_KEY = 'pdf_signature_device_id';
  
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    deviceId = generateUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  
  return deviceId;
}

/**
 * Gets the device ID from localStorage (returns null if not set)
 * @returns Device ID string or null
 */
export function getDeviceId(): string | null {
  return localStorage.getItem('pdf_signature_device_id');
}
