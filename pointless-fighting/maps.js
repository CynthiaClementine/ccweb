/*
INDEX:
	importData(arr, character, data);
	importZone(zoneLineString);

	maps_load();

*/


var rawData_maps = 
`
id~world βδ8MAi|music~undefined|coords~-1~0|dims~24~25|palette~Terrain.Empty|ground~0~γU00γU00γU00γU00γU00γU3γγU3γγU3γ*6U3γγU3γγU3γ0*4w000w000w000w000M000M000w000w000w000w000w000w|display~<*7X< *9^ *5<*9   ^ *b<<μ<*6 *7^ *7<*9 ^ *d<*9 *f<*6α<< *7<*9ρ<*7 *4^  <l<*4ε<*4S<*5 *7<*h^*7<<<v<*9φ<<< *7<*h *5^ <*bΞ<*5 ^ *5<*5K<< *o0123456789ab *cc *an *co *az *cA *aL *cM *aX *cYZαγεηικμνυπ *cρσςτφχψωβΓδΔ *cΛξζΣΞΘθΠλΦΨΩ *  *9

id~Soul Gate 1|music~undefined|coords~0~0|dims~44~39|palette~Terrain.Soul|ground~0~vγY0*4fγγw0003γγU0*4γγα0*4fγγw0001γγM0*4vγY0*43γα0*5vγ0*53γw0*5γU0*57Y0*51γ0*6vM0*57Y0*51γ0*620*7w0*51γ0*6vM0*57Y0*51γγw0*4vM80*47Y20*41γ0Y00vMvM1007Y7Y0g01γ1γ043γγMvM10w7Y007g81γ001nW0*5k2w0*45γE0*41020*5nUw0*45280*41hy0*5sgw0*57U|display~ <*f *s<*h *r<*h *r<*h *r<*h *s<*f *t<*f *u<*d *w<*b *y<*9 *z<*9 *A<*7 *B<*7 *B<*7 *wdd   <*7 *wd*4f<*7gdd *td*4j213<013chi *td*4 dqr<oqrgih *y<*7cdd *y<*7 *B<*7 *B<*8^*6 *u<*7 *6^ *u<*7 *6^ *u<*7 *6^*4 *f<*7 *5<*7 *9^ *f<^*5< *5<*7 *9^ *f<^*5< *5<*7 *9^ *6^*9<^*5< *5<*7 *9^ *6^ *8<^*5< *h^^^ ^ *6^ *8<*7 *h^ ^ ^*6 ^ *w^ ^ *6^ ^ *w^ ^*8 ^ *w^ *a^ *w^ ^*6   ^ *w^ ^ *4^   ^ *w^ ^   ^^   ^ *w^^^   ^ *4^ *C^*6 *f|entities~PPR_9_5_start_[[-8,-4],[-9,-1],[-5,0],[-6,3],[-4,1],[5,1],[7,-2],[6,-4]]

id~Buried Treasure - south|music~buriedTreasure|coords~0~0|dims~35~27|palette~Terrain.Treasure|ground~0~0*6eTTγγVvvγγαPqLγvγDHγ*4bγ*4αvγ*4YγZγγγVγγRγγNγZγγXDvγ*4fγγvvαvXZαnYγγγvγFγ*5PγKγTγDγ*5fγZZγαvγγDγYγ*5VLγγγXPγ*5DγγDγγfγαγγγvTXγγYγγTTγU|ground~1~0* 0*Q1M|ground~2~0*εg0*5w0*41|ground~3~01w|ground~4~0*ng0*5w0*41|ground~5~0* 0*b20*540*580*5g0*5w|display~<*a0<<1 *m01<<<1<<0<*51<*i  <0<*51<*m0<<  <<0<<0<0<1<*a0<*d <*41<1<*r <1<*w <*jop^q<*a  <*a0<*8^^^C<*a  <*f0<1^*5<*a  1<*g^^C^^^<*60<<<  <*h^*7<*9 <*h1<<^*5<*9 <*91<*6B<*4^^^0<0<*7 <*j0B^^C<6778<<<0<  <*kMNOu*5l<*4  <*91<<<0<*8FGEuuuvwx<<  <*pFGH<*5  <*e1<*51<*c  <*y <*y <<0<*p0<*5 <*y <*g00<*g <*f0<*i <*70<*60<*i  <*e0<*50<*c  <<< *v|entities~SPK_15_4_0~SPK_4_4_7~SPK_24_6_7~SPK_27_6_5~SPK_20_9_6~SPK_5_10_5~SPK_9_11_1~SPK_12_12_9~SPK_7_14_2~SPK_20_15_3~SPK_27_21_3~SPK_5_21_5~SPK_2_22_0~SPK_10_22_2~SPK_34_23_3~SPK_23_23_0~SPK_19_24_8

id~demo1|music~winter|coords~-11~22|dims~20~13|palette~Terrain.North|ground~0~0f00fU07α01γM0γY0fγw7γY7γγPγ*dLγγM|ground~1~0*Eg|display~ *8<*4 *e<*7 *c<*8 *c<*9 *a<*a *a<*b *8<*d *5<*h  <*  
id~demo2|music~winter|coords~-22~34|dims~11~16|palette~Terrain.North|ground~0~01Y3α3γDγ7α3Y1U0*d2|ground~1~0*9w102|ground~2~s|display~ <<< *7<*5 *6<*7 *41<*9 d<*ad1<*9dd11<*7d*411<*41d*61212d*ψ
id~some assembly required|music~undefined|coords~-12~25|dims~15~16|palette~Terrain.Empty|ground~0~v0280r01jαagnuWU7vNVYvfhVXnfTγγf70UU|display~ *τ<<<> *5δ<<   <Δ< *6<F<   <<<^^   ^<<<   <<<^   ^^<<<   <<ε ^   ^<<<   φ<< ^^ ^ Ξ<<   <<<^^ ^^^<<<   <<<^^^  ^<<<   <3<> *5<<<   <<<> *5<<α *i
id~start|music~winter|coords~0~0|dims~22~14|palette~Terrain.North|ground~0~LγγY7γγM0vγu1xZγα07γγw3γγγMγγNYvγnαdYvα7NγUvαγP|ground~1~g|ground~2~0*bw0020008|display~<*m1*5<*hp*51*677<*ep*6771*4<*g77p*41*5<*hp*51*4<*m1*4<*eABC<*5111<*bc<e<*8111<<1<*5013<*ad11d<*5opq<*aoddq<*jdd<*kpp *6|entities~POR_1_5_Buried Treasure - south~NPC_5_1_#00FF00_entityTest1_TEST1`

