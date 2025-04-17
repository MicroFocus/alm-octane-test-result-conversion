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

enum TestResources {
  OCTANE_RESULT_SCHEMA_PATH = 'resources/octaneResultSchema.xsd',
  JUNIT_SINGLE_TEST_SUITE_PATH = 'resources/junit_singleTestSuite.xml',
  JUNIT_TWO_TEST_SUITES_PATH = 'resources/junit_twoTestSuites.xml',
  JUNIT_FAILED_AND_SKIPPED_TEST_CASES_PATH = 'resources/junit_failedAndSkippedTestCases.xml',
  JUNIT_ALL_BUILD_CONTEXT_FIELDS_PATH = 'resources/junit_allBuildContextFields.xml',
  JUNIT_SINGLE_TEST_SUITE_EXPECTED_PATH = 'resources/junit_singleTestSuiteExpected.xml',
  JUNIT_TWO_TEST_SUITES_EXPECTED_PATH = 'resources/junit_twoTestSuitesExpected.xml',
  JUNIT_FAILED_AND_SKIPPED_TEST_CASES_EXPECTED_PATH = 'resources/junit_failedAndSkippedTestCasesExpected.xml',
  JUNIT_ALL_BUILD_CONTEXT_FIELDS_EXPECTED_PATH = 'resources/junit_allBuildContextFieldsExpected.xml',
  ALM_OCTANE_JSON_MODEL_PATH = 'resources/octaneTestResultModel.json',
  OCTANE_MODEL_CONVERTED_EXPECTED_PATH = 'resources/convertedOctaneModelExpected.xml',
  GHERKIN_TWO_FEATURES_PATH = 'resources/gherkin_twoFeatures.xml',
  GHERKIN_TWO_FEATURES_EXPECTED_PATH = 'resources/gherkin_twoFeaturesExpected.xml',
  XUNIT_NESTED_TEST_SUITES_PATH = 'resources/xunit_nestedTestSuites.xml',
  XUNIT_NESTED_TEST_SUITES_EXPECTED_PATH = 'resources/xunit_nestedTestSuitesExpected.xml',
  XUNIT_SINGLE_TEST_SUITE_PATH = 'resources/xunit_singleTestSuite.xml',
  XUNIT_SINGLE_TEST_SUITE_EXPECTED_PATH = 'resources/xunit_singleTestSuiteExpected.xml',
  OCTANE_CONFIG_PATH = 'resources/octaneConfig.json'
}

export default TestResources;
