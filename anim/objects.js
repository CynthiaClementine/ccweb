






class Button {
	constructor(x, y, text, size, executeOnClickSTR) {
		this.x = x;
		this.y = y;
		this.t = text;
		this.w = size;
		//this is a string so timing weirdness doesn't happen with passing actual functions in
		this.code = executeOnClickSTR;
	}

	press() {
		//if the mouse is over self, activate
		var pxMargin = canvas.height * this.w * 0.5;
		if (Math.abs(cursor.x - (this.x * canvas.width)) < pxMargin && Math.abs(cursor.y - (this.y * canvas.height)) < pxMargin) {
			eval(this.code);
			return true;
		}

		return false;
	}

	draw() {
		ctx.beginPath();
		var pxMargin = canvas.height * this.w * 0.5;

		ctx.lineWidth = 1;
		ctx.strokeStyle = colors_menu.line;
		ctx.fillStyle = colors_menu.text;

		ctx.textAlign = "center";
		ctx.font = `${Math.floor(canvas.height * this.w * 0.5)}px Ubuntu`;
		ctx.rect(this.x * canvas.width - pxMargin, this.y * canvas.height - pxMargin, pxMargin * 2, pxMargin * 2);
		ctx.stroke();
		ctx.fillText(this.t, this.x * canvas.width, this.y * canvas.height);
	}
}


class Layer {
	constructor(optionalLines) {
		this.points = [];
		this.lines = optionalLines ?? [];
		this.areas = [];
	}

	//gives the indeces of all lines connected to an input line
	linesConnected(lineIndex) {
		//if the start or end of another line match the start or end of this line.. they are connected
	}

	draw() {
		var startPos = workspaceToCanvas(0, 0);
		ctx.setTransform(workspace_scaling, 0, 0, workspace_scaling, startPos[0], startPos[1]);
		//draw fills


		//draw lines
		var ld = this.lines;
		//draw lines
		//loop through all lines
		for (var a=0; a<ld.length; a++) {
			if (ld[a].length == 0) {
				continue;
			}
			ctx.beginPath();
			ctx.strokeStyle = color_line;
			if (ld[a].length == 2) {
				ctx.moveTo(...ld[a][0]);
				ctx.lineTo(...ld[a][1]);
			} else {
				ctx.moveTo(...ld[a][0]);
				ctx.bezierCurveTo(...ld[a][1], ...ld[a][2], ...ld[a][3]);
			}
			ctx.stroke();

			//bounding box
			if (debug_active) {
				ctx.beginPath();
				ctx.strokeStyle = color_debug;
				ctx.lineWidth = 1;
				if (ld[a].length == 2) {
					ctx.rect(...ld[a][0], ld[a][1][0] - ld[a][0][0], ld[a][1][1] - ld[a][0][1]);
				} else {
					var bounds = bezierBounds(...ld[a]);
					ctx.rect(...bounds[0], bounds[1][0] - bounds[0][0], bounds[1][1] - bounds[0][1]);
				}
				ctx.stroke();

				var ref = this.lines[2];
				var pos = canvasToWorkspace(cursor.x, cursor.y);
				pointBezierIntersect(pos, ...ref, 10);
				
			}
		}

		//draw all lines as dotted in debug
		if (debug_active) {
			ctx.fillStyle = color_debug;
			ld.forEach(a => {
				a.forEach(p => {
					drawPoint(p[0], p[1], ctx.lineWidth);
				});
			});
		}

		ctx.setTransform(1, 0, 0, 1, 0, 0);
	}
}


//this class feels dirty to add. I feel like I'm committing crimes adding this class but I don't see another better way to organize it.
class Timeline {
	constructor(initialTimelineData) {
		initialTimelineData = initialTimelineData ?? {};
		this.buttons = [
			new Button(0.03, 0.95, "+", 0.03, `timeline.addLayer()`)
		];

		this.l = initialTimelineData;
		this.fps = 24;
		this.grabTolerance = 10;
		this.height = 0.1;
		this.layerNames = Object.keys(initialTimelineData).reverse();
		this.layerDisplayTop = 0;
		this.movingHeight = false;
		//t is the time in frames the timeline is at
		this.t = 0;
	}

	addLayer() {
		//search for each layer name and use the first one available
		var name = "Layer 1";
		var i = 1;
		while (this.l[name] != undefined) {
			i += 1;
			name = `Layer ${i}`;
		}

		//place layer
		this.l[name] = [];
		this.layerNames.push(name);
	}

	draw() {
		ctx.lineWidth = 2;

		//main body + edge
		ctx.fillStyle = colors_menu.bg;
		ctx.fillRect(0, canvas.height * (1 - this.height), canvas.width, canvas.height * this.height);
		ctx.fillStyle = colors_menu.line;
		ctx.fillRect(0, canvas.height * (1 - this.height), canvas.width, ctx.lineWidth);

		//layers
		var unitHeight = 20;
		var unitWidth = 10;
		var xPos = canvas.width * 0.1;
		var yPos;
		ctx.font = `20px Ubuntu`;
		ctx.textAlign = "right";
		ctx.strokeStyle = colors_menu.line2;
		ctx.beginPath();
		for (var l=0; l<this.layerNames.length; l++) {
			yPos = canvas.height * (1.01 - this.height) + unitHeight * (l + 1);
			//title text
			ctx.fillStyle = colors_menu.text;
			ctx.fillText(this.layerNames[l], xPos - unitWidth, yPos + (unitHeight / 2));

			//timeline boxes
			ctx.fillRect(xPos, yPos, unitWidth * this.l[this.layerNames[l]].length, unitHeight);

			//line below the layer
			ctx.moveTo(xPos, yPos + unitHeight);
			ctx.lineTo(canvas.width * 0.9, yPos + unitHeight);
		}
		ctx.stroke();

		//playhead
		ctx.strokeStyle = color_playhead;
		ctx.fillStyle = color_playhead;
		ctx.fillRect(xPos + (unitWidth * this.t) + 2, canvas.height * (1.01 - this.height) + 2, unitWidth - 4, unitHeight - 4);
		ctx.beginPath();
		ctx.rect(xPos + (unitWidth * this.t), canvas.height * (1.01 - this.height), unitWidth, canvas.height * this.height);
		ctx.stroke();

		//buttons
		this.buttons.forEach(e => {
			e.draw();
		});
	}

	hoverStatus() {
		var magicNumber = 12;
		if (canvas.height * (1 - this.height) - cursor.y < magicNumber && canvas.height * (1 - this.height) - cursor.y > -magicNumber*0.5) {
			return 0;
		}
		return boolToSigned(1 - cursor.y / canvas.height < this.height);
	}

	togglePlayback() {
		
	}
}