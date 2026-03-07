
importScripts("../common/functions-coordinate.js");
importScripts("../common/functions-math.js");
importScripts("functions-helper.js");
importScripts("config.js");
importScripts("materials.js");
importScripts("objects-player.js");
importScripts("objects-engine.js");
importScripts("objects.js");
importScripts("worlds.js");
//ough


//workers all have a copy of the world state, so they can simulate raycasts
tree_sets = 7;
createWorlds();

var player = new Player(loading_world, Pos(0, 0, 0));
var camera = new Camera(loading_world, Pos(0, 0, 0));
var cxDir = [0, 0, 0];
var cyDir = [0, 0, 0];
var czDir = [0, 0, 0];

var threadID = -1;

function run(package) {
	var data = package.data;
	
	switch (data[0]) {
		case "updateCamera":
			updateCamera(data.slice(1));
			break;
		case "updateFOV":
			updateFOV_work(data.slice(1));
			break;
		case "calcLine":
			// console.log(data.slice(1));
			drawAndPostLine(data.slice(1));
			break;
		case "test":
			runTest(data.slice(1));
			break;
		case "ID":
			threadID = data[1];
			postMessage(["ready", threadID]);
			break;
		case "syncObject":
			syncObject_recieve(...data.slice(1));
			break;
		case "returnArr":
			lineBuffer_num += 1;
			lineBuffers[lineBuffer_num] = data[1];
			break;
	}
}

function runTest(dataArr) {
	console.log(`RECIEVED: ${JSON.stringify(dataArr)}`);
	eval(dataArr[0]);
	console.log(`CAMERA IS AT: ${camera.pos}`);
}

//makes sure the brickMap is up to date
function updateCamera(data) {
	// console.log(`UPDATING CAMERA WITH DATA: ${JSON.stringify(data)}`);
	[worldStr, x, y, z, theta, phi] = data;
	//update camera properties
	camera.world = worlds[worldStr];
	loading_world = camera.world;
	camera.pos[0] = x;
	camera.pos[1] = y;
	camera.pos[2] = z;
	camera.theta = theta;
	camera.phi = phi;
	
	cxDir = polToCart(camera.theta + (Math.PI / 2), 0, 1);
	cyDir = polToCart(camera.theta, camera.phi - (Math.PI / 2), 1);
	czDir = polToCart(camera.theta, camera.phi, camera_planeOffset);
	
	loading_world.objects.forEach(o => {
		o.tick();
	});
	loading_world.tick();
}

function drawAndPostLine(data) {
	[x, pixelWidth, pixelHeight] = data;
	var colorValues = calcLine(cxDir, cyDir, czDir, x, pixelWidth, pixelHeight);
	postMessage(["colorLine", x, colorValues], [colorValues.buffer]);
}

onmessage = run;

postMessage(["ready", threadID]);