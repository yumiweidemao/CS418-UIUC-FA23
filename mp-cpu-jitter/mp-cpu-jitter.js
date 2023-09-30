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

    window.dynamicBuffer = gl.createBuffer();
    window.currentVertices = new Float32Array(geom.attributes[0].flat());
    gl.bindBuffer(gl.ARRAY_BUFFER, window.dynamicBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, window.currentVertices, gl.DYNAMIC_DRAW);

    for(let i=0; i<geom.attributes.length; i+=1) {       
        gl.bindBuffer(gl.ARRAY_BUFFER, i === 0 ? window.dynamicBuffer : gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geom.attributes[i].flat()), i === 0 ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
        
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
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    
    let t = milliseconds / 1000.0;

    // Apply jitter to position buffer
    let jitterAmount = 0.012;
    for (let i = 0; i < window.currentVertices.length; i++) {
        window.currentVertices[i] += (Math.random() - 0.5) * jitterAmount; 
    }
    
    // Update the dynamic buffer with the jittered vertex positions
    gl.bindBuffer(gl.ARRAY_BUFFER, window.dynamicBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, window.currentVertices, gl.DYNAMIC_DRAW);

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

// load shaders and model and start animation at load event
window.addEventListener('load', async (event) => {
    window.gl = document.querySelector('canvas').getContext('webgl2')
    let vs = await fetch('mp-cpu-jitter-vertex.glsl').then(res => res.text())
    let fs = await fetch('mp-cpu-jitter-fragment.glsl').then(res => res.text())
    window.program = compileShader(vs,fs)
    let data = await fetch('mp-cpu-jitter.json').then(r=>r.json())
    window.geom = setupGeometry(data)
    requestAnimationFrame(tick) // asks browser to call tick before first frame
})
