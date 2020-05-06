const express  = require('express');
//const applight = require('./libapplight.js');
const twilio   = require('twilio');
const client   = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const VoiceResponse     = twilio.twiml.VoiceResponse;
const MessagingResponse = twilio.twiml.MessagingResponse;
const ClientCapability  = twilio.jwt.ClientCapability;
const app               = express();

const vaughan           = '+17818279675'



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

// response for an App Lighting client
function clientResponse( caller ) {
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
	       + 'To list your upcoming appointments, press two or '
	       + 'say appointments. '
	       + 'To begin or join a conference, press three or say '
	       + 'conference. '
	       + 'To enable or disable number proxies for your phone, '
	       + 'press four or say proxies.' );
    return response;
}

// response for all other callers
function regularResponse() {
    const response = new VoiceResponse();
    const gather = response.gather({
	input: 'speech dtmf',
	numDigits: 1,
	timeout: 7,
	action: '/primary-choice',
	method: 'POST'
    });
    gather.say('You have reached App Lighting. '
	       + 'To schedule an appointment, press one or say appointment, '
	       + 'To leave a message, press two or say message. ');
    return response;
}


app.get('/voice-token', (request, response) => {
    const identity = 'the_user_id';
    
    const capability = new ClientCapability({
	'accountSid': process.env.TWILIO_ACCOUNT_SID,
	'authToken': process.env.TWILIO_AUTH_TOKEN
    });

    capability.addScope(new ClientCapability.IncomingClientScope(identity));   
    capability.addScope(new ClientCapability.OutgoingClientScope({
	'applicationSid': process.env.TWILIO_TWIML_APP_SID,
	'clientName': identity
    }) );
    
    let headers = {
	"Access-Control-Allow-Origin": "https://phone.app.lighting",
	"Access-Control-Allow-Methods": "GET",
	"Content-Type": "application/json"
    };
    // Set headers in response
    response.setHeaders(headers);
    response.setStatusCode(200);

    // Include token in a JSON response
    response.send({
	'identity': identity,
	'token': capability.toJwt()
    });
});

app.post('/voice', (request, response) => {
    const voiceResponse = new VoiceResponse();
    voiceResponse.dial({
	callerId: '+18882001601',
    }, request.body.number);

    response.type('text/xml');
    response.send(voiceResponse.toString());
});

/*
app.post('/voice-token', (req, res) => {
    const IDENTITY = "the_user_id";

    // envirnment vars for REST CLIENT
    const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
    const AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN;

    // envirnment vars for accessToken
    const TWIML_APPLICATION_SID = process.env.TWILIO_APPLICATION_SID;
    const API_KEY     = process.env.TWILIO_API_KEY;
    const API_SECRET  = process.env.TWILIO.API_SECRET;
    
    const AccessToken = Twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;
    
    const accessToken = new AccessToken(ACCOUNT_SID,  API_KEY, API_SECRET);
    accessToken.identity = IDENTITY;
    const grant = new VoiceGrant({
	outgoingApplicationSid: TWIML_APPLICATION_SID,
	incomingAllow: true
    });
    accessToken.addGrant(grant);
    
    const response = new Twilio.Response();
    
    // Uncomment these lines for CORS support
    response.appendHeader('Access-Control-Allow-Origin', '*');
    response.appendHeader('Access-Control-Allow-Methods', 'GET');
    response.appendHeader('Access-Control-Allow-Headers', 'Content-Type');
    response.appendHeader("Content-Type", "application/json");
    response.setBody({
	identity: IDENTITY,
	token: accessToken.toJwt()
    });

    res.end(response.toString());
});
*/

app.post('/call-avertest', (req, res) => {
    var call = client.calls.create({
	callerId: '+19783879792',
	to: '+16173990190',
	record: 'true',
	recordStatusCallback: 'https://comm.app.lighting/send-text-transcript',
	twiml: '<Response><Dial callerId="+18882001601"><Number>' + vaughan
	    + '</Number></Dial></Response>'
    }).then( call => console.log(call.sid));
    
    res.writeHead(200, {'Content-Type': 'text/json'});
    res.end( "{ 'sid' : '" + call.sid  + "' };" );
});


// recordingStatusCallback target for REST API's call resource
app.post('/transcribe-recording', (req, res) => {
    var message = client.messages.create({
	from: '+19783879792',
	to: vaughan,
	body: req.body.transcriptionText
    }).then( message => console.log( message.sid ) );
    
    res.writeHead(200, {'Content-Type': 'text/json'});
    res.end( "{ 'message' : { 'sid' : ' " + message.sid + " ' }; };" );
});

// Send voice call transcript by SMS to me
// Used by plugin on twiml <Record> elements
app.post('/send-text-transcript', (req, res) => {
    // creates and sends a text with transcribed results  
    client.messages.create({from:'+19783879792',
			    to: vaughan,
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


// App Lighting's primary phone number (888) 200 - 1601
app.post('/primary-inbound', (req, res) => {

    const caller = req.body.From;

    var response = undefined;
    if ( isClient(caller) ) {
	// response = clientResponse( caller );
	// while implementing regularResponse.. all callers are routed
	response = regularResponse();
    } else {
	response = regularResponse();
    }

    if ( response === undefined ) {
	throw new Error("'null' when 'Response' type expected");
    }

    res.writeHead(200, {'Content-Type': 'text/xml'});
    res.send(response.toString());
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
	default:
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
