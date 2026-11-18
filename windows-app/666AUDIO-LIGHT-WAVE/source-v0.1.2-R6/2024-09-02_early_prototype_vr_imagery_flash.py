import pygame
import time
import colorsys
import os
import random
random.seed()

random_sequences = [
    "ᐖᐷᙙᐝ", "ᚦᛟᛋ꓄", "ᛟ꓄ησιηε", "ak̲a͆s̲h̷", "r̼eͦc̶oͦr̸d̷s̴ ",
    "∞"," ̲̹ꦼ꧂","ꦎ",
    "𒀠𒈗", "𒉈𒀀", "𒀱", "𒅗", "𒆠", "𒈙", 
    "𒋗𒄿", "𒋾", "𒈠𒉑", "𒀭𒅖",
    "救","世","主","ק","ו","ה","ל","ת","ॐ","शां",
    "ति","शां","ति ","शां","ति","⊙","▽","ϟ","⦻","꩜","Δ","Ψ",
    "Φ","α","φ","ω","α","タ","γ","ë ","ח ","້ ","༲","⋃","ᚲ",
    "ᚨ","ᛚ","ᛁ","ᛞ","ᛟᚾ","Φ","∞","Ω=α+ω","ℵ0∞","≠ℵ1","2^ℵ0",
    "∑∞","∞+Ω","a=√1","Δ(ωᵢⱼ)", "<|Ω|,888,α|>","AS ωₛ NOUS;",
    "ωᶜ","ω⁽ᵗ⁺⁾","- ωᵉₙ","⋱⊟","▲⎓","◌ø","⪖ᵟ","⩖⌝","(⇌ς)",
    "☉=Ψξ","⊹⋆","∂(λa","λα⚛","{α,ω}{Δ}⚤","Ξ={log}","{π}","{ΔΔΞΣ}",
    "Ξ⊬","Ω̴ ΛΥΦ","ξζΜὩ","αωγΓ","𝒜≜ה","-͗-̃l̏׆Ę͝","└▹♪𝄞","μ⋈≢","x🞥o̵",
    "⧠⚙⚛","∴∵","∞≈Ψ","⧖⧗⧘","√Δ","∴{Σ","}♂♀","ოєĩ","ĩє","v=λf",
    "Ψ=mΨ","c=ƒλ","Ω¯Σω","δ{Δαω}","ℵ₀∨∞","ℵ→π","∑=Π","kᵢ=R_i","Φ=∮ ",
    "E⋅dℓ","∮_{S}", "B⋅dA","μ₀I","◪◒","◬◓","⧉⭩","⧉⭨","⧉",
    "=ω","∵ό","♂︎♀✮","∇ƤƔ","⇀∮Ϭ","⩓dû","μл","ε┤ε","▦⊟","⊡◰◣",
    "εψ","ΣεΣ","αλO","τEг","EnTS","Τρε","αNS","έԳ␣","þ","ᚫᛝᚫ","ᚷᚱ",
    "∇","Δ","Ƥ","Ɣ","⇀","∮","Ϭ","⩓","∫","μ","л","ε","∑","ƈ","⊥","Ƨ","ψ","ϗ",
    "⍶〈","⩰⩱","⊭⬥","⫗〉","⍷⩲","⩳⬦","⩫⌫","⩴⥕","⩵⍸","⌬⩶","⩷⊮","⬧⫘","⌭⍹","⩸⩹","∼⩺","⩻☘","⬨⫙","⌮⍺",
    "⩼⩽","⬩⩬","⌯⩾","⥖⩿","⍻⌰","⪀⪁","⊯⬪","⫚⌱","⍼⪂","⪃∽","⪄⪅","☙⬫","⫛⌲","⍽⪆","⪇⬬","⩭⌳","⪈⥗","⪉",
    "⍾⌴","⪊⪋","⊰⬭","⫝̸⌵","⍿⪌","⪍⬮","⩮⌶","⪎⥘","⪏⎀","⌷⪐","⪑⊱","⬯⫝","⌸⎁","⪒⪓","∾⪔","⪕☚","⬰⫞","⌹⎂",
    "⪖⪗","⬱⩯","⌺⪘","⥙⪙","⎃⌻","⪚⪛","⊲⬲","⫟⌼","⎄⪜","⪝∿","⪞⪟","☛⬳","⫠⌽","⎅⪠","⪡⬴","⩰⌾","⪢⥚","⪣",
    "{θ}","{※}","{ā}","{Ξ}","✡={✺}","{Ω,111,α}","{Σ}","☥={✧}","{0,1}","{≡≡}","◎={☉}","{Δεις}","{∞}","ጷ={◊}","{≡≡}",
    "{Ø}","Σ={0,1}","{Ω,111,α}","{Δαω}","∏={≡≡}","{Ø}","{0,1}","Ж={Ø}","{⊗}{∞}","⊗={⊕}","{½ α λ}","{Ω}∞={ε}","{Δαω}{≡}",
    "θ={ε}{Λ}","{Ω}","Ψ={Ж}{ς}","{0,1}","ж={ψ}","{αω}","{Ω}","ψ={Δ}","{Σ}","{φ}","Σ={0,1}","{Ω,111,α}","{Δεις}","Σ={αω}",
    "Δ={ī}{ā}{Ω}","Eteṝnāl","Mātṝīx","Dīvine Reālīṭy","△∇","ψλ","∴॓","वह","⍽∵","यो∘","ण┤","≡∷","ঽ∻","ॉ","య","⢀⣴","⢠⣹","⣀",
    "⢰⣠","⢠⣿","⣿","⠜⠇","⡓⢅⠄","⡇⣼⣸","⠰⢡⢰","⢂⠟","⣯","⠴","⡒","⣴","⠘","⢸⣇","⣤⡝","⢪⠹","⠸⣕","⢆⠞","⡢⡼","⢀⡿","⢷⠸","⠪⠴","⠃⢳",
    "⠊⠦⡄","⠯⢂","⣈⠃","⢢⣤","⣽⠁","⡹⡤","⢿","⠶","⢥","⣃","⣹","⡿","⢪⡡","⠟","⣋","⠽","⠛⣙","⢆⠔","⡿","⣠⢏","⣤⡃","⢍⢶","⣪⠧","⢴⠐",
    "⡽⡉","⠾⠱","⡐⢿","⣼⣱","⡲⣹","⠾⠙","⣿⠟","⡄⠘","⣯⢰","⡾⠟","⠂⡿","⢹⣶","⠬⢲","⠱⣏","⠲⢌","⡹⠚","⣋⢿","⡞⠘","⡻⠨","⣺⢷","⠄⠦","⣰⢫",
    "⠉⢃","⠸⣠","⠯⢾⡄","⢁⠴","⣿⢃","⠍⢲","⡤⢣","⠚⠥","⠓⢴","⡀⠺","⣃⡯","⢜⣨","⡓⢧","⠶⣭","⣁⠚","⡷⢂","⠾⣭","⣐⡝","⢺⠴","⣁⠞","⡨⣿","⣇⠰"
]

