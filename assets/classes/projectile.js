import {
	icons,
	VARS,
	projectiles,
	debugLog,
	entities,
	log,
} from "../engine.js";
import { effects } from "../display.js";
// Import findMobCoords and getDir from the new utils file
import { findMobCoords } from "./../utils/gameUtils.js"; // getDir is not needed directly here, but checkFire is conceptually related
import { sleep } from "../controls.js";
import { world_grid } from "../map.js";

/**
 * Generates a random number using a normal distribution (Box-Muller transform).
 * This creates more natural-feeling random damage values centered around a mean.
 * @param {number} [mean=0] - The mean of the distribution.
 * @param {number} [stdev=1] - The standard deviation of the distribution.
 * @returns {number} - The generated random number.
 */
function getNormal(mean = 0, stdev = 1) {
	const u = 1 - Math.random(); // Convert [0,1) to (0,1]
	const v = Math.random();
	const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
	return z * stdev + mean; // Apply mean and standard deviation
}

/**
 * Calculates damage based on the modifier's attack stat.
 * Damage is randomized within a range around the attack stat.
 * @param {object} modif - The modifier object containing attack stats.
 * @returns {number} - The calculated damage.
 */
function calculateDamage(modif) {
	// Use a 7% standard deviation for damage variance
	let dmg = Math.round(
		getNormal(modif.stats.attack, modif.stats.attack * 0.07)
	);
	// Clamp damage to a +/- 10% range to avoid extreme outliers
	dmg = Math.min(dmg, modif.stats.attack * 1.1);
	dmg = Math.max(dmg, modif.stats.attack * 0.9);
	return Math.max(1, dmg); // Ensure at least 1 damage
}

/**
 * Represents a projectile in the game.
 */
export class Projectile {
	constructor(x, y, modif, source_entity, tgt, type) {
		// Initialize projectile properties
		this.tgt = tgt;
		this.modif = modif;
		this.x = x;
		this.y = y;
		this.originX = x;
		this.originY = y;
		this.source = source_entity;
		this.faction = source_entity.owner;
		this.type = type;
		this.dir = 0; // Direction for sprite (0: vertical, 1: horizontal, 2: backslash, 3: forward slash)
		projectiles.push(this);

		// Calculate damage and path
		this.dmg = calculateDamage(modif);
		this.timer = 0;
		this.path = this.getPath();

		// Calculate accuracy penalty based on distance
		const effectiveRange = Math.max(1, this.path.length);
		const rangeRatio = Math.min(effectiveRange / modif.stats.range, 1);
		const distancePenalty = 1 - rangeRatio * 0.25; // 25% accuracy loss at max range
		this.acc = modif.stats.accuracy * distancePenalty;
		debugLog(
			`Projectile Acc: ${this.acc.toFixed(2)} (Base: ${
				modif.stats.accuracy
			}, RangeRatio: ${rangeRatio.toFixed(2)})`,
			"debug"
		);

		// Determine projectile sprite direction
		this.dir = getProjectileDirection(
			this.x,
			this.y,
			this.tgt[0],
			this.tgt[1]
		);
		this.launch();
	}

	/** Calculates the projectile's path using Dijkstra's algorithm. */
	getPath() {
		// Projectiles always path through any tile regardless of contents, only checking if it's a valid map coordinate.
		// Actual collision checks are done step-by-step during launch.
		const dijkstra = new ROT.Path.Dijkstra(
			this.tgt[0],
			this.tgt[1],
			(px, py) => {
				// Ensure coordinates are within map bounds
				return px >= 0 && px < VARS.MAP_X && py >= 0 && py < VARS.MAP_Y;
			}
		);
		const path = [];
		dijkstra.compute(this.x, this.y, (x, y) => path.push([x, y]));
		return path;
	}

	/** Handles the projectile hitting a target. */
	handleHit(target) {
		debugLog(
			`Projectile hit ${target.name} at ${this.x},${this.y}`,
			"info"
		);
		effects.push({
			x: this.x,
			y: this.y,
			icon: icons["hit"],
			color: "#FF0000",
			background: "transparent",
		});
		const finalDamage = Math.max(0, this.dmg - target.mob.stats.defence);
		target.mob.stats.health = Math.max(
			0,
			target.mob.stats.health - Math.round(finalDamage)
		);
		log({
			type: "damage",
			source: this.source,
			target: target,
			amount: Math.round(finalDamage),
			weapon: this.modif,
		});
		this.destroy();
	}

