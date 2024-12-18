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

var bg_objR, bg_objG, bg_objB;
var bg_chunkW = 80;
var bg_chunkH = 75;
var bg_tw = 60;
//this array is laid out so that y goes down visually, and x goes across visually
var bgg = function(id) {
	return getImage(`img/ter${id}.png`, false);
}
var bg_chunkArr = [
	[undefined, undefined, undefined, undefined],
	[undefined, bgg(`r00`), bgg(`r10`), bgg(`r20`)],
	[undefined, bgg(`r01`), bgg(`r11`), bgg(`r21`)],
	[undefined, bgg(`r02`), undefined, undefined],
];

var bg_chunkArg = [
	[undefined, undefined, undefined, undefined],
	[],
	[undefined, bgg(`g01`), undefined, bgg(`g21`)],
	[],
];

var bg_chunkArb = [
	[undefined, undefined],
	[],
	[undefined, bgg(`b01`)],
	[undefined, bgg(`b02`)]
]

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
		sub: ""
	},
	"commStart2": {
		// aud: 
		sub: "",
	},
	"commLayers": {
		// aud: 
		sub: "",
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
	'w':[[[70.5,83.5],[70.3,80.9]],[[71.1,85.8],[70.5,83.5]],[[70.9,87.3],[71.1,85.8]],[[69.8,90.6],[70.9,87.3]],[[70.4,92.5],[69.8,90.6]],[[70.7,95.9],[70.4,92.5]],[[70.5,98.3],[70.7,95.9]],[[69.7,100.1],[70.5,98.3]],[[68.5,116.8],[68.6,112.6]],[[68,119.4],[68.5,116.8]],[[68.4,122.8],[68,119.4]],[[67.1,131.6],[67.2,129.7]],[[66.1,135.2],[67.1,131.6]],[[65.9,136.9],[66.1,135.2]],[[67.4,141.2],[65.9,136.9]],[[66.8,142.9],[67.4,141.2]],[[66.8,146],[66.8,142.9]],[[66.2,148.4],[66.8,146]],[[66.3,150.8],[66.2,148.4]],[[65,154],[66.3,150.8]],[[64.3,154.5],[65,154]],[[64.6,161.1],[64.3,154.5]],[[65.7,161.2],[64.6,161.1]],[[67.5,162.4],[65.7,161.2]],[[66.7,164.9],[67.5,162.4]],[[66.3,167.9],[66.7,164.9]],[[64.6,172.9],[66.3,167.9]],[[64.1,178.8],[64.6,172.9]],[[64,183.3],[64.1,178.8]],[[66.1,180.7],[64,183.3]],[[66.1,187.4],[66.1,180.7]],[[65.6,192.1],[66.1,187.4]],[[66.5,192],[65.6,192.1]],[[66.5,196.7],[66.5,192]],[[65.3,197.3],[66.5,196.7]],[[62.9,200.5],[65.3,197.3]],[[62.1,204.7],[62.9,200.5]],[[61.9,208.8],[62.1,204.7]],[[60.4,210.9],[61.9,208.8]],[[58.9,211],[60.4,210.9]],[[57.2,209.3],[58.9,211]],[[54.9,208],[57.2,209.3]],[[53.2,208.1],[54.9,208]],[[50.5,210.8],[53.2,208.1]],[[47.8,212.3],[50.5,210.8]],[[45.1,211.9],[47.8,212.3]],[[43.2,210],[45.1,211.9]],[[42.7,208.2],[43.2,210]],[[43.5,206.6],[42.7,208.2]],[[46.2,204.3],[43.5,206.6]],[[48.4,200.7],[46.2,204.3]],[[49.9,199.6],[48.4,200.7]],[[51.1,200.6],[49.9,199.6]],[[53.3,205.5],[51.1,200.6]],[[54.6,205.7],[53.3,205.5]],[[55.8,204.4],[54.6,205.7]],[[57.1,201.2],[55.8,204.4]],[[56.4,197.6],[57.1,201.2]],[[54.3,196.2],[56.4,197.6]],[[51.7,196.1],[54.3,196.2]],[[49.4,196.5],[51.7,196.1]],[[46.5,195.8],[49.4,196.5]],[[42.3,193.5],[46.5,195.8]],[[39.1,192.8],[42.3,193.5]],[[36.1,194.3],[39.1,192.8]],[[34.4,197.2],[36.1,194.3]],[[33.4,201.3],[34.4,197.2]],[[34,204.5],[33.4,201.3]],[[37.5,210.1],[34,204.5]],[[38.5,214.8],[37.5,210.1]],[[37.8,219],[38.5,214.8]],[[36.1,221.5],[37.8,219]],[[33.9,222.2],[36.1,221.5]],[[32.7,221.6],[33.9,222.2]],[[30,219],[32.7,221.6]],[[27.3,217.6],[30,219]],[[24.4,217.5],[27.3,217.6]],[[22.8,219.8],[24.4,217.5]],[[20.3,221.7],[22.8,219.8]],[[16.2,222.4],[20.3,221.7]],[[12.2,221.8],[16.2,222.4]],[[8,219.8],[12.2,221.8]],[[5.6,216.8],[8,219.8]],[[4.6,213.3],[5.6,216.8]],[[4.9,208.6],[4.6,213.3]],[[6.8,205],[4.9,208.6]],[[9.4,203.3],[6.8,205]],[[14.7,202],[9.4,203.3]],[[17.1,200.3],[14.7,202]],[[18.8,197.4],[17.1,200.3]],[[19.2,194.1],[18.8,197.4]],[[18.3,191.6],[19.2,194.1]],[[16.2,190],[18.3,191.6]],[[13.5,189.7],[16.2,190]],[[4.9,190.6],[13.5,189.7]],[[2.8,189.3],[4.9,190.6]],[[2.5,187.7],[2.8,189.3]],[[4.1,184.1],[2.5,187.7]],[[5.9,175.7],[4.1,184.1]],[[6.4,166.9],[5.9,175.7]],[[5.4,161.5],[6.4,166.9]],[[6.1,157.5],[5.4,161.5]],[[6,150.1],[6.1,157.5]],[[22.3,205.5],[19.4,200.4]],[[22.9,209.8],[22.3,205.5]],[[23.9,213.8],[22.9,209.8]],[[25.2,215.1],[23.9,213.8]],[[26.4,214.2],[25.2,215.1]],[[27.4,209.1],[26.4,214.2]],[[29.2,205.4],[27.4,209.1]],[[30.5,204.2],[29.2,205.4]],[[31.9,201.5],[30.5,204.2]],[[31.8,199.4],[31.9,201.5]],[[29.9,195.7],[31.8,199.4]],[[28.2,193.8],[29.9,195.7]],[[27.4,193.7],[28.2,193.8]],[[27,193.3],[27.4,193.7]],[[25.3,193.4],[27,193.3]],[[23.5,195],[25.3,193.4]],[[22.3,195.6],[23.5,195]],[[21.1,196],[22.3,195.6]],[[19.4,200.4],[19.6,197.9]],[[19.6,197.9],[21.1,196]],[[29.1,185.8],[30.2,183.4]],[[29.2,187.8],[29.1,185.8]],[[29.9,188.2],[29.2,187.8]],[[31.4,187.3],[29.9,188.2]],[[32.6,187.1],[31.4,187.3]],[[36.2,184.3],[32.6,187.1]],[[35.9,181.6],[36.2,184.3]],[[33.6,180.7],[35.9,181.6]],[[31.8,181.2],[33.6,180.7]],[[30.2,183.4],[31.8,181.2]],[[43.6,180.4],[48.6,176.8]],[[42.6,181.5],[43.6,180.4]],[[42.7,183.1],[42.6,181.5]],[[46.1,188.1],[42.7,183.1]],[[47.7,189.3],[46.1,188.1]],[[50,189.1],[47.7,189.3]],[[56.4,181.7],[50,189.1]],[[56.8,180.5],[56.4,181.7]],[[55.9,178.8],[56.8,180.5]],[[52.5,176.7],[55.9,178.8]],[[48.6,176.8],[50.2,176.4]],[[50.2,176.4],[52.5,176.7]],[[7.2,160.8],[8,160.6]],[[6.9,162],[7.2,160.8]],[[7.3,164.5],[6.9,162]],[[8.1,165.1],[7.3,164.5]],[[8.9,164.3],[8.1,165.1]],[[9.1,162.5],[8.9,164.3]],[[8.6,161],[9.1,162.5]],[[8,160.6],[8.6,161]],[[17.7,173.5],[19.7,173]],[[15.6,175.1],[17.7,173.5]],[[15.1,177.5],[15.6,175.1]],[[15.6,179.2],[15.1,177.5]],[[16.9,179.9],[15.6,179.2]],[[18.6,181],[16.9,179.9]],[[20,181.1],[18.6,181]],[[23.4,179.5],[20,181.1]],[[25,178.9],[23.4,179.5]],[[25.9,177.8],[25,178.9]],[[26.1,175.8],[25.9,177.8]],[[25.2,173.9],[26.1,175.8]],[[23.5,173.3],[25.2,173.9]],[[36.3,164.7],[36.9,164.5]],[[35,166.7],[36.3,164.7]],[[35,168.3],[35,166.7]],[[35.6,169],[35,168.3]],[[36.6,168.7],[35.6,169]],[[37.1,167.4],[36.6,168.7]],[[37.9,166.7],[37.1,167.4]],[[37.8,165.1],[37.9,166.7]],[[36.9,164.5],[37.8,165.1]]],
	'r':[[[67.1,33.6],[69.6,32.1]],[[63.8,33.7],[67.1,33.6]],[[60.9,35.7],[63.8,33.7]],[[46.3,41.7],[60.9,35.7]],[[42.3,41.9],[46.3,41.7]],[[37.1,44.2],[42.3,41.9]],[[31.5,43.9],[37.1,44.2]],[[27.1,46],[31.5,43.9]],[[22.1,45.8],[27.1,46]],[[16.6,48.3],[22.1,45.8]],[[9.3,48.2],[16.6,48.3]],[[10.5,53.8],[0.7,56.2]],[[2.5,50.6],[9.3,48.2]],[[186.7,43.5],[177.3,43.5]],[[177.3,43.5],[177.3,50]],[[171.5,55.6],[171,55.6]],[[171.5,54.4],[171.5,55.6]],[[167.7,54.4],[171.5,54.4]],[[167.7,50],[167.7,54.4]],[[172.2,50],[167.7,50]],[[172.2,51.5],[172.2,50]],[[173,51.5],[172.2,51.5]],[[173,50],[173,51.5]],[[177.3,50],[173,50]],[[69.6,32.1],[78.2,32.1]],[[78.2,32.1],[85.3,29.8]],[[171,67],[167,67]],[[171,55.6],[171,67]],[[105.1,51.5],[101.3,48]],[[110,52.6],[105.1,51.5]],[[114.1,54.9],[110,52.6]],[[126.5,59.7],[114.1,54.9]],[[130.8,59.7],[126.5,59.7]],[[137.7,55.3],[130.8,59.7]],[[141.2,51.2],[137.7,55.3]],[[141.6,48.9],[141.2,51.2]],[[140,46.1],[141.6,48.9]],[[138.5,44],[140,46.1]],[[138.2,41.8],[138.5,44]],[[139.6,40.1],[138.2,41.8]],[[142.3,37.9],[139.6,40.1]],[[142.2,36.6],[142.3,37.9]],[[138.7,33.3],[142.2,36.6]],[[131.9,29.4],[138.7,33.3]],[[127.3,27.8],[131.9,29.4]],[[115.6,27.4],[127.3,27.8]],[[108.9,29.4],[115.6,27.4]],[[100.5,30.6],[108.9,29.4]],[[92.9,29.8],[100.5,30.6]],[[85.3,29.8],[92.9,29.8]],[[18.1,54.3],[10.5,53.8]],[[23.1,52],[18.1,54.3]],[[29,52.7],[23.1,52]],[[35.9,50.2],[29,52.7]],[[39.2,49.9],[35.9,50.2]],[[44.2,52.1],[39.2,49.9]],[[47.6,52.3],[44.2,52.1]],[[53.1,50.4],[47.6,52.3]],[[56.4,50],[53.1,50.4]],[[60.5,47.8],[56.4,50]],[[63.6,47.8],[60.5,47.8]],[[73.4,45.1],[63.6,47.8]],[[78.9,45],[73.4,45.1]],[[86.7,43.8],[78.9,45]],[[91.1,44.7],[86.7,43.8]],[[98.8,47],[91.1,44.7]],[[101.3,48],[98.8,47]],[[177,63],[177,55]],[[181,63],[177,63]],[[181,55],[181,63]],[[177,55],[181,55]],[[66,75.9],[66,71.1]],[[41.1,75.9],[66,75.9]],[[41.1,81],[41.1,75.9]],[[70.3,80.9],[41.1,81]],[[31.3,81.1],[2,80.9]],[[9.8,172],[9.8,179]],[[12.2,172],[9.8,172]],[[12.2,179],[12.2,172]],[[15,179],[12.2,179]],[[15.1,170],[15,179]],[[9.8,179],[7,179]],[[7,179],[7,170.1]],[[7,170.1],[15.1,170]],[[197.2,58.3],[198.1,56.8]],[[197.2,60.8],[197.2,58.3]],[[200.9,61],[197.2,60.8]],[[200.5,58.2],[200.9,61]],[[201.9,59],[200.5,58.2]],[[204,59],[201.9,59]],[[204,57],[204,59]],[[201.9,57],[204,57]],[[200.4,56.2],[201.9,57]],[[202.1,54.7],[200.4,56.2]],[[203.1,52.5],[202.1,54.7]],[[201.4,51.9],[203.1,52.5]],[[200.7,53.3],[201.4,51.9]],[[199.3,54.6],[200.7,53.3]],[[198.2,54.9],[199.3,54.6]],[[193,52.1],[198.2,54.9]],[[191.9,45.2],[193,52.1]],[[187.4,45.2],[191.9,45.2]],[[187.4,42.7],[187.4,45.2]],[[177,42.7],[187.4,42.7]],[[186.7,48.8],[186.7,43.5]],[[187.4,48.8],[186.7,48.8]],[[187.4,47],[187.4,48.8]],[[191.7,47.1],[187.4,47]],[[192.9,53.9],[191.7,47.1]],[[198.1,56.8],[192.9,53.9]],[[227.4,50.4],[224.9,50.4]],[[228.1,49.9],[227.4,50.4]],[[228.1,49],[228.1,49.9]],[[224.8,49],[228.1,49]],[[224.9,50.5],[224.9,59.1]],[[234,59.8],[234,63]],[[233.2,59.1],[234,59.8]],[[224.9,59.1],[233.2,59.1]],[[234,63],[223.9,63]],[[77.4,103.5],[72.9,120]],[[79.3,191.2],[80.2,191.6]],[[79.3,180.7],[79.3,191.2]],[[77.6,181.5],[79.3,180.7]],[[77.7,178.4],[77.6,181.5]],[[78.5,174.8],[77.7,178.4]],[[79.2,162.5],[78.5,174.8]],[[74.6,158.3],[79.2,162.5]],[[75.7,154.1],[74.6,158.3]],[[70,136],[75.7,154.1]],[[71.1,127.4],[70,136]],[[70.8,122.1],[71.1,127.4]],[[71.2,120.7],[70.8,122.1]],[[71.3,118.2],[71.2,120.7]],[[70.8,115.4],[71.3,118.2]],[[71.4,112.4],[70.8,115.4]],[[71.3,107.3],[71.4,112.4]],[[71.4,98.2],[71.3,107.3]],[[70.8,80.9],[71.3,84.9]],[[71.3,84.9],[71.8,85.2]],[[71.8,85.2],[70.5,90.5]],[[70.5,90.5],[71.1,95.9]],[[71.1,95.9],[71.4,98.2]],[[113.9,99.9],[113.9,92.6]],[[116.4,99.9],[113.9,99.9]],[[116.4,99.5],[116.4,99.9]],[[114.2,99.5],[116.4,99.5]],[[114.2,93],[114.2,99.5]],[[119.6,93],[114.2,93]],[[119.6,99.5],[119.6,93]],[[117.5,99.5],[119.6,99.5]],[[117.5,99.9],[117.5,99.5]],[[120,99.9],[117.5,99.9]],[[120,92.6],[120,99.9]],[[113.9,92.6],[120,92.6]],[[112.1,98.1],[109.5,98.1]],[[112.1,88.6],[112.1,98.1]],[[103.9,88.6],[112.1,88.6]],[[103.9,89.6],[103.9,88.6]],[[99.9,89.6],[103.9,89.6]],[[99.9,99],[99.9,89.6]],[[106,99],[99.9,99]],[[106,98.1],[106,99]],[[108.4,98.1],[106,98.1]],[[105.7,97.6],[108.4,97.6]],[[108.4,97.6],[108.4,98.1]],[[105.7,98.6],[105.7,97.6]],[[100.2,98.6],[105.7,98.6]],[[100.2,90],[100.2,98.6]],[[104.2,90],[100.2,90]],[[104.2,89],[104.2,90]],[[111.7,89],[104.2,89]],[[111.7,97.6],[111.7,89]],[[109.5,97.6],[111.7,97.6]],[[109.5,98.1],[109.5,97.6]],[[1,2],[1,1]],[[2,2],[1,2]],[[2,1],[2,2]],[[1,1],[2,1]],[[104,121.9],[101.5,121.9]],[[104,114.7],[104,121.9]],[[97.9,114.7],[104,114.7]],[[97.9,121.9],[97.9,114.7]],[[100.5,121.9],[97.9,121.9]],[[98.2,121.5],[100.5,121.5]],[[98.2,115.1],[98.2,121.5]],[[103.6,115.1],[98.2,115.1]],[[103.6,121.5],[103.6,115.1]],[[101.5,121.5],[103.6,121.5]],[[101.5,121.9],[101.5,121.5]],[[100.5,121.5],[100.5,121.9]],[[106.3,115.7],[112.6,115.7]],[[106.3,107],[106.3,115.7]],[[115.7,107],[106.3,107]],[[115.7,115.7],[115.7,107]],[[113.5,115.7],[115.7,115.7]],[[113.5,116.1],[113.5,115.7]],[[116.1,116.1],[113.5,116.1]],[[116.1,106.5],[116.1,116.1]],[[105.9,106.5],[116.1,106.5]],[[105.9,116.1],[105.9,106.5]],[[112.6,116.1],[105.9,116.1]],[[112.6,115.7],[112.6,116.1]],[[124.2,123.6],[126.5,123.6]],[[130.1,124],[127.6,124]],[[130.1,116.8],[130.1,124]],[[123.9,116.8],[130.1,116.8]],[[123.9,124],[123.9,116.8]],[[126.5,124],[123.9,124]],[[126.5,123.6],[126.5,124]],[[124.2,117.1],[124.2,123.6]],[[129.7,117.1],[124.2,117.1]],[[129.7,123.6],[129.7,117.1]],[[127.6,123.6],[129.7,123.6]],[[127.6,124],[127.6,123.6]],[[141.1,102.1],[134.2,102.1]],[[141.1,93.6],[141.1,102.1]],[[129.9,93.6],[141.1,93.6]],[[121.8,97.6],[129.9,93.6]],[[123.9,106.1],[121.8,97.6]],[[131.9,102.1],[123.9,106.1]],[[133.2,102.1],[131.9,102.1]],[[133.2,101.7],[133.2,102.1]],[[131.9,101.7],[133.2,101.7]],[[124,105.7],[131.9,101.7]],[[122.2,98],[124,105.7]],[[130,94.1],[122.2,98]],[[140.7,94.1],[130,94.1]],[[140.7,101.7],[140.7,94.1]],[[134.2,101.7],[140.7,101.7]],[[134.2,102.1],[134.2,101.7]],[[19.7,173],[21.5,173.7]],[[21.5,173.7],[23.5,173.3]],[[69.4,110.6],[69.7,100.1]],[[68.6,112.6],[69.4,110.6]],[[67.2,129.7],[68.4,125.7]],[[68.4,125.7],[68.4,122.8]],[[2,80.9],[1.7,100]],[[1.7,100],[2.3,116.2]],[[2.3,116.2],[4,128.5]],[[4,128.5],[5.3,132.9]],[[5.9,132.2],[6.7,131.9]],[[5.9,133.9],[5.9,132.2]],[[5.3,132.9],[6,150.1]],[[6.7,131.9],[7.1,132.6]],[[7.1,132.6],[7.1,133.9]],[[6.4,134.7],[5.9,133.9]],[[7.1,133.9],[6.9,135]],[[6.6,135.1],[6.4,134.7]],[[6.9,135],[6.6,135.1]],[[83.3,8.2],[79.8,8.3]],[[84.1,9.1],[83.3,8.2]],[[86,9.2],[84.1,9.1]],[[89.6,11.1],[86,9.2]],[[90.4,13.2],[89.6,11.1]],[[93.5,14.5],[90.4,13.2]],[[94.5,15.7],[93.5,14.5]],[[95.8,15.9],[94.5,15.7]],[[97.3,15.2],[95.8,15.9]],[[99.9,10.8],[97.3,15.2]],[[104.3,8.4],[99.9,10.8]],[[107.8,8.7],[104.3,8.4]],[[115.8,12.3],[107.8,8.7]],[[119.3,11.3],[115.8,12.3]],[[122.7,10],[119.3,11.3]],[[117.3,9.9],[122.7,10]],[[115.5,11],[117.3,9.9]],[[114.2,9.9],[115.5,11]],[[113.2,9.9],[114.2,9.9]],[[111.9,8.9],[113.2,9.9]],[[114.5,8.3],[111.9,8.9]],[[121.9,8.3],[114.5,8.3]],[[123.9,9.2],[121.9,8.3]],[[126.2,9.3],[123.9,9.2]],[[128,10.3],[126.2,9.3]],[[130.3,10.6],[128,10.3]],[[132.9,9.3],[130.3,10.6]],[[134.6,9.4],[132.9,9.3]],[[137.6,8.3],[134.6,9.4]],[[140,9.2],[137.6,8.3]],[[141.9,9.3],[140,9.2]],[[143.8,10.4],[141.9,9.3]],[[146.4,10.2],[143.8,10.4]],[[149.5,11.1],[146.4,10.2]],[[153.7,11.6],[149.5,11.1]],[[155.8,12.4],[153.7,11.6]],[[158.6,12.3],[155.8,12.4]],[[160.2,13],[158.6,12.3]],[[86.5,64.4],[80,62.2]],[[89.4,64],[86.5,64.4]],[[91.3,65.1],[89.4,64]],[[94.1,65.1],[91.3,65.1]],[[97.6,66.1],[94.1,65.1]],[[101.5,66.1],[97.6,66.1]],[[99.6,65.7],[101.5,66.1]],[[98.8,64.9],[99.6,65.7]],[[97.4,64.8],[98.8,64.9]],[[96.5,63.9],[97.4,64.8]],[[94.6,63.9],[96.5,63.9]],[[93.7,63.1],[94.6,63.9]],[[89.6,62.9],[93.7,63.1]],[[89,62.2],[89.6,62.9]],[[85.9,62],[89,62.2]],[[84.7,60.9],[85.9,62]],[[82.9,60.8],[84.7,60.9]],[[82,60],[82.9,60.8]],[[80.1,59.8],[82,60]],[[135.5,69.3],[131,68.1]],[[137.1,68.3],[135.5,69.3]],[[138.2,68.3],[137.1,68.3]],[[141.1,67.3],[138.2,68.3]],[[143.4,67.1],[141.1,67.3]],[[144,66.5],[143.4,67.1]],[[145.6,66.2],[144,66.5]],[[146.6,65.2],[145.6,66.2]],[[147.7,65.2],[146.6,65.2]],[[148.5,64.4],[147.7,65.2]],[[149.4,64.4],[148.5,64.4]],[[151.6,62.4],[149.4,64.4]],[[152.7,62.3],[151.6,62.4]],[[155,61.1],[152.7,62.3]],[[155.5,60.4],[155,61.1]],[[156.6,60.1],[155.5,60.4]],[[157,58.2],[156.6,60.1]],[[157.8,57.8],[157,58.2]],[[158.3,56],[157.8,57.8]],[[158.2,50.1],[158.3,56]],[[157.8,48.6],[158.2,50.1]],[[160,48],[157.8,48.6]],[[156.8,47.5],[156.9,46.1]],[[157.9,49.5],[156.8,47.5]],[[158,52.2],[157.9,49.5]],[[157.2,53.6],[158,52.2]],[[157.2,54.9],[157.2,53.6]],[[156.3,56],[157.2,54.9]],[[156.2,57.4],[156.3,56]],[[155.4,57.7],[156.2,57.4]],[[154.8,58.7],[155.4,57.7]],[[153.4,59],[154.8,58.7]],[[152.9,60.1],[153.4,59]],[[151.4,60.2],[152.9,60.1]],[[150.5,61.2],[151.4,60.2]],[[149.3,61.2],[150.5,61.2]],[[149,61.7],[149.3,61.2]],[[148.4,61.7],[149,61.7]],[[147.5,62.7],[148.4,61.7]],[[146.5,62.7],[147.5,62.7]],[[145.8,63.9],[146.5,62.7]],[[144.8,63.9],[145.8,63.9]],[[144.1,64.9],[144.8,63.9]],[[142.4,64.9],[144.1,64.9]],[[141.4,65.8],[142.4,64.9]],[[139.3,65.8],[141.4,65.8]],[[137.6,66.8],[139.3,65.8]],[[135.5,66.9],[137.6,66.8]],[[134.4,67.8],[135.5,66.9]],[[131,68.1],[134.4,67.8]],[[31.3,76],[31.3,81.1]],[[6.1,75.9],[31.3,76]],[[214,95.2],[230.2,95.2]],[[214,99.2],[214,95.2]],[[193.9,99.2],[214,99.2]],[[193.9,104.2],[193.9,99.2]],[[189.1,104.2],[193.9,104.2]],[[189.1,103.2],[189.1,104.2]],[[184.1,103.2],[189.1,103.2]],[[184.1,102.2],[184.1,103.2]],[[179,102.2],[184.1,102.2]],[[179,101.2],[179,102.2]],[[167.8,102.4],[167.8,101.2]],[[167.8,101.2],[179,101.2]],[[193,111.3],[193,109.2]],[[194.1,111.3],[193,111.3]],[[194.1,106.2],[194.1,111.3]],[[214.2,106.2],[194.1,106.2]],[[214.2,102.3],[214.2,106.2]],[[225.9,102.3],[214.2,102.3]],[[226.4,105.9],[225.9,102.3]],[[226.1,107.1],[226.4,105.9]],[[225.9,111.2],[226.1,107.1]],[[226.6,111.7],[225.9,111.2]],[[228.6,114.3],[226.6,111.7]],[[230.3,119.5],[228.6,114.3]],[[230.2,121],[230.3,119.5]],[[228.9,123.4],[230.2,121]],[[227.9,124.4],[228.9,123.4]],[[227.5,126.3],[227.9,124.4]],[[227.9,127.2],[227.5,126.3]],[[226.2,129.7],[227.9,127.2]],[[223.2,130.6],[226.2,129.7]],[[221.4,130.5],[223.2,130.6]],[[220.4,130.9],[221.4,130.5]],[[217.1,130.9],[220.4,130.9]],[[214.3,130.6],[217.1,130.9]],[[206.4,128.9],[214.3,130.6]],[[203.1,128.9],[206.4,128.9]],[[199.6,129.1],[203.1,128.9]],[[200.8,129.7],[199.6,129.1]],[[196.1,130.6],[200.8,129.7]],[[191.8,131.8],[196.1,130.6]],[[191,131.8],[191.8,131.8]],[[184.6,133.2],[191,131.8]],[[181.9,133.1],[184.6,133.2]],[[181,132.8],[181.9,133.1]],[[175.9,132.1],[181,132.8]],[[171.4,131.9],[175.9,132.1]],[[168.9,133.1],[171.4,131.9]],[[167.6,133.1],[168.9,133.1]],[[172.2,105.8],[167.8,102.4]],[[176.5,108.1],[172.2,105.8]],[[178.8,108.1],[176.5,108.1]],[[178.8,109.1],[178.8,108.1]],[[183.9,109.1],[178.8,109.1]],[[183.9,110.1],[183.9,109.1]],[[188.9,110.1],[183.9,110.1]],[[188.9,111.3],[188.9,110.1]],[[191,111.3],[188.9,111.3]],[[191,110],[191,111.3]]],
	'y':[],
	'g':[[[3.4,159.3],[-6.1,159.4]],[[-13.8,146.7],[3.4,159.3]],[[-1.3,151.8],[3.4,159.2]],[[10.9,102.2],[1.9,102.2]],[[10.9,132.8],[10.9,102.2]],[[5.9,132.8],[10.9,132.8]],[[5.9,132.8],[5.9,132.8]],[[5.9,132.8],[5.9,132.8]],[[5.9,142.2],[5.9,132.8]],[[21.3,142.3],[5.9,142.2]],[[4.2,145.9],[21.4,145.9]],[[4.2,132.8],[4.2,145.9]],[[1.2,132.8],[4.2,132.8]],[[1.1,89.8],[1.2,132.8]],[[0.8,89.8],[1.1,89.8]],[[0.8,84.2],[0.8,89.8]],[[63.9,84.2],[0.8,84.2]],[[63.9,124.1],[63.9,84.2]],[[78,124.1],[63.9,124.1]],[[78,129.8],[78,124.1]],[[63.9,129.8],[78,129.8]],[[63.9,132.8],[63.9,129.8]],[[30.9,132.8],[63.9,132.8]],[[30.9,149.3],[30.9,132.8]],[[26.2,149.4],[30.9,149.3]],[[26.2,132.9],[26.2,149.4]],[[19.1,132.9],[26.2,132.9]],[[19.1,89.7],[19.1,132.9]],[[1.9,89.8],[19.1,89.7]],[[1.9,102.2],[1.9,89.8]],[[58.2,114.7],[58.2,127.1]],[[58.2,127.1],[24.9,127.2]],[[24.9,127.2],[24.9,89.9]],[[34.2,114.7],[58.2,114.7]],[[34.3,96.3],[34.2,114.7]],[[38.9,96.3],[34.3,96.3]],[[39,110.1],[38.9,96.3]],[[58.1,110.1],[39,110.1]],[[58.1,89.8],[58.1,110.1]],[[24.9,89.9],[58.1,89.8]],[[191,109.3],[191,111.9]],[[191.6,108.9],[191,109.3]],[[191.6,107.5],[191.6,108.9]],[[191,107.2],[191.6,107.5]],[[191,101.9],[191,107.2]],[[191.7,97.6],[191,101.9]],[[192.2,97.5],[191.7,97.6]],[[192.4,97.1],[192.2,97.5]],[[192.1,95.6],[192.4,97.1]],[[192.4,94],[192.1,95.6]],[[200,94],[192.4,94]],[[202.5,92.7],[200,94]],[[202.8,93.1],[202.5,92.7]],[[203.3,93],[202.8,93.1]],[[203.3,92.4],[203.3,93]],[[206,91],[203.3,92.4]],[[211,92],[206,91]],[[211,84],[211,92]],[[231,84],[211,84]],[[231,103],[231,84]],[[211,103],[231,103]],[[211,94],[211,103]],[[206,92.9],[211,94]],[[200,96],[206,92.9]],[[194,95.9],[200,96]],[[193,101.9],[194,95.9]],[[193,103.6],[193,101.9]],[[192.6,104.2],[193,103.6]],[[192.6,105],[192.6,104.2]],[[193,105.7],[192.6,105]],[[193,112],[193,105.7]]],
	't':[],
	'b':[[[11.8,174.9],[11.8,162.4]],[[11.8,162.4],[20,162.4]],[[20,162.4],[20,178]],[[20,178],[21.5,178]],[[10.3,161],[10.3,174.9]],[[21.5,161],[10.3,161]],[[21.5,178],[21.5,161]],[[57.9,90.2],[42.3,90.2]],[[42.3,90.2],[42.3,79]],[[57.9,109.3],[57.9,90.2]],[[80,109.3],[57.9,109.3]],[[57.9,110.9],[80,110.9]],[[57.9,122.8],[57.9,110.9]],[[25.2,122.9],[57.9,122.8]],[[25.2,111],[25.2,122.9]],[[1.2,110.9],[25.2,111]],[[1.2,109.3],[1.2,110.9]],[[25.2,109.3],[1.2,109.3]],[[25.2,90.2],[25.2,109.3]],[[40.7,90.2],[25.2,90.2]],[[40.7,79],[40.7,90.2]]],
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
	[`collision`,	(x, y) => {data_terrain[player.layer].push([[x - 1, y - 1], [x + 1, y + 1]])}],
	[`trigger`,		(x, y) => {editor_enum = editor_listT;}], //see listT
	[`misc`,		(x, y) => {}], //audioSource, comment, audio log
	[`entity`,		(x, y) => {editor_enum = editor_listE;}], //npc, moth, dreamskater, etc
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
		var ents = entities[player.layer];
		var entsOptim = world_entities[player.layer];

		if (ents.includes(fromObj)) {
			ents.splice(ents.indexOf(fromObj), 1);
		}
		if (entsOptim.includes(fromObj)) {
			entsOptim.splice(entsOptim.indexOf(fromObj), 1);
		}
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
		ents.push(entity);
	},
}
var editor_listR = {
	str: Object.keys(data_textures.Roofs).filter(a => !(["sheet", "sheet2", "tileSize", "waterfall"].includes(a))),
	create: (i) => {
		var dimensionData = data_textures.Roofs[editor_listR.str[i]];
		
		[editor_entity.sx, editor_entity.sy] = dimensionData[0];
		[editor_entity.w, editor_entity.h] = dimensionData[1];
		editor_entity.offsetX = -dimensionData[2][0];
		editor_entity.offsetY = -dimensionData[2][1];

		editor_buttons[2].label = `txtr: ${editor_listR.str[i]}`;
	}
}
var editor_listT = {
	str: [
		`cutscene`,
		`music`,
		`portal`,
		`layer`,
		`respawn`,
		`arbitrary`
	],
	create: (i, fromObj) => {
		var entity;
		var x1 = camera.x - 1;
		var x2 = camera.x + 1;
		var y1 = camera.y - 1;
		var y2 = camera.y + 1;
		var layer = player.layer;
		switch (i) {
			case 0:
				break;
			case 1:
				entity = new Trigger_Music(x1, y1, x2, y2, layer, 0.5, data_persistent.music, "none");
				break;
			case 2:
				entity = new Portal([[x1, y1], [x2, y2]], layer, [1, -1], false, true);
				break;
			case 3:
				entity = new Trigger(x1, y1, x2, y2, layer, 0.5, "layer", (layer == 'r') ? 'gg' : 'rr');
				break;
			case 4:
				break;
			case 5:
				entity = new Trigger(x1, y1, x2, y2, layer, 0.5, )
				break;
		}
		if (entity) {
			entities[layer].push(entity);
		}
	}
}

