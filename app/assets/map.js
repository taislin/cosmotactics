import {
	VARS,
	entities,
	icons,
	items,
	player_entities,
	world_items,
	world_states,
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
 * Saves the current state of the world to the world_states manager.
 * This should be called BEFORE loading a new level.
 */
function saveCurrentLevelState() {
	if (VARS.LEVEL === null) return; // Don't save if no level is active

	debugLog(`Saving state for level ${VARS.LEVEL}`, "info");

	// Filter out player entities, as they are persistent and will be re-added.
	const nonPlayerEntities = entities.filter((e) => e.owner !== "player");

	world_states[VARS.LEVEL] = {
		world: JSON.parse(JSON.stringify(world)),
		world_grid: JSON.parse(JSON.stringify(world_grid)),
		world_items: JSON.parse(JSON.stringify(world_items)),
		entities: JSON.parse(JSON.stringify(nonPlayerEntities)), // Save only non-player entities
		map_x: VARS.MAP_X,
		map_y: VARS.MAP_Y,
	};
}
/**
 * Loads the specified level, restoring its previous state if visited or generating a new map and entities based on mission and biome data.
 * 
 * If a saved state exists for the level, restores world, entities, and player positions. Otherwise, generates terrain, places player units, shuttle or stairs, spawns biome-appropriate enemies, and handles mission-specific objectives such as item placement. Displays a contextual entry message for the biome.
 * 
 * @param {number} level - The level number to load.
 * @param {object} [entryPoint=null] - Optional coordinates {x, y} for player placement.
 */
export function loadLevel(level, entryPoint = null) {
	const missionData = VARS.currentMissionData;
	if (!missionData) {
		debugLog(
			"FATAL: loadLevel called without currentMissionData!",
			"error"
		);
		return;
	}
	const planet = missionData.planet;
	// --- NEW: MISSION INITIALIZATION ---
	if (level === 0) {
		// Mission objectives are set at the start (level 0)
		VARS.missionPhase = "MAIN";
		VARS.killCount = 0;
		VARS.targetKillCount = 0; // Default

		if (missionData.objective.type === "EXTERMINATE_AND_EVAC") {
			VARS.targetKillCount = Math.floor(
				missionData.objective.kill_count_base * missionData.difficulty
			);
		}
		// Add other objective types here later with `else if`
	}
	// --- 1. Check for and load existing state ---
	if (world_states[level]) {
		debugLog(`--- Loading existing state for Level ${level} ---`, "info");
		const savedState = world_states[level];

		world = savedState.world;
		world_grid = savedState.world_grid;
		world_items = savedState.world_items;

		// Restore non-player entities
		entities.length = 0; // Clear current entities
		savedState.entities.forEach((e_data) => {
			// This needs a proper re-hydration function, but for now we'll just push the data
			// In a more complex system, you'd new up WEntity and WMob from the saved data.
			entities.push(e_data);
		});

		VARS.MAP_X = savedState.map_x;
		VARS.MAP_Y = savedState.map_y;

		// Re-add player entities to the current entity list
		player_entities.forEach((p) => entities.push(p));

		if (entryPoint) {
			player_entities.forEach((p, i) => {
				p.x = entryPoint.x + (i % 2);
				p.y = entryPoint.y + Math.floor(i / 2);
			});
		}
		VARS.SELECTED = player_entities[0];
		VARS.LEVEL = level;
		return; // Stop here, level is loaded
	}
	debugLog(
		`--- Generating Level ${level} for Planet ${planet.name} (${planet.biome}) ---`,
		"info"
	);
	// --- 2. If no saved state, generate a new level ---
	debugLog(`--- Generating new Level ${level} ---`, "info");
	world = {};
	world_items.length = 0;
	entities.length = 0;
	player_entities.forEach((p) => entities.push(p));

	VARS.MAP_X = 40 + level * 2;
	VARS.MAP_Y = 30 + level * 2;
	world_grid = new Array(VARS.MAP_Y);
	VARS.LEVEL = level; // Set current level number
	// --- 3. Decide Map Type & Generate Base Terrain ---
	let mapData;
	// Map the biome name from your generator to the actual map-making function
	switch (planet.biome) {
		case "Jungle":
		case "Plains":
		case "Oceanic":
			mapData = generateOpenWorld(); // Your existing forest-style generator
			break;
		case "Arctic":
		case "Ice Caverns":
		case "Caverns":
		case "Desert":
		case "Volcanic":
		case "Barren Plains":
		case "Rocky Craters":
			mapData = generateCaveWorld(level); // Your existing cave-style generator
			break;
		default:
			debugLog(
				`Unknown biome: ${planet.biome}. Defaulting to caves.`,
				"warn"
			);
			mapData = generateCaveWorld(level);
			break;
	}
	// --- 4. Populate World from mapData ---
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
				terrainTypeKey: terrainKey,
			};
			_applyRandomIconProperties(world[`${x},${y}`]);
			_setWorldGridTile(x, y, iconData.passable);
		}
	}

	// --- 5. Place Player & Objective ---
	const playerStartPos = findClearAreaForPlayer();
	// Use entryPoint if provided, otherwise use generated start
	const startX = entryPoint ? entryPoint.x : playerStartPos.x;
	const startY = entryPoint ? entryPoint.y : playerStartPos.y;

	addPlayerUnits(startX, startY);

	if (level === 0) {
		// Only place shuttle on the surface level
		VARS.shuttleCoords = placeShuttle(startX, startY);
	} else {
		// For deeper levels, place "Stairs Up" where the player entered.
		world[`${startX},${startY}`].icon = JSON.parse(
			JSON.stringify(icons["stairs_up"])
		);
	}

	placeStairs(startX, startY); // This places "Stairs Down"

	// --- 6. Spawn Enemies and Items based on Map Type ---
	// Get all enemy KEYS from the importedUnits object
	const allEnemyKeys = Object.keys(importedUnits);
	// Filter the KEYS based on the properties of their corresponding objects
	const validEnemyKeys = allEnemyKeys.filter((key) => {
		const enemy = importedUnits[key];
		// Ensure the entry is actually an enemy (not a player unit) and has tags
		if (!enemy.tags || enemy.ai === "player") {
			return false;
		}
		return planet.enemyTags.some((tag) => (enemy.tags || []).includes(tag));
	});

	if (validEnemyKeys.length > 0) {
		// Use the targetKillCount for spawning if this is an exterminate mission
		const enemyCount =
			VARS.targetKillCount > 0
				? VARS.targetKillCount
				: 5 + Math.floor(level * missionData.difficulty); // Fallback for other missions

		for (let i = 0; i < enemyCount; i++) {
			const randomEnemyKey = getRandomElement(validEnemyKeys);
			_placeUnitOnRandomTile(randomEnemyKey, 1, "enemy", 8); // Pass the key directly
		}
	}
	let entryMessage = "";
	switch (planet.biome) {
		case "Jungle": {
			const forestMessages = [
				"You emerge into a clearing, the alien sun filtering through strange flora.",
				"The ground is soft with moss, but the silence feels unnatural.",
				"Twisted, alien trees loom over you like ancient sentinels.",
			];
			entryMessage = getRandomElement(forestMessages);
		}
			break;
		case "Plains": {
			const plainsMessages = [
				"You step onto the open plains, the wind carrying strange scents.",
				"The ground is hard-packed, dotted with alien grasses and flowers.",
				"A distant rumble hints at something large moving beneath the surface.",
			];
			entryMessage = getRandomElement(plainsMessages);
		}
			break;
		case "Oceanic":
			const oceanMessages = [
				"The air is thick with salt and the sound of waves crashing nearby.",
				"Strange, bioluminescent creatures flicker in the shallows.",
				"The ground is wet and slippery, covered in alien seaweed.",
			];
			entryMessage = getRandomElement(oceanMessages);
			break;
		case "Arctic":
			const arcticMessages = [
				"The cold bites at your suit as you step onto the icy surface.",
				"Snow crunches underfoot, and the air is thin and frigid.",
				"Strange ice formations rise like jagged teeth from the frozen ground.",
			];
			entryMessage = getRandomElement(arcticMessages);
			break;
		case "Ice Caverns":
			const iceCaveMessages = [
				"You enter a cavern of shimmering ice, the walls glowing faintly.",
				"The air is frigid, and your breath fogs in front of you.",
				"Strange, crystalline structures jut from the walls, reflecting light eerily.",
			];
			entryMessage = getRandomElement(iceCaveMessages);
			break;
		case "Caverns": {
			const caveMessages = [
				"The air grows cold and damp.",
				"A low, chittering sound echoes from the darkness ahead.",
				"The smell of ozone and alien decay hangs heavy in this chamber.",
			];
			entryMessage = getRandomElement(caveMessages);
			break; // CRITICAL: prevent fall-through into "Desert"
		}
		case "Desert": {
			const desertMessages = [
				"The heat is oppressive as you step onto the sandy expanse.",
				"Strange rock formations jut from the ground like ancient monuments.",
				"The wind carries a fine layer of dust that stings your eyes.",
			];
			entryMessage = getRandomElement(desertMessages);
		}
			break;
		case "Volcanic":
			const volcanicMessages = [
				"The ground trembles slightly as you step onto the volcanic rock.",
				"Heat radiates from fissures in the ground, and the air smells of sulfur.",
				"Strange, glowing minerals dot the landscape, casting an eerie light.",
			];
			entryMessage = getRandomElement(volcanicMessages);
			break;
		case "Barren Plains":
			const barrenMessages = [
				"You step onto the cracked, dry earth of the barren plains.",
				"The wind howls across the desolate landscape, carrying dust and debris.",
				"Strange, twisted plants cling to life in this harsh environment.",
			];
			entryMessage = getRandomElement(barrenMessages);
			break;
		case "Rocky Craters":
			const rockyMessages = [
				"You find yourself in a field of jagged rocks and deep craters.",
				"The ground is uneven, and every step feels precarious.",
				"Strange, alien minerals glint in the light, hinting at hidden dangers.",
			];
			entryMessage = getRandomElement(rockyMessages);
			break;
		default:
			entryMessage =
				"You step into the alien terrain, ready for whatever lies ahead.";
			break;
	}
	if (entryMessage != "") {
		log({ type: "info", text: entryMessage });
	}
	const objectiveData = missionData.objective;
	if (
		objectiveData.type === "RETRIEVE_AND_EVAC" &&
		objectiveData.spawn_level === level
	) {
		// This is the correct level to spawn the artifact.
		// Place it far away from the player's entry point.
		createItemRand(objectiveData.item_key, 1, 15); // Spawn 1, at least 15 tiles away
		log({
			type: "info",
			text: "Long-range scanners detect an anomalous energy signature nearby.",
		});
	}
}
/**
 * Finds a 3x3 passable area on the map suitable for player spawning.
 * 
 * Attempts up to 100 times to locate a clear 3x3 region near the map origin; if unsuccessful, forcibly clears and returns coordinates at (2,2).
 * @return {{x: number, y: number}} The coordinates of the top-left tile of the clear area.
 */
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

