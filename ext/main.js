window.onload = setup;
window.onresize = handleResize;
window.onkeydown = handleKeyDown;
window.onkeyup = handleKeyUp;

var animation;
var animation_fps;

var audio_bgChannel = new AudioChannel(0.5);
var audio_sfxChannel = new AudioContainer(0.5);
var audio_fadeTime = 40;

var base64 = `0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+=`;
var base64_inv = invertList(base64);

var bg_canvas;
var btx;
var bg_chunkW = 80;
var bg_chunkH = 75;
var bg_tw = 60;
var bg_chunkStart = [-1, -1];
//this array is laid out so that y goes down visually, and x goes across visually
var bgg = function(id) {
	return getImage(`img/ter${id}.png`, true);
}
var bg_chunkArr = [
	[undefined, undefined, undefined, undefined],
	[undefined, bgg(`r00`), bgg(`r10`), bgg(`r20`)],
	[undefined, bgg(`r01`), bgg(`r11`), bgg(`r21`)],
	[undefined, bgg(`r02`), undefined, undefined],
];

var button_acceptingInput = undefined;
var button_acceptingOutput = undefined;
var button_queue = [];
var button_alt = false;
var button_shift = false;
var button_conversions = {
	'ShiftLeft': 'Shift',
	'ShiftRight': 'Shift',
	'KeyW': 'Up',
	'ArrowUp': 'Up',
	'KeyA': 'Left',
	'ArrowLeft': 'Left',
	'KeyS': 'Down',
	'ArrowDown': 'Down',
	'KeyD': 'Right',
	'ArrowRight': 'Right',
	'Space': 'Magic',
	'KeyX': 'Magic',

	'KeyZ': 'Interact',
	'Enter': 'Interact'
};
var camera = new Camera(0, 0, 40);
var camera_xStops = [4, 16, 32, 80];

var collision_binSize = 10;
var collision_bins = [[]];

var cursor = {
	x: 0,
	y: 0,
	down: false,
	pastPoint: [0, 0]
};


var color_bg = "#000000";
var color_castleEntities = "#888888";
var color_collision = "#fb055f";
var color_dreamSkater = "#0A7664";
var color_health = "#87097C";
var color_magic = "#9966FF";
var color_textBackground = "#04061D";
var color_textDefault = "#FFFFFF";
var color_editorBg = "#222222";
var color_editorGrid = "#222222";
var color_editorHighlight = "#FF00FF";
var color_editorHighlight2 = "#FF8800";
var color_editorHighlight3 = "#000000";
var color_editorPanelLight = "#414446";
var color_editorPolygon = "#FFFF00";
var color_menuPrimary = "#FEFF99";
var color_menuSecondary = "#DBD9AB";
var color_menuText = "#4B4C54";


//music is the actual data
//bpm is beats per minute
//activeBeats is how many beats are in the loop (generally expressed in measures * beats per measure)
//inactive beats is for if the loop starts part of the way through the song (the inactive beats are not looped)
/*
"audio name": {
	music: [Audio class data],
	bpm: [number]
	activeBeats: [number]
	?inactiveBeats: [number]
	?loop: boolean - tells whether to loop the music. If not included, is by default true
}
*/
var data_audio = {
	"overworldLeafy": {
		music: new Audio(`aud/largeLeafCanyon.mp3`),
		bpm: 100,
		activeBeats: 24 * 8
	},
	"overworldBismuth": {
		music: new Audio(`aud/bismuthGardens.mp3`),
		bpm: 100,
		activeBeats: 30 * 6,
		inactiveBeats: 4 * 6
	},
	"darkMerchants-1": {
		music: new Audio(`aud/darkMerchants1.mp3`),
		bpm: 130,
		activeBeats: 4 * 8,
		sub: `dark merchant music`
	},
	"darkMerchants-2": {
		music: new Audio(`aud/darkMerchants2.mp3`),
		bpm: 130,
		activeBeats: 4 * 8,
		sub: `better dark merchant music`
	},
	"none": {
		music: undefined,
		activeBeats: 12 * 12
	},
	
	//sfx
	"fxChoco": new Audio(`audFx/chocolate.mp3`),
	"fxContact": new Audio(`audFx/contactDamage.mp3`),
	"fxOcohc": new Audio(`audFx/chocolateInverse.mp3`),
	"fxOrbL": new Audio(`audFx/largeOrb.mp3`),
	"fxOrbS": new Audio(`audFx/smallOrb.mp3`),
	"fxMiss": new Audio(`audFx/whiff.mp3`),
	"fxHit": new Audio(`audFx/enemyHit.mp3`),
	"fxBeHit": new Audio(`audFx/playerHit.mp3`),
	"fxShatter": new Audio(`audFx/shatter.mp3`),

	"fxStep0": new Audio(`audFx/stepGrass.mp3`),
	"fxStep2": new Audio(`audFx/stepSoftStone.mp3`),
	"fxStep3": new Audio(`audFx/stepSand.mp3`),
	"fxStep4": new Audio(`audFx/stepWood.mp3`),
	"fxStep5": new Audio(`audFx/stepCarpet.mp3`),
	"fxStep6": new Audio(`audFx/stepStone.mp3`),
	"fxStep7": new Audio(`audFx/stepSnow.mp3`),

	//commentaries
	//TODO: record audio for these
	"commStart": {
		// aud:
		sub: `Hi! Welcome to the developer commentary section!
		I wanted to put something like this in my game, because I think there are some interesting bits to how this game works, and how it changed over time, 
		and I don't necessarily want that information to be lost to time, or to just be locked in my brain. 
		Any time I have something I considered interesting to say about the game creation process, I've placed a bubble like this one around the world, and interacting with it will play an audio file.
		There are also subtitles available in the settings.
		If you're reading this, you already knew that. (:`
	},
	"commStart2": {
		// aud: 
		sub: `One of the big obvious limitations I had to work around was the screen scaling. I built this game off of the engine that ran monarch, and monarch had a 16 tile wide screen, so this game had that as well. 
		However, the most common problem I saw people run into when they played monarch was that the camera was too zoomed in - they would get lost, or they would cover areas more than once, 
		because there weren't enough details on-screen to register where they were. 
		This was a pretty big problem, especially because I knew this would be a larger game. So I started with making the terrain more dense.
		
		I knew the player wouldn't be able to see things that far off the screen, so I made it impossible to go downwards, and put the town directly above the player.
		Theoretically, this would mean they would be sure to end up there.
		The second thing I did was to mostly decouple the tiles from the actual terrain. While this game still uses tiles for coordinate tracking, there can be multiple walls or even entities per tile.
		That, combined with more detailed art, helped a little (I hope)`
	},
	"commLayers": {
		// aud: 
		sub: `The world of ext is, for the most part, completely euclidian. The map is one rectangular grid. But it really helps to have at least a bit of an escape from that,
		especially when I'm already trying to fit more space into less space. So the layering system was born. I didn't want to go full 3d, but I did want a little depth, so the world has 3 layers stacked on each other.
		Each layer corresponds to a primary color, going r » g » b in ascending order, and the player will switch between those layers when necessary. Most things in the main world are on the red layer, but the bosses and this training ring are on the green layer.
		The blue layer also gets a few things, although it's used less, because if I had the space, I could just use the green layer.
		Although the green layer is on top of the red layer, it can still be used as a "below" layer, because it basically looks the same. `
	}
};

