/**
 * Configuration dialog for DCC RPG Character Sheet Customizer
 */

import { generateId } from './util.js'
import { getModuleConfig, setModuleConfig } from './store.js'
import { FIELD_TYPES } from './fields.js'

const { ApplicationV2, DialogV2, HandlebarsApplicationMixin } = foundry.applications.api

export class CustomizerConfigDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor (options = {}) {
    super(options)
    const config = getModuleConfig()
    this.abilities = config.abilities || []
    this.panels = config.panels || []
  }

  static DEFAULT_OPTIONS = {
    id: 'customizer-config',
    tag: 'form',
    classes: ['dccrpg-customizer-config'],
    window: {
      title: 'Character Sheet Customizer - Configuration',
      icon: 'fas fa-cogs',
      resizable: true
    },
    position: {
      width: 700,
      height: 600
    },
    form: {
      handler: CustomizerConfigDialog.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: false
    },
    actions: {
      addAbility: CustomizerConfigDialog.#onAddAbility,
      deleteAbility: CustomizerConfigDialog.#onDeleteAbility,
      addPanel: CustomizerConfigDialog.#onAddPanel,
      deletePanel: CustomizerConfigDialog.#onDeletePanel,
      addField: CustomizerConfigDialog.#onAddField,
      deleteField: CustomizerConfigDialog.#onDeleteField,
      resetConfig: CustomizerConfigDialog.#onResetConfig
    }
  }

  static PARTS = {
    form: {
      template: 'modules/dccrpg-character-sheet-customizer/templates/config.html'
    }
  }

  /** @override */
  async _prepareContext (options) {
    return {
      abilities: this.abilities,
      panels: this.panels,
      abilityTypes: [
        { value: FIELD_TYPES.CUSTOM_ABILITY, label: 'Custom Ability' },
        { value: FIELD_TYPES.CURRENT_MAX, label: 'Current/Max' }
      ],
      panelFieldTypes: [
        { value: FIELD_TYPES.SIMPLE, label: 'Text' },
        { value: FIELD_TYPES.SIMPLE_NUM, label: 'Number' },
        { value: FIELD_TYPES.STEPPER, label: 'Stepper' }
      ]
    }
  }

  /**
   * Handle form submission
   */
  static async #onSubmit (event, form, formData) {
    try {
      const parsed = this.parseFormData(formData.object)

      const validation = this.validateConfig(parsed)
      if (!validation.valid) {
        ui.notifications.error(validation.error)
        return
      }

      await setModuleConfig(parsed)
      this.abilities = parsed.abilities
      this.panels = parsed.panels

      ui.notifications.info('Configuration saved! Re-open character sheets to see changes.')

      this.render()
    } catch (err) {
      console.error('dccrpg-character-sheet-customizer | Error saving config:', err)
      ui.notifications.error('Failed to save configuration')
    }
  }

  /**
   * Add a new custom ability
   */
  static async #onAddAbility (event, target) {
    this.abilities.push({
      id: generateId('ability'),
      label: 'New Ability',
      type: FIELD_TYPES.CUSTOM_ABILITY
    })
    this.render()
  }

  /**
   * Delete a custom ability
   */
  static async #onDeleteAbility (event, target) {
    const abilityIndex = Number(target.dataset.abilityIndex)

    const confirmed = await DialogV2.confirm({
      window: { title: 'Delete Ability' },
      content: '<p>Are you sure you want to delete this ability?</p>',
      modal: true
    })
    if (!confirmed) return

    this.abilities.splice(abilityIndex, 1)
    this.render()
  }

  /**
   * Add a new panel
   */
  static async #onAddPanel (event, target) {
    this.panels.push({
      id: generateId('panel'),
      label: 'New Panel',
      fields: []
    })
    this.render()
  }

  /**
   * Delete a panel
   */
  static async #onDeletePanel (event, target) {
    const panelIndex = Number(target.dataset.panelIndex)

    const confirmed = await DialogV2.confirm({
      window: { title: 'Delete Panel' },
      content: '<p>Are you sure you want to delete this panel and all its fields?</p>',
      modal: true
    })
    if (!confirmed) return

    this.panels.splice(panelIndex, 1)
    this.render()
  }

  /**
   * Add a field to a panel
   */
  static async #onAddField (event, target) {
    const panelIndex = Number(target.dataset.panelIndex)
    const panel = this.panels[panelIndex]
    if (!panel) return

    panel.fields.push({
      id: generateId('field'),
      label: 'New Field',
      type: FIELD_TYPES.SIMPLE
    })
    this.render()
  }

  /**
   * Delete a field from a panel
   */
  static async #onDeleteField (event, target) {
    const panelIndex = Number(target.dataset.panelIndex)
    const fieldIndex = Number(target.dataset.fieldIndex)
    const panel = this.panels[panelIndex]
    if (!panel) return

    panel.fields.splice(fieldIndex, 1)
    this.render()
  }

  /**
   * Reset configuration to default (empty)
   */
  static async #onResetConfig (event, target) {
    const confirmed = await DialogV2.confirm({
      window: { title: 'Reset Configuration' },
      content: '<p>Are you sure you want to reset all configuration? This will delete all abilities and panels.</p><p><strong>Warning:</strong> This will not delete data from existing actors.</p>',
      modal: true
    })
    if (!confirmed) return

    this.abilities = []
    this.panels = []
    this.render()
  }

  /**
   * Parse form data into config structure
   * @param {Object} formData - Flat form data object (name-attribute keys, e.g. "abilities[0].label")
   * @returns {Object} Parsed config { abilities: [], panels: [] }
   */
  parseFormData (formData) {
    const abilities = []
    const panels = []

    // Parse abilities
    const abilityData = {}
    for (const [key, value] of Object.entries(formData)) {
      const match = key.match(/^abilities\[(\d+)\]\.(.+)$/)
      if (!match) continue

      const abilityIndex = parseInt(match[1])
      const prop = match[2]

      if (!abilityData[abilityIndex]) {
        abilityData[abilityIndex] = {
          id: this.abilities[abilityIndex]?.id || generateId('ability')
        }
      }

      abilityData[abilityIndex][prop] = value
    }

    // Convert to array
    for (const index in abilityData) {
      abilities.push(abilityData[index])
    }

    // Parse panels
    const panelData = {}
    for (const [key, value] of Object.entries(formData)) {
      const match = key.match(/^panels\[(\d+)\]\.(.+)$/)
      if (!match) continue

      const panelIndex = parseInt(match[1])
      const path = match[2]

      if (!panelData[panelIndex]) {
        panelData[panelIndex] = {
          id: this.panels[panelIndex]?.id || generateId('panel'),
          fields: []
        }
      }

      if (path === 'label') {
        panelData[panelIndex].label = value
      } else if (path === 'id') {
        // Skip - we already have ID from memory
      } else {
        // Handle field data
        const fieldMatch = path.match(/^fields\[(\d+)\]\.(.+)$/)
        if (fieldMatch) {
          const fieldIndex = parseInt(fieldMatch[1])
          const fieldProp = fieldMatch[2]

          if (!panelData[panelIndex].fields[fieldIndex]) {
            panelData[panelIndex].fields[fieldIndex] = {
              id: this.panels[panelIndex]?.fields[fieldIndex]?.id || generateId('field')
            }
          }

          panelData[panelIndex].fields[fieldIndex][fieldProp] = value
        }
      }
    }

    // Convert to array and clean up
    for (const index in panelData) {
      const panel = panelData[index]

      // Clean up fields array (remove holes)
      panel.fields = panel.fields.filter(f => f)

      panels.push(panel)
    }

    return { abilities, panels }
  }

  /**
   * Validate configuration
   * @param {Object} config - Config to validate { abilities: [], panels: [] }
   * @returns {Object} Validation result { valid: boolean, error: string }
   */
  validateConfig (config) {
    const validAbilityTypes = [FIELD_TYPES.CUSTOM_ABILITY, FIELD_TYPES.CURRENT_MAX]
    const validPanelFieldTypes = [FIELD_TYPES.SIMPLE, FIELD_TYPES.SIMPLE_NUM, FIELD_TYPES.STEPPER]

    // Validate abilities
    const abilityIds = new Set()
    for (const ability of config.abilities) {
      if (!ability.label || ability.label.trim() === '') {
        return { valid: false, error: 'All abilities must have a label' }
      }

      if (!validAbilityTypes.includes(ability.type)) {
        return { valid: false, error: `Invalid ability type: ${ability.type}` }
      }

      if (abilityIds.has(ability.id)) {
        return { valid: false, error: 'Duplicate ability ID detected' }
      }
      abilityIds.add(ability.id)
    }

    // Validate panels
    const panelIds = new Set()
    const allFieldIds = new Set(abilityIds) // Include ability IDs to check for conflicts

    for (const panel of config.panels) {
      if (!panel.label || panel.label.trim() === '') {
        return { valid: false, error: 'All panels must have a label' }
      }

      if (panelIds.has(panel.id)) {
        return { valid: false, error: 'Duplicate panel ID detected' }
      }
      panelIds.add(panel.id)

      // Validate fields
      for (const field of panel.fields) {
        if (!field.label || field.label.trim() === '') {
          return { valid: false, error: 'All fields must have a label' }
        }

        if (!validPanelFieldTypes.includes(field.type)) {
          return { valid: false, error: `Invalid field type: ${field.type}` }
        }

        if (allFieldIds.has(field.id)) {
          return { valid: false, error: 'Duplicate field ID detected' }
        }
        allFieldIds.add(field.id)
      }
    }

    return { valid: true }
  }
}

/**
 * Register module settings
 */
export function registerSettings () {
  game.settings.register('dccrpg-character-sheet-customizer', 'moduleConfig', {
    name: 'Module Configuration',
    hint: 'Configuration data for custom abilities and panels',
    scope: 'world',
    config: false,
    type: String,
    default: JSON.stringify({ abilities: [], panels: [] })
  })

  // Add config button to module settings
  game.settings.registerMenu('dccrpg-character-sheet-customizer', 'configMenu', {
    name: 'Configure Custom Fields',
    label: 'Open Configuration',
    hint: 'Configure custom abilities and panels for character sheets',
    icon: 'fas fa-cogs',
    type: CustomizerConfigDialog,
    restricted: true
  })
}
