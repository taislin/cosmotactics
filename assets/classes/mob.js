import { VARS } from "../engine.js";

/**
 * @typedef {import('./items.js').WItem} WItem
 */

/**
 * @typedef {object} MobStats
 * @property {number} health
 * @property {number} attack
 * @property {number} defence
 * @property {number} range
 * @property {number} speed
 * @property {number} delay
 * @property {number} morale
 */

/**
 * @typedef {object} MobSlots
 * @property {WItem | null} head
 * @property {WItem | null} suit
 * @property {WItem | null} ranged
 * @property {WItem | null} melee
 * @property {WItem | null} extra
 */

/**
 * Represents a mobile entity (Mob) in the game.
 * Mobs have AI, stats, visual representation (drawstacks), equipment slots, traits, and background information.
 */
export class WMob {
	/** @type {MobStats} */
	static DEFAULT_STATS = {
		health: 100,
		attack: 12,
		defence: 0,
		range: 1,
		speed: 1,
		delay: 1,
		morale: 100,
	};

	/** @type {MobSlots} */
	static DEFAULT_SLOTS = {
		head: null,
		suit: null,
		ranged: null,
		melee: null,
		extra: null,
	};

	static DEFAULT_PROPERTIES = {
		death_message: null,
		desc: null,
		background: "unknown",
	};

	/**
	 * Creates a new Mob instance.
	 * @param {string} [ai="basic"] - The AI type for the mob.
	 * @param {Partial<MobStats>} [stats={}] - The mob's statistics.
	 * @param {Array} [drawstacks=[]] - The drawstacks for the mob's visual representation.
	 * @param {Partial<MobSlots>} [slots={}] - The equipment slots for the mob.
	 * @param {Array} [traits=[]] - The traits of the mob.
	 * @param {string} [background="unknown"] - The background of the mob.
	 */
	constructor(
		ai = "basic",
		stats = {},
		drawstacks = [],
		slots = {},
		traits = [],
		background = "unknown",
		death_message = null,
		desc = null
	) {
		this.ai = ai;
		this.stats = { ...WMob.DEFAULT_STATS, ...stats };
		this.lastFire = VARS.TURN;
		this.drawstacks = drawstacks;
		this.slots = { ...WMob.DEFAULT_SLOTS, ...slots };
		this.traits = traits;
		this.background = background;
		this.death_message = death_message;
		this.desc = desc || "A mobile entity with unknown characteristics.";
		this.stance = "follow";
		this.autofire = true;
	}
}
