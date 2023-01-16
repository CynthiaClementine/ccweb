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

var color_bg = "#000000";
var color_line = "#FFFFFF";
var color_debug = "#FF00FF";
var color_playhead = "#8a0d0d";

var colors_menu = {
	bg: "#333333",
	line:"#FFFFFF",
	line2:"#3e3b54",
	text: "#666688",
}

var canvas;
var canvasBaselineSize = [];
var ctx;

var button_alt = false;
var button_command = false;
var button_control = false;
var button_shift = false;

var cursor = {
	down: false,
	dist: 0,
	dTolerance: 500,
	aTolerance: Math.PI / 10,
	x: 0,
	y: 0,
	dx: 0,
	dy: 0,
	a: 0,
}

var debug_active = false;

var lastPInfo = {
	coords: [],
	a: 0,
}


var menu_weight = 2;

var smoothAmount = 10;

var timer;
var timeline = new Timeline({"Layer 1": [
	new Layer([/*[[-402,313], [1000,41]], [[0,0], [731,41]], [[0, 500], [100,500], [723,380], [723, 280]], []*/])]
});



var toolCurrent;
var toolMap = {
	"KeyY": Pencil,
	"KeyP": Pen,
	"KeyS": Shape,
	"KeyK": Fill,
	"KeyV": Move,
};

var workspace_width = 1000;
var workspace_height = 600;
var workspace_margin = 0.1;
var workspace_offsetX = 0;
var workspace_offsetY = 0;
var workspace_panSpeed = 1;
var workspace_scaling = 1;
var workspace_scaleBounds = [0.02, 100];
var workspace_timeHeight = 0.1;


function setup() {
	canvas = document.getElementById("c");
	canvasBaselineSize = [canvas.width, canvas.height];
	ctx = canvas.getContext("2d");
	toolCurrent = new Pencil();

	
	//DEBUG CODE
	function r() {
		return [
			Math.round(Math.random() * workspace_width),
			Math.round(Math.random() * workspace_height),
		];
	}

	function create(points) {
		toolCurrent.bufferPoints = points;
		toolCurrent.pushToWorkspace();
	}

	// create([[410,507],[614,390],[844,406],[1015,376],[1134,275],[1161,181],[1157,100]]);
	// create([[590,495],[582,495],[581,496],[580,496],[577,496],[576,497],[575,498],[573,498],[569,500],[567,502],[565,503],[563,504],[562,505],[559,508],[558,509],[555,513],[554,515],[553,516],[552,518],[552,520],[551,521],[550,524],[550,526],[550,529],[550,532],[549,534],[549,541],[550,541],[550,543],[551,544],[553,545],[557,546],[560,547],[563,547],[568,548],[571,549],[575,549],[580,550],[585,551],[589,552],[593,552],[597,552],[600,553],[609,553],[612,552],[613,552],[616,551],[618,550],[618,550],[619,549]]);
	// create([[362,241],[362,220],[379,196],[393,188],[410,184],[445,184],[469,202],[489,227],[498,246],[503,282],[496,295],[482,306],[455,313],[406,313],[396,306],[388,292],[388,268],[405,258],[426,258],[438,270],[438,278],[410,308],[372,322],[327,333],[272,331]]);
	//create([r(), r(), r(), r(), r(), r()]);
	// create([[705,432],[760,430],[881,402],[922,395],[960,394]]);
	create([[295,60],[300,59],[311,55],[334,45],[369,31],[413,14],[439,5],[464,-5],[485,-13],[512,-23],[527,-28],[539,-31],[543,-32],[551,-36],[556,-37],[559,-38],[563,-38],[562,-37],[556,-33],[547,-28],[536,-20],[512,-3],[481,18],[461,31],[441,48],[421,61],[382,90],[363,106],[351,117],[341,125],[339,128],[338,128],[338,129],[349,129],[358,127],[369,124],[379,122],[394,117],[412,112],[433,107],[455,102],[476,95],[499,87],[520,80],[529,77],[562,67],[574,63],[577,60],[585,57],[590,56],[594,54],[596,54],[597,53],[598,53],[597,53],[587,56],[568,66],[539,83],[500,106],[458,131],[422,155],[402,170],[392,177],[389,180],[383,184],[378,190],[377,190],[376,191],[376,192],[378,192],[384,190],[390,187],[410,181],[420,179],[432,175],[446,172],[461,168],[477,164],[486,163],[499,161],[512,158],[527,156],[534,154],[539,153],[546,152],[549,152],[551,151],[549,151],[546,153],[539,156],[527,163],[519,167],[497,179],[490,183],[488,184],[487,184],[487,185],[494,185],[501,184],[507,183],[537,183],[534,186],[532,187],[529,191],[514,206],[513,209],[508,213],[508,214],[520,214],[526,213],[533,212],[536,211],[540,211],[542,210],[540,211],[538,212],[535,214],[534,216],[532,218],[530,219]]);

	//!DEBUG CODE

	handleResize();
	setCanvasPreferences();

	timer = window.requestAnimationFrame(mainDraw);
}

