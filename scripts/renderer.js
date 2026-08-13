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
  setCustomAbility,
  scopeMatchesActor
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

  // Get configuration, then narrow to what's scoped to this actor's type. Missing/
  // 'both' appliesTo always passes, so pre-existing configs render exactly as before.
  const abilities = getAbilitiesConfig().filter(a => scopeMatchesActor(a.appliesTo, actor.type))
  const panels = getPanelsConfig().filter(p => scopeMatchesActor(p.appliesTo, actor.type))

  console.log('dccrpg-character-sheet-customizer | Abilities config:', abilities)
  console.log('dccrpg-character-sheet-customizer | Panels config:', panels)

  // Inject a single full-width separator into character-grid before any custom content
  if (abilities.length > 0 || panels.length > 0) {
    injectCustomSeparator(html)
  }

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
 * Insert newNode immediately after the last previously-injected customizer element
 * inside grid (tracked via the [data-customizer-container] marker), falling back to
 * after .lucky-roll (PC sheets only), then a plain append. Used to keep the separator
 * -> abilities -> panels DOM order correct regardless of which blocks are present for
 * a given actor.
 */
function insertAfterLastCustomizerNode (grid, newNode) {
  const lastCustom = grid.find('[data-customizer-container]').last()
  if (lastCustom.length) {
    lastCustom.after(newNode)
    return
  }
  const luckyRoll = grid.find('.lucky-roll')
  if (luckyRoll.length) {
    luckyRoll.last().after(newNode)
    return
  }
  grid.append(newNode)
}

/**
 * Inject a single full-width separator into character-grid/npc-grid after lucky-roll.
 * Spans all columns so it forms one unbroken dotted line, matching DCC's own row-separators.
 */
function injectCustomSeparator (html) {
  const grid = html.find('.character-grid, .npc-grid').first()
  if (grid.length === 0) return
  const sep = $('<div class="customizer-row-separator" data-customizer-container="customizer-sep"></div>')
  insertAfterLastCustomizerNode(grid, sep)
}

/**
 * Inject ability fields for the actor. PC sheets have a dedicated .ability-scores
 * area to append into (below Luck); NPC sheets have no such area in the DCC system
 * template, so custom abilities render as a full-width row inside .npc-grid instead.
 * @param {ActorSheet} sheet - The character sheet
 * @param {jQuery} html - The sheet HTML
 * @param {Array} abilities - Array of ability field configs
 * @param {Actor} actor - The actor
 */
function injectAbilityFields (sheet, html, abilities, actor) {
  if (actor.type === 'NPC') {
    injectNPCAbilityFields(html, abilities, actor)
  } else {
    injectPCAbilityFields(html, abilities, actor)
  }
}

/**
 * Append custom abilities directly into the PC sheet's .ability-scores container,
 * below Luck, styled like core abilities.
 */
function injectPCAbilityFields (html, abilities, actor) {
  const abilitiesContainer = html.find('.ability-scores')
  if (abilitiesContainer.length === 0) {
    console.warn('dccrpg-character-sheet-customizer | Could not find .ability-scores container')
    return
  }

  const customAbilities = getCustomAbilities(actor)

  // First ability gets 'customizer-first-ability' for the border-top separator line.
  abilities.forEach((ability, index) => {
    const renderer = getFieldRenderer(ability.type)
    const value = customAbilities[ability.id] || {}

    const fieldHtml = renderer.renderAsAbility
      ? renderer.renderAsAbility(ability, value)
      : renderer.render(ability, value)

    const el = $(fieldHtml)
    if (index === 0) el.addClass('customizer-first-ability')
    abilitiesContainer.append(el)
  })
}

/**
 * DCC's NPC sheet has no ability-scores area at all, so custom abilities render as a
 * dedicated full-width row inside .npc-grid, reusing the same ability box HTML as PCs.
 */
function injectNPCAbilityFields (html, abilities, actor) {
  const npcGrid = html.find('.npc-grid')
  if (npcGrid.length === 0) {
    console.warn('dccrpg-character-sheet-customizer | Could not find .npc-grid container')
    return
  }

  const customAbilities = getCustomAbilities(actor)

  const wrapper = $('<div class="customizer-npc-abilities" data-customizer-container="npc-abilities"></div>')

  abilities.forEach(ability => {
    const renderer = getFieldRenderer(ability.type)
    const value = customAbilities[ability.id] || {}

    const fieldHtml = renderer.renderAsAbility
      ? renderer.renderAsAbility(ability, value)
      : renderer.render(ability, value)

    wrapper.append($(fieldHtml))
  })

  insertAfterLastCustomizerNode(npcGrid, wrapper)
}

