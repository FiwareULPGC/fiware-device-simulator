/*
 * Copyright 2016 Telefónica Investigación y Desarrollo, S.A.U
 *
 * This file is part of the Short Time Historic (STH) component
 *
 * STH is free software: you can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * STH is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with STH.
 * If not, see http://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with: [german.torodelvalle@telefonica.com]
 */

'use strict';

var ROOT_PATH = require('app-root-path');
var EventEmitter = require('events').EventEmitter;
var mqtt = require('mqtt');
var nock = require('nock');
var should = require('should');
var sinon = require('sinon');
var linearInterpolator = require(ROOT_PATH + '/lib/interpolators/linearInterpolator');
var stepBeforeInterpolator  = require(ROOT_PATH + '/lib/interpolators/stepBeforeInterpolator');
var stepAfterInterpolator  = require(ROOT_PATH + '/lib/interpolators/stepAfterInterpolator');
var dateIncrementInterpolator  = require(ROOT_PATH + '/lib/interpolators/dateIncrementInterpolator');
var multilinePositionInterpolator  = require(ROOT_PATH + '/lib/interpolators/multilinePositionInterpolator');
var textRotationInterpolator  = require(ROOT_PATH + '/lib/interpolators/textRotationInterpolator');
var fiwareDeviceSimulator = require(ROOT_PATH + '/lib/fiwareDeviceSimulator');
var fdsErrors = require(ROOT_PATH + '/lib/errors/fdsErrors');

/**
 * Checks if a retrieved token response is wellFormedTokenRequestCheck
 * @param  {Object} simulationConfiguration A simulation configuration object
 * @param  {Object} requestBody             The token response body
 */
function wellFormedTokenRequestCheck(simulationConfiguration, requestBody) {
  should(requestBody.auth.identity.methods).be.an.instanceof(Array);
  should(requestBody.auth.identity.methods).containDeep(['password']);
  should(requestBody.auth.identity.password.user.domain.name).equal(simulationConfiguration.domain.service);
  should(requestBody.auth.identity.password.user.name).equal(simulationConfiguration.authentication.user);
  should(requestBody.auth.identity.password.user.password).equal(simulationConfiguration.authentication.password);
  should(requestBody.auth.scope.project.domain.name).equal(simulationConfiguration.domain.service);
  should(requestBody.auth.scope.project.name).equal(simulationConfiguration.domain.subservice);
}

/**
 * Returns the attribute value inside a contextElements structure
 * @param  {Array}  contextElements An array of contextElementslement
 * @param  {String} entityId        The entity id
 * @param  {String} attributeName   The attribute name
 * @return {String}                 The attribute value
 */
function getAttributeValue(contextElements, entityId, attributeName) {
  for (var ii = 0; ii < contextElements.length; ii++) {
    if (contextElements[ii].id === entityId) {
      for (var jj = 0; jj < contextElements[ii].attributes.length; jj++) {
        if (contextElements[ii].attributes[jj].name === attributeName) {
          return contextElements[ii].attributes[jj].value;
        }
      }
    }
  }
}

/**
 * Returns the decimal date associated to certain date
 * @param  {date}   date The date
 * @return {Number}      The time in decimal format
 */
function toDecimalHours(date) {
  return date.getHours() + (date.getMinutes() / 60) + (date.getSeconds() / 3600);
}

