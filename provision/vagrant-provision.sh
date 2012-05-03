
. "/vagrant/provision/config.sh"

cd $pro_path

echo "Creating DB"
mysqladmin -u$db_user -p$db_pass create $db_name --force
echo "Building tables and data"
gunzip < $db_path$db_compfile | mysql -u$db_user -p$db_pass $db_name
echo "Adding default user"
mysql -uroot -proot -e"CREATE USER '"$db_name"'@'localhost' IDENTIFIED BY '"$db_name"';GRANT ALL PRIVILEGES ON "$db_name".* TO '"$db_name"'@'%';"  --force

echo "Setting up Vhost"
sudo a2dissite default
sudo a2enmod rewrite
sudo cp $pro_path"vhost.conf" /etc/apache2/sites-available/protovhost
sudo a2ensite protovhost
sudo service apache2 reload