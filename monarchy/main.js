window.onload = setup;
window.onresize = handleResize;
window.onkeydown = handleKeyDown;
window.onkeyup = handleKeyUp;
window.onmousedown = handleMouseDown;
window.onmousemove = handleMouseMove;
window.onmouseup = handleMouseUp;

var animation;
var animation_fps;

var audio_bgChannel = new AudioChannel(0.5);
var audio_sfxChannel = new AudioContainer(0.5);
var audio_fadeTime = 40;

var base64 = `0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+=`;
var base64_inv = invertList(base64);

var button_acceptingInput = undefined;
var button_acceptingOutput = undefined;
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

	'KeyZ': 'Interact',
	'Enter': 'Interact'
};
var camera = new Camera(0, 0, 40);
var camera_xBlocks = 16;


var cursor = {
	x: 0,
	y: 0,
	down: false,
	pastPoint: [0, 0]
};




var color_bg = "#000000";
var color_castleEntities = "#888888";
var color_health = "#87097C";
var color_magic = "#9966FF";
var color_textBackground = "#04061D";
var color_textDefault = "#FFFFFF";
var color_editorGrid = "#222222";
var color_editorSquares = "#662266";
var color_editorHighlight = "#FF00FF";
var color_editorHighlight2 = "#FF8800";
var color_editorPolygon = "#FFFF00";
var color_menuPrimary = "#FEFF99";
var color_menuSecondary = "#DBD9AB";
var color_menuText = "#4B4C54";


