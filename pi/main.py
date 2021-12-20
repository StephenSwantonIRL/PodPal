import serial
import time
import datetime
from datetime import timedelta
# library that interprets barcodes
from pyzbar import pyzbar
from sense_hat import SenseHat
# library for video stream
from imutils.video import VideoStream
# library for connecting to the postgresql db
import psycopg2

from dotenv import dotenv_values
# libraries for email
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
# request library to call Push Alert API
import requests

sense = SenseHat()
squatter = False
squatterOldValue = False
config = dotenv_values(".env")

# connecting to the database
conn = psycopg2.connect(
    host=config["host"],
    database=config["database"],
    user=config["user"],
    password=config["password"]
)

# opening a cursor and running start up queries
cur = conn.cursor()

macaddress = config['macaddress']

# queries to get the admin users email and push alert segment id
cur.execute(f"select email from admin left join device on admin.id = device.ownedBy where device.macaddress='{macaddress}'")

for row in cur:
    adminEmail = row[0]

cur.execute(f"select pushalertid from admin left join device on admin.id = device.ownedBy where device.macaddress='{macaddress}'")
for row in cur:
    pushAlertSegment = row[0]

# find out if there is a booking right now.
timenow = datetime.datetime.now()
timestring = str(timenow.isoformat())
timesearchstring = timestring[0:10] + " " + timestring[11:13] + "%"
cur.execute(
                f"select starttime, barcodeid, duration from employee left join booking on employee.id = booking.bookedby left join device on booking.deviceused = device.macaddress where (to_char(booking.starttime, 'YYYY-MM-DD HH') like '{timesearchstring}') AND device.macaddress='{macaddress}'")
bookings = []
bookingStart = []
bookingDuration = []
for row in cur:
    bookings.append(bytes(row[1], 'utf-8'))
    bookingStart.append(row[0])
    bookingDuration.append(row[2])
if len(bookings) > 0:
    isBooked = 1
else:
    isBooked = 0
cur.close()

# other start up variables.
isSignedIn = 0
bookingqueryflag = 0 # used to limit number of queries to the db
countdown = 0
# identifies if there is a barcode in the image and returns a list of those identified
def decode(image):
    decoded_objects = pyzbar.decode(image)
    barcode_data = []
    for obj in decoded_objects:
        barcode_data.append(obj.data)
    return barcode_data

# function to send notification email.
def send_mail(eFrom, to, subject ):
    # SMTP Server details: update to your credentials or use class server
    smtpServer = config['smtpServer']
    smtpUser= config['smtpUser']
    smtpPassword=config['smtpPassword']
    port=587
    #construct MIME Multipart email message
    msg = MIMEMultipart()
    #msg.attach(MIMEText(text))
    html = f'<p><img style="display: block; margin-left: auto; margin-right: auto;" src="https://ss-ll.s3.eu-west-1.amazonaws.com/podpal.png" alt="" width="382" height="232" /></p><p>Dear Administrator,&nbsp;</p><p>We have detected an unregistered user in the following PodPal device:</p><p>{macaddress}</p><p>Move quickly and you will catch them in the act!&nbsp;</p><p>Kind regards&nbsp;</p><p>The PodPal Team</p>'
    msg.attach(MIMEText(html, 'html'))
    msg['Subject'] = subject

    # Authenticate with SMTP server and send

    s = smtplib.SMTP(smtpServer, port)
    s.starttls()
    s.login(smtpUser, smtpPassword)
    s.sendmail(eFrom, to, msg.as_string())
    s.quit()

# function that sends push alert to the Push Alert API for the admin's notification segment
def send_pushalert():
    apikey = f"api_key={config['pushalertAPIkey']}"
    headers = {
        'Authorization': apikey,
    }

    data = {
        'title': 'Squatter Alert',
        'message': f'Warning Squatter detected - {macaddress}',
        'url': 'http://podpal.work'
    }

    response = requests.post(f'https://api.pushalert.co/rest/v1/segment/{pushAlertSegment}/send', headers=headers, data=data)


if __name__ == '__main__':
    # establish a serial connection to the arduino
    ser = serial.Serial('/dev/ttyACM0', 9600, timeout=1)
    ser.reset_input_buffer()
    #start the camera on the pi
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
        # check on an hourly basis for the current bookings for this device
        if timenow.minute == 0 and bookingqueryflag == 0:
            timestring = str(timenow.isoformat())
            timesearchstring = timestring[0:10] + " " + timestring[11:13]+"%"
            bookingqueryflag = 1 # prevents repeating the database query unnecessarily
            cur = conn.cursor()
            macaddress = config['macaddress']
            cur.execute(
                f"select starttime, barcodeid, duration from employee left join booking on employee.id = booking.bookedby where (to_char(booking.starttime, 'YYYY-MM-DD HH') like '{timesearchstring}') AND device.macaddress='{macaddress}'")
            bookings = []
            bookingStart = []
            bookingDuration = []
            for row in cur:
                bookings.append(bytes(row[1],'utf-8'))
                bookingStart.append(row[0])
                bookingDuration.append(row[2])
            if len(bookings) >0:
                isBooked = 1
            else:
                isBooked = 0

        # set the query flag back to zero so that next hour will run the booking query
        if timenow.minute == 1 and bookingqueryflag == 1:
            bookingqueryflag = 0
        #read in a frame from the camera and decode it
        frame = vs.read()
        barcodes = decode(frame)
        print(barcodes)
        # for each barcode identified check if it is in the bookings array
        for i in barcodes:
            if i in bookings:
                sense.clear((0,128,0))
                time.sleep(3)
                sense.clear()
                isSignedIn = 1
                timeRemaining = (bookingStart[0] + timedelta(minutes=bookingDuration[0])) - datetime.datetime.now()
                timeRemainingString = str(timeRemaining)[2:4]
                # build serial message  to notify the arduino  [0] isBooked [1] isSignedIn [2] duration
                serialMessage = bytes(f'#{isBooked}#{isSignedIn}#{timeRemainingString}#', 'utf-8')
                print(serialMessage)
                ser.write(serialMessage)
            else:
                # if an invalid barcode is found indicate with red light
                sense.clear((255,0,0))
                time.sleep(3)
                sense.clear()
        # read in from the arduino an empty string means no squatter.
        line = ser.readline().decode('utf-8').rstrip()
        if(line != ''):
            squatterOldValue = squatter
            squatter = True
        # set a variable to act as a countdown so that the admin user doesn't get hundreds of notifications
        if squatterOldValue is False and squatter is True and countdown == 0:
            # each loop cycle timed at approximately 1 second - 750 on count down variable gives approximately 15 minutes.
            countdown = 750
        if squatter and countdown == 750:
            # send the push alert and email notification
            send_pushalert()
            send_mail('alerts@podpal.work', adminEmail, 'Squatter Detected')
        if countdown > 1:
            countdown -= 1
            print(countdown)
        # on the final iteration of the loop set squatter back to false so that if someone is still in the room another notification is sent
        if countdown == 1:
            countdown -= 1
            squatter = False
            print(countdown)
        print("--- %s seconds ---" % (time.time() - start_time))


