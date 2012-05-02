# Cordova Skeleton App #
_By Will Froelich_

---

## Requirements ##

_For testing_

- This repo
- Xcode 4.2 > [Mac app store]
- iOS SDK [Via XCode Downloads]

_To run the api server locally_

- Vagrant [http://vagrantup.com/]
- Virtualbox [https://www.virtualbox.org/]

---

## How to get app running: ##

1. Pull repo and initialize submodules `git submodule init` and `git submodule update`
2. Configure `/www/app/bootstrap.js`
3. Open Xcode project
4. Run in iPhone sim 4.3 >

## Get API running locally ##

If you haven't already, you'll need a vhost with a reverse proxy setup on proto. You can check `/etc/httpd/conf/vhosts/will.conf` for an example

1. Make sure you have virtualbox and vagrant installed
2. Copy `Vagrantfile-example` to `/Vagrantfile` and modify ports
3. `cd` to the repo and run `vagrant up`
4. Modify `/www/app/bootstrap.js` turn off production mode and change dev api url to yourself. 

When bringing down vagrant, if you've made changes to the database schema, while in the vhost, eg, `vagrant ssh`, run `sh /vagrant/provision/save-state.sh`. This will dump the schema and data that you can commit. You could alternatively, manually dump the db and place it in `/provision/db/schema-and-data.sql.gz`

---
