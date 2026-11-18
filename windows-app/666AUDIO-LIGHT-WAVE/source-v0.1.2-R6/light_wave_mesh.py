"""OpenGL-Rotationsfläche für Vorschau und Aufnahme."""
from light_wave_shapes import faceted_face_mesh, revolution_mesh

VERTEX = """
#version 330
in vec3 point;
in float band;
uniform float levels[28];
uniform float elapsed;
uniform float ratio;
uniform bool face;
out vec3 model_point;
out float response;

void main() {
    int index = int(clamp(band, 0., 27.));
    response = levels[index];
    vec3 p = point;
    float phase = atan(p.z, p.x + .000001);
    p.xz *= 1. + response * (.17 + .11 * cos(6. * phase - 3. * elapsed + p.y));
    float tilt = .30 * sin(elapsed * .87);
    p.xy *= mat2(cos(tilt), sin(tilt), -sin(tilt), cos(tilt));
    float orbit = face ? .6 * sin(elapsed * .57) : elapsed * .31;
    p.xz *= mat2(cos(orbit), sin(orbit), -sin(orbit), cos(orbit));
    p.yz *= mat2(.969, .247, -.247, .969);
    model_point = p;
    float w = 1. - p.z * .20;
    vec2 frame = vec2(max(1., ratio), max(1., 1. / ratio));
    gl_Position = vec4(.77 * p.xy / frame, -.58 * p.z, w);
}
"""
FRAGMENT = """
#version 330
in vec3 model_point;
in float response;
out vec4 color;
void main() {
    vec3 normal = normalize(cross(dFdx(model_point), dFdy(model_point)));
    if (!gl_FrontFacing) normal = -normal;
    float key = .34 + .66 * abs(dot(normal, normalize(vec3(-.65, .78, .72))));
    vec3 ink = mix(vec3(.86, .07, .55), vec3(.02, .85, .98),
                   clamp(.5 + .51 * model_point.y, 0., 1.));
    color = vec4(ink * (key + .34 * response), 1.);
}
"""


class ShapeMesh:
    def __init__(self, context):
        self.context = context
        self.program = context.program(vertex_shader=VERTEX, fragment_shader=FRAGMENT)
        self.mesh = None

    def update(self, points=None):
        vertices, indices = faceted_face_mesh() if points is None else revolution_mesh(points)
        vertex = self.context.buffer(vertices.tobytes())
        index = vao = None
        try:
            index = self.context.buffer(indices.tobytes())
            vao = self.context.vertex_array(self.program, [(vertex, "3f 1f", "point", "band")],
                                            index_buffer=index, index_element_size=4)
        except BaseException:
            if index is not None:
                index.release()
            vertex.release()
            raise
        if self.mesh is not None:
            for resource in self.mesh:
                resource.release()
        self.mesh = vao, index, vertex

    def draw(self, bands, elapsed, ratio, intensity, *, face=False):
        self.program["levels"].write((bands * intensity).clip(0, 1).tobytes())
        self.program["elapsed"].value = elapsed
        self.program["ratio"].value = ratio
        self.program["face"].value = face
        self.mesh[0].render()
