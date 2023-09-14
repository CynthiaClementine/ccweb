

function drawEditor() {
	//just in case
	ctx.beginPath();

	//polygon
	drawEditorPoly();

	//draw the sidebar
	ctx.fillStyle = color_editorBg;
	ctx.fillRect(0, 0, canvas.width * editor_sidebarW, canvas.height);



	//draw positions
	ctx.textAlign = "left";
	ctx.font = `${Math.floor(canvas.height / 30)}px Playfair Display`;
	ctx.fillStyle = color_editorHighlight;
	var cPos = screenToSpace(cursor.x, cursor.y);
	var positions = [[`cam mode: ${camera.moveMode}`], [`camera`, [camera.x, camera.y]], [`player`, [player.x, player.y]], [`cursor`, cPos]];

	for (var i=0; i<positions.length; i++) {
		if (positions[i][1]) {
			ctx.fillText(positions[i][0] + ` - ` + positions[i][1][0].toFixed(2) + ` ` + positions[i][1][1].toFixed(2), canvas.width * 0.01, canvas.height * (0.85 + 0.04 * i));
		} else {
			ctx.fillText(positions[i][0], canvas.width * 0.01, canvas.height * (0.85 + 0.04 * i));
		}
	}

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

function drawPositionPane(x, y, w, h) {

}

//draws the selection pane for the editor sidebar
function drawSelectedPane(x, y, w, h) {
	//don't draw if there's nothing to draw
	if (editor_entity == undefined) {
		return;
	}

	// var midX =
}