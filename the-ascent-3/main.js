window.onkeydown = keyPress;
window.onkeyup = keyNegate;

window.onload = setup;
document.onmousemove = mouseMoveHandle;
document.onmousedown = mouseClickHandle;
document.onmouseup = mouseUpHandle;

window.addEventListener("wheel", handleWheel, {passive: false});
//setting up variables for later
var canvas;
var ctx;

var base64 = `0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+=`;
var base64_inv = invertList(base64);

var zPressed = false;
var xPressed = false;
var cPressed = false;
var bPressed = false;

var mouseDown = false;
var mouseX;
var mouseY;
var numToSet = 0;

var arrayValue;
var centerX;
var centerY;
var canvasArea;
var gravity = 0.01;

var timer;
var dayLength = 12500;
var time = 0;
var points = 0;
var freeTime = [];

var yes = 0;
var delay = 10;
var frameTime = 15;
var cloudSpacing = 4;

//all the colors used

//blocks
var landColor = "#773C08";
var lLandColor = "#9B5618";
var grassColor = "#008800";
var stoneColor = "#494D5E";
var lStoneColor = "#797D8E";
var cloudColor = "#DDDDFF";
var lCloudColor = "#FFFFFF";
var solColor = "#FFB900";
var lSolColor = "#FCD876";
var lWoodColor = "#DB8F0B";
var skyColor = "#AAAAFF";
var skySecondaryColor = "#FFFFFF";
var floorColor = "#D1AC6D";
var farmColor = "#916B2F";
var endingColor = "#FF00FF";
var startingColor = "#00FF00";
var blackColor = "#000000";
var blockCrackColor = "#496464";

//entities
var ballColor = "#FF00FF";
var buttonColor = "#FF4444";
var tipColor = "#333366";
var pressedButtonColor = "#44FF44";

var menuColor = "#333366";
var textColor = "#EEEEEE";
var entityColor = "#8800FF";
var nightFilter = "#000044";
var debugFilterColor = "#FF808F";

var loadingMap = [];
var bufferMap = map;	

var entitySpeed = 1;

//this array says all the surfaces that are solid and cannot be walked through.
var solidSurfaces = [1, 2, 4, 6, 8];

let camera;
let player;
let loadingMode = new Menu();

let entities;
// the initializing function.

function setCanvasPreferences() {
	ctx.textBaseline = "middle";
}

function setup() {
	canvas = document.getElementById("canvas");
	ctx = canvas.getContext("2d");

	loadingMap = importMap(map);
	
	centerX = canvas.width / 2;
	centerY = canvas.height / 2;

	camera = new Camera(0, 0);
	player = new Player(4, 5);

	//generating entities

	//all hardcoded entities
	//all the hardcoded entities

	//above ground buttons come first, then the orb, then the below ground buttons.

	entities = [
				//above-ground buttons
				new Button(37, 81, new Gelatin(36, 80), 38, 74.5, [[37, 74, 1, 0], [38, 74, 1, 0]]),
				new Button(28.5 , 68 , new Gelatin(35.5, 61.5), 43.5, 57, [[42, 55, 4, 3], [44, 55, 4, 3], [43, 56, 4, 3], [42, 57, 4, 3], [44, 57, 4, 3], [43, 58, 4, 3]]),
				new Button(41.5 , 66, new Gelatin(38.5, 65.5), 43.5, 57, [[42, 56, 4, 3], [44, 56, 4, 3], [43, 57, 4, 3], [42, 58, 4, 3], [44, 58, 4, 3]]),
				new Button(55, 35, new Gelatin(59, 36.5), 17.5, 19.5, [[17, 19, 9, 6]]),
				new Button(10.5, 12, new Gelatin(12.5, 14.5), 0.5, 10.5, [[1, 11, 5, 6]]),
				new Button(13.5, 15, new Gelatin(12.5, 11.5), -15.5, 12.5, [[46, 12, 2, 0], [47, 12, 2, 0], [48, 12, 2, 0]]),
				new Orb(43.5, 17.5),
				//secret buttons
				new Button(62.5, 101, new Gelatin(55.5, 105.5), 23.5, 102.5, [[22, 98, 1, 0], [23, 98, 1, 0], [24, 98, 1, 0], [22, 99, 1, 0], [24, 99, 1, 0], [22, 100, 1, 0], [24, 100, 1, 0], [22, 101, 1, 0], [24, 101, 1, 0], [25, 101, 1, 0], [21, 101, 1, 0], [22, 102, 1, 0], [22, 103, 1, 0], [22, 104, 1, 0], [22, 105, 1, 0], [22, 106, 1, 0]]),
				new Button(10.5, 107, new Gelatin(10.5, 109.5), 4, 91, yellowBackgrounds),
				new Button(12.5, 107, new Gelatin(11.5, 109.5), 4, 85, yellowForeGrounds),
				new Button(8.5, 101, new Gelatin(14.5, 99.5), 10.5, 107.5, [[10, 107, 3, 4]]),
				//below-ground normal buttons
				new Button(52.5, 115, new Gelatin(53.5, 113.5), 72.5, 120.5, [[9, 120, 4, 3]])
			];
	
	/*generating clouds:
	clouds y: 32-34 squares
	clouds x: 0-63 squares, x is deterministic but y is random */
	for (var a=0;a<=loadingMap[0].length / cloudSpacing;a++) {
		var randHeight = (Math.random() * 2) + 32;
		entities.push(new Cloud(a * cloudSpacing, randHeight));
	}

	//generating cracked blocks
	for (var b=0;b<crackerPositions.length;b++) {
		entities.push(new Cracker((crackerPositions[b][0]) + 0.5, (crackerPositions[b][1]) + 0.5));
	}

	setInterval(draw, frameTime);
}

