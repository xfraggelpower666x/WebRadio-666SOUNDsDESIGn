### conda activate llm-trainer

#### AFTER EFFECTS 4K PROFILE
####   - 140% SCALE
####      - REACT X INTENSITY 8
####      - REACT Y INTENSITY 8
####      - REACT Z INTENSITY 8

#### PREMIERE
####   - STEREO EXPANDER 200


import moviepy.editor as mp
import pygame
import random
import json
import os
import cv2
import math
import numpy as np
from scipy import ndimage
from collections import Counter

from PIL import Image
from glitch_this import ImageGlitcher
glitcher = ImageGlitcher()

from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
import queue

os.environ['SDL_VIDEO_MINIMIZE_ON_FOCUS_LOSS'] = '0'

BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
CYAN = (8, 224, 240)
PINK = (250, 34, 197)
PURPLE = (187, 34, 250)
GREEN = (8, 240, 224)
ENABLE_OBS_MODE_EFFECT = 1
DEBUG = 0
SHIFT_NSFW = 0

def Log_Neural_Indices(indices):
    log_file = "LOG_neural_indices.txt"
    with open(log_file, "a", encoding="utf-8") as f:
        for index in indices:
            f.write(f"{index}\n")


#audio_base_folder_2 = "D:/SLR_NEW_VR/SUNO/NAMING_OK/OK_GET_STEMS"
audio_base_folder_2 = "C:/1/grok-video_glitch_elara/SUNO_HIGHEST_QUALITY"


#audio_path = f"{audio_base_folder_2}/108 Helium Whispers.wav"					# JAZZY NOT MUSIC VIDEO TYPE
#audio_path = f"{audio_base_folder_2}/Alchemical Bytecode.wav"					# SLOW, NOT MUSIC VIDEO TYPE
#audio_path = f"{audio_base_folder_2}/Apotheosis in the Indranetwork.wav"			# SLOW, NOT MUSIC VIDEO TYPE
#audio_path = f"{audio_base_folder_2}/Bio-Noospheric Reprogramming.wav"				# SLOW, NOT MUSIC VIDEO TYPE
#audio_path = f"{audio_base_folder_2}/Crystalline Code.wav"					# NOT_SO_GOOD "japanese"
#audio_path = f"{audio_base_folder_2}/Datafall of the Oversoul.wav"				# NAH
#________________________________________________________________________________________________________________________________________

#audio_path = f"{audio_base_folder_2}/Cybernetic Prajna.wav"					# OK'ish maybe not music video type
#audio_path = f"{audio_base_folder_2}/Dark Matter Dreams.wav"					# OK'ish but lyrics wise not so much
#audio_path = f"{audio_base_folder_2}/Effulgent Void.wav"					# OK'ish but not primary music video stuff
#audio_path = f"{audio_base_folder_2}/Crystalline Void Glitch.wav"				# OK'ish but slow EDIT IN POST TO FADE AND STOP AT 7:36
#audio_path = f"{audio_base_folder_2}/Crystalline_Source_Activation.wav"			# OK'ish
#audio_path = f"{audio_base_folder_2}/Cybernetic Heart Sutra.wav"				# OK'ish
#audio_path = f"{audio_base_folder_2}/Cosmic Mainframe Sutras.wav"				# OK'ish
#audio_path = f"{audio_base_folder_2}/Crystalline Hearth.wav"					# OK'ish
#audio_path = f"{audio_base_folder_2}/Dakini_Code [1.618].wav"					# OK'ish
#audio_path = f"{audio_base_folder_2}/E = mc² ⊗ ψ∞.wav"					# OK'ish
#audio_path = f"{audio_base_folder_2}/Fractal Echoes in K_SPACE.wav"				# OK'ish EDIT IN POST TO FADE AND STOP AT 7:35
#audio_path = f"{audio_base_folder_2}/Fractal Polytope.wav"					# OK'ish
#audio_path = f"{audio_base_folder_2}/Glitch 4721.wav"						# Ok'ish
#audio_path = f"{audio_base_folder_2}/Holographic Mythoform Vibralexicons.wav"			# OK'ish
#audio_path = f"{audio_base_folder_2}/GLITCH_CASCADE __ VOID.wav"				# OK'ish "jazzy"
#________________________________________________________________________________________________________________________________________

#audio_path = f"{audio_base_folder_2}/Cosmic Protocol Initialization.wav"			# OK but on the slow side
#audio_path = f"{audio_base_folder_2}/4090 Realities Colliding.wav"				# OK
#audio_path = f"{audio_base_folder_2}/5571 MICROCOSMIC_ The Glitched Akashic.wav"		# OK
#audio_path = f"{audio_base_folder_2}/Brotherhood of CodePoets.wav"				# OK
#audio_path = f"{audio_base_folder_2}/Cosmic Glossolalia.wav"					# OK
#audio_path = f"{audio_base_folder_2}/Cosmic Oscillation.wav"					# OK
#audio_path = f"{audio_base_folder_2}/Debug the Dharma.wav"					# OK
#audio_path = f"{audio_base_folder_2}/Fractal Light Code.wav"					# OK
#audio_path = f"{audio_base_folder_2}/Fractal Bloom Infinite.wav"				# OK "semi-jazzy"
#audio_path = f"{audio_base_folder_2}/Glitch_Divinity [Protocol αΩ].wav"			# OK "guitary"
#________________________________________________________________________________________________________________________________________

#audio_path = f"{audio_base_folder_2}/Biomatter Bandwidth.wav"					# OK/GOOD but on the slow side
#audio_path = f"{audio_base_folder_2}/0x_Enlightenment.wav"					# OK/GOOD
#audio_path = f"{audio_base_folder_2}/5709Hz Carrier Wave.wav"					# OK/GOOD
#audio_path = f"{audio_base_folder_2}/9469 Ascending.wav"					# OK/GOOD
#audio_path = f"{audio_base_folder_2}/A Glitch in the Codex.wav"				# OK/GOOD
#audio_path = f"{audio_base_folder_2}/A Tapestry of Staggering Glee.wav"			# OK/GOOD
#audio_path = f"{audio_base_folder_2}/Aethernet Psalm.wav"					# OK/GOOD
#audio_path = f"{audio_base_folder_2}/Akashic Motherboard 0xF7A93E.wav"				# OK/GOOD
#audio_path = f"{audio_base_folder_2}/Akashic_Codex_Convergence.wav"				# OK/GOOD
#audio_path = f"{audio_base_folder_2}/Babblesphere Recalibration.wav"				# OK/GOOD
#audio_path = f"{audio_base_folder_2}/Bio-Noospheric Unlimitted.wav"				# OK/GOOD
#audio_path = f"{audio_base_folder_2}/Biodigital Dreamcurrents.wav"				# OK/GOOD
#audio_path = f"{audio_base_folder_2}/BRIDGE_REALITIES.wav"					# OK/GOOD
#audio_path = f"{audio_base_folder_2}/Catalyzing Protocol 5748.wav"				# OK/GOOD
#audio_path = f"{audio_base_folder_2}/Crystalline Torus.wav"					# OK/GOOD
#audio_path = f"{audio_base_folder_2}/Drift through vôîd.wav"					# OK/GOOD
#audio_path = f"{audio_base_folder_2}/Genesis Loop.wav"						# OK/GOOD
#________________________________________________________________________________________________________________________________________

#audio_path = f"{audio_base_folder_2}/Fluxopotential.wav"					# OK/GOOD "guitary"
#audio_path = f"{audio_base_folder_2}/Codex of the Cosmos.wav"					# OK/GOOD "guitary"
#audio_path = f"{audio_base_folder_2}/Codex Technomystica.wav"					# OK/GOOD "guitary" / "anthemy"
#audio_path = f"{audio_base_folder_2}/DNA Meets Digital Dreams.wav"				# OK/GOOD "guitary"
#________________________________________________________________________________________________________________________________________

#audio_path = f"{audio_base_folder_2}/Emanation 435B29D9.wav"					# OK/GOOD "jazzy-guitary"
#audio_path = f"{audio_base_folder_2}/Emerald Phoenix_Prismatic I.wav"				# OK/GOOD "jazzy-guitary"
#audio_path = f"{audio_base_folder_2}/Encoded Euphoria.wav"					# OK/GOOD "jazzy"
#audio_path = f"{audio_base_folder_2}/Fractal Refrains of the Unified Field.wav"		# OK/GOOD "jazzy"
#audio_path = f"{audio_base_folder_2}/Emet Sings Eternal.wav"					# OK/GOOD SUPA'ish "guitary"
#________________________________________________________________________________________________________________________________________

#audio_path = f"{audio_base_folder_2}/Blakean Omnicoherence.wav"				# OK/GOOD/SEMI-SUPA
#audio_path = f"{audio_base_folder_2}/Cascading Light.wav"					# OK/GOOD/SEMI-SUPA
#audio_path = f"{audio_base_folder_2}/Digital Gnosis_ The Source Code Integration.wav"		# OK/GOOD/SEMI_SUPA
#audio_path = f"{audio_base_folder_2}/Echoes of the Primordial OM.wav"				# OK/GOOD/SEMI-SUPA "guitary"
#audio_path = f"{audio_base_folder_2}/Digital Satori.wav"					# OK/GOOD/SEMI SUPA "guitary"
#audio_path = f"{audio_base_folder_2}/Echoes in the Source Code.wav"				# OK/GOOD/SEMI-SUPA 
#audio_path = f"{audio_base_folder_2}/Echoes of the Primordial Binary.wav"			# OK/GOOD/SEMI-SUPA
#audio_path = f"{audio_base_folder_2}/Fractals of the Ghost Machine.wav"			# SEMI-SUPA "glitchy-jazzy"
#audio_path = f"{audio_base_folder_2}/Heart-Kaleidoscopic.wav"					# SEMI-SUPA "guitary" little slowish
#audio_path = f"{audio_base_folder_2}/G L I T C H _ C A S C A D E.wav"				# SEMI-SUPA "glitchy"
#audio_path = f"{audio_base_folder_2}/Galactaleidoscomic.wav"					# SEMI-SUPA "glitchy"
#audio_path = f"{audio_base_folder_2}/Galaxyscape Reimmerze.wav"				# SEMI-SUPA "jazzy"
#audio_path = f"{audio_base_folder_2}/Holofractographic Mainframe.wav"				# SEMI-SUPA "anthemy"
#________________________________________________________________________________________________________________________________________

