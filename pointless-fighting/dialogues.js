
/*conversation raw data is stored in a giant string. It would be a text file but browsers really don't like it when you try to read a file and
you're not running a local server. They think it's a cross origin request, which is a no go. Anyways.

The format is
§[conversation name]
#[optional conversation requirement]
Conversation participant 0
Conversation participant 1
Conversation participant 2
...
[conversation line 0]
[conversation line 1]
[conversation line 2]
...

a conversation line can take the form
[participant number] - [text]
where the entity with the name referenced by the number will say the text.
Alternatively, a line can take the form
COMMAND - [command name] [arg1] [arg2] [arg3] ...
where a command will execute before automatically moving the conversation to the next line.

To make conversations happen in the game, the name of the conversation is passed to an entity, 
and when the player interacts with that entity, the conversation happens.
If the conversation includes a requirement, then it will only happen if the requirement is met.
Multiple conversations can be passed to a single entity, and they will activate the latest conversation that fulfils its requirement.




*/

var rawData_dialogues = 
`
§TEST1
entityTest1
Player
0 - Hi, how are you?
1 - Well, I just woke up in a strange snowy place, so how well can I really be doing?
0 - Good to hear.
|this is a comment and
|therefore shouldn't have any effect on the dialogue parsing
COMMAND - WALKS 0 2 0
COMMAND - EVAL var randomVariable=true;
0 - I'm over here now! Aren't you happy?
1 - I don't know how to answer that question.
0 - I can talk for quite a long time. If I continue, while my incessant droning may cause some unsightly results, in the end we'll all be wiser. Thank you for coming to my ted talk.


§TEST AGAIBN
#(randomVariable == true)
entityTest1
Player
0 - I'm so glad that you talked to me earlier!
1 - I'm so glad you remembered!
0 - This sure was fun.
1 - ok bye now!
1 - (he's weird let's get out of here)


`;


//takes in conversation data, as seen above, and turns it into an structure that other objects will read from
function importConversations(data) {
	data = data.split("\n");

	//remove blank lines (used for spacing) and vertically separated lines (used for comments)
	data = data.filter(a => a != "" && a[0] != "|");

	//split the data into chunks, each containing 1 conversation
	var workingConvo = undefined;
	for (var a=0; a<data.length; a++) {

		//if it's a conversation starter line, create a new working conversation
		if (data[a][0] == "§") {
			if (workingConvo != undefined) {
				data_dialogues[workingConvo.name] = workingConvo;
			}
			workingConvo = {
				name: data[a].slice(1),
				characters: [],
				lines: []
			};
		} else if (data[a][0] == "#") {
			//if it's a condition line
			workingConvo.requires = data[a].slice(1);
		} else {
			//at this point, it'll either be a text line or a character line.
			var theLine = data[a].split(" - ");

			//text lines have the dash, character lines do not
			if (theLine.length == 1) {
				workingConvo.characters.push(theLine[0]);
			} else {
				workingConvo.lines.push([+theLine[0], theLine[1]]);
			}
		}
	}

	//make sure the last conversation gets pushed out as well
	data_dialogues[workingConvo.name] = workingConvo;
}

function conversationParseCommand(commandLine) {
	//first break the line into its parts
	var split = commandLine.split(" ");

	//run different functions depending on the command
	switch (split[0]) {
		case "EVAL":
			//the rest of the command can span across multiple spaces, so first concat. those
			var command = split.slice(1).reduce((a, b) => a + " " + b);
			eval(command);
			return (function() {return true;});
		case "WALKS":
			var entityRef = loading_state.entities[+split[1]];
			//tell the entity to walk to the specified location
			entityRef.pathTo(entityRef.x + +split[2], entityRef.y + +split[3]);
			
			//the command is done once the entity has walked to that location
			return (function() {return (entityRef.x == entityRef.targetPos[0] && entityRef.y == entityRef.targetPos[1]);});
		default:
			console.error(`Unknown command: ${split[0]}`)
			return (function() {return true;});
	}
}