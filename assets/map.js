import {
	VARS,
	entities,
	icons,
	items,
	player_entities,
	world_items,
	debugLog, // Added for more detailed logging
} from "./engine.js";
import { WEntity } from "./classes/entity.js";
import { WMob } from "./classes/mob.js";
import { importedUnits } from "./datasets/imports.js";
import { generateName } from "./namegen.js";

export var world_grid = [];
/**
 * Holds all tile data for the current world map.
 * Each tile is an object with properties like x, y, icon, visible, and seen.
 * @type {Object<string, Object>}
 */
export var world = {}; // Changed to object for "x,y" key access

function _applyRandomIconProperties(tile) {
	if (tile.icon.color && tile.icon.color.length > 1) {
		// Ensure color exists and is an array
		tile.icon.color =
			tile.icon.color[
				Math.floor(ROT.RNG.getUniform() * tile.icon.color.length)
			];
	}
	if (
		tile.icon.tcoords &&
		tile.icon.tcoords.length > 1 &&
		Array.isArray(tile.icon.tcoords[0])
	) {
		// Check if it's an array of arrays
		tile.icon.tcoords =
			tile.icon.tcoords[
				Math.floor(ROT.RNG.getUniform() * tile.icon.tcoords.length)
			];
	} else if (tile.icon.tcoords && !Array.isArray(tile.icon.tcoords[0])) {
		// If it's a single [x,y] pair, ensure it's wrapped in an array if the icon expects it (handled by WIcon class usually)
		tile.icon.tcoords = tile.icon.tcoords; // Already a single [x,y]
	}
	// Added a check to ensure `tcoords` is always an array of 2 numbers
	if (
		tile.icon.tcoords &&
		!Array.isArray(tile.icon.tcoords) &&
		typeof tile.icon.tcoords === "number"
	) {
		tile.icon.tcoords = [tile.icon.tcoords, 0]; // Default to [value, 0] if only one number is provided
	}
}

/**
 * Sets the passability of a tile in the world grid.
 * @param {number} x - The x-coordinate of the tile.
 * @param {number} y - The y-coordinate of the tile.
 * @param {boolean} passable - Whether the tile is passable or not.
 */
function _setWorldGridTile(x, y, passable) {
	if (!world_grid[y]) {
		world_grid[y] = [];
	}
	world_grid[y][x] = passable ? 1 : 0; // Use 1 for passable, 0 for impassable
}

// Keeping loadWorld(MAP) for existing default map, but focus is on loadWorld_maze
export function loadWorld(MAP) {
	world = {}; // Clear previous world
	let worldload = MAP.map;
	worldload = worldload.replace(/(\r\n|\n|\r)/gm, "");
	let worldloadParsed = worldload.split("|");
	world_grid = new Array(worldloadParsed.length);
	VARS.MAP_Y = worldloadParsed.length;
	VARS.MAP_X = worldloadParsed[1].length; // Assuming all lines are same length

	for (let l = 0; l < worldloadParsed.length; l++) {
		let line = worldloadParsed[l];
		if (line.length == VARS.MAP_X) {
			world_grid[l] = new Array(line.length);
			for (let c = 0; c < line.length; c++) {
				let char = line.charAt(c); // Use charAt for safety
				let mappedKey = MAP.keymap[char];
				if (icons[mappedKey]) {
					world[`${c},${l}`] = {
						// Use template literal for consistency
						x: c,
						y: l,
						icon: JSON.parse(JSON.stringify(icons[mappedKey])),
						visible: false,
						seen: false,
					};
					_applyRandomIconProperties(world[`${c},${l}`]);
					_setWorldGridTile(c, l, icons[mappedKey].passable);
				} else {
					debugLog(
						`Warning: No icon mapped for char '${char}' at ${c},${l}`,
						"warn"
					);
					// Default to an impassable wall if key not found
					world[`${c},${l}`] = {
						x: c,
						y: l,
						icon: JSON.parse(JSON.stringify(icons["cave_wall"])),
						visible: false,
						seen: false,
					};
					_setWorldGridTile(c, l, false);
				}
			}
		}
	}
	addUnits(); // Only for this specific map, maze handles it differently
}