/*
alias - should images be aliased
x - player x storage
y - player y storage
music - music storage

data gets saved every few seconds as long as the player isn't in a conversation or fighting. This is to prevent weird music chicanery from happening 
(as well as potential skips where player loads into a cutscene area they shouldn't)
*/
var data_persistent = {
	class: "warrior",
	chocos: [0,0,0],
	ends: 0,

	alias: false,
	vols: [0.5,0.5],
	x: 0,
	y: 0,
	music: 'none'
};
var data_persistentDefaults = JSON.parse(JSON.stringify(data_persistent));

var data_terrain = {
	'w':[[[70.5,83.5],[70.3,80.9]],[[71.1,85.8],[70.5,83.5]],[[70.9,87.3],[71.1,85.8]],[[69.8,90.6],[70.9,87.3]],[[70.4,92.5],[69.8,90.6]],[[70.7,95.9],[70.4,92.5]],[[70.5,98.3],[70.7,95.9]],[[69.7,100.1],[70.5,98.3]],[[69.4,110.6],[69.7,100.1]],[[68.6,112.6],[69.4,110.6]],[[68.5,116.8],[68.6,112.6]],[[68,119.4],[68.5,116.8]],[[68.4,122.8],[68,119.4]],[[68.4,125.7],[68.4,122.8]],[[67.2,129.7],[68.4,125.7]],[[67.1,131.6],[67.2,129.7]],[[66.1,135.2],[67.1,131.6]],[[65.9,136.9],[66.1,135.2]],[[67.4,141.2],[65.9,136.9]],[[66.8,142.9],[67.4,141.2]],[[66.8,146],[66.8,142.9]],[[66.2,148.4],[66.8,146]],[[66.3,150.8],[66.2,148.4]],[[65,154],[66.3,150.8]],[[64.3,154.5],[65,154]],[[64.6,161.1],[64.3,154.5]],[[65.7,161.2],[64.6,161.1]],[[67.5,162.4],[65.7,161.2]],[[66.7,164.9],[67.5,162.4]],[[66.3,167.9],[66.7,164.9]],[[64.6,172.9],[66.3,167.9]],[[64.1,178.8],[64.6,172.9]],[[64,183.3],[64.1,178.8]],[[66.1,180.7],[64,183.3]],[[66.1,187.4],[66.1,180.7]],[[65.6,192.1],[66.1,187.4]],[[66.5,192],[65.6,192.1]],[[66.5,196.7],[66.5,192]],[[65.3,197.3],[66.5,196.7]],[[62.9,200.5],[65.3,197.3]],[[62.1,204.7],[62.9,200.5]],[[61.9,208.8],[62.1,204.7]],[[60.4,210.9],[61.9,208.8]],[[58.9,211],[60.4,210.9]],[[57.2,209.3],[58.9,211]],[[54.9,208],[57.2,209.3]],[[53.2,208.1],[54.9,208]],[[50.5,210.8],[53.2,208.1]],[[47.8,212.3],[50.5,210.8]],[[45.1,211.9],[47.8,212.3]],[[43.2,210],[45.1,211.9]],[[42.7,208.2],[43.2,210]],[[43.5,206.6],[42.7,208.2]],[[46.2,204.3],[43.5,206.6]],[[48.4,200.7],[46.2,204.3]],[[49.9,199.6],[48.4,200.7]],[[51.1,200.6],[49.9,199.6]],[[53.3,205.5],[51.1,200.6]],[[54.6,205.7],[53.3,205.5]],[[55.8,204.4],[54.6,205.7]],[[57.1,201.2],[55.8,204.4]],[[56.4,197.6],[57.1,201.2]],[[54.3,196.2],[56.4,197.6]],[[51.7,196.1],[54.3,196.2]],[[49.4,196.5],[51.7,196.1]],[[46.5,195.8],[49.4,196.5]],[[42.3,193.5],[46.5,195.8]],[[39.1,192.8],[42.3,193.5]],[[36.1,194.3],[39.1,192.8]],[[34.4,197.2],[36.1,194.3]],[[33.4,201.3],[34.4,197.2]],[[34,204.5],[33.4,201.3]],[[37.5,210.1],[34,204.5]],[[38.5,214.8],[37.5,210.1]],[[37.8,219],[38.5,214.8]],[[36.1,221.5],[37.8,219]],[[33.9,222.2],[36.1,221.5]],[[32.7,221.6],[33.9,222.2]],[[30,219],[32.7,221.6]],[[27.3,217.6],[30,219]],[[24.4,217.5],[27.3,217.6]],[[22.8,219.8],[24.4,217.5]],[[20.3,221.7],[22.8,219.8]],[[16.2,222.4],[20.3,221.7]],[[12.2,221.8],[16.2,222.4]],[[8,219.8],[12.2,221.8]],[[5.6,216.8],[8,219.8]],[[4.6,213.3],[5.6,216.8]],[[4.9,208.6],[4.6,213.3]],[[6.8,205],[4.9,208.6]],[[9.4,203.3],[6.8,205]],[[14.7,202],[9.4,203.3]],[[17.1,200.3],[14.7,202]],[[18.8,197.4],[17.1,200.3]],[[19.2,194.1],[18.8,197.4]],[[18.3,191.6],[19.2,194.1]],[[16.2,190],[18.3,191.6]],[[13.5,189.7],[16.2,190]],[[4.9,190.6],[13.5,189.7]],[[2.8,189.3],[4.9,190.6]],[[2.5,187.7],[2.8,189.3]],[[4.1,184.1],[2.5,187.7]],[[5.9,175.7],[4.1,184.1]],[[6.4,166.9],[5.9,175.7]],[[5.4,161.5],[6.4,166.9]],[[6.1,157.5],[5.4,161.5]],[[6,150.1],[6.1,157.5]],[[5.3,132.9],[6,150.1]],[[4,128.5],[5.3,132.9]],[[2.3,116.2],[4,128.5]],[[1.7,100],[2.3,116.2]],[[2,80.9],[1.7,100]],[[22.3,205.5],[19.4,200.4]],[[22.9,209.8],[22.3,205.5]],[[23.9,213.8],[22.9,209.8]],[[25.2,215.1],[23.9,213.8]],[[26.4,214.2],[25.2,215.1]],[[27.4,209.1],[26.4,214.2]],[[29.2,205.4],[27.4,209.1]],[[30.5,204.2],[29.2,205.4]],[[31.9,201.5],[30.5,204.2]],[[31.8,199.4],[31.9,201.5]],[[29.9,195.7],[31.8,199.4]],[[28.2,193.8],[29.9,195.7]],[[27.4,193.7],[28.2,193.8]],[[27,193.3],[27.4,193.7]],[[25.3,193.4],[27,193.3]],[[23.5,195],[25.3,193.4]],[[22.3,195.6],[23.5,195]],[[21.1,196],[22.3,195.6]],[[19.4,200.4],[19.6,197.9]],[[19.6,197.9],[21.1,196]],[[29.1,185.8],[30.2,183.4]],[[29.2,187.8],[29.1,185.8]],[[29.9,188.2],[29.2,187.8]],[[31.4,187.3],[29.9,188.2]],[[32.6,187.1],[31.4,187.3]],[[36.2,184.3],[32.6,187.1]],[[35.9,181.6],[36.2,184.3]],[[33.6,180.7],[35.9,181.6]],[[31.8,181.2],[33.6,180.7]],[[30.2,183.4],[31.8,181.2]],[[43.6,180.4],[48.6,176.8]],[[42.6,181.5],[43.6,180.4]],[[42.7,183.1],[42.6,181.5]],[[46.1,188.1],[42.7,183.1]],[[47.7,189.3],[46.1,188.1]],[[50,189.1],[47.7,189.3]],[[56.4,181.7],[50,189.1]],[[56.8,180.5],[56.4,181.7]],[[55.9,178.8],[56.8,180.5]],[[52.5,176.7],[55.9,178.8]],[[48.6,176.8],[50.2,176.4]],[[50.2,176.4],[52.5,176.7]],[[5.9,132.2],[6.7,131.9]],[[5.9,133.9],[5.9,132.2]],[[6.4,134.7],[5.9,133.9]],[[6.6,135.1],[6.4,134.7]],[[6.9,135],[6.6,135.1]],[[7.1,133.9],[6.9,135]],[[7.1,132.6],[7.1,133.9]],[[6.7,131.9],[7.1,132.6]],[[7.2,160.8],[8,160.6]],[[6.9,162],[7.2,160.8]],[[7.3,164.5],[6.9,162]],[[8.1,165.1],[7.3,164.5]],[[8.9,164.3],[8.1,165.1]],[[9.1,162.5],[8.9,164.3]],[[8.6,161],[9.1,162.5]],[[8,160.6],[8.6,161]],[[17.7,173.5],[19.7,173]],[[15.6,175.1],[17.7,173.5]],[[15.1,177.5],[15.6,175.1]],[[15.6,179.2],[15.1,177.5]],[[16.9,179.9],[15.6,179.2]],[[18.6,181],[16.9,179.9]],[[20,181.1],[18.6,181]],[[23.4,179.5],[20,181.1]],[[25,178.9],[23.4,179.5]],[[25.9,177.8],[25,178.9]],[[26.1,175.8],[25.9,177.8]],[[25.2,173.9],[26.1,175.8]],[[23.5,173.3],[25.2,173.9]],[[21.5,173.7],[23.5,173.3]],[[19.7,173],[21.5,173.7]],[[36.3,164.7],[36.9,164.5]],[[35,166.7],[36.3,164.7]],[[35,168.3],[35,166.7]],[[35.6,169],[35,168.3]],[[36.6,168.7],[35.6,169]],[[37.1,167.4],[36.6,168.7]],[[37.9,166.7],[37.1,167.4]],[[37.8,165.1],[37.9,166.7]],[[36.9,164.5],[37.8,165.1]]],
	'r':[[[67.1,33.6],[69.6,32.1]],[[63.8,33.7],[67.1,33.6]],[[60.9,35.7],[63.8,33.7]],[[46.3,41.7],[60.9,35.7]],[[42.3,41.9],[46.3,41.7]],[[37.1,44.2],[42.3,41.9]],[[31.5,43.9],[37.1,44.2]],[[27.1,46],[31.5,43.9]],[[22.1,45.8],[27.1,46]],[[16.6,48.3],[22.1,45.8]],[[9.3,48.2],[16.6,48.3]],[[10.5,53.8],[0.7,56.2]],[[2.5,50.6],[9.3,48.2]],[[186.7,43.5],[177.3,43.5]],[[177.3,43.5],[177.3,50]],[[171.5,55.6],[171,55.6]],[[171.5,54.4],[171.5,55.6]],[[167.7,54.4],[171.5,54.4]],[[167.7,50],[167.7,54.4]],[[172.2,50],[167.7,50]],[[172.2,51.5],[172.2,50]],[[173,51.5],[172.2,51.5]],[[173,50],[173,51.5]],[[177.3,50],[173,50]],[[69.6,32.1],[78.2,32.1]],[[78.2,32.1],[85.3,29.8]],[[171,67],[167,67]],[[171,55.6],[171,67]],[[114,50],[108.5,46.9]],[[120.7,56.6],[114,50]],[[128.8,60.6],[120.7,56.6]],[[134.6,61.5],[128.8,60.6]],[[139.1,60.4],[134.6,61.5]],[[144.8,56.6],[139.1,60.4]],[[151,50.3],[144.8,56.6]],[[152.6,46.5],[151,50.3]],[[152.7,42.7],[152.6,46.5]],[[150.5,38],[152.7,42.7]],[[146.1,34.7],[150.5,38]],[[138.7,33.3],[146.1,34.7]],[[131.9,29.4],[138.7,33.3]],[[127.3,27.8],[131.9,29.4]],[[115.6,27.4],[127.3,27.8]],[[108.9,29.4],[115.6,27.4]],[[100.5,30.6],[108.9,29.4]],[[92.9,29.8],[100.5,30.6]],[[85.3,29.8],[92.9,29.8]],[[18.1,54.3],[10.5,53.8]],[[23.1,52],[18.1,54.3]],[[29,52.7],[23.1,52]],[[35.9,50.2],[29,52.7]],[[39.2,49.9],[35.9,50.2]],[[44.2,52.1],[39.2,49.9]],[[47.6,52.3],[44.2,52.1]],[[53.1,50.4],[47.6,52.3]],[[56.4,50],[53.1,50.4]],[[60.5,47.8],[56.4,50]],[[63.6,47.8],[60.5,47.8]],[[73.4,45.1],[63.6,47.8]],[[78.9,45],[73.4,45.1]],[[86.7,43.8],[78.9,45]],[[91.2,44.3],[86.7,43.8]],[[99,46.3],[91.2,44.3]],[[108.5,46.9],[99,46.3]],[[177,63],[177,55]],[[181,63],[177,63]],[[181,55],[181,63]],[[177,55],[181,55]],[[69.3,80.9],[34,80.9]],[[21.5,81],[2,80.9]],[[9.5,172],[9.5,179]],[[12.5,172],[9.5,172]],[[12.5,179],[12.5,172]],[[15,179],[12.5,179]],[[15.1,170],[15,179]],[[9.5,179],[7,179]],[[7,179],[7,170.1]],[[7,170.1],[15.1,170]],[[197.2,58.3],[198.1,56.8]],[[197.2,60.8],[197.2,58.3]],[[200.9,61],[197.2,60.8]],[[200.5,58.2],[200.9,61]],[[201.9,59],[200.5,58.2]],[[204,59],[201.9,59]],[[204,57],[204,59]],[[201.9,57],[204,57]],[[200.4,56.2],[201.9,57]],[[202.1,54.7],[200.4,56.2]],[[203.1,52.5],[202.1,54.7]],[[201.4,51.9],[203.1,52.5]],[[200.7,53.3],[201.4,51.9]],[[199.3,54.6],[200.7,53.3]],[[198.2,54.9],[199.3,54.6]],[[193,52.1],[198.2,54.9]],[[191.9,45.2],[193,52.1]],[[187.4,45.2],[191.9,45.2]],[[187.4,42.7],[187.4,45.2]],[[177,42.7],[187.4,42.7]],[[186.7,48.8],[186.7,43.5]],[[187.4,48.8],[186.7,48.8]],[[187.4,47],[187.4,48.8]],[[191.7,47.1],[187.4,47]],[[192.9,53.9],[191.7,47.1]],[[198.1,56.8],[192.9,53.9]],[[227.4,50.4],[224.9,50.4]],[[228.1,49.9],[227.4,50.4]],[[228.1,49],[228.1,49.9]],[[224.8,49],[228.1,49]],[[224.9,50.5],[224.9,59.1]],[[234,59.8],[234,63]],[[233.2,59.1],[234,59.8]],[[224.9,59.1],[233.2,59.1]],[[234,63],[223.9,63]],[[77.4,103.5],[72.9,120]],[[79.3,191.2],[80.2,191.6]],[[79.3,180.7],[79.3,191.2]],[[77.6,181.5],[79.3,180.7]],[[77.7,178.4],[77.6,181.5]],[[78.5,174.8],[77.7,178.4]],[[79.2,162.5],[78.5,174.8]],[[74.6,158.3],[79.2,162.5]],[[75.7,154.1],[74.6,158.3]],[[70,136],[75.7,154.1]],[[71.1,127.4],[70,136]],[[70.8,122.1],[71.1,127.4]],[[71.2,120.7],[70.8,122.1]],[[71.3,118.2],[71.2,120.7]],[[70.8,115.4],[71.3,118.2]],[[71.4,112.4],[70.8,115.4]],[[71.3,107.3],[71.4,112.4]],[[71.4,98.2],[71.3,107.3]],[[70.8,80.9],[71.3,84.9]],[[71.3,84.9],[71.8,85.2]],[[71.8,85.2],[70.5,90.5]],[[70.5,90.5],[71.1,95.9]],[[71.1,95.9],[71.4,98.2]]],
	'y':[],
	'g':[[[3.4,159.3],[-6.1,159.4]],[[-13.8,146.7],[3.4,159.3]],[[-1.3,151.8],[3.4,159.2]]],
	't':[],
	'b':[],
	'p':[]
};
var layerInteracts = {
	'r': ['w', 'r', 'y', 'p'],
	'g': ['w', 'y', 'g', 't'],
	'b': ['w', 't', 'b', 'p']
};


