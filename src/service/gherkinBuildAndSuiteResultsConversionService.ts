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

import escapeXML from 'xml-escape';
import { xml2js } from 'xml-js';
import { BuildAndSuiteResults, OctaneXmlBuilder, SuiteConfig, TestFields } from './OctaneXmlBuilder';
import { TestRunResult } from '../model/octane/TestRun';
import OctaneBuildConfig from './OctaneBuildConfig';
import MultipleFeaturesRoot from '../model/gherkin/MultipleFeaturesRoot';
import Feature from '../model/gherkin/Feature';
import GherkinTestRun from '../model/octane/GherkinTestRun';
import { FrameworkType } from '../model/common/FrameworkType';

const FAILED_STATUS_LOWER_CASE: string = TestRunResult.FAILED.toLowerCase();

export { BuildAndSuiteResults };

/**
 * Converts Gherkin features to Octane GherkinTestRun objects
 */
const convertGherkinSuiteToOctaneRuns = (features: Feature[]): GherkinTestRun[] => {
  const octaneTestRuns: GherkinTestRun[] = [];

  features.forEach((featureElement) => {
    octaneTestRuns.push(mapTestCaseToOctaneRun(featureElement));
  });

  return octaneTestRuns;
};

/**
 * Map a single Gherkin feature to an Octane GherkinTestRun (follows original gherkinConvertionService pattern)
 */
const mapTestCaseToOctaneRun = (featureElement: Feature): GherkinTestRun => {
  let featureDuration: number = 0;
  let featureStatus: TestRunResult = TestRunResult.PASSED;

  // The run attributes are escaped by OctaneXmlBuilder, so keep the raw name for the run
  const featureName = featureElement._attributes.name;
  featureElement._attributes.name = escapeXML(featureName);

  const scenarios = Array.isArray(featureElement.scenarios?.scenario)
    ? featureElement.scenarios.scenario
    : [featureElement.scenarios?.scenario].filter(Boolean);

  scenarios.forEach((scenarioElement: any) => {
    scenarioElement._attributes.name = escapeXML(scenarioElement._attributes.name);

    if (scenarioElement.steps) {
      const steps = Array.isArray(scenarioElement.steps.step)
        ? scenarioElement.steps.step
        : [scenarioElement.steps.step].filter(Boolean);

      if (steps && steps.length) {
        let scenarioStatus: TestRunResult = TestRunResult.PASSED;

        steps.forEach((stepElement: any) => {
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
      name: featureName,
      duration: featureDuration,
      status: featureStatus
    },
    feature: featureElement
  };

  return testRun;
};

/**
 * Convert Gherkin XML to build-context and/or suite-run Octane payloads.
 *
 * Parses each Gherkin XML once, merges all resulting test runs into a single test results
 * object and serializes it once. The payloads are then generated based on provided configuration:
 * - If buildConfig is provided: generates Mode A payload (CI-centric endpoint)
 * - If suiteConfig is provided: generates Mode B payload (workspace-scoped endpoint)
 * - If both are provided: generates both payloads from the same serialized test runs
 *
 * @param {string | string[]} gherkinXML - Gherkin format XML, or a list of Gherkin format XMLs to be merged
 * @param {OctaneBuildConfig} buildConfig - Build context configuration for Mode A (optional)
 * @param {SuiteConfig} suiteConfig - Suite configuration for Mode B (optional)
 * @param {TestFields} testFields - Optional test fields to include in payloads
 * @param {FrameworkType} framework - Optional framework type (default: Cucumber)
 * @returns {BuildAndSuiteResults} Object with `buildContextXml` and/or `suiteRunXml` properties
 * @throws Error if neither buildConfig nor suiteConfig is provided
 *
 * @example
 * // Mode A only (build context)
 * const result = convertGherkinXMLToBuildAndSuiteResults(gherkinXml, buildConfig);
 * POST result.buildContextXml to: /internal-api/shared_spaces/{id}/analytics/ci/test-results
 *
 * @example
 * // Mode B only (suite run)
 * const result = convertGherkinXMLToBuildAndSuiteResults(gherkinXml, undefined, suiteConfig);
 * POST result.suiteRunXml to: /api/shared_spaces/{id}/workspaces/{wsId}/test-results
 *
 * @example
 * // Both modes (from single parse)
 * const result = convertGherkinXMLToBuildAndSuiteResults(gherkinXml, buildConfig, suiteConfig);
 * POST result.buildContextXml to CI-centric endpoint
 * POST result.suiteRunXml to workspace-scoped endpoint
 */
const convertGherkinXMLToBuildAndSuiteResults = (
  gherkinXML: string | string[],
  buildConfig?: OctaneBuildConfig,
  suiteConfig?: SuiteConfig,
  testFields?: TestFields,
  framework: FrameworkType = FrameworkType.Cucumber
): BuildAndSuiteResults => {
  if (!buildConfig && !suiteConfig) {
    throw new Error(
      'Must provide either buildConfig (Mode A) or suiteConfig (Mode B) or both'
    );
  }

  const gherkinXMLs = Array.isArray(gherkinXML) ? gherkinXML : [gherkinXML];
  const gherkinTestRuns: GherkinTestRun[] = [];
  gherkinXMLs.forEach((xml) => {
    const featuresRoot = xml2js(xml, { compact: true }) as MultipleFeaturesRoot;
    const features = Array.isArray(featuresRoot.features.feature)
      ? featuresRoot.features.feature
      : [featuresRoot.features.feature];
    gherkinTestRuns.push(...convertGherkinSuiteToOctaneRuns(features));
  });

  // Default test fields if not provided
  const fields = testFields || {
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
  };

  // GherkinTestRun is compatible with TestRun interface
  const builder = new OctaneXmlBuilder()
    .withGherkinTestRuns(gherkinTestRuns as any)
    .withTestFields(fields);
  if (buildConfig) {
    builder.withBuildConfig(buildConfig);
  }
  if (suiteConfig) {
    builder.withSuiteConfig(suiteConfig);
  }

  return builder.buildAll();
};

export default convertGherkinXMLToBuildAndSuiteResults;
