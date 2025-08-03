import { world_grid, loadLevel, world } from "./map.js";
import { goToLostMenu, sleep, goToMainMenu } from "./controls.js";
import { setSeed } from "../index.js";
import pkg from "../../package.json" with { type: "json" };
// Import from new utils file for shared logic
import {
	isTilePassableForMovement,
	checkFire,
	areAllPlayersInEvacZone,
} from "./utils/gameUtils.js";
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
// The key will be the level number (e.g., 0, 1, 2).
export let world_states = {};

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
	VERSION: pkg.version,
	SUBMENU: "EQUIPMENT",
	GAMELOG: [],
	TARGET: [-1, -1],
	SELECTED: null,
	LEVEL: null,
	isAnimating: false,
	missionChoices: [], // Will hold the 3 generated mission options
	currentMissionData: null, // Will hold the data for the mission the player deploys to
	missionPhase: "NONE", // 'NONE', 'MAIN', 'EVAC'
	killCount: 0,
	targetKillCount: 0,
	shuttleCoords: null, // Will store {x, y} of the shuttle's "door"
	isArtifactSecured: false,
	hvt_entity_id: null,
};
export let VARS = JSON.parse(JSON.stringify(initial_vars));
const initial_stats = {
	GOLD: 10,
	OXYGEN: 100,
};
export let STATS = JSON.parse(JSON.stringify(initial_stats));

/**
 * NEW: Updates game logic for animations, like projectiles.
 * @param {number} deltaTime - The time elapsed since the last frame.
 */
export function updateGameLogic(deltaTime) {
	// We iterate backwards to allow for safe removal of projectiles
	for (let i = projectiles.length - 1; i >= 0; i--) {
		projectiles[i].update(deltaTime);
	}
}

/**
 * Determines if the tile at the given coordinates is passable for general movement or pathfinding.
 * @param {number} x - The x-coordinate of the tile.
 * @param {number} y - The y-coordinate of the tile.
 * @returns {boolean} True if the tile is passable, false otherwise.
 */
export function checkMove(x, y) {
	return isTilePassableForMovement(x, y, null);
}

/**
 * Determines if light can pass through the tile at the specified coordinates.
 *
 * Returns false if the coordinates are out of bounds or the tile does not exist. Returns true if the tile's icon is marked as transparent or if the tile is passable for movement; otherwise, returns false.
 *
 * @param {number} x - The horizontal coordinate of the tile.
 * @param {number} y - The vertical coordinate of the tile.
 * @returns {boolean} True if the tile is transparent to light; false if it blocks light.
 */
export function checkLight(x, y) {
	// Check for out-of-bounds coordinates first
	if (x < 0 || y < 0 || x >= VARS.MAP_X || y >= VARS.MAP_Y) {
		return false;
	}

	const tile = world[x + "," + y];
	if (!tile) {
		// If for some reason the tile doesn't exist in the world object, treat as a wall.
		return false;
	}

	// A tile is transparent if its icon definition explicitly says so.
	if (tile.icon && tile.icon.transparent === true) {
		return true;
	}

	// Fallback for all other tiles:
	// A tile is transparent if it is passable for movement (e.g., floor, grass).
	// This maintains the original behavior for walls and other obstacles.
	if (world_grid[y] && world_grid[y][x] === 1) {
		return true;
	}

	return false; // Otherwise, it blocks light.
}

/**
 * Processes a single game turn, handling entity actions, AI behaviour, mission phase transitions, oxygen depletion, and loss conditions.
 *
 * Advances the game state by updating all entities, resolving player and AI actions, removing dead entities, and managing mission objectives such as evacuation and high-value target elimination. Handles oxygen consumption if required by the mission's planet and checks for loss conditions at the end of the turn.
 */
