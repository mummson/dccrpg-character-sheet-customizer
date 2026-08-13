# DCC RPG Character Sheet Customizer

Add custom fields and abilities to your DCC RPG character sheets in Foundry VTT!

## Features

### Five Field Types

1. **Text** - Simple text input field
2. **Number** - Numeric input field
3. **Current/Max** - Track resources with current and maximum values (appears in abilities section)
4. **Stepper** - Number field with increment/decrement buttons
5. **Custom Ability** - Full ability score with value, max, and auto-calculated modifier (appears in abilities section)

### Smart Placement

- **Ability Fields** (Custom Ability & Current/Max) automatically appear in the abilities section below Luck, styled to match core abilities
- **Panel Fields** (Text, Number, Stepper) appear in configurable panels at the top or bottom of character sheets

### Roll Integration

Custom abilities are fully integrated with the DCC roll system:
- Roll ability checks by clicking the ability name
- Use in formulas: `@sanityMod` or `@customAbilities.sanity.value`
- Modifiers auto-calculate using DCC ability score table (3-24)

### PC / NPC Scoping

Each custom ability and each custom panel has an **Applies To** setting: **Both**,
**PC Only**, or **NPC Only**. Use this when a field only makes sense for one actor
type — e.g. a Sanity ability for player characters, or a Morale tracker just for
NPCs. Defaults to Both, matching prior versions where every field appeared
everywhere.

## Installation

1. In Foundry VTT, go to **Add-on Modules**
2. Click **Install Module**
3. Search for "DCC RPG Character Sheet Customizer"
4. Click **Install**

**OR**

Paste this manifest URL:
```
https://github.com/mummson/dccrpg-character-sheet-customizer/releases/latest/download/module.json
```

## Usage

### Initial Setup

1. Enable the module in your world
2. Go to **Settings** → **Module Settings**
3. Find "DCC RPG Character Sheet Customizer"
4. Click **Configure Custom Fields**

### Adding Panels and Fields

1. Click **Add Panel** to create a new panel
2. Give it a name (e.g., "Sanity & Corruption")
3. Choose **Applies To**: Both, PC Only, or NPC Only
4. Click **Add Field** to add fields to the panel
5. Configure each field:
   - **Label**: Display name
   - **Type**: Choose from 5 field types
   - **ID**: Auto-generated (used for roll formulas)

Custom abilities have the same **Applies To** option, next to their type selector.

### Field Type Examples

**Custom Ability (Sanity)**
- Label: `Sanity`
- Type: `Custom Ability`
- Creates a full ability score with modifier
- Appears below Luck in abilities section
- Use in rolls: `@sanityMod`

**Current/Max (Corruption)**
- Label: `Corruption`
- Type: `Current/Max`
- Track current and max values
- Appears below Luck in abilities section
- Use in rolls: `@customAbilities.corruption.current`

**Stepper (Luck Pool)**
- Label: `Luck Pool`
- Type: `Stepper`
- Easy increment/decrement buttons
- Appears in panel

### Saving Configuration

1. Click **Save Configuration**
2. Close and re-open character sheets to see changes
3. Values persist per actor automatically

## Roll Formula Examples

```javascript
// Roll a custom ability check
1d20 + @sanityMod

// Check against ability value
1d20 vs @customAbilities.sanity.value

// Use in item formulas
1d6 + @sanityMod damage

// Complex formulas
1d20 + @sanityMod + @lck - @customAbilities.corruption.current
```

## Technical Details

### Data Storage

- **Configuration**: Stored in world settings
- **Field Values**: Stored in actor flags
- **Custom Abilities**: Stored separately for roll data integration

### Compatibility

- **Foundry VTT**: v13+ (verified on v14)
- **DCC System**: v0.19.0+
- Works with both PC and NPC sheets, with per-field PC/NPC/Both scoping (see above)

### Performance

- Debounced auto-save (300ms)
- Idempotent rendering (no duplicates)
- Minimal CSS overrides using system variables

## Troubleshooting

### Fields Not Appearing

1. Make sure you've saved the configuration
2. Close and re-open the character sheet
3. Check console for errors (F12)

### Roll Formulas Not Working

- Custom ability IDs are case-sensitive
- Use exact ID from configuration (shown as readonly field)
- Format: `@abilityIdMod` or `@customAbilities.abilityId.value`

### Styling Issues

The module uses DCC system CSS variables. If styles look wrong:
1. Update to latest DCC system version
2. Check for conflicting modules
3. Try disabling other sheet-modifying modules

## Development

### Building From Source

```bash
git clone https://github.com/mummson/dccrpg-character-sheet-customizer
cd dccrpg-character-sheet-customizer
# Copy to Foundry modules directory
```

### File Structure

```
dccrpg-character-sheet-customizer/
├── scripts/
│   ├── main.js          # Entry point & hooks
│   ├── settings.js      # Configuration UI
│   ├── renderer.js      # DOM injection & events
│   ├── fields.js        # Field type definitions
│   ├── store.js         # Data persistence
│   └── util.js          # Helper functions
├── styles/
│   └── module.css       # Styling
├── templates/
│   └── config.html      # Settings form
├── lang/
│   └── en.json         # Localization
└── module.json         # Manifest
```

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License

[MIT License](LICENSE)

## Credits

- Created for the DCC RPG Foundry VTT system
- Inspired by the flexibility needed for homebrew content
- Built with ❤️ for the DCC community

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## Support

- **Issues**: [GitHub Issues](https://github.com/mummson/dccrpg-character-sheet-customizer/issues)
- **Discord**: Find me on the Foundry VTT Discord