var deferredFunc;

var dt_tLast = 0;
var dt_buffer = [];
dt_buffer.maxLen = 30;

var editor_active = false;
var editor_creatables = [
	[`collision`, 	(x, y) => {data_terrain[player.layer].push([[x - 1, y - 1], [x + 1, y + 1]])}],
	[`portal`, 		(x, y) => {return new Portal()}], //layer, position
	[`trigger`, 	(x, y) => {}], //cutscene, music, spawn
	[`audioSource`, (x, y) => {}], 
	[`entity`, 		(x, y) => {entities.push(new DreamSkater(x, y, 'r'))}], //npc, enemy, moth, dreamskater, debug comments, etc
	[`tileEntity`, 	(x, y) => {}], //walls n' stuff, animated textures
];
var editor_entity = undefined;
var editor_enum;
var editor_enumBreaks = [20, 50];
var editor_enumMargin = 0.05;
var editor_layerColors = {
	'w': "#FFF",
	'r': "#F88",
	'y': "#FF8",
	'g': "#8F8",
	't': "#8FF",
	'b': "#88F",
	'p': "#F8F"
};

var editor_listE = {
	str: [
		`NPC`,
		`DreamSkater`,
		`Roof`,
		`Comment_Text`,
		`Comment_Audio`,
	],
	create: (i, fromObj) => {
		if (entities.includes(fromObj)) {
			entities.splice(entities.indexOf(fromObj), 1);
		}
		if (world_entities.includes(fromObj)) {
			world_entities.splice(world_entities.indexOf(fromObj), 1);
		}
		console.log(fromObj);
		fromObj = fromObj ?? {};
		var id = fromObj.id;
		var x = fromObj.x ?? camera.x;
		var y = fromObj.y ?? camera.y;
		var layer = fromObj.layer ?? player.layer;
		var dir = fromObj._dir ?? 'd';

		var entity;
		switch (i) {
			case 0:
				entity = new NPC(x, y, layer, 'd', {'d': {idle: new Texture(data_textures.NPCS.sheet, data_textures.tileSize, data_textures.NPCS.dm1Idle, true, false)}}, "#00FF00", [[]], id);
				break;
			case 1:
				entity = new DreamSkater(x, y, layer, id);
				break;
			case 2:
				entity = new Roof(x, y, layer, 1, data_textures.Roofs.badTree1);
				break;
			case 3:
				break;
			case 4:
				break;
		}
		entities.push(entity);
	},
}
var editor_listR = {
	str: Object.keys(data_textures.Roofs).filter(a => !(["sheet", "sheet2", "tileSize", "waterfall"].includes(a))),
	create: (i) => {
		var dimensionData = editor_listR.str[i];
		
		[editor_entity.sx, editor_entity.sy] = dimensionData[0];
		[editor_entity.w, editor_entity.h] = dimensionData[1];
		editor_entity.offsetX = -dimensionData[2][0];
		editor_entity.offsetY = -dimensionData[2][1];

		editor_buttons[2].label = `txtr: ${editor_listR.str[i]}`;
	}
}

