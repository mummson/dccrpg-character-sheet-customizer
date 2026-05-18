/**
 * Data store for DCC RPG Character Sheet Customizer
 * Handles all actor flag and module setting persistence
 */

const MODULE_ID = 'dccrpg-character-sheet-customizer'

/**
 * Get module configuration from settings
 * Returns both custom abilities and panels
 * @returns {Object} Configuration object { abilities: [], panels: [] }
 */
export function getModuleConfig () {
  try {
    const configJson = game.settings.get(MODULE_ID, 'moduleConfig')
    const config = JSON.parse(configJson)
    
    // Ensure structure exists
    return {
      abilities: config?.abilities || [],
      panels: config?.panels || []
    }
  } catch (err) {
    console.warn(`${MODULE_ID} | Failed to parse module config, returning default`, err)
    return getDefaultModuleConfig()
  }
}

/**
 * Set module configuration in settings
 * @param {Object} config - Configuration object { abilities: [], panels: [] }
 */
export async function setModuleConfig (config) {
  const configJson = JSON.stringify(config)
  await game.settings.set(MODULE_ID, 'moduleConfig', configJson)
}

/**
 * Get default module configuration
 * @returns {Object} Default empty configuration
 */
export function getDefaultModuleConfig () {
  return {
    abilities: [],
    panels: []
  }
}

/**
 * Get custom abilities configuration
 * @returns {Array} Array of ability field configs
 */
export function getAbilitiesConfig () {
  const config = getModuleConfig()
  return config.abilities || []
}

/**
 * Get panels configuration
 * @returns {Array} Array of panel configs
 */
export function getPanelsConfig () {
  const config = getModuleConfig()
  return config.panels || []
}

/**
 * LEGACY: Get panel configuration (for backwards compatibility)
 * @returns {Array} Array of panel configurations
 * @deprecated Use getModuleConfig() instead
 */
export function getPanelConfig () {
  return getPanelsConfig()
}

/**
 * LEGACY: Set panel configuration (for backwards compatibility)
 * @param {Array} panels - Array of panel configurations
 * @deprecated Use setModuleConfig() instead
 */
export async function setPanelConfig (panels) {
  const config = getModuleConfig()
  config.panels = panels
  await setModuleConfig(config)
}

/**
 * Get all field values for an actor
 * Returns both panel fields and ability fields
 * @param {Actor} actor - The actor to get values from
 * @returns {Object} Object with field values keyed by field ID
 */
export function getActorFieldValues (actor) {
  if (!actor) return {}
  
  const flags = actor.getFlag(MODULE_ID, 'fieldValues') || {}
  return { ...flags }
}

/**
 * Get a specific field value for an actor
 * @param {Actor} actor - The actor
 * @param {string} fieldId - The field ID
 * @returns {*} The field value (type depends on field type)
 */
export function getFieldValue (actor, fieldId) {
  if (!actor || !fieldId) return null
  
  const allValues = getActorFieldValues(actor)
  return allValues[fieldId]
}

/**
 * Set a specific field value for an actor
 * @param {Actor} actor - The actor
 * @param {string} fieldId - The field ID
 * @param {*} value - The value to set
 */
export async function setFieldValue (actor, fieldId, value) {
  if (!actor || !fieldId) return
  
  console.log(`${MODULE_ID} | setFieldValue: ${fieldId} =`, value)
  
  const allValues = getActorFieldValues(actor)
  allValues[fieldId] = value
  
  console.log(`${MODULE_ID} | Setting flag fieldValues to:`, allValues)
  await actor.setFlag(MODULE_ID, 'fieldValues', allValues)
  console.log(`${MODULE_ID} | Flag set successfully`)
}

/**
 * Set multiple field values at once
 * @param {Actor} actor - The actor
 * @param {Object} values - Object with fieldId: value pairs
 */
export async function setFieldValues (actor, values) {
  if (!actor || !values) return
  
  const allValues = getActorFieldValues(actor)
  Object.assign(allValues, values)
  
  await actor.setFlag(MODULE_ID, 'fieldValues', allValues)
}

