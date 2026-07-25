## Example deployment script to an Amazon Web Services S3 bucket.
s3_bucket_name = "firehose.io"

desc "Remove all files from the build directory"
task :clean do
  sh 'rm -rf ./build'
end

namespace :tailwind do
  input  = "./assets/tailwind/application.css"
  output = "./assets/stylesheets/tailwind.css"
  config = "./tailwind.config.js"

  desc "Compile the Tailwind stylesheet (minified)"
  task :build do
    sh "./bin/tailwindcss -c #{config} -i #{input} -o #{output} --minify"
  end

  desc "Watch and recompile the Tailwind stylesheet on change"
  task :watch do
    sh "./bin/tailwindcss -c #{config} -i #{input} -o #{output} --watch"
  end
end

desc "Compile the sitepress site"
task compile: "tailwind:build" do
  sh 'bundle exec sitepress compile'
end

namespace :publish do
  desc "Upload ./build/assets to S3 with cache-control headers optimized for assets"
  task :assets do
    sh "aws s3 sync ./build/assets s3://#{s3_bucket_name}/assets --cache-control max-age=31536000"
  end

  desc "Upload ./build to S3"
  task :pages do
    sh "aws s3 sync ./build s3://#{s3_bucket_name} --exclude 'assets/**' --cache-control max-age=60"
  end
end

desc "Upload pages and assets to S3"
task publish: %w[publish:assets publish:pages]

task default: %w[clean compile publish]
