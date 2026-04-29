/*general math / void functions for utility

INDEX

calcLine(xDir, yDir, zDir, x, pixelWidth, pixelHeight)
dot(a, b)
getDistance(x1, y1, z1, x2, y2, z2)
getDistancePos(pos1, pos2)

projectPanini(x, pixelsInX, y, pixelsInY)
projectPerspective(x, pixelsInX, y, pixelsInY)
projectOct(x, pixelsInX, y, pixelsInY)


*/

//determines if aabb2 is completely inside aabb1
function aabbInside(minPos1, maxPos1, minPos2, maxPos2) {
	return  (minPos1[0] <= minPos2[0]) && (maxPos1[0] >= maxPos2[0]) && 
			(minPos1[1] <= minPos2[1]) && (maxPos1[1] >= maxPos2[1]) && 
			(minPos1[2] <= minPos2[2]) && (maxPos1[2] >= maxPos2[2]);
}

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
	if (nature & N_FOG || nature & N_GRAVITY) {
		testDist = Math.max(testDist, ray_nearDist * 0.9);
	}
	if (nature & N_ANTI) {
		return Math.max(-testDist, oldDist);
	}
	return Math.min(testDist, oldDist);
}

function augmentBounds(bounds, extraDist) {
	bounds[0][0] -= extraDist;
	bounds[0][1] -= extraDist;
	bounds[0][2] -= extraDist;
	bounds[1][0] += extraDist;
	bounds[1][1] += extraDist;
	bounds[1][2] += extraDist;
	return bounds;
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

function calcLine(xDir, yDir, zDir, x, pixelWidth, pixelHeight) {
	var r = new Ray_Tracking(camera.world, camera.pos, [0, 1, 0]);
	//array of integers, measuring RGB/RGB/RGB/RGB
	const targetSize = pixelHeight * 3;
	var colors;
	if (lineBuffer_num > -1 && lineBuffers[lineBuffer_num].length == targetSize) {
		colors = lineBuffers[lineBuffer_num--];
	} else {
		colors = new Uint8Array(targetSize);
	}
	
	
	for (var y=0; y<pixelHeight; y++) {
		const [xMult, yMult, zMult] = camera_projFunc(x, pixelWidth, y, pixelHeight);
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
		r.reset(camera.world, camera.pos, trueDir);
		var c = r.iterate();
		if (r.object) {
			colors[3*y] = 255;
			// colors[3*y+1] = c[1];
			// colors[3*y+2] = c[2];
		}
	}
	return colors;
}

/**
 * @param {Pos} worldPos - the position in the world to calculate the screen position of
 * @return {Number[]|null} the screen position as [x, y], or null if the position is behind the camera
 */
function calcScreenPos(worldPos) {
	if (!worldPos) {
		return null;
	}
	//first, find the offset of the world pos from the camera in the camera's coordinate system. If the offset is negative, it's behind the camera and we can ignore it.
	if (Number.isNaN(worldPos[0] + worldPos[1] + worldPos[2])) {
		return null;
	}
	var delta = [worldPos[0] - camera.pos[0], worldPos[1] - camera.pos[1], worldPos[2] - camera.pos[2]];
	var offset = dot(delta, polToCart(camera.theta, camera.phi, 1)); 
	if (offset <= 0) {
		return null;
	}

	// projecting world pos to screen
	var right = dot(delta, polToCart(camera.theta + (Math.PI / 2), 0, 1));
	var up = dot(delta, polToCart(camera.theta, camera.phi + (Math.PI / 2), 1));

	// oughhhh fov
	var halfHeight = Math.tan(camera_FOV * degToRad / 2);
	var halfWidth = halfHeight * (banvas.width / banvas.height);
	var normalizedX = (right / offset) / halfWidth;
	var normalizedY = (up / offset) / halfHeight;

	return [(normalizedX * 0.5 + 0.5) * banvas.width, (1 - (normalizedY * 0.5 + 0.5)) * banvas.height];
}

function constrainPlayer(xRange, yRange, zRange) {
	player.pos[0] = modulate(player.pos[0] + xRange, 2 * xRange) - xRange;
	player.pos[1] = modulate(player.pos[1] + yRange, 2 * yRange) - yRange;
	player.pos[2] = modulate(player.pos[2] + zRange, 2 * zRange) - zRange;
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

/**
* uses the pxdata to draw 16-color pixel art onto the banvas. 
* @param {Number[]} pxData an array of integers. Each integer represents one line of the art. Individual pixels are represented by a chunk of 4 bits.
* @param {Number} startX the X coordinate of the banvas to start on
* @param {Number} startY the Y coordinate of the banvas to start on
* @param {Number} pxSize how large each pixel of the pixel art should be displayed at
 */
function drawPixelArt(pxData, startX, startY, pxSize) {
	var pxWidth = pxData.w * pxSize;
	var pxHeight = pxData.h * pxSize;
	
	for (var y=0; y<pxData.h; y++) {
		const dat = pxData[y];
		for (var x=0; x<pxData.w; x++) {
			const ind = dat >> (4 * (pxData.w - x - 1)) & 0xF;
			btx.fillStyle = colors16[ind];
			btx.fillRect(startX + x * pxSize, startY + y * pxSize, pxSize + 0.5, pxSize + 0.5);
		}
	}
}

function drawUI() {
	const cvs = banvas;
	const cw = cvs.width;
	const ch = cvs.height;
	const pxW = cw / render_n;
	const pxH = ch / render_n;
	var center = [cvs.width / 2, cvs.height / 2];
	const crossLen = (render_n < 100) ? (1 / render_n) : 0.04;
	
	//crosshair
	btx.globalAlpha = 0.3;
	btx.beginPath();
	btx.strokeStyle = color_editor_border;
	btx.lineWidth = Math.ceil(ch * (1.5 / render_n));
	btx.moveTo(center[0] - ch * crossLen, center[1]);
	btx.lineTo(center[0] + ch * crossLen, center[1]);
	btx.moveTo(center[0], center[1] - ch * crossLen);
	btx.lineTo(center[0], center[1] + ch * crossLen);
	btx.stroke();
	
	//collision
	if (debug_flags.collisionRaycast) {
		const pixelsInX = render_colN;
		const pixelsInY = render_colN;
	
		const xDir = polToCart(camera.theta + (Math.PI / 2), 0, 1);
		const yDir = polToCart(camera.theta, camera.phi - (Math.PI / 2), 1);
		const zDir = polToCart(camera.theta, camera.phi, camera_planeOffset);
	
		for (var x=0; x<pixelsInX; x++) {
			drawLine(x, calcLine(xDir, yDir, zDir, x, pixelsInX, pixelsInY));
		}
	}
	
	if (!debug_listening) {
		btx.globalAlpha = 1;
		return;
	}
	
	//debug bars
	btx.fillStyle = color_editor_border;
	btx.fillRect(0, 0, cvs.width, pxH * 12);
	btx.fillRect(0, ch - pxH * 12, cvs.width, pxH * 12);
	
	drawEditorGizmo();
	
	//selected object ghost
	if (editor_selected != player) {
		var ghostPos = calcScreenPos(editor_selected.pos);
		if (ghostPos) {
			btx.globalAlpha = 1;
			btx.lineWidth = 1;
			btx.strokeStyle = colors16[15];
			btx.beginPath();
			btx.arc(...ghostPos, 6, 0, Math.PI * 2);
			btx.stroke();
			btx.globalAlpha = 0.3;
		}
	}
	
	//global/local indicator
	btx.globalAlpha = 0.6;
	drawPixelArt(editor_local ? pxdata_box : pxdata_world, 4 * pxW, 16 * pxH, pxW * 4);
	btx.globalAlpha = 1;
}

function drawLine(x, colorArr) {
	//writing directly to imageData is theoretically faster than changing fillStyle a bunch
	var blockSizeTrue = (banvas.width / render_colN);
	var blockSize = Math.round(banvas.width / render_colN);
	var imageData = btx.createImageData(blockSize, banvas.height);
	var dataBlock = imageData.data;
	for (var y=0; y<render_colN; y++) {
		var r = colorArr[3*y];
		for (var yOff=0; yOff<blockSize; yOff++) {
			var lineInd = 4 * blockSize * (y * blockSize + yOff);
			for (var xOff=0; xOff<blockSize; xOff++) {
				var pixelInd = lineInd + (4 * xOff);
				dataBlock[pixelInd] = r;
				dataBlock[pixelInd+3] = r / 2;
			}
		}
	}
	
	btx.putImageData(imageData, x * blockSizeTrue, 0);
	render_linesDrawn += 1;
}

/**
 * Returns the camera's basis vectors (right/X, up/Y, forward/Z).
 * @returns {Object} `{right: Pos, up: Pos, forward: Pos}` (each is a normalized Pos vector)
 */
function getCameraBasis() {
	return {
		right:	polToCart(camera.theta + (Math.PI / 2), 0, 1),
		up:		polToCart(camera.theta, camera.phi + (Math.PI / 2), 1),
		forward:polToCart(camera.theta, camera.phi, 1)
	};
}

function getDistance(x1, y1, z1, x2, y2, z2) {
	const dx = x1 - x2;
	const dy = y1 - y2;
	const dz = z1 - z2;
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function getDistancePos(pos1, pos2) {
	const dx = pos1[0] - pos2[0];
	const dy = pos1[1] - pos2[1];
	const dz = pos1[2] - pos2[2];
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
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


function loadWorld(worldName) {
	var obj = worlds[worldName];
	if (!obj) {
		console.error(`invalid world name!`);
		return;
	}
	player.world = obj;
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

//https://www.researchgate.net/publication/354065227_Essential_Ray_Generation_Shaders

//pixel ray essentially starts behind the camera, from the back of the panini circle.
function projectPanini(x, pixelsInX, y, pixelsInY) {
	var screenDist = (camera_paniniR); //1 + camera_paniniR ?
	var halfPixX = pixelsInX / 2;
	var halfPixY = pixelsInY / 2;

	var maxOffsetX = (camera_halfTan * screenDist);
	
	var screenX = maxOffsetX * (x - halfPixX) / halfPixX;
	var screenY = camera_halfTanVert * (y - halfPixY) / halfPixY;
	
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

//pixel ray starts at camera point and intersects regular intervals on a plane 1 unit in front
function projectPerspective(x, pixelsInX, y, pixelsInY) {
	var singleOffset = (camera_halfTan / (pixelsInX / 2));
	return [
		singleOffset * (x - (pixelsInX / 2)),
		singleOffset * (y - (pixelsInY / 2)),
		1
	];
}

function projectOct(x, pixelsInX, y, pixelsInY) {
	var halfPixX = pixelsInX / 2;
	var halfPixY = pixelsInY / 2;
	x = (x - halfPixX) / halfPixX;
	y = (y - halfPixY) / halfPixY;
	var n = [
		x,
		y,
		1 - Math.abs(x) - Math.abs(y)
	];
	var t = Math.min(n[2], 0);
	n[0] += (n[0] > 0 ? -t : t);
	n[1] += (n[1] > 0 ? -t : t);
	return n;
}

function noise(x, y) {
	var i = [Math.floor(x), Math.floor(y)];
	var f = [x - Math.floor(x), y - Math.floor(y)];
	f = [
		f[0] * f[0] * (3 - 2 * f[0]),
		f[1] * f[1] * (3 - 2 * f[1]),
	];
	
	//bilinear interpolation on the corners
	return linterp( linterp(randStable(i[0], i[1]),            randStable(i[0]+1, i[1]), f[0]),
					linterp(randStable(i[0], i[1]+1), randStable(i[0]+1, i[1]+1), f[0]), f[1]);
}

function randStable(p0, p1) {
	const b0 = p0 * 0.3183099 + 0.71;
	const b1 = p1 * 0.3183099 + 0.113;
	p0 = 50 * (b0 - Math.floor(b0));
	p1 = 50 * (b1 - Math.floor(b1));
	const q = p0 * p1 * (p0 + p1);
	return 2 * (q - Math.floor(q)) - 1;
}

function mortonCalc(pos, lowestPos, highestPos) {
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
	
	return mortonInterleave(x, y, z);
}

function mortonInterleave(x, y, z) {
	return mortonSwizzle(x) | (mortonSwizzle(y) << 1) | (mortonSwizzle(z) << 2);
}

function mortonSort(objsList) {
	//takes in a list of objects [obj1, obj2, obj3..] 
	//and returns a list of objects [obj3, obj1, obj2...] sorted by their morton code. Since we're just constructing a BVH
	//it doesn't really matter whether it sorts high - low or low - high.
	var sortList = objsList.map((a) => {
		const bounds = a.bounds();
		return [a, mortonCalc(a, bounds[0], bounds[1])];
	});
	
	sortList.sort((a, b) => {
		return a[1] - b[1];
	});
	
	return sortList.map(a => a[0]);
}

function mortonSwizzle(x) {
	x = (x * 0x00010001) & 0xFF0000FF;
	x = (x * 0x00000101) & 0x0F00F00F;
	x = (x * 0x00000011) & 0xC30C30C3;
	x = (x * 0x00000005) & 0x49249249;
	return x;
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

function normalizeTo(vector, length) {
	var norm = normalize(vector);
	norm[0] *= length;
	norm[1] *= length;
	norm[2] *= length;
	return norm;
}

function perf_logStart(logName) {
	perf_log[logName].push(performance.now());
}

function perf_logEnd(logName) {
	const n = perf_log[logName].length - 1;
	var past = perf_log[logName][n];
	if (!past) {
		return;
	}
	var present = performance.now();
	perf_log[logName][n] = present - past;
	if (n > perf_len) {
		perf_log[logName].splice(0, 1);
	}
	return (present - past);
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

function printPos(pos) {
	const n = 3;
	return `(${pos[0].toFixed(n)},${pos[1].toFixed(n)},${pos[2].toFixed(n)})`;
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

function cartToThetaPhi(x, y, z) {
	var theta = Math.atan2(x, z);
	var phi = Math.atan(y / Math.sqrt((z * z) + (x * x)));
	
	return [(theta < 0) ? (Math.PI * 2 + theta) : theta, phi];
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
	var zeroPos = Pos(0, 0, 0);
	var p1 = pos;
	var p2 = transform(Pos(0, 0, e), zeroPos, theta, phi, rot);
	var p3 = transform(Pos(0, e*e, e), zeroPos, theta, phi, rot);
	
	//transform
	p1 = transform(p1, basePos, baseTheta, basePhi, baseRot);
	p2 = transform(p2, zeroPos, baseTheta, basePhi, baseRot);
	p3 = transform(p3, zeroPos, baseTheta, basePhi, baseRot);
	
	//convert back
	var [t2, h2] = cartToThetaPhi(p2[0], p2[1], p2[2]);
	var [t3, h3] = cartToThetaPhi(p3[0], p3[1], p3[2]);
	// var finalRot = Math.atan2((h3 - h2), (t3 - t2));
	// var finalRot = modulate(baseRot + rot, Math.PI * 2);
	// if (finalRot < 0) {
	// 	finalRot = Math.PI * 2 + finalRot;
	// }
	
	return {
		pos: p1,
		theta: Math.PI * 2 - t2,
		phi: h2,
		rot: rot + baseRot
	};
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

	if (theta) {
		[x, z] = rotate(x, z, -theta);
	}
	if (phi) {
		[y, z] = rotate(y, z, phi);
	}
	if (rot) {
		[x, y] = rotate(x, y, -rot);
	}
	
	return [x, y, z];
}

function transformInverseMat(point, offset, rotMatrix) {
}

/**
 * gives the SDF of a specified set of objects (considered the Scene.)
 * @param {Scene3dObject[]} sceneCollection array of objects to check against
 * @param {Pos} pos position to check
 * @returns `[closestDist, closestObj]`
 */
function sceneSDF(sceneCollection, pos) {
	var dist = 1e1001;
	var distObj = undefined;
	var testDist;
	sceneCollection.forEach(o => {
		testDist = o.distanceToPos(pos);
		testDist = applyDist(dist, testDist, o.nature);
		if (testDist != dist) {
			dist = testDist;
			distObj = o;
		}
	});
	return [dist, distObj];
}

function updateFOV(newFOV) {
	updateFOV_work(newFOV);
}

function updateFOV_work(newFOV) {
	camera_FOV = newFOV;
	//first figure out best function given the FOV
	switch (true) {
		case (newFOV <= 120):
			camera_projFunc = projectPerspective;
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
			camera_projFunc = projectOct;
			//not much to do here. the octahedron mapping takes care of pretty much everything
			break;
		default:
			console.error(`something went wrong with FOV=${newFOV} ):`);
			break;
	}
}
