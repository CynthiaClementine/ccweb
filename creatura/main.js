window.onload = setup;
window.onresize = handleResize;
window.onmousedown = handleMouseDown;
window.onmousemove = handleMouseMove;
window.onmouseup = handleMouseUp;
document.onkeydown = handleKeyDown;
document.onkeyup = handleKeyUp;

document.addEventListener('pointerlockchange', handleCursorLockChange, false);
document.addEventListener('mozpointerlockchange', handleCursorLockChange, false);

var animation;

var color_walls_basic = "#4eed83";
var color_walls_glass = "#d7a8f9";
var color_ground = "#98df7e";
var color_sky_low = "#81d2ed";
var color_sky_mid = "#62b9d6";
var color_sky_high = "#447a8c";
var color_walls_house = "#bf8f4d";
var color_walls_house_dark = "#9a723a";

var camera_scale = 600;
var cursorLock = false;
var clipPlaneZ = 0.05;
var player = new Player(4, 1, 4);

var time = 0;
var maxDelta = 25;

var scrollMult = -0.005;

//game world vars
var drawDistance = 24;
var wallThickness = 0.08;
var conversingWith = undefined;
var world_map = [];

function setup() {
	animation = window.requestAnimationFrame(main);
	canvas = document.getElementById("cabin");
	ctx = canvas.getContext("2d");

	//cursor lock chicanery
	canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
	document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;

	canvas.onclick = () => {
		canvas.requestPointerLock({unadjustedMovement: true});
	}

	createMap(world_map_walls, world_map_entities);
	handleResize();
}

function main() {
	var newTime = performance.now();
	//can't take more than 25ms
	var dt = Math.min(newTime - time, maxDelta) / 1000;
	time = newTime;
	//tick everything
	player.tick(dt);
	world_map.forEach(line => {
		line.forEach(cell => {
			if (cell.entities) {
				cell.entities.forEach(e => {
					e.tick(dt);
				});
			}
		});
	});

	//draw everything
	drawSky();
	drawGround();
	drawWorld();

	ctx.fillStyle = "#000";
	ctx.fillRect(-2, -2, 4, 4);

	if (player.dx == 0 && player.dy == 0) {
		drawText(0, 0, `${Math.floor(canvas.height / 40)}px Ubuntu`, `Use WASD to move and E to interact.`, "#000", "#FFF", "center");
	}
	if (player.pages > 0) {
		drawText(canvas.width * -0.48, canvas.height * -0.45, `${Math.floor(canvas.height / 30)}px Ubuntu`, `${player.pages} / 8`, "#000", "#FFF", "left");
	}

	animation = window.requestAnimationFrame(main);
}

//turn the separate walls + entities into one data structure that it's easier to work with
//much harder for human read/write though.
function createMap(wallData, entData) {
	world_map = [];
	var width = (wallData[0].length - 4) / 2;
	var height = (wallData.length - 3) / 2;
	var wc;
	for (var y=0; y<=height; y++) {
		world_map.push([]);
		for (var x=0; x<width; x++) {
			wc = [x * 2 + 1, y * 2 + 1];
			world_map[y][x] = new C(wallData[wc[1]][wc[0] - 1], wallData[wc[1] - 1][wc[0]], wallData[wc[1]][wc[0] + 1], wallData[wc[1] + 1][wc[0]],
				wallData[wc[1]][wc[0]], []);
		}
	}

	entData.forEach(e => {
		var coords = [Math.floor(e.x), Math.floor(e.z)];
		world_map[coords[1]][coords[0]].entities.push(e);
	});
}

function handleResize() {
	var spaceW = window.innerWidth * 0.96;
	var spaceH = window.innerHeight * 0.96;
	var forceAspect = 0.75;

	spaceH = Math.min(spaceH, spaceW * forceAspect);
	spaceW = spaceH / forceAspect;

	canvas.width = Math.floor(spaceW);
	canvas.height = Math.floor(spaceH);

	fixResize();
}

function fixResize() {
	camera_scale = canvas.width * (600 / 640);

	//drawing properties
	var scaling = canvas.width / 640;
	ctx.translate(canvas.width / 2, canvas.height / 2);
	ctx.lineCap = "round";
	ctx.textBaseline = "middle";
}

function handleMouseDown(e) {

}

function handleMouseMove(e) {
	if (!cursorLock || conversingWith) {
		return;
	}
	player.theta += e.movementX * scrollMult;
	player.phi = clamp(player.phi - e.movementY * scrollMult, -Math.PI / 2, Math.PI / 2);
}

function handleMouseUp(e) {
}

function handleKeyDown(e) {
	switch (e.code) {
		case `KeyA`:
			player.ax = -player.accelPower;
			break;
		case `KeyD`:
			player.ax = player.accelPower;
			break;
		case `KeyW`:
			player.az = player.accelPower;
			break;
		case `KeyS`:
			player.az = -player.accelPower;
			break;
		case `Space`:
			if (player.y <= player.height) {
				player.dy = player.jumpPower;
			}
			break;
		case `KeyE`:
			var lookPos = polToXY(player.x, player.z, player.theta + Math.PI / 2, 1);
			var cell = [Math.floor(lookPos[0]), Math.floor(lookPos[1])];
			console.log(JSON.stringify(cell));
			if (!world_map[cell[1]]) {
				return;
			}
			if (!world_map[cell[1]][cell[0]]) {
				return;
			}
			if (!world_map[cell[1]][cell[0]].entities[0]) {
				return;
			}
			world_map[cell[1]][cell[0]].entities[0].interact(false);
			break;
	}
}

function handleKeyUp(e) {
	switch (e.code) {
		case `KeyA`:
			player.ax = Math.max(0, player.ax);
			break;
		case `KeyD`:
			player.ax = Math.min(0, player.ax);
			break;
		case `KeyW`:
			player.az = Math.min(0, player.az);
			break;
		case `KeyS`:
			player.az = Math.max(0, player.az);
			break;
	}
}

function handleCursorLockChange() {
	cursorLock = (document.pointerLockElement === canvas || document.mozPointerLockElement === canvas);
}