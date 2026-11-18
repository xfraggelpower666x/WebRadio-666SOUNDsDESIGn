from inputs import get_gamepad
import pydirectinput
import pyautogui
import keyboard
import time

def main():
    print("Xbox Controller to Keyboard Wrapper is running...")
    print("Mapped Controls:")
    print("  Right Bumper (RB) -> Right Arrow (Next Image)")
    print("  Left Bumper (LB)  -> Left Arrow (Previous Image)")
    print("  'X' Button        -> Delete (Recycle Bin)")
    print("\nPress Ctrl+C in this console to stop the script.")

    # Optional: A small delay to prevent double-triggering if you hold the button slightly too long
    cooldown = 0.15 
    last_press_time = 0

    while True:
        try:
            # get_gamepad() blocks until an event (button press/joystick move) happens
            events = get_gamepad()
            for event in events:
                current_time = time.time()
                
                # We only want to trigger on button PRESS (state == 1), not release (state == 0)
                if event.ev_type == 'Key' and event.state == 1:
                    
                    # Prevent rapid-fire inputs
                    if current_time - last_press_time < cooldown:
                        continue
                    
                    if event.code == 'BTN_TR':       # Right Bumper
                        #pyautogui.press('right')
                        #keyboard.send('right')
                        pydirectinput.press('right')
                        print("right")
                        last_press_time = current_time
                        
                    elif event.code == 'BTN_TL':     # Left Bumper
                        #pyautogui.press('left')
                        #keyboard.send('left')
                        pydirectinput.press('left')
                        print("left")
                        last_press_time = current_time
                        
                    elif event.code == 'BTN_EAST':   # 'B' Button
                        #pyautogui.press('delete')
                        #keyboard.send('delete')
                        pydirectinput.press('del')
                        print("delete")
                        last_press_time = current_time
                        
        except Exception as e:
            print(f"Error reading gamepad (is it connected?): {e}")
            time.sleep(2) # Wait a moment before trying again

if __name__ == "__main__":
    main()