var editor_listT = [
	Tile_Conversator,
	Tile_Arbitrary,
	Tile_Music,
	Tile_Respawn,
	// Tile_SemiSolid
];

var editor_locations = [
	[0, 0, 'r'],
	[20, 163, 'r'],	//temple enter
	[158, 73, 'r'], //bismuth garden start
	[155, 17, 'r'], //LLC start
	[113, 123, 'r'] //town start
];
var editor_polyPoints = [];
var editor_pointSelected = -1;
var editor_roundR = 0.025;
var editor_selectTolerance = 10;

var editor_sidebarW = 0.24;
var editor_topbarH = 0.04;
var editor_sidebarHs = [0.06, 0.4, 0.82];
var editor_value = 0;

var editor_buttons = [
	new UI_Button(editor_sidebarW / 2, editor_sidebarHs[1] + 0.04, editor_sidebarW * 0.8, 0.04, `ENTITY TYPE`, () => {editor_enum = editor_listE;}),
	new UI_Button(editor_sidebarW / 2, editor_sidebarHs[1] + 0.08, editor_sidebarW * 0.8, 0.04, `[no id]`, () => {
		var st = prompt("enter new id");
		if (isValidStr(st)) {
			editor_entity.id = st;
			editor_buttons[1].label = st;
		}
	}),
];

