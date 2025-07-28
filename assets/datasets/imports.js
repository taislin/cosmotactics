import _importedUnits from "./units.json" with { type: "json" };
import _importedEnemies from "./enemies.json" with { type: "json" };
import _importedIcons from "./icons.json" with { type: "json" };
import _importedIcons_gui from "./icons_gui.json" with { type: "json" };
import _importedIcons_objects from "./icons_objects.json" with { type: "json" };
import _importedIcons_entities from "./icons_entities.json" with { type: "json" };
import _importedItems from "./items.json" with { type: "json" };
import _importedItems_equipment from "./items_equipment.json" with { type: "json" };
import _importedItems_weapons from "./items_weapons.json" with { type: "json" };

export let importedUnits = {..._importedUnits, ..._importedEnemies};
export let importedIcons = {..._importedIcons_gui, ..._importedIcons, ..._importedIcons_entities, ..._importedIcons_objects};
export let importedItems = {..._importedItems, ..._importedItems_equipment,..._importedItems_weapons};