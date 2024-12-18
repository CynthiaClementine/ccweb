



class Main {
	constructor(x, y) {
		this.x = x;
		this.y = y;
		this.r = 0.25;
		this.dx = 0;
		this.dy = 0;
		this.gravity = 0.0125;
		this.dTPX;
		this.dTPY;
		this.onGround = true;
	}

	getPlayerDist() {
		this.dTPX = Math.abs(this.x - player.x);
		this.dTPY = Math.abs(this.y - player.y);
	}

	handlePosition() {
		var arrayValue;
		//applying x and getting array value
		this.x += this.dx;

		//dealing with screen wrapping
		var readXSquare = modulate(Math.floor(this.x), loadingMap[0].length);
		//reading from map
		try {
			arrayValue = loadingMap[Math.floor(this.y)][readXSquare];
		} catch (error) {
			arrayValue = 9;
		}
		
		//check if array value is solid, floors value for cracked blocks
		for (var l=0; l<solidSurfaces.length; l++) {
			if (Math.ceil(arrayValue) == solidSurfaces[l]) {
				//if it is, get rid of velocity and reverse change, end loop
				this.x -= this.dx;
				this.dx = 0;
				l = solidSurfaces.length + 1;
			}
		}
		
		//and for y
		this.y += this.dy;

		readXSquare = Math.floor(this.x);
		if (readXSquare >= loadingMap[0].length) {
			readXSquare -= loadingMap[0].length;
		} else if (readXSquare < 0) {
			readXSquare += loadingMap[0].length;
		}
		
		try {
			arrayValue = loadingMap[Math.floor(this.y)][readXSquare];
		} catch (error) {
			arrayValue = 9;
		}

		for (var k=0; k<solidSurfaces.length; k++) {
			if (Math.ceil(arrayValue) == solidSurfaces[k]) {
				this.y -= this.dy;
				this.dy = 0;
				l = solidSurfaces.length + 1;
				this.onGround = true;
			}
		}
	}
}

class Map {
	/**
	 * class that contains a map
	 * @param {*} strData 
	 * @param {*} looping 
	 */
	constructor(strData, looping, leftConnectData, rightConnectData) {

	}
}

//the camera stores important things like squares per screen and position to draw from.
class Camera extends Main {
	constructor(x, y) {
		super(x, y);
		this.scale = 40;

		this.shaderColor = "#000000";
		this.shaderOpacity = 0;

		this.doMenu = false;
	}

	rescale(newScale) {
		this.scale = newScale;
	}

	tick() {
	}

	beDrawn() {
		if (!this.doMenu) {
			return;
		}
		ctx.globalAlpha = this.shaderOpacity;
		ctx.fillStyle = this.shaderColor;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.globalAlpha = 1;

		//regular
		ctx.fillStyle = menuColor;
		ctx.fillRect(0, canvas.height * 0.9, canvas.width, canvas.height * 0.1);

		ctx.fillStyle = textColor;
		ctx.font = "20px Century Gothic";
		ctx.textAlign = "left";
		var mPos = screenToSpace(mouseX, mouseY);
		var textToFill =`P: (${player.x.toFixed(2)}, ${player.y .toFixed(2)})`;
		textToFill += ` C: (${camera.x.toFixed(2)}, ${camera.y.toFixed(2)})`;
		textToFill += ` M: (${mPos[0].toFixed(2)}, ${mPos[1].toFixed(2)})`;
		ctx.fillText(textToFill, canvas.width * 0.05, canvas.height * 0.97);
	}
}

class Player extends Main {
	constructor(x, y) {
		super(x, y);
		this.dx = 0;
		this.ax = 0;
		this.r = 0.25;
		this.accRate = 0.03;
		this.slowRate = 0.5;
		this.jumpStrength = 0.2875;
		this.onGround = false;
		this.canMove = false;

		this.dMax = 0.175;

		this.glide = false;
		this.glideA = 0;
		this.glideARate = 0.8;
		this.glideAMax = Math.PI * 0.4;
		this.glideEffic = 0.15;
		this.glideFriction = 0.75;
	}

	handleMomentum() {
		//updating dx
		this.dx += this.ax;
		if (this.ax == 0) {
			this.dx *= this.slowRate;
		}
		this.dx = clamp(this.dx, -this.dMax, this.dMax);

		//gravity
		this.dy += this.gravity;
		//dy is positively bounded so that the player never falls through blocks
		if (this.dy > 1) {
			this.dy = 1;
		}
	}

