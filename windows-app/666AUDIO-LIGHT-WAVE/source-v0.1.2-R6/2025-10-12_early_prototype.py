import moviepy.editor as mp
import pygame
import random
import os
import numpy as np
import cv2
from scipy import ndimage

BLACK = (0, 0, 0)

# Font for displaying FPS
#font = pygame.font.SysFont("Arial", 24)

# Font setup (adjust size/path as needed; use None for default system font)
font = pygame.font.SysFont('courier', 25)  # Monospace for Matrix feel; size 20 for visibility
#matrix_chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?/'  # Customizable char set
matrix_chars = """ησιηεak̲a͆s̲h̷r̼eͦc̶oͦr̸d̷s̴主קוהלתΛΥΦΜὩαωγ׆Ę͝└▹♪μ⋈≢x∞≈Ψ√Δ∴{ΣΨΦαφωαγëΦ∞Ω=α+ωℵ≠ℵ^ℵ∑+Ωa1Δ(ωᵢⱼ<|Ω|α|ASωₛNOUS;ω⊟▲⎓◌ø⪖⩖(⇌ς)☉=Ψξ⊹⋆∂(λaλα⚛{αω{Δ}⚤Ξ={π{ΔΔΞΣΞ⊬Ω♂♀ოєĩĩєv=λfΨ=mΨƒλΩΣδ{Δαωℵ₀∨∞ℵ→π∑=Πkᵢ=R_iΦ=∮E⋅dℓ∮SB⋅dAμλOτEгEnTSΤρεαNSέԳþᚫᛝᚫᚷᚱ∇ΔƤƔ⇀∮Ϭ⩓∫μлε∑ƈ⊥Ƨψϗ⍶〈⩰⩱ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>"""
overlay_color_1 = (0, 255, 0, 200)  # Green with 50% alpha (0-255); adjust for subtlety
overlay_color_2 = (240, 70, 195, 200)  # Green with 50% alpha (0-255); adjust for subtlety

"""
def load_video_filenames(folder):
    #Finds all .png and .jpg files in a folder.
    if not os.path.isdir(folder):
        print(f"Error: Image folder not found at '{folder}'")
        return []
    image_paths = [os.path.join(folder, f) for f in os.listdir(folder)
                   if os.path.isfile(os.path.join(folder, f)) and
                   (f.lower().endswith(".mp4"))]
    return image_paths

def load_and_resize_video(video_path):
    try:
        video = mp.VideoFileClip(video_path)
        return video
    except pygame.error as e:
        print(f"Error loading video {video_path}: {e}")
        return None


video_folder = "C:/1/grok-video_glitch_elara/square"

# --- Load all videos from the folder ---
print(f"Loading videos from: {video_folder}")
video_filenames = load_video_filenames(video_folder)

# Preload all videos into a list
loaded_videos = [load_and_resize_video(path) for path in video_filenames]

# Filter out any images that failed to load
loaded_video = [vid for vid in loaded_videos if vid is not None]
random.shuffle(loaded_videos)

if not loaded_videos:
    print("Warning: No videos loaded. The program will run without displaying videos.")
"""


def load_image_filenames(folder):
    """Finds all .png and .jpg files in a folder."""
    if not os.path.isdir(folder):
        print(f"Error: Image folder not found at '{folder}'")
        return []
    image_paths = [os.path.join(folder, f) for f in os.listdir(folder)
                   if os.path.isfile(os.path.join(folder, f)) and
                   (f.lower().endswith(".png") or f.lower().endswith(".jpg"))]
    return image_paths

def load_and_resize_image(image_path, target_height):
    """Loads an image and resizes it to a target height while maintaining aspect ratio."""
    try:
        original_image = pygame.image.load(image_path).convert_alpha()
        aspect_ratio = original_image.get_height() / original_image.get_width()
        new_height = int(target_height * 0.8) # Make image 80% of screen height
        new_width = int(new_height / aspect_ratio)
        resized_image = pygame.transform.smoothscale(original_image, (new_width, new_height))
        return resized_image
    except pygame.error as e:
        print(f"Error loading or resizing image {image_path}: {e}")
        return None