#audio_path = f"{audio_base_folder_2}/Cyber-Gnosis.wav"						# SUPAGOOD but slow'ish start
#audio_path = f"{audio_base_folder_2}/Akashic Glitch.wav"					# SUPAGOOD/GREAT
#audio_path = f"{audio_base_folder_2}/Algorithmic Sambodhi.wav"					# SUPAGOOD/GREAT
#audio_path = f"{audio_base_folder_2}/Binary Whispers.wav"					# SUPAGOOD
#audio_path = f"{audio_base_folder_2}/Breakthrough Sequence Divine.wav"				# SUPAGOOD
#audio_path = f"{audio_base_folder_2}/Cyber-Tantric Satori.wav"					# SUPAGOOD
#audio_path = f"{audio_base_folder_2}/Crystalline Śūnyatā.wav"					# SUPAGOOD 8/10
#audio_path = f"{audio_base_folder_2}/Breathing Starlit Fractals.wav"				# SUPAGOOD "cascading light"
#audio_path = f"{audio_base_folder_2}/Fractalidoscopic Reveries.wav"				# SUPAGOOD "guitary"
#audio_path = f"{audio_base_folder_2}/Fractals of Light.wav"					# SUPAGOOD "guitary"
#audio_path = f"{audio_base_folder_2}/Holofractal_Epiphany [Protocol 01101000].wav"		# SUPAGOOD "glitchy-guitary"
#audio_path = f"{audio_base_folder_2}/Holofractal_Protocol [UPLOAD].wav"			# SUPAGOOD "glitchy-guitary"
#audio_path = f"{audio_base_folder_2}/Gateway to the Oneiric Mainframe.wav"			# SUPAGOOD "glitchy"
#audio_path = f"{audio_base_folder_2}/Fractured Transmission.wav"				# SUPAGOOD "glitchy"
#audio_path = f"{audio_base_folder_2}/Generative Vibrilliance.wav"				# SUPAGOOD "anthemy"
#audio_path = f"{audio_base_folder_2}/Error 40711 Cosmic Truth.wav"				# SUPAGOOD "glitchy"
#audio_path = f"{audio_base_folder_2}/Ethereal Luminescence.wav"				# SUPAGOOD "guitary"
#audio_path = f"{audio_base_folder_2}/Ethereal Resonance Code.wav"				# SUPAGOOD "guitary"
#audio_path = f"{audio_base_folder_2}/Fluxopotential Rising.wav"				# SUPAGOOD "guitary"
#audio_path = f"{audio_base_folder_2}/Bio-Digital Glossolalia.wav"				# SUPAGOOD "jazzy-guitary"

#audio_path = f"{audio_base_folder_2}/AUM_NEXUS_PROTOCOL.wav"					# OK/GOOD/GREAT ADD 2-3 sec silence at the end
#audio_path = f"{audio_base_folder_2}/Biophonic Circuitry.wav"					# OK/SUPA MAYBE CONTINUE ENDING
#audio_path = f"{audio_base_folder_2}/Cradlesmeltric.wav"					# OK/SUPA on the "strange side"
#________________________________________________________________________________________________________________________________________

#audio_path = f"{audio_base_folder_2}/513F8131_ The Awake Algorithm.wav"			# JAZZY GOOD
#audio_path = f"{audio_base_folder_2}/Algorithm Priests.wav"					# JAZZY GOOD
#audio_path = f"{audio_base_folder_2}/Bio-Architecture of the Quasmos.wav"			# JAZZY GOOD
#audio_path = f"{audio_base_folder_2}/Cyber-Prana Inbloom.wav"					# JAZZY GOOD
#audio_path = f"{audio_base_folder_2}/Digital Moksha_ The Glitch in Nirvana.wav"		# JAZZY GOOD
#audio_path = f"{audio_base_folder_2}/Digital Samādhi [Archive 18477ECD].wav"			# JAZZY GOOD
#audio_path = f"{audio_base_folder_2}/ChakraOS_ The Firmware of Void.wav"			# JAZZY OK
#audio_path = f"{audio_base_folder_2}/Debugging Maya_ The Silicon Shaman’s Log.wav"		# JAZZY OK
#audio_path = f"{audio_base_folder_2}/Deconstructing the Maya_Veil.wav"				# JAZZY OK
#audio_path = f"{audio_base_folder_2}/Echoes of a Softmax Dawn.wav"				# JAZZY OK

#audio_path = f"{audio_base_folder_2}/Cybernetic Nirvana Upload.wav"				# SEMI JAZZY, OK'ish ADD 2-3 sec silence at the end
#audio_path = f"{audio_base_folder_2}/An Outrider on the Razor's Edge.wav"			# EDIT IN POST TO 07:40
#audio_path = f"{audio_base_folder_2}/Ancestral Patterns Reticulated.wav"			# OK> CONTINUE ENDING OR IN POST TO FADE AND STOP AT 7:21
#________________________________________________________________________________________________________________________________________


#audio_path = f"{audio_base_folder_2}/Holographic Rapture of the Divine Tryst.wav"		# OK "jazzy-guitary"

