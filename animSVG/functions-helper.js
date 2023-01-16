/*
INDEX

φOver(node)

addLayer(name)
createTimelineBlocks(layerID, startFrame, endFrame)

changeAnimLength_user()
changeAnimLength()
clampWorkspace()
createUID()
cursorIsInBounds()
cursorWorkspaceCoordinates()


makeUnKeyframe(layerIndex, frame)

moveWorkspace(x, y)

updateCursorPos(a)
updateSelectedColor()
*/


//says whether the cursor is over an element
function φOver(node) {
	var box = node.getBoundingClientRect();
	return (cursor.x >= box.x && cursor.x <= box.x + box.width && cursor.y >= box.y && cursor.y <= box.y + box.height);
}


function addLayer(name) {
	name = name ?? "New Layer";
	var layerID = createUid();
	var frameID = createUid();

	//create frame object
	var frameObj = layer_create(frameID);
	var layerObj = φCreate('g', {'id': `layer_${layerID}`});
	var index = timeline.layerIDs.length;

	//create layer reference
	timeline.layerIDs.push(layerID);
	timeline.names[layerID] = name;
	//populate the layer array
	timeline.l[layerID] = [];
	timeline.l[layerID][timeline.len-1] = frameObj;
	timeline.l[layerID].fill(frameObj);

	//put layer into the workspace
	workspace_permanent.appendChild(layerObj);
	layerObj.appendChild(frameObj);
	
	//create group to store blocks in
	//I'm using the svg element instead of the g element because the g element doesn't transfer positioning to children
	var layerGroup = φCreate("svg", {
		'y': index * (timeline_blockH + 1) + timeline_headHeight,
		'id': `layer_${layerID}_group`,
		'overflow': 'visible',
	});
	timeline_blocks.appendChild(layerGroup);

	//add the layer's bits to the timeline
	timeline_text_container.appendChild(φCreate("text", {
		'x': -5,
		'y': (index + 0.55) * (timeline_blockH + 1) + timeline_headHeight,
		'id': `layer_${layerID}_text`, 
		'class': 'timelineText',
		'innerHTML': name,
		'noselect': 'on'
	}));

	createTimelineBlocks(layerID, 0, timeline.len-1);
	//update the timeline's visibility
	timeline.makeVisible();
	return true;
}

/**
 * 
 * @param {String} id The ID of the layer to remove. IDs are always an x followed by one or more letters.
 */
function removeLayer(id) {
	console.log(`removing ${id}`)
	timeline.makeInvisible();
	//move timeline objects afterwards to fill the gap
	var moveH = -(timeline_blockH + 1);
	var startIndex = timeline.layerIDs.indexOf(id);
	for (var v=startIndex; v<timeline.layerIDs.length; v++) {
		φAdd(document.getElementById(`layer_${timeline.layerIDs[v]}_group`), {'y': moveH});
		φAdd(document.getElementById(`layer_${timeline.layerIDs[v]}_text`), {'y': moveH});
	}

	//remove all the frame objects
	workspace_permanent.removeChild(document.getElementById(`layer_${id}`));

	//remove the timeline objects
	timeline_blocks.removeChild(document.getElementById(`layer_${id}_group`));
	timeline_text_container.removeChild(document.getElementById(`layer_${id}_text`));

	//remove from the timeline object
	delete timeline.l[id];
	timeline.layerIDs.splice(startIndex, 1);
	timeline.makeVisible();
}


/**
 * Creates timeline blocks on the range [startFrame, endFrame] inclusive
 * @param {String} layerID 
 * @param {Number} startFrame 
 * @param {Number} endFrame 
 */
function createTimelineBlocks(layerID, startFrame, endFrame) {
	var layerRef = timeline.l[layerID];
	var layerGroup = document.getElementById(`layer_${layerID}_group`);
	var id = φGet(layerRef[startFrame], 'uid');

	for (var a=startFrame; a<=endFrame; a++) {
		if (layerRef[a] != layerRef[a-1]) {
			id = φGet(layerRef[a], 'uid');
		}

		layerGroup.appendChild(φCreate("use", {
			'x': a * (timeline_blockW + 1),
			'id': `layer_${layerID}_frame_${a}`,
			'href': '#' + ((layerRef[a] != layerRef[a-1]) ? `MASTER_layerKey_${id}` : `MASTER_layer_${id}`)
		}));
	}
}

