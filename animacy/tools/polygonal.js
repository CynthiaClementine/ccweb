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