


var cameraTrack = 'earth';
var cameraX = 0;
var cameraY = 0;
var cameraScale = 1E-10;
var cameraScaleBounds = [1E-10, 4.85E-9];

var cW = 640;
var cH = 640;

var inputZoom = 0;
var inputX = 0;
var inputY = 0;

var time = 0;
//ratio of world time to real seconds
var tRatio = 0.01;



function spaceToScreen() {
	
}

function setup() {
	createCanvas(cW, cH);
	convertPeriods();
	noStroke();
}

function drawBodies() {
	
	var SB = solarBodies;

	solarKeys.forEach(b => {
	
	var pos = calculatePos(b);
	
	fill(solarBodies[b].c);
	circle((cW / 2) + pos[0] * cameraScale, 
			(cH / 2) + pos[1] * cameraScale, 
			Math.max(5, SB[b].r * cameraScale));
	});
}

//Processing says that the draw function is the main function
function draw() {
	background(0);
	
	time += deltaTime * tRatio;

	handleCamera();
	
	
	
	//draw the universe
	solarBodies["sun"].draw();

	//update camera track
	
	//tracking notice
	textAlign(LEFT);
	text(`tracking: ${cameraTrack}`, 10, cH - 20);
}

function handleCamera() {
	//inputs
	var panMult = 10;
	cameraScale *= 1 + 0.01 * (deltaTime * inputZoom);
	cameraScale = clamp(cameraScale, min, max);
	cameraX += panMult * (1 / cameraScale) * (inputX);
	cameraY += panMult * (1 / cameraScale) * (inputY);

	//account for camera tracking
	cameraX -= solarBodies[cameraTrack].dx;
	cameraY -= solarBodies[cameraTrack].dy;
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
			//switch tracking object
			var sk = solarKeys;
			var len = sk.length;
			cameraTrack = sk[(sk.indexOf(cameraTrack)+1) % len];
			[cameraX, cameraY] = calculatePos(cameraTrack);
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