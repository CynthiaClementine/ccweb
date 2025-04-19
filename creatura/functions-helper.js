function main(dt) {
	//tick everything
	player.tick(dt);
	world_map.forEach(line => {
		line.forEach(cell => {
			cell.entities.forEach(e => {
				e.tick(dt);
			})
		});
	});

	//draw everything
	drawGround();
	var pCell = [Math.floor(player.x), Math.floor(player.y)];
	
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

	drawCell(drawCell, pCell);
	//draw ground
}

function drawGround() {
	var ground = [
		[drawDistance, 0, 0],
		[0, 0, drawDistance],
		[-drawDistance, 0, 0],
		[0, 0, -drawDistance],
	];
	ground.forEach(p => {
		[p[0], p[2]]
	})

	clipToZ0(ground, 0.01, false);
}


function drawCell(drawCell, pCell) {
	//figure out which walls to actually draw
	var offsetH = drawCell[0] - pCell[0];
	var offsetV = drawCell[1] - pCell[1];

	if (offsetH == 0 && offsetV == 0) {
		drawCellEntities(drawCell);
	}

	drawCellWalls(drawCell, offsetH <= 0, offsetV >= 0, offsetH >= 0, offsetV <= 0);

	if (offsetH != 0 || offsetV != 0) {
		drawCellEntities(drawCell);
	}
}

function drawCellEntities(cell) {
	cell.entities.forEach(e => {
		e.beDrawn();
	});
}

//draws certain walls of a cell
function drawCellWalls(cell, left, up, right, down) {
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

	if (left) {
		drawPoly([bc[0], bc[3], bc[7], bc[4]]);
	}
	if (up) {
		drawPoly([bc[0], bc[1], bc[3], bc[4]]);
	}
	if (right) {
		drawPoly([bc[1], bc[2], bc[6], bc[5]]);
	}
	if (down) {
		drawPoly([bc[2], bc[3], bc[7], bc[6]]);
	}
}

function drawPoly(polyPoints) {

}

function spaceToRelative(x, y, z) {
	x -= player.x;
	y -= player.y;
	z -= player.z;

	//rotation
	[z, y] = rotate(z, y, -player.phi);
	[x, z] = rotate(x, z, -player.theta);
	return [x, y, z];
}

function spaceToScreen(x, y, z) {
	//offset by player's position
	[x, y, z] = spaceToRelative(x, y, z);

	if (z <= 0.01) {
		return undefined;
	}

	y /= z;
	x /= z;

	return [x * camera_scale, y * camera_scale];
}