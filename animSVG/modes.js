
//the different application modes, essentially


//abstract class for tools where the user inputs by clicking and then dragging
class ToolDragShape {
	constructor() {
		this.shape = undefined;
		this.downPos = [];
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
		var spline = createSpline(this.givePathsFor(x, y, w, h), color_stroke, data_persistent.brushSize / 2);
		takeAction(() => {frame_addPath(layerObj, spline);}, () => {frame_removePath(layerObj, spline);});

		workspace_toolTemp.innerHTML = "";
		this.downPos = [];
		this.shape = undefined;
	}
}

class ToolLine {
	constructor() {
		this.shape = undefined;
		this.downPos = [];
		this.currentPos = [];
	}

	escape() {
		this.shape = undefined;
		workspace_toolTemp.innerHTML = "";
	}

	mouseDown(a) {
		//create a shape if there isn't one already
		if (this.shape == undefined) {
			this.downPos = cursorWorkspaceCoordinates();
			//actual creation
			this.shape = φCreate("line", {
				'x1': this.downPos[0],
				'y1': this.downPos[1],
				'x2': this.downPos[0],
				'y2': this.downPos[1],
				'stroke': color_stroke,
				'stroke-width': data_persistent.brushSize
			});
			workspace_toolTemp.appendChild(this.shape);
		}
	}

	mouseMove(a) {
		if (this.shape == undefined) {
			return;
		}

		var coords = cursorWorkspaceCoordinates();
		φSet(this.shape, {
			'x2': coords[0],
			'y2': coords[1]
		});
	}

	mouseUp(a) {
		if (this.shape == undefined) {
			return;
		}
	
		//move line to workspace
		var coords = cursorWorkspaceCoordinates();
		var layerObj = timeline.l[timeline.layerIDs[timeline.s]][timeline.t];
		console.log(`line is ${JSON.stringify([[this.downPos, coords]])}`);
		var spline = createSpline([[this.downPos, coords]], color_stroke, data_persistent.brushSize);
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
		this.selfIntersects = [];
		this.intersectNap = false;

		this.cDataLast = undefined;
		this.cData = undefined;

		this.cdDelta = 0;
		this.caDelta = 0;
		this.cdTolerance = 40;
		this.caTolerance = Math.PI / 10;

		this.fitTolerance = 1;
	}

	escape() {
		this.reset();
	}

	reset() {
		this.bufferPoints = [];
		workspace_toolTemp.innerHTML = "";
		this.selfIntersects = [];
		this.intersectNap = false;
	}

	appendPoint() {
		var coords = cursorWorkspaceCoordinates();

		//make sure the coords aren't the same as the last ones
		if (this.bufferPoints.length > 0 && arrsAreSame(this.bufferPoints[this.bufferPoints.length-1], coords)) {
			return;
		}

		this.bufferPoints.push(coords);
		workspace_toolTemp.appendChild(φCreate('circle', {
			'cx': coords[0],
			'cy': coords[1],
			'r': data_persistent.brushSize / 2,
			'fill': color_stroke,
		}));
	}

	mouseDown(a) {
		workspace_toolTemp.innerHTML = "";
		//gets the apparent height
		var box = workspace_background.getBoundingClientRect();
		//gets the true height
		var wh = φGet(workspace_background, ['width', 'height']);
		var scale = [box.width * wh[0], box.height * wh[1]];

		this.reset();
		//start the line
		this.appendPoint();

		this.cDataLast = [...this.bufferPoints[0], 0];
		this.cData = this.cDataLast;
	}

	//takes a set of points and puts them into the buffer, without having to use the mouse
	autoBuffer(points) {
		points.forEach(p => {
			this.bufferPoints.push(p);
			workspace_toolTemp.appendChild(φCreate('circle', {
				'cx': p[0],
				'cy': p[1],
				'r': data_persistent.brushSize / 2,
				'fill': "#FFFFFF22"
			}));
			this.checkRecentIntersect();
		});
	}

	checkRecentIntersect() {
		var bp = this.bufferPoints;
		var lin1 = bp[bp.length - 2];
		var lin2 = bp[bp.length - 1];
		var trueT;
		
		//find a spot where a cross is happening
		for (var a=0; a<bp.length-3; a++) {
			trueT = lineLineIntersect(bp[a], bp[a+1], lin1, lin2);
			if (trueT.length > 0) {
				//don't log multiple points per intersection
				if (!this.intersectNap) {
					// console.log(`self-intersect detected between ${JSON.stringify(bp[a])}, ${JSON.stringify(bp[a+1])} and ${JSON.stringify(lin1)}, ${JSON.stringify(lin2)}`);
					//log both buffer points where the cross happens
					this.selfIntersects.push(trueT[0] + a);
					this.selfIntersects.push(trueT[1] + bp.length - 2);

					//update the nap variable
					this.intersectNap = true;

					workspace_toolTemp.appendChild(φCreate("circle", {
						'cx': linterp(lin1[0], lin2[0], trueT[1]),
						'cy': linterp(lin1[1], lin2[1], trueT[1]),
						'r': 1,
						'fill': "#F0F",
						'stroke': "#0FF"
					}));
				}
				return;
			}
		}

		//make sure the nap is off when there's no intersection
		this.intersectNap = false;
	}

