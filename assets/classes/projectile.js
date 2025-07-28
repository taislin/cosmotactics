import { icons, VARS, projectiles, debugLog, entities } from "../engine.js";
import { effects } from "../display.js";
import { findMobCoords } from "./entity.js";
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
	constructor(x, y, modif, faction, tgt, type) {
		// Initialize projectile properties
		this.tgt = tgt;
		this.modif = modif;
		this.x = x;
		this.y = y;
		this.originX = x;
		this.originY = y;
		this.faction = faction;
		this.type = type;
		this.dir = 0; // Direction for sprite
		projectiles.push(this);

		// Calculate damage and path
		this.dmg = calculateDamage(modif);
		this.timer = 0;
		this.path = this.getPath();

		// Calculate accuracy penalty based on distance
		const effectiveRange = Math.max(1, this.path.length);
		const rangeRatio = Math.min(effectiveRange / modif.stats.range, 1);
		const distancePenalty = 1 - rangeRatio * 0.25;
		this.acc = modif.stats.accuracy * distancePenalty;
		debugLog(
			`Projectile Acc: ${this.acc.toFixed(2)} (Base: ${
				modif.stats.accuracy
			}, RangeRatio: ${rangeRatio.toFixed(2)})`
		);

		// Determine projectile sprite direction
		this.dir = getDirection(this.x, this.y, this.tgt[0], this.tgt[1]);
		this.launch();
	}

	/** Calculates the projectile's path using Dijkstra's algorithm. */
	getPath() {
		const dijkstra = new ROT.Path.Dijkstra(
			this.tgt[0],
			this.tgt[1],
			() => true
		);
		const path = [];
		dijkstra.compute(this.x, this.y, (x, y) => path.push([x, y]));
		return path;
	}

	/** Handles the projectile hitting a target. */
	handleHit(target) {
		debugLog(`Projectile hit ${target.name} at ${this.x},${this.y}`);
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
		logHit(target, finalDamage, this.faction);
		this.destroy();
	}

	/** Launches the projectile, moving it along its path and handling collisions. */
	async launch() {
		this.timer++;
		if (this.timer > 30) {
			debugLog("Projectile timed out!", "warn");
			this.destroy();
			return;
		}
		// Skip shooter's own tile
		if (
			this.path.length > 0 &&
			this.path[0][0] === this.originX &&
			this.path[0][1] === this.originY
		) {
			this.path.shift();
		}
		const curr = this.path.shift();
		if (!curr) {
			this.destroy();
			return;
		}
		this.x = curr[0];
		this.y = curr[1];
		// Check for collision with walls
		if (!world_grid[this.y] || world_grid[this.y][this.x] === 0) {
			debugLog("Projectile hit a wall.");
			this.destroy();
			return;
		}
		const targetEntity = findMobCoords(this.x, this.y);
		if (
			targetEntity &&
			targetEntity.mob &&
			targetEntity.owner !== this.faction
		) {
			if (
				targetEntity.x === this.tgt[0] &&
				targetEntity.y === this.tgt[1]
			) {
				// Intended target
				if (Math.random() < this.acc) {
					this.handleHit(targetEntity);
				} else {
					logMiss(targetEntity, this.faction);
					this.destroy();
				}
				return;
			} else {
				// Intervening obstacle
				if (Math.random() < 0.15) {
					debugLog("Projectile hit an intervening obstacle!", "warn");
					this.handleHit(targetEntity);
					return;
				}
			}
		}
		if (this.path.length > 0) {
			await sleep(33);
			this.launch();
		} else {
			this.destroy();
		}
	}

	/** Destroys the projectile, removing it from the game. */
	destroy() {
		this.path = [];
		const i = projectiles.indexOf(this);
		if (i > -1) projectiles.splice(i, 1);
	}
}

function getDirection(x, y, tx, ty) {
	// Returns a direction integer for projectile sprite
	if (tx < x) {
		if (ty < y) return 2;
		else if (ty > y) return 3;
		else return 1;
	} else if (tx > x) {
		if (ty < y) return 3;
		else if (ty > y) return 2;
		else return 1;
	} else {
		return 0;
	}
}

function logHit(t, dmg, owner) {
	let precol = owner === "player" ? "%c{#009f00}" : "%c{#ffa500}";
	let targetprecol = t.owner === "player" ? "%c{#009f00}" : "%c{#ffa500}";

	VARS.GAMELOG.unshift(
		`${VARS.TURN}: ${targetprecol}${
			t.name
		}%c{} was shot for %c{red}${Math.round(dmg)} HP%c{}.`
	);
}

function logMiss(t, owner) {
	let precol = owner === "player" ? "%c{#009f00}" : "%c{#ffa500}";
	let targetprecol = t.owner === "player" ? "%c{#009f00}" : "%c{#ffa500}";

	VARS.GAMELOG.unshift(
		`${VARS.TURN}: Shot misses ${targetprecol}${t.name}%c{}!`
	);
	effects.push({
		x: t.x,
		y: t.y,
		icon: icons.miss,
		color: "#FFFF00",
		background: "transparent",
	});
}