//takes in string data and converts it into positions in the array
function importData(arr, character, data) {
	//remove stars
	data = unStarrify(data);

	//first split the data into binary existance
	var expandedData = ``;
	for (var g=0; g<data.length; g++) {
		expandedData += tileImage_map[data[g]].toString(2).padStart(6, 0);
	}

	//map binary data onto array
	var aWidth = arr[0].length;
	for (var c=0; c<expandedData.length; c++) {
		if (expandedData[c] == "1") {
			arr[Math.floor(c / aWidth)][c % aWidth] = character;
		}
	}
}

function importEntities(entityData) {
	console.log(entityData);
	var entityArray = [];

	//loop through all entity constructors
	entityData.forEach(e => {
		//split by underscore
		var trueTag = e.split("_");
		switch (trueTag[0]) {
			case "NPC":
				//figure out how many conversations there are
				var convos = [];
				if (trueTag.length > 5) {
					convos = trueTag.slice(5);
				}
				entityArray.push(new NPC(+trueTag[1], +trueTag[2], trueTag[3], trueTag[4], convos));
				break;
			case "POR":
				entityArray.push(new Portal_Round(+trueTag[1], +trueTag[2], trueTag[3]));
				break;
			case "PPR":
				entityArray.push(new Portal_Polygon(+trueTag[1], +trueTag[2], trueTag[3], JSON.parse(trueTag[4])));
				break;
			case "SPK":
				entityArray.push(new Spike(+trueTag[1], +trueTag[2], +trueTag[3]));
				break;
		}
	});
	return entityArray;
}

function importZone(zoneLineString) {
	var zoneProps = {
		data: [],
		disp: [],
		entities: [],
		music: undefined,
		name: "ERROR: NAME NOT DEFINED",
		path: "",
		x: 0,
		y: 0,
	}
	//first split by tag
	var splitTag = zoneLineString.split("|");

	//parse tags
	splitTag.forEach(s => {
		var superSplit = s.split("~");
		switch (superSplit[0]) {
			case "coords":
				zoneProps.x = superSplit[1] * 1;
				zoneProps.y = superSplit[2] * 1;
				break;
			case "dims":
				zoneProps.data = [];
				zoneProps.disp = [];
				//y size
				for (var b=0; b<superSplit[2]*1; b++) {
					zoneProps.data.push([]);
					zoneProps.disp.push([]);
					for (var a=superSplit[1]*1 - 1; a>=0; a--) {
						zoneProps.data[b][a] = " ";
						zoneProps.disp[b][a] = " ";
					}
				}
				break;
			case "display":
				//update display array
				superSplit[1] = unStarrify(superSplit[1]);
				var char = 0;
				while (char < superSplit[1].length) {
					zoneProps.disp[Math.floor(char/zoneProps.disp[0].length)][char%zoneProps.disp[0].length] = superSplit[1][char];
					char += 1;
				}
				break;
			case "entities":
				zoneProps.entities = importEntities(superSplit);
				break;
			case "ground":
				importData(zoneProps.data, superSplit[1], superSplit[2]);
				break;
			case "id":
				zoneProps.name = superSplit[1];
				break;
			case "music":
				zoneProps.music = superSplit[1];
				break;
			case "palette":
				zoneProps.path = superSplit[1];
				break;
			
		}
	});


	//add zone to world
	addZone(new Zone(zoneProps.x, zoneProps.y, zoneProps.name, zoneProps.data, zoneProps.disp, zoneProps.entities, zoneProps.path, zoneProps.music));
}




