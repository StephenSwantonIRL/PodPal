"use strict";

const logger = require("../utils/logger");
const accounts = require("./accounts.js");
const postgres = require('postgres')
const axios = require('axios');
const uuid = require("uuid");

const dashboard = {
  index(request, response) {
    logger.info("dashboard rendering");
    const viewData = {
      title: "Template 1 Dashboard",
    };
    response.render("dashboard", viewData);
  },

  addDevice: async function(request, response) {
    const email = request.cookies.podpal;
    const userEmail = email.toString();
    const sql = postgres(process.env.postgreSQLdb);
    const currentUser = await sql` select * from admin where email =${userEmail}`;
    const macaddress = request.body.MACaddress;
    const newDevice = await sql` INSERT INTO device (macaddress, type, ownedBy) VALUES ( ${macaddress},'double',${currentUser[0].id})`
    ;
    response.redirect("/dashboard");
  },
  addEmployee: async function(request, response) {
    const email = request.cookies.podpal;
    const userEmail = email.toString();
    const sql = postgres(process.env.postgreSQLdb);
    const currentUser = await sql` select * from admin where email =${userEmail}`;

    const invitedEmails = request.body.emailstoinvite;
    const invitedEmailsArray = invitedEmails.split("\n")

    for(let i=0; i<invitedEmailsArray.length; i++){
      let barcode = uuid.v1().replace(/-/g, "");
      let invitation = await sql` INSERT INTO employee (email, accountAdmin, barcodeId) VALUES ( ${invitedEmailsArray[i]}, ${currentUser[0].id}, ${barcode})`
    }

    response.redirect("/dashboard");
  }

}
module.exports = dashboard;