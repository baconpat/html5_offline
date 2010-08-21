HTML5 Offline Prototoype
============

This is a simple prototype written to learn about some of the technologies used to build an HTML5 offline web application. It uses:

* [Sinatra](http://www.sinatrarb.com/)
* [Sammy](http://code.quirkey.com/sammy/)
* HTML5 Storage (localStorage)
* HTML5 Cache Manifest
* Google Gears for IE8 

The app itself is a little Shopping List. The point was not to build something useful, but rather to experiment with these technologies.

I wrote about some of the things learned while writing this in a [blog post](https://spin.atomicobject.com/2010/08/16/researching-html5-offline).

Usage
--------

If you want to run the application to see it in action you need to have [Bundler](http://gembundler.com/) installed. Then you can `bundle install` or `rake gems` which does the same thing. Once the gems are installed `rake run` will start the app on port 4567. 

Load `http://localhost:4567` in your browser (most recent version of any browser should work). Once the browser has cached all of the files (very quick on localhost) you can kill the web server and refresh the page and the application should still function. 

Organization
--------

### app.rb
[Sinatra](http://www.sinatrarb.com/) web application. Defines a couple of routes and creates a JSON text file to be used as a database.

### js/app.js
Javascript file includes client side templates written in [Jaml](http://github.com/edspencer/jaml) (a javascript haml-link DSL), and [Sammy](http://code.quirkey.com/sammy/) application to handle the "single page" client side interactions.



