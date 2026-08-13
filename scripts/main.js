/**
 * DCC RPG Character Sheet Customizer
 * Main entry point
 */

import { registerSettings, CustomizerConfigDialog } from './settings.js'
import { injectCustomFields } from './renderer.js'
import { getAbilitiesConfig } from './store.js'

const MODULE_ID = 'dccrpg-character-sheet-customizer'

/**
 * Initialize the module
 */
Hooks.once('init', function () {
  console.log(`${MODULE_ID} | Initializing`)

  // Register settings
  registerSettings()

  // Used by the config dialog to round-trip a Choice field's options array
  // through a plain multiline textarea.
  Handlebars.registerHelper('joinLines', arr => (Array.isArray(arr) ? arr.join('\n') : ''))

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
 * Add each custom ability's data to an actor's roll data, keyed by its
 * configured Roll Key (e.g. @sanityMod, @customAbilities.sanity.value)
 * rather than its internal storage ID. Abilities saved before Roll Key
 * existed fall back to their storage ID, unchanged from prior behavior.
 * @param {Actor} actor - The actor
 * @param {Object} rollData - The roll data object to extend in place
 */
function injectCustomAbilityRollData (actor, rollData) {
  const storedAbilities = actor.getFlag(MODULE_ID, 'abilities') || {}
  const abilityConfigs = getAbilitiesConfig()

  rollData.customAbilities = rollData.customAbilities || {}

  for (const config of abilityConfigs) {
    const stored = storedAbilities[config.id] || {}
    const rollKey = config.rollKey || config.id
    const mod = stored.mod ?? 0

    rollData[`${rollKey}Mod`] = mod
    rollData.customAbilities[rollKey] = {
      // Current/Max fields store {current, max} rather than {value, max}
      value: stored.value ?? stored.current ?? 10,
      max: stored.max ?? 10,
      mod
    }
  }
}

/**
 * Wrap the Actor's getRollData method to inject custom ability roll data.
 * DCC does not fire a dedicated hook for this, so the actual method is
 * wrapped directly (confirmed by reading the DCC system source: it calls
 * actor.getRollData() itself, there is no "prepareDCCActorRollData" hook).
 */
Hooks.once('ready', function () {
  const originalGetRollData = CONFIG.Actor.documentClass.prototype.getRollData

  CONFIG.Actor.documentClass.prototype.getRollData = function () {
    const rollData = originalGetRollData.call(this)

    try {
      injectCustomAbilityRollData(this, rollData)
    } catch (err) {
      console.error(`${MODULE_ID} | Error in getRollData wrapper:`, err)
    }

    return rollData
  }
})

/**
 * Export the config dialog for manual access
 */
export { CustomizerConfigDialog }

console.log(`${MODULE_ID} | Module loaded`)