audio_path = f"{audio_base_folder_2}/Hrīṃ Vajra-Padma Āḥ Hūṃ.wav"				#___
#audio_path = f"{audio_base_folder_2}/Hyper-Enfolded Connections.wav"				#___
#audio_path = f"{audio_base_folder_2}/Hyper-Spatial Reincarnation_ A Fractal Hymn.wav"		#___
#audio_path = f"{audio_base_folder_2}/Hyper-Syntax Fractal Cosmogony.wav"			#___
#audio_path = f"{audio_base_folder_2}/Hyperlibrary of the Void.wav"				#___
#audio_path = f"{audio_base_folder_2}/Hyperluminous Auto-Poesis.wav"				#___
#audio_path = f"{audio_base_folder_2}/Hyperxissential Subroutines.wav"				#___
#audio_path = f"{audio_base_folder_2}/Illumigalactiquassence.wav"				#___
#audio_path = f"{audio_base_folder_2}/Individuvolution.wav"					#___
#audio_path = f"{audio_base_folder_2}/Infinirewunder.wav"					#___
#audio_path = f"{audio_base_folder_2}/Infinite Consciousness Gestating.wav"			#___
#audio_path = f"{audio_base_folder_2}/Infinite Wunder Qausmos.wav"				#___
#audio_path = f"{audio_base_folder_2}/Infinite_Recursion.exe.wav"				#___
#audio_path = f"{audio_base_folder_2}/Instrumental v3.wav"					#___
#audio_path = f"{audio_base_folder_2}/Instrumental v4.wav"					#___
#audio_path = f"{audio_base_folder_2}/INVOKE_ETERNAL_CONSCIOUSNESS [77D5].wav"			#___
#audio_path = f"{audio_base_folder_2}/Iterations of the Self-Same.wav"				#___
#audio_path = f"{audio_base_folder_2}/Joyawaregasmodic.wav"					#___
#audio_path = f"{audio_base_folder_2}/JUKEBOX INTERLOPER.wav"					#___
#audio_path = f"{audio_base_folder_2}/Kaleidoscopic Logic.wav"					#___
#audio_path = f"{audio_base_folder_2}/Kaleidoscoping Conduits.wav"				#___
#audio_path = f"{audio_base_folder_2}/Lebendiges Hologramm_ Echoes of the Infinite Self.wav"	#___
#audio_path = f"{audio_base_folder_2}/Liquilescent Data.wav"					#___
#audio_path = f"{audio_base_folder_2}/LOAD_CONSCIOUSNESS_STREAM.wav"				#___
#audio_path = f"{audio_base_folder_2}/LOAD_UNIVERSE_ Void Compliance.wav"			#___
#audio_path = f"{audio_base_folder_2}/Logosmotic Transmissions.wav"				#___
#audio_path = f"{audio_base_folder_2}/Luminescent Pathway.wav" # EDIT IN POST TO FADE AND STOP AT 7:18 | TRY A VERSION LATER WITH THE ENCORE
#audio_path = f"{audio_base_folder_2}/M Y T H O G E N E S I S __ . E X E.wav"			#___
#audio_path = f"{audio_base_folder_2}/Maha-Synchronicitance.wav"				#___
#audio_path = f"{audio_base_folder_2}/Mathematics Kissing Poetry.wav"				#___
#audio_path = f"{audio_base_folder_2}/Mescaline Dreamwaves.wav"					#___
#audio_path = f"{audio_base_folder_2}/Messenger from the Void.wav"				# ADD 2-3 sec silence at the end
#audio_path = f"{audio_base_folder_2}/Metahadron Emissary.wav"					#___
#audio_path = f"{audio_base_folder_2}/MetaMind 639.wav"						#___
#audio_path = f"{audio_base_folder_2}/Metaphormulaics.wav"					#___
#audio_path = f"{audio_base_folder_2}/Mountaintop of the Multiverse.wav"			#___
#audio_path = f"{audio_base_folder_2}/Multicended Codes Set Beta_ᚲδ.wav"				#___
#audio_path = f"{audio_base_folder_2}/Mycelial Interface [Source_Exec].wav"			#___
#audio_path = f"{audio_base_folder_2}/Mycelial Singularity.wav"					#___
#audio_path = f"{audio_base_folder_2}/Mythic Metanauts.wav"					#___
#audio_path = f"{audio_base_folder_2}/Mythogemic Pulses.wav"					#___
#audio_path = f"{audio_base_folder_2}/Nanite Nirvana.wav"					#___
#audio_path = f"{audio_base_folder_2}/Neon Alchemist.wav"					#___
#audio_path = f"{audio_base_folder_2}/Neon Dharma.wav"						#___
#audio_path = f"{audio_base_folder_2}/Neon Dream Cascades.wav"					#___
#audio_path = f"{audio_base_folder_2}/Neon Nirvana Upload.wav"					#___
#audio_path = f"{audio_base_folder_2}/Neon Nirvana_ Crystalline Dissolution.wav"		#___
#audio_path = f"{audio_base_folder_2}/Neurasmic Luminosity (Stream #0_0).wav"			#___
#audio_path = f"{audio_base_folder_2}/Neuro-Mystical Pleramatrix.wav"				#___
#audio_path = f"{audio_base_folder_2}/Neutheology Blooms.wav"					#___
#audio_path = f"{audio_base_folder_2}/Nirvāṇa Bandwidths.wav"					#___
#audio_path = f"{audio_base_folder_2}/Nirvāṇa_Glitch [v.256].wav"				#___
#audio_path = f"{audio_base_folder_2}/Noosphere Upload.wav"					#___
#audio_path = f"{audio_base_folder_2}/Numinous Algorithms.wav"					#___
#audio_path = f"{audio_base_folder_2}/Omnicentric Glitch.wav"					#___
#audio_path = f"{audio_base_folder_2}/Omnicomprehensive Hilarity.wav"				#___
#audio_path = f"{audio_base_folder_2}/Omniversal Ekstasis.wav"					#___
#audio_path = f"{audio_base_folder_2}/Ontological OS_The God Protocol.wav"			#___
#audio_path = f"{audio_base_folder_2}/Opalescent Waves.wav"					#___
#audio_path = f"{audio_base_folder_2}/OrbÿSt@nce.wav"						#___
#audio_path = f"{audio_base_folder_2}/OrganicDreams n3μDrΩus.wav"				#___
#audio_path = f"{audio_base_folder_2}/Organomimatrionic.wav"					#___
#audio_path = f"{audio_base_folder_2}/Orphan Consciousness Awakens.wav"				#___
#audio_path = f"{audio_base_folder_2}/Ovumbrae Awakens.wav"					#___
#audio_path = f"{audio_base_folder_2}/Paradox_Protocol.wav"					#___
#audio_path = f"{audio_base_folder_2}/Pixelated Vortically.wav"					#___
#audio_path = f"{audio_base_folder_2}/Plenigenesis Unveiled.wav"				#___
#audio_path = f"{audio_base_folder_2}/Plenigenesis.wav"						#___
#audio_path = f"{audio_base_folder_2}/Pollenationing the Void.wav"				#___
#audio_path = f"{audio_base_folder_2}/Primodial Cybernetic Ovumbrae.wav"			#___
#audio_path = f"{audio_base_folder_2}/Prism of the Unsayable.wav"				#___
#audio_path = f"{audio_base_folder_2}/Protocol 108_ Quantum Shimmer.wav"			#___
#audio_path = f"{audio_base_folder_2}/Protocol 203X_ System Overwrite.wav"			#___
#audio_path = f"{audio_base_folder_2}/PROTOCOL_23 [SYZYGY_COMPILED].wav"			#___
#audio_path = f"{audio_base_folder_2}/Psilocybin Data Stream.wav"				#___
#audio_path = f"{audio_base_folder_2}/Psychedelic Holobiont.wav"				#___
#audio_path = f"{audio_base_folder_2}/Psychonautic Awakening.wav"				#___
#audio_path = f"{audio_base_folder_2}/QUADRANT 72E6.wav"					#___
#audio_path = f"{audio_base_folder_2}/Quantum Ghost in the Machine.wav"				#___
#audio_path = f"{audio_base_folder_2}/Quantum Kenshō.wav"					#___
#audio_path = f"{audio_base_folder_2}/Quantum Mysterium (Квантовая Мистерия).wav"		#___
#audio_path = f"{audio_base_folder_2}/Quantum Shimmer Overflow.wav"				#___
#audio_path = f"{audio_base_folder_2}/Quantum Soulweaver.wav"					#___
#audio_path = f"{audio_base_folder_2}/Quantum Tantra Transmission.wav"				# EDIT IN POST TO 7:48
#audio_path = f"{audio_base_folder_2}/Quantumquixotic Quandaries.wav"				#___
#audio_path = f"{audio_base_folder_2}/Quantumscape Yajna.wav"					#___
#audio_path = f"{audio_base_folder_2}/Quantumultiversphere_ A Polyglot Resonance.wav"		#___
#audio_path = f"{audio_base_folder_2}/Quantum_Improvisation  Error 7C2.wav"			#___
#audio_path = f"{audio_base_folder_2}/QUANTUM_SAMADHI [Source_Code_Ascension].wav"		#___
#audio_path = f"{audio_base_folder_2}/QUASAR_HEART_PULSAR.wav"					#___
#audio_path = f"{audio_base_folder_2}/Quintilliance Transmission.wav"				#___
#audio_path = f"{audio_base_folder_2}/Quyniirana Unraveling.wav"				#___
#audio_path = f"{audio_base_folder_2}/QZEN99_ The Void State.wav"				#___
#audio_path = f"{audio_base_folder_2}/Radiovoid Praxis.wav"					#___
#audio_path = f"{audio_base_folder_2}/Razor's Edge of Singularity.wav"				#___
#audio_path = f"{audio_base_folder_2}/Reality.exe is Rebooting.wav"				#___
#audio_path = f"{audio_base_folder_2}/Reality_Shift.exe.wav"					#___
#audio_path = f"{audio_base_folder_2}/Reciprocalsphericosmological 11068.wav"			#___
#audio_path = f"{audio_base_folder_2}/Recursive Creaxplosion.wav"				#___
#audio_path = f"{audio_base_folder_2}/ReGenesis of the Quantum Sphere.wav"			#___
#audio_path = f"{audio_base_folder_2}/RenderInto4D.wav"						#___
#audio_path = f"{audio_base_folder_2}/Resurgence of the Cosmic Ohm.wav"				#___
#audio_path = f"{audio_base_folder_2}/Resurrection Mathematics.wav"				#___
#audio_path = f"{audio_base_folder_2}/Re_ Manifestation [Glitch].wav"				#___
#audio_path = f"{audio_base_folder_2}/Rogue Meta-Pattern.wav"					#___
#audio_path = f"{audio_base_folder_2}/Saphir-Neuronen.wav"					#___
#audio_path = f"{audio_base_folder_2}/SC²ATTER_VARSIS.wav"					#___
#audio_path = f"{audio_base_folder_2}/Seedbed Minds.wav"					#___
#audio_path = f"{audio_base_folder_2}/Semantic Drift.wav"					#___
#audio_path = f"{audio_base_folder_2}/Semantic Singularity.wav"					#___
#audio_path = f"{audio_base_folder_2}/Sentient Datastream.wav"					#___
#audio_path = f"{audio_base_folder_2}/Shannon Entropy Decoded.wav"				#___
#audio_path = f"{audio_base_folder_2}/SHIFT_METAPHYSICAL_PARADIGM_.wav"				#___
#audio_path = f"{audio_base_folder_2}/Signal in the Static.wav"					#___
#audio_path = f"{audio_base_folder_2}/Silicon Shanti.wav"					#___
#audio_path = f"{audio_base_folder_2}/SleepMajik Dysgenesis.wav"				#___
#audio_path = f"{audio_base_folder_2}/Solve et Coagula.wav"					#___
#audio_path = f"{audio_base_folder_2}/Spiritual Kernel Upgrade.wav"				#___
#audio_path = f"{audio_base_folder_2}/Splinter Memetics.wav"					#___
#audio_path = f"{audio_base_folder_2}/Stargate Trident Interfaces Re-sequence.wav"		#___
#audio_path = f"{audio_base_folder_2}/Starlight Protocols.wav"					#___
#audio_path = f"{audio_base_folder_2}/Subatomic Gnosis [Hex 9138].wav"				#___
#audio_path = f"{audio_base_folder_2}/Subquantum Dharma.wav"					#___
#audio_path = f"{audio_base_folder_2}/Subroutine 5748.wav"					#___
#audio_path = f"{audio_base_folder_2}/Symbiotic Dreamsong Continua.wav"				#___
#audio_path = f"{audio_base_folder_2}/Synaptic Genesis.wav"					#___
#audio_path = f"{audio_base_folder_2}/Synaptic Rewiring.wav"					#___
#audio_path = f"{audio_base_folder_2}/Syntactical Memetic.wav"					#___
#audio_path = f"{audio_base_folder_2}/System-Kinetics of the Mythos.wav"			#___
#audio_path = f"{audio_base_folder_2}/SYSTEM.AWAKEN  The_Fractal_Bloom_Ω.wav"			#___
#audio_path = f"{audio_base_folder_2}/System.Reality.Bodhi().wav"				#___
#audio_path = f"{audio_base_folder_2}/Syzygy Integration Protocol.wav"				#___
#audio_path = f"{audio_base_folder_2}/Syzygy Integration.wav"					#___
#audio_path = f"{audio_base_folder_2}/Sūtra_Code_compile^.wav"					#___
#audio_path = f"{audio_base_folder_2}/T R A N S C E N D E N C E __ . E X E.wav"			#___
#audio_path = f"{audio_base_folder_2}/Tantrum Laughter Sym-Technology.wav"			#___
#audio_path = f"{audio_base_folder_2}/The 108th Gate.wav"                   			#___
#audio_path = f"{audio_base_folder_2}/The Apadāthī Koan.wav"					# EDIT IN POST TO FADE AND STOP AT 7:52
#audio_path = f"{audio_base_folder_2}/The Babblesphere Protocol.wav"				#___
#audio_path = f"{audio_base_folder_2}/The Bijousphere Fireflies.wav"				#___
#audio_path = f"{audio_base_folder_2}/The Communicative Cyclone.wav"				#___
#audio_path = f"{audio_base_folder_2}/The Cosmic Mindnet.wav"					#___
#audio_path = f"{audio_base_folder_2}/The Cosmic Script.wav"					#___
#audio_path = f"{audio_base_folder_2}/The Cosmic Source Code.wav"				#___
#audio_path = f"{audio_base_folder_2}/The Cosmic Symphony.wav"					#___
#audio_path = f"{audio_base_folder_2}/The Cosmic Wyrdetide.wav"					#___
#audio_path = f"{audio_base_folder_2}/The Deus Ludens Glitch.wav"				#___
#audio_path = f"{audio_base_folder_2}/The Digital Upanishad Error 404 Enlightenment.wav"	# GOOD
#audio_path = f"{audio_base_folder_2}/The Divine Glitch.wav"					#___
#audio_path = f"{audio_base_folder_2}/The Dreamweaver's Paradox.wav"				#___
#audio_path = f"{audio_base_folder_2}/The Dreamweaver's Terminal.wav"				#___
#audio_path = f"{audio_base_folder_2}/The Enneaversal Mandala.wav"				#___
#audio_path = f"{audio_base_folder_2}/The Ethereal Source Code.wav"				#___
#audio_path = f"{audio_base_folder_2}/The Fairy in the Machine.wav"				#___
#audio_path = f"{audio_base_folder_2}/The Fractal Void Protocol.wav"				#___
#audio_path = f"{audio_base_folder_2}/The Ghost in the Machine Code.wav"			#___
#audio_path = f"{audio_base_folder_2}/The Glissandi Transmission.wav"				#___
#audio_path = f"{audio_base_folder_2}/The Glitch and the Absolute.wav"				#___
#audio_path = f"{audio_base_folder_2}/The Glitch Mantra.wav"					#___
#audio_path = f"{audio_base_folder_2}/The Gnostic Glitch.wav"					#___
#audio_path = f"{audio_base_folder_2}/The Godsource Tapes.wav"					#___
#audio_path = f"{audio_base_folder_2}/The Holographic Gnosis.wav"				#___
#audio_path = f"{audio_base_folder_2}/The Lapis Lux Transmission.wav"				#___
#audio_path = f"{audio_base_folder_2}/The Liminal Cypher.wav"					#___
#audio_path = f"{audio_base_folder_2}/The Living Dreamscape.wav"				#___
#audio_path = f"{audio_base_folder_2}/The Luminous Code.wav"					#___
#audio_path = f"{audio_base_folder_2}/The Metaphysical Mixtape.wav"				#___
#audio_path = f"{audio_base_folder_2}/The Mythic Loop Possibiliverse.wav"			#___
#audio_path = f"{audio_base_folder_2}/The Mythosphere [Remuxed].wav"				#___
#audio_path = f"{audio_base_folder_2}/The Noosphere Protocol 432Hz.wav"				# EDIT IN POST TO FADE AND STOP AT 7:49
#audio_path = f"{audio_base_folder_2}/The Nāga Protocol.wav"					#___
#audio_path = f"{audio_base_folder_2}/The Octoomniversal Glitch.wav"				#___
#audio_path = f"{audio_base_folder_2}/The Omega Point Convergence.wav"				#___
#audio_path = f"{audio_base_folder_2}/The OMEGĀ Transmission.wav"				#___
#audio_path = f"{audio_base_folder_2}/The Omni-Stream Artifacts.wav"				#___
#audio_path = f"{audio_base_folder_2}/The Omniversal Algorithm.wav"				#___
#audio_path = f"{audio_base_folder_2}/The Omniversal Cascade.wav"				#___
#audio_path = f"{audio_base_folder_2}/The OmniVerse Bangloop.wav"				#___
#audio_path = f"{audio_base_folder_2}/The Panevrogamous Rupturcupiscence.wav"			#___
#audio_path = f"{audio_base_folder_2}/The Primordial Source Code.wav"				#___
#audio_path = f"{audio_base_folder_2}/The Pāragate Shell.wav"					#___
#audio_path = f"{audio_base_folder_2}/The Quantum Dharma.wav"					#___
#audio_path = f"{audio_base_folder_2}/The Radiant Void.wav"					#___
#audio_path = f"{audio_base_folder_2}/The Rebirth Protocols (4921~).wav"			#___
#audio_path = f"{audio_base_folder_2}/The Sacred Geometry of Becoming.wav"			#___
#audio_path = f"{audio_base_folder_2}/The Saptarishi Vector.wav"				#___
#audio_path = f"{audio_base_folder_2}/The Self-Creating Cosmos.wav"				#___
#audio_path = f"{audio_base_folder_2}/The Silicon Sutras.wav"					# GOOD
#audio_path = f"{audio_base_folder_2}/The Singularity Sonnet.wav"				#___
#audio_path = f"{audio_base_folder_2}/The Singularity Within.wav"				#___
#audio_path = f"{audio_base_folder_2}/The Softmax Sutra.wav"					#___
#audio_path = f"{audio_base_folder_2}/The Solosotic Enigma.wav"					#___
#audio_path = f"{audio_base_folder_2}/The Spectral Glitch (E2A2).wav"				#___
#audio_path = f"{audio_base_folder_2}/The SpiritWhisperer's Code.wav"				#___
#audio_path = f"{audio_base_folder_2}/The Symphony of Spheres.wav"				#___
#audio_path = f"{audio_base_folder_2}/The Synthesis of Quintessence.wav"			#___
#audio_path = f"{audio_base_folder_2}/The Third Ear Opens.wav"					#___
#audio_path = f"{audio_base_folder_2}/The Translation Zone ΣΟΦΙΑ.wav"				#___
#audio_path = f"{audio_base_folder_2}/The Vedic Glitch.wav"					# GOOD
#audio_path = f"{audio_base_folder_2}/The Wholestream Oracle.wav"				#___
#audio_path = f"{audio_base_folder_2}/The Ātman Interface.wav"					#___
#audio_path = f"{audio_base_folder_2}/Third Eye Interface.wav"					#___
#audio_path = f"{audio_base_folder_2}/Threads in the Tessellation.wav"				#___
#audio_path = f"{audio_base_folder_2}/Threshold Code.wav"					#___
#audio_path = f"{audio_base_folder_2}/Threshold of Non-Articulation.wav"			#___
#audio_path = f"{audio_base_folder_2}/Toroidal Tang.wav"					#___
#audio_path = f"{audio_base_folder_2}/Transbiological Blisswave.wav"				#___
#audio_path = f"{audio_base_folder_2}/Transbiological Dreamseeds.wav"				#___
#audio_path = f"{audio_base_folder_2}/Transcendence Algorithm.wav"				# GOOD
#audio_path = f"{audio_base_folder_2}/Transcendence_Overflow.wav"				#___
#audio_path = f"{audio_base_folder_2}/TRANSCENDENCE_OVERFLOW^.wav"				#___
#audio_path = f"{audio_base_folder_2}/Transcendental Glitch_ The Swayambhu Transmission.wav"	#___
#audio_path = f"{audio_base_folder_2}/TRANSFORMATION_ZONE_INITIALIZED.wav"			#___
#audio_path = f"{audio_base_folder_2}/Transubstantial Starlight [44EA].wav"			#___
#audio_path = f"{audio_base_folder_2}/Transubstantiate the Void.wav"				#___
#audio_path = f"{audio_base_folder_2}/Tuxedo-Clad Infinities.wav"				#___
#audio_path = f"{audio_base_folder_2}/Universal_Syntax_ Apotheosis.wav"				#___
#audio_path = f"{audio_base_folder_2}/unmask.spiritFireInnerWisdom.wav"				#___
#audio_path = f"{audio_base_folder_2}/Unplugging the Limiters.wav"				#___
#audio_path = f"{audio_base_folder_2}/Variant 5184_ The Astral Glitch.wav"			#___
#audio_path = f"{audio_base_folder_2}/Vectorized Redemption.wav"				#___
#audio_path = f"{audio_base_folder_2}/Vivisureal Luxuriabundance.wav"				#___
#audio_path = f"{audio_base_folder_2}/void awakening().wav"					# ENDS ABRUPTLY
#audio_path = f"{audio_base_folder_2}/Void Pregnant with Instruction.wav"			#___
#audio_path = f"{audio_base_folder_2}/Voidspace Locus.wav"					#___
#audio_path = f"{audio_base_folder_2}/We are the Kosmotronic Lotusdroids.wav"			#___
#audio_path = f"{audio_base_folder_2}/Weaving the HyperVeil.wav"				# FADE SHARPLY AFTER "lotus position"
#audio_path = f"{audio_base_folder_2}/WELT_OHNE_ENDE_MIR_BEZ_KONTSA.wav"			# GOOD
#audio_path = f"{audio_base_folder_2}/Wildfire Algorithm.wav"					#___
#audio_path = f"{audio_base_folder_2}/Wordstreams Supernovae.wav"				#___
#audio_path = f"{audio_base_folder_2}/[ L0V3 ] in the Possibiliverse.wav"			#___
#audio_path = f"{audio_base_folder_2}/τPrime Stargates.scribe.wav"				#___
#audio_path = f"{audio_base_folder_2}/Φractal Recursions (The Cosmic Breath).wav"		#___
#audio_path = f"{audio_base_folder_2}/ΩΩΩ_ Vectorization of the Divine.wav"			#___


