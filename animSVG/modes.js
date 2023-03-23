
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
		var spline = createSpline(this.givePathsFor(x, y, w, h), color_stroke, this.r / 2);
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
			'stroke': color_stroke,
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
			'stroke': color_stroke,
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
			'fill': color_stroke
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
		var spline = createSpline(curves, color_stroke, this.r);
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
		this.selected;
		this.selectedLayer;
		this.tol = 5;
		this.lastPos = [];
		this.selectedT = -1;
	}

	createOverlay() {
		workspace_toolTemp.innerHTML = "";
		var layColor = "#F0F";
		//create a copy of the selected spline with extra color and small width
		var copy = this.selected.cloneNode();
		φSet(copy, {
			"stroke-width": `var(--pxUnits2)`,
			"stroke": layColor,
			"id": `temp_spline`
		});
		workspace_toolTemp.appendChild(copy);
		var bin = this.selected.curves;

		//go through and make both corners and control points
		for (var c=0; c<bin.length; c++) {
			for (var d=+(c>0); d<bin[c].length; d++) {
				if (d == 0 || d == bin[c].length - 1) {
					//circles for corners
					workspace_toolTemp.appendChild(φCreate("circle", {
						'cx': bin[c][d][0],
						'cy': bin[c][d][1],
						'r': 4,
						'stroke': layColor,
						"stroke-width": `var(--pxUnits2)`,
						'fill': `transparent`,

						'id': `temp_pull_${c}_${d}`,
						'xC': c, 'xD': d
					}));
				} else {
					//squares for control points
					workspace_toolTemp.appendChild(φCreate("rect", {
						'x': bin[c][d][0] - 2,
						'y': bin[c][d][1] - 2,
						'width': 4,
						'height': 4,
						'stroke': layColor,
						'fill': `transparent`,

						'id': `temp_pull_${c}_${d}`,
						'xC': c, 'xD': d
					}));
				}
			}
		}
	}

	updateOverlay(cubicID, pointID) {
		console.log(`good`, cubicID, pointID);
	}

	updateOverlayTotal() {
		//make sure all the elements match their true positions
		φSet(document.getElementById(`temp_spline`), {'d': φGet(this.selected, "d")});

		var bin = this.selected.curves;
		for (var c=0; c<bin.length; c++) {
			for (var d=+(c>0); d<bin[c].length; d++) {
				if (d == 0 || d == bin[c].length - 1) {
					φSet(document.getElementById(`temp_pull_${c}_${d}`), {
						'cx': bin[c][d][0],
						'cy': bin[c][d][1],
					});
				} else {
					φSet(document.getElementById(`temp_pull_${c}_${d}`), {
						'x': bin[c][d][0] - 2,
						'y': bin[c][d][1] - 2,
					});
				}
			}
		}
	}

	mouseDown(a) {
		var pos = cursorWorkspaceCoordinates();

		//check with selected
		if (this.selected != undefined) {
			//loop through temp bin, select individual bit if necessary
			for (var e=1; e<workspace_toolTemp.children.length; e++) {
				if (φOver(workspace_toolTemp.children[e])) {
					this.cdCoords = [+φGet(workspace_toolTemp.children[e], "xC"), +φGet(workspace_toolTemp.children[e], "xD")];
					return;
				}
			}


			if (this.selected.intersectsPoint(pos[0], pos[1])) {
				this.cdCoords = -1;
				return;
			}

			this.deselect();
			return;
		}

		
		//look top to bottom
		var obj, bin;
		for (var l=0; l<timeline.layerIDs.length; l++) {
			obj = timeline.frameAt(timeline.t, l);
			//figure out the bin to look for
			bin = obj.binAt(pos[0], pos[1]);

			//if there are no splines in the bin, move on
			if (bin.length > 0) {
				//test for intersection
				for (var j=0; j<bin.length; j++) {
					if (bin[j].intersectsPoint(pos[0], pos[1])) {
						this.selected = bin[j];
						this.selectedLayer = obj;
						this.lastPos = pos;
						
						//pick up selected object and remove it from its bins
						obj.binModify(this.selected, true);
						this.cdCoords = undefined;
						this.createOverlay();
						return;
					}
				}
			}
		}
	}

	movePathCorner(deltaX, deltaY, c, d) {
		console.log(`dragging corner`);
		var cv = this.selected.curves;
		var prevExists = (c > 0);
		var nextExists = (c < cv.length - 1);

		var pullPoints = [];

		//the curve with the cd coords will always be pulled
		pullPoints.push(cv[c][d]);

		//also pull if it's the same coordinate duplicated
		if (d == 0) {
			//d is a start point - try the last end point
			if (prevExists && cv[c-1][cv[c-1].length-1] != cv[c][d]) {
				pullPoints.push(cv[c-1][cv[c-1].length-1]);
			}
		} else {
			//d is an end point - try the next start point
			if (nextExists && cv[c+1][0] != cv[c][d]) {
				pullPoints.push(cv[c+1][0]);
			}
		}

		//pull control points along with it, if the control scheme says so
		if (!button_alt) {
			//d is start point - because of the way d is constructed, the only time d can be a start point is when there's no previous curve
			if (d == 0 && cv[c].length == 4) {
				pullPoints.push(cv[c][1]);
			}

			//d is end point
			if (d == 3) {
				pullPoints.push(cv[c][2]);
				if (nextExists && cv[c+1].length == 4) {
					pullPoints.push(cv[c+1][1])
				}
			}
		}


		//move both the start point and end point of adjacent cubics in case they're decoupled
		pullPoints.forEach(p => {
			p[0] += deltaX;
			p[1] += deltaY;
		});
	}

	movePath(deltaX, deltaY) {
		this.selected.curves.forEach(c => {
			c.forEach(p => {
				p[0] += deltaX;
				p[1] += deltaY;
			});
		});
	}

	movePath_decision(delta) {
		var cd = this.cdCoords;
		var cv = this.selected.curves;

		if (cd == -1) {
			//-1 means the whole spline is being pulled
			this.movePath(delta[0], delta[1]);
			return;
		}

		//if it's the start or end, hand off to corner movement
		if (cd[1] % (cv[cd[0]].length - 1) == 0) {
			this.movePathCorner(delta[0], delta[1], cd[0], cd[1]);
			return;
		}

		//if moving a control point, just do that
		cv[cd[0]][cd[1]][0] += delta[0];
		cv[cd[0]][cd[1]][1] += delta[1];
	}

	mouseMove(a) {
		console.log(a.movementX);
		var scaling = φGet(workspace_container, "scaling");
		var delta = [a.movementX / scaling, a.movementY / scaling];

		if (!cursor.down) {
			return;
		}

		if (this.selected && this.cdCoords != undefined) {
			this.movePath_decision(delta);
			this.selected.redraw();
			this.updateOverlayTotal();
		}
	}

	deselect() {
		if (this.selected == undefined) {
			return;
		}
		//add selected back to bins
		this.selectedLayer.binModify(this.selected, false);
		this.selected.calculateBoundingBox();
		this.selected = undefined;
		this.selectedLayer = undefined;

		workspace_toolTemp.innerHTML = "";
	}

	mouseUp(a) {
		
	}
}

class ToolEyedrop {
	constructor() {
		this.scaleBounds = [0.75, 1.75];

		this.canvasFrame;
		this.canvas;
		this.ctx;

		this.pickHandler;
	}

	createCanvas() {
		//height is proportional to how zoomed in user is
		var whs = φGet(workspace_container, ['width', 'height', 'scaling']);
		//make sure scaling isn't too great
		whs[2] = clamp(whs[2], this.scaleBounds[0], this.scaleBounds[1]);
		this.canvasFrame = timeline.t;
		this.canvas = createCanvasFromFrame(timeline.t, whs[0] * whs[2], whs[1] * whs[2]);
		this.canvas.scaling = +whs[2];
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
		var pxDat = this.ctx.getImageData(floor(xy[0] * this.canvas.scaling), floor(xy[1] * this.canvas.scaling), 1, 1).data;
		setColorRGBA(...pxDat);

		if (debug_active) {
			//also put a red dot on the canvas
			this.ctx.fillStyle = "#F00";
			this.ctx.fillRect(floor(xy[0] * this.canvas.scaling), floor(xy[1] * this.canvas.scaling), 1, 1);
		}
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

	escape() {
		//force the picking to STOP
		window.clearInterval(this.pickHandler);
	}
}