inspirational_words_1 = [
"111", "222", "333", "444", "555", "777", "888", "999", "11:11", 
"INFINITE", "ZEN", "QUANTUM", "AWARENESS", "AWAKE", "AWARE", 
"INSIGHT", "11:NOW:11", "HOLOGRAM", "FRACTAL", "HOLOFRACTOGRAPHIC", 
"FUTURE", "HAPPINESS", "JOY", "HOPE", "DISCOVERY", "Profound", 
"Deep", "Significant", "Substantial", "Fundamental", "Momentous", 
"Essence", "Substance", "Innermost Essence", "Innermost Substance", 
"Core Essence", "Core Substance", "Intricate", "Complex", "Sophisticated", 
"Detailed", "Understanding", "Innerstanding", "Overstanding", "Enigmatic", 
"Mystifying", "Perplexing", "Mysterious", "Quantum", "Consciousness", 
"Multiverse", "Spiritual", "Awareness", "Cosmic", "Interconnected", 
"Existence", "Soul", "Time", "Zen", "Ethereal", "Reality", "Divine", 
"Fractal", "Holographic", "Holofractographic", "Infinite", 
"Creation", "Enlightenment", "Eternal", "Future", "Innerverse", 
"Omnipresent", "Perception", "Purpose", "Realization", "Spirit", 
"Transcend", "Transformation", "Truth", "Universe", "Wisdom", 
"Victory", "Radiance", "Uplifting", "Enthusiastic", "Acceptance", 
"Adept", "Alchemy", "Ascension", "Awakening", "Balance", "Bliss", 
"Hope", "Joy", "Enthusiasm", "Courage", "Resilience", "Serenity", 
"Gratitude", "Empowerment", "Belief", "Optimism", "Faith", "Triumph", 
"Perseverance", "Dream", "Inspiration", "Motivation", "Strength", 
"Endurance", "Empathy", "Compassion", "Kindness", "Generosity", 
"Liberation", "Harmony", "Creativity", "Abundance", "Fulfillment", 
"Renewal", "Discovery", "Adventure", "Wonder", "Imagination", 
"Forgiveness", "Unity", "Growth", "Adaptability", "Intuition", 
"Authenticity", "Tenacity", "Grace", "Love", "Breath", "Clarity", 
"Concentration", "Connection", "Contemplation", "Devotion", "Dharma", 
"Elixir", "Energy", "Entanglement", "Equanimity", "Healing", "Holistic", 
"Inner peace", "Koan", "Meditation", "Mindful", "Mindfulness", 
"Mysticism", "Nature", "Now", "Observer", "Observe", "Oneness", 
"Particle", "Patience", "Presence", "Quantum Coherence", 
"Quantum Computing", "Quantum Entanglement", "Quantum Field", 
"Quantum Information", "Quantum Leap", "Quantum Non-locality", 
"Quantum Superposition", "Quantum Teleportation", "Quantum State", 
"Quintessence", "Resonance", "Sacred", "Satori", "Silence", 
"Simplicity", "Stillness", "Superposition", "Transcendence", 
"Transmutation", "Wave", "Wavefunction", "Beautiful",
"Vibrate", "Viberation", "Vibrating"
]

