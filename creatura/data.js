var world_map_walls = [
	/*examples of full and empty rows.
   `                                                    `,
   ` _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _  `,
   */
   //0       4         9        14        19        24     x+
   ` x x x x x x x x x x x x x x x x x x x x x x x x x  `,
   `x_x_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _  `, //row 0 starts here
   `                                                    `,
   `x_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _  `, //row 1 starts here
   `         x                                          `,
   `x_ _ _ _x_x_ _ _ _ _ _ _ _x_x_x_x_x_ _ _ _ _ _ _ _  `, //row 2
   `         x                                          `,
   `x_ _ _ _ _ _ _ _ _ _ _ _ _x_ _ _ _ _ _ _ _ _ _ _ _  `, //
   `                                                    `,
   `x_ _ _ _ _ _ _ _ _ _ _ _ _x_ _ _ _ _ _ _ _ _ _ _ _  `, // 4
   `                                                    `,
   `x_ _ _ _ _ _ _ _ _ _ _ _ _x_ _ _ _ _ _ _ _ _ _ _ _  `, //
   ` x x x x x x x x x x x x x                          `,
   `x_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _g_g_g_g_g_g_g_x `, // 6
   ` h h h h h                             g   g g g    `,
   `h0 0 0 0 0h_ _ _ _ _ _ _ _ _ _ _ _ _g_ _ _g_ _ _ _g `, //
   `                                             g g    `,
   `h0 0 0 0 0 _ _ _ _ _ _ _ _ _ _ _ _ _g_ _ _g_ _ _ _x `, // 8
   `                                                    `,
   `h0 0 0 0 0h_ _ _ _ _ _ _ _ _ _ _ _ _g_ _ _ _ _ _ _x `, //
   ` h h h h h x x x x x x x x x x x x x x x x x x x x  `,
];	//z+
var world_map_entities = [
	new Creatura("cat", 8.5, 4.5, 1, "cat", [`cat-1`, `cat-2`, `cat-3`], undefined),
];



var l = "";
//very basic
//standard line: character speaking
//piped line: displayed text
//carated line: command text
var conversations = {
	"wacker": [
		`Hey. I heard you want to be friends`,
		`I have a task for you:`,
		`Collect my pages. Please`,
	],
	"wacker-progress": [
		`When you collect them all, we can be friends.`,
		`There are 8 of them.`
	],
	"wacker-complete": [
		`Wow! That!s! Great!`,
		`...`,
		`I have a confession.`,
		`I lied. I don't want to be friends.`,
		`and now I'm sending you to space.`,
		`>player.ay = 0; player.dy = 0; player.jumpPower = 0;`,
		`>window.setInterval(() => {player.y += 0.05;}, 16); return true;`
	],

	"get-page": [
		`|You got a Page!`,
		`>player.pages += 1; return true;`
	],
	"get-paige": [
		`|You got a Paige!`,
		`player.pages += 1; player.paiges = 1; return true;`,
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

	"cat-1": [
		`Once you have an idea, you can't help but create with that idea in mind.`,
		`Even the exclusion of that idea keeps the idea present and influencing the work.`,
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

	"gothic": [
		`your time in this world is limited.`,
		`>return startConversation("gothic-morph");`
	],
	"gothic-morph": [
		`>return wait(2000);`,
		`>return startConversation("get-page");`
	]
}

var textures = {
	"cat": new Texture(getImage(`img/cat.png`), 390, 6, true, [1, 2]),
	"tallguy": new Texture(getImage(`img/tallguy.png`), 160, 18, true, [1, 2]),
	"wacker": new Texture(getImage(`img/froge.png`), 270, 9, true, [1, 2]),
	"gothic": new Texture(getImage(`img/gothic.png`), 210, 12, true, [1, 1, 1, 1, 1, 2, 2, 3, 3]),
	"gothic-page": new Texture(getImage(`img/gothic-page.png`), 160, 24, false, [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36]),
	"pages": new Texture(getImage(`img/pages.png`), 160, 0, false, [1, 2, 3, 4, 5, 6, 7])
}