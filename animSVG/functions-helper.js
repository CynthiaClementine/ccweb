/*
INDEX

φOver(node)

addLayer(name)
appendToPath(pathNode, newPts)
createTimelineBlocks(layerID, startFrame, endFrame)

changeAnimLength_user()
changeAnimLength()
changeFPS_user()
changeFramerate()
clampWorkspace()
createUID()
cursorIsInBounds()
cursorWorkspaceCoordinates()
createSpline(curves, color, pathWidth)
frame_addPath(layerNode, curves, width, color)
frame_removePath(layerNode, spline)
makeUnKeyframe(layerIndex, frame)

moveWorkspace(x, y)

removeLayer(id)

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
	var frameObj = frame_create(frameID);
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
	workspace_permanent.insertBefore(layerObj, workspace_permanent.children[0]);
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
		'text-anchor': 'end',
		'innerHTML': name,
		'noselect': 'on',
		'onclick': `renameLayer("${layerID}")`
	}));

	createTimelineBlocks(layerID, 0, timeline.len-1);
	updateTimelineExtender();
	//update the timeline's visibility
	timeline.makeVisible();
	return true;
}

function appendToPath(pathNode, newPts) {
	var currentPath = φGet(pathNode, "d");
	//figure out whether the new points should go at the start or the end
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
	} else {
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

	updateTimelineExtender();
	setOnionWingLengths();
}

function changeFPS_user() {
	var newFPS = parseInt(prompt(`Enter new animation frames per second`, timeline.fps));
	if (Number.isNaN(newFPS)) {
		return;
	}

	//if the framerate is out of bounds
	if (newFPS < fps_limitMin || newFPS > fps_limitMax) {
		if (newFPS < fps_limitMin) {
			alert(`This framerate is too low. The framerate must be at least ${fps_limitMin} and no more than ${fps_limitMax}.`);
		} else {
			alert(`This framerate is too high. The framerate must be at least ${fps_limitMin} and no more than ${fps_limitMax}.`);
		}
		newFPS = clamp(newFPS, fps_limitMin, fps_limitMax);
	}

	//actually changing the framerate
	changeFramerate(newFPS);
	
}

function changeFramerate(newFPS) {
	timeline.fps = newFPS;
	timeline_fps.innerHTML = `fps: ${newFPS}`;
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
 * Creates a spline object to be added to the DOM
 * @param {Number[][][]} curves Coordinates of the curves the spline consists of
 * @param {RGBAString} color the color of the spline path
 * @param {Number} pathWidth the width of the path
 * @returns {Spline} A Spline Path object
 */
function createSpline(curves, color, pathWidth) {
	var node = φCreate("path", {
		'stroke': color, 
		'stroke-linecap': 'round',
		'fill': 'none', 
		'stroke-width': pathWidth, 
	});

	//element functions
	//I have to do this silly python-esque thing but I suppose I'll live with it
	var self = node;
	node.getPointFromT = (t) => {
		var bRef = self.curves[Math.floor(t)];
		switch (bRef.length) {
			case 2:
				return linterpMulti(bRef[0], bRef[1], t % 1);
			case 3:
				return quadraticPointFromT(bRef[0], bRef[1], bRef[2], t % 1);
			case 4:
				return bezierPointFromT(bRef[0], bRef[1], bRef[2], bRef[3], t % 1);
			default:
				console.error(`unknown number of points!`);
		}
	}
	node.calculateBoundingBox = () => {
		//take all the smaller bounding boxes and add them up
		var initialBounds = [1e1001, 1e1001, -1e1001, -1e1001];
		self.curves.forEach(c => {
			var smolBound;
			switch (c.length) {
				case 2:
					//it's short enough that I can sort manually
					smolBound = [c[0][0], c[0][1], c[1][0], c[1][1]];
					if (smolBound[0] > smolBound[2]) {
						[smolBound[0], smolBound[2]] = [smolBound[2], smolBound[0]]
					}
					if (smolBound[1] > smolBound[3]) {
						[smolBound[1], smolBound[3]] = [smolBound[3], smolBound[1]]
					}
					break;
				case 3:
					smolbound = quadraticBounds(c[0], c[1], c2);
					break;
				case 4:
					smolBound = bezierBounds(c[0], c[1], c[2], c[3]);
					break;
			}
			initialBounds[0] = Math.min(initialBounds[0], smolBound[0]);
			initialBounds[1] = Math.min(initialBounds[1], smolBound[1]);
			initialBounds[2] = Math.max(initialBounds[2], smolBound[2]);
			initialBounds[3] = Math.max(initialBounds[3], smolBound[3]);
		});
	}
	//uses curves array to recalculate the path
	node.redraw = () => {
		var path = `M ${curves[0][0][0]} ${curves[0][0][1]}`;
		curves.forEach(j => {
			switch (j.length) {
				case 2:
					path += ` L ${j[1][0]} ${j[1][1]}`;
					break;
				case 3:
					path += ` Q ${j[1][0]} ${j[1][1]} ${j[2][0]}`;
					break;
				case 4:
					path += ` C ${j[1][0]} ${j[1][1]} ${j[2][0]} ${j[2][1]} ${j[3][0]} ${j[3][1]}`;
					break;
				default:
					console.log(`don't know what to do with length: ${j.length}`);
			}
		});
		φSet(self, {'d': path});
	}
	node.splitAt = (t) => {
		//if t is an integer this is extremely easy
		if (t % 1 == 0) {
			//trivial cases
			if (t == 0) {
				return [self, undefined];
			}
			if (t == self.curves.length - 1) {
				return [undefined, self];
			}

			return [createSpline(self.curves.slice(0, t), self.color, self.pathWidth), createSpline(self.curves.slice(t), self.color, self.pathWidth)];
		}

		//if t isn't an integer have to cut the curve that it goes through
		var cut = self.curves[Math.floor(t)];
		switch (cut.length) {
			case 2:
				break;
			case 3:
				break;
			case 4:
				cut = bezierSplit(cut[0], cut[1], cut[2], cut[3], t % 1);
				break;
		}

		//beginning
		var start = self.curves.slice(0, Math.floor(t));
		start.push(cut[0]);
		start = createSpline(start, self.color, self.pathWidth);
		//end
		var end = end.curves.slice(Math.ceil(t));
		end.splice(0, 0, cut[1]);
		end = createSpline(end, self.color, self.pathWidth);
	}
	//give the element its properties
	node.curves = curves;
	node.color = color;
	node.start = curves[0][0];
	node.end = curves[curves.length-1][curves[curves.length-1].length-1];
	node.redraw();
	node.calculateBoundingBox();

	return node;
}

