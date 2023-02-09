







class Timeline {
	constructor() {

		this.l = {};
		this.fps = 24;
		this.layerIDs = [];
		this.names = {};
		this.layerDisplayTop = 0;
		this.onionBounds = [4, 4];
		this.onionActive = false;
		
		//t is the time in frames the timeline is at
		this.t = 0;
		//s is the layer selected
		this.s = 0;
		this.len = 1;
	}

	changeFrameTo(frame) {
		//make sure frame is valid
		if (frame < 0) {
			return false;
		}
		if (frame > this.len-1) {
			return false;
		}

		//move the playhead
		φSet(timeline_playhead, {'x': frame * (timeline_blockW + 1)});
		φSet(timeline_playbody, {'x': frame * (timeline_blockW + 1)});

		//first remove all things from the workspace
		this.makeInvisible();

		this.t = frame;

		this.makeVisible();
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
		for (var f=Math.min(this.onionBounds[0]+1, this.t); f>0; f--) {
			this.setPropertiesForTime(this.t - f, {
				'display': "inline-block", 
				'filter': "url(#onionPast)",
				'opacity': 0.8 * (1 - f / this.onionBounds[0])
			});
		}
		
		var maxF = Math.min(this.onionBounds[1]+1, this.len - 1 - this.t);
		
		//future onion
		for (var f=maxF-1; f>0; f--) {
			this.setPropertiesForTime(this.t + f, {
				'display': "inline-block", 
				'filter': "url(#onionFuture)",
				'opacity': 0.8 * (1 - f / this.onionBounds[1])
			});
		}
		//present
		this.setPropertiesForTime(this.t, {'display': "inline-block", 'filter': undefined, 'opacity': 1});
	}

	togglePlayback() {
		
	}
}