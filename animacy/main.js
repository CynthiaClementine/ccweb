window.onload = setup;

//mouse events
window.onmousedown = handleMouseDown;
window.onmousemove = handleMouseMove;
window.onmouseup = handleMouseUp;

//key press events
window.onkeydown = handleKeyPress;
window.onkeyup = handleKeyRelease;

//trackpad gestures
window.addEventListener("wheel", handleWheel, {passive: false});
window.addEventListener("gestureend", htest, false);
window.addEventListener("gesturestart", htest, false);
window.addEventListener("gesturechange", htest, false);

function htest(e) {
	console.log("hi");
	console.log(e);
}

//misc
window.onresize = handleResize;
window.onbeforeunload = handleUnload;

//the storage for interval event during timeline playback 
var autoplay;
var autoplayStop;

var color_debug = "#FF00FF";

var color_selectedNode = activeColor_stroke;
var color_stroke = φGet(activeColor_stroke, "fill");
var color_fill = φGet(activeColor_fill, "fill");
var color_stage = φGet(activeColor_stage, "fill");
var color_objLast = undefined;

var base;

var brush_limits = [1, 100];

var button_alt = false;
var button_force = false;
var button_shift = false;

var canvas;
var ctx;

var cubicBinSize = 20;

var data_persistent = {
	brushSize: 8,
};

var cursor = {
	down: false,
	downType: undefined,
	x: 0,
	y: 0,
}

var debug_active = false;

var editDeltaTracker = 0;
var editDeltasFuture = [];		//changes required to get to the future (present time)
var editDeltasPast = [];		//changes required to get to the past
var editDeltasIDs = [];			//list of IDs for each change. A grouping of identical delta IDs will be treated as one action.
var editDeltasMax = 100;

var fps_limitMin = 1;
//I figure 100 is a good max number, you can't really see any individual frame less than 10ms anyways, but 144 divides better so that's the limit
var fps_limitMax = 144;

var hotkeys = [
	// ["Key", `function`, `description`],
	//where Key is "Modifier1 Modifier2 Key.code"
	//and Modifiers are: Shift Alt Force
	
	//tools
	["KeyC", `changeToolTo("Circle")`, `Circle tool`],
	["KeyI", `changeToolTo("Eyedrop")`, `Eyedropper tool`],
	["KeyK", `changeToolTo("Fill")`, `Fill tool`],
	["KeyN", `changeToolTo("Line")`, `Line tool`],
	["KeyM", `changeToolTo("Move")`, `Move tool`],
	["KeyY", `changeToolTo("Pencil")`, `Pencil tool`],
	["KeyR", `changeToolTo("Rectangle")`, `Rectangle tool`],
	["KeyJ", `changeToolTo("Transform")`, `Transform tool`],

	//timeline actions
	["KeyO", `toggleOnionSkin()`, `Toggle onion skin`],
	["Digit1", `user_keyframe(1)`, `Create blank keyframe`],
	["Digit2", `user_keyframe(2)`, `Create keyframe from existing`],
	["Shift Digit1", `user_keyframe(3)`, `Remove keyframe`],
	
	["Enter", `toggleTimelinePlayback()`, `Toggle timeline playback`],
	["Shift Enter", `toggleTimelinePlayback(true)`, `Toggle timeline playback (looping)`],
	["ArrowLeft", `select(timeline.s, timeline.t - 1)`, `Decrement timeline position`],
	["ArrowRight", `select(timeline.s, timeline.t + 1)`, `Increment timeline position`],
	["ArrowUp", `select(timeline.s - 1, timeline.t)`, `Select layer above`],
	["ArrowDown", `select(timeline.s + 1, timeline.t)`, `Select layer below`],
	["Force ArrowLeft", `select(timeline.s, 0)`, `Move to timeline start`],
	["Force ArrowRight", `select(timeline.s, timeline.len - 1)`, `Move to timeline end`],

	//file-wide???
	["Force KeyZ", `undo()`, `undo`],
	["Shift Force KeyZ", `redo()`, `redo`],
];

