/*
 * (c) Copyright 2024 Micro Focus or one of its affiliates.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import escapeXML from 'xml-escape';
import { js2xml, xml2js } from 'xml-js';
import Error from '../model/junit/Error';
import Failure from '../model/junit/Failure';
import MultipleSuitesRoot from '../model/junit/MultipleSuitesRoot';
import SingleSuiteRoot from '../model/junit/SingleSuiteRoot';
import TestCase from '../model/junit/TestCase';
import { TestRun, TestRunResult } from '../model/octane/TestRun';
import TestRunError from '../model/octane/TestRunError';
import TestsResult from '../model/octane/TestsResult';
import OctaneBuildConfig from './OctaneBuildConfig';

/**
 * Convert JUnit format XML to OpenText SDP / SDM format XML
 * @param {string} junitXML - string containing JUnit format XML
 * @param {OctaneBuildConfig} octaneBuildConfig - OpenText SDP / SDM build configuration data (eg.: job id, buiild id, server id etc.)
 * @returns {string} - string containing converted XML (returns the OpenText SDP / SDM format XML)
 */
const convertJUnitXMLToOctaneXML = (
  junitXML: string,
  octaneBuildConfig: OctaneBuildConfig
): string => {
  const junitReportJSON = xml2js(junitXML, { compact: true });
  const octaneReportJSON = createOctaneTestsResult(
    <MultipleSuitesRoot | SingleSuiteRoot>junitReportJSON,
    octaneBuildConfig
  );
  return js2xml(octaneReportJSON, { compact: true });
};

/**
 * Creates OpenText SDP / SDM test results object from JUnit XML root object
 * @param {MultipleSuitesRoot | SingleSuiteRoot} junitReport - JUnit XML root object
 * @param {OctaneBuildConfig} buildConfig - OpenText SDP / SDM build configuration data (eg.: job id, buiild id, server id etc.)
 * @returns {TestsResult} - OpenText SDP / SDM tests result object to be converted to XML
 */
const createOctaneTestsResult = (
  junitReport: MultipleSuitesRoot | SingleSuiteRoot,
  buildConfig: OctaneBuildConfig
): TestsResult => {
  return {
    test_result: {
      build: {
        _attributes: {
          ...buildConfig
        }
      },
      test_fields: {
        test_field: [
          {
            _attributes: {
              type: 'Test_Level',
              value: 'Unit Test'
            }
          },
          {
            _attributes: {
              type: 'Test_Type',
              value: 'Sanity'
            }
          },
          {
            _attributes: {
              type: 'Framework',
              value: 'JUnit'
            }
          }
        ]
      },
      test_runs: {
        test_run: convertJUnitSuiteToOctaneRuns(junitReport)
      }
    }
  };
};

/**
 * Converts JUnit XML root object to a list of OpenText SDP / SDM Test Run objects
 * @param {MultipleSuitesRoot | SingleSuiteRoot} reportRoot - JUnit XML root object
 * @returns {TestRun[]} - list of Test Run OpenText SDP / SDM objects
 */
const convertJUnitSuiteToOctaneRuns = (
  reportRoot: MultipleSuitesRoot | SingleSuiteRoot
): TestRun[] => {
  const octaneTestRuns: TestRun[] = [];
  if (isMultipleSuitesRoot(reportRoot)) {
    let testSuites = (<MultipleSuitesRoot>reportRoot).testsuites.testsuite;
    testSuites = convertToArray(testSuites);

    testSuites.forEach(testSuite => {
      testSuite.testcase = convertToArray(testSuite.testcase);

      testSuite.testcase.forEach(testCase => {
        octaneTestRuns.push(
          mapTestCaseToOctaneRun(testCase, testSuite._attributes.package)
        );
      });
    });
  } else {
    const testSuite = (<SingleSuiteRoot>reportRoot).testsuite;
    testSuite.testcase = convertToArray(testSuite.testcase);

    testSuite.testcase.forEach(testCase => {
      octaneTestRuns.push(
        mapTestCaseToOctaneRun(testCase, testSuite._attributes.package)
      );
    });
  }

  return octaneTestRuns;
};

