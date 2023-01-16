#NAME: [REDACTED]
#DATE: May-21-2022

import math
import sys

zeroTolerance = 1e-8
trainRate = 0.1
currentCoords = [0, 0]
gradientMagnitude = 1e10


def funcA(x, y):
    return (4 * x * x) - (3 * x * y) + (2 * y * y) + (24 * x) - (20 * y)

def funcAX(x, y):
    return (8 * x) - (3 * y) + 24

def funcAY(x, y):
    return (4 * y) - (3 * x) - 20


def funcB(x, y):
    return (1 - y) ** 2 + (x - y * y) ** 2

def funcBX(x, y):
    return 2 * (x - y * y) 

def funcBY(x, y):
    return -2 * (1 - y) - 4 * y * (x - y * y)

def funcC(x):
    return math.sin(x) + math.sin(3 * x) + math.sin(4 * x)

# def funcCX(x):
#     return math.cos(x) + 3 * math.cos(3 * x) + 4 * math.cos(4 * x)


functionData = {
    "A": {
        "f": funcA,
        "partialX": funcAX,
        "partialY": funcAY
    },
    "B": {
        "f": funcB,
        "partialX": funcBX,
        "partialY": funcBY
    },
}


#a function that finds the minimum of a function by pretending every function is a line
def lineOptimize(f, minX, maxX, tolerance):
    #if the range is too small, call it good
    if (maxX - minX < tolerance):
        return (minX + maxX) / 2

    range = maxX - minX

    #figure 1/3 and 2/3 values
    minThirdVal = f(minX + (range / 3))
    maxThirdVal = f(minX + (2 * range / 3))

    #if 1/3rd > 2/3, the value can't be between 0 and 1/3rd because the line slopes down
    if (minThirdVal > maxThirdVal):
        return lineOptimize(f, minX + (range / 3), maxX, tolerance)

    #likewise for 2/3rds > 1/3rd
    return lineOptimize(f, minX, minX + (2 * range / 3), tolerance)


#takes a two-dimensional function and turns it into a 1-dimensional function where x is varied by the xVector
def createLine(f, startingCoords, xVector):
    #this is a weird trick
    def abc123(x):
        return f(startingCoords[0] + (xVector[0] * x), startingCoords[1] + (xVector[1] * x))
    return abc123






#MAIN PROGRAM
mode = functionData[sys.argv[1]]
epochs = 0
while (gradientMagnitude > zeroTolerance and epochs < 1000):
    #figure out gradient vector
    gradientX = mode["partialX"](*currentCoords)
    gradientY = mode["partialY"](*currentCoords)
    gradientMagnitude = (gradientX ** 2 + gradientY ** 2) ** 0.5

    print("Epoch {}: currently at ({}, {}). Gradient is [{}, {}] (function value is {})".format(
        epochs, currentCoords[0], currentCoords[1], gradientX, gradientY, mode["f"](*currentCoords)
    ))

    #LINE OPTIMIZATION HERE
    #figure out how far to move
    adventureLine = createLine(mode["f"], currentCoords, [-gradientX, -gradientY])
    #line optimize function will say what the theoretically best distance to walk is. I want to walk a little, but not too terribly much, so I bound it between 0.01 and 2
    trainRate = lineOptimize(adventureLine, 0.01, 2, zeroTolerance)

    #move
    currentCoords[0] -= trainRate * gradientX
    currentCoords[1] -= trainRate * gradientY

    epochs += 1