/**
 * Places one or more units of the specified type on random empty tiles at a minimum distance from the player.
 * @param {string} unitName - The name of the unit type to place.
 * @param {number} [count=1] - The number of units to place.
 * @param {string} [faction="enemy"] - The faction to assign to the placed units.
 * @param {number} [minDistanceFromPlayer=8] - The minimum distance from the player for placement.
 * @return {object|null} The placed entity if only one unit is placed; otherwise, null.
 */
function _placeUnitOnRandomTile(
	unitName,
	count = 1,
	faction = "enemy",
	minDistanceFromPlayer = 8
) {
	let placedCount = 0;
	let lastPlacedEntity = null; // Variable to hold the last created entity

	for (let i = 0; i < count; i++) {
		const emptyTile = _findEmptyTile(minDistanceFromPlayer);
		if (emptyTile) {
			// _placeUnit should already return the entity, let's ensure it does.
			const newEntity = _placeUnit(
				emptyTile[0],
				emptyTile[1],
				unitName,
				faction
			);
			if (newEntity) {
				placedCount++;
				lastPlacedEntity = newEntity;
			}
		} else {
			debugLog(`No free tiles to spawn ${unitName}!`, "warn");
			break;
		}
	}
	// If we only placed one, return it. Useful for HVT tracking.
	return count === 1 ? lastPlacedEntity : null;
}