	handleMomentum_glide() {
		this.glideA = clamp(this.glideA + this.ax * this.glideARate, -this.glideAMax, this.glideAMax);
		var velAngle = Math.atan2(this.dy, this.dx);
		var theta = modularDifference(this.glideA + (Math.PI / 2), velAngle, Math.PI * 2);

		//calculate friction
		var forceFric = polToXY(0, 0, (Math.PI / 2) + this.glideA, this.glideFriction * Math.hypot(this.dx, this.dy) * Math.cos(theta));
		var forceLift = polToXY(0, 0, (Math.PI / 2) + this.glideA, this.glideEffic * Math.hypot(this.dx, this.dy) * Math.sin(theta));


		//calculate lift

		//apply forces
		this.dy += this.gravity;
		this.dx -= forceFric[0] + forceLift[0];
		this.dy -= forceFric[1] + forceLift[1];

		// var stall = (this.dx * this.ax < 0);
		// //pull up if reversing
		// if (stall) {
		// 	// console.log('pulling up');
		// 	this.dy -= Math.abs(this.ax * this.glideFriction * (Math.abs(this.dx) / this.dMax));
		// }
		// this.dx += this.ax * (stall ? this.glideFriction : linterp(this.glideFriction, 1, 0.6));
		// this.dx = clamp(this.dx, -this.dMax, this.dMax);

		//cap dx and dy
		this.dy = clamp(this.dy, -1, 1);
		this.dx = clamp(this.dx, -1, 1);
	}

	tick() {
		if (this.glide) {
			//do glider things
			this.handleMomentum_glide();
		} else {
			this.handleMomentum();
		}
		this.handlePosition();

		//making sure x is in bounds
		this.x = modulate(this.x, loadingMap[0].length);
	}

	beDrawn() {
		var coords = spaceToScreen(this.x, this.y);

		ctx.fillStyle = ballColor;
		ctx.beginPath();
		ctx.ellipse(coords[0], coords[1], this.r * camera.scale, this.r * camera.scale, Math.PI, 0, Math.PI * 2);
		ctx.fill();

		//draw glider above
		var forwardVec = polToXY(0, 0, this.glideA, camera.scale * this.r * 2);
		ctx.beginPath();
		ctx.strokeStyle = "#FFF";
		ctx.lineWidth = canvas.height / 100;
		ctx.moveTo(coords[0] + forwardVec[0], coords[1] - (0.2 + this.r) * camera.scale + forwardVec[1]);
		ctx.lineTo(coords[0] - forwardVec[0], coords[1] - (0.2 + this.r) * camera.scale - forwardVec[1]);
		ctx.stroke();
	}
}

class Button extends Main {
	constructor(x, y, gelatin, cameraX, cameraY, squaresToModify) {
		super(x, y);
		this.active = false;
		this.drawTips = false;

		/*each button is associated with a gelatin, a camera position, and squares to remove. 
		This is so that the button can have easily accessible functionality when it is activated. */
		this.gelatin = gelatin;
		this.gelatin.color = this.pickGelatinColor();

		//camera position
		this.cameraX = cameraX;
		this.cameraY = cameraY;

		//squares to remove
		this.squaresToModify = squaresToModify;
	}

	tick() {
		//ticking gelatin
		this.gelatin.tick();

		//testing if pressed

		//getting distance to gelatin
		var gelatinDistX = Math.abs(this.x - this.gelatin.x);
		var gelatinDistY = Math.abs(this.y - this.gelatin.y);
		var toSet = -1;

		//if distance is small enough and self is inactive, then be pressed (become active)
		//toSet is which index of the array to set the squares to
		if (gelatinDistX < 0.4 && gelatinDistY < 0.25) {
			this.active = true;
			toSet = 3;
		} else if (this.active) {
			//if active and the gelatin is too far away, become inactive
			this.active = false;
			toSet = 2;
		}

		//modifying squares
		if (toSet > -1) {
			for (var c=0;c<this.squaresToModify.length;c++) {
				loadingMap[this.squaresToModify[c][1]][this.squaresToModify[c][0]] = this.squaresToModify[c][toSet];
			}
		}

		//getting distance to player
		super.getPlayerDist();
		//if the player is close enough, display x and c buttons, and trigger their effects if the player has pressed them.
		//in addition to being close enough, the player also has to be above or equal in height to the button.
		if (this.dTPX < 2 && this.dTPY < 2 && player.y <= this.y) {
			this.drawTips = true;
			//triggering button effects
			if (xPressed) {
				this.resetGelatin();
				xPressed = false;
			}

			if (cPressed && loadingMode.constructor.name != "CameraPan") {
				loadingMode = new CameraPan(this.cameraX, this.cameraY);
				cPressed = false;
			}

		} else {
			this.drawTips = false;
		}
	}

