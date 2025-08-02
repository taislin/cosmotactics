import {
	VARS,
	entities,
	icons,
	items,
	player_entities,
	world_items,
	debugLog,
	log,
} from "./engine.js";
import { WEntity } from "./classes/entity.js";
import { WMob } from "./classes/mob.js";
import { importedUnits } from "./datasets/imports.js";
import { generateName } from "./namegen.js";
import { getRandomElement } from "./utils/gameUtils.js";

export var world_grid = [];
export var world = {};

// (Helper functions _applyRandomIconProperties, _setWorldGridTile, shuffle, getEmptyTiles remain the same)
// ... I'll include them here for completeness ...

function _applyRandomIconProperties(tile) {
	if (tile.icon.color && tile.icon.color.length > 1) {
		tile.icon.color = getRandomElement(tile.icon.color);
	}
	if (
		tile.icon.tcoords &&
		tile.icon.tcoords.length > 1 &&
		Array.isArray(tile.icon.tcoords[0])
	) {
		tile.icon.tcoords = getRandomElement(tile.icon.tcoords);
	}
}

function _setWorldGridTile(x, y, passable) {
	if (!world_grid[y]) world_grid[y] = [];
	world_grid[y][x] = passable ? 1 : 0;
}

function shuffle(array) {
	let currentIndex = array.length;
	while (currentIndex != 0) {
		let randomIndex = Math.floor(ROT.RNG.getUniform() * currentIndex);
		currentIndex--;
		[array[currentIndex], array[randomIndex]] = [
			array[randomIndex],
			array[currentIndex],
		];
	}
}

function getEmptyTiles() {
	let tiles = [];
	for (let y = 0; y < VARS.MAP_Y; y++) {
		for (let x = 0; x < VARS.MAP_X; x++) {
			if (world_grid[y] && world_grid[y][x] === 1) {
				const isOccupied = entities.some(
					(ent) =>
						ent.x === x &&
						ent.y === y &&
						ent.mob &&
						ent.mob.ai !== "dead"
				);
				if (!isOccupied) tiles.push([x, y]);
			}
		}
	}
	return tiles;
}

/**
 * NEW: Generates an open-world map (forests, grasslands) using Cellular Automata.
 * @returns {object} A temporary map object mapping "x,y" keys to terrain type strings.
 */
function generateOpenWorld() {
	debugLog("Generating Open World using Cellular Automata...", "info");
	let mapData = {};
	const cellular = new ROT.Map.Cellular(VARS.MAP_X, VARS.MAP_Y, {
		born: [5, 6, 7, 8],
		survive: [4, 5, 6, 7, 8],
	});

	// Define the pool of alien tree types
	const ALIEN_TREE_TYPES = [
		"alien_tree_purple",
		"alien_tree_green",
		"alien_tree_blue",
		"alien_tree_orange",
	];

	// Map to store the chosen tree type for each connected forest region
	const forestRegionTypes = {}; // Key: "x,y" of a cell in a region, Value: chosen tree type for that region

	// 1. Seed the map with noise (potential trees)
	cellular.randomize(0.5); // Start with 50% "alive" cells

	// 2. Run simulation steps to create clumps (forests)
	for (let i = 0; i < 4; i++) {
		cellular.create();
	}

	// 3. Connect isolated areas and assign cluster types
	cellular.connect((x, y, value) => {
		let terrainType;

		if (value === 1) {
			// This is a "forest" cell
			// Find the region this cell belongs to (using flood fill or similar mechanism implied by cellular.connect)
			// For ROT.Map.Cellular, `connect` visits each cell and its neighbors.
			// We can leverage this to assign a consistent type to connected regions.
			const key = `${x},${y}`;

			// Simple region assignment: Check neighbors for an existing type, or pick a new one.
			// This isn't a perfect flood-fill, but it tends to make clusters.
			let assignedType = null;
			ROT.DIRS[8].forEach((dir) => {
				const nx = x + dir[0];
				const ny = y + dir[1];
				const neighborKey = `${nx},${ny}`;
				if (forestRegionTypes[neighborKey]) {
					assignedType = forestRegionTypes[neighborKey];
				}
			});

			if (!assignedType) {
				// If no neighbor has an assigned type, this is likely a new region (or edge of one)
				assignedType = getRandomElement(ALIEN_TREE_TYPES);
			}
			forestRegionTypes[key] = assignedType; // Assign/confirm type for this cell

			terrainType = assignedType; // Use the chosen tree type
		} else {
			// This is a "ground" cell
			terrainType = "grass";
			// Add some variety to the grass areas
			if (ROT.RNG.getUniform() < 0.05) {
				terrainType = "alien_bush";
			} else if (ROT.RNG.getUniform() < 0.05) {
				terrainType = "alien_flowers";
			} else if (ROT.RNG.getUniform() < 0.03) {
				terrainType = "dirt";
			}
		}

		mapData[`${x},${y}`] = terrainType;
	}, 0); // The `0` here is the "floor" value for ROT.Map.Cellular

	return mapData;
}

