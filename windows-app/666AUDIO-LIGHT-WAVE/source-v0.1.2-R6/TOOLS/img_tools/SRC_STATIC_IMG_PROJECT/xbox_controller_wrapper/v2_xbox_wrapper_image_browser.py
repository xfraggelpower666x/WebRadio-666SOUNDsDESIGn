from inputs import get_gamepad
import pydirectinput
import ctypes
import time

# --- WINDOWS API C-STRUCTS FOR SENDINPUT ---
PUL = ctypes.POINTER(ctypes.c_ulong)
class KeyBdInput(ctypes.Structure):
    _fields_ =[("wVk", ctypes.c_ushort), ("wScan", ctypes.c_ushort),
                ("dwFlags", ctypes.c_ulong), ("time", ctypes.c_ulong),
                ("dwExtraInfo", PUL)]
class HardwareInput(ctypes.Structure):
    _fields_ =[("uMsg", ctypes.c_ulong), ("wParamL", ctypes.c_short), ("wParamH", ctypes.c_ushort)]
class MouseInput(ctypes.Structure):
    _fields_ =[("dx", ctypes.c_long), ("dy", ctypes.c_long), ("mouseData", ctypes.c_ulong),
                ("dwFlags", ctypes.c_ulong), ("time", ctypes.c_ulong), ("dwExtraInfo", PUL)]
class Input_I(ctypes.Union):
    _fields_ =[("ki", KeyBdInput), ("mi", MouseInput), ("hi", HardwareInput)]
class Input(ctypes.Structure):
    _fields_ = [("type", ctypes.c_ulong), ("ii", Input_I)]

# --- CUSTOM DELETE FUNCTION ---
def send_true_delete():
    """Bypasses pydirectinput to send a raw hardware delete with the Extended Key Flag"""
    extra = ctypes.c_ulong(0)
    
    # 0x53 = Hardware Scancode for Delete
    # 0x0008 = KEYEVENTF_SCANCODE (Tells Windows we are using a raw hardware code)
    # 0x0001 = KEYEVENTF_EXTENDEDKEY (Crucial! Tells Windows it's the main Delete key, not the numpad)
    # 0x0002 = KEYEVENTF_KEYUP (Key release)
    
    # 1. Press the key down
    ii_ = Input_I()
    ii_.ki = KeyBdInput(0, 0x53, 0x0008 | 0x0001, 0, ctypes.pointer(extra))
    x = Input(ctypes.c_ulong(1), ii_) # 1 = INPUT_KEYBOARD
    ctypes.windll.user32.SendInput(1, ctypes.pointer(x), ctypes.sizeof(x))
    
    time.sleep(0.05) # Tiny delay to simulate a human key press
    
    # 2. Release the key
    ii_.ki = KeyBdInput(0, 0x53, 0x0008 | 0x0001 | 0x0002, 0, ctypes.pointer(extra))
    x = Input(ctypes.c_ulong(1), ii_)
    ctypes.windll.user32.SendInput(1, ctypes.pointer(x), ctypes.sizeof(x))

# --- MAIN CONTROLLER LOOP ---
def main():
    print("Xbox Controller Wrapper is running!")
    print("Using pydirectinput for Arrows, and Custom API for Extended Delete.")
    print("Press Ctrl+C to exit.\n")

    cooldown = 0.20 
    last_press_time = 0

    while True:
        try:
            events = get_gamepad()
            
            for event in events:
                current_time = time.time()
                
                if event.ev_type == 'Key' and event.state == 1:
                    
                    if current_time - last_press_time < cooldown:
                        continue
                    
                    if event.code == 'BTN_TR':       # Right Bumper
                        pydirectinput.press('right')
                        print("right")
                        last_press_time = current_time
                        
                    elif event.code == 'BTN_TL':     # Left Bumper
                        pydirectinput.press('left')
                        print("left")
                        last_press_time = current_time
                        
                    elif event.code == 'BTN_EAST':   # 'B' Button
                        send_true_delete()           # <-- Uses our custom raw hardware function
                        print("delete")
                        last_press_time = current_time

              # --- 2. CHECK FOR D-PAD INPUTS ---
                elif event.ev_type == 'Absolute':
                    
                    # Ignore state 0 (which means the D-Pad was released)
                    if event.state == 0:
                        continue

                    if current_time - last_press_time < cooldown:
                        continue
                    
                    # Horizontal D-Pad (Left/Right)
                    if event.code == 'ABS_HAT0X':
                        if event.state == 1:           # D-Pad Right
                            pydirectinput.press('right')
                            print("right")
                            last_press_time = current_time
                            
                        elif event.state == -1:        # D-Pad Left
                            pydirectinput.press('left')
                            print("left")
                            last_press_time = current_time

                    """# Vertical D-Pad (Up/Down)
                    elif event.code == 'ABS_HAT0Y':
                        if event.state == -1:          # D-Pad Up
                            print("D-Pad Up Pressed")
                            # Add your action here
                            last_press_time = current_time
                            
                        elif event.state == 1:         # D-Pad Down
                            print("D-Pad Down Pressed")
                            # Add your action here
                            last_press_time = current_time"""
                        
        except Exception as e:
            print(f"Error reading gamepad: {e}")
            time.sleep(2)

if __name__ == "__main__":
    main()