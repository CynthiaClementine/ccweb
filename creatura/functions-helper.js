function drawSky() {
	//mid part
	ctx.fillStyle = color_sky_mid;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.fillRect(-canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);

	//low part
	ctx.fillStyle = color_sky_low;
	ctx.fillRect(-canvas.width * 0.5, canvas.height * 1.3 * -player.phi, canvas.width, canvas.height / 2);
}

function drawWorld() {
	var pCell = [Math.floor(player.x), Math.floor(player.z)];
	var vOff;
	for (var q=drawDistance; q>-1; q--) {
		for (var hOff = -q; hOff<=q; hOff++) {
			vOff = q - Math.abs(hOff);

			drawCell([pCell[0] + hOff, pCell[1] + vOff], pCell);
			if (vOff != 0) {
				drawCell([pCell[0] + hOff, pCell[1] - vOff], pCell);
			}
		}
	}
}

//ground is a diamond around the player
function drawGround() {
	var ground = [
		[drawDistance, 0, 0],
		[0, 0, drawDistance],
		[-drawDistance, 0, 0],
		[0, 0, -drawDistance],
	];

	var sky = [
		[0.7, player.y + 0.1, 0],
		[0.5, player.y + 0.1, 0.5],
		[0, player.y + 0.1, 0.7],
		[-0.5, player.y + 0.1, 0.5],
		[-0.7, player.y + 0.1, 0],
		[-0.5, player.y + 0.1, -0.5],
		[0, player.y + 0.1, -0.7],
		[0.5, player.y + 0.1, -0.5],
	];
	[...ground, ...sky].forEach(p => {
		[p[0], p[2]] = [p[0] + player.x, p[2] + player.z];
	});

	drawWorldPoly(ground, color_ground);
	drawWorldPoly(sky, color_sky_high);
}

//draws an individual map cell. Doesn't actually draw all the walls because that's redundant
function drawCell(drawCell, pCell) {
	//figure out which walls to actually draw
	var offsetX = drawCell[0] - pCell[0];
	var offsetZ = drawCell[1] - pCell[1];
	ctx.globalAlpha = Math.min(1, 2 * (1 - ((Math.abs(offsetX) + Math.abs(offsetZ)) / drawDistance)));
	
	if (offsetX == 0 && offsetZ == 0) {
		//floor + entities
		drawCellWalls(drawCell, false, false, false, false);
		drawCellEntities(drawCell);
	}
	
	// console.log(`drawing cell ${drawCell} with offsetH = ${offsetH}, offsetV = ${offsetV}`);
	drawCellWalls(drawCell, (offsetX <= 0) || (drawCell[0] == 0), (offsetZ <= 0) || (drawCell[1] == 0), offsetX >= 0, (offsetZ >= 0));
	// drawCellWalls(drawCell, 0, 0, 0, (drawCell[0] == 0));

	if (offsetX != 0 || offsetZ != 0) {
		drawCellEntities(drawCell);
	}
	ctx.globalAlpha = 1;
}

function drawCellEntities(cell) {
	var cellObj = awa(cell);
	if (!cellObj) {
		return;
	}
	cellObj.entities.forEach(e => {
		e.beDrawn();
	});
}

//we're validating that the cell exists
function awa(cellCoords) {
	var line = world_map[cellCoords[1]];
	if (!line) {
		return undefined;
	}
	return line[cellCoords[0]];
}

//draws certain walls of a cell
function drawCellWalls(cell, left, up, right, down) {
	var cellObj = awa(cell);
	if (!cellObj) {
		return;
	}
	var bc = [
		[0, 0, 0],
		[1, 0, 0],
		[1, 0, 1],
		[0, 0, 1],
		[0, 1, 0],
		[1, 1, 0],
		[1, 1, 1],
		[0, 1, 1]
	];
	bc.forEach(p => {
		p[0] += cell[0];
		p[2] += cell[1];
	});

	if (left && cellObj.left != ' ') {
		// console.log(`drawing ${cell[0]} ${cell[1]} left`);
		drawCellWall(cellObj.left, [bc[0], bc[3], bc[7], bc[4]]);
	}
	if (up && cellObj.up != ' ') {
		drawCellWall(cellObj.up, [bc[0], bc[1], bc[5], bc[4]]);
		// console.log(`drawing ${cell[0]} ${cell[1]} up`);
	}
	if (right && cellObj.right != ' ') {
		drawCellWall(cellObj.right, [bc[1], bc[2], bc[6], bc[5]]);
		// console.log(`drawing ${cell[0]} ${cell[1]} right`);
	}
	if (down && cellObj.down != ' ') {
		drawCellWall(cellObj.down, [bc[2], bc[3], bc[7], bc[6]]);
		// console.log(`drawing ${cell[0]} ${cell[1]} down`);
	}

	//also draw the floor. I guess
	drawCellWall(cellObj.floor, [bc[0], bc[1], bc[2], bc[3]]);
}

