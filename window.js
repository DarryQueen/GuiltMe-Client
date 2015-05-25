$(document).ready(function() {
  chrome.runtime.sendMessage({message: "send_request"}, function(response) {
  	instanceVars.url_to_time = response;
    instanceVars.urls = Object.keys(instanceVars.url_to_time);
  	instanceVars.send_request(response);
  });
});

instanceVars = {

  server_classify_url: "http://localhost:3000/classify",
  server_datapoint_url: "http://localhost:3000/datapoint",

  sort_by_domain: function(){
    instanceVars.domain_to_url = {};
    instanceVars.domain_to_time = {};
    instanceVars.domains = [];
    for (var i = 0; i < instanceVars.urls.length; i++){
      var url = instanceVars.urls[i];
      var domain = instanceVars.get_domain(url);
      if (instanceVars.domain_to_url[domain] == undefined) {
        instanceVars.domains.push(domain);
        instanceVars.domain_to_url[domain] = [];
        instanceVars.domain_to_time[domain] = 0;
      }
      instanceVars.domain_to_url[domain].push(url);
      instanceVars.domain_to_time[domain] += instanceVars.url_to_time[url];
    }
  },

  get_domain: function(url){
    return new URL(url).hostname
  },

	send_request: function(){
    var data = {"history": instanceVars.urls};
    $.ajax({type: "POST", url: instanceVars.server_classify_url, data: data, success: instanceVars.success, dataType: "json"});
    instanceVars.sort_by_domain();
	 },

  set_domain_productivity: function() {
    instanceVars.domain_to_productivity = {};
    for (var i = 0; i < instanceVars.domains.length; i++){
      var domain = instanceVars.domains[i];
      var counts = {work: 0, procrastination: 0};
      var urls = instanceVars.domain_to_url[domain];
      for (var j = 0; j < urls.length; j++){
        var url = urls[j];
        var classification = instanceVars.result[url];
        counts[classification] += 1;
      }
      instanceVars.domain_to_productivity[domain] = (100 * counts.work / (counts.work + counts.procrastination)).toFixed(0);
    }
  },

	success: function(result) {
    instanceVars.result = result;
    instanceVars.set_domain_productivity();
    var rowId = 0;
    for (var i = instanceVars.domains.length - 1; i >= 0; i--) {
      var domain = instanceVars.domains[i];
      instanceVars.add_domain_row(domain, instanceVars.format_time(instanceVars.domain_to_time[domain]), instanceVars.domain_to_productivity[domain]);
      var urls = instanceVars.domain_to_url[domain];
      for (var j = 0; j < urls.length; j++) {
        var url = urls[j];
        var timeSpent = instanceVars.format_time(instanceVars.url_to_time[url]);
        var productivity = result[url];
        instanceVars.add_url_row(url, timeSpent, productivity, rowId);
        rowId++;
      }
    }
	},

  format_time: function (secs) {
    var hours = Math.floor(secs / (60 * 60));
    var divisor_for_minutes = secs % (60 * 60);
    var minutes = Math.floor(divisor_for_minutes / 60);
    var divisor_for_seconds = divisor_for_minutes % 60;
    var seconds = Math.ceil(divisor_for_seconds);
    var time = ""
    if (hours > 0){time += hours + "h ";}
    if (minutes > 0){time += minutes + "m ";}
    if (seconds > 0){time += seconds + "s";}
    return time;
  },

  add_domain_row: function(name, timeSpent, productivity, row_class) {
    var row_class = productivity > 50 ? "info" : "success";
    $("#myTable").find('tbody').append(
      $('<tr class=' + row_class + '><td>' +
        name + '</td><td>' +
        timeSpent + '</td><td>' +
        productivity + '% </td><td></td><td></td></tr>'
    ));
  },

  add_url_row: function(url, timeSpent, productivity, rowId) {
    
    var work_button = $('<button type="button" class="btn btn-primary">Work</button>');
    var procrastination_button = $('<button type="button" class="btn btn-success">Procrastination</button>');
    work_button.click(function() {
      $.ajax({type: "POST", url: instanceVars.server_datapoint_url, data: {url: url, classification: "work"}, success: instanceVars.reclassify_success, dataType: "json"});
    });
    procrastination_button.click(function() {
      $.ajax({type: "POST", url: instanceVars.server_datapoint_url, data: {url: url, classification: "procrastination"}, success: instanceVars.reclassify_success, dataType: "json"});
    });
    
    $("#myTable").find('tbody').append(
      $('<tr><td>' +'<a href="' +
        url + '"">' + url + '</a></td><td>' +
        timeSpent + '</td><td>' +
        productivity + '</td>' + 
        '<td id ="work' + rowId + '">' +
        '<td id ="procrastination' + rowId + '">' +'</tr>'
    ));

    work_button.appendTo($("#work"+rowId));
    procrastination_button.appendTo($("#procrastination"+rowId));
  },

  reclassify_success: function(result) {
    // Should change the visual representation of the rows related to the url that was reclassified
  },

}
