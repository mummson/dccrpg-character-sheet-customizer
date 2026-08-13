# Quick Start Guide

## Installation

1. Copy the `dccrpg-character-sheet-customizer` folder to:
   ```
   [Foundry Data Path]/Data/modules/
   ```

2. Restart Foundry VTT (or refresh if already running)

3. In your world, go to **Settings** → **Manage Modules**

4. Enable "DCC RPG Character Sheet Customizer"

5. Click **Save Module Settings**

## First Configuration

1. Go to **Settings** → **Module Settings**

2. Find "DCC RPG Character Sheet Customizer"

3. Click **Configure Custom Fields**

4. Click **Add Panel**

5. Configure the panel:
   - Label: `Custom Abilities`
   - Applies To: `Both`

6. Click **Add Field** and configure:
   - Label: `Sanity`
   - Type: `Custom Ability`

7. Click **Add Field** again:
   - Label: `Corruption`
   - Type: `Current/Max`

8. Click **Save Configuration**

9. Open any character sheet to see your new fields!

## Testing Roll Integration

1. Open a character sheet with your custom fields

2. Set Sanity to `14` (should show +1 modifier)

3. In chat, type: `/roll 1d20 + @sanityMod`

4. Or click the "Sanity" label in the abilities section

## Common Issues

**Fields not showing?**
- Close and re-open the character sheet
- Make sure you clicked "Save Configuration"
- Check browser console (F12) for errors

**Styling looks wrong?**
- Update DCC system to latest version
- Clear browser cache (Ctrl+Shift+R)

## File Locations

Need to edit? Key files:
- `scripts/main.js` - Entry point
- `scripts/renderer.js` - DOM injection
- `styles/module.css` - Styling
- `templates/config.html` - Settings UI