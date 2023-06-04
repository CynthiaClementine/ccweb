


function beginGame(quickStart) {
	initializeGameBoard();
	timer = quickStart ? game_introTime : 0;

	//spawn both players
	player1 = new Player(12, 0);
	player2 = new Player(-12, 0);

	//clear entities to leave only constants
	entities = [...entity_vendors, player1, player2];
	territory_percentages = [1, 0, 0];

	game_state = "game";
}


function circleRepel(entity, circleX, circleY, circleR) {
	//helper relative variables
	var relPX = entity.x - circleX;
	var relPY = entity.y - circleY;
	var pDist;

	if (Math.abs(relPX) < circleR && Math.abs(relPY) < circleR) {
		//try to keep entity circleR units away
		pDist = Math.hypot(relPX, relPY);
		if (pDist < circleR) {
			relPX = relPX / pDist * circleR;
			relPY = relPY / pDist * circleR;

			entity.x = circleX + relPX;
			entity.y = circleY + relPY;
		}
	}
}


function createBoardTexture() {
	//first set up the canvas
	board_canvas.width = (board_spacing + 1) * board_dims[0];
	board_canvas.height = (board_spacing + 1) * board_dims[1];
	btx.fillStyle = color_unclaimed;
	for (var y=0; y<board_dims[1]; y++) {
		for (var x=0; x<board_dims[0]; x++) {
			//only update the color when it needs updating (when it's changed)
			if (board[y][x] != board[y][x-1]) {
				if (board[y][x] == undefined) {
					btx.fillStyle = color_unclaimed;
				} else {
					btx.fillStyle = (board[y][x] == player1) ? color_claim1 : color_claim2;
				}
			}

			btx.fillRect((board_spacing + 1) * x, (board_spacing + 1) * y, board_spacing, board_spacing);
		}
	}
}


//
function updateBoardWith(entity, removing) {
	//make sure this new entity can claim land
	if (entity.owner == undefined || entity.claimR == undefined || entity.claimR == 0) {
		return;
	}

	//make sure the entity can claim land
	var entityList = entities.filter(e => e.claimR != undefined && e.owner > 0);
	//make sure the new entity is at the start of the list, so it's first to be processed (for speed)
	if (entityList.indexOf(entity) != -1) {
		entityList.splice(entityList.indexOf(entity), 1);
	}
	if (!removing) {
		entityList.splice(0, 0, entity);
	}

	var boardBounds = [entity.x + game_dims[0] * 0.5 - entity.claimR, entity.y + game_dims[1] * 0.5 - entity.claimR, 
						entity.x + game_dims[0] * 0.5 + entity.claimR, entity.y + game_dims[1] * 0.5 + entity.claimR];
	var scaleFactor = board_dims[0] / game_dims[0];
	boardBounds = boardBounds.map(n => Math.floor(n * scaleFactor));

	//loop through all squares in the bounds
	var closestEntity;
	var dist, buffer1;
	var dimScaleFactor = 2 * board_dims[0] / game_dims[0];
	var closestDistSq = 1e1001;
	for (var y=boardBounds[1]; y<=boardBounds[3]; y++) {
		for (var x=boardBounds[0]; x<=boardBounds[2]; x++) {
			//determine the closest entity
			closestEntity = undefined;
			closestDistSq = 1e1001;
			for (var e=0; e<entityList.length; e++) {
				buffer1 = boardToSpace(x, y);
				dist = (entityList[e].x - buffer1[0]) ** 2 + (entityList[e].y - buffer1[1]) ** 2;
				if (dist < entity.claimR * entity.claimR && dist < closestDistSq) {
					closestDistSq = dist;
					closestEntity = entityList[e];
				}
			}

			//assign ownership over the tile
			if (closestEntity != undefined) {
				board[y][x] = closestEntity.owner;
			}


			//TODO: if the entity is 2A tiles closer than any other entity, we can safely move A tiles forward and fill in the same entity without having to check any distances
		}
	}
	createBoardTexture();
}

function spaceToBoard(x, y) {
	return [x, y];
}

function boardToSpace(boardX, boardY) {
	return [(boardX + 0.5) * (game_dims[0] / board_dims[0]) - game_dims[0] * 0.5, (boardY + 0.5) * (game_dims[0] / board_dims[0]) - game_dims[1] * 0.5];
}

function drawBoard() {
	ctx.globalAlpha = 0.2;
	ctx.drawImage(board_canvas, ...spaceToScreen(-game_dims[0] / 2, -game_dims[1] / 2), game_tileSize * game_dims[0], game_tileSize * game_dims[1]);
	ctx.globalAlpha = 1;
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




function getImage(url, useOffscreenCanvas) {
	var image = new Image();
	image.src = url;

	//if using an offscreen canvas return that instead
	if (useOffscreenCanvas) {
		var nowCanvas = document.createElement('canvas');
		var nowCtx = nowCanvas.getContext('2d');
		nowCanvas.width = 0;
		nowCanvas.height = 0;

		image.onload = () => {
			//when the image loads resize the canvas and paint to it
			nowCanvas.valid = true;
			nowCanvas.width = image.width;
			nowCanvas.height = image.height;
			nowCtx.drawImage(image, 0, 0);
		}
		return nowCanvas;
	}
	return image;
}



function initializeGameBoard() {
	board = [];
	board.length = board_dims[1];
	for (var y=0; y<board_dims[1]; y++) {
		board[y] = new Array(board_dims[0]);
	}
	createBoardTexture();
}


function spaceToScreen(x, y) {
	return [x * game_tileSize, y * game_tileSize];
}