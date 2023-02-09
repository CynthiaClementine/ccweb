
//the different application modes, essentially


//abstract class for tools where the user inputs by clicking and then dragging
class ToolDragShape {
	constructor() {
		this.shape = undefined;
		this.downPos = [];
		this.r = 8;
		this.type = "undefined";
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
		frame_addPath(layerObj, this.givePathsFor(x, y, w, h), this.r / 2, color_selected);

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
		this.bufferStart = [];
		
		this.r = 8;

		this.cDataLast = undefined;
		this.cData = undefined;

		this.cdDelta = 0;
		this.caDelta = 0;
		this.cdTolerance = 40;
		this.caTolerance = Math.PI / 10;

		this.fitTolerance = 1;
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
		frame_addPath(layerObj, curves, this.r, color_selected);
	}

	/*
	//moves things from bufferPoints to bezier curves on the canvas
	pushToWorkspace_acceleration(toleranceOPTIONAL) {
		// var curves = fitBezier(this.bufferPoints, toleranceOPTIONAL ?? this.fitTolerance);
		// var curves;
		// curves = fitBezier(this.bufferPoints, toleranceOPTIONAL ?? this.fitTolerance);
		// if (this.bufferPoints.length < 3) {
		// } else {
		// 	// curves = smooth(this.bufferPoints, 'continuous');
		// }

		var cubics = [];
		//ok here's the dealio 
		//cubics have a linear acceleration - so keep track of the acceleration, then split into chunks
		//for notation: A - acceleration, linA - linearized acceleration
		//to get positions, 

		//1. start with list of A
		//2. get linA data
		var A = this.bufferAccs;
		var linATimings = [];
		var linA = simplifyLineRDPandTime(A, this.fitTolerance, linATimings);

		//3. time linA correctly
		//(the first linA marker will always be on the first frame)
		var nowTime = 0;
		for (var b=1; b<linA.length; b++) {
			nowTime = linATimings[b] = linA.indexOf(linA[b], nowTime + 1);
		}

		//4. make linA have same area as A
		for (var b=0; b<linA.length-1; b++) {
			var timeDelta = linATimings[b+1] - linATimings[b];
			if (timeDelta == 0) {
				console.error(`timeDelta is 0 somehow!!!!`);
			}
			var xArea = 0;
			var yArea = 0;
			//add up all values of A from start to end to get original area
			for (var t=linATimings[b]; t<linATimings[b+1]; t++) {
				xArea += A[t][0];
				yArea += A[t][1];
			}
			//pinning the start linA to its initial value, and allowing the final linA to move creates a trapezoid
			//solving for the change in height of this trapezoid based on the target area yields this equation (y = 2 * area /time - initialA)

			var finalAX = 2 * (xArea / timeDelta) - linA[b][0];
			var finalAY = 2 * (yArea / timeDelta) - linA[b][1];

			linA[b] = [linA[b], [finalAX, finalAY]];
		}

		//5. generate cubics from linA
		var cubicFactory = (a, b, c, d) => {
			return function(t) {
				return a * t*t*t + b * t*t + c * t + d;
			};
		}
		//set up variables for converting to control points from equation
		var cbEqX, cbEqY;
		var cb = [];
		//time is the frame time of the current segement, t1 and t2 are times on the cubic 
		var time;
		var t1 = 0.3,
		t2 = 0.6;
		var t1xx3 = t1 * t1 * t1,
		t2xx3 = t2 * t2 * t2;
		//these correspond to the weight given to each control point as t changes (P0 * p, C0 * q, C1 * r, P1 * s)
		var p1 = (-t1xx3 + 3*t1*t1 - 3*t1 + 1), 
		q1 = 3*(t1xx3 - 2*t1*t1 + t1), 
		r1 = 3*(-t1xx3 + t1*t1), 
		s1 = t1xx3, 
		p2 = (-t2xx3 + 3*t2*t2 - 3*t2 + 1), 
		q2 = 3*(t2xx3 - 2*t2*t2 + t2), 
		r2 = 3*(-t2xx3 + t2*t2), 
		s2 = t2xx3;

		//what we'll do is generate the cubic equation (abcd) from the acceleration (second derivative), and then use the equation to generate the points (P0, C0, C1, P1)
		for (var b=0; b<linA.length-1; b++) {
			//run this for both x and y
			time = linATimings[b];
			cbEqX = cubicFactory((linA[b][1][0] - linA[b][0][0]) / 6, linA[b][0][0] / 2, this.bufferVels[time][0], this.bufferPoints[time][0]);
			cbEqY = cubicFactory((linA[b][1][1] - linA[b][0][1]) / 6, linA[b][0][1] / 2, this.bufferVels[time][1], this.bufferPoints[time][1]);

			//P0 and P1 are just on the equation already
			cb[0] = [cbEqX(0), cbEqY(0)];
			cb[3] = [cbEqX(1), cbEqY(1)];

			//for C0 and C1 there's a few shenanigans afoot. this solves the system of equations where
			//	P0p1 + C0q1 + C1r1 + P1s1 = cubEq(t1) and P0p2 + C0q2 + C1r2 + P1s2 = cubEq(t2)
			cb[2] = [
				(cb[0][0]*p2 + cb[3][0]*s2 - cbEqX(t2) + (q2 / q1)*(cbEqX(t1) - cb[0][0]*p1 - cb[3][0]*s1)) / ((q2 / q1) * r1 - r2),
				(cb[0][1]*p2 + cb[3][1]*s2 - cbEqY(t2) + (q2 / q1)*(cbEqY(t1) - cb[0][1]*p1 - cb[3][1]*s1)) / ((q2 / q1) * r1 - r2)
			];

			cb[1] = [
				(cbEqX(t1) - cb[0][0]*p1 - cb[2][0]*r1 - cb[3][0]*s1) / q1,
				(cbEqY(t1) - cb[0][1]*p1 - cb[2][1]*r1 - cb[3][1]*s1) / q1,
			];

			//push out the final cubic to the array
			cubics.push(cb);
			cb = [];
		}


		//put cubics on the timeline
		var tln = timeline;
		var layerObj = tln.l[tln.layerIDs[tln.layerSelected]][tln.t];
		cubics.forEach(c => {
			layerObj.addPath(c);
		});
	} */
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
	}

	drawOverlay() {}

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