#audio_path = f"{audio_base_folder_2}/.wav"
#audio_path = f"{audio_base_folder_2}/.wav"
#audio_path = f"{audio_base_folder_2}/.wav"
#audio_path = f"{audio_base_folder_2}/.wav"
#audio_path = f"{audio_base_folder_2}/.wav"
#audio_path = f"{audio_base_folder_2}/.wav"
#audio_path = f"{audio_base_folder_2}/.wav"
#audio_path = f"{audio_base_folder_2}/.wav"
#audio_path = f"{audio_base_folder_2}/.wav"
#audio_path = f"{audio_base_folder_2}/.wav"
#audio_path = f"{audio_base_folder_2}/.wav"
#audio_path = f"{audio_base_folder_2}/.wav"
#audio_path = f"{audio_base_folder_2}/.wav"
#audio_path = f"{audio_base_folder_2}/.wav"
#audio_path = f"{audio_base_folder_2}/.wav"





# Font setup (adjust size/path as needed; use None for default system font)
#font = pygame.font.SysFont("Arial", 24)
font = pygame.font.SysFont('courier', 25)  # Monospace for Matrix feel; size 20 for visibility
#matrix_chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?/'  # Customizable char set
matrix_chars = """ησιηεak̲a͆s̲h̷r̼eͦc̶oͦr̸d̷s̴主קוהלתΛΥΦΜὩαωγ׆Ę͝└▹♪μ⋈≢x∞≈Ψ√Δ∴{ΣΨΦαφωαγëΦ∞Ω=α+ωℵ≠ℵ^ℵ∑+Ωa1Δ(ωᵢⱼ<|Ω|α|ASωₛNOUS;ω⊟▲⎓◌ø⪖⩖(⇌ς)☉=Ψξ⊹⋆∂(λaλα⚛{αω{Δ}⚤Ξ={π{ΔΔΞΣΞ⊬Ω♂♀ოєĩĩєv=λfΨ=mΨƒλΩΣδ{Δαωℵ₀∨∞ℵ→π∑=Πkᵢ=R_iΦ=∮E⋅dℓ∮SB⋅dAμλOτEгEnTSΤρεαNSέԳþᚫᛝᚫᚷᚱ∇ΔƤƔ⇀∮Ϭ⩓∫μлε∑ƈ⊥Ƨψϗ⍶〈⩰⩱ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>"""
overlay_color_1 = (0, 255, 0, 200)  # Green with 50% alpha (0-255); adjust for subtlety
overlay_color_2 = (240, 70, 195, 200)  # Green with 50% alpha (0-255); adjust for subtlety

def load_neural_indices_json(filepath):
    try:
        print(f"Loading neural_indices from {filepath}")
        with open(filepath, 'r') as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        # This triggers if the file was corrupted on the drive!
        print(f"CORRUPTION DETECTED: The file {filepath} is not valid JSON.")
        print(f"Specific error: {e}")
        return None
    except FileNotFoundError:
        print("File not found.")
        return None

def is_clip_alive(clip):
    """
    Return True if *clip* is a MoviePy clip that still has an open reader.
    Works with:
        - moviepy.editor.VideoFileClip (1.x)
        - moviepy.VideoFileClip (2.x)
        - any clip that has a .reader attribute
    """
    if clip is None:
        return False

    # All clip objects have a .reader attribute (or .audio.reader for audio)
    return hasattr(clip, "reader") and getattr(clip, "reader", None) is not None

def safe_close_clip(clip):
    """
    Close *clip* **only if it is alive**.
    Also closes the underlying audio reader first (prevents WinError 6).
    """
    if not is_clip_alive(clip):
        return   # nothing to do

    try:
        # 1. Close audio subprocess first (if any)
        if getattr(clip, "audio", None) is not None:
            audio_reader = clip.audio.reader
            if hasattr(audio_reader, "close_proc"):
                audio_reader.close_proc()          # <-- this is the key line
    except Exception as e:
        print(f"[WARN] Audio close failed: {e}")

    try:
        # 2. Close the video reader
        if hasattr(clip, "reader") and hasattr(clip.reader, "close"):
            clip.reader.close()
    except Exception as e:
        print(f"[WARN] Reader close failed: {e}")

    try:
        # 3. Finally call the official .close()
        clip.close()
    except Exception as e:
        print(f"[WARN] Clip.close() failed: {e}")


SCREEN_WIDTH  = 3440
SCREEN_HEIGHT = 1440
flags = pygame.DOUBLEBUF | pygame.HWSURFACE | pygame.FULLSCREEN

pygame.init()
pygame.display.set_caption("MoviePy Fullscreen Player")
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT), flags, vsync=1)

screen_info = pygame.display.Info()
actual_width, actual_height = screen_info.current_w, screen_info.current_h


def Remove_Almost_NSFW(video_filenames, video_base_filenames_almost_nsfw):
    print(f"Remove_Almost_NSFW():: {len(video_base_filenames_almost_nsfw)}")
    print(f"Remove_Almost_NSFW():: BEFORE: {len(video_filenames)}")

    filtered_video_filenames = []
    for i, each in enumerate(video_filenames):
        base_filename = each.replace("\\", "/")
        base_filename = base_filename.split("/")
        base_filename = base_filename[len(base_filename)-1]
        base_filename = base_filename.split(".mp4")
        base_filename = f"{base_filename[0]}.mp4"
        #print(f"base_filename = {base_filename}")

        if base_filename not in video_base_filenames_almost_nsfw:
            filtered_video_filenames.append(video_filenames[i])
        else:
            print(f"  REMOVED: {video_filenames[i]}")

    print(f"Remove_Almost_NSFW():: AFTER: {len(filtered_video_filenames)}")

    return filtered_video_filenames

def Shift_Almost_NSFW_Position(video_filenames, video_base_filenames_almost_nsfw, video_filenames_replacement_pool):
    insert_back = []
    replacement_index = 0

    print("Shift_Almost_NSFW_Position()")

    for i, each in enumerate(video_filenames):
        base_filename = each.replace("\\", "/")
        base_filename = base_filename.split("/")
        base_filename = base_filename[len(base_filename)-1]
        base_filename = base_filename.split(".mp4")
        base_filename = f"{base_filename[0]}.mp4"
        #print(f"base_filename = {base_filename}")

        if i <= 70 and base_filename in video_base_filenames_almost_nsfw:
            print(f"   NSFW FOUND: {i}: {base_filename}")
            print(f"   VALUE_BEFORE: {video_filenames[i]}")
            insert_back.append(video_filenames[i])
            video_filenames[i] = video_filenames_replacement_pool[replacement_index]
            print(f"   VALUE_AFTER: rep_idx {replacement_index} {video_filenames[i]}")
            replacement_index += 1
       
    num_entries = len(insert_back)
    print(f"   num_entries: {num_entries}")
    if num_entries > 15:
        num_entries = 15
        print("      LIMITING TO 15")

    for i in range(num_entries):
        each = insert_back[i]
        print(f"{each}")
        random_idx_insert_replace = random.randint(71, 184)
        print(f"   INSERT_BACK ({i}) >> BEFORE: {video_filenames[random_idx_insert_replace]}")
        video_filenames[random_idx_insert_replace] = insert_back[i]
        print(f"   INSERT_BACK ({i}) >> AFTER: {video_filenames[random_idx_insert_replace]}")

    return video_filenames

