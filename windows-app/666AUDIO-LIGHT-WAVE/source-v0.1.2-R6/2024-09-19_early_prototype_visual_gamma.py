import pygame
import time

# Initialize Pygame
pygame.init()

# Set up display
#width, height = 1920, 1080
width, height = 3440, 1440
#flags = pygame.DOUBLEBUF | pygame.HWSURFACE
flags = pygame.DOUBLEBUF | pygame.HWSURFACE | pygame.FULLSCREEN
screen = pygame.display.set_mode((width, height), flags, vsync=1)

pygame.display.set_caption("Gamma Wave Visual")

# Define colors
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)

frequency = 50  # Hz
#frequency = 72  # Hz
#frequency = 144  # Hz

period = 1 / frequency  # Time in seconds for one cycle

# Font for displaying FPS
font = pygame.font.SysFont("Arial", 24)

# Main loop
clock = pygame.time.Clock()
running = True
last_toggle = time.time()  # To keep track of the last toggle
background_color = BLACK  # Start with a black background

while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        elif event.type == pygame.KEYDOWN:
            if event.key == pygame.K_ESCAPE:
                running = False

    # Clear the screen
    screen.fill((0, 0, 0))

    # Check if it's time to toggle the background
    current_time = time.time()
    if current_time - last_toggle >= period / 2:
        last_toggle = current_time
        # Toggle background color
        if background_color == BLACK:
            background_color = WHITE
        else:
            background_color = BLACK
    screen.fill(background_color)

    # Display FPS counter
    fps_text = font.render("FPS: {:.2f}".format(clock.get_fps()), True, (255, 255, 255))
    screen.blit(fps_text, (10, 10))

    # Update the display
    pygame.display.flip()

    # Limit frame rate to approximately 60 frames per second
    clock.tick(50)
    #clock.tick(72)
    #clock.tick(144)
    #clock.tick(135)
    #clock.tick(82.5)

# Quit Pygame
pygame.quit()