//tool-specific hotkeys. They're defined here but included in a tool class whenever a tool has them
var hotkeys_brushSize = [
	["BracketLeft", `changeBrushSize(data_persistent.brushSize - 1)`, `Decrease brush size`],
	["BracketRight", `changeBrushSize(data_persistent.brushSize + 1)`, `Increase brush size`],
];
var hotkeys_delete = [
	["Backspace", `toolCurrent.delete()`, `Delete selected object`],
];
var hotkeys_polygon = [
	["Minus", `toolCurrent.changeSides(-1)`, `Decrease number of sides`],
	["Equal", `toolCurrent.changeSides(1)`, `Increase number of sides`]
];

var images = [];

var layer_reorderChar = `⥌`; //close second: ⧰
var layer_reordering;

//the decimal point to quantize to
var quantizeTo = 1;
var quantizeAmount = 1 / (10 ** quantizeTo);

var saveData;

var symbolTable = {"0": new Symbol()};
let symbolCurrent;

var textMode = false;

var timer;			// ???????
var timeline;

var toolCurrent;

var uidChars = `abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZςερτυθιοπασδφγηξκλζχψωβνμ`;
var uidCount = 0;

var workspace_margin = 0.1;
var workspace_scaleBounds = [0.02, 100];




function setup() {
	base = document.getElementById("base");
	canvas = document.getElementById("convos");
	ctx = canvas.getContext("2d");
	changeToolTo("Pencil");

	loadSymbol(`0`);

	addLayer("Layer 1");
	resizeTimeline(undefined, 100);
	changeAnimationLength(10);
	updateColorVars();

	runTests();
	handleResize();
	// debug_active = true;
}

function handleKeyPress(a) {
	if (debug_active) {
		console.log(a.key);
	}
	//I kept checking for keydown events here but then I got errors when missing keyup events so here's the solution instead
	button_shift = a.shiftKey;
	button_alt = a.altKey;
	button_force = a.ctrlKey || a.metaKey;
	//if it's a special button
	if (a.key == "Escape") {
		toolCurrent.escape();
		cursor.down = false;
		return;
	}
	if (textMode) {
		return;
	}
	//make sure to allow zooming in / out
	if (a.code != "Minus" && a.code != "Equal") {
		a.preventDefault();
	}

	var keys = [];
	if (button_shift) {keys.push("Shift");}
	if (button_alt) {keys.push("_Alt_");}
	if (button_force) {keys.push("Force");}
	keys.push(a.code);
	keys.sort();

	var hotkeysArr = hotkeys;
	if (toolCurrent.hotkeys) {
		hotkeysArr = hotkeysArr.concat(toolCurrent.hotkeys);
	}

	var possibleHots = hotkeysArr.filter(j => j[0].includes(a.code));

	//go through each possible hotkey and make sure it doesn't have a modifier that's not pressed
	var split;
	for (var h=0; h<possibleHots.length; h++) {
		split = possibleHots[h][0].split(" ").sort();

		//if the exact same keys are pressed, great! Break out early
		if (arrsAreSame(keys, split)) {
			eval(possibleHots[h][1]);
			return;
		}

		//checking for non-pressed modifiers
	}

	// eval(possibleHots[0][1]);

	//sort the remaining hotkeys by number of buttons they require

	//execute the command that requires the most buttons pressed, because it's probably what the user intended
}

function handleKeyRelease(a) {
	button_shift = a.shiftKey;
	button_alt = a.altKey;
	button_force = a.ctrlKey || a.metaKey;
}

// function handleMouseDown_

function handleMouseDown(a) {
	//don't bother in these cases
	if (φOver(help_container) || textMode) {
		return;
	}
	cursor.down = true;
	cursor.x = a.clientX;
	cursor.y = a.clientY;
	
	//if the ignoreDown tag is set, ignore it
	if (φGet(a.target, 'ignoredown')) {
		console.log(`ignoring`);
		return;
	}

	
	//use element to decide the type of being down
	cursor.downType = undefined;
	if (!φOver(base)) {
		console.log(`not over base`);
		console.log('returning');
		return;
	}

	if (φOver(timeline.blocks_container)) {
		var cPos = cursorTimelinePos();
		var [oldW, oldH] = [timeline.t, timeline.s];
		var [newW, newH] = [Math.floor(cPos[0]), Math.floor(cPos[1])];
		
		
		if (newH < 0) {
			//if it's over the playhead
			cursor.downType = "timePlayhead";
			return;
		} 
		if (newH >= timeline.layerIDs.length) {
			//if it's not over the blocks
			return;
		}
		
		//if it's repeated the last selection, allow movement
		if (newW == oldW && newH == oldH) {
			timeline.oldKeyPos = [oldW, oldH];
			cursor.downType = "timeDragging";
			return;
		}
		
		//change selection
		select(newH, newW);
		cursor.downType = "timeBlockzone";
		return;
	}

	if (φOver(timeline.container)) {
		cursor.downType = "time";
		return;
	}

	if (φOver(sidebar_container)) {
		return;
	}

	cursor.downType = "work";
	console.log(`tooling`);
	toolCurrent.mouseDown(a);
}

