# Changelog

## Unreleased

- Migrated the configuration dialog from the legacy `FormApplication`/`Dialog` API
  to `ApplicationV2`/`DialogV2`, ahead of Foundry removing the legacy Application
  framework. Raised `compatibility.minimum` to `13`.
- Fixed custom abilities and panels not rendering correctly on NPC sheets. Custom
  abilities now appear as a dedicated row on NPC sheets (DCC's NPC template has no
  ability-scores area to inject into like PC sheets do), and custom panels/separators
  are now correctly styled on NPC sheets (previously inserted into the DOM but
  invisible due to a CSS scoping mismatch with DCC's own NPC template).
- Added an "Applies To" (Both / PC Only / NPC Only) option per custom ability and per
  custom panel, so a GM can scope a custom field to just player characters, just
  NPCs, or both. Existing configurations are unaffected — anything saved before this
  option existed continues to render everywhere, exactly as before.

## 2.0.0

- Complete rewrite with clean architecture
- Added Custom Ability field type with auto-calculated modifiers
- Smart field placement (abilities vs panels)
- Improved roll integration
- Responsive grid layout
- Better DCC styling compatibility
