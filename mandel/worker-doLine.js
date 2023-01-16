function computeRow(package) {
    var [cornerX, cornerY, scale, pixelSize, maxIterations, ctxW, y, workTracker] = package.data;
    var outObj = {
        index: y,
        workIndex: workTracker,
        penUltI: 0,
        ultI: 0,
        arr: []

    };
    var i;
    var cx;
    var cy;
    var zx;
    var zy;
    var color;
    for (var x=0; x<ctxW; x+=pixelSize) {
        /*initializing variables. i is number of iterations, 
        cx/cy are starting coordinates (stay the same), 
        and zx/zy are iterating coordinates (change with every iteration) */
        i = 0;
        cx = (x / scale) + cornerX;
        cy = ((y * pixelSize) / scale) + cornerY;
        zx = 0;
        zy = 0;

        //main processing loop
        while(i < maxIterations && zx * zx + zy * zy < 4) {
            i += 1;
            //these are kind of cheaty, I can get away with not using complex numbers with this formula
            //xt = z
            xt = 2 * zx * zy;
            //z = z^2 + c
            zx = zx * zx - zy * zy + cx;
            zy = xt + cy;
        }

        //draw colors based on i
        if (i != maxIterations) {
            color = "hsl(" + (i*4) + ", 75%, 50%)";

            //if i is not max iterations and is larger than almost all the other i, log it
            if (i > outObj.penUltI) {
                if (i > outObj.ultI) {
                    outObj.penUltI = outObj.ultI;
                    outObj.ultI = i;
                } else {
                    outObj.penUltI = i;
                }
            }
        } else {
            color = "#000";
        }

        //write the color to the array
        outObj.arr.push(color);
    }

    postMessage(outObj);
}

onmessage = computeRow;