var maze = {}; // Changed to object for "x,y" key access

/**
 * Callback function for maze generation, sets a tile in the maze array to a wall (1) or floor (0).
 * @param {number} x - The x-coordinate of the tile.
 * @param {number} y - The y-coordinate of the tile.
 * @param {number} wall - 1 if the tile is a wall, 0 otherwise.
 */
function genMaze(x, y, wall) {
	maze[`${x},${y}`] = wall;
}

export function loadWorld_maze(level = 0) {
	debugLog(`Generating Maze for Level ${level}`, "info");

	world = {}; // Clear previous world state
	// Clear all entities and items from the previous level.
	world_items.length = 0; // Clear all world items
	entities.length = 0;

	// Re-add the persistent player units to the main entities list for the new level.
	for (const p_entity of player_entities) {
		entities.push(p_entity);
	}

	// --- Dynamic Map Size Scaling ---
	// Increase map dimensions based on level
	VARS.MAP_X = 40 + level * 2; // E.g., Level 0: 40, Level 1: 42, Level 5: 50
	VARS.MAP_Y = 30 + level * 2; // E.g., Level 0: 30, Level 1: 32, Level 5: 40

	// Ensure map dimensions are even for ROT.js map generators if they require it (e.g., DividedMaze)
	VARS.MAP_X = VARS.MAP_X % 2 === 0 ? VARS.MAP_X : VARS.MAP_X + 1;
	VARS.MAP_Y = VARS.MAP_Y % 2 === 0 ? VARS.MAP_Y : VARS.MAP_Y + 1;

	let mapGenWidth = Math.floor(VARS.MAP_X / 2); // ROT.js maze often works with half dimensions
	let mapGenHeight = Math.floor(VARS.MAP_Y / 2);

	let mapgenr = null;
	let purity = 0; // For IceyMaze, 0 is full maze, 1 is open room

	// --- Dynamic Maze Algorithm Selection & Parameters ---
	let rnd = ROT.RNG.getUniform();
	if (level <= 2) {
		// Early levels: more traditional mazes
		if (rnd < 0.5) {
			mapgenr = new ROT.Map.EllerMaze(mapGenWidth, mapGenHeight);
			debugLog(`Picked EllerMaze for Level ${level}`);
		} else {
			mapgenr = new ROT.Map.DividedMaze(mapGenWidth, mapGenHeight);
			debugLog(`Picked DividedMaze for Level ${level}`);
		}
	} else if (level <= 5) {
		// Mid levels: Introduce IceyMaze, potentially more open
		if (rnd < 0.6) {
			mapgenr = new ROT.Map.DividedMaze(mapGenWidth, mapGenHeight);
			debugLog(`Picked DividedMaze for Level ${level}`);
		} else {
			// IceyMaze purity can make it more open (higher purity = less walls)
			purity = Math.min(0.2 + (level - 2) * 0.1, 0.7); // Increases purity with level
			mapgenr = new ROT.Map.IceyMaze(mapGenWidth, mapGenHeight, purity);
			debugLog(
				`Picked IceyMaze (Purity: ${purity.toFixed(
					2
				)}) for Level ${level}`
			);
		}
	} else {
		// High levels: More open or complex, potentially with more features
		if (rnd < 0.4) {
			// Still some mazes
			mapgenr = new ROT.Map.DividedMaze(mapGenWidth, mapGenHeight);
			debugLog(`Picked DividedMaze for Level ${level}`);
		} else {
			// More open, but with potential for hazards
			purity = Math.min(0.4 + (level - 5) * 0.05, 0.8); // Higher purity for more open maps
			mapgenr = new ROT.Map.IceyMaze(mapGenWidth, mapGenHeight, purity);
			debugLog(
				`Picked IceyMaze (Purity: ${purity.toFixed(
					2
				)}) for Level ${level}`
			);
		}
	}

	maze = {}; // Clear previous maze data
	mapgenr.create(genMaze);

	world_grid = new Array(VARS.MAP_Y);
	for (let y = 0; y < VARS.MAP_Y; y++) {
		world_grid[y] = new Array(VARS.MAP_X);
		for (let x = 0; x < VARS.MAP_X; x++) {
			let mappedMazeTile =
				maze[`${Math.floor(x / 2)},${Math.floor(y / 2)}`]; // Get maze value for this cell's quadrant

			let parsedTile = "cave_floor";
			let passable = true;

			if (mappedMazeTile === 1) {
				// Wall
				parsedTile = "cave_wall";
				passable = false;
			} else {
				// Floor
				// --- Introduce environmental hazards/obstacles scaling with level ---
				let hazardChance = level * 0.03; // Increase chance by 3% per level

				if (ROT.RNG.getUniform() < hazardChance) {
					if (ROT.RNG.getUniform() < 0.4 && icons["acid_pool"]) {
						// 40% chance for acid pool
						parsedTile = "acid_pool";
						// Note: Acid pool should be passable, but deal damage in engine.js
					} else if (
						ROT.RNG.getUniform() < 0.6 &&
						icons["rubble_pile"]
					) {
						// 60% chance for rubble (impassable)
						parsedTile = "rubble_pile";
						passable = false;
					} else {
						// Default to mushrooms if other hazards not available or rolled lower
						parsedTile = "cave_mushrooms";
					}
				} else if (ROT.RNG.getUniform() < 0.05) {
					// Base chance for aesthetic mushrooms
					parsedTile = "cave_mushrooms";
				}
			}

			// Initialize the tile data
			const tileKey = `${x},${y}`;
			world[tileKey] = {
				x: x,
				y: y,
				icon: JSON.parse(JSON.stringify(icons[parsedTile])),
				visible: false,
				seen: false,
				// Add any hazard-specific properties
				isHazard: parsedTile === "acid_pool", // Flag for engine to apply damage
			};
			_applyRandomIconProperties(world[tileKey]); // Apply random variants
			_setWorldGridTile(x, y, icons[parsedTile].passable && passable); // Use combined passability
		}
	}

	// --- Ensure a clear path for player start (2,2) and place stairs ---
	let playerStartX = 2;
	let playerStartY = 2;
	// Ensure player spawn area is clear
	for (let py = playerStartY - 1; py <= playerStartY + 1; py++) {
		for (let px = playerStartX - 1; px <= playerStartX + 1; px++) {
			if (world_grid[py] && world_grid[py][px] !== undefined) {
				const tileKey = `${px},${py}`;
				world[tileKey] = {
					x: px,
					y: py,
					icon: JSON.parse(JSON.stringify(icons["cave_floor"])),
					visible: false,
					seen: false,
					isHazard: false,
				};
				_applyRandomIconProperties(world[tileKey]);
				_setWorldGridTile(px, py, true);
			}
		}
	}

	let stairsPlaced = false;
	let attempts = 0;
	const maxAttempts = VARS.MAP_X * VARS.MAP_Y; // Prevent infinite loop

	// Generate exit stairs at the furthest possible tile, ensuring it's not the player start
	// Prioritize tiles far from player start and are passable.
	while (!stairsPlaced && attempts < maxAttempts) {
		let randX = Math.floor(ROT.RNG.getUniform() * VARS.MAP_X);
		let randY = Math.floor(ROT.RNG.getUniform() * VARS.MAP_Y);

		// Ensure stairs are far from player spawn (e.g., at least 15 tiles away)
		const distanceToPlayerSpawn = Math.hypot(
			randX - playerStartX,
			randY - playerStartY
		);

		if (
			world_grid[randY] &&
			world_grid[randY][randX] === 1 &&
			distanceToPlayerSpawn > 15
		) {
			const tileKey = `${randX},${randY}`;
			world[tileKey] = {
				x: randX,
				y: randY,
				icon: JSON.parse(JSON.stringify(icons["stairs_down"])),
				visible: false,
				seen: false,
				isHazard: false, // Stairs are not a hazard
			};
			_setWorldGridTile(randX, randY, false); // Make stairs impassable as they are an object
			debugLog(`Exit created at (${randX},${randY}) for Level ${level}`);
			stairsPlaced = true;
		}
		attempts++;
	}

	if (!stairsPlaced) {
		debugLog("Failed to place stairs! This shouldn't happen.", "error");
		// Fallback: place stairs at (VARS.MAP_X-2, VARS.MAP_Y-2) regardless of distance
		const fallbackX = VARS.MAP_X - 2;
		const fallbackY = VARS.MAP_Y - 2;
		world[`${fallbackX},${fallbackY}`] = {
			x: fallbackX,
			y: fallbackY,
			icon: JSON.parse(JSON.stringify(icons["stairs_down"])),
			visible: false,
			seen: false,
			isHazard: false,
		};
		_setWorldGridTile(fallbackX, fallbackY, false);
		debugLog(
			`Fallback exit created at (${fallbackX},${fallbackY}) for Level ${level}`
		);
	}

	addPlayerUnits(); // Place existing player units
	addEnemiesAndItems(level); // Separated enemy and item adding logic
}

