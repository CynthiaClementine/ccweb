/*general math / void functions for utility

INDEX

calcLine(xDir, yDir, zDir, x, pixelWidth, pixelHeight)
deserialize(str)
dot(a, b)
getDistance(x1, y1, z1, x2, y2, z2)
getDistancePos(pos1, pos2)


*/

function giveBounds(pos, rx, ry, rz) {
	return [
		Pos(pos[0] - rx, pos[1] - ry, pos[2] - rz),
		Pos(pos[0] + rx, pos[1] + ry, pos[2] + rz),
	];
}


//pixel ray starts at camera point and intersects regular intervals on a plane 1 unit in front
function projectPerspective(x, pixelsInX, y, pixelsInY) {
	var singleOffset = (camera_halfTan / (render_n / 2));
	return [
		singleOffset * (x - (pixelsInX / 2)),
		singleOffset * (y - (pixelsInY / 2)),
		1
	];
}

//pixel ray essentially starts behind the camera, from the back of the panini circle.
function projectPanini(x, pixelsInX, y, pixelsInY) {
	var screenDist = (camera_paniniR);
	var halfPixX = pixelsInX / 2;
	var halfPixY = pixelsInY / 2;

	var maxOffsetX = (camera_halfTan * screenDist);
	var singleOffsetX = (maxOffsetX / halfPixX);
	var singleOffsetY = (camera_halfTanVert / halfPixY);
	
	var screenX = singleOffsetX * (x - halfPixX);
	var screenY = singleOffsetY * (y - halfPixY);
	
	var paniniAngle = Math.atan(screenX / screenDist);
		/*
		2 * paniniFOV = regular FOV
		x = (1+panini) * tan(2*maxPaniniFOV)
		atan(x / (1+panini)) = 4 * regularFOV
		atan(x / (1+panini)) / 4 = regularFOV */
	var [z, x] = polToXY(0, 0, paniniAngle * 2, 1);
	return [
		x,
		screenY,
		z
	];
}

function projectPaniniDebug(x, pixelsInX, y, pixelsInY) {
	var screenDist = (1 + camera_paniniR);
	var halfPixX = pixelsInX / 2;
	var halfPixY = pixelsInY / 2;

	var maxOffsetX = (camera_halfTan * screenDist);
	var singleOffsetX = (maxOffsetX / halfPixX);
	var singleOffsetY = (camera_halfTanVert / halfPixY);
	
	var screenX = singleOffsetX * (x - halfPixX);
	var screenY = singleOffsetY * (y - halfPixY);
	
	var paniniAngle = Math.atan(screenX / screenDist);
		/*
		2 * paniniFOV = regular FOV
		x = (1+panini) * tan(2*maxPaniniFOV)
		atan(x / (1+panini)) = 4 * regularFOV
		atan(x / (1+panini)) / 4 = regularFOV */
	var [z, x] = polToXY(0, 0, paniniAngle * 2, 1);
	return [
		x,
		screenY,
		z
	];
}

function calcLine(xDir, yDir, zDir, x, pixelWidth, pixelHeight) {
	//array of integers, measuring RGB/RGB/RGB/RGB
	var colors = new Uint8Array(pixelHeight * 3);
	for (var y=0; y<pixelHeight; y++) {
		var [xMult, yMult, zMult] = camera_projFunc(x, pixelWidth, y, pixelHeight);
		//create a ray and iterate until complete
		trueDir = [
			xDir[0] * xMult + yDir[0] * yMult + zDir[0] * zMult,
			xDir[1] * xMult + yDir[1] * yMult + zDir[1] * zMult,
			xDir[2] * xMult + yDir[2] * yMult + zDir[2] * zMult
		];
		/*assuming that the camera's dirs are all normalized:
		the magnitude of the trueDir will always be
		sqrt(x^2 + y^2 + z^2)
		sqrt((xMult+yMult+zMult)^2 + (xMult+yMult+zMult)^2 + (xMult+yMult+zMult)^2)
		sqrt(3 * (xMult+yMult+zMult)^2)
		*/
		var xyzMult = xMult + yMult + zMult;
		// var magnitude = Math.sqrt(3 * xyzMult * xyzMult);
		var magnitude = Math.hypot(trueDir[0], trueDir[1], trueDir[2]);
		trueDir[0] /= magnitude;
		trueDir[1] /= magnitude;
		trueDir[2] /= magnitude;
		// if (camera.pos == 0) {
		// 	var thrower = [4,4,4];
		// 	var res = thrower[NaN][0];
		// }
		var c = new Ray(camera.world, camera.pos, trueDir).iterate();
		colors[3*y] = c[0];
		colors[3*y+1] = c[1];
		colors[3*y+2] = c[2];
	}
	return colors;
}


