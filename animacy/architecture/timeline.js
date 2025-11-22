
class Timeline {
	constructor() {
		//depends on the document
		[this.blockW, this.blockH] = φGet(MASTER_frameBoxPath, ["width", "height"]);
		this.blockW = +this.blockW;
		this.blockH = +this.blockH;

		this.headHeight = 15;
		this.oldKeyPos = [0, 0];
		this.marginRight = 3;
		this.labelPer = 12;
		this.len = 0;

		this.l = {};
		this.fps = 24;
		this.layerIDs = [];
		this.names = {};
		this.layerDisplayTop = 0;
		this.onionBounds = [4, 4];
		this.onionActive = false;
		
		//s is the layer selected
		this.s = 0;
		//t is the time in frames the timeline is at
		this.t = 0;
		this.len = 1;
	}

	changeFrameTo(frame) {
		//make sure frame is valid
		if (frame < 0) {
			return false;
		}
		if (frame > this.len - 1) {
			return false;
		}

		//changing to the same frame doesn't stop the change from running, but it isn't a frame change 
		var refreshing = (frame == this.t);

		//move the playhead
		φSet(this.playhead, {'x': frame * (this.blockW + 1)});
		φSet(this.playbody, {'x': frame * (this.blockW + 1)});

		//first remove all things from the workspace
		this.makeInvisible();

		this.t = frame;

		this.makeVisible();
		//alert the tool
		if (!refreshing && toolCurrent.timeChange) {
			toolCurrent.timeChange();
		}
	}

	frameAt(time, layer) {
		return this.l[this.layerIDs[layer]][time];
	}

	setPropertiesForTime(t, propertyObj) {
		for (var f=this.layerIDs.length-1; f>-1; f--) {
			φSet(this.l[this.layerIDs[f]][t], propertyObj);
		}
	}

	makeInvisible() {
		var min = Math.max(this.t - (this.onionActive * this.onionBounds[0]), 0);
		var max = Math.min(this.t + (this.onionActive * this.onionBounds[1]), this.len-1);

		for (var f=min; f<=max; f++) {
			this.setPropertiesForTime(f, {'display': "none"});
		}
	}

	makeVisible() {
		//if no onion skin just do present and be done
		if (!this.onionActive) {
			this.setPropertiesForTime(this.t, {'display': "inline-block", 'filter': undefined, 'opacity': 1});
			return;
		}
		
		//past onion
		var maxF = Math.min(this.onionBounds[0]+1, this.t);
		for (var f=maxF; f>0; f--) {
			this.setPropertiesForTime(this.t - f, {
				'display': "inline-block", 
				'filter': "url(#onionPast)",
				'opacity': 0.8 * (1 - (f / maxF))
			});
		}
		
		maxF = Math.min(this.onionBounds[1]+1, this.len - 1 - this.t);
		//future onion
		for (var f=maxF; f>0; f--) {
			this.setPropertiesForTime(this.t + f, {
				'display': "inline-block", 
				'filter': "url(#onionFuture)",
				'opacity': 0.8 * (1 - f / maxF)
			});
		}
		//present
		this.setPropertiesForTime(this.t, {'display': "inline-block", 'filter': undefined, 'opacity': 1});
	}

	updateExtender() {
		//always set it to the end of the timeline, with the height of the number of layers
		φSet(this.extender, {
			'x': (this.blockW + 1) * (this.len + 0.5),
			'height': (this.blockH + 1) * this.layerIDs.length
		});
	}

	updatePlayheadPos() {
		var hoverPos = cursorTimelinePos();
		hoverPos = [Math.floor(hoverPos[0]), Math.floor(hoverPos[1])];
		
		//make sure hover pos is in bounds as well
		hoverPos[0] = clamp(hoverPos[0], 0, this.len-1);
		if (hoverPos[0] != this.t) {
			select(this.s, hoverPos[0]);
		}
	}

	/**
	 * Selects a specified frame and layer
	 * @param {Integer} layer The index of the layer being selected
	 * @param {Integer} frame The frame being selected
	 */
	select(layer, frame) {
		//change the timeline selector while staying in-bounds
		this.s = clamp(layer, 0, this.layerIDs.length-1);
		console.log("changing frame to ", frame);
		this.changeFrameTo(frame);

		//update layer/frame variables so I can use them
		layer = this.s;
		frame = this.t;
		φSet(this, {
			'x': frame * (this.blockW + 1),
			'y': this.headHeight + layer * (this.blockH + 1)
		});
		φSet(this.onionhead, {
			'x': frame * (this.blockW + 1)
		});
		setOnionWingLengths();
	}
}

/**
 * Loads a timeline into the workspace.
 * @param {Timeline} tmln the timeline object to load
 */
function loadTimeline(tmln) {
	timeline = tmln;
}




//resizes timeline to the specified width and height
function resizeTimeline(w, h) {
	var spaceH = φGet(base, "height");
	var invH = spaceH - h;

	if (w == undefined || h == undefined) {
		var oldDims = φGet(timeline.background, ["width", "height"]);
		w = w ?? oldDims[0];
		h = h ?? oldDims[1];
	}
	w = +w;
	h = +h;

	//these two lines aren't confusing at all I'm sure
	φSet(timeline.container, {
		'hinv': h,
		'y': invH
	});
	φSet(timeline.background, {
		'width': w,
		'height': h,
	});
	φSet(timeline.edge_detector, {
		'width': w,
	});
	φSet(timeline.playhead, {
		'height': h
	});
}