describe('fiwareDeviceSimulator tests', function() {
  /* jshint camelcase: false */

  var idm,
      isError,
      isTokenRequest,
      isTokenResponse,
      simulationProgress;

  var simulationConfiguration = require(ROOT_PATH + '/test/unit/configurations/simulation-configuration.json');

  idm = nock(simulationConfiguration.authentication.protocol + '://' + simulationConfiguration.authentication.host +
    ':' + simulationConfiguration.authentication.port);

  describe('simulation configuration validation', function() {
    it('should notify an "error" event if no domain configuration information is provided', function(done) {
      simulationProgress = fiwareDeviceSimulator.start({});
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no service in the domain configuration information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start({
        domain: {}
      });
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no subservice in the domain configuration information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start({
        domain: {
          service: 'theService'
        }
      });
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no context broker configuration information is provided and ' +
       'entities are included',
    function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          entities: [{
            schedule: 'once',
            entity_name: 'EntityName1',
            entity_type: 'EntityType1',
            active: [{
              name: 'active1',
              type: 'number',
              value: 1
            }]
          }]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no protocol context broker configuration information is provided and ' +
       'entities are included',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {},
          entities: [{
            schedule: 'once',
            entity_name: 'EntityName1',
            entity_type: 'EntityType1',
            active: [{
              name: 'active1',
              type: 'number',
              value: 1
            }]
          }]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no protocol context broker configuration information is provided and ' +
       'entities are included',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {},
          entities: [{
            schedule: 'once',
            entity_name: 'EntityName1',
            entity_type: 'EntityType1',
            active: [{
              name: 'active1',
              type: 'number',
              value: 1
            }]
          }]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no host context broker configuration information is provided and ' +
       'entities are included',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https'
          },
          entities: [{
            schedule: 'once',
            entity_name: 'EntityName1',
            entity_type: 'EntityType1',
            active: [{
              name: 'active1',
              type: 'number',
              value: 1
            }]
          }]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no port context broker configuration information is provided and ' +
       'entities are included',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost'
          },
          entities: [{
            schedule: 'once',
            entity_name: 'EntityName1',
            entity_type: 'EntityType1',
            active: [{
              name: 'active1',
              type: 'number',
              value: 1
            }]
          }]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no NGSI version context broker configuration information is provided and ' +
       'entities are included',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026'
          },
          entities: [{
            schedule: 'once',
            entity_name: 'EntityName1',
            entity_type: 'EntityType1',
            active: [{
              name: 'active1',
              type: 'number',
              value: 1
            }]
          }]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no protocol authentication configuration information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
          }
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no host authentication configuration information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https'
          }
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no port authentication configuration information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost'
          }
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no user authentication configuration information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001
          }
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no password authentication configuration information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser'
          }
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no IOT Agent configuration information is provided and devices are included',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          devices: [{
            schedule: 'once',
            device_id: 'DeviceId1',
            protocol: 'UltraLight::HTTP',
            api_key: 'the-api-key',
            attributes: [{
              object_id: 'a1',
              value: 1
            }]
          }]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no UltraLight IoT Agent configuration information is provided and ' +
       'UltraLight HTTP devices are included',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          iota: {},
          devices: [{
            schedule: 'once',
            device_id: 'DeviceId1',
            protocol: 'UltraLight::HTTP',
            api_key: 'the-api-key',
            attributes: [{
              object_id: 'a1',
              value: 1
            }]
          }]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no UltraLight HTTP IoT Agent configuration information is provided and ' +
       'UltraLight HTTP devices are included',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          iota: {
            ultralight: {}
          },
          devices: [{
            schedule: 'once',
            device_id: 'DeviceId1',
            protocol: 'UltraLight::HTTP',
            api_key: 'the-api-key',
            attributes: [{
              object_id: 'a1',
              value: 1
            }]
          }]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no UltraLight HTTP protocol IoT Agent configuration information is ' +
       'provided and UltraLight HTTP devices are included',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          iota: {
            ultralight: {
              http: {}
            }
          },
          devices: [{
            schedule: 'once',
            device_id: 'DeviceId1',
            protocol: 'UltraLight::HTTP',
            api_key: 'the-api-key',
            attributes: [{
              object_id: 'a1',
              value: 1
            }]
          }]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no UltraLight HTTP host IoT Agent configuration information is provided ' +
       'and UltraLight HTTP devices are included',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          iota: {
            ultralight: {
              http: {
                protocol: 'http'
              }
            }
          },
          devices: [{
            schedule: 'once',
            device_id: 'DeviceId1',
            protocol: 'UltraLight::HTTP',
            api_key: 'the-api-key',
            attributes: [{
              object_id: 'a1',
              value: 1
            }]
          }]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no UltraLight HTTP port IoT Agent configuration information is provided ' +
       'and UltraLight HTTP devices are included',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          iota: {
            ultralight: {
              http: {
                protocol: 'http',
                host: 'localhost'
              }
            }
          },
          devices: [{
            schedule: 'once',
            device_id: 'DeviceId1',
            protocol: 'UltraLight::HTTP',
            api_key: 'the-api-key',
            attributes: [{
              object_id: 'a1',
              value: 1
            }]
          }]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no UltraLight API key IoT Agent configuration information is provided ' +
       'and UltraLight HTTP devices specifying no API key are included',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          iota: {
            ultralight: {
              http: {
                protocol: 'http',
                host: 'localhost',
                port: 8085
              }
            }
          },
          devices: [{
            schedule: 'once',
            device_id: 'DeviceId1',
            protocol: 'UltraLight::HTTP',
            attributes: [{
              object_id: 'a1',
              value: 1
            }]
          }]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no UltraLight IoT Agent configuration information is provided and ' +
       'UltraLight MQTT devices are included',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          iota: {},
          devices: [{
            schedule: 'once',
            device_id: 'DeviceId1',
            protocol: 'UltraLight::MQTT',
            api_key: 'the-api-key',
            attributes: [{
              object_id: 'a1',
              value: 1
            }]
          }]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no UltraLight MQTT IoT Agent configuration information is provided and ' +
       'UltraLight MQTT devices are included',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          iota: {
            ultralight: {}
          },
          devices: [{
            schedule: 'once',
            device_id: 'DeviceId1',
            protocol: 'UltraLight::MQTT',
            api_key: 'the-api-key',
            attributes: [{
              object_id: 'a1',
              value: 1
            }]
          }]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no UltraLight MQTT protocol IoT Agent configuration information is ' +
       'provided and UltraLight MQTT devices are included',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          iota: {
            ultralight: {
              mqtt: {}
            }
          },
          devices: [{
            schedule: 'once',
            device_id: 'DeviceId1',
            protocol: 'UltraLight::MQTT',
            api_key: 'the-api-key',
            attributes: [{
              object_id: 'a1',
              value: 1
            }]
          }]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no UltraLight MQTT host IoT Agent configuration information is ' +
       'provided and UltraLight MQTT devices are included',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          iota: {
            ultralight: {
              mqtt: {
                protocol: 'mqtt'
              }
            }
          },
          devices: [{
            schedule: 'once',
            device_id: 'DeviceId1',
            protocol: 'UltraLight::MQTT',
            api_key: 'the-api-key',
            attributes: [{
              object_id: 'a1',
              value: 1
            }]
          }]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no UltraLight MQTT port IoT Agent configuration information is provided ' +
       'and UltraLight MQTT devices are included',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          iota: {
            ultralight: {
              mqtt: {
                protocol: 'mqtt',
                host: 'localhost'
              }
            }
          },
          devices: [{
            schedule: 'once',
            device_id: 'DeviceId1',
            protocol: 'UltraLight::MQTT',
            api_key: 'the-api-key',
            attributes: [{
              object_id: 'a1',
              value: 1
            }]
          }]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no UltraLight API key IoT Agent configuration information is provided ' +
       'and UltraLight MQTT devices not specifying specific API keys are included',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          iota: {
            ultralight: {
              mqtt: {
                protocol: 'mqtt',
                host: 'localhost',
                port: 1883
              }
            }
          },
          devices: [{
            schedule: 'once',
            device_id: 'DeviceId1',
            protocol: 'UltraLight::MQTT',
            attributes: [{
              object_id: 'a1',
              value: 1
            }]
          }]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no JSON HTTP IoT Agent configuration information is provided and ' +
       'JSON HTTP devices are included',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          iota: {
            json: {}
          },
          devices: [{
            schedule: 'once',
            device_id: 'DeviceId1',
            protocol: 'JSON::HTTP',
            api_key: 'the-api-key',
            attributes: [{
              object_id: 'a1',
              value: 1
            }]
          }]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no JSON HTTP protocol IoT Agent configuration information is provided ' +
       'and JSON HTTP devices are included',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          iota: {
            json: {
              http: {}
            }
          },
          devices: [{
            schedule: 'once',
            device_id: 'DeviceId1',
            protocol: 'JSON::HTTP',
            api_key: 'the-api-key',
            attributes: [{
              object_id: 'a1',
              value: 1
            }]
          }]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no JSON HTTP host IoT Agent configuration information is provided ' +
       'and JSON HTTP devices are included',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          iota: {
            json: {
              http: {
                protocol: 'http'
              }
            }
          },
          devices: [{
            schedule: 'once',
            device_id: 'DeviceId1',
            protocol: 'JSON::HTTP',
            api_key: 'the-api-key',
            attributes: [{
              object_id: 'a1',
              value: 1
            }]
          }]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no JSON HTTP port IoT Agent configuration information is provided ' +
       'and JSON HTTP devices are included',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          iota: {
            ultralight: {
              json: {
                protocol: 'http',
                host: 'localhost'
              }
            }
          },
          devices: [{
            schedule: 'once',
            device_id: 'DeviceId1',
            protocol: 'JSON::HTTP',
            api_key: 'the-api-key',
            attributes: [{
              object_id: 'a1',
              value: 1
            }]
          }]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no JSON API key IoT Agent configuration information is provided ' +
       'and JSON HTTP devices not specifying API keys are included',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          iota: {
            json: {
              http: {
                protocol: 'http',
                host: 'localhost',
                port: 8185
              }
            }
          },
          devices: [{
            schedule: 'once',
            device_id: 'DeviceId1',
            protocol: 'JSON::HTTP',
            attributes: [{
              object_id: 'a1',
              value: 1
            }]
          }]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no JSON IoT Agent configuration information is provided and ' +
       'JSON MQTT devices are included',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          iota: {},
          devices: [{
            schedule: 'once',
            device_id: 'DeviceId1',
            protocol: 'JSON::MQTT',
            api_key: 'the-api-key',
            attributes: [{
              object_id: 'a1',
              value: 1
            }]
          }]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no JSON MQTT IoT Agent configuration information is provided and ' +
       'JSON MQTT devices are included',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          iota: {
            json: {}
          },
          devices: [{
            schedule: 'once',
            device_id: 'DeviceId1',
            protocol: 'JSON::MQTT',
            api_key: 'the-api-key',
            attributes: [{
              object_id: 'a1',
              value: 1
            }]
          }]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no JSON MQTT protocol IoT Agent configuration information is ' +
       'provided and JSON MQTT devices are included',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          iota: {
            json: {
              mqtt: {}
            }
          },
          devices: [{
            schedule: 'once',
            device_id: 'DeviceId1',
            protocol: 'JSON::MQTT',
            api_key: 'the-api-key',
            attributes: [{
              object_id: 'a1',
              value: 1
            }]
          }]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no JSON MQTT host IoT Agent configuration information is ' +
       'provided and JSON MQTT devices are included',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          iota: {
            json: {
              mqtt: {
                protocol: 'mqtt'
              }
            }
          },
          devices: [{
            schedule: 'once',
            device_id: 'DeviceId1',
            protocol: 'JSON::MQTT',
            api_key: 'the-api-key',
            attributes: [{
              object_id: 'a1',
              value: 1
            }]
          }]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no JSON MQTT port IoT Agent configuration information is provided ' +
       'and JSON MQTT devices are included',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          iota: {
            json: {
              mqtt: {
                protocol: 'mqtt',
                host: 'localhost'
              }
            }
          },
          devices: [{
            schedule: 'once',
            device_id: 'DeviceId1',
            protocol: 'JSON::MQTT',
            api_key: 'the-api-key',
            attributes: [{
              object_id: 'a1',
              value: 1
            }]
          }]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no JSON API key IoT Agent configuration information is provided ' +
       'and JSON MQTT devices not specifying API keys are included',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          iota: {
            json: {
              mqtt: {
                protocol: 'mqtt',
                host: 'localhost',
                port: 1883
              }
            }
          },
          devices: [{
            schedule: 'once',
            device_id: 'DeviceId1',
            protocol: 'JSON::MQTT',
            attributes: [{
              object_id: 'a1',
              value: 1
            }]
          }]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if malformed entities configuration information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: {}
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if empty entities configuration information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: []
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no name or count configuration information is provided for entity',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {}
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no type configuration information is provided for entity',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              entity_name: 'EntityName'
            }
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no active and static attributes configuration information is provided for ' +
       'entity',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              entity_name: 'EntityName',
              entity_type: 'EntityType'
            }
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if malformed static attributes configuration information is provided for entity',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: {}
            }
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if empty static attributes configuration information is provided for entity',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: []
            }
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no name for static attributes configuration information is provided for ' +
       'entity',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: [{}]
            }
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no type for static attributes configuration information is provided for ' +
       'entity',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: [
                {
                  name: 'StaticName'
                }
              ]
            }
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no value for static attributes configuration information is provided for ' +
       'entity',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: [
                {
                  name: 'StaticName',
                  type: 'StaticType'
                }
              ]
            }
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if not valid schedule configuration information is provided for entity',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              schedule: 'invalid-entity-schedule',
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: [
                {
                  name: 'StaticName',
                  type: 'StaticType',
                  value: 'StaticValue'
                }
              ]
            }
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if not valid time-linear-interpolator value static attribute configuration ' +
      'information is provided for entity',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              schedule: 'once',
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: [
                {
                  name: 'StaticName',
                  type: 'StaticType',
                  value: 'time-linear-interpolator()'
                }
              ]
            }
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if not valid time-random-linear-interpolator value static attribute ' +
      'configuration information is provided for entity',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              schedule: 'once',
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: [
                {
                  name: 'StaticName',
                  type: 'StaticType',
                  value: 'time-random-linear-interpolator()'
                }
              ]
            }
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if not valid time-step-before-interpolator value static attribute ' +
      'configuration information is provided for entity',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              schedule: 'once',
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: [
                {
                  name: 'StaticName',
                  type: 'StaticType',
                  value: 'time-step-before-interpolator()'
                }
              ]
            }
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if not valid time-step-after-interpolator value static attribute ' +
      'configuration information is provided for entity',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              schedule: 'once',
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: [
                {
                  name: 'StaticName',
                  type: 'StaticType',
                  value: 'time-step-after-interpolator()'
                }
              ]
            }
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if not valid date-increment-interpolator value static attribute ' +
      'configuration information is provided for entity',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              schedule: 'once',
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: [
                {
                  name: 'StaticName',
                  type: 'StaticType',
                  value: 'date-increment-interpolator()'
                }
              ]
            }
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if not valid multiline-position-interpolator value static attribute ' +
      'configuration information is provided for entity',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              schedule: 'once',
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: [
                {
                  name: 'StaticName',
                  type: 'StaticType',
                  value: 'multiline-position-interpolator()'
                }
              ]
            }
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if not valid text-rotation-interpolator value static attribute ' +
      'configuration information is provided for entity',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              schedule: 'once',
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: [
                {
                  name: 'StaticName',
                  type: 'StaticType',
                  value: 'text-rotation-interpolator()'
                }
              ]
            }
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if not valid active attributes ' +
      'configuration information is provided for entity',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              schedule: 'once',
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: [
                {
                  name: 'StaticName',
                  type: 'StaticType',
                  value: 'StaticValue'
                }
              ],
              active: {}
            }
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no name active attribute configuration information is provided for entity',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              schedule: 'once',
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: [
                {
                  name: 'StaticName',
                  type: 'StaticType',
                  value: 'StaticValue'
                }
              ],
              active: [{}]
            }
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no type active attribute configuration information is provided for entity',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              schedule: 'once',
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: [
                {
                  name: 'StaticName',
                  type: 'StaticType',
                  value: 'StaticValue'
                }
              ],
              active: [
                {
                  name: 'ActiveName'
                }
              ]
            }
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no value active attribute configuration information is provided for entity',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              schedule: 'once',
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: [
                {
                  name: 'StaticName',
                  type: 'StaticType',
                  value: 'StaticValue'
                }
              ],
              active: [
                {
                  name: 'ActiveName',
                  type: 'ActiveType'
                }
              ]
            }
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if not valid time-linear-interpolator value active attribute configuration ' +
      'information is provided for entity',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              schedule: 'once',
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: [
                {
                  name: 'StaticName',
                  type: 'StaticType',
                  value: 'StaticValue'
                }
              ],
              active: [
                {
                  name: 'ActiveName',
                  type: 'ActiveType',
                  value: 'time-linear-interpolator()'
                }
              ]
            },
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if not valid time-random-linear-interpolator value active attribute ' +
      'configuration information is provided for entity',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              schedule: 'once',
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: [
                {
                  name: 'StaticName',
                  type: 'StaticType',
                  value: 'StaticValue'
                }
              ],
              active: [
                {
                  name: 'ActiveName',
                  type: 'ActiveType',
                  value: 'time-random-linear-interpolator()'
                }
              ]
            }
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if not valid time-step-before-interpolator value active attribute ' +
      'configuration information is provided for entity',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              schedule: 'once',
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: [
                {
                  name: 'StaticName',
                  type: 'StaticType',
                  value: 'StaticValue'
                }
              ],
              active: [
                {
                  name: 'ActiveName',
                  type: 'ActiveType',
                  value: 'time-step-before-interpolator()'
                }
              ]
            }
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if not valid time-step-after-interpolator value active attribute ' +
      'configuration information is provided for entity',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              schedule: 'once',
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: [
                {
                  name: 'StaticName',
                  type: 'StaticType',
                  value: 'StaticValue'
                }
              ],
              active: [
                {
                  name: 'ActiveName',
                  type: 'ActiveType',
                  value: 'time-step-after-interpolator()'
                }
              ]
            }
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if not valid date-increment-interpolator value active attribute ' +
      'configuration information is provided for entity',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              schedule: 'once',
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: [
                {
                  name: 'StaticName',
                  type: 'StaticType',
                  value: 'StaticValue'
                }
              ],
              active: [
                {
                  name: 'ActiveName',
                  type: 'ActiveType',
                  value: 'date-increment-interpolator()'
                }
              ]
            }
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if not valid multiline-position-interpolator value active attribute ' +
      'configuration information is provided for entity',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              schedule: 'once',
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: [
                {
                  name: 'StaticName',
                  type: 'StaticType',
                  value: 'StaticValue'
                }
              ],
              active: [
                {
                  name: 'ActiveName',
                  type: 'ActiveType',
                  value: 'multiline-position-interpolator()'
                }
              ]
            }
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if not valid text-rotation-interpolator value active attribute ' +
      'configuration information is provided for entity',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              schedule: 'once',
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: [
                {
                  name: 'StaticName',
                  type: 'StaticType',
                  value: 'StaticValue'
                }
              ],
              active: [
                {
                  name: 'ActiveName',
                  type: 'ActiveType',
                  value: 'text-rotation-interpolator()'
                }
              ]
            }
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if not valid schedule for active attribute ' +
      'configuration information is provided for entity',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              schedule: 'once',
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: [
                {
                  name: 'StaticName',
                  type: 'StaticType',
                  value: 'StaticValue'
                }
              ],
              active: [
                {
                  schedule: 'invalid-active-attribute-schedule',
                  name: 'ActiveName',
                  type: 'ActiveType',
                  value: 'time-linear-interpolator([[0,0],[12,0.5],[24,1]])'
                }
              ]
            }
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if malformed devices configuration information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              schedule: 'once',
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: [
                {
                  name: 'StaticName',
                  type: 'StaticType',
                  value: 'StaticValue'
                }
              ],
              active: [
                {
                  schedule: 'invalid-active-attribute-schedule',
                  name: 'ActiveName',
                  type: 'ActiveType',
                  value: 'time-linear-interpolator([[0,0],[12,0.5],[24,1]])'
                }
              ]
            }
          ],
          devices: {}
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if empty devices configuration information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              schedule: 'once',
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: [
                {
                  name: 'StaticName',
                  type: 'StaticType',
                  value: 'StaticValue'
                }
              ],
              active: [
                {
                  schedule: 'invalid-active-attribute-schedule',
                  name: 'ActiveName',
                  type: 'ActiveType',
                  value: 'time-linear-interpolator([[0,0],[12,0.5],[24,1]])'
                }
              ]
            }
          ],
          devices: []
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no id or count configuration information is provided for device',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              schedule: 'once',
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: [
                {
                  name: 'StaticName',
                  type: 'StaticType',
                  value: 'StaticValue'
                }
              ],
              active: [
                {
                  schedule: 'invalid-active-attribute-schedule',
                  name: 'ActiveName',
                  type: 'ActiveType',
                  value: 'time-linear-interpolator([[0,0],[12,0.5],[24,1]])'
                }
              ]
            }
          ],
          devices: [
            {}
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no protocol configuration information is provided for device',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              schedule: 'once',
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: [
                {
                  name: 'StaticName',
                  type: 'StaticType',
                  value: 'StaticValue'
                }
              ],
              active: [
                {
                  schedule: 'invalid-active-attribute-schedule',
                  name: 'ActiveName',
                  type: 'ActiveType',
                  value: 'time-linear-interpolator([[0,0],[12,0.5],[24,1]])'
                }
              ]
            }
          ],
          devices: [
            {
              device_id: 'DeviceId'
            }
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no api key configuration information is provided for device',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              schedule: 'once',
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: [
                {
                  name: 'StaticName',
                  type: 'StaticType',
                  value: 'StaticValue'
                }
              ],
              active: [
                {
                  schedule: 'invalid-active-attribute-schedule',
                  name: 'ActiveName',
                  type: 'ActiveType',
                  value: 'time-linear-interpolator([[0,0],[12,0.5],[24,1]])'
                }
              ]
            }
          ],
          devices: [
            {
              device_id: 'DeviceId',
              protocol: 'UltraLight::HTTP',
            }
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no attributes configuration information is provided for device',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              schedule: 'once',
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: [
                {
                  name: 'StaticName',
                  type: 'StaticType',
                  value: 'StaticValue'
                }
              ],
              active: [
                {
                  schedule: 'invalid-active-attribute-schedule',
                  name: 'ActiveName',
                  type: 'ActiveType',
                  value: 'time-linear-interpolator([[0,0],[12,0.5],[24,1]])'
                }
              ]
            }
          ],
          devices: [
            {
              device_id: 'DeviceId',
              protocol: 'UltraLight::HTTP',
              api_key: 'the-api-key'
            }
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if malformed attributes configuration information is provided for device',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              schedule: 'once',
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: [
                {
                  name: 'StaticName',
                  type: 'StaticType',
                  value: 'StaticValue'
                }
              ],
              active: [
                {
                  schedule: 'invalid-active-attribute-schedule',
                  name: 'ActiveName',
                  type: 'ActiveType',
                  value: 'time-linear-interpolator([[0,0],[12,0.5],[24,1]])'
                }
              ]
            }
          ],
          devices: [
            {
              device_id: 'DeviceId',
              protocol: 'UltraLight::HTTP',
              api_key: 'the-api-key',
              attributes: {}
            }
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if empty attributes configuration information is provided for device',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              schedule: 'once',
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: [
                {
                  name: 'StaticName',
                  type: 'StaticType',
                  value: 'StaticValue'
                }
              ],
              active: [
                {
                  schedule: 'invalid-active-attribute-schedule',
                  name: 'ActiveName',
                  type: 'ActiveType',
                  value: 'time-linear-interpolator([[0,0],[12,0.5],[24,1]])'
                }
              ]
            }
          ],
          devices: [
            {
              device_id: 'DeviceId',
              protocol: 'UltraLight::HTTP',
              api_key: 'the-api-key',
              attributes: []
            }
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no object id attributes configuration information is provided for device',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              schedule: 'once',
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: [
                {
                  name: 'StaticName',
                  type: 'StaticType',
                  value: 'StaticValue'
                }
              ],
              active: [
                {
                  schedule: 'invalid-active-attribute-schedule',
                  name: 'ActiveName',
                  type: 'ActiveType',
                  value: 'time-linear-interpolator([[0,0],[12,0.5],[24,1]])'
                }
              ]
            }
          ],
          devices: [
            {
              device_id: 'DeviceId',
              protocol: 'UltraLight::HTTP',
              api_key: 'the-api-key',
              attributes: [{}]
            }
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no value for attributes configuration information is provided for device',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              schedule: 'once',
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: [
                {
                  name: 'StaticName',
                  type: 'StaticType',
                  value: 'StaticValue'
                }
              ],
              active: [
                {
                  schedule: 'invalid-active-attribute-schedule',
                  name: 'ActiveName',
                  type: 'ActiveType',
                  value: 'time-linear-interpolator([[0,0],[12,0.5],[24,1]])'
                }
              ]
            }
          ],
          devices: [
            {
              device_id: 'DeviceId',
              protocol: 'UltraLight::HTTP',
              api_key: 'the-api-key',
              attributes: [{
                object_id: 'ObjectId'
              }]
            }
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if not valid schedule configuration information is provided for device',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              schedule: 'once',
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: [
                {
                  name: 'StaticName',
                  type: 'StaticType',
                  value: 'StaticValue'
                }
              ],
              active: [
                {
                  schedule: 'invalid-active-attribute-schedule',
                  name: 'ActiveName',
                  type: 'ActiveType',
                  value: 'time-linear-interpolator([[0,0],[12,0.5],[24,1]])'
                }
              ]
            }
          ],
          devices: [
            {
              schedule: 'invalid-entity-schedule',
              device_id: 'DeviceId',
              protocol: 'UltraLight::HTTP',
              api_key: 'the-api-key',
              attributes: [{
                object_id: 'ObjectId',
                value: 'ObjectValue'
              }]
            }
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if not valid time-linear-interpolator value attribute configuration ' +
      'information is provided for device',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              schedule: 'once',
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: [
                {
                  name: 'StaticName',
                  type: 'StaticType',
                  value: 'StaticValue'
                }
              ],
              active: [
                {
                  schedule: 'invalid-active-attribute-schedule',
                  name: 'ActiveName',
                  type: 'ActiveType',
                  value: 'time-linear-interpolator([[0,0],[12,0.5],[24,1]])'
                }
              ]
            }
          ],
          devices: [
            {
              schedule: 'once',
              device_id: 'DeviceId',
              protocol: 'UltraLight::HTTP',
              api_key: 'the-api-key',
              attributes: [{
                object_id: 'ObjectId',
                value: 'time-linear-interpolator()'
              }]
            }
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if not valid time-random-linear-interpolator value attribute ' +
      'configuration information is provided for device',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              schedule: 'once',
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: [
                {
                  name: 'StaticName',
                  type: 'StaticType',
                  value: 'StaticValue'
                }
              ],
              active: [
                {
                  schedule: 'invalid-active-attribute-schedule',
                  name: 'ActiveName',
                  type: 'ActiveType',
                  value: 'time-linear-interpolator([[0,0],[12,0.5],[24,1]])'
                }
              ]
            }
          ],
          devices: [
            {
              schedule: 'once',
              device_id: 'DeviceId',
              protocol: 'UltraLight::HTTP',
              api_key: 'the-api-key',
              attributes: [{
                object_id: 'ObjectId',
                value: 'time-random-linear-interpolator()'
              }]
            }
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if not valid time-step-before-interpolator value attribute ' +
      'configuration information is provided for device',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              schedule: 'once',
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: [
                {
                  name: 'StaticName',
                  type: 'StaticType',
                  value: 'StaticValue'
                }
              ],
              active: [
                {
                  schedule: 'invalid-active-attribute-schedule',
                  name: 'ActiveName',
                  type: 'ActiveType',
                  value: 'time-linear-interpolator([[0,0],[12,0.5],[24,1]])'
                }
              ]
            }
          ],
          devices: [
            {
              schedule: 'once',
              device_id: 'DeviceId',
              protocol: 'UltraLight::HTTP',
              api_key: 'the-api-key',
              attributes: [{
                object_id: 'ObjectId',
                value: 'time-step-before-interpolator()'
              }]
            }
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if not valid time-step-after-interpolator value attribute ' +
      'configuration information is provided for device',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              schedule: 'once',
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: [
                {
                  name: 'StaticName',
                  type: 'StaticType',
                  value: 'StaticValue'
                }
              ],
              active: [
                {
                  schedule: 'invalid-active-attribute-schedule',
                  name: 'ActiveName',
                  type: 'ActiveType',
                  value: 'time-linear-interpolator([[0,0],[12,0.5],[24,1]])'
                }
              ]
            }
          ],
          devices: [
            {
              schedule: 'once',
              device_id: 'DeviceId',
              protocol: 'UltraLight::HTTP',
              api_key: 'the-api-key',
              attributes: [{
                object_id: 'ObjectId',
                value: 'time-step-after-interpolator()'
              }]
            }
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if not valid date-increment-interpolator value attribute ' +
      'configuration information is provided for device',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              schedule: 'once',
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: [
                {
                  name: 'StaticName',
                  type: 'StaticType',
                  value: 'StaticValue'
                }
              ],
              active: [
                {
                  schedule: 'invalid-active-attribute-schedule',
                  name: 'ActiveName',
                  type: 'ActiveType',
                  value: 'time-linear-interpolator([[0,0],[12,0.5],[24,1]])'
                }
              ]
            }
          ],
          devices: [
            {
              schedule: 'once',
              device_id: 'DeviceId',
              protocol: 'UltraLight::HTTP',
              api_key: 'the-api-key',
              attributes: [{
                object_id: 'ObjectId',
                value: 'date-increment-interpolator()'
              }]
            }
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if not valid multiline-position-interpolator value attribute ' +
      'configuration information is provided for device',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              schedule: 'once',
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: [
                {
                  name: 'StaticName',
                  type: 'StaticType',
                  value: 'StaticValue'
                }
              ],
              active: [
                {
                  schedule: 'invalid-active-attribute-schedule',
                  name: 'ActiveName',
                  type: 'ActiveType',
                  value: 'time-linear-interpolator([[0,0],[12,0.5],[24,1]])'
                }
              ]
            }
          ],
          devices: [
            {
              schedule: 'once',
              device_id: 'DeviceId',
              protocol: 'UltraLight::HTTP',
              api_key: 'the-api-key',
              attributes: [{
                object_id: 'ObjectId',
                value: 'multiline-position-interpolator()'
              }]
            }
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if not valid text-rotation-interpolator value static attribute ' +
      'configuration information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              schedule: 'once',
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: [
                {
                  name: 'StaticName',
                  type: 'StaticType',
                  value: 'StaticValue'
                }
              ],
              active: [
                {
                  schedule: 'invalid-active-attribute-schedule',
                  name: 'ActiveName',
                  type: 'ActiveType',
                  value: 'time-linear-interpolator([[0,0],[12,0.5],[24,1]])'
                }
              ]
            }
          ],
          devices: [
            {
              schedule: 'once',
              device_id: 'DeviceId',
              protocol: 'UltraLight::HTTP',
              api_key: 'the-api-key',
              attributes: [{
                object_id: 'ObjectId',
                value: 'text-rotation-interpolator()'
              }]
            }
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if not valid schedule for attribute ' +
      'configuration information is provided for device',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          domain: {
            service: 'theService',
            subservice: '/theSubService'
          },
          contextBroker: {
            protocol: 'https',
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            protocol: 'https',
            host: 'localhost',
            port: 5001,
            user: 'theUser',
            password: 'thePassword'
          },
          entities: [
            {
              schedule: 'once',
              entity_name: 'EntityName',
              entity_type: 'EntityType',
              staticAttributes: [
                {
                  name: 'StaticName',
                  type: 'StaticType',
                  value: 'StaticValue'
                }
              ],
              active: [
                {
                  schedule: 'invalid-active-attribute-schedule',
                  name: 'ActiveName',
                  type: 'ActiveType',
                  value: 'time-linear-interpolator([[0,0],[12,0.5],[24,1]])'
                }
              ]
            }
          ],
          devices: [
            {
              schedule: 'once',
              device_id: 'DeviceId',
              protocol: 'UltraLight::HTTP',
              api_key: 'the-api-key',
              attributes: [{
                schedule: 'invalid-attribute-schedule',
                object_id: 'ObjectId',
                value: 'text-rotation-interpolator()'
              }]
            }
          ]
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    afterEach(function() {
      simulationProgress.removeAllListeners();
    });
  });

  describe('authorization', function() {
    beforeEach(function() {
      idm.post('/v3/auth/tokens').reply(
          function(uri, requestBody) {
            wellFormedTokenRequestCheck(simulationConfiguration, requestBody);
            return [
              503,
              'Service Unavailable'
            ];
          }
      );
    });

    it('should request an authorization token', function(done) {
      simulationProgress = fiwareDeviceSimulator.start(simulationConfiguration);
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.TokenNotAvailable);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should emit the "token-request", "error" and "end" event if the IDM is unavailable, but not the ' +
      '"token-response" event', function(done) {
      simulationProgress = fiwareDeviceSimulator.start(simulationConfiguration);
      simulationProgress.on('token-request', function(ev) {
        isTokenRequest = true;
        should.exist(ev.request);
      });
      simulationProgress.on('token-response', function() {
        isTokenResponse = true;
      });
      simulationProgress.on('error', function(ev) {
        isError = true;
        should(ev.error).instanceof(fdsErrors.TokenNotAvailable);
      });
      simulationProgress.on('end', function() {
        should(isTokenRequest).be.true();
        should(isTokenResponse).be.undefined();
        should(isError).be.true();
        done();
      });
    });

    afterEach(function() {
      nock.cleanAll();
      simulationProgress.removeAllListeners();
    });
  });

  describe('simulation', function() {
    var contextBroker,
        httpIoTA,
        mqttClient,
        mqttConnectStub,
        tokenResponseBody = require(ROOT_PATH + '/test/unit/messages/token-response-body.json'),
        tokenResponses = 0,
        updateRequests = 0,
        updateResponses = 0;

    /**
     * The simulation tests suite
     * @param  {String} type    The type of simulation. Possible values are: 'entities' and 'devices'
     * @param  {String} options Object including the "ngsiVersion" property if entities or the "protocol" property if
     *                          devices
     */
    function simulationTestSuite(type, options){
      beforeEach(function() {
        simulationConfiguration = require(ROOT_PATH + '/test/unit/configurations/simulation-configuration.json');

        idm.post('/v3/auth/tokens').reply(
          function(uri, requestBody) {
            wellFormedTokenRequestCheck(simulationConfiguration, requestBody);
            return [
              201,
              tokenResponseBody,
              {
                'X-Subject-Token': '829136fd6df6418880785016770d46e7'
              }
            ];
          }
        );

        if (options.ngsiVersion === '1.0') {
          contextBroker = nock(simulationConfiguration.contextBroker.protocol + '://' +
            simulationConfiguration.contextBroker.host + ':' + simulationConfiguration.contextBroker.port);
          contextBroker.post('/v1/updateContext').times(5).reply(
            function() {
              return [200];
            }
          );
        } else if (options.ngsiVersion === '2.0') {
          contextBroker = nock(simulationConfiguration.contextBroker.protocol + '://' +
            simulationConfiguration.contextBroker.host + ':' + simulationConfiguration.contextBroker.port);
          contextBroker.post('/v2/op/update').times(5).reply(
            function() {
              return [200];
            }
          );
        }

        if (options.protocol === 'UltraLight::HTTP') {
          httpIoTA = nock(simulationConfiguration.iota.ultralight.http.protocol + '://' +
            simulationConfiguration.iota.ultralight.http.host + ':' +
            simulationConfiguration.iota.ultralight.http.port);
          httpIoTA.post('/iot/d').query(true).times(5).reply(
            function() {
                return [200];
            }
          );
        } else if (options.protocol === 'UltraLight::MQTT') {
          mqttConnectStub = sinon.stub(mqtt, 'connect', function() {
            mqttClient = new EventEmitter();
            mqttClient.publish = function(topic, payload, callback) {
              callback();
            };
            setImmediate(function() {
              mqttClient.emit('connect');
            });
            return mqttClient;
          });
        } else if (options.protocol === 'JSON::HTTP') {
          httpIoTA = nock(simulationConfiguration.iota.json.http.protocol + '://' +
            simulationConfiguration.iota.json.http.host + ':' +
            simulationConfiguration.iota.json.http.port);
          httpIoTA.post('/iot/json').query(true).times(5).reply(
            function() {
                return [200];
            }
          );
        }
      });

      it('should update ' + (options.protocol ? options.protocol + ' ' : '') + type + ' once if scheduled at ' +
         'element level',
        function(done) {
        /* jshint camelcase: false */
        simulationConfiguration =
          require(ROOT_PATH + '/test/unit/configurations/simulation-configuration-' +
            (options.protocol ? options.protocol + '-' : '') +
            type + '-once.json');
        if (options.ngsiVersion) {
          simulationConfiguration.contextBroker.ngsiVersion = options.ngsiVersion;
        }
        fiwareDeviceSimulator.start(simulationConfiguration);
        simulationProgress.on('error', function(ev) {
          done(ev.error);
        });
        simulationProgress.on('token-response', function(ev) {
          ++tokenResponses;
          should(ev.expires_at.toISOString()).equal(tokenResponseBody.token.expires_at);
        });
        simulationProgress.on('update-request', function() {
          ++updateRequests;
        });
        simulationProgress.on('update-response', function() {
          ++updateResponses;
        });
        simulationProgress.on('end', function() {
          should(tokenResponses).equal(1);
          should(updateRequests).equal(1);
          should(updateResponses).equal(1);
          done();
        });
      });

      it('should update ' + (options.protocol ? options.protocol + ' ' : '') + type + ' once if scheduled at ' +
         'attribute level',
        function(done) {
        /* jshint camelcase: false */
        simulationConfiguration =
          require(ROOT_PATH + '/test/unit/configurations/simulation-configuration-' +
            (options.protocol ? options.protocol + '-' : '') +
            type + '-attribute-once.json');
        if (options.ngsiVersion) {
          simulationConfiguration.contextBroker.ngsiVersion = options.ngsiVersion;
        }
        fiwareDeviceSimulator.start(simulationConfiguration);
        simulationProgress.on('error', function(ev) {
          done(ev.error);
        });
        simulationProgress.on('token-response', function(ev) {
          ++tokenResponses;
          should(ev.expires_at.toISOString()).equal(tokenResponseBody.token.expires_at);
        });
        simulationProgress.on('update-request', function() {
          ++updateRequests;
        });
        simulationProgress.on('update-response', function() {
          ++updateResponses;
        });
        simulationProgress.on('end', function() {
          should(tokenResponses).equal(1);
          should(updateRequests).equal(1);
          should(updateResponses).equal(1);
          done();
        });
      });

      it('should update ' + (options.protocol ? options.protocol + ' ' : '') + type + ' every second if scheduled ' +
         'at entity level',
        function(done) {
        /* jshint camelcase: false */
        this.timeout(5000);
        simulationConfiguration =
          require(ROOT_PATH + '/test/unit/configurations/simulation-configuration-' +
            (options.protocol ? options.protocol + '-' : '') +
            type + '-every-second.json');
        if (options.ngsiVersion) {
          simulationConfiguration.contextBroker.ngsiVersion = options.ngsiVersion;
        }
        fiwareDeviceSimulator.start(simulationConfiguration);
        simulationProgress.on('error', function(ev) {
          done(ev.error);
        });
        simulationProgress.on('token-response', function(ev) {
          ++tokenResponses;
          should(ev.expires_at.toISOString()).equal(tokenResponseBody.token.expires_at);
        });
        simulationProgress.on('update-request', function() {
          ++updateRequests;
        });
        simulationProgress.on('update-response', function() {
          ++updateResponses;
          if (tokenResponses === 1 && updateRequests === 3 && updateResponses === 3) {
            fiwareDeviceSimulator.stop();
          }
        });
        simulationProgress.on('end', function() {
          done();
        });
      });

      it('should update ' + (options.protocol ? options.protocol + ' ' : '') + type + ' every second if scheduled ' +
         'at attribute level',
        function(done) {
        /* jshint camelcase: false */
        this.timeout(5000);
        simulationConfiguration =
          require(
            ROOT_PATH + '/test/unit/configurations/simulation-configuration-' +
              (options.protocol ? options.protocol + '-' : '') +
              type + '-attribute-every-second.json');
        if (options.ngsiVersion) {
          simulationConfiguration.contextBroker.ngsiVersion = options.ngsiVersion;
        }
        fiwareDeviceSimulator.start(simulationConfiguration);
        simulationProgress.on('error', function(ev) {
          done(ev.error);
        });
        simulationProgress.on('token-response', function(ev) {
          ++tokenResponses;
          should(ev.expires_at.toISOString()).equal(tokenResponseBody.token.expires_at);
        });
        simulationProgress.on('update-request', function() {
          ++updateRequests;
        });
        simulationProgress.on('update-response', function() {
          ++updateResponses;
          if (tokenResponses === 1 && updateRequests === 3 && updateResponses === 3) {
            fiwareDeviceSimulator.stop();
          }
        });
        simulationProgress.on('end', function() {
          done();
        });
      });

      it('should set fixed values of attributes once', function(done) {
        /* jshint camelcase: false */
        simulationConfiguration =
          require(ROOT_PATH + '/test/unit/configurations/simulation-configuration-' +
            (options.protocol ? options.protocol + '-' : '') +
            type + '-fixed-attribute.json');
        if (options.ngsiVersion) {
          simulationConfiguration.contextBroker.ngsiVersion = options.ngsiVersion;
        }
        fiwareDeviceSimulator.start(simulationConfiguration);
        simulationProgress.on('error', function(ev) {
          done(ev.error);
        });
        simulationProgress.on('token-response', function(ev) {
          ++tokenResponses;
          should(ev.expires_at.toISOString()).equal(tokenResponseBody.token.expires_at);
        });
        simulationProgress.on('update-request', function() {
          ++updateRequests;
        });
        simulationProgress.on('update-response', function(ev) {
          ++updateResponses;
          if (type === 'entities') {
            if (options.ngsiVersion === '1.0') {
              should(getAttributeValue(ev.request.body.contextElements, 'EntityName1', 'active1')).equal('1');
            } else if (options.ngsiVersion === '2.0') {
              should(ev.request.body.entities[0].active1.value).equal('1');
            }
          } else {
            if (options.protocol === 'UltraLight::HTTP') {
              should(ev.request.body.split('|')[1]).equal('1');
            } else if (options.protocol === 'UltraLight::MQTT') {
              should(ev.request.payload.split('|')[1]).equal('1');
            } else if (options.protocol === 'JSON::HTTP') {
              should(ev.request.body.attribute1).equal('1');
            } else if (options.protocol === 'JSON::MQTT') {
              should(JSON.parse(ev.request.payload).attribute1).equal('1');
            }
          }
        });
        simulationProgress.on('end', function() {
          should(tokenResponses).equal(1);
          should(updateRequests).equal(1);
          should(updateResponses).equal(1);
          done();
        });
      });

      it('should set time-linear-interpolator values of attributes once', function(done) {
        /* jshint camelcase: false */
        simulationConfiguration =
          require(ROOT_PATH +
            '/test/unit/configurations/simulation-configuration-' + (options.protocol ? options.protocol + '-' : '') +
            type +'-time-linear-interpolator-attribute.json');
        if (options.ngsiVersion) {
          simulationConfiguration.contextBroker.ngsiVersion = options.ngsiVersion;
        }
        fiwareDeviceSimulator.start(simulationConfiguration);
        simulationProgress.on('error', function(ev) {
          done(ev.error);
        });
        simulationProgress.on('token-response', function(ev) {
          ++tokenResponses;
          should(ev.expires_at.toISOString()).equal(tokenResponseBody.token.expires_at);
        });
        simulationProgress.on('update-request', function(ev) {
          ++updateRequests;
          var decimalHours = toDecimalHours(new Date());
          var attributeValue = (type === 'entities') ?
            simulationConfiguration[type][0].active[0].value :
            simulationConfiguration[type][0].attributes[0].value;
          var value = linearInterpolator(attributeValue.substring(
            'time-linear-interpolator('.length, attributeValue.length - 1))(decimalHours);
          if (type === 'entities') {
            if (options.ngsiVersion === '1.0') {
              should(getAttributeValue(ev.request.body.contextElements, 'EntityName1', 'active1')).equal(value);
            } else if (options.ngsiVersion === '2.0') {
              should(ev.request.body.entities[0].active1.value).equal(value);
            }
          } else {
            if (options.protocol === 'UltraLight::HTTP') {
              should(ev.request.body.split('|')[1]).equal(value.toString());
            } else if (options.protocol === 'UltraLight::MQTT') {
              should(ev.request.payload.split('|')[1]).equal(value.toString());
            } else if (options.protocol === 'JSON::HTTP') {
              should(ev.request.body.attribute1).equal(value);
            } else if (options.protocol === 'JSON::MQTT') {
              should(JSON.parse(ev.request.payload).attribute1).equal(value);
            }
          }
        });
        simulationProgress.on('update-response', function() {
          ++updateResponses;
        });
        simulationProgress.on('end', function() {
          should(tokenResponses).equal(1);
          should(updateRequests).equal(1);
          should(updateResponses).equal(1);
          done();
        });
      });

      it('should set time-random-linear-interpolator values of attributes once', function(done) {
        /* jshint camelcase: false */
        simulationConfiguration =
          require(ROOT_PATH +
            '/test/unit/configurations/simulation-configuration-' + (options.protocol ? options.protocol + '-' : '') +
            type + '-time-random-linear-interpolator-attribute.json');
        if (options.ngsiVersion) {
          simulationConfiguration.contextBroker.ngsiVersion = options.ngsiVersion;
        }
        fiwareDeviceSimulator.start(simulationConfiguration);
        simulationProgress.on('error', function(ev) {
          done(ev.error);
        });
        simulationProgress.on('token-response', function(ev) {
          ++tokenResponses;
          should(ev.expires_at.toISOString()).equal(tokenResponseBody.token.expires_at);
        });
        simulationProgress.on('update-request', function(ev) {
          ++updateRequests;
          if (type === 'entities') {
            if (options.ngsiVersion === '1.0') {
              should(getAttributeValue(ev.request.body.contextElements, 'EntityName1', 'active1')).
              lessThanOrEqual(0.75);
            } else if (options.ngsiVersion === '2.0') {
              should(ev.request.body.entities[0].active1.value).lessThanOrEqual(0.75);
            }
          } else {
            if (options.protocol === 'UltraLight::HTTP') {
              should(ev.request.body.split('|')[1]).lessThanOrEqual(0.75);
            } else if (options.protocol === 'UltraLight::MQTT') {
              should(ev.request.payload.split('|')[1]).lessThanOrEqual(0.75);
            } else if (options.protocol === 'JSON::HTTP') {
              should(ev.request.body.attribute1).lessThanOrEqual(0.75);
            } else if (options.protocol === 'JSON::MQTT') {
              should(JSON.parse(ev.request.payload).attribute1).lessThanOrEqual(0.75);
            }
          }
        });
        simulationProgress.on('update-response', function() {
          ++updateResponses;
        });
        simulationProgress.on('end', function() {
          should(tokenResponses).equal(1);
          should(updateRequests).equal(1);
          should(updateResponses).equal(1);
          done();
        });
      });

      it('should set time-step-before-interpolator values of attributes once', function(done) {
        /* jshint camelcase: false */
        simulationConfiguration =
          require(ROOT_PATH +
            '/test/unit/configurations/simulation-configuration-' + (options.protocol ? options.protocol + '-' : '') +
            type + '-time-step-before-interpolator-attribute.json');
        if (options.ngsiVersion) {
          simulationConfiguration.contextBroker.ngsiVersion = options.ngsiVersion;
        }
        fiwareDeviceSimulator.start(simulationConfiguration);
        simulationProgress.on('error', function(ev) {
          done(ev.error);
        });
        simulationProgress.on('token-response', function(ev) {
          ++tokenResponses;
          should(ev.expires_at.toISOString()).equal(tokenResponseBody.token.expires_at);
        });
        simulationProgress.on('update-request', function(ev) {
          ++updateRequests;
          var decimalHours = toDecimalHours(new Date());
          var attributeValue = (type === 'entities') ?
            simulationConfiguration[type][0].active[0].value :
            simulationConfiguration[type][0].attributes[0].value;
          var value = stepBeforeInterpolator(attributeValue.substring(
            'time-step-before-interpolator('.length, attributeValue.length - 1))(decimalHours);
          if (type === 'entities') {
            if (options.ngsiVersion === '1.0') {
              should(getAttributeValue(ev.request.body.contextElements, 'EntityName1', 'active1')).equal(value);
            } else if (options.ngsiVersion === '2.0') {
              should(ev.request.body.entities[0].active1.value).equal(value);
            }
          } else {
            if (options.protocol === 'UltraLight::HTTP') {
              should(ev.request.body.split('|')[1]).equal(value.toString());
            } else if (options.protocol === 'UltraLight::MQTT') {
              should(ev.request.payload.split('|')[1]).equal(value.toString());
            } else if (options.protocol === 'JSON::HTTP') {
              should(ev.request.body.attribute1).equal(value);
            } else if (options.protocol === 'JSON::MQTT') {
              should(JSON.parse(ev.request.payload).attribute1).equal(value);
            }
          }
        });
        simulationProgress.on('update-response', function() {
          ++updateResponses;
        });
        simulationProgress.on('end', function() {
          should(tokenResponses).equal(1);
          should(updateRequests).equal(1);
          should(updateResponses).equal(1);
          done();
        });
      });

      it('should set time-step-after-interpolator values of attributes once', function(done) {
        /* jshint camelcase: false */
        simulationConfiguration =
          require(ROOT_PATH +
            '/test/unit/configurations/simulation-configuration-' + (options.protocol ? options.protocol + '-' : '') +
            type + '-time-step-after-interpolator-attribute.json');
        if (options.ngsiVersion) {
          simulationConfiguration.contextBroker.ngsiVersion = options.ngsiVersion;
        }
        fiwareDeviceSimulator.start(simulationConfiguration);
        simulationProgress.on('error', function(ev) {
          done(ev.error);
        });
        simulationProgress.on('token-response', function(ev) {
          ++tokenResponses;
          should(ev.expires_at.toISOString()).equal(tokenResponseBody.token.expires_at);
        });
        simulationProgress.on('update-request', function(ev) {
          ++updateRequests;
          var decimalHours = toDecimalHours(new Date());
          var attributeValue = (type === 'entities') ?
            simulationConfiguration[type][0].active[0].value :
            simulationConfiguration[type][0].attributes[0].value;
          var value = stepAfterInterpolator(attributeValue.substring(
            'time-step-after-interpolator('.length, attributeValue.length - 1))(decimalHours);
          if (type === 'entities') {
            if (options.ngsiVersion === '1.0') {
              should(getAttributeValue(ev.request.body.contextElements, 'EntityName1', 'active1')).equal(value);
            } else if (options.ngsiVersion === '2.0') {
              should(ev.request.body.entities[0].active1.value).equal(value);
            }
          } else {
            if (options.protocol === 'UltraLight::HTTP') {
              should(ev.request.body.split('|')[1]).equal(value.toString());
            } else if (options.protocol === 'UltraLight::MQTT') {
              should(ev.request.payload.split('|')[1]).equal(value.toString());
            } else if (options.protocol === 'JSON::HTTP') {
              should(ev.request.body.attribute1).equal(value);
            } else if (options.protocol === 'JSON::MQTT') {
              should(JSON.parse(ev.request.payload).attribute1).equal(value);
            }
          }
        });
        simulationProgress.on('update-response', function() {
          ++updateResponses;
        });
        simulationProgress.on('end', function() {
          should(tokenResponses).equal(1);
          should(updateRequests).equal(1);
          should(updateResponses).equal(1);
          done();
        });
      });

      it('should set date-increment-interpolator values of attributes once', function(done) {
        /* jshint camelcase: false */
        simulationConfiguration =
          require(ROOT_PATH +
            '/test/unit/configurations/simulation-configuration-' + (options.protocol ? options.protocol + '-' : '') +
            type + '-date-increment-interpolator-attribute.json');
        if (options.ngsiVersion) {
          simulationConfiguration.contextBroker.ngsiVersion = options.ngsiVersion;
        }
        fiwareDeviceSimulator.start(simulationConfiguration);
        simulationProgress.on('error', function(ev) {
          done(ev.error);
        });
        simulationProgress.on('token-response', function(ev) {
          ++tokenResponses;
          should(ev.expires_at.toISOString()).equal(tokenResponseBody.token.expires_at);
        });
        simulationProgress.on('update-request', function(ev) {
          ++updateRequests;
          var decimalHours = toDecimalHours(new Date());
          var attributeValue = (type === 'entities') ?
            simulationConfiguration[type][0].active[0].value :
            simulationConfiguration[type][0].attributes[0].value;
          var value = dateIncrementInterpolator(attributeValue.substring(
            'date-increment-interpolator('.length, attributeValue.length - 1))(decimalHours);
          if (type === 'entities') {
            if (options.ngsiVersion === '1.0') {
              should(getAttributeValue(ev.request.body.contextElements, 'EntityName1', 'active1').substring(0, 20)).
                equal(value.substring(0, 20));
            } else if (options.ngsiVersion === '2.0') {
              should(ev.request.body.entities[0].active1.value.substring(0, 20)).equal(value.substring(0, 20));
            }
          } else {
            if (options.protocol === 'UltraLight::HTTP') {
              should(ev.request.body.split('|')[1].substring(0, 20)).equal(value.substring(0, 20));
            } else if (options.protocol === 'UltraLight::MQTT') {
              should(ev.request.payload.split('|')[1].substring(0, 20)).equal(value.substring(0, 20));
            } else if (options.protocol === 'JSON::HTTP') {
              should(ev.request.body.attribute1.substring(0, 20)).equal(value.substring(0, 20));
            } else if (options.protocol === 'JSON::MQTT') {
              should(JSON.parse(ev.request.payload).attribute1.substring(0, 20)).equal(value.substring(0, 20));
            }
          }
        });
        simulationProgress.on('update-response', function() {
          ++updateResponses;
        });
        simulationProgress.on('end', function() {
          should(tokenResponses).equal(1);
          should(updateRequests).equal(1);
          should(updateResponses).equal(1);
          done();
        });
      });

      it('should set multiline-position-interpolator values of attributes once', function(done) {
        /* jshint camelcase: false */
        simulationConfiguration =
          require(ROOT_PATH +
            '/test/unit/configurations/simulation-configuration-' + (options.protocol ? options.protocol + '-' : '') +
            type + '-multiline-position-interpolator-attribute.json');
        if (options.ngsiVersion) {
          simulationConfiguration.contextBroker.ngsiVersion = options.ngsiVersion;
        }
        fiwareDeviceSimulator.start(simulationConfiguration);
        simulationProgress.on('error', function(ev) {
          done(ev.error);
        });
        simulationProgress.on('token-response', function(ev) {
          ++tokenResponses;
          should(ev.expires_at.toISOString()).equal(tokenResponseBody.token.expires_at);
        });
        simulationProgress.on('update-request', function(ev) {
          ++updateRequests;
          var decimalHours = toDecimalHours(new Date());
          var attributeValue = (type === 'entities') ?
            simulationConfiguration[type][0].active[0].value :
            simulationConfiguration[type][0].attributes[0].value;
          var value = multilinePositionInterpolator(attributeValue.substring(
            'multiline-position-interpolator('.length, attributeValue.length - 1))(decimalHours);
          if (type === 'entities') {
            if (options.ngsiVersion === '1.0') {
              should(getAttributeValue(ev.request.body.contextElements, 'EntityName1', 'active1')).eql(value);
            } else if (options.ngsiVersion === '2.0') {
              should(ev.request.body.entities[0].active1.value).eql(value);
            }
          } else {
            if (options.protocol === 'UltraLight::HTTP') {
              should(ev.request.body.split('|')[1]).eql(value.toString());
              // var valueObj = JSON.parse(ev.request.body.split('|')[1]);
              // should(valueObj.type).equal('Point');
              // should(valueObj.coordinates).be.an.Array();
            } else if (options.protocol === 'UltraLight::MQTT') {
              should(ev.request.payload.split('|')[1]).eql(value.toString());
              // var valueObj = JSON.parse(ev.request.body.split('|')[1]);
              // should(valueObj.type).equal('Point');
              // should(valueObj.coordinates).be.an.Array();
            } else if (options.protocol === 'JSON::HTTP') {
              should(ev.request.body.attribute1).eql(value);
              // var valueObj = JSON.parse(ev.request.body.attribute1);
              // should(valueObj.type).equal('Point');
              // should(valueObj.coordinates).be.an.Array();
            } else if (options.protocol === 'JSON::MQTT') {
              should(JSON.parse(ev.request.payload).attribute1).eql(value);
              // var valueObj = JSON.parse(ev.request.body.attribute1);
              // should(valueObj.type).equal('Point');
              // should(valueObj.coordinates).be.an.Array();
            }
          }
        });
        simulationProgress.on('update-response', function() {
          ++updateResponses;
        });
        simulationProgress.on('end', function() {
          should(tokenResponses).equal(1);
          should(updateRequests).equal(1);
          should(updateResponses).equal(1);
          done();
        });
      });

      it('should set text-rotation-interpolator values of attributes once', function(done) {
        /* jshint camelcase: false */
        simulationConfiguration =
          require(ROOT_PATH +
            '/test/unit/configurations/simulation-configuration-' + (options.protocol ? options.protocol + '-' : '') +
            type + '-text-rotation-interpolator-attribute.json');
        if (options.ngsiVersion) {
          simulationConfiguration.contextBroker.ngsiVersion = options.ngsiVersion;
        }
        fiwareDeviceSimulator.start(simulationConfiguration);
        simulationProgress.on('error', function(ev) {
          done(ev.error);
        });
        simulationProgress.on('token-response', function(ev) {
          ++tokenResponses;
          should(ev.expires_at.toISOString()).equal(tokenResponseBody.token.expires_at);
        });
        simulationProgress.on('update-request', function(ev) {
          ++updateRequests;
          var now = new Date();
          var attributeValue = (type === 'entities') ?
            simulationConfiguration[type][0].active[0].value :
            simulationConfiguration[type][0].attributes[0].value;
          var value = textRotationInterpolator(attributeValue.substring(
            'text-rotation-interpolator('.length, attributeValue.length - 1))(now);
          if (type === 'entities') {
            if (options.ngsiVersion === '1.0') {
              should(getAttributeValue(ev.request.body.contextElements, 'EntityName1', 'active1')).eql(value);
            } else if (options.ngsiVersion === '2.0') {
              should(ev.request.body.entities[0].active1.value).eql(value);
            }
          } else {
            if (options.protocol === 'UltraLight::HTTP') {
              should(ev.request.body.split('|')[1]).eql(value.toString());
            } else if (options.protocol === 'UltraLight::MQTT') {
              should(ev.request.payload.split('|')[1]).eql(value.toString());
            } else if (options.protocol === 'JSON::HTTP') {
              should(ev.request.body.attribute1).eql(value.toString());
            } else if (options.protocol === 'JSON::MQTT') {
              should(JSON.parse(ev.request.payload).attribute1).eql(value.toString());
            }
          }
        });
        simulationProgress.on('update-response', function() {
          ++updateResponses;
        });
        simulationProgress.on('end', function() {
          should(tokenResponses).equal(1);
          should(updateRequests).equal(1);
          should(updateResponses).equal(1);
          done();
        });
      });

      afterEach(function() {
        tokenResponses = 0;
        updateRequests = 0;
        updateResponses = 0;
        nock.cleanAll();
        if (simulationProgress) {
          simulationProgress.removeAllListeners();
        }
        if (mqttClient) {
          mqttClient.removeAllListeners();
          mqttClient = null;
        }
        if (mqttConnectStub) {
          mqttConnectStub.restore();
          mqttConnectStub = null;
        }
      });
    }

    describe('Entities update via NGSI v1.0', simulationTestSuite.bind(null, 'entities', {ngsiVersion: '1.0'}));

    describe('Entities update via NGSI v2.0', simulationTestSuite.bind(null, 'entities', {ngsiVersion: '2.0'}));

    describe('UltraLight HTTP devices', simulationTestSuite.bind(null, 'devices', {protocol: 'UltraLight::HTTP'}));

    describe('UltraLight MQTT devices', simulationTestSuite.bind(null, 'devices', {protocol: 'UltraLight::MQTT'}));

    describe('JSON HTTP devices', simulationTestSuite.bind(null, 'devices', {protocol: 'JSON::HTTP'}));

    describe('JSON MQTT devices', simulationTestSuite.bind(null, 'devices', {protocol: 'JSON::MQTT'}));
  });
});
