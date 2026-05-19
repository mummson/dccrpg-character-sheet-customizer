/**
 * Renderer for DCC RPG Character Sheet Customizer
 * Handles DOM injection, event binding, and persistence
 */

import { getAbilityModifier, ensureSign, debounce } from './util.js'
import { getFieldRenderer, isAbilityField, FIELD_TYPES } from './fields.js'
import { 
  getModuleConfig,
  getAbilitiesConfig,
  getPanelsConfig,
  getActorFieldValues,
  setFieldValue,
  getCustomAbilities,
  setCustomAbility
} from './store.js'

/**
 * Inject custom abilities and panels into a character sheet
 * @param {ActorSheet} sheet - The character sheet application
 * @param {jQuery} html - The sheet's HTML
 */
export function injectCustomFields (sheet, html) {
  const actor = sheet.actor || sheet.document
  if (!actor) return
  
  console.log('dccrpg-character-sheet-customizer | injectCustomFields called for', actor.name)
  
  // Remove any existing injected content to prevent duplicates
  html.find('[data-customizer-container]').remove()
  html.find('.customizer-ability-box').remove()
  html.find('.customizer-panel').remove()
  
  // Get configuration using the new structure
  const abilities = getAbilitiesConfig()
  const panels = getPanelsConfig()
  
  console.log('dccrpg-character-sheet-customizer | Abilities config:', abilities)
  console.log('dccrpg-character-sheet-customizer | Panels config:', panels)
  
  // Inject custom abilities (below Luck in abilities section)
  if (abilities.length > 0) {
    console.log('dccrpg-character-sheet-customizer | Injecting', abilities.length, 'abilities')
    injectAbilityFields(sheet, html, abilities, actor)
  } else {
    console.log('dccrpg-character-sheet-customizer | No abilities to inject')
  }
  
  // Inject panels (at bottom of character grid)
  if (panels.length > 0) {
    console.log('dccrpg-character-sheet-customizer | Injecting', panels.length, 'panels')
    injectPanels(sheet, html, panels, actor)
  } else {
    console.log('dccrpg-character-sheet-customizer | No panels to inject')
  }
  
  // Attach event listeners
  attachEventListeners(html, actor)
  
  // Auto-resize sheet if needed
  autoResizeSheet(sheet, html)
}

/**
 * Inject ability fields below Luck in the abilities area
 * @param {ActorSheet} sheet - The character sheet
 * @param {jQuery} html - The sheet HTML
 * @param {Array} abilities - Array of ability field configs
 * @param {Actor} actor - The actor
 */
function injectAbilityFields (sheet, html, abilities, actor) {
  console.log('dccrpg-character-sheet-customizer | injectAbilityFields called')
  
  // Find the abilities container
  const abilitiesContainer = html.find('.ability-scores')
  console.log('dccrpg-character-sheet-customizer | Found .ability-scores containers:', abilitiesContainer.length)
  
  if (abilitiesContainer.length === 0) {
    console.warn('dccrpg-character-sheet-customizer | Could not find .ability-scores container')
    return
  }
  
  // Get stored values
  const customAbilities = getCustomAbilities(actor)
  console.log('dccrpg-character-sheet-customizer | Custom abilities data:', JSON.stringify(customAbilities, null, 2))
  
  // Render each ability field and append directly to ability-scores container
  abilities.forEach(ability => {
    console.log('dccrpg-character-sheet-customizer | Rendering ability:', ability.label, 'type:', ability.type, 'id:', ability.id)
    const renderer = getFieldRenderer(ability.type)
    const value = customAbilities[ability.id] || {}
    console.log('dccrpg-character-sheet-customizer | Value for', ability.id, ':', JSON.stringify(value))
    
    // Use renderAsAbility method for proper styling
    const fieldHtml = renderer.renderAsAbility ? 
      renderer.renderAsAbility(ability, value) : 
      renderer.render(ability, value)
    
    console.log('dccrpg-character-sheet-customizer | Generated HTML length:', fieldHtml.length)
    
    // Append directly inside the ability-scores container (after Luck)
    abilitiesContainer.append(fieldHtml)
  })
  
  console.log('dccrpg-character-sheet-customizer | Abilities injected successfully')
}

/**
 * Inject panels into a container placed after the character-grid (not inside it).
 * Placing panels inside the grid causes them to auto-place into an implicit row at
 * the bottom of a height:100% grid, creating a large empty gap above the panels.
 * @param {ActorSheet} sheet - The character sheet
 * @param {jQuery} html - The sheet HTML
 * @param {Array} panels - Array of panel configs with fields
 * @param {Actor} actor - The actor
 */
