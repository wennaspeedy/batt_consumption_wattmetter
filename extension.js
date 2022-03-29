const BaseIndicator = imports.ui.status.power.Indicator;
const ExtensionUtils = imports.misc.extensionUtils;
const Panel = imports.ui.main.panel;
const { GLib, GObject, /*UPowerGlib: UPower,*/Shell } = imports.gi;

/** Settings
 */

const FORCE_SYNC_PERIOD = 4000;
const BAT_STATUS = "/sys/class/power_supply/BAT0/status";
const CURRENT_NOW = "/sys/class/power_supply/BAT0/current_now";
const VOLTAGE_NOW = "/sys/class/power_supply/BAT0/voltage_now";
const POWER_NOW = "/sys/class/power_supply/BAT0/power_now";

/** Common functions
 */

 function getStatus() {
    return readFileSafely(BAT_STATUS, "Unknown");
}

function getVoltage() {
    const voltage = parseFloat(readFileSafely(VOLTAGE_NOW, -1));
    return voltage === -1 ? voltage : voltage / 1000000;
}

function getPower() {
    const current = parseFloat(readFileSafely(CURRENT_NOW, -1));
    const power = parseFloat(readFileSafely(POWER_NOW, -1));
    const voltage = getVoltage();

    return current === -1 ? power === -1 ? power : power / 1000000 : current / 1000000 * voltage;
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

            this.bi_force_sync = null;
            this.lastval = ""
            
        }

        
        _getBatteryStatus() { 
            const pct = this._proxy.Percentage;
            const status = getStatus() 
            //log("status: "+status)           

          

            /*
            return UPower.DeviceState.FULLY_CHARGED ? _("%s%% %s%s").format(pct, "", "")
            : UPower.DeviceState.CHARGING ? _("%s%% %s%s W").format(pct, "+", this._meas())
                    : UPower.DeviceState.DISCHARGING ? _("%s%% %s%s W").format(pct, "-", this._meas())
                        : UPower.DeviceState.PENDING_CHARGE ? _("%s%% %s%s W").format(pct, "0", "")
                            : _("%s%% %s%s").format(pct, "", "")*/
            return status.includes('Charging') ? _("%s%% %s%s W").format(pct, "+", this._meas())
                           : status.includes('Discharging') ? _("%s%% %s%s W").format(pct, "-", this._meas())
                                : status.includes('Unknown') ? _("%s%% %s%s W").format(pct, "", "")
                                : _("%s%% %s%s").format(pct, "", "")
        

        }

        _sync() {
            super._sync();
        
            //enabling battery percentage
            if (!this._percentageLabel.visible){
                this._percentageLabel.show()
            }
            log('SYNC')
            this._percentageLabel.clutter_text.set_markup('<span size="small">' + this._getBatteryStatus() + '</span>');
            return true;
        }


        _meas(){
            const power = getPower();
            //const voltage = getVoltage();
            //const power = current * voltage;
            
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
                FORCE_SYNC_PERIOD,
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


function enable() {
 
    //prepare to settings
    /*this.settings = ExtensionUtils.getSettings(
        'org.gnome.shell.extensions.bcw');*/

    bat_consumption_wattmeter = new BatConsumptionWattmeter(); //tp_reader, tp_indicator);
}

function disable() {
    bat_consumption_wattmeter.destroy();
    bat_consumption_wattmeter = null;
}
