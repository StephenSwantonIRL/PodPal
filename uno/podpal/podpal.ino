void setup() {
  Serial.begin(9600);
}
void loop() {
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
    boolean isBooked = array[0].toInt();
    boolean isSignedIn = array[1].toInt(); 
    int bookingEnd = array[2].toInt();
    
    //for(int k=0 ;k<=t ;k++)
    //{
    //  Serial.println(array[k]);
    //}
    Serial.println(isBooked);
    Serial.println(isSignedIn);
    Serial.println(bookingEnd);
    
    Serial.print("You sent me: ");
    Serial.println(data);
  }
}
