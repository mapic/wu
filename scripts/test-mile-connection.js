var http = require('http');
var options = {
  host: 'mile',
  port : '3003',
  path: ''
};

var req = http.get(options, function(res) {
  console.log('STATUS: ' + res.statusCode);
  console.log('HEADERS: ' + JSON.stringify(res.headers));
  process.exit();
});