/**
 * NEW: Generates a cave/dungeon map using a maze generator.
 * @returns {object} A temporary map object mapping "x,y" keys to terrain type strings.
 */
function generateCaveWorld(level) {
	debugLog(`Generating Cave World using Maze for Level ${level}`, "info");
	let mapData = {};
	let mapgenr = new ROT.Map.DividedMaze(
		Math.floor(VARS.MAP_X / 2),
		Math.floor(VARS.MAP_Y / 2)
	);

	let maze = {};
	mapgenr.create((x, y, wall) => {
		maze[`${x},${y}`] = wall;
	});

	for (let y = 0; y < VARS.MAP_Y; y++) {
		for (let x = 0; x < VARS.MAP_X; x++) {
			let mappedMazeTile =
				maze[`${Math.floor(x / 2)},${Math.floor(y / 2)}`];
			let terrainType = "cave_floor";

			if (mappedMazeTile === 1) {
				terrainType = "cave_wall";
			} else {
				let hazardChance = level * 0.03;
				if (ROT.RNG.getUniform() < hazardChance) {
					if (ROT.RNG.getUniform() < 0.4) terrainType = "acid_pool";
					else terrainType = "rubble_pile";
				} else if (ROT.RNG.getUniform() < 0.05) {
					terrainType = "cave_mushrooms";
				}
			}
			mapData[`${x},${y}`] = terrainType;
		}
	}
	return mapData;
}

/**
 * Loads and generates a new game level, including terrain, player units, shuttle, stairs, enemies, and items.
 * 
 * Determines the map type (forest or cave) based on the level number, generates the corresponding terrain, and populates the world state. Places player units in a clear area, positions the shuttle and stairs, and spawns enemies and items appropriate to the environment. Displays a thematic entry message for the new level.
 * 
 * @param {number} level - The level number to generate.
 */
export function loadLevel(level = 0) {
	debugLog(`--- Loading Level ${level} ---`, "info");

	// --- 1. Reset State ---
	world = {};
	world_items.length = 0;
	entities.length = 0;
	player_entities.forEach((p) => entities.push(p)); // Re-add persistent player entities

	VARS.MAP_X = 40 + level * 2;
	VARS.MAP_Y = 30 + level * 2;
	world_grid = new Array(VARS.MAP_Y);

	// --- 2. Decide Map Type & Generate Base Terrain ---
	let mapData;
	let mapType;
	if (level === 0) {
		mapType = "forest";
		mapData = generateOpenWorld();
	} else if (level > 1 && level % 2 === 0) {
		// Every even level is a forest
		mapType = "forest";
		mapData = generateOpenWorld();
	} else {
		// Odd levels are caves
		mapType = "cave";
		mapData = generateCaveWorld(level);
	}

	// --- 3. Populate World from mapData ---
	for (let y = 0; y < VARS.MAP_Y; y++) {
		world_grid[y] = new Array(VARS.MAP_X);
		for (let x = 0; x < VARS.MAP_X; x++) {
			const terrainKey = mapData[`${x},${y}`] || "cave_floor"; // Fallback
			const iconData = icons[terrainKey];

			if (!iconData) {
				debugLog(
					`Missing icon data for terrain key: '${terrainKey}'`,
					"error"
				);
				continue;
			}

			world[`${x},${y}`] = {
				x: x,
				y: y,
				icon: JSON.parse(JSON.stringify(iconData)),
				visible: false,
				seen: false,
				isHazard: terrainKey === "acid_pool",
			};
			_applyRandomIconProperties(world[`${x},${y}`]);
			_setWorldGridTile(x, y, iconData.passable);
		}
	}

	// --- 4. Place Player & Objective ---
	const playerStartPos = findClearAreaForPlayer();
	addPlayerUnits(playerStartPos.x, playerStartPos.y);
	placeShuttle(playerStartPos.x, playerStartPos.y);
	placeStairs(playerStartPos.x, playerStartPos.y);

	// --- 5. Spawn Enemies and Items based on Map Type ---
	if (mapType === "forest") {
		addEnemiesAndItems_Forest(level);
	} else {
		addEnemiesAndItems_Cave(level);
	}
	let entryMessage = "";
	if (mapType === "cave") {
		const caveMessages = [
			"The air grows cold and damp.",
			"A low, chittering sound echoes from the darkness ahead.",
			"The smell of ozone and alien decay hangs heavy in this chamber.",
		];
		entryMessage = getRandomElement(caveMessages);
	} else {
		// forest
		const forestMessages = [
			"You emerge into a clearing, the alien sun filtering through strange flora.",
			"The ground is soft with moss, but the silence feels unnatural.",
			"Twisted, alien trees loom over you like ancient sentinels.",
		];
		entryMessage = getRandomElement(forestMessages);
	}
	log({ type: "info", text: entryMessage });
}

