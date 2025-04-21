var l = "";
//very basic
//standard line: character speaking
//piped line: displayed text
//carated line: command text

function conditionalComplete(condition) {
	if (!condition) {
		conversingWith.convo -= 1;
	}
	return true;
}

function del(entity) {
	var cell = [Math.floor(entity.x), Math.floor(entity.z)];
	world_map[cell[1]][cell[0]].entities = [];
	conversingWith = undefined;
	//idiotic
	window.setTimeout(() => {
		conversingWith = undefined;
	}, 20);
}

var conversations = {
	"wacker": [
		`Hey. I heard you want to be friends`,
		`I have a task for you:`,
		`Collect my pages. Please`,
	],
	"wacker-progress": [
		`>if (player.pages == 8) {return startConversation("wacker-complete");} return true;`,
		`When you collect them all, we can be friends.`,
		`There are 8 of them.`,
		`>return conditionalComplete(player.pages == 8);`
	],
	"wacker-complete": [
		`Wow! That!s! Great!`,
		`...`,
		`I have a confession.`,
		`I lied. I don't want to be friends.`,
		`and now I'm sending you to space.`,
		`>player.ay = 0; player.dy = 0; player.jumpPower = 0; return true;`,
		`>window.setInterval(() => {player.y += 0.05;}, 16); return true;`
	],

	"get-page": [
		`|You got a Page!`,
		`>player.pages += 1; return true;`,
		`>del(conversingWith); return true;`
	],
	"get-paige": [
		`|You got a Paige!`,
		`>player.pages += 1; player.paiges = 1; return true;`,
		`>del(conversingWith); return true;`
	],

	
	"tallGuy-1": [
		`I'm trying to be friends`,
		`but I don't know how`,
	],
	"tallGuy-2": [
		`Oh geez oh gosh oh augh`,
		`sorry`,
	],
	"tallGuy-3": [
		`I'm thinking of wearing a suit`,
		`...`,
		`no. nevermind`
	],
	"tallGuy-4": [
		`I rode an airplane once`,
		`it was fun`,
		`maybe I'll ride an airplane again`,
	],

	"cat-1": [
		`Once you have an idea,`,
		`you can't help but create with that idea in mind.`,
		`Even the exclusion of that idea`,
		`keeps the idea present and influencing the work.`,
	],
	"cat-2": [
		`You may think I misspell words sometimes,`,
		`But this would actua`+l+`ly be a misconception.`,
		`You just need to change your perspective.`
	],
	"cat-3": [
		`Take your age.`,
		`Multiply it by two.`,
		`Now subtract four.`,
		`Divide it by three.`,
		`Add seven.`,
		`Multiply by two.`,
		`Add one.`,
		`Add seven again.`,
		`Subtract three.`,
		`OK now take that'.`,
		`And divide by four.`,
		`wasn't that fun? (:`
	],
	"doll-1": [
		`awawa`,
	],
	"doll-2": [
		`sitting in this corner.`,
		``,
		`it is a gift.`,
		`this one is gracious.`
	],
	"doll-3": [
		`this one thinks.`,
		`therefore? this one is?`
	],
	"doll-4": [
		`sweep sweep i guess.`,
		`it's not really my thing.`,
		`but i hear it's popular.`,
		`i can talk about popular things.`
	],
	"doll-5": [
		`goobyee~`
	],

	"gothic": [
		`your time in this world is limited.`,
		`>return startConversation("gothic-morph");`
	],
	"gothic-morph": [
		`>conversingWith.tex = textures["gothic-page"]; return wait(3);`,
		`>return startConversation("get-page");`
	],
};

var textures = {
	"cat": new Texture(getImage(`img/cat.png`), 390, 6, true, [1, 2]),
	"tallguy": new Texture(getImage(`img/tallguy.png`), 160, 18, true, [1, 2]),
	"wacker": new Texture(getImage(`img/froge.png`), 270, 9, true, [1, 2]),
	"gothic": new Texture(getImage(`img/gothic.png`), 210, 12, false, [1, 1, 1, 1, 1, 2, 2, 3, 3]),
	"gothic-page": new Texture(getImage(`img/gothic-page.png`), 160, 24, false, [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36]),
	"pages": new Texture(getImage(`img/pages.png`), 160, 0, false, [1, 2, 3, 4, 5, 6, 7]),
	"doll": new Texture(getImage(`img/doll.png`), 180, 0, false, [1])
};


