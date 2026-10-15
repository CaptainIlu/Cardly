# Adds the two Swift files to the App target (uses the xcodeproj gem that ships with CocoaPods).
require 'xcodeproj'
path = 'ios/App/App.xcodeproj'
proj = Xcodeproj::Project.open(path)
target = proj.targets.find { |t| t.name == 'App' }
group = proj.main_group.find_subpath('App', false)
if target.nil? || group.nil? || group.is_a?(Xcodeproj::Project::Object::PBXFileSystemSynchronizedRootGroup)
  puts 'SKIP'  # Xcode will pick the files up automatically, or add them by hand.
  exit 0
end
%w[CardlyFilePlugin.swift CardlyViewController.swift].each do |f|
  next if group.files.any? { |r| r.path == f }
  ref = group.new_reference(f)
  target.add_file_references([ref])
end
proj.save
puts 'OK'