var fight_boundsUL = [];
var fight_boundsDR = [];
var fight_onSuccess;
var fight_onFail;
var fight_fadeTimer = 0;
var fight_fadeTimerMax = 100;

var font_std = `Playfair Display`;

var game_mainLoop;

var menu_texture;
var menu_rate = 0;
var menu_rateMagnitude = 3;
var menu_t = 0;


var player;

var render_bgFilterOpacity = 0;
var render_fgFilterOpacity = 0;
var render_chocoOverlay;
var render_hpMEdge = 0.025;
var render_hpMBar = 0.006;
var render_hpHeight = 0.05;
var render_iframePeriod = 1 / 6;

var text_charsPerSec = 120;
var text_filterTime = 2 / 3;
var text_size = 0.04;
var text_tabsCount = 8;

var terrain_starChainMax = 4;
//8 surfaces	//0 - grass, 1 - wall
/*
0 - grass
1 - wall
2 - soft stone
3 - sandy path
4 - wood
5 - carpet
6 - stone
7 - snow????
*/
var terrain_surfaces = ["fxStep0", undefined, "fxStep2", "fxStep3", "fxStep4", "fxStep5", "fxStep6", "fxStep7"];
var terrain_tileUnits = 0.5;

var time_default = 0.5;

var weapon_damages = [0, 1, 4];

var bgts = data_textures.Roofs.tileSize;
var daTex = data_textures;

var eData_dm1 = [
	[true, ``],
];
var eData_place = [
	[true, `placeholder`]
]


var entities = [
	"DreamSkater~14.8~212.8~r",
	"DreamSkater~21.7~188.0~r",
	"DreamSkater~57.8~192.6~r",
	"DreamSkater~51.3~158.0~r",
	"DreamSkater~18.5~125.1~r",
	"DreamSkater~50.5~131.8~r",
	"DreamSkater~21.2~155.0~r",
	"DreamSkater~35.7~139.8~r",
	"DreamSkater~11.0~179.1~r~DSblocker~charge",
];
var world_entities;

//TODO: replace TRoofFactory with an actual change to Roof's constructor. If I can essentially write a constructor func, I should be able to just simplify the constructor itself.
var world_roofs = [
	//oak trees
	// new Roof(47.4, 24.3, 'r', 0, daTex.Roofs.oakBranches3, []),
	// new Roof(59.1, 26.55, 'r', 0, daTex.Roofs.oakBranches1, []),
	// new Roof(50.15, 34.7, 'r', 0, daTex.Roofs.oakBranches2, []),
	// new Roof(44.55, 38.1, 'r', 0, daTex.Roofs.oakBranches1, []),
	// new Roof(47.05, 48.7, 'r', 0, daTex.Roofs.oakBranches2, []),

	// new Roof(47, 23.3, daTex.Roofs.oakCanopy3, [[53.1,23.4],[56.1,24.9],[57.7,27.6],[56.9,31.3],[55,33.3],[52.8,34.6],[50,34.8],[47.3,31.2],[47.2,29],[49.9,27],[50.3,24.3]]),
	// new Roof(58.2, 25.9, daTex.Roofs.oakCanopy1, [[63,25.9],[66.5,26.1],[68.9,30.8],[66.5,35.4],[62.4,35.5],[59.8,33.9],[58.1,31.2],[58.4,28.4]]),
	// new Roof(49.15, 33.7, daTex.Roofs.oakCanopy2, [[49.5,34.9],[55.4,33.4],[57.9,35.1],[60.1,38.9],[56.5,42],[52.5,42.5],[48.8,37.3]]),
	// new Roof(43.5, 37.5, daTex.Roofs.oakCanopy1, [[42.7,38.4],[51.1,37.2],[54.4,41.9],[51.8,47.1],[47.5,47],[44.1,44.6]]),
	// new Roof(46.3, 47.6, daTex.Roofs.oakCanopy2, [[46.6,48.8],[50.9,47.4],[53.8,47.7],[57.8,52.6],[52.1,56.6],[49.1,56],[45.9,50.8]])
];

function setup() {
	//sneaky sneaky - by having the user click to load, they are unknowingly consenting to play audio and also to have their clipboard copied to
	//don't do things like this in real life it's frowned upon and also probably a crime
	loadingText.innerHTML = `<button onclick="setup2()">Begin program</button>`;

	UI_properties = {
		lineW: 1 / 200,
		font: font_std,
		cornerR: editor_roundR,
		colorLine: color_editorPanelLight,
		colorFill: color_editorBg,
		colorFill2: color_editorBg,
		colorText: color_editorHighlight,
	}

	menu_texture = new Texture(getImage(`img/menuBg.png`), data_textures.tileSize, [1e1001, [16, 12], [8, 6], [[0, 0]]], false);
	render_chocoOverlay = new Texture(data_textures.TileEntities.sheet, data_textures.tileSize, data_textures.TileEntities.chocWorld, false);
}

function setup2() {
	canvas = document.getElementById("convos");
	canvas2 = document.getElementById("convosSecret");
	bg_canvas = document.createElement("canvas");
	ctx = canvas.getContext("2d");
	cty = canvas2.getContext("2d");
	btx = bg_canvas.getContext("2d");

	loadingText.innerHTML = "";

	entities = entities.map(e => importEntity(e));
	world_entities = entities;

	// importWorld(data_terrain.replaceAll("\n", ""));

	player = new Warrior(17.55, 35.65, 'r');
	world_entities.push(player);
	audio_bgChannel.target = data_audio["outside"];

	handleResize();
	localStorage_read();
	rasterizeBG();


	game_mainLoop = main;
	animation = window.requestAnimationFrame(runGame);
}

