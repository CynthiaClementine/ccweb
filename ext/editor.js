


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
		
			drawCircle(screenP1[0], screenP1[1], editor_selectTolerance, color_collision);
			drawCircle(screenP2[0], screenP2[1], editor_selectTolerance, color_collision);
		});
	});

	//if a line is selected, draw that
	if (editor_entity != undefined && editor_entity.x == undefined) {
		var lnP1 = spaceToScreen(...editor_entity.line[0]);
		var lnP2 = spaceToScreen(...editor_entity.line[1]);
	
		ctx.globalAlpha = 0.35;
		ctx.lineWidth = canvas.height / 50;
		drawLine(...lnP1, ...lnP2, color_editorHighlight);
		ctx.globalAlpha = 1;
	}
}


function drawEditor() {
	//just in case
	ctx.beginPath();

	drawCollision();
	drawEntityHighlights();
	//polygon
	drawEditorPoly();

	drawSidebar();
	drawTopbar();

	//enum counter
	if (editor_enum != undefined) {
		drawEditorEnum();
	}

	//fps counter
	drawText(Math.round(dt_buffer.length / dt_buffer.reduce((a, b) => a + b)), 
		canvas.width * 0.99, canvas.height * 0.97, undefined, color_editorHighlight, "right");
}

function drawEditorEnum() {
	var words = editor_enum.str;
	//figure out bounds
	var x = canvas.width * (editor_sidebarW + editor_enumMargin);
	var y = canvas.height * (editor_topbarH + editor_enumMargin);
	var w = canvas.width * (1 - editor_enumMargin) - x;
	var h = canvas.height * (1 - editor_enumMargin) - y;
	var centerX = (x + x + w) / 2;
	var centerY = (y + y + h) / 2;

	var textXs = [centerX];
	if (words.length > editor_enumBreaks[1]) {
		textXs = [linterp(x, x + w, 0.25), centerX, linterp(x, x + w, 0.75)];
	} else if (words.length > editor_enumBreaks[0]) {
		textXs = [linterp(x, x + w, 0.333), linterp(x, x + w, 0.667)];
	}

	var rows = textXs.length;
	var columns = Math.ceil(words.length / rows);

	var textSelectW = Math.min(canvas.width * 0.2, 0.5 * w / (textXs.length + 1));
	var textSelectH = Math.min(canvas.height * 0.08, 0.5 * h / columns);

	ctx.fillStyle = color_editorBg;
	ctx.roundRect(x, y, w, h, canvas.height * editor_roundR);
	ctx.fill();

	//draw nothing text for setting standards real quick
	drawText("", NaN, NaN, `${Math.floor(canvas.height / 30)}px ${font_std}`, color_editorHighlight, "center");

	//draw the rest of the selectors
	var overtop = false;
	var drawX, drawY;
	for (var t=0; t<words.length; t++) {
		drawX = textXs[t % rows];
		drawY = y + h * ((Math.floor(t / rows) + 1) / (columns + 1));
		overtop = (Math.abs(cursor.x - drawX) < textSelectW && Math.abs(cursor.y - drawY) < textSelectH);
		drawText(words[t], drawX, drawY, NaN, overtop ? color_editorHighlight2 : color_editorHighlight);

		//button pressing, located here because I didn't want to duplicate code yet again
		if (overtop && cursor.down) {
			console.log(`selected ${words[t]}`);
			editor_enum.create(t, editor_entity);

			cursor.down = false;
			editor_enum = undefined;
			return;
		}
	}
}

function drawSidebar() {
	//bg
	ctx.fillStyle = color_editorBg;
	ctx.fillRect(0, 0, canvas.width * editor_sidebarW, canvas.height);

	//action pane
	var esh = editor_sidebarHs;
	drawActionPane(0, canvas.height * esh[0], canvas.width * editor_sidebarW, canvas.height * (esh[1] - esh[0]));

	//selection pane
	if (editor_entity != undefined) {
		drawSelectionPane(0, canvas.height * esh[1], canvas.width * editor_sidebarW, canvas.height * (esh[2] - esh[1]));
	}

	//position pane
	drawPositionPane(0, canvas.height * esh[2], canvas.width * editor_sidebarW, canvas.height * (1 - esh[2]));

	//separation lines
	ctx.lineWidth = canvas.height / 100;
	esh.forEach(h => {
		drawLine(0, canvas.height * h, canvas.width * editor_sidebarW, canvas.height * h, color_editorPanelLight);
	});
}