	beDrawn() {
		//drawing self
		if (this.active) {
			ctx.fillStyle = pressedButtonColor;
		} else {
			//if inactive, color the switch the color of the gelatin
			ctx.fillStyle = this.gelatin.color;
		}

		var sCoords = spaceToScreen(this.x, this.y);
		var unit = camera.scale / 2;
		
		ctx.fillRect(sCoords[0] - unit / 2, sCoords[1], unit, unit / 2);

		//drawing associated gelatin
		this.gelatin.beDrawn();

		//drawing hotkey tips
		if (this.drawTips) {
			ctx.fillStyle = tipColor;
			ctx.beginPath();
			//drawing circles 
			ctx.ellipse(sCoords[0] - unit, sCoords[1] - 2 * unit, unit * 0.6, unit * 0.6, 0, 0, Math.PI * 2);
			ctx.ellipse(sCoords[0] + unit, sCoords[1] - 2 * unit, unit * 0.6, unit * 0.6, 0, 0, Math.PI * 2);
			ctx.fill();

			//drawing text
			ctx.font = "20px Century Gothic";
			ctx.textAlign = "center";
			ctx.fillStyle = textColor;
			ctx.fillText("x", (this.x - unit) - camera.x, (this.y - unit * 0.6) - camera.y);
			ctx.fillText("c", (this.x + unit) - camera.x, (this.y - unit * 0.6) - camera.y);
		}
	}

	pickGelatinColor() {
		//possible hex values for red green and blue
		var letters = "08F";
		var tolerance = 100;
		//start with hash sign
		var color = "#";
		var goodColor = false;
		//run for 100 iterations max and make sure color hasn't been used before
		while (tolerance > 0 && goodColor == false) {

			//choose red, green, and blue values
			for (var i=0;i<3;i++) {
				color += letters[Math.floor(Math.random() * letters.length)];
			}

			//start with good color assumption
			goodColor = true;

			//search through used colors array
			for (var g=0;g<usedGelatinColors.length;g++) {
				//if color matches, it is a bad color
				if (color == usedGelatinColors[g]) {
					goodColor = false;
				}
			}

			//if still a good color, push it to the gelatin colors array and use it
			if (goodColor) {
				usedGelatinColors.push(color);
				return color;
			}
			//if not, remove 1 from tolerance, reset color, and try again
			color = "#";
			tolerance -= 1;
		}
		
		//if no possible colors can be generated, then return yellow
		color = "#FF0";
		return color;
	}

	resetGelatin() {
		//reset gelatin x, y, dx, and dy
		this.gelatin.x = this.gelatin.homeX;
		this.gelatin.y = this.gelatin.homeY;

		this.gelatin.dx = 0;
		this.gelatin.dy = 0;
	}
}

class Gelatin extends Main {
	constructor(x, y) {
		super(x, y);
		this.homeX = this.x;
		this.homeY = this.y;
		this.r = 0.25;
		this.color = "#000000";
		this.slowRate = 0.8;
		this.airSlowRate = 0.9;
	}

	tick() {
		//colliding with players
		super.getPlayerDist();

		//if the player is close enough to collide, then do
		if (this.dTPX < this.r + player.r && this.dTPY < (this.r * 2) + player.r) {
			this.dx += player.dx / 3;
			player.dx /= 4;
			player.dy *= 0.47;
			this.dy += player.dy * 1.2;

			//if dy is great enough, the gelatin must not be on the ground
			if (Math.abs(this.dy) > this.gravity) {
				this.onGround = false;
			}
		}

		//gravity / velocity cap
		this.dy += this.gravity;
		if (this.dy > 0.99) {
			this.dy = 0.99;
		}
		//handling collision with blocks
		super.handlePosition();
		
		//friction
		if (this.onGround) {
			this.dx *= this.slowRate;
		} else {
			this.dx *= this.airSlowRate;
		}
	}

	beDrawn() {
		ctx.beginPath();
		ctx.globalAlpha = 0.75;
		ctx.fillStyle = this.color;
		ctx.fillRect(...spaceToScreen(this.x - this.r, this.y - this.r), camera.scale * this.r * 2, camera.scale * this.r * 2);
		ctx.globalAlpha = 1;
	}
}

