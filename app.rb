require 'rubygems'
require "bundler"
Bundler.setup
require 'sinatra'
require 'haml'
require 'json'
require 'digest/md5'

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


CACHE_FILES = %w(
/js/jquery.js
/js/Jaml-all.js
/js/sammy/sammy.js
/js/sammy/plugins/sammy.title.js
/js/app.js
/js/gears_init.js
)

# Rack::Offline (http://github.com/wycats/rack-offline) does this for you. 
# Doing it ourselves here to make sure I understand what is going on.
get '/manifest.cache' do
  version = generate_manifest_version CACHE_FILES
  
  # HTML5 requires the cache manifest have the following MIME type
  content_type 'text/cache-manifest', :charset => 'utf-8'
  
  <<-EOS
CACHE MANIFEST
# #{version}

CACHE:
#{CACHE_FILES.join("\n")}
/

FALLBACK:
/about /offline

NETWORK:
/api

EOS
end

# Google Gears (needed for IE8) uses a different format of manifest
get "/manifest.json" do
  content_type 'application/json', :charset => 'utf-8'
  content ={
    "betaManifestVersion" => 2,  # Latest gears version
    "version" => generate_manifest_version(CACHE_FILES),
    "entries" =>  CACHE_FILES.map {|f| {"url" => f}} + [
        { "url" => "/"},
      ]
  }
  JSON.generate content
end

get '/' do
  haml :index
end

# Page to show when user is offline and tries to access 
# a non-offline-able page
get '/offline' do
  haml :offline
end

get '/about' do
  "<h1>This is a really cool Shopping List application.</h1>"
end

get '/api/items' do
  content_type 'application/json', :charset => 'utf-8'
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
  content_type 'application/json', :charset => 'utf-8'
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
  
  def generate_manifest_version(files)
    app_root = File.dirname(__FILE__)
    files_with_full_paths = files.map {|f| File.join(app_root, 'public', f)} 
    
    # Add this file to the digest so changes to the app will cause a new
    # manifest to be downloaded by the browser
    all_contents = (files_with_full_paths + [__FILE__]).map {|f| File.read(f)}.join("")
    Digest::MD5.hexdigest(all_contents)
  end
end