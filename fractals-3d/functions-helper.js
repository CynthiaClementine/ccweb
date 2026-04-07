/*general math / void functions for utility

INDEX

calcLine(xDir, yDir, zDir, x, pixelWidth, pixelHeight)
deserialize(str)
dot(a, b)
getDistance(x1, y1, z1, x2, y2, z2)
getDistancePos(pos1, pos2)

projectPanini(x, pixelsInX, y, pixelsInY)
projectPerspective(x, pixelsInX, y, pixelsInY)
projectOct(x, pixelsInX, y, pixelsInY)


*/

/**
* applies a paint Color to a base Color4.
* @param {Color4} paintColor the color to paint
* @param {Color4} baseColor the color to paint onto
 */
function applyColor(paintColor, baseColor) {
	var availableOpacity = (255 - baseColor[3]) / 255;
	if (availableOpacity <= 0) {
		return;
	}
	
	baseColor[0] = linterp(baseColor[0], paintColor[0], availableOpacity);
	baseColor[1] = linterp(baseColor[1], paintColor[1], availableOpacity);
	baseColor[2] = linterp(baseColor[2], paintColor[2], availableOpacity);
	baseColor[3] += paintColor[3] * availableOpacity;
}

/**
* returns an updated signed distance based on an old/new distance and an object's nature.
 */
function applyDist(oldDist, testDist, nature) {
	return Math.min(testDist, oldDist);
}

function constrainPlayer(xRange, yRange, zRange) {
	player.pos[0] = modulate(player.pos[0] + xRange, 2 * xRange) - xRange;
	player.pos[1] = modulate(player.pos[1] + yRange, 2 * yRange) - yRange;
	player.pos[2] = modulate(player.pos[2] + zRange, 2 * zRange) - zRange;
}

function giveBounds(pos, rx, ry, rz, theta, phi, rot) {
	var xVec = transform([rx, 0, 0], [0, 0, 0], theta, phi, rot);
	var yVec = transform([0, ry, 0], [0, 0, 0], theta, phi, rot);
	var zVec = transform([0, 0, rz], [0, 0, 0], theta, phi, rot);
	
	//since a cube gives every combination of ±vec, it's possible to just decompose the vectors and take the min / max variance
	
	const bestX = (Math.abs(xVec[0]) + Math.abs(yVec[0]) + Math.abs(zVec[0]));
	const bestY = (Math.abs(xVec[1]) + Math.abs(yVec[1]) + Math.abs(zVec[1]));
	const bestZ = (Math.abs(xVec[2]) + Math.abs(yVec[2]) + Math.abs(zVec[2]));

	return [
		Pos(pos[0] - bestX, pos[1] - bestY, pos[2] - bestZ),
		Pos(pos[0] + bestX, pos[1] + bestY, pos[2] + bestZ),
	];
}

//gives the "bounds angle" - the angle between 0 and pi/2 that acts the same as the given angle for bounding boxes.
function boundsAngle(radians) {
	if (radians >= Math.PI) {
		radians -= Math.PI;
	}
	if (radians < Math.PI / 2) {
		return radians;
	}
	return Math.PI - radians;
}


//tests whether the keys in dictionary A and B are the same
function keysMatch(dictA, dictB) {
	var s = new Set();
	const aKeys = Object.keys(dictA);
	const bKeys = Object.keys(dictB);
	
	if (aKeys.length != bKeys.length) {
		return false;
	}
	
	aKeys.forEach(k => {
		s.add(k);
	});
	
	for (var z=0; z<bKeys.length; z++) {
		if (!s.delete(bKeys[z])) {
			return false;
		}
	}
	
	return (s.size == 0);
}

/**
* takes in two 3d vectors and returns the projection of a onto b
* @param {Number[]} a the first 3d vector
* @param {Number[]} b the direction to project to
 */
function proj(a, b) {
	const ab = dot(a, b);
	const bb = dot(b, b);
	const mult = ab / bb;
	//proj = v(u•v / v•v)
	return [b[0] * mult, b[1] * mult, b[2] * mult];
}

/**
 * dot product of two positions/vectors
 * @param {Number[]} a first 3d vector
 * @param {Number[]} b second 3d vector
 * @returns {Number}
 */
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

function loadWorld(worldName) {
	var obj = worlds[worldName];
	if (!obj) {
		console.error(`invalid world name!`);
		return;
	}
	player.world = obj;
}


function sortByMorton(objsList) {
	//takes in a list of objects [obj1, obj2, obj3..] 
	//and returns a list of objects [obj3, obj1, obj2...] sorted by their morton code. Since we're just constructing a BVH
	//it doesn't really matter whether it sorts high - low or low - high.
	var sortList = objsList.map((a) => {
		const bounds = a.bounds();
		return [a, calcMorton(a, bounds[0], bounds[1])];
	});
	
	sortList.sort((a, b) => {
		return a[1] - b[1];
	});
	
	return sortList.map(a => a[0]);
}

function interleaveMorton(x, y, z) {
	return swizzleMorton(x) | (swizzleMorton(y) << 1) | (swizzleMorton(z) << 2);
}

function swizzleMorton(x) {
	x = (x * 0x00010001) & 0xFF0000FF;
	x = (x * 0x00000101) & 0x0F00F00F;
	x = (x * 0x00000011) & 0xC30C30C3;
	x = (x * 0x00000005) & 0x49249249;
	return x;
}