#SCREEN_WIDTH  = 1920
#SCREEN_HEIGHT = 1080
SCREEN_WIDTH  = 3440
SCREEN_HEIGHT = 1440
flags = pygame.DOUBLEBUF | pygame.HWSURFACE | pygame.FULLSCREEN



def play_video_fullscreen():
    try:
        pygame.init()
        pygame.display.set_caption("MoviePy Fullscreen Player")
        screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT), flags, vsync=1)
#        screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT), flags)
#        screen = pygame.display.set_mode((0, 0), pygame.FULLSCREEN)
        screen_rect = screen.get_rect()


#        # --- Load all images from the folder ---
#        image_folder = "F:/Deep_Learning_Local/stable-diffusion-webui-master/outputs/txt2img-images/2025-09-16/hyperRlCyber - Copy/ok"
#        print(f"Loading images from: {image_folder}")
#        image_filenames = load_image_filenames(image_folder)
#        image_index = 0
#
#        # Preload and resize all images into a list
#        loaded_images = [load_and_resize_image(path, SCREEN_HEIGHT) for path in image_filenames]
#
#        # Filter out any images that failed to load
#        loaded_images = [img for img in loaded_images if img is not None]
#
#        if not loaded_images:
#            print("Warning: No images loaded. The program will run without displaying images.")


        video_folder_square = "C:/1/grok-video_glitch_elara/square"
        video_filenames_square = [
            os.path.join(video_folder_square, f) for f in os.listdir(video_folder_square)
            if os.path.isfile(os.path.join(video_folder_square, f)) and f.lower().endswith('.mp4')
        ]
        random.shuffle(video_filenames_square)

        print(video_filenames_square)

        num_videos_square = len(video_filenames_square)
        print(f"num_videos_square = {num_videos_square}")


        video_folder_horizontal = "C:/1/grok-video_glitch_elara/horizontal"
        video_filenames_horizontal = [
            os.path.join(video_folder_horizontal, f) for f in os.listdir(video_folder_horizontal)
            if os.path.isfile(os.path.join(video_folder_horizontal, f)) and f.lower().endswith('.mp4')
        ]
        random.shuffle(video_filenames_horizontal)

        video_filenames_horizontal += video_filenames_square
        num_videos_horizontal = len(video_filenames_horizontal)
        print(f"num_videos_horizontal_COMBINED = {num_videos_horizontal}")


        video_folder_vertical_left = "C:/1/grok-video_glitch_elara/vertical"
        video_filenames_vertical_left = [
            os.path.join(video_folder_vertical_left, f) for f in os.listdir(video_folder_vertical_left)
            if os.path.isfile(os.path.join(video_folder_vertical_left, f)) and f.lower().endswith('.mp4')
        ]
        random.shuffle(video_filenames_vertical_left)

        num_videos_vertical_left = len(video_filenames_vertical_left)
        print(f"num_videos_vertical_left = {num_videos_vertical_left}")


        video_folder_vertical_right = "C:/1/grok-video_glitch_elara/vertical"
        video_filenames_vertical_right = [
            os.path.join(video_folder_vertical_right, f) for f in os.listdir(video_folder_vertical_right)
            if os.path.isfile(os.path.join(video_folder_vertical_right, f)) and f.lower().endswith('.mp4')
        ]
        random.shuffle(video_filenames_vertical_right)

        num_videos_vertical_right = len(video_filenames_vertical_right)
        print(f"num_videos_vertical_right = {num_videos_vertical_right}")

        random_index_horizontal = random.randint(0, num_videos_horizontal-1)
        print(f"random_index_horizontal: {random_index_horizontal}")
        current_video_horizontal = f"{video_filenames_horizontal[random_index_horizontal]}"
        print(f"current_video_horizontal: {current_video_horizontal}")

        video_horizontal = mp.VideoFileClip(current_video_horizontal)
        video_width_horizontal, video_height_horizontal = video_horizontal.size
        print(f"Video width_horizontal: {video_width_horizontal}")
        print(f"Video height_horizontal: {video_height_horizontal}")
        #___________________________________________________________

        random_index_vertical_left = random.randint(0, num_videos_vertical_left-1)
        print(f"random_index_vertical_left: {random_index_vertical_left}")
        current_video_vertical_left = f"{video_filenames_vertical_left[random_index_vertical_left]}"
        print(f"current_video_vertical_left: {current_video_vertical_left}")

        video_vertical_left = mp.VideoFileClip(current_video_vertical_left)
        video_width_vertical_left, video_height_vertical_left = video_vertical_left.size
        print(f"Video width_vertical_left: {video_width_vertical_left}")
        print(f"Video height_vertical_left: {video_height_vertical_left}")

        #___________________________________________________________

        random_index_vertical_right = random.randint(0, num_videos_vertical_right-1)
        print(f"random_index_vertical_right: {random_index_vertical_right}")
        current_video_vertical_right = f"{video_filenames_vertical_right[random_index_vertical_right]}"
        print(f"current_video_vertical_right: {current_video_vertical_right}")

        video_vertical_right = mp.VideoFileClip(current_video_vertical_right)
        video_width_vertical_right, video_height_vertical_right = video_vertical_right.size
        print(f"Video width_vertical_right: {video_width_vertical_right}")
        print(f"Video height_vertical_right: {video_height_vertical_right}")
        #___________________________________________________________


        screen_info = pygame.display.Info()
        actual_width, actual_height = screen_info.current_w, screen_info.current_h


        clock = pygame.time.Clock()
        running = True
        current_time_left   = 0
        current_time_center = 0
        current_time_right  = 0

        direction_left   = 1
        direction_center = 1
        direction_right  = 1

        iteration_num = 0
        random_fps = 40

        while running:
            screen.fill(BLACK)
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    running = False
                elif event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_ESCAPE:
                        running = False

            if running:



                if current_time_center < video_horizontal.duration:
                    # Calculate the scaling factor to fit the image into the screen
                    scaling_factor_horizontal = min(actual_width / video_width_horizontal, actual_height / video_height_horizontal)
                    resized_video_width_horizontal  = int(video_width_horizontal  * scaling_factor_horizontal)
                    resized_video_height_horizontal = int(video_height_horizontal * scaling_factor_horizontal)
                    print(f"resized_video_width_horizontal: {resized_video_width_horizontal}")
                    print(f"resized_video_height_horizontal: {resized_video_height_horizontal}")

                    video_x_center = (actual_width  - resized_video_width_horizontal)  // 2
                    video_y_center = (actual_height - resized_video_height_horizontal) // 2
                    print(f"video_x_center: {video_x_center}")
                    print(f"video_y_center: {video_y_center}")
                    video_x_center_orig = video_x_center
                    video_y_center_orig = video_y_center

                    # Get the frame as a NumPy array
                    frame_np_horizontal = video_horizontal.get_frame(current_time_center)

                    # Convert NumPy array to Pygame Surface
                    frame_np_horizontal = np.swapaxes(frame_np_horizontal, 0, 1)



                    random_shift_activate_displacement_x = random.randint(0, 10)
                    if random_shift_activate_displacement_x == 5:
                        random_shift_displacement_x = random.randint(2, 5)
                        video_x_center_tmp = video_x_center + random_shift_displacement_x
                        video_x_center = video_x_center_tmp
                    else:
                        random_shift_displacement_x = 0
                        video_x_center = video_x_center_orig

                    random_shift_activate_displacement_y = random.randint(0, 10)
                    if random_shift_activate_displacement_y == 5:
                        random_shift_displacement_y = random.randint(2, 5)
                        video_y_center_tmp = video_y_center + random_shift_displacement_y
                        video_y_center = video_y_center_tmp
                    else:
                        random_shift_displacement_y = 0
                        video_y_center = video_y_center_orig


                    random_shift_activate = random.randint(0, 3)
                    if random_shift_activate == 1:
                        random_shift = random.randint(4, 8)
                        shift = random_shift  # Adjust this for stronger/weaker effect (small values like 1-5 keep it lightweight)
                    else:
                        shift = 3

                    if random.randint(0, 1) == 1:
                        frame = frame_np_horizontal.astype(np.float32) / 255.0  # Normalize to [0,1] for blending

                        # Create aberrated version with channel shifts (using roll for simplicity; wraps edges but fine for small shifts)
                        aberrated = frame.copy()
                        aberrated[:, :, 0] = np.roll(frame[:, :, 0], shift, axis=0)   # Red shifted right
                        aberrated[:, :, 1] = frame[:, :, 1]                           # Green unchanged
                        aberrated[:, :, 2] = np.roll(frame[:, :, 2], -shift, axis=0)  # Blue shifted left

                        # Blend aberrated as a semi-transparent layer on top of original (alpha=0.5 for 50% opacity)
                        alpha = 0.5  # Adjust between 0 (no effect) and 1 (full aberration)
                        blended = (1 - alpha) * frame + alpha * aberrated

                        # Convert back to uint8 RGB for Pygame
                        blended = (blended * 255).astype(np.uint8)
                        frame_np_horizontal = blended  # Overwrite with blended result

                        if random.randint(0, 1) == 0:
                            random_pixelation_activate = random.randint(0, 4)

                            if random_pixelation_activate in (1, 2):
                                frame = frame_np_horizontal.astype(np.float32) / 255.0  # Normalize to [0,1] for blending
                                block_size = 20 if random_pixelation_activate == 1 else 10

                                # Compute padding to make dimensions divisible by block_size
                                height, width = frame.shape[:2]
                                pad_h = (block_size - height % block_size) % block_size
                                pad_w = (block_size - width % block_size) % block_size

                                # Pad the frame (use 'edge' mode to replicate border pixels naturally)
                                if pad_h > 0 or pad_w > 0:
                                    frame_padded = np.pad(frame, ((0, pad_h), (0, pad_w), (0, 0)), mode='edge')
                                else:
                                    frame_padded = frame

                                # Now downsample on padded (guaranteed divisible)
                                padded_h, padded_w = frame_padded.shape[:2]
                                new_h = padded_h // block_size
                                new_w = padded_w // block_size

                                # Reshape and mean over blocks
                                downsampled = frame_padded.reshape(new_h, block_size, new_w, block_size, 3).mean(axis=(1, 3))  # (new_h, new_w, 3)

                                # Upsample
                                pixelated_padded = np.repeat(np.repeat(downsampled, block_size, axis=0), block_size, axis=1)

                                # Slice back to original shape (removes padding)
                                pixelated = pixelated_padded[:height, :width]

                                # Blend (now shapes match guaranteed)
                                alpha = 0.3
                                blended = (1 - alpha) * frame + alpha * pixelated

                                # Convert back
                                blended = (blended * 255).astype(np.uint8)
                                frame_np_horizontal = blended

