"use strict"

const CARDS = {
	1: {
		name: "Herald",
		event: "herald",
		image: "card_herald",
		text: "Name an enemy noble (not Moray). Roll a die to convert him to your side at current strength.\n1-4  Success\n5-6  Failure\nIf a battle results, resolve it now with the defecting noble as the attacker."
	},
	2: {
		name: "Pillage",
		event: "pillage",
		image: "card_pillage",
		text: "Pillage one enemy group adjacent to a friendly group. The enemy blocks take two (2) hits (applied as per combat losses).\nPillaged step(s) may be added to friendly blocks in the pillaging group."
	},
	3: {
		name: "Sea Move",
		event: "sea_move",
		image: "card_sea_move",
		text: "Move one (1) or two (2) blocks from one coastal area to one other friendly (not vacant) coastal area (including England).\nThe Norse cannot use this card."
	},
	4: {
		name: "Truce",
		event: "truce",
		image: "card_truce",
		text: "Opponent can move, but not attack. Scots cannot enter England."
	},
	5: {
		name: "Victuals",
		event: "victuals",
		image: "card_victuals",
		text: "Distribute three (3) steps among friendly blocks in one group."
	},
	6: { name: "a 3", moves: 3, image: "card_3" },
	7: { name: "a 3", moves: 3, image: "card_3" },
	8: { name: "a 3", moves: 3, image: "card_3" },
	9: { name: "a 2", moves: 2, image: "card_2" },
	10: { name: "a 2", moves: 2, image: "card_2" },
	11: { name: "a 2", moves: 2, image: "card_2" },
	12: { name: "a 2", moves: 2, image: "card_2" },
	13: { name: "a 2", moves: 2, image: "card_2" },
	14: { name: "a 2", moves: 2, image: "card_2" },
	15: { name: "a 2", moves: 2, image: "card_2" },
	16: { name: "a 2", moves: 2, image: "card_2" },
	17: { name: "a 2", moves: 2, image: "card_2" },
	18: { name: "a 2", moves: 2, image: "card_2" },
	19: { name: "a 1", moves: 1, image: "card_1" },
	20: { name: "a 1", moves: 1, image: "card_1" },
	21: { name: "a 1", moves: 1, image: "card_1" },
	22: { name: "a 1", moves: 1, image: "card_1" },
	23: { name: "a 1", moves: 1, image: "card_1" },
	24: { name: "a 1", moves: 1, image: "card_1" },
	25: { name: "a 1", moves: 1, image: "card_1" },
}

let block_index = {}
let BLOCKS = []

let AREAS_XY = {
	"Nowhere": {},
	"E. Bag": { x: 150, y: 1900 },
	"S. Bag": { x: 150, y: 50 },
	"England": { x: 1360, y: 1750 },
	"Ross": { x: 583, y: 376 },
	"Garmoran": { x: 466, y: 573 },
	"Moray": { x: 644, y: 599 },
	"Strathspey": { x: 973, y: 436 },
	"Buchan": { x: 1218, y: 518 },
	"Lochaber": { x: 435, y: 766 },
	"Badenoch": { x: 834, y: 635 },
	"Mar": { x: 974, y: 709 },
	"Angus": { x: 1099, y: 820 },
	"Argyll": { x: 433, y: 1099 },
	"Atholl": { x: 714, y: 904 },
	"Lennox": { x: 626, y: 1244 },
	"Mentieth": { x: 748, y: 1067 },
	"Fife": { x: 966, y: 1089 },
	"Carrick": { x: 675, y: 1446 },
	"Lanark": { x: 830, y: 1375 },
	"Lothian": { x: 973, y: 1236 },
	"Selkirk": { x: 1015, y: 1379 },
	"Dunbar": { x: 1187, y: 1287 },
	"Galloway": { x: 685, y: 1667 },
	"Annan": { x: 946, y: 1566 },
	"Teviot": { x: 1151, y: 1424 },
}

let area_index = []
let AREAS = []

let BORDERS = []