//gives the cursor's [x, y] coordinates relative to a node
function cursorRelativeTo(node) {
	var box = node.getBoundingClientRect();
	return [cursor.x - box.x, cursor.y - box.y];
}



/**
 * Adds a Spline to a specified frame object.
 * A Spline is made up of a set of curves that are either linear, quadratic, or bezier. This set of curves nominally does not intersect itself or other path objects.
 * @param {*} layerNode The frame object to add the spline to
 * @param {Spline} spline the Spline path object to add
 */
function frame_addPath(layerNode, spline) {
	var uid = φGet(layerNode, 'uid');
	var curves = spline.curves;

	//first add the cubics to all necessary bins
	curves.forEach(c => {
		var bbox;
		switch(c.length) {
			case 2:
				bbox = [c[0][0], c[0][1], c[1][0], c[1][1]];
				break;
			case 3:
				bbox = quadraticBounds(c[0], c[1], c[2]);
				break;
			case 4:
				bbox = bezierBounds(c[0], c[1], c[2], c[3]);
				break;
		}

		var bboxBins = bbox.map(n => Math.floor(n / cubicBinSize));
		var tIntersects = [];
		for (var x=bboxBins[0]; x<=bboxBins[2]; x++) {
			for (var y=bboxBins[1]; y<=bboxBins[3]; y++) {
				
				//make sure the bin exists before placing objects into it
				if (layerNode.cubicBins[x] == undefined) {
					layerNode.cubicBins[x] = [];
				}

				if (layerNode.cubicBins[x][y] == undefined) {
					layerNode.cubicBins[x][y] = [];
				}

				/*
				//test for intersections within the bin
				var curveNums = bezIntersections(c, layerNode.cubicBins[x][y]);

				//if there are intersections split the existing curve(s)? and then add the pre-intersection curve to the canvas
				if (curveNums.length > 0) {
					splitPathsAt(layerNode, x, y);
				} */

				//actual placing
				layerNode.cubicBins[x][y].push(c);
			}
		}
	});

	// var bboxBins = ;


	layerNode.lines.appendChild(spline);

	//if the layer was previously empty change to full
	if (layerNode.lines.children.length == 1) {
		φSet(layerNode.querySelector(`#MASTER_layerKey_${uid}`), {'href': '#MASTER_frameFullKey'});
		φSet(layerNode.querySelector(`#MASTER_layer_${uid}`), {'href': '#MASTER_frameFull'});
	}
}

/**
 * Removes a path from a specified frame object
 * @param {Frame} layerNode the frame object the spline belongs to
 * @param {Spline} spline the spline path object to remove
 */
