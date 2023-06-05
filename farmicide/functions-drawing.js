




function drawBoard() {
	ctx.globalAlpha = 0.2;
	ctx.drawImage(board_canvas, ...spaceToScreen(-game_dims[0] / 2, -game_dims[1] / 2), game_tileSize * game_dims[0], game_tileSize * game_dims[1]);
	ctx.globalAlpha = 1;
}

function drawCredits() {
	drawBackText();
	timer = game_introTime + 1;
	ctx.fillStyle = color_textMenu;
	ctx.font = `${canvas.height / 24}px Lato`;
	for (var g=0; g<credits.length; g++) {
		ctx.fillText(credits[g], 0, (canvas.height / 20) * g);
	}
}

function drawBackText() {
	
}

function drawGameOver() {
	if (timer == 0) {
		ctx.globalAlpha = 0.5;
		ctx.fillRect(-canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
		ctx.globalAlpha = 1;
	}

	//text
	ctx.font = `${canvas.height / 10}px Lato`;
	ctx.fillStyle = color_textMenu;
	ctx.fillText(game_result, 0, -canvas.height / 3);
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
	ctx.fillStyle = color_textShadow;
	ctx.textAlign = "center";
	ctx.font = `${canvas.height / 12}px Lato`;
	ctx.fillText(`Farmicide`, 2.5, canvas.height * -0.15 + 2.5);
	ctx.fillStyle = color_textMenu;
	ctx.fillText(`Farmicide`, 0, canvas.height * -0.15);

	//main menu
	ctx.font = `${canvas.height / 24}px Lato`;
	for (var b=0; b<menu_buttons.length; b++) {
		ctx.fillStyle = color_textShadow;
		ctx.fillText(menu_buttons[b][0], 1.5, canvas.height * menu_bMargin * b + 1.5);
		ctx.fillStyle = color_textMenu;
		ctx.fillText(menu_buttons[b][0], 0, canvas.height * menu_bMargin * b);
	}
}