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
	{ label: "Quick Guide", y: 11 },
	{ label: "Settings", y: 13 },
];
const CONTROL_INSTRUCTIONS = [
	{ y: 2, text: "%c{}CONTROLS" },
	{
		y: 4,
		text: "%c{orange}WSADQEZC%c{}/%c{orange}NumPad%c{}: Movement",
		x: 0,
		w: 46,
	},
	{ y: 6, text: "%c{orange}M%c{}: Movement Mode", x: 0, w: 46 },
	{ y: 7, text: "%c{orange}F%c{}: Targeting (fire) Mode", x: 0, w: 46 },
	{ y: 8, text: "%c{orange}L%c{}: Inspection (look) Mode", x: 0, w: 46 },
	{ y: 10, text: "%c{orange}N%c{}: Next unit", x: 0, w: 46 },
	{ y: 11, text: "%c{orange}O%c{}: Toggle autofire (on/off)", x: 0, w: 46 },
	{
		y: 12,
		text: "%c{orange}P%c{}: Toggle stance (hold/follow)",
		x: 0,
		w: 46,
	},
	{ y: 13, text: "%c{orange}T%c{}: Wait (pass turn)", x: 0, w: 46 },
	{ y: 14, text: "%c{orange}U%c{}: Select / Use in GUI menus", x: 0, w: 46 },
	{
		y: 15,
		text: "%c{orange}SHIFT%c{}/%c{orange}CTRL%c{}: Navigate GUI menus",
		x: 0,
		w: 46,
	},
	{ y: 17, text: "%c{orange}0%c{}: Display objectives", x: 0, w: 46 },
	{ y: 18, text: "%c{orange}1%c{}: Display equipment", x: 0, w: 46 },
	{ y: 19, text: "%c{orange}2%c{}: Display tile details", x: 0, w: 46 },
	{ y: 20, text: "%c{orange}3%c{}: Display logs", x: 0, w: 46 },
	{
		y: 22,
		text: "%c{orange}Arrows%c{}: Move the target, mouse, navigate main menu",
		x: 0,
		w: 46,
	},
	{ y: 24, text: "%c{orange}Enter%c{}: Confirm order / Select", x: 0, w: 46 },

	{ y: 28, text: "%c{orange}ESC%c{}: Return to menu", x: 0, w: 46 },
	{
		y: 31,
		text: "%c{orange}Game is fully playable with mouse, keyboard, or both",
		x: 0,
		w: 46,
	},
	{ y: 38, text: "%c{}Version: %c{orange}" + VARS.VERSION, x: 0 },
];

export function drawMainMenu(menuDisplay, gameDisplay, msgDisplay) {
	menuDisplay.clear();
	msgDisplay.clear();
	gameDisplay.clear();
	menuDisplay.drawText(2, 3, "%c{#35b59b}COSMOTACTICS");
	console.log("[MAINMENU] drawMainMenu called.");
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
/**
 * Draws the in-game quick start guide.
 * @param {Display} menuDisplay - The display object for the menu (left panel).
 * @param {Display} msgDisplay - The display object for messages (right panel).
 */
export function drawQuickGuide(menuDisplay, msgDisplay) {
	menuDisplay.clear();
	msgDisplay.clear();
	console.log("[MAINMENU] drawQuickGuide called. Clearing displays.");
	// Title on the left panel
	menuDisplay.drawText(2, 3, "%c{#35b59b}QUICK GUIDE");
	menuDisplay.drawText(1, 18, "%c{orange}Press ESC or");
	menuDisplay.drawText(1, 19, "%c{orange}Enter to return");
	menuDisplay.drawText(1, 20, "%c{orange}to the Main Menu");

	// Guide content on the right panel
	let y = 2; // Starting y-position for text
	msgDisplay.drawText(2, y++, "%c{orange}1. Your Objective");
	msgDisplay.drawText(4, y++, "- Find the Stairs Down (>)");
	msgDisplay.drawText(4, y++, "- Keep Oxygen above zero!");
	msgDisplay.drawText(4, y++, "- Eliminate hostile aliens.");
	y += 2;

	msgDisplay.drawText(2, y++, "%c{orange}2. Basic Controls");
	msgDisplay.drawText(4, y++, "%c{white}W/A/S/D:%c{} Move selected unit");
	msgDisplay.drawText(4, y++, "%c{white}N:%c{}         Select next unit");
	msgDisplay.drawText(4, y++, "%c{white}Enter:%c{}     Confirm action");
	msgDisplay.drawText(4, y++, "%c{white}U:%c{}         Use/Interact");
	msgDisplay.drawText(4, y++, "%c{white}T:%c{}         Wait (skip turn)");
	y += 2;

	msgDisplay.drawText(2, y++, "%c{orange}3. Combat Essentials");
	msgDisplay.drawText(4, y++, "When you act, everyone acts!");
	msgDisplay.drawText(4, y++, "%c{white}F:%c{} Fire Mode (aim & shoot)");
	msgDisplay.drawText(4, y++, "%c{white}M:%c{} Move Mode (move & melee)");
	msgDisplay.drawText(4, y++, "%c{white}L:%c{} Look Mode (inspect tile)");
	y += 2;

	msgDisplay.drawText(2, y++, "%c{orange}4. Squad Commands");
	msgDisplay.drawText(4, y++, "%c{white}P:%c{} Toggle Stance (Follow/Hold)");
	msgDisplay.drawText(4, y++, "%c{white}O:%c{} Toggle Autofire (On/Off)");
	y += 2;

	msgDisplay.drawText(2, y++, "%c{orange}5. Important UI");
	msgDisplay.drawText(4, y++, "Left Panel: Game Map");
	msgDisplay.drawText(4, y++, "Right Panel: Stats & Info");
	msgDisplay.drawText(4, y++, "%c{red}Health:%c{} Your unit's life");
	msgDisplay.drawText(
		4,
		y++,
		"%c{#009f00}Oxygen:%c{} Your squad's air supply"
	);
}
