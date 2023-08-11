window.onload = setup;
window.onkeydown = handleKeyPress;
window.onkeyup = handleKeyRelease;

var canvas;
var ctx;

var tileWidth = 0.7;
var sliceTiles = 5;
var sliceOptions = [5, 13];

var color_bg = "#9ec3ff";
var color_bridge = "#888888";
var color_bridgeDark = "#222244";
var color_text = "#222222";
var color_water = "#4d4f96";

var bridge = [];
var bridgeDistMax = 0;
var bridgeDistChal = 700;
var bridgeDistGrace = 100;
var bridgeFreqMin = 0.05;
var bridgeFreqMax = 0.95;



var boat_verts = [
	[-0.5, 0, 0.5], 
	[0.5, 0, 0.5],
	[0.5, 0, -0.5],
	[-0.5, 0, -0.5],

	[-0.5, 1, 0.5], 
	[0.5, 1, 0.5],
	[0.5, 1, -0.5],
	[-0.5, 1, -0.5],

	[0, 1, 0.75],
	[0, 1, -0.75],
];
var boat_faces = [
	[0, 1, 2, 3],
	[0, 4, 7, 3],
];
var boat_scaling = 0.7;

var player;
var playerTrueZ = 0.8;

/*
2 - hot feet
3 - clear bridge
4 - low gravity
5 - boat
 */
var powerup_colors = {
	2: "#FF0000",
	3: "#00FF00",
	4: "#FFFFFF",
	5: "#7E4A0E",

	10: "#25212b"
}
var powerup_frequencies = {
	2: 0.002,
	3: 0.0016,
	4: 0.003,
	5: 0.004,
}

var camera = {
	x: 0,
	y: 2.5,
	z: -3,
	scale: 0.65,
}

var create;


var drawDistBridge = 20;
var drawDistCloud = 40;

var goFast = false;

var gravTimeMax = 10;
var gravTime = 0;

var clouds = [];
var cloudXSpread = 20;
var cloudARange = [0.3, 0.6];
var cloudDistRange = [0.4, 2];
var cloudDistStep = 0.32;
var cloudHeight = 5;

var killPlane = -0.5;

var lastTime = 0;

//generates cloud points based on a cloud center
function generateCloud(cloudX, cloudZ) {
	var aList = [0];
	var dList = [randomBounded(...cloudDistRange)];
	
	var aDist;
	var dTentative;
	var i = 100;
	while (aList[aList.length-1] < Math.PI * 2) {
		//first move some amount angularly
		aList.push(aList[aList.length-1] + randomBounded(...cloudARange));
		aDist = aList[aList.length-1] - aList[aList.length-2];

		//then move some amount distancely - the rate at which distance changes is bounded by the angle change
		dTentative = dList[dList.length-1] + boolToSigned(Math.random() < 0.5) * aDist * cloudDistStep;
		while ((dTentative > cloudDistRange[2] || dTentative < cloudDistRange[1]) && i > 0) {
			dTentative = dList[dList.length-1] + boolToSigned(Math.random() < 0.5) * aDist * cloudDistStep;
			i -= 1;
		}
		dList.push(dList[dList.length-1] + boolToSigned(Math.random() < 0.5) * aDist * cloudDistStep);
		if (i < 0) {
			console.log(`no. bad.`);
		}
	}

	//adjust the last point so there's less discontinuity
	aList.pop();
	dList.pop();
	dList[dList.length-1] = linterp(dList[0], dList[dList.length-2], 0.5);

	var cloud = [];
	for (var h=0; h<aList.length; h++) {
		cloud[h] = polToXY(cloudX, cloudZ, aList[h], dList[h]);
	}

	clouds.push({
		x: cloudX,
		z: cloudZ,
		pts: cloud
	});

}

//
function cloudToSpace(x, z) {
	return [x, cloudHeight * (1 - (z ** 2) / ((0.9 * drawDistCloud) ** 2)), z];
}

function tickClouds() {
	//remove clouds too close to the camera
	while (clouds.length > 0 && clouds[0].z < player.z + cloudDistRange[1]) {
		clouds.splice(0, 1);
	}
	
	//add clouds far away from the camera
	while (clouds.length < 1 || clouds[clouds.length-1].z - drawDistCloud < player.z) {
		generateCloud(randomBounded(-cloudXSpread, cloudXSpread), (clouds[clouds.length-1] ?? {z: 2}).z + 1);
	}
}