/**
 * Adds player units to the world map at their starting positions.
 * Ensures the start area is always clear.
 */
function addPlayerUnits() {
	// If player_entities is empty (first game or reset), create initial units
	if (player_entities.length === 0) {
		createPlayerUnit(2, 2, "sef_squadleader");
		createPlayerUnit(2, 3, "sef_trooper");
		createPlayerUnit(3, 3, "sef_trooper");
		VARS.SELECTED = player_entities[0];
	} else {
		// For subsequent levels, just reposition existing player units
		// Ensure their positions are reset to the starting area
		player_entities[0].x = 2;
		player_entities[0].y = 2;
		if (player_entities[1]) {
			player_entities[1].x = 3;
			player_entities[1].y = 2;
		}
		if (player_entities[2]) {
			player_entities[2].x = 2;
			player_entities[2].y = 3;
		}
		if (player_entities[3]) {
			player_entities[3].x = 3;
			player_entities[3].y = 3;
		}
		// Set selected unit back to first player
		VARS.SELECTED = player_entities[0];
		debugLog("Repositioned existing player units.", "info");
	}
}

/**
 * Adds enemies and random items to the world map, scaling with level.
 * @param {number} level - The current dungeon level.
 */
function addEnemiesAndItems(level) {
	// --- Item Spawning ---
	// Make oxygen tanks rarer at higher levels
	let oxygenChance = Math.max(0.5 - level * 0.05, 0.1); // Min 10% chance
	if (ROT.RNG.getUniform() < oxygenChance) {
		createItemRand("oxygen_tank", 1, 10); // Spawn max 1, minimum distance 10 from player
	}

	// Medkits (small) become slightly rarer
	let medkitChance = Math.max(0.7 - level * 0.05, 0.2); // Min 20% chance
	for (let i = 0; i < 2; i++) {
		// Attempt to spawn up to 2 small medkits
		if (ROT.RNG.getUniform() < medkitChance) {
			createItemRand("medkit_small", 1, 10);
		}
	}
	// Introduce large medkits at higher levels
	if (level >= 3) {
		if (ROT.RNG.getUniform() < level * 0.1 - 0.1) {
			// Chance increases after level 3
			createItemRand("medkit_large", 1, 15); // Max 1 large medkit, further away
		}
	}

	// --- Enemy Spawning ---
	// Base number of enemies for each type, scales with level
	let baseEnemyCount = 1;
	let enemyMultiplier = 1 + level * 0.5; // Each level adds 50% more enemies

	// Common Enemies
	_placeUnitOnRandomTile(
		"space_lamprey",
		Math.floor((baseEnemyCount + 1) * enemyMultiplier),
		"enemy",
		5
	);
	_placeUnitOnRandomTile(
		"arakno",
		Math.floor((baseEnemyCount + 2) * enemyMultiplier),
		"enemy",
		5
	);

	// Mid-tier Enemies (introduce after level 1)
	if (level >= 1) {
		if (ROT.RNG.getUniform() > 0.5) {
			// Randomly pick one type or the other
			_placeUnitOnRandomTile(
				"wurrie_blaster",
				Math.floor(baseEnemyCount * enemyMultiplier),
				"enemy",
				8
			);
		} else {
			_placeUnitOnRandomTile(
				"grey_soldier",
				Math.floor(baseEnemyCount * enemyMultiplier),
				"enemy",
				8
			);
		}
	}

	// Heavy/Specialized Enemies (introduce after level 2)
	if (level >= 2) {
		_placeUnitOnRandomTile("turret_laser", 1, "enemy", 10); // Fixed 1 turret, far from player
		if (ROT.RNG.getUniform() < level * 0.1 - 0.1) {
			// Chance increases after level 2
			_placeUnitOnRandomTile("shambler", 1, "enemy", 12); // Shamblers are tanky, might be good later
		}
	}
	// Very high-tier enemies (introduce after level 4-5, requiring unique tactics)
	if (level >= 4) {
		if (ROT.RNG.getUniform() < level * 0.05 - 0.1) {
			// Lower chance, but increases
			// Example: Licker (if its paralyze mechanic is implemented)
			_placeUnitOnRandomTile("licker", 1, "enemy", 15);
		}
		if (ROT.RNG.getUniform() < level * 0.05 - 0.1) {
			// Example: Shell (if its resistance is implemented)
			_placeUnitOnRandomTile("shell", 1, "enemy", 15);
		}
	}

	// Ensure all entities added are part of the 'entities' array for processing
	// (This is implicitly handled by WEntity constructor, but good to remember)
}