function findClearAreaForPlayer() {
	let attempts = 0;
	while (attempts < 100) {
		const x = ROT.RNG.getUniformInt(1, 10);
		const y = ROT.RNG.getUniformInt(1, 10);

		// Check a 3x3 area around the potential start point
		let isClear = true;
		for (let i = -1; i <= 1; i++) {
			for (let j = -1; j <= 1; j++) {
				if (!world_grid[y + j] || world_grid[y + j][x + i] !== 1) {
					isClear = false;
					break;
				}
			}
			if (!isClear) break;
		}

		if (isClear) {
			debugLog(`Player start area found at (${x},${y})`, "debug");
			return { x, y };
		}
		attempts++;
	}
	debugLog(
		"Could not find a clear 3x3 area for player spawn! Forcing at (2,2).",
		"warn"
	);
	// Force-clear an area if no suitable spot is found
	for (let i = 1; i <= 3; i++)
		for (let j = 1; j <= 3; j++) _setWorldGridTile(i, j, true);
	return { x: 2, y: 2 };
}

function placeStairs(playerX, playerY) {
	let attempts = 0;
	while (attempts < 5000) {
		const x = ROT.RNG.getUniformInt(0, VARS.MAP_X - 1);
		const y = ROT.RNG.getUniformInt(0, VARS.MAP_Y - 1);
		const dist = Math.hypot(x - playerX, y - playerY);

		// Place stairs on a passable tile, far from the player
		if (dist > 20 && world_grid[y] && world_grid[y][x] === 1) {
			world[`${x},${y}`].icon = JSON.parse(
				JSON.stringify(icons["stairs_down"])
			);
			_setWorldGridTile(x, y, true); // Stairs are interactable, not blocking movement onto the tile
			debugLog(`Exit created at (${x},${y})`, "info");
			return;
		}
		attempts++;
	}
	debugLog(
		"Failed to place stairs far from player, placing randomly.",
		"warn"
	);
	const fallbackTile = getEmptyTiles()[0]; // Just grab the first empty tile
	if (fallbackTile) {
		const [x, y] = fallbackTile;
		world[`${x},${y}`].icon = JSON.parse(
			JSON.stringify(icons["stairs_down"])
		);
		_setWorldGridTile(x, y, true);
	}
}

/**
 * Populates a CAVE level with appropriate enemies and items.
 */
function addEnemiesAndItems_Cave(level) {
	createItemRand("oxygen_tank", 1, 10);
	createItemRand("medkit_small", 2, 10);
	if (level >= 3) createItemRand("medkit_large", 1, 15);

	let enemyMultiplier = 1 + level * 0.5;
	_placeUnitOnRandomTile(
		"space_lamprey",
		Math.floor(2 * enemyMultiplier),
		"enemy",
		5
	);
	_placeUnitOnRandomTile(
		"arakno",
		Math.floor(2 * enemyMultiplier),
		"enemy",
		5
	);
	if (level >= 1)
		_placeUnitOnRandomTile(
			"grey_soldier",
			Math.floor(1 * enemyMultiplier),
			"enemy",
			8
		);
	if (level >= 2) _placeUnitOnRandomTile("turret_laser", 1, "enemy", 10);
	if (level >= 4)
		_placeUnitOnRandomTile(
			"shell",
			Math.floor(1 * enemyMultiplier),
			"enemy",
			15
		);
}

/**
 * NEW: Populates a FOREST level with appropriate enemies and items.
 */