const BORDERS_XY = {
	"England / Dunbar": {"x":1285,"y":1320},
	"England / Annan": {"x":1065,"y":1630},
	"England / Teviot": {"x":1210,"y":1495},
	"Ross / Garmoran": {"x":505,"y":450},
	"Ross / Moray": {"x":665,"y":455},
	"Garmoran / Moray": {"x":550,"y":590},
	"Garmoran / Lochaber": {"x":445,"y":670},
	"Moray / Strathspey": {"x":860,"y":460},
	"Moray / Lochaber": {"x":565,"y":665},
	"Moray / Badenoch": {"x":715,"y":610},
	"Strathspey / Buchan": {"x":1110,"y":430},
	"Strathspey / Badenoch": {"x":880,"y":530},
	"Buchan / Badenoch": {"x":990,"y":565},
	"Buchan / Mar": {"x":1095,"y":605},
	"Buchan / Angus": {"x":1240,"y":645},
	"Lochaber / Badenoch": {"x":675,"y":730},
	"Lochaber / Argyll": {"x":530,"y":860},
	"Lochaber / Atholl": {"x":635,"y":855},
	"Badenoch / Mar": {"x":904,"y":672},
	"Badenoch / Atholl": {"x":730,"y":790},
	"Mar / Angus": {"x":1035,"y":750},
	"Mar / Atholl": {"x":835,"y":785},
	"Angus / Atholl": {"x":880,"y":855},
	"Angus / Fife": {"x":965,"y":900},
	"Argyll / Atholl": {"x":585,"y":950},
	"Argyll / Lennox": {"x":545,"y":1065},
	"Atholl / Lennox": {"x":615,"y":1025},
	"Atholl / Mentieth": {"x":690,"y":980},
	"Atholl / Fife": {"x":845,"y":905},
	"Lennox / Mentieth": {"x":725,"y":1185},
	"Lennox / Carrick": {"x":625,"y":1310},
	"Lennox / Lanark": {"x":725,"y":1260},
	"Mentieth / Fife": {"x":880,"y":1060},
	"Mentieth / Lanark": {"x":810,"y":1235},
	"Mentieth / Lothian": {"x":900,"y":1215},
	"Carrick / Lanark": {"x":790,"y":1450},
	"Carrick / Galloway": {"x":680,"y":1556},
	"Carrick / Annan": {"x":850,"y":1540},
	"Lanark / Lothian": {"x":905,"y":1275},
	"Lanark / Selkirk": {"x":922,"y":1377},
	"Lanark / Annan": {"x":888,"y":1470},
	"Lothian / Selkirk": {"x":1010,"y":1300},
	"Lothian / Dunbar": {"x":1100,"y":1235},
	"Selkirk / Dunbar": {"x":1115,"y":1310},
	"Selkirk / Annan": {"x":980,"y":1472},
	"Selkirk / Teviot": {"x":1080,"y":1405},
	"Dunbar / Teviot": {"x":1195,"y":1335},
	"Galloway / Annan": {"x":860,"y":1625},
	"Annan / Teviot": {"x":1070,"y":1525},
}

