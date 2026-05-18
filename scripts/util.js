/**
 * Utility functions for DCC RPG Character Sheet Customizer
 */

/**
 * DCC Core Rules Ability Modifier Table
 * Maps ability scores (3-24) to their modifiers
 */
export const ABILITY_MODIFIERS = {
  3: -3,
  4: -2,
  5: -2,
  6: -1,
  7: -1,
  8: -1,
  9: 0,
  10: 0,
  11: 0,
  12: 0,
  13: 1,
  14: 1,
  15: 1,
  16: 2,
  17: 2,
  18: 3,
  19: 4,
  20: 5,
  21: 6,
  22: 7,
  23: 8,
  24: 9
}

/**
 * Get the ability modifier for a given ability score
 * @param {number} score - The ability score (3-24)
 * @returns {number} The modifier (-3 to +9)
 */
export function getAbilityModifier (score) {
  const clampedScore = Math.max(3, Math.min(24, parseInt(score) || 10))
  return ABILITY_MODIFIERS[clampedScore] || 0
}

/**
 * Convert a string to a URL-safe slug
 * @param {string} text - The text to slugify
 * @returns {string} Lowercase alphanumeric slug with hyphens
 * @example slugify("My Custom Field") => "my-custom-field"
 */
export function slugify (text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // Replace spaces with hyphens
    .replace(/[^\w\-]+/g, '')    // Remove non-word chars except hyphens
    .replace(/\-\-+/g, '-')      // Replace multiple hyphens with single hyphen
    .replace(/^-+/, '')          // Trim hyphens from start
    .replace(/-+$/, '')          // Trim hyphens from end
}

/**
 * Debounce a function call
 * @param {Function} func - The function to debounce
 * @param {number} wait - Milliseconds to wait before executing
 * @returns {Function} Debounced function
 */
export function debounce (func, wait = 300) {
  let timeout
  return function executedFunction (...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Format a number with a sign (+/-)
 * Matches DCC system's numberFormat helper behavior
 * @param {number} value - The number to format
 * @returns {string} Formatted string with sign
 * @example ensureSign(3) => "+3"
 * @example ensureSign(-2) => "-2"
 * @example ensureSign(0) => "+0"
 */
export function ensureSign (value) {
  const num = parseInt(value) || 0
  return num >= 0 ? `+${num}` : `${num}`
}

/**
 * Generate a unique ID for a field
 * @param {string} prefix - Optional prefix for the ID
 * @returns {string} Unique ID string
 */
export function generateId (prefix = 'field') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Deep clone an object (simple implementation for our needs)
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
export function deepClone (obj) {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Check if a value is empty (null, undefined, or empty string)
 * @param {*} value - Value to check
 * @returns {boolean} True if empty
 */
export function isEmpty (value) {
  return value === null || value === undefined || value === ''
}

/**
 * Safely get a nested property from an object
 * @param {Object} obj - Object to traverse
 * @param {string} path - Dot-notation path (e.g., "system.abilities.str.mod")
 * @param {*} defaultValue - Default value if path not found
 * @returns {*} Value at path or default
 */
export function getProperty (obj, path, defaultValue = undefined) {
  const travel = regexp =>
    String.prototype.split
      .call(path, regexp)
      .filter(Boolean)
      .reduce((res, key) => (res !== null && res !== undefined ? res[key] : res), obj)
  const result = travel(/[,[\]]+?/) || travel(/[,[\].]+?/)
  return result === undefined || result === obj ? defaultValue : result
}

/**
 * Safely set a nested property on an object
 * @param {Object} obj - Object to modify
 * @param {string} path - Dot-notation path
 * @param {*} value - Value to set
 */
export function setProperty (obj, path, value) {
  const keys = path.split('.')
  const lastKey = keys.pop()
  const target = keys.reduce((o, k) => {
    if (!o[k]) o[k] = {}
    return o[k]
  }, obj)
  target[lastKey] = value
}