export function processTurn() {
	// 1. Check for active projectiles and wait if any are still flying
	if (projectiles.length > 0 || VARS.isAnimating) {
		// If there are projectiles, don't process the turn yet.
		// Schedule this function to run again very soon.
		setTimeout(processTurn, 50); // Check again in 50ms
		return; // Exit current execution
	}

	// If no projectiles, proceed with the turn.
	// --- Start of AI and Player Squad Action Phase ---
	const activeEntities = [...entities]; // Create a shallow copy to iterate over

	for (const e of activeEntities) {
		if (e.mob && e.mob.ai === "dead") {
			// --- NEW: INCREMENT KILL COUNT ---
			if (e.owner !== "player") {
				// Only count non-player deaths
				VARS.killCount++;
			}
			// --- END ---
			dead_entities_this_turn.push(e);
			continue;
		}

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
	if (VARS.missionPhase === "EVAC") {
		let canEvac = false;
		const objectiveType = VARS.currentMissionData.objective.type;

		if (objectiveType === "EXTERMINATE_AND_EVAC") {
			canEvac = true; // For this mission, just being in the EVAC phase is enough
		} else if (objectiveType === "RETRIEVE_AND_EVAC") {
			canEvac = VARS.isArtifactSecured; // For this mission, you must have the artifact
		} else if (objectiveType === "ASSASSINATE_AND_EVAC") {
			// You can only evac if the mission is in the EVAC phase
			// (which is only set when the HVT is confirmed dead).
			canEvac = VARS.missionPhase === "EVAC";
		}

		if (canEvac && areAllPlayersInEvacZone()) {
			log({
				type: "info",
				text: "%c{green}Mission Complete! Extracting squad.",
			});
			// TODO: Transition to Debriefing Screen
			VARS.GAMEWINDOW = "MENU";
			goToMainMenu(); // Placeholder
			return;
		}
	} else if (
		VARS.missionPhase === "MAIN" &&
		VARS.currentMissionData.objective.type === "ASSASSINATE_AND_EVAC"
	) {
		// Check if the HVT entity exists and is dead
		const hvt = entities[VARS.hvt_entity_id];
		if (hvt && hvt.mob.ai === "dead") {
			VARS.missionPhase = "EVAC";
			log({
				type: "info",
				text: "%c{yellow}High-Value Target eliminated! Proceed to extraction.",
			});
			VARS.hvt_entity_id = null; // Clear the ID
		} else if (!hvt && VARS.hvt_entity_id !== null) {
			// This case handles if the entity was removed from the array for any reason
			// We assume it's dead if the ID was set but the entity is gone
			VARS.missionPhase = "EVAC";
			log({
				type: "info",
				text: "%c{yellow}HVT signal lost, presumed eliminated. Proceed to extraction.",
			});
			VARS.hvt_entity_id = null;
		}
	}
	if (VARS.currentMissionData && VARS.currentMissionData.planet.needsOxygen) {
		let newOxygen = parseFloat((STATS.OXYGEN - 0.1).toFixed(1));
		STATS.OXYGEN = Math.max(newOxygen, 0);
	}

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
 * Central logging function using Unicode symbols for clarity and conciseness.
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
		: "A blast";
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
				message += `%b{#401010}%c{red}▼%c{}%b{} ${sourceName} ${verb} ${targetName} for ${damageText}!`;
			} else {
				// Damage to enemies
				message += `%c{green}※%c{} ${sourceName} ${verb} ${targetName} for ${damageText}.`;
			}
			break;

		case "miss":
			message += `%c{gray}~%c{} ${sourceName}'s shot misses ${targetName}.`;
			break;

		case "block":
			message += `%c{blue}/%c{} ${targetName} blocks ${sourceName}'s attack.`;
			break;
		case "action":
			let weaponName = event.weapon ? ` their ${event.weapon.name}` : "";
			message += `%c{cyan}⚙%c{} ${sourceName} ${event.action}${weaponName}.`;
			break;

		case "death":
			let deathSymbol =
				event.source.owner === "player"
					? `%c{orange}☠%c{}`
					: `%c{red}☠%c{}`;

			if (event.source.mob && event.source.mob.death_message) {
				message += `${deathSymbol} ${event.source.mob.death_message}`;
			} else {
				message += `${deathSymbol} ${sourceName} dies!`;
			}
			break;

		case "info":
			message += `%c{yellow}»%c{} ${event.text}`;
			break;

		default:
			message += event.text; // Fallback for simple messages
			break;
	}

	VARS.GAMELOG.unshift(message);
}

/**
 * Outputs a debug message to both the browser console and the in-game debug log when debugging is enabled.
 *
 * Supports log types: "log", "error", "warn", "info", and "debug", each with distinct formatting and console output. Messages are timestamped and colour-coded in the in-game log.
 *
 * @param {string|Object} text - The message or object to log.
 * @param {string} [type="log"] - The log type, affecting formatting and console method.
 */
export function debugLog(text, type = "log") {
	let typecolor = "white";
	if (DEBUGGING === true) {
		if (typeof text === "object") {
			text = JSON.stringify(text);
		}
		if (type === "log") {
			typecolor = "green";
			console.log(text);
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
 * Restores all game variables, entities, and items to their initial state and loads the starting level.
 * If a seed is provided, it is used for randomisation; otherwise, a random seed is generated.
 * @param {number} [_seed=null] Optional seed for deterministic game state.
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
