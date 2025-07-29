import {
	importedUnits,
	importedIcons,
	importedItems,
} from "../app/assets/datasets/imports.js";

let unitstable = document.getElementById("unitstable");
let _row = unitstable.insertRow();
let counter1 = 0;
const headerList = [
	{ text: "Name", tooltip: "" },
	{ text: "Icon", tooltip: "" },
	{ text: "Description", tooltip: "" },
	{ text: "Health", tooltip: "Unit's Health Points" },
	{ text: "Attack", tooltip: "Base Melee Attack Damage" },
	{ text: "Armour", tooltip: "Damage Reduction from Attacks" },
	{ text: "Speed", tooltip: "Movement Speed (Turns per Tile)" },
	{ text: "Morale", tooltip: "Resistance to Fear and Retreat" },
];
headerList.forEach((h) => {
	let _header = _row.insertCell(counter1);

	if (h.text != "Description" && h.text != "Icon") {
		_header.outerHTML = "<th title='"+h.tooltip+"' class='order'>" + h.text + "</th>";
	} else {
		_header.outerHTML = "<th>" + h.text + "</th>";
	}
	counter1++;
});
for (var i of Object.keys(importedUnits)) {
	let counter = 0;
	let row = unitstable.insertRow();
	let _name = row.insertCell(counter);
	counter++;
	_name.innerHTML = importedUnits[i].name;
	let _icon = row.insertCell(counter);
	let iconSrc = importedIcons[importedUnits[i].icon];
	var canvas = document.createElement("canvas");
	canvas.width = 32;
	canvas.height = 32;
	const ctx = canvas.getContext("2d");
	let img2 = document.createElement("img");
	// This path adjustment is critical for images loaded in the /docs/ context
	img2.src = iconSrc.tileset.replace("./", "../");
	img2.addEventListener("load", (e) => {
		ctx.drawImage(
			img2,
			iconSrc.tcoords[0][0] * 32,
			iconSrc.tcoords[0][1] * 32,
			32,
			32,
			0,
			0,
			32,
			32
		);
	});
	_icon.appendChild(canvas);
	counter++;
	let _desc = row.insertCell(counter);
	counter++;
	_desc.innerHTML = importedUnits[i].desc;
	for (var j of ["health", "attack", "defence", "speed", "morale"]) {
		let _stat = row.insertCell(counter);
		counter++;
		_stat.innerHTML = importedUnits[i].stats[j];
	}
}

let weaponstable = document.getElementById("weaponstable");
let _wrow = weaponstable.insertRow();
let wcounter1 = 0;
const wheaderList = [
	{ text: "Name", tooltip: "" },
	{ text: "Icon", tooltip: "" },
	{ text: "Description", tooltip: "" },
	{ text: "Type", tooltip: "Weapon Type (e.g., Projectile Pistol)" },
	{ text: "Att.", tooltip: "Attack Damage per Shot" },
	{ text: "Rng.", tooltip: "Range (maximum tiles)" },
	{ text: "Fr.Rt.", tooltip: "Fire Rate (turns per attack)" },
	{ text: "Rel.", tooltip: "Reload Time (turns)" },
	{ text: "Acc.", tooltip: "Accuracy (base hit chance)" },
	{ text: "Ammo", tooltip: "Maximum Ammo Capacity" },
];
wheaderList.forEach((h) => {
	let _wheader = _wrow.insertCell(wcounter1);
	if (h.text != "Description") {
		_wheader.outerHTML = "<th title='"+h.tooltip+"' class='order'>" + h.text + "</th>";
	} else {
		_wheader.outerHTML = "<th>" + h.text + "</th>";
	}
	wcounter1++;
});
// You'll need access to _importedItems_weapons which is not directly exposed by importedItems as a sub-object
// Re-importing just for this table, or refactoring how importedItems is structured, is an option.
// For now, I'll assume importedItems still has the necessary structure for weapons by their key.
// Corrected to use importedItems and iterate over the weapon specific keys.
// Assuming your `items_weapons.json` content is loaded into `importedItems` with direct keys
// For simplicity, I'll keep the direct import here for weapons data, as the merged `importedItems`
// in imports.js doesn't separate weapons out for easy iteration by themselves like `_importedItems_weapons`.
import _importedItems_weapons_local from "../app/assets/datasets/items_weapons.json" with { type: "json" };