function injectPanels (sheet, html, panels, actor) {
  console.log('dccrpg-character-sheet-customizer | injectPanels called with', panels.length, 'panels')

  if (panels.length === 0) return

  const fieldValues = getActorFieldValues(actor)

  // Find the character grid — panels container goes after it as a sibling
  const characterGrid = html.find('.character-grid, .npc-grid').first()
  if (characterGrid.length === 0) {
    console.warn('dccrpg-character-sheet-customizer | Could not find character grid')
    return
  }

  // Create a single wrapper that triggers the CSS :has() override on character-grid height
  const panelsContainer = $('<div class="customizer-panels-container" data-customizer-container="panels-wrapper"></div>')
  characterGrid.after(panelsContainer)

  panels.forEach(panel => {
    console.log('dccrpg-character-sheet-customizer | Creating panel:', panel.label)

    const panelElement = $(`
      <div class="customizer-panel" data-panel-id="${panel.id}">
        <label class="box-title">${panel.label}</label>
        <div class="customizer-panel-content"></div>
      </div>
    `)

    const content = panelElement.find('.customizer-panel-content')

    if (panel.fields && panel.fields.length > 0) {
      panel.fields.forEach(field => {
        const renderer = getFieldRenderer(field.type)
        const value = fieldValues[field.id]
        content.append(renderer.render(field, value))
      })
    }

    panelsContainer.append(panelElement)
  })

  console.log('dccrpg-character-sheet-customizer | Panels injected successfully')
}

// Module-level save queue to prevent race conditions
const pendingSaves = new Map()
let saveInProgress = false

/**
 * Process the save queue sequentially
 */
async function processSaveQueue (actor) {
  if (saveInProgress || pendingSaves.size === 0) return
  
  saveInProgress = true
  
  try {
    // Get all pending saves and clear the queue
    const savesToProcess = new Map(pendingSaves)
    pendingSaves.clear()
    
    // Process each unique field (last value wins)
    for (const [key, saveData] of savesToProcess) {
      try {
        await saveFieldValue(actor, saveData.fieldId, saveData.value, saveData.fieldPart)
      } catch (err) {
        console.error('dccrpg-character-sheet-customizer | Error saving field:', err)
      }
    }
  } finally {
    saveInProgress = false
    
    // If more saves queued while we were processing, continue
    if (pendingSaves.size > 0) {
      setTimeout(() => processSaveQueue(actor), 50)
    }
  }
}

/**
 * Queue a save operation (debounced, last-value-wins per field)
 */
function queueSave (actor, fieldId, value, fieldPart) {
  const key = `${fieldId}-${fieldPart || 'value'}`
  pendingSaves.set(key, { fieldId, value, fieldPart })
  
  // Debounce the queue processing
  clearTimeout(queueSave._timeout)
  queueSave._timeout = setTimeout(() => processSaveQueue(actor), 300)
}

/**
 * Attach event listeners for field changes
 * @param {jQuery} html - The sheet HTML
 * @param {Actor} actor - The actor
 */
function attachEventListeners (html, actor) {
  console.log('dccrpg-character-sheet-customizer | attachEventListeners called')
  console.log('dccrpg-character-sheet-customizer | Actor:', actor.name)

  
 // Count custom inputs for debugging
  const customInputs = html.find('[data-field-id]')
  console.log('dccrpg-character-sheet-customizer | Found', customInputs.length, 'custom inputs')
  
  // Listen for input changes on all custom fields
  // Use 'change' only (not blur)
  html.on('change', '[data-field-id]:input', function (event) {
    const input = $(this)
    const fieldId = input.data('field-id')
    const fieldPart = input.data('field-part')
    
    // Skip disabled inputs or stepper inputs (handled separately)
    if (input.prop('disabled') || input.hasClass('customizer-stepper-input')) {
      return
    }
    
    let value = input.val()
    
    // Handle number inputs
    if (input.attr('data-dtype') === 'Number' || input.attr('type') === 'number') {
      value = parseInt(value) || 0
    }
    
    console.log('dccrpg-character-sheet-customizer | Field change:', fieldId, '=', value)
    queueSave(actor, fieldId, value, fieldPart)
  })
  
  // Listen for stepper button clicks - use event delegation with namespace
  html.off('click.customizer-stepper').on('click.customizer-stepper', '.customizer-stepper-btn', function (event) {
    event.preventDefault()
    event.stopPropagation()
    
    const button = $(this)
    const action = button.data('action')
    
    // Find the input in the same stepper container
    const stepper = button.closest('.customizer-stepper')
    const input = stepper.find('input.customizer-stepper-input')
    const fieldId = input.data('field-id')
    
    if (!fieldId) {
      console.warn('dccrpg-character-sheet-customizer | Stepper missing field ID')
      return
    }
    
    let currentValue = parseInt(input.val()) || 0
    
    if (action === 'increment') {
      currentValue++
    } else if (action === 'decrement') {
      currentValue--
    }
    
    // Update the input visually (don't trigger change event)
    input.val(currentValue)
    
    // Queue the save (will be debounced and deduplicated)
    console.log('dccrpg-character-sheet-customizer | Stepper:', fieldId, '=', currentValue)
    queueSave(actor, fieldId, currentValue, undefined)
  })
  
  // Listen for ability check rolls on custom abilities
  html.off('click.customizer-roll').on('click.customizer-roll', '[data-action="rollAbilityCheck"][data-field-id]', async function (event) {
    event.preventDefault()
    const element = $(this)
    const fieldId = element.data('field-id')
    
    await rollCustomAbilityCheck(actor, fieldId)
  })
  
  console.log('dccrpg-character-sheet-customizer | Event listeners attached')
}

