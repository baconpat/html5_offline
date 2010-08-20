require 'rubygems'
require "bundler"
Bundler.setup
require 'sinatra'
require 'haml'
require 'json'

# Make a "database" if one doesn't already exist
unless File.exist?('database.json')
  File.open('database.json', 'w') do |file|
    db = {
      '1' => {'id' => 1, 'text' => 'Cereal'},
      '2' => {'id' => 2, 'text' => 'Paper Towels'},
      '3' => {'id' => 3, 'text' => 'Milk'},
    }
    file.write(JSON.generate(db))
  end
end

# Tell Sinatra we will use Haml for templates
set :haml, {:format => :xhtml }

get '/' do
  haml :index
end

get '/manifest.cache' do
  # HTML5 requires the cache manifest have the following MIME type
  content_type 'text/cache-manifest', :charset => 'utf-8'
  <<-EOS
CACHE MANIFEST
# v7
js/jquery.js
js/Jaml-all.js
js/sammy/sammy.js
js/sammy/plugins/sammy.title.js
js/app.js
js/gears_init.js
/

NETWORK:
/api

FALLBACK:
/ offline
  EOS
end

# Page to show when user is offline and tries to access 
# a non-offline-able page
get '/offline' do
  haml :offline
end

get '/about' do
  "This is a really cool Shopping List application."
end

get '/api/items' do
  db = JSON.parse(File.read('database.json'))
  JSON.generate(db.values)
end

post '/api/items/:id' do |id|
  db = load_database
  db[id]['text'] = params['text']
  write_database db
  status 200
end

get '/api/items/:id' do |id|
  db = load_database
  JSON.generate db[id]
end

helpers do
  def load_database
    JSON.parse File.read('database.json')
  end

  def write_database(data = nil)
    File.open('database.json', 'w') do |file| 
      file.write JSON.generate(data)
    end
  end
end