#                    # Define a simple sharpening kernel (adjust values if you want more/less intensity)
#                    kernel = np.array([[0, -1, 0],
#                                       [-1, 5, -1],
#                                       [0, -1, 0]])
#
#                    frame_np_horizontal = cv2.filter2D(frame_np_horizontal, -1, kernel)

                    frame_surface_horizontal = pygame.surfarray.make_surface(frame_np_horizontal)

                    # Apply smooth scaling to the Surface
                    scaled_frame_horizontal = pygame.transform.smoothscale(frame_surface_horizontal, (resized_video_width_horizontal, resized_video_height_horizontal))

                    #scaled_frame_horizontal = pygame.transform.scale(frame_surface_horizontal, (resized_video_width_horizontal, resized_video_height_horizontal))


                    current_time_center += 1 / video_horizontal.fps

#                    current_time_center += direction_center * (1 / video_horizontal.fps)
#                    
#                    # Reverse direction at boundaries
#                    if current_time_center >= video_horizontal.duration:
#                        current_time_center = video_horizontal.duration  # Clamp to end
#                        direction_center = -1
#                    elif current_time_center <= 0:
#                    #    current_time_center = video_horizontal.duration * 2
#
#                        current_time_center = 0  # Clamp to start
#                        direction_center = 1
#                    #    current_time_center = (video_horizontal.duration * 2) + 1

                    # Blit the scaled Surface onto the screen