/**
 * Save a field value to actor flags
 * @param {Actor} actor - The actor
 * @param {string} fieldId - The field ID
 * @param {*} value - The new value
 * @param {string} fieldPart - Optional part ('value', 'max', 'current')
 */
async function saveFieldValue (actor, fieldId, value, fieldPart) {
  console.log('dccrpg-character-sheet-customizer | ========== SAVE FIELD VALUE ==========')
  console.log('dccrpg-character-sheet-customizer | Field ID:', fieldId)
  console.log('dccrpg-character-sheet-customizer | Value:', value)
  console.log('dccrpg-character-sheet-customizer | Field Part:', fieldPart)
  
  // Get all configurations
  const abilities = getAbilitiesConfig()
  const panels = getPanelsConfig()
  
  console.log('dccrpg-character-sheet-customizer | Abilities config:', abilities)
  console.log('dccrpg-character-sheet-customizer | Panels config:', panels)
  
  // Check if this is an ability field
  let fieldConfig = abilities.find(f => f.id === fieldId)
  let isAbility = !!fieldConfig
  
  console.log('dccrpg-character-sheet-customizer | Found in abilities?', isAbility)
  
  // If not found in abilities, check panels
  if (!fieldConfig) {
    for (const panel of panels) {
      const found = panel.fields?.find(f => f.id === fieldId)
      if (found) {
        fieldConfig = found
        console.log('dccrpg-character-sheet-customizer | Found in panel:', panel.label)
        break
      }
    }
  }
  
  if (!fieldConfig) {
    console.warn(`dccrpg-character-sheet-customizer | Field config not found: ${fieldId}`)
    return
  }
  
  console.log('dccrpg-character-sheet-customizer | Field config:', fieldConfig)
  console.log('dccrpg-character-sheet-customizer | Field type:', fieldConfig.type)
  console.log('dccrpg-character-sheet-customizer | Is ability field?', isAbility || isAbilityField(fieldConfig.type))
  
  // Handle ability fields (CustomAbility, CurrentMax) stored in abilities flag
  if (isAbility || isAbilityField(fieldConfig.type)) {
    const customAbilities = getCustomAbilities(actor)
    console.log('dccrpg-character-sheet-customizer | Current abilities data:', customAbilities)
    
    const currentAbility = customAbilities[fieldId] || {}
    console.log('dccrpg-character-sheet-customizer | Current ability before update:', currentAbility)
    
    if (fieldConfig.type === FIELD_TYPES.CUSTOM_ABILITY) {
      // Update specific part
      if (fieldPart === 'value') {
        currentAbility.value = value
        currentAbility.mod = getAbilityModifier(value)
        console.log('dccrpg-character-sheet-customizer | Updated ability value:', value, 'mod:', currentAbility.mod)
      } else if (fieldPart === 'max') {
        currentAbility.max = value
        console.log('dccrpg-character-sheet-customizer | Updated ability max:', value)
      }
      
      // Update modifier display in UI
      const modInput = $(`input[data-field-id="${fieldId}"][data-field-part="mod"]`)
      if (modInput.length > 0 && fieldPart === 'value') {
        modInput.val(ensureSign(currentAbility.mod))
      }
    } else if (fieldConfig.type === FIELD_TYPES.CURRENT_MAX) {
      // Update current or max
      if (fieldPart === 'current') {
        currentAbility.current = value
        console.log('dccrpg-character-sheet-customizer | Updated current:', value)
      } else if (fieldPart === 'max') {
        currentAbility.max = value
        console.log('dccrpg-character-sheet-customizer | Updated max:', value)
      }
    }
    
    console.log('dccrpg-character-sheet-customizer | Ability data to save:', currentAbility)
    console.log('dccrpg-character-sheet-customizer | Calling setCustomAbility...')
    
    try {
      await setCustomAbility(actor, fieldId, currentAbility)
      console.log('dccrpg-character-sheet-customizer | ✓ Ability saved successfully')
      
      // Verify it was saved
      const verified = getCustomAbilities(actor)
      console.log('dccrpg-character-sheet-customizer | Verified saved data:', verified[fieldId])
    } catch (error) {
      console.error('dccrpg-character-sheet-customizer | ✗ Error saving ability:', error)
      throw error
    }
  } else {
    // Handle panel fields (Simple, SimpleNum, Stepper) stored in fieldValues flag
    console.log('dccrpg-character-sheet-customizer | Saving panel field:', fieldId, value)
    
    try {
      await setFieldValue(actor, fieldId, value)
      console.log('dccrpg-character-sheet-customizer | ✓ Panel field saved successfully')
      
      // Verify it was saved
      const verified = getActorFieldValues(actor)
      console.log('dccrpg-character-sheet-customizer | Verified saved data:', verified[fieldId])
    } catch (error) {
      console.error('dccrpg-character-sheet-customizer | ✗ Error saving panel field:', error)
      throw error
    }
  }
  
  console.log('dccrpg-character-sheet-customizer | ========================================')
}