/**
 * Places a unit on the map at the specified coordinates.
 * @param {number} x - The x-coordinate to place the unit.
 * @param {number} y - The y-coordinate to place the unit.
 * @param {string} unitName - The name of the unit to create.
 * @param {string} faction - The faction of the unit (default: "enemy").
 * @returns {WEntity|null} - The created unit entity, or null if unit data is not found or placement failed.
 */
function _placeUnit(x, y, unitName, faction) {
	const unit = createUnit(x, y, unitName, faction);
	if (unit) {
		entities.push(unit);
		debugLog(
			`UNITGEN: ${unitName} generated at (${x},${y}) - ${
				world[`${x},${y}`].icon.name
			}`,
			"info"
		);
		return unit;
	}
	return null; // Return null on failure
}

/**
 * Finds a random empty tile on the map suitable for unit placement.
 * Filters tiles to avoid player start area and existing entities.
 * @param {number} [minDistanceFromPlayer=8] - Minimum distance from player starting spawn.
 * @returns {Array<number>|null} - An array containing the [x, y] coordinates of the empty tile, or null if no suitable tile is found.
 */
function _findEmptyTile(minDistanceFromPlayer = 8) {
	const emptyTiles = getEmptyTiles();
	shuffle(emptyTiles); // Shuffle to get a truly random empty tile

	// Player spawn is generally (2,2)
	const playerSpawnX = 2;
	const playerSpawnY = 2;

	for (const [x, y] of emptyTiles) {
		// Ensure not too close to player spawn area
		const distance = Math.hypot(x - playerSpawnX, y - playerSpawnY);
		if (distance < minDistanceFromPlayer) {
			continue;
		}

		// Ensure no other entity is currently on this tile
		const isOccupied = entities.some((ent) => ent.x === x && ent.y === y);
		if (isOccupied) {
			continue;
		}

		return [x, y]; // Found a suitable empty tile
	}
	return null; // No suitable tile found
}