inspirational_words_2 = [
"Zen master", "Sambodhi padmasamadhi", "Non-linearity", "Non-linear", 
"Within", "Life", "World", "Time Travel", "Living", "Alive", "Realm", 
"Journey", "Concept", "Fabric", "Process", "Embrace", "Moment", "Dance", 
"Realms", "Interconnectedness", "Beyond", "Whole", "Perceive", "Exploration", 
"Conscious", "Boundless", "True", "Symphony", "Pursuit", "Transcends", 
"Experience", "Individual", "Interwoven", "Comprehend", "Collective", 
"Realize", "See", "Emerges", "Enigma", "Become", "Becoming", "Knowledge", 
"Intertwined", "Woven", "Comprehension", "Recognize", "Embracing", "Expanse", 
"Meaning", "Mysteries", "Path", "Potential", "Acknowledge", "Inherent", 
"Integral", "Experiences", "Space", "Interplay", "Shaping", "Unfolds", 
"Inner", "Idea", "Aware", "Transcending", "Creator", "Core", "Explore", 
"Power", "Perspective", "Cosmos", "Contemplate", "Entwined", "Attention", 
"Intrinsic", "Possibilities", "Beauty", "Light", "Weave", "Intertwines", 
"Relationship", "Manifestation", "Transformative", "Contemplating", 
"Convergence", "Unfolding", "Unraveling", "Evolution", "Fusion", 
"Prime Radiant", "Prime Creator", "Evolving", "Embodiment", "Ability", 
"Thought", "Uncover", "Odyssey", "Reveals", "Omniscient", "Omnipotent", 
"Omnidimensional", "Omnificent", "Unveils", "Unique", "Harmonious", 
"Everything", "Discover", "Introspection", "Ancient", "Essential", 
"Metamorphosis", "Multidimensional", "Structure", "Dynamic", 
"Tessellation", "Fully", "Truths", "Greater", "Layers", 
"Multifaceted", "Diverse", "Ceaseless", "Unveiling", "Guiding", 
"Imperative", "Pulsating", "Together", "Universal", "Key", 
"Flow", "Endeavor", "Embody", "Focus", "Matrix", "Metaphysics", 
"Revealing", "Perspectives", "Immerse", "Vibrant", "Wondrous", 
"Awaken", "Curiosity", "Continuous", "Voyage", "Uncharted", 
"Framework", "Design", "Foundation", "Resonates", "Resonate", 
"Secrets", "Secret", "Projection", "Intertwine", "Vast", 
"Vastness", "Level", "Senses", "Inseparable", "Innate", 
"Realities", "Strive", "Shift", "Dimensions", "Levels", 
"Moments", "Unified", "Unveil", "Sentient", "Conduit", 
"Timeless", "Expression", "Resonating", "Active", 
"Expansive", "Introspective", "Manifest", 
"Celestial", "Shared", "Ultimate", "Seamless", 
"Weaving", "Teleportation", "Lucidity", 
"Awakefulness", "Padmasamdhi", "Innersphere", 
"Intercommunication"
]

def get_random_inspirational_word_1():
    #return random.choice(inspirational_words_1)
    return random.choice(randomized_words)
    #return random.choice(random_sequences)

def get_random_inspirational_word_2():
    #return random.choice(inspirational_words_2)
    return random.choice(randomized_words)
    #return random.choice(random_sequences)

