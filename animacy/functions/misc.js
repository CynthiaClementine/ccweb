/*
for weird functions that aren't any of the other things but that I can't be justified in creating a collection name for

assignRID(node)
markTempPoint(x, y)
randomizeColorsFor(frame)
updateColorVars();

*/

function assignRID(node) {
	if (φGet(node, 'id') == undefined) {
		φSet(node, {'id': `_${uidChars[floor(randomBounded(0, uidChars.length))]}${uidChars[floor(randomBounded(0, uidChars.length))]}`});
	}
}


function markTempPoint(x, y, color) {
	workspace_toolTemp.appendChild(φCreate("circle", {
		'cx': x,
		'cy': y,
		'r': 0.1,
		'fill': "#F0F",
		'stroke': color ?? "#0FF",
		'stroke-width': 0.075
	}));
}


//takes a frame object and randomizes the colors of all the paths on it
function randomizeColorsFor(frame) {
	var r = () => {return Math.floor(randomBounded(0, 256));}
	for (var d=0; d<frame.lines.children.length; d++) {
		φSet(frame.lines.children[d], {"stroke": `rgba(${r()}, ${r()}, ${r()}, 1)`});
	}
}

function updateColorVars() {
	//update variables
	color_stroke = activeColor_stroke.value;
	color_fill = activeColor_fill.value;
	color_stage = activeColor_stage.value;
	φSet(workspace_background, {"fill": color_stage});
}

function bezTest(lamb) {
	var bez = [[-1, 0], [-1 + lamb, lamb], [1 - lamb, lamb], [1, 0]];

	var pts = [[1, 0]];

	for (var a=0; a<20; a++) {
		pts.push(bezierPointFromT(...bez, a / 20));
	}
	return polyArea(pts);
}

function drawCubicBins() {
	var wh = φGet(workspace_background, ["width", "height"])
	for (var x=0; x<+wh[0]; x+=cubicBinSize) {
		workspace_toolTemp.appendChild(φCreate("line", {
			'x1': x,
			'x2': x,
			'y1': 0,
			'y2': wh[1],
			'stroke': 'var(--colorSelect)',
			'stroke-width': 0.5
		}));
	}
	for (var y=0; y<+wh[1]; y+=cubicBinSize) {
		workspace_toolTemp.appendChild(φCreate("line", {
			'x1': 0,
			'x2': wh[0],
			'y1': y,
			'y2': y,
			'stroke': 'var(--colorSelect)',
			'stroke-width': 0.5
		}));
	}
}


/**
 * Runs and records a reversable action that could be undone with undo()
 * @param {Function} actionFunc The action to take
 * @param {Function} inverseFunc The function that negates actionFunc
 * @param {String|undefined} actionID An optional ID for the action
 */
function takeAction(actionFunc, inverseFunc, actionID) {
	//execute the action
	actionFunc();
	recordAction(actionFunc, inverseFunc, actionID);
}

/**
 * Records a reversable action that could be undone with undo()
 * @param {Function} actionFunc action function
 * @param {Function} inverseFunc inverse action function
 * @param {String|undefined} actionID An optional ID for the action
 */
function recordAction(actionFunc, inverseFunc, actionID) {
	//first make sure the counter is at the end by removing anything past it
	if (editDeltaTracker < editDeltasPast.length) {
		editDeltasPast = editDeltasPast.slice(0, editDeltaTracker);
		editDeltasFuture = editDeltasFuture.slice(0, editDeltaTracker);
		editDeltasIDs = editDeltasIDs.slice(0, editDeltaTracker);
	}

	//add both the action and reverse action to the list
	editDeltasPast.push(inverseFunc);
	editDeltasFuture.push(actionFunc);
	editDeltasIDs.push(actionID);

	//make sure the deltas list doesn't get too long
	if (editDeltasPast.length > editDeltasMax) {
		var removeCount = editDeltasPast.length - editDeltasMax;
		editDeltasPast.splice(0, removeCount);
		editDeltasFuture.splice(0, removeCount);
		editDeltasIDs.splice(0, removeCount);
		editDeltaTracker -= removeCount;
	}

	//increment the counter
	editDeltaTracker += 1;
}