for (var i of Object.keys(_importedItems_weapons_local)) { // Using the specific import for weapons
	let counter = 0;
	let row = weaponstable.insertRow();
	let _name = row.insertCell(counter);
	_name.innerHTML = _importedItems_weapons_local[i].name;
	counter++;
	let _icon = row.insertCell(counter);
	let iconSrc = importedIcons[_importedItems_weapons_local[i].icon]; // Using merged importedIcons for icon lookup
	var canvas = document.createElement("canvas");
	canvas.width = 32;
	canvas.height = 32;
	const ctx = canvas.getContext("2d");
	var img = document.createElement("img");
	// This path adjustment is critical for images loaded in the /docs/ context
	img.src = iconSrc.tileset.replace("./", "../");
	img.addEventListener("load", (e) => {
		ctx.drawImage(
			img,
			iconSrc.tcoords[0][0] * 32,
			iconSrc.tcoords[0][1] * 32,
			32,
			32,
			0,
			0,
			32,
			32
		);
	});
	_icon.appendChild(canvas);
	counter++;
	let _desc = row.insertCell(counter);
	_desc.innerHTML = _importedItems_weapons_local[i].desc;
	counter++;
	let _type = row.insertCell(counter);
	_type.innerHTML = _importedItems_weapons_local[i].itemtype.split(" ")[0]+" "+_importedItems_weapons_local[i].itemtype.split(" ")[1];
	counter++;
	for (var j of [
		"attack",
		"range",
		"delay",
		"reload",
		"accuracy",
		"max_ammo",
	]) {
		let _stat = row.insertCell(counter);
		_stat.innerHTML = _importedItems_weapons_local[i].stats[j];
		counter++;
	}
}

//table sorter
function table_sort() {
	const styleSheet = document.createElement("style");
	styleSheet.innerHTML = `
		  .order-inactive span {
			  visibility:hidden;
		  }
		  .order-inactive:hover span {
			  visibility:visible;
		  }
		  .order-active span {
			  visibility: visible;
		  }
	  `;
	document.head.appendChild(styleSheet);

	document.querySelectorAll("th.order").forEach((th_elem) => {
		let asc = true;
		const span_elem = document.createElement("span");
		span_elem.style = "font-size:0.8rem; margin-left:0.5rem";
		span_elem.innerHTML = "▼";
		th_elem.appendChild(span_elem);
		th_elem.classList.add("order-inactive");

		const index = Array.from(th_elem.parentNode.children).indexOf(th_elem);
		th_elem.addEventListener("click", (e) => {
			document.querySelectorAll("th.order").forEach((elem) => {
				elem.classList.remove("order-active");
				elem.classList.add("order-inactive");
			});
			th_elem.classList.remove("order-inactive");
			th_elem.classList.add("order-active");

			if (!asc) {
				th_elem.querySelector("span").innerHTML = "▲";
			} else {
				th_elem.querySelector("span").innerHTML = "▼";
			}
			const arr = Array.from(
				th_elem.closest("table").querySelectorAll("tbody tr")
			).slice(1);
			arr.sort((a, b) => {
				const a_val = a.children[index].innerText;
				const b_val = b.children[index].innerText;
				return asc ? a_val.localeCompare(b_val) : b_val.localeCompare(a_val);
			});
			arr.forEach((elem) => {
				th_elem.closest("table").querySelector("tbody").appendChild(elem);
			});
			asc = !asc;
		});
	});
}

table_sort();