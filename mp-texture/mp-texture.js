const IdentityMatrix = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1])

/**
 * Compiles vertex and fragment shaders, and links them into a program.
 * @param {string} vs_source The source code of the vertex shader.
 * @param {string} fs_source The source code of the fragment shader.
 * @return {WebGLProgram} The compiled and linked shader program.
 */
function compileShader(vs_source, fs_source) {
    const vs = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vs, vs_source)
    gl.compileShader(vs)
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(vs))
        throw Error("Vertex shader compilation failed")
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fs, fs_source)
    gl.compileShader(fs)
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(fs))
        throw Error("Fragment shader compilation failed")
    }

    const program = gl.createProgram()
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program))
        throw Error("Linking failed")
    }
    
    // loop through all uniforms in the shader source code
    // get their locations and store them in the GLSL program object for later use
    const uniforms = {}
    for(let i=0; i<gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS); i+=1) {
        let info = gl.getActiveUniform(program, i)
        uniforms[info.name] = gl.getUniformLocation(program, info.name)
    }
    program.uniforms = uniforms

    return program
}

/**
 * Generate a model in JSON format using window.grid.
 * 
 * @returns model of the terrain in JSON format
 */
function generateModel() {
    if (window.grid == null) return;

    const gridsize = grid.length;
    const geom = {
        triangles: [],
        attributes: [[]]
    };

    for (let i = 0; i < gridsize - 1; i++) {
        for (let j = 0; j < gridsize - 1; j++) {
            const vertexIndex = i * gridsize + j;
            const nextRowVertexIndex = (i + 1) * gridsize + j;

            // Adding two triangles for each grid cell
            geom.triangles.push([vertexIndex, vertexIndex + 1, nextRowVertexIndex]);
            geom.triangles.push([vertexIndex + 1, nextRowVertexIndex + 1, nextRowVertexIndex]);

            // Calculating normalized coordinates and adding them to the attributes
            const normalizedX = (i / (gridsize - 1)) * 2 - 1;
            const normalizedZ = (j / (gridsize - 1)) * 2 - 1;
            const normalizedY = grid[i][j];

            // Adding the current vertex to the attributes
            geom.attributes[0].push([normalizedX, normalizedY, normalizedZ]);
        }

        // Adding the last vertex of the current row to the attributes
        const normalizedX = (i / (gridsize - 1)) * 2 - 1;
        const normalizedZ = 1;
        const normalizedY = grid[i][gridsize - 1];
        geom.attributes[0].push([normalizedX, normalizedY, normalizedZ]);
    }

    // Adding the last row of vertices to the attributes
    for (let j = 0; j < gridsize; j++) {
        const normalizedX = 1;
        const normalizedZ = (j / (gridsize - 1)) * 2 - 1;
        const normalizedY = grid[gridsize - 1][j];
        geom.attributes[0].push([normalizedX, normalizedY, normalizedZ]);
    }

    return geom;
}

/**
 * Sends per-vertex data to the GPU and connects it to a VS input
 * 
 * @param data    a 2D array of per-vertex data (e.g. [[x,y,z,w],[x,y,z,w],...])
 * @param loc     the layout location of the vertex shader's `in` attribute
 * @param mode    (optional) gl.STATIC_DRAW, gl.DYNAMIC_DRAW, etc
 * 
 * @returns the ID of the buffer in GPU memory; useful for changing data later
 */
function supplyDataBuffer(data, loc, mode) {
    if (mode === undefined) mode = gl.STATIC_DRAW
    
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    const f32 = new Float32Array(data.flat())
    gl.bufferData(gl.ARRAY_BUFFER, f32, mode)
    
    gl.vertexAttribPointer(loc, data[0].length, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(loc)
    
    return buf;
}

/**
 * Creates a Vertex Array Object and puts into it all of the data in the given
 * JSON structure, which should have the following form:
 * 
 * ````
 * {"triangles": a list of of indices of vertices
 * ,"attributes":
 *  [ a list of 1-, 2-, 3-, or 4-vectors, one per vertex to go in location 0
 *  , a list of 1-, 2-, 3-, or 4-vectors, one per vertex to go in location 1
 *  , ...
 *  ]
 * }
 * ````
 * 
 * @returns an object with four keys:
 *  - mode = the 1st argument for gl.drawElements
 *  - count = the 2nd argument for gl.drawElements
 *  - type = the 3rd argument for gl.drawElements
 *  - vao = the vertex array object for use with gl.bindVertexArray
 */
function setupGeomery(geom) {
    var triangleArray = gl.createVertexArray()
    gl.bindVertexArray(triangleArray)

    for(let i=0; i<geom.attributes.length; i+=1) {
        let data = geom.attributes[i]
        supplyDataBuffer(data, i)
    }

    var indices = new Uint16Array(geom.triangles.flat())
    var indexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW)

    return {
        mode: gl.TRIANGLES,
        count: indices.length,
        type: gl.UNSIGNED_SHORT,
        vao: triangleArray
    }
}

