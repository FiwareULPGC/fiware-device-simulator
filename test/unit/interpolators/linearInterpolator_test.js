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

var should = require('should');

var ROOT_PATH = require('app-root-path');
var fdsErrors = require(ROOT_PATH + '/lib/errors/fdsErrors');
var linearInterpolator = require(ROOT_PATH + '/lib/interpolators/linearInterpolator');

describe('linearInterpolator tests', function() {
  var linearInterpolatorFunction;

  it('should throw an error if a number is passed instead of a valid interpolation array', function(done) {
    try {
      linearInterpolatorFunction = linearInterpolator(666);
      done(new Error('It should throw an InvalidInterpolationSpec error'));
    } catch(exception) {
      should(exception).be.an.instanceof(fdsErrors.InvalidInterpolationSpec);
      done();
    }
  });

  it('should throw an error if a one level hierarchy array is passed instead of a valid interpolation array',
    function(done) {
      try {
        linearInterpolatorFunction = linearInterpolator([1, 2, 3]);
        done(new Error('It should throw an InvalidInterpolationSpec error'));
      } catch(exception) {
        should(exception).be.an.instanceof(fdsErrors.InvalidInterpolationSpec);
        done();
      }
    }
  );

  it('should throw an error if a 2 level hierarchy array with one cardinality is passed instead of a ' +
     'valid interpolation array', function(done) {
    try {
      linearInterpolatorFunction = linearInterpolator([[1], [2], [3]]);
      done(new Error('It should throw an InvalidInterpolationSpec error'));
    } catch(exception) {
      should(exception).be.an.instanceof(fdsErrors.InvalidInterpolationSpec);
      done();
    }
  });

  it('should throw an error if a number is passed instead of a valid interpolation array as a string specification',
    function(done) {
      try {
        linearInterpolatorFunction = linearInterpolator('666');
        done(new Error('It should throw an InvalidInterpolationSpec error'));
      } catch(exception) {
        should(exception).be.an.instanceof(fdsErrors.InvalidInterpolationSpec);
        done();
      }
    }
  );

  it('should throw an error if a one level hierarchy array is passed instead of a valid interpolation array ' +
     'as a string specification',
    function(done) {
      try {
        linearInterpolatorFunction = linearInterpolator('[1, 2, 3]');
        done(new Error('It should throw an InvalidInterpolationSpec error'));
      } catch(exception) {
        should(exception).be.an.instanceof(fdsErrors.InvalidInterpolationSpec);
        done();
      }
    }
  );

  it('should throw an error if a 2 level hierarchy array with one cardinality is passed instead of a ' +
     'valid interpolation array as a string specification', function(done) {
    try {
      linearInterpolatorFunction = linearInterpolator('[[1], [2], [3]]');
      done(new Error('It should throw an InvalidInterpolationSpec error'));
    } catch(exception) {
      should(exception).be.an.instanceof(fdsErrors.InvalidInterpolationSpec);
      done();
    }
  });

  it('should throw an error if an invalid array is passed instead of a ' +
     'valid interpolation array as a string specification', function(done) {
    try {
      linearInterpolatorFunction = linearInterpolator('[[1], [2], [3]');
      done(new Error('It should throw an InvalidInterpolationSpec error'));
    } catch(exception) {
      should(exception).be.an.instanceof(fdsErrors.InvalidInterpolationSpec);
      done();
    }
  });

  it('should throw an error if a number is passed instead of a valid interpolation array as an object specification',
    function(done) {
      try {
        linearInterpolatorFunction = linearInterpolator({spec: '666', return: {type: 'float'}});
        done(new Error('It should throw an InvalidInterpolationSpec error'));
      } catch(exception) {
        should(exception).be.an.instanceof(fdsErrors.InvalidInterpolationSpec);
        done();
      }
    }
  );

  it('should throw an error if a one level hierarchy array is passed instead of a valid interpolation array ' +
     'as an object specification',
    function(done) {
      try {
        linearInterpolatorFunction = linearInterpolator({spec: '[1, 2, 3]', return: {type: 'float'}});
        done(new Error('It should throw an InvalidInterpolationSpec error'));
      } catch(exception) {
        should(exception).be.an.instanceof(fdsErrors.InvalidInterpolationSpec);
        done();
      }
    }
  );

  it('should throw an error if a 2 level hierarchy array with one cardinality is passed instead of a ' +
     'valid interpolation array as an object specification', function(done) {
    try {
      linearInterpolatorFunction = linearInterpolator({spec: '[[1], [2], [3]]', return: {type: 'float'}});
      done(new Error('It should throw an InvalidInterpolationSpec error'));
    } catch(exception) {
      should(exception).be.an.instanceof(fdsErrors.InvalidInterpolationSpec);
      done();
    }
  });

  it('should throw an error if an invalid array is passed instead of a ' +
     'valid interpolation array as an object specification', function(done) {
    try {
      linearInterpolatorFunction = linearInterpolator({spec: '[[1], [2], [3]', return: {type: 'float'}});
      done(new Error('It should throw an InvalidInterpolationSpec error'));
    } catch(exception) {
      should(exception).be.an.instanceof(fdsErrors.InvalidInterpolationSpec);
      done();
    }
  });

  it('should throw an error if an invalid return object is passed as an object specification', function(done) {
    try {
      linearInterpolatorFunction = linearInterpolator({spec: '[[1, 1], [2, 2], [3, 3]]', return: {typeXXX: 'float'}});
      done(new Error('It should throw an InvalidInterpolationSpec error'));
    } catch(exception) {
      should(exception).be.an.instanceof(fdsErrors.InvalidInterpolationSpec);
      done();
    }
  });

  it('should throw an error if an invalid return type is passed as an object specification', function(done) {
    try {
      linearInterpolatorFunction = linearInterpolator({spec: '[[1, 1], [2, 2], [3, 3]]', return: {type: 'floatXXX'}});
      done(new Error('It should throw an InvalidInterpolationSpec error'));
    } catch(exception) {
      should(exception).be.an.instanceof(fdsErrors.InvalidInterpolationSpec);
      done();
    }
  });

  it('should throw an error if an invalid return rounding is passed as an object specification', function(done) {
    try {
      linearInterpolatorFunction = linearInterpolator(
        {spec: '[[1, 1], [2, 2], [3, 3]]', return: {type: 'integer', rounding: 'floorXXX'}});
      done(new Error('It should throw an InvalidInterpolationSpec error'));
    } catch(exception) {
      should(exception).be.an.instanceof(fdsErrors.InvalidInterpolationSpec);
      done();
    }
  });

  it('should throw an error if a number is passed instead of a valid interpolation array as an object specification ' +
     'as a string',
    function(done) {
      try {
        linearInterpolatorFunction = linearInterpolator('{"spec": "666", "return": {"type": "float"}}');
        done(new Error('It should throw an InvalidInterpolationSpec error'));
      } catch(exception) {
        should(exception).be.an.instanceof(fdsErrors.InvalidInterpolationSpec);
        done();
      }
    }
  );

  it('should throw an error if a one level hierarchy array is passed instead of a valid interpolation array ' +
     'as an object specification as a string',
    function(done) {
      try {
        linearInterpolatorFunction = linearInterpolator('{"spec": "[1, 2, 3]", "return": {"type": "float"}}');
        done(new Error('It should throw an InvalidInterpolationSpec error'));
      } catch(exception) {
        should(exception).be.an.instanceof(fdsErrors.InvalidInterpolationSpec);
        done();
      }
    }
  );

  it('should throw an error if a 2 level hierarchy array with one cardinality is passed instead of a ' +
     'valid interpolation array as an object specification as a string', function(done) {
    try {
      linearInterpolatorFunction = linearInterpolator('{"spec": "[[1], [2], [3]]", "return": {"type": "float"}}');
      done(new Error('It should throw an InvalidInterpolationSpec error'));
    } catch(exception) {
      should(exception).be.an.instanceof(fdsErrors.InvalidInterpolationSpec);
      done();
    }
  });

  it('should throw an error if an invalid array is passed instead of a ' +
     'valid interpolation array as an object specification as a string', function(done) {
    try {
      linearInterpolatorFunction = linearInterpolator('{"spec": "[[1], [2], [3]", "return": {"type": "float"}}');
      done(new Error('It should throw an InvalidInterpolationSpec error'));
    } catch(exception) {
      should(exception).be.an.instanceof(fdsErrors.InvalidInterpolationSpec);
      done();
    }
  });

  it('should throw an error if an invalid return object is passed as an object specification as a string',
    function(done) {
      try {
        linearInterpolatorFunction = linearInterpolator(
          '{"spec": "[[1, 1], [2, 2], [3, 3]]", "return": {"typeXXX": "float"}}');
        done(new Error('It should throw an InvalidInterpolationSpec error'));
      } catch(exception) {
        should(exception).be.an.instanceof(fdsErrors.InvalidInterpolationSpec);
        done();
      }
    }
  );

  it('should throw an error if an invalid return type is passed as an object specification as a string',
    function(done) {
      try {
        linearInterpolatorFunction = linearInterpolator(
          '{"spec": "[[1, 1], [2, 2], [3, 3]]", "return": {"type": "floatXXX"}}');
        done(new Error('It should throw an InvalidInterpolationSpec error'));
      } catch(exception) {
        should(exception).be.an.instanceof(fdsErrors.InvalidInterpolationSpec);
        done();
      }
    }
  );

  it('should throw an error if an invalid return rounding is passed as an object specification as a string',
    function(done) {
      try {
        linearInterpolatorFunction = linearInterpolator(
          '{"spec": "[[1, 1], [2, 2], [3, 3]]", "return": {"type": "integer", "rounding": "floorXXX"}}');
        done(new Error('It should throw an InvalidInterpolationSpec error'));
      } catch(exception) {
        should(exception).be.an.instanceof(fdsErrors.InvalidInterpolationSpec);
        done();
      }
    }
  );

  it('should interpolate if valid interpolation array is passed as specification', function(done) {
    try {
      linearInterpolatorFunction = linearInterpolator([[1, 1], [5, 5], [10, 10]]);
      should(linearInterpolatorFunction(1)).equal(1);
      should(linearInterpolatorFunction(2.5)).equal(2.5);
      should(linearInterpolatorFunction(5)).equal(5);
      should(linearInterpolatorFunction(7.5)).equal(7.5);
      should(linearInterpolatorFunction(10)).equal(10);
      done();
    } catch(exception) {
      done(exception);
    }
  });

  it('should interpolate if valid interpolation array is passed as a string specification', function(done) {
    try {
      linearInterpolatorFunction = linearInterpolator('[[1, 1], [5, 5], [10, 10]]');
      should(linearInterpolatorFunction(1)).equal(1);
      should(linearInterpolatorFunction(2.5)).equal(2.5);
      should(linearInterpolatorFunction(5)).equal(5);
      should(linearInterpolatorFunction(7.5)).equal(7.5);
      should(linearInterpolatorFunction(10)).equal(10);
      done();
    } catch(exception) {
      done(exception);
    }
  });

  it('should interpolate if valid interpolation array is passed as an object specification with return type float',
    function(done) {
      try {
        linearInterpolatorFunction = linearInterpolator({spec: [[1, 1], [5, 5], [10, 10]], return: {type: 'float'}});
        should(linearInterpolatorFunction(1)).equal(1);
        should(linearInterpolatorFunction(2.5)).equal(2.5);
        should(linearInterpolatorFunction(5)).equal(5);
        should(linearInterpolatorFunction(7.5)).equal(7.5);
        should(linearInterpolatorFunction(10)).equal(10);
        done();
      } catch(exception) {
        done(exception);
      }
    }
  );

  it('should interpolate if valid interpolation array is passed as an object specification with return type integer ' +
     'and rounding ceil',
    function(done) {
      try {
        linearInterpolatorFunction = linearInterpolator(
          {spec: '[[1, 1], [5, 5], [10, 10]]', return: {type: 'integer', rounding: 'ceil'}});
        should(linearInterpolatorFunction(1)).equal(1);
        should(linearInterpolatorFunction(2.5)).equal(3);
        should(linearInterpolatorFunction(5)).equal(5);
        should(linearInterpolatorFunction(7.5)).equal(8);
        should(linearInterpolatorFunction(10)).equal(10);
        done();
      } catch(exception) {
        done(exception);
      }
    }
  );

  it('should interpolate if valid interpolation array is passed as an object specification with return type integer ' +
     'and rounding floor',
    function(done) {
      try {
        linearInterpolatorFunction = linearInterpolator(
          {spec: '[[1, 1], [5, 5], [10, 10]]', return: {type: 'integer', rounding: 'floor'}});
        should(linearInterpolatorFunction(1)).equal(1);
        should(linearInterpolatorFunction(2.5)).equal(2);
        should(linearInterpolatorFunction(5)).equal(5);
        should(linearInterpolatorFunction(7.5)).equal(7);
        should(linearInterpolatorFunction(10)).equal(10);
        done();
      } catch(exception) {
        done(exception);
      }
    }
  );

  it('should interpolate if valid interpolation array is passed as an object specification with return type integer ' +
     'and rounding round',
    function(done) {
      try {
        linearInterpolatorFunction = linearInterpolator(
          {spec: '[[1, 1], [5, 5], [10, 10]]', return: {type: 'integer', rounding: 'round'}});
        should(linearInterpolatorFunction(1)).equal(1);
        should(linearInterpolatorFunction(2.5)).equal(3);
        should(linearInterpolatorFunction(5)).equal(5);
        should(linearInterpolatorFunction(7.5)).equal(8);
        should(linearInterpolatorFunction(10)).equal(10);
        done();
      } catch(exception) {
        done(exception);
      }
    }
  );

  it('should interpolate if valid interpolation array is passed as an object specification with return type float '+
     'as a string',
    function(done) {
      try {
        linearInterpolatorFunction = linearInterpolator(
          '{"spec": [[1, 1], [5, 5], [10, 10]], "return": {"type": "float"}}');
        should(linearInterpolatorFunction(1)).equal(1);
        should(linearInterpolatorFunction(2.5)).equal(2.5);
        should(linearInterpolatorFunction(5)).equal(5);
        should(linearInterpolatorFunction(7.5)).equal(7.5);
        should(linearInterpolatorFunction(10)).equal(10);
        done();
      } catch(exception) {
        done(exception);
      }
    }
  );

  it('should interpolate if valid interpolation array is passed as an object specification with return type integer '+
     'and rounding ceil as a string',
    function(done) {
      try {
        linearInterpolatorFunction = linearInterpolator(
          '{"spec": [[1, 1], [5, 5], [10, 10]], "return": {"type": "integer", "rounding": "ceil"}}');
        should(linearInterpolatorFunction(1)).equal(1);
        should(linearInterpolatorFunction(2.5)).equal(3);
        should(linearInterpolatorFunction(5)).equal(5);
        should(linearInterpolatorFunction(7.5)).equal(8);
        should(linearInterpolatorFunction(10)).equal(10);
        done();
      } catch(exception) {
        done(exception);
      }
    }
  );

  it('should interpolate if valid interpolation array is passed as an object specification with return type integer '+
     'and rounding floor as a string',
    function(done) {
      try {
        linearInterpolatorFunction = linearInterpolator(
          '{"spec": [[1, 1], [5, 5], [10, 10]], "return": {"type": "integer", "rounding": "floor"}}');
        should(linearInterpolatorFunction(1)).equal(1);
        should(linearInterpolatorFunction(2.5)).equal(2);
        should(linearInterpolatorFunction(5)).equal(5);
        should(linearInterpolatorFunction(7.5)).equal(7);
        should(linearInterpolatorFunction(10)).equal(10);
        done();
      } catch(exception) {
        done(exception);
      }
    }
  );

  it('should interpolate if valid interpolation array is passed as an object specification with return type integer '+
     'and rounding round as a string',
    function(done) {
      try {
        linearInterpolatorFunction = linearInterpolator(
          '{"spec": [[1, 1], [5, 5], [10, 10]], "return": {"type": "integer", "rounding": "round"}}');
        should(linearInterpolatorFunction(1)).equal(1);
        should(linearInterpolatorFunction(2.5)).equal(3);
        should(linearInterpolatorFunction(5)).equal(5);
        should(linearInterpolatorFunction(7.5)).equal(8);
        should(linearInterpolatorFunction(10)).equal(10);
        done();
      } catch(exception) {
        done(exception);
      }
    }
  );

  it('should interpolate if valid interpolation array is passed as an object specification with return type float ' +
     'as a string',
    function(done) {
      try {
        linearInterpolatorFunction = linearInterpolator(
          '{"spec": "[[1, 1], [5, 5], [10, 10]]", "return": {"type": "float"}}');
        should(linearInterpolatorFunction(1)).equal(1);
        should(linearInterpolatorFunction(2.5)).equal(2.5);
        should(linearInterpolatorFunction(5)).equal(5);
        should(linearInterpolatorFunction(7.5)).equal(7.5);
        should(linearInterpolatorFunction(10)).equal(10);
        done();
      } catch(exception) {
        done(exception);
      }
    }
  );

  it('should interpolate if valid interpolation array is passed as an object specification with return type integer ' +
     'and rounding ceil as a string',
    function(done) {
      try {
        linearInterpolatorFunction = linearInterpolator(
          '{"spec": "[[1, 1], [5, 5], [10, 10]]", "return": {"type": "integer", "rounding": "ceil"}}');
        should(linearInterpolatorFunction(1)).equal(1);
        should(linearInterpolatorFunction(2.5)).equal(3);
        should(linearInterpolatorFunction(5)).equal(5);
        should(linearInterpolatorFunction(7.5)).equal(8);
        should(linearInterpolatorFunction(10)).equal(10);
        done();
      } catch(exception) {
        done(exception);
      }
    }
  );

  it('should interpolate if valid interpolation array is passed as an object specification with return type integer ' +
     'and rounding floor as a string',
    function(done) {
      try {
        linearInterpolatorFunction = linearInterpolator(
          '{"spec": "[[1, 1], [5, 5], [10, 10]]", "return": {"type": "integer", "rounding": "floor"}}');
        should(linearInterpolatorFunction(1)).equal(1);
        should(linearInterpolatorFunction(2.5)).equal(2);
        should(linearInterpolatorFunction(5)).equal(5);
        should(linearInterpolatorFunction(7.5)).equal(7);
        should(linearInterpolatorFunction(10)).equal(10);
        done();
      } catch(exception) {
        done(exception);
      }
    }
  );

  it('should interpolate if valid interpolation array is passed as an object specification with return type integer ' +
     'and rounding round as a string',
    function(done) {
      try {
        linearInterpolatorFunction = linearInterpolator(
          '{"spec": "[[1, 1], [5, 5], [10, 10]]", "return": {"type": "integer", "rounding": "round"}}');
        should(linearInterpolatorFunction(1)).equal(1);
        should(linearInterpolatorFunction(2.5)).equal(3);
        should(linearInterpolatorFunction(5)).equal(5);
        should(linearInterpolatorFunction(7.5)).equal(8);
        should(linearInterpolatorFunction(10)).equal(10);
        done();
      } catch(exception) {
        done(exception);
      }
    }
  );
});
