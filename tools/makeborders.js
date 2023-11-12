const print = console.log

const data = require("../data.js")

var w = 1688
var h = 1950
var m = "../map75.png"

print(`<?xml version="1.0" encoding="UTF-8"?>
<svg
	xmlns="http://www.w3.org/2000/svg"
	xmlns:xlink="http://www.w3.org/1999/xlink"
	xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
	xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
	width="${w}"
	height="${h}"
>
<image xlink:href="${m}" x="0" y="0" width="${w}" height="${h}" image-rendering="pixelated" sodipodi:insensitive="true" />`)

for (let id = 0; id < data.BORDERS.length; ++id) {
	if (data.BORDERS[id]) {
		let a = (id / 100) | 0
		let b = id % 100
		let x = (data.AREAS[a].x + data.AREAS[b].x) >> 1
		let y = (data.AREAS[a].y + data.AREAS[b].y) >> 1
		let label = data.AREAS[a].name + " / " + data.AREAS[b].name
		print(`<circle inkscape:label="${label}" cx="${x}" cy="${y}" r="16"/>`)

	}
}

print(`</svg>`)