/**
 * Get custom abilities for an actor
 * These are stored separately from panel fields for easier access in roll data
 * @param {Actor} actor - The actor
 * @returns {Object} Object with ability data keyed by ability ID
 * @example { sanity: { value: 14, max: 18, mod: 1 } }
 */
export function getCustomAbilities (actor) {
  if (!actor) {
    console.warn(`${MODULE_ID} | getCustomAbilities: No actor provided`)
    return {}
  }
  
  const abilities = actor.getFlag(MODULE_ID, 'abilities') || {}
  console.log(`${MODULE_ID} | getCustomAbilities for ${actor.name}:`, abilities)
  return { ...abilities }
}

/**
 * Get a specific custom ability
 * @param {Actor} actor - The actor
 * @param {string} abilityId - The ability ID
 * @returns {Object|null} Ability object with value, max, mod
 */
export function getCustomAbility (actor, abilityId) {
  if (!actor || !abilityId) return null
  
  const abilities = getCustomAbilities(actor)
  return abilities[abilityId] || null
}

/**
 * Set a custom ability's values
 * @param {Actor} actor - The actor
 * @param {string} abilityId - The ability ID
 * @param {Object} data - Ability data { value, max, mod }
 */
export async function setCustomAbility (actor, abilityId, data) {
  if (!actor || !abilityId) {
    console.warn(`${MODULE_ID} | setCustomAbility: Missing actor or abilityId`)
    return
  }
  
  console.log(`${MODULE_ID} | setCustomAbility: ${abilityId} for ${actor.name}`)
  console.log(`${MODULE_ID} | Data to save:`, data)
  
  const abilities = getCustomAbilities(actor)
  console.log(`${MODULE_ID} | Current abilities before update:`, abilities)
  
  abilities[abilityId] = data
  
  console.log(`${MODULE_ID} | Updated abilities object:`, abilities)
  console.log(`${MODULE_ID} | Calling actor.setFlag...`)
  
  try {
    await actor.setFlag(MODULE_ID, 'abilities', abilities)
    console.log(`${MODULE_ID} | ✓ Flag 'abilities' set successfully`)
    
    // Verify the save
    const verified = actor.getFlag(MODULE_ID, 'abilities')
    console.log(`${MODULE_ID} | Verified flag value:`, verified)
    console.log(`${MODULE_ID} | Verified ability ${abilityId}:`, verified[abilityId])
  } catch (error) {
    console.error(`${MODULE_ID} | ✗ Error setting flag:`, error)
    throw error
  }
}

/**
 * Set multiple custom abilities at once
 * @param {Actor} actor - The actor
 * @param {Object} abilitiesData - Object with abilityId: data pairs
 */
export async function setCustomAbilities (actor, abilitiesData) {
  if (!actor || !abilitiesData) return
  
  const abilities = getCustomAbilities(actor)
  Object.assign(abilities, abilitiesData)
  
  await actor.setFlag(MODULE_ID, 'abilities', abilities)
}

/**
 * Delete a custom ability
 * @param {Actor} actor - The actor
 * @param {string} abilityId - The ability ID to delete
 */
export async function deleteCustomAbility (actor, abilityId) {
  if (!actor || !abilityId) return
  
  const abilities = getCustomAbilities(actor)
  delete abilities[abilityId]
  
  await actor.setFlag(MODULE_ID, 'abilities', abilities)
}

/**
 * Clear all field values for an actor
 * @param {Actor} actor - The actor
 */
export async function clearActorFieldValues (actor) {
  if (!actor) return
  
  await actor.unsetFlag(MODULE_ID, 'fieldValues')
}

/**
 * Clear all custom abilities for an actor
 * @param {Actor} actor - The actor
 */
export async function clearCustomAbilities (actor) {
  if (!actor) return
  
  await actor.unsetFlag(MODULE_ID, 'abilities')
}

/**
 * Clear all module data for an actor
 * @param {Actor} actor - The actor
 */
export async function clearAllActorData (actor) {
  if (!actor) return
  
  await actor.unsetFlag(MODULE_ID, 'fieldValues')
  await actor.unsetFlag(MODULE_ID, 'abilities')
}

/**
 * Export module ID for use in other files
 */
export { MODULE_ID }