//music is the actual data
//bpm is beats per minute
//activeBeats is how long the song should be before looping = measures * beats per measure 
//inactive beats is for if the loop starts part of the way through the song (the inactive beats are not looped)
var data_audio = {
	//music
	"angelIntro": {
		music: new Audio(`aud/angelGreetings.mp3`),
		loop: false
	},
	"angelFight": {
		music: new Audio(`aud/divineHierarchy.mp3`),
		bpm: 120,
		activeBeats: 16 * 8,
		inactiveBeats: 4 * 8
	},
	"castle": {
		music: new Audio(`aud/imInYourWalls.mp3`),
		bpm: 160,
		activeBeats: 32 * 6
	},
	"guardFight": {
		music: new Audio(`aud/enGuard.mp3`),
		bpm: 130,
		activeBeats: 16 * 8,
	},
	"knightFight": {
		music: new Audio(`aud/knightFight.mp3`),
		bpm: 160,
		activeBeats: 16 * 8
	},
	"lordFight": {
		music: new Audio(`aud/lordBattle.mp3`),
		bpm: 100,
		activeBeats: 11 * 8
	},
	"mountain": {
		music: new Audio(`aud/mountain.mp3`),
		bpm: 140,
		activeBeats: 8 * 8
	},
	"outside": {
		music: new Audio(`aud/grassyDay.mp3`),
		bpm: 140,
		activeBeats: 12 * 8,
	},
	"witchHouse": {
		music: new Audio(`aud/wizardsHome.mp3`),
		bpm: 150,
		activeBeats: 18 * 6
	},
	"heartbeat": {
		music: new Audio(`aud/heartbeat.mp3`),
		bpm: 100,
		activeBeats: 8 * 8
	},
	"end": {
		music: new Audio(`aud/theEnd.mp3`),
		loop: false
	},
	"none": {
		music: undefined, 
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
};
var data_fleeting = {};
/*
chocos - the statuses of the different chocolate entities
ends - binary representation of the endings the player's recieved
boss - integer representation of the bosses the player's past (0 - before guard, 1 - after guard, 2 - after queen / knights)
pastLord - whether the player's beaten the lord or not. This is a separate tag because it's optional for most game progression
first - determines whether to show the intro cutscene or not
magic - does the player have magic
weapon - what weapon, if any, does the player have
alias - should images be aliased
x - player x storage
y - player y storage
m - music storage

data gets saved every few seconds as long as the player isn't in a conversation or fighting. This is to prevent weird music chicanery from happening 
(as well as potential skips where player loads into a cutscene area they shouldn't)
*/
var data_persistent = {
	chocos: [0,0,0],
	ends: 0,
	boss: 0,
	pastLord: 0,
	lordFirst: true,
	magic: false,
	weapon: 0,
	alias: false,
	vols: [0.5,0.5],
	wRoom: 0,
	x: 17.55,
	y: 35.65,
	m: 'outside'
};
var data_persistentDefaults = JSON.parse(JSON.stringify(data_persistent));

var data_terrain = `
+~+~320~308~0*G80*T180*W800080*=0*R180*U90*W9*880*=0*N10*V10*W98019*40*=0*O10*V180*S999800180*=0*R90*6R*BO0*E80*R180*5180*=0*Q180*53R*C0*E80*R90*6180*=0*Q10*6R*D0*E80*P1980*6180*=0*Q10*6R*D0*E80*P10*8180*=0*Q
90*6RRO0*73RR0*E80*P90*81800019*z80*M180*6RR0*9RR0*E80*P80*8180001I*z80*M10*7RR09*70RR0*E80*P80*980001H9*JH9*dA80*M10*7RR080*510RRO0*C180*P80*980001H0*I1H0*dA80*M90*7RR080*510R*80*710*P180*980001H0*I1H0*dA80*
L180*7RR080*510R*8O0*610*P10*A80001H0*I1H19*G80019*L80*J90*8RR080*510R*90*690*P90*A80001H0*I1H1s*G8001s*L80*H9980*8RR080*510R*90*680*O180*A80001H0*I1H1s*G9*4s*L80*G980*ARR080*510*73RR0*680*O10*B80001H0*I1H1s*
Gjjjfs*L80*E9990*BRR09009*40*8RR0*680*O10*B80001H9*G801H1s*Gjjjfs*L80*E90*DRR0Ca*5X9*70RR0*680*O10*B80001I*H801H1s*Gjjjfs*L80*B19980*DRR0Ca*CX0RR0*680*O90*B80001H9*AA9*4A801H1s*Gjjjfs*L80*B980*FRR0Ca*CX0RR0*6
90*O80*B80001H0*AA8000A801H1s*G9*4s*L80*91990*GRR0Ca*CX0RR0*6180*M180*B80001H0*AA8000A801H1s*G8001s*L80*9980*HRR0Ca*49*4a*4X0RR0*780*M10*C80001H0*AA8000A801H1s*G8001s*L80*71990*IRR0Ca*49*4a*4X0RR0*780*M10*C80
001H0*AA8000A801H1s*G8001s*L80*7980*JRR0Ca*49*4a*4X0RR0*780*M10*C80001H0*AA80009801H1s*G8001s*L80*790*KRR0Ca*49*4a*4X0RR0*780*M10*C80001H0*AA80*61H1s*G8001s*L80*SRR0Ca*CX0RR0*780*M90*C80001H0*AA80*61H1s*G8001
s*L80*SRR0Ca*CX0RR0*790*M80*C80001H019*F81H9s*G8001s*L80*SRR0Ca*CX0RR0*790*L180*C80001H01s*F81IHs*G8001s*L80*SRR0Ca*CX0RR0*710*L10*D80001H01s*F8199s*G8001s*L80*SRR0Ca*CX0RR0*7180*K10*D80001H01s*F8001s*G8001s*
L80*SRR0Ca*CX0RR0*890*K10*D80001H01s*F8001s*G8001s*L80*SRR0Ca*CX0RR0*890*K10*D80001H01s*F8001s*G8001s*L80*SRR0Ca*CX0RR0*810*K10*D80001H01sssn9*B8001s*G8001s*L80*SRR0Ca*CX0RR0*8180*J10*D80001901sssns9**5s8001s
*G8001s*L80*SRR0Ca*CX0RR0*990*J90*D80*61sssns9**5s8001s*G8001s*L80*SRR0Ca*CX0RR0*990*J80*D80*61sssns*B8001s*G8001s*L80*SRR09*6aa9*60RR0*9180*I80*D80*61sssns*B8001s*G8001s*L80*SRR0*7RR0*7RRO0*990*I80*D80001901
sssns*89ss80019*G8001s*L80*SRR0*7RR0*7RRO0*990*I80*D80001H01sssns*89ss80*M1s*L80*SR*KO0*910*H180*D80001H01sssnss9s*880*M1s*L80*SR*KO0*9180*G10*E80001H01sssnss9s*6nE80*M1s*L80*S3R*J0*B90*G10*E80001H01sssnss9s*
6nE80*M1s*L80*S3R*J0*B180*F90*E80001H01sssnss9s*89*Os*Fms*580*y990*E80*E80001H01sssns*u80*z180*C180*E80001H01sssns*u80*+90*C10*F90001H01sssns9nE9nE9s*m80*+180*B90*F90001H01sssns9nE***3s*k80*=9980*980*F90001H0
1sssns9nE9nEsnEs9*Jss999s*L80*=00990*7180*F90001H01sssns9nE9nEs*48001H0*D1ss801s*L80*=0001990*510*G90001H019*F8001H0*D1ss8019*L80*=0*599900090*G90001H0*H9*580*C1ss80*=0*V180980*G80001H0*H99Ess80*C1ss80*=0*W99
80*H80001H9*JEss9*B801ss80*=0*q80001I*IHsss9*C801ss80*=0*q80001H9*Isss9*C801ss9*O80*w990*V9*5H9980*E1sss9*C801ssj*O80*w990*VAI*680*F1sss99s*8n9801ssj*O80*w990*V9*6A80*F1s*Dn9801ssj*O80*w990*V80*5A80*F1s*Dn980
1ssj*O80*=0*6990*K80*5A80*F1s*Dn98019*Ojj80*=0*6990*K80*5A80*F1s*Dn980*P1jj80*=0*6990*K80*5A80*F1s*59*6ssn980*P1jj80*=0*6990*K80*5A80*F1s*59*6ssn9819*Pjj80*L9*90*z80*5A80*F1Es*49*6ssn981j*R80*L80*710*z80*5A80
*F1Es*49*6ssn981j*R80*L8990*510*L9980*b80*5A80*F1Es*Cn981j*R80*L8990*510*J998090*b80*5A80*F1Es*Cn981j*R80*7R*E0*810*I98000180*C10*N80*5A80*F1s*F81jj9*Gss9*780*7R*E0*810*H990*590*C980*M80*5A80*F1s*F81jj819*70*
61ss810080080*7R*E0*810*G980*6180*A1990*M80*5A80*F1s*F81jj81s*6n09*6ss9*780*7R*E0*810*F180*7180*A98180*L80*5A80*F1s*F81jj819*6n0*61ss810080*J3RR0080*710*E190*8180*4990*490190*L80*5A80*F1s*F81jj819*6n0*61ss810
080*KRR0080*710*D190*9980*4990*4900980*K80019*G8001s*F81jj819*4Esn0019*4ss9*780*HRR008090*510*C190*A90*5990*4900180*K800019E**4s9*5s8001s*F81jj819j*49n001j*9Djjj80*HRR008090*510*C90*A980*5990*4900180*K800019E
**4s9*5s8001s*F81jj819j*49*5j*9Djjj80*HRR0080*710*B180*81980*C900190*K800019E**4s*780019*7jj9*681jj819j9j*GDjjj80*HRR009*90*B10*9980*C1800090*K800019E**4s*780*91jj80*61jj819j9j*B9j*4Djjj80*HRR0*M90*8190*D1800
090*K80001s*E980019*7jj9*8jj819j*D9j*4Djjj80*HRR0*M80*8180*D98000180*J80001s*E980*91jj80*61jj819j*E9jjjDjjj80*HRR0*L180*890*E90*4180*J80001s*E980*91jj80*61jj81999j*599j*59jjjDjjj80*HRR0*L10*980*E90*4180*J8000
1s*E980*91jj80*61jj81999j*581j*9Djjj80*HRR0*L10*8180*E90*4180*J800019*9Es*4980*91jj80*61jj81999j*581j*49*5Djjj80*HRR0*L90*8180001980*890*4180*J80001s*9Es*4980*91jj80*61jj81999j*581j*49*5Djjj80*HRR009*90*A80*9
80001980*890*4180*J80001s*9Es*4980*91jj80*61jj819*881j*49*5Djjj80*HRR0080*710*A80*980001980*880*4190*J80001s*9Es*4980*91jj80*61jj819*91j*9Djjj80*HRR008000900910*A80*8180001980*7180*590*J80001s*9Es*580*91jj80*
61jj81Ens*691j*59*4Djjj80*HRR008000900910*A80*980*D180*590*J80001s*9Es*59*Bjj9*8jj99Es*791j*59*4Djjj80*HR*40*7910*A90*980*D90*690*J80001s*9Es*Aj*Ks*891j*49*5Djjj80*HR*40*7910*A10*990*D90*5190*J80001s*9Es*Aj*K
s*891j*49j*4Djjj80*HR*40*810*A180*810*D90*5110*J80001s*9Es*Aj*Ks*891j*9Djjj80*HR*40*810*A180*8180*C90*5110*J80001s*9Es*Aj*Ks*891j*9Djjj80*HRR0080*6910*B980*7180*C90*5110*J80001s*F9*Bjj9*8jj99Es*791j*9Djjj80*H
RR0080*6910*B190*880*C90*610*J80001s*F80*91jj80*61jj81Es*791j*9Djjj80*HRR0080*6910*C90*880*C90*690*J800019*F80*91jj80*61jj81Es*7919*9Djjj80*HRR0080*6910*C10*880*C90*690*J80*T1jj80*61jj81Es*791j*D80*HRR0080*71
0*C180*780*C90*680*J80*T1ss80*61jj81Es*791j*D80*HRR009*90*D80*780*C80*5180*J80*T1ss80*61jj81Es*791j*D80*HRR0*O90*780*C80*510*J180019*G80*91ss80*61jj819*919*D800180*DRR0*O180*5180*B180*510*J180*T1ss80*61jj80*6
10080*H180*DRR0*P90*590*6990*4180*510*J180*T1ss80*619980*619980*H180*DRR0*P18000190*6990*4180*510*J180*T1ss80*b180*DRR0*Q9000980*6990*410*610*J180*T1ss80*b180*DRR0*Q199980*7990*490*610*J180*T1ss80*b180*DRR009
*90*X90*610*J180*T1ss80*b180*DRR0080*710*X90*610*J19*Vss9*d80*DRR0080*710*X90*610*J19*40*Q1En80*X89*580*CRR0080*710*X90*6180*oEn0*Y80*4180*CR*40*4900010*X90*790*b9*DEn0*X180*58990*AR*40*4900010*X90*710*Z19*EE
n0*X180*5980*BR*40*4909010*X90*710*T9*9009*AEn0*X10*JR*40*4909010*X90*710*U19*580*49*9En9*880*O90*N80*710*M19990*790*710*oEn0*8980*N80*N80*710*M9001980*580*710*oEn0*99*G80*6180*N80*710*K9980*499800080*710*oEn
0*P990*510*O80*710*J980*8900180*710*oEn0*Q19*4010*O80*710*I990*919990*810*n10080*T1910*O9*90*H180*D10*810*n10*X990*o180*D10*810*=0*L80*p80*D10*810*=0*L80*p80*D90*810*=0*L80*p80*D90*8180*=0*K80*p80*D90*980*=0*
K80*p90*D90*990*=0*K80*p10*D90*910*As0*=0*8180*p180*C90*910*=0*J10*Ss0*O80*C90*910*Ls0*y90*Ss0*O80*C10*910*Ls0*y90*r90*C180*810*=0*J80*r190*C80*810*=0*J80*s180*B80*810*6s0*5s0*Hs0*p80*t990*A80*810*6s0*5s0*Hs0
*p80*u190*980*810*Fs0*=00080*v190*880*810*Fs0*=00080*Qs0*V190*780*890*=0*J80*Qs0*W1990*590*7180*=0*I180*Vs0*T190*4180*690*=0*J180*Vs0*U190*4800019980*=0*J10*=0180008000180*B60*=0*990*=009000801990*C60*=0*990*
Ts0*Z190090180*7s0*=0*F90*Ts0*a19*50*8s0*=0*F90*e60*=0*t80*e60*=0*t80*X60*=0*z180*X60*=0*z180*as0*Rs0*6s0*=0*N980*as0*Rs0*6s0*=0*N980*is0*Cs0*Hs0*=0*J980*is0*Cs0*Hs0*=0*J90*fs0*=0*s90*fs0*=0*s90*+s0*=0*X90*+s
0*=0*W190*ls000s0*=0*h190*ls000s0*=0*h90*=0*=0*W190*=0*=0*W190*v60*=0*b990*vm0*=0*b80*=0*=0*W180*=0*=0*W980*rs0*=0*f980*rs0*=0*e1980*=0*=0*V1980*=0*=0*V90*=0*=0*X90*=0*=0*W190*ws0*=0*a90*xs0*=0*Z180*=0*=0*V99
0*=0*=0*V180*=0*=0*W90*=0*=0*W180*ys0*=0*X190*zs0*=0*X980*=0*=0*V990*=0*=0*V180*=0*460*=0*Q990*=0*560*=0*P180*=0*=0*U9990*=0*=0*U180*=0*=09990*M19*60*=0*=1990990*K1980*=0*Cs0*b19980*B9*40*49*40*F19980*=0*Ds0*
b901980*9990*91990*D9980*=0*o199800199900019*40*B19*40*81990*=0*q90*89801980*G19*B80*=0*q980*819990*=0*=0*J180*=0*M80*gs0*S1980*=0*M90*gs0*S90*=0*O190*=0*51980*=0*P190*=0*490*=0*S1990*+19980*=0*U180*z90*=0*Y9
90*Z60*N180*=0*Z180*Ym0*N90*=0*b9980*t180*=0*d90*t10*=0*e19980*q10*=0*h90*q90*=0*h1990*Ts0*J180*=0*j190*Ss0*J90*=0*l19980*O9s90*H180*=0*o90*N1Esn80*G10*=0*p1980*K99sss990*F10*=0*r980*I1Es*5n80*E90*=0*s9980*G9
99s*5980*C180*=0*u90*F1E99s*690*C10*=0*v19980*C9s*9n0*C90*=0*y990*BEs*9n0*C80*=0*z180*91Es9s*7n80*B80*=0*+90*91ss9s*880*B80*=0*+180*89ss9s*890*B80*=0*=90*8Ess9s*8n0*A180*=0*=90*8Ess9s*49*4n0*A10*=0*=010*8Ess9
s*49*4n0*A90*=0*=010*8Ess9s*8n0*A80*=0*=010*8Ess9s*8n0*A80*=0*=010*899s*An0*A80*=0*=0180*719s*A90*A80*=0*=0090*71Ess99s*680*A80*=0*=00180*7Ess99s*5n80*9180*=0*=00090*79sn99Es*490*A10*=0*=0*410*71En99Esssn80*A
90*=0*=0*4180*79s*790*B80*=0*=0*580*719*780*B80*=0*=0*590*99*480*D80*=0*=0*510*99*480*D80*=0*=0*510*A9*40*D80*=0*=0*5180*99*40*D80*=0*=0*690*P180*=0*=0*6180*O10*=0*=0*880*O10*=0*=0*880*O90*=0*=0*890*O80*=0*=0
*810*O80*=0*=0*810*O80*=0*=0*810*O80*=0*=0*8180*M180*=0*=0*990*M10*=0*=0*A90*M90*=0*=0*A10*M80*=0*=0*A10*M80*=0*=0*A10*M80*=0*=0*A10*M80*=0*=0*A10*L180*=0*=0*A10*L90*=0*=0*B180*K80*=0*=0*B190*D990*580*=0*=0*C
10*D990*580*=0*=0*C10*D990*580*=0*=0*C10*D990*4180*=0*=0*C10990*G90*=0*=0*D10990*G80*=0*=0*D10990*G80*=0*=0*D10990*G80*=0*=0*D10*I180*=0*=0*D180*H90*=0*=0*F80*G180*=0*=0*F90*G980*=0*=0*F10*F180*=0*=0*G10*E198
0*=0*=0*G10*D990*=0*=0*I10*C180*=0*=0*J10*79900090*=0*=0*K10*79900080*=0*=0*K10*79900080*=0*=0*K180*69900080*=0*=0*K180*B80*=0*=0*L90*B90*=0*=0*L90*B180*=0*=0*K90*C80*=0*=0*K10*C80*=0*=0*K90*C80*=0*=0*K90*C80
*=0*=0*K90*C80*=0*=0*K180*A180*=0*=0*K190*A90*=0*=0*M900990*680*=0*=0*M100990*680*=0*=0*M100990*680*=0*=0*M100990*5180*=0*=0*M180*810*=0*=0*O90*890*=0*=0*O10*7180*=0*=0*O180*610*=0*=0*Q80*610*=0*=0*Q9990*410*
=0*=0*S1800190*=0*=0*T900190*=0*=0*T19990*=0*=0*=0*=0*=0*=0*=0*=0*=0*=0*=0*=0*=0*=0*=0*=0*=0*=0*=0*=0*=0*=0*=0*=0*=0*=0*=0*=0*=0*=0*=0*=0*=0*=0*=0*=0*=0*=0*=0*t|+~-~101~33~880*E90*T9000110*F80*S10*4880*E10*S1
8000110*F90*R180*4880*F90*Q180*510*G90*P180*589990*D190*O180*O90*N980*6880*H990*K990*7110*J90*I990*9880*J990*G90*A110*K190*B19*40*B880*K1980*9180*c190*619980*d1998000180*i1800180*j199980*=0*=0*=0*=0*=0*=0*=0*
=0*=0*=0*=0*=0*=0*8|-~+~143~206~080*P90*C=*60*D7==u0*418000119990*8190*B180*C7===0*M180009880*B199980*8180*b190*510*F180*8980*a180*49980*F19980*6980*a80*P180*690*a10*Q1998000190*Z180*S18000980*Z80*T9990190*R9
0*790*V180980*J180*5180*610*W19990*5180*D90*E80*X990*690*S90*Y10*Z90*Z90*Y10*a80*Y80*Z180*X10*a10*Y80*a90*X190*a80*X180*Z180*X90*a10*U900080*a80*9180*590*5180*5180010*a100090*690*5190*590*A80*a800180*C180*F10
*a10*H90*G80*5190*T80*X10*790*S90*X180*790*R90*Y80*890*Q10*Y90*990*Q80*X10*9180*P10*Y80*990*Q80*X10*9180*P90*Y80*910*P90*Y10*A90*O10*Z90*A80*O80*Z90*9180*M190*a80*910*M180*a10*A80*L180*b80*9180*J1980*b180*990
*J180*d180*990*I980*e90*9180*H980*f80*9180*F1980*f10*A90*F980*h90*A80*B199980*i90*9180*A190*m80*9180*719990*m10*A180*6190*p90*A190*49990*q90*B9801980*s80*B9*40*t10*=0*8980*=0*79000R*eO0*R80030*d3O0*Q1000O0*d3
0*R90030*eO0*R900O0*d30*S80R0*eO0*R103O0*d30*S93R0*eO0*S9RO0*d30*TBR0*eO0*S1RO0*d30*TBR0*eO0*S1RO0*d30*S1BR0*eO0*R18RO0*d30*S83R0*eO0*R10RO0*d30*R183R0*eO0*R803O0*d30*R100R0*eO0*R803O0*d30*R90030*eO0*Q1000O0*
d30*R80030*eO0*Q9000O0*d30*Q900030*eO0*O190*4O0*d30*N1980*430*eO0*M180*6O0*d30*M180*630*eO0*L180*7O0*d30*L180*730*eO0*K180*8O0*d30*L80*830*eO0*K10*9O0*d30*K180*830*eO0*J180*9O0*d30*K80*930*eO0*J90*AO0*d30*J10
*A30*eO0*I180*AO0*d30*J80*A30*eO0*I10*BO0*d30*J80*A30*eO0*I90*BO0*d30*I10*B30*eO0*H180*BO0*d30*I80*B30*eO0*H10*CO0*d30*I80*B30*eO0*H10*CO0*d30*H180*B30*eO0*G180*CO0*d30*G180*C30*eO0*G80*DO0*d30*G10*D30*eO0*F1
80*DO0*d30*G80*D30*eO0*F90*EO0*d30*F10*E30*eO0*E180*EO0*d30*E180*E30*eO0*D180*FO0*d30*D180*F30*eO0*C180*GO0*dR0*C980*G3R*e0*B190*=0*51980*=0*5180*=0*51990*=0*5180*=0*419980*=0*4980*=009*580*=0090*=0*419990*=0
*4980*=0019*40*=000980*=0*41990*=0*5180*=0*59990*=0*5180*=0*51980*=0*5180*=0*6180*=0*6180*=0*51980*=0*5180*=0*51990*=0*5180*=0*51990*=0*5190*=0*6180*=0*6190*=0*6180*=0*780*=0*790*=0*790*=0*710*=0*7980*=0*6180
*=0*6180*=0*6180*=0*780*=0*710*=0*7180*=0*790*=0*710*=0*880*=0*710*=0*7180*=0*780*=0*790*=0*790*=0*7180*=0*790*=0*790*=0*710*=0*880*=0*710*=0*7180*=0*780*=0*790*=0*710*=0*7180*=0*6180*=0*6180*=0*6180*=0*6180*
=0*6180*=0*6980*=0*5190*=0*6980*=0*5190*=0*6980*=0*5990*=0*690*=0*=0*=0*=0*=0*=0*=0*=0*=0*=0*=0*=0*=0*=0*=0*=0*=0*=0*9|-~-~146~70~0899980*L9*5000=*Eu0*97==u0*5980*4880080*P19*5F=*Cu0*9==0*6198000880080*S1999F
=*Gu0*E9000880080*V99F=*Fv9*40*A1909899980*W99=*9v9*60001980*910*e99=*7v90*B9*480*5189998980*Y9F=*6v90*F990*59000880*a99=*6v990*E19*419998880*b19=*7v990*G190009880*c19F=*7v90*I180*h99=*7v90*I9980*f199=*7v90*G
99980*h99=*7v980*+199=*7990*=99F=*6v980*W9*80*N99F=*6980*T19*C80*L999=*5980*S9=*Bv9*80*G999=*490*R1F=*Ev99=v980*H19===v80*Q1=*4v9*6F=*99*780*B9=*480*Q1===v990*599=*9v99F==9990*81F=*480*Q1===980*719*5=*C9*A=*5
80*Q1F===990*819*5=*Ov80*RF=*4v9*40*89*4=*K9990*S9F=*7v980*99*4F=*Av9*580*V9F=*89980*B9*F80*X19=*A9990*x19F=*Av990*x9*5=*8v9980*y1999=*7v990*+199F=*6v9980*+99F=*6v980*+19F=*7980*=99=*79990*+19F=*7v990*+99F=*7
v90*=99=*7v80*=19F=*680*=0099=*580*=00019===980*=0*49==v80*=0*49F==90*=01999F==980*=9*4===v80*+99F=*5v980*z199=*6v980*z9=*A980*w19F=*Av990*u19=*E980*t9=*G90*s1F=*Gv0*s1=*Hv0*s1=*Hv0*s1=*Hv0*s1=*Hv0*s1=*Hv0*s1
F=*G90*t9=*B9*4=80*t19=*A9*580*u99F=*89*40*w19*4=*69*40*y19*B80*=9*40*=0*=0*=0*=0*=0*=0*=0*=0*a`;


var deferredFunc;

var editor_active = false;
var editor_entity = undefined;
var editor_value = 0;
var editor_blockColors = ["#000", "#F00", "#F80", "#FF0", "#0F0", "#0FF", "#00F", "#F0F"];
var editor_locations = [
	[13, 35], //player's house
	[31, 20], //lord's house
	[44.5, 101.5], //witch's house
	[116, 60], //castle gate
	[116, 51], //just inside castle gate
	[129, 23], //just before boss room
	[129.5, 9], //just after boss room
	[106, 79], //castle field
	[-38, 15], //just before the mountain area
	[-60, 40] //behind-field field
];
var editor_polyPoints = [];
var editor_pointSelected = -1;
var editor_selectTolerance = 10;

var fight_boundsUL = [];
var fight_boundsDR = [];
var fight_onSuccess;
var fight_onFail;
var fight_fadeTimer = 0;
var fight_fadeTimerMax = 100;

var fps = 60;
var fps_base = 60;
var fps_timeBuffer = [];

var game_mainLoop;

var gravityStrength = 0.005;

var menu_texture = new Texture(getImage(`img/menuBg.png`), data_textures.tileSize, 1e1001, [16, 12], [8, 6], [[0, 0]], false);
var menu_rate = 0;
var menu_rateMagnitude = 0.05;
var menu_t = 0;


var player;

var render_bgFilterOpacity = 0;
var render_fgFilterOpacity = 0;
var render_chocoOverlay = new Texture(data_textures.TileEntities.sheet, data_textures.tileSize, ...data_textures.TileEntities.chocWorld, false);
var render_hpMEdge = 0.025;
var render_hpMBar = 0.006;
var render_hpHeight = 0.05;
var render_iframePeriod = 10;

var text_charsPerTick = 2;
var text_filterTime = 40;
var text_size = 0.04;
var text_tabsCountFor = 8;

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

var time_default = 30;

var weapon_damages = [0, 1, 4];


var wildder = getImage(`img/terrainWilderness.png`);
var bgts = data_textures.Roofs.tileSize;
var daTex = data_textures;
var castleHallPoly = [[106.8,21.7],[131,21.7],[131,24.3],[128.3,24.3],[128.2,27.7],[152.2,27.8],[152.3,34.3],[145.3,34.3],[145.4,37.3],[142.8,37.4],[142.7,34.4],[127.3,34.3],[127.2,43.8],
[129.3,43.8],[129.3,46.3],[127.3,46.3],[127.3,50.2],[124.8,50.3],[124.7,46.3],[117.3,46.2],[117.3,53.3],[114.7,53.2],[114.7,46.3],[103.7,46.2],[103.7,43.7],[114.7,43.7],[114.7,37.8],
[117.3,37.7],[117.3,43.8],[124.8,43.8],[124.8,31.8],[149.7,31.7],[149.7,30.3],[125.8,30.2],[125.7,24.3],[106.7,24.3]];
var world_backgrounds = [
	new Texture_Terrain(getImage(`img/terrain-1-1.png`), bgts, -80, -60),
	new Texture_Terrain(getImage(`img/terrain-10.png`), bgts, -80, 0),
	new Texture_Terrain(getImage(`img/terrain-11.png`), bgts, -80, 60),
	
	new Texture_Terrain(getImage(`img/terrain0-1.png`), bgts, 0, -60),
	new Texture_Terrain(getImage(`img/terrain00.png`), bgts, 0, 0),
	new Texture_Terrain(getImage(`img/terrain01.png`), bgts, 0, 60),
	new Texture_Terrain(getImage(`img/terrain02.png`), bgts, 0, 120),
	
	new Texture_Terrain(wildder, 8, 80, -60),
	new Texture_Terrain(getImage(`img/terrain10.png`), bgts, 80, 0),
	new Texture_Terrain(getImage(`img/terrain11.png`), bgts, 80, 60),
];

var chocolateConvos = [
	[true, 'fieldChocolate-1'],
	[false, 'fieldChocolate-2']
];
var guardConvos = [
	[true, 'guard-noWeapon'],
	[() => {return (player.magicLearned);}, 'guard-noWeapon2'],
	[() => {return (getEntityFromID("guard1") == undefined);}, 'guard-partnerKilled'],
	[() => {return (player.weapon > 0);}, 'guard-weapon'],
	[false, "guard-weapon2"]
];
var endEntity = new NPC(0, 0, 0, daTex.NPCS.pink, "#FFFFFF",[[true, 'outro-oneEnding'], [() => {return data_persistent.ends == 3;}, 'outro-allEndings']]);
var entities = [
	//peasant houses
	new Tile_Respawn(14, 34, 0.5, 2),
	new TileEntity(16.9, 42.7, 0, daTex.TileEntities.zText, [], 'npc3Z'),
	new NPC(19.5, 47.5, Math.PI, daTex.NPCS.green, "#008800", [[true, 'npc2-1'], [false, 'npc2-2']]),
	new NPC(17, 43.3, 1.447, daTex.NPCS.purple, "#AA00AA", [[true, 'npc3-1'], [false, 'npc3-2']]),
	new NPC(17, 55.5, Math.PI, daTex.NPCS.pink, "#FF00FF", 'npc1'),
	
	//fields
	new NPC(54.5, 56, Math.PI, daTex.NPCS.yellow, "#FFFF00", 'npc6'),
	new TileEntity(-31.8, 45.4, 0, daTex.TileEntities.chocWorld, chocolateConvos, 'choco1'),
	new TileEntity(-25.7, 35.2, 0, daTex.TileEntities.chocWorld, chocolateConvos, 'choco2'),
	new Tile_Respawn(64, 27, 0.5, 12.5),

	//mountain
	new Tile_Music(-49.5, -2.5, 9.5, 0.5, "mountain"),
	new Tile_Music(-55.5, -2, 16, 0.5, "outside"),
	new NPC(-44, -30, -1.571, daTex.NPCS.red, "#e23e3e", [[true, 'story-1'],[false, 'story-2'],[() => {return (player.chocolate == 5);}, 'story-3'],[false,'story-4'],[false,'story-5']], 'storyteller'),
	new NPC(-38.8, -23.8, 3.83, daTex.NPCS.yellow, "#ffff7e", [[true, 'npc4-1'], [false, 'npc4-2']]),
	
	//lord's house
	new TileEntity(24.5, 14, 3, daTex.TileEntities.stickHolder),
	new TileEntity(24.5, 15, 3, daTex.TileEntities.stickHolder, [], 'lordStickTop'),
	new TileEntity(24.5, 16, 3, daTex.TileEntities.stickHolder, [], 'lordStickMiddle'),
	new TileEntity(24.5, 17, 3, daTex.TileEntities.stickHolder),
	new Tile_Respawn(29.5, 19, 3, 0.75),
	new Tile_Conversator(30, 18, 2, 1, "lord", "lordStarter"),
	new NPC(31, 14, -Math.PI / 2, daTex.NPCS.orange, "#FF8800", [
			[true, 'lord-intro'],
			[false, 'lord-activate'],
			[false, 'lord-youWin'],
			[false, 'lord-youWin2'],
			[false, 'lord-youWin3'],
		], "lord", {
		'reach': new Texture(daTex.Lord.sheet, daTex.tileSize, ...daTex.Lord.reach, false),
		'grab': new Texture(daTex.Lord.sheet, daTex.tileSize, ...daTex.Lord.grab, false),
		'give': new Texture(daTex.Lord.sheet, daTex.tileSize, ...daTex.Lord.give, false),
		'ready': new Texture(daTex.Lord.sheet, daTex.tileSize, ...daTex.Lord.ready, false),
	}),
	
	//witch house
	new MagicSpaceOrb(45.9, 104.1),
	new MagicSpaceOrb(42.7, 104.0),
	new MagicSpaceOrb(43.4, 106.1),
	new MagicSpaceOrb(49.3, 100.4),
	new MagicSpaceOrb(44.6, 100.7),
	new MagicSpaceOrb(40.0, 104.1),
	new MagicSpaceOrb(47.3, 106.4),
	new MagicSpaceOrb(42.7, 101.2),
	new MagicSpaceOrb(44.9, 98.5),
	new MagicSpaceOrb(40.0, 98.1),
	new MagicSpaceOrb(52.1, 99.4),
	new Tile_Conversator(43.5, 102.5, 2, 1, "spellGiver"),
	new NPC(42.5, 110.5, -Math.PI / 2, daTex.NPCS.witch, "#A254D2", [
			[true, 'witch-intro'],
			[false, 'witch-outside'],
			[() => {return data_persistent.wRoom}, 'witch-seenRoom'],
			[() => {return (data_persistent.pastBoss > 1)}, 'witch-pastQueen']], "spellGiver"),
	new InvisibleTexter(44, 102, 1, 1, [[() => {return player.magicLearned;}, 'witchDoor'], 
										[() => {return (player.weapon > 0);}, 'witchDoor-weapon']]),
	new Tile_Music(44, 102, 1, 0.5, 'witchHouse'),
	new Tile_Music(43.5, 101.5, 2, 0.5, 'outside'),
	
	//castle gate
	new Gate(115.96, 58.1, 0, 'bridgeGate'),
	new Tile_Respawn(107, 56, 0.5, 15),
	new Tile_Respawn(125, 56, 0.5, 15),
	new Tile_Respawn(107, 70.5, 18.5, 0.5),
	new TileEntity(114.75, 58.8, 0, daTex.TileEntities.lever, [], 'bridgeLever'),
	new NPC_Killable(114.5, 59, Math.PI / 2, daTex.NPCS.guard, color_castleEntities, guardConvos, 'guard1', undefined, () => {unlockCastleGate("bridgeLever", "bridgeGate"); putWitchOutside();}),
	new NPC_Killable(117.5, 59, Math.PI / 2, daTex.NPCS.guard, color_castleEntities, guardConvos, 'guard2', undefined, () => {}),

	//castle storeroom
	new InvisibleTexter(89, 37, 7.5, 1.5, 'storageBarrels'),
	new InvisibleTexter(98, 37, 5, 1, 'storageSpices'),
	new InvisibleTexter(103, 39, 1, 4, 'storageBread'),
	//castle kitchen
	new InvisibleTexter(121.5, 32.5, 1.5, 1.5, [[true, 'binChocolate-1'], [false, 'binChocolate-2'], [false, 'binChocolate-3'], [false, 'binChocolate-4']], 'chocolateBin'),
	
	//castle hallways
	new Tile_Respawn(115, 52, 2, 1),
	new Tile_Music(115, 52.5, 2, 0.5, 'castle'),
	new Tile_Music(115, 53, 2, 0.5, 'outside'),
	new Tile_Music(84, 28.5, 0.5, 0.5, 'castle'),
	new Tile_Music(83.5, 28.5, 0.5, 0.5, 'outside'),
	
	//castle jail
	new TileEntity(130.7, 43.4, 0, daTex.TileEntities.lever, 'jail-unlock', 'jailLever'),
	new Gate(134.4, 43.94, 3, 'jailGate'),
	new Gate(134.4, 45.9, 3),
	new Gate(134.4, 47.8, 3),

	//castle armory
	new TileEntity(98.5, 21, 0, daTex.TileEntities.sword, 'swordPickup'),
	new NPC(136.4, 48.4, 1.5, daTex.NPCS.yellow, "#c4bd89", 'npcGhost', 'ghost'),
	new InvisibleTexter(97, 23, 5.5, 2, 'armoryCannon'),
	new InvisibleTexter(97, 17, 9, 2, 'armoryArmor'),
	new InvisibleTexter(103, 23, 1, 1, 'armorySpheres-s'),
	new InvisibleTexter(104.5, 23.5, 1, 1, 'armorySpheres-m'),
	new InvisibleTexter(105.5, 20.5, 1, 1, 'armorySpheres-m'),
	new InvisibleTexter(104, 19, 1, 1, 'armorySpheres-l'),

	//castle library
	new InvisibleTexter(129, 36, 5, 0.75, 'castleLibrary2'),
	new InvisibleTexter(143, 41.5, 5, 3, [[true, 'castleLibrary-1'], [false, 'castleLibrary-2']]),
	new InvisibleTexter(128.5, 35, 0.5, 0.5, 'a witches diary'),
	new InvisibleTexter(129, 37, 1, 3, 'wRoomTable'),
	new InvisibleTexter(129, 40, 3, 2, 'wRoomBed'),
	new Tile_Arbitrary(136.5, 38, 1, 2, () => {data_persistent.wRoom = 1;}),
	new TileEntity(140, 45.5, 0, daTex.TileEntities.window),
	new TileEntity(141.75, 45.5, 0, daTex.TileEntities.window),
	new TileEntity(143.5, 45.5, 0, daTex.TileEntities.window),
	new TileEntity(145.25, 45.5, 0, daTex.TileEntities.window),
	new TileEntity(147, 45.5, 0, daTex.TileEntities.window),


	//castle boss room
	new Tile_Respawn(130, 22, 1, 2),
	new Tile_Music(129.5, 22, 0.5, 2, "castle"),
	new Tile_Music(131, 21.5, 0.5, 3, "none"),
	new Tile_Conversator(131, 21.5, 0.5, 3, 'queen'),
	new NPC(139.5, 11.5, Math.PI / 2, daTex.NPCS.knight, color_castleEntities, [], 'knight1'),
	new NPC(141.5, 11.5, Math.PI / 2, daTex.NPCS.knight, color_castleEntities, [
		[true, 'knights-stick'], 
		[false, 'knights-stick2'],
		[() => {return player.weapon > 1}, 'knights-sword'],
		[false, 'knights-sword2'],
		[false, 'knights-defeat'],
		[false, 'knights-defeat2'],
	], 'knight2'),
	new NPC(143.5, 11.5, Math.PI / 2, daTex.NPCS.knight, color_castleEntities, [], 'knight3'),
	new NPC(141.5, 16, Math.PI / 2, daTex.NPCS.queen, "#00f2ff", [
			[true, "angel-melee"], 
			[false, "angel-meleePassOff"],
			[() => {return player.magicLearned;}, "angel-standard"],
			[false, "angel-standard2"],
			[false, ""]], 'queen', {
		'transform': new Texture(daTex.Queen.sheet, daTex.tileSize, ...daTex.Queen.transform, false),
		'fall': new Texture(daTex.Queen.sheet, daTex.tileSize, ...daTex.Queen.fall, false),
		'crack': new Texture(daTex.Queen.sheet, daTex.tileSize, ...daTex.Queen.crack, false),
	}),

	//castle - king's room
	new Tile_Music(131, 7.5, 0.5, 3, "none"),
	new Tile_Music(130.5, 8, 0.5, 2, "heartbeat"),
	new Tile_Conversator(127, 8, 0.5, 2, 'king'),
	new Tile_Conversator(116, 12, 2, 2, 'king'),
	new NPC(114.2, 13.1, 0, daTex.NPCS.king, "#4bccd2", [
			[true, 'king-baseline'],
			[() => {return (player.weapon == 2);}, 'king-sword'],
			[() => {return player.magicLearned;}, 'king-magic'],
			[true, 'king-intro']], 'king', {
		"stab": new Texture(daTex.King.sheet, daTex.tileSize, ...daTex.King.stab, false),
		"stabCrownless": new Texture(daTex.King.sheet, daTex.tileSize, ...daTex.King.stabCrownless, false),
		"vaporize": new Texture(daTex.King.sheet, daTex.tileSize, ...daTex.King.vaporize, false),
		"vaporizeCrownless": new Texture(daTex.King.sheet, daTex.tileSize, ...daTex.King.vaporizeCrownless, false),
	}),


	//horses
	new Horse(112, 80, "horse1"),
	new Horse(115, 81, [[true, "horse2-1"], [false, "horse2-2"]]),
	new Horse(120, 82, "horse3"),
	new Horse(122, 77, "horse4"),
	new Horse(130, 78, "horse5"),


	new Horse(-61, 30, "horse1"),
	new Horse(-57, 29, "horse4"),
	new Horse(-58, 34, "horse1"),
	new Horse(-53, 27, "horse3"),
	new Horse(-54, 37, "horse5"),
];

getEntityFromID("queen").r = 1.5;

var world_entities = entities;

//for all the roofs. These are technically entities, but they go in their own array for organizational purposes.
var world_roofs = [
	//peasant houses
	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.pHouse[0], 13.5, 31.6, ...daTex.Roofs.pHouse[1], [[14.2,32.4],[22.7,32.3],[22.7,38.7],[14.3,38.7]]),
	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.pHouse[0], 13.5, 41.5, ...daTex.Roofs.pHouse[1], [[14.2,42.2],[22.7,42.3],[22.8,48.7],[14.2,48.8]]),
	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.pHouse[0], 13.5, 51.6, ...daTex.Roofs.pHouse[1], [[14.1,58.7],[22.7,58.7],[22.7,52.3],[14.1,52.3]]),
	
	//oak trees
	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.oakBranches3[0], 47.4, 24.3, ...daTex.Roofs.oakBranches3[1], []),
	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.oakBranches1[0], 59.1, 26.55, ...daTex.Roofs.oakBranches1[1], []),
	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.oakBranches2[0], 50.15, 34.7, ...daTex.Roofs.oakBranches2[1], []),
	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.oakBranches1[0], 44.55, 38.1, ...daTex.Roofs.oakBranches1[1], []),
	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.oakBranches2[0], 47.05, 48.7, ...daTex.Roofs.oakBranches2[1], []),

	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.oakCanopy3[0], 47, 23.3, ...daTex.Roofs.oakCanopy3[1], [[53.1,23.4],[56.1,24.9],[57.7,27.6],[56.9,31.3],[55,33.3],[52.8,34.6],[50,34.8],[47.3,31.2],[47.2,29],[49.9,27],[50.3,24.3]]),
	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.oakCanopy1[0], 58.2, 25.9, ...daTex.Roofs.oakCanopy1[1], [[63,25.9],[66.5,26.1],[68.9,30.8],[66.5,35.4],[62.4,35.5],[59.8,33.9],[58.1,31.2],[58.4,28.4]]),
	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.oakCanopy2[0], 49.15, 33.7, ...daTex.Roofs.oakCanopy2[1], [[49.5,34.9],[55.4,33.4],[57.9,35.1],[60.1,38.9],[56.5,42],[52.5,42.5],[48.8,37.3]]),
	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.oakCanopy1[0], 43.5, 37.5, ...daTex.Roofs.oakCanopy1[1], [[42.7,38.4],[51.1,37.2],[54.4,41.9],[51.8,47.1],[47.5,47],[44.1,44.6]]),
	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.oakCanopy2[0], 46.3, 47.6, ...daTex.Roofs.oakCanopy2[1], [[46.6,48.8],[50.9,47.4],[53.8,47.7],[57.8,52.6],[52.1,56.6],[49.1,56],[45.9,50.8]]),

	//birch trees
	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.birchBranches1[0], -37.3, 8.2, ...daTex.Roofs.birchBranches1[1], []),
	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.birchBranches4[0], -44.5, 8.3, ...daTex.Roofs.birchBranches4[1], []),
	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.birchBranches2[0], -51.1, 8.2, ...daTex.Roofs.birchBranches2[1], []),
	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.birchBranches3[0], -57.6, 8.6, ...daTex.Roofs.birchBranches3[1], []),
	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.birchBranches1[0], -64.5, 7.2, ...daTex.Roofs.birchBranches1[1], []),
	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.birchBranches2[0], -60.1, 1.1, ...daTex.Roofs.birchBranches2[1], []),
	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.birchBranches4[0], -53.7, 2.3, ...daTex.Roofs.birchBranches4[1], []),
	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.birchBranches3[0], -39.0, 3.1, ...daTex.Roofs.birchBranches3[1], []),

	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.birchCanopy1[0], -38.6, 7.5, ...daTex.Roofs.birchCanopy1[1], [[-35.7,7.4],[-32.3,8],[-30.5,11.4],[-31.9,14.6],[-34.6,15.4],[-37.4,14.5],[-38.5,11.5]]),
	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.birchCanopy4[0], -44.9, 7.5, ...daTex.Roofs.birchCanopy4[1], [[-41.9,6.9],[-37.9,9.7],[-37.6,14.4],[-43.8,14.9],[-45.1,10.1]]),
	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.birchCanopy2[0], -51.7, 8.2, ...daTex.Roofs.birchCanopy2[1], [[-48.8,7.8],[-45.4,9],[-44.5,11.6],[-45.5,14.1],[-50.3,15.5],[-51.9,13.1],[-51.6,10.2]]),
	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.birchCanopy3[0], -58.0, 7.7, ...daTex.Roofs.birchCanopy3[1], [[-57,8.6],[-53.6,7.5],[-51.1,8.8],[-50.1,12.3],[-53,15.2],[-56.2,15.1],[-58.1,12.3]]),
	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.birchCanopy1[0], -65.4, 6.6, ...daTex.Roofs.birchCanopy1[1], [[-62.3,6.7],[-58.9,7.3],[-57.3,10.8],[-59.1,14.1],[-62.4,14.5],[-66.7,11.9]]),
	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.birchCanopy2[0], -60.9, 1.0, ...daTex.Roofs.birchCanopy2[1], [[-59.7,1],[-55.6,1.1],[-53.6,3.8],[-54.5,6.9],[-59.8,8.4],[-61.3,5.3]]),
	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.birchCanopy4[0], -54.0, 1.5, ...daTex.Roofs.birchCanopy4[1], [[-50.9,0.9],[-47,3.6],[-46.8,8.3],[-52.7,8.9],[-54.5,4.5]]),
	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.birchCanopy3[0], -39.4, 2.3, ...daTex.Roofs.birchCanopy3[1], [[-39.6,6.7],[-37.9,2.6],[-33.6,2.2],[-32,4.4],[-32,7.1],[-34.7,9.7],[-37.9,9.5]]),
	
	//lord
	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.lHouse[0], 23.1, 4, ...daTex.Roofs.lHouse[1], 
		[[24.2,18.8],[24.2,5.3],[30.7,5.3],[30.7,9.2],[37.8,9.3],[37.8,18.7],[32.2,18.7],[32,19.1],[30,19.1],[29.8,18.7]]),

	//witch's roof
	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.wHouse[0], 37.5, 101.5, ...daTex.Roofs.wHouse[1], 
		[[43.7,102.2],[45.3,102.2],[46.4,103.2],[47.8,103.8],[49.7,106.2],[48.3,113.2],[40.8,113.2],[41.3,103.4],[42.7,103.2]]),


	//castle roofs
	//storeroom
	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.castle[0], 88.85, 36.9, 15.2, 10.5, [[88.7,36],[104.8,36.1],[104.9,47.3],[88.8,47.2]]),
	//kitchen
	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.castle[0], 107.9, 25.4, 15.2, 12.8, [[107,26],[123.5,26],[123.5,39],[106.9,39]]),
	//armory
	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.castle[0], 95.7, 16.7, 11.5, 9, [[95.7,16.7],[108.7,16.8],[108.7,25.3],[95.7,25.3]]),
	//jail
	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.castle[0], 128.8, 42.9, 8.5, 6.2, [[128.7,42.8],[137.3,42.7],[137.3,49.2],[128.7,49.2],[128.7,46.2],[127.8,46.3],[127.8,43.7]]),
	//library / witch's room
	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.castle[0], 128.9, 35.9, 8.1, 6.5, [[128.9,34.4],[137.1,35.3],[148.3,35.9],[148.3,47.4],[138.9,47.3],[137.2,42.3],[128.8,42.3]]),
	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.castle[0], 136.95, 36.9, 11.5, 10.5, [[128.9,34.4],[137.1,35.3],[148.3,35.9],[148.3,47.4],[138.9,47.3],[137.2,42.3],[128.8,42.3]]),
	//boss room
	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.castle[0], 130.9, 6.9, 21.5, 18.6, [[130,6.7],[152.3,6.8],[152.3,25.2],[130,25.3]]),
	//throne room
	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.castle[0], 110.9, 6.9, 16.5, 12.2, [[110.7,6.7],[128.7,6.7],[128.8,19.2],[110.8,19.3]]),
];
//player's house starts transparent
world_roofs[0].alphaTime = world_roofs[0].alphaTimeMax;
//there's a lot of torches so I'm just doing them out here
var torchPositions = [
	[115.55, 51.5, 3],
	[116.55, 51.5, 1],
	[115.55, 46.5, 3],
	[116.55, 46.5, 1],
	[115.55, 43.5, 3],
	[116.55, 43.5, 1],
	[115.55, 38.5, 3],
	[116.55, 38.5, 1],

	[108.5, 44.55, 0],
	[108.5, 45.55, 2],
	[114.5, 44.55, 0],
	[114.5, 45.55, 2],
	[117.5, 44.55, 0],
	[117.5, 45.55, 2],
	[124.5, 44.55, 0],
	[124.5, 45.55, 2],
	[127.5, 44.55, 0],
	[127.5, 45.55, 2],

	[125.55, 46.5, 3],
	[126.55, 46.5, 1],
	[125.55, 43.5, 3],
	[126.55, 43.5, 1],
	[125.55, 39, 3],
	[126.55, 39, 1],
	[125.55, 34.5, 3],
	[126.55, 34.5, 1],

	[127.5, 32.6, 0],
	[127.5, 33.6, 2],
	[133.5, 32.6, 0],
	[133.5, 33.6, 2],
	[139.5, 32.6, 0],
	[139.5, 33.6, 2],
	[142.5, 32.6, 0],
	[142.5, 33.6, 2],
	[145.5, 32.6, 0],
	[145.5, 33.6, 2],
	[149.5, 32.6, 0],
	[149.5, 33.6, 2],

	[128.5, 28.55, 0],
	[128.5, 29.6, 2],
	[135.5, 28.55, 0],
	[135.5, 29.6, 2],
	[142.5, 28.55, 0],
	[142.5, 29.6, 2],
	[149.5, 28.55, 0],
	[149.5, 29.6, 2],


	[107.5, 22.6, 0],
	[107.5, 23.6, 2],
	[113, 22.6, 0],
	[113, 23.6, 2],
	[118.5, 22.6, 0],
	[118.5, 23.6, 2],
	[125, 22.6, 0],
	[125, 23.6, 2],
	[128.5, 22.6, 0],
	[128.5, 23.6, 2],
];
torchPositions.forEach(t => {
	//slight offset because aligning the images in animate doesn't get it quite right
	world_entities.push(new TileEntity(t[0] - 0.05, t[1] - 0.14, t[2], daTex.TileEntities.torch));
});

