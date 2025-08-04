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

// Linear interpolation function
function lerp(a, b, t) {
	return a * (1 - t) + b * t;
}

/**
 * Represents a projectile in the game.
 */
export class Projectile {
	constructor(x, y, modif, source_entity, tgt, type) {
		// --- Latch the animation lock ---
		VARS.isAnimating = true;

		// Initialize projectile properties
		this.tgt = tgt;
		this.modif = modif;
		// Logical integer coordinates for collision
		this.x = x;
		this.y = y;
		// Floating-point coordinates for smooth rendering
		this.px = x;
		this.py = y;

		this.source = source_entity;
		this.faction = source_entity.owner;
		this.type = type;
		this.dir = 0; // Direction for sprite

		// Animation properties
		this.speed = 0.015; // Tiles per millisecond
		this.path = this.getPath();
		this.currentTargetTile = null;
		this.progress = 0; // Progress towards currentTargetTile (0.0 to 1.0)
		this.segmentDuration = 0; // Time in ms to travel one segment

		// Calculate damage and accuracy
		this.dmg = calculateDamage(modif);
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

		// Start the first segment of movement
		this.startNextSegment();

		projectiles.push(this);
	}

	/** Calculates the projectile's path using Dijkstra's algorithm. */
	getPath() {
		const dijkstra = new ROT.Path.Dijkstra(
			this.tgt[0],
			this.tgt[1],
			(px, py) => {
				return px >= 0 && px < VARS.MAP_X && py >= 0 && py < VARS.MAP_Y;
			}
		);
		const path = [];
		dijkstra.compute(this.x, this.y, (x, y) => path.push([x, y]));
		// Remove the starting tile from the path
		if (path.length > 0) path.shift();
		return path;
	}

	/** Sets up the next segment of the path for animation. */
	startNextSegment() {
		if (this.path.length === 0) {
			this.destroy();
			return;
		}
		this.currentTargetTile = this.path.shift();
		this.progress = 0;

		const dist = Math.hypot(
			this.currentTargetTile[0] - this.px,
			this.currentTargetTile[1] - this.py
		);
		this.segmentDuration = dist / this.speed;
	}

	/** Main update method called by the game loop. */
	update(deltaTime) {
		if (!this.currentTargetTile) return;

		// Update progress
		this.progress += deltaTime;

		// Calculate interpolation factor, capped at 1.0
		const t = Math.min(this.progress / this.segmentDuration, 1.0);

		// Lerp the render position
		this.px = lerp(this.x, this.currentTargetTile[0], t);
		this.py = lerp(this.y, this.currentTargetTile[1], t);

		// If segment is complete
		if (t >= 1.0) {
			this.x = this.currentTargetTile[0];
			this.y = this.currentTargetTile[1];
			this.px = this.x;
			this.py = this.y;

			// Check for collision at the new tile
			if (this.checkCollision()) {
				return; // Collision handled, projectile destroyed
			}

			// If no collision and path remains, start the next segment
			if (this.path.length > 0) {
				this.startNextSegment();
			} else {
				// Path exhausted
				this.destroy();
			}
		}
	}

	/** Checks for and handles collisions at the current logical position. */
	checkCollision() {
		// Check for wall collision
		if (!world_grid[this.y] || world_grid[this.y][this.x] === 0) {
			debugLog("Projectile hit a wall.", "info");
			this.destroy();
			return true;
		}

		// Check for entity collision
		const targetEntity = findMobCoords(this.x, this.y);
		if (targetEntity && targetEntity.owner !== this.faction) {
			// Hit an enemy
			// If it's the intended final target, apply accuracy check
			if (this.x === this.tgt[0] && this.y === this.tgt[1]) {
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
			} else {
				// Hit an intervening obstacle, small chance to hit
				if (ROT.RNG.getUniform() < 0.15) {
					debugLog("Projectile hit an intervening obstacle!", "warn");
					this.handleHit(targetEntity);
				} else {
					return false; // Flew through
				}
			}
			return true; // Collision handled
		}
		return false; // No collision
	}

	/** Handles the projectile hitting a target. */
	handleHit(target) {
		debugLog(
			`Projectile hit ${target.name} at ${this.x},${this.y}`,
			"info"
		);

		// --- NEW AOE (Shotgun) Logic ---
		if (this.modif.stats.aoe && this.modif.stats.aoe > 0) {
			effects.push({
				x: this.x,
				y: this.y,
				icon: icons["hit"],
				color: "#FF8C00",
				background: "transparent",
			}); // Orange hit for AOE
			const radius = this.modif.stats.aoe;

			// Find all entities within the blast radius
			for (const entity of entities) {
				if (entity.mob && entity.mob.ai !== "dead") {
					const distance = Math.hypot(
						this.x - entity.x,
						this.y - entity.y
					);
					if (distance <= radius) {
						// All entities in the blast take damage
						const aoeDamage = Math.max(
							0,
							this.dmg - entity.mob.stats.defence
						);
						if (aoeDamage > 0) {
							entity.mob.stats.health = Math.max(
								0,
								entity.mob.stats.health - Math.round(aoeDamage)
							);
							log({
								type: "damage",
								source: this.source,
								target: entity,
								amount: Math.round(aoeDamage),
								weapon: this.modif,
							});
						}
					}
				}
			}
		} else {
			// --- Standard Single-Target Hit Logic ---
			effects.push({
				x: this.x,
				y: this.y,
				icon: icons["hit"],
				color: "#FF0000",
				background: "transparent",
			});
			const finalDamage = Math.max(
				0,
				this.dmg - target.mob.stats.defence
			);

			if (finalDamage > 0) {
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
			} else {
				log({ type: "block", source: this.source, target: target });
			}

			// --- NEW Status Effect (Stun) Logic ---
			if (this.modif.effect === "stun_chance_10") {
				if (ROT.RNG.getUniform() <= 0.1) {
					// 10% chance
					target.addStatusEffect("stunned", 2); // Stun for 2 turns
				}
			}
		}

		this.destroy();
	}

	/** Destroys the projectile, removing it from the game and releasing the animation lock if it's the last one. */
	destroy() {
		const i = projectiles.indexOf(this);
		if (i > -1) projectiles.splice(i, 1);

		// If this was the last projectile, release the animation lock
		if (projectiles.length === 0) {
			VARS.isAnimating = false;
			VARS.playerCanAct = true;
			debugLog(
				"All projectiles finished, animation lock released.",
				"info"
			);
		}
	}
}

// Determines the sprite direction for the projectile based on movement vector.
function getProjectileDirection(x, y, tx, ty) {
	const dx = tx - x;
	const dy = ty - y;
	const ndx = Math.sign(dx);
	const ndy = Math.sign(dy);
	if (ndx === 0) return 0; // Vertical
	if (ndy === 0) return 1; // Horizontal
	if (ndx * ndy === 1) return 2; // Backslash-like (SE or NW)
	return 3; // Forwardslash-like (NE or SW)
}