function frame_removePath(layerNode, spline) {
	//go through the curves and remove them from the curve bins
	var bbox;
	spline.curves.forEach(c => {
		bbox = (c.length == 2) ? [c[0][0], c[0][1], c[1][0], c[1][1]] : bezierBounds(c[0], c[1], c[2], c[3]);
		bbox = bbox.map(a => Math.floor(a / cubicBinSize));

		//remove a curve from every bin it is in
		for (var x=bbox[0]; x<=bbox[2]; x++) {
			for (var y=bbox[1]; y<=bbox[3]; y++) {
				layerNode.cubicBins[x][y].splice(layerNode.cubicBins[x][y].indexOf(c), 1);
			}
		}
	});
	
	//TODO: for when I add spline bins
	
	//get the bounding box
	
	//remove the spline
	layerNode.lines.removeChild(spline);
}

/**
 * Splits all the paths that go through a specified xy point on a specified layer
 * @param {Frame} layer the frame object paths belong to
 * @param {Number} x the workspace X to split at
 * @param {Number} y the workspace Y to split at
 */
function splitPathsAt(layer, x, y) {
	var p = [x, y];
	var plancLen = 0.5 / (10 ** quantizeTo);
	//first locate the bin with the xy coordinates
	var binX = Math.floor(x / cubicBinSize);
	var binY = Math.floor(y / cubicBinSize);

	//give up if there are no cubics in the bin
	if ((layer.cubicBins[binX][binY] ?? []).length == 0) {
		return;
	}

	//find all the valid cubics that share those coordinates
	var valCubics = [];
	layer.cubicBins[binX][binY].forEach(a => {
		if (a.length == 2) {
			if (pointLineIntersect(p, a[0], a[1], plancLen)) {
				valCubics.push(a);
			}
		} else {
			if (pointBezierIntersect(p, a[0], a[1], a[2], a[3], plancLen)) {
				valCubics.push(a);
			}
		}
	});

	//make sure there are at least some cubics left
	if (valCubics.length == 0) {
		return;
	}
	
	//use the selected cubics to find their spline parents, and split the splines
	//TODO: the splines should be binned as well? perhaps in a separate bin set
	var splinBin = layer.lines.children;
	var valSplines = [];
	var valCubicsOrder = [];
	for (var b=0; b<splinBin.length; b++) {
		for (var c=0; c<valCubics.length; c++) {
			if (splinBin[b].curves.includes(c)) {
				valSplines.push(splinBin[b]);
				//there can only be one spline per curve, and similarly one curve per spline
				//this lets me remove matched curves from the list, and skip to the end after a match
				valCubics.splice(c, 1);
				valCubicsOrder.push(c);
				c = valCubics.length;
			}
		}
	}

	//make sure not to select splines where the end of the spline is the split-point (avoid causing a spline with 0 size)
	var l = 0;
	valSplines.forEach(s => {
		//to cut the spline, figure out which t it should be cut
		var calcT = s.curves.indexOf(valCubicsOrder[l]);
		calcT = calcT + bezierTFromPoint(x, y);
		//cut the spline into its parts


		var cut = s.splitAtT(calcT);


		//remove the original spline
		frame_removePath()

		//add the cut portions

		l += 1;
	});

	frame_xj.lines.children[0].curves
	
	// for (v)
		
}

/**
 * Returns a list of numbers corresponding to the indeces of testCurves that intersect the first curve
 * @param {Number[][]} curve New potentially intersecting curve. Can be between two and four 2d points
 * @param {Number[][][]} testCurves Array of curves
 */
function bezIntersections(curve, testCurves) {
	var nums = [];
	var totLen;
	var plancLen = 0.5 / (10 ** quantizeTo);

	for (var g=0; g<testCurves.length; g++) {
		totLen = testCurves[g].length + curve.length;

		//handle collision with different curves differently
		switch (totLen) {
			case 4:
				if (lineIntersect(curve[0], curve[1], testCurves[g][0], testCurves[g][1])) {
					nums.push(g);
				}
				break;
			case 6:
				if (curve.length == 4) {
					if (lineBezierIntersect(testCurves[g][0], testCurves[g][1], curve[0], curve[1], curve[2], curve[3])) {
						nums.push(g);
					}
				} else {
					if (lineBezierIntersect(curve[0], curve[1], testCurves[g][0], testCurves[g][1], testCurves[g][2], testCurves[g][3])) {
						nums.push(g);
					}
				}
				break;
			case 8:
				if (bezierBezierIntersect(curve[0], curve[1], curve[2], curve[3], testCurves[g][0], testCurves[g][1], testCurves[g][2], testCurves[g][3], plancLen)) {
					nums.push(g);
				}
				break;
			default:
				console.log(`hmn why ${curve.length}?`);
		}
	}

	return nums;
}

/**
 * Creates a frame g object that can hold svg content
 * @param {String} frameID the ID for the frame to have
 * @param {String} layerID OPTIONAL: the ID of the layer the frame should be placed into
 * @returns the new frame
 */