	//takes in a buffer and times to chop at, and returns a chopped set of buffers
	chopBuffer(buffer, timings) {
		//if there are no self-intersections, just use all bufferpoints
		if (timings.length == 0) {
			return [buffer];
		}

		var bits = [];

		//put bounds of buffer in so one loop can handle everything
		timings.splice(0, 0, 0);
		timings.push(buffer.length);
		// console.log(timings); commenting this instead of deleting it because sometimes self-intersections fail for some reason
		var lastT;
		var nextT;
		var mainWiggle;
		for (var f=1; f<timings.length; f++) {
			lastT = timings[f-1];
			nextT = timings[f];
			mainWiggle = buffer.slice(Math.ceil(lastT), Math.ceil(nextT));
			//test if the start and end need modification
			if (lastT % 1 != 0) {
				mainWiggle.splice(0, 0, linterpMulti(buffer[floor(lastT)], buffer[Math.ceil(lastT)], lastT % 1));
			}
			if (nextT % 1 != 0) {
				mainWiggle.push(linterpMulti(buffer[floor(nextT)], buffer[Math.ceil(nextT)], nextT % 1));
			}
			bits.push(mainWiggle);
		}
		return bits;
	}

	
	mouseMove(a) {
		if (cursor.down) {
			//add point
			this.appendPoint();

			//check for self-intersection
			this.checkRecentIntersect();
		}
	}
	
	mouseUp(a) {
		//append the point
		this.appendPoint();


		// //simplify via removing duplicates
		// this.bufferPoints = simplifyLineDuplicates(this.bufferPoints); // simplifyLineRDP(this.bufferPoints, 5);
		
		//turn the points into a set of cubics on the canvas
		if (this.bufferPoints.length > 1) {
			console.log(JSON.stringify(this.bufferPoints.map(a => [+(a[0].toFixed(2)), +(a[1].toFixed(2))])));
			//figure out bounds
			// var minX = Math.min(this.bufferPoints.map(a => a[0]));
			// var minY = Math.min(this.bufferPoints.map(a => a[1]));
			// var maxX = Math.max(this.bufferPoints.map(a => a[0]));
			// var maxY = Math.max(this.bufferPoints.map(a => a[1]));

			// var tolerance = clamp(Math.min((maxX - minX) / 40, (maxY - minY) / 40), 0.1, this.fitTolerance);
			this.pushToWorkspace();
		}
		this.reset();
	}

