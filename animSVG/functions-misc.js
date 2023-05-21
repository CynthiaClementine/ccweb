/*
for weird functions that aren't any of the other things but that I can't be justified in creating a collection name for


*/

function assignRID(node) {
	if (φGet(node, 'id') == undefined) {
		φSet(node, {'id': `_${uidChars[floor(randomBounded(0, uidChars.length))]}${uidChars[floor(randomBounded(0, uidChars.length))]}`});
	}
}

function addImageTo(layer, image) {
	console.log(image.width, image.height);
	var imgNode = φCreate("image", {
		'href': image.url,
		'x': 0,
		'y': 0,
		'width': 200,
		'height': 200
	});
	layer.children["lines"].appendChild(imgNode);
}


//takes a frame object and randomizes the colors of all the paths on it
function randomizeColorsFor(frame) {
	var r = () => {return Math.floor(randomBounded(0, 256));}
	for (var d=0; d<frame.lines.children.length; d++) {
		φSet(frame.lines.children[d], {"stroke": `rgba(${r()}, ${r()}, ${r()}, 1)`});
	}
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
 */
function takeAction(actionFunc, inverseFunc) {
	//execute the action
	actionFunc();
	recordAction(actionFunc, inverseFunc);
}

/**
 * Records a reversable action that could be undone with undo()
 * @param {Function} actionFunc action function
 * @param {Function} inverseFunc inverse action function
 */
function recordAction(actionFunc, inverseFunc) {
	//first make sure the counter is at the end by removing anything past it
	if (editDeltaTracker < editDeltasPast.length) {
		editDeltasPast = editDeltasPast.slice(0, editDeltaTracker);
		editDeltasFuture = editDeltasFuture.slice(0, editDeltaTracker);
	}

	//add both the action and reverse action to the list
	editDeltasPast.push(inverseFunc);
	editDeltasFuture.push(actionFunc);

	//make sure the deltas list doesn't get too long
	if (editDeltasPast.length > editDeltasMax) {
		var removeCount = editDeltasPast.length - editDeltasMax;
		editDeltasPast.splice(0, removeCount);
		editDeltasFuture.splice(0, removeCount);
		editDeltaTracker -= removeCount;
	}

	//increment the counter
	editDeltaTracker += 1;
}

function undo() {
	//move the tracker back and perform an inverse action
	if (editDeltaTracker > 0) {
		editDeltaTracker -= 1;
		editDeltasPast[editDeltaTracker]();
	}
}

function redo() {
	//similar - move the tracker forward and perform the action
	if (editDeltaTracker < editDeltasFuture.length) {
		editDeltasFuture[editDeltaTracker]();
		editDeltaTracker += 1;
	}
}