class Cloud extends Main {
	constructor(x, y) {
		super(x, y);
		this.dx = 0.025;

		this.rw = 1;
		this.rh = 0.333;
		this.cloned = false;
		this.toDelete = false;
	}

	tick() {
		//collide with player, slow player's fall and give them momentum
		super.getPlayerDist();

		//if the player is close enough to collide, and the player is not in a forced fall, then collide
		if (this.dTPX < this.rw + player.r && this.dTPY < this.rh + player.r && loadingMode.constructor.name != "ForcedFall") {
			//take weighted average of player's x vel and this x vel
			player.dx = ((player.dx * 2) + (this.dx)) / 3;

			//bring player dy closer to matching gravity (-0.5). This causes the player to slowly sink through the cloud.
			if (player.dy > -0.5) {
				player.dy = (player.dy - (0.5 * 10)) / 11
				player.onGround = true;
			} 
		}

		//update x, y never changes
		this.x += this.dx;

		/*since clouds always move to the right, only backwards wrapping needs to be dealt with.
		If a cloud gets within a screen of the right edge, it will create a clone of it on the opposite side of the map.
		This is to ensure the player can stand on the cloud when the transition happens. 
		When the cloud gets more than a screen out of the map, it is deleted.*/

		//testing for clone time
		if (loadingMap[0].length - this.x < canvas.width / camera.scale && this.cloned == false) {
			//only clone once
			this.cloned = true;
			entities.push(new Cloud(this.x - loadingMap[0].length, this.y));
		}

		if (this.x > loadingMap[0].length + (canvas.width / camera.scale)) {
			this.toDelete = true;
		}
	}

	beDrawn() {
		ctx.globalAlpha = 0.5;
		ctx.fillStyle = cloudColor;
		ctx.beginPath();
		var coords = spaceToScreen(this.x, this.y);
		//ctx.ellipse(this.x - this.rw - camera.x, this.y - this.rh - camera.y, this.rw * 2, this.rh * 2);
		ctx.ellipse(coords[0], coords[1], this.rw * camera.scale, this.rh * camera.scale, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.globalAlpha = 1;
	}
}

class Cracker extends Main {
	constructor(x, y) {
		super(x, y);
		this.state = 0;
		this.maxBreakTime = 50;
		this.breakTime = 0;
		this.square = [Math.floor(this.x), Math.floor(this.y)];
		this.defaultValue = loadingMap[this.square[1]][this.square[0]];
		this.increment = 1 / (this.maxBreakTime + 1);
	}

	tick() {
		switch (this.state) {
			case 0:
				//unbroken
				this.getPlayerDist();
				//if player is close enough to break block, start it
				//y tolerance is greater than x so blocks can easily be broken from the bottom and top
				if (this.dTPX < 0.6 && this.dTPY < 0.7) {
					loadingMap[this.square[1]][this.square[0]] -= this.increment;
					this.state = 1;
				}
				break;
			case 1:
				//gradually break block
				loadingMap[this.square[1]][this.square[0]] -= this.increment;
				//if the block has been completely broken, set state to 2
				if (Math.ceil(loadingMap[this.square[1]][this.square[0]]) != this.defaultValue) {
					this.state = 2;
					//make sure that the map square is a whole number
					loadingMap[this.square[1]][this.square[0]] = Math.round(loadingMap[this.square[1]][this.square[0]]);
				}
				break;
			case 2:
				//if broken, count down time until reforming block
				this.breakTime += 1;
				//turning back when the time is right, don't turn if player is inside block
				if (this.breakTime >= this.maxBreakTime) {
					this.getPlayerDist();
					if (this.dTPX > 0.5 || this.dTPY > 0.5) {
						loadingMap[this.square[1]][this.square[0]] = this.defaultValue;
						this.breakTime = 0;
						this.state = 0;
					}
				}
				break;
		}
		
	}

	beDrawn() {
		//do not draw self if already broken
		if (this.state != 2) {
			ctx.beginPath();
			ctx.strokeStyle = blockCrackColor;
			ctx.lineWidth = 2;
			var coords = spaceToScreen(this.x, this.y);
			ctx.moveTo(coords[0], coords[1]);
			ctx.lineTo(coords[0] + (camera.scale * 0.2), coords[1] + (camera.scale * 0.2));
			ctx.stroke();
		}
	}
}

class Orb extends Main {
	constructor(x, y) {
		super(x, y);
		this.redValue = 2.5;
		this.greenValue = 2.5;
		this.possibleHex = ["A", "B", "C", "D", "E", "F"];
		this.points = 14;
	}