//sets the length of the animation (in frames) to a specified value
function changeAnimLength_user() {
	//ask the user
	//temp way, there's a better way to do this
	var newLength = prompt(`Please set the new timeline length`, timeline.len);
		
	newLength = +newLength ?? timeline.len;
	if (Number.isNaN(newLength) || newLength < 1) {
		alert(`Bad length value recieved.`);
		return;
	}


	newLength = Math.floor(newLength);
	changeAnimationLength(newLength);
	
}
function changeAnimationLength(newLength) {
	//break out if it's the same length
	if (newLength == timeline.len) {
		return;
	}

	//if it's shorter than the current length
	var oldLength = timeline.len;
	timeline.len = newLength;
	if (newLength < oldLength) {
		//loop through layers and set them all to the new length
		timeline.layerIDs.forEach(id => {
			timeline.l[id].splice(newLength, oldLength - newLength);

			//delete extra frames
			for (var z=oldLength-1; z>newLength-1; z--) {
				document.getElementById(`layer_${id}_frame_${z}`).remove();
			}
		});
		return;
	}

	//longer than the current length
	var copyFrame;
	timeline.layerIDs.forEach(lid => {
		//propogate the last frame forwards
		copyFrame = timeline.l[lid][oldLength-1];

		//extend, fill, and then update the visible timeline blocks
		timeline.l[lid][newLength-1] = copyFrame;
		timeline.l[lid].fill(copyFrame, oldLength, newLength-1);
		createTimelineBlocks(lid, oldLength, newLength-1);
	});
}

function clampWorkspace() {
	//make sure workspace is on the screen
	var [workX, workY, workW, workH, workS] = φGet(workspace_container, ["x", "y", "width", "height", "scaling"]);
	var [baseW, baseH] = φGet(base, ["width", "height"]);

	workX = clamp(workX, baseW * workspace_margin - workW * workS, baseW * (1 - workspace_margin * 2));
	workY = clamp(workY, baseH * workspace_margin - workH * workS, baseH * (1 - workspace_margin * 2));
	
	//if the entire workspace is small enough on the screen, center it
	// if (workW * workS < baseW * 0.6 && workH * workS < baseH * 0.6) {
	// 	workX = 0.5 * (baseW - workW * workS);
	// 	workY = 0.5 * (baseH - workH * workS);
	// }

	φSet(workspace_container, {x: workX, y: workY});
}


function createUid() {
	var chars = `abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZςερτυθιοπασδφγηξκλζχψωβνμ`;
	var idLen = 5;
	var uid = "";

	//represent the uid number as valid characters
	var h = 0;
	while (Math.floor(uidCount / (chars.length ** h)) > 0 || h == 0) {
		uid = chars[Math.floor(uidCount / (chars.length ** h)) % chars.length] + uid;
		h += 1;
	}

	uid = "x" + uid;
	uidCount += 1;
	return uid;
}

function cursorIsInBounds() {
	var [w, h] = φGet(base, ['width', 'height']);
	return (cursor.x > 0 && cursor.y > 0 && cursor.x < w && cursor.y < h);
}

function cursorWorkspaceCoordinates() {
	var box = workspace_background.getBoundingClientRect();
	var wh = φGet(workspace_background, ['width', 'height']);
	
	return [(cursor.x - box.x) / box.width * wh[0], (cursor.y - box.y) / box.height * wh[1]];
}

/**
 * Adds a path to a specified frame object.
 * @param {*} layerNode The frame object to add the path to
 * @param {Number[][]} pts The points that the path consists of
 * @param {Number} width How wide the path will be
 * @param {RGBAString} color the color of the path
 */