#                    screen.fill(BLACK)
                    screen.blit(scaled_frame_horizontal, (video_x_center, video_y_center))
#                    pygame.display.flip()

                else:
                    iteration_num += 1
                    video_horizontal.close()
                    current_time_center = 0
                    #screen.fill(BLACK)

                    #random_index_horizontal = random.randint(0, num_videos_horizontal-1)
                    random.shuffle(video_filenames_horizontal)
                    random_index_horizontal = (random_index_horizontal + 1 + random.randint(0, num_videos_horizontal-1)) % num_videos_horizontal

                    print(f"random_index_horizontal: {random_index_horizontal}")
                    current_video_horizontal = f"{video_filenames_horizontal[random_index_horizontal]}"
                    print(f"current_video_horizontal: {current_video_horizontal}")

                    video_horizontal = mp.VideoFileClip(current_video_horizontal)
                    video_width_horizontal, video_height_horizontal = video_horizontal.size
                    print(f"Video width_horizontal: {video_width_horizontal}")
                    print(f"Video height_horizontal: {video_height_horizontal}")
                    #pygame.display.flip()

                if current_time_left < video_vertical_left.duration:
                    scaling_factor_vertical_left = min(actual_width / video_width_vertical_left, actual_height / video_height_vertical_left)
                    resized_video_width_vertical_left  = int(video_width_vertical_left  * scaling_factor_vertical_left)
                    resized_video_height_vertical_left = int(video_height_vertical_left * scaling_factor_vertical_left)
                    print(f"resized_video_width_vertical_left: {resized_video_width_vertical_left}")
                    print(f"resized_video_height_vertical_left: {resized_video_height_vertical_left}")

                    video_x_left = 0
                    video_y_left = (actual_height - resized_video_height_vertical_left) // 2
                    print(f"video_x_left: {video_x_left}")
                    print(f"video_y_left: {video_y_left}")
                    video_x_left_orig = video_x_left
                    video_y_left_orig = video_y_left

                    # Get the frame as a NumPy array
                    frame_np_vertical_left = video_vertical_left.get_frame(current_time_left)

                    # Convert NumPy array to Pygame Surface
                    frame_np_vertical_left = np.swapaxes(frame_np_vertical_left, 0, 1)


                    random_shift_activate_displacement_x = random.randint(0, 10)
                    if random_shift_activate_displacement_x == 5:
                        random_shift_displacement_x = random.randint(2, 5)
                        video_x_left_tmp = video_x_left + random_shift_displacement_x
                        video_x_left = video_x_left_tmp
                    else:
                        random_shift_displacement_x = 0
                        video_x_left = video_x_left_orig

                    random_shift_activate_displacement_y = random.randint(0, 10)
                    if random_shift_activate_displacement_y == 5:
                        random_shift_displacement_y = random.randint(2, 5)
                        video_y_left_tmp = video_y_left + random_shift_displacement_y
                        video_y_left = video_y_left_tmp
                    else:
                        random_shift_displacement_y = 0
                        video_y_left = video_y_left_orig




                    random_shift_activate = random.randint(0, 3)
                    if random_shift_activate == 1:
                        random_shift = random.randint(5, 12)
                        shift = random_shift  # Adjust this for stronger/weaker effect (small values like 1-5 keep it lightweight)
                    else:
                        shift = 3

                    if random.randint(0, 1) == 1:
                        frame = frame_np_vertical_left.astype(np.float32) / 255.0  # Normalize to [0,1] for blending

                        # Create aberrated version with channel shifts (using roll for simplicity; wraps edges but fine for small shifts)
                        aberrated = frame.copy()
                        aberrated[:, :, 0] = np.roll(frame[:, :, 0], shift, axis=0)   # Red shifted right
                        aberrated[:, :, 1] = frame[:, :, 1]                           # Green unchanged
                        aberrated[:, :, 2] = np.roll(frame[:, :, 2], -shift, axis=0)  # Blue shifted left

                        # Blend aberrated as a semi-transparent layer on top of original (alpha=0.5 for 50% opacity)
                        alpha = 0.5  # Adjust between 0 (no effect) and 1 (full aberration)
                        blended = (1 - alpha) * frame + alpha * aberrated

                        # Convert back to uint8 RGB for Pygame
                        blended = (blended * 255).astype(np.uint8)
                        frame_np_vertical_left = blended  # Overwrite with blended result

                        if random.randint(0, 1) == 0:
                            random_pixelation_activate = random.randint(0, 4)

                            if random_pixelation_activate in (1, 2):
                                frame = frame_np_vertical_left.astype(np.float32) / 255.0  # Normalize to [0,1] for blending
                                block_size = 20 if random_pixelation_activate == 1 else 10

                                # Compute padding to make dimensions divisible by block_size
                                height, width = frame.shape[:2]
                                pad_h = (block_size - height % block_size) % block_size
                                pad_w = (block_size - width % block_size) % block_size

                                # Pad the frame (use 'edge' mode to replicate border pixels naturally)
                                if pad_h > 0 or pad_w > 0:
                                    frame_padded = np.pad(frame, ((0, pad_h), (0, pad_w), (0, 0)), mode='edge')
                                else:
                                    frame_padded = frame

                                # Now downsample on padded (guaranteed divisible)
                                padded_h, padded_w = frame_padded.shape[:2]
                                new_h = padded_h // block_size
                                new_w = padded_w // block_size

                                # Reshape and mean over blocks
                                downsampled = frame_padded.reshape(new_h, block_size, new_w, block_size, 3).mean(axis=(1, 3))  # (new_h, new_w, 3)

                                # Upsample
                                pixelated_padded = np.repeat(np.repeat(downsampled, block_size, axis=0), block_size, axis=1)

                                # Slice back to original shape (removes padding)
                                pixelated = pixelated_padded[:height, :width]

                                # Blend (now shapes match guaranteed)
                                alpha = 0.3
                                blended = (1 - alpha) * frame + alpha * pixelated

                                # Convert back
                                blended = (blended * 255).astype(np.uint8)
                                frame_np_vertical_left = blended


                    frame_surface_vertical_left = pygame.surfarray.make_surface(frame_np_vertical_left)

                    # Apply smooth scaling to the Surface
                    scaled_frame_vertical_left = pygame.transform.smoothscale(frame_surface_vertical_left, (resized_video_width_vertical_left, resized_video_height_vertical_left))
                    #scaled_frame_vertical_left = pygame.transform.scale(frame_surface_vertical_left, (resized_video_width_vertical_left, resized_video_height_vertical_left))

                    current_time_left += 1 / video_vertical_left.fps
                    print(f"current_time_left: {current_time_left} | FPS: {video_vertical_left.fps}")

                    # Blit the scaled Surface onto the screen
