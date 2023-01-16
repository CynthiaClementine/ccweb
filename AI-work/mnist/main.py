#NAME: [REDACTED]
#DATE: June-4-2022

import math
import random
import copy
import sys
import json

class Network:
	def __init__(self, layerParams, weightsOPTIONAL, biasesOPTIONAL):
		#network properties
		self.layerParams = layerParams
		self.network = []
		self.trainRate = 0.1
		self.createNetwork(weightsOPTIONAL, biasesOPTIONAL)

	def createNetwork(self, weights, biases):
		self.network = []

		for l in range(1, len(self.layerParams)):
			self.network.append([])

			for a in range(self.layerParams[l]):
				weightList = []

				for g in range(self.layerParams[l-1]):
					weightList.append((random.random() * 2 - 1) if (weights == None) else weights[l-1][a][g])

				self.network[l-1].append({
					'w': weightList,
					'b': (random.random() * 2 - 1) if (biases == None) else biases[l-1][a]
				})

	def evaluate(self, inputs):
		newValues = []

		for l in range(len(self.network)):
			newValues = []
			for m in range(len(self.network[l])):
				nowNode = self.network[l][m]
				newValues.append(nowNode['b'])

				for p in range(len(nowNode['w'])):
					newValues[m] += inputs[p] * nowNode['w'][p]
				newValues[m] = sigmoid(newValues[m])

			inputs = newValues
		return newValues

	def evaluateLoss(self, inputs, outputs):
		loss = 0
		thinkOutput = self.evaluate(inputs)

		for g in range(len(outputs)):
			loss += 0.5 * (outputs[g] - thinkOutput[g]) ** 2

		return loss

	def exportNetwork(self):
		#gotta make a copy of the network for all weights + biases, essentially
		weights = copy.deepcopy(self.network)
		biases = copy.deepcopy(self.network)

		for l in range(len(self.network)):
			for n in range(len(self.network[l])):
				weights[l][n] = weights[l][n]['w']
				biases[l][n] = biases[l][n]['b']
		
		return {
			'w': weights,
			'b': biases
		}

	def trainOnce(self, inputs, expectedOutputs):
		xValues = []
		aValues = [inputs]
		newValues = []
		newXs = []

		for l in range(len(self.network)):
			newValues = []
			newXs = []
			for m in range(len(self.network[l])):
				nowNode = self.network[l][m]
				newXs.append(nowNode['b'])
				for p in range(len(nowNode['w'])):
					newXs[m] += inputs[p] * nowNode['w'][p]

				newValues.append(sigmoid(newXs[m]))

			inputs = newValues
			xValues.append(newXs)
			aValues.append(newValues)

		frontError = []
		currentError = []

		applyNet = self.network#copy.deepcopy(self.network)

		for n in range(len(newValues)):
			neuronRef = self.network[len(self.network)-1][n]
			neuronRef2 = applyNet[len(self.network)-1][n]

			frontError.append(expectedOutputs[n] - newValues[n])

			neuronDelta = self.trainRate * frontError[n] * sigmoidAnti(xValues[len(xValues)-1][n])
			for w in range(len(neuronRef['w'])):
				neuronRef2['w'][w] += neuronDelta * aValues[len(self.network)-1][w]
			neuronRef2['b'] += neuronDelta

		for k in range(len(self.network)-2, -1, -1):
			for n in range(len(self.network[k])):
				neuronRef = self.network[k][n]
				neuronRef2 = applyNet[k][n]

				currentError.append(0)
				for p in range(len(self.network[k+1])):
					currentError[n] += frontError[p] * sigmoidAnti(xValues[k+1][p]) * self.network[k+1][p]['w'][n]

				neuronDelta = self.trainRate * currentError[n] * sigmoidAnti(xValues[k][n])
				for w in range(len(neuronRef['w'])):
					neuronRef2['w'][w] += neuronDelta * aValues[k][w]
				neuronRef2['b'] += neuronDelta
			
			frontError = currentError
			currentError = []

		self.network = applyNet


def sigmoid(x):
	return 1 / (1 + math.e ** -x)

def sigmoidAnti(x):
	return sigmoid(x) * (1 - sigmoid(x))










#actual program here
epochsMax = 2000
fileSplitStr = "~|~|~|~"
imageSize = 28
imageMaxBrightness = 255
mainNetworkSize = [imageSize * imageSize, 10]
networkError = 1e10
tolerance = 10

trainData = []
testData = []

def createImageStruct(storageArr, fileName):
	with open(fileName) as file:
		for line in file:
			sanitized = line.replace("\n", "").split(",")
			sanitized = [int(x) for x in sanitized]

			#turn classification into a one-hot vector
			classifyVector = [0] * 10
			classifyVector[sanitized[0]] = 1

			#separate into classication / data
			storageArr.append([[w / imageMaxBrightness for w in sanitized[1:]], classifyVector])

def evaluateLoss(outputs, expectedOutputs):
	loss = 0

	for g in range(len(outputs)):
		loss += 0.5 * (outputs[g] - expectedOutputs[g]) ** 2

	return loss


#create the image data


print("creating image structs...")
createImageStruct(trainData, "mnist_train.csv")
createImageStruct(testData, "mnist_test.csv")


#create the network
mainWeights = None
mainBiases = None
if (len(sys.argv) > 2 and sys.argv[1] == "-f"):
	print("reading data file")

	
	#read in the file name as the network's weights / biases
	with open(sys.argv[2]) as netDataFile:
		text = ""
		for line in netDataFile:
			text += line

		splitText = text.split(fileSplitStr)
		mainWeights = json.loads(splitText[0])
		mainBiases = json.loads(splitText[1])

mainNet = Network(mainNetworkSize, mainWeights, mainBiases)

#train the network until the error is low enough or until it's been too long
epochs = 0
print("starting!")
while (networkError > tolerance and epochs < epochsMax):
	
	epochLoss = 0
	numCorrect = 0
	
	#train on the whole training set once
	if (epochs % 5 != 0):
		for numeral in trainData:
			mainNet.trainOnce(*numeral)
	else:
		networkError = 0
		for numeral in trainData:
			#keep a running total of the loss as self is training
			networkOut = mainNet.evaluate(numeral[0])
			networkNumberThink = networkOut.index(max(networkOut))
			correct = int(networkNumberThink == numeral[1].index(max(numeral[1])))
			numCorrect += correct
			networkError += 1 - correct

			epochLoss += evaluateLoss(networkOut, numeral[1])
			mainNet.trainOnce(*numeral)


		#now that we're done...

		#every few epochs do a run of the test set to see how well the network is doing
		if (epochs % 5 == 0):
			networkError = 0
			for numeral in testData:
				networkOut = mainNet.evaluate(numeral[0])
				networkNumberThink = networkOut.index(max(networkOut))
				#if the network gets different, add to the error
				networkError += int(networkNumberThink != numeral[1].index(max(numeral[1])))
			print("True error is {} / {}".format(networkError, len(testData)))

		#write the network data to the output file
		with open("netData.txt", "w") as netFile:
			output = ""
			netRepresent = mainNet.exportNetwork()

			output += "["
			output += " ".join([str(y) for y in netRepresent['w']])
			output += "]" + fileSplitStr + "["
			output += " ".join([str(y) for y in netRepresent['b']])
			output += "]"
			netFile.write(output)

		#give a little progress log
		print("Epoch {}: {} / {} classified correctly. ({}%) Average loss is {}".format(
			epochs, numCorrect, len(trainData), (numCorrect / len(trainData)) * 100, epochLoss / len(trainData)
		))


	#go again
	epochs += 1