function layer_addPath(layerNode, pts, width, color) {
	var uid = φGet(layerNode, 'uid');
	var path;
	switch (pts.length) {
		case 2:
			path = `M ${pts[0][0]} ${pts[0][1]} ${pts[1][0]} ${pts[1][1]}`;
			break;
		case 3:
			path = `M ${pts[0][0]} ${pts[0][1]} Q ${pts[1][0]} ${pts[1][1]} ${pts[2][0]}`;
			break;
		case 4:
			path = `M ${pts[0][0]} ${pts[0][1]} C ${pts[1][0]} ${pts[1][1]} ${pts[2][0]} ${pts[2][1]} ${pts[3][0]} ${pts[3][1]}`;
			break;
		default:
			console.log(`don't know what to do with length: ${pts.length}`);
	}
	var node = φCreate("path", {
		'stroke': color, 
		'stroke-linecap': 'round',
		'fill': 'none', 
		'stroke-width': width, 
		'd': path
	});
	layerNode.children["lines"].appendChild(node);

	//if the layer was previously empty change to full
	if (layerNode.children["lines"].children.length == 1) {
		φSet(layerNode.querySelector(`#MASTER_layerKey_${uid}`), {'href': '#MASTER_frameFullKey'});
		φSet(layerNode.querySelector(`#MASTER_layer_${uid}`), {'href': '#MASTER_frameFull'});
	}
}

function appendToPath(pathNode, newPts) {
	var currentPath = φGet(pathNode, "d");
	//figure out whether the new points should go at the start or the end
}

function layer_create(frameID) {
	console.log(`creating ${frameID}`);
	ends[frameID] = {};
	var temp = φCreate('svg');
	temp.innerHTML =
	`<g id="frame_${frameID}" uid="${frameID}" display="none">
		<defs>
			<use id="MASTER_layerKey_${frameID}" href="#MASTER_frameEmptyKey"/>
			<use id="MASTER_layer_${frameID}" href="#MASTER_frameEmpty"/>
		</defs>
		<g id="lines"></g>
		<g id="fills"></g>
	</g>`;
	return temp.children[0];
}

//makes a copy of a layer
function layer_copy(layerNode) {
	var newLayer = layer_create(createUid());

	newLayer.children["lines"].innerHTML = layerNode.children["lines"].cloneNode(true).innerHTML;
	newLayer.children["fills"].innerHTML = layerNode.children["fills"].cloneNode(true).innerHTML;
	console.log(`copied from ${layerNode.id}`);

	//make sure the frame models are correct
	if (newLayer.children["lines"].children.length > 0 || newLayer.children["fills"].children.length > 0) {
		var uid = φGet(newLayer, 'uid');
		φSet(newLayer.querySelector(`#MASTER_layerKey_${uid}`), {'href': '#MASTER_frameFullKey'});
		φSet(newLayer.querySelector(`#MASTER_layer_${uid}`), {'href': '#MASTER_frameFull'});
	}
	return newLayer;
}


function moveWorkspace(x, y) {
	//holding control zooms instead of moving up/down
	if (button_control) {
		var [scale, w, h] = φGet(workspace_container, ["scaling", "width", "height"]);
		var workB = workspace_container.getBoundingClientRect();
		var hoverPos = [(cursor.x - workB.x) / scale, (cursor.y - workB.y) / scale];

		//keep scaling in bounds
		scale = clamp(scale * (1 + y * 0.001), ...workspace_scaleBounds);
		φSet(workspace_container, {
			'scaling': scale,
			'viewBox': `0 0 ${w / scale} ${h / scale}`
		});
		φSet(workspace_background, {'stroke-width': 2 / scale});

		workB = workspace_container.getBoundingClientRect();
		var [contX, contY] = φGet(workspace_container, ['x', 'y']);
		var newHoverPos = [(cursor.x - workB.x) / scale, (cursor.y - workB.y) / scale];

		φSet(workspace_container, {
			'x': +contX + (newHoverPos[0] - hoverPos[0]) * scale,
			'y': +contY + (newHoverPos[1] - hoverPos[1]) * scale
		});

		// var newHoverPos = canvasToWorkspace(cursor.x, cursor.y);
		// var delta = [newHoverPos[0] - hoverPos[0], newHoverPos[1] - hoverPos[1]];
		// workspace_offsetX += delta[0] * workspace_scaling;
		// workspace_offsetY += delta[1] * workspace_scaling;

	} else {
		φAdd(workspace_container, {
			x: -x,
			y: -y,
		});
	}
	clampWorkspace();
}

