

function draw() {
	drawSky();
	drawClouds();
	drawWater();

	drawSnellWindow();

	//bridge
	ctx.globalAlpha = 1;
	ctx.strokeStyle = color_bridge;
	ctx.lineWidth = canvas.height / 300;
	ctx.fillStyle = color_bridge;
	var ps = [];
	for (var f=bridge.length-1; f>=Math.floor(player.z); f--) {
		for (var t=0; t<bridge[f].length; t++) {
			if (bridge[f][t]) {
				if (bridge[f][t] > 1) {
					ctx.fillStyle = powerup_colors[bridge[f][t]];
					ctx.strokeStyle = powerup_colors[bridge[f][t]];
				}

				ps = [
					bridgeToScreen(t, f),
					bridgeToScreen(t+1, f),
					bridgeToScreen(t+1, f+1),
					bridgeToScreen(t, f+1)
				];
				ctx.beginPath();
				ctx.moveTo(ps[0][0], ps[0][1]);
				ctx.lineTo(ps[1][0], ps[1][1]);
				ctx.lineTo(ps[2][0], ps[2][1]);
				ctx.lineTo(ps[3][0], ps[3][1]);
				ctx.lineTo(ps[0][0], ps[0][1]);
				ctx.fill();
				ctx.stroke();
				if (bridge[f][t] > 1) {
					ctx.fillStyle = color_bridge;
					ctx.strokeStyle = color_bridge;
				}
			}
		}
	}


	//player shadow
	// drawPlayerShadow();

	drawScaffolding();

	//player
	player.draw();

	//draw ui
	drawUI();

	if (goFast && !player.dead) {
		drawSepia();
	}
}

function drawSepia() {
	ctx.globalAlpha = 0.3;
	ctx.fillStyle = color_sepia;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.globalAlpha = 1;
	if (Math.random() < 10 * player.lastDT) {
		ctx.fillStyle = color_sepiaDark;
		ctx.fillRect(Math.floor(Math.random() * canvas.width), 0, canvas.width / 200, canvas.height);
	}

}

function drawPlayerShadow() {
	if (player.constructor.name == "Player_Boat") {
		return;
	}
	var numPts = 12;
	var shadowPts = [];

	var sunOffset = calcSunPos();
	sunOffset[1] /= starDist;
	sunOffset[2] /= starDist;
	//sun can't cast a shadow if it's below the horizon
	if (sunOffset[1] <= 0) {
		return;
	}
	ctx.globalAlpha = 0.4 * (1 - Math.acos(sunOffset[1]));
	var center = [player.x, playerTrueZ];

	// var dpro = dayCycleQuery();
	var shadowPercent = (player.y > 0) ? (1 / (1 + player.y)) : Math.max((1 - 3 * player.y ** 2), 0);
	var coords = spaceToScreen(player.x, calcHeight(playerTrueZ), playerTrueZ);
	ctx.globalAlpha = 0.4;
	drawEllipse(coords[0], coords[1], (canvas.height / 12) * shadowPercent, (canvas.height / 24) * shadowPercent, "#666");
	ctx.globalAlpha = 1;
}






function drawClouds() {
	var c2d, cdist;
	var hBoost = (gravTime > 0) ? 1 - ((2 * gravTime / gravTimeMax) - 1) ** 6 : 0;

	ctx.globalAlpha = 0.5;
	clouds.forEach(c => {
		//lower opacity if close to the clip plane, just in case
		cdist = c.z - (player.z * cloudMoveRate);
		ctx.globalAlpha = (cdist < 5) ? 0.5 * Math.max(1 - (1 / (cdist + 1.1) ** 2), 0) : 0.5;
		c2d = c.pts.map(a => cloudToSpace(a[0], a[1] - player.z * cloudMoveRate + camera.z + 3)).map(b => spaceToScreen(b[0], b[1] + hBoost, b[2]));
		drawPolygon(c2d, color_clouds);
	});
	ctx.globalAlpha = 1;
}

function drawEllipse(x, y, rx, ry, color) {
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
	ctx.fill();
}

function drawMenu() {
	//background
	ctx.fillStyle = color_bg;
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	ctx.textAlign = "center";
	ctx.font = `${canvas.height / 13}px Ubuntu`;
	ctx.fillStyle = color_text;
	ctx.fillText(`GTTEATINE`, canvas.width / 2, canvas.height * 0.08);

	var buttons = [
		[`Start!`, () => {}, () => {}],
		[`Bridge Width: ${sliceTiles}`, () => {return (sliceTiles > sliceOptions[0]);}, () => {return (sliceTiles < sliceOptions[1]);}],
		[`Player color`, () => {return true;}, () => {return true;}],
		[`Tutorial`, () => {}, () => {}],
		[`Reset`, () => {}, () => {}],
	];


	for (var b=0; b<buttons.length; b++) {
		ctx.fillStyle = (b == 2) ? color_player : color_text;
		ctx.fillText(buttons[b][0], canvas.width / 2, canvas.height * (0.5 + 0.1 * b));

		if (buttons[b][1]()) {
			ctx.fillText(`<`, canvas.width * 0.26, canvas.height * (0.5 + 0.1 * b));
		}
		if (buttons[b][2]()) {
			ctx.fillText(`>`, canvas.width * 0.74, canvas.height * (0.5 + 0.1 * b));
		}
	}
}

