import { world_grid, loadWorld_maze, world } from "./map.js";
import { goToLostMenu, sleep } from "./controls.js";
import { setSeed } from "../index.js";

/**
 * @type {Object} Holds all icon data.
 */
export var icons = {};
/**
 * @type {Object} Holds all item data.
 */
export var items = {};
/**
 * @type {Array} Holds all projectile entities.
 */
export var projectiles = [];
/**
 * @type {Array} Holds all entities.
 */
export var entities = [];
/**
 * @type {Array} Holds all player-controlled entities.
 */
export var player_entities = [];
/**
 * @type {Array} Holds all world items.
 */
export var world_items = [];
export var DEBUGGING = false;
export var DEBUGLOG = "";
const initial_vars = {
	MAP_X: 32,
	MAP_Y: 20,
	MAP_DISPLAY_X: 10,
	MAP_DISPLAY_Y: 10,
	ZOOM_LEVEL: 1,
	TURN: 1,
	MODE: "none",
	GAMEWINDOW: "MENU",
	MENU_ITEM: 1,
	MENU_LENGTH: 0,
	VERSION: "0.2.0",
	SUBMENU: "EQUIPMENT",
	GAMELOG: [],
	TARGET: [-1, -1],
	SELECTED: null,
	LEVEL: 0,
};
export let VARS = JSON.parse(JSON.stringify(initial_vars));
const initial_stats = {
	GOLD: 10,
	OXYGEN: 100,
};
export let STATS = JSON.parse(JSON.stringify(initial_stats));

/**
 * Checks if a move to the specified coordinates is valid.
 * @param {number} x - The x-coordinate to check.
 * @param {number} y - The y-coordinate to check.
 * @returns {boolean} True if the move is valid, false otherwise.
 */
export function checkMove(x, y) {
	if (world_grid[y] && world_grid[y][x] === 1) {
		// Strict equality
		for (var e of entities) {
			if (
				e.x === x && // Strict equality
				e.y === y && // Strict equality
				!e.passable &&
				e.owner !== VARS.SELECTED.owner // Strict inequality
			) {
				return false;
			}
		}
		return true;
	} else {
		return false;
	}
}

/**
 * Checks if a move to the specified coordinates is valid for a specific unit owner.
 * @param {number} x - The x-coordinate to check.
 * @param {number} y - The y-coordinate to check.
 * @param {Object} movingUnit - The entity instance that is attempting the move.
 * @returns {boolean} True if the move is valid, false otherwise.
 */
export function checkMoveOwned(x, y, movingUnit) {
	if (world_grid[y] && world_grid[y][x] === 1) {
		// Strict equality
		for (var e of entities) {
			// ** THE FIX IS HERE **
			// Block the move if there's an impassable entity on the tile
			// AND that entity is NOT the one currently trying to move.
			if (
				e.x === x &&
				e.y === y &&
				!e.passable &&
				e !== movingUnit // This prevents any unit from moving onto another's tile.
			) {
				return false;
			}
		}
		return true;
	} else {
		return false;
	}
}

/**
 * Checks if a tile at the specified coordinates has light.
 * @param {number} x - The x-coordinate to check.
 * @param {number} y - The y-coordinate to check.
 * @returns {boolean} True if the tile has light, false otherwise.
 */
export function checkLight(x, y) {
	if (world_grid[y] && world_grid[y][x] === 1) {
		// Strict equality
		return true;
	} else {
		return false;
	}
}

/**
 * Processes a single game turn, updating entities and game state.
 */