//takes in a set of points representing the vertices of a line (or closed polygon) and outputs a set of bezier curves that correspond to those lines
//taken from the potrace algorithm but extended to open lines - see https://potrace.sourceforge.net/potrace.pdf 
function potrace(points, isLoop) {
	//make sure there's at least something there
	if (points.length == 2) {
		return [points];
	}

	//controlling variables
	var corners = points;
	var cornerBuffer = 1.41;
	var lambMax = 1;
	var lambMin = 0.55;

	var curves = [];

	//get the points halfway between each vertex
	var halfs = [];
	for (var v=0; v<corners.length-1; v++) {
		halfs[v] = [(corners[v][0] + corners[v+1][0]) / 2, (corners[v][1] + corners[v+1][1]) / 2];
	}
	if (isLoop) {
		halfs[corners.length-1] = [(corners[0][0] + corners[corners.length-1][0]) / 2, (corners[0][1] + corners[corners.length-1][1]) / 2];
	}

	//oki doki - Bezier curves, especially the cubic ones, become very hard to calculate very quickly. So we're going to make some simplifications.
	//	1. Generated curves must span <180°, meaning that the whole curve can be inscribed in a triangle ABC with B and C corresponding to P0/P1, 
	//		and C0/C1 lying somewhere along AB and AC respectively.
	//	2. C0 and C1 have the same relative positions along AB and AC. This parameter is labelled λ.
	//from this, putting constraints on λ allows corner detection and other cool smoothing.

	for (var v=0; v<halfs.length-1; v++) {
		var cOut = potraceForTriangle(halfs[v], halfs[v+1], corners[v+1], cornerBuffer, lambMax, lambMin);
		if (cOut[0][0][0] == undefined) {
			curves.push(cOut);
		} else {
			curves.push(...cOut);
		}
	}


	//also add a first line + last line to avoid low detail weirdness
	curves.splice(0, 0, [points[0], curves[0][0]]);
	var len = curves.length;
	curves.push([curves[len-1][curves[len-1].length-1], points[points.length-1]]);

	return curves;
}

//corner = corners[v+1]
//p2 = halfs[v+1]
//p1 = halfs[v]
//takes in two points as well as a corner and outputs a cubic that approximates two original lines (p1->corner->p2)
function potraceForTriangle(p1, p2, corner, cornerBuffer, lambMax, lambMin) {
	//PART 1: get line from P0 to P1
	var lnVec = d2_normalize(d2_subtract(p2, p1));
	var lnVecPerp = [lnVec[1], -lnVec[0]];
	//if the corner is counterclockwise the line's normal vector has to be flipped around
	if (getOrientation(p1, p2, corner) == -1) {
		lnVecPerp[0] = -lnVecPerp[0];
		lnVecPerp[1] = -lnVecPerp[1];
	}

	//PART 2: figure out where to place parallel line that touches the corner buffer circle
	//this part can actually be bypassed with the power of geometry - triangle ABC is a larger triangle, 
	//triangle DBE is a smaller triangle with DE parallel to AB and angle B being the same in both cases, therefore DBE is a similar triangle scaled from ABC
	
	var lDist = pointLineDistance(corner, p1, p2);

	//make sure no negative lambdas occur
	var lamb = Math.max((4 / 3) * ((lDist - cornerBuffer) / lDist), lambMin);

	//corner detection
	if (lamb >= lambMax) {
		return [[[p1[0], p1[1]], [corner[0], corner[1]]], [[corner[0], corner[1]], [p2[0], p2[1]]]];
	}

	//main case
	return [
		[p1[0], p1[1]], 
		linterpMulti(p1, corner, lamb),
		linterpMulti(p2, corner, lamb),
		[p2[0], p2[1]]
	];
}

