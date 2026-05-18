/**
 * Field type definitions for DCC RPG Character Sheet Customizer
 * Each field type has render, serialize, and deserialize methods
 */

import { getAbilityModifier, ensureSign, slugify } from './util.js'

/**
 * Field Types Registry
 */
export const FIELD_TYPES = {
  SIMPLE: 'simple',
  SIMPLE_NUM: 'simpleNum',
  CURRENT_MAX: 'currentMax',
  STEPPER: 'stepper',
  CUSTOM_ABILITY: 'customAbility'
}

/**
 * Simple Text Field
 * Single text input
 */
export const SimpleField = {
  type: FIELD_TYPES.SIMPLE,
  label: 'Text',
  
  /**
   * Render the field HTML
   * @param {Object} fieldConfig - Field configuration
   * @param {*} value - Current value
   * @returns {string} HTML string
   */
  render (fieldConfig, value = '') {
    const fieldId = fieldConfig.id
    const label = fieldConfig.label || 'Field'
    const safeValue = value || ''
    
    return `
      <label class="customizer-label" for="customizer-${fieldId}">${label}</label>
      <input 
        type="text" 
        class="customizer-input"
        id="customizer-${fieldId}" 
        name="customizer-${fieldId}"
        value="${safeValue}"
        data-field-id="${fieldId}"
      >
    `
  },
  
  /**
   * Serialize value for storage
   * @param {*} value - Value from input
   * @returns {string} Serialized value
   */
  serialize (value) {
    return String(value || '')
  },
  
  /**
   * Deserialize value from storage
   * @param {*} stored - Stored value
   * @returns {string} Deserialized value
   */
  deserialize (stored) {
    return String(stored || '')
  }
}

/**
 * Simple Number Field
 * Single number input
 */
export const SimpleNumField = {
  type: FIELD_TYPES.SIMPLE_NUM,
  label: 'Number',
  
  render (fieldConfig, value = 0) {
    const fieldId = fieldConfig.id
    const label = fieldConfig.label || 'Field'
    const safeValue = value ?? 0
    
    return `
      <label class="customizer-label" for="customizer-${fieldId}">${label}</label>
      <input 
        type="number" 
        class="customizer-input"
        id="customizer-${fieldId}" 
        name="customizer-${fieldId}"
        value="${safeValue}"
        data-field-id="${fieldId}"
      >
    `
  },
  
  serialize (value) {
    return parseInt(value) || 0
  },
  
  deserialize (stored) {
    return parseInt(stored) || 0
  }
}

/**
 * Current/Max Field
 * Two number inputs (current and max)
 * Used for tracking resources with maximum values
 * Rendered in abilities area, styled like core abilities but without modifier
 */
export const CurrentMaxField = {
  type: FIELD_TYPES.CURRENT_MAX,
  label: 'Current/Max',
  
  render (fieldConfig, value = {}) {
    const fieldId = fieldConfig.id
    const label = fieldConfig.label || 'Field'
    const current = value?.current ?? 0
    const max = value?.max ?? 0
    
    return `
      <div class="customizer-field customizer-currentmax" data-field-id="${fieldId}" data-field-type="${this.type}">
        <label class="customizer-label">${label}</label>
        <div class="customizer-currentmax-inputs">
          <input 
            type="number" 
            id="customizer-${fieldId}-current" 
            name="customizer-${fieldId}-current"
            value="${current}"
            data-field-id="${fieldId}"
            data-field-part="current"
            placeholder="0"
          >
          <span class="customizer-sep">/</span>
          <input 
            type="number" 
            id="customizer-${fieldId}-max" 
            name="customizer-${fieldId}-max"
            value="${max}"
            data-field-id="${fieldId}"
            data-field-part="max"
            placeholder="0"
          >
        </div>
      </div>
    `
  },
  
  /**
   * Render as ability box (for placement in abilities area)
   * Matches DCC .ability-box styling EXACTLY
   */
  renderAsAbility (fieldConfig, value = {}) {
    const fieldId = fieldConfig.id
    const label = fieldConfig.label || 'Field'
    const current = value?.current ?? 0
    const max = value?.max ?? 0
    
    return `
      <div class="ability-box customizer-ability-box" id="customizer-${fieldId}" data-field-id="${fieldId}" data-field-type="${this.type}">
        <label for="customizer-${fieldId}-current" class="box-title">
          ${label}
        </label>
        <div class="ability-score">
          <input 
            id="customizer-${fieldId}-current" 
            name="customizer-${fieldId}-current"
            value="${current}" 
            size="2"
            data-dtype="Number"
            placeholder="0"
            data-field-id="${fieldId}"
            data-field-part="current"
          >
        </div>
        <label for="customizer-${fieldId}-max" style="grid-area: 3/1">Maximum:</label>
        <input 
          id="customizer-${fieldId}-max" 
          style="grid-area: 3/2"
          name="customizer-${fieldId}-max" 
          value="${max}" 
          size="2"
          data-dtype="Number"
          placeholder="0"
          data-field-id="${fieldId}"
          data-field-part="max"
        >
      </div>
    `
  },
  
  serialize (value) {
    return {
      current: parseInt(value?.current) || 0,
      max: parseInt(value?.max) || 0
    }
  },
  
  deserialize (stored) {
    return {
      current: parseInt(stored?.current) || 0,
      max: parseInt(stored?.max) || 0
    }
  }
}

/**
 * Stepper Field
 * Number input with +/- buttons
 */
