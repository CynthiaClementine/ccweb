
//the different application modes, essentially


//abstract class for tools where the user inputs by clicking and then dragging
class ToolDragShape {
	constructor() {
		this.shape = undefined;
		this.downPos = [];
		this.r = 8;
		this.type = "undefined";
	}

	escape() {
		this.shape = undefined;
		workspace_toolTemp.innerHTML = "";
	}

	mouseDown(a) {
		//create a shape if there isn't one already
		if (this.shape == undefined) {
			//get properties - delete type so it doesn't become an attribute
			var coords = cursorWorkspaceCoordinates();
			this.downPos = [coords[0], coords[1]];
			var props = this.givePropertiesFor(coords[0], coords[1], 0, 0);

			//actual creation
			this.shape = φCreate(this.type, props);
			workspace_toolTemp.appendChild(this.shape);
		}
	}

	//gives the properties of the ideal shape with specified bounding box. Also returns a property that contains the name of the shape
	givePropertiesFor(x, y, w, h) {
		console.log(`unimplemented!`);
	}
	
	givePathsFor(x, y, w, h) {
		console.log(`unimplemented!`);
	}

	calculateBoundingBox() {
		var coords = cursorWorkspaceCoordinates();
		var targetW = coords[0] - this.downPos[0];
		var targetH = coords[1] - this.downPos[1];

		//update the position and size of the rectangle
		if (button_shift) {
			//shift locks the aspect ratio of the rectangle
			targetW = Math.max(targetW, targetH);
			targetH = targetW;
		}

		var x = this.downPos[0] - targetW * button_alt;
		var y = this.downPos[1] - targetH * button_alt;
		var w = targetW * (1 + button_alt);
		var h = targetH * (1 + button_alt);

		//negative widths and heights are BANNED so they must be reconfigured
		if (w < 0) {
			w = -w;
			x -= w;
		}
		if (h < 0) {
			h = -h;
			y -= h;
		}

		return [x, y, w, h];
	}

	mouseMove(a) {
		if (this.shape == undefined) {
			return;
		}

		var [x, y, w, h] = this.calculateBoundingBox();

		var props = this.givePropertiesFor(x, y, w, h);
		φSet(this.shape, props);
	}

	mouseUp(a) {
		if (this.shape == undefined) {
			return;
		}
	
		//move the rectangle to the workspace

		//since the workspace expects to work with paths, convert the rectangle into a set of paths
		var [x, y, w, h] = this.calculateBoundingBox();
		var layerObj = timeline.l[timeline.layerIDs[timeline.s]][timeline.t];
		var spline = createSpline(this.givePathsFor(x, y, w, h), color_selected, this.r / 2);
		takeAction(() => {frame_addPath(layerObj, spline);}, () => {frame_removePath(layerObj, spline);});

		workspace_toolTemp.innerHTML = "";
		this.downPos = [];
		this.shape = undefined;
	}
}


class ToolCircle extends ToolDragShape {
	constructor() {
		super();
		this.type = "ellipse";
		this.curves = 4;
		//k is the ratio of radius to distance each control point is away from the start / end points
		//it's calculated here for ease of access
		this.theta = Math.PI * 2 / this.curves;
		this.k = 4 * (2 * Math.sin(this.theta / 2) - Math.sin(this.theta)) / (3 * (1 - Math.cos(this.theta)));
	}

	givePathsFor(x, y, w, h) {
		var th = this.theta;
		var cs = Math.cos;
		var sn = Math.sin;
		//if the bounding box has certain x, y, w, h the circle will have different x y w h
		var rx = w / 2;
		var ry = h / 2;
		var cx = x + w/2;
		var cy = y + h/2;

		//set up the path each curve should take on a unit curve
		var template = [[1, 0], [1, this.k], [cs(th) + this.k * sn(th), sn(th) - this.k * cs(th)], [cs(th), sn(th)]];
		var curves = [];

		//make each curve transformed to the current circle / ellipse
		for (var c=0; c<this.curves; c++) {
			curves.push((template.map(a => rotate(a[0], a[1], th * c))).map(a => [cx + a[0] * rx, cy + a[1] * ry]));
		}

		return curves;
	}