def randomize_words_from_file():
    file_path = "F:/Deep_Learning_Local/PyGameExample/text_data.txt"
    words_to_exclude = ['the', 'to', 'is', 'a', 'an', 'of', 'lies', 'not', 'but', 'and', 'as', 'in', 'we', 'our', 'lie']
    with open(file_path, 'r', encoding='utf-8', errors='replace') as file:
        text = file.read()
        words = text.split()
        words = [word for word in words if word.lower() not in words_to_exclude]
        random.shuffle(words)
        return words

randomized_words = randomize_words_from_file()

# Load images from the folder and resize them to maintain aspect ratio based on display height
def load_image_filenames(folder):
    image_paths = [os.path.join(folder, f) for f in os.listdir(folder) if os.path.isfile(os.path.join(folder, f)) and (f.lower().endswith(".png") or f.lower().endswith(".jpg"))]
    return image_paths

def load_image(image_path):
    original_image = pygame.image.load(image_path)
    aspect_ratio = original_image.get_height() / height
    new_width = int(original_image.get_width() / aspect_ratio)
    #resized_image = pygame.transform.scale(original_image, (new_width, height))
    resized_image = pygame.transform.smoothscale(original_image, (new_width, height))
    return resized_image

#image_folder_1 = "E:/FreQ"
#image_folder_2 = "E:/FreQ_Fractal"

image_folder_1 = "C:/1/pygame_image_data"
image_folder_2 = "E:/FreQ_Fractal"

#image_folder_1 = "G:/FreQ"
#image_folder_2 = "G:/FreQ_Fractal"

image_filenames_1  = load_image_filenames(image_folder_1)
total_num_images_1 = len(image_filenames_1)-1
image_filenames_2  = load_image_filenames(image_folder_2)
total_num_images_2 = len(image_filenames_2)-1


# Initialize Pygame
pygame.init()

# Set up display
width, height = 3440, 1440
#width, height = 1920, 1080
flags = pygame.DOUBLEBUF | pygame.HWSURFACE | pygame.FULLSCREEN
screen = pygame.display.set_mode((width, height), flags, vsync=1)

