"use strict";

const logger = require("../utils/logger");
const accounts = require("./accounts.js");
const postgres = require('postgres')
const axios = require('axios');
const uuid = require("uuid");
const sql = require('../db.js')
const nodemailer = require("nodemailer");


async function sendInvite(email) {

  console.log(`smtps://${process.env.systememail}:${process.env.systememailpw}@${process.env.systememailhost}/?pool=true`)
  let transporter = nodemailer.createTransport(`smtps://${process.env.systememail}:${process.env.systememailpw}@${process.env.systememailhost}/?pool=true`)
  let info = await transporter.sendMail({
    from: 'PodPal <alerts@podpal.work>',
    to: email,
    subject: "Hello You've been invited to join a Podpal Workspace", // Subject line
    text: "Hello world?", // plain text body
    html: "<b>Hello world?</b>", // html body
  });

  console.log("Message sent: %s", info.messageId);
}

const dashboard = {
  async index(request, response) {
    const email = request.cookies.podpal;
    if(email==null){
      response.redirect("/");
    }
    const userEmail = email.toString();
    const currentUser = await sql` select * from admin where email =${userEmail}`;
    const devices = await sql` select * from device where ownedBy =${currentUser[0].id}`;
    const employees = await sql` select * from employee where accountadmin =${currentUser[0].id}`;

    let deviceArray =[];
    for (let i=0; i<devices['count'];i++){
      deviceArray.push(devices[i])
    }
    let employeeArray =[];
    for (let i=0; i<employees['count'];i++){
      employeeArray.push(employees[i])
    }
    function anyDevices(devices) {
      if (devices['count'] == 0) {
        return 1;
      } else {
        return 0;
      }
    }

    logger.info("dashboard rendering");
    const viewData = {
      title: "Template 1 Dashboard",
      devicesempty: anyDevices(devices),
      devices: deviceArray,
      employees: employeeArray,
      layout: 'dashboardlayout',
      pushalertIntegrationJS: process.env.pushalertIntegrationJS,
      notificationChannel: currentUser[0].pushalertid
    };
    console.log(viewData)
    response.render("dashboard", viewData);
  },

  addDevice: async function(request, response) {
    const email = request.cookies.podpal;
    const userEmail = email.toString();
    const currentUser = await sql` select * from admin where email =${userEmail}`;
    const macaddress = request.body.MACaddress;
    const newDevice = await sql` INSERT INTO device (macaddress, type, ownedBy) VALUES ( ${macaddress},'double',${currentUser[0].id})`
    ;
    response.redirect("/dashboard");
  },
  addEmployee: async function(request, response) {
    const email = request.cookies.podpal;
    const userEmail = email.toString();
    const currentUser = await sql` select * from admin where email =${userEmail}`;

    const invitedEmails = request.body.emailstoinvite;
    const invitedEmailsArray = invitedEmails.split("\n")

    for(let i=0; i<invitedEmailsArray.length; i++){
      let barcode = uuid.v1().replace(/-/g, "");
      let invitation = await sql` INSERT INTO employee (email, accountAdmin, barcodeId) VALUES ( ${invitedEmailsArray[i]}, ${currentUser[0].id}, ${barcode})`
      await sendInvite(invitedEmailsArray[i]).catch();
    }

    response.redirect("/dashboard");
  },



}
module.exports = dashboard;