function importMaps(data) {
	//access file
	//fetch('./maps.txt').then(r => r.text()).then((data) => {
	var maps = data.split("\n");

	//turn the maps into actual maps
	maps.forEach(m => {
		if (m != "") {
			importZone(m);
		}
	});

	//player stuff
	loading_map = getZone("Soul Gate 1");
	loading_map.entities.push(player);
	//});
}


function exportData(data) {
	var finalString = ``;
	var typeString = ``;
	var buffer1 = "";
	for (var type=0; type<10; type++) {
		for (var y=0; y<data.length; y++) {
			for (var x=0; x<data[0].length; x++) {
				buffer1 += "" + (1 * (data[y][x] === "" + type));

				//if buffer1 is long enough, convert to a character
				if (buffer1.length > 5) {
					
					typeString += tileImage_key[Number.parseInt(buffer1, 2)];
					buffer1 = "";
				}
			}
		}

		//if there are blocks remaining, pad the rest with zeroes
		if (buffer1.length > 0) {
			while (buffer1.length <= 5) {
				buffer1 += "0";
			}
			typeString += tileImage_key[Number.parseInt(buffer1, 2)];
			buffer1 = "";
		}

		//remove lagging 0s
		var lagging0s = 0;
		while (typeString[typeString.length-1-lagging0s] === "0") {
			lagging0s += 1;
		}
		typeString = typeString.substring(0, typeString.length - lagging0s);

		//add stars
		typeString = starrify(typeString);

		//add final string
		if (typeString.length > 0) {
			finalString += `|ground~${type}~${typeString}`;
			typeString = ``;
		}
	}

	//return final string
	finalString = finalString.substring(1);
	return finalString;
}

function exportWorld() {
	var maps = ``;

	//each zone, then each exit
	world_maps.forEach(z => {
		maps += exportZone(z) + "\n";
	});

	return maps;
}

function exportZone(zoneObj) {
	var toReturn = ``;
	//standard properties
	toReturn += `id~${zoneObj.name}`;
	toReturn += `|music~${zoneObj.musicID}`;
	toReturn += `|coords~${zoneObj.x}~${zoneObj.y}`;
	toReturn += `|dims~${zoneObj.data[0].length}~${zoneObj.data.length}`;
	toReturn += `|palette~${zoneObj.palettePath}`;

	//collision data (ground)
	toReturn += `|${exportData(zoneObj.data)}`;

	//image data
	toReturn += `|display~`;
	var imgData = "";
	for (var y=0; y<zoneObj.display.length; y++) {
		for (var x=0; x<zoneObj.display[0].length; x++) {
			imgData += zoneObj.display[y][x];
		}
	}
	toReturn += starrify(imgData);

	//entity data
	var entDat = loading_map.stringifyEntities();
	if (entDat.length > 0) {
		toReturn += `|${entDat}`;
	}

	return toReturn;
}


function starrify(data) {
	var charBuffer = ["", 0];
	var newData = "";
	for (var a=0; a<data.length; a++) {
		//if the current character is different or the buffer is too long, turn into new string
		if (data[a] != charBuffer[0] || charBuffer[1] >= tileImage_key.length-1) {
			//if it's not long enough to become a star
			if (charBuffer[1] < 4) {
				for (var b=0; b<charBuffer[1]; b++) {
					newData += charBuffer[0];
				}
			} else {
				//if it's long enough to be starred
				newData += `${charBuffer[0]}*${tileImage_key[charBuffer[1]]}`;
			}

			//reset buffer
			charBuffer[0] = data[a];
			charBuffer[1] = 1;
		} else {
			//add to the star length
			charBuffer[1] += 1;
		}
	}

	//final character
	if (charBuffer[1] < 4) {
		for (var b=0; b<charBuffer[1]; b++) {
			newData += charBuffer[0];
		}
	} else {
		newData += `${charBuffer[0]}*${tileImage_key[charBuffer[1]]}`;
	}

	return newData;
}

function unStarrify(data) {
	var newData = "";
	for (var c=0; c<data.length; c++) {
		//if the next character is a star
		if (data[c+1] == "*") {
			for (var h=0; h<tileImage_map[data[c+2]]; h++) {
				newData += data[c];
			}
			c += 2;
		} else {
			//regular case
			newData += data[c];
		}
	}

	return newData;
}
