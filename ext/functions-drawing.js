

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
	ctx.fillStyle = color_menuText;

	//draw volume sliders
	var sliderW = cs*3;
	var sliderStart1 = baseW + cs*2.75;
	var sliderStart2 = baseW + cs * (menu_boxSize[0]/2 + 2.85);
	ctx.textAlign = "left";
	ctx.font = `${canvas.height / 30}px Playfair Display`;
	ctx.fillText(`Music Volume`, baseW, baseH + cs);
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
	ctx.fillStyle = color_menuText;
	
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