"use strict";

const logger = require("../utils/logger");
const uuid = require("uuid");
const sql = require('../db.js')
const nodemailer = require("nodemailer");
const CryptoJS = require("crypto-js")

// function that prepare the notification inviting users to join a workspace
async function sendInvite(email, id, key) {

  console.log(`smtps://${process.env.systememail}:${process.env.systememailpw}@${process.env.systememailhost}/?pool=true`)
  let transporter = nodemailer.createTransport(`smtps://${process.env.systememail}:${process.env.systememailpw}@${process.env.systememailhost}/?pool=true`)
  let info = await transporter.sendMail({
    from: 'PodPal <alerts@podpal.work>',
    to: email,
    subject: "Hello You've been invited to join a Podpal Workspace", // Subject line
    text: "Hello world?", // plain text body
    html: "<h2 style=\"text-align: center;\">Hello there!👋</h2>\n" +
      "<p style=\"text-align: center;\">You've been invited to join a PodPal workspace.&nbsp;</p>\n" +
      "<p style=\"text-align: center;\">Click below to complete your account and gain access.</p>\n" +
      "<div>\n" +
      "<table style=\"margin-left: auto; margin-right: auto;\" width=\"30%\">\n" +
      "<tbody>\n" +
      "<tr>\n" +
      "<td style=\"text-align: center; background-color: #ed7d31; color: white;\">\n" +
      `<a href="https://podpal.work/invite/${id}/${key}"><h3><strong>Join Now</strong></h3></a>\n` +
      "</td>\n" +
      "</tr>\n" +
      "</tbody>\n" +
      "</table>\n" +
      "</div>", // html body
  });

  console.log("Message sent: %s", info.messageId);
}

const dashboard = {
  async index(request, response) {
    // any one going to the dashboard should already be logged in
    const email = request.cookies.podpal;
    if(email==null){
      response.redirect("/");
    } else {
      // retrieve the users information
      const userEmail = email.toString();
      const currentUser = await sql` select * from admin where email =${userEmail}`;
      if (currentUser['count'] == 1) {
        const devices = await sql` select * from device where ownedBy =${currentUser[0].id}`;
        const employees = await sql` select * from employee where accountadmin =${currentUser[0].id}`;

        let deviceArray = [];
        for (let i = 0; i < devices['count']; i++) {
          deviceArray.push(devices[i])
        }
        let employeeArray = [];
        for (let i = 0; i < employees['count']; i++) {
          employeeArray.push(employees[i])
        }

        function anyDevices(devices) {
          if (devices['count'] == 0) {
            return 1;
          } else {
            return 0;
          }
        }

        // build the object to pass to express hbs
        const viewData = {
          title: "Dashboard",
          devicesempty: anyDevices(devices),
          currentUser: currentUser[0].id,
          devices: deviceArray,
          employees: employeeArray,
          // admins have a distinct layout that has  javascript for push alert integration all other view use the main layout
          layout: 'dashboardlayout',
          pushalertIntegrationJS: process.env.pushalertIntegrationJS,
          notificationChannel: currentUser[0].pushalertid
        };
        console.log(viewData)
        response.render("dashboard", viewData);
      } else {
        response.redirect("/");
      }
    }
  },
// end users see a different dashboard to admin users
  async userDashBoard(request, response) {
    // again only logged in users should be able to access
    const email = request.cookies.podpal;
    if(email==null){
      response.redirect("/");
    } else {
      // retrieve the user's info from the db
      const userEmail = email.toString();
      const currentUser = await sql` select * from employee where email =${userEmail}`;
      if (currentUser['count']) {
        const devices = await sql` select * from device where ownedBy =${currentUser[0].accountadmin}`;

        let deviceArray = [];
        for (let i = 0; i < devices['count']; i++) {
          deviceArray.push(devices[i])
        }

        function anyDevices(devices) {
          if (devices['count'] == 0) {
            return 1;
          } else {
            return 0;
          }
        }

        logger.info(" User dashboard rendering");
        // build the object to pass to express hbs
        const viewData = {
          title: "Template 1 Dashboard",
          devicesempty: anyDevices(devices),
          devices: deviceArray,
          currentUser: currentUser[0].id,
          barcodeid: currentUser[0].barcodeid
        };
        console.log(viewData)
        response.render("userdashboard", viewData);
      } else {
        response.redirect("/");
      }
    }
  },
// function to allow admin users to add new devices to their account
  addDevice: async function(request, response) {
    const email = request.cookies.podpal;
    const userEmail = email.toString();
    const currentUser = await sql` select * from admin where email =${userEmail}`;
    const macaddress = request.body.MACaddress;
    const newDevice = await sql` INSERT INTO device (macaddress, type, ownedBy) VALUES ( ${macaddress},'double',${currentUser[0].id})`
    ;
    response.redirect("/dashboard");
  },
  //function to add new end users to an administrators account

  addEmployee: async function(request, response) {
    const email = request.cookies.podpal;
    const userEmail = email.toString();
    const currentUser = await sql` select * from admin where email =${userEmail}`;

    const invitedEmails = request.body.emailstoinvite;
    const invitedEmailsArray = invitedEmails.split("\n")
    // loops over the list of emails provided by the admin user and generates a barcode id for the user before inserting to db
    for(let i=0; i<invitedEmailsArray.length; i++){
      let barcode = uuid.v1().replace(/-/g, "").substring(0,10);
      let invitation = await sql` INSERT INTO employee (email, accountAdmin, barcodeId) VALUES ( ${invitedEmailsArray[i]}, ${currentUser[0].id}, ${barcode})`
      // retrieves the id of the new user and then creates an invite key
      let createdId = await sql` select * from employee where email = ${invitedEmailsArray[i]}`
      let createdKey = CryptoJS.MD5(createdId[0].id).toString()
      console.log(createdId[0].id)
      console.log(createdKey)
      // sends an invitation email with unique invite link
      await sendInvite(invitedEmailsArray[i], createdId[0].id, createdKey).catch();
    }

    response.redirect("/dashboard");
  },



}
module.exports = dashboard;