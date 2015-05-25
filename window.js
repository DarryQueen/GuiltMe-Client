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
      instanceVars.domain_to_productivity[domain] = counts;
    }
  },

	success: function(result) {
    instanceVars.result = result;
    instanceVars.set_domain_productivity();
    var rowId = 0;
    for (var i = instanceVars.domains.length - 1; i >= 0; i--) {
      var domain = instanceVars.domains[i];
      instanceVars.add_domain_row(domain, instanceVars.format_time(domain),i);
      var urls = instanceVars.domain_to_url[domain];
      for (var j = 0; j < urls.length; j++) {
        var url = urls[j];
        var timeSpent = instanceVars.format_time(url);
        var productivity = result[url];
        instanceVars.add_url_row(url, timeSpent, productivity, rowId, i);
        rowId++;
      }
    }
	},

  get_probability: function(domain) {
    var counts = instanceVars.domain_to_productivity[domain];
    return (100 * counts.work / (counts.work + counts.procrastination)).toFixed(0)
  },

  format_productivity: function(domain) {
    return instanceVars.get_probability(domain) + "%";
  },

  format_time: function (name) {
    var secs = instanceVars.domain_to_time[name] || instanceVars.url_to_time[name];
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

  add_domain_row: function(name, timeSpent, domain_id) {
    var productivity = instanceVars.get_probability(name);
    var row_class = productivity > 50 ? "info" : "success";
    $("#myTable").find('tbody').append(
      $('<tr class=' + row_class + ' id=domain' + domain_id + '><td>' +
        name + '</td><td>' +
        timeSpent + '</td><td>' +
        instanceVars.format_productivity(name) + '</td></tr>'
    ));
  },

  add_url_row: function(url, timeSpent, productivity, rowId, domain_id) {
    var work_button_class = productivity == "work" ? "btn btn-primary" : "btn btn-default";
    var procrastination_button_class = productivity == "procrastination" ? "btn btn-success" : "btn btn-default";
    var work_button = $('<button type="button" class="'+work_button_class+'">Work</button>');
    var procrastination_button = $('<button type="button" class="'+procrastination_button_class+'">Procrastination</button>');
    var success_function = instanceVars.reclassify_success(work_button, procrastination_button, domain_id);
    work_button.click(function() {
      $.ajax({type: "POST", url: instanceVars.server_datapoint_url, data: {url: url, classification: "work"}, success: success_function, dataType: "json"});

    });
    procrastination_button.click(function() {
      $.ajax({type: "POST", url: instanceVars.server_datapoint_url, data: {url: url, classification: "procrastination"}, success: success_function, dataType: "json"});
    });
    $("#myTable").find('tbody').append(
      $('<tr><td>' +'<a href="' +
        url + '">' + url + '</a></td><td>' +
        timeSpent + '</td><td id =' + rowId + '></td></tr>'
    ));

    work_button.appendTo($("#"+rowId));
    procrastination_button.appendTo($("#"+rowId));
  },

  reclassify_success: function(work_button, procrastination_button, domain_id) {
    return function(result){
      instanceVars.result[result.url] = result.classification;
      var domain_row = $('#domain' + domain_id);
      var domain = domain_row.children()[0].textContent;
      var productivity = domain_row.children()[2].textContent;
      var counts = instanceVars.domain_to_productivity[domain];
      if (result.classification == "work") {
        if (work_button.attr('class') == "btn btn-default") {
          work_button.removeClass('btn btn-default').addClass('btn btn-primary');
          procrastination_button.removeClass('btn btn-success').addClass('btn btn-default');
          counts.work ++;
          counts.procrastination --;
        }
      } else {
        if (work_button.attr('class') == "btn btn-primary") {
          work_button.removeClass('btn btn-primary').addClass('btn btn-default');
          procrastination_button.removeClass('btn btn-default').addClass('btn btn-success');
          counts.work --;
          counts.procrastination ++;
        }
      }
      var probability = instanceVars.get_probability(domain);
      var row_class = domain_row.attr('class');
      if (probability < 50){
        domain_row.removeClass(row_class).addClass('success');
      } else {
        domain_row.removeClass(row_class).addClass('info');
      }
      $(domain_row.children()[2]).html(instanceVars.format_productivity(domain));
    }
  },

}
