import { VARS, STATS } from "./engine.js";

/**
 * Draws the main menu screen.
 *
 * @param {Display} menuDisplay - The display object for the menu.
 * @param {Display} gameDisplay - The display object for the game screen.
 * @param {Display} msgDisplay - The display object for messages.
 */
const MENU_ITEMS = [
	{ label: "New Game", y: 9 },
	{ label: "Settings", y: 11 },
];
const CONTROL_INSTRUCTIONS = [
	{ y: 2, text: "%c{}CONTROLS" },
	{
		y: 4,
		text: "%c{orange}WSADQEZC%c{}/%c{orange}NumPad%c{}: Movement",
		x: 0,
		w: 29,
	},
	{ y: 6, text: "%c{orange}M%c{}: Movement Mode", x: 0, w: 29 },
	{ y: 7, text: "%c{orange}F%c{}: Targeting (fire) Mode", x: 0, w: 29 },
	{ y: 8, text: "%c{orange}L%c{}: Inspection (look) Mode", x: 0, w: 29 },
	{ y: 10, text: "%c{orange}N%c{}: Next unit", x: 0, w: 29 },
	{ y: 11, text: "%c{orange}O%c{}: Toggle autofire", x: 0, w: 29 },
	{ y: 12, text: "%c{orange}P%c{}: Toggle stance", x: 0, w: 29 },
	{ y: 14, text: "%c{orange}U%c{}: Select in GUI menus / Use", x: 0, w: 29 },
	{ y: 15, text: "%c{orange}T%c{}: Wait (pass turn)", x: 0, w: 29 },
	{ y: 17, text: "%c{orange}0%c{}: Display objectives", x: 0, w: 29 },
	{ y: 18, text: "%c{orange}1%c{}: Display equipment", x: 0, w: 29 },
	{ y: 19, text: "%c{orange}2%c{}: Display tile details", x: 0, w: 29 },
	{ y: 20, text: "%c{orange}3%c{}: Display logs", x: 0, w: 29 },
	{
		y: 22,
		text: "%c{orange}Arrows%c{}: Move the target, mouse, navigate main menu",
		x: 0,
		w: 29,
	},
	{ y: 24, text: "%c{orange}Enter%c{}: Confirm order / Select", x: 0, w: 29 },
	{
		y: 25,
		text: "%c{orange}SHIFT%c{}/%c{orange}CTRL%c{}: Navigate GUI menus",
		x: 0,
		w: 30,
	},
	{ y: 28, text: "%c{orange}ESC%c{}: Return to menu", x: 0, w: 29 },
	{
		y: 31,
		text: "%c{orange}Game is fully playable with mouse, keyboard, or both",
		x: 0,
		w: 29,
	},
	{ y: 38, text: "%c{}Version: %c{orange}" + VARS.VERSION, x: 0 },
];

export function drawMainMenu(menuDisplay, gameDisplay, msgDisplay) {
	menuDisplay.clear();
	msgDisplay.clear();
	gameDisplay.clear();
	menuDisplay.drawText(2, 3, "%c{#35b59b}COSMOTACTICS");
	// Draw menu items
	MENU_ITEMS.forEach((item, idx) => {
		const isSelected = VARS.MENU_ITEM === idx + 1;
		menuDisplay.drawText(
			isSelected ? 3 : 4,
			item.y,
			`${isSelected ? ">" : ""}%c{orange}${item.label}`
		);
	});
	// Draw control instructions
	CONTROL_INSTRUCTIONS.forEach((instr) => {
		if (typeof instr.w !== "undefined") {
			msgDisplay.drawText(instr.x || 0, instr.y, instr.text, instr.w);
		} else {
			msgDisplay.drawText(instr.x || 0, instr.y, instr.text);
		}
	});
}

/**
 * Draws the game over screen.
 *
 * @param {Display} menuDisplay - The display object for the menu.
 * @param {Display} gameDisplay - The display object for the game screen.
 * @param {Display} msgDisplay - The display object for messages.
 */
export function drawLostMenu(menuDisplay, gameDisplay, msgDisplay) {
	menuDisplay.clear();
	msgDisplay.clear();
	gameDisplay.clear();
	menuDisplay.drawText(2, 3, "%c{#35b59b}COSMOTACTICS");
	menuDisplay.drawText(1, 6, "%c{orange}You have lost!");
	menuDisplay.drawText(1, 13, "%c{yellow}Press any key");
	menuDisplay.drawText(2, 14, "%c{yellow}to continue");
	msgDisplay.drawText(2, 3, "%c{#fff}SCORE");
	msgDisplay.drawText(2, 5, "%c{#fff}Level: " + "%c{orange}" + VARS.LEVEL);
	msgDisplay.drawText(2, 6, "%c{#fff}Gold: " + "%c{orange}" + STATS.GOLD);
	msgDisplay.drawText(2, 7, "%c{#fff}Turns: " + "%c{orange}" + VARS.TURN);
}