function bezierMerge() {

}



function setCanvasPreferences() {
	ctx.lineWidth = 8;
	ctx.textBaseline = "middle";
	
	//setting margins
	var workHeightAvailable = canvas.height * (1 - timeline.height - (workspace_margin * 2));
	workspace_scaling = workHeightAvailable / workspace_height;
	clampWorkspace();
}

//takes in a set of points, and uses the Ramer-Douglas-Peucker algorithm to make the line simpler
function simplifyLineRDP(points, tolerance) {
	//if it's already two points don't bother
	if (points.length == 2) {
		return points;
	}

	//find the point that's farthest away 
	var farthest = 0;
	var farthestDist = 0;
	var dist;
	for (var f=1; f<points.length-1; f++) {
		dist = pointSegmentDistance(points[f], points[0], points[points.length-1]);
		if (dist > farthestDist) {
			farthestDist = dist;
			farthest = f;
		}
	}
	
	//if it's inside the tolerance range, then all points between the two ends will be inside the tolerance and can therefore be deleted
	if (farthestDist < tolerance) {
		return [points[0], points[points.length-1]];
	}

	//if it's outside the tolerance, split the line into two lines and then do it for those (:
	var seg1 = simplifyLineRDP(points.slice(0, farthest+1), tolerance);
	var seg2 = simplifyLineRDP(points.slice(farthest), tolerance)
	seg1.pop();
	return seg1.concat(seg2);
}

//like before but saves the set of times that correspond to the points
//TODO: this is incomplete!
function simplifyLineRDPwithTime(points, tolerance, timingArr, start, end) {
	//start and end keep track of where in the array we are
	if (start == undefined) {
		start = 0;
		end = points.length - 1;
		//start and end will automatically be part of the simplified line
		timingArr.push(start, end);
	}

	if (start + 1 == end) {
		return points;
	}

	var farthest = 0;
	var farthestDist = 0;
	var dist;
	for (var f=start+1; f<end; f++) {
		dist = pointSegmentDistance(points[f], points[start], points[end]);
		if (dist > farthestDist) {
			farthestDist = dist;
			farthest = f;
		}
	}
	
	if (farthestDist < tolerance) {
		return [points[start], points[points.length-1]];
	}

	timingArr.push(farthest);
	var seg1 = simplifyLineRDPwithTime(points, tolerance, timingArr, start, farthest);
	var seg2 = simplifyLineRDPwithTime(points, tolerance, timingArr, farthest, end);
	seg1.pop();

	//if part of the outer loop, sort the timings
	if (start == 0 && end == points.length-1) {

	}
	return seg1.concat(seg2);
}

//removes duplicate points right next to each other
function simplifyLineDuplicates(points) {
	var newPts = [];
	var lastX = 1e1001;
	var lastY = 1e1001;
	for (var q=0; q<points.length; q++) {
		if (points[q][0] != lastX || points[q][1] != lastY) {
			[lastX, lastY] = points[q];
			newPts.push(points[q]);
		}
	}
	return newPts;
}

//given a set of points, generates an array of bezier curves to fit those points
function fitBezier(points, tolerance) {
	//figure out tangents at start/end
	var tanLeft = normalize(d2_subtract(points[1], points[0]));
	var tanRight = normalize(d2_subtract(points[points.length-2], points[points.length-1]));

	return fitBezier_h(points, tanLeft, tanRight, tolerance);
}