function drawClouds() {
	ctx.fillStyle = color_clouds;
	var c2d;
	clouds.forEach(c => {
		c2d = c.pts.map(a => cloudToSpace(a[0], a[1])).map(b => spaceToScreen(b[0], b[1], b[2]));
		ctx.beginPath();
		ctx.moveTo(c2d[0][0], c2d[0][1]);
		for (var d=1; d<c2d.length; d++) {
			ctx.lineTo(c2d[d][0], c2d[d][1]);
		}
		ctx.fill();
	});
}

function generateBridgeSlice() {
	var sliceIndex = bridge.length;
	var sliceFreq = calcTileFreq(sliceIndex * tileWidth);

	var slice = [];
	for (var t=sliceTiles-1; t>-1; t--) {
		switch (true) {
			case (Math.random() < powerup_frequencies[2]):
				slice[t] = 2;
				break;
			case (Math.random() < powerup_frequencies[3]):
				slice[t] = 3;
				break;
			case (Math.random() < powerup_frequencies[4]):
				slice[t] = 4;
				break;
			case (Math.random() < powerup_frequencies[5]):
				slice[t] = 5;
				break;
			case (Math.random() < sliceFreq):
				slice[t] = 1;
				break;
			default:
				slice[t] = 0;
				break;
		}
		
	}
	bridge.push(slice);
}

function calcTileFreq(distance) {
	// return sigmoid((distance ** 1.5 / bridgeDistChal) - 6, 1, bridgeFreqMin);
	return Math.E ** -(4 * distance / bridgeDistChal) * (1 - bridgeFreqMin) + bridgeFreqMin;
}

function calcZSpeed(distance) {
	return clamp((distance / bridgeDistChal) * player.speedMax, player.speedMin, player.speedMax);
}

function spaceToScreen(x, y, z) {
	x -= camera.x;
	y -= camera.y;
	z -= camera.z;

	x /= z;
	y /= z;

	x *= camera.scale * canvas.width;
	y *= -camera.scale * canvas.height;

	x += canvas.width / 2;
	y += canvas.height / 2;

	return [x, y];
}

function calcHeight(distance) {
	// return 0;

	return -2 * (distance * (distance - 2 * drawDistBridge)) / (drawDistBridge ** 2);
}

function bridgeToScreen(bridgeX, bridgeZ) {
	return spaceToScreen(tileWidth * (bridge[0].length * -0.5 + bridgeX), calcHeight(bridgeZ - player.z), bridgeZ - player.z);
}

function setup() {
	canvas = document.getElementById("corvid");
	ctx = canvas.getContext("2d");

	ctx.lineJoin = "round";

	player = new Player();

	for (var l=0; l<5; l++) {
		generateBridgeSlice();
	}

	animation = window.requestAnimationFrame(main);
}

function main() {
	tick();
	draw();

	animation = window.requestAnimationFrame(main);
}

function tick(deltaT, recursiveTimer) {
	var newTime = performance.now();
	if (deltaT == undefined) {
		recursiveTimer = 3;
		deltaT = clamp(newTime - lastTime, 1, 30) / 1000;
		lastTime = newTime;
	}
	tickClouds();
	player.tick(deltaT);

	//generate more bridge
	if (player.z + 20 > bridge.length) {
		generateBridgeSlice();
	}

	if (goFast && recursiveTimer > 0) {
		tick(deltaT, recursiveTimer - 1);
	}
}

function spaceToBridge(x, z) {
	return [Math.floor((x / tileWidth) + (sliceTiles * 0.5)), Math.floor(z + playerTrueZ)]
}

function tileAt(x, z) {
	var bc = spaceToBridge(x, z);
	return bridge[bc[1]][bc[0]];
}