#                    screen.fill(BLACK)
                    screen.blit(scaled_frame_vertical_left, (video_x_left, video_y_left))

#                    image_to_draw = loaded_images[image_index]
#                    display_image = image_to_draw
#                    image_x_left = 400 + random_shift_displacement_x
#                    image_y_left = (actual_height + random_shift_displacement_y) // 2
#                    rect = display_image.get_rect(center=(image_x_left, image_y_left))
#                    screen.blit(display_image, rect)


#                    pygame.display.flip()

                else:
#                    image_index = random.randint(0, len(loaded_images)-1)

                    iteration_num += 1
                    video_vertical_left.close()
                    current_time_left = 0
                    #screen.fill(BLACK)

                    #random_index_vertical_left = random.randint(0, num_videos_vertical_left-1)
                    random.shuffle(video_filenames_vertical_left)
                    random_index_vertical_left = (random_index_vertical_left + 1 + random.randint(0, num_videos_vertical_left-1)) % num_videos_vertical_left
                    print(f"random_index_vertical_left: {random_index_vertical_left}")
                    current_video_vertical_left = f"{video_filenames_vertical_left[random_index_vertical_left]}"
                    print(f"current_video_vertical_left: {current_video_vertical_left}")

                    video_vertical_left = mp.VideoFileClip(current_video_vertical_left)
                    video_width_vertical_left, video_height_vertical_left = video_vertical_left.size
                    print(f"Video width_vertical_left: {video_width_vertical_left}")
                    print(f"Video height_vertical_left: {video_height_vertical_left}")