	tick() {
		//getting player distance
		this.getPlayerDist();

		//if the player is within 1 square, set the gamemode to a winning mode
		if (this.dTPX < 1 && this.dTPY < 1 && loadingMode.constructor.name != "Ending") {
			loadingMode = new Ending();
		}
	}

	beDrawn() {
		//updating red and green values, corresponds to hex values
		this.redValue = clamp(this.redValue + randomBounded(-0.1, 0.1), 0, 5.99);
		this.greenValue = clamp(this.greenValue + randomBounded(-0.1, 0.1), 0, 5.99);

		//actually drawing the thing
		ctx.fillStyle = "#" + this.possibleHex[Math.floor(this.redValue)] + this.possibleHex[Math.floor(this.greenValue)] + "0";
		//drawing star-shape thing
		var coords = spaceToScreen(this.x, this.y);
		ctx.beginPath();
		for (var an=0;an<this.points;an++) {
			var rad = (an % 2 == 0) ? 0.4 : 0.2;
			var trueAngle = ((an / this.points) * (Math.PI * 2)) + (((time / 200) % 100) * (Math.PI * 2));
			ctx.lineTo(...polToXY(...coords, trueAngle, rad));
		}
		ctx.fill();
	}
}

/*

Game states!

Game states!

Game states!

*/


//helper classes so I don't have to repeat code as much

class GameWorld {
	constructor() {
		this.tileOffset = 0;
	}

	beRun() {
		//drawing sky, map, player, and entities
		//sky
		ctx.fillStyle = skyColor;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.fillStyle = skySecondaryColor;
		ctx.globalAlpha = 0.2;
		//secondary band scales with height
		// [maxY - playerY] / [maxY] to get the band to go down as Y increases
		var thatPercent = (loadingMap.length - player.y) / loadingMap.length;
		ctx.fillRect(0, 0, canvas.width, canvas.height * thatPercent);
		ctx.globalAlpha = 1;

		drawMap(this.tileOffset);
		player.beDrawn();
		drawTimer();

		
		//ticking everything except player
		var reqXDist = canvas.width / camera.scale;
		var reqYDist = canvas.height / camera.scale;
		for (var g=0;g<entities.length;g++) {
			entities[g].tick();
			//only draw the entity if they're close enough to the player
			if (entities[g].dTPX < reqXDist && entities[g].dTPY < reqYDist) {
				entities[g].beDrawn();
			}

			if (entities[g].toDelete == true) {
				entities.splice(g, 1);
			}
		}
	}
}

class CameraFollow extends GameWorld {
	constructor() {
		super();
	}

	beRun() {
		//drawing main game world things
		super.beRun();

		//having camera follow player
		camera.x = player.x;
		camera.y = player.y - 1;

		//handling actual camera
		camera.beDrawn();
		camera.tick();
		
	}
}
//main game states

class Menu {
	constructor() {
	}

	beRun() {
		//drawing menu screen
		ctx.fillStyle = menuColor;
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		//text
		ctx.fillStyle = textColor;
		ctx.textAlign = "center";
		ctx.font = `${canvas.height / 10}px Raleway`; 
		ctx.fillText("Journey of a Speedster", centerX, canvas.height * 0.3);
		ctx.font = `${canvas.height / 15}px Raleway`; 
		ctx.fillText("Press Z", centerX, centerY);

		//getting out of menu
		if (zPressed) {
			zPressed = false;
			loadingMode = new ForcedFall();
		}
	}
}

class Gameplay extends CameraFollow {
	constructor() {
		super();
	}

	beRun() {
		super.beRun();
		player.tick();

		//making sure player is in bounds, if too high fade to black and then reset to starting position
		if (player.y > (loadingMap.length + 10)) {
			camera.shaderOpacity += 1 / 80;
			if (camera.shaderOpacity >= 1) {
				//reset to starting position, make sure player can't move
				player.x = startingCoords[0];
				player.y = startingCoords[1];
				camera.shaderOpacity = 0;
				loadingMode = new ForcedFall();
			}
		}

		//if the user presses b, enter debug mode
		if (bPressed) {
			bPressed = false;
			camera.doMenu = true;
			loadingMode = new Debug();
		}

		//setting special button presses to false
		xPressed = false;
		cPressed = false;

		//add to time
		time += 1;
	}
}

class ForcedFall extends CameraFollow {
	constructor() {
		super();
	}