/**
 * Finds an unoccupied, passable tile at least a specified distance from the player.
 * @param {number} [minDistanceFromPlayer=8] - The minimum allowed distance from the player's current position.
 * @return {number[]|null} The coordinates `[x, y]` of a suitable tile, or `null` if none found.
 */
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
 * Searches for a valid 2x2 area near the player's starting position and places the shuttle there, marking the tiles as impassable.
 * Expands the search outward in square rings until a suitable area is found or the maximum radius is reached.
 * @param {number} playerStartX - The x-coordinate of the player's starting position.
 * @param {number} playerStartY - The y-coordinate of the player's starting position.
 * @returns {object|undefined} The coordinates of the shuttle's door tile if placed, otherwise undefined.
 */
function placeShuttle(playerStartX, playerStartY) {
	debugLog(
		`Searching for shuttle placement near (${playerStartX}, ${playerStartY})`,
		"info"
	);

	const shuttleShape = [
		{ x: 0, y: 0, iconKey: "shuttle_nw" },
		{ x: 1, y: 0, iconKey: "shuttle_ne" },
		{ x: 0, y: 1, iconKey: "shuttle_sw" },
		{ x: 1, y: 1, iconKey: "shuttle_se" },
	];

	let shuttlePlaced = false;
	let searchRadius = 3; // Start searching 3 tiles away

	// Keep expanding the search radius until we find a spot or give up.
	while (!shuttlePlaced && searchRadius < 10) {
		// Search in a square ring around the player at the current radius
		for (
			let x = playerStartX - searchRadius;
			x <= playerStartX + searchRadius;
			x++
		) {
			for (
				let y = playerStartY - searchRadius;
				y <= playerStartY + searchRadius;
				y++
			) {
				// Check if this position (as the top-left corner) is a valid spot
				let canPlaceHere = true;
				for (const part of shuttleShape) {
					const checkX = x + part.x;
					const checkY = y + part.y;
					// Is the spot off the map or not a passable floor tile?
					if (
						checkX < 0 ||
						checkY < 0 ||
						checkX >= VARS.MAP_X ||
						checkY >= VARS.MAP_Y ||
						world_grid[checkY][checkX] !== 1
					) {
						canPlaceHere = false;
						break;
					}
				}

				// If all 2x2 tiles are valid, place the shuttle and we're done
				if (canPlaceHere) {
					for (const part of shuttleShape) {
						const placeX = x + part.x;
						const placeY = y + part.y;
						const shuttleIconData = icons[part.iconKey];

						if (shuttleIconData && world[`${placeX},${placeY}`]) {
							world[`${placeX},${placeY}`].icon = JSON.parse(
								JSON.stringify(shuttleIconData)
							);
							_setWorldGridTile(placeX, placeY, false);
						}
					}
					debugLog(`Placed shuttle at top-left (${x}, ${y})`, "info");
					shuttlePlaced = true;
					return; // Exit the function
				}
			}
		}
		searchRadius++; // If no spot found, increase search radius and try again
	}
	if (shuttlePlaced) {
		debugLog(`Placed shuttle at top-left (${x}, ${y})`, "info");
		// Return the coordinates of the "door" or a central point for evac checks
		return { x: x, y: y + 1 }; // e.g., bottom-left tile
	}
	if (!shuttlePlaced) {
		debugLog(
			"Could not find a valid 2x2 area to place the shuttle near the player.",
			"error"
		);
	}
}
/**
 * Handles moving between levels.
 * @param {number} targetLevel - The level number to go to.
 * @param {object} targetCoords - The x,y coords of the stairs being used.
 */
export function changeLevel(targetLevel, targetCoords) {
	saveCurrentLevelState();
	loadLevel(targetLevel, targetCoords); // Pass the stairs' location as the new entry point
}

export function nextLevel(level_nr) {
	VARS.LEVEL = level_nr;
	loadLevel(VARS.LEVEL); // Changed from loadWorld_maze
}