var editor_locations = [
	[0, 0, 'r'],
	[20, 163, 'r'],	//temple enter
	[158, 73, 'r'], //bismuth garden start
	[155, 17, 'r'], //LLC start
	[113, 123, 'r'], //town start
	[32, 116, 'b'], //temple inside
	[192, 113, 'r'] //crystal cave entrance
];
var editor_polyPoints = undefined;
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


var entities_pre = [
	"Roof~108.4~98.1~r~1~data_textures.Roofs.villageHouseL~[[100,98.8],[100,89.8],[104,89.8],[104,88.8],[111.9,88.8],[111.9,97.9],[105.8,97.9],[105.8,98.9]]",
	"Roof~117~99.9~r~1~data_textures.Roofs.villageHouseS~[[114,99.7],[114,92.8],[119.8,92.8],[119.8,99.7]]",
	"Roof~133.1~101~r~1~data_textures.Roofs.villageHouseXL~[[121.9,97.7],[129.9,93.8],[140.9,93.8],[140.9,101.9],[132,101.9],[124,105.9]]",
	"Roof~39.3~106.1~r~1~data_textures.Roofs.badTree1~[]",
	"Roof~10.3~107.8~r~1~data_textures.Roofs.badTreeL2~[]",
	"Roof~63.8~112.7~r~1~data_textures.Roofs.badTree2~[]",
	"Roof~23.1~113.7~r~1~data_textures.Roofs.badTree2~[]",
	"Roof~111~116~r~1~data_textures.Roofs.villageHouseM~[[106,115.9],[106,106.7],[115.9,106.7],[115.9,115.9]]",
	"Trigger~layer~190.9~110.2~193.1~110.2~r~0.5~yg",
	"Roof~52.6~118.9~r~1~data_textures.Roofs.badlandHouse~[]",
	"Roof~101~121.9~r~1~data_textures.Roofs.villageHouseS~[[98,121.7],[98.1,114.9],[103.8,114.9],[103.8,121.7]]",
	"Roof~43~122.3~r~1~data_textures.Roofs.badTree2~[]",
	"Roof~127~123.9~r~1~data_textures.Roofs.villageHouseS~[[124,123.8],[124,116.9],[129.9,117],[129.9,123.8]]",
	"Roof~10.9~124.4~r~1~data_textures.Roofs.badTree1~[]",
	"Roof~29~125.9~r~1~data_textures.Roofs.badTree4~[]",
	"DreamSkater~18.5~125.1~r",
	"Roof~55.1~131.9~r~1~data_textures.Roofs.badTree3~[]",
	"DreamSkater~50.5~131.8~r",
	"DreamSkater~35.7~139.8~r",
	"Roof~19.2~143.3~r~1~data_textures.Roofs.badTreeL2~[]",
	"Roof~44.6~144.4~r~1~data_textures.Roofs.badTree2~[]",
	"Roof~54.3~145~r~1~data_textures.Roofs.badLump~[]",
	"Roof~24.5~148.8~r~1~data_textures.Roofs.badTree2~[]",
	"Roof~34.3~151.2~r~1~data_textures.Roofs.badTree1~[]",
	"Roof~12.3~152.5~r~1~data_textures.Roofs.badLump~[]",
	"DreamSkater~21.2~155.0~r",
	"DreamSkater~51.3~158.0~r",
	"Roof~24~160.8~r~1~data_textures.Roofs.badLump~[]",
	"Roof~46.9~164.4~r~1~data_textures.Roofs.badTreeL1~[]",
	"Trigger~layer~9.5~176.0~12.5~176.0~r~0.5~pb",
	"Roof~58.8~173~r~1~data_textures.Roofs.badTree1~[]",
	"Roof~10.8~178.4~r~1~data_textures.Roofs.badlandShed~[]",
	"DreamSkater~11.0~179.1~r~DSblocker~charge",
	"DreamSkater~21.7~188.0~r",
	"Roof~39.4~188.7~r~1~data_textures.Roofs.badTree1~[]",
	"DreamSkater~57.8~192.6~r",
	"DreamSkater~14.8~212.8~r",
	"Roof~14.8~214.7~r~1~data_textures.Roofs.badTree3~[]",
	"Portal~[[34.2,104],[39,104]]~g~[-8,37]~true~false",
	"Portal~[[16,90.1],[16,84]]~g~[39,0]~false~true",
	"Portal~[[42,127],[42,133]]~g~[-31,-43.1]~false~true",
	"Trigger~layer~190.8~111.2~193.1~111.2~g~0.5~rr",
	"Portal~[[10,112],[10,108.8]]~b~[62,0]~false~true",
	"Trigger~layer~9.6~177.0~12.4~177.0~b~0.5~rr",
	"Portal~[[22,170.5],[19.6,170.5]]~b~[18.5,-97.2]~false~true",
	"Trigger~layer~16.5~160.7~16.5~162.7~b~0.5~tb",
	"Trigger~layer~15.2~160.7~15.2~162.7~b~0.5~pb"
];