function calcMorton(pos, lowestPos, highestPos) {
	const mortonRange = (2 ** 10) - 1;
	
	const xRange = highestPos[0] - lowestPos[0];
	const yRange = highestPos[1] - lowestPos[1];
	const zRange = highestPos[2] - lowestPos[2];
	
	//normalize all coordinates
	var x = (pos[0] - lowestPos[0]) / xRange;
	var y = (pos[1] - lowestPos[1]) / yRange;
	var z = (pos[2] - lowestPos[2]) / zRange;
	
	x = (x * mortonRange) | 0;
	y = (y * mortonRange) | 0;
	z = (z * mortonRange) | 0;
	
	return interleaveMorton(x, y, z);
}

//determines if aabb2 is completely inside aabb1
function aabbInside(minPos1, maxPos1, minPos2, maxPos2) {
	return  (minPos1[0] <= minPos2[0]) && (maxPos1[0] >= maxPos2[0]) && 
			(minPos1[1] <= minPos2[1]) && (maxPos1[1] >= maxPos2[1]) && 
			(minPos1[2] <= minPos2[2]) && (maxPos1[2] >= maxPos2[2]);
}

function BVHUnion(node1, node2) {
	const minPos = Pos(
		Math.min(node1.minPos[0], node2.minPos[0]),
		Math.min(node1.minPos[1], node2.minPos[1]),
		Math.min(node1.minPos[2], node2.minPos[2]),
	);
	
	const maxPos = Pos(
		Math.max(node1.maxPos[0], node2.maxPos[0]),
		Math.max(node1.maxPos[1], node2.maxPos[1]),
		Math.max(node1.maxPos[2], node2.maxPos[2]),
	);
	
	return new BVH_Node(minPos, maxPos, null, node1, node2);
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

/**
 * Returns the image of a given point when transformed by the given offset / angles
 * @param {Number[]} point the point to transform
 * @param {Number[]} offset the Pos to transform by
 * @param {Number} theta XZ rotation, in radians
 * @param {Number} phi YZ rotation, in radians 
 * @param {Number} rot XY rotation, in radians
 */
function transform(point, offset, theta, phi, rot) {
	var [x, y, z] = point;
	[x, y] = rotate(x, y, rot);
	[y, z] = rotate(y, z, -phi);
	[x, z] = rotate(x, z, theta);
	return [x + offset[0], y + offset[1], z + offset[2]];
}

/**
 * transforms a standard transform. In this case, the first 4 args are the transform to modify, and the last 4 args are the base to apply.
 * @param {Pos} pos
 * @param {Number} theta
 * @param {Number} phi
 * @param {Number} rot
 * @param {Pos} basePos
 * @param {Number} baseTheta
 * @param {Number} basePhi
 * @param {Number} baseRot
 */
function transformTransform(pos, theta, phi, rot, basePos, baseTheta, basePhi, baseRot) {
	//set up
	var e = 0.1;
	var p1 = pos;
	var p2 = transform(Pos(0, 0, e), p1, theta, phi, rot);
	var p3 = transform(Pos(0, e*e, e), p1, theta, phi, rot);
	
	//transform
	p1 = transform(p1, basePos, baseTheta, basePhi, baseRot);
	p2 = transform(p2, basePos, baseTheta, basePhi, baseRot);
	p3 = transform(p3, basePos, baseTheta, basePhi, baseRot);
	
	//convert back
	console.error(`need to do this`);
	
	// return {
	// 	pos: 
	// 	theta:
	// 	phi:
	// 	rot:
	// };
}

/**
 * Returns the pre-image of a given point under the given offset / angles
 * @param {Number[]} point the point to transform
 * @param {Number[]} offset the Pos to transform by
 * @param {Number} theta XZ rotation, in radians
 * @param {Number} phi YZ rotation, in radians 
 * @param {Number} rot XY rotation, in radians
 */
function transformInverse(point, offset, theta, phi, rot) {
	var [x, y, z] = [point[0] - offset[0], point[1] - offset[1], point[2] - offset[2]];

	if (theta || phi || rot) {
		[x, z] = rotate(x, z, -theta);
		[y, z] = rotate(y, z, phi);
		[x, y] = rotate(x, y, -rot);
	}
	
	return [x, y, z];
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

function updateFOV(newFOV) {
	updateFOV_work([newFOV]);
	worker_pool.forEach(w => {
		w.postMessage(["updateFOV", newFOV, render_goalN]);
	});
}

function printPos(pos) {
	const n = 3;
	return `(${pos[0].toFixed(n)},${pos[1].toFixed(n)},${pos[2].toFixed(n)})`;
}

function updateFOV_work(data) {
	var [newFOV, newRenderN] = data;
	if (newRenderN) {
		render_n = newRenderN;
	}
	camera_FOV = newFOV;
	//first figure out best function given the FOV
	switch (true) {
		case (newFOV <= 120):
			camera_halfTan = Math.tan((camera_FOV / 2) * degToRad);
			break;
		case (newFOV <= 180):
			camera_projFunc = projectPanini;
			//handle panini FOV:
			//panini FOVs are different. Because it's stereographic projection, basically, degrees are doubled. 
			//90 paniniº are worth 180 traditionalº. 
			//For parity with traditional projection, "newFOV" will correspond to the regular degrees.
			//But it's more useful to store the paniniº.
			var vertFOV = Math.min((newFOV / 2), 90);
			camera_halfTan = Math.tan((camera_FOV / 4) * degToRad);
			//in this case, vertical FOV will be less than horizontal FOV
			camera_halfTanVert = Math.tan((vertFOV / 2) * degToRad);
			break;
		case (newFOV == 360):
			//not much to do here. the octahedron mapping takes care of pretty much everything
			break;
		default:
			console.error(`something went wrong with FOV=${newFOV} ):`);
			break;
	}
}