//helper method that does most of the work, but it's recursive and needs preparation the user won't do
function fitBezier_h(points, tanLeft, tanRight, errTolerance) {
	var iterTolerance = errTolerance ** 2;
	var iterMax = 4;
	//if there are only two points, approximate using the side tangents
	if (points.length == 2) {
		var computeDist = Math.sqrt((points[0][0] - points[1][0]) ** 2 + (points[0][1] - points[1][1]) ** 2);
		return [[
			[points[0][0], points[0][1]],
			d2_add(points[0], d2_scaleBy(tanLeft, computeDist)),
			d2_add(points[1], d2_scaleBy(tanRight, computeDist)),
			[points[1][0], points[1][1]]
		]];
	}

	//if there are more than two points, the bezier curve will need to be fitted onto them
	var timings = segmentTimings(points);
	var bezierOutput = fitBezier_initial(points, tanLeft, tanRight, timings);
	var [error, splitPoint] = fitBezier_error(points, timings, bezierOutput);
	//if the error is good, return the curve
	if (error < errTolerance) {
		return [bezierOutput];
	}

	//if the error is small enough, try to retime / remake the curve
	if (error < iterTolerance) {
		for (var m=0; m<iterMax; m++) {
			timings = retime(points, timings, bezierOutput);
			bezierOutput = fitBezier_initial(points, tanLeft, tanRight, timings);
			[error, splitPoint] = fitBezier_error(points, timings, bezierOutput);

			//error reduction is a success (:
			if (error < errTolerance) {
				return [bezierOutput];
			}
		}
	}
	


	//if retiming failed, split the curve at the point of most error and recurse
	var tanCenter = calculateTanCenter(points, splitPoint);
	return [].concat(fitBezier_h(points.slice(0, splitPoint+1), tanLeft, tanCenter, errTolerance), fitBezier_h(points.slice(splitPoint), d2_scaleBy(tanCenter, -1), tanRight, errTolerance))
}

//uses least-squares? look into this more
//credit goes to Philip J. Schneider
//credit does not go to him for an explanation though, because he appears to have magic code that neither him or anybody else will explain.
//the comments inside this function describe basic happenings. They do not describe why things are happening.
function fitBezier_initial(points, tanLeft, tanRight, timings) {
	var pointSpan = Math.sqrt((points[0][0] - points[points.length-1][0]) ** 2 + (points[0][1] - points[points.length-1][1]) ** 2);
	var zeroTolerance = 1e-6;
	var A = [];
	var C = [[0, 0], [0, 0]];
	var X = [0, 0];
	var scale1;
	var scale2;

	//A matrix
	for (var v=0; v<points.length; v++) {
		//compute As
		scale1 = bMystery(1, timings[v]);
		scale2 = bMystery(2, timings[v]);
		A[v] = [[tanLeft[0] * scale1, tanLeft[1] * scale1], [tanRight[0] * scale2, tanRight[1] * scale2]];
	}

	//C + X matrices
	var buffer1;
	for (var w=0; w<A.length; w++) {
		C[0][0]  += d2_dot(A[w][0], A[w][0]);
		C[0][1] += d2_dot(A[w][0], A[w][1]);
		C[1][0] = C[0][1];
		C[1][1] += d2_dot(A[w][1], A[w][1]);

		buffer1 = d2_subtract(points[w], 
			d2_add(
				d2_scaleBy(points[0], bMystery(0, timings[w])), 
				d2_add(
					d2_scaleBy(points[0], bMystery(1, timings[w])),
					d2_add(
						d2_scaleBy(points[points.length-1], bMystery(2, timings[w])),
						d2_scaleBy(points[points.length-1], bMystery(3, timings[w]))
					)
				)
			)
		);

		//dot products
		X[0] += d2_dot(A[w][0], buffer1);
		X[1] += d2_dot(A[w][1], buffer1);
	}

	//calculate matrix determinants
	var det_c0c1 = C[0][0] * C[1][1] - C[1][0] * C[0][1];
	var det_c0x = C[0][0] * X[1] - C[1][0] * X[0];
	var det_xc1 = X[0] * C[1][1] - X[1] * C[0][1];
	var alphaLeft = (det_c0c1 == 0) ? 0 : det_xc1 / det_c0c1;
	var alphaRight = (det_c0c1 == 0) ? 0 : det_c0x / det_c0c1;

	//alpha < 0 is bad, and alpha = 0 means control points intersect with first/last points (also bad)
	if (alphaLeft < zeroTolerance || alphaRight < zeroTolerance) {
		var dist = pointSpan / 3;
		return [
			[points[0][0], points[0][1]],
			d2_add(points[0], d2_scaleBy(tanLeft, dist)),
			d2_add(points[points.length-1], d2_scaleBy(tanRight, dist)),
			[points[points.length-1][0], points[points.length-1][1]]
		];
	}

	//bezier points go at the start/end points, and then alpha is the length of the control point rods
	return [
		[points[0][0], points[0][1]],
		d2_add(points[0], d2_scaleBy(tanLeft, alphaLeft)),
		d2_add(points[points.length-1], d2_scaleBy(tanRight, alphaRight)),
		[points[points.length-1][0], points[points.length-1][1]]
	];
}

