'use strict';

const Homey = require('homey');
const KNXGeneric = require('./../../lib/generic_knx_device.js');
const ColorConverter = require('color-convert');
const DatapointTypeParser = require('./../../lib/DatapointTypeParser.js');

class KNXRGB extends KNXGeneric {

    // this method is called when the Device is inited
    
    onInit() {
        super.onInit();
        this.log('KNX RGB init');
        this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));
        this.registerMultipleCapabilityListener(['dim', 'light_hue', 'light_saturation'], this.onCapabilityHSV.bind(this), 500)
    }

    onKNXEvent(groupaddress, data) {
        if (groupaddress === this.getSetting('ga_status')) {
            this.setCapabilityValue('onoff', DatapointTypeParser.onoff(data));
        }
        if (groupaddress === this.getSetting('ga_dim_status')) {
            this.setCapabilityValue('dim', DatapointTypeParser.dim(data));
        }
    }

    async onKNXConnection() {
        const onoffvalues = await this.readSettingAddress(['ga_red_toggle_status', 'ga_green_toggle_status', 'ga_blue_toggle_status']);
        if (onoffvalues.map(buf => buf.readInt8()).includes(1)) {
            this.setCapabilityValue('onoff', true);
        } else {
            this.setCapabilityValue('onoff', false);
        }
        const curValues = this.getCurrentHSVColor();
        if (curValues) {
            this.setCapabilityValue('light_hue', curValues.h);
            this.setCapabilityValue('light_saturation', curValues.s);
            this.setCapabilityValue('dim', curValues.v);
        }
    }

    // this method is called when the Device has requested a state change (turned on or off)
    onCapabilityOnoff(value, opts) {
        if(this.knxInterface) {
            if (value === true) {
                if (this.getSetting('ga_red_toggle') && this.getSetting('ga_green_toggle') && this.getSetting('ga_blue_toggle')) {
                    return Promise.all([
                        this.knxInterface.writeKNXGroupAddress(this.getSetting('ga_red_toggle'), 1, 'DPT1'),
                        this.knxInterface.writeKNXGroupAddress(this.getSetting('ga_green_toggle'), 1, 'DPT1'),
                        this.knxInterface.writeKNXGroupAddress(this.getSetting('ga_blue_toggle'), 1, 'DPT1')
                    ]);
                    return new Error('Switching the device failed!');
                }
            } else {
                if (this.getSetting('ga_red_toggle') && this.getSetting('ga_green_toggle') && this.getSetting('ga_blue_toggle')) {
                    return Promise.all([
                        this.knxInterface.writeKNXGroupAddress(this.getSetting('ga_red_toggle'), 0, 'DPT1'),
                        this.knxInterface.writeKNXGroupAddress(this.getSetting('ga_green_toggle'), 0, 'DPT1'),
                        this.knxInterface.writeKNXGroupAddress(this.getSetting('ga_blue_toggle'), 0, 'DPT1')
                    ]);
                    return new Error('Switching the device failed!');
                }
            }
        }
    }

    onCapabilityHSV(values, opts) {
        if (!values.hasOwnProperty('dim')) {
            values.dim = this.getCapabilityValue('dim');
            if (!values.dim) {values.dim = 0;}
        }
        if (!values.hasOwnProperty('light_hue')) {
            values.light_hue = this.getCapabilityValue('light_hue');
            if (!values.light_hue) {values.light_hue = 0;}
        }
        if (!values.hasOwnProperty('light_saturation')) {
            values.light_saturation = this.getCapabilityValue('light_saturation');
            if (!values.light_saturation) {values.light_saturation = 0;}
        }
        // convert hsv to rgb
        const conversion = ColorConverter.hsv.rgb((values.light_hue*360), (values.light_saturation*100), (values.dim*100));
        const colors = {
            r: conversion[0],
            g: conversion[1],
            b: conversion[2]
        }

        if (this.knxInterface && this.getSetting('ga_red_dim') && this.getSetting('ga_green_dim') && this.getSetting('ga_blue_dim')) {
            this.log('setting RBG to', colors.r, colors.g, colors.b); // debug
            return Promise.all([
                this.knxInterface.writeKNXGroupAddress(this.getSetting('ga_red_dim'), (colors.r), 'DPT5'),
                this.knxInterface.writeKNXGroupAddress(this.getSetting('ga_green_dim'), (colors.g), 'DPT5'),
                this.knxInterface.writeKNXGroupAddress(this.getSetting('ga_blue_dim'), (colors.b), 'DPT5')
            ])
            .then(() => {
                this.setCapabilityValue('onoff', true);
            })
        }
    }

    async getCurrentHSVColor() {
        const dimValues = await this.readSettingAddress(['ga_red_dim_status', 'ga_green_dim_status', 'ga_blue_dim_status']);
        this.log(dimValues);
        if (dimValues) {
            const hsvValues = ColorConverter.rgb.hsv(DatapointTypeParser.colorChannel(dimValues[0]),
                        DatapointTypeParser.colorChannel(dimValues[1]), DatapointTypeParser.colorChannel(dimValues[2]));
            hsvColor = {
                h: (hsvValues[0]/360),
                s: (hsvValues[1]/100),
                v: (hsvValues[2]/100)
            }
            return hsvColor
        }
    }
}

module.exports = KNXRGB;