	beRun() {
		//set onground to false at the start so that collisions from previous ticks don't count
		player.onGround = false;
		//player moves slightly to fix strange camera issues
		super.beRun();
		//handling position without user input
		player.handleMomentum();
		player.dx = 0.001;
		player.handlePosition();

		//detecting if the player should be out of forced fall mode (if they've hit ground)
		if (player.onGround) {
			loadingMode = new Gameplay();
		}
		
		//add to time
		time += 1;
	}
}

//camera pan happens when the player presses c next to a button
class CameraPan extends GameWorld {
	constructor(cameraEndX, cameraEndY) {
		super();
		this.age = 0;
		this.cameraStart = [camera.x, camera.y];
		this.cameraEnd = [cameraEndX, cameraEndY];
	}

	beRun() {
		//main game world
		super.beRun();

		//handling camera
		camera.beDrawn();
		camera.tick();

		//changing age so camera pans instead of staying static
		if (this.age < 100) {
			this.age ++;
			//changing camera position, formula for a line is start + (percentTime * (end - start))
			camera.x = this.cameraStart[0] + ((this.age / 100) * (this.cameraEnd[0] - this.cameraStart[0]));
			camera.y = this.cameraStart[1] + ((this.age / 100) * (this.cameraEnd[1] - this.cameraStart[1]));
		}

		//testing for leaving back to the regular gameplay
		if (cPressed) {
			cPressed = false;
			loadingMode = new Gameplay();
		}
	}
}

class Ending extends GameWorld {
	constructor() {
		super();
		this.tileOffset = -1;
		this.age = 0;
		this.finalAge = 3000;
		this.amount = 0.01;
	}

	beRun() {
		//updating canvas size, if the map is smaller than the canvas width make it smaller
		if (loadingMap[0].length < canvas.width) {
			canvas.width = loadingMap[0].length;
			//update centerX and centerpos because they're literals and don't update when they're referenced variables change
			camera.x = 0;
			camera.cornerX = 0;
			centerX = canvas.width / 2;
		}

		//main game world
		super.beRun();

		//handling camera
		camera.beDrawn();
		camera.tick();
		
		//drawing outside filter
		ctx.globalAlpha = 1;
		ctx.fillStyle = camera.shaderColor;
		ctx.fillRect(canvas.width, 0, -1 * ((camera.x + canvas.width) - loadingMap[0].length), canvas.height)
		ctx.fillRect(0, 0, -camera.x, canvas.height);

		//drawing completion text
		ctx.fillStyle = ballColor;
		ctx.font = "16px Century Gothic";
		ctx.fillText("Total Time Taken:", centerX, canvas.height * 0.0325);

		if (this.age < this.finalAge) {
			//changing camera position, moves a little bit of the way towards the center of the map
			//change = [camera position now] - [camera position final, which is the center - centerX]
			camera.x = loadingMap[0].length / 2;
			camera.y = loadingMap.length / 2;

			//expanding camera field of view
			if (camera.scale > 4) {
				camera.scale -= this.amount * 10;
				camera.shaderOpacity += 1 / this.finalAge;
			}
			//changing age
			this.age ++;
		}
	}
}

class Debug extends GameWorld {
	constructor() {
		super();
		this.tileOffset = Math.floor(camera.scale / 16);
	}

	beRun() {
		var perfTime = [performance.now(), 0];
		//drawing everything
		super.beRun();
		
		//in debug mode, the camera steals the player's movement
		camera.x += player.ax * 10;
		camera.y += player.ay * 10;

		//locking the player's movement
		player.dy = 0.1;
		player.dx = 0;

		//camera is drawn second to last
		camera.beDrawn();
		//debug filter
		ctx.strokeStyle = debugFilterColor;
		ctx.globalAlpha = 0.5;
		ctx.lineWidth = 20;
		ctx.beginPath();
		ctx.rect(0, 0, canvas.width, canvas.height);
		ctx.stroke();
		ctx.globalAlpha = 1;
		
		player.handlePosition();
		camera.tick();

		//placing blocks
		if (mouseDown) {
			var square = screenToSpace(mouseX, mouseY);
			loadingMap[Math.floor(square[1])][Math.floor(square[0])] = numToSet;
		}
		//exiting debug mode
		if (bPressed) {
			bPressed = false;
			camera.doMenu = false;
			loadingMode = new Gameplay();
		}

		//output time taken
		perfTime[1] = performance.now();
		console.log("time used: " + (perfTime[1] - perfTime[0]).toFixed(2));
		//if the player is in debug mode, set time to 1 year
		time = 31536000000;
	}
}