function addEnemiesAndItems_Forest(level) {
	createItemRand("medkit_small", 3, 5); // More medkits in open areas
	if (level >= 3) createItemRand("medkit_large", 1, 10);

	let enemyMultiplier = 1 + level * 0.5;
	_placeUnitOnRandomTile(
		"wurrie_blaster",
		Math.floor(3 * enemyMultiplier),
		"enemy",
		8
	);
	_placeUnitOnRandomTile(
		"shambler",
		Math.floor(1 * enemyMultiplier),
		"enemy",
		10
	); // 'Forest beasts'
	if (level >= 2)
		_placeUnitOnRandomTile(
			"grey_soldier",
			Math.floor(2 * enemyMultiplier),
			"enemy",
			10
		); // Grey patrols
	if (level >= 5) _placeUnitOnRandomTile("turret_laser", 1, "enemy", 15); // A hidden turret
}

// (All other functions like addPlayerUnits, createPlayerUnit, createUnit, equipItem, createItemRand, _placeUnit, _findEmptyTile, _placeUnitOnRandomTile remain the same)
// ... I'll include them here for completeness ...

function addPlayerUnits(startX, startY) {
	if (player_entities.length === 0) {
		createPlayerUnit(startX, startY, "sef_squadleader");
		createPlayerUnit(startX + 1, startY, "sef_trooper");
		createPlayerUnit(startX, startY + 1, "sef_trooper");
		VARS.SELECTED = player_entities[0];
	} else {
		player_entities[0].x = startX;
		player_entities[0].y = startY;
		if (player_entities[1]) {
			player_entities[1].x = startX + 1;
			player_entities[1].y = startY;
		}
		if (player_entities[2]) {
			player_entities[2].x = startX;
			player_entities[2].y = startY + 1;
		}
		if (player_entities[3]) {
			player_entities[3].x = startX + 1;
			player_entities[3].y = startY + 1;
		}
		VARS.SELECTED = player_entities[0];
	}
}

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
			if (_placeUnit(emptyTile[0], emptyTile[1], unitName, faction)) {
				placedCount++;
			}
		} else {
			debugLog(
				`No free tiles to spawn ${unitName} (attempt ${
					i + 1
				}/${count})!`,
				"warn"
			);
			break;
		}
	}
}

function _findEmptyTile(minDistanceFromPlayer = 8) {
	const emptyTiles = getEmptyTiles();
	shuffle(emptyTiles);
	const playerSpawnX = VARS.SELECTED.x;
	const playerSpawnY = VARS.SELECTED.y;
	for (const [x, y] of emptyTiles) {
		const distance = Math.hypot(x - playerSpawnX, y - playerSpawnY);
		if (distance < minDistanceFromPlayer) continue;
		const isOccupied = entities.some((ent) => ent.x === x && ent.y === y);
		if (isOccupied) continue;
		return [x, y];
	}
	return null;
}

function createItemRand(itemName, count = 1, minDistanceFromPlayer = 8) {
	for (let i = 0; i < count; i++) {
		const emptyTile = _findEmptyTile(minDistanceFromPlayer);
		if (emptyTile) {
			const [x, y] = emptyTile;
			let item = JSON.parse(JSON.stringify(items[itemName]));
			item.visible = false;
			item.seen = false;
			item.icon = icons[item.icon];
			world_items.push(item);
			item.x = x;
			item.y = y;
		}
	}
}

function equipItem(unit, itemKey, slot) {
	if (!unit || !items[itemKey] || !unit.mob) return;
	let newItem = JSON.parse(JSON.stringify(items[itemKey]));
	if (newItem.stats.max_ammo !== undefined)
		newItem.stats.ammo = newItem.stats.max_ammo;
	unit.mob.slots[slot] = newItem;
	if (unit.owner == "player") {
		unit.mob.stats.defence = 0;
		if (unit.mob.slots.suit)
			unit.mob.stats.defence += unit.mob.slots.suit.stats.defence;
		if (unit.mob.slots.head)
			unit.mob.stats.defence += unit.mob.slots.head.stats.defence;
	}
}

function createUnit(x, y, unitName, faction = "enemy") {
	let unitData = importedUnits[unitName];
	if (!unitData) return null;
	let enm = new WEntity(
		unitData.name,
		unitData.icon,
		x,
		y,
		faction,
		true,
		new WMob(
			unitData.ai,
			JSON.parse(JSON.stringify(unitData.stats)),
			[], // drawstacks
			{}, // slots (will be populated by equipItem)
			[], // traits
			unitData.background, // background
			unitData.death_message,
			unitData.desc
		),
		false,
		"mob"
	);
	enm.typename = unitData.name;
	if (unitData.slots) {
		for (const slotKey in unitData.slots) {
			if (unitData.slots[slotKey])
				equipItem(enm, unitData.slots[slotKey], slotKey);
		}
	}
	return enm;
}

