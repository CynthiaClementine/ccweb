


function beginGame(quickStart) {
	initializeGameBoard();
	timer = quickStart ? game_introTime : 0;

	//spawn both players
	player1 = new Player(-12, 0, color_claim1);
	player2 = new Player(12, 0, color_claim2);

	//clear entities to leave only constants
	entities = [...entity_vendors, player1, player2];
	territory_percentages = [1, 0, 0];

	game_state = "game";
}


function circleRepel(entity, circleX, circleY, circleR) {
	//helper relative variables
	var relPX = entity.x - circleX;
	var relPY = entity.y - circleY;
	//avoid errors when the entity's at the direct center
	if (relPX == 0 && relPY == 0) {
		relPX = circleR / 2;
	}
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
	var counts = [0, 0, 0];
	var countI = 0;
	//first set up the canvas
	board_canvas.width = (board_spacing + 1) * board_dims[0];
	board_canvas.height = (board_spacing + 1) * board_dims[1];
	btx.fillStyle = color_unclaimed;
	for (var y=0; y<board_dims[1]; y++) {
		for (var x=0; x<board_dims[0]; x++) {
			//only update the color when it needs updating (when it's changed)
			if (x == 0 || board[y][x] != board[y][x-1]) {
				if (board[y][x] == undefined) {
					btx.fillStyle = color_unclaimed;
					countI = 0;
				} else if (board[y][x] == player1) {
					countI = 1;
					btx.fillStyle = color_claim1;
				} else {
					countI = 2;
					btx.fillStyle = color_claim2;
				}
			}

			counts[countI] += 1;
			btx.fillRect((board_spacing + 1) * x, (board_spacing + 1) * y, board_spacing, board_spacing);
		}
	}
	var totalCount = counts[0] + counts[1] + counts[2];
	territory_percentages = [counts[0] / totalCount, counts[1] / totalCount, counts[2] / totalCount];
}

//if both players have less than 10 monies, and there are no crops or turrets on the board, there is no way for either player to win. This function detects that
function isSoftlock() {
	if (Math.max(player1.money, player2.money) > 9) {
		return false;
	}
	//I'm lazy and don't feel like checking the player's bag for possible permutations of win conditions, so if they have a bagged item just say false
	//an example of the nonsense that could be the bag win condition - if the player has a beacon, that might put them over the territory limit, 
	// except maybe too much of the board is already covered for the beacon to win. Who knows? 
	if (player1.bag[0] != undefined || player2.bag[0] != undefined) {
		return false;
	}

	for (var e=0; e<entities.length; e++) {
		if (["Bullet", "Crop", "Turret"].includes(entities[e].constructor.name)) {
			return false;
		}
	}

	return true;
}


function endGame() {
	game_state = "gameover";
	window.setTimeout(() => {
		timer = 0;
	}, 1);
}


//
function updateBoardWith(entity, removing) {
	//make sure this new entity can claim land
	if (entity.owner == undefined || entity.claimR == undefined || entity.claimR == 0) {
		return;
	}

	//make sure the entity can claim land
	var entityList = entities.filter(e => e.claimR != undefined && e.owner != undefined);
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
	boardBounds[0] = Math.max(boardBounds[0], 0);
	boardBounds[1] = Math.max(boardBounds[1], 0);
	boardBounds[2] = Math.min(boardBounds[2], board_dims[0]-1);
	boardBounds[3] = Math.min(boardBounds[3], board_dims[1]-1);

	//loop through all squares in the bounds
	var closestEntity;
	var dist, buffer1;
	var closestDistSq = 1e1001;
	for (var y=boardBounds[1]; y<=boardBounds[3]; y++) {
		for (var x=boardBounds[0]; x<=boardBounds[2]; x++) {
			//determine the closest entity
			closestEntity = undefined;
			closestDistSq = 1e1001;
			buffer1 = boardToSpace(x, y);
			for (var e=0; e<entityList.length; e++) {
				dist = (entityList[e].x - buffer1[0]) ** 2 + (entityList[e].y - buffer1[1]) ** 2;
				if (dist < entityList[e].claimR * entityList[e].claimR && dist < closestDistSq) {
					closestDistSq = dist;
					closestEntity = entityList[e];
				}
			}

			//assign ownership over the tile
			board[y][x] = (closestEntity ?? {owner: undefined}).owner;


			//TODO: if the entity is 2A tiles closer than any other entity, we can safely move A tiles forward and fill in the same entity without having to check any distances
		}
	}
	createBoardTexture();
}

function spaceToBoard(x, y) {
	return [x, y];
}

function boardToSpace(boardX, boardY) {
	return [(boardX + 0.5) * (game_dims[0] / board_dims[0]) - game_dims[0] * 0.5, (boardY + 1) * (game_dims[0] / board_dims[0]) - game_dims[1] * 0.5];
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