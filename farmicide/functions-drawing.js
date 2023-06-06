




function drawBoard() {
	ctx.globalAlpha = 0.2;
	ctx.drawImage(board_canvas, ...spaceToScreen(-game_dims[0] / 2, -game_dims[1] / 2), game_tileSize * game_dims[0], game_tileSize * game_dims[1]);
	ctx.globalAlpha = 1;
}

function drawCircularMeter(x, y, rx, ry, color, percentage) {
	ctx.beginPath();
	ctx.strokeStyle = color;
	ctx.lineWidth = canvas.height / 100;
	percentage = linterp(percentage, percentage ** 2.5, percentage);
	ctx.ellipse(x, y, ry, rx, Math.PI / 2, -Math.PI * percentage, Math.PI * percentage);
	ctx.stroke();
}

function drawTextPrecise(text, x, y, font, alignment, color, dropShadowOffset) {
	if (font) {
		ctx.font = font;
	}
	if (alignment) {
		ctx.textAlign = alignment;
	}
	if (dropShadowOffset) {
		ctx.fillStyle = color_textShadow;
		ctx.fillText(text, x + dropShadowOffset[0], y + dropShadowOffset[1]);
	}
	if (color) {
		ctx.fillStyle = color;
	}
	ctx.fillText(text, x, y);
}

function drawCredits() {
	drawBackText();
	timer = game_introTime + 1;
	drawTextPrecise('Credits', 0, canvas.height * -0.21, `${canvas.height / 24}px Lato`, undefined, color_textMenu, [canvas.height * 0.002, canvas.height * 0.002]);

	ctx.font = `${canvas.height / 26}px Lato`;
	for (var g=0; g<credits.length; g++) {
		drawTextPrecise(credits[g], 0, (canvas.height / 32) * g, undefined, undefined, color_textMenu, [canvas.height * 0.001, canvas.height * 0.001]);
	}
}

function drawBackText() {
	drawTextPrecise(`Back`, canvas.width * -0.22, canvas.height * -0.22, `${canvas.height / 32}px Lato`, undefined, color_textMenu);
}

function drawGameOver() {
	if (timer == 1) {
		ctx.globalAlpha = 0.5;
		ctx.fillStyle = color_unclaimed;
		ctx.fillRect(-canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
		ctx.globalAlpha = 1;
	}

	drawTextPrecise(game_result, 0, -canvas.height / 3, `${canvas.height / 10}px Lato`, undefined, (game_result.indexOf(player_names[0] == 0)) ? color_claim1 : color_claim2, [canvas.height * 0.002, canvas.height * 0.002]);
	for (var p=0; p<gameover_buttons.length; p++) {
		drawTextPrecise(gameover_buttons[p][0], 0, canvas.height * gameover_bMargin * p, `${canvas.height / 18}px Lato`, undefined, color_textMenu, [0, canvas.height * 0.002]);
	}
}

function drawGameWorld() {
	//draw grid
	drawBoard();

	//draw all entities
	entities.forEach(e => {
		e.draw();
	});

	//scorebar at the top
	ctx.fillStyle = color_unclaimed;
	ctx.fillRect(-canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height * territory_barHeight);
	ctx.fillStyle = color_claim1;
	ctx.fillRect(-canvas.width / 2, -canvas.height / 2, linterp(0, canvas.width, territory_percentages[1]), canvas.height * territory_barHeight);
	ctx.fillStyle = color_claim2;
	ctx.fillRect(canvas.width / 2, -canvas.height / 2, linterp(0, -canvas.width, territory_percentages[2]), canvas.height * territory_barHeight);
}


function drawMainMenu() {
	//title text
	drawTextPrecise(`Farmicide`, 9, canvas.height * -0.15, `${canvas.height / 12}px Lato`, "center", color_textMenu, [canvas.height * 0.003, canvas.height * 0.003]);

	//main menu
	ctx.font = `${canvas.height / 24}px Lato`;
	for (var b=0; b<menu_buttons.length; b++) {
		drawTextPrecise(menu_buttons[b][0], 0, canvas.height * menu_bMargin * b, undefined, undefined, color_textMenu, [0, canvas.height * 0.002]);
	}
}