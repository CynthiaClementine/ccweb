
window.onmousedown = handleMouseDown;
window.onmousemove = handleMouseMove;
window.onmouseup = handleMouseUp;

/*
Simple functions for handling mouse movement. 
I put these here because I realized I had the same code in basically every project,
so although the function extension is a little awkward, it'll save time overall.

The custom functions here are to add your own code, as most of the time you'll want to do things other than just update the position and status of the cursor object

INDEX
handleMouseDown(a);
handleMouseDown_custom()
handleMouseMove(a);
handleMouseMove_custom()
handleMouseUp(a);
handleMouseUp_custom()

updateCursorPos(a);
*/

var cursor = {
	down: false,
	x: 0,
	y: 0,
}

function handleMouseDown(a) {
	cursor.down = true;
	handleMouseDown_custom();
}

function handleMouseDown_custom() {}

function handleMouseMove(a) {
	try {
		updateCursorPos(a);
	} catch(error) {
		console.log(`can't update cursor position!`);
	}
	handleMouseMove_custom();
}

function handleMouseMove_custom() {}

function handleMouseUp(a) {
	cursor.down = false;
	handleMouseUp_custom();
}

function handleMouseUp_custom() {}

function updateCursorPos(a) {
	var canvasArea = canvas.getBoundingClientRect();
	cursor.x = a.clientX - canvasArea.left;
	cursor.y = a.clientY - canvasArea.top;
}