	givePropertiesFor(x, y, w, h) {
		return {
			'cx': x + w/2,
			'cy': y + h/2,
			'rx': w/2,
			'ry': h/2,
			'stroke': color_selected,
			'fill': 'transparent'

		}
	}
}




class ToolPen {
	constructor() {
		this.bufferCurve = [];
	}

	mouseDown(a) {

	}

	mouseMove(a) {

	}

	mouseUp(a) {

	}
}

class ToolRectangle extends ToolDragShape {
	constructor() {
		super();
		this.type = "rect";
	}

	givePathsFor(x, y, w, h) {
		return [
			[[x, y], [x + w, y]], 
			[[x + w, y], [x + w, y + h]],
			[[x + w, y + h], [x, y + h]],
			[[x, y + h], [x, y]]
		]
	}

	givePropertiesFor(x, y, w, h) {
		return {
			'x': x,
			'y': y,
			'width': w,
			'height': h,
			'stroke': color_selected,
			'fill': 'transparent'

		}
	}
}

class ToolPencil {
	constructor() {
		this.bufferPoints = [];
		
		this.r = 8;

		this.cDataLast = undefined;
		this.cData = undefined;

		this.cdDelta = 0;
		this.caDelta = 0;
		this.cdTolerance = 40;
		this.caTolerance = Math.PI / 10;

		this.fitTolerance = 1;
	}

	escape() {
		this.bufferPoints = [];
		workspace_toolTemp.innerHTML = "";
	}

	appendPoint() {
		var coords = cursorWorkspaceCoordinates();
		this.bufferPoints.push(coords);
		workspace_toolTemp.appendChild(φCreate('circle', {
			'cx': coords[0],
			'cy': coords[1],
			'r': this.r / 2,
			'fill': color_selected
		}));
	}

	mouseDown(a) {
		//gets the apparent height
		var box = workspace_background.getBoundingClientRect();
		//gets the true height
		var wh = φGet(workspace_background, ['width', 'height']);
		var scale = [box.width * wh[0], box.height * wh[1]];

		this.bufferPoints = [];
		//start the line
		this.appendPoint();

		this.cDataLast = [...this.bufferPoints[0], 0];
		this.cData = this.cDataLast;
	}

	
	mouseMove(a) {
		if (cursor.down) {
			//add point
			this.appendPoint();
			

			//smooth path


			// var coords = cursorWorkspaceCoordinates();
			// //update points
			// this.cDataLast = this.cData;
			// this.cData = [coords[0], coords[1], Math.atan2(coords[1] - this.cDataLast[1], coords[0] - this.cDataLast[0])];

			// //update trackers
			// this.cdDelta += Math.sqrt((coords[0] - this.cDataLast[0]) ** 2 + (coords[1] - this.cData[1]) ** 2);
			// this.caDelta += modularDifference(this.cDataLast[2], this.cData[2], Math.PI * 2);

			// //if the cursor is too far away or the direction has changed too much, append
			// if (this.cdDelta > this.cdTolerance || this.caDelta > this.caTolerance) {
			// 	this.appendPoint();
			// 	this.cdDelta = 0;
			// 	this.caDelta = 0;
			// }
		}
	}
	
	mouseUp(a) {
		//append the point
		this.appendPoint();


		// //simplify via removing duplicates
		// this.bufferPoints = simplifyLineDuplicates(this.bufferPoints); // simplifyLineRDP(this.bufferPoints, 5);
		
		//turn the points into a set of cubics on the canvas
		if (this.bufferPoints.length > 1) {
			this.pushToWorkspace();
		}
		this.bufferPoints = [];
		workspace_toolTemp.innerHTML = "";
	}

	pushToWorkspace(toleranceOPTIONAL) {
		var simp = simplifyLineRDP(this.bufferPoints, toleranceOPTIONAL ?? this.fitTolerance);
		var curves = potrace(simp, false);

		//quantize
		curves = curves.map(a => {
			return a.map(b => [+(b[0].toFixed(quantizeTo)), +(b[1].toFixed(quantizeTo))]);
		});

		var pushCurves = [curves[0]];
		for (var z=1; z<curves.length; z++) {
			// if (bezierBezierIntersect())
		}

		//make sure the curves don't self-intersect

		var tln = timeline;
		var layerObj = tln.l[tln.layerIDs[tln.s]][tln.t];
		var spline = createSpline(curves, color_selected, this.r);
		takeAction(() => {
			frame_addPath(layerObj, spline);
		}, () => {
			frame_removePath(layerObj, spline);
		});
		
	}
}

