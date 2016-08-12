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
var nock = require('nock');
var should = require('should');
var linearInterpolator = require(ROOT_PATH + '/lib/interpolators/linearInterpolator');
var stepBeforeInterpolator  = require(ROOT_PATH + '/lib/interpolators/stepBeforeInterpolator');
var stepAfterInterpolator  = require(ROOT_PATH + '/lib/interpolators/stepAfterInterpolator');
var dateIncrementInterpolator  = require(ROOT_PATH + '/lib/interpolators/dateIncrementInterpolator');
var multilinePositionInterpolator  = require(ROOT_PATH + '/lib/interpolators/multilinePositionInterpolator');
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
  should(requestBody.auth.identity.password.user.domain.name).equal(simulationConfiguration.authentication.service);
  should(requestBody.auth.identity.password.user.name).equal(simulationConfiguration.authentication.user);
  should(requestBody.auth.identity.password.user.password).equal(simulationConfiguration.authentication.password);
  should(requestBody.auth.scope.project.domain.name).equal(simulationConfiguration.authentication.service);
  should(requestBody.auth.scope.project.name).equal(simulationConfiguration.authentication.subservice);
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

  idm = nock('https://' + simulationConfiguration.authentication.host + ':' +
    simulationConfiguration.authentication.port);

  describe('simulation configuration validation', function() {
    it('should notify an "error" event if no context broker configuration information is provided', function(done) {
      simulationProgress = fiwareDeviceSimulator.start({});
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no host context broker configuration information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          contextBroker: {}
        }
      );
      simulationProgress.on('error', function(ev) {
        should(ev.error).instanceof(fdsErrors.SimulationConfigurationNotValid);
      });
      simulationProgress.on('end', function() {
        done();
      });
    });

    it('should notify an "error" event if no port context broker configuration information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          contextBroker: {
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

    it('should notify an "error" event if no NGSI version context broker configuration information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          contextBroker: {
            host: 'localhost',
            port: '1026'
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
          contextBroker: {
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
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
          contextBroker: {
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
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

    it('should notify an "error" event if no service authentication configuration information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          contextBroker: {
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
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

    it('should notify an "error" event if no subservice authentication configuration information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          contextBroker: {
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            host: 'localhost',
            port: 5001,
            service: 'theservice'
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
          contextBroker: {
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            host: 'localhost',
            port: 5001,
            service: 'theservice',
            subservice: '/theSubService'
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
          contextBroker: {
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            host: 'localhost',
            port: 5001,
            service: 'theservice',
            subservice: '/theSubService',
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

    it('should notify an "error" event if malformed entities configuration information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          contextBroker: {
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            host: 'localhost',
            port: 5001,
            service: 'theservice',
            subservice: '/theSubService',
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
          contextBroker: {
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            host: 'localhost',
            port: 5001,
            service: 'theservice',
            subservice: '/theSubService',
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

    it('should notify an "error" event if no entity name or entities count configuration information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          contextBroker: {
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            host: 'localhost',
            port: 5001,
            service: 'theservice',
            subservice: '/theSubService',
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

    it('should notify an "error" event if no entity type configuration information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          contextBroker: {
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            host: 'localhost',
            port: 5001,
            service: 'theservice',
            subservice: '/theSubService',
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

    it('should notify an "error" event if no active and static attributes configuration information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          contextBroker: {
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            host: 'localhost',
            port: 5001,
            service: 'theservice',
            subservice: '/theSubService',
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

    it('should notify an "error" event if malformed static attributes configuration information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          contextBroker: {
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            host: 'localhost',
            port: 5001,
            service: 'theservice',
            subservice: '/theSubService',
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

    it('should notify an "error" event if empty static attributes configuration information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          contextBroker: {
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            host: 'localhost',
            port: 5001,
            service: 'theservice',
            subservice: '/theSubService',
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

    it('should notify an "error" event if no name for static attributes configuration information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          contextBroker: {
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            host: 'localhost',
            port: 5001,
            service: 'theservice',
            subservice: '/theSubService',
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

    it('should notify an "error" event if no type for static attributes configuration information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          contextBroker: {
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            host: 'localhost',
            port: 5001,
            service: 'theservice',
            subservice: '/theSubService',
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

    it('should notify an "error" event if no value for static attributes configuration information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          contextBroker: {
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            host: 'localhost',
            port: 5001,
            service: 'theservice',
            subservice: '/theSubService',
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

    it('should notify an "error" event if not valid schedule entity configuration information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          contextBroker: {
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            host: 'localhost',
            port: 5001,
            service: 'theservice',
            subservice: '/theSubService',
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
      'information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          contextBroker: {
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            host: 'localhost',
            port: 5001,
            service: 'theservice',
            subservice: '/theSubService',
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
      'configuration information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          contextBroker: {
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            host: 'localhost',
            port: 5001,
            service: 'theservice',
            subservice: '/theSubService',
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
      'configuration information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          contextBroker: {
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            host: 'localhost',
            port: 5001,
            service: 'theservice',
            subservice: '/theSubService',
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
      'configuration information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          contextBroker: {
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            host: 'localhost',
            port: 5001,
            service: 'theservice',
            subservice: '/theSubService',
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
      'configuration information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          contextBroker: {
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            host: 'localhost',
            port: 5001,
            service: 'theservice',
            subservice: '/theSubService',
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
      'configuration information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          contextBroker: {
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            host: 'localhost',
            port: 5001,
            service: 'theservice',
            subservice: '/theSubService',
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

    it('should notify an "error" event if not valid active attributes ' +
      'configuration information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          contextBroker: {
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            host: 'localhost',
            port: 5001,
            service: 'theservice',
            subservice: '/theSubService',
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

    it('should notify an "error" event if no name active attribute configuration information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          contextBroker: {
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            host: 'localhost',
            port: 5001,
            service: 'theservice',
            subservice: '/theSubService',
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

    it('should notify an "error" event if no type active attribute configuration information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          contextBroker: {
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            host: 'localhost',
            port: 5001,
            service: 'theservice',
            subservice: '/theSubService',
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

    it('should notify an "error" event if no value active attribute configuration information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          contextBroker: {
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            host: 'localhost',
            port: 5001,
            service: 'theservice',
            subservice: '/theSubService',
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
      'information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          contextBroker: {
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            host: 'localhost',
            port: 5001,
            service: 'theservice',
            subservice: '/theSubService',
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
      'configuration information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          contextBroker: {
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            host: 'localhost',
            port: 5001,
            service: 'theservice',
            subservice: '/theSubService',
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
      'configuration information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          contextBroker: {
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            host: 'localhost',
            port: 5001,
            service: 'theservice',
            subservice: '/theSubService',
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
      'configuration information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          contextBroker: {
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            host: 'localhost',
            port: 5001,
            service: 'theservice',
            subservice: '/theSubService',
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
      'configuration information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          contextBroker: {
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            host: 'localhost',
            port: 5001,
            service: 'theservice',
            subservice: '/theSubService',
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
      'configuration information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          contextBroker: {
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            host: 'localhost',
            port: 5001,
            service: 'theservice',
            subservice: '/theSubService',
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

    it('should notify an "error" event if not valid schedule for active attribute ' +
      'configuration information is provided',
      function(done) {
      simulationProgress = fiwareDeviceSimulator.start(
        {
          contextBroker: {
            host: 'localhost',
            port: '1026',
            ngsiVersion: '1.0'
          },
          authentication: {
            host: 'localhost',
            port: 5001,
            service: 'theservice',
            subservice: '/theSubService',
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
        isError = true;
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
        tokenResponseBody = require(ROOT_PATH + '/test/unit/messages/token-response-body.json'),
        tokenResponses = 0,
        updateRequests = 0,
        updateResponses = 0;

    /**
     * The simulation tests suite
     * @param  {String} ngsiVersion The NGSI version
     * @param  {String} type        The type of simulation. Possible values are: 'entities' and 'devices'
     */
    function simulationTestSuite(ngsiVersion, type){
      beforeEach(function() {
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

        if (ngsiVersion === '1.0') {
          contextBroker = nock('https://' + simulationConfiguration.contextBroker.host + ':' +
            simulationConfiguration.contextBroker.port);
          contextBroker.post('/v1/updateContext').times(5).reply(
            function() {
              return [200];
            }
          );
        } else if (ngsiVersion === '2.0') {
          contextBroker = nock('https://' + simulationConfiguration.contextBroker.host + ':' +
            simulationConfiguration.contextBroker.port);
          contextBroker.post('/v2/op/update').times(5).reply(
            function() {
              return [200];
            }
          );
        }
      });

      it('should update ' + type + ' once if scheduled at entity level', function(done) {
        /* jshint camelcase: false */
        simulationConfiguration =
          require(ROOT_PATH + '/test/unit/configurations/simulation-configuration-' + type + '-once.json');
        simulationConfiguration.contextBroker.ngsiVersion = ngsiVersion;
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

      it('should update ' + type + ' once if scheduled at attribute level', function(done) {
        /* jshint camelcase: false */
        simulationConfiguration =
          require(ROOT_PATH + '/test/unit/configurations/simulation-configuration-' + type + '-attribute-once.json');
        simulationConfiguration.contextBroker.ngsiVersion = ngsiVersion;
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

      it('should update ' + type + ' every second if scheduled at entity level', function(done) {
        /* jshint camelcase: false */
        this.timeout(5000);
        simulationConfiguration =
          require(ROOT_PATH + '/test/unit/configurations/simulation-configuration-' + type + '-every-second.json');
        simulationConfiguration.contextBroker.ngsiVersion = ngsiVersion;
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

      it('should update ' + type + ' every second if scheduled at attribute level', function(done) {
        /* jshint camelcase: false */
        this.timeout(5000);
        simulationConfiguration =
          require(
            ROOT_PATH + '/test/unit/configurations/simulation-configuration-' + type + '-attribute-every-second.json');
        simulationConfiguration.contextBroker.ngsiVersion = ngsiVersion;
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
          require(ROOT_PATH + '/test/unit/configurations/simulation-configuration-' + type + '-fixed-attribute.json');
        simulationConfiguration.contextBroker.ngsiVersion = ngsiVersion;
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
          if (ngsiVersion === '1.0') {
            should(getAttributeValue(ev.request.body.contextElements, 'EntityName1', 'active1')).equal('1');
          } else if (ngsiVersion === '2.0') {
            should(ev.request.body.entities[0].active1.value).equal('1');
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
            '/test/unit/configurations/simulation-configuration-' + type + '-time-linear-interpolator-attribute.json');
        simulationConfiguration.contextBroker.ngsiVersion = ngsiVersion;
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
          var value = linearInterpolator(simulationConfiguration[type][0].active[0].value.substring(
            'time-linear-interpolator('.length, simulationConfiguration[type][0].active[0].value.length - 1))(
              decimalHours);
          if (ngsiVersion === '1.0') {
            should(getAttributeValue(ev.request.body.contextElements, 'EntityName1', 'active1')).equal(value);
          } else if (ngsiVersion === '2.0') {
            should(ev.request.body.entities[0].active1.value).equal(value);
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
            '/test/unit/configurations/simulation-configuration-' + type +
            '-time-random-linear-interpolator-attribute.json');
        simulationConfiguration.contextBroker.ngsiVersion = ngsiVersion;
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
          if (ngsiVersion === '1.0') {
            should(getAttributeValue(ev.request.body.contextElements, 'EntityName1', 'active1')).
              lessThanOrEqual(0.75);
          } else if (ngsiVersion === '2.0') {
            should(ev.request.body.entities[0].active1.value).lessThanOrEqual(0.75);
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
            '/test/unit/configurations/simulation-configuration-' + type +
            '-time-step-before-interpolator-attribute.json');
        simulationConfiguration.contextBroker.ngsiVersion = ngsiVersion;
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
          var value = stepBeforeInterpolator(simulationConfiguration[type][0].active[0].value.substring(
            'time-step-before-interpolator('.length, simulationConfiguration[type][0].active[0].value.length - 1))(
              decimalHours);
          if (ngsiVersion === '1.0') {
            should(getAttributeValue(ev.request.body.contextElements, 'EntityName1', 'active1')).equal(value);
          } else if (ngsiVersion === '2.0') {
            should(ev.request.body.entities[0].active1.value).equal(value);
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
            '/test/unit/configurations/simulation-configuration-' + type +
            '-time-step-after-interpolator-attribute.json');
        simulationConfiguration.contextBroker.ngsiVersion = ngsiVersion;
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
          var value = stepAfterInterpolator(simulationConfiguration[type][0].active[0].value.substring(
            'time-step-after-interpolator('.length, simulationConfiguration[type][0].active[0].value.length - 1))(
              decimalHours);
          if (ngsiVersion === '1.0') {
            should(getAttributeValue(ev.request.body.contextElements, 'EntityName1', 'active1')).equal(value);
          } else if (ngsiVersion === '2.0') {
            should(ev.request.body.entities[0].active1.value).equal(value);
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
            '/test/unit/configurations/simulation-configuration-' + type +
            '-date-increment-interpolator-attribute.json');
        simulationConfiguration.contextBroker.ngsiVersion = ngsiVersion;
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
          var value = dateIncrementInterpolator(simulationConfiguration[type][0].active[0].value.substring(
            'date-increment-interpolator('.length, simulationConfiguration[type][0].active[0].value.length - 1))(
              decimalHours);
          if (ngsiVersion === '1.0') {
            should(getAttributeValue(ev.request.body.contextElements, 'EntityName1', 'active1').substring(0, 20)).equal(
              value.substring(0, 20));
          } else if (ngsiVersion === '2.0') {
            should(ev.request.body.entities[0].active1.value.substring(0, 20)).equal(value.substring(0, 20));
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
            '/test/unit/configurations/simulation-configuration-' + type +
            '-multiline-position-interpolator-attribute.json');
        simulationConfiguration.contextBroker.ngsiVersion = ngsiVersion;
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
          var value = multilinePositionInterpolator(simulationConfiguration[type][0].active[0].value.substring(
            'multiline-position-interpolator('.length, simulationConfiguration[type][0].active[0].value.length - 1))(
              decimalHours);
          if (ngsiVersion === '1.0') {
            should(getAttributeValue(ev.request.body.contextElements, 'EntityName1', 'active1')).eql(value);
          } else if (ngsiVersion === '2.0') {
            should(ev.request.body.entities[0].active1.value).eql(value);
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
        simulationProgress.removeAllListeners();
      });
    }

    describe('Entities update via NGSI v1.0', simulationTestSuite.bind(null, '1.0', 'entities'));

    describe('Entities update via NGSI v2.0', simulationTestSuite.bind(null, '2.0', 'entities'));

    describe('Devices update via NGSI v1.0', simulationTestSuite.bind(null, '1.0', 'devices'));

    describe('Devices update via NGSI v2.0', simulationTestSuite.bind(null, '2.0', 'devices'));
  });
});
