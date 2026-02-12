
import requests
import re

#turns the raw html into readable data. This does not work if there's multiple tables in the document, it only pulls from the first table.
#however! That's all we need for now
def readTable(text):
	#get just the table part of the html
	indStart = text.index("<table")
	indEnd = text.index("</table>")
	tableText = text[indStart:indEnd]
	
	#turn html into array data
	#search through the table for bits that look like >xxx<, that's where the character and its position are stored
	#up to 3 characters long seems to work
	dataMatches = re.findall('>..?.?<', tableText)
	dataMatches = [dataMatches[i][1:-1] for i in range(len(dataMatches))]
	
	#now turn that into a character-by-character system
	tableArr = []
	while len(dataMatches) > 0:
		#reordering this to be x, y, char because it makes more sense in my brain
		tableArr.append([int(dataMatches[0]), int(dataMatches[2]), dataMatches[1]])
		dataMatches = dataMatches[3:]
	print(tableArr)
	return tableArr

#this is the main function that you should call
def readDoc(url):
	#get data from the google doc
	pageText = requests.get(url=url).text
	#find just the table
	tableArr = readTable(pageText)
	
	gridStorage = []
	
	for elem in tableArr:
		#make sure the grid can store all the lines
		while len(gridStorage) <= elem[1]:
			gridStorage.append([])
		while len(gridStorage[elem[1]]) <= elem[0]:
			gridStorage[elem[1]].append(' ')
		gridStorage[elem[1]][elem[0]] = elem[2]

	#now print!
	for i in range(len(gridStorage) - 1, -1, -1):
		print(''.join(gridStorage[i]))


readDoc("https://docs.google.com/document/d/e/2PACX-1vQGUck9HIFCyezsrBSnmENk5ieJuYwpt7YHYEzeNJkIb9OSDdx-ov2nRNReKQyey-cwJOoEKUhLmN9z/pub")


