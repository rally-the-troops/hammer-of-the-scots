const fs = require("fs")

const { round, floor, ceil } = Math

let output = {}
let mode, name, x, y, w, h, cx, cy, rx, ry

function flush() {
	if (mode === 'circle') {
		output[name] = { x: cx, y: cy }
	}
	x = y = w = h = cx = cy = rx = ry = 0
	name = null
}

for (let line of fs.readFileSync("tools/borders.svg", "utf-8").split("\n")) {
	line = line.trim()
	if (line.startsWith("<rect")) {
		flush()
		mode = "rect"
		x = y = w = h = 0
	} else if (line.startsWith("<ellipse") || line.startsWith("<circle")) {
		flush()
		mode = "circle"
		cx = cy = rx = ry = 0
	} else if (line.startsWith('x="'))
		x = round(Number(line.split('"')[1]))
	else if (line.startsWith('y="'))
		y = round(Number(line.split('"')[1]))
	else if (line.startsWith('width="'))
		w = round(Number(line.split('"')[1]))
	else if (line.startsWith('height="'))
		h = round(Number(line.split('"')[1]))
	else if (line.startsWith('cx="'))
		cx = round(Number(line.split('"')[1]))
	else if (line.startsWith('cy="'))
		cy = round(Number(line.split('"')[1]))
	else if (line.startsWith('r="'))
		rx = ry = round(Number(line.split('"')[1]))
	else if (line.startsWith('rx="'))
		rx = round(Number(line.split('"')[1]))
	else if (line.startsWith('ry="'))
		ry = round(Number(line.split('"')[1]))
	else if (line.startsWith('inkscape:label="'))
		name = line.split('"')[1]
}

flush()

console.log("const BORDERS_XY = {")
for (let key in output)
	console.log("\t\"" + key + "\": " + JSON.stringify(output[key]) + ",")
console.log("}")
