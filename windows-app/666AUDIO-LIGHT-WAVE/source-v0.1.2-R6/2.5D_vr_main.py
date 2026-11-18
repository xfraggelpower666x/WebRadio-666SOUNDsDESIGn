# shadermanager + this code combined infinite.quantum: 
# https://aistudio.google.com/prompts/1OkMPNjAl99AXsuZuAv66VHvmRQcsDdbN

import argparse
import logging
import os
from pathlib import Path
import random
import time
import queue
import multiprocessing
import sys
import numpy as np
import pygame
import moderngl
import openvr
import openvr.error_code
from PIL import Image

# ==========================================
# 1. CONFIGURATION
# ==========================================
NUM_IMAGES = 2
TARGET_WIDTH = 1280
TARGET_HEIGHT = 1920
TARGET_SIZE = (TARGET_WIDTH, TARGET_HEIGHT)

# ==========================================
# 2. BACKGROUND WORKER PROCESS
# ==========================================
def image_worker(folder_path, target_size, q, stop_event):
    valid_extensions = ('.png', '.jpg', '.jpeg', '.bmp', '.webp')
    if os.path.exists(folder_path):
        files = [os.path.join(folder_path, f) for f in os.listdir(folder_path) if f.lower().endswith(valid_extensions)]
    else:
        files = []

    if not files:
        while not stop_event.is_set(): time.sleep(1)
        return

    while not stop_event.is_set():
        random.shuffle(files)
        for file in files:
            if stop_event.is_set(): break
            try:
                with Image.open(file) as img:
                    img = img.convert('RGB').resize(target_size, Image.Resampling.LANCZOS)
                    img_bytes = img.tobytes()
                    while not stop_event.is_set():
                        try:
                            q.put((img_bytes, target_size, 'RGB'), timeout=0.5)
                            break
                        except queue.Full:
                            continue
            except (OSError, ValueError) as error:
                logging.warning('VR-Bild nicht lesbar: %s: %s', file, error)
        stop_event.wait(0.1)

# ==========================================
# 3. HELPER MATH FOR VR MATRICES
# ==========================================
def get_openvr_matrices(vr_system, eye):
    e2h = vr_system.getEyeToHeadTransform(eye)
    eye_pos = (e2h[0][3], e2h[1][3], e2h[2][3])
    
    proj = vr_system.getProjectionMatrix(eye, 0.1, 100.0)
    proj_mat = np.zeros((4, 4), dtype=np.float32)
    for i in range(4):
        for j in range(4):
            proj_mat[i][j] = proj[i][j]
            
    inv_proj = np.linalg.inv(proj_mat)
    inv_proj_bytes = inv_proj.T.astype('f4').tobytes()
    return inv_proj_bytes, eye_pos

def get_mirror_inv_proj(fov_deg, aspect, near, far):
    f = 1.0 / np.tan(np.radians(fov_deg) / 2.0)
    proj = np.zeros((4,4), dtype=np.float32)
    proj[0,0] = f / aspect
    proj[1,1] = f
    proj[2,2] = (near + far) / (near - far)
    proj[2,3] = (2 * near * far) / (near - far)
    proj[3,2] = -1.0
    inv = np.linalg.inv(proj)
    return inv.T.astype('f4').tobytes()

