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

import { Octane } from '@microfocus/alm-octane-js-rest-sdk';
import * as fs from 'node:fs';
import { validateXML } from 'xsd-schema-validator';
import TestResources from '../../test/TestResources';
import convertJUnitXMLToOctaneXML from '../junitConvertionService';
import OctaneBuildConfig from '../OctaneBuildConfig';

let xmlWithTwoTestSuites: string;
let xmlWithOneTestSuite: string;
const buildConfig: OctaneBuildConfig = {
  build_id: '123',
  job_id: 'myJob',
  server_id: 'serverId'
};

const validateXMLWithFile = async (
  xml: string,
  schemaFile: string
): Promise<{
  err: any;
  result: { valid: boolean };
}> => {
  return await new Promise(resolve => {
    validateXML(xml, schemaFile, (err: any, result: { valid: boolean }) => {
      resolve({ err, result });
    });
  });
};

beforeAll(async () => {
  const octane: Octane = new Octane(
    JSON.parse(fs.readFileSync(TestResources.OCTANE_CONFIG_PATH).toString())
  );

  const schema = await octane.get('test-results/xsd').execute();
  fs.writeFileSync(TestResources.OCTANE_RESULT_SCHEMA_PATH, schema);

  xmlWithTwoTestSuites = fs
    .readFileSync(TestResources.JUNIT_TWO_TEST_SUITES_PATH)
    .toString();

  xmlWithOneTestSuite = fs
    .readFileSync(TestResources.JUNIT_SINGLE_TEST_SUITE_PATH)
    .toString();
});

describe('Converted test results should respect the OpenText SDP / SDM xsd schema', () => {
  test('Result with multiple test suites respects OpenText SDP / SDM xsd schema', async () => {
    const { err, result } = await validateXMLWithFile(
      convertJUnitXMLToOctaneXML(xmlWithTwoTestSuites, buildConfig),
      TestResources.OCTANE_RESULT_SCHEMA_PATH
    );

    expect(err).toBeNull();
    expect(result).toBeTruthy();
    expect(result.valid).toBe(true);
  });

  test('Result with single test suite respects OpenText SDP / SDM xsd schema', async () => {
    const { err, result } = await validateXMLWithFile(
      convertJUnitXMLToOctaneXML(xmlWithOneTestSuite, buildConfig),
      TestResources.OCTANE_RESULT_SCHEMA_PATH
    );

    expect(err).toBeNull();
    expect(result).toBeTruthy();
    expect(result.valid).toBe(true);
  });
});
