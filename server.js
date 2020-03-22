const app  = require('./index.js');
const http = require('http');

http.createServer(app).listen(process.env.PORT);

