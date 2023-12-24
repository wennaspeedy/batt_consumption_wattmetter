echo 'pack'
rm batt_consumption_wattmetter@zachgoldberg.shell-extension.zip
gnome-extensions pack --force --extra-source=utils.js
echo 'uninstall'
gnome-extensions uninstall batt_consumption_wattmetter@zachgoldberg || true
echo 'disable'
gnome-extensions disable batt_consumption_wattmetter@zachgoldberg
echo 'install'
gnome-extensions install --force batt_consumption_wattmetter@zachgoldberg.shell-extension.zip
echo 'enable'
gnome-extensions enable batt_consumption_wattmetter@zachgoldberg
