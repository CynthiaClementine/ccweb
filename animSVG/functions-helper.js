/*
INDEX

φOver(node)

addLayer(name)
appendToPath(pathNode, newPts)
createTimelineBlocks(layerID, startFrame, endFrame)

changeAnimationLength()
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
	var index = timeline.layerIDs.indexOf(layerID);

	//if the layer's text doesn't exist, create it
	if (document.getElementById(`layer_${layerID}_text`) == undefined) {
		timeline_text_container.appendChild(φCreate("text", {
			'x': -5,
			'y': (index + 0.55) * (timeline_blockH + 1) + timeline_headHeight,
			'id': `layer_${layerID}_text`, 
			'class': 'textTimeline',
			'text-anchor': 'end',
			'innerHTML': timeline.names[layerID],
			'noselect': 'on',
			'onclick': `renameLayer("${layerID}")`
		}));
	}

	//if the layer's group doesn't exist, create it
	if (layerGroup == undefined) {
		layerGroup = φCreate("svg", {
			'y': index * (timeline_blockH + 1) + timeline_headHeight,
			'id': `layer_${layerID}_group`,
			'overflow': 'visible',
		});
		timeline_blocks.appendChild(layerGroup);
	}
	
	//put blocks into the timeline
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

function changeAnimationLength(newLength) {
	//break out if it's the same length
	if (newLength == timeline.len) {
		return;
	}

	//set the timeout for length changing

	//if it's shorter than the current length
	var labPer = timeline_labelPer;
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

		//remove label text
		for (var k=Math.ceil(newLength/labPer) * labPer; k<oldLength; k+=labPer) {
			document.getElementById(`label_${k}`).remove();
		}
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


		
		//add label text
		//make sure to include the 0
		if (oldLength == 1) {
			oldLength = 0;
		}
		var labHeight = (timeline_headHeight / 2) + 1;
		for (var k=Math.ceil(oldLength/labPer) * labPer; k<newLength; k+=labPer) {
			timeline_labels.appendChild(φCreate("text", {
				'x': (timeline_blockW + 1) * (k + 0.5),
				'y': labHeight,
				'id': `label_${k}`, 
				'class': 'textTimelineLength',
				'text-anchor': 'middle',
				'innerHTML': k,
				'noselect': 'on',
			}));
		}
	}

	updateTimelineExtender();
	setOnionWingLengths();
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
	var idLen = 5;
	var uid = "";

	//represent the uid number as valid characters
	var h = 0;
	while (Math.floor(uidCount / (uidChars.length ** h)) > 0 || h == 0) {
		uid = uidChars[Math.floor(uidCount / (uidChars.length ** h)) % uidChars.length] + uid;
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
 * Creates a fill object to be added to the DOM
 * @param {*} curves Coordinates of the curves the fill consists of
 * @param {*} color The color of the fill
 */
function createFill(loops, color) {
	var node = φCreate("path", {
		'fill': color,
		'stroke': 'none',
		//evenodd allows the loops to be in any order
		'fill-rule': 'evenodd'
	});
	node = Fill(node, loops);
	node.redraw();
	return node;
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
		'stroke-width': pathWidth
	});

	node = Spline(node, curves);
	node.redraw();

	return node;
}

/**
 * Given a set of points corresponding to connected straight lines, returns the connected curves that correspond to those lines
 * @param {Frame} frameObj 
 * @param {Number[][]} edges 
 */
