


function drawCollision() {
	//first draw the tile grid
	var topLeft = screenToSpace(0, 0).map(a => Math.floor(a));
	var lowerRight = screenToSpace(canvas.width, canvas.height).map(a => Math.ceil(a));
	ctx.lineWidth = 2;

	for (var y=topLeft[1]; y<lowerRight[1]; y++) {
		drawLine(...spaceToScreen(topLeft[0], y), ...spaceToScreen(lowerRight[0], y), color_editorGrid);
	}

	for (var x=topLeft[0]; x<lowerRight[0]; x++) {
		drawLine(...spaceToScreen(x, topLeft[1]), ...spaceToScreen(x, lowerRight[1]), color_editorGrid);
	}

	//then draw the collision lines
	Object.keys(data_terrain).forEach(c => {
		data_terrain[c].forEach(l => {
			var screenP1 = spaceToScreen(...l[0]);
			var screenP2 = spaceToScreen(...l[1]);
			var screenMid = linterpMulti(screenP1, screenP2, 0.5);
			var sideVec = calculatePushVec(...l);
			sideVec[0] *= camera.scale * 0.5;
			sideVec[1] *= camera.scale * 0.5;
			drawLine(screenP1[0], screenP1[1], screenP2[0], screenP2[1], editor_layerColors[c]);
			drawLine(screenMid[0], screenMid[1], screenMid[0] + sideVec[0], screenMid[1] + sideVec[1], editor_layerColors[c]);
		
			drawCircle(screenP1[0], screenP1[1], canvas.height / 75, color_collision);
			drawCircle(screenP2[0], screenP2[1], canvas.height / 75, color_collision);
		});
	});
}


function drawEditor() {
	//just in case
	ctx.beginPath();

	drawCollision();
	//polygon
	drawEditorPoly();

	//topbar bg
	ctx.fillStyle = color_editorBg;
	ctx.fillRect(0, 0, canvas.width, canvas.height * editor_topbarH)

	//draw the sidebar bg
	ctx.fillRect(0, 0, canvas.width * editor_sidebarW, canvas.height);

	ctx.fillStyle = color_editorHighlight;
	ctx.textAlign = "center";
	ctx.fillText(`Editor`, canvas.width * editor_sidebarW * 0.5, canvas.height * 0.03);

	//camera scaling bar
	var camBarY = canvas.height * editor_topbarH * 0.5;
	var barPercent;
	for (var v=0; v<camera_xStops.length; v++) {
		if (camera_xStops[v] == camera.targetWidth) {
			barPercent = v / (camera_xStops.length - 1);
			v = camera_xStops + 1;
		} else if (camera_xStops[v] > camera.targetWidth) {
			barPercent = ((v - 1 + getPercentage(camera_xStops[v-1], camera_xStops[v], camera.targetWidth)) / (camera_xStops.length - 1));
			v = camera_xStops + 1;
		}
	}
	drawLine(canvas.width * editor_sidebarW, camBarY, canvas.width, camBarY, color_editorPanelLight);
	drawCircle(canvas.width * linterp(editor_sidebarW, 1, barPercent), camBarY, camBarY * 0.8, color_editorPanelLight);

	//action pane
	var esh = editor_sidebarHs;
	drawActionPane(0, canvas.height * esh[0], canvas.width * editor_sidebarW, canvas.height * (esh[1] - esh[0]));

	//selection pane
	if (editor_entity != undefined) {
		drawSelectionPane(0, canvas.height * esh[1], canvas.width * editor_sidebarW, canvas.height * (esh[2] - esh[1]));
	}

	drawPositionPane(0, canvas.height * esh[2], canvas.width * editor_sidebarW, canvas.height * (1 - esh[2]));

	//separation lines
	ctx.lineWidth = canvas.height / 100;
	esh.forEach(h => {
		drawLine(0, canvas.height * h, canvas.width * editor_sidebarW, canvas.height * h, color_editorPanelLight);
	});

	//fps counter
	ctx.textAlign = "right";
	ctx.fillText(Math.round(dt_buffer.length / dt_buffer.reduce((a, b) => a + b)), canvas.width * 0.99, canvas.height * 0.97);
}

function drawEditorPoly() {
	if (editor_polyPoints.length == 0) {
		return;
	}

	ctx.beginPath();
	ctx.lineWidth = 2;
	ctx.strokeStyle = color_editorPolygon;
	var r = Math.floor(canvas.height / 100);
	var pNow;
	var pNowSc;
	var pNext;
	var pNextSc;
	for (var h=0; h<editor_polyPoints.length; h++) {
		pNow = editor_polyPoints[h];
		pNowSc = spaceToScreen(...pNow);
		pNext = editor_polyPoints[(h+1) % editor_polyPoints.length];
		pNextSc = spaceToScreen(...pNext);

		//circle + line
		drawCircle(pNowSc[0], pNowSc[1], r, color_editorPolygon);
		ctx.moveTo(...pNowSc);
		ctx.lineTo(...pNextSc);
		ctx.stroke();

		//midpoint
		ctx.beginPath();
		ctx.arc((pNowSc[0] + pNextSc[0]) / 2, (pNowSc[1] + pNextSc[1]) / 2, r, 0, Math.PI * 2);
		ctx.stroke();
	}
}