var world_collision_pp = [[]];
var world_collision_pm = [[]];
var world_collision_mp = [[]];
var world_collision_mm = [[]];

function setup() {
	//sneaky sneaky - by having the user click to load, they are unknowingly consenting to play audio
	//don't do things like this in real life it's frowned upon and also probably a crime
	loadingText.innerHTML = `<button onclick="setup2()">Begin program</button>`;
	figureFramerate();
}

function figureFramerate() {
	fps_timeBuffer.push(performance.now());
	if (fps_timeBuffer.length > 10) {
		var fpsRaw = Math.round((1000 * (fps_timeBuffer.length-1)) / (fps_timeBuffer[fps_timeBuffer.length-1] - fps_timeBuffer[0]));
		var rounded = Math.max(fps_base, Math.round(fpsRaw / fps_base) * fps_base);
		console.log(`guessing FPS is ${fpsRaw}, render rate will be ${rounded}`);
		fps = rounded;
	} else {
		animation_fps = window.requestAnimationFrame(figureFramerate);
	}
}

function setup2() {
	canvas = document.getElementById("convos");
	canvas2 = document.getElementById("convosSecret");
	ctx = canvas.getContext("2d");
	cty = canvas2.getContext("2d");

	loadingText.innerHTML = "";

	importWorld(data_terrain.replaceAll("\n", ""));

	player = new Player(17.55, 35.65);
	audio_bgChannel.target = data_audio["outside"];

	handleResize();
	localStorage_read();


	game_mainLoop = main;
	animation = window.requestAnimationFrame(runGame);
}

