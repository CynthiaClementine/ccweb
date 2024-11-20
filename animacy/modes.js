
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
			var coords = cursorWorkspacePos();
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
		var coords = cursorWorkspacePos();
		var targetW = coords[0] - this.downPos[0];
		var targetH = coords[1] - this.downPos[1];

		//update the position and size of the rectangle
		if (button_shift) {
			//shift locks the aspect ratio of the rectangle
			if (Math.abs(targetH) > Math.abs(targetW)) {
				targetW = targetH;
			}
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
		var spline = createSpline(this.givePathsFor(x, y, w, h), color_stroke, data_persistent.brushSize);
		takeAction(() => {frame_addPath(layerObj, spline);}, () => {frame_removePath(layerObj, spline);});

		workspace_toolTemp.innerHTML = "";
		this.downPos = [];
		this.shape = undefined;
	}
}

class ToolDragRadial {
	constructor() {
		this.shape = undefined;
		this.downPos = [];
		this.currentPos = [];
		this.type = undefined;
		
		this.snap = false;
		this.snapAngle = Math.PI / 4;
	}

	escape() {
		this.shape = undefined;
		workspace_toolTemp.innerHTML = "";
	}

	givePropertiesFor(x, y, dx, dy) {
		console.log(`unimplemented!`);
	}
	
	givePathsFor(x, y, dx, dy) {
		console.log(`unimplemented!`);
	}

	calculateDeltaPos() {
		var coords = cursorWorkspacePos();
		coords[0] -= this.downPos[0];
		coords[1] -= this.downPos[1];
		return coords;
	}

	mouseDown(a) {
		//create a shape if there isn't one already
		if (this.shape == undefined) {
			this.downPos = cursorWorkspacePos();
			//actual creation
			this.shape = φCreate(this.type, this.givePropertiesFor(this.downPos[0], this.downPos[1], 0, 0));
			workspace_toolTemp.appendChild(this.shape);
		}
	}

	mouseMove(a) {
		if (this.shape == undefined) {
			return;
		}

		var coords = this.calculateDeltaPos();
		φSet(this.shape, this.givePropertiesFor(this.downPos[0], this.downPos[1], coords[0], coords[1]));
	}

	mouseUp(a) {
		if (this.shape == undefined) {
			return;
		}
	
		//move line to workspace
		var coords = this.calculateDeltaPos();
		var layerObj = timeline.l[timeline.layerIDs[timeline.s]][timeline.t];
		var spline = createSpline(this.givePathsFor(this.downPos[0], this.downPos[1], coords[0], coords[1]), color_stroke, data_persistent.brushSize);
		takeAction(() => {frame_addPath(layerObj, spline);}, () => {frame_removePath(layerObj, spline);});

		workspace_toolTemp.innerHTML = "";
		this.downPos = [];
		this.shape = undefined;
	}
}

class ToolPolygon extends ToolDragRadial {
	constructor() {
		super();
		this.type = "polygon";

		this.star = false;
		this.numSides = 3;
		this.sidesBounds = [3, 32];
		this.hotkeys = hotkeys_polygon;
	}

	changeSides(sidesDelta) {
		this.numSides = clamp(this.numSides + sidesDelta, ...this.sidesBounds);
	}

	points(x, y, r, theta) {
		var Δθ = 2 * Math.PI / this.numSides;
		var ptsArr = [];

		for (var g=this.numSides-1; g>=0; g--) {
			ptsArr[g] = [x + r * Math.cos(theta + g * Δθ), y + r * Math.sin(theta + g * Δθ)];
		}
		return ptsArr;
	}

	givePropertiesFor(x, y, dx, dy) {
		var r = Math.sqrt(dx * dx + dy * dy);
		var theta = Math.atan2(dy, dx);
		var pts = this.points(x, y, r, theta);
		return {
			//javascript - love its idiosyncrasies sometimes
			'points': pts.reduce((a, b) => a + " " + b),
			'fill': 'none',
			'stroke': color_stroke,
			'stroke-width': data_persistent.brushSize
		}
	}

