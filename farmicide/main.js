window.onload = setup;
window.onkeydown = handleKeyPress;
window.onkeyup = handleKeyRelease;


var animation;

var canvas;
var ctx;



var game_state = "menu";
var game_board = [];


function setup() {
	canvas = document.getElementById("convos");
	ctx = canvas.getContext("2d");

	player = new Player(17.55, 35.65);
	audio_bgChannel.target = data_audio["outside"];

	handleResize();
	localStorage_read();


	game_mainLoop = main;
	animation = window.requestAnimationFrame(main);
}

function main() {
	switch (game_state) {
		case "menu":
			break;
		case "game":
			break;
		case "gameover":
			break;
	}



	animation = window.requestAnimationFrame(main);
}

function handleKeyPress(a) {

}

function handleKeyRelease(a) {
	
}






function initializeGameBoard() {
	
}