/**
 * Roll a custom ability check
 * @param {Actor} actor - The actor
 * @param {string} fieldId - The field ID
 */
async function rollCustomAbilityCheck (actor, fieldId) {
  const customAbilities = getCustomAbilities(actor)
  const ability = customAbilities[fieldId]
  
  if (!ability) {
    ui.notifications.warn('Custom ability not found')
    return
  }
  
  // Find field config for label
  const abilities = getAbilitiesConfig()
  const fieldConfig = abilities.find(f => f.id === fieldId)
  
  const label = fieldConfig?.label || 'Custom Ability'
  const modifier = ability.mod || 0
  
  // Create roll formula
  const formula = `1d20+${modifier}`
  
  // Create and evaluate roll
  const roll = new Roll(formula, actor.getRollData())
  await roll.evaluate({ async: true })
  
  // Send to chat
  roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `${label} Check`,
    rollMode: game.settings.get('core', 'rollMode')
  })
}

/**
 * Auto-resize the sheet height to show all injected content without scrolling.
 * Uses requestAnimationFrame so the browser has applied layout before we measure.
 * @param {ActorSheet} sheet - The character sheet
 * @param {jQuery} html - The sheet HTML
 */
function autoResizeSheet (sheet, html) {
  const hasCustomContent = html.find('[data-customizer-container]').length > 0 ||
                           html.find('.customizer-ability-box').length > 0

  if (!hasCustomContent) return

  // Defer one frame — the CSS :has() override on character-grid height needs a layout flush
  requestAnimationFrame(() => {
    try {
      // sheet.element is the window root in both AppV1 and AppV2
      const sheetEl = sheet.element instanceof jQuery ? sheet.element[0] : sheet.element
      const winEl = sheetEl?.closest?.('.window-app') ?? sheetEl
      if (!winEl) return

      const contentEl = winEl.querySelector('.window-content')
      if (!contentEl) return

      // Chrome = everything outside window-content (header, borders)
      const chromeOffset = winEl.offsetHeight - contentEl.offsetHeight
      const needed = contentEl.scrollHeight + chromeOffset
      const maxH = Math.floor(window.innerHeight * 0.9)
      const desired = Math.min(needed, maxH)
      const current = sheet.position?.height ?? winEl.offsetHeight

      if (desired > current + 24) {
        sheet.setPosition({ height: desired })
      }
    } catch (e) {
      console.warn('dccrpg-character-sheet-customizer | autoResizeSheet failed', e)
    }
  })
}

/**
 * Clear all custom fields from a sheet
 * @param {jQuery} html - The sheet HTML
 */
export function clearCustomFields (html) {
  html.find('[data-customizer-container]').remove()
  html.find('.customizer-ability-box').remove()
  html.find('.customizer-panel').remove()
}

/**
 * MANUAL TEST FUNCTION - Call from console to test save mechanism
 * Usage in console:
 *   const actor = game.actors.getName("Your Character Name")
 *   game.modules.get('dccrpg-character-sheet-customizer').api.testSave(actor, 'ability-1763204023224-cu5bdcsbl', {value: 14, max: 18, mod: 1})
 */
window.customizerTestSave = async function(actor, abilityId, data) {
  console.log('=== MANUAL TEST SAVE ===')
  console.log('Actor:', actor.name)
  console.log('Ability ID:', abilityId)
  console.log('Data:', data)
  
  const { setCustomAbility, getCustomAbilities } = await import('./store.js')
  
  console.log('Before save:', getCustomAbilities(actor))
  await setCustomAbility(actor, abilityId, data)
  console.log('After save:', getCustomAbilities(actor))
  console.log('=== TEST COMPLETE ===')
}

console.log('dccrpg-character-sheet-customizer | Test function available: window.customizerTestSave(actor, abilityId, data)')