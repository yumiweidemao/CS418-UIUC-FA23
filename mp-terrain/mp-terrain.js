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
 * Sets up geometry data for rendering.
 * @param {object} geom An object containing geometry attributes and triangles.
 * @return {object} An object containing rendering-related properties.
 */
function setupGeometry(geom) {
    var triangleArray = gl.createVertexArray()
    gl.bindVertexArray(triangleArray)

    for(let i=0; i<geom.attributes.length; i+=1) {
        let buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        let f32 = new Float32Array(geom.attributes[i].flat())
        gl.bufferData(gl.ARRAY_BUFFER, f32, gl.STATIC_DRAW)
        
        gl.vertexAttribPointer(i, geom.attributes[i][0].length, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(i)
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

/**
 * Renders the scene based on the given time.
 * @param {number} milliseconds The elapsed time in milliseconds.
 */
function draw(milliseconds) {
    if (window.grid == null) {
        return;
    }

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    
    let t = milliseconds / 1000.0;

    // Zoom
    let scaledCos = 1.0 - (0.5 * Math.cos(t * 2.5) + 0.5) * (0.5 * Math.cos(t * 2.5) + 0.5);
    let zoomFactor = 0.7*(0.3 * scaledCos + 0.4);
    
    let scaleMatrix = glMatrix.mat4.create();
    glMatrix.mat4.scale(scaleMatrix, scaleMatrix, [zoomFactor, zoomFactor, 1.0]);

    // Rotate
    let rotationMatrix = glMatrix.mat4.create();
    glMatrix.mat4.rotate(rotationMatrix, rotationMatrix, 0.5 * t, [0, 0, 1]);

    // Translate
    let translationMatrix = glMatrix.mat4.create();
    let translation = [0.3 * Math.sin(1.2 * t), 0.3 * Math.cos(1.2 * t), 0];
    glMatrix.mat4.translate(translationMatrix, translationMatrix, translation);

    // Combine transformations
    let uniMat = glMatrix.mat4.create();
    glMatrix.mat4.multiply(uniMat, translationMatrix, rotationMatrix);
    glMatrix.mat4.multiply(uniMat, uniMat, scaleMatrix);

    // Pass the transformation matrix to the vertex shader
    gl.uniformMatrix4fv(program.uniforms.uniMat, false, uniMat);

    gl.bindVertexArray(geom.vao);
    gl.drawElements(geom.mode, geom.count, geom.type, 0);
}

/**
 * Continuously updates the scene using requestAnimationFrame.
 * @param {number} milliseconds The elapsed time in milliseconds.
 */
function tick(milliseconds) {
    draw(milliseconds)
    requestAnimationFrame(tick) // asks browser to call tick before next frame
}

/**
 * Resize canvas size after screen size has been changed.
 */
function fillScreen() {
    let canvas = document.querySelector('canvas')
    document.body.style.margin = '0'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight
    canvas.style.width = ''
    canvas.style.height = ''
    gl.viewport(0,0, canvas.width, canvas.height)
    // TO DO: compute a new projection matrix based on the width/height aspect ratio
    window.p = m4perspNegZ(0.1, 10, 1.5, canvas.width, canvas.height)
}

/**
 * Generate grid according to given gridsize.
 * Then, apply faults to the grid.
 */
function generateGrid(gridsize, faults) {
    // generate grid initialized to 0 (flat terrain)
    window.grid = new Array(n);
    for (let i = 0; i < gridsize; i++) {
        window.grid[i] = new Array(n).fill(0);
    }

    // displace the vertices using the faulting method

    // normalize height

    // compute grid-based normals
}

// load shaders and model and start animation at load event
window.addEventListener('load', async (event) => {
    window.gl = document.querySelector('canvas').getContext('webgl2',
        {antialias: false, depth:true, preserveDrawingBuffer:true}
    )
    let vs = await fetch('mp-terrain-vertex.glsl').then(res => res.text())
    let fs = await fetch('mp-terrain-fragment.glsl').then(res => res.text())
    gl.enable(gl.DEPTH_TEST)
    window.program = compileShader(vs,fs)
    window.grid = null
    fillScreen()
    requestAnimationFrame(tick) // asks browser to call tick before first frame
})

window.addEventListener('resize',fillScreen)
document.addEventListener('DOMContentLoaded', (event) => {
    document.querySelector('#submit').addEventListener('click', event => {
        const gridsize = Number(document.querySelector('#gridsize').value) || 2;
        const faults = Number(document.querySelector('#faults').value) || 0;
        // TO DO: generate a new gridsize-by-gridsize grid here, then apply faults to it
        generateGrid(gridsize, faults);
    });
});