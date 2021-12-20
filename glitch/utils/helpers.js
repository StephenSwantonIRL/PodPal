
// file with helper functions
const helpers = {

  // this function is called in the express-handlebars helper functions to render the appropriate booking button
bookButton(state,time, device, user, ownBookings){
  if(ownBookings.includes(time)){
    // you can only cancel your own bookings
    return `<a href="/cancelBooking/${user}/${device}/${time}" class="ui tiny button red">Cancel</a>`
  } else if(state==true){
    // if it is booked and isn't one of your bookings it's unavailable
    return '<a class="ui tiny button">Unavailable</a>'
  } else {
    // otherwise you can book it.
    return `<a href="/addBooking/${user}/${device}/${time}" class="ui tiny button green">Book</a>`
  }
},

}

module.exports = helpers