function drawActionPane(x, y, w, h) {
	var textSize = Math.floor(canvas.height / 30);
	var yInitial = y + textSize;

	ctx.font = `${textSize}px Playfair Display`;
	ctx.textAlign = "left";
	ctx.fillStyle = color_editorHighlight;

	for (var g=0; g<editor_creatables.length; g++) {
		ctx.fillText(editor_creatables[g][0], x + canvas.width * 0.01, yInitial + g * ((h - textSize * 2) / (editor_creatables.length - 1)));
	}
}

function drawPositionPane(x, y, w, h) {
	//draw positions
	ctx.textAlign = "left";
	ctx.font = `${Math.floor(canvas.height / 30)}px Playfair Display`;
	ctx.fillStyle = color_editorHighlight;
	var cPos = screenToSpace(cursor.x, cursor.y);
	var positions = [[`cam mode: ${camera.moveMode}`], [`camera`, [camera.x, camera.y]], [`player`, [player.x, player.y]], [`cursor`, cPos]];
	var drawH;
	for (var i=0; i<positions.length; i++) {
		drawH = y + canvas.height * (0.04 * i + 0.03);
		if (positions[i][1]) {
			ctx.fillText(positions[i][0] + `: ` + positions[i][1][0].toFixed(2) + ` ` + positions[i][1][1].toFixed(2), x + canvas.width * 0.01, drawH);
		} else {
			ctx.fillText(positions[i][0], x + canvas.width * 0.01, drawH);
		}
	}
}

//draws the selection pane for the editor sidebar
function drawSelectionPane(x, y, w, h) {
	if (editor_entity == undefined) {
		console.log(`How????`);
		return;
	}
	if (editor_entity.x == undefined) {
		drawSelectionPane_line(x, y, w, h);
	}
	// var midX =
}

function drawSelectionPane_line(x, y, w, h) {
	//a collision line is selected; draw the line
	var lnP1 = spaceToScreen(editor_entity.line[0]);
	var lnP2 = spaceToScreen(editor_entity.line[1]);

	ctx.beginPath();

	//now draw aspects of the line
	var lineColors = [
		[`r`, 0.5, 0.2],
		[`g`, 0.3, 0.5],
		[`b`, 0.7, 0.5],

		[`y`, 0.3, 0.3],
		[`t`, 0.5, 0.6],
		[`p`, 0.7, 0.3],

		[`w`, 0.5, 0.4],
	];

	//I know mouse code should go in handlemouseDown, but honestly I can't be bothered to duplicate this code (or make some sort of button class, which seems to be the other option)
	//so here it is
	var drawX, drawY;
	var fontSize = Math.floor(canvas.height / 25);
	ctx.font = `${fontSize}px Playfair Display`;
	fontSize **= 2;
	lineColors.forEach(cd => {
		drawX = x + cd[1] * w;
		drawY = y + cd[2] * h;
		ctx.globalAlpha = (cd[0] == editor_entity.layer) ? 1 : 0.35;
		drawText(cd[0], drawX, drawY, NaN, editor_layerColors[cd[0]], "center");

		if (cursor.down && distSquared(drawX - cursor.x, drawY - cursor.y) < fontSize) {
			changeLineLayer(editor_entity.line, editor_entity.layer, cd[0]);
			editor_entity.layer = cd[0];
		}
	});
	ctx.globalAlpha = 1;

	//reverse the line button
	drawX = x + 0.5 * w;
	drawY = y + 0.9 * h;
	drawText(`Reverse this line`, drawX, drawY, NaN, color_editorHighlight, NaN);
	//if it's been pressed within a frame, reverse the line
	if (dt_tLast - cursor.downTime < dt_buffer[dt_buffer.length-1] * 1500 && Math.abs(drawX - cursor.x) < w * 0.5 && Math.abs(drawY - cursor.y) < h * 0.1) {
		[editor_entity.line[1], editor_entity.line[0]] = [editor_entity.line[0], editor_entity.line[1]];
	}
}







