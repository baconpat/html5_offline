task :default => :run

desc 'Run the app'
task :run do
  sh "bundle exec shotgun --port 4567 app.rb"
end

desc "Install gems with bundler"
task :gems do
  sh "bundle install"
end