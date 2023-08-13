window.onload = setup;
window.onkeydown = handleKeyPress;
window.onkeyup = handleKeyRelease;
window.onresize = handleResize;

var aspect = 4 / 3;

var canvas;
var ctx;

var tileWidth = 0.7;
var sliceTiles = 5;
var sliceOptions = [5, 13];

var boat_barHeight = 0.03;
var boat_barWidth = 0.1;

var bridge = [];
var bridgeDistMax = 0;
var bridgeDistChal = 700;
var bridgeDistMiniChal = 200;
var bridgeFreqMiniChal = 0.1;
var bridgeDistGrace = 100;
var bridgeFreqMin = 0.06;
var bridgeFreqMax = 0.95;
var bridgeMiniPeriod = 5000;

var clouds = [];
var cloudXSpread = 20;
var cloudARange = [0.3, 0.6];
var cloudDistRange = [0.4, 2];
var cloudDistStep = 0.32;
var cloudHeight = 5;
var cloudMoveRate = 0.1;

var color_bar = ["#F00", "#F00", "#F80", "#0F0", "#0FF"];
var color_bg = "#9ec3ff";
var color_boat = "#53320C";
var color_boatLight = "#513515";
var color_bridge = "#888888";
var color_bridgeDark = "#222244";
var color_clouds = "#d6fbff";
var color_night = "#20003b"
var color_player = "#F8F";
var color_star = "#FFEE99";
var color_sunDay = "#FFFFFF";
var color_sunSet = "#ffdf74";
var color_text = "#222222";
var color_textLight = "#DDDDDD";
var color_water = "#4d4f96";
var color_water2 = "#5a5ca4";
var color_water3 = "#716bb4";
var color_waves = "#5d5e89";


function dayCycleQuery() {
	return (timeAlive % dayCycleLength) / dayCycleLength;
}


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
	[0, 0, 0.5],

	[0, 1, -0.75],
	[0, 0, -0.5],
];
var boat_faces = [
	[0, 1, 2, 3],

	[0, 4, 7, 3],
	[1, 5, 6, 2],

	[0, 4, 8, 9],
	[1, 5, 8, 9],

	[3, 7, 10, 11],
	[2, 6, 10, 11],
];
var boat_scaling = 0.6;

var camera = {
	x: 0,
	y: 2.5,
	z: -3,
	scale: 0.65,
}
var camera_small = {
	x: 0,
	y: 2.5,
	z: -3,
	scale: 0.65
}
var camera_large = {
	x: 0,
	y: 4,
	z: -5,
	scale: 0.65
}

var dayCycleLength = 1800;

var drawDistBridge = 20;
var drawDistCloud = 40;
var drawDistWaves = 30;

var goFast = false;

var gravTimeMax = 10;
var gravTime = 0;

var player;
var playerTrueZ = 0.8;
var player_colorOpts = ["#F8F", "#F00", "#F80", "#FF0", "#8F0", "#0F0", "#0F8", "#0FF", "#08F", "#00F", "#80F", "#F0F", "#F08", "#630", "#888", "#000"];

/*
2 - hot feet
3 - clear bridge
4 - low gravity
5 - boat
 */
var powerup_colors = {
	2: "#ff3c3c",
	3: "#00FF00",
	4: "#FFFFFF",
	5: "#53320c",

	10: "#25212b"
}
var powerup_frequencies = {
	2: () => {return 0.002},
	3: (d) => {d /= 100; d += 1; return 0.0017 * (2 - (d * (2 * d - 1) / (d ** 3)))},
	4: () => {return 0.003},
	5: (d) => {return 0.004 - sigmoid((5 * d / bridgeDistChal) - 6, 0, 0.00275)},
}

var killPlane = -0.5;

var lastTime = 0;
var state = "menu";

var snellPts = 12;
var snellPeriod = 3;

var stars = [];
var starDist = 5;
var starNum = 800;
var starPRand = 1.245;

var sunR = 0.075;
var sunA = 0.05;
var timeAlive = 0;

var waves = [];
var waveCount = 200;
var waveWidthRange = [1, 3];
var waveSpread = 5;

function setup() {
	canvas = document.getElementById("corvid");
	ctx = canvas.getContext("2d");

	handleResize();
	localStorage_read();
	generateStars();
	animation = window.requestAnimationFrame(main);
}

