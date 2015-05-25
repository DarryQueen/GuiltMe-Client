var instanceVars = {
  last_time: new Date().getTime() / 1000,
  last_url: "chrome://newtab/",
  url_to_time: {},
  update: function(current_url){
    var now = new Date().getTime() / 1000;
    if(instanceVars.url_to_time.url==undefined){
      instanceVars.url_to_time[instanceVars.last_url] = now - instanceVars.last_time;
    } else {
      instanceVars.url_to_time[instanceVars.last_url]  = instanceVars.url_to_time[instanceVars.last_url] + difference;
    }
    instanceVars.last_url = current_url;
    instanceVars.last_time = now;
  }
}

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
      sendResponse(instanceVars.url_to_time)
  });

chrome.tabs.onActivated.addListener(function(activeInfo){
  var tabId = activeInfo.tabId;
  chrome.tabs.get(tabId, function(tab){
    // console.log("tab activate");
    // console.log(tabId);
    instanceVars.update(tab.url);
    // console.log(instanceVars.url_to_time);
  });
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
  chrome.tabs.get(tabId, function(tab){
    if(tab.active){
      // console.log("tab update");
      instanceVars.update(tab.url);
      // console.log(instanceVars.url_to_time);
    }  
  });
});

chrome.windows.onFocusChanged.addListener(function(windowId){
  chrome.windows.get(windowId,function(window){
    for(i=0; i< window.tabs.length; i++){
      var tab = window.tabs[i];
      if(tab.active){
        // console.log("window focus");
        instanceVars.update(tab.url);
        // console.log(instanceVars.url_to_time);
      }
    }
  });
});