var entities = {
	r: [],
	g: [],
	b: []
}
var world_entities;

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

	//load bg as soon as possible, because it's slow
	bg_objR = rasterizeBG(bg_chunkArr, -1, -1);
	bg_objG = rasterizeBG(bg_chunkArg, -1, -1);
	bg_objB = rasterizeBG(bg_chunkArb, -1, -1);

	menu_texture = new Texture(getImage(`img/menuBg.png`), data_textures.tileSize, [1e1001, [16, 12], [8, 6], [[0, 0]]], false);
	render_chocoOverlay = new Texture(data_textures.TileEntities.sheet, data_textures.tileSize, data_textures.TileEntities.chocWorld, false);
}

function setup2() {
	canvas = document.getElementById("convos");
	canvas2 = document.getElementById("convosSecret");
	ctx = canvas.getContext("2d");
	cty = canvas2.getContext("2d");

	loadingText.innerHTML = "";

	entities = importEntities(entities_pre);
	world_entities = entities;

	// importWorld(data_terrain.replaceAll("\n", ""));

	player = new Warrior(17.55, 35.65, 'r');
	entities.r.push(player);
	audio_bgChannel.target = data_audio["outside"];

	handleResize();
	localStorage_read();

	game_mainLoop = main;
	animation = window.requestAnimationFrame(runGame);
}