;(function () {
	function border(A,B,T) {
		A = area_index[A]
		B = area_index[B]
		if (A > B)
			[A, B] = [B, A]
		let id = A * 100 + B
		AREAS[A].exits.push(B)
		AREAS[B].exits.push(A)
		BORDERS[id] = T
	}

	for (let a in AREAS_XY) {
		let id = area_index[a] = AREAS.length
		AREAS[id] = AREAS_XY[a]
		AREAS[id].name = a
		AREAS[id].cathedral = false
		AREAS[id].home = null
		AREAS[id].coastal = false
		AREAS[id].exits = []
	}

	AREAS_XY["Strathspey"].cathedral = true
	AREAS_XY["Lennox"].cathedral = true
	AREAS_XY["Fife"].cathedral = true

	AREAS_XY["Ross"].home = "Ross"
	AREAS_XY["Moray"].home = "Moray"
	AREAS_XY["Buchan"].home = "Buchan"
	AREAS_XY["Lochaber"].home = "Comyn"
	AREAS_XY["Badenoch"].home = "Comyn"
	AREAS_XY["Mar"].home = "Mar"
	AREAS_XY["Angus"].home = "Angus"
	AREAS_XY["Argyll"].home = "Argyll"
	AREAS_XY["Atholl"].home = "Atholl"
	AREAS_XY["Lennox"].home = "Lennox"
	AREAS_XY["Mentieth"].home = "Mentieth"
	AREAS_XY["Carrick"].home = "Bruce"
	AREAS_XY["Lanark"].home = "Steward"
	AREAS_XY["Dunbar"].home = "Dunbar"
	AREAS_XY["Galloway"].home = "Galloway"
	AREAS_XY["Annan"].home = "Bruce"

	AREAS_XY["England"].limit = 0
	AREAS_XY["Ross"].limit = 1
	AREAS_XY["Garmoran"].limit = 0
	AREAS_XY["Moray"].limit = 2
	AREAS_XY["Strathspey"].limit = 1
	AREAS_XY["Buchan"].limit = 2
	AREAS_XY["Lochaber"].limit = 1
	AREAS_XY["Badenoch"].limit = 2
	AREAS_XY["Mar"].limit = 1
	AREAS_XY["Angus"].limit = 2
	AREAS_XY["Argyll"].limit = 2
	AREAS_XY["Atholl"].limit = 1
	AREAS_XY["Lennox"].limit = 1
	AREAS_XY["Mentieth"].limit = 3
	AREAS_XY["Fife"].limit = 2
	AREAS_XY["Carrick"].limit = 1
	AREAS_XY["Lanark"].limit = 2
	AREAS_XY["Lothian"].limit = 2
	AREAS_XY["Selkirk"].limit = 0
	AREAS_XY["Dunbar"].limit = 2
	AREAS_XY["Galloway"].limit = 1
	AREAS_XY["Annan"].limit = 2
	AREAS_XY["Teviot"].limit = 1

	function red(A,B) { border(A,B,"minor"); }
	function black(A,B) { border(A,B,"major"); }
	function northsea(A) { AREAS_XY[A].coastal = true; }
	function irishsea(A) { AREAS_XY[A].coastal = true; }

	black("Buchan", "Angus")
	black("Buchan", "Mar")
	black("Carrick", "Annan")
	black("Carrick", "Lanark")
	black("England", "Annan")
	black("England", "Dunbar")
	black("Fife", "Angus")
	black("Fife", "Mentieth")
	black("Lanark", "Mentieth")
	black("Lennox", "Carrick")
	black("Lennox", "Lanark")
	black("Lennox", "Mentieth")
	black("Lothian", "Dunbar")
	black("Lothian", "Lanark")
	black("Lothian", "Mentieth")
	black("Moray", "Lochaber")
	black("Moray", "Strathspey")
	black("Selkirk", "Teviot")
	black("Strathspey", "Badenoch")
	black("Strathspey", "Buchan")
	black("Teviot", "Dunbar")
	red("Angus", "Mar")
	red("Argyll", "Lennox")
	red("Atholl", "Angus")
	red("Atholl", "Argyll")
	red("Atholl", "Badenoch")
	red("Atholl", "Fife")
	red("Atholl", "Lennox")
	red("Atholl", "Mar")
	red("Atholl", "Mentieth")
	red("Badenoch", "Lochaber")
	red("Badenoch", "Mar")
	red("Buchan", "Badenoch")
	red("England", "Teviot")
	red("Galloway", "Annan")
	red("Lanark", "Annan")
	red("Galloway", "Carrick")
	red("Garmoran", "Lochaber")
	red("Garmoran", "Moray")
	red("Lochaber", "Argyll")
	red("Lochaber", "Atholl")
	red("Moray", "Badenoch")
	red("Ross", "Garmoran")
	red("Ross", "Moray")
	red("Selkirk", "Annan")
	red("Selkirk", "Dunbar")
	red("Selkirk", "Lanark")
	red("Selkirk", "Lothian")
	red("Teviot", "Annan")

	northsea("England")
	northsea("Ross")
	northsea("Moray")
	northsea("Strathspey")
	northsea("Buchan")
	northsea("Angus")
	northsea("Mentieth")
	northsea("Fife")
	northsea("Lothian")
	northsea("Dunbar")

	irishsea("England")
	irishsea("Ross")
	irishsea("Garmoran")
	irishsea("Lochaber")
	irishsea("Argyll")
	irishsea("Lennox")
	irishsea("Carrick")
	irishsea("Galloway")
	irishsea("Annan")

	function block(owner, type, name, move, combat, steps, mortal, image) {
		let sid = name
		if (type === 'nobles')
			sid = name + "/" + owner[0]
		let id = block_index[sid] = BLOCKS.length
		BLOCKS[id] = {
			sid: sid,
			owner: owner,
			type: type,
			name: name,
			move: move,
			combat: combat,
			initiative: combat[0],
			fire_power: combat[1] | 0,
			steps: steps,
			mortal: mortal,
			image: image,
		}
	}

	block("Scotland",	"wallace",	"Wallace",		3,	"A3", 	4,	true,	11)
	block("Scotland",	"king",		"King",			3,	"A3", 	4,	true,	12)
	block("Scotland",	"infantry",	"Douglas",		2,	"C3", 	4,	false,	13)
	block("Scotland",	"infantry",	"Campbell",		2,	"C2", 	4,	false,	14)
	block("Scotland",	"infantry",	"Graham",		2,	"C2", 	4,	false,	15)
	block("Scotland",	"infantry",	"MacDonald",		2,	"C3", 	3,	false,	16)
	block("Scotland",	"infantry",	"Lindsay",		2,	"C2", 	3,	false,	17)

	block("Scotland",	"infantry",	"Fraser",		2,	"C3", 	3,	false,	21)
	block("Scotland",	"infantry",	"Barclay",		2,	"C2", 	4,	false,	22)
	block("Scotland",	"infantry",	"Grant",		2,	"C2", 	3,	false,	23)
	block("Scotland",	"cavalry",	"Keith",		3,	"B1", 	3,	false,	24)
	block("Scotland",	"archers",	"Etterick",		3,	"B2", 	2,	false,	25)
	block("Scotland",	"norse",	"Norse",		0,	"A2", 	3,	true,	26)
	block("Scotland",	"knights",	"French Knights",	2,	"B3", 	4,	true,	27)

	block("Scotland",	"nobles",	"Comyn",		2,	"B2", 	4,	false,	31)
	block("Scotland",	"moray",	"Moray",		2,	"B2", 	3,	true,	32)
	block("Scotland",	"nobles",	"Angus",		2,	"B2", 	3,	false,	33)
	block("Scotland",	"nobles",	"Argyll",		2,	"B2", 	3,	false,	34)
	block("Scotland",	"nobles",	"Bruce",		2,	"B2", 	4,	false,	35)
	block("Scotland",	"nobles",	"Mar",			2,	"B2", 	3,	false,	36)
	block("Scotland",	"nobles",	"Lennox",		2,	"B2", 	3,	false,	37)

	block("Scotland",	"nobles",	"Buchan",		2,	"B2", 	3,	false,	41)
	block("Scotland",	"nobles",	"Galloway",		2,	"B2", 	3,	false,	42)
	block("Scotland",	"nobles",	"Ross",			2,	"B2", 	3,	false,	43)
	block("Scotland",	"nobles",	"Atholl",		2,	"B2", 	3,	false,	44)
	block("Scotland",	"nobles",	"Dunbar",		2,	"B2", 	3,	false,	45)
	block("Scotland",	"nobles",	"Mentieth",		2,	"B2", 	3,	false,	46)
	block("Scotland",	"nobles",	"Steward",		2,	"B2", 	3,	false,	47)

	block("England",	"king",		"Edward",		3,	"B4", 	4,	true,	61)
	block("England",	"archers",	"Lancaster Archers",	2,	"B3", 	3,	false,	62)
	block("England",	"archers",	"Wales Archers",	2,	"B3", 	3,	false,	63)
	block("England",	"knights",	"Lancaster Knights",	2,	"B3", 	4,	false,	64)
	block("England",	"knights",	"York Knights",		2,	"B3", 	4,	false,	65)
	block("England",	"knights",	"Durham Knights",	2,	"B3", 	3,	false,	66)
	block("England",	"hobelars",	"Hobelars",		3,	"A2", 	3,	true,	67)

	block("England",	"infantry",	"York Infantry",	2,	"C2", 	4,	false,	71)
	block("England",	"infantry",	"Lancaster Infantry",	2,	"C2", 	4,	false,	72)
	block("England",	"infantry",	"Northumber Infantry",	2,	"C2", 	4,	false,	73)
	block("England",	"infantry",	"Durham Infantry",	2,	"C2", 	3,	false,	74)
	block("England",	"infantry",	"Cumbria Infantry",	2,	"C2", 	3,	false,	75)
	block("England",	"infantry",	"Westmor Infantry",	2,	"C2", 	3,	false,	82)
	block("England",	"infantry",	"Wales Infantry",	2,	"C3", 	3,	false,	76)
	block("England",	"infantry",	"Ulster Infantry",	2,	"C3", 	3,	false,	77)

	block("England",	"nobles",	"Comyn",		2,	"B2", 	4,	false,	81)
	block("England",	"nobles",	"Angus",		2,	"B2", 	3,	false,	83)
	block("England",	"nobles",	"Argyll",		2,	"B2", 	3,	false,	84)
	block("England",	"nobles",	"Bruce",		2,	"B2", 	4,	false,	85)
	block("England",	"nobles",	"Mar",			2,	"B2", 	3,	false,	86)
	block("England",	"nobles",	"Lennox",		2,	"B2", 	3,	false,	87)

	block("England",	"nobles",	"Buchan",		2,	"B2", 	3,	false,	91)
	block("England",	"nobles",	"Galloway",		2,	"B2", 	3,	false,	92)
	block("England",	"nobles",	"Ross",			2,	"B2", 	3,	false,	93)
	block("England",	"nobles",	"Atholl",		2,	"B2", 	3,	false,	94)
	block("England",	"nobles",	"Dunbar",		2,	"B2", 	3,	false,	95)
	block("England",	"nobles",	"Mentieth",		2,	"B2", 	3,	false,	96)
	block("England",	"nobles",	"Steward",		2,	"B2", 	3,	false,	97)
})()

if (typeof module !== 'undefined')
	module.exports = { CARDS, BLOCKS, AREAS, BORDERS, block_index, area_index }
