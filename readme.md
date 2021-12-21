# Read Me

Welcome to **PodPal**. Podpal is a focus room booking management system comprised of a centralised Node-Express-PostgreSQL web application (the server) which communicates with focus room management devices (the client) that consist of a Raspberry Pi, Arduino Uno and a variety of sensors that support usage. 

## Table of Contents

 - **What does it do?**
 - **The Code**
 -- **In more detail** 
--- *Glitch (Node / Express)*
--- *Pi (Python 3.7)*
--- *Arduino Uno*
--- *SQL* 
- **The Physical Set up**
- **Installation**
-  **References**

## What does it do?
PodPal when deployed allows Office managers to register on the web application, to Add *Devices* and *End Users* to their Account. They can also sign up for push notification to their device by allowing them when prompted on their dashboard. 

End users once added can then access the web application via their own user account to create room bookings on the devices linked to their administrators account and to access a barcode that is used in order to access the devices. 
Devices represent client units of one Raspberry Pi (fitted with a sense hat and pi camera) and one Arduino Uno ( fitted with an ultrasonic distance sensor and LCD display). These are fitted to a focus room space. 
The user scans their barcode at the device they have booked in order to sign in and use the focus room space. The device indicates that they have successfully logged in by changing the sense hat LED matrix on the Raspberry Pi to green. If the user is not booked on the current device it will indicate this by turning the LED matrix on the sense hat to red. 
Once signed in a user can proceed to use the associated space. If they proceed without successfully signing in they trigger alerts to the administrator on the account by way of an email and also web push notifications. This is accomplished by using the ultrasonic sensor to measure at shin height to the nearest wall of the focus room space. When someone or something is in the room the distance will be reduced and this sends data back to the Raspberry pi component of the device which then sends an email via the smtplib and a push notification to registered devices via a post request to the PushAlert.co service.

## The Code
This git repository contains the code for each of the components involved in the system. It is organised in four folders: 
* **Glitch** -  contains code for the node-express web app 
* **Pi** - a main.py file that queries the database,  sends and receives data from the arduino and handles the barcode reading functionality. It also sends notifications to the user and handles email alerts.  
* **Uno** - the podpal.ino file contains the arduino sketch that controls the attached ultrasonic distance sensor and the LCD display to display booking times. 
* **SQL**  - contains the SQL file to create the postgresql database. 

### In more detail
#### Glitch (i.e. Node - Express) 

The application is built on version 14.16.0 of Node.js and the Express.js Framework version 4.17.1 and adopts the model-view-controller design pattern with the assistance of the express-handlebars library (5.3.2). Front end design relies on  fomantic-ui framework for much of the design. 
The initial project commit was cloned from the following github repository:

> https://github.com/wit-hdip-comp-sci-2021/glitch-template

The final implementation has the following features: 

 - ***Adding,  retrieving and deleting  Devices, Bookings and End Users***

The web application relies on the *postgres* library to connect to the PostGreSQL database. The connection parameters are defined in db.js. The number of connections needs to be restricted as the Elephant Hosting platform limits the number of connections possible for each of its plans. This may not be necessary with other database hosting providers. 

Once instantiated SQL queries can be easily generated using standard SQL passed to the SQL object as a template literal. 
If modifying queries note that variables included in the template literal do not need to be enclosed in quote marks. Postgres library adds these to queries. 

The pattern for each of the above cases follows the typical route controller view.  

 - ***Administrative User & End User Accounts*** 
Account functionality was developed adapting the accounts.js file available in the following git repository so that it would work with a PostgreSQL database:

> https://github.com/wit-hdip-comp-sci-2021/playlist-4

The Crypto-JS library was used to provide simple password hashing although the algorithm selected should be revised for future releases and upgraded to include a salt for each user. 

- ***Push Alert Service Integration***
The web application integrates with the Push Alert service provided by PushAlert.co This system allows segments of users to be created via it's API. Prior to storing a new admin user in the database a push alert segment is created for the user. This is saved in the database and retrieved by the device to enable the pi to send notifications directly to the Admin user via the push alert API. Subscription to the alert is handled via the browser front end. To enable this a custom layout 'dashboardlayout.hbs' is used to embed the relevant code. 