function curvesFromEdgePath(frameObj, edges, tolerance) {
	var debugCurves = true;
	if (debugCurves) {console.log(`in`);}
	var attempts = 1000;
	var path, pt, bin;
	var paths = [];
	while (edges.length > 0) {
		//might as well start at the start
		pt = edges[0];
		if (debugCurves) {console.log(pt);}
		bin = frameObj.binAt(pt[0], pt[1]);
		if (debugCurves) {
			bin.forEach(b => {
				assignRID(b);
			});
			console.log(bin.map(a => a.id), bin.filter(s => s.intersectsPoint(pt[0], pt[1])).map(a => a.id));
		}
		bin = bin.filter(s => s.intersectsPoint(pt[0], pt[1]));

		//if there are no splines in the bin, how?
		if (bin.length == 0) {
			console.log(`mystery issue`);
			return [];
		}

		//pick random points until there's only one curve that the point is on
		while (bin.length != 1 && attempts > 0) {
			attempts -= 1;
			pt = edges[floor(randomBounded(0, edges.length-0.01))];
			bin = frameObj.binAt(pt[0], pt[1]).filter(s => s.intersectsPoint(pt[0], pt[1]));
		}

		if (attempts == 0) {
			console.log(`oops, all corners!`);
			return [];
		}

		//since there's only one spline, can be sure that the selected point is in the middle of the spline and therefore the entire spline is on the path
		paths.push(bin[0]);

		//remove all the points on that path
		edges = edges.filter(a => !(bin[0].intersectsPoint(a[0], a[1])));

		//repeat this process until all the points have been consumed
	}

	if (debug_active) {
		paths.forEach(p => {
			φSet(p, {'stroke': "#FFF"});
		});
	}
	return loopifyPaths(paths);
}

/**
 * takes in a series of coordinates and arranges them into loops
 * @param {Number[][][]} paths 
 * @returns {Number[][][][]} The array of loops
 */
function loopifyPaths(paths) {
	//fill requirements result in a series of loops
	var loopsList = [];

	//if the start and end are the same the curve is a finished loop by itself, and therefore should be removed
	for (var q=0; q<paths.length; q++) {
		if (d2_distance(paths[q].start, paths[q].end) < φGet(paths[q], "stroke-width")) {
			loopsList.push([paths[q].curves]);
			paths.splice(q, 1);
			q -= 1;
		}
	}

	if (paths.length == 0) {
		return loopsList;
	}

	//now that we're past that initial step, longer loops can be checked
	var protoPath;
	var oldEnd, newStart, newEnd;

	//after getting a loop, splice it out - repeat until no loops left
	while (paths.length > 0) {
		protoPath = loopifyOnce(paths);
		console.log(`found loop with ${protoPath.length} splines: ${JSON.stringify(protoPath.map(a => a.id))}`);

		//remove all the paths that constitute that loop, and convert the loop into coordinates
		for (var s=0; s<protoPath.length; s++) {
			paths.splice(paths.indexOf(protoPath[s]), 1);
			protoPath[s] = protoPath[s].curves;

			//if the start and end don't match up, flip the curve so they do
			if (s > 0) {
				oldEnd = protoPath[s-1][protoPath[s-1].length-1];
				oldEnd = oldEnd[oldEnd.length-1];
				newStart = protoPath[s][0][0];
				newEnd = protoPath[s][protoPath[s].length-1];
				newEnd = newEnd[newEnd.length-1];
				//can't just test for same-ness since there may be tiny differences 
				console.log(`testing difference between ${oldEnd} -> ${newStart} and ${oldEnd} -> ${newEnd}`);
				if (d2_distSquared(oldEnd, newStart) > d2_distSquared(oldEnd, newEnd)) {
					//reverse the order of the curves, as well as the order of the points in said curve
					console.log(`reversing ${JSON.stringify(protoPath[s])}`);
					// protoPath[s].reverse();
					// protoPath[s].forEach(c => c.reverse());
				}
			}
		}
		console.log(`after process, there are ${paths.length} splines left`);
		loopsList.push(protoPath);
	}
	console.log(`found ${loopsList.length} loops`);

	return loopsList;
}