# ==========================================
# 4. MAIN VR RENDER THREAD
# ==========================================
def main(slot_folders):
    for folder in slot_folders:
        if not folder.is_dir() or not any(
            p.is_file() and p.suffix.lower() in {".png", ".jpg", ".jpeg", ".bmp", ".webp"}
            for p in folder.iterdir()
        ):
            raise ValueError(f"VR-Bildordner fehlt oder ist leer: {folder}")
    stop_event = multiprocessing.Event()
    queues, processes = [], []
    try:
        vr_system = openvr.init(openvr.VRApplication_Scene)
    except Exception as e:
        print(f"Failed to initialize VR: {e}")
        sys.exit(1)

    try:
        vr_compositor = openvr.VRCompositor()
        # Get the resolution that the VR headset expects per-eye
        vr_width, vr_height = vr_system.getRecommendedRenderTargetSize()
        print(f"VR Eye Resolution: {vr_width}x{vr_height}")
    
        pygame.init()
        mirror_width, mirror_height = 1280, 720 
        pygame.display.set_mode((mirror_width, mirror_height), pygame.OPENGL | pygame.DOUBLEBUF)
    
        ctx = moderngl.create_context()
    
        left_fbo = ctx.framebuffer(color_attachments=[ctx.texture((vr_width, vr_height), 4)])
        right_fbo = ctx.framebuffer(color_attachments=[ctx.texture((vr_width, vr_height), 4)])

        openvr_left_tex = openvr.Texture_t()
        openvr_left_tex.handle = int(left_fbo.color_attachments[0].glo) 
        openvr_left_tex.eType = openvr.TextureType_OpenGL
        openvr_left_tex.eColorSpace = openvr.ColorSpace_Gamma

        openvr_right_tex = openvr.Texture_t()
        openvr_right_tex.handle = int(right_fbo.color_attachments[0].glo)
        openvr_right_tex.eType = openvr.TextureType_OpenGL
        openvr_right_tex.eColorSpace = openvr.ColorSpace_Gamma

        left_inv_proj, left_eye_pos = get_openvr_matrices(vr_system, openvr.Eye_Left)
        right_inv_proj, right_eye_pos = get_openvr_matrices(vr_system, openvr.Eye_Right)
        mirror_inv_proj = get_mirror_inv_proj(60.0, mirror_width / mirror_height, 0.1, 100.0)

        image_textures = []
        for _ in range(NUM_IMAGES):
            tex = ctx.texture(TARGET_SIZE, 3) 
            tex.filter = (moderngl.LINEAR, moderngl.LINEAR)
            image_textures.append(tex)

        for i in range(NUM_IMAGES):
            q = multiprocessing.Queue(maxsize=1)
            p = multiprocessing.Process(target=image_worker, args=(slot_folders[i], TARGET_SIZE, q, stop_event))
            p.daemon = True 
            p.start()
            queues.append(q)
            processes.append(p)

        next_swap_times = [0.0] * NUM_IMAGES

        # --- TRUE 6-DOF SHADER ---
        prog = ctx.program(
            vertex_shader="""
                #version 330
                in vec2 in_vert;
                void main() { gl_Position = vec4(in_vert, 0.0, 1.0); }
            """,
            fragment_shader="""
    #version 330
                uniform vec2 u_resolution;
                uniform mat4 u_inv_proj;
                uniform vec3 u_eye_pos;
                uniform mat4 u_hmd_pose; 
            
                uniform sampler2D tex0;
                uniform sampler2D tex1;
            
                out vec4 f_color;
            
                void main() {
                    // 1. Get Base Ray
                    vec2 ndc = (gl_FragCoord.xy / u_resolution.xy) * 2.0 - 1.0;
                    vec4 target = u_inv_proj * vec4(ndc, -1.0, 1.0);
                
                    vec3 local_ray_dir = normalize(target.xyz / target.w);
                    vec3 local_ro = u_eye_pos;
                
                    // 2. TRANSFORM TO 6-DOF WORLD SPACE
                    // (w=1.0 applies Translation, w=0.0 applies only Rotation)
                    vec3 world_ro = (u_hmd_pose * vec4(local_ro, 1.0)).xyz;
                    vec3 world_ray_dir = normalize((u_hmd_pose * vec4(local_ray_dir, 0.0)).xyz);
                
                    // ==========================================
                    // VIRTUAL SCREEN SETTINGS (IN METERS)
                    // ==========================================
                    float distance = 2.0;      // Distance from center of room
                    float img_width  = 2.0 * 0.5;     // Width of EACH image (2.0m x 2 = 4m total screen!)
                    float img_height = 3.0 * 0.5;    // Height of EACH image (Maintains 1280x1920 aspect)
                    float gap = 0.0;           // 10cm gap between images
                    float y_offset = 1.5;      // Height of the center of the image off the floor
                    // ==========================================
                
                    float plane_z = -distance;
                    float t = (plane_z - world_ro.z) / world_ray_dir.z;
                
                    if (t > 0.0) {
                        vec3 p = world_ro + world_ray_dir * t;
                        vec4 color = vec4(0.02, 0.02, 0.02, 1.0); // Dark grey void
                    
                        float y_min = y_offset - (img_height / 2.0);
                        float y_max = y_offset + (img_height / 2.0);
                    
                        // The viewing angle on the X/Y axes (how slanted your eyes are relative to the screen)
                        vec2 view_angle = world_ray_dir.xy / abs(world_ray_dir.z);
                        view_angle.y = -view_angle.y; // Flip to match OpenGL UV space
                    
                        // Set how "deep" you want the 3D effect to be (Try 0.05 for intense depth!)
                        float depth_strength = 0.03; 
                    
                        // --- LEFT IMAGE ---
                        float left_x_max = -(gap / 2.0);
                        float left_x_min = left_x_max - img_width;
                    
                        if (p.x > left_x_min && p.x < left_x_max && p.y > y_min && p.y < y_max) {
                            vec2 tex_uv = vec2((p.x - left_x_min) / img_width, (p.y - y_min) / img_height);
                            tex_uv.y = 1.0 - tex_uv.y;
                        
                            // 1. Check how bright this pixel is (Luminance dot product)
                            vec4 base_color = texture(tex0, tex_uv);
                            float brightness = dot(base_color.rgb, vec3(0.299, 0.587, 0.114));
                        
                            // 2. Shift the UV coordinates based on Brightness and Head Angle
                            vec2 fake_3d_uv = tex_uv - (view_angle * (brightness - 0.5) * depth_strength);
                        
                            // 3. Re-sample the image at the new 3D location
                            color = texture(tex0, fake_3d_uv);
                        }
                    
                        // --- RIGHT IMAGE ---
                        float right_x_min = (gap / 2.0);
                        float right_x_max = right_x_min + img_width;
                    
                        if (p.x > right_x_min && p.x < right_x_max && p.y > y_min && p.y < y_max) {
                            vec2 tex_uv = vec2((p.x - right_x_min) / img_width, (p.y - y_min) / img_height);
                            tex_uv.y = 1.0 - tex_uv.y;
                        
                            vec4 base_color = texture(tex1, tex_uv);
                            float brightness = dot(base_color.rgb, vec3(0.299, 0.587, 0.114));
                        
                            vec2 fake_3d_uv = tex_uv - (view_angle * (brightness - 0.5) * depth_strength);
                            color = texture(tex1, fake_3d_uv);
                        }
                    
                        f_color = color;
                    } else {
                        f_color = vec4(0.0, 0.0, 0.0, 1.0); 
                    }
                }
            """
        )
        vbo = ctx.buffer(np.array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0], dtype='f4').tobytes())
        vao = ctx.vertex_array(prog, [(vbo, '2f', 'in_vert')])

        clock = pygame.time.Clock()
        poses = [] 
    
        # We initialize the HMD pose as an Identity Matrix (0,0,0 location, 0 rotation)
        # until the first frame's tracking data is acquired.
        hmd_pose_bytes = np.eye(4, dtype=np.float32).tobytes()

        running = True
        while running:
            current_time = time.time()
            for event in pygame.event.get():
                if event.type == pygame.QUIT or (event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE):
                    running = False

            for i in range(NUM_IMAGES):
                if current_time >= next_swap_times[i]:
                    try:
                        img_bytes, size, mode = queues[i].get_nowait()
                        image_textures[i].write(img_bytes)
                        next_swap_times[i] = current_time + random.randint(1, 2)
                    except queue.Empty:
                        pass

            image_textures[0].use(location=0)
            prog['tex0'].value = 0
            image_textures[1].use(location=1)
            prog['tex1'].value = 1
        
            # Apply the absolute tracking coordinates from the headset
            prog['u_hmd_pose'].write(hmd_pose_bytes)

            # --- PASS 1: LEFT EYE ---
            left_fbo.use()
            ctx.clear()
            prog['u_resolution'].value = (vr_width, vr_height)
            prog['u_inv_proj'].write(left_inv_proj) 
            prog['u_eye_pos'].value = left_eye_pos   
            vao.render(moderngl.TRIANGLE_STRIP)

            # --- PASS 2: RIGHT EYE ---
            right_fbo.use()
            ctx.clear()
            prog['u_resolution'].value = (vr_width, vr_height)
            prog['u_inv_proj'].write(right_inv_proj) 
            prog['u_eye_pos'].value = right_eye_pos  
            vao.render(moderngl.TRIANGLE_STRIP)

            try:
                vr_compositor.submit(openvr.Eye_Left, openvr_left_tex)
                vr_compositor.submit(openvr.Eye_Right, openvr_right_tex)
            except openvr.error_code.CompositorError_DoNotHaveFocus:
                pass

            # --- PASS 3: DESKTOP MIRROR ---
            # The desktop monitor will now track perfectly with your head movements!
            ctx.screen.use()
            ctx.clear()
            prog['u_resolution'].value = (mirror_width, mirror_height)
            prog['u_inv_proj'].write(mirror_inv_proj)  
            prog['u_eye_pos'].value = (0.0, 0.0, 0.0)  
            vao.render(moderngl.TRIANGLE_STRIP)
        
            pygame.display.flip()
        
            # --- ACQUIRE 6-DOF TRACKING FOR NEXT FRAME ---
            poses, _ = vr_compositor.waitGetPoses(poses, None)
        
            hmd_pose = poses[openvr.k_unTrackedDeviceIndex_Hmd]
            if hmd_pose.bPoseIsValid:
                m = hmd_pose.mDeviceToAbsoluteTracking
                # Convert OpenVR 3x4 tracking matrix into standard 4x4 matrix
                mat = np.eye(4, dtype=np.float32)
                for r in range(3):
                    for c in range(4):
                        mat[r][c] = m[r][c]
                    
                # ModernGL expects column-major layout, so we transpose (.T)
                hmd_pose_bytes = mat.T.tobytes()

    finally:
        stop_event.set()
        for q in queues:
            while True:
                try:
                    q.get_nowait()
                except queue.Empty:
                    break
        for process in processes:
            process.join(timeout=1)
            if process.is_alive():
                process.terminate()
                process.join(timeout=1)
        for q in queues:
            q.close()
        openvr.shutdown()
        pygame.quit()


if __name__ == "__main__":
    multiprocessing.freeze_support()
    parser = argparse.ArgumentParser(description="666AUDIO LIGHT WAVE · OpenVR")
    parser.add_argument("left", type=Path)
    parser.add_argument("right", type=Path)
    args = parser.parse_args()
    try:
        main((args.left.resolve(), args.right.resolve()))
    except (OSError, ValueError) as error:
        parser.exit(2, f"{error}\n")