function drawMenu() {
	//everything is kept within a 12 x 8 box
	var menu_boxSize = [12, 8];
	var cs = camera.scale;
	var midH = easerp(canvas.height * 1.5, canvas.height * 0.5, menu_t);
	var midW = canvas.width / 2;
	var baseH = midH - (cs * menu_boxSize[1] / 2);
	var baseW = (canvas.width / 2) - (cs * menu_boxSize[0] / 2);

	//swap ctx and cty
	[cty, ctx] = [ctx, cty];
	
	//first draw background
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	menu_texture.draw(canvas.width / 2, midH, 0, cs);

	ctx.strokeStyle = color_menuText;
	ctx.lineWidth = canvas.height / 200;
	ctx.fillStyle = color_menuText;

	//draw volume sliders
	var sliderW = cs*3;
	var sliderStart1 = baseW + cs*2.75;
	var sliderStart2 = baseW + cs * (menu_boxSize[0]/2 + 2.85);
	ctx.textAlign = "left";
	ctx.font = `${canvas.height / 30}px Playfair Display`;
	ctx.fillText(`Music Volume`, baseW, baseH + cs);
	ctx.fillText(`Effects Volume`, baseW + cs*(menu_boxSize[0]/2), baseH + cs);

	//aliasing checkbox
	ctx.fillText(`Texture Aliasing`, baseW + cs*0.75, baseH + cs*2);
	ctx.rect(baseW + cs*0.1, baseH + cs*1.75, cs*0.5, cs*0.5);

	if (data_persistent.alias) {
		ctx.moveTo(baseW + cs*0.2, baseH + cs*2);
		ctx.lineTo(baseW + cs*0.35, baseH + cs*2.2);
		ctx.lineTo(baseW + cs*0.5, baseH + cs*1.8);
	}
	ctx.stroke();

	ctx.beginPath();
	ctx.moveTo(sliderStart1, baseH + cs);
	ctx.lineTo(sliderStart1 + sliderW, baseH + cs);
	ctx.stroke();
	ctx.moveTo(sliderStart2, baseH + cs);
	ctx.lineTo(sliderStart2 + sliderW, baseH + cs);
	ctx.stroke();
	drawCircle(linterp(sliderStart1, sliderStart1 + sliderW, audio_bgChannel.volume), baseH + cs, canvas.height / 75, color_menuPrimary);
	ctx.stroke();
	drawCircle(linterp(sliderStart2, sliderStart2 + sliderW, audio_sfxChannel.volume), baseH + cs, canvas.height / 75, color_menuPrimary);
	ctx.stroke();
	
	
	
	
	//controls + credits
	ctx.fillStyle = color_menuText;
	
	var baseTextH = baseH + (cs * menu_boxSize[1] * 0.5);
	
	ctx.fillText(`Walk North - Up arrow / W`, baseW, baseTextH + cs*0.5);
	ctx.fillText(`Walk East - Right arrow / D`, baseW, baseTextH + cs);
	ctx.fillText(`Walk South - Down arrow / S`, baseW, baseTextH + cs*1.5);
	ctx.fillText(`Walk West - Left arrow / A`, baseW, baseTextH + cs*2);
	
	ctx.fillText(`Interact - Z / Enter`, midW + cs*1.25, baseTextH + cs*0.75);
	ctx.fillText(`Dash - Shift`, midW + cs*1.25, baseTextH + cs*1.25);
	ctx.fillText(`Magic - Space`, midW + cs*1.25, baseTextH + cs*1.75);

	ctx.textAlign = "center";
	ctx.fillStyle = (Math.abs(cursor.y - (baseH + cs*menu_boxSize[1])) < cs && cursor.x > baseW && cursor.x < midW) ? "#880000" : color_menuText;
	ctx.fillText(`Reset`, baseW + cs*menu_boxSize[0]/3, baseH + cs*menu_boxSize[1]);
	ctx.fillStyle = (Math.abs(cursor.y - (baseH + cs*menu_boxSize[1])) < cs && cursor.x > midW && cursor.x < canvas.width - baseW) ? "#880000" : color_menuText;
	ctx.fillText(`True Reset`, baseW + 2*cs*menu_boxSize[0]/3, baseH + cs*menu_boxSize[1]);
	ctx.fillStyle = color_menuText;

	ctx.fillText(`Code, art, story, and sounds by Cynthia Clementine`, midW, baseH + cs * (menu_boxSize[1] - 1));
	ctx.font = `${canvas.height / 20}px Playfair Display`;
	ctx.fillText(`Preferences`, midW, baseH);
	ctx.fillText(`Controls`, midW, baseH + cs * (menu_boxSize[1] * 0.5 - 0.5));

	//reset buttons

	//swap back
	[cty, ctx] = [ctx, cty];
}