function drawTopbar() {
	//topbar bg
	ctx.fillStyle = color_editorBg;
	ctx.fillRect(0, 0, canvas.width, canvas.height * editor_topbarH)

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

function drawEntityHighlights() {
	[...world_roofs, ...entities].forEach(e => {
		var screenPos = spaceToScreen(e.homeX ?? e.x, e.homeY ?? e.y);
		drawCircle(screenPos[0], screenPos[1], canvas.height / 60, color_editorHighlight3);
	});
}

function drawActionPane(x, y, w, h) {
	var textSize = Math.floor(canvas.height / 30);
	var yInitial = y + textSize;

	ctx.font = `${textSize}px ${font_std}`;
	ctx.textAlign = "left";
	ctx.fillStyle = color_editorHighlight;

	for (var g=0; g<editor_creatables.length; g++) {
		ctx.fillText(editor_creatables[g][0], x + canvas.width * 0.01, yInitial + g * ((h - textSize * 2) / (editor_creatables.length - 1)));
	}
}

//draws the selection pane for the editor sidebar
function drawSelectionPane(x, y, w, h) {
	if (editor_entity == undefined) {
		console.log(`How????`);
		return;
	}
	if (editor_entity.x == undefined && editor_entity.homeX == undefined) {
		drawSelectionPane_line(x, y, w, h);
		return;
	}

	//all entities have name + id
	editor_buttons.forEach(b => {
		b.beDrawn();
	});

	//layers
	ctx.globalAlpha = (editor_entity.layer == `r`) ? 1 : 0.3;
	drawText(`r`, x + w * 0.25, y + h * 0.29, NaN, `#F88`);
	ctx.globalAlpha = (editor_entity.layer == `g`) ? 1 : 0.3;
	drawText(`g`, x + w * 0.5, y + h * 0.29, NaN, `#8F8`);
	ctx.globalAlpha = (editor_entity.layer == `b`) ? 1 : 0.3;
	drawText(`b`, x + w * 0.75, y + h * 0.29, NaN, `#88F`);
	ctx.globalAlpha = 1;

	//draw x/y
	drawText(editor_entity.x.toFixed(2), x + (w * 0.333), y + (h * 0.37), NaN, color_editorHighlight);
	drawText(editor_entity.y.toFixed(2), x + (w * 0.667), y + (h * 0.37));

	switch (editor_entity.constructor.name) {
		case "DreamSkater":
			//state specifier
			break;
	}
	// var midX =
}

function drawSelectionPane_line(x, y, w, h) {
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

	//I know mouse code should go in handlemouseDown, but honestly I can't be bothered to duplicate this code
	//so here it is
	var drawX, drawY;
	var fontSize = Math.floor(canvas.height / 25);
	ctx.font = `${fontSize}px ${font_std}`;
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

function drawPositionPane(x, y, w, h) {
	//draw positions
	ctx.textAlign = "left";
	ctx.font = `${Math.floor(canvas.height / 30)}px ${font_std}`;
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
	entities.splice(entities.indexOf(editor_entity), 1);
	if (world_entities.indexOf(editor_entity) != -1) {
		world_entities.splice(world_entities.indexOf(editor_entity), 1);
	}
	editor_entity = undefined;
}

function exportCollision() {
	return JSON.stringify(data_terrain).replaceAll(`"`, `'`).replace(`{`, `{\n`).replace(`}`, `\n};`).replaceAll(`,'`, `,\n'`);
}

function exportEditorPolygon() {
	return JSON.stringify(editor_polyPoints.map((a) => {
		return [+(a[0].toFixed(1)), +(a[1].toFixed(1))];
	}));
}

function exportEntities() {
	var safeEnts = entities.filter(e => e != player);
	return `[\n\t${safeEnts.map(e => `"`+e.giveStringData()+`"`).join("\n\t")}\n];`;
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
		editor_entity = undefined;
		editor_adjustCamera(cxp);
		return true;
	}

	//it's over the title/label, can safely ignore
	if (cyp < editor_sidebarHs[0]) {
		return true;
	}

	//over action pane
	if (cyp < editor_sidebarHs[1]) {
		//create something new
		var normPerc = (cyp - editor_sidebarHs[0]) / (editor_sidebarHs[1] - editor_sidebarHs[0]);
		var index = Math.floor(normPerc * editor_creatables.length);

		var position = editor_quantizeArr(screenToSpace(canvas.width * (1 + editor_sidebarW) * 0.5, canvas.height * (1 + editor_topbarH) * 0.5));

		editor_creatables[index][1](position[0], position[1]);
		editor_entity = undefined;
		return true;
	}

	//over selection pane
	if (cyp < editor_sidebarHs[2]) {
		if (editor_entity == undefined) {
			return true;
		}
		editor_buttons.forEach(b => {
			b.interact();
		});
	}

	//over position pane

	return true;
}

//selects collision given a cursor position
function editor_handleMDCol(spa) {
	editor_pointSelected = undefined;
	var selectDist = editor_selectTolerance / camera.scale;
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
				editor_select({layer: c, index: data_terrain[c].indexOf(l), line: l});
				return true;
			}
		}
	}
	return false;
}