function handleMouseMove(a) {
	cursor.x = a.clientX;
	cursor.y = a.clientY;

	//different behavior depending on the type of down-ness
	if (cursor.down) {
		switch (cursor.downType) {
			case "layerReorder":
				var pos = cursorTimelinePos();
				var nowInd = timeline.layerIDs.indexOf(layer_reordering);
				if (nowInd != Math.floor(pos[1])) {
					reorderLayer(nowInd, Math.floor(pos[1]));
				}
				break;
			case "timeDragging":
				var pos = cursorTimelinePos();
				var box = timeline.selector.getBoundingClientRect();

				//constrain pos to be inside the timeline
				pos[0] = clamp(pos[0], 0.5, timeline.len-0.5);
				pos[1] = clamp(pos[1], 0.5, timeline.layerIDs.length-0.5);
				//update the selection box
				φSet(timeline.selector, {
					'x': pos[0] * (timeline.blockW + 1) - (box.width / 2),
					'y': timeline.headHeight + pos[1] * (timeline.blockH + 1) - (box.height / 2)
				});
				break;
			case "timeEdge":
				var box = base.getBoundingClientRect();
				var cursorVbaseY = cursor.y - box.y;
				var goodHeight = box.height - cursorVbaseY;

				φSet(timeline.container, {'hinv': goodHeight});
				resizeTimeline(box.width, clamp(goodHeight, 5, box.height));
				resizeSidebar(undefined, box.height - goodHeight);
				break;
			case "timeExtend":
				var xRel = cursorRelativeTo(timeline.extender)[0] - 3;
				if (Math.abs(xRel) > timeline.blockW) {
					var extraFrames = Math.round(xRel / timeline.blockW);
					changeAnimationLength(clamp(timeline.len + extraFrames, 1, 1e1001));
				}
				break;
			case "onionPullLeft":
				changeOnionWingLength(0);
				break;
			case "onionPullRight":
				changeOnionWingLength(1);
				break;
			case "timePlayhead":
				timeline.updatePlayheadPos();
				break;
			case "timeBlockzone":
				//drag the selection box around
				break;
			case "sideEdge":
				var height = φGet(sidebar_background, "height");
				var newWidth = clamp(cursorRelativeTo(base)[0], 0, φGet(base, "width"));
				resizeSidebar(newWidth, height);
				break;
			case "time":
				break;
			case "work":
				toolCurrent.mouseMove(a);
				break;
			default:
				console.log(`unknown down type: ${cursor.downType}`);
		}
	}
}

//for calling from the document, where variables can't be accessed
function setDownType(val, a) {
	cursor.down = true;
	cursor.downType = val;
	if (a == undefined) {
		return;
	}
	a.preventDefault();
	//more browser nonsense
	a.cancelBubble = true;
	if (a.stopPropagation) {
		a.stopPropagation();
	}
}