function main() {
	switch (state) {
		case "menu":
			drawMenu();
			break;
		case "pause":
			ctx.fillStyle = color_text;
			ctx.strokeStyle = color_textLight;
			ctx.lineWidth = canvas.height / 300;
			ctx.font = `${canvas.height / 15}px Ubuntu`;
			ctx.textAlign = "center";
			ctx.strokeText(`~paused~`, canvas.width / 2, canvas.height / 2);
			ctx.fillText(`~paused~`, canvas.width / 2, canvas.height / 2);
			break;
		case "game":
			tick();
			draw();
			break;
	}

	animation = window.requestAnimationFrame(main);
}


function calcSunPos() {
	var dpro = dayCycleQuery();
	return [0, starDist * Math.cos(Math.PI * 2 * (dpro - sunA)), starDist * Math.sin(Math.PI * 2 * (dpro - sunA))];
}

function calcSunColor() {

}

function cloudToSpace(x, z) {
	return [x, cloudHeight * (1 - (z ** 2) / ((0.9 * drawDistCloud) ** 2)), z];
}

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

function localStorage_write() {
	window.localStorage["gtte_data"] = `${bridgeDistMax.toFixed(1)},${sliceTiles},${color_player}`;
}

function localStorage_read() {
	if (window.localStorage["gtte_data"] != undefined) {
		var spl = window.localStorage["gtte_data"].split(`,`);
		bridgeDistMax = +spl[0];
		sliceTiles = +spl[1];
		camera = (sliceTiles > 7) ? camera_large : camera_small;
		color_player = spl[2];
	}
}

function prand(min, max) {
	starPRand = starPRand ** 4;
	if (starPRand > 20) {
		starPRand -= Math.ceil(starPRand - 20);
	}
	return (min + (starPRand % 1) * (max - min));
}

function tickClouds() {
	//remove clouds too close to the camera
	while (clouds.length > 0 && clouds[0].z < (player.z * cloudMoveRate)) {
		clouds.splice(0, 1);
	}
	
	//add clouds far away from the camera
	while (clouds.length < 1 || clouds[clouds.length-1].z - drawDistCloud < player.z * cloudMoveRate) {
		generateCloud(randomBounded(-cloudXSpread, cloudXSpread), (clouds[clouds.length-1] ?? {z: 2}).z + 1);
	}
}