/** Draw one frame */
function draw(seconds) {
    if (window.grid == null) {
        return;
    }

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.useProgram(program)

    gl.bindVertexArray(geom.vao)

    gl.uniform4fv(program.uniforms.color, window.color)

    let m = IdentityMatrix
    let cameraPos = [1.5*Math.cos(0.4*seconds), 1.1, 1.5*Math.sin(0.4*seconds)]
    let v = m4view(cameraPos, [0,0,0], [0,1,0])

    let ld = normalize([0.6, 1, 0.6]);
    let viewDir = normalize(cameraPos);
    let h = normalize(add(ld, viewDir));

    gl.uniform3fv(program.uniforms.lightdir, ld)
    gl.uniform3fv(program.uniforms.lightcolor, [1,1,1])
    gl.uniform3fv(program.uniforms.halfway, h)

    gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(v,m))
    gl.uniformMatrix4fv(program.uniforms.p, false, p)
    
    gl.drawElements(geom.mode, geom.count, geom.type, 0)
}

/**
 * Continuously updates the scene using requestAnimationFrame.
 * @param {number} milliseconds The elapsed time in milliseconds.
 */
function tick(milliseconds) {
    draw(milliseconds/1000)
    requestAnimationFrame(tick) // asks browser to call tick before next frame
}

/**
 * Resize canvas size after screen size has been changed.
 */
function fillScreen() {
    let canvas = document.querySelector('canvas')
    document.body.style.margin = '0'
    canvas.style.width = '100vw'
    canvas.style.height = '100vh'
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight
    canvas.style.width = ''
    canvas.style.height = ''
    gl.viewport(0,0, canvas.width, canvas.height)
    window.p = m4perspNegZ(0.1, 12.5, 1.25, canvas.width, canvas.height);
}

/**
 * Add grid-based normals to geometry.
 * 
 * @param {Geometry returned by SetupGeometry()} geom 
 */
function addNormals(geom) {
    let ni = geom.attributes.length
    geom.attributes.push([])
    for(let i = 0; i < geom.attributes[0].length; i+=1) {
        geom.attributes[ni].push([0,0,0])
    }
    for(let i = 0; i < geom.triangles.length; i+=1) {
        let p0 = geom.attributes[0][geom.triangles[i][0]]
        let p1 = geom.attributes[0][geom.triangles[i][1]]
        let p2 = geom.attributes[0][geom.triangles[i][2]]
        let e1 = sub(p1,p0)
        let e2 = sub(p2,p0)
        let n = cross(e1,e2)
        geom.attributes[ni][geom.triangles[i][0]] = add(geom.attributes[ni][geom.triangles[i][0]], n)
        geom.attributes[ni][geom.triangles[i][1]] = add(geom.attributes[ni][geom.triangles[i][1]], n)
        geom.attributes[ni][geom.triangles[i][2]] = add(geom.attributes[ni][geom.triangles[i][2]], n)
    }
    for(let i = 0; i < geom.attributes[0].length; i+=1) {
        geom.attributes[ni][i] = normalize(geom.attributes[ni][i])
    }
}

/**
 * Add texture coordinates to geometry.
 * 
 * @param {Geometry returned by SetupGeometry()} geom 
 */
function addTextureCoords(geom) {
    let ni = geom.attributes.length
    geom.attributes.push([])
    for(let i = 0; i < geom.attributes[0].length; i+=1) {
        geom.attributes[ni].push([
            (geom.attributes[0][i][0] + 1.0) / 2.0,
            (geom.attributes[0][i][2] + 1.0) / 2.0
        ])
    }
}

/**
 * Generate grid according to given gridsize.
 * Then, apply faults to the grid.
 * @param {number of faults to be applied} faults 
 * @param {size of the grid, should be within 2-255} gridsize 
 */
