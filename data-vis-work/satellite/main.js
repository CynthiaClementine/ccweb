


var cameraTrack = 'earth';
var cameraX = 0;
var cameraY = 0;
var cameraScale = 6.65E-7//1E-10;
var cameraScaleBounds = [8E-10, 4E-3];

var canvas;
var ctx;

var cW = window.innerWidth - 15;
var cH = window.innerHeight - 15;

var focusable = ["sun", "earth", "moon"];

var globalDebug = false;

var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var monthsLen = {
	"Jan": 31, 
	"Feb": 28.25, //each year has 365.25, so feb always gets 28.25 days
	"Mar": 31, 
	"Apr": 30, 
	"May": 31, 
	"Jun": 30, 
	"Jul": 31, 
	"Aug": 31, 
	"Sep": 30, 
	"Oct": 31, 
	"Nov": 30, 
	"Dec": 31
};

//absolute insane syntax
var allDays = (() => {
	var returning = [];
	months.forEach(m => {
		for (var d=1; d<=Math.floor(monthsLen[m]); d++) {
			returning.push(`${m} ${d}`);
		}
	});

	return returning;
})();

var images = {};

var inputZoom = 0;
var inputX = 0;
var inputY = 0;

var highlightObj = undefined;
var highlightPos = [0, 0];

var skipTo = undefined;
var skipSpeed = 0.256;

var time = 0;
var timeEnd = 24566;
//ratio of world time (days) to real seconds
var tRatio = 0.004 / 4;
var tRatioBounds = [5E-4, 0.256];
var tDeltaMax = 0.01;
var tDeltaComputeMax = 4;
var tRatioDefault = tRatio;

var textRatio = 1 / 30;


var yearStart = 1957;
var daysToSeconds = 60 * 60 * 24;
var yearsToDays = 365.25;
var auToMeter = 1.495979E11;

function setup() {
	createCanvas(cW, cH);
	noStroke();
	textFont("Consolas", textRatio * cH);
	textAlign(LEFT);
	rectMode(RADIUS);
	createImages();

	//aug 20 2023 for SLIM
	time = dateToTime(`Dec-1-2021`);

	canvas = defaultCanvas0;
	ctx = canvas.getContext("2d");
}

function createImages() {
	images["satDefault"] = loadImage('img/sat.png');
}

//Processing says that the draw function is the main function
function draw() {
	background(0);

	if (time > timeEnd) {
		tRatio = Math.max(linterp(tRatioBounds[0], 1E-7, (time - timeEnd) / 3), 1E-7);
	}


	//I simply refuse to step more than a certain amount in one frame, it's too computationally expensive
	var tDelta = Math.min(deltaTime * tRatio, tDeltaComputeMax);
	var tGoal = time + tDelta;
	var amount;

	//make sure to phys-step by small time even if the total time elapsed per frame is large
	var first = true;
	while (tDelta > 1E-8) {
		amount = Math.min(tDeltaMax, tDelta);
		time += amount;
		tDelta -= amount;
		// console.log(`phys-stepping by ${amount}d`);
		solarBodies["sun"].tick(amount);

		//tick all inactive satellites (they won't be ticked recursively because they aren't orbiting anything)
		satData.forEach(s => {
			if (s.state < 0) {
				s.tick(amount);
			}
		});

		handleCamera(first);
		first = false;

		//quickstop time skipping
		if (skipTo != undefined && time > skipTo) {
			skipTo = undefined;
			tRatio = tRatioBounds[0];
			tDelta = 0;
		}

	}

	if (Math.abs(time - tGoal) > 1E-3) {
		console.log(`Mismatch in temporal delta!\ngoal: ${tGoal},\n actual: ${time}`);
	}
	
	push();
	scale(1, -1);
	translate(0, -cH);
	//draw the universe (recursively)
	solarBodies["sun"].draw();
	pop();

	//satellite hovers
	if (highlightObj != undefined) {
		drawSatHover();
	}


	
	//HUD text
	//(tracking)
	var yearTime = time / yearsToDays;
	var au = ((1 / cameraScale) * cW) / auToMeter;
	var textRatTrue = textRatio * 1;
	fill("#FFF");

	if (time > timeEnd) {
		textAlign(CENTER);
		text(`The visualization has reached the present day.`, cW * 0.5, cH * textRatTrue);
		textAlign(LEFT);
	}

	text(`Tracking: ${cameraTrack}`, 10, cH * (1 - 3.4 * textRatTrue));
	text(`Date: ${months[floor(yearTime * 12) % 12]} ${floor(yearTime) + yearStart}`, 10, cH * (1 - 2.4 * textRatTrue));
	text(`(${(tRatio * 1000).toFixed(1)} days/second)`, 8, cH * (1 - 1.4 * textRatio));
	text(`The window is ${au.toFixed(4 - max(ceil(Math.log10(au)), 0))} AU across`, 10, cH * (1 - 0.4 * textRatTrue));
	// text(`The window is ${Math.round(((1 / cameraScale) * cW))} m across`, 10, cH * (1 - 0.5 * textRatio));
}