function deserialize(str) {
	var [type, params] = str.split(`|`);
	var spl = params.split(`~`);
	var obj;
	var J = JSON.parse;
	
	switch (type) {
		case `CUBE`:
			obj = new Cube(Pos(...J(spl[0])), +spl[1], Color(...J(spl[2])));
			break;
		case `BOX`:
			obj = new Box(Pos(...J(spl[0])), +spl[1], +spl[2], +spl[3], Color(...J(spl[4])));
			break;
		case `CYLINDER`:
			obj = new Cylinder(Pos(...J(spl[0])), +spl[1], +spl[2], Color(...J(spl[3])));
			break;
			
		case `PORTAL`:
			obj = new Portal(Pos(...J(spl[0])), J(spl[1]));
			break;
		case `RING`:
			obj = new Ring(Pos(...J(spl[0])), +spl[1], +spl[2], Color(...J(spl[3])));
			break;
		case `SPHERE`:
			obj = new Sphere(Pos(...J(spl[0])), +spl[1], Color(...J(spl[2])));
			break;
		case `LINE`:
			obj = new Line(Pos(...J(spl[0])), Pos(...J(spl[1])), +spl[2], Color(...J(spl[3])));
			break;
	}
	
	return obj;
}

function dot(a, b) {
	return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function getDistance(x1, y1, z1, x2, y2, z2) {
	var dx = x1 - x2;
	var dy = y1 - y2;
	var dz = z1 - z2;
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function getDistancePos(pos1, pos2) {
	var dx = pos1[0] - pos2[0];
	var dy = pos1[1] - pos2[1];
	var dz = pos1[2] - pos2[2];
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

//does square root, but faster. Theoretically
var sqrtTable = new Float32Array(10000);
for (var a=0; a<sqrtTable.length; a++) {
	sqrtTable[a] = Math.sqrt(a);
}

//bit magic to get the bits out of a float
function doubleToIEEE(f) {
	var buf = new ArrayBuffer(8);
	(new Float64Array(buf))[0] = f;
	return [(new Uint32Array(buf))[0], (new Uint32Array(buf))[1]];
}

//warning - this function is slower somehow
function fastSqrt(x) {
	return Math.sqrt(x);
	//if x is less than 10, just use the square root - the precision is important for small numbers
	if (x <= 10 || x > ray_maxDist) {
		return Math.sqrt(x);
	}

	//bitshifting is faster than Math.floor
	return sqrtTable[x << 1 >> 1];
}

function loadWorld(worldName) {
	var obj = worlds[worldName];
	if (!obj) {
		console.error(`invalid world name!`);
		return;
	}
	camera.world = obj;
}

function modulate(x, num) {
	return (x < 0) ? num + (x % num) : x % num;
}

function modulateSoft(x, num) {
	if (x >= num) {
		x -= num;
	}
	if (x < 0) {
		x += num;
	}
	return x;
}

function performanceTest() {
	var perf = [performance.now(), 0];
	var storage = 0;

	for (var x=0; x<100000000; x++) {
		storage += Math.sqrt(x % 10000) * (2 * (x % 1) - 1);
	}

	perf[1] = performance.now();
	console.log(storage, perf[1] - perf[0]);
	return;
}

function performanceTest2() {
	var perf = [performance.now(), 0];
	var storage = 0;

	for (var x=0; x<100000000; x++) {
		storage += fastSqrt(x % 10000) * (2 * (x % 1) - 1);
	}

	perf[1] = performance.now();
	console.log(storage, perf[1] - perf[0]);
	return;
}

//ack this is a mess
function quatMultiply(quat1, quat2) {
	return [
		quat1[0] * quat2[0] - quat1[1] * quat2[1] - quat1[2] * quat2[2] - quat1[3] * quat2[3],
		quat1[0] * quat2[1] + quat1[1] * quat2[0] + quat1[2] * quat2[3] - quat1[3] * quat2[2],
		quat1[0] * quat2[2] - quat1[1] * quat2[3] + quat1[2] * quat2[0] + quat1[3] * quat2[1],
		quat1[0] * quat2[3] + quat1[1] * quat2[2] - quat1[2] * quat2[1] + quat1[3] * quat2[0]
	]
}

/**
* simple function that subtracts a from b and divides by d.
* It's very simple but it's used a lot in grid calculations, so I wrote a function for it
 */
function trans(a, b, d) {
	return (a - b) / d;
}










//functions that apply to vectors
function vAdd(vec1, vec2) {
	var newVec = [];
	//go backwards so the array only needs to be lengthened once
	for (var n=vec1.length-1; n>-1; n--) {
		newVec[n] = vec1[n] + vec2[n];
	}
	return newVec;
}

//returns the dot product of two matching vectors
function vDot(vec1, vec2) {
	var sum = 0;
	for (var n=0; n<vec1.length; n++) {
		sum += vec1[n] * vec2[n];
	}
	return sum;
}

//returns the length of a vector
function vLen(vector) {
	var midPoint = 0;
	vector.forEach(v => {
		midPoint += v * v;
	});
	return Math.sqrt(midPoint);
}

function vSub(vec1, vec2) {
	var newVec = [];
	for (var n=vec1.length-1; n>-1; n--) {
		newVec[n] = vec1[n] - vec2[n];
	}
	return newVec;
}

function prand(min, max) {
	rand_seed |= 0;
	rand_seed = rand_seed + 0x9e3779b9 | 0;
	let t = rand_seed ^ rand_seed >>> 16;
	t = Math.imul(t, 0x21f0aaad);
	t = t ^ t >>> 15;
	t = Math.imul(t, 0x735a2d97);
	return min + (((t = t ^ t >>> 15) >>> 0) / 4294967296) * (max - min);
}

function test_gridVsTree(x, y, z) {
	var grid = loading_world.grid;
	var a = loading_world.tree.estimate({pos: Pos(x,y,z)});
	var b = grid.estimatePos(Pos(x,y,z));
	if (Math.abs(a[0] - b[0]) > 0.01 || a[1] != loading_world.objects[b[1]]) {
		console.log(`pos (${x},${y},${z}) or grid (${(x-grid.minPos[0])/grid.xd},${(y-grid.minPos[1])/grid.yd},${(z-grid.minPos[2])/grid.zd}) fails test! 
			Tree: o@${loading_world.objects.indexOf(a[1])} w/ ${a[0]}
			Grid: o@${b[1]} w/ ${b[0]}`);
		return false;
	}
	return true;
}
function test_gridVsWorld(x, y, z) {
	var grid = loading_world.grid;
	var a = grid.estimatePos(Pos(x,y,z));
	var b = loading_world.estimatePos(Pos(x,y,z));
	
	function f(x) {
		return x.toFixed(2);
	}
	if ((a[0] - b[0]) > 0.01 || a[1] != b[1]) {
		console.log(`pos (${f(x)},${f(y)},${f(z)}) or grid (${f((x-grid.minPos[0])/grid.xd)},${f((y-grid.minPos[1])/grid.yd)},${f((z-grid.minPos[2])/grid.zd)}) fails test! 
			Grid: o@${a[1]} w/ ${f(a[0])}
			World: o@${b[1]} w/ ${f(b[0])}`);
		return false;
	}
	return true;
}
function test_gridMany() {
	var passed = 0;
	var total = 40000;
	for (var a=0; a<total; a++) {
		var x = prand(-800, 800);
		var y = prand(0, 500);
		var z = prand(-800, 800);
		passed += +test_gridVsWorld(x, y, z);
	}
	console.log(`in total: ${passed} / ${total} passed`);
}

function updateFOV(newFOV, isPanini) {
	camera_projFunc = (isPanini ? projectPanini : projectPerspective);
	if (isPanini) {
		//panini FOVs are different. Because it's stereographic projection, basically, degrees are doubled. 
		//90 paniniº are worth 180 traditionalº. 
		//For parity with traditional projection, "newFOV" will correspond to the regular degrees.
		//But it's more useful to store the paniniº.
		camera_FOV = newFOV;
		var vertFOV = Math.min((newFOV / 2), 90);
		camera_halfTan = Math.tan((camera_FOV / 4) * degToRad);
		camera_halfTanVert = Math.tan((vertFOV / 2) * degToRad);
	} else {
		camera_FOV = newFOV;
		camera_halfTan = Math.tan((camera_FOV / 2) * degToRad);
	}
}