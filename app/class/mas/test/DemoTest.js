//
//   Copyright 2009-2013 Ilkka Oksanen <iao@iki.fi>
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing,
//   software distributed under the License is distributed on an "AS
//   IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
//   express or implied.  See the License for the specific language
//   governing permissions and limitations under the License.
//

/**
 * This class demonstrates how to define unit tests for your application.
 *
 * Execute <code>generate.py test</code> to generate a testrunner application
 * and open it from <tt>test/index.html</tt>
 *
 * The methods that contain the tests are instance methods with a
 * <code>test</code> prefix. You can create an arbitrary number of test
 * classes like this one. They can be organized in a regular class hierarchy,
 * i.e. using deeper namespaces and a corresponding file structure within the
 * <tt>test</tt> folder.
 */
qx.Class.define('client.test.DemoTest', {
  extend : qx.dev.unit.TestCase,

  members : {

    /**
     * Here are some simple tests
     */
    testSimple : function() {
      this.assertEquals(4, 3+1, 'This should never fail!');
      this.assertFalse(false, 'Can false be true?!');
    },

    /**
     * Here are some more advanced tests
     */
    testAdvanced: function () {
      var a = 3;
      var b = a;
      this.assertIdentical(a, b, 'A rose by any other name is still a rose');
      this.assertInRange(
          3, 1, 10, 'You must be kidding, 3 can never be outside [1,10]!');
    }
  }
});
