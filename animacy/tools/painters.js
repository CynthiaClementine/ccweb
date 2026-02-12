class ToolPen {
	constructor() {
		this.bufferCurve = [];
		this.currPos = [];
	}

	mouseDown(a) {

	}

	mouseMove(a) {
		this.currPos = cursorWorkspacePos();
		if (cursor.down) {
			//move the handle
		}
	}

	mouseUp(a) {

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
		workspace_temporary.innerHTML = "";
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
		workspace_temporary.appendChild(φCreate('circle', {
			'cx': coords[0],
			'cy': coords[1],
			'r': data_persistent.brushSize / 2,
			'fill': color_stroke,
		}));
	}

	mouseDown(a) {
		workspace_temporary.innerHTML = "";
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