/**
 * Places a unit (or multiple units) on random empty tiles on the map.
 * @param {string} unitName - The name of the unit to place.
 * @param {number} [count=1] - The number of units to attempt to place.
 * @param {string} [faction="enemy"] - The faction of the unit.
 * @param {number} [minDistanceFromPlayer=8] - Minimum distance from player spawn for placement.
 */
function _placeUnitOnRandomTile(
	unitName,
	count = 1,
	faction = "enemy",
	minDistanceFromPlayer = 8
) {
	let placedCount = 0;
	for (let i = 0; i < count; i++) {
		const emptyTile = _findEmptyTile(minDistanceFromPlayer);
		if (emptyTile) {
			const unit = _placeUnit(
				emptyTile[0],
				emptyTile[1],
				unitName,
				faction
			);
			if (unit) {
				placedCount++;
			}
		} else {
			debugLog(
				`No free tiles to spawn ${unitName} (attempt ${
					i + 1
				}/${count})!`,
				"warn"
			);
			break; // Stop trying if no more empty tiles are found
		}
	}
	if (placedCount < count) {
		debugLog(
			`Only placed ${placedCount} of ${count} ${unitName}(s) due to lack of space or suitable tiles.`,
			"warn"
		);
	}
}

/**
 * Creates a new player unit and adds it to the player_entities array.
 * @param {number} x - The x-coordinate of the unit.
 * @param {number} y - The y-coordinate of the unit.
 * @param {string} unitName - The name of the unit to create.
 */
