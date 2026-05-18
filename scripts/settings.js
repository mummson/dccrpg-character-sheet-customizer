/**
 * Configuration dialog for DCC RPG Character Sheet Customizer
 */

import { generateId, slugify } from './util.js'
import { getModuleConfig, setModuleConfig } from './store.js'
import { FIELD_TYPES } from './fields.js'

export class CustomizerConfigDialog extends FormApplication {
  constructor (options = {}) {
    super({}, options)
    const config = getModuleConfig()
    this.abilities = config.abilities || []
    this.panels = config.panels || []
    this._skipSubmit = false
  }

  static get defaultOptions () {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'customizer-config',
      title: 'Character Sheet Customizer - Configuration',
      template: 'modules/dccrpg-character-sheet-customizer/templates/config.html',
      width: 700,
      height: 600,
      resizable: true,
      closeOnSubmit: false,
      submitOnChange: false,
      submitOnClose: false
    })
  }

  getData () {
    console.log('getData called - abilities:', this.abilities.length, 'panels:', this.panels.length)
    this.panels.forEach((p, i) => {
      console.log(`  Panel ${i}: "${p.label}" has ${p.fields?.length || 0} fields`)
    })
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

  activateListeners (html) {
    super.activateListeners(html)

    // Ability section listeners
    html.find('.add-ability').on('click', (event) => {
      event.preventDefault()
      this.addAbility()
    })

    html.find('.delete-ability').on('click', (event) => {
      event.preventDefault()
      const abilityIndex = $(event.currentTarget).data('ability-index')
      this.deleteAbility(abilityIndex)
    })

    // Panel section listeners
    html.find('.add-panel').on('click', (event) => {
      event.preventDefault()
      this.addPanel()
    })

    html.find('.delete-panel').on('click', (event) => {
      event.preventDefault()
      const panelIndex = $(event.currentTarget).data('panel-index')
      this.deletePanel(panelIndex)
    })

    html.find('.add-field').on('click', (event) => {
      event.preventDefault()
      const panelIndex = $(event.currentTarget).data('panel-index')
      this.addField(panelIndex)
    })

    html.find('.delete-field').on('click', (event) => {
      event.preventDefault()
      const panelIndex = $(event.currentTarget).data('panel-index')
      const fieldIndex = $(event.currentTarget).data('field-index')
      this.deleteField(panelIndex, fieldIndex)
    })

    // Reset configuration
    html.find('.reset-config').on('click', (event) => {
      event.preventDefault()
      this.resetConfig()
    })
  }

  /**
   * Override render to skip form submission during non-save renders
   */
  async render (force = false, options = {}) {
    this._skipSubmit = true
    const result = await super.render(force, options)
    // Reset after a tick to allow the render cycle to complete
    setTimeout(() => {
      this._skipSubmit = false
    }, 100)
    return result
  }

  /**
   * Add a new custom ability
   */
  addAbility () {
    const newAbility = {
      id: generateId('ability'),
      label: 'New Ability',
      type: FIELD_TYPES.CUSTOM_ABILITY
    }
    
    this.abilities.push(newAbility)
    this.render()
  }

  /**
   * Delete a custom ability
   * @param {number} abilityIndex - Index of ability to delete
   */
  deleteAbility (abilityIndex) {
    Dialog.confirm({
      title: 'Delete Ability',
      content: '<p>Are you sure you want to delete this ability?</p>',
      yes: () => {
        this.abilities.splice(abilityIndex, 1)
        this.render()
      },
      no: () => {},
      defaultYes: false
    })
  }

  /**
   * Add a new panel
   */
  addPanel () {
    const newPanel = {
      id: generateId('panel'),
      label: 'New Panel',
      fields: []
    }
    
    this.panels.push(newPanel)
    this.render()
  }

  /**
   * Delete a panel
   * @param {number} panelIndex - Index of panel to delete
   */
  deletePanel (panelIndex) {
    Dialog.confirm({
      title: 'Delete Panel',
      content: '<p>Are you sure you want to delete this panel and all its fields?</p>',
      yes: () => {
        this.panels.splice(panelIndex, 1)
        this.render()
      },
      no: () => {},
      defaultYes: false
    })
  }

  /**
   * Add a field to a panel
   * @param {number} panelIndex - Index of panel
   */
  addField (panelIndex) {
    console.log('========== ADD FIELD ==========')
    console.log('Panel index:', panelIndex)
    console.log('Current panels:', JSON.parse(JSON.stringify(this.panels)))
    
    const panel = this.panels[panelIndex]
    if (!panel) {
      console.error('Panel not found!')
      return
    }
    
    console.log('Panel found:', JSON.parse(JSON.stringify(panel)))
    
    const newField = {
      id: generateId('field'),
      label: 'New Field',
      type: FIELD_TYPES.SIMPLE
    }
    
    console.log('Adding field:', newField)
    
    panel.fields.push(newField)
    
    console.log('Panel after:', JSON.parse(JSON.stringify(panel)))
    console.log('All panels:', JSON.parse(JSON.stringify(this.panels)))
    
    this.render()
  }

  /**
   * Delete a field from a panel
   * @param {number} panelIndex - Index of panel
   * @param {number} fieldIndex - Index of field
   */
  deleteField (panelIndex, fieldIndex) {
    const panel = this.panels[panelIndex]
    if (!panel) return
    
    panel.fields.splice(fieldIndex, 1)
    this.render()
  }

  /**
   * Reset configuration to default (empty)
   */
  resetConfig () {
    Dialog.confirm({
      title: 'Reset Configuration',
      content: '<p>Are you sure you want to reset all configuration? This will delete all abilities and panels.</p><p><strong>Warning:</strong> This will not delete data from existing actors.</p>',
      yes: () => {
        this.abilities = []
        this.panels = []
        this.render()
      },
      no: () => {},
      defaultYes: false
    })
  }

  /**
   * Handle form submission
   * @param {Event} event - Submit event
   * @param {Object} formData - Form data
   */
  async _updateObject (event, formData) {
    // Skip if this is a render-triggered submit, not a real user submit
    if (this._skipSubmit) {
      console.log('Skipping auto-submit during render')
      return
    }
    
    console.log('Processing real form submission')
    
    try {
      // Parse form data into abilities and panels
      const parsed = this.parseFormData(formData)
      
      // Validate
      const validation = this.validateConfig(parsed)
      if (!validation.valid) {
        ui.notifications.error(validation.error)
        return
      }
      
      // Save to settings
      await setModuleConfig(parsed)
      this.abilities = parsed.abilities
      this.panels = parsed.panels
      
      ui.notifications.info('Configuration saved! Re-open character sheets to see changes.')
      
      // Re-render to show saved state
      this.render()
      
    } catch (err) {
      console.error('dccrpg-character-sheet-customizer | Error saving config:', err)
      ui.notifications.error('Failed to save configuration')
    }
  }

  /**
   * Parse form data into config structure
   * @param {Object} formData - Raw form data
   * @returns {Object} Parsed config { abilities: [], panels: [] }
   */
  parseFormData (formData) {
    console.log('========== PARSE FORM DATA ==========')
    console.log('All form keys:', Object.keys(formData))
    
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
    
    console.log('Parsed abilities:', abilities.length)
    
    // Parse panels
    const panelData = {}
    for (const [key, value] of Object.entries(formData)) {
      const match = key.match(/^panels\[(\d+)\]\.(.+)$/)
      if (!match) continue
      
      console.log('  Panel key matched:', key, '=', value)
      
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
          
          console.log('    Field matched: panel', panelIndex, 'field', fieldIndex, 'prop', fieldProp, '=', value)
          
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
      
      console.log('Panel', index, 'before filter:', panel.fields.length, 'fields')
      
      // Clean up fields array (remove holes)
      panel.fields = panel.fields.filter(f => f)
      
      console.log('Panel', index, 'after filter:', panel.fields.length, 'fields')
      console.log('Panel', index, 'fields:', JSON.parse(JSON.stringify(panel.fields)))
      
      panels.push(panel)
    }
    
    console.log('Returning parsed config with', panels.length, 'panels')
    
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