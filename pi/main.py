import serial
import time
import datetime
from pyzbar import pyzbar
from sense_hat import SenseHat
from imutils.video import VideoStream
import psycopg2
from dotenv import dotenv_values
import smtplib
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
import requests

sense = SenseHat()
squatter = False
config = dotenv_values(".env")

conn = psycopg2.connect(
    host=config["host"],
    database=config["database"],
    user=config["user"],
    password=config["password"]
)

cur = conn.cursor()

macaddress = config['macaddress']
cur.execute(f"select email from admin left join device on admin.id = device.ownedBy where device.macaddress='{macaddress}'")

for row in cur:
    adminEmail = row[0]

cur.execute(f"select pushalertid from admin left join device on admin.id = device.ownedBy where device.macaddress='{macaddress}'")
for row in cur:
    pushAlertSegment = row[0]

timenow = datetime.datetime.now()
timestring = str(timenow.isoformat())
timesearchstring = timestring[0:10] + " " + timestring[11:13] + "%"
cur.execute(
                f"select starttime, barcodeid from employee left join booking on employee.id = booking.bookedby left join device on booking.deviceused = device.macaddress where (to_char(booking.starttime, 'YYYY-MM-DD HH') like '{timesearchstring}') AND device.macaddress='{macaddress}'")
bookings = []
for row in cur:
    bookings.append(row[0])

cur.close()

isSignedIn = 0
bookingqueryflag = 0
countdown = 0
def decode(image):
    decoded_objects = pyzbar.decode(image)
    barcode_data = []
    for obj in decoded_objects:
        barcode_data.append(obj.data)
    return barcode_data

def send_mail(eFrom, to, subject, text, html):
    # SMTP Server details: update to your credentials or use class server
    smtpServer = config['smtpServer']
    smtpUser= config['smtpUser']
    smtpPassword=config['smtpPassword']
    port=587
    #construct MIME Multipart email message
    msg = MIMEMultipart()
    msg.attach(MIMEText(text))
    msg.attach(MIMEText(html, 'html'))
    msg['Subject'] = subject

    # Authenticate with SMTP server and send

    s = smtplib.SMTP(smtpServer, port)
    s.starttls()
    s.login(smtpUser, smtpPassword)
    s.sendmail(eFrom, to, msg.as_string())
    s.quit()

def send_pushalert():
    apikey = f"api_key={config['pushalertAPIkey']}"
    headers = {
        'Authorization': apikey,
    }

    data = {
        'title': 'Squatter Alert',
        'message': 'Warning Squatter detected',
        'url': 'http://podpal.work'
    }

    #response = requests.post('https://api.pushalert.co/rest/v1/send', headers=headers, data=data)
    response=requests.post(f'https://api.pushalert.co/rest/v1/segment/{pushAlertSegment}/send', headers=headers, data=data)


if __name__ == '__main__':
    ser = serial.Serial('/dev/ttyACM0', 9600, timeout=1)
    ser.reset_input_buffer()
    vs = VideoStream(usePiCamera=True).start()
    time.sleep(2)
    loopcounter=0
    loopsentinal=1
    start_time = time.time()
    while True:
        #retrieve current booking info to allow booker to sign in
        timenow = datetime.datetime.now()
        if loopsentinal == 0:
            loopcounter +=1
        if timenow.minute == 0 and bookingqueryflag == 0:
            timestring = str(timenow.isoformat())
            timesearchstring = timestring[0:10] + " " + timestring[11:13]+"%"
            bookingqueryflag = 1
            cur = conn.cursor()
            macaddress = config['macaddress']
            cur.execute(
                f"select starttime, barcodeid from employee left join booking on employee.id = booking.bookedby where (to_char(booking.starttime, 'YYYY-MM-DD HH') like '{timesearchstring}') AND device.macaddress='{macaddress}'")
            bookings = []
            for row in cur:
                bookings.append(row[0])
        if timenow.minute == 1 and bookingqueryflag == 1:
            bookingqueryflag = 0

        frame = vs.read()
        barcodes = decode(frame)
        for i in barcodes:
            if i in bookings:
                sense.clear((0,128,0))
                time.sleep(3)
                sense.clear()
                isSignedIn = 1
                # build serial message   [0] isBooked [1] isSignedIn [2] duration
                ser.write(b"1#1#35#\n")
            else:
                sense.clear((255,0,0))
                time.sleep(3)
                sense.clear()
        line = ser.readline().decode('utf-8').rstrip()
        # to do: valuate line as a number - > trigger email and push alert but only once every 15 minutes
        squatterOldValue = squatter
        squatter = True
        if squatterOldValue is False and squatter is True and countdown == 0:
            # countdown to trigger notifications every 15 mins approx
            countdown = 750
        if squatter and countdown == 750:
            send_pushalert()
            send_mail('alerts@podpal.work', adminEmail, 'Squatter Detected', 'text version', 'html version')
        if countdown > 1:
            countdown -= 1
            print(countdown)
        if countdown == 1:
            countdown -= 1
            squatter = False
            print(countdown)
        print("--- %s seconds ---" % (time.time() - start_time))