var world_map_walls = [
	/*examples of full and empty rows.
   `                                                                                                                     `,
   ` _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ `,
   */
   //0       4         9        14        19        24        29        34        39        44        49        54        x+
   ` x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x `,
   `x_x_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _x_ _ _ _ _ _ _x_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _x`, //row 0 starts here
   `                                                                                               x                     `,
   `x_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _x_ _ _ _ _ _ _ _ _ _ _ _ _ _x_x_ _ _ _ _ _ _ _ _ _x`, //row 1 starts here
   `         x                 x x x x                                                             x                     `,
   `x_ _ _ _x_x_ _ _ _ _ _ _ _x_ _ _ _ _ _ _ _ _ _ _ _ _x_ _ _ _ _ _ _x_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _x`, //row 2
   `         x                                                                                                           `,
   `x_ _ _ _ _ _ _ _ _ _ _ _ _x_ _ _ _ _ _ _ _ _ _ _ _ _x_ _ _ _ _ _ _x_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _x`, //
   `                                     g g g g g g g g                             x                                   `,
   `x_ _ _ _ _ _ _ _ _ _ _ _ _x_ _ _ _ _ _ _g_ _ _g_g_ _x_ _ _ _ _ _ _x_ _ _ _ _ _ _x_x_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _x`, // 4
   `                                     g     g g   g                               x                                   `,
   `x_ _ _ _ _ _ _ _ _ _ _ _ _x_ _ _ _ _g_ _g_ _ _ _ _g_x_ _ _ _ _ _ _x_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _x`, //
   ` x x x x x x x x x x x x x             g                                                                             `,
   `x_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _g_g_g_g_g_g_g_g_x_ _ _ _ _ _ _x_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _x`, // 6
   ` h h h h h                             g   g g g                                           x                         `,
   `hH H H H Hh_ _ _ _ _ _ _ _ _ _ _ _ _g_ _ _g_ _ _ _g_x_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _x_x_ _ _ _ _ _ _ _ _ _ _ _x`, //
   `                                             g g g                                         x                         `,
   `hH H H H H _ _ _ _ _ _ _ _ _ _ _ _ _g_ _ _g_ _ _g_ _x_ _ _ _ _ _ _x_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _x`, // 8
   `                                       g g                                                                           `,
   `hH H H H Hh_ _ _ _ _ _ _ _ _ _ _ _ _g_ _ _ _ _g_ _g_x_ _ _ _ _ _ _x_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _x`, // 
   ` h h h h h x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x           x                                 `,
   `x_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _x_x_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _x`, // 10
   `                                                                                   x                                 `,
   `x_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _x`, //
   `                                                                                                                     `,
   `x_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _x`, // 12
   `                                                                                                                     `,
   `x_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _x`,
   ` x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x `,
];	//z+
var world_map_entities = [
	new Creatura(`wack`, 8.5, 4.5, 0.6, textures[`wacker`], [`wacker`, `wacker-progress`, `wacker-complete`]),
	new Creatura(`cat`, 15.5, 9.5, 1, textures[`cat`], [`cat-1`, `cat-2`, `cat-3`]),
	new Creatura(`tallGuy`, 3.1, 8.1, 2, textures[`tallguy`], [`tallGuy-1`, `tallGuy-2`, `tallGuy-3`, `tallGuy-4`]),
	new Creatura(`goth`, 2.5, 12.5, 1, textures[`gothic`], [`gothic`, `gothic-morph`]),
	new Creatura(`doll`, 56.5, 13.5, 1, textures[`doll`], [`doll-1`, `doll-2`, `doll-3`, `doll-4`, `doll-5`]),

	new Creatura(`1`, 0.5, 5.5, 0.5, textures[`pages`], [`get-page`]),
	new Creatura(`2`, 36.5, 1.5, 0.5, textures[`pages`], [`get-page`]),
	new Creatura(`3`, 21.5, 9.7, 0.5, textures[`pages`], [`get-page`]),
	new Creatura(`4`, 1.5, 6.5, 0.5, textures[`pages`], [`get-page`]),
	new Creatura(`5`, 25.5, 9.5, 0.5, textures[`pages`], [`get-page`]),
	new Creatura(`6`, 11.5, 12.5, 0.5, textures[`pages`], [`get-page`]),
	new Creatura(`7`, 24.5, 12.5, 0.5, textures[`pages`], [`get-paige`]),
];