from inputs import get_gamepad
import pydirectinput
import ctypes
import time

# --- WINDOWS API C-STRUCTS FOR KEYBOARD ---
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
    _fields_ =[("type", ctypes.c_ulong), ("ii", Input_I)]

# --- WINDOWS API C-STRUCTS FOR XBOX RUMBLE ---
class XINPUT_VIBRATION(ctypes.Structure):
    _fields_ =[("wLeftMotorSpeed", ctypes.c_ushort),
                ("wRightMotorSpeed", ctypes.c_ushort)]

# Load the Windows XInput DLL
try:
    xinput = ctypes.windll.xinput1_4  # Windows 8, 10, 11
except OSError:
    xinput = ctypes.windll.xinput1_3  # Windows 7

def set_rumble(left_speed, right_speed, controller_id=0):
    """
    Sets the Xbox controller vibration. 
    Speeds should be a float from 0.0 (off) to 1.0 (max).
    """
    vibration = XINPUT_VIBRATION()
    # Convert 0.0-1.0 to the 0-65535 range expected by the Windows API
    vibration.wLeftMotorSpeed = int(left_speed * 65535)
    vibration.wRightMotorSpeed = int(right_speed * 65535)
    
    # Send the command to the controller
    xinput.XInputSetState(controller_id, ctypes.byref(vibration))

def rumble_burst(left=0.5, right=0.5, duration=0.15):
    """Sends a quick burst of vibration."""
    set_rumble(left, right)
    time.sleep(duration)
    set_rumble(0.0, 0.0) # Make sure to turn it off!

# --- CUSTOM DELETE FUNCTION ---
def send_true_delete():
    """Bypasses pydirectinput to send a raw hardware delete with the Extended Key Flag"""
    extra = ctypes.c_ulong(0)
    
    ii_ = Input_I()
    ii_.ki = KeyBdInput(0, 0x53, 0x0008 | 0x0001, 0, ctypes.pointer(extra))
    x = Input(ctypes.c_ulong(1), ii_)
    ctypes.windll.user32.SendInput(1, ctypes.pointer(x), ctypes.sizeof(x))
    
    time.sleep(0.05) 
    
    ii_.ki = KeyBdInput(0, 0x53, 0x0008 | 0x0001 | 0x0002, 0, ctypes.pointer(extra))
    x = Input(ctypes.c_ulong(1), ii_)
    ctypes.windll.user32.SendInput(1, ctypes.pointer(x), ctypes.sizeof(x))

# --- MAIN CONTROLLER LOOP ---
def main():
    print("Xbox Controller Wrapper is running!")
    print("Using pydirectinput for Arrows, Custom API for Extended Delete, and XInput for Rumble.")
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
                        # Add a quick tactile "bump" when you delete a photo
                        # 0.8 is strong on the left motor, 0.2 is light on the right
                        rumble_burst(left=1.0, right=1.0, duration=0.15) 

                        print("delete - Executing and Vibrating!")
                        send_true_delete()
                                                
                        last_press_time = time.time()

              # --- 2. CHECK FOR D-PAD INPUTS ---
                elif event.ev_type == 'Absolute':
                    
                    if event.state == 0:
                        continue

                    if current_time - last_press_time < cooldown:
                        continue
                    
                    # Horizontal D-Pad (Left/Right)
                    if event.code == 'ABS_HAT0X':
                        if event.state == 1:           # D-Pad Right
                            rumble_burst(left=0.4, right=0.4, duration=0.15)
                            pydirectinput.press('right')
                            print("right")
                            last_press_time = current_time
                            
                        elif event.state == -1:        # D-Pad Left
                            rumble_burst(left=0.4, right=0.4, duration=0.15)
                            pydirectinput.press('left')
                            print("left")
                            last_press_time = current_time

                    # Vertical D-Pad (Up/Down)
                    elif event.code == 'ABS_HAT0Y':
                        if event.state == -1:          # D-Pad Up
                            print("up")
                            rumble_burst(left=0.4, right=0.4, duration=0.15)
                            pydirectinput.press('up')
                            last_press_time = current_time
                            
                        elif event.state == 1:         # D-Pad Down
                            print("down")
                            rumble_burst(left=0.4, right=0.4, duration=0.15)
                            pydirectinput.press('down')
                            last_press_time = current_time
                        
        except Exception as e:
            print(f"Error reading gamepad: {e}")
            # Ensure rumble shuts off if script crashes during a vibration
            set_rumble(0.0, 0.0) 
            time.sleep(2)

if __name__ == "__main__":
    # Make sure rumble is off at startup
    set_rumble(0.0, 0.0)
    main()