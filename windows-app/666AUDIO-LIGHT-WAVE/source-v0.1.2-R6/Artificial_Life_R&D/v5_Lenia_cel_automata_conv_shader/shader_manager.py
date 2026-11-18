import os
import sys
import numpy as np
import moderngl

def load_shadertoy(ctx, filepath):
    """
    Loads a Shadertoy fragment shader from a file and wraps it in a 
    ModernGL program alongside a basic full-screen quad vertex shader.
    """
    if not os.path.exists(filepath):
        print(f"Error: Shader file '{filepath}' not found.")
        sys.exit(1)
        
    print(f"Loading shader: {filepath}")
    with open(filepath, "r", encoding='utf-8') as f:
        shadertoy_code = f.read()

    vertex_shader = """
        #version 330
        in vec2 in_position;
        void main() {
            gl_Position = vec4(in_position, 0.0, 1.0);
        }
    """

    fragment_shader = """
        #version 330
        out vec4 FragColor;
        
        // --- BUILT-IN SHADERTOY UNIFORMS ---
        uniform vec3 iResolution;
        uniform float iTime;
        uniform int iFrame;

        uniform sampler2D iChannel0;
        uniform sampler2D iChannel1;
        uniform sampler2D iChannel2;
        uniform sampler2D iChannel3;

        // --- CUSTOM UNIFORMS ---
        uniform float u_nn_trigger;
        uniform float u_nn_value;

        // --- INJECTED SHADERTOY CODE START ---
// SHADERTOY_CODE_HERE
        // --- INJECTED SHADERTOY CODE END ---

        void main() {
            mainImage(FragColor, gl_FragCoord.xy);
        }
    """.replace("// SHADERTOY_CODE_HERE", shadertoy_code)

    prog = ctx.program(vertex_shader=vertex_shader, fragment_shader=fragment_shader)

    # 4 corners of a full screen quad
    vertices = np.array([
        -1.0,  1.0,  
        -1.0, -1.0,  
         1.0,  1.0,  
         1.0, -1.0,  
    ], dtype='f4')

    vbo = ctx.buffer(vertices)
    vao = ctx.vertex_array(prog, [(vbo, '2f', 'in_position')])
    
    return prog, vao

def set_uniform(prog, name, value):
    """Safely set a uniform if it exists in the shader."""
    if name in prog:
        try:
            if isinstance(value, tuple):
                prog[name].value = value
            else:
                prog[name].value = value
        except Exception as e:
            print(f"Error setting uniform {name}: {e}")

class PingPongBuffer:
    """
    Manages double-buffering (read/write FBOs) required for Shadertoy Buffer A/B/C/D.
    """
    def __init__(self, ctx: moderngl.Context, width: int, height: int):
        self.ctx = ctx
        
        # 32-bit floating point textures are standard for Shader buffers to prevent data loss
        self.tex_read = ctx.texture((width, height), 4, dtype='f4')
        self.tex_write = ctx.texture((width, height), 4, dtype='f4')
        
        # SmoothLife and continuous CA algorithms require LINEAR filtering 
        # so sub-pixel states and continuous values can blend organically.
        self.tex_read.filter = (moderngl.LINEAR, moderngl.LINEAR)
        self.tex_write.filter = (moderngl.LINEAR, moderngl.LINEAR)
        
        self.fbo_read = ctx.framebuffer(color_attachments=[self.tex_read])
        self.fbo_write = ctx.framebuffer(color_attachments=[self.tex_write])

        self.fbo_read.clear(0.0, 0.0, 0.0, 0.0)
        self.fbo_write.clear(0.0, 0.0, 0.0, 0.0)

    def swap(self):
        self.tex_read, self.tex_write = self.tex_write, self.tex_read
        self.fbo_read, self.fbo_write = self.fbo_write, self.fbo_read

    def release(self):
        try:
            self.tex_read.release()
            self.tex_write.release()
            self.fbo_read.release()
            self.fbo_write.release()
        except Exception:
            pass