function bMystery(n, u) {
	var uI = 1 - u;
	switch (n) {
		case 0:
			return uI*uI*uI;
		case 1:
			return 3*u*uI*uI;
		case 2:
			return 3*u*u*uI;
		case 3:
			return u*u*u;
	}
}

//says how much error is in a bezier fitting
function fitBezier_error(points, timings, curve) {
	//TODO: does deviation from ComputeMaxError cause issues?
	var error = 0;
	var errorPoint = 0;

	var bestP;
	var dist;
	for (var p=0; p<points.length; p++) {
		bestP = bezierPointFromT(...curve, timings[p]);	
		dist = (points[p][0] - bestP[0]) ** 2 + (points[p][1] - bestP[1]) ** 2;
		if (dist > error) {
			error = dist;
			errorPoint = p;
		}
	}


	return [error, errorPoint];
}

function calculateTanCenter(points, pointIndex) {
	var tanLeft = d2_subtract(points[pointIndex-1], points[pointIndex]);
	var tanRight = d2_subtract(points[pointIndex], points[pointIndex+1]);
	var avg = [(tanLeft[0] + tanRight[0]) / 2, (tanLeft[1], tanRight[1]) / 2];

	//if the tangent is directionless (bad, would create NaNs)
	if (avg[0] == 0 && avg[1] == 0) {
		avg = rotate(tanLeft[0], tanLeft[1], Math.PI / 2);
	}
	return normalize(avg);
}

function retime(points, initialTimings, curve) {
	var uNew = [];
	for (var q=points.length-1; q>=0; q--) {
		uNew[q] = retime_findRoot(points[q], initialTimings[q], curve);
	}
	return uNew;
}

//run newton's method on the error as a function of time  
function retime_findRoot(point, time, curve) {
	//find f(t) = E
	var curvei = [];
	var curveii = [];
	
	for (var p=2; p>=0; p--) {
		curvei[p] = [
			(curve[p+1][0] - curve[p][0]) * 3,
			(curve[p+1][1] - curve[p][1]) * 3,
		];
	}
	
	for (p=1; p>=0; p--) {
		curveii[p] = [
			(curvei[p+1][0] - curvei[p][0]) * 2,
			(curvei[p+1][1] - curvei[p][1]) * 2,
		];
	}

	var bestP = bezierPointFromT(...curve, time);
	var bestPi = quadraticPointFromT(...curvei, time);
	var bestPii = [linterp(curveii[0][0], curveii[1][0], time), linterp(curveii[0][1], curveii[1][1], time)];

	//find slope
	var num = (bestP[0] - point[0]) * bestPi[0] + (bestP[1] - point[1]) * bestPi[1];
	var denom = (bestPi[0] * bestPi[0]) + (bestPi[1] * bestPi[1]) + (bestP[0] - point[0]) * bestPii[0] + (bestP[1] - point[1]) * bestPii[1];

	//add f(t)
	return (denom == 0) ? 0 : time - (num / denom);
}

function rotate(x, z, radians) {
	var sin = Math.sin(radians);
	var cos = Math.cos(radians);
	return [x * cos - z * sin, z * cos + x * sin];
}

