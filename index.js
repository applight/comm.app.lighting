const express = require('express');

const client  = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const VoiceResponse = require('twilio').twiml.VoiceResponse;
const MessagingResponse = require('twilio').twiml.MessagingResponse;

const app = express();

app.post('/', (req, res) => {
    // create a test text message
    client.messages.create({from: '+19783879792',
			    to: '+16173345281',
			    body: 'node test'})
	.then( message => console.log( message.sid ));
    
    res.writeHead(200, {'Content-Type': 'text/xml'});
    res.end(response.toString());
});

app.post('/call-avertest', (req, res) => {
    client.calls.create({
	callerId: '+19783879792',
	to: '+16173990190',
	record: 'true',
	recordStatusCallback: 'https://comm.app.lighting/wireless/send-text-transcipt'
    });
});


// recordingStatusCallback target for REST API's call resource
app.post('/transcribe-recording', (req, res) => {
    var message = client.messages.create({
	from: '+18882001601',
	to: '+16173345281',
	body: req.body.transcriptionText
    });
    res.writeHead(200, {'Content-Type': 'text/json'});
    res.end( "{ 'message' : { 'sid' : ' " + message.sid + " ' }; };" );
});

// Send voice call transcript by SMS to me
// Used by plugin on twiml <Record> elements
app.post('/send-text-transcript', (req, res) => {
    // creates and sends a text with transcribed results  
    client.messages.create({from:'+19783879792',
			    to: '+16173345281',
			    body: req.body.results.text })
	.then( message => console.log( message.sid ));

    res.writeHead(200, {'Content-Type': 'text/json'});
    res.end( "{}" );
});


/* ***********************************************
** Primary App Lighting line 888 200 1601
**
** Should provide voicemail, appointment scheduling,
** and additional features for clients (me, d, whoev)
** who call in (like listening to voicemail, checking
** appointments, special dialing features
**
** *********************************************** */

// returns true if the person dialing in is a
// registed app lighting client
// isClient : String 'call endpoint' -> boolean
const isClient = ( from ) => {
    // should query a database.. while in alpha/beta
    // we'll just check the five values which should be true
    if ( from === "+16173345281" || from === "+16173351304" ||
	 from.startsWith("sim:") ||
	 from === "sip:mvaughan@applight.sip.us1.twilio.com" )
	return true;
    return false;
};

const clientPTSN = ( from ) => {
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
};

// response for an App Lighting client
const clientResponse = ( caller ) => {
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
};

// response for all other callers
const regularResponse = () => {
    const response = new VoiceResponse();
    const gather = response.gather({
	input: 'speech dtmf',
	numDigits: 1,
	timeout: 7,
	action: '/primary-choice',
	method: 'POST'
    });
    gather.say('You have reached App Lighting. '
	       + 'To schedule an appointment, press one or say appointment. '
	       + 'To leave a message, press two or say message. ');

    return response;
};

// App Lighting's primary phone number (888) 200 - 1601
app.post('/primary-inbound', (req, res) => {

    const caller = req.body.From;

    response = null;
    if ( isClient(caller) ) {
	//response = clientResponse( caller );
	// while implementing regularResponse.. all callers are routed
	response = regularResponse();
    } else {
	response = regularResponse();
    }

    if ( response == null ) {
	throw new Error("'null' when 'Response' type expected");
    }

    res.writeHead(200, {'Content-Type': 'text/xml'});
    res.end(response.toString());
});



// branch for regular callers on App Lighting's
// primary phone number (888) 200 - 1601
app.post('/primary-choice', (req, res) => {
    var speech =  req.body.SpeechResult;
    var digits =  req.body.Digits;

    const response = new VoiceResponse();
    
    if ( typeof(speech) != 'undefined' ) {
	if ( speech.includes('appointment') ) 
	    digits = 1;
	else if ( speech.includes('message') )
	    digits = 2;
	else
	    digits = -1; // value to repeat input
    } else if ( typeof(digits) != 'undefined' ) {
	switch ( digits.parseInt() ) {
	case 1:
	    response.say('Not yet implemented. Goodbye');
	    break;
	case 2:
	    // TODO: a proper customize voicemail for each user...
	    // for now... minimum viable to get it to run
	    response.say('Please leave a message');
	    response.record({
		timeout: 30,
		transcribe: true
	    });
	    break;
	case default:
	    response.say('You must choose from the available options');
	    response.redirect({ method: 'POST' }, '/primary-inbound');
	    break;
	}
    } else {
	throw new Error('Expected speechResult or digit to be set, both were undefined');
    }

    res.writeHead(200, {'Content-Type': 'text/xml'});
    res.end(response.toString());
    
});
