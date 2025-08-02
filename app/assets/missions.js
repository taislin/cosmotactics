// Import your new data files and a name generator
import objectives from "./datasets/mission_objectives.json" with { type: "json" };
import { generatePlanet } from "./planet_generator.js";
import { generatePlanetName } from "./namegen.js"; // You might need a new namegen for planets
import enemies from "./datasets/enemies.json" with { type: "json" }; // To resolve tags
import { getRandomElement } from "./utils/gameUtils.js";

export function generateMissionChoices(count = 3) {
	let choices = [];

	for (let i = 0; i < count; i++) {
		let planet;
		// Keep generating planets until we get one that can host a mission
		do {
			planet = generatePlanet();
		} while (!planet.isHabitable);

		// --- Now, use the planet data to build the mission ---

		const objective = objectives[getRandomElement(Object.keys(objectives))];

		// Resolve enemy tags to a list of potential enemies
		let possibleEnemies = Object.values(enemies).filter((enemy) =>
			planet.enemyTags.some((tag) => (enemy.tags || []).includes(tag))
		);

		// Determine difficulty based on planet properties
		let difficulty = 1.0;
		if (planet.gameplayAtmosphere === "EVA_REQUIRED_HAZARDOUS")
			difficulty += 0.5;
		if (planet.life === "Sapient Natives") difficulty += 0.5;
		if (planet.temperature !== "Temperate") difficulty += 0.2;

		const knownAliens =
			difficulty < 1.8
				? possibleEnemies.map((e) => e.name).slice(0, 3) // Show up to 3 known enemy names
				: ["Unknown Hostiles"];
		if (possibleEnemies.length === 0) knownAliens.push("None");

		const reward = Math.floor(objective.reward_gold_base * difficulty);

		choices.push({
			planetName: planet.name,
			icon: planet.spriteIcon, // Use the pre-generated sprite name
			geography: planet.biome,
			knownAliens: knownAliens,
			atmosphere: `${planet.atmosphere} (${planet.gameplayAtmosphere})`,
			objective: objective.name,
			reward: `${reward} Gold`,
			// This is the data your level generator will actually use
			generationData: {
				planet: planet,
				objective: objective,
			},
		});
	}
	return choices;
}