function keyPress(h) {
	/*there is one switch statement that controls all the key presses
	37, 38, 39, and 40 are the arrow keys. Left, up, and right can only be activated if delay is 0, meaning not during cutscenes. 
	Down can still be used. Dx is controlled by ax, but dy is updated directly for a more snappy feeling */
	switch (h.keyCode) {
		case 65:
		case 37:
			player.ax = -player.accRate;
			break;
		case 87:
		case 38:
			if (player.onGround) {
				player.dy = -player.jumpStrength;
				player.onGround = false;
			} else {
				player.glide = true;
			}
			player.ay = -player.accRate;
			break;
		case 68:
		case 39:
			player.ax = player.accRate;
			break;
		case 83:
		case 40:
			player.dy += player.jumpStrength;
			player.ay = player.accRate;
			break;
		
		//z, x, c, and b, in that order
		case 90:
			zPressed = true;
			break;
		case 88:
			xPressed = true;
			break;
		case 67:
			cPressed = true;
			break;
		case 66:
			bPressed = true;
			break;
		//numbers
		case 48:
		case 49:
		case 50:
		case 51:
		case 52:
		case 53:
		case 54:
		case 55:
		case 56:
		case 57:
			numToSet = h.keyCode - 48;
			break;
	}
}
//the directions have these if statements so that if the player is imprecise with their keyboard inputs it will still work
function keyNegate(h) {
	switch (h.keyCode) {
		case 65:
		case 37:
			if (player.ax < 0) {
				player.ax = 0;
			}
			break;
		case 87:
		case 38:
			if (player.ay < 0) {
				player.ay = 0;
			}
			if (player.glide) {
				player.glide = false;
			}
			break;
		case 68:
		case 39:
			if (player.ax > 0) {
				player.ax = 0;
			}
			break;
		case 83:
		case 40:
			if (player.ay > 0) {
				player.ay = 0;
			}
			break;
	}
}

function draw() {
	loadingMode.beRun();
}

function mouseMoveHandle(h) {
	canvasArea = canvas.getBoundingClientRect();
	mouseX = Math.round(h.clientX - canvasArea.left);
	mouseY = Math.round(h.clientY - canvasArea.top);
}

function mouseClickHandle() {
	if (loadingMode.constructor.name == "Debug") {
		mouseDown = true;
	}
}

function mouseUpHandle() {
	mouseDown = false;
}