	givePathsFor(x, y, dx, dy) {
		var r = Math.sqrt(dx * dx + dy * dy);
		var theta = Math.atan2(dy, dx);
		var pts = this.points(x, y, r, theta);
		var lines = [];
		for (var z=0; z<pts.length; z++) {
			//I'm using the spread operator to dereference the original points
			lines.push([[...pts[z]], [...pts[(z+1) % pts.length]]]);
		}
		return lines;
	}
}

class ToolLine extends ToolDragRadial {
	constructor() {
		super();
		this.type = "line";

		this.hotkeys = hotkeys_brushSize;
	}

	givePropertiesFor(x, y, dx, dy) {
		return {
			'x1': x,
			'y1': y,
			'x2': x + dx,
			'y2': y + dy,
			'stroke': color_stroke,
			'stroke-width': data_persistent.brushSize
		};
	}
	
	givePathsFor(x, y, dx, dy) {
		return [[[x, y], [x + dx, y + dy]]];
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
			'stroke-width': data_persistent.brushSize,
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
			'stroke-width': data_persistent.brushSize,
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

		this.fitToleranceMax = 2;
		this.fitToleranceMin = 0.15;

		this.hotkeys = hotkeys_brushSize;
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
		var coords = cursorWorkspacePos();

		//make sure the coords aren't the same as the last ones
		if (this.bufferPoints.length > 0 && d2_distSquared(this.bufferPoints[this.bufferPoints.length-1], coords) < 0.001) {
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
			moveCursorTo(p[0], p[1]);
			this.appendPoint();
			this.checkRecentIntersect();
		});
	}

	//used for true intersection detection
	//o for old, n for new, 1 is back, 2 is front
	//returns [old line T, new line T]
	checkRecentIntersect_shouldIntersect(o1, o2, n1, n2) {
		var ts = lineLineIntersect(o1, o2, n1, n2);
		
		//if it's fully in the line, cool!
		if (ts.length > 0) {
			return ts;
		}
		
		//if it's not fully in the line, one of the line points must be on the other line
		var ε = 0.01;

		if (pointLineIntersect(o1, n1, n2, ε)) {
			return [ε, lineT(n1, n2, o1)];
		}

		if (pointLineIntersect(n2, o1, o2, ε)) {
			return [lineT(o1, o2, n2), 1 - ε];
		}
		return [];
	}

	checkRecentIntersect() {
		var debug = true;
		var bp = this.bufferPoints;
		var lin1 = bp[bp.length - 2];
		var lin2 = bp[bp.length - 1];
		var trueT, intersects;
		
		//find a spot where a cross is happening
		for (var a=0; a<bp.length-3; a++) {
			intersects = lineIntersect(bp[a], bp[a+1], lin1, lin2);
			if (intersects) {
				trueT = this.checkRecentIntersect_shouldIntersect(bp[a], bp[a+1], lin1, lin2);

				if (trueT.length > 0) {
					//don't log multiple points per intersection
					if (!this.intersectNap) {
						//log both buffer points where the cross happens
						this.selfIntersects.push(trueT[0] + a);
						this.selfIntersects.push(trueT[1] + bp.length - 2);
	
						//update the nap variable
						this.intersectNap = true;
					}
					return;
				}
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
			// var minX = Math.min(...this.bufferPoints.map(a => a[0]));
			// var minY = Math.min(...this.bufferPoints.map(a => a[1]));
			// var maxX = Math.max(...this.bufferPoints.map(a => a[0]));
			// var maxY = Math.max(...this.bufferPoints.map(a => a[1]));

			

			// var tolerance = clamp(Math.min((maxX - minX) / 40, (maxY - minY) / 40), 0.2, this.fitTolerance);
			var tolerance = clamp(1 / +φGet(workspace_container, "scaling"), this.fitToleranceMin, this.fitToleranceMax);
			this.pushToWorkspace(tolerance);
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
			var simp = simplifyLineRDP(b, toleranceOPTIONAL ?? 1);
			var curves = potrace(simp, false);

			//quantize
			curves = curves.map(a => {
				return a.map(d => [+(d[0].toFixed(quantizeTo)), +(d[1].toFixed(quantizeTo))]);
			});

			//put into workspace
			var spline = createSpline(curves, color_stroke, data_persistent.brushSize);
			finalSplines.push(spline);
			var test = frame_addPath(layerObj, spline);
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

class ToolSelects {
	constructor() {
		this.selected = [];
		this.selectedLayers = [];
		this.downPos;
		this.lastPos;

		this.minRadius = quantizeTo

		this.status = "up";

		this.hotkeys = hotkeys_delete;
	}

	createOverlay() {
		workspace_toolTemp.innerHTML = "";
		//highlight all selected objects
		this.selected.forEach(s => {
			var copy = s.cloneNode();
			φSet(copy, {
				"class": `select`
			});
			workspace_toolTemp.appendChild(copy);
		});
	}

	delete() {
		//delete selected objects
		if (this.selected.length > 0) {
			for (var s=0; s<this.selected.length; s++) {
				frame_removePath(this.selectedLayers[s], this.selected[s]);
			}
			workspace_toolTemp.innerHTML = "";
			this.selected = [];
			this.selectedLayers = [];
		}
	}

	deselect() {
		workspace_toolTemp.innerHTML = "";
		while (this.selected.length > 0) {
			this.deselectOne(0);
			return;
		}
	}

	deselectOne(index) {
		this.selectedLayers[index].binModify(this.selected[index], false);
		this.selected.splice(index, 1);
		this.selectedLayers.splice(index, 1);
	}

	mouseDown(a) {
		var pos = cursorWorkspacePos();
		this.downPos = pos;
		this.lastPos = pos;

		//check with selected
		if (this.selected.length > 0) {
			for (var l=0; l<this.selected.length; l++) {
				if (this.selected[l].intersectsPoint(pos[0], pos[1])) {
					this.status = "downGeneric";
					return;
				}
			}

			if (!button_shift && !Array.from(workspace_toolTemp.children).includes(a.target)) {
				this.deselect();
				return;
			}
		}

		//select a new object
		var selectArr = selectAt(pos[0], pos[1]);
		if (selectArr.length > 0) {
			this.selected.push(selectArr[0]);
			this.selectedLayers.push(selectArr[1]);

			//pick up selected object and remove it from its bins
			selectArr[1].binModify(selectArr[0], true);
			this.cdCoords = undefined;
			this.createOverlay();
		}
	}

	redrawAll() {
		this.selected.forEach(s => {
			s.redraw();
		});
	}

	mouseMove() {
		if (!cursor.down) {
			return;
		}

		var pos = cursorWorkspacePos();
		var delta = [pos[0] - this.lastPos[0], pos[1] - this.lastPos[1]];

		//if moving and the status hasn't been assigned yet, change the status 
		if (this.status == "downGeneric") {
			this.status = "translating";
		}

		//have to check for status again because child classes may make it something other than translating / downGeneric
		if (this.status == "translating") {
			//translate every cubic
			this.selected.forEach(s => {
				//if the x exists it's a special object
				if (s.x != undefined) {
					φAdd(s, {
						'x': delta[0],
						'y': delta[1]
					});
					return;
				}
				s.curves.forEach(c => {
					c.forEach(p => {
						p[0] += delta[0];
						p[1] += delta[1];
					});
				});
			});
			this.redrawAll();

			//redo the temp elements
			this.createOverlay();

			this.lastPos = pos;
		}
	}

	mouseUp() {
		switch (this.status) {
			case "translating":
				break;
			case "downGeneric":
				//de-select the one the mouse is over
				this.status = "up";
				break;
		}
	}

	timeChange() {
		this.deselect();
	}

	escape() {
		this.deselect();
	}
}

class ToolTransform extends ToolSelects {
	constructor() {
		super();
		this.superBounds = [];
		this.center = [];
		this.xStretch = false;
		this.yStretch = false;
	}

	calculateSuperBounds() {
		this.superBounds = [
			Math.min(...this.selected.map(a => a.bounding[0])),
			Math.min(...this.selected.map(a => a.bounding[1])),
			Math.max(...this.selected.map(a => a.bounding[2])),
			Math.max(...this.selected.map(a => a.bounding[3])),
		];

		this.center = [(this.superBounds[0] + this.superBounds[2]) / 2, (this.superBounds[1] + this.superBounds[3]) / 2];
	}

	selectCorner(cornerID) {
		console.log(`selected ${cornerID}`);
		this.xStretch = true;
		this.yStretch = true;
		this.status = "stretching";
	}

	selectEdge(edgeID) {
		if (edgeID % 2 == 0) {
			//up/down
			this.yStretch = true;
		} else {
			//left/right
			this.xStretch = true;
		}
		this.status = "stretching";
	}

	selectCenter() {

	}

	createOverlay() {
		super.createOverlay();

		if (this.selected.length < 1) {
			return;
		}

		this.calculateSuperBounds();
		var superBounds = this.superBounds.map(a => a);

		//corner pulls, going clockwise starting from top-left
		var corners = [
			[superBounds[0], superBounds[1], 'nwse-resize', `toolCurrent.selectCorner(0)`],
			[superBounds[2], superBounds[1], 'nesw-resize', `toolCurrent.selectCorner(1)`],
			[superBounds[2], superBounds[3], 'nwse-resize', `toolCurrent.selectCorner(2)`],
			[superBounds[0], superBounds[3], 'nesw-resize', `toolCurrent.selectCorner(3)`],

			[(superBounds[0] + superBounds[2]) / 2, superBounds[1], 'ns-resize', `toolCurrent.selectEdge(0)`],
			[superBounds[2], (superBounds[1] + superBounds[3]) / 2, 'ew-resize', `toolCurrent.selectEdge(1)`],
			[(superBounds[0] + superBounds[2]) / 2, superBounds[3], 'ns-resize', `toolCurrent.selectEdge(2)`],
			[superBounds[0], (superBounds[1] + superBounds[3]) / 2, 'ew-resize', `toolCurrent.selectEdge(3)`],
		];

		//append the rectangular outline
		workspace_toolTemp.appendChild(φCreate("rect", {
			'class': `select`,
			'x': superBounds[0],
			'y': superBounds[1],
			'width': superBounds[2] - superBounds[0],
			'height': superBounds[3] - superBounds[1]
		}));
		corners.forEach(c => {
			workspace_toolTemp.appendChild(φCreate("circle", {
				'fill': `var(--colorSelect)`,
				'r': 2,
				'cx': c[0],
				'cy': c[1],
				'cursor': c[2],
				'onmousedown': c[3],
			}),);
		});
	}

	mouseMove() {
		super.mouseMove();

		if (this.status == "stretching") {
			//generate a minimum safe distance - to avoid undefineds
			var minDist = 2 * quantizeAmount;
			var pos = cursorWorkspacePos();
			var delta = d2_subtract(pos, this.lastPos);
			var centerVecOld = d2_subtract(this.lastPos, this.center);
			var centerVec = d2_subtract(pos, this.center);
			//do not continue if too close to the center
			if (Math.abs(centerVec[0]) < minDist || Math.abs(centerVec[1]) < minDist) {
				return;
			}

			//generate a scaling factor to shift all points by
			var xScale = this.xStretch ? (centerVec[0] / centerVecOld[0]) : 1;
			var yScale = this.yStretch ? (centerVec[1] / centerVecOld[1]) : 1;

			this.lastPos = pos;

			//if holding shift then the scale factors must be the same
			if (button_shift) {
				console.log('shifting');
				if (this.xStretch && this.yStretch) {
					var avg = (xScale + yScale) / 2;
					xScale = avg;
					yScale = avg;
				} else {
					if (this.xStretch) {
						yScale = xScale;
					} else {
						xScale = yScale;
					}
				}
			}

			//do the scaling
			if (xScale != 1) {
				this.selected.forEach(s => {
					s.curves.forEach(c => {
						c.forEach(p => {
							p[0] = linterp(this.center[0], p[0], xScale);
						});
					});
				});
			}
			if (yScale != 1) {
				this.selected.forEach(s => {
					s.curves.forEach(c => {
						c.forEach(p => {
							p[1] = linterp(this.center[1], p[1], yScale);
						});
					});
				});
			}
			
			//and of course update visuals
			this.redrawAll();
			this.createOverlay();
		}
	}

	mouseUp() {
		super.mouseUp();
		if (this.status == "stretching") {
			console.log('fixed');
			this.xStretch = false;
			this.yStretch = false;
			this.status = "up";
		}
	}
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
class ToolMove extends ToolSelects {
	constructor() {
		super();
		this.selectedPts = [];
		this.tol = 5;
		this.lastPos = [];
		this.selectedT = -1;
	}

	createOverlay() {
		super.createOverlay();
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
		var pos = cursorWorkspacePos();

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

		//select a new object
		var selectArr = selectAt(pos[0], pos[1]);
		if (selectArr.length > 0) {
			this.lastPos = pos;
			this.selected.push(selectArr[0]);

			//pick up selected object and remove it from its bins
			selectArr[1].binModify(selectArr[0], true);
			this.cdCoords = undefined;
			this.createOverlay();
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
		if (!cursor.down) {
			return;
		}

		var scaling = φGet(workspace_container, "scaling");
		var delta = [a.movementX / scaling, a.movementY / scaling];

		if (this.selected.length > 0 && this.cdCoords != undefined) {
			this.movePath_decision(delta);
			this.selected.redraw();
			this.updateOverlayTotal();
		}
	}

	deselect() {
		if (this.selected.length == 0) {
			return;
		}
		//add selected back to bins
		this.selected.forEach(s => {
			this.selectedLayer.binModify(s, false);
			s.calculateBoundingBox();
		});
		this.selected = [];
		this.selectedLayer = undefined;

		workspace_toolTemp.innerHTML = "";
	}

	mouseUp(a) {
		//re-quantize all points
		this.selected.redraw();
	}

	//selects the curve that aligns with the cursor
	select() {
		
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
		this.onlySeeSelected = false;
	}

	createCanvas() {
		//height is proportional to how zoomed in user is
		var s = φGet(workspace_container, 'scaling');
		//make sure scaling isn't too great
		s = +clamp(s, this.scaleBounds[0], this.scaleBounds[1]);

		var cPos = cursorWorkspacePos();
		var box = workspace_container.getBBox();
		//nonsense width adjusting
		var wAdd = 0;
		if (cPos[0] < box.x) {
			wAdd = box.x - cPos[0];
		} else if (cPos[0] > box.x + box.width) {
			wAdd = cPos[0] - (box.x + box.width);
		}
		var hAdd = 0;
		if (cPos[1] < box.y) {
			wAdd = box.y - cPos[1];
		} else if (cPos[1] > box.y + box.height) {
			wAdd = cPos[1] - (box.y + box.height);
		}

		console.log(`w: ${box.width + wAdd} h: ${box.height + hAdd}, s: ${s}`);

		this.canvasFrame = timeline.t;
		this.canvas = createCanvasFromFrame(timeline.t, (box.width + wAdd) * s, (box.height + hAdd) * s, s, this.detail, box.x, box.y, this.onlySeeSelected ? timeline.s : undefined);
		this.canvas.scaling = s;
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

		//make sure not to create an interval if there's one already going
		if (this.pickHandler != undefined) {
			return;
		}
		
		var self = this;
		//if the canvas isn't good, retry later
		this.pickHandler = window.setInterval(() => {
			if (self.canvas.isValid) {
				window.clearInterval(self.pickHandler);
				self.pickHandler = undefined;
				self.pickColor_final();
			}
		}, 1);
	}

	pickColor_final() {
		var xy = cursorWorkspacePos();
		//pick coordinates
		var canX = floor((xy[0] - this.canvas.startX) * this.canvas.scaling);
		var canY = floor((xy[1] - this.canvas.startY) * this.canvas.scaling);
		var pxDat = this.ctx.getImageData(canX, canY, 1, 1).data;
		setColorRGBA(...pxDat);

		if (debug_active) {
			//also put a red dot on the canvas
			this.ctx.fillStyle = "#F00";
			this.ctx.fillRect(canX, canY, 1, 1);
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
		this.tinyScale = 0.1;
		this.scaleBounds = [1, 1];
		this.onlySeeSelected = true;
		this.sizeLimit = 3200;
		this.forceFillCoordinates = undefined;
	}

	createCanvas() {
		//actually create two canvases - one small, for fast filling, and one large, for accurate filling
		super.createCanvas();
	}

	redDot(canX, canY) {
		this.ctx.fillStyle = "#F00";
		this.ctx.fillRect(canX, canY, 0.8, 0.8);
	}

	greenDot(canX, canY) {
		this.ctx.fillStyle = "#0F0";
		this.ctx.fillRect(canX, canY, 0.8, 0.8);
	}

	blueDot(canX, canY) {
		this.ctx.fillStyle = "#0FF";
		this.ctx.fillRect(canX, canY, 4, 4);
	}

	//floodfills the canvas starting at certain canvas coordinates
	floodFill(canX, canY, maxEdge) {
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
		this.blueDot(canX, canY);
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
		var xy = cursorWorkspacePos();
		this.fill(xy[0] - this.canvas.startX, xy[1] - this.canvas.startY);
	}

	fill(workX, workY) {
		console.log(cursorWorkspacePos(), workX, workY, this.canvas.scaling);
		this.canvas.willReadFrequently = true;
		var target = timeline.frameAt(timeline.t, timeline.s);
		var pxDat = this.ctx.getImageData(floor(workX * this.canvas.scaling), floor(workY * this.canvas.scaling), 1, 1).data;

		var edges = this.floodFill(floor(workX * this.canvas.scaling), floor(workY * this.canvas.scaling), 3200);

		if (edges.length == 0) {
			return;
		}
		//add offset coordinates
		edges.forEach(a => {
			a[0] += this.canvas.startX;
			a[1] += this.canvas.startY;
		});
		//transform edges into world coordinates
		edges = edges.map(p => [p[0] / this.canvas.scaling, p[1] / this.canvas.scaling]);
		var loops = curvesFromEdgePath(target, edges);
		loops = createFill(loops, color_fill);
		console.log(loops);
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

class ToolText {
	constructor() {
		this.startHTML = `<text x="0" y="0">
			<tspan dx="0" dy="1.2em">How doth the little crocodile</tspan>
			<tspan dx="0" dy="1.2em">Improve his shining tail,</tspan>
			<tspan dx="0" dy="1.2em">And pour the waters of the Nile</tspan>
			<tspan dx="0" dy="1.2em">On every golden scale!</tspan>
		</text>`;
		this.typebox = document.createElement("input");
		this.selected;
		this.first = true;
	}

	createTextbox() {
		var outer = φCreate("g");
		var cPos = cursorWorkspacePos();
		outer.innerHTML = this.startHTML;
		var inner = outer.children[0];
		var box = inner.getBBox();
		var x = quantizeNum(cPos[0] - box.width / 2);
		φSet(inner, {
			'x': x,
			'y': quantizeNum(cPos[1] - box.height / 2),
			'fill': color_fill
		});
		frame_addSpecial(timeline.frameAt(timeline.t, timeline.s), inner);
	}

	mouseDown(a) {
		if (this.first) {
			this.createTextbox();
			// this.first = false;
		}

		//if not overtop 
	}

	mouseMove(a) {

	}

	mouseUp(a) {

	}


}