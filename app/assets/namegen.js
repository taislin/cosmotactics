/**
 * This file contains functions for generating random names.
 */
// List of possible first names
const FIRST_NAMES = [
	"Gabriel",
	"Owen",
	"Omar",
	"Kyan",
	"Kaleb",
	"Ross",
	"Mohammed",
	"Danny",
	"Karson",
	"Thaddeus",
	"Brock",
	"Quentin",
	"Easton",
	"Kareem",
	"Justus",
	"Rayan",
	"Samir",
	"Donovan",
	"Amare",
	"Jameson",
	"Preston",
	"Jensen",
	"Beckett",
	"Nolan",
	"Deangelo",
	"Marcel",
	"Noah",
	"Trace",
	"Trent",
	"Mark",
	"Messiah",
	"Niko",
	"Sergio",
	"Philip",
	"Savion",
	"Irvin",
	"Phoenix",
	"Jovanni",
	"Scott",
	"Jamari",
	"Malaki",
	"Steven",
	"Cayden",
	"Armando",
	"Alberto",
	"Korbin",
	"Enzo",
	"Moshe",
	"Arthur",
	"Calvin",
];
// List of possible last names
const LAST_NAMES = [
	"Oliver",
	"Patrick",
	"Peters",
	"Hodges",
	"Erickson",
	"Yoder",
	"Sherman",
	"Buck",
	"Koch",
	"Cline",
	"Cantu",
	"Rhodes",
	"Hensley",
	"Pruitt",
	"Key",
	"Stark",
	"Townsend",
	"Howard",
	"Mccarty",
	"Mills",
	"Dean",
	"Finley",
	"Shepherd",
	"Richardson",
	"Cooke",
	"Meyer",
	"Wagner",
	"Pierce",
	"Austin",
	"Poole",
	"Hogan",
	"Stafford",
	"Grant",
	"Graves",
	"Fleming",
	"Kline",
	"Huerta",
	"Durham",
	"Rivas",
	"Bray",
	"Contreras",
	"Bautista",
	"Berry",
	"Roberson",
	"Moreno",
	"Armstrong",
	"Lozano",
	"Clarke",
	"Wiley",
	"Flores",
];

/**
 * Generates a random name by combining a random first and last name.
 *
 * @returns {string} A randomly generated name.
 */
export function generateName() {
	return randomFromArray(FIRST_NAMES) + " " + randomFromArray(LAST_NAMES);
}

/**
 * Selects a random element from the provided array.
 *
 * @param {Array} array - The array to select from.
 * @returns {*} A random element from the array.
 */
export function randomFromArray(array) {
	if (!Array.isArray(array) || array.length === 0) return "";
	return array[Math.floor(Math.random() * array.length)];
}
