Jaml.register('item', function(item) {
  li({cls: 'item'},
    a({href: '#/items/' + item.id}, item.text)
  );
});

function hideIfTrue (val) {
  return val ? "display: none;" : ""
}


Jaml.register('main', function(data) {
  div({cls: 'main'},
    h1("Your Shopping Cart"),
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
    $.ajax({
      url: '/api/items',
      type: 'GET',
      complete: function (xhr, textStatus) {
        if (xhr.status === 200) {      
          console.log("Got response: " + xhr.status);
          var items = JSON.parse(xhr.responseText);
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
            console.log("Failed to load item from server.");
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
        this.title("Shopping Cart");
        
        // Display whatever is currently in local storage
        this.swap(renderMainTemplate());
        
        $('#some_text_input').focus();
        
        // Request the latest data from the server
        loadRemoteItems();
      });

      this.get('#/items/:id', function (context) {
        var id = this.params['id'];
        
        this.title("Item " + id);
        
        loadItem(id, function(item) {
          var $html = $(Jaml.render('/items/:id', item));
          $('.container').html($html);
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
            alert('the update failed');
          }
        });
      });
      
      this.get('#/clear', function (context) {
        alert('not yet');
        //storeItems([]);
        this.redirect('#/');
      });
      
      // this.bind('updated-data-available', function () {
      //   draw({upToDate: true});
      // });
      
      this.bind('run', function () {
        
        // Fired when the app is run. Good place for initialization
      });
    });
  }
  
  var localServer = null;
  var gearsStore = null;
  
  var initGears = function() {
    
    if (!$.browser.msie) {
      return;
    }
    
    if (!window.google || !google.gears) {
      alert("NOTE: you Must install Gears first.")
     } else {
       localServer = google.gears.factory.create("beta.localserver");
       gearsStore = localServer.createManagedStore("lifeconnect_prototype");
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
  
  return {
    load: function() {
      $(function() {        
        subscribeToOnlineStatusEvents();
        initGears();
        var app = initSammy();
        setTimeout(function () {
          app.run('#/')
        }, 2000);
      });
    }
  }
}(jQuery);