class ToolShape {
	constructor() {
		this.sides = 3;
		this.sidesMin = 3;
	}

	mouseDown(a) {
		//start
	}

	mouseMove(a) {}
	mouseUp(a) {}
}

class ToolFill {
	constructor() {
		this.color = "#88FF88";
		this.canvas = document.createElement("canvas");
		this.ctx = this.canvas.getContext("2d");
		[this.canvas.width, this.canvas.height] = φGet(workspace_background, ["width", "height"])
	}

	escape() {}

	mouseDown(a) {
		//detect if inside a shape, and if so give that shape self's fill
	}

	mouseMove(a) {}

	mouseUp(a) {}
}

class ToolMove {
	constructor() {
		this.selected = undefined;
		this.tol = 5;
	}

	drawOverlay() {}

	mouseDown(a) {
		var pos = canvasToWorkspace(cursor.x, cursor.y);
		//detect if on a line, and if so start moving it
		timeline["Layer 1"][0].lines.forEach(l => {
			if (l.length == 0) {
				return;
			}
			var intersects = (l.length == 2) ? pointLineIntersect(pos, ...l, this.tol) : pointBezierIntersect(pos, ...l, this.tol);
			if (intersects) {
				this.selected = l;
			}
		});
	}

	mouseMove(a) {
		var n = 1;
		if (this.selected != undefined) {
			//add movement to each line point
			
			//if just the movement is added, the piece will trail behind the cursor.
			//double the movement is added, and then removed when necessary

			this.selected.forEach(p => {
				p[0] -= this.bufferStore[0] * (n-1);
				p[1] -= this.bufferStore[1] * (n-1);
			});
			this.bufferStore = [cursor.dx / workspace_scaling, cursor.dy / workspace_scaling];
			this.selected.forEach(p => {
				p[0] += this.bufferStore[0] * n;
				p[1] += this.bufferStore[1] * n;
			});
		}
	}

	mouseUp(a) {
		if (this.selected != undefined) {
			//remove buffer movement
			this.selected.forEach(p => {
				p[0] -= this.bufferStore[0];
				p[1] -= this.bufferStore[1];
			});
			this.selected = undefined;
		}
	}
}

class ToolEyedrop {
	constructor() {
		this.canvasFrame;
		this.canvas;
		this.ctx;

		this.pickHandler;
	}

	createCanvas() {
		//height is proportional to how zoomed in user is
		var whs = φGet(workspace_container, ['width', 'height', 'scaling']);
		this.canvasFrame = timeline.t;
		this.canvas = createCanvasFromFrame(timeline.t, whs[0] * whs[2], whs[1] * whs[2]);
		this.ctx = this.canvas.getContext("2d");
	}

	pickColor() {
		//don't pick if there's no canvas
		if (this.canvas == undefined) {
			return;
		}

		//if the canvas is good, pick it
		if (this.canvas.isValid) {
			this.pickColor_final();
			return;
		}

		var self = this;
		//if the canvas isn't good, retry later
		this.pickHandler = window.setInterval(() => {
			if (self.canvas.isValid) {
				window.clearInterval(self.pickHandler);
				self.pickColor_final();
			}
		}, 1);
	}

	pickColor_final() {
		var xy = cursorWorkspaceCoordinates();
		var pxDat = this.ctx.getImageData(floor(xy[0]), floor(xy[1]), 1, 1).data;
		setColorRGBA(...pxDat);
	}

	mouseDown(a) {
		//don't start if the timeline is playing - that could create bugs
		if (autoplay != undefined) {
			return;
		}

		//create rasterized version of the canvas to pick from
		if (this.canvasFrame == undefined || this.canvasFrame != timeline.t) {
			this.createCanvas();
		}
		this.pickColor();
	}

	mouseMove(a) {
		if (this.canvas != undefined && cursor.down) {
			this.pickColor();
		}
	}

	mouseUp(a) {

	}
}