function drawSatHover() {
	var newPos = spaceToScreen(highlightObj.x, highlightObj.y);
	var boxX, boxY;
	if (highlightPos[0] == 0 && highlightPos[1] == 0) {
		[boxX, boxY] = newPos;
	} else {
		boxX = linterp(highlightPos[0], newPos[0], 0.4);
		boxY = linterp(highlightPos[1], newPos[1], 0.4);
	}
	highlightPos = [boxX, boxY];
	boxY = cH - boxY;

	//AAAAAspect ratio
	var adjust = Math.min(cW, cH * 1.5);
	var boxW = adjust * textRatio * 15.5;
	var scaleF = 0.7 / 15.5;
	var boxH = boxW * 0.6;
	var textSize = boxW * scaleF;
	textFont("Consolas", textSize);
	

	fill("#CCF");
	stroke("#AAA");
	rect(boxX, boxY + boxH / 2, boxW / 2, boxH / 2);
	noStroke();

	boxY += textSize;

	//name + launch date
	textAlign(CENTER);
	fill("#202");
	text(highlightObj.id, boxX, boxY);
	//I'm splitting instead of doing a date calculation to prevent any off-by-one erorrs
	text(`Launched: ${highlightObj.moveDat[0].split(" ")[0]}`, boxX, boxY + textSize);
	
	//information blurb
	textAlign(LEFT);
	var spl = highlightObj.text.split("\n");
	for (var l=0; l<spl.length; l++) {
		text(spl[l].replaceAll("\t", ""), boxX - boxW * 0.475, boxY + textSize * (3.5 + l));
	}

	textFont("Consolas", textRatio * cH);
}

function handleCamera(controllable) {
	//inputs
	var zoomMult = 0.005;
	var panMult = 10;

	if (controllable) {
		cameraScale *= 1 + zoomMult * (deltaTime * inputZoom);
		cameraScale = clamp(cameraScale, ...cameraScaleBounds);
		cameraX += panMult * (1 / cameraScale) * inputX;
		cameraY -= panMult * (1 / cameraScale) * inputY;
	}

	//account for camera tracking
	cameraX += solarBodies[cameraTrack].dx;
	cameraY += solarBodies[cameraTrack].dy;
}

function mouseClicked() {
	var dis = 10;
	var selected = undefined;
	
	//loop through all satellites and select the closest
	satData.forEach(s => {
		if (s.state < 0) {
			return;
		}
		var pos = spaceToScreen(s.x, s.y);

		//hgnhnnhjnjb 
		if (Number.isNaN(pos[0])) {
			return;
		}

		//gotta account for the vertical screen flipping
		var tempDist = dist(mouseX, cH - mouseY, ...pos);
		if (globalDebug) {
			console.log(mouseX, mouseY, ...pos);
		}

		if (tempDist < dis) {
			selected = s;
			dis = tempDist;
		}
	});

	highlightObj = selected;
}




//inputs
function keyPressed() {
	switch (key) {
		case "Shift":
			inputZoom = 1;
			break;
		case " ":
			inputZoom = -1;
			break;
		case "Enter":
			for (var k=0; k<satStarts.length; k++) {
				if (satStarts[k] > time) {
					skipTo = satStarts[k];
					tRatio = skipSpeed;
					return;
				}
			}
			break;

		case "ArrowUp":
			inputY = -1;
			break;
		case "ArrowDown":
			inputY = 1;
			break;
		case "ArrowLeft":
			inputX = -1;
			break;
		case "ArrowRight":
			inputX = 1;
			break;
		
		case "]":
		case "}":
		case "[":
		case "{":
			var switchDir = (key == "]" || key == "}") ? 1 : -1;
			//switch tracking object
			var sk = focusable;
			var len = sk.length;
			cameraTrack = sk[(sk.indexOf(cameraTrack) + switchDir + len) % len];
			var body = solarBodies[cameraTrack];
			[cameraX, cameraY] = [body.x - body.dx, body.y - body.dy];
			break;

		case ",":
		case "<":
		case ".":
		case ">":
			var switchDir = (key == "." || key == ">") ? 1 : -1;
			tRatio = clamp(tRatio * (2 ** switchDir), ...tRatioBounds);
			break;

		case "d":
		case "D":
			console.log(timeToDate(time));
			break;
	}
}


function keyReleased() {
	switch (key) {
		case "Shift":
			inputZoom = Math.min(inputZoom, 0);
			break;
		case " ":
			inputZoom = Math.max(inputZoom, 0);
			break;

		case "ArrowUp":
			inputY = Math.max(inputY, 0);
			break;
		case "ArrowDown":
			inputY = Math.min(inputY, 0);
			break;
		case "ArrowLeft":
			inputX = Math.max(inputX, 0);
			break;
		case "ArrowRight":
			inputX = Math.min(inputX, 0);
			break;
	}
}