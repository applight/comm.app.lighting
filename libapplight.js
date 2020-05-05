/* App Lighting Helper Library, using Twilio Client and Twilio REST APIs
 * Author: Matt Vaughan
 * Date:   22 April 2020
 */
const twilio            = require('twilio');
const VoiceResponse     = twilio.twiml.VoiceResponse;

// returns true if the person dialing in is a
// registed app lighting client
// isClient : String 'call endpoint' -> boolean
function isClient( from ) {
    // should query a database.. while in alpha/beta
    // we'll just check the five values which should be true
    if ( from === "+16173345281" || from === "+16173351304" ||
	 from.startsWith("sim:") ||
	 from === "sip:mvaughan@applight.sip.us1.twilio.com" )
	return true;
    else return false;
}

function clientPTSN( from ) {
    // should query a database.. while in alpha/beta
    // we'll just check the five values which should be true
    switch ( from.trim() ) {
    case "sim:DEdec7c449c69d576bd67a434bc92954e0":
	return "+16173345281";
	break;
    case "sim:DEc4ad4e1e93c065c5e3df16a221d3c536":
	return "+16173351304";
	break;
    case "sip:mvaughan@applight.sip.us1.twilio.com":
	return "+19783879792";
	break;
	
    }
    // TODO: when relevant, add e164 checks here
    return from;
}

exports.applight =  {

    // response for an App Lighting client
    'clientResponse': ( caller ) => {
	const response = new VoiceResponse();
	const gather = response.gather({
	    input: 'speech dtmf',
	    numDigits: 1,
	    timeout: 7,
	    action: '/primary-client-choice',
	    method: 'POST'
	});
	gather.say('Welcome to App Lighting appointments and voicemail. '
		   + 'To hear your messages, press one or say messages. '
		   + 'To list your upcoming appointments, press two or say appointments. '
		   + 'To begin or join a conference, press three or say conference. '
		   + 'To enable or disable number proxies for your phone, press four or say proxies.' );
	
	return response;
    },
    // response for all other callers
    'regularResponse': () => {
	const response = new VoiceResponse();
	const gather = response.gather({
	    input: 'speech dtmf',
	    numDigits: 1,
	    timeout: 7,
	    action: '/primary-choice',
	    method: 'POST'
	});
	gather.say('You have reached App Lighting. '
		   + 'To schedule an appointment, press one or say appointment,'
		   + ' To leave a message, press two or say message. ');
	
	return response;
    }
};

