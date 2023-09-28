/*
 * This file does the following:
 * 
 * 1. creates an array _gl_call_traces, the elements of which are arrays of distinct GL interaction traces
 * 2. replace the return value of canvas.getContext with a proxy that logs activity
 */

const _gl_call_traces = []
var _gl_last_call_trace = []

const _gl_old_getContext = HTMLCanvasElement.prototype.getContext
HTMLCanvasElement.prototype.getContext = function(...args) {

  function _gl_wrap_for_logging(gl) {
    const _gl_symbols = new WeakMap()
    const _gl_constants = new Map()
    _gl_constants.set(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, 'gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT')
    const _gl_creator_counts = new Map()
    const _gl_already_warned = new Set()
    const banned = {
      'getAttribLocation':':\nuse `layout(location = ...)` in the vertex shader instead',
    }
    const showNum = (n,i) => (n=='vertexAttribPointer') || (n == 'enableVertexAttribArray') || (n.includes('draw'))
    var _gl_live_call_trace = []
    console.info('CS 418 WebGL2 wrapper around',gl)
    return new Proxy(gl, {
      get(obj, prop, recv) {
        const val = obj[prop]
        if (val instanceof Function) {
          return function(...args) {
            // format
            const sig = 'gl.'+prop+'('+(args.map((x,i)=>{
              if (_gl_symbols.has(x)) return _gl_symbols.get(x)
              if (_gl_constants.has(x)) return _gl_constants.get(x)
              if ('number' == typeof x && !showNum(prop,i)) return 'num'
              if ('object' == typeof x && x) return 'length' in x ? `${x.constructor.name}[${x.length}]` : x.constructor.name
              return JSON.stringify(x)
              })).join(', ')+')'
            // track
            _gl_live_call_trace.push(sig)
            if (prop == 'clear') {
              let idx = -1
              for(let j=0; j<_gl_call_traces.length; j+=1) {
                let e = _gl_call_traces[j]
                if (e.length === _gl_live_call_trace.length && e.every((v,i) => v === _gl_live_call_trace[i])) idx = j
              }
              if (idx == -1) {
                idx = _gl_call_traces.length
                _gl_call_traces.push(_gl_live_call_trace)
              }
              _gl_last_call_trace = _gl_call_traces[idx]
              _gl_live_call_trace = []
            }
            // forward call
            const val2 = val.apply(this === recv ? obj : this, args)
            // check for warnings
            if (!_gl_already_warned.has(sig)) {
              // warn about likely errors
              if (prop in banned) { console.warn('CS418 prohibits use of',prop+banned[prop]); _gl_already_warned.add(sig); } 
              if (prop == 'shaderSource') {
                if (!args[1].startsWith('#version 300 es')) { console.warn('CS418 requires `#version 300 es` shaders'); _gl_already_warned.add(sig); }
                let src = args[1].replace(/\\(\r\n?|\n\r?)/g,'').replace(/(\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+\/)|(\/\/.*)/g,' ') // line continuations and comments
                if (/^[ \t\v\f]*#[ \t\v\f]*define[ \t\v\f]/m.test(src)) { console.warn('CS418 prohibits use of C-style macros in GLSL'); }
                if (args[2] == 0x8B31 && /^\s*in /m.test(src)) { console.warn('CS418 requires all vertex in variables to have a layout(location=...)'); }
                // reasonable approximation of finding GLSL inefficiencies
                let attrib = Array.from(src.matchAll(/\bin\b[^;]*\b([_a-zA-Z][_a-zA-Z0-9]*)\b[ \t\n\v\f\r]*;/g)).map(m=>m[1])
                attrib.push('gl_VertexID', 'gl_InstanceID', 'gl_FragCoord', 'gl_FrontFacing', 'gl_PointCoord')
                for(let i=0; i<attrib.length; i+=1) {
                  [...src.matchAll(new RegExp("\\b([_a-zA-Z][_a-zA-Z0-9]*)\\b\\s*[-+*/%<>&^|]*=[^=;][^;]*\\b"+attrib[i]+"\\b", "g"))].forEach(
                    m => { if (!attrib.includes(m[1])) attrib.push(m[1]) }
                  )
                }
                if (new RegExp("\\bif\\b[^{};]*\\b("+attrib.join('|')+")\\b[^{};]*\\)\\s*([{]|[a-zA-Z_])").test(src))
                  console.warn('Shader contains `if` that may not allow full warp parallelism:');
                if (new RegExp("\\bwhile\\b[^{};]*\\b("+attrib.join('|')+")\\b[^{};]*\\)\\s*([{]|[a-zA-Z_])").test(src))
                  console.warn('Shader contains `while` that may not allow full warp parallelism');
                if (new RegExp("\\bfor\\b[^{};]*;[^{};]*\\b("+attrib.join('|')+")\\b[^{};]*;").test(src))
                  console.warn('Shader contains `for` that may not allow full warp parallelism');
              }
              if (val2 === null) { console.warn(`CS418 prohibits null return: ${sig}`); _gl_already_warned.add(sig); }
              if (args.some(x=>x===null)) { console.warn(`CS418 prohibits null arguments: ${sig}`); _gl_already_warned.add(sig); }
            }
            // log results needed for later signatures
            if (prop.startsWith('create')) {
              if (!_gl_creator_counts.has(prop)) _gl_creator_counts.set(prop,0)
              const thisID = _gl_creator_counts.get(prop) + 1
              _gl_creator_counts.set(prop, thisID)
              _gl_symbols.set(val2, prop.substr(6)+'#'+thisID)
              _gl_live_call_trace[_gl_live_call_trace.length-1] = prop.substr(6)+'#'+thisID+' = ' + _gl_live_call_trace[_gl_live_call_trace.length-1]
            }
            if (prop == 'getUniformLocation' && val2) {
              const symbol = _gl_symbols.get(args[0])+'.uniforms.'+args[1]
              _gl_symbols.set(val2, symbol)
            }
            return val2
          }
        } else {
          if ('object' == typeof val) _gl_symbols.set(val, 'gl.'+prop)
          else _gl_constants.set(val, 'gl.'+prop)
          return val
        }
      }
    })
  }

  return _gl_wrap_for_logging(_gl_old_getContext.apply(this, args));
}


const _cs418_requestAnimationFrame = requestAnimationFrame
var _cs418_requestAnimationFrame_used = 0
requestAnimationFrame = callback => {
  if (_cs418_requestAnimationFrame_used != 0) throw new Error("Calling requestAnimationFrame while another call is pending is usually an error and is prohibited in CS 418.")
  _cs418_requestAnimationFrame_used += 1
  return _cs418_requestAnimationFrame(ms => { _cs418_requestAnimationFrame_used -= 1; callback(ms) })
}
setTimeout = () => { throw new Error("CS 418 forbids using setTimeout") }
setInterval = () => { throw new Error("CS 418 forbids using setInterval") }