function runGame() {
	//I can modulate by a large power of 10. This won't break anything because there's nothing in the world that's on a global timer (except for the world background)
	var newTime = performance.now() % 1E8;
	var dt = clamp(newTime - dt_tLast, 1, 30) / 1000;
	dt_tLast = newTime;
	dt_buffer.push(dt);
	if (dt_buffer.length > dt_buffer.maxLen) {
		dt_buffer.shift();
	}

	//TODO: uncomment this in the final game, it makes error reporting easier for non-coders
	// try {
		game_mainLoop(dt);
		animation = window.requestAnimationFrame(runGame);
	/*} catch(e) {
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
	} */
}

function runWorld(dt, fightActive) {
	//audo 
	audio_bgChannel.tick(dt);

	//camera
	camera.tick(dt);
	
	//pulsating bg bit
	ctx.fillStyle = `hsl(${dt_tLast * 0.01}, 50%, 30%)`;
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	//handle all world layers
	if (camera.layers.r > 0) {
		ctx.globalAlpha = camera.layers.r;
		runWorldLayer(bg_objR, entities.r, dt);
	}
	if (camera.layers.g > 0) {
		ctx.globalAlpha = camera.layers.g;
		runWorldLayer(bg_objG, entities.g, dt);
	}
	if (camera.layers.b > 0) {
		ctx.globalAlpha = camera.layers.b;
		runWorldLayer(bg_objB, entities.b, dt);
	}
	ctx.globalAlpha = 1;

	//every once in a while check on who gets to be in world_entities
	var cTime = dt_tLast / 1000;
	if (cTime % 1 < 0.5 && (cTime - dt_buffer[dt_buffer.length-1]) % 1 > 0.5) {
		// updateWorldEntities();
	}

	//run the deferred function if there is one
	if (deferredFunc != undefined) {
		deferredFunc(dt);
		deferredFunc = undefined;
	}

	//save the game if in the main world without conversing
	if (player.convoPartner == undefined && animation % 180 == 1) {
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

function runWorldLayer(terrainObj, entityArr, dt) {
	//background filter, if active
	if (render_bgFilterOpacity > 0) {
		var alphaStore = ctx.globalAlpha;
		ctx.globalAlpha = render_bgFilterOpacity;
		ctx.fillStyle = color_bg;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.globalAlpha = alphaStore;
	}

	//draw terrain 
	drawWorldBG(terrainObj);

	//handle entities - ticking and drawing
	//make a copy of the array so that adding/removing entities doesn't mess up the loop
	//order world entities
	sortEntities(entityArr);
	entityArr.slice(0).forEach(v => {
		v.tick(dt);
		v.draw(dt);
		
		if (v.DELETE) {
			//make sure to not softlock the player
			if (player.convoPartner == v) {
				v.endConversation();
			}
			entityArr.splice(entityArr.indexOf(v), 1);
		}
	});
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
			if (editor_polyPoints != undefined) {
				editor_polyPoints = undefined;
				editor_pointSelected = undefined;
				return;
			}

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

	if (editor_polyPoints != undefined) {
		editor_handleMDPoly(spa);
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

	if (editor_pointSelected != undefined) {
		//move selected point
		editor_polyPoints[editor_pointSelected] = spq;
		editor_entity.calculateColliderBounds();
		return;
	}

	if (editor_entity != undefined) {
		if (editor_entity.homeX != undefined) {
			[editor_entity.homeX, editor_entity.homeY] = spq;
		}
		if (editor_entity.x != undefined && !button_alt) {
			[editor_entity.x, editor_entity.y] = spq;
		}

		//this boolean is a mess but it basically accounts for editing positions of collision lines, triggers, and portals, while excluding other possible cases
		if (editor_entity.line != undefined && editor_entity.type != undefined && editor_entity.type != "collision") {
			var p = editor_entity.line[editor_entity.index];
			[p[0], p[1]] = spq;
		}
		return;
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