function frame_create(frameID, layerID) {
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
	temp = temp.children[0];

	//set reflecting properties
	temp.lines = temp.children["lines"];
	temp.fills = temp.children["fills"];

	//set methods
	temp.fill = (x, y) => {
		//try to fill that space

		//cast a ray to the right
		// var rayCast =

		//if there's no objects it won't work

		//if there is, trace it around until the path gets back to the start

		//that loop is the region to fill
	}

	//properties
	var wh = φGet(workspace_background, ['width', 'height']);
	temp.cubicBins = [];
	for (var y=0; y<Math.ceil(wh[1]/cubicBinSize); y++) {
		temp.cubicBins.push([]);
		for (var x=0; x<Math.ceil(wh[0]/cubicBinSize); x++) {
			temp.cubicBins[y].push([]);
		}
	}

	if (layerID) {
		document.getElementById(`layer_${layerID}`).appendChild(temp);
	}
	return temp;
}

//makes a copy of a frame
function frame_copy(frameNode, layerID) {
	var newLayer = frame_create(createUid());

	//have to reference children here to make sure the references don't get misaligned
	
	newLayer.children["lines"].innerHTML = frameNode.lines.cloneNode(true).innerHTML;
	newLayer.children["fills"].innerHTML = frameNode.fills.cloneNode(true).innerHTML;
	newLayer.lines = newLayer.children["lines"];
	newLayer.fills = newLayer.children["fills"];
	console.log(`copied from ${frameNode.id}`);

	//make sure the frame models are correct
	if (newLayer.lines.children.length > 0 || newLayer.fills.children.length > 0) {
		var uid = φGet(newLayer, 'uid');
		φSet(newLayer.querySelector(`#MASTER_layerKey_${uid}`), {'href': '#MASTER_frameFullKey'});
		φSet(newLayer.querySelector(`#MASTER_layer_${uid}`), {'href': '#MASTER_frameFull'});
	}

	if (layerID) {
		document.getElementById(`layer_${layerID}`).appendChild(newLayer);
	}
	return newLayer;
}


function moveWorkspace(x, y) {
	//holding control zooms instead of moving up/down
	if (button_force) {
		zoom(cursor.x, cursor.y, clamp(φGet(workspace_container, "scaling") * (1 + y * 0.001), ...workspace_scaleBounds));

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

function setOnionWingLengths() {
	//toggle the side selectors
	var lenPast = Math.min(timeline.t, timeline.onionBounds[0]);
	var lenFuture = Math.min(timeline.len - 1 - timeline.t, timeline.onionBounds[1]);
	var wPast = lenPast * (timeline_blockW + 1);
	var wFuture = lenFuture * (timeline_blockW + 1);

	wPast = Math.max(wPast, 1);
	wFuture = Math.max(wFuture, 1);

	φSet(onionLeft, {
		'width': wPast,
		'x': -wPast + 0.1,
	});
	φSet(onionRight, {
		'width': wFuture,
		'x': timeline_blockW,
	});
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

function rotate(x, z, radians) {
	var sin = Math.sin(radians);
	var cos = Math.cos(radians);
	return [x * cos - z * sin, z * cos + x * sin];
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

function zoom(x, y, newZoom) {
	var [scale, w, h] = φGet(workspace_container, ["scaling", "width", "height"]);
	var workB = workspace_container.getBoundingClientRect();
	var hoverPos = [(x - workB.x) / scale, (y - workB.y) / scale];

	φSet(workspace_container, {
		'scaling': newZoom,
		'viewBox': `0 0 ${w / newZoom} ${h / newZoom}`
	});
	φSet(workspace_background, {'stroke-width': 2 / newZoom});

	workB = workspace_container.getBoundingClientRect();
	var [contX, contY] = φGet(workspace_container, ['x', 'y']);
	var newHoverPos = [(x - workB.x) / newZoom, (y - workB.y) / newZoom];

	φSet(workspace_container, {
		'x': +contX + (newHoverPos[0] - hoverPos[0]) * newZoom,
		'y': +contY + (newHoverPos[1] - hoverPos[1]) * newZoom
	});
}

function renameLayer(layerID) {
	var illegalChars = ["\\", "\n", "\t", "<", ">"];
	var newName = prompt(`Please enter the new layer name`, timeline.names[layerID]);
	var newName2 = newName;
	for (var v=0; v<illegalChars.length; v++) {
		newName2 = newName2.replaceAll(illegalChars[v], "");
	}
	if (!newName || newName == "") {
		return;
	}
	//do the actual changing
	timeline.names[layerID] = newName2;
	document.getElementById(`layer_${layerID}_text`).innerHTML = newName2;
	if (newName2 != newName) {
		alert(`Your layer name contained one or more illegal characters. These have been removed from the new name.`);
	}
}