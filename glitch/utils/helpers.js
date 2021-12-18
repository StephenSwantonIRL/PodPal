

const helpers = {
bookButton(state,time, device, user, ownBookings){
  if(ownBookings.includes(time)){
    return `<a href="/deleteBooking/${user}/${device}/${time}" class="ui tiny button red">Cancel</a>`
  } else if(state==true){
    return '<a class="ui tiny button">Unavailable</a>'
  } else {
    return `<a href="/addBooking/${user}/${device}/${time}" class="ui tiny button green">Book</a>`
  }
},

}

module.exports = helpers