export function processTurn() {
	// Wait for any active projectiles to finish moving
	if (projectiles.length > 0) {
		setTimeout(processTurn, 50); // Check again in 50ms
		return;
	}

	// --- Start of AI and Player Squad Action Phase ---
	const activeEntities = [...entities]; // Create a shallow copy to iterate over

	for (const e of activeEntities) {
		// Use const for iteration variable
		if (!e.mob || e.mob.ai === "dead") continue;

		// Update defence stats for player units at the start of their potential action
		if (e.owner === "player") {
			e.mob.stats.defence = 0;
			if (e.mob.slots.suit) {
				e.mob.stats.defence += e.mob.slots.suit.stats.defence;
			}
			if (e.mob.slots.head) {
				e.mob.stats.defence += e.mob.slots.head.stats.defence;
			}
		}

		// Check if unit is ready to act based on its speed/delay
		if (VARS.TURN < e.nextMoveTurn) {
			debugLog(
				`${e.name} (Speed: ${e.mob.stats.speed}) is recharging (nextMoveTurn: ${e.nextMoveTurn}, current: ${VARS.TURN})`,
				"debug"
			);
			continue; // Skip this unit if it's not ready to act yet
		}

		if (e.owner === "player") {
			if (e === VARS.SELECTED) {
				// The actively selected player unit's primary action (move/fire/wait)
				// is already handled by player input via controls.js.
			} else {
				// Player squad AI: Handle follow/hold and autofire/melee for non-selected player units
				const mob = e.mob;
				let actionTakenThisTurn = false; // Flag to ensure only one main action is taken

				// Priority 1: Autofire (if enabled)
				if (mob.autofire || mob.stance === "hold") {
					// Units on 'hold' also try to fire
					actionTakenThisTurn = e.processFire(); // processFire returns true if it fired/reloaded
				}

				// Priority 2: Melee (if not already acted and enemy is in range)
				if (!actionTakenThisTurn) {
					const en = e.getEnemy(1.5); // Check for enemies in melee range
					if (en.entity && en.dist <= 1.5) {
						actionTakenThisTurn = e.doMelee(en); // doMelee returns true if it attacked
					}
				}

				// Priority 3: Follow (if not already acted and in 'follow' stance)
				if (!actionTakenThisTurn && mob.stance === "follow") {
					const pl = e.getPlayer();
					if (pl.entity && pl.dist > 1.5) {
						// Only move if player is not directly adjacent
						actionTakenThisTurn = e.doMove(pl, mob.stats.speed); // doMove updates nextMoveTurn
					} else {
						// If player is adjacent, they've "caught up", so recharge their turn
						e.nextMoveTurn = VARS.TURN + 1 / mob.stats.speed;
					}
				}
			}
		} else {
			// Enemy AI
			e.performAITurn(); // Let enemy AI units perform their turn
		}
	}
	// --- End of AI and Player Squad Action Phase ---

	// --- Start of Post-Action Phase: Health Check & Death ---
	let dead_entities_this_turn = []; // Collection for safe removal

	for (const e of entities) {
		e.process();
		if (e.mob && e.mob.ai === "dead") {
			dead_entities_this_turn.push(e);
		}
	}
	// Now, safely remove all dead entities from the game lists
	for (const dead_entity of dead_entities_this_turn) {
		let p_index = player_entities.indexOf(dead_entity);
		if (p_index > -1) {
			player_entities.splice(p_index, 1);
		}

		let e_index = entities.indexOf(dead_entity);
		if (e_index > -1) {
			entities.splice(e_index, 1);
		}
	}
	// --- END REFACTOR ---

	let newOxygen = parseFloat((STATS.OXYGEN - 0.1).toFixed(1));
	STATS.OXYGEN = Math.max(newOxygen, 0);

	VARS.TURN++;
	if (checkLose() === true) {
		goToLostMenu();
	}
}

/**
 * Checks if the player has lost the game.
 * @returns {boolean} True if the player has lost, false otherwise.
 */
function checkLose() {
	if (STATS.OXYGEN <= 0) {
		return true;
	}
	if (player_entities.length <= 0) {
		return true;
	}
	return false;
}

/**
 * Logs a debug message to the console and the in-game debug log.
 * @param {string|Object} text - The message to log.
 * @param {string} [type="log"] - The type of log message (log, error, warn, info, debug).
 */
export function debugLog(text, type = "log") {
	let typecolor = "white";
	if (DEBUGGING === true) {
		if (typeof text === "object") {
			text = JSON.stringify(text);
		}
		if (type === "log") {
			typecolor = "green";
		} else if (type === "error") {
			console.error(text);
			typecolor = "red";
		} else if (type === "warn") {
			console.warn(text);
			typecolor = "yellow";
		} else if (type === "info") {
			typecolor = "cyan";
			console.info(text);
		} else if (type === "debug") {
			typecolor = "white";
			console.debug(text);
		}
		const date = new Date();
		const datevalues =
			"" +
			date.getDate() +
			"-" +
			(date.getMonth() + 1) +
			"-" +
			date.getFullYear() +
			" " +
			date.getHours() +
			":" +
			date.getMinutes() +
			":" +
			date.getSeconds();
		DEBUGLOG =
			`(${datevalues}) <span style='color:${typecolor}'>${type.toUpperCase()}</span>: ${text}<br>` +
			DEBUGLOG;
		document.getElementById("log").innerHTML = DEBUGLOG;
	}
}

/**
 * Resets the game to its initial state.
 * @param {number} [_seed=null] - Optional seed value for the random number generator.
 */
export function resetGame(_seed = null) {
	VARS = JSON.parse(JSON.stringify(initial_vars));
	STATS = JSON.parse(JSON.stringify(initial_stats));
	projectiles = [];
	entities = [];
	player_entities = [];
	world_items = [];
	if (_seed) {
		setSeed(_seed);
		loadWorld_maze(0);
	}
	setSeed(Math.random());
	loadWorld_maze(0);
}