function runGame() {
	var newTime = performance.now();
	var dt = clamp(newTime - dt_tLast, 1, 30) / 1000;
	dt_tLast = newTime;
	dt_buffer.push(dt);
	if (dt_buffer.length > dt_buffer.maxLen) {
		dt_buffer.shift();
	}

	try {
		game_mainLoop(dt);
		animation = window.requestAnimationFrame(runGame);
	} catch(e) {
		var fullText = e.toString() + " at\n";
		var st = e.stack.split("\n");
		//replace all the info in the stack with just the thing after the last slash, because I don't care about the full file path (I know it)
		st = st.map(l => l.slice(l.lastIndexOf("/") - 3));

		//remove most of the repetitious main calls
		for (var c=3; c<st.length; c++) {
			if (st[c] == st[c-1] && st[c] == st[c-2] & st[c] == st[c-3]) {
				st = st.slice(0, c);
				c = st.length;
			}
		}


		st.forEach(l => {
			fullText += l.replace(':', "  ") + `\n`;
		});

		fullText = "Oh nyo! A world-shattering error has occurred, and the program can no longer continue.\n" 
				+ "A more detailed explanation is provided below.\n"
				+ "Please copy that and send it to the developer, so the error can be fixed.\n" + fullText;
		theError = e;
	}
}

function runWorld(dt, fightActive) {
	//audo 
	audio_bgChannel.tick(dt);


	//camera
	camera.tick(dt);
	
	//world
	drawWorldBG();

	//background filter, if active
	if (render_bgFilterOpacity > 0) {
		ctx.globalAlpha = render_bgFilterOpacity;
		ctx.fillStyle = color_bg;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.globalAlpha = 1;
	}

	//make a copy of the array so that adding/removing entities doesn't mess up the loop
	//order world entities
	world_entities = world_entities.sort((a, b) => a.y - b.y);
	world_entities.slice(0).forEach(v => {
		v.tick(dt);
		v.draw(dt);
		
		if (v.DELETE) {
			//make sure to not softlock the player
			if (player.convoPartner == v) {
				v.endConversation();
			}
			
			world_entities.splice(world_entities.indexOf(v), 1);
		}
	});

	//every once in a while check on who gets to be in world_entities
	var cTime = dt_tLast / 1000;
	if (cTime % 1 < 0.5 && (cTime - dt_buffer[dt_buffer.length-1]) % 1 > 0.5) {
		// updateWorldEntities();
	}

	world_roofs.forEach(w => {
		w.tick();
		w.draw();
	});

	//run the deferred function if there is one
	if (deferredFunc != undefined) {
		deferredFunc(dt);
		deferredFunc = undefined;
	}

	//save the game if in the main world without conversing
	if (!fightActive && player.convoPartner == undefined && animation % 180 == 1) {
		localStorage_write();
	}

	//foreground filter, if active
	if (render_fgFilterOpacity > 0) {
		ctx.globalAlpha = render_fgFilterOpacity;
		ctx.fillStyle = color_bg;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.globalAlpha = 1;
	}

	//chocolate count overlay
	if (player.chocolate > 0) {
		var chocoUnit = canvas.width / 40;
		render_chocoOverlay.draw(chocoUnit, chocoUnit, chocoUnit * 2, dt);
		drawText(player.chocolate, chocoUnit * 2, chocoUnit * 0.9, `${chocoUnit}px ${font_std}`, "#321801");
	}
}

function runEnding() {
	//background
	ctx.fillStyle = color_bg;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	audio_bgChannel.tick();

	//rectangle around the screen
	var margin = canvas.height / 25;
	ctx.strokeStyle = (player.magicLearned) ? color_magic : color_castleEntities;
	ctx.lineWidth = canvas.height / 50;
	ctx.beginPath();
	ctx.rect(margin, margin, canvas.width - (2 * margin), canvas.height - (2 * margin));
	ctx.stroke();

	//text
	ctx.font = `${canvas.height / 18}px ${font_std}`;
	var displayText = data_conversations[(data_persistent.ends == 3) ? "outro-allEndings" : "outro-oneEnding"];
	var vOffset = Math.floor(canvas.height / 16);
	for (var h=0; h<displayText.length; h++) {
		drawText(displayText[h], canvas.width / 2, (canvas.height * 0.4) + (vOffset * (h - ((displayText.length - 1) / 2))), NaN, "#FFFFFF", "center");
	}

	drawText(`Reset`, canvas.width / 2, canvas.height * 0.9, `${canvas.height / 30}px ${font_std}`, "#888");
}

function main(dt) {
	if (menu_t > 0 || menu_rate != 0) {
		menu_t = clamp(menu_t + menu_rate * dt, 0, 1);
		//ending movement
		if ((menu_t == 0 && menu_rate < 0) || (menu_t == 1 && menu_rate > 0)) {
			menu_rate = 0;
		}
		drawMenu();
		audio_bgChannel.tick();
		return;
	}
	runWorld(dt, false);
	
	//editor grid
	if (editor_active) {
		drawEditor();

		//make sure this happens in case of screen movement
		if (cursor.down) {
			handleMouseMove_custom();
		}
	}
}

function fight() {
	//same menu handling
	if (menu_t > 0 || menu_rate != 0) {
		menu_t = clamp(menu_t + menu_rate, 0, 1);
		if ((menu_t == 0 && menu_rate < 0) || (menu_t == 1 && menu_rate > 0)) {
			menu_rate = 0;
		}
		drawMenu();
		audio_bgChannel.tick();
		return;
	}
	runWorld(true);

	//entity health
	var enemyCurrentHealth = 0;
	var enemyPossibleHealth = 0;

	world_entities.forEach(v => {
		if (v != player && v.health != undefined) {
			//don't add negative health
			if (v.health > 0) {
				enemyCurrentHealth += v.health;
			}
			enemyPossibleHealth += v.maxHealth;
		}

		//make sure they're inside the bounds
		v.x = clamp(v.x, fight_boundsUL[0], fight_boundsDR[0]);
		v.y = clamp(v.y, fight_boundsUL[1], fight_boundsDR[1]);
	});

	//start the fade out
	if (enemyCurrentHealth <= 0 || player.health <= 0) {
		fight_fadeTimer += 1;
		render_fgFilterOpacity = (fight_fadeTimer / fight_fadeTimerMax) ** 8;

		//if the timer's up end the state
		if (fight_fadeTimer < fight_fadeTimerMax) {
			return;
		}
		fight_fadeTimer = 0;
		//if all enemies' health drops to zero, run the success case
		if (enemyCurrentHealth <= 0) {
			fight_onSuccess();
			fightExit();
			return;
		}
		
		//if the player's health drops to zero, run the fail case
		if (player.health <= 0) {
			player.respawn();
			fight_onFail();
			fightExit();
			return;
		}
	}

	//draw health bars
	var min = canvas.width * render_hpMEdge;
	var buffer = canvas.width * render_hpMBar;
	var hWidth = canvas.width * (0.5 - render_hpMEdge * 2);
	var hHeight = canvas.height * render_hpHeight;
	var wid = canvas.width;

	ctx.lineWidth = canvas.height / 200;
	ctx.strokeStyle = world_entities[world_entities.length-1].color;
	ctx.fillStyle = world_entities[world_entities.length-1].color;
	//enemy
	ctx.beginPath();
	ctx.rect(min, min, hWidth, hHeight);
	ctx.stroke();
	ctx.fillRect(min + buffer, min + buffer, (hWidth - (buffer * 2)) * (enemyCurrentHealth / enemyPossibleHealth), hHeight - (buffer * 2));
	
	//self
	ctx.beginPath();
	ctx.strokeStyle = color_health;
	ctx.fillStyle = color_health;

	ctx.rect(wid - min, min, -hWidth, hHeight);
	ctx.stroke();
	ctx.fillRect(wid - (min + buffer), min + buffer, (hWidth - (buffer * 2)) * -(player.health / player.maxHealth), hHeight - (buffer * 2));
}

