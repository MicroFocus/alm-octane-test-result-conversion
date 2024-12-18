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
import { TestRunResult } from '../model/octane/TestRun';
import TestsResult from '../model/octane/TestsResult';
import OctaneBuildConfig from './OctaneBuildConfig';
import MultipleFeaturesRoot from '../model/gherkin/MultipleFeaturesRoot';
import Feature from '../model/gherkin/Feature';
import GherkinTestRun from '../model/octane/GherkinTestRun';

const FAILED_STATUS_LOWER_CASE: string = TestRunResult.FAILED.toLowerCase();

/**
 * Convert Gherkin format XML to OpenText SDP / SDM format XML
 * @param {string} gherkinXML - string containing Gherkin format XML
 * @param {OctaneBuildConfig} octaneBuildConfig - OpenText SDP / SDM build configuration data (eg.: job id, buiild id, server id etc.)
 * @param {string} framework - Testing framework used to run the automated tests
 * @returns {string} - string containing converted XML (returns the OpenText SDP / SDM format XML)
 */
const convertGherkinXMLToOctaneXML = (
  gherkinXML: string,
  octaneBuildConfig: OctaneBuildConfig,
  framework: string
): string => {
  const gherkinReportJSON = xml2js(gherkinXML, { compact: true });
  const octaneReportJSON = createOctaneTestsResult(
    <MultipleFeaturesRoot>gherkinReportJSON,
    octaneBuildConfig,
    framework
  );
  return js2xml(octaneReportJSON, { compact: true });
};

/**
 * Creates OpenText SDP / SDM test results object from Gherkin XML root object
 * @param {MultipleFeaturesRoot} gherkinReport - Gherkin XML root object
 * @param {OctaneBuildConfig} buildConfig - OpenText SDP / SDM build configuration data (eg.: job id, build id, server id etc.)
 * @param {string} framework - Testing framework used to run the automated tests
 * @returns {TestsResult} - OpenText SDP / SDM tests result object to be converted to XML
 */
const createOctaneTestsResult = (
  gherkinReport: MultipleFeaturesRoot,
  buildConfig: OctaneBuildConfig,
  framework: string
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
              value: 'Gherkin Test'
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
              value: framework
            }
          }
        ]
      },
      test_runs: {
        gherkin_test_run: convertGherkinSuiteToOctaneRuns(gherkinReport)
      }
    }
  };
};

/**
 * Converts Gherkin root object to a list of OpenText SDP / SDM Test Run objects
 * @param {MultipleFeaturesRoot} reportRoot - Gherkin XML root object
 * @returns {GherkinTestRun[]} - list of Gherkin Test Run OpenText SDP / SDM objects
 */
const convertGherkinSuiteToOctaneRuns = (
  reportRoot: MultipleFeaturesRoot
): GherkinTestRun[] => {
  const octaneTestRuns: GherkinTestRun[] = [];
  const features = convertToArray(reportRoot.features.feature);

  features.forEach(featureElement => {
    octaneTestRuns.push(mapTestCaseToOctaneRun(featureElement));
  });

  return octaneTestRuns;
};

/**
 * Maps a Gherkin Feature object to an OpenText SDP / SDM TestRun object
 * @param {Feature} feature - Gherkin Feature object
 * @returns {GherkinTestRun} - resulted OpenText SDP / SDM TestRun object
 */
const mapTestCaseToOctaneRun = (featureElement: Feature): GherkinTestRun => {
  let featureDuration: number = 0;
  let featureStatus: TestRunResult = TestRunResult.PASSED;

  featureElement._attributes.name = escapeXML(featureElement._attributes.name);

  const scenarios = convertToArray(featureElement.scenarios.scenario);
  scenarios.forEach(scenarioElement => {
    scenarioElement._attributes.name = escapeXML(scenarioElement._attributes.name);

    if (scenarioElement.steps) {
      const steps = convertToArray(scenarioElement.steps.step);
      if (steps && steps.length) {
        let scenarioStatus: TestRunResult = TestRunResult.PASSED;

        steps.forEach(stepElement => {
          stepElement._attributes.name = escapeXML(stepElement._attributes.name);

          featureDuration += Number(stepElement._attributes.duration);
          if (stepElement._attributes.status.toLowerCase() === FAILED_STATUS_LOWER_CASE) {
            scenarioStatus = TestRunResult.FAILED;
          }
        });
        
        scenarioElement._attributes.status = scenarioStatus;
        if (scenarioStatus.toLowerCase() === FAILED_STATUS_LOWER_CASE) {
          featureStatus = scenarioStatus;
        }
      }
    }
  });

  const testRun: GherkinTestRun = {
    _attributes: {
      name: featureElement._attributes.name,
      duration: featureDuration,
      status: featureStatus
    },
    feature: featureElement
  };

  return testRun;
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

export default convertGherkinXMLToOctaneXML;