function drawCellWall(wallID, cc) {
	switch (wallID) {
		case 'x':
			drawWorldPoly(cc, color_walls_basic);
			break;
		case 'H':
			drawWorldPoly(cc, color_walls_house);
			break;
		case 'h':
			drawWorldPoly(cc, color_walls_house);
			var intersTop = [linterpMulti(cc[0], cc[1], 0.1), linterpMulti(cc[0], cc[1], 0.2), linterpMulti(cc[0], cc[1], 0.35), linterpMulti(cc[0], cc[1], 0.45), 
				linterpMulti(cc[0], cc[1], 0.55), linterpMulti(cc[0], cc[1], 0.65), linterpMulti(cc[0], cc[1], 0.8), linterpMulti(cc[0], cc[1], 0.9)];

			var intersLow = [linterpMulti(cc[2], cc[3], 0.1), linterpMulti(cc[2], cc[3], 0.2), linterpMulti(cc[2], cc[3], 0.35), linterpMulti(cc[2], cc[3], 0.45), 
				linterpMulti(cc[2], cc[3], 0.55), linterpMulti(cc[2], cc[3], 0.65), linterpMulti(cc[2], cc[3], 0.8), linterpMulti(cc[2], cc[3], 0.9)];
			//house wall
			
			drawWorldPoly([intersLow[0], intersLow[1], intersTop[1], intersTop[0]], color_walls_house_dark);
			drawWorldPoly([intersLow[2], intersLow[3], intersTop[3], intersTop[2]], color_walls_house_dark);
			drawWorldPoly([intersLow[4], intersLow[5], intersTop[5], intersTop[4]], color_walls_house_dark);
			drawWorldPoly([intersLow[6], intersLow[7], intersTop[7], intersTop[6]], color_walls_house_dark);
			break;
		case 'g':
			ctx.globalAlpha *= 0.5;
			drawWorldPoly(cc, color_walls_glass);
			ctx.globalAlpha *= 2;
			break;
	}
}

function drawWorldPoly(points, color) {
	//first get camera coordinate points
	var tempPoints = [];

	for (var p=points.length-1; p>-1; p--) {
		tempPoints[p] = spaceToRelative(...points[p]);
	}

	tempPoints = clipToZ0(tempPoints, clipPlaneZ, false);
	//don't bother drawing if there's not enough points
	if (tempPoints.length < 3) {
		return;
	}
	
	//turn points into screen coordinates
	for (p=0; p<tempPoints.length; p++) {
		tempPoints[p] = relativeToScreen(...tempPoints[p]);
	}
	drawPoly(tempPoints, color);
}

function drawPoly(points, color) {
	ctx.fillStyle = color;
	ctx.strokeStyle = color;
	ctx.beginPath();
	ctx.moveTo(points[0][0], points[0][1]);
	for (var f=points.length-1; f>-1; f--) {
		ctx.lineTo(...points[f]);
	}
	ctx.stroke();
	ctx.fill();
}

function drawWorldDot(xyzPos, color) {
	var sPos = spaceToScreen(...xyzPos);
	if (sPos) {
		console.log(`drawing dot at ${JSON.stringify(xyzPos)}`);
		ctx.fillStyle = color;
		ctx.fillRect(sPos[0] - 3, sPos[1] - 3, 6, 6);
	}
}

function drawText(x, y, font, text, outColor, inColor, align) {
	ctx.font = font;
	ctx.strokeStyle = outColor;
	ctx.fillStyle = inColor;
	ctx.textAlign = align;
	ctx.lineJoin = "round";

	// draw an outline, then filled
	ctx.lineWidth = 5;
	ctx.strokeText(text, x, y);
	ctx.lineWidth = 1;
	ctx.fillText(text, x, y);
}

function getImage(url) {
	var image = new Image();
	image.src = url;
	return image;
}

function spaceToRelative(x, y, z) {
	x -= player.x;
	y -= player.y;
	z -= player.z;

	//rotation
	[x, z] = rotate(x, z, -player.theta);
	[y, z] = rotate(y, z, -player.phi);
	return [x, y, z];
}

function relativeToScreen(x, y, z) {
	x /= z;
	y /= z;
	return [x * camera_scale, y * -camera_scale];
}

function spaceToScreen(x, y, z) {
	//offset by player's position
	[x, y, z] = spaceToRelative(x, y, z);

	if (z <= 0) {
		return undefined;
	}

	y /= z;
	x /= z;

	return [x * camera_scale, y * -camera_scale];
}









//conversation functions. Each function will return true if it's time to move on to the next line, false if not

function wait(ms) {
	if (conversingWith.convoTime < ms) {
		return false;
	}

	return true;
}

function startConversation(convoID) {
	player.dx = 0.01;
	player.dz = 0.01;
	var cw = conversingWith;
	cw.convoObj = conversations[convoID];
	cw.convoTime = 0;
	cw.convoLine = 0;

	/*
	//require player to look at their partner
	var lookPos = cw.conversePos();
	var angles = cartToPol(lookPos[0] - player.x, lookPos[1] - player.y, lookPos[2] - player.z);
	var dummy;
	[player.theta, player.phi, dummy] = angles;
	console.log(angles);
	player.theta += Math.PI / 2;
	player.theta *= -1;
	player.phi *= -1; */
}