function createPlayerUnit(x, y, unitName) {
	const unitData = importedUnits[unitName];
	if (!unitData) {
		debugLog(`Error: Player unit data for ${unitName} not found!`, "error");
		return;
	}
	let Player = new WEntity(
		generateName(), // Give a unique name
		unitData.icon,
		x,
		y,
		"player",
		true, // drawable
		new WMob("player", JSON.parse(JSON.stringify(unitData.stats))),
		false, // not passable
		"mob" // type
	);
	Player.typename = unitData.name; // Store original unit name (e.g., "SEF Trooper")
	player_entities.push(Player);
	entities.push(Player); // Also add to general entities list

	// Equip initial items
	if (unitData.slots) {
		for (const slotKey in unitData.slots) {
			const itemName = unitData.slots[slotKey];
			if (itemName) {
				// Only equip if slot specifies an item
				equipItem(Player, itemName, slotKey);
			}
		}
	}
	debugLog(
		`PLAYER_UNITGEN: ${Player.name} (${Player.typename}) generated at (${x},${y})`,
		"info"
	);
}

/**
 * Creates a new unit entity.
 * @param {number} x - The x-coordinate of the unit.
 * @param {number} y - The y-coordinate of the unit.
 * @param {string} unitName - The name of the unit to create.
 * @param {string} faction - The faction of the unit (default: "enemy").
 * @returns {WEntity|null} - The created unit entity, or null if unit data is not found.
 */
function createUnit(x, y, unitName, faction = "enemy") {
	let unitData = importedUnits[unitName];
	if (!unitData) {
		debugLog(`Error: Unit data for ${unitName} not found!`, "error");
		return null;
	}
	let enm = new WEntity(
		unitData.name, // Use the base name from JSON for enemies
		unitData.icon,
		x,
		y,
		faction,
		true, // drawable
		new WMob(unitData.ai, JSON.parse(JSON.stringify(unitData.stats))),
		false, // not passable by default for mobs
		"mob" // type
	);
	enm.typename = unitData.name; // Also set typename for enemies for consistency

	// Equip initial items
	if (unitData.slots) {
		for (const slotKey in unitData.slots) {
			const itemName = unitData.slots[slotKey];
			if (itemName) {
				// Only equip if slot specifies an item
				equipItem(enm, itemName, slotKey);
			}
		}
	}
	return enm;
}

/**
 * Equips an item to a unit's specified slot.
 * @param {WEntity} unit - The unit to equip the item to.
 * @param {string} itemKey - The key/name of the item to equip (from items.json).
 * @param {string} slot - The slot to equip the item to (e.g., "head", "suit", "ranged", "melee").
 */
