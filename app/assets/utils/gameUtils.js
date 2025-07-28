import { VARS, entities, debugLog } from "./../engine.js";
import { world_grid } from "./../map.js";

/**
 * Helper function to select a random element from an array.
 * @param {Array} arr - The array to select from.
 * @returns {*} A random element from the array.
 */
export function getRandomElement(arr) {
	if (!arr || arr.length === 0) return undefined; // Handle empty or null arrays
	return arr[Math.floor(ROT.RNG.getUniform() * arr.length)]; // Use ROT.RNG for consistency
}

/**
 * Finds a mob entity at the specified coordinates.
 * @param {number} tgt_x - The target x-coordinate.
 * @param {number} tgt_y - The target y-coordinate.
 * @returns {WEntity|null} The mob entity if found and alive, otherwise null.
 */
export function findMobCoords(tgt_x, tgt_y) {
	for (const e of entities) {
		if (e.x === tgt_x && e.y === tgt_y && e.mob && e.mob.ai !== "dead") {
			return e;
		}
	}
	return null;
}

/**
 * Checks if there is a clear line of fire between two points, accounting for walls/impassable terrain.
 * @param {number} x1 - The starting x-coordinate.
 * @param {number} y1 - The starting y-coordinate.
 * @param {number} x2 - The target x-coordinate.
 * @param {number} y2 - The target y-coordinate.
 * @returns {boolean} True if there is a clear line of fire, otherwise false.
 */
export function checkFire(x1, y1, x2, y2) {
	const pathfinder = new ROT.Path.Dijkstra(x2, y2, (px, py) => {
		if (px < 0 || px >= VARS.MAP_X || py < 0 || py >= VARS.MAP_Y) {
			return false; // Out of bounds
		}
		// Only check for world_grid passability (walls), not other entities for LOS
		return world_grid[py][px] === 1;
	});

	let hasLineOfSight = true;
	let path = [];
	pathfinder.compute(x1, y1, (px, py) => {
		path.push([px, py]);
	});

	// If the pathfinder couldn't reach the target, or the path is empty (shouldn't be if start == end),
	// or the last point in the path is not the target, then there's no LOS.
	if (
		path.length === 0 ||
		path[path.length - 1][0] !== x2 ||
		path[path.length - 1][1] !== y2
	) {
		hasLineOfSight = false;
	}

	return hasLineOfSight;
}

/**
 * Checks if a tile at the specified coordinates is passable for a given moving unit.
 * Accounts for terrain passability (walls) and other entities (ensuring the movingUnit itself doesn't block its own pathfinding).
 * This is a more robust version of `checkMove` from `engine.js`.
 * @param {number} x - The x-coordinate to check.
 * @param {number} y - The y-coordinate to check.
 * @param {Object} movingUnit - The entity instance that is attempting the move (can be null if checking general passability).
 * @returns {boolean} True if the tile is passable for the `movingUnit`, false otherwise.
 */
export function isTilePassableForMovement(x, y, movingUnit) {
	// Check map bounds
	if (x < 0 || x >= VARS.MAP_X || y < 0 || y >= VARS.MAP_Y) {
		return false;
	}

	// Check terrain passability (e.g., walls). world_grid[y][x] === 0 means impassable wall.
	if (!world_grid[y] || world_grid[y][x] === 0) {
		return false;
	}

	// Check for other entities occupying the tile
	for (const e of entities) {
		// If an entity `e` is at `(x, y)` AND it's not passable AND it's not the `movingUnit` itself, then the tile is blocked.
		if (
			e.x === x &&
			e.y === y &&
			!e.passable &&
			e !== movingUnit // This is crucial: a unit can start pathfinding from its own square.
		) {
			// Additionally, if the occupying entity is a dead mob, it should be passable
			if (e.mob && e.mob.ai === "dead") {
				continue; // Dead mobs are passable, so don't block
			}
			return false; // Blocked by another living, impassable entity
		}
	}
	return true; // Tile is passable
}

// Keeping getDir here as it's a general utility function that could be used by others.
export function getDir(ox, oy, tx, ty) {
	let dir = null;
	if (Math.abs(ox - tx) >= Math.abs(oy - ty)) {
		if (ox < tx) {
			dir = "east";
		} else {
			dir = "west";
		}
	} else {
		if (oy < ty) {
			dir = "south";
		} else {
			dir = "north";
		}
	}
	return dir;
}
