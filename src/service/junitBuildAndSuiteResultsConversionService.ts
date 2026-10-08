/*
 * Copyright 2024-2026 Open Text.
 *
 * The only warranties for products and services of Open Text and
 * its affiliates and licensors ("Open Text") are as may be set forth
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

import { xml2js } from 'xml-js';
import { BuildAndSuiteResults, OctaneXmlBuilder, SuiteConfig, TestFields } from './OctaneXmlBuilder';
import { TestRun, TestRunResult } from '../model/octane/TestRun';
import TestCase from '../model/junit/TestCase';
import OctaneBuildConfig from './OctaneBuildConfig';
import { FrameworkType } from '../model/common/FrameworkType';

export { BuildAndSuiteResults };

/**
 * Convert JUnit test cases to Octane TestRun objects
 */
function junitTestCasesToOctaneTestRuns(
  testCases: TestCase | TestCase[]
): TestRun[] {
  const cases = Array.isArray(testCases) ? testCases : [testCases];

  return cases.map((testCase) => {
    const testCaseAttrs = testCase._attributes;
    let status = TestRunResult.PASSED;
    let error = undefined;

    // Check for failure
    if (testCase.failure) {
      status = TestRunResult.FAILED;
      error = {
        _attributes: {
          type: (testCase.failure as any)._attributes?.type || 'Failure'
        },
        _text: (testCase.failure as any)._text || ''
      };
    }

    // Check for skipped
    if (testCase.skipped) {
      status = TestRunResult.SKIPPED;
    }

    const duration = Math.round(
      (parseFloat(testCaseAttrs.time as string) || 0) * 1000
    );

    const testRun: TestRun = {
      _attributes: {
        module: '',
        class: testCaseAttrs.classname as string,
        name: testCaseAttrs.name as string,
        status,
        duration
      }
    };

    if (error) {
      testRun.error = error;
    }

    return testRun;
  });
}

/**
 * Convert JUnit XML to build-context and/or suite-run Octane payloads.
 *
 * Parses each JUnit XML once, merges all resulting test runs into a single test results
 * object and serializes it once. The payloads are then generated based on provided configuration:
 * - If buildConfig is provided: generates Mode A payload (CI-centric endpoint)
 * - If suiteConfig is provided: generates Mode B payload (workspace-scoped endpoint)
 * - If both are provided: generates both payloads from the same serialized test runs
 *
 * @param {string | string[]} junitXML - JUnit format XML, or a list of JUnit format XMLs to be merged
 * @param {OctaneBuildConfig} buildConfig - Build context configuration for Mode A (optional)
 * @param {SuiteConfig} suiteConfig - Suite configuration for Mode B (optional)
 * @param {TestFields} testFields - Optional test fields to include in payloads
 * @param {FrameworkType} framework - Optional framework type
 * @returns {BuildAndSuiteResults} Object with `buildContextXml` and/or `suiteRunXml` properties
 * @throws Error if neither buildConfig nor suiteConfig is provided
 *
 * @example
 * // Mode A only (build context)
 * const result = convertJUnitXMLToBuildAndSuiteResults(junitXml, buildConfig);
 * POST result.buildContextXml to: /internal-api/shared_spaces/{id}/analytics/ci/test-results
 *
 * @example
 * // Mode B only (suite run)
 * const result = convertJUnitXMLToBuildAndSuiteResults(junitXml, undefined, suiteConfig);
 * POST result.suiteRunXml to: /api/shared_spaces/{id}/workspaces/{wsId}/test-results
 *
 * @example
 * // Both modes (from single parse)
 * const result = convertJUnitXMLToBuildAndSuiteResults(junitXml, buildConfig, suiteConfig);
 * POST result.buildContextXml to CI-centric endpoint
 * POST result.suiteRunXml to workspace-scoped endpoint
 */
const convertJUnitXMLToBuildAndSuiteResults = (
  junitXML: string | string[],
  buildConfig?: OctaneBuildConfig,
  suiteConfig?: SuiteConfig,
  testFields?: TestFields,
  framework?: FrameworkType
): BuildAndSuiteResults => {
  if (!buildConfig && !suiteConfig) {
    throw new Error(
      'Must provide either buildConfig (Mode A) or suiteConfig (Mode B) or both'
    );
  }

  const junitXMLs = Array.isArray(junitXML) ? junitXML : [junitXML];
  const octaneTestRuns: TestRun[] = [];
  junitXMLs.forEach((xml) => {
    const junitReportJSON = xml2js(xml, { compact: true }) as any;
    octaneTestRuns.push(
      ...junitTestCasesToOctaneTestRuns(junitReportJSON.testsuite.testcase)
    );
  });

  // Default test fields if not provided
  const fields = testFields || {
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
          value: framework?.toString() || 'JUnit'
        }
      }
    ]
  };

  const builder = new OctaneXmlBuilder()
    .withTestRuns(octaneTestRuns)
    .withTestFields(fields);
  if (buildConfig) {
    builder.withBuildConfig(buildConfig);
  }
  if (suiteConfig) {
    builder.withSuiteConfig(suiteConfig);
  }

  return builder.buildAll();
};

export default convertJUnitXMLToBuildAndSuiteResults;