//runs the bare essentials of the page
function mainBASELINE() {
	ctx.fillStyle = "#202";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	ctx.fillStyle = "#FFF";
	ctx.font = "30px";
	ctx.fillText('the page is loade', 20, 100);


	timer = window.requestAnimationFrame(mainBASELINE);
}


//draws the background as well as the lines that exist
function mainDraw() {
	//draw bege
	ctx.fillStyle = color_bg;
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	//draw box around the workspace
	ctx.strokeStyle = colors_menu.line;
	ctx.lineWidth = menu_weight;
	var startPos = workspaceToCanvas(0, 0);
	ctx.beginPath();
	ctx.rect(startPos[0], startPos[1], workspace_width * workspace_scaling, workspace_height * workspace_scaling);
	ctx.stroke();

	//draw tool type
	ctx.fillStyle = color_debug;
	ctx.font = `${canvas.height / 30}px Ubuntu`;
	ctx.fillText(toolCurrent.constructor.name, canvas.width * 0.01, canvas.height * 0.03);
	

	//main workspace - draw all layers
	timeline.layerNames.forEach(ln => {
		if (timeline.l[ln][timeline.t] != undefined) {
			timeline.l[ln][timeline.t].draw();
		}
	});
	toolCurrent.drawOverlay();

	//timeline
	timeline.draw();
	
	timer = window.requestAnimationFrame(mainDraw);
}


function handleMouseDown(a) {
	updateCursorPos(a);

	if (cursor.x < 0 || cursor.x > canvas.width) {
		return;
	}
	if (cursor.y < 0 || cursor.y > canvas.height) {
		return;
	}

	if (timeline.hoverStatus() == 0) {
		timeline.movingHeight = true;
		return;
	}
	if (timeline.hoverStatus() == 1) {
		for (var a=0; a<timeline.buttons.length; a++) {
			if (timeline.buttons[a].press()) {
				return;
			}
		}
		return;
	}
	cursor.down = true;
	toolCurrent.mouseDown(a);
}

function handleMouseMove(a) {
	updateCursorPos(a);

	if (timeline.movingHeight) {
		timeline.height = clamp(1 - (cursor.y / canvas.height), 0, 1);
		timeline.buttons[0].y = (1 - timeline.height) + 0.03;
		return;
	}

	//change cursor if hovering over the timeline
	if (!cursor.down) {
		canvas.style.cursor = (timeline.hoverStatus() == 0) ? "row-resize" : "auto";
	}

	toolCurrent.mouseMove(a);
}

function handleMouseUp(a) {
	if (!cursor.down) {
		//timeline space editing
		if (timeline.movingHeight) {
			timeline.movingHeight = false;
			return;
		}
		return;
	}

	cursor.down = false;
	toolCurrent.mouseUp(a);
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
			button_control = true;
			return;
		case "Meta":
			button_command = true;
			return;
	}

	if (a.code == "BracketRight") {
		debug_active = !debug_active;
		setCanvasPreferences();
		return;
	}

	if (a.code.slice(0, 5) == "Arrow") {
		switch(a.code) {

		}
		return;
	}


	//check for mode changes while alt isn't pressed
	if (!button_alt) {
		if (toolMap[a.code]) {
			toolCurrent = new toolMap[a.code];
		}
	}
}

function handleKeyRelease(a) {
	//special buttons
	switch (a.key) {
		case "Shift":
			button_shift = false;
			return;
		case "Alt":
			button_alt = false;
			return;
		case "Control":
			button_control = false;
			return;
		case "Meta":
			button_command = false;
			return;
	}
}

function handleResize(a) {
	canvas.width = window.innerWidth * 0.96;
	canvas.height = window.innerHeight * 0.95;
	setCanvasPreferences();
}

function handleWheel(a) {
	a.preventDefault();
	moveWorkspace(a.deltaX, a.deltaY);
}
