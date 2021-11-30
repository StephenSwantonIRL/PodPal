import serial
import time
from pyzbar import pyzbar
from sense_hat import SenseHat
from imutils.video import VideoStream

sense = SenseHat()
bookings = [b'43770929851162']
isSignedIn = 0

def decode(image):
    decoded_objects = pyzbar.decode(image)
    barcode_data = []
    for obj in decoded_objects:
        barcode_data.append(obj.data)
    return barcode_data


if __name__ == '__main__':
    ser = serial.Serial('/dev/ttyACM0', 9600, timeout=1)
    ser.reset_input_buffer()
    vs = VideoStream(usePiCamera=True).start()
    time.sleep(2)

    while True:
        frame = vs.read()
        barcodes = decode(frame)
        for i in barcodes:
            if i in bookings:
                sense.clear((0,128,0))
                time.sleep(3)
                sense.clear()
                isSignedIn = 1
            else:
                sense.clear((255,0,0))
                time.sleep(3)
                sense.clear()

        ser.write(b"1#0#35#\n")
        line = ser.readline().decode('utf-8').rstrip()
        print(line)
        time.sleep(1)