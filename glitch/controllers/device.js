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
        for(let i=0; i<deviceBookings['count'];i++){
          alreadyBooked.push(deviceBookings[i].hour)
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

  addBooking(request, response){
    //const deviceId = request.params.id
    // sql to add new booking

    response.redirect("/device/"+deviceId)
  },

};

module.exports = device;
