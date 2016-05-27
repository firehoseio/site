### 
# Compass
###

# Susy grids in Compass
# First: gem install compass-susy-plugin
# require 'susy'

# Change Compass configuration
# compass_config do |config|
#   config.output_style = :compact
# end

###
# Page options, layouts, aliases and proxies
###

# Per-page layout changes:
# 
# With no layout
# page "/path/to/file.html", :layout => false
# 
# With alternative layout
# page "/path/to/file.html", :layout => :otherlayout
# 
# A path which all have the same layout
# with_layout :admin do
#   page "/admin/*"
# end

# Proxy (fake) files
# page "/this-page-has-no-template.html", :proxy => "/template-file.html" do
#   @which_fake_page = "Rendering a fake page with a variable"
# end

# Configure markdown
set :markdown_engine, :redcarpet
# set :redcarpet,
#   fenced_code_blocks: true,
#   autolink: true

set :markdown_engine, :redcarpet
set :markdown,
  no_intra_emphasis: true,  # Fon't emaphasize_snakecased_words.
  fenced_code_blocks: true, # Parse code blocks for syntax highlighting.
  smartypants: true,        # Propper punctiation, quotes, etc.
  prettify: true,
  autolink: true

# Live reload during development.
activate :livereload

# Syntax highlighting.
activate :syntax

# Automatic image dimensions on image_tag helper
# activate :automatic_image_sizes

# Pretty URLs
activate :directory_indexes

###
# Helpers
###

# Automatic image dimensions on image_tag helper
# activate :automatic_image_sizes

# Methods defined in the helpers block are available in templates
# helpers do
#   def some_helper
#     "Helping"
#   end
# end

# Change the CSS directory
# set :css_dir, "alternative_css_directory"

# Change the JS directory
# set :js_dir, "alternative_js_directory"

# Change the images directory
# set :images_dir, "alternative_image_directory"

set :firehose_host, "localhost:7474"

# Build-specific configuration
configure :build do
  set :firehose_host, "firehose.io"

  # For example, change the Compass output style for deployment
  activate :minify_css
  
  # Minify Javascript on build
  activate :minify_javascript
  
  # Enable cache buster
  activate :asset_hash
  
  # Use relative URLs
  # activate :relative_assets
  
  # Compress PNGs after build
  # First: gem install middleman-smusher
  # require "middleman-smusher"
  # activate :smusher
  
  # Or use a different image path
  # set :http_path, "/Content/images/"
end