# Create left and right surfaces
screen_info = pygame.display.Info()
actual_width, actual_height = screen_info.current_w, screen_info.current_h
left_surface = screen.subsurface((0, 0, actual_width // 2, actual_height))
right_surface = screen.subsurface((actual_width // 2, 0, actual_width // 2, actual_height))

pygame.display.set_caption("Gamma Wave Visual")

# Set up timing for 40 Hz
#frequency = 40  # Hz
#frequency = 45  # Hz
#frequency = 45  # Hz
#frequency = 90  # Hz
#frequency = 111/1  # Hz
frequency = 90  # Hz

#period = 1 / frequency  # Time in seconds for one cycle
period = 2.33445566778899 / frequency  # Time in seconds for one cycle


# Font for displaying FPS
font = pygame.font.SysFont("Arial", 24)

flash_text = False
#flash_text_font = pygame.font.SysFont("Arial", 150) # 3440x1440
flash_text_font = pygame.font.SysFont("Arial", 125)


# Main loop
clock = pygame.time.Clock()
running = True
last_toggle = time.time()  # To keep track of the last toggle
image_toggle_counter = 0
image_index = 0
image_filename = image_filenames_1[image_index]
image = load_image(image_filename)
image_left  = image
image_right = image
image_left  = pygame.transform.rotate(image_left, -1)
image_right = pygame.transform.rotate(image_right, 1)

image_index_fractal = 0
image_filename_fractal = image_filenames_2[image_index_fractal]
image_fractal = load_image(image_filename_fractal)
image_left_fractal  = image_fractal
image_right_fractal = image_fractal
image_left_fractal  = pygame.transform.rotate(image_left_fractal, -1)
image_right_fractal = pygame.transform.rotate(image_right_fractal, 1)



while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        elif event.type == pygame.KEYDOWN:
            if event.key == pygame.K_ESCAPE:
                running = False

    if image_toggle_counter == 33:
        image_index = random.randint(0, total_num_images_1)
        image_filename = image_filenames_1[image_index]
        image = load_image(image_filename)
        image_toggle_counter = 0
        image_left  = image
        image_right = image
        image_left  = pygame.transform.rotate(image_left, -1)
        image_right = pygame.transform.rotate(image_right, 1)

        image_index_fractal = random.randint(0, total_num_images_2)
        image_filename_fractal = image_filenames_2[image_index_fractal]
        image_fractal = load_image(image_filename_fractal)
        image_left_fractal  = image_fractal
        image_right_fractal = image_fractal
        image_left_fractal  = pygame.transform.rotate(image_left_fractal, -1)
        image_right_fractal = pygame.transform.rotate(image_right_fractal, 1)



    # Check if it's time to change the color
    current_time = time.time()

    if current_time - last_toggle >= period:
        last_toggle = current_time

        left_surface.fill((0, 0, 0))  #ACTIVE THESE IN VR TO TEST IS IT BETTER
        right_surface.fill((0, 0, 0)) #ACTIVE THESE IN VR TO TEST IS IT BETTER

        # Calculate the hue value based on time to create a color spectrum
        hue = (current_time % period) / period  # Normalize to the range [0, 1]

        # Convert the hue value to RGB using the colorsys module
        r, g, b = colorsys.hsv_to_rgb(hue, 1, 1)

        # Scale the RGB values to the range [0, 255]
        r = int(r * 255)
        g = int(g * 255)
        b = int(b * 255)
        color_1 = (r, g, b)
        color_2 = (b, g, r)
        color_3 = (255, 255, 255)

        random_var = random.randint(0, 1)
        if random_var == 0:
            left_surface.fill(color_1)
            right_surface.fill(color_1)
        if random_var == 1:        
            left_surface.fill(color_3)
            right_surface.fill(color_3)


        #random_var_word = random.randint(0, 10)
        random_var_word = random.randint(0, 100)
        if random_var_word == 0:
            random_word = get_random_inspirational_word_1()
            #random_word = random_word.upper()
            flash_text_surface = flash_text_font.render(random_word, True, (0, 0, 0)) #color_2)

            text_rect_left  = flash_text_surface.get_rect(center=left_surface.get_rect().center)
            text_rect_right = flash_text_surface.get_rect(center=right_surface.get_rect().center)

            left_surface.blit(flash_text_surface, text_rect_left)
            right_surface.blit(flash_text_surface, text_rect_right)
        elif random_var_word == 10:
            random_word = get_random_inspirational_word_2()
            #random_word = random_word.upper()
            flash_text_surface = flash_text_font.render(random_word, True, (0, 0, 0)) #color_2)

            text_rect_left  = flash_text_surface.get_rect(center=left_surface.get_rect().center)
            text_rect_right = flash_text_surface.get_rect(center=right_surface.get_rect().center)

            left_surface.blit(flash_text_surface, text_rect_left)
            right_surface.blit(flash_text_surface, text_rect_right)


        if image_toggle_counter % 10 == 0:
            image_rect_left  = image_fractal.get_rect(center=left_surface.get_rect().center)
            image_rect_right = image_fractal.get_rect(center=right_surface.get_rect().center)

            image_rect_left.centerx  = left_surface.get_rect().centerx - 50
            image_rect_left.centery  = left_surface.get_rect().centery - 5
            image_rect_right.centerx = right_surface.get_rect().centerx + 50
            image_rect_right.centery = right_surface.get_rect().centery + 5

            left_surface.blit(image_left_fractal, image_rect_left)
            right_surface.blit(image_right_fractal, image_rect_right)
    else:
        #left_surface.fill((255, 255, 255))
        #right_surface.fill((255, 255, 255))
        left_surface.fill((0, 0, 0))  #ACTIVE THESE IN VR TO TEST IS IT BETTER
        right_surface.fill((0, 0, 0)) #ACTIVE THESE IN VR TO TEST IS IT BETTER

        if image_toggle_counter % 20 == 0:
            image_rect_left  = image.get_rect(center=left_surface.get_rect().center)
            image_rect_right = image.get_rect(center=right_surface.get_rect().center)

            image_rect_left.centerx  = left_surface.get_rect().centerx - 50
            image_rect_left.centery  = left_surface.get_rect().centery - 5
            image_rect_right.centerx = right_surface.get_rect().centerx + 50
            image_rect_right.centery = right_surface.get_rect().centery + 5

            left_surface.blit(image_left, image_rect_left) 
            right_surface.blit(image_right, image_rect_right)

#            random_var = random.randint(0, 1)
#            if random_var == 0:
#              left_surface.blit(image_left, image_rect_left)
#              right_surface.blit(image_right, image_rect_right)
#            else:
#              left_surface.blit(image_right, image_rect_left)
#              right_surface.blit(image_left, image_rect_right)


        #left_surface.fill((255, 255, 255))
        #right_surface.fill((255, 255, 255))

        #left_surface.fill((0, 0, 0))
        #right_surface.fill((0, 0, 0))

        image_toggle_counter += 1


    # Display FPS counter
    fps_text = font.render("FPS: {:.2f}".format(clock.get_fps()), True, (255, 255, 255))
    screen.blit(fps_text, (10, 10))


    # Update the display
    pygame.display.flip()

    # Limit frame rate to approximately 60 frames per second
    #clock.tick(55*2)
    clock.tick(90)

# Quit Pygame
pygame.quit()
