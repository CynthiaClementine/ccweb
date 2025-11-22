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