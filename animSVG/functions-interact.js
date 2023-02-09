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
		case "":
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