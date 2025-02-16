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

enum TestResources {
  OCTANE_RESULT_SCHEMA_PATH = 'resources/octaneResultSchema.xsd',
  XML_ONE_TEST_SUITE_PATH = 'resources/oneTestSuiteJUnit.xml',
  XML_TWO_TEST_SUITES_PATH = 'resources/twoTestSuitesJUnit.xml',
  XML_FAILED_AND_SKIPPED_TESTS_PATH = 'resources/failedAndSkippedTestsJUnit.xml',
  XML_ALL_BUILD_CONTEXT_FIELDS_PATH = 'resources/allBuildContextFieldsJUnit.xml',
  XML_ONE_TEST_SUITE_EXPECTED_PATH = 'resources/oneTestSuiteExpected.xml',
  XML_TWO_TEST_SUITES_EXPECTED_PATH = 'resources/twoTestSuitesExpected.xml',
  XML_FAILED_AND_SKIPPED_TESTS_EXPECTED_PATH = 'resources/failedAndSkippedTestsExpected.xml',
  XML_ALL_BUILD_CONTEXT_FIELDS_EXPECTED_PATH = 'resources/allBuildContextFieldsExpected.xml',
  ALM_OCTANE_JSON_MODEL_PATH = 'resources/octaneTestResultModel.json',
  OCTANE_MODEL_CONVERTED_EXPECTED_PATH = 'resources/convertedOctaneModelExpected.xml',
  GHERKIN_TWO_FEATURES_PATH = 'resources/gherkinTwoFeatures.xml',
  GHERKIN_TWO_FEATURES_EXPECTED_PATH = 'resources/gherkinTwoFeaturesExpected.xml',
  OCTANE_CONFIG_PATH = 'resources/octaneConfig.json'
}

export default TestResources;