function drawTutorial() {
	ctx.fillStyle = color_bg;
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	//there's text.. display it
	ctx.font =  `${canvas.height * tutorialTextSize}px Ubuntu`;
	ctx.textAlign = "left";
	ctx.fillStyle = color_text;
	for (var t=0; t<tutorialText.length; t++) {
		ctx.fillText(tutorialText[t], canvas.width * 0.02, canvas.height * (0.05 + 1.04 * tutorialTextSize * t));
	}
}

function drawScaffolding() {
	var offX = tileWidth * bridge[0].length * 0.5;
	var offY = 0.5;
	
	ctx.lineCap = "butt";
	drawScaffold(-offX, 0);
	drawScaffold(-offX, offY);
	drawScaffold(offX, 0);
	drawScaffold(offX, offY);
	ctx.lineCap = "round";
}

function drawScaffold(x, y) {
	var scaffoldingBits = drawDistBridge * 2;
	var coolMult = 1.2;
	ctx.lineWidth = canvas.height / 100;
	ctx.strokeStyle = color_bridgeDark;
	ctx.beginPath();
	var coords = spaceToScreen(x, calcHeight(0) + y, 0);
	var perc;
	for (var h=-2*y; h<scaffoldingBits; h++) {
		perc = h / scaffoldingBits;
		coords = spaceToScreen(x, calcHeight(perc * drawDistBridge * coolMult) + (1 - perc) * y, perc * drawDistBridge * coolMult);
		ctx.lineTo(coords[0], coords[1]);
	}
	ctx.stroke();
}

function drawSky() {
	//background
	ctx.fillStyle = color_bg;
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	//night fade + stars
	var dpro = dayCycleQuery();
	ctx.globalAlpha = doubleSigmoid(dpro, 0, 1, 0.3, 0.7, 0.1);
	ctx.fillStyle = color_night;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	drawStars();

	var sunPos = calcSunPos();
	if (sunPos[2] <= 0) {
		return;
	}
	sunPos = spaceToScreen(camera.x + sunPos[0], camera.y + sunPos[1], camera.z + sunPos[2]);
	
	//red-light refraction
	var timePeaks = [0.30, 0.29, 0.34];
	var timeSpreads = [0.02, 0.03, 0.02];
	var dims = [[0.6, 0.05], [0.5, 0.03], [0.4, 0.01]];
	var colors = ["#F00", "#F80", "#FF0"];
	if (dpro > timePeaks[0] - timeSpreads[0] * 3 && dpro < timePeaks[2] + timeSpreads[2] * 3) {
		var horizonH = bridgeToScreen(0, player.z + drawDistBridge)[1];

		for (var c=0; c<colors.length; c++) {
			ctx.globalAlpha = normal((dpro - timePeaks[c]) / timeSpreads[c]);
			drawEllipse(canvas.width / 2, horizonH, canvas.width * dims[c][0], canvas.height * dims[c][1], colors[c]);
		}
	}

	//sun
	ctx.globalAlpha = 1;
	if (dpro < 0.5) {
		var linter = clamp(1 + (dpro - sunA - 0.25) * 12, 0, 1.2);
		var color = cLinterp(color_sunDay, color_sunSet, linter);
		// console.log(color, linter);
		drawEllipse(sunPos[0], sunPos[1], canvas.height * sunR, canvas.height * sunR, color);

		ctx.globalAlpha = clamp(1 - (linter - 0.6), 0, 1);
		ctx.filter = `blur(${Math.floor(canvas.height / 50)}px)`;
		drawEllipse(sunPos[0], sunPos[1], canvas.height * sunR, canvas.height * sunR, color);
		ctx.filter = `none`;
	}
}