function fightExit() {
	render_fgFilterOpacity = 0;
	world_entities = entities;
	player.health = player.maxHealth;
	game_mainLoop = main;
}

function fightStart(fightEntities, fightULBounds, fightDRBounds, onSuccess, onFail) {
	window.setTimeout(() => {
		if (player.convoPartner != undefined) {
			player.convoPartner.endConversation();
		}
		fight_boundsUL = fightULBounds;
		fight_boundsDR = fightDRBounds;
		fight_onSuccess = onSuccess;
		fight_onFail = onFail;
		world_entities = fightEntities;

		game_mainLoop = fight;
	}, 1);
}

function fightStart_angel() {
	lockCastleBoss(1);
	setMusic("angelFight");
	fightStart([player, new Enemy_Angel(141.5, 16)], [131, 7], [152, 25], 
		() => {
			lockCastleBoss(0);
			setMusic("none");
			getEntityFromID("queen").forceConversation("angel-defeat");
		}, 
		() => {
			lockCastleBoss(0);
			setMusic("castle");
		}
	);
}
function fightStart_guard() {
	[player.x, player.y] = [116, 65];
	setMusic("guardFight");
	fightStart([player, new Enemy_Guard(116, 59.5)], [108, 58], [124, 70], 
		() => {
			getEntityFromID('guard1').forceConversation('guard-defeated');
			//put them really far away so you don't see them
			getEntityFromID('guard1').x = 1e1001;
			getEntityFromID('guard2').x = 1e1001;
			getEntityFromID('guard2').DELETE = true;
			setMusic("outside");
		},
		() => {
			setMusic("outside");
		}
	);
}

function fightStart_knights() {
	lockCastleBoss(1);
	setMusic("knightFight");
	fightStart([player, new Enemy_Knight(139.5, 11.5), new Enemy_Knight(141.5, 11.5), new Enemy_Knight(143.5, 11.5)], [131, 7], [152, 25],
		() => {
			lockCastleBoss(0);
			getEntityFromID('knight1').x = 1e1001;
			getEntityFromID('knight1').DELETE = true;
			getEntityFromID('knight2').forceConversation('knights-defeat');
			getEntityFromID('knight3').x = 1e1001;
			getEntityFromID('knight3').DELETE = true;
			getEntityFromID('queen').DELETE = true;
			setMusic("none");
		},
		() => {
			lockCastleBoss(0);
			setMusic("castle");
		}
	);
}

function fightStart_lord() {
	setMusic("lordFight");
	fightStart([player, new Enemy_Lord(16, 12)], [8, 8], [24, 20], 
		() => {
			setMusic("outside");
			getEntityFromID('lord').forceConversation('lord-youWin');
		},
		() => {
			setMusic("outside");
			if (data_persistent.lordFirst) {
				getEntityFromID('lord').forceConversation('lord-youLose');
			} else {
				getEntityFromID('lord').forceConversation('lord-youLose2');
			}
		}
	);
}

function handleKeyDown(a) {
	//some key distinctions are unoptimal for my purposes
	var code = a.code;
	if (button_conversions[code] != undefined) {
		code = button_conversions[code];
	}



	//if in accepting mode, only accept that key
	if (button_acceptingOutput != undefined) {
		return;
	}

	if (button_acceptingInput != undefined) {
		if (button_acceptingInput[0] == code) {
			button_acceptingInput[1]();
			button_acceptingInput = undefined;
		}
		return;
	}

	if (editor_active && code.slice(0, 5) == "Digit") {
		var value = +code.slice(5);

	
		//if shift is pressed, teleport the player to some strategic location.
		if (button_shift) {
			[player.x, player.y] = editor_locations[value];
			return;
		}

		//without shift, numbers control the tile to place
		if (value < 8) {
			editor_value = value;
		}
		return;
	}


	switch (code) {
		case 'Left':
		case 'Up':
		case 'Right':
		case 'Down':
			if (!button_queue.includes(code)) {
				button_queue.push(code);
			}
			//try to dash if the player is holding shift and then presses a direction (as a little quality of life thing)
			if (button_shift) {player.dash();}
			break;
		case 'Interact':
			player.attack_start();
			break;
		case 'Magic':
			if (!player.locked) {
				player.charge();
			}
			break;
		case 'Shift':
			button_shift = true;
			player.dash();
			break;
		case 'AltLeft':
			button_alt = true;
			break;
		case 'BracketRight':
			editor_active = !editor_active;
			break;
		case 'KeyP':
			if (editor_active) {
				console.log(+(cursor.x.toFixed(1)), +(cursor.y.toFixed(1)));
			}
			break;
		case 'Escape':
			if (player.convoPartner == undefined) {
				//escape activates / deactivates the menu
				if (menu_rate <= 0 && menu_t < 1) {
					menu_rate = menu_rateMagnitude;
				} else {
					menu_rate = -menu_rateMagnitude;
				}
			}
			break;
		case "Backspace":
			editor_deleteSelected();
			break;
	}

}

function handleKeyUp(a) {
	var code = a.code;
	if (button_conversions[code] != undefined) {
		code = button_conversions[code];
	}

	if (button_acceptingOutput != undefined && button_acceptingOutput[0] == code) {
		button_acceptingOutput[1]();
		button_acceptingOutput = undefined;
	}

	switch (code) {
		case 'Left':
		case 'Up':
		case 'Right':
		case 'Down':
			if (button_queue.includes(code)) {
				button_queue.splice(button_queue.indexOf(code), 1);
			}
			break;
		case 'Magic':
			if (!player.locked) {
				player.discharge();
			}
			break;
		case 'Shift':
			button_shift = false;
			break;
		case 'AltLeft':
			button_alt = false;
			break;
	}
}

