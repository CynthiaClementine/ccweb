/*
INDEX

drawCircle(x, y, r, color)
drawLine(x1, y1, x2, y2, color)
drawMenu()

rasterizeBG
*/




function drawCircle(x, y, r, color) {
	ctx.beginPath();
	ctx.fillStyle = color;
	ctx.arc(x, y, r, 0, Math.PI * 2);
	ctx.fill();
}

function drawLine(x1, y1, x2, y2, color) {
	ctx.beginPath();
	ctx.strokeStyle = color;
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.stroke();
}

function drawText(text, x, y, font, color, alignment) {
	if (font) {
		ctx.font = font;
	}
	if (color) {
		ctx.fillStyle = color;
	}
	if (alignment) {
		ctx.textAlign = alignment;
	}
	ctx.fillText(text, x, y);
}


function drawMenu() {
	//everything is kept within a 12 x 8 box
	var menu_boxSize = [12, 8];
	var cs = camera.scale;
	var midH = easerp(canvas.height * 1.5, canvas.height * 0.5, menu_t);
	var midW = canvas.width / 2;
	var baseH = midH - (cs * menu_boxSize[1] / 2);
	var baseW = (canvas.width / 2) - (cs * menu_boxSize[0] / 2);

	//swap ctx and cty
	[cty, ctx] = [ctx, cty];
	
	//first draw background
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	menu_texture.draw(canvas.width / 2, midH, 0, cs);

	ctx.strokeStyle = color_menuText;
	ctx.lineWidth = canvas.height / 200;

	//draw volume sliders
	var sliderW = cs*3;
	var sliderStart1 = baseW + cs*2.75;
	var sliderStart2 = baseW + cs * (menu_boxSize[0]/2 + 2.85);

	drawText(`Music Volume`, baseW, baseH + cs, `${canvas.height / 30}px Playfair Display`, color_menuText, "left");
	ctx.fillText(`Effects Volume`, baseW + cs*(menu_boxSize[0]/2), baseH + cs);

	//aliasing checkbox
	ctx.fillText(`Texture Aliasing`, baseW + cs*0.75, baseH + cs*2);
	ctx.rect(baseW + cs*0.1, baseH + cs*1.75, cs*0.5, cs*0.5);

	if (data_persistent.alias) {
		ctx.moveTo(baseW + cs*0.2, baseH + cs*2);
		ctx.lineTo(baseW + cs*0.35, baseH + cs*2.2);
		ctx.lineTo(baseW + cs*0.5, baseH + cs*1.8);
	}
	ctx.stroke();

	ctx.beginPath();
	ctx.moveTo(sliderStart1, baseH + cs);
	ctx.lineTo(sliderStart1 + sliderW, baseH + cs);
	ctx.stroke();
	ctx.moveTo(sliderStart2, baseH + cs);
	ctx.lineTo(sliderStart2 + sliderW, baseH + cs);
	ctx.stroke();
	drawCircle(linterp(sliderStart1, sliderStart1 + sliderW, audio_bgChannel.volume), baseH + cs, canvas.height / 75, color_menuPrimary);
	ctx.stroke();
	drawCircle(linterp(sliderStart2, sliderStart2 + sliderW, audio_sfxChannel.volume), baseH + cs, canvas.height / 75, color_menuPrimary);
	ctx.stroke();
	
	
	
	
	//controls + credits
	var baseTextH = baseH + (cs * menu_boxSize[1] * 0.5);
	
	ctx.fillText(`Walk North - Up arrow / W`, baseW, baseTextH + cs*0.5);
	ctx.fillText(`Walk East - Right arrow / D`, baseW, baseTextH + cs);
	ctx.fillText(`Walk South - Down arrow / S`, baseW, baseTextH + cs*1.5);
	ctx.fillText(`Walk West - Left arrow / A`, baseW, baseTextH + cs*2);
	
	ctx.fillText(`Interact - Z / Enter`, midW + cs*1.25, baseTextH + cs*0.75);
	ctx.fillText(`Dash - Shift`, midW + cs*1.25, baseTextH + cs*1.25);
	ctx.fillText(`Magic - Space / X`, midW + cs*1.25, baseTextH + cs*1.75);

	ctx.textAlign = "center";
	ctx.fillStyle = (Math.abs(cursor.y - (baseH + cs*menu_boxSize[1])) < cs && cursor.x > baseW && cursor.x < midW) ? "#880000" : color_menuText;
	ctx.fillText(`Reset`, baseW + cs*menu_boxSize[0]/3, baseH + cs*menu_boxSize[1]);
	ctx.fillStyle = (Math.abs(cursor.y - (baseH + cs*menu_boxSize[1])) < cs && cursor.x > midW && cursor.x < canvas.width - baseW) ? "#880000" : color_menuText;
	ctx.fillText(`True Reset`, baseW + 2*cs*menu_boxSize[0]/3, baseH + cs*menu_boxSize[1]);
	ctx.fillStyle = color_menuText;

	ctx.fillText(`Code, art, story, and sounds by Cynthia Clementine`, midW, baseH + cs * (menu_boxSize[1] - 1));
	ctx.font = `${canvas.height / 20}px Playfair Display`;
	ctx.fillText(`Preferences`, midW, baseH);
	ctx.fillText(`Controls`, midW, baseH + cs * (menu_boxSize[1] * 0.5 - 0.5));

	//reset buttons

	//swap back
	[cty, ctx] = [ctx, cty];
}