	pushToWorkspace(toleranceOPTIONAL) {
		//make sure none of the curves intersect
		this.selfIntersects = this.selfIntersects.sort((a, b) => a - b);
		
		var si = this.selfIntersects;
		if (si[0] == 0) {
			si.shift();
		}
		if (si[si.length-1] > this.bufferPoints.length - 1) {
			si.pop();
		}

		var bufferBits = this.chopBuffer(this.bufferPoints, si);
		var layerObj = timeline.frameAt(timeline.t, timeline.s);

		//for each buffer bit:
		var finalSplines = [];
		bufferBits.forEach(b => {
			//simplify each buffer bit
			var simp = simplifyLineRDP(b, toleranceOPTIONAL ?? this.fitTolerance);
			var curves = potrace(simp, false);

			//quantize
			curves = curves.map(a => {
				return a.map(d => [+(d[0].toFixed(quantizeTo)), +(d[1].toFixed(quantizeTo))]);
			});

			//put into workspace
			var spline = createSpline(curves, color_stroke, data_persistent.brushSize);
			finalSplines.push(spline);
			frame_addPath(layerObj, spline);
		});

		recordAction(() => {
			finalSplines.forEach(a => {
				frame_addPath(layerObj, a);
			});
		}, () => {
			finalSplines.forEach(a => {
				frame_removePath(layerObj, a);
			});
		});
		return finalSplines;
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



/* 
What should move tool do?
On any given keyframe, look top to bottom for nodes nearby the cursor. 
When the user clicks, all the nodes at the cursor's specific location should be selected.
The user can press shift + click to select more. Then, when pressing and holding, all the selected nodes are translated.

probably have a progressive colors system?
Pink -> available to select
Blue -> selected
*/
class ToolMove {
	constructor() {
		this.selectedPts = [];
		this.selectedCtrls = [];
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
						'stroke-width': `var(--pxUnits2)`,
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
						'stroke-width': `var(--pxUnits2)`,
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

	//finds the top-most spline that the cursor is over
	findCursorSpline() {
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
		//see createOverlay for how c and d are constructed
		var cv = this.selected.curves;

		var cLast = cv[(c + 1) % cv.length];
		var cCurt = cv[c];
		var cNext = cv[(c + cv.length - 1) % cv.length];
		var isLoop = arrsAreSame(cv[cv.length-1][cv[cv.length-1].length-1], cv[c][0]);

		var prevExists = (c > 0);
		var nextExists = (c < cv.length - 1);
		var cBuffer;

		var pullPoints = [];

		//the curve with the cd coords will always be pulled
		pullPoints.push(cv[c][d]);

		//also pull if it's the same coordinate duplicated
		if (d == 0) {
			//if d is 0 it must be the very first point + curve in the spline
			cBuffer = cv[cv.length-1];
			//grab last end point if necessary
			if (isLoop && cBuffer[cBuffer.length-1] != cv[c][0]) {
				pullPoints.push(cBuffer[cBuffer.length-1]);
			}
		} else {
			//d is an end point - try the next start point
			if (nextExists && cv[c+1][0] != cv[c][d]) {
				pullPoints.push(cv[c+1][0]);
			}
		}

		//pull control points along with it, if the control scheme says so
		if (!button_alt) {
			//d is start point - the only time d can be a start point is when there's no previous curve
			if (d == 0 && cv[c].length == 4) {
				pullPoints.push(cv[c][1]);
				if (isLoop && cv[cv.length-1].length == 4) {
					pullPoints.push(cv[cv.length-1][2]);
				}
			}

			//d is end point
			if (d == 3) {
				pullPoints.push(cv[c][2]);
				if (cv[c+1].length == 4) {
					pullPoints.push(cv[c+1][1]);
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

		this.detail = 2;

		this.pickHandler;
	}

	createCanvas() {
		//height is proportional to how zoomed in user is
		var whs = φGet(workspace_container, ['width', 'height', 'scaling']);
		//make sure scaling isn't too great
		whs[2] = clamp(whs[2], this.scaleBounds[0], this.scaleBounds[1]);
		this.canvasFrame = timeline.t;
		this.canvas = createCanvasFromFrame(timeline.t, whs[0] * whs[2], whs[1] * whs[2], this.detail);
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



class ToolFill extends ToolEyedrop {
	constructor() {
		super();
		this.detail = 0;
		this.scaleBounds = [1, 1];
		this.sizeLimit = 3200;
		this.forceFillCoordinates = undefined;
	}

	redDot(canX, canY) {
		this.ctx.fillStyle = "#F00";
		this.ctx.fillRect(canX, canY, 0.8, 0.8);
	}

	greenDot(canX, canY) {
		this.ctx.fillStyle = "#0F0";
		this.ctx.fillRect(canX, canY, 0.8, 0.8);
	}

	//floodfills the canvas starting at certain canvas coordinates
	floodFill(canX, canY, maxEdge, banDir) {
		var q = [[canX, canY]];
		var edge = [];
		var nowDat;

		while (q.length > 0) {
			if (q.length > maxEdge) {
				return [];
			}
			nowDat = this.ctx.getImageData(q[0][0], q[0][1], 1, 1).data;

			//if it's a center bit, push to edges and color green
			if (nowDat[2] == 255) {
				this.greenDot(q[0][0], q[0][1]);
				q.push([q[0][0] - 1, q[0][1]]);
				q.push([q[0][0], q[0][1] - 1]);
				q.push([q[0][0] + 1, q[0][1]]);
				q.push([q[0][0], q[0][1] + 1]);
			} else if (nowDat[1] < 255) {
				//if it's an edge (not white or green) color it red
				this.redDot(q[0][0], q[0][1]);
				edge.push([q[0][0], q[0][1]]);
			}
			q.shift();
		}

		//after running the floodfill request a fresh canvas
		// this.createCanvas();
		return edge;
	}

	//this says whether all 4 cardinal directions have filled cubic bins in them
	confirmCardinals(frame, canX, canY) {
		var dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
		var frameBounds = frame.getBounds();
	}

	//actual fill algorithm
	pickColor_final() {
		if (this.forceFillCoordinates != undefined) {
			this.fill(...this.forceFillCoordinates);
			this.forceFillCoordinates = undefined;
			return;
		}
		var xy = cursorWorkspaceCoordinates();
		this.fill(xy[0], xy[1]);
	}

	fill(workX, workY) {
		this.canvas.willReadFrequently = true;
		console.log(this.canvas.scaling);
		var target = timeline.frameAt(timeline.t, timeline.s);
		var pxDat = this.ctx.getImageData(floor(workX * this.canvas.scaling), floor(workY * this.canvas.scaling), 1, 1).data;

		var edges = this.floodFill(floor(workX * this.canvas.scaling), floor(workY * this.canvas.scaling), 3200);

		if (edges.length == 0) {
			return;
		}
		//transform edges into world coordinates
		edges = edges.map(p => [p[0] / this.canvas.scaling, p[1] / this.canvas.scaling]);
		var loops = curvesFromEdgePath(target, edges);
		loops = createFill(loops, color_fill);
		frame_addFill(target, loops);

		if (debug_active) {
			// this.createCanvas();
			

			//append curves to fills
			// curves = createFill(curves, color_fill);
			// frame_addFill(target, curves);
		}
	}

	mouseMove(a) {}
}