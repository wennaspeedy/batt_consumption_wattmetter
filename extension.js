const BaseIndicator = imports.ui.status.power.Indicator;
const ExtensionUtils = imports.misc.extensionUtils;
const Panel = imports.ui.main.panel;
const { GLib, GObject, Shell,Gio,St } = imports.gi;

const PanelMenu = imports.ui.panelMenu;
const BAT0 = "/sys/class/power_supply/BAT0/"
const BAT1 = "/sys/class/power_supply/BAT1/"
const BAT2 = "/sys/class/power_supply/BAT2/"


function getAutopath(){
    let path = readFileSafely(BAT0+"status", "none") === "none" ? readFileSafely(BAT1+"status", "none") === "none" ? -1 : BAT1 : BAT0;
    let isTP = readFileSafely(path+"power_now", "none") === "none" ? false : true
    return {'path':path,'isTP':isTP}
}

function getManualPath(batteryType){
    log('GET MANUAL! '+batteryType)
    let path = batteryType === 1 ? BAT0 : batteryType === 2 ? BAT1 : batteryType === 3 ? BAT2 : BAT0
    let finalpath = readFileSafely(path+"status", "none") === "none" ? -1 : path
    log('GET MANUAL! '+finalpath)
    let isTP = readFileSafely(path+"power_now", "none") === "none" ? false : true
    return {'path':finalpath,'isTP':isTP}
}


function _getValue(pathToFile) {
    const value = parseFloat(readFileSafely(pathToFile, -1));
    return value === -1 ? value : value / 1000000;
}


function readFileSafely(filePath, defaultValue) {

    try {

        return Shell.get_file_contents_utf8_sync(filePath);
    } catch (e) {
        log(`Cannot read file ${filePath}`, e);
    }
    return defaultValue;
}


/** Indicator
 */

var BatIndicator = GObject.registerClass(
    {
        GTypeName: 'BatIndicator',
    },
    class BatIndicator extends BaseIndicator {
        _init() {
            super._init();
            this.correction = getAutopath();
           // this.manual = "none"
            this.bi_force_sync = null;
           // this.interval = this._settings.get_string("interval");
            this.settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.batt_consumption_wattmetter');
        }

        _getStatus() {
            
            return readFileSafely(this.correction["path"]+"status", "Unknown");

        }



        _getPower() {
            const path = this.correction["path"]
            return this.correction['isTP'] === false ? _getValue(path+"current_now") * _getValue(path+"voltage_now")  : _getValue(path+"power_now")
        }


        _getBatteryStatus() { 
   
            const pct = this.settings.get_boolean("percentage") === true ? this._proxy.Percentage.toFixed(0)+"%" : "";

            //const path = ""
            let batteryType = this.settings.get_int("battery")
            if (batteryType != 0){
                this.correction = getManualPath(batteryType)
            } 
            
            const status = this._getStatus() 


            return status.includes('Charging') ? _("%s %s%s W").format(pct, "+", this._meas())
                           : status.includes('Discharging') ? _("%s %s%s W").format(pct, "-", this._meas())
                                : status.includes('Unknown') ? _("%s %s%s").format(pct, "", "?")
                                : _("%s").format(this.settings.get_boolean("percentagefull") === true ? pct : "")
        

        }

        _sync() {
            super._sync();
        
            //enabling battery percentage
            if (!this._percentageLabel.visible){
                this._percentageLabel.show()
            }
            //log('SYNC')
            
            //this._percentageLabel.clutter_text.set_markup('<span size="small">' + this._getBatteryStatus() + '</span>');
            if (this.correction["path"] != -1){
                this._percentageLabel.clutter_text.set_text(this._getBatteryStatus());
            } else {
                log(`Error - Extension BATT_CONSUMPTION_WATTMETTER can't find battery!!!`);
                return false;
            }

            return true;
        }


        _meas(){
            const power = this._getPower();
            
            
            if (power < 0 ) {
                return 0;
            } else {
                let pStr = String(Math.round(power))
                return pStr.length==1 ? "0"+pStr : pStr
            }
          
            
        }


    

        _spawn() {
            
                this.bi_force_sync = GLib.timeout_add(
                GLib.PRIORITY_DEFAULT,
                this.settings.get_string("interval")+"000",
                this._sync.bind(this));
               
        }

        _stop() {
            GLib.source_remove(this.bi_force_sync);
        }
    }
);

/** Extension
 */

class BatConsumptionWattmeter {
    constructor() {
        this.customIndicator = new BatIndicator();
        this.customIndicator._spawn();
        this.aggregateMenu = Panel.statusArea['aggregateMenu'];
        this.originalIndicator = this.aggregateMenu._power;
        this.aggregateMenu._indicators.replace_child(this.originalIndicator.indicators, this.customIndicator.indicators);
    }

    destroy(arg) {
        this.customIndicator._stop();
        this.aggregateMenu._indicators.replace_child(this.customIndicator.indicators, this.originalIndicator.indicators);
        this.customIndicator = null;
    }
}


/** Init
 */

let bat_consumption_wattmeter;
let indicator = null;

function enable() {
 
   

    bat_consumption_wattmeter = new BatConsumptionWattmeter(); //tp_reader, tp_indicator);
 //prepare to settings



}

function disable() {
    bat_consumption_wattmeter.destroy();
    bat_consumption_wattmeter = null;
}
