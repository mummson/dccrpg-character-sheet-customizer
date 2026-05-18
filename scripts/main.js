/**
 * DCC RPG Character Sheet Customizer
 * Main entry point
 */

import { registerSettings, CustomizerConfigDialog } from './settings.js'
import { injectCustomFields } from './renderer.js'

const MODULE_ID = 'dccrpg-character-sheet-customizer'

/**
 * Initialize the module
 */
Hooks.once('init', function () {
  console.log(`${MODULE_ID} | Initializing`)
  
  // Register settings
  registerSettings()
  
  console.log(`${MODULE_ID} | Initialized`)
})

/**
 * Hook into character sheet rendering (Classic sheets)
 */
Hooks.on('renderActorSheet', function (app, html, data) {
  handleSheetRender(app, html, data, false)
})

/**
 * Hook into character sheet rendering (V2 sheets - DCC uses this!)
 */
Hooks.on('renderActorSheetV2', function (app, html, data) {
  handleSheetRender(app, html, data, true)
})

/**
 * Handle sheet rendering for both classic and V2 sheets
 * @param {ActorSheet} app - The sheet application
 * @param {jQuery|HTMLElement} html - The sheet HTML
 * @param {Object} data - The sheet data
 * @param {boolean} isV2 - True if this is a V2 sheet
 */
function handleSheetRender (app, html, data, isV2) {
  console.log(`${MODULE_ID} | Sheet render hook fired (V2: ${isV2})`)
  console.log(`${MODULE_ID} | App:`, app)
  console.log(`${MODULE_ID} | Actor:`, app.actor || app.document)
  
  // Get the actor (V2 sheets use app.document instead of app.actor)
  const actor = app.actor || app.document
  
  if (!actor) {
    console.log(`${MODULE_ID} | No actor found, skipping`)
    return
  }
  
  const actorType = actor.type
  console.log(`${MODULE_ID} | Actor type:`, actorType)
  
  if (actorType !== 'Player' && actorType !== 'NPC') {
    console.log(`${MODULE_ID} | Actor type not Player or NPC, skipping`)
    return
  }
  
  // Convert html to jQuery if needed
  const $html = html instanceof jQuery ? html : $(html)
  
  // Check if this is a DCC sheet
  const constructorCheck = app.constructor.name.includes('DCC')
  const hasClassCheck = $html.hasClass('dcc') || $html.find('.dcc').length > 0
  const gridCheck = $html.find('.character-grid, .npc-grid').length > 0
  
  console.log(`${MODULE_ID} | Constructor name:`, app.constructor.name, '- includes DCC?', constructorCheck)
  console.log(`${MODULE_ID} | Has .dcc class?`, hasClassCheck)
  console.log(`${MODULE_ID} | Has character-grid?`, gridCheck)
  
  const isDCCSheet = constructorCheck || hasClassCheck || gridCheck
  
  if (!isDCCSheet) {
    console.log(`${MODULE_ID} | Not a DCC sheet, skipping`)
    return
  }
  
  console.log(`${MODULE_ID} | DCC sheet detected, calling injectCustomFields`)
  
  try {
    injectCustomFields(app, $html)
  } catch (err) {
    console.error(`${MODULE_ID} | Error injecting custom fields:`, err)
  }
}

/**
 * Hook to add actor roll data for custom abilities
 * This allows @sanityMod syntax in rolls
 */
Hooks.on('prepareDCCActorRollData', function (actor, rollData) {
  if (!actor) return
  
  try {
    const customAbilities = actor.getFlag(MODULE_ID, 'abilities') || {}
    
    // Add each custom ability to roll data
    for (const [abilityId, ability] of Object.entries(customAbilities)) {
      // Add modifier shorthand (e.g., @sanityMod)
      const modKey = `${abilityId}Mod`
      rollData[modKey] = ability.mod || 0
      
      // Add full ability data (e.g., @customAbilities.sanity.value)
      if (!rollData.customAbilities) {
        rollData.customAbilities = {}
      }
      rollData.customAbilities[abilityId] = {
        value: ability.value || 10,
        max: ability.max || 10,
        mod: ability.mod || 0
      }
    }
  } catch (err) {
    console.error(`${MODULE_ID} | Error preparing roll data:`, err)
  }
})

/**
 * Alternative hook for systems that don't have prepareDCCActorRollData
 * Wraps the getRollData method to inject custom abilities
 */
Hooks.once('ready', function () {
  // Check if the DCC system has the custom hook
  const hasDCCHook = Hooks.events['prepareDCCActorRollData']?.length > 0
  
  if (!hasDCCHook) {
    console.log(`${MODULE_ID} | Using getRollData wrapper for roll data injection`)
    
    // Wrap the Actor's getRollData method
    const originalGetRollData = CONFIG.Actor.documentClass.prototype.getRollData
    
    CONFIG.Actor.documentClass.prototype.getRollData = function () {
      const rollData = originalGetRollData.call(this)
      
      try {
        const customAbilities = this.getFlag(MODULE_ID, 'abilities') || {}
        
        for (const [abilityId, ability] of Object.entries(customAbilities)) {
          const modKey = `${abilityId}Mod`
          rollData[modKey] = ability.mod || 0
          
          if (!rollData.customAbilities) {
            rollData.customAbilities = {}
          }
          rollData.customAbilities[abilityId] = {
            value: ability.value || 10,
            max: ability.max || 10,
            mod: ability.mod || 0
          }
        }
      } catch (err) {
        console.error(`${MODULE_ID} | Error in getRollData wrapper:`, err)
      }
      
      return rollData
    }
  }
})

/**
 * Export the config dialog for manual access
 */
export { CustomizerConfigDialog }

console.log(`${MODULE_ID} | Module loaded`)