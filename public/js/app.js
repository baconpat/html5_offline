// Extrememly useful information about the state of the application cache //////////
if (window.applicationCache) {
  
  var appCache = window.applicationCache;
  var handleCacheEvent = function (e) {
    console.log("Cache Event Handled - " + e.type);
    // console.log(e);
    if (e.type === 'cached' || e.type === 'updateready') {
      console.log('Your computer is ready for offline use.');
    }
  };

  var handleCacheError = function (e) {
    console.log("Cache Error Handled");
    // console.log(e);
  };

  appCache.addEventListener('cached', handleCacheEvent, false);
  appCache.addEventListener('checking', handleCacheEvent, false);
  appCache.addEventListener('downloading', handleCacheEvent, false);
  appCache.addEventListener('error', handleCacheError, false);
  appCache.addEventListener('noupdate', handleCacheEvent, false);
  appCache.addEventListener('obsolete', handleCacheEvent, false);
  appCache.addEventListener('progress', handleCacheEvent, false);
  appCache.addEventListener('updateready', handleCacheEvent, false);
}
/////////////////////////////////////////////////////////////////////////////////////

App = function ($) {  
  var onlineStatus = function () {
    if (navigator.onLine) {
      return "Online";  
    } else {
      return "Offline";
    }    
  }

  var renderMainTemplate = function () {
    var items = getLocalItems();    
    var templateContext = {
      items: items, 
      status: onlineStatus(),
    };
    return Jaml.render('main', templateContext);
  };

  var loadRemoteItems = function () {
    console.log("Attempting to load remote items")
    $.ajax({
      url: '/api/items',
      type: 'GET',
      complete: function (xhr, textStatus) {
        if (xhr.status === 200) {
          var items = JSON.parse(xhr.responseText);
          
          // Use a timeout to simulate long retrieve times.
          setTimeout(function () {
            setLocalItems(items);
            $('.update').html("Updated info available. <a class='refresh' href=''>Refresh</a>");
            $('.refresh').click(function () {
              $('.update').remove();
              $('.items').html(Jaml.render('item', items));
              return false;
            });
          }, 3000);
        } else {
          $('.update').html("Offline. Unable to retrieve latest info right now.");
        }
      }
    });
  };
  
  var getLocalItems = function() {
    var db = JSON.parse(localStorage.getItem("items"));
    if (db) {
      var items = [];
      for (var id in db) {
        var item = db[id];
        items.push(item);
      }
      return items;
    } else {
      return [];
    }
  };

  var setLocalItems = function (items) {
    var db = {};
    $.each(items, function(index, item) {
      db[item.id] = item;
    });
    localStorage.setItem("items", JSON.stringify(db));
  };

  var loadItem = function (id, callback) {
    if (navigator.onLine) {
      $.ajax({
        url: '/api/items/' + id,
        type: 'GET',
        complete: function(xhr, textStatus) {
          if (xhr.status === 200) {
            console.log("Loaded item: " + xhr.responseText);
            var item = JSON.parse(xhr.responseText);
            setLocalItem(item);
            callback(item);
          } else {
            console.log("Failed to load item from server, try getting it locally");
            callback(getLocalItem(id));
          }
        }
      });  
    } else {
      callback(getLocalItem(id));
    }
    
  };

  var database = function () {
    return JSON.parse(localStorage.getItem("items") || "{}");
  }

  var setLocalItem = function (item) {
    var db = database();
    db[item.id] = item;
    localStorage.setItem("items", JSON.stringify(db));
  };

  var getLocalItem = function (id) {
    return database()[id];
  };

  var saveItem = function (item, opts) {
    setLocalItem(item);
    setRemoteItem(item, opts);
  }
  
  var setRemoteItem = function (item, opts) {    
    $.ajax({
      url: '/api/items/' + item.id,
      type: 'POST',
      data: {text: item.text},
      complete: function (xhr, textStatus) {
        if (xhr.status === 200) {
          opts['success']();
        } else {
          opts['error']();
        }
      }
    });
  };

  var updateOnlineStatus = function () {
    $('#online_status').text(onlineStatus());
  }

  var subscribeToOnlineStatusEvents = function () {
    $('body').bind('offline', function () {
      updateOnlineStatus();
    });
    
    $('body').bind('online', function () {
      updateOnlineStatus();
    });
  }
  
  var initSammy = function () {
    return $.sammy('.container', function() {
      this.use(Sammy.Title);
      
      this.get('#/', function (context) {
        this.title("Shopping List");
        
        // Display whatever is currently in local storage
        this.swap(renderMainTemplate());
        
        // Request the latest data from the server
        loadRemoteItems();
      });

      this.get('#/items/:id', function (context) {
        var id = this.params['id'];
        
        this.title("Item " + id);
        
        var sammy = this;
        loadItem(id, function(item) {
          sammy.swap(Jaml.render('/items/:id', item));
          $('#some_text_input').focus();
        });
      });
      
      this.post('#/items/:id', function (context) {
        // Create object from the form data
        var item = {id: this.params['id'], text: this.params['text']};
        
        var that = this;
        
        saveItem(item, {
          success: function() {
            that.redirect('#/');
          },
          error: function() {
            console.log("Couldn't save data remotely")
          }
        });
      });
      
      this.get('#/clear', function (context) {
        alert('not yet');
        this.redirect('#/');
      });
      
      this.bind('run', function () {        
        // Fired when the app is run. Good place for initialization
      });
    });
  }
  
  // Google Gears support - probably broken right now //////////////////////////////////////////
  var localServer = null;
  var gearsStore = null;
  
  var initGears = function() {
    
    if (!$.browser.msie) {
      return;
    }
    
    if (!window.google || !google.gears) {
      alert("NOTE: You must install Gears first.")
     } else {
       localServer = google.gears.factory.create("beta.localserver");
       gearsStore = localServer.createManagedStore("prototyping");
       createStore(gearsStore);
     }
  };
  
  function createStore(store) {
    // alert("Before checking for update, current version: " + store.currentVersion);

    store.manifestUrl = "manifest.json";
    store.checkForUpdate();

    var timerId = window.setInterval(function() {
      // When the currentVersion property has a value, all of the resources
      // listed in the manifest file for that version are captured. There is
      // an open bug to surface this state change as an event.
      if (store.currentVersion) {
        window.clearInterval(timerId);
        // alert("The documents are now available offline.\n" + 
        //         "With your browser offline, load the document at " +
        //         "its normal online URL to see the locally stored " +
        //                "version. The version stored is: " + 
        //         store.currentVersion);
      } else if (store.updateStatus == 3) {
        alert("Error: " + store.lastErrorMessage);
      }
    }, 500);  
  }
  ////////////////////////////////////////////////////////////////////////////////////
  
  return {
    load: function() {
      $(function() {        
        subscribeToOnlineStatusEvents();
        initGears();
        var app = initSammy();
        
        // Add a delay so the loading message can be seen before 
        // the page is rendered by javascript
        setTimeout(function () {
          app.run('#/')
        }, 2000);
      });
    }
  }
}(jQuery);

////// Jaml templates ////////////////////////////////////////////
Jaml.register('item', function(item) {
  li({cls: 'item'},
    a({href: '#/items/' + item.id}, item.text)
  );
});

Jaml.register('main', function(data) {
  div({cls: 'main'},
    h1("My Shopping List"),
    p(
      span("Currently "),
      span({id: 'online_status'}, data.status)
    ),
    
    p(
      span({cls: 'update'}, "Viewing cached data. Retrieving up to date info...")
    ),
    
    ul({cls: 'items'},
      Jaml.render('item', data.items)
    ),

    div(
      a({id: 'clear', href: '#/clear'}, "Clear Items")
    ),
    
    a({href: '/about'}, 'About')
  );
});

Jaml.register('/items/:id', function(item) {
  div({cls: 'item'},
    h1("Item " + item.id),
    a({href: '#/'}, "Back"),

    form({action: '#/items/' + item.id, method: 'post'},
      label({'for': 'some_text_input'}, "Enter Text"),
      input({type: 'text', name: 'text', id: 'some_text_input', value: item.text}),
      input({type: 'submit', value: 'Save'})
    )
  );
});
////////////////////////////////////////////////////////////////////////////////////////