#                    pygame.display.flip()

                if current_time_right < video_vertical_right.duration:
                    scaling_factor_vertical_right = min(actual_width / video_width_vertical_right, actual_height / video_height_vertical_right)
                    resized_video_width_vertical_right  = int(video_width_vertical_right  * scaling_factor_vertical_right)
                    resized_video_height_vertical_right = int(video_height_vertical_right * scaling_factor_vertical_right)
                    print(f"resized_video_width_vertical_right: {resized_video_width_vertical_right}")
                    print(f"resized_video_height_vertical_right: {resized_video_height_vertical_right}")

                    video_x_right = (actual_width  - resized_video_width_vertical_right)
                    video_y_right = (actual_height - resized_video_height_vertical_right) // 2
                    print(f"video_x_right: {video_x_right}")
                    print(f"video_y_right: {video_y_right}")
                    video_x_right_orig = video_x_right
                    video_y_right_orig = video_y_right

                    # Get the frame as a NumPy array
                    frame_np_vertical_right = video_vertical_right.get_frame(current_time_right)

                    # Convert NumPy array to Pygame Surface
                    frame_np_vertical_right = np.swapaxes(frame_np_vertical_right, 0, 1)


                    random_shift_activate_displacement_x = random.randint(0, 10)
                    if random_shift_activate_displacement_x == 5:
                        random_shift_displacement_x = random.randint(2, 5)
                        video_x_right_tmp = video_x_right + random_shift_displacement_x
                        video_x_right = video_x_right_tmp
                    else:
                        random_shift_displacement_x = 0
                        video_x_right = video_x_right_orig

                    random_shift_activate_displacement_y = random.randint(0, 10)
                    if random_shift_activate_displacement_y == 5:
                        random_shift_displacement_y = random.randint(2, 5)
                        video_y_right_tmp = video_y_right + random_shift_displacement_y
                        video_y_right = video_y_right_tmp
                    else:
                        random_shift_displacement_y = 0
                        video_y_right = video_y_right_orig


                    random_shift_activate = random.randint(0, 3)
                    if random_shift_activate == 1:
                        random_shift = random.randint(5, 12)
                        shift = random_shift  # Adjust this for stronger/weaker effect (small values like 1-5 keep it lightweight)
                    else:
                        shift = 3

                    if random.randint(0, 1) == 1:
                        frame = frame_np_vertical_right.astype(np.float32) / 255.0  # Normalize to [0,1] for blending

                        # Create aberrated version with channel shifts (using roll for simplicity; wraps edges but fine for small shifts)
                        aberrated = frame.copy()
                        aberrated[:, :, 0] = np.roll(frame[:, :, 0], shift, axis=0)   # Red shifted right
                        aberrated[:, :, 1] = frame[:, :, 1]                           # Green unchanged
                        aberrated[:, :, 2] = np.roll(frame[:, :, 2], -shift, axis=0)  # Blue shifted left

                        # Blend aberrated as a semi-transparent layer on top of original (alpha=0.5 for 50% opacity)
                        alpha = 0.5  # Adjust between 0 (no effect) and 1 (full aberration)
                        blended = (1 - alpha) * frame + alpha * aberrated

                        # Convert back to uint8 RGB for Pygame
                        blended = (blended * 255).astype(np.uint8)
                        frame_np_vertical_right = blended  # Overwrite with blended result

                        if random.randint(0, 1) == 0:
                            random_pixelation_activate = random.randint(0, 4)

                            if random_pixelation_activate in (1, 2):
                                frame = frame_np_vertical_right.astype(np.float32) / 255.0  # Normalize to [0,1] for blending
                                block_size = 20 if random_pixelation_activate == 1 else 10

                                # Compute padding to make dimensions divisible by block_size
                                height, width = frame.shape[:2]
                                pad_h = (block_size - height % block_size) % block_size
                                pad_w = (block_size - width % block_size) % block_size

                                # Pad the frame (use 'edge' mode to replicate border pixels naturally)
                                if pad_h > 0 or pad_w > 0:
                                    frame_padded = np.pad(frame, ((0, pad_h), (0, pad_w), (0, 0)), mode='edge')
                                else:
                                    frame_padded = frame

                                # Now downsample on padded (guaranteed divisible)
                                padded_h, padded_w = frame_padded.shape[:2]
                                new_h = padded_h // block_size
                                new_w = padded_w // block_size

                                # Reshape and mean over blocks
                                downsampled = frame_padded.reshape(new_h, block_size, new_w, block_size, 3).mean(axis=(1, 3))  # (new_h, new_w, 3)

                                # Upsample
                                pixelated_padded = np.repeat(np.repeat(downsampled, block_size, axis=0), block_size, axis=1)

                                # Slice back to original shape (removes padding)
                                pixelated = pixelated_padded[:height, :width]

                                # Blend (now shapes match guaranteed)
                                alpha = 0.3
                                blended = (1 - alpha) * frame + alpha * pixelated

                                # Convert back
                                blended = (blended * 255).astype(np.uint8)
                                frame_np_vertical_right = blended


                    frame_surface_vertical_right = pygame.surfarray.make_surface(frame_np_vertical_right)


                    # Apply smooth scaling to the Surface
                    scaled_frame_vertical_right = pygame.transform.smoothscale(frame_surface_vertical_right, (resized_video_width_vertical_right, resized_video_height_vertical_right))
                    #scaled_frame_vertical_right = pygame.transform.scale(frame_surface_vertical_right, (resized_video_width_vertical_right, resized_video_height_vertical_right))

                    current_time_right += 1 / video_vertical_right.fps

                    # Blit the scaled Surface onto the screen