/**
 * Inject panels inside the character-grid, inserted after lucky-roll in DOM order.
 * Panels use grid-column 2/span-3 (matching lucky-roll) so they appear under Lucky Roll.
 * The CSS :has(.customizer-panel) rule switches character-grid to height:auto.
 * @param {ActorSheet} sheet - The character sheet
 * @param {jQuery} html - The sheet HTML
 * @param {Array} panels - Array of panel configs with fields
 * @param {Actor} actor - The actor
 */
function injectPanels (sheet, html, panels, actor) {
  console.log('dccrpg-character-sheet-customizer | injectPanels called with', panels.length, 'panels')

  if (panels.length === 0) return

  const fieldValues = getActorFieldValues(actor)

  const characterGrid = html.find('.character-grid, .npc-grid').first()
  if (characterGrid.length === 0) {
    console.warn('dccrpg-character-sheet-customizer | Could not find character grid')
    return
  }

  panels.forEach(panel => {
    console.log('dccrpg-character-sheet-customizer | Creating panel:', panel.label)

    const panelElement = $(`<div class="customizer-panel box-border" data-customizer-container="panel" data-panel-id="${panel.id}"><label class="box-title">${panel.label}</label><div class="customizer-panel-content"></div></div>`)

    const content = panelElement.find('.customizer-panel-content')

    if (panel.fields && panel.fields.length > 0) {
      panel.fields.forEach(field => {
        const renderer = getFieldRenderer(field.type)
        const value = fieldValues[field.id]
        content.append(renderer.render(field, value))
      })
    }

    insertAfterLastCustomizerNode(characterGrid, panelElement)
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

    // Handle checkboxes (Toggle) and number inputs
    if (input.attr('type') === 'checkbox') {
      value = input.prop('checked')
    } else if (input.attr('data-dtype') === 'Number' || input.attr('type') === 'number') {
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

  // Listen for Resource +/- button clicks - clamps Current to 0..Max, reading
  // Max live from its sibling input (not a hardcoded ceiling)
  html.off('click.customizer-resource').on('click.customizer-resource', '.customizer-resource-btn', function (event) {
    event.preventDefault()
    event.stopPropagation()

    const button = $(this)
    const action = button.data('action')
    const fieldId = button.data('field-id')

    if (!fieldId) {
      console.warn('dccrpg-character-sheet-customizer | Resource button missing field ID')
      return
    }

    const container = button.closest('.customizer-resource')
    const currentInput = container.find('input[data-field-part="current"]')
    const maxInput = container.find('input[data-field-part="max"]')

    let current = parseInt(currentInput.val()) || 0
    const max = parseInt(maxInput.val()) || 0

    if (action === 'increment') {
      current = Math.min(current + 1, max)
    } else if (action === 'decrement') {
      current = Math.max(current - 1, 0)
    }

    currentInput.val(current)

    console.log('dccrpg-character-sheet-customizer | Resource:', fieldId, '=', current)
    queueSave(actor, fieldId, current, 'current')
  })

  // Listen for ability check rolls on custom abilities
  html.off('click.customizer-roll').on('click.customizer-roll', '[data-action="rollAbilityCheck"][data-field-id]', async function (event) {
    event.preventDefault()
    const element = $(this)
    const fieldId = element.data('field-id')

    await rollCustomAbilityCheck(actor, fieldId, event)
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
  } else if (fieldConfig.type === FIELD_TYPES.RESOURCE) {
    // Resource stores {current, max} in fieldValues, same shape as Current/Max
    // abilities store in the abilities flag, just under the other flag.
    console.log('dccrpg-character-sheet-customizer | Saving resource field:', fieldId, value, fieldPart)

    const fieldValues = getActorFieldValues(actor)
    const currentResource = fieldValues[fieldId] || {}

    if (fieldPart === 'current') {
      currentResource.current = value
    } else if (fieldPart === 'max') {
      currentResource.max = value
    }

    try {
      await setFieldValue(actor, fieldId, currentResource)
      console.log('dccrpg-character-sheet-customizer | ✓ Resource field saved successfully')
    } catch (error) {
      console.error('dccrpg-character-sheet-customizer | ✗ Error saving resource field:', error)
      throw error
    }
  } else {
    // Handle panel fields (Simple, SimpleNum, Stepper, Choice, Toggle) stored in fieldValues flag
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
 * Resolve the roll-over bonus for a rollable custom ability, given its
 * configured source. 'own' uses the ability's own modifier (Custom Ability
 * type only - Current/Max has no modifier concept, so 'own' is a flat +0
 * there; pick a real stat from the dropdown, or use Roll Under against
 * Current instead). Any other source reads DCC's own rollData shorthand
 * keys directly (str/agl/sta/per/int/lck/frt/ref/wil), which already match
 * these source values one-to-one.
 * @param {Object} fieldConfig - The ability's config (id/type/rollConfig/etc.)
 * @param {Object} abilityValue - The actor's stored value for this ability
 * @param {string} source - rollConfig.source
 * @param {Object} rollData - actor.getRollData()
 * @returns {number}
 */
function resolveRollBonus (fieldConfig, abilityValue, source, rollData) {
  if (source === 'own') {
    return fieldConfig.type === FIELD_TYPES.CUSTOM_ABILITY ? (abilityValue.mod ?? 0) : 0
  }
  return parseInt(rollData[source]) || 0
}

/**
 * Resolve the roll-under target score for a rollable custom ability. 'own'
 * compares against the ability's own value (Custom Ability) or its current
 * value (Current/Max - e.g. "roll under current Sanity"). Any other source
 * compares against a core ability's raw SCORE (not its modifier), matching
 * how DCC's own Luck roll-under compares against the score. Only reachable
 * for str/agl/sta/per/int/lck - config-save validation rejects Roll Under
 * combined with a save source, since DCC saves never roll under.
 * @param {Actor} actor - The actor
 * @param {Object} fieldConfig - The ability's config
 * @param {Object} abilityValue - The actor's stored value for this ability
 * @param {string} source - rollConfig.source
 * @returns {number}
 */
function resolveRollUnderTarget (actor, fieldConfig, abilityValue, source) {
  if (source === 'own') {
    return fieldConfig.type === FIELD_TYPES.CUSTOM_ABILITY ? (abilityValue.value ?? 10) : (abilityValue.current ?? 0)
  }
  return parseInt(actor.system?.abilities?.[source]?.value) || 10
}

/**
 * Roll a rollable custom ability, dispatching to the roll-over or roll-under
 * path per its configured rollConfig.
 * @param {Actor} actor - The actor
 * @param {string} fieldId - The ability's field ID
 * @param {Event} [event] - The click event (ctrl/cmd-click toggles the roll
 *   modifier dialog, same as a real DCC ability check)
 */
async function rollCustomAbilityCheck (actor, fieldId, event) {
  const abilities = getAbilitiesConfig()
  const fieldConfig = abilities.find(f => f.id === fieldId)
  if (!fieldConfig) {
    ui.notifications.warn('Custom ability not found')
    return
  }

  // Abilities saved before Rollable existed have no rollConfig at all. Custom
  // Ability was always unconditionally rollable before this was
  // configurable; Current/Max never had a roll affordance before, so it
  // defaults to disabled (matches fields.js's own renderAsAbility default).
  const rollConfig = fieldConfig.rollConfig ??
    (fieldConfig.type === FIELD_TYPES.CUSTOM_ABILITY ? { enabled: true, source: 'own', rollUnder: false } : { enabled: false })
  if (!rollConfig.enabled) return // shouldn't be reachable (UI wouldn't emit the click target), but guard anyway

  const customAbilities = getCustomAbilities(actor)
  const abilityValue = customAbilities[fieldId] || {}
  const label = rollConfig.rollName?.trim() || fieldConfig.label || 'Custom Ability'
  const rollData = actor.getRollData()

  if (rollConfig.rollUnder) {
    await rollCustomAbilityRollUnder(actor, fieldConfig, abilityValue, rollConfig, label, rollData)
  } else {
    await rollCustomAbilityRollOver(actor, fieldConfig, abilityValue, rollConfig, label, rollData, event)
  }
}

/**
 * Roll-over path: 1d20 + a resolved bonus (or a freeform custom formula),
 * evaluated through game.dcc.DCCRoll.createRoll so it respects the same
 * modifier-dialog behavior (and Ctrl-click toggle) as a real DCC ability
 * check. DCCRoll.createRoll accepts a plain formula string directly (it
 * auto-decomposes it into Die/Modifier terms), so stat-sourced and
 * custom-formula rolls share this one path.
 */
async function rollCustomAbilityRollOver (actor, fieldConfig, abilityValue, rollConfig, label, rollData, event) {
  let formula
  if (rollConfig.source === 'custom') {
    formula = rollConfig.customFormula?.trim() || '1d20'
  } else {
    const bonus = resolveRollBonus(fieldConfig, abilityValue, rollConfig.source, rollData)
    formula = `1d20${bonus >= 0 ? '+' : ''}${bonus}`
  }

  const showModifierDialog = game.settings.get('dcc', 'showRollModifierByDefault') !== !!(event?.ctrlKey || event?.metaKey)

  let roll
  try {
    roll = await game.dcc.DCCRoll.createRoll(formula, rollData, { showModifierDialog })
  } catch (err) {
    // The modifier dialog was cancelled/closed without submitting - a normal
    // user decision, not an error. DCC signals this with a typed error, a
    // duck-typing marker, or (older-style) a bare null rejection.
    if (err === null || err?.isRollCancellation === true || err?.name === 'RollCancelledError') return
    throw err
  }
  // DCCRoll.createRoll always returns an UNEVALUATED Roll, whether or not the
  // dialog was shown - confirmed by reading systems/dcc/module/roll-modifier.js.
  await roll.evaluate()

  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `${label} Check`,
    flags: {
      'dcc.RollType': 'AbilityCheck',
      'dcc.Ability': fieldConfig.id,
      'dcc.isAbilityCheck': true
    },
    rollMode: game.settings.get('core', 'rollMode')
  })
}

/**
 * Roll-under path: mirrors DCC's own Luck check - a naked 1d20 (no
 * modifier), success if the roll is <= the target score, with the die
 * term tagged so the system's generic crit/fumble highlight hook inverts
 * correctly (low roll = success/green, high roll = failure/red). No
 * modifier dialog, matching how Luck's own roll-under never shows one.
 */
async function rollCustomAbilityRollUnder (actor, fieldConfig, abilityValue, rollConfig, label, rollData) {
  const target = resolveRollUnderTarget(actor, fieldConfig, abilityValue, rollConfig.source)
  const roll = new Roll('1d20', rollData)
  await roll.evaluate()

  const success = roll.total <= target
  const flavor = `${label} Check (Roll Under) — ${success ? 'Success' : 'Failure'}`

  const primaryTerm = roll.terms?.[0]
  if (primaryTerm) {
    primaryTerm.options = primaryTerm.options ?? {}
    primaryTerm.options.dcc = { rollUnder: true, lowerThreshold: target, upperThreshold: target + 1 }
  }

  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor,
    flags: {
      'dcc.RollType': 'AbilityCheckRollUnder',
      'dcc.Ability': fieldConfig.id,
      'dcc.isAbilityCheck': true
    },
    rollMode: game.settings.get('core', 'rollMode')
  })
}

/**
 * Auto-resize the sheet height to show all injected content without scrolling.
 * Double-rAF: first frame applies CSS :has() layout, second measures resulting geometry.
 * The character tab section has overflow:auto and clips its content, so we must measure
 * its internal overflow (scrollHeight - clientHeight) rather than window-content.scrollHeight.
 * @param {ActorSheet} sheet - The character sheet
 * @param {jQuery} html - The sheet HTML
 */
function autoResizeSheet (sheet, html) {
  const hasCustomContent = html.find('[data-customizer-container]').length > 0 ||
                           html.find('.customizer-ability-box').length > 0

  if (!hasCustomContent) return

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      try {
        const sheetEl = sheet.element instanceof jQuery ? sheet.element[0] : sheet.element
        const winEl = sheetEl?.closest?.('.window-app') ?? sheetEl
        if (!winEl) return

        const contentEl = winEl.querySelector('.window-content')
        if (!contentEl) return

        // The character tab section has overflow:auto — window-content.scrollHeight cannot
        // see overflow that is clipped inside the tab. Measure the tab directly instead.
        const characterTab = contentEl.querySelector('section[data-tab="character"]')
        if (!characterTab) return

        const overflow = characterTab.scrollHeight - characterTab.clientHeight
        if (overflow <= 10) return

        const maxH = Math.floor(window.innerHeight * 0.9)
        const desired = Math.min(winEl.offsetHeight + overflow, maxH)
        const current = sheet.position?.height ?? winEl.offsetHeight

        if (desired > current + 10) {
          sheet.setPosition({ height: desired })
        }
      } catch (e) {
        console.warn('dccrpg-character-sheet-customizer | autoResizeSheet failed', e)
      }
    })
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