function _placeUnit(x, y, unitName, faction) {
	const unit = createUnit(x, y, unitName, faction);
	if (unit) {
		entities.push(unit);
		return unit;
	}
	return null;
}

/**
 * Creates and adds a player-controlled unit at the specified coordinates.
 *
 * The unit is initialised with properties and equipment defined in the imported unit data, assigned a generated name, and added to both the player and global entity lists.
 * @param {number} x - The x-coordinate for the unit's position.
 * @param {number} y - The y-coordinate for the unit's position.
 * @param {string} unitName - The key identifying the unit type to create.
 */
function createPlayerUnit(x, y, unitName) {
	const unitData = importedUnits[unitName];
	if (!unitData) return;
	let Player = new WEntity(
		generateName(),
		unitData.icon,
		x,
		y,
		"player",
		true,
		new WMob(
			"player",
			JSON.parse(JSON.stringify(unitData.stats)),
			[], // drawstacks
			{}, // slots
			[], // traits
			unitData.background,
			unitData.death_message,
			unitData.desc
		),
		false,
		"mob"
	);
	Player.typename = unitData.name;
	player_entities.push(Player);
	entities.push(Player);
	if (unitData.slots) {
		for (const slotKey in unitData.slots) {
			if (unitData.slots[slotKey])
				equipItem(Player, unitData.slots[slotKey], slotKey);
		}
	}
}

/**
 * Places a 2x2 shuttle object adjacent to the player's starting position, overwriting existing terrain and making the affected tiles impassable.
 * 
 * The shuttle is positioned three tiles to the left of the player's start X coordinate and aligned vertically. Each shuttle part uses a specific icon and is only placed if within map bounds and the icon data exists.
 * 
 * @param {number} playerStartX - The x-coordinate of the player's starting position.
 * @param {number} playerStartY - The y-coordinate of the player's starting position.
 */
function placeShuttle(playerStartX, playerStartY) {
	debugLog(
		`Placing shuttle near player at (${playerStartX}, ${playerStartY})`,
		"info"
	);

	// Define the shuttle's shape and the icon for each part.
	// This makes it easy to read and modify.
	const shuttleShape = [
		{ x: 0, y: 0, iconKey: "shuttle_nw" }, // Top-left
		{ x: 1, y: 0, iconKey: "shuttle_ne" }, // Top-right
		{ x: 0, y: 1, iconKey: "shuttle_sw" }, // Bottom-left
		{ x: 1, y: 1, iconKey: "shuttle_se" }, // Bottom-right
	];

	// Determine the top-left coordinate of the shuttle.
	// We'll place it just to the left of the player's squad.
	const shuttleTopLeftX = playerStartX - 3;
	const shuttleTopLeftY = playerStartY;
	for (const part of shuttleShape) {
		// Find the specific icon data for this part of the shuttle.
		const shuttleIconData = icons[part.iconKey];

		// A quick safety check to ensure the icon exists.
		if (!shuttleIconData) {
			debugLog(
				`Icon data for '${part.iconKey}' not found! Skipping this part.`,
				"error"
			);
			continue;
		}

		const placeX = shuttleTopLeftX + part.x;
		const placeY = shuttleTopLeftY + part.y;

		// Skip any part that would be off-map.
		if (
			placeX < 0 ||
			placeY < 0 ||
			placeX >= VARS.MAP_X ||
			placeY >= VARS.MAP_Y
		) {
			continue;
		}

		// Stamp the shuttle part onto the world map.
		if (world[`${placeX},${placeY}`]) {
			// Overwrite the tile's icon with the correct shuttle part icon.
			world[`${placeX},${placeY}`].icon = JSON.parse(
				JSON.stringify(shuttleIconData)
			);

			// The passability should be defined in the icon data itself, but we'll enforce it here.
			_setWorldGridTile(placeX, placeY, false);
		}
	}
}

/**
 * Advances the game to the specified level, regenerating the world and entities for that level.
 * @param {number} level_nr - The level number to load.
 */
export function nextLevel(level_nr) {
	VARS.LEVEL = level_nr;
	loadLevel(VARS.LEVEL); // Changed from loadWorld_maze
}