function editor_select(entity) {
	editor_entity = entity;
	//do extra bits for editing
	editor_buttons = editor_buttons.slice(0, 2);

	if (entity.x == undefined) {
		return;
	}

	var newBHeight = editor_sidebarHs[2] - 0.06;
	var b0 = editor_buttons[0];
	switch (entity.constructor.name) {
		case "DreamSkater":
			//state editing
			console.log('hi');
			editor_buttons.push(new UI_Button(b0.x, newBHeight, b0.width, b0.height, `state: ${entity.stateSpecified ?? "[free]"}`, () => {
				var validStates = editor_entity.states;
				var v = prompt(`Please set the new state.`);
				if (validStates.includes(v)) {
					editor_buttons[2].label = `state: ${v}`;
					editor_entity.forceState(v);
				} else {
					alert(`That is not a valid state. Valid states are ${(""+validStates).replaceAll(",", ", ")}`);
					editor_buttons[2].label = `state: [free]`;
					editor_entity.stateSpecified = undefined;
				}
			}));
			break;
		case "NPC":
			//conversation editing
			break;
		case "Roof":
			//roof type modification
			editor_buttons.push(new UI_Button(b0.x, newBHeight, b0.width, b0.height, `txtr: ${roofNameFromData(editor_entity.giveDimensionData())}`, () => {editor_enum = editor_listR;}));
			break;
	}
}

function editor_handleMDEnt(cxp, cyp) {
	var minDist = (1 / 60) ** 2;
	var entity = undefined;
	[...world_roofs, ...entities].forEach(e => {
		var screenPos = spaceToScreen(e.homeX ?? e.x, e.homeY ?? e.y);
		if (distSquared((screenPos[0] / canvas.width) - cxp, (screenPos[1] / canvas.height) - cyp) < minDist) {
			entity = e;
			minDist = distSquared((screenPos[0] / canvas.width) - cxp, (screenPos[1] / canvas.height) - cyp);
		}
	});
	if (entity != undefined) {
		editor_select(entity);
		editor_buttons[0].label = editor_entity.constructor.name;
		editor_buttons[1].label = editor_entity.id ?? "[no id]";
		return true;
	}
}

function editor_handleMDEnum(cxp, cyp) {
	//transform cp to enum position
	var cxe = cxp - (editor_sidebarW + editor_enumMargin);
	var cye = cyp - (editor_topbarH + editor_enumMargin);
	cxe /= (1 - 2 * editor_enumMargin - editor_sidebarW);
	cye /= (1 - 2 * editor_enumMargin - editor_topbarH);

	//if off the edge
	if (clamp(cxe, 0, 1) != cxe || clamp(cye, 0, 1) != cye) {
		editor_enum = undefined;
		return true;
	}

	return true;
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