function generateBridgeSlice() {
	var sliceIndex = bridge.length;
	var z = sliceIndex * tileWidth;
	var sliceFreq = calcTileFreq(z);

	var slice = [];
	for (var t=sliceTiles-1; t>-1; t--) {
		switch (true) {
			case (Math.random() < powerup_frequencies[2](z)):
				slice[t] = 2;
				break;
			case (Math.random() < powerup_frequencies[3](z)):
				slice[t] = 3;
				break;
			case (Math.random() < powerup_frequencies[4](z)):
				slice[t] = 4;
				break;
			case (Math.random() < powerup_frequencies[5](z)):
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
	var baseF = Math.E ** -(4 * distance / bridgeDistChal) * (1 - bridgeFreqMin) + bridgeFreqMin;
	if (distance > bridgeDistChal * 2) {
		var t = 6;
		distance = t * distance / bridgeMiniPeriod;
		//magic number to normalize the normal distribution
		baseF += bridgeFreqMiniChal * normal(((distance + (0.5 * t)) % t) - 0.5 * t) * 2.506628;
	}

	return baseF;
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

function tick(deltaT, recursiveTimer) {
	var newTime = performance.now();
	if (deltaT == undefined) {
		recursiveTimer = 3;
		deltaT = clamp(newTime - lastTime, 1, 30) / 1000;
		lastTime = newTime;
	}
	tickClouds();
	player.tick(deltaT);

	if (player.z > bridgeDistMax) {
		bridgeDistMax = player.z;
	}

	if (player.dead) {
		return;
	}
	timeAlive += deltaT;
	if (gravTime > 0) {
		gravTime -= deltaT;
		if (gravTime < 0) {
			gravTime = 0;
		}
	}

	//generate more bridge
	if (player.z + drawDistBridge > bridge.length) {
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

function doubleSigmoid(x, minY, maxY, midX1, midX2, travelTime) {
	var halfTravel = travelTime / 2;
	if (x < midX1 - halfTravel || x > midX2 + halfTravel) {
		return minY;
	}
	if (x > midX1 + halfTravel && x < midX2 - halfTravel) {
		return maxY;
	}

	//reflect X into first sigmoid distribution, then use that

	if (x > midX1 + halfTravel) {
		x -= midX2;
		x /= halfTravel;
		//second sigmoid
		
		return sigmoid(6.1 * x, maxY, minY);
	}

	//first sigmoid
	x -= midX1;
	x /= halfTravel;
	return sigmoid(6.1 * x, minY, maxY);

}

function resetGame() {
	localStorage_write();
	player = new Player(0, 0, false);
	clouds = [];
	bridge = [];
	goFast = false;
	gravTime = 0;
	timeAlive = 0;

	for (var l=0; l<drawDistBridge; l++) {
		generateBridgeSlice();
	}

	//debug bits
	// dayCycleLength = 80;
	// player.y = 0.1;
	// player.ay = 0;
}

function generateStars() {
	var starCandidate;
	while (stars.length < starNum) {
		// Θ = 0 is at +Y, and extends towards the +Z dir
		// φ = 0 is at +X
		starCandidate = [prand(Math.PI * -0.2, Math.PI * 1.15), Math.acos(prand(-1, 1)) - Math.PI / 2];
		
		//any stars that end up too close to the sun get rejected
		if (Math.hypot(starCandidate[0], starCandidate[1] * 1.5) > 0.65) {
			stars.push(starCandidate);
		}
	}
}

function trueReset() {
	if (confirm(`Are you sure you want to reset? This will erase all data.`)) {
		//expunge all data
		window.localStorage["gtte_data"] = undefined;
		window.location.reload();
	}
}

function handleKeyPress(a) {
	switch(a.code) {
		case "ArrowLeft":
		case "KeyA":
			player.dir = -1;
			break;
		case "ArrowUp":
		case "KeyW":
		case "Space":
			if (player.y <= 0 && player.y > killPlane) {
				player.dy = player.jump;
			}
			break;
		case "ArrowRight":
		case "KeyD":
			player.dir = 1;
			break;

		case "ShiftLeft":
		case "ShiftRight":
			goFast = true;
			break;
		case "KeyR":
			resetGame();
			break;
		case "Escape":
			if (state == "game") {
				state = "pause";
			} else if (state == "pause") {
				state = "menu";
			}
			break;
		case "Enter":
			if (state == "pause") {
				state = "game";
			}
			break;
	}
}

function handleKeyRelease(a) {
	switch(a.code) {
		case "ArrowLeft":
		case "KeyA":
			if (player.dir < 0) {
				player.dir = 0;
			}
			break;
		case "ArrowRight":
		case "KeyD":
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

function handleMouseDown_custom() {
	if (state == "pause") {
		return;
	}

	//reset button
	if (state == "game") {
		if (player.dead && cursor.y > canvas.height * 0.85) {
			resetGame();
		}
		return;
	}

	if (state == "menu") {
		if (cursor.x < canvas.width * 0.23 || cursor.x > canvas.width * 0.77) {
			return;
		}
		if (cursor.y > canvas.height * 0.95 || cursor.y < canvas.height * 0.43) {
			return;
		}
		var button = (cursor.y - (canvas.height * 0.43)) / (canvas.height * 0.1);
		var dir = boolToSigned(cursor.x > canvas.width * 0.5);
		switch (Math.floor(button)) {
			case 0:
				resetGame();
				state = "game";
				break;
			case 1:
				sliceTiles = clamp(sliceTiles + dir, ...sliceOptions);
				camera = (sliceTiles > 7) ? camera_large : camera_small;
				break;
			case 2:
				var ind = player_colorOpts.indexOf(color_player);
				color_player = player_colorOpts[(ind + player_colorOpts.length + dir) % player_colorOpts.length];
				break;
			case 3:
				trueReset();
				return;
		}
		localStorage_write();
	}
}

function handleResize() {
	//compute
	var w = window.innerWidth - 6;
	var h = window.innerHeight * 0.9 - 6;
	var scaleFactor = 1 / aspect;

	//resize canvas
	canvas.height = Math.min(h, w * scaleFactor);
	canvas.width = canvas.height / scaleFactor;

	//set canvas preferences
	ctx.lineJoin = "round";
	ctx.lineCap = "round";
}