function generateGrid(gridsize, faults) {
    // Generate grid initialized to 0 (flat terrain)
    window.grid = new Array(gridsize);
    for (let i = 0; i < gridsize; i++) {
        window.grid[i] = new Array(gridsize).fill(0);
    }

    // adjustable parameters
    const delta = 1;
    const c = 1;

    // Apply faults
    for (let f = 0; f < faults; f++) {
        // Generate a random point p in the (x,y) bounds of the grid
        const px = Math.floor(Math.random() * gridsize);
        const py = Math.floor(Math.random() * gridsize);

        // Generate a random normal vector n=(cos(t), sin(t), 0) where t is random
        const t = Math.random() * 2 * Math.PI;
        const nx = Math.cos(t);
        const ny = Math.sin(t);

        // For each vertex b, test which side of the plane that vertex falls on by
        // using the product test (b-p) * n >= 0
        for (let i = 0; i < gridsize; i++) {
            for (let j = 0; j < gridsize; j++) {
                const bx = i - px;
                const by = j - py;
                const distance = Math.sqrt(bx**2 + by**2);
                
                const scale = distance !== 0 ? (5.0 / (4.0 + distance)) : 1; 

                const dotProduct = bx * nx + by * ny;

                // If b is in the negative half-space, lower the z coordinate of b by some amount delta
                // If b is in the positive half-space, raise the z coordinate of b by some amount delta
                const dynamicDelta = delta * scale;
                window.grid[i][j] += dotProduct >= 0 ? dynamicDelta : -dynamicDelta;
            }
        }
    }

    // normalize heights
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < gridsize; i++) {
        for (let j = 0; j < gridsize; j++) {
            min = Math.min(min, grid[i][j]);
            max = Math.max(max, grid[i][j]);
        }
    }

    if (faults > 0 && max !== min) {
        for (let i = 0; i < gridsize; i++) {
            for (let j = 0; j < gridsize; j++) {
                grid[i][j] = c * (grid[i][j] - 0.5 * (max + min)) / (max - min);
            }
        }
    }

    let model = generateModel()
    addNormals(model)
    addTextureCoords(model)
    window.geom = setupGeomery(model)
}

// load shaders and model and start animation at load event
window.addEventListener('load', async (event) => {
    window.gl = document.querySelector('canvas').getContext('webgl2',
        {antialias: false, depth:true, preserveDrawingBuffer:true}
    )
    window.vs = await fetch('mp-texture-vertex.glsl').then(res => res.text())
    window.fs = await fetch('mp-texture-fragment.glsl').then(res => res.text())
    window.vs2 = await fetch('mp-texture-vertex2.glsl').then(res => res.text())
    window.fs2 = await fetch('mp-texture-fragment2.glsl').then(res => res.text())
    window.program = compileShader(vs,fs)
    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    window.color = [1, 1, 1, 0.3]
    window.grid = null
    fillScreen()
    requestAnimationFrame(tick) // asks browser to call tick before first frame
})

window.addEventListener('resize',fillScreen)

document.addEventListener('DOMContentLoaded', (event) => {
    document.querySelector('#submit').addEventListener('click', event => {
        const gridsize = Number(document.querySelector('#gridsize').value) || 2;
        const faults = Number(document.querySelector('#faults').value) || 0;
        generateGrid(gridsize, faults);
    });

    let textureInput = document.getElementById('texture');
    textureInput.addEventListener('change', event => {
        let val = event.target.value;
        if (val == '') {
            window.color = [1, 1, 1, 0.3];
            window.program = compileShader(vs,fs);
        } else if (/^#[0-9a-f]{8}$/i.test(val)) {
            window.color = [
                Number('0x' + val.substr(1,2))/255,
                Number('0x' + val.substr(3,2))/255,
                Number('0x' + val.substr(5,2))/255,
                Number('0x' + val.substr(7,2))/255
            ];
            window.program = compileShader(vs,fs);
        } else if (/[.](jpg|png)$/.test(val)) {
            window.img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = val;
            img.addEventListener('error', event => {
                window.color = [1, 0, 1, 0];
                window.program = compileShader(vs,fs);
            })
            img.addEventListener('load', event => {
                let slot = 0;
                let texture = gl.createTexture();
                gl.activeTexture(gl.TEXTURE0 + slot);
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.texImage2D(
                    gl.TEXTURE_2D, // destination slot
                    0, // the mipmap level this data provides; almost always 0
                    gl.RGBA, // how to store it in graphics memory
                    gl.RGBA, // how it is stored in the image object
                    gl.UNSIGNED_BYTE, // size of a single pixel-color in HTML
                    img, // source data
                );
                gl.generateMipmap(gl.TEXTURE_2D);

                window.program = compileShader(vs2,fs2);
                gl.useProgram(program);
                let bindPoint = gl.getUniformLocation(program, 'image');
                gl.uniform1i(bindPoint, slot);
            })
        }
    });
});