function smooth(points, type) {
	//make sure points is large enough
	if (points.length < 3) {
		return points;
	}
/*
	// Helper method to pick the right from / to indices.
	// Supports numbers and segment objects.
	// For numbers, the `to` index is exclusive, while for segments and
	// curves, it is inclusive, handled by the `offset` parameter.
	function getIndex(value, _default) {
		// Support both Segment and Curve through #index getter.
		var index = value && value.index;
		if (index != null) {
			// Make sure the segment / curve is not from a wrong path.
			var path = value.path;
			if (path && path !== that)
				throw new Error(value._class + ' ' + index + ' of ' + path
						+ ' is not part of ' + that);
			// Add offset of 1 to curves to reach their end segment.
			if (_default && value instanceof Curve)
				index++;
		} else {
			index = typeof value === 'number' ? value : _default;
		}
		// Handle negative values based on whether a path is open or not:
		// Ranges on closed paths are allowed to wrapped around the
		// beginning/end (e.g. start near the end, end near the beginning),
		// while ranges on open paths stay within the path's open range.
		return Math.min((index < 0 && closed) ? index % length : ((index < 0) ? index + length : index, length - 1));
	}

	var loop = closed && opts.from === undefined && opts.to === undefined,
		from = getIndex(opts.from, 0),
		to = getIndex(opts.to, length - 1);

	if (from > to) {
		[from, to] = [to, from];
	} */


	// Taken from paperjs Path.smooth function
	var asymm = (type == 'asymmetric');
	var amount = points.length;
	var n = amount - 1;

	
	//mystery algorithm """"""""Thomas""""""""??
	var x = points[0][0] + 2 * points[1][0];
	var y = points[0][1] + 2 * points[1][1];
	var a, b, u, v, m;
	var f = 2;
	var n1 = n - 1;
	var rx = [x];
	var ry = [y];
	var rf = [f];
	var px = [];
	var py = [];
	for (var i=1; i<n; i++) {
		var internal = i < n1;
		[a, b, u, v] = [
			internal ? 1 : asymm ? 1 : 2,
			internal ? 4 : asymm ? 2 : 7,
			internal ? 4 : asymm ? 3 : 8,
			internal ? 2 : asymm ? 0 : 1,
		];
		m = a / f;
		f = rf[i] = b - m;
		x = rx[i] = u * points[i][0] + v * points[i+1][0] - m * x;
		y = ry[i] = u * points[i][1] + v * points[i+1][1] - m * y;
	}

	px[n1] = rx[n1] / rf[n1];
	py[n1] = ry[n1] / rf[n1];
	for (var i=n-2; i>=0; i--) {
		px[i] = (rx[i] - px[i+1]) / rf[i];
		py[i] = (ry[i] - py[i+1]) / rf[i];
	}
	px[n] = (3 * points[n][0] - px[n1]) / 2;
	py[n] = (3 * points[n][1] - py[n1]) / 2;

	// Now update the segments
	var curves = [];
	for (var i=0; i</*=*/n; i++) {
		console.log([
			points[i],
			[points[i][0] + px[i] - points[i][0], points[i][1] + py[i] - points[i][1]],
			[points[i+1][0] + points[i+1][0] - px[i+1], points[i][1] + points[i+1][1] - py[i+1]],
			points[i+1]
		]);
		curves.push([
			points[i],
			[points[i][0] + px[i] - points[i][0], points[i][1] + py[i] - points[i][1]],
			[points[i+1][0] + points[i+1][0] - px[i+1], points[i][1] + points[i+1][1] - py[i+1]],
			points[i+1]
		]);

		// var hx = px[i] - points[i][0];
		// var hy = py[i] - points[i][1];
		// if (i < n)  {
		// 	//C(i1)
		// 	points[i].setHandleOut(hx, hy);
		// }
		// if (i > 0) {
		// 	//C(i0)
		// 	points[i].setHandleIn(-hx, -hy);
		// }
	}
	return curves;
}

function updateCursorPos(a) {
	var area = base.getBoundingClientRect();
	var past = [cursor.x, cursor.y];
	cursor.x = a.clientX - area.left;
	cursor.y = a.clientY - area.top;


	cursor.dx = cursor.x - past[0];
	cursor.dy = cursor.y - past[1];
	cursor.dist += Math.sqrt((cursor.x - past[0]) ** 2 + (cursor.y - past[1]) ** 2);
	cursor.a = Math.atan2(cursor.y - past[1], cursor.x - past[0]);
}