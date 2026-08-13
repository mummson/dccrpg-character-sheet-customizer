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
- Fixed the config dialog rendering with unreadable pale text on white card
  backgrounds under Foundry's dark UI theme.
- Replaced the auto-generated ID shown for each custom ability with an editable
  **Roll Key** (e.g. `sanity`), validated for uniqueness and against DCC's own
  reserved roll-data words (`str`, `hp`, `ac`, etc.). The internal storage ID is
  unchanged and keeps owning each actor's saved values — only the roll-formula-facing
  key is renameable. Abilities saved before this feature existed get a suggested key
  auto-filled from their label the next time the config dialog is opened.
- Fixed roll data for custom abilities actually being keyed by their Roll Key
  (previously the unusable auto-generated ID, so `@sanityMod`-style formulas never
  really worked). Also fixed Current/Max abilities exposing the wrong property in
  roll data (`.value` was always reading undefined and defaulting to 10 instead of
  the actual current value).
- Removed the `prepareDCCActorRollData` hook listener — confirmed dead code, DCC
  never fires a hook by that name. Roll data injection now happens solely through
  the `getRollData()` wrapper, which is what was actually running all along.
- Panel fields no longer show their internal ID in the config dialog (they aren't
  usable in roll formulas, so it served no purpose). Added a one-line description
  for each ability/field type in the config dialog.
- Reworked the config dialog's stylesheet to stop hardcoding its own colors and
  instead rely on Foundry's native theme (the same `--color-*`/`--input-*`/
  `--button-*` variables every other Foundry dialog uses), so it now matches
  Foundry's actual look (light or dark) instead of a fixed white-card style.
  Also fixed the dialog's content area not growing to fill a resized window:
  it's now an explicit flex layout with `width: 100%`, and the two scrollable
  sections share available height instead of stopping at a fixed pixel cap.
- Reworded the Current/Max field-type description to use Sanity (an ability
  without a modifier) as the example instead of HP.

## 2.0.0

- Complete rewrite with clean architecture
- Added Custom Ability field type with auto-calculated modifiers
- Smart field placement (abilities vs panels)
- Improved roll integration
- Responsive grid layout
- Better DCC styling compatibility
