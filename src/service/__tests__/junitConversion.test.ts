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

import * as fs from 'node:fs';
import formatXml from 'xml-formatter';
import TestResources from '../../test/TestResources';
import convertJUnitXMLToOctaneXML from '../junitConvertionService';
import OctaneBuildConfig from '../OctaneBuildConfig';

let xmlWithTwoTestSuites: string;
let xmlWithOneTestSuite: string;
let xmlFailedAndSkippedTests: string;
let xmlAllBuildContextFields: string;
let expectedXmlTwoTestSuites: string;
let expectedXmlOneTestSuite: string;
let expectedXmlFailedAndSkippedTests: string;
let expectedXmlAllBuildContextFields: string;

const buildConfig: OctaneBuildConfig = {
  build_id: '123',
  job_id: 'myJob',
  server_id: 'serverId'
};

beforeAll(() => {
  xmlWithTwoTestSuites = fs
    .readFileSync(TestResources.XML_TWO_TEST_SUITES_PATH)
    .toString();

  xmlWithOneTestSuite = fs
    .readFileSync(TestResources.XML_ONE_TEST_SUITE_PATH)
    .toString();

  xmlFailedAndSkippedTests = fs
    .readFileSync(TestResources.XML_FAILED_AND_SKIPPED_TESTS_PATH)
    .toString();

  xmlAllBuildContextFields = fs
    .readFileSync(TestResources.XML_ALL_BUILD_CONTEXT_FIELDS_PATH)
    .toString();

  expectedXmlTwoTestSuites = fs
    .readFileSync(TestResources.XML_TWO_TEST_SUITES_EXPECTED_PATH)
    .toString();

  expectedXmlOneTestSuite = fs
    .readFileSync(TestResources.XML_ONE_TEST_SUITE_EXPECTED_PATH)
    .toString();

  expectedXmlFailedAndSkippedTests = fs
    .readFileSync(TestResources.XML_FAILED_AND_SKIPPED_TESTS_EXPECTED_PATH)
    .toString();

  expectedXmlAllBuildContextFields = fs
    .readFileSync(TestResources.XML_ALL_BUILD_CONTEXT_FIELDS_EXPECTED_PATH)
    .toString();
});

describe('Test results xml should be correctly converted from junit format to OpenText SDP / SDM Format', () => {
  test('Result with multiple test suites is correctly converted', () => {
    expect(
      formatXml(convertJUnitXMLToOctaneXML(xmlWithTwoTestSuites, buildConfig))
    ).toBe(formatXml(expectedXmlTwoTestSuites));
  });

  test('Result with single test suite is correctly converted', () => {
    expect(
      formatXml(convertJUnitXMLToOctaneXML(xmlWithOneTestSuite, buildConfig))
    ).toBe(formatXml(expectedXmlOneTestSuite));
  });

  test('Result with multiple passed tests, one failed and one skipped is correctly converted', () => {
    expect(
      formatXml(convertJUnitXMLToOctaneXML(xmlFailedAndSkippedTests, buildConfig))
    ).toBe(formatXml(expectedXmlFailedAndSkippedTests));
  });

  test('Result with all build context fields is correctly converted', () => {
    const fullBuildConfig: OctaneBuildConfig = {
      server_id: '1001',
      job_id: '3001',
      job_name: 'Run Tests',
      build_id: '2001',
      build_name: 'Production Build',
      sub_type: 'subtype1',
      artifact_id: '4001',
      external_run_id: "12000"
    };

    expect(
      formatXml(convertJUnitXMLToOctaneXML(xmlAllBuildContextFields, fullBuildConfig))
    ).toBe(formatXml(expectedXmlAllBuildContextFields));
  });
});
