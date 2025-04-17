/*
 * Copyright 2024-2025 Open Text.
 *
 * The only warranties for products and services of Open Text and
 * its affiliates and licensors (“Open Text”) are as may be set forth
 * in the express warranty statements accompanying such products and services.
 * Nothing herein should be construed as constituting an additional warranty.
 * Open Text shall not be liable for technical or editorial errors or
 * omissions contained herein. The information contained herein is subject
 * to change without notice.
 *
 * Except as specifically indicated otherwise, this document contains
 * confidential information and a valid license is required for possession,
 * use or copying. If this work is provided to the U.S. Government,
 * consistent with FAR 12.211 and 12.212, Commercial Computer Software,
 * Computer Software Documentation, and Technical Data for Commercial Items are
 * licensed to the U.S. Government under vendor's standard commercial license.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *   http://www.apache.org/licenses/LICENSE-2.0
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
import TestSuite from '../model/junit/TestSuite';
import { FrameworkType } from '../model/common/FrameworkType';

/**
 * Convert JUnit format XML to OpenText SDP / SDM format XML
 * @param {string} junitXML - string containing JUnit format XML
 * @param {OctaneBuildConfig} octaneBuildConfig - OpenText SDP / SDM build configuration data (eg.: job id, buiild id, server id etc.)
 * @param {FrameworkType} framework - Testing framework used to run the automated tests
 * @returns {string} - string containing converted XML (returns the OpenText SDP / SDM format XML)
 */
const convertJUnitXMLToOctaneXML = (
  junitXML: string,
  octaneBuildConfig: OctaneBuildConfig,
  framework?: FrameworkType
): string => {
  const junitReportJSON = xml2js(junitXML, { compact: true });
  const octaneReportJSON = createOctaneTestsResult(
    <MultipleSuitesRoot | SingleSuiteRoot>junitReportJSON,
    octaneBuildConfig,
    framework
  );
  return js2xml(octaneReportJSON, { compact: true });
};

/**
 * Creates OpenText SDP / SDM test results object from JUnit XML root object
 * @param {MultipleSuitesRoot | SingleSuiteRoot} junitReport - JUnit XML root object
 * @param {OctaneBuildConfig} buildConfig - OpenText SDP / SDM build configuration data (eg.: job id, buiild id, server id etc.)
 * @param {FrameworkType} framework - Testing framework used to run the automated tests
 * @returns {TestsResult} - OpenText SDP / SDM tests result object to be converted to XML
 */
const createOctaneTestsResult = (
  junitReport: MultipleSuitesRoot | SingleSuiteRoot,
  buildConfig: OctaneBuildConfig,
  framework?: FrameworkType
): TestsResult => {
  const { external_run_id, ...buildContext } = buildConfig;
  return {
    test_result: {
      build: {
        _attributes: {
          ...buildContext
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
              value: framework || 'JUnit'
            }
          }
        ]
      },
      test_runs: {
        test_run: convertJUnitSuiteToOctaneRuns(junitReport, external_run_id, framework)
      }
    }
  };
};

/**
 * Converts JUnit XML root object to a list of OpenText SDP / SDM Test Run objects
 * @param {MultipleSuitesRoot | SingleSuiteRoot} reportRoot - JUnit XML root object
 * @param {string} externalRunId - external run id (on CI server)
 * @param {FrameworkType} framework - Testing framework used to run the automated tests
 * @returns {TestRun[]} - list of Test Run OpenText SDP / SDM objects
 */
const convertJUnitSuiteToOctaneRuns = (
  reportRoot: MultipleSuitesRoot | SingleSuiteRoot,
  externalRunId?: string,
  framework?: FrameworkType
): TestRun[] => {
  const octaneTestRuns: TestRun[] = [];
  const concatenateSuiteName = framework == FrameworkType.RobotFramework;
  if (isMultipleSuitesRoot(reportRoot)) {
    let testSuites = (<MultipleSuitesRoot>reportRoot).testsuites.testsuite;
    testSuites = convertToArray(testSuites);

    testSuites.forEach(testSuite => {
      processTestSuite(testSuite, '', externalRunId, octaneTestRuns, concatenateSuiteName);
    });
  } else {
    const testSuite = (<SingleSuiteRoot>reportRoot).testsuite;
    processTestSuite(testSuite, '', externalRunId, octaneTestRuns, concatenateSuiteName);
  }

  return octaneTestRuns;
};

/**
 * Processes a test suite, including nested suites, and maps test cases to OpenText SDP / SDM TestRun objects
 * @param {TestSuite} testSuite - JUnit TestSuite object
 * @param {string} parentPackage - concatenated package name of parent suites
 * @param {string} externalRunId - external run id (on CI server)
 * @param {TestRun[]} octaneTestRuns - list of Test Run OpenText SDP / SDM objects
 * @param {string} concatenateSuiteName - should the package name be concatenated with the parent suite name
 */
const processTestSuite = (
  testSuite: TestSuite,
  parentPackage: string,
  externalRunId: string | undefined,
  octaneTestRuns: TestRun[],
  concatenateSuiteName: boolean
): void => {
  const currentPackage = concatenateSuiteName ? (parentPackage
    ? `${parentPackage}.${testSuite._attributes.name}`
    : testSuite._attributes.name) : '';

  if (testSuite.testcase) {
    testSuite.testcase = convertToArray(testSuite.testcase);

    testSuite.testcase.forEach(testCase => {
      octaneTestRuns.push(
        mapTestCaseToOctaneRun(testCase, currentPackage, externalRunId)
      );
    });
  }

  if (testSuite.testsuite) {
    const nestedSuites = convertToArray(testSuite.testsuite);
    nestedSuites.forEach(nestedSuite => {
      processTestSuite(nestedSuite, currentPackage, externalRunId, octaneTestRuns, concatenateSuiteName);
    });
  }
};

/**
 * Maps a JUnit TestCase object to an OpenText SDP / SDM TestRun object
 * @param {TestCase} testCase - JUnit TestCase object
 * @param {string} pkg - package of the test class
 * @param {string} externalRunId - external run id (on CI server)
 * @returns {TestRun} - resulted OpenText SDP / SDM TestRun object
 */
const mapTestCaseToOctaneRun = (
  testCase: TestCase,
  pkg?: string,
  externalRunId?: string
): TestRun => {
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
        : 1,
      external_run_id: externalRunId
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