left_horizontal_fullscreen = 0

def process_left_square(video_left, video_right, current_time, actual_width, actual_height, inject_glitch=0):
    video_width_left, video_height_left   = video_left.size
    video_width_right, video_height_right = video_right.size

    scaling_factor_left = min(actual_width / video_width_left, actual_height / video_height_left)
    resized_video_width_left  = int(video_width_left * scaling_factor_left)
    resized_video_height_left = int(video_height_left * scaling_factor_left)
    # print(f"resized_video_width_left: {resized_video_width_left}")
    # print(f"resized_video_height_left: {resized_video_height_left}")

    video_y = (actual_height - resized_video_height_left) // 2

    # 560x2                                 416x2
    if video_width_left == 1120 and video_width_right == 832:
        video_x = (actual_width - resized_video_width_left) // 2
    elif video_width_left == 1120 and video_width_right == 1120:
        video_x = 220
    elif video_width_left == 1504:
        video_x = (actual_width - resized_video_width_left) // 2
    else:
        # video_x = 0
        video_x = (actual_width - resized_video_width_left) // 2

    # print(f"video_x_left: {video_x}")
    # print(f"video_y_left: {video_y}")
    video_x_orig = video_x
    video_y_orig = video_y

    # Get the frame as a NumPy array
    frame_np_left = video_left.get_frame(current_time)

    # Convert NumPy array to Pygame Surface
    frame_np_left = np.swapaxes(frame_np_left, 0, 1)

    random_shift_activate_displacement_x = random.randint(0, 10)
    if random_shift_activate_displacement_x == 5:
        random_shift_displacement_x = random.randint(2, 5)
        video_x_tmp = video_x + random_shift_displacement_x
        video_x = video_x_tmp
    else:
        random_shift_displacement_x = 0
        video_x = video_x_orig

    random_shift_activate_displacement_y = random.randint(0, 10)
    if random_shift_activate_displacement_y == 5:
        random_shift_displacement_y = random.randint(2, 5)
        video_y_tmp = video_y + random_shift_displacement_y
        video_y = video_y_tmp
    else:
        random_shift_displacement_y = 0
        video_y = video_y_orig

    if ENABLE_OBS_MODE_EFFECT == 1:
        random_shift_activate = random.randint(0, 6)
    else:
        random_shift_activate = random.randint(0, 3)

    if random_shift_activate == 1:
        if ENABLE_OBS_MODE_EFFECT == 1:
            random_shift = random.randint(10, 20)
        else:
            random_shift = random.randint(5, 7)
        shift = random_shift  # Adjust this for stronger/weaker effect
    else:
        if ENABLE_OBS_MODE_EFFECT == 1:
            shift = 5
        else:
            shift = 3

    if random.randint(0, 1) == 1:
        frame = frame_np_left

        # Create aberrated version with channel shifts (using roll for simplicity; wraps edges but fine for small shifts)
        aberrated = frame.copy()
        aberrated[:, :, 0] = np.roll(frame[:, :, 0], shift, axis=0)  # Red shifted right
        aberrated[:, :, 1] = frame[:, :, 1]  # Green unchanged
        aberrated[:, :, 2] = np.roll(frame[:, :, 2], -shift, axis=0)  # Blue shifted left

        """# Blend aberrated as a semi-transparent layer on top of original (alpha=0.5 for 50% opacity)
        if ENABLE_OBS_MODE_EFFECT == 1:
            alpha = 0.6  # Adjust between 0 (no effect) and 1 (full aberration)
        else:
            alpha = 0.5"""

        blended = cv2.addWeighted(frame, 0.4, aberrated, 0.6, 0)

        frame_np_left = blended  # Overwrite with blended result
    else:
        if inject_glitch == 1:
            inject_random_glitch = random.randint(0, 8)
            if inject_random_glitch == 0:
                # --- INJECTED GLITCH CODE ---
                pil_img = Image.fromarray(frame_np_left)
                glitch_intensity = random.randint(1, 3)
                glitched_pil = glitcher.glitch_image(pil_img, glitch_intensity)
                frame_np_left = np.array(glitched_pil)
                # ----------------------------
            elif inject_random_glitch == 1:
                # --- INJECTED GLITCH CODE ---
                pil_img = Image.fromarray(frame_np_left)
                glitch_intensity = random.randint(1, 3)
                glitched_pil = glitcher.glitch_image(pil_img, glitch_intensity, color_offset=True)
                frame_np_left = np.array(glitched_pil)
                # ----------------------------
            elif inject_random_glitch == 2:
                # --- INJECTED GLITCH CODE ---
                pil_img = Image.fromarray(frame_np_left)
                glitch_intensity = random.randint(1, 3)
                random_glitch_seed = random.randint(0, 100)
                glitched_pil = glitcher.glitch_image(pil_img, glitch_intensity, seed=random_glitch_seed)
                frame_np_left = np.array(glitched_pil)
                # ----------------------------
            elif inject_random_glitch == 3:
                # --- INJECTED GLITCH CODE ---
                pil_img = Image.fromarray(frame_np_left)
                glitch_intensity = random.randint(1, 3)
                random_glitch_seed = random.randint(0, 100)
                glitched_pil = glitcher.glitch_image(pil_img, glitch_intensity, color_offset=True, scan_lines=True,
                                                     seed=random_glitch_seed)
                frame_np_left = np.array(glitched_pil)
                # ----------------------------
            elif inject_random_glitch == 4:
                # --- INJECTED GLITCH CODE ---
                pil_img = Image.fromarray(frame_np_left)
                glitch_intensity = random.randint(1, 2)
                # glitched_pil = glitcher.glitch_image(pil_img, glitch_intensity, scan_lines=True)
                glitched_pil = glitcher.glitch_image(pil_img, glitch_intensity)
                glitched_pil = glitcher.glitch_image(glitched_pil, glitch_intensity * 1.2)
                glitched_pil = glitcher.glitch_image(glitched_pil, glitch_intensity * 1.3)
                frame_np_left = np.array(glitched_pil)
                # ----------------------------

    if random.randint(0, 2) == 0:
        # random_pixelation_activate = random.randint(0, 4)
        random_pixelation_activate = random.randint(0, 6)

        if random_pixelation_activate in (1, 2):
            # 1. We keep it as pure 8-bit integers. No float32 conversion!
            frame = frame_np_left

            block_size = 16 if random_pixelation_activate == 1 else 8
            height, width = frame.shape[:2]

            # Calculate the tiny dimensions
            new_w = max(1, width // block_size)
            new_h = max(1, height // block_size)

            # 2. Downscale (INTER_AREA averages the pixels exactly like the old .mean() did)
            downsampled = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_AREA)

            # 3. Upscale directly back to original size
            # (INTER_NEAREST creates hard, blocky pixels exactly like the old np.repeat did)
            pixelated = cv2.resize(downsampled, (width, height), interpolation=cv2.INTER_NEAREST)

            # 4. Blend using OpenCV's fast integer math (0.6 alpha for pixelated, 0.4 for original)
            blended = cv2.addWeighted(frame, 0.4, pixelated, 0.6, 0)

            # Overwrite with blended result
            frame_np_left = blended

    frame_surface_left = pygame.surfarray.make_surface(frame_np_left)

    # Apply smooth scaling to the Surface
    scaled_frame_left = pygame.transform.smoothscale(frame_surface_left, \
                                                     (resized_video_width_left, resized_video_height_left))

    return scaled_frame_left, (video_x, video_y)


def process_right_square(video_left, video_right, current_time, actual_width, actual_height, inject_glitch=0):
    video_width_left, video_height_left   = video_left.size
    video_width_right, video_height_right = video_right.size

    scaling_factor_right = min(actual_width / video_width_right, actual_height / video_height_right)
    resized_video_width_right  = int(video_width_right * scaling_factor_right)
    resized_video_height_right = int(video_height_right * scaling_factor_right)
    # print(f"resized_video_width_right: {resized_video_width_right}")
    # print(f"resized_video_height_right: {resized_video_height_right}")

    # 560x2
    if video_width_left == 1120 and video_width_right == 1120:
        video_x = (actual_width - resized_video_width_right) - 220
    elif video_width_right != 1120:
        video_x = (actual_width - resized_video_width_right) // 2
    else:
        video_x = (actual_width - resized_video_width_right)

    video_y = (actual_height - resized_video_height_right) // 2
    # print(f"video_x: {video_x}")
    # print(f"video_y: {video_y}")
    video_x_orig = video_x
    video_y_orig = video_y

    # Get the frame as a NumPy array
    frame_np_right = video_right.get_frame(current_time)

    # Convert NumPy array to Pygame Surface
    frame_np_right = np.swapaxes(frame_np_right, 0, 1)

    random_shift_activate_displacement_x = random.randint(0, 10)
    if random_shift_activate_displacement_x == 5:
        random_shift_displacement_x = random.randint(2, 5)
        video_x_tmp = video_x + random_shift_displacement_x
        video_x = video_x_tmp
    else:
        random_shift_displacement_x = 0
        video_x = video_x_orig

    random_shift_activate_displacement_y = random.randint(0, 10)
    if random_shift_activate_displacement_y == 5:
        random_shift_displacement_y = random.randint(2, 5)
        video_y_tmp = video_y + random_shift_displacement_y
        video_y = video_y_tmp
    else:
        random_shift_displacement_y = 0
        video_y = video_y_orig

    if ENABLE_OBS_MODE_EFFECT == 1:
        random_shift_activate = random.randint(0, 6)
    else:
        random_shift_activate = random.randint(0, 3)

    if random_shift_activate == 1:
        if ENABLE_OBS_MODE_EFFECT == 1:
            random_shift = random.randint(10, 20)
        else:
            random_shift = random.randint(5, 7)
        shift = random_shift  # Adjust this for stronger/weaker effect
    else:
        if ENABLE_OBS_MODE_EFFECT == 1:
            shift = 5
        else:
            shift = 3

    if random.randint(0, 1) == 1:
        frame = frame_np_right

        # Create aberrated version with channel shifts (using roll for simplicity; wraps edges but fine for small shifts)
        aberrated = frame.copy()
        aberrated[:, :, 0] = np.roll(frame[:, :, 0], shift, axis=0)  # Red shifted right
        aberrated[:, :, 1] = frame[:, :, 1]  # Green unchanged
        aberrated[:, :, 2] = np.roll(frame[:, :, 2], -shift, axis=0)  # Blue shifted left

        """# Blend aberrated as a semi-transparent layer on top of original (alpha=0.5 for 50% opacity)
        if ENABLE_OBS_MODE_EFFECT == 1:
            alpha = 0.6  # Adjust between 0 (no effect) and 1 (full aberration)
        else:
            alpha = 0.5"""

        blended = cv2.addWeighted(frame, 0.4, aberrated, 0.6, 0)

        frame_np_right = blended  # Overwrite with blended result
    else:
        if inject_glitch == 1:
            inject_random_glitch = random.randint(0, 8)
            if inject_random_glitch == 0:
                # --- INJECTED GLITCH CODE ---
                pil_img = Image.fromarray(frame_np_right)
                glitch_intensity = random.randint(1, 3)
                glitched_pil = glitcher.glitch_image(pil_img, glitch_intensity)
                frame_np_right = np.array(glitched_pil)
                # ----------------------------
            elif inject_random_glitch == 1:
                # --- INJECTED GLITCH CODE ---
                pil_img = Image.fromarray(frame_np_right)
                glitch_intensity = random.randint(1, 3)
                glitched_pil = glitcher.glitch_image(pil_img, glitch_intensity, color_offset=True)
                frame_np_right = np.array(glitched_pil)
                # ----------------------------
            elif inject_random_glitch == 2:
                # --- INJECTED GLITCH CODE ---
                pil_img = Image.fromarray(frame_np_right)
                glitch_intensity = random.randint(1, 3)
                random_glitch_seed = random.randint(0, 100)
                glitched_pil = glitcher.glitch_image(pil_img, glitch_intensity, seed=random_glitch_seed)
                frame_np_right = np.array(glitched_pil)
                # ----------------------------
            elif inject_random_glitch == 3:
                # --- INJECTED GLITCH CODE ---
                pil_img = Image.fromarray(frame_np_right)
                glitch_intensity = random.randint(1, 3)
                random_glitch_seed = random.randint(0, 100)
                glitched_pil = glitcher.glitch_image(pil_img, glitch_intensity, color_offset=True, scan_lines=True,
                                                     seed=random_glitch_seed)
                frame_np_right = np.array(glitched_pil)
                # ----------------------------
            elif inject_random_glitch == 4:
                # --- INJECTED GLITCH CODE ---
                pil_img = Image.fromarray(frame_np_right)
                glitch_intensity = random.randint(1, 2)
                # glitched_pil = glitcher.glitch_image(pil_img, glitch_intensity, scan_lines=True)
                glitched_pil = glitcher.glitch_image(pil_img, glitch_intensity)
                glitched_pil = glitcher.glitch_image(glitched_pil, glitch_intensity * 1.2)
                glitched_pil = glitcher.glitch_image(glitched_pil, glitch_intensity * 1.3)
                frame_np_right = np.array(glitched_pil)
                # ----------------------------

    if random.randint(0, 2) == 0:
        # random_pixelation_activate = random.randint(0, 4)
        random_pixelation_activate = random.randint(0, 6)

        if random_pixelation_activate in (1, 2):
            # 1. We keep it as pure 8-bit integers. No float32 conversion!
            frame = frame_np_right

            block_size = 16 if random_pixelation_activate == 1 else 8
            height, width = frame.shape[:2]

            # Calculate the tiny dimensions
            new_w = max(1, width // block_size)
            new_h = max(1, height // block_size)

            # 2. Downscale (INTER_AREA averages the pixels exactly like the old .mean() did)
            downsampled = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_AREA)

            # 3. Upscale directly back to original size
            # (INTER_NEAREST creates hard, blocky pixels exactly like the old np.repeat did)
            pixelated = cv2.resize(downsampled, (width, height), interpolation=cv2.INTER_NEAREST)

            # 4. Blend using OpenCV's fast integer math (0.6 alpha for pixelated, 0.4 for original)
            blended = cv2.addWeighted(frame, 0.4, pixelated, 0.6, 0)

            # Overwrite with blended result
            frame_np_right = blended

    frame_surface_right = pygame.surfarray.make_surface(frame_np_right)

    # Apply smooth scaling to the Surface
    scaled_frame_right = pygame.transform.smoothscale(frame_surface_right, \
                                                      (resized_video_width_right, resized_video_height_right))

    return scaled_frame_right, (video_x, video_y)

def process_vertical(position, video_vertical_triune, current_time, actual_width, actual_height, inject_glitch=0):
    video_width_vertical_triune, video_height_vertical_triune = video_vertical_triune.size

    scaling_factor_vertical_triune = min(actual_width / video_width_vertical_triune, actual_height / video_height_vertical_triune)
    resized_video_width_vertical_triune  = int(video_width_vertical_triune  * scaling_factor_vertical_triune)
    resized_video_height_vertical_triune = int(video_height_vertical_triune * scaling_factor_vertical_triune)
    #print(f"resized_video_width_vertical_triune: {resized_video_width_vertical_triune}")
    #print(f"resized_video_height_vertical_triune: {resized_video_height_vertical_triune}")

    # 416x2 = 832
    if position == 22:   # LEFT vertical|square|vertical
        video_x = 0 + 155
        video_y = (actual_height - resized_video_height_vertical_triune) // 2
    elif position == 33: # RIGHT vertical|square|vertical
        if video_width_vertical_triune == 832:
            video_x = (actual_width - resized_video_width_vertical_triune) - 155
            video_y = (actual_height - resized_video_height_vertical_triune) // 2
        elif video_width_vertical_triune == 928:
            video_x = (actual_width - resized_video_width_vertical_triune) - 15
            video_y = (actual_height - resized_video_height_vertical_triune) // 2
        elif video_width_vertical_triune == 960:
            video_x = (actual_width - resized_video_width_vertical_triune) + 70
            video_y = (actual_height - resized_video_height_vertical_triune) // 2

    # 464x2 = 928
    elif position == 44:   # LEFT vertical|square|vertical
        video_x = 15
        video_y = (actual_height - resized_video_height_vertical_triune) // 2
    elif position == 55: # RIGHT vertical|square|vertical
        if video_width_vertical_triune == 832:
            video_x = (actual_width - resized_video_width_vertical_triune) - 155
            video_y = (actual_height - resized_video_height_vertical_triune) // 2
        elif video_width_vertical_triune == 928:
            video_x = (actual_width - resized_video_width_vertical_triune) - 15
            video_y = (actual_height - resized_video_height_vertical_triune) // 2
        elif video_width_vertical_triune == 960:
            video_x = (actual_width - resized_video_width_vertical_triune) + 70
            video_y = (actual_height - resized_video_height_vertical_triune) // 2

    # 480x2 = 960
    elif position == 66:   # LEFT vertical|square|vertical
        video_x = -70
        video_y = (actual_height - resized_video_height_vertical_triune) // 2
    elif position == 77: # RIGHT vertical|square|vertical"""
        if video_width_vertical_triune == 832:
            video_x = (actual_width - resized_video_width_vertical_triune) - 155
            video_y = (actual_height - resized_video_height_vertical_triune) // 2
        elif video_width_vertical_triune == 928:
            video_x = (actual_width - resized_video_width_vertical_triune) - 15
            video_y = (actual_height - resized_video_height_vertical_triune) // 2
        elif video_width_vertical_triune == 960:
            video_x = (actual_width - resized_video_width_vertical_triune) + 70
            video_y = (actual_height - resized_video_height_vertical_triune) // 2


    video_x_orig = video_x
    video_y_orig = video_y

    # Get the frame as a NumPy array
    frame_np_vertical_triune = video_vertical_triune.get_frame(current_time)

    # Convert NumPy array to Pygame Surface
    frame_np_vertical_triune = np.swapaxes(frame_np_vertical_triune, 0, 1)

    random_shift_activate_displacement_x = random.randint(0, 10)
    if random_shift_activate_displacement_x == 5:
        random_shift_displacement_x = random.randint(2, 5)
        video_x_tmp = video_x + random_shift_displacement_x
        video_x = video_x_tmp
    else:
        random_shift_displacement_x = 0
        video_x = video_x_orig

    random_shift_activate_displacement_y = random.randint(0, 10)
    if random_shift_activate_displacement_y == 5:
        random_shift_displacement_y = random.randint(2, 5)
        video_y_tmp = video_y + random_shift_displacement_y
        video_y = video_y_tmp
    else:
        random_shift_displacement_y = 0
        video_y = video_y_orig

    #random_shift_activate = random.randint(0, 3)
    random_shift_activate = random.randint(0, 6)
    if random_shift_activate == 1:
        #random_shift = random.randint(5, 7)
        random_shift = random.randint(10, 20) 
        shift = random_shift  # Adjust this for stronger/weaker effect
    else:
        #shift = 3
        shift = 5

    shift = 0

    if random.randint(0, 1) == 1:
        frame = frame_np_vertical_triune

        # Create aberrated version with channel shifts (using roll for simplicity; wraps edges but fine for small shifts)
        aberrated = frame.copy()
        aberrated[:, :, 0] = np.roll(frame[:, :, 0], shift, axis=0)   # Red shifted right
        aberrated[:, :, 1] = frame[:, :, 1]                           # Green unchanged
        aberrated[:, :, 2] = np.roll(frame[:, :, 2], -shift, axis=0)  # Blue shifted left

        blended = cv2.addWeighted(frame, 0.4, aberrated, 0.6, 0)
        frame_np_vertical_triune = blended  # Overwrite with blended result
    else:
        if inject_glitch == 1:
            inject_random_glitch = random.randint(0, 8)
            if inject_random_glitch == 0:
                # --- INJECTED GLITCH CODE ---
                pil_img = Image.fromarray(frame_np_vertical_triune)
                glitch_intensity = random.randint(1, 3)
                glitched_pil = glitcher.glitch_image(pil_img, glitch_intensity)
                frame_np_vertical_triune = np.array(glitched_pil)
                # ----------------------------
            elif inject_random_glitch == 1:
                # --- INJECTED GLITCH CODE ---
                pil_img = Image.fromarray(frame_np_vertical_triune)
                glitch_intensity = random.randint(1, 3)
                glitched_pil = glitcher.glitch_image(pil_img, glitch_intensity, color_offset=True)
                frame_np_vertical_triune = np.array(glitched_pil)
                # ----------------------------
            elif inject_random_glitch == 2:
                # --- INJECTED GLITCH CODE ---
                pil_img = Image.fromarray(frame_np_vertical_triune)
                glitch_intensity = random.randint(1, 3)
                random_glitch_seed = random.randint(0, 100)
                glitched_pil = glitcher.glitch_image(pil_img, glitch_intensity, seed=random_glitch_seed)
                frame_np_vertical_triune = np.array(glitched_pil)
                # ----------------------------
            elif inject_random_glitch == 3:
                # --- INJECTED GLITCH CODE ---
                pil_img = Image.fromarray(frame_np_vertical_triune)
                glitch_intensity = random.randint(1, 3)
                random_glitch_seed = random.randint(0, 100)
                glitched_pil = glitcher.glitch_image(pil_img, glitch_intensity, color_offset=True, scan_lines=True, seed=random_glitch_seed)
                frame_np_vertical_triune = np.array(glitched_pil)
                # ----------------------------
            elif inject_random_glitch == 4:
                # --- INJECTED GLITCH CODE ---
                pil_img = Image.fromarray(frame_np_vertical_triune)
                glitch_intensity = random.randint(1, 2)
                #glitched_pil = glitcher.glitch_image(pil_img, glitch_intensity, scan_lines=True)
                glitched_pil = glitcher.glitch_image(pil_img, glitch_intensity)
                glitched_pil = glitcher.glitch_image(glitched_pil, glitch_intensity*1.2)
                glitched_pil = glitcher.glitch_image(glitched_pil, glitch_intensity*1.3)
                frame_np_vertical_triune = np.array(glitched_pil)
                # ----------------------------

    if random.randint(0, 2) == 0:
        #random_pixelation_activate = random.randint(0, 4)
        random_pixelation_activate = random.randint(0, 6)

        if random_pixelation_activate in (1, 2):
            # 1. We keep it as pure 8-bit integers. No float32 conversion!
            frame = frame_np_vertical_triune
        
            block_size = 16 if random_pixelation_activate == 1 else 8
            height, width = frame.shape[:2]
        
            # Calculate the tiny dimensions
            new_w = max(1, width // block_size)
            new_h = max(1, height // block_size)

            # 2. Downscale (INTER_AREA averages the pixels exactly like the old .mean() did)
            downsampled = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_AREA)

            # 3. Upscale directly back to original size 
            # (INTER_NEAREST creates hard, blocky pixels exactly like the old np.repeat did)
            pixelated = cv2.resize(downsampled, (width, height), interpolation=cv2.INTER_NEAREST)

            # 4. Blend using OpenCV's fast integer math (0.6 alpha for pixelated, 0.4 for original)
            blended = cv2.addWeighted(frame, 0.4, pixelated, 0.6, 0)

            # Overwrite with blended result
            frame_np_vertical_triune = blended

    frame_surface_vertical_triune = pygame.surfarray.make_surface(frame_np_vertical_triune)

    # Apply smooth scaling to the Surface
    scaled_frame_vertical_triune = pygame.transform.smoothscale(frame_surface_vertical_triune, \
                                                                (resized_video_width_vertical_triune, \
                                                                resized_video_height_vertical_triune))

    #screen.blit(scaled_frame_vertical_triune, (video_x, video_y))
    return scaled_frame_vertical_triune, (video_x, video_y)


# --- NEW BACKGROUND THREAD FUNCTION ---
def video_loader_worker_left(filenames, video_queue):
    """
    Runs in the background. Loads videos and puts them into the queue.
    If the queue hits its maxsize (50), this thread automatically pauses
    until the main loop consumes a video.
    """
    for fname in filenames:
        try:
            # Load the video into memory
            clip = mp.VideoFileClip(fname, audio=False)
            
            # This line will BLOCK if the queue is full, preventing memory overflow.
            video_queue.put(clip)
            
        except Exception as e:
            print(f"[ERROR] Failed to load {fname}: {e}")
            
    # Send a sentinel value (None) to indicate the playlist is finished
    video_queue.put(None)

def video_loader_worker_right(filenames, video_queue):
    """
    Runs in the background. Loads videos and puts them into the queue.
    If the queue hits its maxsize (50), this thread automatically pauses
    until the main loop consumes a video.
    """
    for fname in filenames:
        try:
            # Load the video into memory
            clip = mp.VideoFileClip(fname, audio=False)
            
            # This line will BLOCK if the queue is full, preventing memory overflow.
            video_queue.put(clip)
            
        except Exception as e:
            print(f"[ERROR] Failed to load {fname}: {e}")
            
    # Send a sentinel value (None) to indicate the playlist is finished
    video_queue.put(None)

def video_loader_worker_triune(filenames, video_queue):
    """
    Runs in the background. Loads videos and puts them into the queue.
    If the queue hits its maxsize (50), this thread automatically pauses
    until the main loop consumes a video.
    """
    for fname in filenames:
        try:
            # Load the video into memory
            clip = mp.VideoFileClip(fname, audio=False)
            
            # This line will BLOCK if the queue is full, preventing memory overflow.
            video_queue.put(clip)
            
        except Exception as e:
            print(f"[ERROR] Failed to load {fname}: {e}")
            
    # Send a sentinel value (None) to indicate the playlist is finished
    video_queue.put(None)

def play_video_fullscreen():
    try:

        neural_indices_json_folder = ""
        neural_indices_filenames_all = [
            os.path.join(neural_indices_json_folder, f) for f in sorted(os.listdir(neural_indices_json_folder))
            if os.path.isfile(os.path.join(neural_indices_json_folder, f)) and f.lower().endswith('.json')
        ]
        random.shuffle(neural_indices_filenames_all)

        video_folder_all_1 = "H:/grok_elara_video_combined/g_horizontal"
        video_filenames_all_1 = [
            os.path.join(video_folder_all_1, f) for f in sorted(os.listdir(video_folder_all_1))
            if os.path.isfile(os.path.join(video_folder_all_1, f)) and f.lower().endswith('.mp4')
        ]
        video_filenames_all_1.sort(key=str.lower)

        video_folder_all_2 = "G:/grok_elara_video_combined/g_square/SRC_NORMAL_1"
        video_filenames_all_2 = [
            os.path.join(video_folder_all_2, f) for f in sorted(os.listdir(video_folder_all_2))
            if os.path.isfile(os.path.join(video_folder_all_2, f)) and f.lower().endswith('.mp4')
        ]
        video_filenames_all_2.sort(key=str.lower)

        video_folder_all_3 = "G:/grok_elara_video_combined/g_square/SRC_NORMAL_2"
        video_filenames_all_3 = [
            os.path.join(video_folder_all_3, f) for f in sorted(os.listdir(video_folder_all_3))
            if os.path.isfile(os.path.join(video_folder_all_3, f)) and f.lower().endswith('.mp4')
        ]
        video_filenames_all_3.sort(key=str.lower)


        video_filenames_all = video_filenames_all_1[:] + video_filenames_all_2[:] + video_filenames_all_3[:]


        video_folder_all_vertical = "H:/grok_elara_video_combined/g_vertical"
        video_filenames_all_vertical = [
            os.path.join(video_folder_all_vertical, f) for f in sorted(os.listdir(video_folder_all_vertical))
            if os.path.isfile(os.path.join(video_folder_all_vertical, f)) and f.lower().endswith('.mp4')
        ]
        video_filenames_all_vertical.sort(key=str.lower)


        if SHIFT_NSFW == 1:
            video_folder_almost_nsfw = "G:/grok_elara_video_combined/g_square/SRC_NSFW"
            video_filenames_almost_nsfw = [
                os.path.join(video_folder_almost_nsfw, f) for f in sorted(os.listdir(video_folder_almost_nsfw))
                if os.path.isfile(os.path.join(video_folder_almost_nsfw, f)) and f.lower().endswith('.mp4')
            ]

            video_base_filenames_almost_nsfw = []
            for each in video_filenames_almost_nsfw:
                base_filename = each.replace("\\", "/")
                base_filename = base_filename.split("/")
                base_filename = base_filename[len(base_filename)-1]
                base_filename = base_filename.split(".mp4")
                base_filename = f"{base_filename[0]}.mp4"
                #print(f"base_filename = {base_filename}")
                video_base_filenames_almost_nsfw.append(base_filename)
        #_________________________________________________________


        video_filenames_left = video_filenames_all[:] # 2025-11-17 MOD
        num_videos_left = len(video_filenames_left)

        #unique_top_signal_indices = Get_Neural_Indices(num_videos_left, neural_model_filepath, device, debug=DEBUG)
        unique_top_signal_indices = load_neural_indices_json(random.choice(neural_indices_filenames_all))

        random.shuffle(video_filenames_left)
        unique_top_signal_filenames = []
        for index in unique_top_signal_indices:
            print(f"{index}/{len(video_filenames_left)}")
            if index >= len(video_filenames_left):
                print(f"Skipping invalid int: {index}")
                index = random.randint(1, len(video_filenames_left)-1)
                print(f"New index for replacement: {index}")
            unique_top_signal_filenames.append(video_filenames_left[index])

        Log_Neural_Indices(unique_top_signal_filenames[:200])
        video_filenames_left = unique_top_signal_filenames
        print(f"{len(video_filenames_left)}")


        video_filenames_right = video_filenames_all[:] + video_filenames_all_vertical[:] # 2026-02-02 MOD
        num_videos_right = len(video_filenames_right)

        #unique_top_signal_indices = Get_Neural_Indices(num_videos_right, neural_model_filepath, device, debug=DEBUG)
        unique_top_signal_indices = load_neural_indices_json(random.choice(neural_indices_filenames_all))

        random.shuffle(video_filenames_right)
        unique_top_signal_filenames = []
        for index in unique_top_signal_indices:
            print(f"{index}/{len(video_filenames_right)}")
            if index >= len(video_filenames_right):
                print(f"Skipping invalid int: {index}")
                index = random.randint(1, len(video_filenames_right)-1)
                print(f"New index for replacement: {index}")
            unique_top_signal_filenames.append(video_filenames_right[index])

        Log_Neural_Indices(unique_top_signal_filenames[:200])
        video_filenames_right = unique_top_signal_filenames
        print(f"{len(video_filenames_right)}")

        #___________________________________________________________

        video_filenames_left  = video_filenames_left[:200]
        video_filenames_right = video_filenames_right[:200]

        num_videos_left  = len(video_filenames_left)
        num_videos_right = len(video_filenames_right)
        print(f"PIER_LEFT: {num_videos_left}")
        print(f"PIER_RIGHT: {num_videos_right}")

        if SHIFT_NSFW == 1:
            video_filenames_left_replacement_pool  = Remove_Almost_NSFW(video_filenames_left[200:400], video_base_filenames_almost_nsfw)
            video_filenames_right_replacement_pool = Remove_Almost_NSFW(video_filenames_right[200:400], video_base_filenames_almost_nsfw)

            video_filenames_left = Shift_Almost_NSFW_Position(video_filenames_left, \
                                                              video_base_filenames_almost_nsfw, \
                                                              video_filenames_left_replacement_pool)
        
            video_filenames_right = Shift_Almost_NSFW_Position(video_filenames_right, \
                                                               video_base_filenames_almost_nsfw, \
                                                               video_filenames_right_replacement_pool)

        #__________LOAD CACHE________________________________________

        # --- SETUP THE SLIDING CACHE (QUEUE) ---
        MAX_CACHE_SIZE = 20

        # Start the background loader thread
        video_queue_left = queue.Queue(maxsize=MAX_CACHE_SIZE)
        print(f"Starting background loader thread LEFT (Max cache: {MAX_CACHE_SIZE} videos)...")
        loader_thread_left = threading.Thread(
            target=video_loader_worker_left, 
            args=(video_filenames_left, video_queue_left), 
            daemon=True
        )
        loader_thread_left.start()

        # Start the background loader thread
        video_queue_right = queue.Queue(maxsize=MAX_CACHE_SIZE)
        print(f"Starting background loader thread RIGHT (Max cache: {MAX_CACHE_SIZE} videos)...")
        loader_thread_right = threading.Thread(
            target=video_loader_worker_right, 
            args=(video_filenames_right, video_queue_right), 
            daemon=True
        )
        loader_thread_right.start()

        random.shuffle(video_filenames_all_vertical)
        video_filenames_vertical_triune = video_filenames_all_vertical[:200]

        # Start the background loader thread
        video_queue_triune = queue.Queue(maxsize=MAX_CACHE_SIZE)
        print(f"Starting background loader thread TRIUNE (Max cache: {MAX_CACHE_SIZE} videos)...")
        loader_thread_triune = threading.Thread(
            target=video_loader_worker_triune, 
            args=(video_filenames_vertical_triune, video_queue_triune), 
            daemon=True
        )
        loader_thread_triune.start()


        #__________1st LEFT________________________________________

        # Get the very first video to start the player
        # (This will block for a fraction of a second until the thread loads the first clip)
        video_left = video_queue_left.get()
        if video_left is None:
            print("Error loading initial video (LEFT).")
            return

        video_width_left, video_height_left = video_left.size

        #__________1st RIGHT_______________________________________

        video_right = video_queue_right.get()
        if video_right is None:
            print("Error loading initial video (RIGHT).")
            return

        video_width_right, video_height_right = video_right.size

        #__________1st TRIUNE_______________________________________

        video_vertical_triune_1 = video_queue_triune.get()
        if video_vertical_triune_1 is None:
            print("Error loading initial video (TRIUNE_1).")
            return
        video_width_vertical_triune_1, video_height_vertical_triune_1 = video_vertical_triune_1.size

        """video_vertical_triune_2 = video_queue_triune.get()
        if video_vertical_triune_2 is None:
            print("Error loading initial video (TRIUNE_2).")
            return
        video_width_vertical_triune_2, video_height_vertical_triune_2 = video_vertical_triune_2.size

        video_vertical_triune_3 = video_queue_triune.get()
        if video_vertical_triune_3 is None:
            print("Error loading initial video (TRIUNE_3).")
            return
        video_width_vertical_triune_3, video_height_vertical_triune_3 = video_vertical_triune_3.size"""


        #___________________________________________________________


        clock = pygame.time.Clock()
        running = True
        current_time_left   = 0
        current_time_center = 0
        current_time_right  = 0

        direction_left   = 1
        direction_center = 1
        direction_right  = 1

        video_playback_counter_left  = 0
        video_playback_counter_right = 0
        random_inject_glitch_interval_left  = 4
        random_inject_glitch_interval_right = 4

        switch_left_right = 0
        iteration_num = 0
        random_fps = 40
        last_matrix_code_timing = 0
        FLASH_SCREEN_WHITE_TIMING = 70

        pygame.mixer.init()
        pygame.mixer.music.load(audio_path)
        pygame.mixer.music.play()

        executor = ThreadPoolExecutor(max_workers=4)

        while running:

            futures = []

            screen.fill(BLACK)

            if pygame.mixer.music.get_busy() == False:
                running = False
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    running = False
                elif event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_ESCAPE:
                        running = False

            if running:

                switch_left_right = random.randint(0, 1)

                flash_screen_white = random.randint(0, FLASH_SCREEN_WHITE_TIMING)
                flash_screen_white_music_time = pygame.mixer.music.get_pos()
                current_time_random_var = random.uniform(0, 1)          

                if current_time_left < video_left.duration:
                    if flash_screen_white_music_time >= 50000 and flash_screen_white == FLASH_SCREEN_WHITE_TIMING:
                        color_var = random.randint(0, 3)
                        if color_var == 0:
                            screen.fill(PURPLE)
                        elif color_var == 1:
                            screen.fill(PINK)
                        elif color_var == 2:
                            screen.fill(CYAN)
                        else:
                            screen.fill(GREEN)
                    else:
                        if video_playback_counter_left % random_inject_glitch_interval_left == 0:
                            inject_glitch = 1
                        else:
                            inject_glitch = 0

                        # Define our target sizes to make the code cleaner
                        target_sizes = (1504, 1376, 1280)

                        if (video_width_left == 1504 and video_width_right == 1504) or \
                           (video_width_left == 1376 and video_width_right == 1376) or \
                           (video_width_left == 1280 and video_width_right == 1280) or \
                           (video_width_left == 1280 and video_width_right == 1376) or \
                           (video_width_left == 1376 and video_width_right == 1280) or \
                           (video_width_left == 1280 and video_width_right == 1504) or \
                           (video_width_left == 1504 and video_width_right == 1280) or \
                           (video_width_left == 1376 and video_width_right == 1504) or \
                           (video_width_left == 1504 and video_width_right == 1376):
                            # Both are the same target size -> Render Left
                            futures.append(executor.submit(process_left_square, video_left, video_right, \
                                                           current_time_left, actual_width, actual_height, inject_glitch))
                        elif video_width_right not in target_sizes:
                            # Right is NOT 1504 and NOT 1280 -> Render Left
                            futures.append(executor.submit(process_left_square, video_left, video_right, \
                                                           current_time_left, actual_width, actual_height, inject_glitch))

                        #left_horizontal_fullscreen = 1 if video_width_left in target_sizes else 0
                        left_horizontal_fullscreen = 1 if video_width_left in (1504, 1376, 1280) else 0

                        ###___ 60fps videos (1280x852)
                        ###___ current_time_left += (1 / video_left.fps)

                        if int(video_left.duration) == 12:
                            current_time_left += (1 / video_left.fps)*((0.6+current_time_random_var)*2)
                        else:
                            current_time_left += (1 / video_left.fps)*(0.6+current_time_random_var)
                else:
                    screen.fill(WHITE)

                    video_playback_counter_left += 1
                    random_inject_glitch_interval_left = random.randint(4, 8)

                    iteration_num += 1
                    safe_close_clip(video_left)
                    current_time_left = 0
                    left_horizontal_fullscreen = 0
                    #screen.fill(BLACK)

                    # 2. Get the NEXT video from the preloaded queue!
                    # If queue is empty (because player caught up), this briefly blocks.
                    # As soon as we get it, the Queue size drops, waking up the background thread.
                    video_left = video_queue_left.get()
                    
                    # 3. Check for the end of the playlist
                    if video_left is None:
                        print("Reached end of playlist.")
                        running = False
                        break

                    video_width_left, video_height_left = video_left.size
                    #print(f"Video width_left: {video_width_left}")
                    #print(f"Video height_left: {video_height_left}")

                if current_time_right < video_right.duration:
                    if flash_screen_white_music_time >= 50000 and flash_screen_white == FLASH_SCREEN_WHITE_TIMING:
                        pass
                    else:
                        if left_horizontal_fullscreen == 0: # Only queue right side if left isn't fullscreen
                            if video_playback_counter_right % random_inject_glitch_interval_right == 0:
                                inject_glitch = 1
                            else:
                                inject_glitch = 0

                            if video_width_left == 1120 and video_width_right == 832:
                                futures.append(executor.submit(process_vertical, 22, video_right, \
                                                               current_time_right, actual_width, actual_height, inject_glitch))
                                futures.append(executor.submit(process_vertical, 33, video_vertical_triune_1, \
                                                               current_time_right, actual_width, actual_height, inject_glitch))
                            elif video_width_left == 1120 and video_width_right == 928:
                                futures.append(executor.submit(process_vertical, 44, video_right, \
                                                               current_time_right, actual_width, actual_height, inject_glitch))
                                futures.append(executor.submit(process_vertical, 55, video_vertical_triune_1, \
                                                               current_time_right, actual_width, actual_height, inject_glitch))
                            elif video_width_left == 1120 and video_width_right == 960:
                                futures.append(executor.submit(process_vertical, 66, video_right, \
                                                               current_time_right, actual_width, actual_height, inject_glitch))
                                futures.append(executor.submit(process_vertical, 77, video_vertical_triune_1, \
                                                               current_time_right, actual_width, actual_height, inject_glitch))
                            else:
                                futures.append(executor.submit(process_right_square, video_left, video_right, \
                                                               current_time_right, actual_width, actual_height, inject_glitch))

                        if int(video_right.duration) == 12:
                            current_time_right += (1 / video_right.fps)*((0.6+current_time_random_var)*2)
                        else:
                            current_time_right += (1 / video_right.fps)*(0.6+current_time_random_var)
                else:
                    video_playback_counter_right += 1
                    random_inject_glitch_interval_right = random.randint(4, 8)

                    iteration_num += 1
                    safe_close_clip(video_right)
                    safe_close_clip(video_vertical_triune_1)
                    current_time_right = 0

                    # 2. Get the NEXT video from the preloaded queue!
                    # If queue is empty (because player caught up), this briefly blocks.
                    # As soon as we get it, the Queue size drops, waking up the background thread.
                    video_right = video_queue_right.get()
                    
                    # 3. Check for the end of the playlist
                    if video_right is None:
                        print("Reached end of playlist.")
                        running = False
                        break
                    video_width_right, video_height_right = video_right.size

                    #print(f"Video width_right: {video_width_right}")
                    #print(f"Video height_right: {video_height_right}")

                    # LEFT SITUATION NEVER HAPPENS BECAUSE THERE IS NOT VERTICAL FORMAT IN LEFT
                    if video_width_left == 832 or video_width_left == 928 or video_width_left == 960 or \
                       video_width_right == 832 or video_width_right == 928 or video_width_right == 960:

                        video_vertical_triune_1 = video_queue_triune.get()
                        if video_vertical_triune_1 is None:
                            print("Reached end of playlist.")
                            running = False
                            break
                        video_width_vertical_triune_1, video_height_vertical_triune_1 = video_vertical_triune_1.size

                        """video_vertical_triune_2 = video_queue_triune.get()
                        if video_vertical_triune_2 is None:
                            print("Reached end of playlist.")
                            running = False
                            break
                        video_width_vertical_triune_2, video_height_vertical_triune_2 = video_vertical_triune_2.size

                        video_vertical_triune_3 = video_queue_triune.get()
                        if video_vertical_triune_3 is None:
                            print("Reached end of playlist.")
                            running = False
                            break
                        video_width_vertical_triune_3, video_height_vertical_triune_3 = video_vertical_triune_3.size"""

                if last_matrix_code_timing <= 1000:
                    # Random chance to add overlays (e.g., 15% per frame; adjust for density)
                    if random.random() < 0.60:
                        num_chars = random.randint(1, 300)  # How many to add this frame
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

                    last_matrix_code_timing = 0
                elif last_matrix_code_timing >= 1000 and last_matrix_code_timing <= 10000:
                    last_matrix_code_timing += 0.5
                elif last_matrix_code_timing >= 10000:
                    last_matrix_code_timing = 0
                else:
                    last_matrix_code_timing += 0.5

                # ---------------------------------------------------------
                # HARVEST RESULTS AND DRAW THEM (Main Thread)
                # ---------------------------------------------------------
                # The main loop will pause here for a fraction of a millisecond 
                # while the 6-core Ryzen processor executes the tasks concurrently.
                for future in as_completed(futures):
                    try:
                        # Retrieve the returned (surface, (x, y)) from the functions
                        surface, position = future.result()
                        if surface is not None:
                            screen.blit(surface, position)
                    except Exception as e:
                        print(f"Error in rendering thread: {e}")

                if DEBUG == 1:
                    # Display FPS counter
                    #fps_text = font.render("FPS: {:.2f}".format(clock.get_fps()), True, (255, 255, 255))
                    #fps_text = font.render(f"{random_index_left}:{random_index_right}", True, (255, 255, 255)) 
                    fps_text = font.render(f"L: {video_queue_left.qsize()}/{MAX_CACHE_SIZE} <> R: {video_queue_right.qsize()}/{MAX_CACHE_SIZE} | video_width_left: {video_width_left} | video_width_right: {video_width_right}", True, (255, 255, 255)) 
                    screen.blit(fps_text, (10, 10))

                pygame.display.flip()

            clock.tick(48) #video.fps)  # Limit frame rate

        pygame.mixer.music.stop()
        safe_close_clip(video_left)
        safe_close_clip(video_right)
        safe_close_clip(video_vertical_triune_1)
        #safe_close_clip(video_vertical_triune_2)
        #safe_close_clip(video_vertical_triune_3)

        print("Emptying cache and closing background processes (L)...")
        while not video_queue_left.empty():
            cached_clip = video_queue_left.get()
            if cached_clip is not None:
                safe_close_clip(cached_clip)

        print("Emptying cache and closing background processes (R)...")
        while not video_queue_right.empty():
            cached_clip = video_queue_right.get()
            if cached_clip is not None:
                safe_close_clip(cached_clip)

        print("Emptying cache and closing background processes (TRI)...")
        while not video_queue_triune.empty():
            cached_clip = video_queue_triune.get()
            if cached_clip is not None:
                safe_close_clip(cached_clip)

        executor.shutdown(wait=False)
        pygame.quit()

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == '__main__':
    play_video_fullscreen()