function rasterizeBG() {
	//figure out dimensions of the canvas
	var chunkPxW = bg_tw * bg_chunkW;
	var chunkPxH = bg_tw * vScale * bg_chunkH;

	bg_canvas.width = chunkPxW * bg_chunkArr[0].length;
	bg_canvas.height = chunkPxH * bg_chunkArr[1].length;
	btx.imageSmoothingEnabled = false;

	for (var y=0; y<bg_chunkArr.length; y++) {
		for (var x=0; x<bg_chunkArr[0].length; x++) {
			drawChunkToBG(x, y, chunkPxW, chunkPxH);
		}
	}
	bg_chunkArr
}

function drawChunkToBG(chunkX, chunkY, chunkPxW, chunkPxH) {
	//if there's no data there don't bother drawing
	if (bg_chunkArr[chunkY][chunkX] == undefined) {
		return;
	}

	//if the image hasn't loaded yet, wait until it does
	if (bg_chunkArr[chunkY][chunkX].width == 0) {
		window.setTimeout(() => {
			drawChunkToBG(chunkX, chunkY, chunkPxW, chunkPxH);
		}, 10);
		return;
	}

	//all good? Draw the thing
	var drawX = chunkPxW * chunkX;
	var drawY = chunkPxH * chunkY;

	btx.drawImage(bg_chunkArr[chunkY][chunkX], drawX, drawY);
}

function drawWorldBG() {
	//solid bg color
	ctx.fillStyle = `hsl(${dt_tLast * 0.01}, 50%, 30%)`;
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	//actual world background


	var bg_th = bg_tw * vScale;
	var bgScreenRatio = bg_tw / camera.scale;

	//distance from the canvas origin to the world origin, in tiles
	var origTransX = bg_chunkStart[0] * bg_chunkW;
	var origTransY = bg_chunkStart[1] * bg_chunkH;

	var origTransCoords = spaceToScreen(origTransX, origTransY);
	var edgeCoords = screenToSpace(0, 0);

	//sWidth is in canvas pixels, or more specifically (world tiles * canvas pixels / world tile)
	//well canvas pixels/world tile is already set - it's bg_tw
	//camera.scale = (screen pixels / world tile)

	// var sx = -((origTransCoords[0]) * bgScreenRatio)// + (origTransX * bg_tw * bgScreenRatio);
	// var sy = -((origTransCoords[1]) * bgScreenRatio)// + (origTransY * bg_th * bgScreenRatio);
	var sx = (edgeCoords[0] - origTransX) * bg_tw;
	var sy = (edgeCoords[1] - origTransX) * bg_th;
	var sw = camera.targetWidth * bg_tw;
	var sh = (canvas.height / (camera.scale * vScale)) * bg_th;

	// console.log(origTransX, origTransY, sx, sy, sw, sh);

	ctx.drawImage(bg_canvas, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
}