import { world_grid, loadLevel, world } from "./map.js";
import { goToLostMenu, sleep } from "./controls.js";
import { setSeed } from "../index.js";
// Import from new utils file for shared logic
import { isTilePassableForMovement, checkFire } from "./utils/gameUtils.js";
// Import for player squad AI logic
import { processPlayerSquadAI } from "./ai/mobAI.js";

export { log };
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
	VERSION: "0.2.1-dev",
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
 * Checks if a tile at the specified coordinates is passable for general pathfinding (e.g., for LOS or basic AI without considering specific unit collisions).
 * This function now uses the more robust `isTilePassableForMovement` from `gameUtils.js` by passing `null` for the moving unit.
 * @param {number} x - The x-coordinate to check.
 * @param {number} y - The y-coordinate to check.
 * @returns {boolean} True if the tile is generally passable, false otherwise.
 */
export function checkMove(x, y) {
	return isTilePassableForMovement(x, y, null);
}

/**
 * Checks if a tile at the specified coordinates has light.
 * This function relies on `world_grid` which directly reflects terrain passability for light.
 * @param {number} x - The x-coordinate to check.
 * @param {number} y - The y-coordinate to check.
 * @returns {boolean} True if the tile has light (i.e., is not a blocking wall), false otherwise.
 */
export function checkLight(x, y) {
	if (world_grid[y] && world_grid[y][x] === 1) {
		// 1 typically means passable for light
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
				// For the selected unit, we simply advance its turn based on its speed
				// since its action was player-controlled.
				e.nextMoveTurn = VARS.TURN + 1 / e.mob.stats.speed;
			} else {
				// Player squad AI: Handle follow/hold and autofire/melee for non-selected player units
				processPlayerSquadAI(e); // Delegate to AI module in mobAI.js
			}
		} else {
			// Enemy AI
			e.performAITurn(); // Let enemy AI units perform their turn (delegated to mobAI.js)
		}
	}

	// --- End of AI and Player Squad Action Phase ---

	// --- Start of Post-Action Phase: Health Check & Death ---
	let dead_entities_this_turn = []; // Collection for safe removal

	for (const e of entities) {
		e.process(); // This handles health checks and marks as dead
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
 * NEW: Central logging function.
 * Creates formatted, atmospheric log messages from event objects.
 * @param {object} event - A structured object describing the game event.
 * e.g., { type: 'damage', source: entity, target: entity, amount: 10, weapon: item }
 * e.g., { type: 'action', source: entity, action: 'reloads', weapon: item }
 */
function log(event) {
	let message = `${VARS.TURN}: `;
	const sourceName = event.source
		? event.source.owner === "player"
			? `%c{#009f00}${event.source.name}%c{}`
			: `%c{#ffa500}${event.source.name}%c{}`
		: "";
	const targetName = event.target
		? event.target.owner === "player"
			? `%c{#009f00}${event.target.name}%c{}`
			: `%c{#ffa500}${event.target.name}%c{}`
		: "";

	switch (event.type) {
		case "damage":
			const damageText = `%c{red}${event.amount} HP%c{}`;
			let verb = "hits";
			if (event.weapon) {
				if (event.weapon.itemtype.includes("laser")) verb = "sears";
				if (event.weapon.itemtype.includes("plasma")) verb = "blasts";
				if (event.weapon.itemtype.includes("projectile"))
					verb = "shoots";
				if (event.weapon.itemtype.includes("bladed")) verb = "slashes";
			}

			// Critical: Highlight when the player is the target
			if (event.target && event.target.owner === "player") {
				message += `%b{#401010}🛡️ ${sourceName} ${verb} ${targetName} for ${damageText}!%b{}`;
			} else {
				message += `${sourceName} ${verb} ${targetName} for ${damageText}.`;
			}
			break;

		case "miss":
			message += `${sourceName}'s shot misses ${targetName}.`;
			break;

		case "action":
			let weaponName = event.weapon ? ` their ${event.weapon.name}` : "";
			message += `${sourceName} ${event.action}${weaponName}.`;
			break;

		case "death":
			message += `${sourceName} dies!`;
			if (event.source.mob && event.source.mob.death_message) {
				message = `${VARS.TURN}: ${event.source.mob.death_message}`;
			}
			break;

		case "info":
			message += `%c{yellow}${event.text}%c{}`;
			break;

		default:
			message += event.text; // Fallback for simple messages
			break;
	}

	VARS.GAMELOG.unshift(message);
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
		loadLevel(0);
	}
	setSeed(Math.random());
	loadLevel(0);
}
