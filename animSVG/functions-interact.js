/*
various functions that connect the user to the program, generally through api functions. 
This exists because often the inputs themselves need to be processed (a click could mean change color, but to what color?)
*/

//used because I can't pass in variable arguments to onclick functions
function keyframe_user(n) {
	switch (n) {
		case 1:
			makeKeyframe(timeline.s, timeline.t);
			break;
		case 2:
			makeKeyframe(timeline.s, timeline.t, timeline.l[timeline.layerIDs[timeline.s]][timeline.t])
			break;
		case 3:
			makeUnKeyframe(timeline.s, timeline.t);
			break;
	}
}