function handleMouseUp(a) {
	if (cursor.downType == "work") {
		toolCurrent.mouseUp(a);
	}
	if (cursor.downType == "timeDragging") {
		//figure out where the keyframe should go
		var pos = cursorTimelinePos();
		var op = timeline.oldKeyPos;
		pos[0] = clamp(Math.floor(pos[0]), 0, timeline.len-1);
		pos[1] = clamp(Math.floor(pos[1]), 0, timeline.layerIDs.length-1);

		//if the selection box has been moved, shift the keyframes as well
		if (pos[0] != op[0] || pos[1] != op[1]) {
			timeline.t = pos[0];
			timeline.s = pos[1];

			//move the keyframe
			makeKeyframe(pos[1], pos[0], timeline.frameAt(op[0], op[1]));
			makeUnKeyframe(op[1], op[0]);
			timeline.updatePlayheadPos();
	
			//put the selection box back where it should be
			φSet(timeline.selector, {
				'x': pos[0] * (timeline.blockW + 1),
				'y': timeline.headHeight + pos[1] * (timeline.blockH + 1)
			});
		}
	}
	if (cursor.downType == "timeExtend") {
		//if the timeline's gotten longer it's easy to make edit history for that - reversing an increase in time can't get rid of any keyframes
		if (timeline.len > timeline.lenStore) {
			recordAction(() => {
				changeAnimationLength(timeline.len);
			}, () => {
				changeAnimationLength(prevLen);
				timeline.lenStore = timeline.len;
			});
		} else {
			//if it's gotten shorter, ??????????
		}

		timeline.lenStore = timeline.len;
		
	}
	cursor.down = false;
}

//runs the bare essentials of the page
function handleResize(a) {
	var spaceW = window.innerWidth * 0.96;
	var spaceH = window.innerHeight * 0.95 - top_import.getBoundingClientRect().height;
	var timeDims = timeline.background.getBoundingClientRect();
	var sideDims = sidebar_background.getBoundingClientRect();
	
	console.log(spaceW, sideDims.width);
	resizeWorkspace(spaceW, spaceH);
	resizeTimeline(spaceW, Math.min(spaceH, timeDims.height));
	resizeSidebar(Math.min(sideDims.width, spaceW), spaceH - Math.min(spaceH, timeDims.height));

	clampWorkspace();
}

function resizeWorkspace(spaceW, spaceH) {
	φSet(bg, {
		'width': spaceW,
		'height': spaceH
	});
	φSet(base, {
		'width': spaceW,
		'height': spaceH,
		'viewBox': `0 0 ${spaceW} ${spaceH}`,
	});
	φSet(workspace_zoomText, {
		'x': spaceW - 5
	});
}

function handleWheel(a) {
	a.preventDefault();
	if (φOver(timeline.background)) {
		moveTimeline(a.deltaX, a.deltaY);
	} else {
		moveWorkspace(a.deltaX, a.deltaY * (a.ctrlKey ? -4 : 1), a.ctrlKey);
	}
}

function resizeSidebar(w, h) {
	var minPickerWidth = 250;
	var maxPickerWidth = 350;
	var toolWidth = 50;

	if (w == undefined || h == undefined) {
		var oldDims = φGet(sidebar_background, ["width", "height"]);
		w = w ?? oldDims[0];
		h = h ?? oldDims[1];
	}
	w = Math.round(+w);
	h = Math.round(+h);
	
	w = Math.max(w, toolWidth + minPickerWidth);

	//if the panel is wide enough, put color properties to the side. If it's too small, they'll go below instead
	var sideProps = false;
	var pickerWidth = w - toolWidth;
	if (pickerWidth >= maxPickerWidth) {
		w = maxPickerWidth + toolWidth;
		pickerWidth = minPickerWidth;
		sideProps = true;
	}
	var pickerHeight = pickerWidth * 1.1;
	var squareSize = +φGet(activeColor_stroke, "width");

	φSet(sidebar_background, {
		'width': w,
		'height': h
	});
	φSet(sidebar_container, {'width': w});
	φSet(toolbar_container, {
		'x': w - toolWidth,
		'height': h
	});
	φSet(toolbar_background, {
		'height': h
	});

	φSet(sidebar_edge_detector, {
		'x': w - 5,
		'height': h
	});

	φSet(sidebar_colorPicker, {
		'width': pickerWidth,
		'height': pickerHeight,
	});
	φSet(sidebar_activeColors, {
		'width': pickerWidth,
		'y': sideProps ? (pickerHeight + 20) : Math.max((h - squareSize - 20), (pickerHeight + 20))
	});
}

function handleUnload(e) {
	//in the unlikely event that a browser is being used which allows custom escape messages
	e.returnValue = `Are you sure you want to exit? You may have unsaved changes.`;
	return `Are you sure you want to exit? You may have unsaved changes.`;
}