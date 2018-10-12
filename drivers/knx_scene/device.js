'use strict';

const KNXGeneric = require('./../../lib/generic_knx_device.js');
const DatapointTypeParser = require('./../../lib/DatapointTypeParser.js');
const Homey = require('homey');

class KNXScene extends KNXGeneric {
    onInit() {
        super.onInit();
        this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));

        let triggerSceneAction = new Homey.FlowCardAction('trigger_scene');
        triggerSceneAction
            .register()
            .registerRunListener((args, state) => {
                return this.triggerScene();
            });
    }

    onKNXEvent(groupaddress, data) {
        if (groupaddress === this.settings.ga_scene) {
            this.setCapabilityValue('onoff', DatapointTypeParser.onoff(data));
        }
    }

    onCapabilityOnoff(value, opts) {
        if (this.knxInterface && this.settings.ga_scene && value === true) {
            return this.triggerScene();
        }
    }

    triggerScene() {
        return this.knxInterface.writeKNXGroupAddress(this.settings.ga_scene, (this.settings.scene_number -1), 'DPT17') // The -1 is temporary until the knx.js lib fully supports scenes
        .catch((knxerror) => {
            this.log(knxerror);
            throw new Error(Homey.__("errors.switch_failed"));
        });
    }
}

module.exports = KNXScene;