function handleResize() {
	//compute
	var w = window.innerWidth * 0.96;
	var h = window.innerHeight * 0.95;
	var scaleFactor = 480 / 640;

	//resize canvas
	canvas.height = Math.min(h, w * scaleFactor);
	canvas.width = canvas.height / scaleFactor;
	canvas.style["margin-left"] = `-${canvas.width/2}px`;
	canvas2.height = Math.min(h, w * scaleFactor);
	canvas2.width = canvas.height / scaleFactor;
	canvas2.style["margin-left"] = `-${canvas2.width/2}px`;

	//compute camera scaling
	camera.rescale();

	//set canvas preferences
	ctx.textBaseline = "middle";
	ctx.textAlign = "center";
	ctx.imageSmoothingEnabled = !data_persistent.alias;

	cty.textBaseline = "middle";
	cty.textAlign = "left";
	cty.imageSmoothingEnabled = !data_persistent.alias;
}




function handleMouseDown_custom() {
	//if the mouse is outside of the canvas, ignore it
	if (cursor.x > canvas.width || cursor.x < 0 || cursor.y > canvas.height || cursor.y < 0) {
		cursor.down = false;
		return;
	}
	cursor.downTime = dt_tLast;
	if (menu_t > 0.75) {
		handleMouseDown_menu();
		return;
	}

	if (!editor_active) {
		return;
	}

	var spa = screenToSpace(cursor.x, cursor.y);
	var cxp = cursor.x / canvas.width;
	var cyp = cursor.y / canvas.height;

	//enum panel
	if (editor_enum != undefined) {
		editor_handleMDEnum(cxp, cyp);
		return;
	}

	if (cursor.x < editor_sidebarW * canvas.width || cursor.y < editor_topbarH * canvas.height) {
		editor_handleMDMenu(cxp, cyp);
		return;
	}

	editor_entity = undefined;

	if (editor_handleMDCol(spa)) {
		return;
	}

	if (editor_handleMDEnt(cxp, cyp)) {
		return;
	}

	cursor.pastPoint = [cursor.x, cursor.y];
}

function handleMouseDown_menu() {
	var menu_boxSize = [12, 8];
	var cs = camera.scale;
	var baseH = (canvas.height * 0.5) - (cs * menu_boxSize[1] / 2);
	var baseW = (canvas.width / 2) - (cs * menu_boxSize[0] / 2);

	//reset
	if (Math.abs(cursor.y - (baseH + cs*menu_boxSize[1])) < cs && cursor.x > baseW && cursor.x < (canvas.width / 2)) {
		reset();
		return;
	}

	//true reset
	if (Math.abs(cursor.y - (baseH + cs*menu_boxSize[1])) < cs && cursor.x > (canvas.width / 2) && cursor.x < canvas.width - baseW) {
		resetTrue();
		return;
	}

	//don't bother if the cursor isn't in the preferences range
	if (cursor.y < baseH + cs * 0.5 || cursor.y > baseH + cs * 2.5) {
		return;
	}

	//volume sliders
	var sliderW = cs*3;
	var sliderStart1 = baseW + cs*2.75;
	var sliderStart2 = baseW + cs * (menu_boxSize[0]/2 + 2.85);
	if (cursor.y < baseH + cs * 1.5) {
		if (cursor.x < canvas.width / 2) {
			var value = clamp(getPercentage(sliderStart1, sliderStart1 + sliderW, cursor.x), 0, 1);
			audio_bgChannel.volume = value;
			//the rounding is so persistent volume measurements aren't too long (0.2834616523 as a string is a lot of characters)
			data_persistent.vols[0] = Math.round(value * 100) / 100;
			//music
		} else {
			//sfx
			var value = clamp(getPercentage(sliderStart2, sliderStart2 + sliderW, cursor.x), 0, 1);
			audio_sfxChannel.volume = value;
			data_persistent.vols[1] = Math.round(value * 100) / 100;
		}
		return;
	}

	//aliasing
	if (cursor.x < canvas.width / 2) {
		data_persistent.alias = !data_persistent.alias;
		ctx.imageSmoothingEnabled = !data_persistent.alias;
		cty.imageSmoothingEnabled = !data_persistent.alias;
	}
}

function handleMouseMove_custom() {
	if (menu_t > 0.75 && cursor.down) {
		handleMouseMove_menu();
		return;
	}
	if (!editor_active) {
		return;
	}

	if (cursor.x < canvas.width * editor_sidebarW) {
		editor_buttons.forEach(b => {
			b.tick();
		});
		return;
	}

	if (!cursor.down) {
		return;
	}

	var spa = screenToSpace(cursor.x, cursor.y);
	var spq = editor_quantizeArr(spa);

	if (cursor.y < canvas.height * editor_topbarH && editor_entity == undefined) {
		editor_adjustCamera(cursor.x / canvas.width);
	}

	if (editor_entity != undefined) {
		if (editor_entity.homeX != undefined) {
			[editor_entity.homeX, editor_entity.homeY] = spq;
		}
		if (editor_entity.x != undefined && !button_alt) {
			[editor_entity.x, editor_entity.y] = spq;
		}
		return;
	}

	if (editor_pointSelected) {
		[editor_pointSelected[0], editor_pointSelected[1]] = spq;
	}

	cursor.pastPoint = [cursor.x, cursor.y];
}

function handleMouseMove_menu() {
	//just do the volume sldiers
	var menu_boxSize = [12, 8];
	var cs = camera.scale;
	var baseH = (canvas.height * 0.5) - (cs * menu_boxSize[1] / 2);
	var baseW = (canvas.width / 2) - (cs * menu_boxSize[0] / 2);

	//don't bother if the cursor isn't in the preferences range
	if (cursor.y < baseH + cs * 0.5 || cursor.y > baseH + cs * 2.5) {
		return;
	}

	//volume sliders
	var sliderW = cs*3;
	var sliderStart1 = baseW + cs*2.75;
	var sliderStart2 = baseW + cs * (menu_boxSize[0]/2 + 2.85);
	if (cursor.y < baseH + cs * 1.5) {
		if (cursor.x < canvas.width / 2) {
			var value = clamp(getPercentage(sliderStart1, sliderStart1 + sliderW, cursor.x), 0, 1);
			audio_bgChannel.volume = value;
			data_persistent.vols[0] = Math.round(value * 100) / 100;
			//music
		} else {
			//sfx
			var value = clamp(getPercentage(sliderStart2, sliderStart2 + sliderW, cursor.x), 0, 1);
			audio_sfxChannel.volume = value;
			data_persistent.vols[1] = Math.round(value * 100) / 100;
		}
		return;
	}
}

function quantizeTo(x, decimalPlace) {
	return +(x.toFixed(decimalPlace));
}

function handleMouseUp_custom() {
	editor_pointSelected = undefined;
}