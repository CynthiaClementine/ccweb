/*
various functions that connect the user to the program, generally through api functions. 
This exists because often the inputs themselves need to be processed (a click could mean change color, but to what color?)
*/

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
		case "Eyedropper":
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