/*
various functions that connect the user to the program, generally through api functions. 
This exists because often the inputs themselves need to be processed (a click could mean change color, but to what color?)
*/



//sets the length of the animation (in frames) to a specified value
function user_changeAnimLength() {
	//ask the user
	//temp way, there's a better way to do this
	var newLength = prompt(`Please set the new timeline length`, timeline.len);
		
	newLength = +newLength ?? timeline.len;
	if (Number.isNaN(newLength) || newLength < 1) {
		alert(`Bad length value recieved.`);
		return;
	}


	newLength = Math.floor(newLength);
	changeAnimationLength(newLength);
}

function selectColor(colorNode) {
	φSet(color_selectedNode, {"stroke": "var(--uilines)"});
	φSet(colorNode, {"stroke": "var(--colorSelect)"});
	color_selectedNode = colorNode;
	var newColor = φGet(colorNode, "fill").split(" ");
	setColorRGBA(+(newColor[0].slice(5, -1)), +(newColor[1].slice(0, -1)), +(newColor[2].slice(0, -1)), +(newColor[3].slice(0, -1)));
}

function user_changeFPS() {
	var newFPS = parseInt(prompt(`Enter new animation frames per second`, timeline.fps));
	if (Number.isNaN(newFPS)) {
		return;
	}

	//if the framerate is out of bounds
	if (newFPS < fps_limitMin || newFPS > fps_limitMax) {
		if (newFPS < fps_limitMin) {
			alert(`This framerate is too low. The framerate must be at least ${fps_limitMin} and no more than ${fps_limitMax}.`);
		} else {
			alert(`This framerate is too high. The framerate must be at least ${fps_limitMin} and no more than ${fps_limitMax}.`);
		}
		newFPS = clamp(newFPS, fps_limitMin, fps_limitMax);
	}

	//actually changing the framerate
	changeFramerate(newFPS);
}



//used because I can't pass in variable arguments to onclick functions
function user_keyframe(n) {
	var m = timeline;
	var iden = m.layerIDs[m.s];
	var frameIsKey = m.l[iden][m.t] != m.l[iden][m.t - 1];

	//delete keyframe
	if (n == 3) {
		if (frameIsKey) {
			makeUnKeyframe(m.s, m.t);
		}
		m.changeFrameTo(m.t);
		return;
	}

	//create keyframe
	//don't create a keyframe on the same frame as a non-keyframe
	var tStorage = m.t;
	while (frameIsKey) {
		m.t += 1;
		frameIsKey = timeline.l[iden][m.t] != timeline.l[iden][m.t - 1];
	}
	//only count if not off the end of the timeline
	if (m.t < m.len) {
		var node;
		if (n == 2) {
			node = m.l[iden][m.t];
		}
		makeKeyframe(timeline.s, timeline.t, node);
	} else {
		//if off the end, ignore and revert changes
		m.t = tStorage;
	}
		
	//update what's visible by changing timeline to the same frame
	m.changeFrameTo(m.t);
}

function changeToolTo(toolName) {
	var pressColor = "#777777";
	//first make sure all icons are unpressed
	var icons = document.getElementsByClassName("toolIcon");
	for (var i=0; i<icons.length; i++) {
		φSet(icons[i].children[0], {"fill": "transparent"});
	}

	switch(toolName) {
		case "Pencil":
			toolCurrent = new ToolPencil();
			φSet(tool_pencil.children[0], {"fill": pressColor});
			break;
		case "Rectangle":
			toolCurrent = new ToolRectangle();
			φSet(tool_rect.children[0], {"fill": pressColor});
			break;
		case "Circle":
			toolCurrent = new ToolCircle();
			φSet(tool_circle.children[0], {"fill": pressColor});
			break;
		case "Move":
			toolCurrent = new ToolMove();
			φSet(tool_move.children[0], {"fill": pressColor});
			break;
		case "Eyedrop":
			toolCurrent = new ToolEyedrop();
			φSet(tool_eyedrop.children[0], {"fill": pressColor});
			break;
		case "":
			break;
		case "":
			break;
		case "":
			break;
		case "":
			break;
	}
}