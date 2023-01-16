







class Timeline {
	constructor() {

		this.l = {};
		this.fps = 24;
		this.layerIDs = [];
		this.names = {};
		this.layerDisplayTop = 0;
		this.onionBounds = [0, 0];
		
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

	makeInvisible() {
		var counter = "";
		for (var f=this.layerIDs.length-1; f>-1; f--) {
			φSet(this.l[this.layerIDs[f]][this.t], {'display': 'none'});
			counter += this.l[this.layerIDs[f]][this.t].id + ", ";
		}
		console.log(`${counter} invisible`);
	}

	makeVisible() {
		var counter = "";
		for (var f=this.layerIDs.length-1; f>-1; f--) {
			φSet(this.l[this.layerIDs[f]][this.t], {'display': 'inline-block'});
			counter += this.l[this.layerIDs[f]][this.t].id + ", ";
		}
		console.log(`${counter} visible`);
	}

	togglePlayback() {
		
	}
}