function equipItem(unit, itemKey, slot) {
	if (!unit || !items[itemKey] || !unit.mob) {
		debugLog(
			`Failed to equip ${itemKey} to ${
				unit ? unit.name : "Unknown Unit"
			}: Invalid unit, item key, or no mob data.`,
			"warn"
		);
		return;
	}
	let newItem = JSON.parse(JSON.stringify(items[itemKey]));
	// Ensure max_ammo is set before copying if it's a weapon
	if (newItem.stats.max_ammo !== undefined) {
		newItem.stats.ammo = newItem.stats.max_ammo;
	} else {
		newItem.stats.ammo = 0; // Default for non-ammo items
	}

	unit.mob.slots[slot] = newItem;

	// Recalculate defence only for player units, as enemy defence is usually static or handled by AI
	if (unit.owner == "player") {
		unit.mob.stats.defence = 0; // Reset
		if (unit.mob.slots.suit) {
			unit.mob.stats.defence += unit.mob.slots.suit.stats.defence;
		}
		if (unit.mob.slots.head) {
			unit.mob.stats.defence += unit.mob.slots.head.stats.defence;
		}
		debugLog(
			`${unit.name} equipped ${newItem.name} in ${slot} slot. New Defence: ${unit.mob.stats.defence}`,
			"debug"
		);
	}
}

/**
 * Creates an item and places it randomly on the map.
 * @param {string} itemName - The name of the item to create.
 * @param {number} [count=1] - Number of items to attempt to place.
 * @param {number} [minDistanceFromPlayer=8] - Minimum distance from player spawn area.
 */
function createItemRand(itemName, count = 1, minDistanceFromPlayer = 8) {
	let placedCount = 0;
	for (let i = 0; i < count; i++) {
		const emptyTile = _findEmptyTile(minDistanceFromPlayer);
		if (emptyTile) {
			const [x, y] = emptyTile;
			let item = JSON.parse(JSON.stringify(items[itemName]));
			item.visible = false;
			item.seen = false;
			item.icon = icons[item.icon]; // Assign actual icon object
			world_items.push(item);
			item.x = x;
			item.y = y;
			debugLog(
				`ITEMGEN: ${itemName} generated at (${x},${y}) - ${
					world[`${x},${y}`].icon.name
				}`,
				"info"
			);
			placedCount++;
		} else {
			debugLog(
				`No free tiles to spawn ${itemName} (attempt ${
					i + 1
				}/${count})!`,
				"warn"
			);
			break; // Stop trying if no more suitable tiles
		}
	}
	if (placedCount < count) {
		debugLog(
			`Only placed ${placedCount} of ${count} ${itemName}(s) due to lack of space or suitable tiles.`,
			"warn"
		);
	}
}

/**
 * Retrieves a list of all empty, passable tiles on the map not currently occupied by entities.
 * @returns {Array<Array<number>>} - An array of [x, y] coordinates representing empty tiles.
 */
function getEmptyTiles() {
	let tiles = [];
	for (let y = 0; y < VARS.MAP_Y; y++) {
		for (let x = 0; x < VARS.MAP_X; x++) {
			if (world_grid[y] && world_grid[y][x] === 1) {
				// Check if passable
				// Also ensure no active entity (mob, player) is on it
				const isOccupied = entities.some(
					(ent) =>
						ent.x === x &&
						ent.y === y &&
						ent.mob &&
						ent.mob.ai !== "dead"
				);
				if (!isOccupied) {
					tiles.push([x, y]);
				}
			}
		}
	}
	return tiles;
}

/**
 * Shuffles an array in place using the Fisher-Yates shuffle algorithm.
 * @param {Array} array - The array to shuffle.
 */
function shuffle(array) {
	let currentIndex = array.length;
	while (currentIndex != 0) {
		let randomIndex = Math.floor(ROT.RNG.getUniform() * currentIndex); // Use ROT.RNG for consistent randomness
		currentIndex--;
		[array[currentIndex], array[randomIndex]] = [
			array[randomIndex],
			array[currentIndex],
		];
	}
}

/**
 * Loads the next level of the dungeon.
 * @param {number} level_nr - The level number to load.
 */
export function nextLevel(level_nr) {
	VARS.LEVEL = level_nr;
	loadWorld_maze(VARS.LEVEL);
	debugLog(`Loaded dungeon level ${VARS.LEVEL}`, "info");
}
