function drawTimeline() {
	//main body + edge
	ctx.fillStyle = colors_menu.bg;
	ctx.fillRect(0, canvas.height * (1 - timeline_height), canvas.width, canvas.height * timeline_height);
	ctx.fillStyle = colors_menu.line;
	ctx.fillRect(0, canvas.height * (1 - timeline_height), canvas.width, ctx.lineWidth);

	//layers

	var unitHeight = 20;
	var unitWidth = 10;
	var xPos = canvas.width * 0.1;
	var yPos;
	ctx.font = `20px Ubuntu`;
	ctx.textAlign = "right";
	for (var l=0; l<timeline_layers.length; l++) {
		yPos = canvas.height * (1.01 - timeline_height) + unitHeight * l;
		//title text
		ctx.fillStyle = colors_menu.text;
		ctx.fillText(timeline_layers[l], xPos - unitWidth, yPos + ( unitHeight / 2));

		//actual timeline
		ctx.fillRect(xPos, yPos, unitWidth * timeline[timeline_layers[l]].length, unitHeight);
	}
}