- ***Barcodes***
The Booking System relies on barcodes being available to end users to present when attempting to identify themselves to the device. These are generated on the front end using the JS Barcode library. 

#### Raspberry Pi  - operating Python 3.7 
*main.py* is structured in 2 main parts: 
 - **Lines 1- 127:** These lines run once when the program is first launched. It imports the relevant libraries, establishes the link to the environment variables, establishes the link to the database, defines functions necessary to send emails and send push notifications and sets various control variables relied on later in the file for event interpretation/handling. It also checks if there are any current bookings for the device so that these are available to the first iteration of the while loop. 
 - **Lines 128 to End of File** are an infinite while loop that continues to run and handles events occuring within the system. Within the while loop there are three key sections: 
-- An if statement that runs on an hourly basis to retrieve the barcode associated with any current bookings for the device. As this prototype system only accepts hourly bookings it also resets the sign in status so that the next booking on the system can be handled correctly. As the time per iteration of the while loop is varied a control variable is used to ensure this if statement only runs once. This is then followed immediately by another if statement to reset the control variable so that the if statement will run correctly in the next hour. 
-- The next section then deals with the pi camera. The VideoStream library is used to connect to the pi camera and start taking in frames from the resultant video stream. The decode function is called to analyse the image using the pyzbar.decode() function and return an array of barcodes identified. An array is selected as there may be more than one identified although this is unlikely. The code then compares the identified barcodes against the barcodes associated with any bookings for the current hour as identified earlier in the file. If the barcode is in the array of barcodes the end user is notified that their barcode was successfully identified by the Sense Hat LED matrix which turns green. This if statement also prepares a string containing booking state, sign in state and time remaining to the end of the booking. This is then sent to the Uno over USB serial using the serial python library. If the barcode is not one associated with a current booking then the end user is prompted by changing the Sense Hat LED matrix to red. 
-- The final section of the while loop handles incoming data from the Uno. If there is incoming data it is interpreted as meaning that someone or something has physically entered the focus room space. The relevant administrator needs to receive notice that there is someone / something in the space that shouldn't be there but should only receive an appropriate number of notifications. An arbitrary maximum notification frequency of approximately once every 15-17 minutes was selected for this prototype. Exact timing was not possible due to the varying time taken by each iteration (approx. 1 per 1.1 seconds). The subsequent lines in the file deal with how these notifications should be handled. Firstly it is established if there has been a change in status - i.e. that the person squating in the room was not there on the previous iteration of the while loop, that the squatter isn't a valid signed in user, and that a notification hasn't been sent recently. If these conditions are met then a new 750 loop countdown is started and the alerts are sent to the admin user associated with the device. On the final iteration of the countdown the squatter sentinel variable is reset to False so that should a non-signed in occupant of the space still be there another notification is sent. 

