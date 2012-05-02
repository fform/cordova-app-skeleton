#!/bin/sh

. "/vagrant/provision/config.sh"

echo "Saving DB..."
mysqldump -u$db_user -p$db_pass $db_name | gzip -9 > $db_path$db_compfile