//a loop is just a direct connection from the start of one node to the end of that same node - so DFS works
//this does DFS basically
function loopifyOnce(paths) {
	var debugLoop = true;
	//just for my sanity
	paths.forEach(j => {
		assignRID(j);
	});

	//get the starting node
	var protoPath = [paths[0]];
	var protoEnds = [true];
	//endTarget indicates we're looking for paths that connect to the end
	var lastNode = protoPath[0];
	var candidate;
	var endTarget = true;
	var maxIterations = 1000;
	var targetPoint;
	var tol;

	if (debugLoop) {console.log(`starting with ${paths[0].id}`);}

	while (maxIterations > 0) {
		maxIterations -= 1;

		lastNode = protoPath[protoPath.length-1];
		targetPoint = protoEnds[protoEnds.length-1] ? lastNode.end : lastNode.start;
		if (debugLoop) {console.log(`searching for point ${JSON.stringify(targetPoint)}`);}

		for (var g=0; g<paths.length; g++) {
			//look for the first path that connects
			tol = (+φGet(lastNode, 'stroke-width') + +φGet(paths[g], 'stroke-width')) / 2;
			tol = tol * tol;
			if (paths[g] != lastNode && (d2_distSquared(targetPoint, paths[g].start) <= tol || d2_distSquared(targetPoint, paths[g].end) <= tol)) {
				if (debugLoop) {console.log(`found connection with ${paths[g].id}`);}
				//if the path that connects is the original path (and we're not at the very start) then end the process and start a new protoPath
				if (paths[g] == protoPath[0]) {
					if (debugLoop) {console.log(`original`);}
					if (protoPath.length > 1) {
						if (debugLoop) {console.log(`origin ending`);}
						return protoPath;
					}
				} else {
					if (debugLoop) {console.log(`new`);}
					//update the candidate + target variable
					candidate = paths[g];
					endTarget = d2_distSquared(targetPoint, paths[g].start) <= tol;
				}
			}
		}
	
		//if we have a valid candidate push it onto the protopath and repeat
		if (candidate != undefined) {
			console.log(`accepted candidate ${candidate.id}`, candidate != lastNode);
			protoPath.push(candidate);
			protoEnds.push(endTarget);
		} else {
			//if there are no paths left at all, the start must have been invalid
			if (protoPath.length == 1) {
				if (debugLoop) {console.log(`${paths[0].id} was an invalid start!`);}
			}

			//if there's no valid candidate, that means there are no paths that connect to the end of this path, meaning this path is invalid and should be removed
			paths.splice(paths.indexOf(lastNode), 1);
			protoPath.pop();
			protoEnds.pop();

			if (protoPath.length == 0) {
				return protoPath;
			}
		}

		candidate = undefined;
		endTarget = protoEnds[protoEnds.length-1];
	}
	if (debugLoop) {console.log(`out of time!`, paths);}
	return paths;
}

//given a point and an array of points, gives the minimum cloud distance to the point
function minTaxiTo(point, pointCloud) {
	var tDist = 1e1001;
	pointCloud.forEach(p => {
		tDist = Math.min(Math.abs(p[0] - point[0]) + Math.abs(p[1] - point[1]), tDist);
	});
	return tDist;
}

//gives the cursor's [x, y] coordinates relative to a node
function cursorRelativeTo(node) {
	var box = node.getBoundingClientRect();
	return [cursor.x - box.x, cursor.y - box.y];
}


function frame_addFill(layerNode, fill) {
	//still have to check for previously empty because of copy / paste options
	layerNode.fills.appendChild(fill);
	layerNode.binModify(fill, false);

	if (layerNode.fills.children.length == 1) {
		//change to indicate the frame is full
		var uid = φGet(layerNode, 'uid');
		φSet(layerNode.querySelector(`#MASTER_layerKey_${uid}`), {'href': '#MASTER_frameFullKey'});
		φSet(layerNode.querySelector(`#MASTER_layer_${uid}`), {'href': '#MASTER_frameFull'});
		return fill;
	}
}




/**
 * Adds a Spline to a specified frame object.
 * A Spline is made up of a set of curves that are either linear, quadratic, or bezier. This set of curves nominally does not intersect itself or other path objects.
 * @param {*} layerNode The frame object to add the spline to
 * @param {Spline} spline the Spline path object to add
 */
