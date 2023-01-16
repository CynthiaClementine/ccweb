


class State_Menu {
	constructor() {
		this.buttons = [
			`Settings`,
			`Start`,
			`Credits`
		];
		this.selected = 0;
		this.animSelect = 0;

		this.buttonsStartWidth = 0.7;
		this.buttonsStartHeight = 0.7;
		this.buttonsMargin = 0.06;

		this.substate = 0;
	}

	execute() {
		this.animSelect = ((this.animSelect * menu_animSpeed) + this.selected) / (menu_animSpeed + 1);
		this.animSelect = this.animSelect.toFixed(5) * 1;
		//draw main menu

		//background
		ctx.fillStyle = color_background;
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		//title card
		ctx.fillStyle = color_text_light;
		ctx.font = `${canvas.height / 10}px Ubuntu`;
		ctx.textAlign = "center";
		ctx.fillText(`Onion`, canvas.width / 2, canvas.height * 0.1);

		//buttons
		ctx.font = `${canvas.height / 20}px Ubuntu`;

		//selector
		var width1 = ctx.measureText(this.buttons[Math.floor(this.animSelect)]).width;
		var width2 = ctx.measureText(this.buttons[Math.ceil(this.animSelect)]).width
		var percent = this.animSelect % 1;

		var boxY = canvas.height * (this.buttonsStartHeight + (this.buttonsMargin * this.animSelect));
		drawSelectionBox(canvas.width * (this.buttonsStartWidth - 0.01), boxY - (canvas.height / 36), linterp(width1, width2, percent) + (canvas.width / 50), canvas.height / 18);

		ctx.textAlign = "left";
		var text;
		for (var b=0; b<this.buttons.length; b++) {
			//don't draw start text if the loading map isn't there yet
			if (b != 1 || loading_map != undefined) {
				text = this.buttons[b]; 
			} else {
				text = `loading...`;
			}
			ctx.fillText(text, canvas.width * this.buttonsStartWidth, canvas.height * (this.buttonsStartHeight + (this.buttonsMargin * b)));
		}
	}

	handleKeyPress(a) {
		switch (a.keyCode) {
			case 38:
			case 40:
				//cycle up or down based on key pressed
				this.selected = clamp(this.selected + (a.keyCode - 39), 0, this.buttons.length-1);
				break;
			
			//z
			case 90:
				//different things depending on what's selected
				if (this.substate == 0) {
					switch (this.selected) {
						case 0:
							//settings
							break;
						case 1:
							//game
							if (loading_map != undefined) {
								loading_state = new State_Game();
							}
							break;
						case 2:
							//credits
							break;
					}
				}
				break;
		}
	}

	handleKeyNegate(a) {

	}

	handleMouseMove() {

	}

	handleMouseDown() {
	}

	handleMouseUp() {

	}
}

class State_Game {
	constructor() {

	}

	execute() {
		//background fill
		drawBackground();

		//soundies
		audio_channel1.tick();
	
		camera.tick_follow();
		loading_map.tick();
	
		loading_map.beDrawn();


		// drawMeter(color_meter_health, (camera.scale / 9) * 1, canvas.height * 0.05, camera.scale / 3, canvas.height * 0.9, player.health / player.maxHealth);
		// drawMeter(color_meter_stamina, (camera.scale / 9) * 5, canvas.height * 0.05, camera.scale / 3, canvas.height * 0.9, player.stamina / player.maxStamina);
		drawKeys();
		world_time += 1;
	}

	handleKeyPress(a) {
		switch (a.keyCode) {
			//arrow keys + z
			case 37:
			case 38:
			case 39:
			case 40:
				player.handleInput(false, a.keyCode - 37);
				break;
			case 90:
				player.attemptAttack();
				break;
	
			//editor key
			case 221:
				loading_state = new State_Edit_Collision();
				break;
		}
	}

	handleKeyNegate(a) {
		switch (a.keyCode) {
			case 37:
			case 38:
			case 39:
			case 40:
				player.handleInput(true, a.keyCode - 37);
				break;
		}
	}

	handleMouseDown() {
		if (editor_active) {
			//if the cursor is over the main area
			if (cursor_x > canvas.width * editor_sidebarWidth && cursor_x < canvas.width && cursor_y > 0 && cursor_y < canvas.height) {
				//convert cursor pos to world
				var xy = screenToSpace(cursor_x, cursor_y);
				//floor that
				xy[0] = Math.round(xy[0]);
				xy[1] = Math.round(xy[1]);

				//change the square at that position
				loading_map.changeCollisionSquare(xy[0], xy[1], editor_block);
				return;
			}
	
			//if the cursor is over the sidebar
			if (cursor_x < canvas.width * editor_sidebarWidth) {
				//I'm beginning to wonder if I can't name these functions better. Abstraction is good for readability, but it also creates these terrible file-folder name schemes
				editor_sidebar_click();
			}
		}
	}

	handleMouseMove() {
	}

	handleMouseUp() {
	}
}