function drawSnellWindow() {
	var angle = Math.PI * 2 * (dayCycleQuery() - sunA);

	//don't have one if circle is entirely behind the camera or sun is below screen
	if (angle < 0 || angle > Math.PI / 2) {
		return;
	}
	var alpha = clamp(Math.cos(angle), 0, 1);
	if (alpha == 0) {
		return;
	}
	

	var camTPt = [camera.x, 2 * killPlane - camera.y, camera.z];

	//first: figure out the oval on the water where the window is
	// var ovalCenter = [0, linterp(camTPt[2], sunPt[2], centerLint)];
	var ovalNear =	[0, camTPt[2] + (camera.y - killPlane) * Math.tan(angle - sunR)];
	var ovalFar =	[0, camTPt[2] + (camera.y - killPlane) * Math.tan(Math.min(angle + sunR, Math.PI * 0.49))];
	var ovalCenter = [0, linterp(ovalNear[1], ovalFar[1], 0.5)];
	
	//next: turn the oval into a set of points
	var camSunCoef = (sunR / camera.scale) * (ovalCenter[1] - camera.z);
	var ovalR = ovalCenter[1] - ovalNear[1];
	var ovalPts = [];
	var buffer1;
	for (var w=0; w<snellPts; w++) {
		buffer1 = polToXY(ovalCenter[0], ovalCenter[1], Math.PI * 2 * (w / snellPts), ovalR);
		buffer1[0] = buffer1[0] * camSunCoef / ovalR;
		ovalPts.push([buffer1[0], killPlane, buffer1[1]]);
	}
	
	//apply some distortion to the points
	
	//remove all points that won't be drawn correctly
	ovalPts = ovalPts.filter(p => p[2] > camera.z + 1);
	ovalPts = ovalPts.map(p => spaceToScreen(p[0], p[1], p[2]));

	//draw to the screen
	if (ovalPts.length > 2) {
		ctx.globalAlpha = alpha;
		var col = cLinterp(color_sunDay, color_sunSet, clamp(1 + (dayCycleQuery() - sunA - 0.25) * 12, 0, 1.2));
		drawPolygon(ovalPts, col);
		ctx.globalAlpha = 1;
	}
}

function drawWater() {
	var angle = Math.PI * 2 * (dayCycleQuery() - sunA);
	var alpha = clamp(Math.cos(angle), 0, 1);

	ctx.fillStyle = color_water;
	var baseHeight = bridgeToScreen(0, player.z + drawDistBridge)[1];
	ctx.fillRect(0, baseHeight, canvas.width, canvas.height / 2);

	if (alpha == 0) {
		return;
	}
	ctx.globalAlpha = alpha;
	ctx.fillStyle = color_water2;
	ctx.fillRect(0, baseHeight + (canvas.height * 0.05), canvas.width, canvas.height / 2);
	ctx.globalAlpha = alpha * alpha;
	drawEllipse(canvas.width / 2, canvas.height, canvas.width, canvas.height - baseHeight * 1.3, color_water3);
}

function drawStars() {
	var dpro = dayCycleQuery();
	//the stars rotate around the ±X pole according to the day cycle. 1 day = 1 full rotation.
	var basePoint;
	stars.forEach(s => {
		basePoint = [0, starDist, 0];
		[basePoint[1], basePoint[0]] = rotate(basePoint[1], basePoint[0], s[1]);
		[basePoint[1], basePoint[2]] = rotate(basePoint[1], basePoint[2], (Math.PI * 0) + (Math.PI * 2 * dpro) - s[0]);

		//if it's not behind the camera it's all good to draw
		if (basePoint[2] > 0) {
			drawEllipse(...spaceToScreen(basePoint[0], camera.y + basePoint[1], camera.z + basePoint[2]), canvas.height / 200, canvas.height / 200, color_star);
		}
	});
}

function drawUI() {
	//distance text
	var meterText = (player.z < 1000) ? (player.z.toFixed(1) + "m") : ((player.z / 1000).toFixed(3) + "km");
	var meterTextTop = (bridgeDistMax < 1000) ? (bridgeDistMax.toFixed(1) + "m") : ((bridgeDistMax / 1000).toFixed(3) + "km");
	ctx.font = `${canvas.height / 20}px Ubuntu`;
	ctx.textAlign = "left";
	ctx.lineWidth = canvas.height / 300;
	ctx.fillStyle = color_text;
	ctx.strokeStyle = color_textLight;
	ctx.strokeText(`now: ${meterText}`, canvas.width * 0.03, canvas.height * 0.05);
	ctx.fillText(`now: ${meterText}`, canvas.width * 0.03, canvas.height * 0.05);
	ctx.strokeText(`top: ${meterTextTop}`, canvas.width * 0.03, canvas.height * 0.1);
	ctx.fillText(`top: ${meterTextTop}`, canvas.width * 0.03, canvas.height * 0.1);
	// ctx.strokeText(`T: ${dayCycleQuery().toFixed(3)}`, canvas.width * 0.03, canvas.height * 0.15);
	// ctx.fillText(`T: ${dayCycleQuery().toFixed(3)}`, canvas.width * 0.03, canvas.height * 0.15);

	if (player.dead) {
		ctx.textAlign = "center";
		ctx.fillText(`reset? (R)`, canvas.width / 2, canvas.height * 0.95);
	}
}

function drawPolygon(polyPoints, fillColor, strokeColor) {
	ctx.beginPath();
	ctx.moveTo(polyPoints[0][0], polyPoints[0][1]);
	for (var h=1; h<polyPoints.length; h++) {
		ctx.lineTo(polyPoints[h][0], polyPoints[h][1]);
	}
	if (fillColor) {
		ctx.fillStyle = fillColor;
		ctx.fill();
	}
	if (strokeColor) {
		ctx.strokeStyle = strokeColor;
		ctx.stroke();
	}
}