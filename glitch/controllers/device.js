"use strict";

const logger = require("../utils/logger")
const axios = require("axios")
const _ = require('lodash')
const uuid = require("uuid")
const sql = require('../db.js')

const device = {
  async index(request, response) {
    const email = request.cookies.podpal;
    if(email==null){
      response.redirect("/");
    } else {
      const userEmail = email.toString();
      const currentUser = await sql` select * from employee where email =${userEmail}`;
      const deviceId = request.params.id
      const today = new Date().toISOString().substring(0,10)+'%'
      const devicesAvailable = await sql`select macaddress from employee left join device on device.ownedby = employee.accountadmin where employee.email = ${userEmail}`
      let devicesAvailableArray = []
      for(let i=0; i<devicesAvailable['count'];i++){
        devicesAvailableArray.push(devicesAvailable[i].macaddress)
      }
      if (devicesAvailableArray.includes(deviceId)) {
        const deviceDetails = await sql`select * from device where macaddress = ${deviceId}`
        const deviceBookings = await sql`select *, to_char(starttime, 'HH') as hour from booking  where (to_char(starttime, 'YYYY-MM-DD HH') like ${today}) and deviceused =${deviceId}`
        let alreadyBooked = []
        let ownBooking =[]
        for(let i=0; i<deviceBookings['count'];i++){
          alreadyBooked.push(deviceBookings[i].starttime.toISOString().substring(11,13))

          if(deviceBookings[i].bookedby == currentUser[0].id){
            ownBooking.push(deviceBookings[i].starttime.toISOString().substring(11,13))
            console.log(ownBooking)
          }
        }

        const viewData = {
          title: 'Device Details',
          userId: currentUser[0].id,
          device: deviceDetails[0],
          h09: alreadyBooked.includes('09'),
          h10: alreadyBooked.includes('10'),
          h11: alreadyBooked.includes('11'),
          h12: alreadyBooked.includes('12'),
          h13: alreadyBooked.includes('13'),
          h14: alreadyBooked.includes('14'),
          h15: alreadyBooked.includes('15'),
          h16: alreadyBooked.includes('16'),
          h17: alreadyBooked.includes('17'),
          ownBookings : ownBooking
        }
        response.render('device', viewData);
        logger.info(viewData);
      } else {
        response.redirect('/login')
      }
    }
  },
    deleteDevice(request, response)
    {
      const deviceId = request.params.id
      //to do - delete statement
      response.redirect("/dashboard")
    },

  async addBooking(request, response){
    const deviceId = request.params.device
    const startHour = request.params.time
    const startTimeDate = new Date().toISOString().substring(0,10)+ " "+ startHour +":00:00 +0000"
    console.log(startTimeDate)
    const userId = request.params.user
    // sql to add new booking
    //console.log(`insert into booking ( starttime, duration, bookedby, deviceused) values (${startTimeDate}, '60', ${userId}, ${deviceId})`)
    const addSQL = await sql`insert into booking ( starttime, duration, bookedby, deviceused) values (${startTimeDate}, '60', ${userId}, ${deviceId})`
    response.redirect("/device/"+deviceId)
  },

};

module.exports = device;
