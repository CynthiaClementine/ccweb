
//the different application modes, essentially
class Pen {
	constructor() {
		this.bufferCurve = [];
	}

	drawOverlay() {
		//loop through all layers
		//draw points + control points
		
	}

	mouseDown(a) {

	}

	mouseMove(a) {

	}

	mouseUp(a) {

	}
}

class Pencil {
	constructor() {
		this.bufferPoints = [];
		this.cDist = 0;
		this.cAngle = 0;
		this.cdTolerance = 40;
		this.caTolerance = Math.PI / 10;
		this.fitTolerance = 5;
	}

	drawOverlay() {
		ctx.fillStyle = color_line;
		this.bufferPoints.forEach(p => {
			drawPoint(...workspaceToCanvas(...p), ctx.lineWidth);
		});
	}

	mouseDown(a) {
		this.bufferPoints = [];
		//start the line
		this.bufferPoints.push(canvasToWorkspace(cursor.x, cursor.y));
	}

	
	mouseMove(a) {
		if (cursor.down) {
			//if the cursor is too far away or the direction has changed too much, append
			if (cursor.dist > cursor.dTolerance || modularDifference(cursor.a, lastPInfo.a, Math.PI * 2) > this.caTolerance) {
				this.bufferPoints.push(canvasToWorkspace(cursor.x, cursor.y));
				this.cDist = 0;
				this.cAngle;
			}
		}
	}
	
	mouseUp(a) {
		//append the point
		this.bufferPoints.push(canvasToWorkspace(cursor.x, cursor.y));
		
		//turn the point into a set of lines
		this.bufferPoints = simplifyLineDuplicates(this.bufferPoints); // simplifyLineRDP(this.bufferPoints, 5);
		if (this.bufferPoints.length > 1) {
			this.pushToWorkspace();
		}
		this.bufferPoints = [];
		
	}

	//moves things from bufferPoints to bezier curves on the canvas
	pushToWorkspace(toleranceOPTIONAL) {
		var curves = fitBezier(this.bufferPoints, toleranceOPTIONAL ?? this.fitTolerance);
		curves.forEach(c => {
			timeline.l["Layer 1"][timeline.t].lines.push(c);
		});
	}
}

class Shape {
	constructor() {
		this.sides = 3;
		this.sidesMin = 3;
	}

	drawOverlay() {}

	mouseDown(a) {
		//start
	}

	mouseMove(a) {}

	mouseUp(a) {}
}

class Fill {
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

class Move {
	constructor() {
		this.selected = undefined;
		this.tol = 5;

		this.bufferStore = [0, 0];
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