function runGame() {
	var parity = fps / fps_base;
	if (animation % parity == 0) {
		animation /= parity;
		game_mainLoop();
	}
	animation = window.requestAnimationFrame(runGame);
}

function runWorld(fightActive) {
	//audo 
	audio_bgChannel.tick();


	//camera
	if (!player.locked) {
		camera.x = player.x;
		camera.y = player.y;
	}

	if (fightActive) {
		camera.x = clamp(camera.x, fight_boundsUL[0] + (canvas.width * 0.5 / camera.scale), fight_boundsDR[0] - (canvas.width * 0.5 / camera.scale));
		camera.y = clamp(camera.y, fight_boundsUL[1] + (canvas.height * 0.5 / camera.scale), fight_boundsDR[1] - (canvas.height * 0.5 / camera.scale));
	}
	camera.tick();
	
	
	//world
	world_backgrounds.forEach(w => {
		w.draw();
	});

	//the .draw of a background texture object optimizes out all textures not on the screen.
	//however, this can make for awkward screen transitions. To prevent this, I found the most awkward images and made sure to keep drawing them
	// if (animation % 10 == 1) {
	// 	var bgChosen = 2//Math.floor(randomBounded(1, 3));
	// 	//draw the image offscreen
	// 	ctx.drawImage(world_backgrounds[bgChosen].sheet, 0, 0, 20, 20, -100, -100, 20, 20);
	// 	console.log(`drawing ${bgChosen}`)
	// }

	//background filter, if active
	if (render_bgFilterOpacity > 0) {
		ctx.globalAlpha = render_bgFilterOpacity;
		ctx.fillStyle = color_bg;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.globalAlpha = 1;
	}

	//entities
	if (!fightActive) {
		player.tick();
		player.draw();
	}

	//make a copy of the array so that adding/removing entities doesn't mess up the loop
	world_entities.slice(0).forEach(v => {
		v.tick();
		v.draw();
		
		if (v.DELETE) {
			//make sure to not softlock the player
			if (player.convoPartner == v) {
				v.endConversation();
			}
			
			world_entities.splice(world_entities.indexOf(v), 1);
		}
	});

	world_roofs.forEach(w => {
		w.tick();
		w.draw();
	});

	//run the deferred function if there is one
	if (deferredFunc != undefined) {
		deferredFunc();
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
		render_chocoOverlay.draw(chocoUnit, chocoUnit, 0, chocoUnit * 2);
		ctx.fillStyle = "#321801";
		ctx.font = `${chocoUnit}px Playfair Display`;
		ctx.fillText(player.chocolate, chocoUnit * 2, chocoUnit * 0.9);
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
	ctx.textAlign = "center";
	ctx.fillStyle = "#FFFFFF";
	ctx.font = `${canvas.height / 18}px Playfair Display`;
	var displayText = data_conversations[(data_persistent.ends == 3) ? "outro-allEndings" : "outro-oneEnding"];
	var vOffset = Math.floor(canvas.height / 16);
	for (var h=0; h<displayText.length; h++) {
		ctx.fillText(displayText[h], canvas.width / 2, (canvas.height * 0.4) + (vOffset * (h - ((displayText.length - 1) / 2))));
	}

	ctx.fillStyle = "#888";
	ctx.font = `${canvas.height / 30}px Playfair Display`;
	ctx.fillText(`Reset`, canvas.width / 2, canvas.height * 0.9);
}

function main() {
	if (menu_t > 0 || menu_rate != 0) {
		menu_t = clamp(menu_t + menu_rate, 0, 1);
		//ending movement
		if ((menu_t == 0 && menu_rate < 0) || (menu_t == 1 && menu_rate > 0)) {
			menu_rate = 0;
		}
		drawMenu();
		audio_bgChannel.tick();
		return;
	}
	runWorld(false);

	//editor grid
	if (editor_active) {
		ctx.beginPath();
		ctx.globalAlpha = 0.5;

		var worldStartPos = screenToSpace(0, 0);
		worldStartPos[0] = Math.floor(worldStartPos[0]);
		worldStartPos[1] = Math.floor(worldStartPos[1]);
		var startPos = spaceToScreen(worldStartPos[0], worldStartPos[1]);
		for (var x=0; x<(canvas.width / camera.scale)+1; x+=0.5) {
			for (var y=0; y<(canvas.height/camera.scale)+1; y+=0.5) {
				ctx.fillStyle = editor_blockColors[getWorldData(worldStartPos[0] + x + 0.1, worldStartPos[1] + y + 0.1)];
				ctx.fillRect(startPos[0] + (x * camera.scale), startPos[1] + (y * camera.scale), 0.5 * camera.scale, 0.5 * camera.scale);
			}
		}
		ctx.globalAlpha = 1;

		//polygon
		if (editor_polyPoints.length > 0) {
			ctx.beginPath();
			ctx.lineWidth = 2;
			ctx.strokeStyle = color_editorPolygon;
			var r = Math.floor(canvas.height / 100);
			var pNow;
			var pNowSc;
			var pNext;
			var pNextSc;
			for (var h=0; h<editor_polyPoints.length; h++) {
				pNow = editor_polyPoints[h];
				pNowSc = spaceToScreen(...pNow);
				pNext = editor_polyPoints[(h+1) % editor_polyPoints.length];
				pNextSc = spaceToScreen(...pNext);

				//circle + line
				drawCircle(pNowSc[0], pNowSc[1], r, color_editorPolygon);
				ctx.moveTo(...pNowSc);
				ctx.lineTo(...pNextSc);
				ctx.stroke();

				//midpoint
				ctx.beginPath();
				ctx.arc((pNowSc[0] + pNextSc[0]) / 2, (pNowSc[1] + pNextSc[1]) / 2, r, 0, Math.PI * 2);
				ctx.stroke();
			}
		}

		//draw positions
		ctx.textAlign = "left";
		ctx.font = `${Math.floor(canvas.height / 30)}px Playfair Display`;
		ctx.fillStyle = color_editorHighlight;
		var cPos = screenToSpace(cursor.x, cursor.y);
		ctx.fillText(`player - (${player.x.toFixed(2)}, ${player.y.toFixed(2)}), cursor - (${cPos[0].toFixed(2)}, ${cPos[1].toFixed(2)})`, canvas.width * 0.01, canvas.height * 0.95);

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

	
		//if shift is pressed, teleport the player to some location. I have these set up for convienence
		if (button_shift) {
			[player.x, player.y] = editor_locations[value];
			return;
		}

		//no nines or eights. Ew
		if (value < 8) {
			editor_value = value;
		}
		return;
	}


	switch (code) {
		case 'Left':
			//try to dash if the player is holding shift and then presses a direction (as a little quality of life thing)
			player.ax = -1;
			if (button_shift) {player.dash();}
			break;
		case 'Up':
			player.ay = -1;
			if (button_shift) {player.dash();}
			break;
		case 'Right':
			player.ax = 1;
			if (button_shift) {player.dash();}
			break;
		case 'Down':
			player.ay = 1;
			if (button_shift) {player.dash();}
			break;

		case 'Interact':
			player.attack_start();
			break;
		case 'Space':
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
			if (editor_polyPoints.length < 3) {
				editor_polyPoints = [
					screenToSpace(canvas.width * 0.4, canvas.height * 0.4),
					screenToSpace(canvas.width * 0.6, canvas.height * 0.4),
					screenToSpace(canvas.width * 0.6, canvas.height * 0.6)
				]
			}
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
			player.ax = Math.max(player.ax, 0);
			break;
		case 'Up':
			player.ay = Math.max(player.ay, 0);
			break;
		case 'Right':
			player.ax = Math.min(player.ax, 0);
			break;
		case 'Down':
			player.ay = Math.min(player.ay, 0);
			break;
		case 'Space':
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
	//ideal scaling is 16 blocks / screen lengthwise
	camera.scale = canvas.width / camera.targetWidth;

	//set canvas preferences
	ctx.textBaseline = "middle";
	ctx.textAlign = "center";
	ctx.imageSmoothingEnabled = !data_persistent.alias;

	cty.textBaseline = "middle";
	cty.textAlign = "left";
	cty.imageSmoothingEnabled = !data_persistent.alias;
}





function handleMouseDown_custom() {
	if (menu_t > 0.75) {
		handleMouseDown_menu();
		return;
	}

	//if it's the ending state
	if (game_mainLoop == runEnding) {
		reset();
	}

	if (!editor_active) {
		return;
	}

	if (button_alt) {
		//create a triangle if one doesn't exist

		editor_pointSelected = -1;
		//select closest point within tolerance
		var minDist = 1e1001;
		var dist;
		var scPoints = editor_polyPoints.map(a => spaceToScreen(a[0], a[1]));
		for (var j=0; j<scPoints.length; j++) {
			dist = Math.hypot(scPoints[j][0] - cursor.x, scPoints[j][1] - cursor.y);
			if (dist < editor_selectTolerance && dist < minDist) {
				minDist = dist;
				editor_pointSelected = j;
			}
	
			//midpoint
			var midpoint = [(scPoints[j][0] + scPoints[(j+1)%scPoints.length][0]) / 2, (scPoints[j][1] + scPoints[(j+1)%scPoints.length][1]) / 2];
			dist = Math.hypot(midpoint[0] - cursor.x, midpoint[1] - cursor.y);
			if (dist < editor_selectTolerance && dist < minDist) {
				minDist = dist;
				editor_pointSelected = j + 0.5;
			}
		}

		//if selected a half-point, make it a full point
		if (editor_pointSelected % 1 != 0) {
			var lowP = editor_pointSelected - 0.5;
			var highP = (editor_pointSelected + 0.5) % editor_polyPoints.length;
			editor_polyPoints.splice(lowP + 1, 0, [(editor_polyPoints[lowP][0] + editor_polyPoints[highP][0]) / 2, (editor_polyPoints[lowP][1] + editor_polyPoints[highP][1]) / 2]);
			editor_pointSelected = lowP + 1;
		}

		return;
	}

	//if over a roof, try to move it
	var spa = screenToSpace(cursor.x, cursor.y);
	for (var h=world_roofs.length-1; h>-1; h--) {
		if (distSquared(world_roofs[h].x - spa[0], world_roofs[h].y - spa[1]) < 0.25) {
			editor_entity = world_roofs[h];
			return;
		}
	}

	cursor.pastPoint = [cursor.x, cursor.y];
	setWorldData(...screenToSpace(cursor.x, cursor.y), editor_value);
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
		trueReset();
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

function handleMouseMove_custom() {
	if (menu_t > 0.75 && cursor.down) {
		handleMouseMove_menu();
		return;
	}
	if (!editor_active || !cursor.down) {
		return;
	}

	if (editor_entity != undefined) {
		var spa = screenToSpace(cursor.x, cursor.y);
		editor_entity.x = Math.floor(spa[0] * 10) / 10;
		editor_entity.y = Math.floor(spa[1] * 10) / 10;
		return;
	}

	if (button_alt) {
		if (editor_pointSelected != -1) {
			editor_polyPoints[editor_pointSelected] = screenToSpace(cursor.x, cursor.y);
			return;
		}
		return;
	}

	//create a line between past point and current point
	var dist = ((cursor.pastPoint[0] - cursor.x) ** 2 + (cursor.pastPoint[1] - cursor.y) ** 2) ** 0.5;
	var stops = Math.ceil(dist+0.01) * 3;

	for (var d=0; d<stops; d++) {
		setWorldData(...screenToSpace(linterp(cursor.pastPoint[0], cursor.x, d / stops), linterp(cursor.pastPoint[1], cursor.y, d / stops)), editor_value);
	}



	cursor.pastPoint = [cursor.x, cursor.y];
}

function handleMouseUp_custom() {
	editor_pointSelected = -1;
	editor_entity = undefined;
}