function draw() {
	//background
	ctx.fillStyle = color_bg;
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	drawClouds();
	ctx.fillStyle = color_water;
	ctx.fillRect(0, bridgeToScreen(0, player.z + drawDistBridge)[1], canvas.width, canvas.height / 2);

	var centerOff = tileWidth / 2;

	//bridge
	ctx.strokeStyle = color_bridge;
	ctx.lineWidth = canvas.height / 200;
	ctx.fillStyle = color_bridge;
	var ps = [];
	for (var f=Math.floor(player.z); f<bridge.length; f++) {
		for (var t=0; t<bridge[f].length; t++) {
			if (bridge[f][t]) {
				if (bridge[f][t] > 1) {
					ctx.fillStyle = powerup_colors[bridge[f][t]];
					ctx.strokeStyle = powerup_colors[bridge[f][t]];
				}

				ps = [
					bridgeToScreen(t, f),
					bridgeToScreen(t+1, f),
					bridgeToScreen(t+1, f+1),
					bridgeToScreen(t, f+1)
				];
				ctx.beginPath();
				ctx.moveTo(ps[0][0], ps[0][1]);
				ctx.lineTo(ps[1][0], ps[1][1]);
				ctx.lineTo(ps[2][0], ps[2][1]);
				ctx.lineTo(ps[3][0], ps[3][1]);
				ctx.lineTo(ps[0][0], ps[0][1]);
				ctx.fill();
				ctx.stroke();
				if (bridge[f][t] > 1) {
					ctx.fillStyle = color_bridge;
					ctx.strokeStyle = color_bridge;
				}
			}
		}
	}


	//player shadow
	var shadowPercent = (player.y > 0) ? (1 / (1 + player.y)) : Math.max((1 - 3 * player.y ** 2), 0);
	var coords = spaceToScreen(player.x, calcHeight(playerTrueZ), playerTrueZ);
	ctx.globalAlpha = 0.4;
	drawEllipse(coords[0], coords[1], (canvas.height / 12) * shadowPercent, (canvas.height / 24) * shadowPercent, "#666");
	ctx.globalAlpha = 1;

	drawScaffolding();

	//player
	player.draw();

	//draw ui
	drawUI();
}

function drawUI() {
	//distance text
	var meterText = (player.z < 1000) ? (player.z.toFixed(1) + "m") : ((player.z / 1000).toFixed(3) + "km");
	var meterTextTop = (bridgeDistMax < 1000) ? (bridgeDistMax.toFixed(1) + "m") : ((bridgeDistMax / 1000).toFixed(3) + "km");
	ctx.font = `${canvas.height / 20}px Ubuntu`;
	ctx.fillStyle = color_text;
	ctx.fillText(`now: ${meterText}`, canvas.width * 0.03, canvas.height * 0.05);
	ctx.fillText(`top: ${meterTextTop}`, canvas.width * 0.03, canvas.height * 0.09);

}

function drawScaffolding() {
	var scaffoldingBits = drawDistBridge * 2;
	var offX = tileWidth * bridge[0].length * 0.5;
	var offY = 0.1;
	var bitflip = 1;

	var coords = spaceToScreen(offX, calcHeight(0) + offY, 0);
	ctx.beginPath();
	ctx.strokeStyle = color_bridgeDark;
	ctx.moveTo(coords[0], coords[1]);
	ctx.lineWidth = canvas.height / 100;
	while (bitflip > -1) {
		for (var h=0; h<scaffoldingBits; h++) {
			coords = spaceToScreen(offX, calcHeight((h / scaffoldingBits) * drawDistBridge) + offY, (h / scaffoldingBits) * drawDistBridge);
			ctx.lineTo(coords[0], coords[1]);
		}
		bitflip -= 1;
		offX *= -1;

		coords = spaceToScreen(offX, calcHeight(0) + offY, 0);
		ctx.moveTo(coords[0], coords[1]);
	}
	ctx.stroke();
}

function drawEllipse(x, y, rx, ry, color) {
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
	ctx.fill();
}

function handleKeyPress(a) {
	switch(a.code) {
		case "ArrowLeft":
			player.dir = -1;
			break;
		case "ArrowUp":
			if (player.y <= 0 && player.y > killPlane) {
				player.dy = player.jump;
			}
			break;
		case "ArrowRight":
			player.dir = 1;
			break;

		case "ShiftLeft":
		case "ShiftRight":
			goFast = true;
			break;
	}
}

function handleKeyRelease(a) {
	switch(a.code) {
		case "ArrowLeft":
			if (player.dir < 0) {
				player.dir = 0;
			}
			break;
		case "ArrowRight":
			if (player.dir > 0) {
				player.dir = 0;
			}
			break;

		case "ShiftLeft":
		case "ShiftRight":
			goFast = false;
			break;
	}
}