#                    screen.fill(BLACK)
                    screen.blit(scaled_frame_vertical_right, (video_x_right, video_y_right))


#                    pygame.display.flip()

                else:
                    iteration_num += 1
                    video_vertical_right.close()
                    current_time_right = 0
                    #screen.fill(BLACK)

                    #random_index_vertical_right = random.randint(0, num_videos_vertical_right-1)
                    random.shuffle(video_filenames_vertical_right)
                    random_index_vertical_right = (random_index_vertical_right + 1 + random.randint(0, num_videos_vertical_right-1)) % num_videos_vertical_right
                    print(f"random_index_vertical_right: {random_index_vertical_right}")
                    current_video_vertical_right = f"{video_filenames_vertical_right[random_index_vertical_right]}"
                    print(f"current_video_vertical_right: {current_video_vertical_right}")

                    video_vertical_right = mp.VideoFileClip(current_video_vertical_right)
                    video_width_vertical_right, video_height_vertical_right = video_vertical_right.size
                    print(f"Video width_vertical_right: {video_width_vertical_right}")
                    print(f"Video height_vertical_right: {video_height_vertical_right}")
#                    pygame.display.flip()


                # Random chance to add overlays (e.g., 15% per frame; adjust for density)
                if random.random() < 0.40:
                    num_chars = random.randint(1, 150)  # How many to add this frame
                    screen_width, screen_height = screen.get_size()  # Use actual screen dims
    
                    for _ in range(num_chars):
                        char = random.choice(matrix_chars)
                        # Random position, offset by font size to avoid clipping
                        font_size = font.get_height()  # Dynamic based on font
                        x = random.randint(0, screen_width - font_size)
                        y = random.randint(0, screen_height - font_size)
        
                        # Render char with alpha
                        if random.randint(0, 1) == 1:
                            char_surface = font.render(char, True, overlay_color_1[:3]) # Render RGB
                            char_surface.set_alpha(overlay_color_1[3])  # Apply alpha separately
                        else:
                            char_surface = font.render(char, True, overlay_color_2[:3])
                            char_surface.set_alpha(overlay_color_2[3])                          
        
                        # Blit on top of everything
                        screen.blit(char_surface, (x, y))


                # Display FPS counter
                fps_text = font.render("FPS: {:.2f}".format(clock.get_fps()), True, (255, 255, 255))
                #fps_text = font.render(matrix_chars, True, (255, 255, 255))
                screen.blit(fps_text, (10, 10))



                pygame.display.flip()

#            if iteration_num == 3:
#                random_fps = random.randint(40, 144)
#                iteration_num = 0
#            else:
#                random_fps = 40

            random_fps = random.randint(30, 80)
            print(f"random_fps: {random_fps}")


            clock.tick(random_fps) #video.fps)  # Limit frame rate

        video_horizontal.close()
        video_vertical_left.close()
        video_vertical_right.close()
        pygame.quit()

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == '__main__':
    play_video_fullscreen()