class State_Dialogue {
	constructor(dialogueData, lineOPTIONAL) {
		this.data = dialogueData;
		this.line = 0;
		this.moveTo = 0;
		this.lineTime = 0;
		this.entities = [];
		this.collectEntities();
		this.arrestPlayer();
	}

	//stop the player from moving
	arrestPlayer() {
		player.ax = 0;
		player.ay = 0;
		player.dx = 0;
		player.dy = 0;
	}

	//loop through all entity names specified in the dialogue data and find the real entity objects they reference
	collectEntities() {
		for (var a=0; a<this.data.characters.length; a++) {
			this.entities[a] = (this.data.characters[a] == "Player") ? player : getEntity(loading_map, this.data.characters[a]);
		}

		if (this.entities.indexOf(undefined) != -1) {
			console.error(`Could not find entity with name ${this.data.characters[this.entities.indexOf(undefined)]} in map ${loading_map.name}!`)
		}
	}

	doDialogue() {
		this.drawDialogue();
		this.tickDialogue();
	}

	drawDialogue() {
		var lineRef = this.data.lines[this.line];

		//make sure it's a line where dialogue is being drawn
		if (!Number.isInteger(lineRef[0])) {
			return;
		}
		//draw a box centered near the character that's speaking
		var speakerRef = this.entities[lineRef[0]];
		var charPos = spaceToScreen(speakerRef.x, speakerRef.y);
		var pxW = dialogue_boxW * canvas.width;
		var pxH = dialogue_boxH * canvas.height;
		var pxM = dialogue_boxMargin * canvas.height;
		var pxMI = pxH * dialogue_boxMargin;
		
		//outer box
		ctx.fillStyle = color_dialogueBoxOutside;
		ctx.globalAlpha = 0.5;
		drawRoundedRectangle(charPos[0] - pxW / 2, charPos[1] + pxM, pxW, pxH, dialogue_boxA * canvas.height);
		ctx.fill();
		ctx.fillStyle = color_dialogueBox;
		ctx.globalAlpha = 1;
		//inner box
		drawRoundedRectangle(charPos[0] - (pxW / 2) + pxMI, charPos[1] + pxM + pxMI, pxW - pxMI * 2, pxH - pxMI * 2, dialogue_boxA * canvas.height);
		ctx.fill();

		//text
		var textSize = canvas.height / 30; 
		ctx.fillStyle = speakerRef.color;
		ctx.font = `${textSize}px Ubuntu`;
		ctx.textAlign = "left";
		var wordsList = lineRef[1].split(" ");
		var lines = [];
		var maxLineLen = pxW - (pxMI * 4);
		var currentText = wordsList[0];

		//create lines to be smaller than the max length.
		//All lines must have at least one word as well, which overwrites the maximum length requirement.
		//this is to avoid infinite loops.
		for (var w=1; w<wordsList.length; w++) {
			//if the next word added would make the listing too long
			if (ctx.measureText(currentText + " " + wordsList[w]).width > maxLineLen) {
				//push out the line as is and then create a new line
				lines.push(currentText);
				currentText = wordsList[w];
			} else {
				//if the next word is good, just add it
				currentText += " " + wordsList[w];
			}
		}
		lines.push(currentText);

		//drawing words
		for (var m=0; m<lines.length; m++) {
			ctx.fillText(lines[m], charPos[0] - (pxW / 2) + (pxMI * 2), charPos[1] + pxM + (pxMI * 2) + (textSize / 2) + (textSize * m));
		}
	}

	tickDialogue() {
		this.lineTime += 1;

		//switching lines if necessary
		if (this.moveTo > this.line) {
			//increment line by 1
			this.line += 1;
			this.lineTime = 0;

			//if off the end of the conversation, exit
			if (this.line >= this.data.lines.length) {
				loading_state = new State_Game();
				return;
			}
		}

		//tick all entities that are part of the conversation
		this.entities.forEach(e => {
			e.tick();
		});

		
		//run commands on the current line if necessary
		if (!Number.isInteger(this.data.lines[this.line][0])) {
			//check if the command has been initiated already
			if (this.commandFinished == undefined) {
				//initiate the command
				this.commandFinished = conversationParseCommand(this.data.lines[this.line][1]);
				return;
			}

			//if the command has already been initiated
			if (this.commandFinished()) {
				//if escaping, move to the next line and reset the command
				this.moveTo += 1;
				this.commandFinished = undefined;
			}
		}
	}

	execute() {
		//most things in regular game, minus UI
		drawBackground();
		audio_channel1.tick();
		camera.tick_follow();
		loading_map.beDrawn();

		this.doDialogue();

		world_time += 1;
	}

	handleKeyPress(a) {
		if (a.code == "KeyZ") {
			var lineLength = 10;
			if (this.lineTime < (lineLength / dialogue_scrollSpeed) + dialogue_advanceDelay) {
				this.lineTime = 1e10;
			} else {
				this.moveTo += 1;
			}
		}
	}

	handleKeyNegate(a) {

	}

	handleMouseDown() {

	}

	handleMouseMove() {

	}

	handleMouseUp() {

	}
}