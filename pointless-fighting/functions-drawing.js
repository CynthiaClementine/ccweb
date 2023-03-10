/*
INDEX:
	drawCircle(color, x, y, r);
	drawLine(color, xyFrom, xyTo, width);
	drawMeter(color, x, y, width, height, percentage);
	drawRoundedRectangle(x, y, width, height, arcRadius);
	drawSelectionBox(x, y, width, height);

	drawBackground();
	drawKeys();
	setCanvasPreferences();
	setCanvasResolutionMult(settingNumber);
*/


//general functions
function drawCircle(color, x, y, r) {
	ctx.beginPath();
	ctx.fillStyle = color;
	ctx.ellipse(x, y, r, r, 0, 0, Math.PI * 2);
	ctx.fill();
}

function drawLine(color, xyFrom, xyTo, width) {
	ctx.beginPath();
	ctx.strokeStyle = color;
	ctx.lineWidth = width;
	ctx.moveTo(xyFrom[0], xyFrom[1]);
	ctx.lineTo(xyTo[0], xyTo[1]);
	ctx.stroke();
}

function drawMeter(color, x, y, width, height, percentage) {
	var wBuffer = 3 * boolToSigned(width > 0);
	var hBuffer = 3 * boolToSigned(height > 0);
	ctx.strokeStyle = color;
	ctx.fillStyle = color;
	ctx.lineWidth = "2";
	ctx.beginPath();
	ctx.rect(x, y, width, height);
	ctx.stroke();
	ctx.fillRect(x + wBuffer, y + hBuffer, (width - (wBuffer * 2)), (height - (hBuffer * 2)) * percentage);
}

function drawRoundedRectangle(x, y, width, height, arcRadius) {
	y += ctx.lineWidth / 2;
	x += ctx.lineWidth / 2;
	height -= ctx.lineWidth;
	width -= ctx.lineWidth;
	ctx.beginPath();
	ctx.moveTo(x + arcRadius, y);
	ctx.lineTo(x + width - arcRadius, y);
	ctx.quadraticCurveTo(x + width, y, x + width, y + arcRadius);
	ctx.lineTo(x + width, y + height - arcRadius);
	ctx.quadraticCurveTo(x + width, y + height, x + width - arcRadius, y + height);
	ctx.lineTo(x + arcRadius, y + height);
	ctx.quadraticCurveTo(x, y + height, x, y + height - arcRadius);
	ctx.lineTo(x, y + arcRadius);
	ctx.quadraticCurveTo(x, y, x + arcRadius, y);
}

function drawSelectionBox(x, y, width, height) {
	ctx.lineWidth = 2;
	ctx.strokeStyle = color_editor_selection;
	drawRoundedRectangle(x, y, width, height, canvas.height / 100);
	ctx.stroke();
}

function drawTextBox(x, y, text, color) {
	
}






function drawBackground() {
	//draw static
	var val;
	var corner1 = spaceToScreen(...camera.cornerCoords[0]);
	var corner2 = spaceToScreen(...camera.cornerCoords[1]);

	//align corner1 and corner2 to the static grid
	corner1[0] = Math.floor(corner1[0] / static_size) * static_size;
	corner1[1] = Math.floor(corner1[1] / static_size) * static_size;

	corner2[0] = Math.floor(corner2[0] / static_size) * static_size;
	corner2[1] = Math.floor(corner2[1] / static_size) * static_size;
	
	//pull 
	//draw the thing
	ctx.drawImage(data_images.Background, )

	for (var a=Math.floor(corner1[1]); a<corner2[1]; a+=static_size) {
		for (var b=Math.floor(corner1[0]); b<corner2[0]; b+=static_size) {
			val = Math.floor((static_lumBase + (Math.random() - 0.5) * static_lumSpread) * 255);
			//values are in a color table so string concatination doesn't have to happen during this process
			ctx.fillStyle = data_colorTable[val];
			ctx.fillRect(b, a, static_size, static_size);
		}
	}
}

function drawKeys() {
	var unit = 10;

	ctx.fillStyle = player.keysDown[0] ? color_grey_light : color_grey_dark;
	ctx.fillRect(unit, canvas.height - unit * 3, unit * 2, unit * 2);

	ctx.fillStyle = player.keysDown[1] ? color_grey_light : color_grey_dark;
	ctx.fillRect(unit * 4, canvas.height - unit * 6, unit * 2, unit * 2);

	ctx.fillStyle = player.keysDown[2] ? color_grey_light : color_grey_dark;
	ctx.fillRect(unit * 7, canvas.height - unit * 3, unit * 2, unit * 2);

	ctx.fillStyle = player.keysDown[3] ? color_grey_light : color_grey_dark;
	ctx.fillRect(unit * 4, canvas.height - unit * 3, unit * 2, unit * 2);
}

function setCanvasPreferences() {	
	ctx.textBaseline = "middle";
	ctx.imageSmoothingEnabled = false;
}

function setCanvasResolutionMult(settingNumber) {
	var defaultSize = 640;
	var mult = settings_resolutions[settingNumber][0] / 640;
	canvas.width = settings_resolutions[settingNumber][0];
	canvas.height = settings_resolutions[settingNumber][1];
	camera_scaleMin = 10 * mult;
	camera_scaleMax = 60 * mult;
	camera_scaleDefault = 40 * mult;
	camera.targetScale = camera_scaleDefault;

	setCanvasPreferences();
}