/**
 * Maps a JUnit TestCase object to an OpenText SDP / SDM TestRun object
 * @param {TestCase} testCase - JUnit TestCase object
 * @param {string} pkg - package of the test class
 * @returns {TestRun} - resulted OpenText SDP / SDM TestRun object
 */
const mapTestCaseToOctaneRun = (testCase: TestCase, pkg?: string): TestRun => {
  const error: TestRunError | undefined = mapFailsToOctaneError(testCase);
  const testRun: TestRun = {
    _attributes: {
      module: '',
      ...(pkg && { package: escapeXML(pkg) }),
      ...(testCase._attributes.classname && {
        class: escapeXML(testCase._attributes.classname)
      }),
      name: testCase._attributes.name,
      status: getTestRunStatus(testCase),
      duration: testCase._attributes.time
        ? Math.round(Number.parseFloat(testCase._attributes.time))
        : 1
    }
  };

  if (error) {
    testRun.error = error;
  }

  return testRun;
};

/**
 * Maps errors and failured from JUnit TestCase object to OpenText SDP / SDM TestRunError object
 * @param {TestCase} testCase - JUnit TestCase object to extract the errors and failures from
 * @returns {TestRunError | undefined} - resulted OpenText SDP / SDM TestRunError object if any errors exist, else undefined
 */
const mapFailsToOctaneError = (
  testCase: TestCase
): TestRunError | undefined => {
  let error: Error | Failure;

  if (testCase.error) {
    testCase.error = convertToArray(testCase.error);
    if (testCase.error.length > 0) {
      error = testCase.error[0];
    } else {
      return undefined;
    }
  } else if (testCase.failure) {
    testCase.failure = convertToArray(testCase.failure);
    if (testCase.failure.length > 0) {
      error = testCase.failure[0];
    } else {
      return undefined;
    }
  } else {
    return undefined;
  }

  let stacktrace: string | undefined;
  if (error?._cdata) {
    stacktrace = error._cdata;
  } else if (error?._text) {
    stacktrace = error._text;
  }

  return {
    _attributes: {
      ...(error._attributes.message && {
        message: escapeXML(error._attributes.message)
      }),
      ...(error._attributes.type && { type: escapeXML(error._attributes.type) })
    },
    _text: stacktrace || ''
  };
};

/**
 * Generates OpenText SDP / SDM TestRunResult based on the JUnit TestCase object (run status)
 * @param {TestCase} testCase - JUnit TestCase object
 * @returns {TestRunResult} - OpenText SDP / SDM test run status
 */
const getTestRunStatus = (testCase: TestCase): TestRunResult => {
  if (testCase.skipped) {
    return TestRunResult.SKIPPED;
  } else if (
    (testCase.error && testCase.error.length > 0) ||
    (testCase.failure && testCase.failure.length > 0)
  ) {
    return TestRunResult.FAILED;
  } else {
    return TestRunResult.PASSED;
  }
};

/**
 * Checks if the JUnit XML root is a single test suite or a collection of test suites
 * @param {MultipleSuitesRoot | SingleSuiteRoot} root - JUnit XML root object
 * @returns {boolean} - true if root is a collection or else otherwise
 */
const isMultipleSuitesRoot = (
  root: MultipleSuitesRoot | SingleSuiteRoot
): boolean => {
  return (<MultipleSuitesRoot>root).testsuites !== undefined;
};

/**
 * Ensures an element is an array. If element is not already an array, then it is wrapped inside an array.
 * @param {Type} elem - element to be checked
 * @returns {Type[]} - the element array
 */
const convertToArray = <Type>(elem: Type | Type[]): Type[] => {
  if (!Array.isArray(elem)) {
    return [elem];
  }
  return elem;
};

export default convertJUnitXMLToOctaneXML;