function frame_addPath(layerNode, spline) {
	var debugIntersects = false;

	//previously empty makes it easy
	if (layerNode.lines.children.length == 0) {
		layerNode.lines.appendChild(spline);
		layerNode.binModify(spline, false);

		//change to indicate the frame is full
		var uid = φGet(layerNode, 'uid');
		φSet(layerNode.querySelector(`#MASTER_layerKey_${uid}`), {'href': '#MASTER_frameFullKey'});
		φSet(layerNode.querySelector(`#MASTER_layer_${uid}`), {'href': '#MASTER_frameFull'});
		return spline;
	}

	//if there are lines already:
	var plancLen = 0.5 / (10 ** quantizeTo);
	var inserting = [spline];
	var insertingBounds = [spline.bounding.map(a => Math.floor(a / cubicBinSize))];
	for (var n=0; n<inserting.length; n++) {
		//search through all the lines that the spline could intersect and cut them if necessary
		var possibleObjs = layerNode.binGet(insertingBounds[n][0], insertingBounds[n][1], insertingBounds[n][2], insertingBounds[n][3]);

		possibleObjs.forEach(p => {
			var intersections = splineSplineIntersect(p, inserting[n], plancLen / 4);
			if (intersections.length == 0) {
				return;
			}

			if (debugIntersects) {console.log(`intersection detected: [new, old]`, [inserting[n], p]);}

			//merge identical intersections
			intersections = simplifyLineDuplicates(intersections, plancLen * 1.5);
			if (debugIntersects) {console.log(`intersections are ${JSON.stringify(intersections)}`);}
			if (true) {
				intersections.forEach(g => {
					workspace_toolTemp.appendChild(φCreate("circle", {
						'cx': g[0],
						'cy': g[1],
						'r': 0.1,
						'fill': "#F0F",
						'stroke': "#0FF",
						'stroke-width': 0.075
					}));
				});
			}

			//remove existing intersecting spline so it can be chopped without consequence
			layerNode.binModify(p, true);
			layerNode.lines.removeChild(p);
			var pTimes = pointsToOrderedT(p, intersections);
			if (debugIntersects) {console.log(p.start, p.end, intersections, pTimes);}
			//merge identical times
			//this whole "not less than" is done to account for undefineds. Checking for "greater than" returns false when comparing against undefineds, even though it should be allowed
			pTimes = pTimes.filter((num, ind) => !(Math.abs(pTimes[ind] - pTimes[ind+1]) < 0.001));
			if (debugIntersects) {console.log(pTimes);}
			var pBits = multiSlice(p, pTimes);
			if (debugIntersects) {console.log(`pbits`, pBits);}
			var nTimes = pointsToOrderedT(inserting[n], intersections);
			// console.log(JSON.stringify(nTimes));
			var nBits = multiSlice(inserting[n], nTimes);
			var boundsBits = nBits.map(b => b.bounding.map(a => floor(a / cubicBinSize)));

			//add all p bits, put n bits into array for checking
			pBits.forEach(q => {
				layerNode.lines.appendChild(q);
				layerNode.binModify(q, false);
			});

			inserting.splice(n, 1, ...nBits);
			insertingBounds.splice(n, 1, ...boundsBits);
			
		});

		//also need to cut 
		//after checking all the possible objects this insert object can be added
		layerNode.lines.appendChild(inserting[n]);
		layerNode.binModify(inserting[n], false);
	}
	
	return spline;
}

function pointsToOrderedT(spline, points) {
	var tVals = points.map(p => spline.getTFromPoint(p[0], p[1]));
	return tVals.sort((a, b) => a - b);
}

