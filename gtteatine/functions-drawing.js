

function draw() {
	drawSky();
	drawClouds();
	ctx.fillStyle = color_water;
	ctx.fillRect(0, bridgeToScreen(0, player.z + drawDistBridge)[1], canvas.width, canvas.height / 2);

	//bridge
	ctx.strokeStyle = color_bridge;
	ctx.lineWidth = canvas.height / 200;
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
	drawPlayerShadow();

	drawScaffolding();

	//player
	player.draw();

	//draw ui
	drawUI();
}

function drawPlayerShadow() {
	if (player.constructor.name == "Player_Boat") {
		return;
	}
	var dpro = dayCycleQuery();
	var shadowPercent = (player.y > 0) ? (1 / (1 + player.y)) : Math.max((1 - 3 * player.y ** 2), 0);
	var coords = spaceToScreen(player.x, calcHeight(playerTrueZ), playerTrueZ);
	ctx.globalAlpha = 0.4;
	drawEllipse(coords[0], coords[1], (canvas.height / 12) * shadowPercent, (canvas.height / 24) * shadowPercent, "#666");
	ctx.globalAlpha = 1;
}






function drawClouds() {
	ctx.fillStyle = color_clouds;
	var c2d;
	var cdist;
	var hBoost = (gravTime > 0) ? 1 - ((2 * gravTime / gravTimeMax) - 1) ** 6 : 0;

	ctx.globalAlpha = 0.5;
	clouds.forEach(c => {
		//lower opacity if close to the clip plane, just in case
		cdist = c.z - (player.z * cloudMoveRate);
		if (cdist < 5) {
			ctx.globalAlpha = 0.5 * Math.max(1 - (1 / (cdist + 1.1) ** 2), 0);
		}
		c2d = c.pts.map(a => cloudToSpace(a[0], a[1] - player.z * cloudMoveRate + camera.z + 3)).map(b => spaceToScreen(b[0], b[1] + hBoost, b[2]));
		ctx.beginPath();
		ctx.moveTo(c2d[0][0], c2d[0][1]);
		for (var d=1; d<c2d.length; d++) {
			ctx.lineTo(c2d[d][0], c2d[d][1]);
		}
		ctx.fill();
		ctx.globalAlpha = 0.5;
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
		[`Reset?`, () => {}, () => {}],
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

function drawScaffolding() {
	var offX = tileWidth * bridge[0].length * 0.5;
	var offY = 0.5;

	drawScaffold(-offX, 0);
	drawScaffold(-offX, offY);
	drawScaffold(offX, 0);
	drawScaffold(offX, offY);
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

	//red-light refraction
	var peakTime = 0.302;
	var spreadTime = 0.04;
	if (Math.abs(dpro - peakTime) < spreadTime * 3) {
		ctx.globalAlpha = normal((dpro - peakTime) / spreadTime);
	}

	//sun
	ctx.globalAlpha = 1;
	var sunPos = [0, starDist * Math.cos(Math.PI * 2 * (dpro - sunA)), starDist * Math.sin(Math.PI * 2 * (dpro - sunA))];
	if (sunPos[2] > 0 && dpro < 0.5) {
		sunPos = spaceToScreen(camera.x + sunPos[0], camera.y + sunPos[1], camera.z + sunPos[2]);
		var color = cLinterp(color_sunDay, color_sunSet, clamp((dpro - sunA) * 4.5, 0, 1.2));
		drawEllipse(sunPos[0], sunPos[1], canvas.height * sunR, canvas.height * sunR, color);
		ctx.filter = `blur(${Math.floor(canvas.height / 100)}px)`;
		drawEllipse(sunPos[0], sunPos[1], canvas.height * sunR, canvas.height * sunR, color);
		ctx.filter = `none`;
		console.log(color, (dpro - sunA) * 4.5);
	}
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
	ctx.strokeText(`top: ${meterTextTop}`, canvas.width * 0.03, canvas.height * 0.09);
	ctx.fillText(`top: ${meterTextTop}`, canvas.width * 0.03, canvas.height * 0.09);
	ctx.strokeText(`T: ${dayCycleQuery().toFixed(3)}`, canvas.width * 0.03, canvas.height * 0.13);
	ctx.fillText(`T: ${dayCycleQuery().toFixed(3)}`, canvas.width * 0.03, canvas.height * 0.13);

	if (player.dead) {
		ctx.textAlign = "center";
		ctx.fillText(`reset? (R)`, canvas.width / 2, canvas.height * 0.95);
	}
}