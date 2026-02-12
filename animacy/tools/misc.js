
//the different application modes, essentially









class ToolSelects {
	constructor() {
		this.selected = [];
		this.selectedLayers = [];
		this.downPos;
		this.lastPos;

		this.minRadius = quantizeTo;

		this.status = "up";

		this.hotkeys = hotkeys_delete;
	}

	createOverlay() {
		workspace_temporary.innerHTML = "";
		//highlight all selected objects
		this.selected.forEach(s => {
			var copy = s.cloneNode();
			φSet(copy, {
				"class": `select`
			});
			workspace_temporary.appendChild(copy);
		});
	}

	delete() {
		//delete selected objects
		var stype;
		if (this.selected.length > 0) {
			for (var s=0; s<this.selected.length; s++) {
				stype = this.selectedLayers[s].lines.contains(this.selected[s]);
				if (stype) {
					//path case
					frame_removePath(this.selectedLayers[s], this.selected[s]);
				} else {
					//object case
					frame_removeObject(this.selectedLayers[s], this.selected[s]);
				}
			}
			workspace_temporary.innerHTML = "";
			this.selected = [];
			this.selectedLayers = [];
		}
	}

	deselect() {
		workspace_temporary.innerHTML = "";
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

	escape() {
		this.deselect();
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

			if (!button_shift && !Array.from(workspace_temporary.children).includes(a.target)) {
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
		workspace_temporary.appendChild(φCreate("rect", {
			'class': `select`,
			'x': superBounds[0],
			'y': superBounds[1],
			'width': superBounds[2] - superBounds[0],
			'height': superBounds[3] - superBounds[1]
		}));
		corners.forEach(c => {
			workspace_temporary.appendChild(φCreate("circle", {
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
			this.rescale(xScale, yScale);
			
			//and of course update visuals
			this.redrawAll();
			this.createOverlay();
		}
	}

	rescale(xScale, yScale) {

		//splines
		if (xScale != 1) {
			this.selected.forEach(s => {
				if (s.curves) {
					this.rescaleSplineInd(s, 0);
				} else {
					this.rescaleTransformInd(s, 0);
				}
			});
		}
		if (yScale != 1) {
			this.selected.forEach(s => {
				if (s.curves) {
					this.rescaleSplineInd(s, 1);
				} else {
					this.rescaleTransformInd(s, 1);
				}
			});
		}
	}

	rescaleSplineInd(index) {
		s.curves.forEach(c => {
			c.forEach(p => {
				p[1] = linterp(this.center[index], p[index], yScale);
			});
		});
	}

	rescaleTransformInd(index) {
		s
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
					workspace_temporary.appendChild(φCreate("circle", {
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
					workspace_temporary.appendChild(φCreate("rect", {
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
			for (var e=1; e<workspace_temporary.children.length; e++) {
				if (φOver(workspace_temporary.children[e])) {
					this.cdCoords = [+φGet(workspace_temporary.children[e], "xC"), +φGet(workspace_temporary.children[e], "xD")];
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

		workspace_temporary.innerHTML = "";
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
		setColorRGBA("stroke", ...pxDat);

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