	/** Launches the projectile, moving it along its path and handling collisions. */
	async launch() {
		this.timer++;
		if (this.timer > 30) {
			// Timeout to prevent infinite projectiles in case of pathing issues
			debugLog("Projectile timed out!", "warn");
			this.destroy();
			return;
		}

		// Remove the shooter's own tile from the path if it's the first step
		if (
			this.path.length > 0 &&
			this.path[0][0] === this.originX &&
			this.path[0][1] === this.originY
		) {
			this.path.shift();
		}

		const curr = this.path.shift(); // Get the next tile in the path
		if (!curr) {
			// Path finished or empty
			this.destroy();
			return;
		}

		this.x = curr[0];
		this.y = curr[1];

		// Check for collision with impassable terrain (walls)
		if (!world_grid[this.y] || world_grid[this.y][this.x] === 0) {
			// 0 means impassable wall
			debugLog("Projectile hit a wall.", "info");
			this.destroy();
			return;
		}

		// Check for collision with entities
		const targetEntity = findMobCoords(this.x, this.y);
		if (
			targetEntity && // Is there an entity at this location?
			targetEntity.mob && // Is it a mob?
			targetEntity.owner !== this.faction // Is it an enemy or neutral?
		) {
			// Check if this is the *intended* target (last tile of the path)
			if (
				targetEntity.x === this.tgt[0] &&
				targetEntity.y === this.tgt[1]
			) {
				// This is the intended target, apply accuracy check
				if (ROT.RNG.getUniform() < this.acc) {
					this.handleHit(targetEntity);
				} else {
					log({
						type: "miss",
						source: this.source,
						target: targetEntity,
					});
					effects.push({
						x: targetEntity.x,
						y: targetEntity.y,
						icon: icons.miss,
						color: "#FFFF00",
						background: "transparent",
					});
					this.destroy();
				}
				return;
			} else {
				// This is an intervening entity (not the intended target), apply chance to hit obstacle
				if (ROT.RNG.getUniform() < 0.15) {
					// 15% chance to hit an intervening obstacle
					debugLog("Projectile hit an intervening obstacle!", "warn");
					this.handleHit(targetEntity);
					return;
				}
			}
		}

		// If projectile hasn't hit anything and there's more path, continue
		if (this.path.length > 0) {
			await sleep(33); // Small delay for visual effect
			this.launch(); // Continue movement
		} else {
			// Path exhausted without hitting the intended target or an obstacle (e.g., target moved)
			debugLog("Projectile path exhausted without direct hit.", "debug");
			this.destroy();
		}
	}

	/** Destroys the projectile, removing it from the game. */
	destroy() {
		this.path = []; // Clear path to prevent further steps
		const i = projectiles.indexOf(this);
		if (i > -1) projectiles.splice(i, 1); // Remove from active projectiles list
	}
}

// Determines the sprite direction for the projectile based on movement vector.
// Maps 8-directional movement to the 4 available projectile sprites (|, -, \, /).
function getProjectileDirection(x, y, tx, ty) {
	const dx = tx - x;
	const dy = ty - y;

	// Normalize direction to -1, 0, or 1
	const ndx = Math.sign(dx);
	const ndy = Math.sign(dy);

	// Map to sprite index:
	// 0: Vertical (dy != 0, dx == 0)
	// 1: Horizontal (dx != 0, dy == 0)
	// 2: Backslash-like (dx and dy have same sign: SE or NW)
	// 3: Forwardslash-like (dx and dy have opposite signs: NE or SW)

	if (ndx === 0) {
		// Vertical movement
		return 0; // '|'
	} else if (ndy === 0) {
		// Horizontal movement
		return 1; // '-'
	} else if (ndx * ndy === 1) {
		// Both positive (SE) or both negative (NW)
		return 2; // '\'
	} else {
		// One positive, one negative (NE or SW)
		return 3; // '/'
	}
}