/* mapSquare is the function that draws all the different tiles. */
function mapSquare(value, ex, why, offset) {
	if (value < -0) {
		ctx.beginPath();
		ctx.strokeStyle = "#F00";
		ctx.lineWidth = canvas.height / 100;
		ctx.moveTo(ex, why);
		ctx.lineTo(ex + camera.scale, why + camera.scale);
		ctx.stroke();
		value *= -1;
	}

	if (Math.ceil(value) == 1) {
		ctx.fillStyle = stoneColor;
		ctx.fillRect(ex, why, camera.scale - offset, camera.scale - offset);
	}

	//drawing cracks
	if (Math.ceil(value) != value) {
		drawMapCracks(value, ex, why);
	}
}

function drawMapCracks(value, ex, why) {
	//different phases based on how broken block is
	var percentage = value - Math.floor(value);

	//draws slightly cracked no matter what, because cracked blocks are guarenteed to be cracked
	ctx.beginPath();
	ctx.strokeStyle = blockCrackColor;
	ctx.lineWidth = 2;
	ctx.moveTo(ex, why);
	ctx.lineTo(ex + (camera.scale * 0.7), why + (camera.scale * 0.7));


	if (percentage < 0.666) {
		//more cracked
		ctx.moveTo(ex + (camera.scale * 0.2), why + (camera.scale * 0.6));
		ctx.lineTo(ex + (camera.scale * 0.6), why + (camera.scale * 0.4));
	} 
	if (percentage < 0.333) {
		//the most cracked
		ctx.moveTo(ex + (camera.scale * 0.3), why + (camera.scale * 0.3));
		ctx.lineTo(ex + (camera.scale * 0.8), why + (camera.scale * 0.2));
	}
	ctx.stroke();
}

// drawing the map
function drawMap() {
	var lowerCorner = screenToSpace(0, 0);
	lowerCorner = [floor(lowerCorner[0]-1), floor(lowerCorner[1])];
	var upperCorner = screenToSpace(canvas.width, canvas.height);
	upperCorner = [Math.ceil(upperCorner[0]), Math.ceil(upperCorner[1])];
	var lowerXY = spaceToScreen(lowerCorner[0], lowerCorner[1]);

	//uses two for loops, one for x and one for y
	var lenX = upperCorner[0] - lowerCorner[0];
	var lenY = upperCorner[1] - lowerCorner[1];
	for (var p=0; p<lenY; p++) {
		for (var o=0; o<lenX; o++) {
			//figuring out where to read from
			var value;
			var xSquare = modulate(lowerCorner[0] + o, loadingMap[0].length);
			var ySquare = lowerCorner[1] + p;

			//where to write to
			//[square numbers] - [square offset]
			var xPos = lowerXY[0] + (o * camera.scale);
			var yPos = lowerXY[1] + (p * camera.scale);

			if (loadingMap[ySquare] == undefined || loadingMap[ySquare][xSquare] == undefined) {
				value = 9;
			} else {
				value = loadingMap[ySquare][xSquare];
			}
			//the actual drawing, xPos and yPos are floored so that subpixels don't create ugly lines
			
			mapSquare(value * -boolToSigned(loadingMode.constructor.name == "Debug" && xSquare != lowerCorner[0] + o), floor(xPos), floor(yPos), loadingMode.tileOffset);
		}
	}
}

function mapEdit() {
	console.log(`editing`);
	//converts the mouses position into a spot on the map, allows for click edits.
	var max = 9;
	var arrayPos = screenToSpace(mouseX, mouseY);
	
	if (mouseDown && mouseX > 0 && mouseY > 0 && mouseX < canvas.width && mouseY < canvas.height) {
		loadingMap[floor(arrayPos[1])][floor(arrayPos[0])] = numToSet;
		if (loadingMap[floor(arrayPos[1])][floor(arrayPos[0])] > max) {
			loadingMap[floor(arrayPos[1])][floor(arrayPos[0])] = 0;
		}
	}

	//makes sure that text displays the coordinates
	textValue[0] = 9;
	textTime = 100;
}

function handleWheel(e) {
	camera.scale = clamp(camera.scale * (1 + 0.005 * e.deltaY), 20, 60);
}