#### Uno 
The Arduino sketch file is podpal.ino 
The sketch relies on three imported libraries. 
* TimeLib.h - https://playground.arduino.cc/Code/Time/
* SR04.h - provided by Elegoo as part of their  [Most Complete Uno R3 Starter Kit](http://69.195.111.207/tutorial-download/?t=UNO_R3_Project_The_Most_Complete_Starter_Kit_V1.0)
* LiquidCrystal.h - provided by Elegoo  as part of their [Most Complete Uno R3 Starter Kit](http://69.195.111.207/tutorial-download/?t=UNO_R3_Project_The_Most_Complete_Starter_Kit_V1.0)

**Lines 5-8** identify which pins will be used by the sensors. You may need to update these lines depending on how you connect your sensors. 
**Lines 9-18** instantiate variables required in the sketch. 

Arduino Sketches are organised into a setup() and loop() method. The code contained in the setup() runs once. The code in loop() is repeatedly iterated over while the sketch is running. 
In the **setup()** the serial connection with the Pi is started. Note the baud rate must match the pi's baud rate. It also defines the LCD display setup as 16 characters by 2 rows and prints an initial message of 'Minutes Remaining:'. It also retrieves the distance of the nearest object so this is available to the loop() method on it's first iteration. 

The **loop() method** consists of three parts: 
 * The *first part* (ln 37-64) checks for incoming data from the pi over the USB serial connection. If this is available it breaks the incoming string into an array. The values of this array correspond to the booking state (isBooked), sign in state (isSignedIn) and the remaining time in minutes the booking (bookingEnd). This remaining time is then added (in milliseconds) to the time the data was received to give an end time for the booking which the system counts towards.
 * The *second part* (ln 65-71) of the loop() method deals with the data from the ultrasonic sensor. Comparing the distance with that of the previous iteration of loop(). For the prototype focus room space a distance below 70 centimeters indicates that there is someone/an object in the space. If this condition is met the distance is sent via the USB serial connection to the pi. 
 * The *third and final part* (ln 72 -81) of the loop() method prints the remaining time to the LCD display in minutes by subtracting the current number of milliseconds since the sketch launched from the millisecond value representing the end of the booking. This is divided by 60000 to convert to minutes. 
 
#### SQL 
Two versions of the setup sql for the project are provided. 
 * setupscriptPostGreSQL.sql should be used for this project
 * setupscript.sql is provided should you wish to use MySQL instead of PostGreSQL 

The script sets out  four relations: *admin* representing the administrative users, *employee* representing the end users/bookers, *booking* representing bookings made on each device and *device* representing a unit of the raspberry pi / arduino system. 

Referential integrity constraints are also included. 

## The Physical Set up 

The Arduino physical connections with Sensors can be represented as follows. 
![Schematic Representing Connection between Arduino and Ultrasound Sensor and LCD](https://cdn.glitch.me/23d360cb-81ae-49fd-a717-038e39892dab/connection%20schematic.png?v=1640108344324)

As two grounds and two power sources are required you will need a break out board or prototype shield to connect everything. An example photo of the connected Arduino Uno is included below. 

![Example Photo](https://cdn.glitch.me/23d360cb-81ae-49fd-a717-038e39892dab/photo.png?v=1640108777432)

The Blue Serial Connection shown should be connected into the Pi USB port. 
The Pi Camera should be fitted following the instructions available here 
https://projects.raspberrypi.org/en/projects/getting-started-with-picamera/2 
and the Sense Hat then fitted following the instructions available here
https://projects.raspberrypi.org/en/projects/getting-started-with-the-sense-hat/2
![enter image description here](https://cdn.glitch.me/23d360cb-81ae-49fd-a717-038e39892dab/IMG_20211221_175103.jpg?v=1640109168307)

You also need to ensure that you Pi is connected to your wireless router. If not already enabled follow this tutorial 
https://reader.tutors.dev/#/lab/wit-hdip-comp-sci-2021-computer-systems.netlify.app/topic-06-week6/unit-2/book-1/02 

![enter image description here](https://cdn.glitch.me/23d360cb-81ae-49fd-a717-038e39892dab/connection.png?v=1640109955414)

## Installation  / Getting Started 

 1. Ensure that all devices are physically connected as per the above physical connection schema. 
 2. git clone https://github.com/StephenSwantonIRL/PodPal.git to download all files needed for each component of the project to your system. 
 
3. Glitch Deployment / Installation
3a. Use your git client to create a new GitHub Repository on your machine 
3b. Copy the contents of the Glitch folder into the new repo and push to Github

4. Log into your Glitch account or create a new one (https://www.glitch.com)
5. Click [New Project] and [import from GitHub]
6. In the dialog that appears enter the repo address for your new repo
7. Log into your Push Alert account and set up website for your newly created glitch address 
8. Visit https://pushalert.co/dashboard/1/integrate and save the sw.js
9. Upload the sw.js to your glitch assets folder. 
11. Edit your project .env file to create the following variables substituting YOURVALUE with your own values for the relevant services:

> postgreSQLdb=YOURVALUE  
> pushalertAPI=YOURVALUE   
> systememail=YOURVALUE    
> systememailpw=YOURVALUE  
> systememailhost=YOURVALUE   
> systememailport= YOURVALUE  
> pushalertIntegrationJS=YOURVALUE  


10. Temporarily disconnect your Arduino from your Pi and connect the Arduino to a computer via the USB Serial Connection. Make sure the Pi is shutdown first. Open the Arduino IDE. If you don't already have it you can download it here. https://www.arduino.cc/en/software
11. Navigate to the folder where you saved the original repo. Find the following file and open it:  *podpal.ino*
12. Click the upload button. Wait for the upload to complete and then disconnect from your computer and reconnect the Arduino to the Pi. 
13. Position the unit in its final position. It's important to choose a location that the sensors will provide useful information. 
14. Connect to your Pi over ssh 
15. Upload the main.py file contained in the repo using the following command

> scp /path/to/pi/main.py ssh-username@your-ip:/path/to/destination
16. Use pip to install any python libraries not already installed on your system. You are likely to need the following:  pyzbar, SenseHat, imutils,  psycopg2 and dotenv
To use the pip installer just enter the following in the command line replacing *package-name* with the name of your package 
> 
>     pip3 package-name

17. Copy the template .env file from the repository Pi folder and update with values for your device. 
18. Your install/configuration should now be complete. Run the main.py file. You should begin to see the program run.

## References 

Christian Hur 2021 - How to Create Custom Handlebars Helper Functions in Node.js/Express.js - https://www.youtube.com/watch?v=WaetjCYgB4U
Crypto-JS Documentation - https://www.npmjs.com/package/crypto-js
Dotenv - dotenv - https://www.npmjs.com/package/dotenv
ELEGOO - The Most Complete Starter Kit Tutorial for Uno Chapter 10 Ultrasonic Distance Sensor 
ELEGOO -  The Most Complete Starter Kit Tutorial for Uno Chapter 22 LCD Display 
Hackers and Slackers - Building Page Templates in ExpressJS With Handlebars - https://hackersandslackers.com/handlebars-templates-expressjs/
Handlebars - Handlebars API reference - https://handlebarsjs.com/api-reference/
Handlebars - Handlebars Guide - https://handlebarsjs.com/guide/
John Papa - Node.js Everywhere with Environment Variables! - https://medium.com/the-node-js-collection/making-your-node-js-work-everywhere-with-environment-variables-2da8cdf6e786
Node Mailer Documentation - https://nodemailer.com/about/
Postgres.js Documentation file - https://www.npmjs.com/package/postgres
PostgreSQL Tutorial -  PostgreSQL Python: Connect To PostgreSQL Database Server - https://www.postgresqltutorial.com/postgresql-python/connect/
Push Alert API Documentation - https://pushalert.co/dashboard/1/documentation/rest-api
Py Image Search - An opencv barcode and qr code scanner with zbar -  https://www.pyimagesearch.com/2018/05/21/an-opencv-barcode-and-qr-code-scanner-with-zbar/
Python Dot Env - https://pypi.org/project/python-dotenv/
Robotics Backend - Raspberry Pi Arduino Serial Communication – Everything You Need To Know-  https://roboticsbackend.com/raspberry-pi-arduino-serial-communication/
The Python Code - Making A Barcode Scanner in Python - https://www.thepythoncode.com/article/making-a-barcode-scanner-in-python
WIT CompSci 2021 - Glitch project template - https://github.com/wit-hdip-comp-sci-2021/glitch-template
WIT CompSci 2021 - Glitch Playlist version 4 - https://github.com/wit-hdip-comp-sci-2021/playlist-4
WIT CompSci 2021 - Send an Image from the RPi: SMTP- https://reader.tutors.dev/#/lab/wit-hdip-comp-sci-2021-computer-systems.netlify.app/topic-09-week9/unit2/book-1/02
WIT CompSci 2021 - SenseHat  -  https://reader.tutors.dev/#/lab/wit-hdip-comp-sci-2021-computer-systems.netlify.app/topic-06-week6/unit-2/book-1/06