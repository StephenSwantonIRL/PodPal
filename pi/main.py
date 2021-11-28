import serial
import time
from pyzbar import pyzbar
import cv2
from picamera import PiCamera

bookings = [43770929851162]


def decode(image):
    decoded_objects = pyzbar.decode(image)
    barcode_data = []
    for obj in decoded_objects:
        barcode_data.append(obj.data)
    return barcode_data


if __name__ == '__main__':
    ser = serial.Serial('/dev/ttyACM0', 9600, timeout=1)
    ser.reset_input_buffer()
    camera = PiCamera()
    time.sleep(2)

    while True:

        # barcode = camera.capture("./img2.jpg")
        barcodes = ["./barcode1.png"]
        for barcode_file in barcodes:
            # load the image to opencv
            img = cv2.imread(barcode_file)
            # decode detected barcodes
            img = decode(img)
            print(img)
            cv2.waitKey(0)
            # loop through the detected barcodes to check if associated with any bookings
            #for i in img:
               # if  :
                #match against current booking for pod

        ser.write(b"1#0#35#\n")
        line = ser.readline().decode('utf-8').rstrip()
        print(line)
        time.sleep(1)