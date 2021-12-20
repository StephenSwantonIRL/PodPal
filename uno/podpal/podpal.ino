// include libraries for LCD, managing time and the ultrasonic sensor.  
#include <LiquidCrystal.h>
#include <TimeLib.h>
#include <SR04.h>

// Pins 2 and 3 are used for the ultrasonic sensor 
#define TRIG_PIN 3
#define ECHO_PIN 2
SR04 sr04 = SR04(ECHO_PIN, TRIG_PIN);
// instantiate the LCD and bind to pins 4-9 
LiquidCrystal lcd(4, 5, 6, 7, 8, 9);
// variables needed 
long nearestObject;
long oldNearestObject;
unsigned long delaytime1 = 500;
unsigned long delaytime2 = 50;
unsigned long bookingEndTime;
unsigned long startTime;
unsigned long timeRemaining;
boolean isBooked;
boolean isSignedIn; 
unsigned int bookingEnd;



void setup() {
  // establish a serial connection
  Serial.begin(9600);
  // set up the LCD
  lcd.begin(16, 2);
  lcd.print("Minutes Remaining:");
  // get the first ultrasonic reading 
  nearestObject = sr04.Distance();
}
void loop() {
  // if data comes in from the pi populate the variables that control the LCD
  if (Serial.available() > 0) {
    String data = Serial.readStringUntil('\n');
    String array[5];
    int r=0,t=0;
      
    for(int i=0;i<data.length();i++)
    {
      //if(data[i] == ' ' || data[i] == ',')
      if(data[i] == '#')
      {
        if (i-r > 0)
        {
          array[t] = data.substring(r,i);
          t++;
        }
        r = (i+1);
      }
    }
    isBooked = array[0].toInt();
    isSignedIn = array[1].toInt(); 
    bookingEnd = array[2].toInt();
    unsigned long endBooking = (unsigned long) bookingEnd;
    startTime = millis();
    if(bookingEnd>0){
    bookingEndTime = startTime + endBooking * 1000 *60;
    
    }
  }
  oldNearestObject = nearestObject;
  nearestObject = sr04.Distance(); // returns distance in cm 
  // someone or something is in the room if the distance is less than 70 cm - notify the pi
  if(oldNearestObject >70 && nearestObject <70){
  Serial.print(nearestObject);
  Serial.print('\n');
  }
  // print the count down timer on second line of lcd
  lcd.setCursor(0, 1);
  if(bookingEndTime>0){
  timeRemaining = (bookingEndTime - millis());
  if(timeRemaining>60000){
    lcd.print(timeRemaining/60000);
  } else {
    lcd.print("Time Up");
  }
  }
  
}
