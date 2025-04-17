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

import * as fs from 'node:fs';
import formatXml from 'xml-formatter';
import TestResources from '../../test/TestResources';
import convertJUnitXMLToOctaneXML from '../junitConvertionService';
import OctaneBuildConfig from '../OctaneBuildConfig';
import { FrameworkType } from '../../model/common/FrameworkType';

let nestedTestSuitesXUnit: string;
let nestedTestSuitesXUnitExpected: string;
let singleTestSuiteXUnit: string;
let singleTestSuiteXUnitExpected: string;

const buildConfig: OctaneBuildConfig = {
  build_id: '123',
  job_id: 'myJob',
  server_id: 'serverId'
};

beforeAll(() => {
  nestedTestSuitesXUnit = fs
    .readFileSync(TestResources.XUNIT_NESTED_TEST_SUITES_PATH)
    .toString();

  nestedTestSuitesXUnitExpected = fs
    .readFileSync(TestResources.XUNIT_NESTED_TEST_SUITES_EXPECTED_PATH)
    .toString();
  
  singleTestSuiteXUnit = fs
    .readFileSync(TestResources.XUNIT_SINGLE_TEST_SUITE_PATH)
    .toString();

  singleTestSuiteXUnitExpected = fs
    .readFileSync(TestResources.XUNIT_SINGLE_TEST_SUITE_EXPECTED_PATH)
    .toString();
});

describe('Test result XMLs should be correctly converted from XUnit format to OpenText SDP / SDM Format', () => {
  test('XUnit - Multiple nested test suites', () => {
    expect(
      formatXml(convertJUnitXMLToOctaneXML(nestedTestSuitesXUnit, buildConfig, FrameworkType.RobotFramework))
    ).toBe(formatXml(nestedTestSuitesXUnitExpected));
  });

  test('XUnit - Single test suite', () => {
    expect(
      formatXml(convertJUnitXMLToOctaneXML(singleTestSuiteXUnit, buildConfig, FrameworkType.RobotFramework))
    ).toBe(formatXml(singleTestSuiteXUnitExpected));
  });
});
