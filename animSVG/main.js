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

var base;

var button_alt = false;
var button_force = false;
var button_shift = false;

var canvas;
var ctx;

var cubicBinSize = 20;

var pathConnections = {

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
var editDeltasPast = [];	//changes required to get to the past
var editDeltasMax = 100;

var ends = {};
var starts = {};

var fps_limitMin = 1;
//I figure 100 is a good max number, you can't really see any individual frame less than 10ms anyways, but 144 divides better so that's the limit
var fps_limitMax = 144;

var hotkeys = [
	// ["Modifier1 Modifier2 Key.code", `function`, `description`],
	// ["Key", `function`, `description`],
	
	//tools
	["KeyC", `changeToolTo("Circle")`, `Circle tool`],
	["KeyI", `changeToolTo("Eyedrop")`, `Eyedropper tool`],
	["KeyK", `changeToolTo("Fill")`, `Fill tool`],
	["KeyY", `changeToolTo("Pencil")`, `Pencil tool`],
	["KeyR", `changeToolTo("Rectangle")`, `Rectangle tool`],
	
	//timeline actions
	["KeyO", `toggleOnionSkin()`, `Toggle onion skin`],
	["Digit1", `user_keyframe(1)`, `Create blank keyframe`],
	["Digit2", `user_keyframe(2)`, `Create keyframe from existing`],
	["Shift Digit1", `user_keyframe(3)`, `Remove keyframe`],
	
	["Enter", `toggleTimelinePlayback()`, `Toggle timeline playback`],
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

//the decimal point to quantize to
var quantizeTo = 1;

var timer;
var timeline = new Timeline();


var toolCurrent;

var workspace_margin = 0.1;
var workspace_scaleBounds = [0.02, 100];

var saveData;

var timeline_blockH;
var timeline_blockW;
var timeline_headHeight = 15;
var timeline_oldKeyPos = [0, 0];

var uidCount = 0;


function setup() {
	base = document.getElementById("base");
	canvas = document.getElementById("convos");
	ctx = canvas.getContext("2d");
	changeToolTo("Pencil");

	//setting up variables that depend on document
	[timeline_blockW, timeline_blockH] = φGet(MASTER_frameBoxPath, ["width", "height"]);
	timeline_blockW = +timeline_blockW;
	timeline_blockH = +timeline_blockH;

	
	addLayer("Layer 1");

	testTimeline();
	handleResize();
}

function testTimeline() {
	//helpful functions
	function r() {
		return [
			Math.round(Math.random() * 500),
			Math.round(Math.random() * 500),
		];
	}

	function create(points) {
		// toolCurrent.layerSelected = layer;
		toolCurrent.bufferPoints = points;
		toolCurrent.pushToWorkspace();
	}

	//add layers
	addLayer("Layer 2");
	addLayer("Layer 3");

	//draw on the first frame of the first layer
	create([[-402,313], [1000,41]]);
	create([[0,0], [731,41]]);
	create([[0, 500], [100,500], [723,380], [723, 280]]);

	//simulation of drawing on different keyframes
	changeAnimationLength(10);
	makeKeyframe(0, 4);
	timeline.changeFrameTo(6);
	
	create([[398,142],[402,142],[405,142],[415,142],[425,142],[431,142],[443,142],[456,142],[467,142],[479,142],[490,142],[498,141],[507,140],[514,138],[521,137],[528,135],[534,134],[540,132],
		[542,132],[547,131],[552,130],[556,130],[559,129],[561,128],[562,128],[563,128],[564,128],[565,128],[565,128],[565,128],[565,128],[565,130],[565,133],[566,136],[567,141],[567,146],[568,153],
		[568,160],[568,167],[568,174],[568,181],[568,188],[568,191],[568,197],[568,202],[568,205],[568,209],[568,211],[568,213],[568,213],[568,214],[568,214],[568,214],[568,214]]);
	create([[410,507],[614,390],[844,406],[1015,376],[1134,275],[1161,181],[1157,100]]);
	create([[590,495],[582,495],[581,496],[580,496],[577,496],[576,497],[575,498],[573,498],[569,500],[567,502],[565,503],[563,504],[562,505],[559,508],[558,509],[555,513],[554,515],[553,516],[552,518],[552,520],[551,521],[550,524],[550,526],[550,529],[550,532],[549,534],[549,541],[550,541],[550,543],[551,544],[553,545],[557,546],[560,547],[563,547],[568,548],[571,549],[575,549],[580,550],[585,551],[589,552],[593,552],[597,552],[600,553],[609,553],[612,552],[613,552],[616,551],[618,550],[618,550],[619,549]]);
	create([[362,241],[362,220],[379,196],[393,188],[410,184],[445,184],[469,202],[489,227],[498,246],[503,282],[496,295],[482,306],[455,313],[406,313],[396,306],[388,292],[388,268],[405,258],[426,258],[438,270],[438,278],[410,308],[372,322],[327,333],[272,331]]);
	create([[705,432],[760,430],[881,402],[922,395],[960,394]]);
	
	setColorRGBA(255, 128, 0, 1);
	
	makeKeyframe(1, 5);
	select(1, 5);
	create([[629,167],[629,173],[635,189],[656,220],[668,232],[689,247],[713,256],[729,259],[764,262],[815,262],[840,255],[856,242],[864,232],[873,208],[876,187],[875,154],[867,142],[851,129],[831,122],
		[821,121],[789,121],[777,127],[765,138],[754,151],[748,161],[741,182],[740,194],[740,218],[742,225],[753,243],[768,259],[793,279],[802,283],[818,289],[851,294],[876,294],[893,290],[924,280],
		[942,272],[959,262],[980,242],[991,227],[1045,169],[1045,167]]);
	makeUnKeyframe(1, 5);
	
	select(2, 2);
	setColorRGBA(255, 0, 255, 0.5);
	create([r(), r(), r(), r(), r(), r()]);
	create([[295,60],[300,59],[311,55],[334,45],[369,31],[413,14],[439,5],[464,-5],[485,-13],[512,-23],[527,-28],[539,-31],[543,-32],[551,-36],[556,-37],[559,-38],[563,-38],[562,-37],[556,-33],
		[547,-28],[536,-20],[512,-3],[481,18],[461,31],[441,48],[421,61],[382,90],[363,106],[351,117],[341,125],[339,128],[338,128],[338,129],[349,129],[358,127],[369,124],[379,122],[394,117],
		[412,112],[433,107],[455,102],[476,95],[499,87],[520,80],[529,77],[562,67],[574,63],[577,60],[585,57],[590,56],[594,54],[596,54],[597,53],[598,53],[597,53],[587,56],[568,66],[539,83],
		[500,106],[458,131],[422,155],[402,170],[392,177],[389,180],[383,184],[378,190],[377,190],[376,191],[376,192],[378,192],[384,190],[390,187],[410,181],[420,179],[432,175],[446,172],[461,168],
		[477,164],[486,163],[499,161],[512,158],[527,156],[534,154],[539,153],[546,152],[549,152],[551,151],[549,151],[546,153],[539,156],[527,163],[519,167],[497,179],[490,183],[488,184],[487,184],
		[487,185],[494,185],[501,184],[507,183],[537,183],[534,186],[532,187],[529,191],[514,206],[513,209],[508,213],[508,214],[520,214],[526,213],[533,212],[536,211],[540,211],[542,210],[540,211],
		[538,212],[535,214],[534,216],[532,218],[530,219]]);
	makeKeyframe(2, 2);

	setColorRGBA(128, 128, 255, 1);
	create([[166,299],[162,306],[159,318],[159,362],[167,383],[175,394],[185,403],[213,414],[233,418],[257,419],[293,412],[311,406],[329,397],[344,385],[350,378],[355,368],[360,353],[363,338],
		[363,306],[356,287],[341,269],[335,265],[321,265],[315,268],[309,274],[304,282],[304,285],[297,298],[288,308],[262,323],[258,324],[253,325],[229,324],[223,319],[222,315],[219,313],[218,310],
		[205,300],[197,287],[190,283],[174,283],[168,290],[166,294],[166,299]]);
	polyCollider = potrace([[166,299],[162,306],[159,318],[159,362],[167,383],[175,394],[185,403],[213,414],[233,418],[257,419],[293,412],[311,406],[329,397],[344,385],[350,378],[355,368],
		[360,353],[363,338],[363,306],[356,287],[341,269],[335,265],[321,265],[315,268],[309,274],[304,282],[304,285],[297,298],[288,308],[262,323],[258,324],[253,325],[229,324],[223,319],[222,315],[219,313],[218,310],[205,300],[197,287],[190,283],[174,283],[168,290],[166,294],[166,299]]);

}

function handleKeyPress(a) {
	//if it's a special button
	switch (a.key) {
		case "Shift":
			button_shift = true;
			return;
		case "Alt":
			button_alt = true;
			return;
		case "Control":
		case "Meta":
			button_force = true;
			return;
		case "Escape":
			toolCurrent.escape();
			cursor.down = false;
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

	var possibleHots = hotkeys.filter(j => j[0].includes(a.code));

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
	switch (a.key) {
		case "Shift":
			button_shift = false;
			return;
		case "Alt":
			button_alt = false;
			return;
		case "Control":
		case "Meta":
			button_force = false;
			return;
	}
}

function handleMouseDown(a) {
	cursor.down = true;
	cursor.x = a.clientX;
	cursor.y = a.clientY;
	
	//if the ignoreDown tag is set, pretend the event didn't occur
	if (φGet(a.target, 'ignoredown')) {
		return;
	}

	
	//use element to decide the type of being down
	cursor.downType = undefined;
	if (!φOver(base)) {
		console.log('returning');
		return;
	}

	//I don't use an 'over' detection for this because it causes issues with some areas having the cursor change but the mouse technically being "over" the workspace instead
	//this method makes sure that the user can resize the timeline when they think they can
	if (a.target.id == "timeline_edge_detector") {
		cursor.downType = "timeEdge";
		return;
	}

	if (a.target.id == "timeline_extender") {
		cursor.downType = "timeExtend";
		return;
	}

	if (φOver(timeline_blocks_container)) {
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
			timeline_oldKeyPos = [oldW, oldH];
			cursor.downType = "timeDragging";
			return;
		}
		
		//change selection
		select(newH, newW);
		cursor.downType = "timeBlockzone";
		return;
	}
	if (φOver(timeline_container)) {
		cursor.downType = "time";
		return;
	}

	//sidebar detection
	if (a.target.id == "sidebar_edge_detector") {
		cursor.downType = "sideEdge";
		return;
	}

	if (φOver(sidebar_container)) {
		return;
	}

	

	cursor.downType = "work";
	toolCurrent.mouseDown(a);
}

function handleMouseMove(a) {
	cursor.x = a.clientX;
	cursor.y = a.clientY;

	//different behavior depending on the type of down-ness
	if (cursor.down) {
		switch (cursor.downType) {
			case "timeDragging":
				var pos = cursorTimelinePos();
				var box = timeline_selector.getBoundingClientRect();

				//constrain pos to be inside the timeline
				pos[0] = clamp(pos[0], 0.5, timeline.len-0.5);
				pos[1] = clamp(pos[1], 0.5, timeline.layerIDs.length-0.5);
				//update the selection box
				φSet(timeline_selector, {
					'x': pos[0] * (timeline_blockW + 1) - (box.width / 2),
					'y': timeline_headHeight + pos[1] * (timeline_blockH + 1) - (box.height / 2)
				});
				break;
			case "timeEdge":
				var box = base.getBoundingClientRect();
				var cursorVbaseY = cursor.y - box.y;
				var goodHeight = box.height - cursorVbaseY;

				φSet(timeline_container, {'hinv': goodHeight});
				resizeTimeline(box.width, clamp(goodHeight, 0, box.height));
				resizeSidebar(undefined, box.height - goodHeight);
				break;
			case "timeExtend":
				var xRel = cursorRelativeTo(timeline_extender)[0] - 3;
				if (Math.abs(xRel) > timeline_blockW) {
					var extraFrames = Math.round(xRel / timeline_blockW);
					changeAnimationLength(clamp(timeline.len + extraFrames, 1, 1e1001));
				}
				break;
			case "timePlayhead":
				updatePlayheadPosition();
				break;
			case "timeBlockzone":
				//drag the selection box around

			case "sideEdge":
				var height = φGet(sidebar_background, "height");
				var newWidth = clamp(cursorWorkspaceCoordinates()[0], 0, φGet(base, "width"));
				resizeSidebar(newWidth, height);
				break;
			case "time":
				break;
			case "work":
				toolCurrent.mouseMove(a);
				break;
			case "pickerAB":
				var box = sidebar_colorPicker.getBoundingClientRect();
				var cx = (cursor.x - box.x) / box.width;
				var cy = (cursor.y - box.y) / box.height;
				cx = clamp(cx, 0, 1);
				cy = clamp(cy * (11 / 10), 0, 1);
				
				setColorRGBA(Math.floor(cy * 255), Math.floor(cx * 255), "", "");
				break;
			case "pickerC":
				var box = sidebar_colorPicker.getBoundingClientRect();
				var cx = (cursor.x - box.x) / box.width;
				cx = clamp(cx, 0, 1);
				setColorRGBA("", "", cx * 255, "");
				break;
			case "pickerD":
				var box = sidebar_colorPicker.getBoundingClientRect();
				var cx = (cursor.x - box.x) / box.width;
				cx = clamp(cx, 0, 1);

				setColorRGBA("", "", "", cx);
				break;
			default:
				console.log(`unknown down type: ${cursor.downType}`);
		}
	}
}

//for calling from the document, where variables can't be accessed
function setDownType(val) {
	console.log(val);
	cursor.downType = val;
}

function handleMouseUp(a) {
	if (cursor.downType == "work") {
		toolCurrent.mouseUp(a);
	}
	if (cursor.downType == "timeDragging") {
		//figure out where the keyframe should go
		var pos = cursorTimelinePos();
		var p = timeline_oldKeyPos;
		pos[0] = clamp(Math.floor(pos[0]), 0, timeline.len-1);
		pos[1] = clamp(Math.floor(pos[1]), 0, timeline.layerIDs.length-1);

		//if the selection box has been moved, shift the keyframes as well
		if (pos[0] != p[0] || pos[1] != p[1]) {
			timeline.t = pos[0];
			timeline.s = pos[1];

			//move the keyframe
			makeKeyframe(pos[1], pos[0], timeline.l[timeline.layerIDs[p[1]]][p[0]]);
			makeUnKeyframe(p[1], p[0]);
			updatePlayheadPosition();
	
			//put the selection box back where it should be
			φSet(timeline_selector, {
				'x': pos[0] * (timeline_blockW + 1),
				'y': timeline_headHeight + pos[1] * (timeline_blockH + 1)
			});
		}



	}
	cursor.down = false;
}

//runs the bare essentials of the page
function handleResize(a) {
	var spaceW = window.innerWidth * 0.96;
	var spaceH = window.innerHeight * 0.95;
	var timeDims = timeline_background.getBoundingClientRect();
	var sideDims = sidebar_background.getBoundingClientRect();
	
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
}

function handleWheel(a) {
	a.preventDefault();
	moveWorkspace(a.deltaX, a.deltaY);
}

function resizeSidebar(w, h) {
	var minPickerWidth = 250;
	var maxPickerWidth = 340;
	var toolWidth = 50;

	if (w == undefined || h == undefined) {
		var oldDims = φGet(sidebar_background, ["width", "height"]);
		w = w ?? oldDims[0];
		h = h ?? oldDims[1];
	}
	w = +w;
	h = +h;
	
	w = Math.max(w, toolWidth + minPickerWidth);

	//if the panel is wide enough, put color properties to the side. If it's too small, they'll go below instead
	var sideProps = false;
	var pickerWidth = w - toolWidth;
	if (pickerWidth > maxPickerWidth) {
		pickerWidth = minPickerWidth;
		sideProps = true;
	}
	var pickerHeight = pickerWidth * 1.1;
	var squareSize = +φGet(activeColor_stroke, "width");

	φSet(sidebar_background, {
		'width': w,
		'height': h
	});
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

//resizes timeline to the specified width and height
function resizeTimeline(w, h) {
	var spaceH = φGet(base, "height");
	var invH = spaceH - h;

	//these two lines aren't confusing at all I'm sure
	φSet(timeline_container, {
		'hinv': h,
		'y': invH
	});
	φSet(timeline_background, {
		'width': w,
		'height': h,
	});
	φSet(timeline_edge_detector, {
		'width': w,
	});
	φSet(timeline_playhead, {
		'height': h
	});
}

function updateTimelineExtender() {
	//always set it to the end of the timeline, with the height of the number of layers
	φSet(timeline_extender, {
		'x': (timeline_blockW + 1) * (timeline.len + 0.5),
		'height': (timeline_blockH + 1) * timeline.layerIDs.length
	});
}

function cursorTimelinePos() {
	var timeB = timeline_blocks_container.getBoundingClientRect();
	return [(cursor.x + 1 - timeB.x) / (timeline_blockW+1), (cursor.y - timeB.y - timeline_headHeight) / (timeline_blockH+1)];
}
function updatePlayheadPosition() {
	var hoverPos = cursorTimelinePos();
	hoverPos = [Math.floor(hoverPos[0]), Math.floor(hoverPos[1])];
	
	//make sure hover pos is in bounds as well
	hoverPos[0] = clamp(hoverPos[0], 0, timeline.len-1);
	if (hoverPos[0] != timeline.t) {
		select(timeline.s, hoverPos[0]);
	}
}

function handleUnload(e) {
	//in the unlikely event that a browser is being used which allows custom escape messages
	(e || window.event).returnValue = `Are you sure you want to exit? You may have unsaved changes.`;
	return `Are you sure you want to exit? You may have unsaved changes.`;
}