export const StepperField = {
  type: FIELD_TYPES.STEPPER,
  label: 'Stepper',
  
  render (fieldConfig, value = 0) {
    const fieldId = fieldConfig.id
    const label = fieldConfig.label || 'Field'
    const safeValue = value ?? 0
    
    return `
      <label class="customizer-label">${label}</label>
      <div class="customizer-stepper" data-stepper-field="${fieldId}">
        <button 
          type="button" 
          class="customizer-stepper-btn" 
          data-action="decrement"
        >−</button>
        <input 
          type="number" 
          id="customizer-${fieldId}" 
          name="customizer-${fieldId}"
          class="customizer-stepper-input"
          value="${safeValue}"
          data-field-id="${fieldId}"
        >
        <button 
          type="button" 
          class="customizer-stepper-btn" 
          data-action="increment"
        >+</button>
      </div>
    `
  },
  
  serialize (value) {
    return parseInt(value) || 0
  },
  
  deserialize (stored) {
    return parseInt(stored) || 0
  }
}

/**
 * Custom Ability Field
 * Full ability score with value, max, and computed modifier
 * Matches DCC core ability structure EXACTLY
 * Rendered in abilities area below Luck
 */
export const CustomAbilityField = {
  type: FIELD_TYPES.CUSTOM_ABILITY,
  label: 'Custom Ability',
  
  render (fieldConfig, value = {}) {
    const fieldId = fieldConfig.id
    const label = fieldConfig.label || 'Ability'
    const abilityValue = value?.value ?? 10
    const max = value?.max ?? 10
    const mod = value?.mod ?? getAbilityModifier(abilityValue)
    
    return `
      <div class="customizer-field" data-field-id="${fieldId}" data-field-type="${this.type}">
        <label class="customizer-label">${label}</label>
        <input 
          type="number" 
          id="customizer-${fieldId}-value" 
          value="${abilityValue}"
          data-field-id="${fieldId}"
          data-field-part="value"
        >
        <span>Mod: ${ensureSign(mod)}</span>
        <input 
          type="number" 
          id="customizer-${fieldId}-max" 
          value="${max}"
          data-field-id="${fieldId}"
          data-field-part="max"
        >
      </div>
    `
  },
  
  /**
   * Render as ability box (for placement in abilities area)
   * Matches DCC .ability-box HTML structure EXACTLY
   * Based on actor-partial-pc-common.html structure
   */
  renderAsAbility (fieldConfig, value = {}) {
    const fieldId = fieldConfig.id
    const label = fieldConfig.label || 'Ability'
    const abilityValue = value?.value ?? 10
    const max = value?.max ?? 10
    const mod = value?.mod ?? getAbilityModifier(abilityValue)
    
    return `
      <div class="ability-box customizer-ability-box" id="customizer-${fieldId}" data-field-id="${fieldId}" data-field-type="${this.type}">
        <label for="customizer-${fieldId}-value" class="box-title rollable"
               title="Roll ${label} Check"
               data-action="rollAbilityCheck"
               data-field-id="${fieldId}">
          ${label}
        </label>
        <div class="ability-score">
          <input 
            id="customizer-${fieldId}-value" 
            name="customizer-${fieldId}-value" 
            value="${abilityValue}" 
            size="2"
            data-dtype="Number"
            placeholder="10"
            data-field-id="${fieldId}"
            data-field-part="value"
          >
        </div>
        <label for="customizer-${fieldId}-mod" style="grid-area: 2/1" data-modifier="true">
          Modifier:
        </label>
        <input 
          id="customizer-${fieldId}-mod" 
          style="grid-area: 2/2"
          name="customizer-${fieldId}-mod"
          value="${ensureSign(mod)}" 
          size="3" 
          disabled
          data-field-id="${fieldId}"
          data-field-part="mod"
        >
        <label for="customizer-${fieldId}-max" style="grid-area: 3/1">Maximum:</label>
        <input 
          id="customizer-${fieldId}-max" 
          style="grid-area: 3/2"
          name="customizer-${fieldId}-max" 
          value="${max}" 
          size="2"
          data-dtype="Number"
          placeholder="10"
          data-field-id="${fieldId}"
          data-field-part="max"
        >
      </div>
    `
  },
  
  serialize (value) {
    const abilityValue = parseInt(value?.value) || 10
    return {
      value: abilityValue,
      max: parseInt(value?.max) || abilityValue,
      mod: getAbilityModifier(abilityValue)
    }
  },
  
  deserialize (stored) {
    const abilityValue = parseInt(stored?.value) || 10
    return {
      value: abilityValue,
      max: parseInt(stored?.max) || abilityValue,
      mod: getAbilityModifier(abilityValue)
    }
  }
}

/**
 * Get field renderer by type
 * @param {string} type - Field type
 * @returns {Object} Field renderer object
 */
export function getFieldRenderer (type) {
  switch (type) {
    case FIELD_TYPES.SIMPLE:
      return SimpleField
    case FIELD_TYPES.SIMPLE_NUM:
      return SimpleNumField
    case FIELD_TYPES.CURRENT_MAX:
      return CurrentMaxField
    case FIELD_TYPES.STEPPER:
      return StepperField
    case FIELD_TYPES.CUSTOM_ABILITY:
      return CustomAbilityField
    default:
      console.warn(`Unknown field type: ${type}`)
      return SimpleField
  }
}

/**
 * Check if field type should be rendered in abilities area
 * @param {string} type - Field type
 * @returns {boolean} True if should be in abilities area
 */
export function isAbilityField (type) {
  return type === FIELD_TYPES.CUSTOM_ABILITY || type === FIELD_TYPES.CURRENT_MAX
}