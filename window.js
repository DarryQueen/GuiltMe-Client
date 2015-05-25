
$(document).ready(function() {
  // sends a request to background.js to retrieve the most recent data 
  chrome.runtime.sendMessage({message: "send_request"}, function(response) {
  	instanceVars.url_to_time = response;
  	instanceVars.send_request(response);
  });
});

instanceVars = {
	send_request: function(){
		instanceVars.urls = Object.keys(instanceVars.url_to_time);
    var data = {"history": instanceVars.urls};
    var url = "http://localhost:3000/classify";
    $.ajax({type: "POST", url: url, data: data, success: instanceVars.success, dataType: "json"});
	 },

	success: function(result){
		for (var i = 0; i < instanceVars.urls.length; i++) {
    	var url = instanceVars.urls[i];
    	var timeSpent = instanceVars.url_to_time[url];
    	var productivity = result[url];
    	$("#myTable").find('tbody').append($('<tr>')
        .append($('<td>'+url+'</td>'+'<td>'+timeSpent+'</td>'+'<td>'+productivity+'</td>'+'</tr>')));
		}
	}
}