function multiSlice(spline, sliceTimes) {
	var debugMulti = false;
	// console.log(JSON.stringify(sliceTimes));
	//don't clip ends because.. that's not a clip
	while (sliceTimes[0] <= 0) {
		sliceTimes.shift();
	}
	if (sliceTimes[sliceTimes.length-1] >= spline.curves.length) {
		sliceTimes.pop();
	}

	//only continue if there are still intersections
	if (sliceTimes.length == 0) {
		if (debugMulti) {console.log(`no intersections left`);}
		return [spline];
	}

	var cut = [];
	var remainder = spline;
	var importantPs = [];
	var buffer1;
	for (var s=0; s<sliceTimes.length; s++) {
		if (sliceTimes[s] % 1 != 0) {
			if (debugMulti) {console.log(`non-integer`);}
			//slicing at a non-integer will cause the other Ts of that curve to shift around (because velocities, etc).
			//To fix this, convert the Ts into Points, then after splitting, convert back
			//t -> points
			var t = s + 1;
			importantPs = [];
			while (t < sliceTimes.length && floor(sliceTimes[t]) == floor(sliceTimes[s])) {
				importantPs.push(remainder.getPointFromT(sliceTimes[t]));
				t += 1;
			}
			//split
			[buffer1, remainder] = remainder.splitAt(sliceTimes[s]);
			cut.push(buffer1);

			var reduction = floor(sliceTimes[s]);

			//points -> t
			for (t=0; t<importantPs.length; t++) {
				if (debugMulti) {console.log(`replacing time with ${reduction + remainder.getTFromPoint(importantPs[t][0], importantPs[t][1], true)}`);}
				sliceTimes[t+s+1] = reduction + remainder.getTFromPoint(importantPs[t][0], importantPs[t][1]);
			}

			//make sure all the other slice times are in remainder coordinates
			for (t=s+1; t<sliceTimes.length; t++) {
				sliceTimes[t] -= reduction;
			}
			if (debugMulti) {console.log(`after reduction of ${reduction}, times are ${JSON.stringify(sliceTimes)}`);}
		} else {
			//simple integer case
			if (debugMulti) {console.log(sliceTimes[s]);}
			[buffer1, remainder] = remainder.splitAt(sliceTimes[s]);
			if (debugMulti) {console.log(buffer1, remainder);}
			cut.push(buffer1);
			//make sure all the other slice times are now in remainder coordinates
			for (var t=s+1; t<sliceTimes.length; t++) {
				sliceTimes[t] -= sliceTimes[s];
			}
		}
	}

	//add the remainder at the end
	cut.push(remainder);

	return cut;
}

/**
 * Removes a path from a specified frame object
 * @param {Frame} layerNode the frame object the spline belongs to
 * @param {Spline} spline the spline path object to remove
 */
function frame_removePath(layerNode, spline) {
	//go through the curves and remove them from the curve bins
	layerNode.binModify(spline, true);
	layerNode.lines.removeChild(spline);

	//keep markers up to date
	if (layerNode.lines.children.length == 0) {
		var uid = φGet(layerNode, "uid");
		φSet(layerNode.querySelector(`#MASTER_layerKey_${uid}`), {'href': '#MASTER_frameEmptyKey'});
		φSet(layerNode.querySelector(`#MASTER_layer_${uid}`), {'href': '#MASTER_frameEmpty'});
	}
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
				if (bezierBezierIntersect(curve[0], curve[1], curve[2], curve[3], testCurves[g][0], testCurves[g][1], testCurves[g][2], testCurves[g][3], plancLen).length > 0) {
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
	var temp = φCreate('svg');
	temp.innerHTML =
	`<g id="frame_${frameID}" uid="${frameID}" display="none">
		<defs>
			<use id="MASTER_layerKey_${frameID}" href="#MASTER_frameEmptyKey"/>
			<use id="MASTER_layer_${frameID}" href="#MASTER_frameEmpty"/>
		</defs>
		<g id="fills"></g>
		<g id="lines"></g>
		<g id="objs"></g>
	</g>`;
	temp = temp.children[0];

	temp = Frame(temp);

	if (layerID) {
		document.getElementById(`layer_${layerID}`).appendChild(temp);
	}
	return temp;
}

//makes a copy of a frame
function frame_copy(frameNode, layerID) {
	var newLayer = frame_create(createUid());

	//add all lines + fills to the new layer
	for (var l=0; l<frameNode.lines.children.length; l++) {
		frame_addPath(newLayer, Spline(frameNode.lines.children[l].cloneNode(), JSON.parse(JSON.stringify(frameNode.lines.children[l].curves))));
	}
	console.log(`copied from ${frameNode.id}`);

	if (layerID) {
		document.getElementById(`layer_${layerID}`).appendChild(newLayer);
	}
	return newLayer;
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
function simplifyLineDuplicates(points, tolerance) {
	tolerance = (tolerance * tolerance) ?? 0;
	var newPts = [];
	var lastX = 1e1001;
	var lastY = 1e1001;
	for (var q=0; q<points.length; q++) {
		if ((points[q][0] - lastX) ** 2 + (points[q][1] - lastY) ** 2 > tolerance) {
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

	//set new px -> units transfer
	document.documentElement.style.setProperty("--pxUnits", (1 / newZoom) + "px");
	document.documentElement.style.setProperty("--pxUnits2", (2 / newZoom) + "px");
	document.documentElement.style.setProperty("--pxUnits4", (4 / newZoom) + "px");

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