function editor_handleSpritePoly() {
	//create a triangle if one doesn't exist

	editor_pointSelected = -1;
	//select closest point within tolerance
	var minDist = 1e1001;
	var dist;
	var scPoints = editor_polyPoints.map(a => spaceToScreen(a[0], a[1]));
	for (var j=0; j<scPoints.length; j++) {
		dist = Math.hypot(scPoints[j][0] - cursor.x, scPoints[j][1] - cursor.y);
		if (dist < editor_selectTolerance && dist < minDist) {
			minDist = dist;
			editor_pointSelected = j;
		}

		//midpoint
		
		var midpoint = linterpMulti(scPoints[j], scPoints[(j+1)%scPoints.length], 0.5);
		dist = Math.hypot(midpoint[0] - cursor.x, midpoint[1] - cursor.y);
		if (dist < editor_selectTolerance && dist < minDist) {
			minDist = dist;
			editor_pointSelected = j + 0.5;
		}
	}

	//if selected a half-point, make it a full point
	if (editor_pointSelected % 1 != 0) {
		var lowP = editor_pointSelected - 0.5;
		var highP = (editor_pointSelected + 0.5) % editor_polyPoints.length;
		editor_polyPoints.splice(lowP + 1, 0, [(editor_polyPoints[lowP][0] + editor_polyPoints[highP][0]) / 2, (editor_polyPoints[lowP][1] + editor_polyPoints[highP][1]) / 2]);
		editor_pointSelected = lowP + 1;
	}

	return true;
}


function editor_createPts() {
	editor_polyPoints = [
		screenToSpace(canvas.width * 0.4, canvas.height * 0.4),
		screenToSpace(canvas.width * 0.6, canvas.height * 0.4),
		screenToSpace(canvas.width * 0.6, canvas.height * 0.6)
	]
}

function editor_deleteSelected() {
	if (editor_entity == undefined) {
		return;
	}

	//collision line
	if (editor_entity.x == undefined) {
		data_terrain[editor_entity.layer].splice(editor_entity.index, 1);
		editor_entity = undefined;
		return;
	}

	//full entity
}

function exportCollision() {
	return JSON.stringify(data_terrain).replaceAll(`"`, `'`).replace(`{`, `{\n`).replace(`}`, `\n};`).replaceAll(`,'`, `,\n'`);
}

function editor_adjustCamera(cxp) {
	var percent = getPercentage(editor_sidebarW, 1, cxp);
	percent *= camera_xStops.length - 1;
	if (percent % 1 < 0.1 || percent % 1 > 0.9) {
		percent = Math.round(percent);
	}
	var val = (percent % 1 == 0) ? camera_xStops[percent] : linterp(camera_xStops[Math.floor(percent)], camera_xStops[Math.ceil(percent)], percent % 1);
	camera.targetWidth = val;
	window.setTimeout(() => {
		handleResize();
	}, 1);
}

function editor_handleMDMenu(cxp, cyp) {
	//top bar
	if (cxp > editor_sidebarW) {
		editor_adjustCamera(cxp);
		return true;
	}

	//it's over the title/label, can safely ignore
	if (cyp < editor_sidebarHs[0]) {
		return;
	}

	if (cyp < editor_sidebarHs[1]) {
		//create something new
		var normPerc = (cyp - editor_sidebarHs[0]) / (editor_sidebarHs[1] - editor_sidebarHs[0]);
		var index = Math.floor(normPerc * editor_creatables.length);

		var position = editor_quantizeArr(screenToSpace(canvas.width * (1 + editor_sidebarW) * 0.5, canvas.height * (1 + editor_topbarH) * 0.5));

		editor_creatables[index][1](position[0], position[1]);
		editor_entity = undefined;
		return true;
	}
}

//selects collision given a cursor position
function editor_handleMDCol(spa) {
	editor_pointSelected = undefined;
	var selectDist = (canvas.height / 75) / camera.scale;
	var keys = Object.keys(data_terrain);
	var p;
	for (var c of keys) {
		for (var l of data_terrain[c]) {
			if (distSquared(l[0][0] - spa[0], l[0][1] - spa[1]) < selectDist) {
				p = 0;
			}
			if (distSquared(l[1][0] - spa[0], l[1][1] - spa[1]) < selectDist) {
				p = 1;
			}

			if (p != undefined) {
				if (button_alt) {
					//if alt is pressed, duplicate the line before selecting it
					var ind = data_terrain[c].indexOf(l);
					var newLine = [JSON.parse(JSON.stringify(l[p])), JSON.parse(JSON.stringify(l[p]))];
					data_terrain[c].splice(ind, 0, newLine);
					editor_pointSelected = newLine[1];
					return true;
				}
				editor_pointSelected = l[p];
				return true;
			}
			//if the cursor's over the line itself (not the end points) select that line
			//only do this part if the line isn't of 0 size
			if (distSquared(l[1][0] - l[0][0], l[1][1] - l[0][1]) == 0) {
				l[1][0] += 0.5;
			}
			if (pointSegmentDistance(spa, l[0], l[1]) < selectDist) {
				editor_entity = {layer: c, index: data_terrain[c].indexOf(l), line: l};
				return true;
			}
		}
	}
	return false;
}

function changeLineLayer(l, oldLayer, newLayer) {
	//figure out where the line originally was
	var originalInd = data_terrain[oldLayer].indexOf(l);
	data_terrain[newLayer].push(l);
	data_terrain[oldLayer].splice(originalInd, 1);
}

function editor_quantizeArr(arr) {
	for (var b=0; b<arr.length; b++) {
		arr[b] = quantizeTo(arr[b], 1);
	}
	return arr;
}